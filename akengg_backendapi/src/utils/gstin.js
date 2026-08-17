// src/utils/gstin.js
// ─────────────────────────────────────────────────────────────────────────
// GSTIN validation — pure, dependency-free. A GSTIN is 15 chars:
//   [2-digit state code][10-char PAN][1 entity digit]['Z'][1 checksum char]
// The 15th char is a mod-36 check digit over the first 14 (alphanumerics
// 0-9A-Z) with alternating weights 1,2 and a base-36 digit-fold. This catches
// transposition/typo errors a plain format regex cannot. Server-authoritative;
// the admin mirror (admin/src/utils/gstin.js) must stay byte-for-byte equivalent.
// ─────────────────────────────────────────────────────────────────────────
const GST_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MOD = GST_ALPHABET.length; // 36
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const normalize = (gstin) =>
  typeof gstin === "string" ? gstin.trim().toUpperCase() : "";

/**
 * Compute the GSTIN check character for a 14-char prefix.
 * Alternating weights 1,2 (1 at even index, 2 at odd) with a base-36 digit-fold
 * (Math.floor(p/36) + p%36) — the fold matters once weight-2 products reach 36.
 * @param {string} first14
 * @returns {string|null} the check char, or null if any char is out of alphabet
 */
const computeChecksumChar = (first14) => {
  let sum = 0;
  for (let i = 0; i < first14.length; i += 1) {
    const code = GST_ALPHABET.indexOf(first14[i]);
    if (code < 0) {
      return null;
    }
    const factor = i % 2 === 0 ? 1 : 2;
    const product = code * factor;
    sum += Math.floor(product / MOD) + (product % MOD);
  }
  return GST_ALPHABET[(MOD - (sum % MOD)) % MOD];
};

/**
 * Validate a GSTIN's format AND checksum.
 * @param {string} gstin
 * @returns {boolean}
 */
const isValidGstin = (gstin) => {
  const g = normalize(gstin);
  if (!GSTIN_REGEX.test(g)) {
    return false;
  }
  return computeChecksumChar(g.slice(0, 14)) === g[14];
};

/**
 * The 2-char GST state code prefix of a GSTIN (no validation).
 * @param {string} gstin
 * @returns {string|null}
 */
const gstinStateCode = (gstin) => {
  const g = normalize(gstin);
  return g.length >= 2 ? g.slice(0, 2) : null;
};

module.exports = {
  isValidGstin,
  gstinStateCode,
  computeChecksumChar,
  GSTIN_REGEX,
};
