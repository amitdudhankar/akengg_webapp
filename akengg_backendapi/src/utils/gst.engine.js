// src/utils/gst.engine.js
// ─────────────────────────────────────────────────────────────────────────
// GST tax engine — PURE, server-authoritative, dependency-free.
//
// This module is the single source of truth for Indian GST computation on a
// document (Quotation / Proforma / Purchase Order / Tax Invoice). It performs
// NO database access and has NO side effects: given raw line inputs it returns
// a fully computed document JSON (per-line tax breakup + totals + amount in
// words). The admin client mirrors this logic for live UX only — the server
// recomputes here and wins.
//
// Money model: mysql2 returns DECIMAL columns as strings, so every numeric
// input is coerced with Number() and every monetary output is guarded with
// round2() to avoid binary-float drift.
//
// Tax rules (per blueprint §3/§4):
//   supplyType  = sellerStateCode === placeOfSupplyStateCode ? 'intra' : 'inter'
//   intra ⇒ CGST = SGST = gstRate / 2 (each), IGST = 0
//   inter ⇒ IGST = gstRate,            CGST = SGST = 0
//   Round EACH money value per line, THEN sum (matches printed tax columns).
//   Reverse charge ⇒ grand_total EXCLUDES tax (recipient pays it), but the
//   tax amounts are still computed and returned for printing.
// ─────────────────────────────────────────────────────────────────────────
const AppError = require("./appError");

/**
 * Round to 2 decimal places, defeating binary-float representation error.
 * @param {number} x
 * @returns {number}
 */
const round2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;

// ── Indian number → words ──────────────────────────────────────────────────
const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

/**
 * Convert an integer in [0, 99] to words.
 * @param {number} n
 * @returns {string}
 */
const twoDigitsToWords = (n) => {
  if (n < 20) {
    return ONES[n];
  }

  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens];
};

/**
 * Convert an integer in [0, 999] to words (e.g. "One Hundred Twenty Three").
 * @param {number} n
 * @returns {string}
 */
const threeDigitsToWords = (n) => {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  const parts = [];
  if (hundreds) {
    parts.push(`${ONES[hundreds]} Hundred`);
  }
  if (rest) {
    parts.push(twoDigitsToWords(rest));
  }

  return parts.join(" ");
};

/**
 * Convert a non-negative integer to words using the Indian numbering system
 * (Crore / Lakh / Thousand / Hundred grouping).
 * @param {number} n
 * @returns {string}
 */
const integerToIndianWords = (n) => {
  if (n === 0) {
    return "Zero";
  }

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const belowThousand = n % 1000;

  const parts = [];
  if (crore) {
    parts.push(`${integerToIndianWords(crore)} Crore`);
  }
  if (lakh) {
    parts.push(`${twoDigitsToWords(lakh)} Lakh`);
  }
  if (thousand) {
    parts.push(`${twoDigitsToWords(thousand)} Thousand`);
  }
  if (belowThousand) {
    parts.push(threeDigitsToWords(belowThousand));
  }

  return parts.join(" ");
};

/**
 * Convert a monetary amount (rupees) to an Indian-style words string:
 *   "Indian Rupees One Lakh Twenty Three Thousand and Fifty Paise Only"
 * Handles 0, sub-rupee paise-only amounts, and values over 1 crore. The
 * fractional part is rounded to 2 decimals (paise) before conversion. No npm
 * dependency is used.
 * @param {number} amount
 * @returns {string}
 */
const numToIndianWords = (amount) => {
  const value = round2(Math.abs(Number(amount) || 0));
  const rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);

  const sign = (Number(amount) || 0) < 0 ? "Minus " : "";

  const rupeeWords =
    rupees > 0 ? `${integerToIndianWords(rupees)} ` : "";
  const paiseWords =
    paise > 0 ? `and ${twoDigitsToWords(paise)} Paise ` : "";

  // Zero amount: "Indian Rupees Zero Only".
  if (rupees === 0 && paise === 0) {
    return "Indian Rupees Zero Only";
  }

  // Paise-only amount: "Indian Rupees Fifty Paise Only" (no "and" prefix).
  if (rupees === 0) {
    return `${sign}Indian Rupees ${twoDigitsToWords(paise)} Paise Only`;
  }

  return `${sign}Indian Rupees ${rupeeWords}${paiseWords}Only`.replace(
    /\s+/g,
    " "
  );
};

// ── Document computation ───────────────────────────────────────────────────

/**
 * Apply the configured whole-rupee rounding mode to a pre-round total.
 * @param {number} preRound
 * @param {('nearest'|'up'|'down'|'none')} roundingMode
 * @returns {number}
 */
const applyRounding = (preRound, roundingMode) => {
  switch (roundingMode) {
    case "up":
      return Math.ceil(preRound);
    case "down":
      return Math.floor(preRound);
    case "none":
      // No whole-rupee rounding — keep paise precision.
      return round2(preRound);
    case "nearest":
    default:
      return Math.round(preRound);
  }
};

/**
 * Compute the per-line discount amount for a single line.
 * @param {number} gross        gross amount (qty * rate, rounded)
 * @param {('percent'|'amount')} discountType
 * @param {number} discountValue
 * @returns {number} rounded discount, never exceeding gross
 */
