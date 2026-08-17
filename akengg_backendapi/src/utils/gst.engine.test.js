// src/utils/gst.engine.test.js
// ─────────────────────────────────────────────────────────────────────────
// Unit tests for the pure GST engine. Uses Node's built-in runner — no jest.
//   Run:  node --test src/utils/gst.engine.test.js
// ─────────────────────────────────────────────────────────────────────────
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { round2, numToIndianWords, computeDocument } = require("./gst.engine");

// Helper: a single intra-state, exclusive line on a given slab.
const oneLine = (overrides = {}) =>
  computeDocument({
    sellerStateCode: "27",
    placeOfSupplyStateCode: "27",
    taxTreatment: "exclusive",
    items: [{ qty: 1, rate: 1000, gstRate: 18, ...overrides.line }],
    ...overrides.doc,
  });

// ── round2 ─────────────────────────────────────────────────────────────────
test("round2 rounds to 2 decimals and defeats float drift", () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(2.675), 2.68);
  assert.equal(round2(100), 100);
  assert.equal(round2("123.456"), 123.46);
});

// ── Supply type / state-code validation ─────────────────────────────────────
test("intra vs inter supply type by 2-char state code", () => {
  assert.equal(
    computeDocument({
      sellerStateCode: "27",
      placeOfSupplyStateCode: "27",
      items: [],
    }).supplyType,
    "intra"
  );
  assert.equal(
    computeDocument({
      sellerStateCode: "27",
      placeOfSupplyStateCode: "29",
      items: [],
    }).supplyType,
    "inter"
  );
});

test("throws AppError(422) when seller state code missing", () => {
  assert.throws(
    () =>
      computeDocument({
        placeOfSupplyStateCode: "27",
        items: [],
      }),
    (err) => err.statusCode === 422 && /required to compute GST/.test(err.message)
  );
});

test("throws AppError(422) when place of supply missing", () => {
  assert.throws(
    () =>
      computeDocument({
        sellerStateCode: "27",
        items: [],
      }),
    (err) => err.statusCode === 422
  );
});

// ── GST slabs (intra: CGST+SGST split) ──────────────────────────────────────
test("slab 5% intra splits into CGST 2.5 + SGST 2.5", () => {
  const out = oneLine({ line: { gstRate: 5 } });
  const item = out.items[0];
  assert.equal(item.taxableValue, 1000);
  assert.equal(item.cgstRate, 2.5);
  assert.equal(item.sgstRate, 2.5);
  assert.equal(item.igstRate, 0);
  assert.equal(item.cgstAmount, 25);
  assert.equal(item.sgstAmount, 25);
  assert.equal(item.igstAmount, 0);
  assert.equal(item.lineTotal, 1050);
});

test("slab 12% intra", () => {
  const item = oneLine({ line: { gstRate: 12 } }).items[0];
  assert.equal(item.cgstAmount, 60);
  assert.equal(item.sgstAmount, 60);
  assert.equal(item.lineTotal, 1120);
});

test("slab 18% intra", () => {
  const item = oneLine({ line: { gstRate: 18 } }).items[0];
  assert.equal(item.cgstRate, 9);
  assert.equal(item.sgstRate, 9);
  assert.equal(item.cgstAmount, 90);
  assert.equal(item.sgstAmount, 90);
  assert.equal(item.lineTotal, 1180);
});

test("slab 28% intra", () => {
  const item = oneLine({ line: { gstRate: 28 } }).items[0];
  assert.equal(item.cgstRate, 14);
  assert.equal(item.sgstRate, 14);
  assert.equal(item.cgstAmount, 140);
  assert.equal(item.sgstAmount, 140);
  assert.equal(item.lineTotal, 1280);
});

// ── Inter-state (IGST) ──────────────────────────────────────────────────────
test("inter-state uses IGST only, no CGST/SGST", () => {
  const out = computeDocument({
    sellerStateCode: "27",
    placeOfSupplyStateCode: "07",
    taxTreatment: "exclusive",
    items: [{ qty: 2, rate: 500, gstRate: 18 }],
  });
  const item = out.items[0];
  assert.equal(out.supplyType, "inter");
  assert.equal(item.taxableValue, 1000);
  assert.equal(item.igstRate, 18);
  assert.equal(item.igstAmount, 180);
  assert.equal(item.cgstAmount, 0);
  assert.equal(item.sgstAmount, 0);
  assert.equal(item.lineTotal, 1180);
  assert.equal(out.totals.totalIgst, 180);
  assert.equal(out.totals.totalCgst, 0);
  assert.equal(out.totals.totalSgst, 0);
});

