// src/services/document.service.js
// ─────────────────────────────────────────────────────────────────────────
// Document builder service (Phase 1 = Tax Invoice). Generic header+items CRUD
// with server-authoritative GST recomputation and gap-free numbering at
// finalize. Structured by docConfig so Phase 2 adds the other 3 types by
// config only.
//
// Authority chain: the client sends raw line inputs; this service recomputes
// EVERYTHING via gst.engine.computeDocument and persists the engine result.
// Drafts have no number; the number is minted only at finalize, inside a
// transaction that locks the numbering row (numbering.service.allocateNextNumber).
// After commit the PDF is rendered/stored best-effort (never rolls back).
// ─────────────────────────────────────────────────────────────────────────
const db = require("../utils/db");
const query = db; // callable default export

const AppError = require("../utils/appError");
const gstEngine = require("../utils/gst.engine");
const { getFinancialYear } = require("../utils/financialYear");
const numberingService = require("./numbering.service");
const { isValidGstin, gstinStateCode } = require("../utils/gstin");

// ── Per-type configuration (drives all 4 builders; only tax_invoice wired now)
// `convertibleTo` is the single source of truth for the Phase 3 conversion
// matrix (sell-side chain only): quotation → proforma → tax_invoice. Terminal
// and buy-side types convert to nothing.
// `requiresTaxCompliance` turns on the CGST Rule 46 finalize gates (seller/party
// GSTIN, place-of-supply, qty>0); `hsnRequired` additionally demands HSN/SAC per
// line. Sell-side tax docs are compliant; quotation/PO are not.
const DOC_CONFIG = {
  quotation: {
    docType: "quotation",
    prefix: "QTN",
    partyType: "client",
    convertibleTo: ["proforma", "tax_invoice"],
    requiresTaxCompliance: false,
    hsnRequired: false,
  },
  proforma: {
    docType: "proforma",
    prefix: "PI",
    partyType: "client",
    convertibleTo: ["tax_invoice"],
    requiresTaxCompliance: true,
    hsnRequired: false,
  },
  purchase_order: {
    docType: "purchase_order",
    prefix: "PO",
    partyType: "vendor",
    convertibleTo: [],
    requiresTaxCompliance: false,
    hsnRequired: false,
  },
  tax_invoice: {
    docType: "tax_invoice",
    prefix: "INV",
    partyType: "client",
    convertibleTo: [],
    requiresTaxCompliance: true,
    hsnRequired: true,
  },
};

const DOC_TYPES = Object.keys(DOC_CONFIG);

const getDocConfig = (docType) => {
  const config = DOC_CONFIG[docType];
  if (!config) {
    throw new AppError(`Unsupported document type: ${docType}`, 400);
  }
  return config;
};

// Legal conversion targets (backend enums) for a given source type.
const getConvertTargets = (docType) => DOC_CONFIG[docType]?.convertibleTo || [];

// ── Helpers ─────────────────────────────────────────────────────────────
const num = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const trimOrNull = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  const str = String(value).trim();
  return str === "" ? null : str;
};

const toBit = (value) => (value ? 1 : 0);

const PARTY_SNAPSHOT_COLUMNS = [
  "party_type",
  "party_name",
  "party_gstin",
  "party_pan",
  "party_email",
  "party_phone",
  "party_is_registered",
  "party_billing_address_line1",
  "party_billing_address_line2",
  "party_billing_city",
  "party_billing_state",
  "party_billing_state_code",
  "party_billing_pincode",
  "party_billing_country",
  "party_shipping_address_line1",
  "party_shipping_address_line2",
  "party_shipping_city",
  "party_shipping_state",
  "party_shipping_state_code",
  "party_shipping_pincode",
  "party_shipping_country",
];

const SELLER_SNAPSHOT_COLUMNS = [
  "seller_legal_name",
  "seller_trade_name",
  "seller_gstin",
  "seller_pan",
  "seller_cin",
  "seller_address_line1",
  "seller_address_line2",
  "seller_city",
  "seller_state",
  "seller_state_code",
  "seller_pincode",
  "seller_country",
  "seller_email",
  "seller_phone",
  "seller_bank_name",
  "seller_bank_account_name",
  "seller_bank_account_no",
  "seller_bank_ifsc",
  "seller_bank_branch",
  "seller_upi_id",
  "seller_logo_key",
  "seller_signature_key",
  "seller_signatory_name",
  "seller_signatory_designation",
];

const DOCUMENT_COLUMNS = [
  "id",
  "doc_type",
  "status",
  "doc_number",
  "financial_year",
  "seq_no",
  "doc_date",
  "due_date",
  "reference_no",
  "party_id",
  ...PARTY_SNAPSHOT_COLUMNS,
  ...SELLER_SNAPSHOT_COLUMNS,
  "place_of_supply",
  "place_of_supply_code",
  "supply_type",
  "tax_treatment",
  "reverse_charge",
  "total_taxable",
  "total_discount",
  "total_cgst",
  "total_sgst",
  "total_igst",
  "total_tax",
  "round_off",
  "grand_total",
  "amount_in_words",
  "currency",
  "terms",
  "declaration",
  "notes",
  "converted_from_id",
  "pdf_key",
  "pdf_hash",
  "created_at",
  "updated_at",
];

