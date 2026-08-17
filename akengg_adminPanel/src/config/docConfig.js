// src/config/docConfig.js
// ─────────────────────────────────────────────────────────────────────────
// Per-document-type configuration for the generic DocumentBuilder.
//
// Phase 1 ships TAX INVOICE only, but the builder is driven entirely by these
// config entries so Phase 2 (quotation / proforma / purchase_order) is added
// by appending ONE entry per type below — no component changes required.
//
// Field meanings:
//   key           route/url slug ('tax-invoice')
//   type          backend doc_type enum value ('tax_invoice')
//   title         human label for headings & buttons
//   numberPrefix  numbering prefix (INV/QTN/PI/PO) — advisory preview only;
//                 the backend numbering.service is authoritative at finalize
//   partyRole     which parties.party_type to pick ('client' | 'vendor')
//   partyLabel    label shown above the PartyPicker ('Bill To' / 'Vendor')
//   showFields    which optional meta fields the form renders
//   showGst       whether GST columns/rows are shown & computed
//   taxTreatment  default tax treatment ('exclusive' | 'inclusive' | 'no_tax')
//   finalizeLabel CTA wording for the finalize action
// ─────────────────────────────────────────────────────────────────────────

export const DOC_CONFIG = {
  "tax-invoice": {
    key: "tax-invoice",
    type: "tax_invoice",
    title: "Tax Invoice",
    numberPrefix: "INV",
    partyRole: "client",
    partyLabel: "Bill To",
    showFields: {
      docDate: true,
      dueDate: true,
      referenceNo: true,
      placeOfSupply: true,
      reverseCharge: true,
      shipping: true,
    },
    showGst: true,
    taxTreatment: "exclusive",
    finalizeLabel: "Finalize Invoice",
    convertibleTo: [], // terminal
  },

  // ── Phase 2 — Quotation ────────────────────────────────────────────────
  // Resolved decision (blueprint §9 Q5): quotations default to no_tax — no GST
  // is shown — but remain overridable. Place of supply is still collected
  // because the engine needs seller + place-of-supply state codes to finalize.
  quotation: {
    key: "quotation",
    type: "quotation",
    title: "Quotation",
    numberPrefix: "QTN",
    partyRole: "client",
    partyLabel: "Quote To",
    showFields: {
      docDate: true,
      dueDate: false,
      referenceNo: true,
      placeOfSupply: true,
      reverseCharge: false,
      shipping: false,
    },
    showGst: false,
    taxTreatment: "no_tax",
    finalizeLabel: "Finalize Quotation",
    convertibleTo: ["proforma", "tax-invoice"],
  },

  // ── Phase 2 — Proforma Invoice ─────────────────────────────────────────
  proforma: {
    key: "proforma",
    type: "proforma",
    title: "Proforma Invoice",
    numberPrefix: "PI",
    partyRole: "client",
    partyLabel: "Bill To",
    showFields: {
      docDate: true,
      dueDate: true,
      referenceNo: true,
      placeOfSupply: true,
      reverseCharge: true,
      shipping: true,
    },
    showGst: true,
    taxTreatment: "exclusive",
    finalizeLabel: "Finalize Proforma",
    convertibleTo: ["tax-invoice"],
  },

  // ── Phase 2 — Purchase Order (we are the buyer; party is the vendor) ────
  "purchase-order": {
    key: "purchase-order",
    type: "purchase_order",
    title: "Purchase Order",
    numberPrefix: "PO",
    partyRole: "vendor",
    partyLabel: "Vendor",
    showFields: {
      docDate: true,
      dueDate: false,
      referenceNo: true,
      placeOfSupply: true,
      reverseCharge: true,
      shipping: true,
    },
    showGst: true,
    taxTreatment: "exclusive",
    finalizeLabel: "Finalize Purchase Order",
    convertibleTo: [], // buy-side; no sell-side conversion target
  },
};

/**
 * Look up a doc config by its url key. Returns undefined for unknown types so
 * the caller can render a not-found state.
 * @param {string} key
 * @returns {object|undefined}
 */
export const getDocConfig = (key) => DOC_CONFIG[key];

/** Every configured doc type, e.g. for nav/menu generation. */
export const DOC_TYPES = Object.values(DOC_CONFIG);

// Backend doc_type enum → url slug, and → human label. Derived from DOC_CONFIG
// so the list/builder don't maintain their own parallel maps.
export const TYPE_TO_SLUG = DOC_TYPES.reduce((acc, cfg) => {
  acc[cfg.type] = cfg.key;
  return acc;
}, {});

export const TYPE_LABELS = DOC_TYPES.reduce((acc, cfg) => {
  acc[cfg.type] = cfg.title;
  return acc;
}, {});

/**
 * Legal conversion targets for a document, by its url slug. Returns an array of
 * { slug, type, title } the UI can render directly into a Convert menu.
 * @param {string} slug  docConfig key, e.g. "quotation"
 * @returns {Array<{slug:string,type:string,title:string}>}
 */
export const getConvertTargets = (slug) => {
  const cfg = DOC_CONFIG[slug];
  if (!cfg || !cfg.convertibleTo?.length) return [];
  return cfg.convertibleTo
    .map((targetSlug) => DOC_CONFIG[targetSlug])
    .filter(Boolean)
    .map((c) => ({ slug: c.key, type: c.type, title: c.title }));
};

// ── GST state codes (2-char) ───────────────────────────────────────────────
// Shared list for place-of-supply selection (DocumentMeta) and party state
// validation. Code is the GST state code; name is the official state/UT name.
export const GST_STATES = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
];

/** Common GST slab rates for the line-item dropdown. */
export const GST_RATE_OPTIONS = [0, 0.25, 3, 5, 12, 18, 28];

/** Common Unit Quantity Codes (UQC) for the line-item unit dropdown. */
export const UQC_OPTIONS = [
  "NOS",
  "PCS",
  "KGS",
  "MTR",
  "SQM",
  "LTR",
  "BOX",
  "SET",
  "UNT",
  "HRS",
  "DAY",
  "JOB",
];

export default DOC_CONFIG;