const lineDiscount = (gross, discountType, discountValue) => {
  const value = Number(discountValue) || 0;
  if (value <= 0) {
    return 0;
  }

  const discount =
    discountType === "percent" ? (gross * value) / 100 : value;

  // A discount can never exceed the gross (taxable floors at 0).
  return round2(Math.min(gross, Math.max(0, discount)));
};

/**
 * Compute a full document: per-line GST breakup + aggregated totals + amount
 * in words. Pure — throws AppError(422) only when state codes are missing.
 *
 * @param {Object} input
 * @param {string} input.sellerStateCode             2-char GST state code of seller
 * @param {string} input.placeOfSupplyStateCode      2-char GST state code of place of supply
 * @param {('exclusive'|'inclusive'|'no_tax')} [input.taxTreatment='exclusive']
 * @param {boolean} [input.reverseCharge=false]
 * @param {('nearest'|'up'|'down'|'none')} [input.roundingMode='nearest']
 * @param {Array<Object>} [input.items]
 *        each: { qty, rate, discountType, discountValue, gstRate }
 * @returns {Object} { supplyType, items, totals, amountInWords }
 */
const computeDocument = (input = {}) => {
  const {
    sellerStateCode,
    placeOfSupplyStateCode,
    taxTreatment = "exclusive",
    reverseCharge = false,
    roundingMode = "nearest",
    items = [],
  } = input;

  // ── Supply type (intra vs inter) ──────────────────────────────────────
  const seller = String(sellerStateCode || "").trim();
  const pos = String(placeOfSupplyStateCode || "").trim();

  if (!seller || !pos) {
    throw new AppError(
      "Seller state and place of supply are required to compute GST",
      422
    );
  }

  const supplyType = seller === pos ? "intra" : "inter";
  const noTax = taxTreatment === "no_tax";
  const inclusive = taxTreatment === "inclusive";

  // ── Per-line computation ──────────────────────────────────────────────
  const computedItems = (items || []).map((line) => {
    const qty = Number(line.qty) || 0;
    const rate = Number(line.rate) || 0;
    const gstRate = noTax ? 0 : Number(line.gstRate) || 0;

    const grossAmount = round2(qty * rate);
    const discountAmount = lineDiscount(
      grossAmount,
      line.discountType,
      line.discountValue
    );
    const netAmount = round2(Math.max(0, grossAmount - discountAmount));

    // Taxable value depends on the treatment:
    //  - no_tax / exclusive: taxable = net (tax added on top, or none)
    //  - inclusive: net already includes tax → back out the taxable base
    let taxableValue;
    if (inclusive && gstRate > 0) {
      taxableValue = round2(netAmount / (1 + gstRate / 100));
    } else {
      taxableValue = netAmount;
    }

    // GST rate split by supply type.
    const cgstRate = !noTax && supplyType === "intra" ? gstRate / 2 : 0;
    const sgstRate = !noTax && supplyType === "intra" ? gstRate / 2 : 0;
    const igstRate = !noTax && supplyType === "inter" ? gstRate : 0;

    // Round EACH money value per line, then sum.
    const cgstAmount = round2((taxableValue * cgstRate) / 100);
    const sgstAmount = round2((taxableValue * sgstRate) / 100);
    const igstAmount = round2((taxableValue * igstRate) / 100);

    const lineTotal = round2(
      taxableValue + cgstAmount + sgstAmount + igstAmount
    );

    return {
      grossAmount,
      discountAmount,
      taxableValue,
      gstRate,
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      lineTotal,
    };
  });

  // ── Totals (sum the per-line rounded values) ──────────────────────────
  const totals = computedItems.reduce(
    (acc, item) => {
      acc.subTotal = round2(acc.subTotal + item.grossAmount);
      acc.totalDiscount = round2(acc.totalDiscount + item.discountAmount);
      acc.totalTaxable = round2(acc.totalTaxable + item.taxableValue);
      acc.totalCgst = round2(acc.totalCgst + item.cgstAmount);
      acc.totalSgst = round2(acc.totalSgst + item.sgstAmount);
      acc.totalIgst = round2(acc.totalIgst + item.igstAmount);
      return acc;
    },
    {
      subTotal: 0,
      totalDiscount: 0,
      totalTaxable: 0,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 0,
    }
  );

  totals.totalTax = round2(
    totals.totalCgst + totals.totalSgst + totals.totalIgst
  );

  // Reverse charge: the recipient pays the tax to the govt, so the payable
  // grand total EXCLUDES tax — but tax amounts above are still computed.
  const preRound = reverseCharge
    ? totals.totalTaxable
    : round2(totals.totalTaxable + totals.totalTax);

  const grandTotal = round2(applyRounding(preRound, roundingMode));
  totals.roundOff = round2(grandTotal - preRound);
  totals.grandTotal = grandTotal;

  return {
    supplyType,
    items: computedItems,
    totals,
    amountInWords: numToIndianWords(grandTotal),
  };
};

module.exports = {
  round2,
  numToIndianWords,
  computeDocument,
};
