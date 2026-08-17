// src/services/documentPdf.service.js
// ─────────────────────────────────────────────────────────────────────────
// Document PDF service — the bridge between persisted documents and the
// Puppeteer/Handlebars renderer.
//
//   generateAndStorePdf(documentId) -> pdf key
//     Loads a FINALIZED document + its line items + seller snapshot, rebuilds
//     the computed-document JSON, renders to a PDF Buffer, stores it once via
//     storage.putBuffer under "documents/<doc_number>.pdf", and records the
//     pdf_key + pdf_hash (sha256) on the row. Re-runnable (re-export).
//
//   getPdfStream(documentId) -> { stream, filename }
//     Finalized -> stream the stored PDF (regenerate if pdf_key is missing).
//     Draft     -> render fresh with a faint DRAFT watermark; never stored
//                  (drafts have no number and must not be cached).
//
// Money note: mysql2 returns DECIMAL columns as strings — the gst.engine
// coerces with Number(); the snapshot totals on the row are likewise coerced
// here when shaping the render JSON.
// ─────────────────────────────────────────────────────────────────────────
const crypto = require("crypto");

const query = require("../utils/db");
const AppError = require("../utils/appError");
const storage = require("../utils/storage");
const { computeDocument } = require("../utils/gst.engine");
const { renderer } = require("../render/pdf.puppeteer");
const { renderDocx } = require("../render/docx.htmltodocx");

const PDF_FOLDER = "documents";

// ── Loaders ─────────────────────────────────────────────────────────────────
const loadDocument = async (documentId) => {
  const rows = await query("SELECT * FROM documents WHERE id = ?", [documentId]);
  if (!rows.length) {
    throw new AppError("Document not found", 404);
  }
  return rows[0];
};

const loadItems = async (documentId) =>
  query(
    "SELECT * FROM document_items WHERE document_id = ? ORDER BY line_no ASC, id ASC",
    [documentId]
  );

const loadSeller = async () => {
  const rows = await query("SELECT * FROM seller_profile WHERE id = 1");
  return rows[0] || {};
};

// ── JSON shaping ─────────────────────────────────────────────────────────────
const num = (v) => Number(v) || 0;

/**
 * Aggregate line items by HSN/SAC + GST rate for the Rule-46 tax summary table.
 * @param {Array<Object>} computedItems engine-computed items merged with snapshot
 * @returns {Array<Object>}
 */
const buildHsnSummary = (computedItems) => {
  const map = new Map();

  computedItems.forEach((item) => {
    const key = `${item.hsnSac || "-"}|${item.gstRate}`;
    const existing = map.get(key) || {
      hsnSac: item.hsnSac || "-",
      gstRate: item.gstRate,
      cgstRate: item.cgstRate,
      sgstRate: item.sgstRate,
      igstRate: item.igstRate,
      taxableValue: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTax: 0,
    };

    existing.taxableValue += num(item.taxableValue);
    existing.cgstAmount += num(item.cgstAmount);
    existing.sgstAmount += num(item.sgstAmount);
    existing.igstAmount += num(item.igstAmount);
    existing.totalTax +=
      num(item.cgstAmount) + num(item.sgstAmount) + num(item.igstAmount);

    map.set(key, existing);
  });

  // Round the accumulated sums to 2dp for clean display.
  return Array.from(map.values()).map((row) => ({
    ...row,
    taxableValue: Math.round(row.taxableValue * 100) / 100,
    cgstAmount: Math.round(row.cgstAmount * 100) / 100,
    sgstAmount: Math.round(row.sgstAmount * 100) / 100,
    igstAmount: Math.round(row.igstAmount * 100) / 100,
    totalTax: Math.round(row.totalTax * 100) / 100,
  }));
};

/**
 * Per-type body partial + presentation config. One entry per document type;
 * the body partial composes the shared partials around a type-specific title,
 * copy label, and (for proforma) a compliance disclaimer. `disclaimer` is
 * rendered by the footer partial via doc.disclaimer.
 */
const DOC_CONFIG = {
  tax_invoice: {
    title: "Tax Invoice",
    bodyPartial: "taxInvoiceBody",
    copyLabel: "Original for Recipient",
    dueLabel: "Due Date",
    billLabel: "Bill To",
  },
  quotation: {
    title: "Quotation",
    bodyPartial: "quotationBody",
    copyLabel: "",
    dueLabel: "Valid Until",
    billLabel: "Quote To",
  },
  proforma: {
    title: "Proforma Invoice",
    bodyPartial: "proformaBody",
    copyLabel: "",
    dueLabel: "Due Date",
    billLabel: "Bill To",
    disclaimer:
      "This is a Proforma Invoice, not a Tax Invoice. It is issued for " +
      "information only and is not valid for claiming input tax credit (ITC).",
  },
  purchase_order: {
    title: "Purchase Order",
    bodyPartial: "purchaseOrderBody",
    copyLabel: "",
    dueLabel: "Expected Delivery",
    billLabel: "Vendor",
  },
};