// ── Discounts ───────────────────────────────────────────────────────────────
test("percent discount reduces taxable before tax", () => {
  const out = computeDocument({
    sellerStateCode: "27",
    placeOfSupplyStateCode: "27",
    taxTreatment: "exclusive",
    items: [
      { qty: 1, rate: 1000, gstRate: 18, discountType: "percent", discountValue: 10 },
    ],
  });
  const item = out.items[0];
  assert.equal(item.grossAmount, 1000);
  assert.equal(item.discountAmount, 100);
  assert.equal(item.taxableValue, 900);
  assert.equal(item.cgstAmount, 81);
  assert.equal(item.sgstAmount, 81);
  assert.equal(item.lineTotal, 1062);
});

test("amount discount reduces taxable before tax", () => {
  const out = computeDocument({
    sellerStateCode: "27",
    placeOfSupplyStateCode: "27",
    taxTreatment: "exclusive",
    items: [
      { qty: 1, rate: 1000, gstRate: 18, discountType: "amount", discountValue: 250 },
    ],
  });
  const item = out.items[0];
  assert.equal(item.discountAmount, 250);
  assert.equal(item.taxableValue, 750);
  assert.equal(item.cgstAmount, 67.5);
  assert.equal(item.sgstAmount, 67.5);
  assert.equal(item.lineTotal, 885);
});

test("discount cannot push taxable below 0", () => {
  const item = computeDocument({
    sellerStateCode: "27",
    placeOfSupplyStateCode: "27",
    taxTreatment: "exclusive",
    items: [
      { qty: 1, rate: 100, gstRate: 18, discountType: "amount", discountValue: 500 },
    ],
  }).items[0];
  assert.equal(item.discountAmount, 100);
  assert.equal(item.taxableValue, 0);
  assert.equal(item.lineTotal, 0);
});

// ── Inclusive treatment ─────────────────────────────────────────────────────
test("inclusive treatment back-calculates taxable from gross", () => {
  // 1180 inclusive of 18% → taxable 1000, tax 180.
  const out = computeDocument({
    sellerStateCode: "27",
    placeOfSupplyStateCode: "27",
    taxTreatment: "inclusive",
    items: [{ qty: 1, rate: 1180, gstRate: 18 }],
  });
  const item = out.items[0];
  assert.equal(item.taxableValue, 1000);
  assert.equal(item.cgstAmount, 90);
  assert.equal(item.sgstAmount, 90);
  assert.equal(item.lineTotal, 1180);
});

test("inclusive treatment applies discount on gross before backing out tax", () => {
  // gross 1180, 18% off → net 1062 incl tax → taxable 900.
  const out = computeDocument({
    sellerStateCode: "27",
    placeOfSupplyStateCode: "29",
    taxTreatment: "inclusive",
    items: [
      { qty: 1, rate: 1180, gstRate: 18, discountType: "percent", discountValue: 10 },
    ],
  });
  const item = out.items[0];
  assert.equal(item.discountAmount, 118);
  assert.equal(item.taxableValue, 900);
  assert.equal(item.igstAmount, 162);
  assert.equal(item.lineTotal, 1062);
});

// ── no_tax treatment ────────────────────────────────────────────────────────
test("no_tax treatment zeroes all tax (quotation default)", () => {
  const out = computeDocument({
    sellerStateCode: "27",
    placeOfSupplyStateCode: "27",
    taxTreatment: "no_tax",
    roundingMode: "none",
    items: [{ qty: 3, rate: 333.33, gstRate: 18 }],
  });
  const item = out.items[0];
  assert.equal(item.gstRate, 0);
  assert.equal(item.cgstAmount, 0);
  assert.equal(item.sgstAmount, 0);
  assert.equal(item.igstAmount, 0);
  assert.equal(item.taxableValue, 999.99);
  assert.equal(item.lineTotal, 999.99);
  assert.equal(out.totals.totalTax, 0);
  assert.equal(out.totals.grandTotal, 999.99);
});

// ── Rounding modes ──────────────────────────────────────────────────────────
const roundingDoc = (roundingMode) =>
  computeDocument({
    sellerStateCode: "27",
    placeOfSupplyStateCode: "27",
    taxTreatment: "exclusive",
    roundingMode,
    // taxable 1000.20 @ 18% → tax 180.04 → preRound 1180.24
    items: [{ qty: 1, rate: 1000.2, gstRate: 18 }],
  });

