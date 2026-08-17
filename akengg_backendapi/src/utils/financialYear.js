// src/utils/financialYear.js
// Indian Financial Year helpers (April 1 - March 31 boundary).

/**
 * Return the Indian Financial Year label "YYYY-YY" for a given date.
 * The FY runs from April 1 to March 31, e.g.
 *   2026-04-15 -> "2026-27"
 *   2026-02-10 -> "2025-26"
 *
 * @param {Date|string} [date=new Date()] A Date instance or ISO date string.
 * @returns {string} FY label in the form "YYYY-YY".
 */
const getFinancialYear = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date passed to getFinancialYear: ${date}`);
  }

  const year = d.getFullYear();
  const month = d.getMonth(); // 0 = January, 3 = April

  // Months Jan(0)-Mar(2) belong to the FY that started the previous April.
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;

  return `${startYear}-${String(endYear).slice(-2)}`;
};

/**
 * Format a document number from its parts.
 *   formatDocNumber("INV", "2026-27", 7) -> "INV/2026-27/0007"
 *
 * @param {string} prefix Document prefix (e.g. "INV", "QTN").
 * @param {string} fy Financial year label (e.g. "2026-27").
 * @param {number|string} seq Sequence number, zero-padded to 4 digits.
 * @returns {string} Formatted document number.
 */
const formatDocNumber = (prefix, fy, seq) =>
  `${prefix}/${fy}/${String(seq).padStart(4, "0")}`;

module.exports = { getFinancialYear, formatDocNumber };