const ITEM_COLUMNS = [
  "id",
  "document_id",
  "item_id",
  "line_no",
  "kind",
  "name",
  "description",
  "hsn_sac",
  "qty",
  "uqc",
  "rate",
  "discount_type",
  "discount_value",
  "discount_amount",
  "taxable_value",
  "gst_rate",
  "cgst_rate",
  "cgst_amount",
  "sgst_rate",
  "sgst_amount",
  "igst_rate",
  "igst_amount",
  "line_total",
];

// ── Seller ────────────────────────────────────────────────────────────────
/**
 * Load the single seller profile (id = 1). Throws 404 if it has not been set
 * up yet (the migration seeds an empty row, so this normally returns it).
 * @returns {Promise<Object>}
 */
const loadSeller = async () => {
  const rows = await query("SELECT * FROM seller_profile WHERE id = 1");
  if (!rows.length) {
    throw new AppError("Seller profile is not configured", 404);
  }
  return rows[0];
};

// ── Recompute (map header + seller + items → engine input) ─────────────────
/**
 * Recompute a document with the GST engine from raw inputs. Resolves the place
 * of supply (explicit override → party shipping → party billing state code).
 *
 * @param {Object} documentInput  normalized header (see normalizeHeader)
 * @param {Object} seller         seller_profile row
 * @param {Object} [party]        parties row (optional — may be null)
 * @returns {Object} gstEngine.computeDocument result
 */
const recompute = (documentInput, seller, party) => {
  const placeOfSupplyStateCode =
    trimOrNull(documentInput.place_of_supply_code) ||
    trimOrNull(party && party.shipping_state_code) ||
    trimOrNull(party && party.billing_state_code) ||
    trimOrNull(documentInput.party_shipping_state_code) ||
    trimOrNull(documentInput.party_billing_state_code);

  return gstEngine.computeDocument({
    sellerStateCode: trimOrNull(seller && seller.state_code),
    placeOfSupplyStateCode,
    taxTreatment: documentInput.tax_treatment || "exclusive",
    reverseCharge: !!documentInput.reverse_charge,
    roundingMode: (seller && seller.rounding_mode) || "nearest",
    items: (documentInput.items || []).map((line) => ({
      qty: num(line.qty),
      rate: num(line.rate),
      discountType: line.discount_type === "percent" ? "percent" : "amount",
      discountValue: num(line.discount_value),
      gstRate: num(line.gst_rate),
    })),
  });
};

// ── Input normalization ────────────────────────────────────────────────────
const normalizeItem = (line, index) => ({
  item_id: line.item_id != null ? num(line.item_id) || null : null,
  line_no: line.line_no != null ? num(line.line_no) : index + 1,
  kind: line.kind === "service" ? "service" : "goods",
  name: trimOrNull(line.name) || "",
  description: trimOrNull(line.description),
  hsn_sac: trimOrNull(line.hsn_sac),
  qty: num(line.qty),
  uqc: trimOrNull(line.uqc),
  rate: num(line.rate),
  discount_type: line.discount_type === "percent" ? "percent" : "amount",
  discount_value: num(line.discount_value),
  gst_rate: num(line.gst_rate),
});

const normalizeHeader = (payload) => ({
  doc_type: trimOrNull(payload.doc_type),
  doc_date: trimOrNull(payload.doc_date),
  due_date: trimOrNull(payload.due_date),
  reference_no: trimOrNull(payload.reference_no),
  party_id: payload.party_id != null ? num(payload.party_id) || null : null,
  place_of_supply: trimOrNull(payload.place_of_supply),
  place_of_supply_code: trimOrNull(payload.place_of_supply_code),
  tax_treatment: ["exclusive", "inclusive", "no_tax"].includes(
    payload.tax_treatment
  )
    ? payload.tax_treatment
    : "exclusive",
  reverse_charge: toBit(payload.reverse_charge),
  currency: trimOrNull(payload.currency) || "INR",
  terms: trimOrNull(payload.terms),
  declaration: trimOrNull(payload.declaration),
  notes: trimOrNull(payload.notes),
  items: Array.isArray(payload.items)
    ? payload.items.map((line, index) => normalizeItem(line, index))
    : [],
});

// Load and snapshot a party row into the party_* document columns. Returns the
// raw party row (for place-of-supply resolution) plus a flat snapshot object.
const loadPartySnapshot = async (partyId) => {
  if (!partyId) {
    return { party: null, snapshot: emptyPartySnapshot() };
  }

  const rows = await query("SELECT * FROM parties WHERE id = ?", [partyId]);
  if (!rows.length) {
    throw new AppError("Party not found", 404);
  }

  const p = rows[0];
  return { party: p, snapshot: buildPartySnapshot(p) };
};

const emptyPartySnapshot = () =>
  PARTY_SNAPSHOT_COLUMNS.reduce((acc, col) => {
    acc[col] = col === "party_is_registered" ? 0 : null;
    return acc;
  }, {});

