// src/utils/csv.test.js
// ─────────────────────────────────────────────────────────────────────────
// Unit tests for the pure CSV helpers. Uses Node's built-in runner — no jest.
//   Run:  node --test src/utils/csv.test.js
// ─────────────────────────────────────────────────────────────────────────
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { csvField, csvLine } = require("./csv");

// ── csvField ─────────────────────────────────────────────────────────────
test("csvField leaves a plain value unquoted", () => {
  assert.equal(csvField("hello"), "hello");
  assert.equal(csvField(123), "123");
});

test("csvField quotes a value containing a comma", () => {
  assert.equal(csvField("Acme, Inc."), '"Acme, Inc."');
});

test("csvField quotes a value containing a double quote and doubles it", () => {
  assert.equal(csvField('He said "hi"'), '"He said ""hi"""');
});

test("csvField quotes a value containing a newline", () => {
  assert.equal(csvField("line1\nline2"), '"line1\nline2"');
});

test("csvField quotes a value containing a carriage return", () => {
  assert.equal(csvField("line1\rline2"), '"line1\rline2"');
});

test("csvField prefixes a formula-injection value with a single quote", () => {
  assert.equal(csvField("=SUM(A1:A2)"), "'=SUM(A1:A2)");
  assert.equal(csvField("+1234"), "'+1234");
  assert.equal(csvField("-1234"), "'-1234");
  assert.equal(csvField("@cmd"), "'@cmd");
  assert.equal(csvField("\tvalue"), "'\tvalue");
});

test("csvField quotes a formula-prefixed value that also needs quoting", () => {
  assert.equal(csvField("=A1,B1"), '"\'=A1,B1"');
});

test("csvField converts null/undefined to an empty string", () => {
  assert.equal(csvField(null), "");
  assert.equal(csvField(undefined), "");
});

// ── csvLine ──────────────────────────────────────────────────────────────
test("csvLine joins escaped fields with commas and a trailing CRLF", () => {
  assert.equal(
    csvLine(["Acme, Inc.", 'He said "hi"', null]),
    '"Acme, Inc.","He said ""hi""",\r\n'
  );
});