const getDocConfig = (docType) =>
  DOC_CONFIG[docType] || {
    title: "Document",
    bodyPartial: "taxInvoiceBody",
    copyLabel: "",
    dueLabel: "Due Date",
    billLabel: "Bill To",
  };

const formatDate = (value) => {
  if (!value) {
    return null;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return String(value);
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
};

/**
 * Build the computed-document JSON the renderer consumes. The GST engine is
 * the authority for per-line tax + totals; the stored snapshot supplies the
 * descriptive line fields (name/hsn/uqc) and the round-off/grand-total that
 * was frozen at finalize.
 *
 * @param {Object} doc      documents row
 * @param {Array}  items    document_items rows
 * @param {Object} seller   seller_profile row
 * @param {boolean} draft   render as a draft (watermark) or finalized
 * @returns {Object} { doc, seller, party, items, totals, hsnSummary }
 */
const buildDocumentJson = (doc, items, seller, draft) => {
  const config = getDocConfig(doc.doc_type);

  // Recompute via the engine for an authoritative per-line/total breakup.
  const computed = computeDocument({
    sellerStateCode: doc.seller_state_code || seller.state_code,
    placeOfSupplyStateCode: doc.place_of_supply_code,
    taxTreatment: doc.tax_treatment,
    reverseCharge: !!doc.reverse_charge,
    roundingMode: seller.rounding_mode || "nearest",
    items: items.map((line) => ({
      qty: line.qty,
      rate: line.rate,
      discountType: line.discount_type,
      discountValue: line.discount_value,
      gstRate: line.gst_rate,
    })),
  });

  // Merge engine output with the descriptive snapshot fields per line.
  const mergedItems = items.map((line, index) => {
    const c = computed.items[index] || {};
    return {
      name: line.name,
      description: line.description,
      hsnSac: line.hsn_sac,
      uqc: line.uqc,
      qty: num(line.qty),
      rate: num(line.rate),
      discountAmount: num(c.discountAmount),
      taxableValue: num(c.taxableValue),
      gstRate: num(c.gstRate),
      cgstRate: num(c.cgstRate),
      sgstRate: num(c.sgstRate),
      igstRate: num(c.igstRate),
      cgstAmount: num(c.cgstAmount),
      sgstAmount: num(c.sgstAmount),
      igstAmount: num(c.igstAmount),
      lineTotal: num(c.lineTotal),
    };
  });

  // For finalized/cancelled docs prefer the FROZEN snapshot round-off + grand
  // total over the live recompute, so changing seller.rounding_mode after
  // finalize can never drift an immutable invoice's totals. Drafts recompute.
  const isFrozen = doc.status === "finalized" || doc.status === "cancelled";
  const totals = {
    ...computed.totals,
    supplyType: doc.supply_type || computed.supplyType,
    ...(isFrozen
      ? { roundOff: num(doc.round_off), grandTotal: num(doc.grand_total) }
      : {}),
  };

  // Resolve the logo key -> public URL for the template. The signature image
  // is no longer printed — the signatory name block + sysgen note replace it
  // (signature_key stays stored in case it's ever wanted back).
  const logoKey = doc.seller_logo_key || seller.logo_key;

  const hasShipping = !!(
    doc.party_shipping_address_line1 || doc.party_shipping_city
  );

  return {
    doc: {
      docType: doc.doc_type,
      title: config.title,
      bodyPartial: config.bodyPartial,
      copyLabel: config.copyLabel,
      dueLabel: config.dueLabel,
      // Whether GST columns/rows are printed. Quotations default to no_tax, so
      // their tax columns are suppressed across the shared partials.
      showTax: doc.tax_treatment !== "no_tax",
      disclaimer: config.disclaimer || null,
      draft: !!draft,
      // A cancelled doc renders a CANCELLED watermark so it can never be
      // presented as a valid invoice (mirrors the DRAFT watermark).
      cancelled: doc.status === "cancelled",
      docNumber: doc.doc_number,
      docDate: formatDate(doc.doc_date),
      dueDate: formatDate(doc.due_date),
      referenceNo: doc.reference_no,
      placeOfSupply: doc.place_of_supply,
      placeOfSupplyCode: doc.place_of_supply_code,
      reverseCharge: !!doc.reverse_charge,
      currency: doc.currency || "INR",
      amountInWords: doc.amount_in_words || computed.amountInWords,
      terms: doc.terms,
      declaration: doc.declaration || seller.default_declaration,
      notes: doc.notes,
      // Phase 6 (e-invoice) skipped — QR slot in footer.hbs is commented out too.
      // signedQrCode: doc.signed_qr_code || null,
    },
    seller: {
      legalName: doc.seller_legal_name || seller.legal_name,
      tradeName: doc.seller_trade_name || seller.trade_name,
      gstin: doc.seller_gstin || seller.gstin,
      pan: doc.seller_pan || seller.pan,
      cin: doc.seller_cin || seller.cin,
      addressLine1: doc.seller_address_line1 || seller.address_line1,
      addressLine2: doc.seller_address_line2 || seller.address_line2,
      city: doc.seller_city || seller.city,
      state: doc.seller_state || seller.state,
      stateCode: doc.seller_state_code || seller.state_code,
      pincode: doc.seller_pincode || seller.pincode,
      email: doc.seller_email || seller.email,
      phone: doc.seller_phone || seller.phone,
      bankName: doc.seller_bank_name || seller.bank_name,
      bankAccountName: doc.seller_bank_account_name || seller.bank_account_name,
      bankAccountNo: doc.seller_bank_account_no || seller.bank_account_no,
      bankIfsc: doc.seller_bank_ifsc || seller.bank_ifsc,
      bankBranch: doc.seller_bank_branch || seller.bank_branch,
      upiId: doc.seller_upi_id || seller.upi_id,
      signatoryName: doc.seller_signatory_name || seller.signatory_name,
      signatoryDesignation:
        doc.seller_signatory_designation || seller.signatory_designation,
      hasBank: !!(
        (doc.seller_bank_name || seller.bank_name) ||
        (doc.seller_bank_account_no || seller.bank_account_no) ||
        (doc.seller_upi_id || seller.upi_id)
      ),
      logoUrl: logoKey ? storage.assetUrl(logoKey) : null,
    },
    party: {
      billLabel: config.billLabel,
      name: doc.party_name,
      gstin: doc.party_gstin,
      phone: doc.party_phone,
      email: doc.party_email,
      billingAddressLine1: doc.party_billing_address_line1,
      billingAddressLine2: doc.party_billing_address_line2,
      billingCity: doc.party_billing_city,
      billingState: doc.party_billing_state,
      billingStateCode: doc.party_billing_state_code,
      billingPincode: doc.party_billing_pincode,
      hasShipping,
      shippingAddressLine1: doc.party_shipping_address_line1,
      shippingAddressLine2: doc.party_shipping_address_line2,
      shippingCity: doc.party_shipping_city,
      shippingState: doc.party_shipping_state,
      shippingStateCode: doc.party_shipping_state_code,
      shippingPincode: doc.party_shipping_pincode,
    },
    items: mergedItems,
    totals,
    hsnSummary: buildHsnSummary(mergedItems),
  };
};

// ── Filename helper ──────────────────────────────────────────────────────────
// doc_number "INV/2026-27/0001" -> "INV-2026-27-0001.pdf" (slashes are illegal
// in keys/filenames). Falls back to the id for safety.
const pdfFilename = (doc) => {
  const base = doc.doc_number
    ? String(doc.doc_number).replace(/\//g, "-")
    : `document-${doc.id}`;
  return `${base}.pdf`;
};

// ── Public interface ─────────────────────────────────────────────────────────

/**
 * Render a finalized document, store the PDF, and persist pdf_key + pdf_hash.
 * @param {number} documentId
 * @returns {Promise<string>} the stored pdf key
 */
const generateAndStorePdf = async (documentId) => {
  const doc = await loadDocument(documentId);

  // Only finalized docs are rendered + stored. A cancelled doc keeps whatever
  // finalized PDF it had, but is NEVER re-stored (that would let a re-export
  // overwrite the frozen evidence and, worse, mint a clean unmarked PDF under
  // the retained number). Cancelled docs are served watermarked on the fly.
  if (doc.status !== "finalized") {
    throw new AppError("Only finalized documents can be stored as PDF", 409);
  }

  const [items, seller] = await Promise.all([
    loadItems(documentId),
    loadSeller(),
  ]);

  const json = buildDocumentJson(doc, items, seller, false);
  const buffer = await renderer.renderPdf(json);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  // Cache guard: identical content hash to what's already stored ⇒ the freshly
  // rendered bytes are equivalent, so skip the redundant storage write + DB
  // update (immutable finalized docs make this safe). Only helps when Puppeteer
  // output is byte-deterministic; otherwise falls back to always-write.
  if (doc.pdf_key && doc.pdf_hash === hash) {
    return doc.pdf_key;
  }

  const key = await storage.putBuffer(
    PDF_FOLDER,
    pdfFilename(doc),
    buffer,
    "application/pdf"
  );

  await query(
    "UPDATE documents SET pdf_key = ?, pdf_hash = ? WHERE id = ?",
    [key, hash, documentId]
  );

  return key;
};

/**
 * Get a readable PDF stream + suggested filename for a document.
 *  - finalized: stream the stored PDF; if missing, generate+store then stream.
 *  - draft:     render fresh (DRAFT watermark) and stream; never stored.
 *
 * @param {number} documentId
 * @returns {Promise<{ stream: import('stream').Readable, filename: string }>}
 */
const getPdfStream = async (documentId) => {
  const doc = await loadDocument(documentId);

  // Finalized → stream the immutable stored PDF (regenerate once if missing).
  if (doc.status === "finalized") {
    let key = doc.pdf_key;
    if (!key) {
      key = await generateAndStorePdf(documentId);
    }
    return { stream: storage.getStream(key), filename: pdfFilename(doc) };
  }

  // Draft or cancelled → render on the fly (never stored). buildDocumentJson
  // stamps the DRAFT or CANCELLED watermark from the doc's status, so a
  // cancelled invoice can never be served looking like a valid one.
  const [items, seller] = await Promise.all([
    loadItems(documentId),
    loadSeller(),
  ]);

  const json = buildDocumentJson(doc, items, seller, doc.status === "draft");
  const buffer = await renderer.renderPdf(json);

  const { Readable } = require("stream");
  return {
    stream: Readable.from(buffer),
    filename: pdfFilename(doc),
  };
};

// doc_number "INV/2026-27/0001" -> "INV-2026-27-0001.docx".
const docxFilename = (doc) => pdfFilename(doc).replace(/\.pdf$/i, ".docx");

// Guess an image MIME from a storage key's extension (for data: URIs).
const mimeFromKey = (key) => {
  const ext = String(key || "").split(".").pop().toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "image/png";
};

// Read a stored asset into a base64 data: URI, or null if absent/unreadable
// (so the caller can simply omit the image, matching the no-asset case).
const assetDataUri = async (key) => {
  if (!key) {
    return null;
  }
  try {
    const buffer = await storage.readBuffer(key);
    if (!buffer || !buffer.length) {
      return null;
    }
    return `data:${mimeFromKey(key)};base64,${buffer.toString("base64")}`;
  } catch (e) {
    return null;
  }
};

/**
 * Get a readable Word (.docx) stream + suggested filename for a document. Word
 * is a convenience export rendered ON THE FLY for any status (never stored — the
 * PDF stays the canonical artifact). Draft/cancelled docs carry a status banner
 * (added by the docx renderer) so they can't be passed off as valid.
 *
 * @param {number} documentId
 * @returns {Promise<{ stream: import('stream').Readable, filename: string }>}
 */
const getDocxStream = async (documentId) => {
  const doc = await loadDocument(documentId);
  const [items, seller] = await Promise.all([
    loadItems(documentId),
    loadSeller(),
  ]);

  const json = buildDocumentJson(doc, items, seller, doc.status === "draft");

  // Inline the logo as a data: URI from LOCAL storage so html-to-docx never
  // fetches it over the network (it has no fetch timeout — a slow/unreachable
  // asset host, e.g. a self-request behind a proxy, would hang the export).
  // A missing/unreadable asset resolves to null → the <img> is simply omitted.
  // (The signature image is no longer printed, so only the logo is inlined.)
  const logoKey = doc.seller_logo_key || seller.logo_key;
  json.seller.logoUrl = await assetDataUri(logoKey);

  const buffer = await renderDocx(json);

  const { Readable } = require("stream");
  return {
    stream: Readable.from(buffer),
    filename: docxFilename(doc),
  };
};

module.exports = {
  generateAndStorePdf,
  getPdfStream,
  getDocxStream,
  // exported for unit tests / the documents service that re-uses the JSON shape
  buildDocumentJson,
};
