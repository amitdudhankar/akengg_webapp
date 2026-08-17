// src/utils/gstin.js
// Client mirror of backend src/utils/gstin.js — UX-only (the server is
// authoritative on write + finalize). Keep byte-for-byte equivalent logic:
// 15-char GSTIN = [2-digit state][10 PAN][1 entity][Z][1 mod-36 check char].
const GST_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MOD = GST_ALPHABET.length; // 36
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const normalize = (gstin) =>
  typeof gstin === "string" ? gstin.trim().toUpperCase() : "";

export function computeChecksumChar(first14) {
  let sum = 0;
  for (let i = 0; i < first14.length; i += 1) {
    const code = GST_ALPHABET.indexOf(first14[i]);
    if (code < 0) return null;
    const factor = i % 2 === 0 ? 1 : 2;
    const product = code * factor;
    sum += Math.floor(product / MOD) + (product % MOD);
  }
  return GST_ALPHABET[(MOD - (sum % MOD)) % MOD];
}

export function isValidGstin(gstin) {
  const g = normalize(gstin);
  if (!GSTIN_REGEX.test(g)) return false;
  return computeChecksumChar(g.slice(0, 14)) === g[14];
}

export function gstinStateCode(gstin) {
  const g = normalize(gstin);
  return g.length >= 2 ? g.slice(0, 2) : null;
}