test("rounding 'nearest' rounds preRound to whole rupee", () => {
  const out = roundingDoc("nearest");
  assert.equal(out.totals.grandTotal, 1180);
  assert.equal(out.totals.roundOff, round2(1180 - 1180.24));
  assert.equal(out.totals.roundOff, -0.24);
});

test("rounding 'up' uses Math.ceil", () => {
  const out = roundingDoc("up");
  assert.equal(out.totals.grandTotal, 1181);
  assert.equal(out.totals.roundOff, 0.76);
});

test("rounding 'down' uses Math.floor", () => {
  const out = roundingDoc("down");
  assert.equal(out.totals.grandTotal, 1180);
  assert.equal(out.totals.roundOff, -0.24);
});

test("rounding 'none' keeps paise precision (no whole-rupee rounding)", () => {
  const out = roundingDoc("none");
  assert.equal(out.totals.grandTotal, 1180.24);
  assert.equal(out.totals.roundOff, 0);
});

// ── Reverse charge ──────────────────────────────────────────────────────────
test("reverseCharge excludes tax from grandTotal but keeps tax amounts", () => {
  const out = computeDocument({
    sellerStateCode: "27",
    placeOfSupplyStateCode: "27",
    taxTreatment: "exclusive",
    reverseCharge: true,
    roundingMode: "nearest",
    items: [{ qty: 1, rate: 1000, gstRate: 18 }],
  });
  // Tax amounts are still computed and returned for printing.
  assert.equal(out.totals.totalCgst, 90);
  assert.equal(out.totals.totalSgst, 90);
  assert.equal(out.totals.totalTax, 180);
  // But the payable grand total excludes the tax (recipient pays it).
  assert.equal(out.totals.grandTotal, 1000);
  assert.equal(out.totals.roundOff, 0);
  assert.equal(out.amountInWords, "Indian Rupees One Thousand Only");
});

// ── Multi-line totals aggregation ───────────────────────────────────────────
test("totals sum per-line rounded values across multiple lines", () => {
  const out = computeDocument({
    sellerStateCode: "27",
    placeOfSupplyStateCode: "27",
    taxTreatment: "exclusive",
    roundingMode: "nearest",
    items: [
      { qty: 2, rate: 100, gstRate: 18 }, // taxable 200, tax 36
      { qty: 1, rate: 50, gstRate: 5 }, // taxable 50, tax 2.5
      { qty: 3, rate: 33.33, gstRate: 12 }, // gross 99.99, taxable 99.99, tax 12.00 (6+6)
    ],
  });
  assert.equal(out.totals.subTotal, 349.99);
  assert.equal(out.totals.totalTaxable, 349.99);
  assert.equal(out.totals.totalCgst, round2(18 + 1.25 + 6));
  assert.equal(out.totals.totalSgst, round2(18 + 1.25 + 6));
  assert.equal(out.totals.totalTax, round2(36 + 2.5 + 12));
});

// ── Amount in words ─────────────────────────────────────────────────────────
test("amountInWords: zero", () => {
  assert.equal(numToIndianWords(0), "Indian Rupees Zero Only");
});

test("amountInWords: sub-rupee paise only (0.50)", () => {
  assert.equal(numToIndianWords(0.5), "Indian Rupees Fifty Paise Only");
});

test("amountInWords: single rupee plus paise", () => {
  assert.equal(
    numToIndianWords(1.05),
    "Indian Rupees One and Five Paise Only"
  );
});

test("amountInWords: thousands", () => {
  assert.equal(
    numToIndianWords(1180),
    "Indian Rupees One Thousand One Hundred Eighty Only"
  );
});

test("amountInWords: lakhs", () => {
  assert.equal(
    numToIndianWords(123450),
    "Indian Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Only"
  );
});

test("amountInWords: lakhs with paise", () => {
  assert.equal(
    numToIndianWords(123450.5),
    "Indian Rupees One Lakh Twenty Three Thousand Four Hundred Fifty and Fifty Paise Only"
  );
});

test("amountInWords: over one crore", () => {
  assert.equal(
    numToIndianWords(12345678.9),
    "Indian Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight and Ninety Paise Only"
  );
});

test("amountInWords: ten crore plus (recursive crore grouping)", () => {
  assert.equal(
    numToIndianWords(1000000000),
    "Indian Rupees One Hundred Crore Only"
  );
});

test("amountInWords integrates with computeDocument grandTotal", () => {
  const out = oneLine({ line: { gstRate: 18 } });
  assert.equal(out.totals.grandTotal, 1180);
  assert.equal(
    out.amountInWords,
    "Indian Rupees One Thousand One Hundred Eighty Only"
  );
});
