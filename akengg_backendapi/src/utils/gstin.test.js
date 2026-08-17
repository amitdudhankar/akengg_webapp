// src/utils/gstin.test.js — run with: node --test
const test = require("node:test");
const assert = require("node:assert");
const {
  isValidGstin,
  gstinStateCode,
  computeChecksumChar,
} = require("./gstin");

// Independently-confirmed real GSTINs (their actual 15th char). These verify
// the checksum algorithm matches reality, including digit + letter check chars
// and the base-36 fold (trailing 'Z' at an odd index → product 70 → folds).
const VALID = ["27AAPFU0939F1ZV", "29AAGCB7383J1Z4", "24AAACC1206D1ZM"];

test("isValidGstin accepts known-valid GSTINs", () => {
  VALID.forEach((g) => assert.strictEqual(isValidGstin(g), true, g));
});

test("round-trip: a prefix + its computed check char is always valid", () => {
  // Well-formed 14-char prefixes; appending the computed check digit must pass.
  ["27ABCDE1234F1Z", "09ZZZZZ9999Z9Z", "33GSPTN0561G1Z"].forEach((p) => {
    const full = p + computeChecksumChar(p);
    assert.strictEqual(isValidGstin(full), true, full);
  });
});

test("isValidGstin normalizes whitespace + lowercase", () => {
  assert.strictEqual(isValidGstin("  27aapfu0939f1zv  "), true);
});

test("isValidGstin rejects a format-valid but checksum-wrong GSTIN", () => {
  // Flip the last char of a valid one to break only the checksum.
  const valid = "27AAPFU0939F1ZV";
  const wrong = valid.slice(0, 14) + (valid[14] === "A" ? "B" : "A");
  assert.strictEqual(isValidGstin(wrong), false);
});

test("isValidGstin rejects malformed inputs", () => {
  assert.strictEqual(isValidGstin(""), false);
  assert.strictEqual(isValidGstin(null), false);
  assert.strictEqual(isValidGstin("27AAPFU0939F1Z"), false); // 14 chars
  assert.strictEqual(isValidGstin("27AAPFU0939F1ZVX"), false); // 16 chars
  assert.strictEqual(isValidGstin("27AAPFU0939F1AV"), false); // pos-13 not 'Z'
  assert.strictEqual(isValidGstin("2AAAPFU0939F1ZV"), false); // bad state code
  assert.strictEqual(isValidGstin("271APFU0939F1ZV"), false); // bad PAN block
});

test("computeChecksumChar is deterministic for a fixed vector", () => {
  assert.strictEqual(computeChecksumChar("27AAPFU0939F1Z"), "V");
  assert.strictEqual(computeChecksumChar("bad"), null); // lowercase out of alphabet
});

test("gstinStateCode returns the 2-char prefix or null", () => {
  assert.strictEqual(gstinStateCode("27AAPFU0939F1ZV"), "27");
  assert.strictEqual(gstinStateCode("x"), null);
  assert.strictEqual(gstinStateCode(null), null);
});