// Map an already-loaded parties row into the flat party_* snapshot columns.
const buildPartySnapshot = (p) => ({
  party_type: p.party_type,
  party_name: p.name,
  party_gstin: p.gstin,
  party_pan: p.pan,
  party_email: p.email,
  party_phone: p.phone,
  party_is_registered: toBit(p.party_is_registered),
  party_billing_address_line1: p.billing_address_line1,
  party_billing_address_line2: p.billing_address_line2,
  party_billing_city: p.billing_city,
  party_billing_state: p.billing_state,
  party_billing_state_code: p.billing_state_code,
  party_billing_pincode: p.billing_pincode,
  party_billing_country: p.billing_country,
  party_shipping_address_line1: p.shipping_address_line1,
  party_shipping_address_line2: p.shipping_address_line2,
  party_shipping_city: p.shipping_city,
  party_shipping_state: p.shipping_state,
  party_shipping_state_code: p.shipping_state_code,
  party_shipping_pincode: p.shipping_pincode,
  party_shipping_country: p.shipping_country,
});

const buildSellerSnapshot = (seller) => ({
  seller_legal_name: seller.legal_name,
  seller_trade_name: seller.trade_name,
  seller_gstin: seller.gstin,
  seller_pan: seller.pan,
  seller_cin: seller.cin,
  seller_address_line1: seller.address_line1,
  seller_address_line2: seller.address_line2,
  seller_city: seller.city,
  seller_state: seller.state,
  seller_state_code: seller.state_code,
  seller_pincode: seller.pincode,
  seller_country: seller.country,
  seller_email: seller.email,
  seller_phone: seller.phone,
  seller_bank_name: seller.bank_name,
  seller_bank_account_name: seller.bank_account_name,
  seller_bank_account_no: seller.bank_account_no,
  seller_bank_ifsc: seller.bank_ifsc,
  seller_bank_branch: seller.bank_branch,
  seller_upi_id: seller.upi_id,
  seller_logo_key: seller.logo_key,
  seller_signature_key: seller.signature_key,
  seller_signatory_name: seller.signatory_name,
  seller_signatory_designation: seller.signatory_designation,
});

// Merge engine per-line results back onto normalized item inputs for persisting.
const mergeComputedItems = (items, computed) =>
  items.map((line, index) => {
    const c = computed[index] || {};
    return {
      ...line,
      discount_amount: gstEngine.round2(c.discountAmount || 0),
      taxable_value: gstEngine.round2(c.taxableValue || 0),
      // Persist the line's INTENDED slab, not the engine's no_tax-zeroed rate
      // (the engine sets c.gstRate = 0 under no_tax). All tax amounts and the
      // per-tax cgst/sgst/igst rates below still come from the engine, so
      // no_tax documents stay tax-free; this keeps the base rate so a no_tax
      // quotation converts to a taxable invoice without losing its GST rates.
      gst_rate: num(line.gst_rate),
      cgst_rate: num(c.cgstRate),
      cgst_amount: gstEngine.round2(c.cgstAmount || 0),
      sgst_rate: num(c.sgstRate),
      sgst_amount: gstEngine.round2(c.sgstAmount || 0),
      igst_rate: num(c.igstRate),
      igst_amount: gstEngine.round2(c.igstAmount || 0),
      line_total: gstEngine.round2(c.lineTotal || 0),
    };
  });

