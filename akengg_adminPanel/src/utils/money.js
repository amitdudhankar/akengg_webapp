// src/utils/money.js
// Display helpers for money & numbers in the document builder. Pure formatting
// only — never feed formatted strings back into the GST engine (use raw
// numbers there). All amounts are Indian Rupees (INR), en-IN locale.

const inrCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrNumber = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a value as Indian Rupee currency, e.g. 123456.5 → "₹1,23,456.50".
 * Non-finite / non-numeric input falls back to "₹0.00".
 * @param {number|string} n
 * @returns {string}
 */
export const formatINR = (n) => {
  const value = Number(n);
  return inrCurrency.format(Number.isFinite(value) ? value : 0);
};

/**
 * Format a value as an en-IN grouped number WITHOUT the currency symbol,
 * e.g. 123456.5 → "1,23,456.50". Handy for tax columns inside a table where
 * the rupee symbol is shown once in the header.
 * @param {number|string} n
 * @param {number} [fractionDigits=2]
 * @returns {string}
 */
export const formatNumber = (n, fractionDigits = 2) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return (0).toFixed(fractionDigits);
  if (fractionDigits === 2) return inrNumber.format(value);
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
};

export default formatINR;