// ── Persistence (item replace strategy) ─────────────────────────────────────
// Insert document_items for a document using the supplied executor (callable
// query for drafts, or a transaction conn.execute for finalize).
const insertItems = async (executor, documentId, items) => {
  for (let i = 0; i < items.length; i += 1) {
    const line = items[i];
    await executor(
      `INSERT INTO document_items
         (document_id, item_id, line_no, kind, name, description, hsn_sac, qty,
          uqc, rate, discount_type, discount_value, discount_amount,
          taxable_value, gst_rate, cgst_rate, cgst_amount, sgst_rate,
          sgst_amount, igst_rate, igst_amount, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        documentId,
        line.item_id,
        line.line_no != null ? line.line_no : i + 1,
        line.kind,
        line.name,
        line.description,
        line.hsn_sac,
        line.qty,
        line.uqc,
        line.rate,
        line.discount_type,
        line.discount_value,
        line.discount_amount,
        line.taxable_value,
        line.gst_rate,
        line.cgst_rate,
        line.cgst_amount,
        line.sgst_rate,
        line.sgst_amount,
        line.igst_rate,
        line.igst_amount,
        line.line_total,
      ]
    );
  }
};

// callable-query adapter: query(sql, params) → returns rows; we want a uniform
// "executor(sql, params)" that resolves regardless of caller (draft uses query;
// finalize wraps conn.execute below).
const queryExecutor = (sql, params) => query(sql, params);

// ── Read ────────────────────────────────────────────────────────────────────
/**
 * Fetch a single document (header + items) by id. Exposes the engine-style
 * `totals` object alongside the flat columns for client convenience.
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
const getById = async (id) => {
  // Self-join exposes the source's number + type for the provenance banner
  // ("Converted from QTN/2026-27/0007") when this doc was produced by /convert.
  const rows = await query(
    `SELECT d.${DOCUMENT_COLUMNS.join(", d.")},
            src.doc_number AS converted_from_number,
            src.doc_type   AS converted_from_type
     FROM documents d
     LEFT JOIN documents src ON src.id = d.converted_from_id
     WHERE d.id = ?`,
    [id]
  );
  if (!rows.length) {
    throw new AppError("Document not found", 404);
  }

  const header = rows[0];
  const itemRows = await query(
    `SELECT ${ITEM_COLUMNS.join(", ")}
     FROM document_items
     WHERE document_id = ?
     ORDER BY line_no ASC, id ASC`,
    [id]
  );

  return {
    ...header,
    items: itemRows,
    totals: {
      subTotal: num(header.total_taxable) + num(header.total_discount),
      totalDiscount: num(header.total_discount),
      totalTaxable: num(header.total_taxable),
      totalCgst: num(header.total_cgst),
      totalSgst: num(header.total_sgst),
      totalIgst: num(header.total_igst),
      totalTax: num(header.total_tax),
      roundOff: num(header.round_off),
      grandTotal: num(header.grand_total),
    },
  };
};

/**
 * List documents with filters (type/status/party/fy/search) + pagination.
 * @param {Object} filtersInput
 * @returns {Promise<Object>} { documents, page, limit, totalItems, totalPages }
 */
const list = async ({
  type = "",
  status = "",
  party_id = "",
  fy = "",
  search = "",
  page = 1,
  limit = 10,
} = {}) => {
  const parsedPage = Number(page) || 1;
  const parsedLimit = Number(limit) || 10;
  const offset = (parsedPage - 1) * parsedLimit;

  const filters = [];
  const values = [];

  if (type) {
    filters.push("doc_type = ?");
    values.push(type);
  }
  if (status) {
    filters.push("status = ?");
    values.push(status);
  }
  if (party_id) {
    filters.push("party_id = ?");
    values.push(Number(party_id) || 0);
  }
  if (fy) {
    filters.push("financial_year = ?");
    values.push(fy);
  }

  const normalizedSearch = String(search || "").trim();
  if (normalizedSearch) {
    filters.push("(doc_number LIKE ? OR party_name LIKE ? OR reference_no LIKE ?)");
    values.push(
      `%${normalizedSearch}%`,
      `%${normalizedSearch}%`,
      `%${normalizedSearch}%`
    );
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM documents ${whereClause}`,
    values
  );
  const totalItems = Number(countRows[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / parsedLimit));

  const documentRows = await query(
    `SELECT id, doc_type, status, doc_number, financial_year, seq_no, doc_date,
            due_date, party_id, party_name, party_gstin, supply_type,
            tax_treatment, reverse_charge, total_taxable, total_tax,
            grand_total, currency, pdf_key, created_at, updated_at
     FROM documents
     ${whereClause}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [...values, parsedLimit, offset]
  );

  return {
    documents: documentRows,
    page: parsedPage,
    limit: parsedLimit,
    totalItems,
    totalPages,
  };
};

// ── Advisory next number (no increment) ─────────────────────────────────────
/**
 * Preview the next document number for a type at a given date WITHOUT minting
 * it. Pure advisory for the builder header.
 * @param {Object} params { doc_type, doc_date }
 * @returns {Promise<{ docType, financialYear, prefix, seqNo, docNumber }>}
 */
const previewNextNumber = async ({ doc_type, doc_date } = {}) => {
  const config = getDocConfig(doc_type);
  const financialYear = getFinancialYear(doc_date || new Date());
  const { seqNo, docNumber } = await numberingService.peekNextNumber(
    query,
    config.docType,
    financialYear,
    config.prefix
  );

  return {
    docType: config.docType,
    financialYear,
    prefix: config.prefix,
    seqNo,
    docNumber,
  };
};

// ── Write header (draft create/update) ──────────────────────────────────────
const buildHeaderColumns = (header, snapshots, computed) => {
  const totals = computed.totals;
  return {
    doc_type: header.doc_type,
    doc_date: header.doc_date,
    due_date: header.due_date,
    reference_no: header.reference_no,
    party_id: header.party_id,
    ...snapshots.party,
    ...snapshots.seller,
    place_of_supply: header.place_of_supply,
    place_of_supply_code: header.place_of_supply_code,
    supply_type: computed.supplyType,
    tax_treatment: header.tax_treatment,
    reverse_charge: header.reverse_charge,
    total_taxable: totals.totalTaxable,
    total_discount: totals.totalDiscount,
    total_cgst: totals.totalCgst,
    total_sgst: totals.totalSgst,
    total_igst: totals.totalIgst,
    total_tax: totals.totalTax,
    round_off: totals.roundOff,
    grand_total: totals.grandTotal,
    amount_in_words: computed.amountInWords,
    currency: header.currency,
    terms: header.terms,
    declaration: header.declaration,
    notes: header.notes,
  };
};

/**
 * Create a draft document: status 'draft', doc_number NULL, recompute totals,
 * insert header + items (item replace strategy on update). Party + seller are
 * snapshotted now too so drafts preview correctly; they are re-snapshotted and
 * frozen authoritatively at finalize.
 * @param {Object} payload
 * @returns {Promise<Object>} getById result
 */
const create = async (payload) => {
  const header = normalizeHeader(payload);
  const config = getDocConfig(header.doc_type);

  const seller = await loadSeller();
  const { party, snapshot: partySnapshot } = await loadPartySnapshot(
    header.party_id
  );

  const computed = recompute(header, seller, party);
  const items = mergeComputedItems(header.items, computed.items);

  const cols = buildHeaderColumns(header, {
    party: partySnapshot,
    seller: buildSellerSnapshot(seller),
  }, computed);

  cols.doc_type = config.docType;

  const columnNames = Object.keys(cols);
  const placeholders = columnNames.map(() => "?").join(", ");

  const result = await query(
    `INSERT INTO documents (status, ${columnNames.join(", ")})
     VALUES ('draft', ${placeholders})`,
    columnNames.map((name) => cols[name])
  );

  const documentId = result.insertId;
  await insertItems(queryExecutor, documentId, items);

  return getById(documentId);
};

/**
 * Update a draft document. 409 if the document is finalized (immutable).
 * Recompute totals, UPDATE header, replace items.
 * @param {number|string} id
 * @param {Object} payload
 * @returns {Promise<Object>} getById result
 */
const update = async (id, payload) => {
  const existingRows = await query(
    "SELECT id, status, doc_type FROM documents WHERE id = ?",
    [id]
  );
  if (!existingRows.length) {
    throw new AppError("Document not found", 404);
  }
  if (existingRows[0].status === "finalized") {
    throw new AppError("A finalized document cannot be edited", 409);
  }
  if (existingRows[0].status === "cancelled") {
    throw new AppError("A cancelled document cannot be edited", 409);
  }

  const header = normalizeHeader({
    ...payload,
    doc_type: payload.doc_type || existingRows[0].doc_type,
  });
  const config = getDocConfig(header.doc_type);

  const seller = await loadSeller();
  const { party, snapshot: partySnapshot } = await loadPartySnapshot(
    header.party_id
  );

  const computed = recompute(header, seller, party);
  const items = mergeComputedItems(header.items, computed.items);

  const cols = buildHeaderColumns(header, {
    party: partySnapshot,
    seller: buildSellerSnapshot(seller),
  }, computed);
  cols.doc_type = config.docType;

  const assignments = Object.keys(cols)
    .map((name) => `${name} = ?`)
    .join(", ");

  await query(
    `UPDATE documents
     SET ${assignments}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [...Object.keys(cols).map((name) => cols[name]), id]
  );

  // Item replace strategy.
  await query("DELETE FROM document_items WHERE document_id = ?", [id]);
  await insertItems(queryExecutor, id, items);

  return getById(id);
};

// ── Finalize (atomic numbering + snapshot freeze) ───────────────────────────
/**
 * Finalize a document: lock the numbering row, mint a gap-free number, freeze
 * seller + party snapshots, persist recomputed totals, set status='finalized'.
 * After commit, render + store the PDF best-effort (failure is non-fatal — the
 * number is already minted; /re-export can retry).
 * @param {number|string} id
 * @returns {Promise<Object>} getById result
 */
const finalize = async (id) => {
  await db.withTransaction(async (conn) => {
    const exec = (sql, params) => conn.execute(sql, params);

    // Reload header + items + seller inside the transaction.
    const [headerRows] = await conn.execute(
      "SELECT * FROM documents WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!headerRows.length) {
      throw new AppError("Document not found", 404);
    }
    const docRow = headerRows[0];
    if (docRow.status === "finalized") {
      throw new AppError("Document is already finalized", 409);
    }
    if (docRow.status === "cancelled") {
      throw new AppError("A cancelled document cannot be finalized", 409);
    }

    const config = getDocConfig(docRow.doc_type);

    const [itemRows] = await conn.execute(
      `SELECT ${ITEM_COLUMNS.join(", ")}
       FROM document_items
       WHERE document_id = ?
       ORDER BY line_no ASC, id ASC`,
      [id]
    );
    if (!itemRows.length) {
      throw new AppError("Cannot finalize a document with no line items", 422);
    }

    const [sellerRows] = await conn.execute(
      "SELECT * FROM seller_profile WHERE id = 1"
    );
    if (!sellerRows.length) {
      throw new AppError("Seller profile is not configured", 404);
    }
    const seller = sellerRows[0];

    // Re-snapshot the party authoritatively at finalize.
    let party = null;
    let partySnapshot = emptyPartySnapshot();
    if (docRow.party_id) {
      const [partyRows] = await conn.execute(
        "SELECT * FROM parties WHERE id = ?",
        [docRow.party_id]
      );
      if (partyRows.length) {
        party = partyRows[0];
        partySnapshot = buildPartySnapshot(party);
      } else {
        // Party deleted post-draft: keep the existing snapshot on the row.
        partySnapshot = PARTY_SNAPSHOT_COLUMNS.reduce((acc, col) => {
          acc[col] = docRow[col];
          return acc;
        }, {});
      }
    }

    // Recompute from the persisted line snapshots (server-authoritative).
    const recomputeInput = {
      tax_treatment: docRow.tax_treatment,
      reverse_charge: docRow.reverse_charge,
      place_of_supply_code: docRow.place_of_supply_code,
      party_billing_state_code: partySnapshot.party_billing_state_code,
      party_shipping_state_code: partySnapshot.party_shipping_state_code,
      items: itemRows.map((line) => ({
        qty: line.qty,
        rate: line.rate,
        discount_type: line.discount_type,
        discount_value: line.discount_value,
        gst_rate: line.gst_rate,
      })),
    };
    // Recompute, but DEFER the engine's "state/POS missing" 422 so the curated
    // Rule-46 gate messages below win for compliance types (one consistent voice).
    let computed;
    try {
      computed = recompute(recomputeInput, seller, party);
    } catch (e) {
      if (e instanceof AppError && e.statusCode === 422) {
        computed = null;
      } else {
        throw e;
      }
    }

    // ── CGST Rule 46 finalize gates (type-aware; collect ALL failures, throw
    //    422 BEFORE minting a number so a rejected finalize burns no sequence) ──
    const gates = [];
    const compliance = config.requiresTaxCompliance;

    // Gate A — seller GSTIN present + valid AND seller state code present
    // (the engine needs the seller state code; surface it precisely here rather
    // than letting the deferred engine 422 fall through to Gate F).
    if (compliance) {
      const sellerGstin = String(seller.gstin || "").trim().toUpperCase();
      if (!sellerGstin) {
        gates.push(
          "Seller GSTIN is not configured; set it in Seller Profile before finalizing."
        );
      } else if (!isValidGstin(sellerGstin)) {
        gates.push("Seller GSTIN is invalid (checksum failed).");
      }
      const sellerState = String(seller.state_code || "").trim();
      if (!sellerState) {
        gates.push(
          "Seller state code is not configured; set it in Seller Profile before finalizing."
        );
      } else if (
        sellerGstin &&
        isValidGstin(sellerGstin) &&
        gstinStateCode(sellerGstin) !== sellerState
      ) {
        gates.push(
          `Seller GSTIN state code (${gstinStateCode(sellerGstin)}) does not match the seller's state code (${sellerState}).`
        );
      }
    }

    // Gate B — document date present (all types).
    if (!docRow.doc_date) {
      gates.push("Document date is required to finalize.");
    }

    // Gate C — place of supply resolvable (compliance types).
    if (compliance) {
      const posCode =
        String(docRow.place_of_supply_code || "").trim() ||
        String(partySnapshot.party_shipping_state_code || "").trim() ||
        String(partySnapshot.party_billing_state_code || "").trim();
      if (!posCode) {
        gates.push("Place of supply (state code) is required to finalize.");
      }
    }

    // Gate D — B2B registered party: GSTIN present + valid + state prefix match.
    if (compliance && Number(partySnapshot.party_is_registered) === 1) {
      const partyGstin = String(partySnapshot.party_gstin || "")
        .trim()
        .toUpperCase();
      if (!partyGstin) {
        gates.push(
          "Registered (B2B) party must have a GSTIN to finalize a tax document."
        );
      } else if (!isValidGstin(partyGstin)) {
        gates.push("Party GSTIN is invalid (checksum failed).");
      } else {
        // A GSTIN belongs to the party's REGISTERED (billing) state — do not
        // fall back to shipping (a legitimate inter-state ship-to would
        // false-positive a mismatch). Skip the check when billing is absent.
        const partyState = String(
          partySnapshot.party_billing_state_code || ""
        ).trim();
        if (partyState && gstinStateCode(partyGstin) !== partyState) {
          gates.push(
            `Party GSTIN state code (${gstinStateCode(partyGstin)}) does not match the party's billing state code (${partyState}).`
          );
        }
      }
    }

    // Gate E — per-line HSN/SAC (required for tax_invoice) + qty>0 (compliance).
    if (compliance) {
      itemRows.forEach((line, i) => {
        const n = i + 1;
        if (config.hsnRequired && !String(line.hsn_sac || "").trim()) {
          gates.push(`Line ${n}: HSN/SAC is required for a tax invoice.`);
        }
        if (!(Number(line.qty) > 0)) {
          gates.push(`Line ${n}: quantity must be greater than zero.`);
        }
      });
    }

    // Gate F — recomputed totals available + sane (also catches the deferred
    // engine 422). Type-neutral wording (quotation/PO are non-compliance but
    // the engine still needs a seller state code + place of supply to compute).
    if (
      !computed ||
      !(
        Number.isFinite(computed.totals.grandTotal) &&
        computed.totals.grandTotal >= 0
      )
    ) {
      gates.push(
        "Recomputed totals are unavailable. A seller state code and place of supply are required to compute this document; please check the Seller Profile and the document's place of supply."
      );
    }

    if (gates.length) {
      throw new AppError(gates.join(" "), 422);
    }

    // Past the gate throw, `computed` is guaranteed non-null: Gate F (unconditional)
    // rejects a null computed, so reaching here means recompute succeeded.
    const computedItems = mergeComputedItems(
      itemRows.map((line, index) => ({ ...line, line_no: line.line_no ?? index + 1 })),
      computed.items
    );

    // Mint the gap-free number (locks numbering_sequences row).
    const financialYear = getFinancialYear(docRow.doc_date || new Date());
    const { seqNo, docNumber } = await numberingService.allocateNextNumber(
      conn,
      config.docType,
      financialYear,
      config.prefix
    );

    const sellerSnapshot = buildSellerSnapshot(seller);
    const totals = computed.totals;

    const finalizeCols = {
      doc_number: docNumber,
      financial_year: financialYear,
      seq_no: seqNo,
      supply_type: computed.supplyType,
      ...partySnapshot,
      ...sellerSnapshot,
      total_taxable: totals.totalTaxable,
      total_discount: totals.totalDiscount,
      total_cgst: totals.totalCgst,
      total_sgst: totals.totalSgst,
      total_igst: totals.totalIgst,
      total_tax: totals.totalTax,
      round_off: totals.roundOff,
      grand_total: totals.grandTotal,
      amount_in_words: computed.amountInWords,
      status: "finalized",
    };

    const assignments = Object.keys(finalizeCols)
      .map((name) => `${name} = ?`)
      .join(", ");

    await exec(
      `UPDATE documents
       SET ${assignments}, finalized_at = NOW(), updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [...Object.keys(finalizeCols).map((name) => finalizeCols[name]), id]
    );

    // Rewrite item snapshots with the freshly recomputed values.
    await exec("DELETE FROM document_items WHERE document_id = ?", [id]);
    await insertItems(exec, id, computedItems);
  });

  // After commit: render + store the PDF (best-effort; never rolls back).
  try {
    await require("./documentPdf.service").generateAndStorePdf(id);
  } catch (e) {
    console.error("PDF generation failed for document", id, e);
  }

  return getById(id);
};

// ── Remove (draft only) ─────────────────────────────────────────────────────
/**
 * Delete a draft document (cascade removes items). 409 if finalized.
 * @param {number|string} id
 * @returns {Promise<void>}
 */
const remove = async (id) => {
  const rows = await query("SELECT id, status FROM documents WHERE id = ?", [
    id,
  ]);
  if (!rows.length) {
    throw new AppError("Document not found", 404);
  }
  if (rows[0].status === "finalized") {
    throw new AppError("A finalized document cannot be deleted", 409);
  }
  if (rows[0].status === "cancelled") {
    throw new AppError(
      "A cancelled document cannot be deleted; its number is retained for audit",
      409
    );
  }

  await query("DELETE FROM documents WHERE id = ?", [id]);
};

// ── Phase 3 lifecycle: duplicate / convert / cancel ─────────────────────────

// Zero result used when a clone's source lacks the state codes the GST engine
// needs (it throws 422). The clone still saves as a draft; re-finalizing later
// (once place-of-supply is set) recomputes the real tax. mergeComputedItems'
// `computed[index] || {}` guard turns the empty items array into all-zero
// amounts while preserving each line's input gst_rate.
const ZERO_TOTALS = {
  supplyType: "intra",
  amountInWords: gstEngine.numToIndianWords(0),
  items: [],
  totals: {
    subTotal: 0,
    totalDiscount: 0,
    totalTaxable: 0,
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 0,
    totalTax: 0,
    roundOff: 0,
    grandTotal: 0,
  },
};

// recompute() but tolerant of the engine's 422 (missing seller / place-of-supply
// state codes). Scoped to clone flows only so create/update keep strict behavior.
const safeRecompute = (header, seller, party) => {
  try {
    return recompute(header, seller, party);
  } catch (e) {
    if (e && e.statusCode === 422) {
      return ZERO_TOTALS;
    }
    throw e;
  }
};

// Map persisted document_items rows back into normalizeItem-shaped inputs so a
// clone can re-run them through recompute + mergeComputedItems. gst_rate is the
// stored base slab (lossless after the C1 fix in mergeComputedItems).
const sourceItemsToInput = (itemRows) =>
  itemRows.map((line, index) => ({
    item_id: line.item_id,
    line_no: line.line_no != null ? line.line_no : index + 1,
    kind: line.kind,
    name: line.name,
    description: line.description,
    hsn_sac: line.hsn_sac,
    qty: line.qty,
    uqc: line.uqc,
    rate: line.rate,
    discount_type: line.discount_type,
    discount_value: line.discount_value,
    gst_rate: line.gst_rate,
  }));

// Load a source document header + its items for cloning.
const getDocCloneSource = async (id) => {
  const headerRows = await query("SELECT * FROM documents WHERE id = ?", [id]);
  if (!headerRows.length) {
    throw new AppError("Document not found", 404);
  }
  const itemRows = await query(
    `SELECT ${ITEM_COLUMNS.join(", ")}
     FROM document_items
     WHERE document_id = ?
     ORDER BY line_no ASC, id ASC`,
    [id]
  );
  return { source: headerRows[0], items: itemRows };
};

// Resolve a clone's party: re-snapshot fresh from the current master so the new
// draft reflects today's data; if the party was deleted, fall back to copying
// the source's frozen party_* snapshot columns (mirrors finalize's fallback).
const resolveCloneParty = async (source) => {
  if (!source.party_id) {
    return { party: null, partySnapshot: emptyPartySnapshot() };
  }
  try {
    const { party, snapshot } = await loadPartySnapshot(source.party_id);
    if (snapshot) {
      return { party, partySnapshot: snapshot };
    }
  } catch (e) {
    // party deleted post-source → fall through to the frozen snapshot copy.
  }
  const partySnapshot = PARTY_SNAPSHOT_COLUMNS.reduce((acc, col) => {
    acc[col] = source[col];
    return acc;
  }, {});
  return { party: null, partySnapshot };
};

// Shared writer for duplicate + convert: recompute (tolerant), build the header
// columns, INSERT a fresh draft (doc_number/seq/fy/pdf stay NULL by default),
// then insert items. `extraCols` injects convert-only keys (converted_from_id).
// Returns getById(newId).
const insertClone = async (header, partySnapshot, seller, party, extraCols = {}) => {
  const computed = safeRecompute(header, seller, party);
  const items = mergeComputedItems(header.items, computed.items);

  const cols = buildHeaderColumns(
    header,
    { party: partySnapshot, seller: buildSellerSnapshot(seller) },
    computed
  );
  cols.doc_type = header.doc_type;
  Object.assign(cols, extraCols);

  const columnNames = Object.keys(cols);
  const placeholders = columnNames.map(() => "?").join(", ");
  const result = await query(
    `INSERT INTO documents (status, ${columnNames.join(", ")})
     VALUES ('draft', ${placeholders})`,
    columnNames.map((name) => cols[name])
  );

  await insertItems(queryExecutor, result.insertId, items);
  return getById(result.insertId);
};

/**
 * Duplicate any document (draft|finalized|cancelled) into a fresh DRAFT of the
 * SAME type. Number/FY/seq/pdf/finalized_at reset to NULL; converted_from_id is
 * left NULL (a duplicate is not a conversion). Seller + party are re-snapshotted
 * from current masters; items are recomputed. Returns getById(newId).
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
const duplicate = async (id) => {
  const { source, items: srcItems } = await getDocCloneSource(id);
  getDocConfig(source.doc_type); // validate the source type

  const seller = await loadSeller();
  const { party, partySnapshot } = await resolveCloneParty(source);

  const header = {
    doc_type: source.doc_type,
    // today, not the source date — avoids back-dating a clone into a closed FY
    doc_date: new Date().toISOString().slice(0, 10),
    due_date: source.due_date,
    reference_no: source.reference_no,
    party_id: source.party_id,
    place_of_supply: source.place_of_supply,
    place_of_supply_code: source.place_of_supply_code,
    // snapshot state codes so recompute resolves place-of-supply when party is null
    party_billing_state_code: partySnapshot.party_billing_state_code,
    party_shipping_state_code: partySnapshot.party_shipping_state_code,
    tax_treatment: source.tax_treatment,
    reverse_charge: source.reverse_charge,
    currency: source.currency,
    terms: source.terms,
    declaration: source.declaration,
    notes: source.notes,
    items: sourceItemsToInput(srcItems),
  };

  return insertClone(header, partySnapshot, seller, party);
};

/**
 * Convert a source document into a fresh DRAFT of a DIFFERENT type, recording
 * provenance in converted_from_id. The source is never modified. Allowed for
 * draft + finalized sources; blocked for cancelled. Returns getById(newId).
 * @param {number|string} id
 * @param {string} targetType  backend doc_type enum
 * @returns {Promise<Object>}
 */
const convert = async (id, targetType) => {
  const { source, items: srcItems } = await getDocCloneSource(id);
  const sourceConfig = getDocConfig(source.doc_type);
  const targetConfig = getDocConfig(targetType); // 400 if unknown type

  if (source.status === "cancelled") {
    throw new AppError("A cancelled document cannot be converted", 409);
  }
  if (!sourceConfig.convertibleTo.includes(targetConfig.docType)) {
    throw new AppError(
      `Cannot convert a ${source.doc_type} into a ${targetConfig.docType}`,
      422
    );
  }

  const seller = await loadSeller();
  const { party, partySnapshot } = await resolveCloneParty(source);

  // Taxable targets move a no_tax source to 'exclusive' so the carried gst_rates
  // (preserved by the C1 fix) become real tax; otherwise inherit the source.
  const taxableTarget =
    targetConfig.docType === "tax_invoice" ||
    targetConfig.docType === "proforma";
  const targetTreatment =
    taxableTarget && source.tax_treatment === "no_tax"
      ? "exclusive"
      : source.tax_treatment;

  const header = {
    doc_type: targetConfig.docType,
    doc_date: new Date().toISOString().slice(0, 10), // issued now
    due_date: null,
    reference_no: source.doc_number || source.reference_no, // traceable chain
    party_id: source.party_id,
    place_of_supply: source.place_of_supply,
    place_of_supply_code: source.place_of_supply_code,
    party_billing_state_code: partySnapshot.party_billing_state_code,
    party_shipping_state_code: partySnapshot.party_shipping_state_code,
    tax_treatment: targetTreatment,
    reverse_charge: source.reverse_charge,
    currency: source.currency,
    terms: source.terms,
    declaration: source.declaration,
    notes: source.notes,
    items: sourceItemsToInput(srcItems),
  };

  return insertClone(header, partySnapshot, seller, party, {
    converted_from_id: source.id,
  });
};

/**
 * Cancel a FINALIZED document: status → 'cancelled'. The minted number / seq /
 * FY and the stored PDF are RETAINED (gap-free; the number is never reused).
 * draft → 409 (delete instead); already-cancelled → 409.
 * @param {number|string} id
 * @returns {Promise<Object>} getById result
 */
const cancel = async (id) => {
  const rows = await query("SELECT id, status FROM documents WHERE id = ?", [
    id,
  ]);
  if (!rows.length) {
    throw new AppError("Document not found", 404);
  }
  const { status } = rows[0];
  if (status === "draft") {
    throw new AppError("Only a finalized document can be cancelled", 409);
  }
  if (status === "cancelled") {
    throw new AppError("Document is already cancelled", 409);
  }

  // Concurrency-safe conditional flip: 0 rows ⇒ status changed under us.
  const result = await query(
    `UPDATE documents
     SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'finalized'`,
    [id]
  );
  if (!result.affectedRows) {
    throw new AppError("Document is no longer finalized", 409);
  }
  return getById(id);
};

module.exports = {
  DOC_CONFIG,
  DOC_TYPES,
  getConvertTargets,
  loadSeller,
  recompute,
  create,
  update,
  getById,
  list,
  previewNextNumber,
  finalize,
  remove,
  duplicate,
  convert,
  cancel,
};
