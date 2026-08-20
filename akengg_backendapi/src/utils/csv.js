// src/utils/csv.js
// ─────────────────────────────────────────────────────────────────────────
// Pure, dependency-free CSV helpers: RFC4180-safe field escaping plus a
// formula-injection guard (Excel/Sheets treat a leading =, +, -, @ or tab as
// the start of a formula).
// ─────────────────────────────────────────────────────────────────────────

const FORMULA_PREFIX_RE = /^[=+\-@\t]/;
const NEEDS_QUOTING_RE = /[",\n\r]/;

function csvField(value) {
  let str = value === null || value === undefined ? "" : String(value);

  if (FORMULA_PREFIX_RE.test(str)) {
    str = `'${str}`;
  }

  if (NEEDS_QUOTING_RE.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

function csvLine(values) {
  return values.map(csvField).join(",") + "\r\n";
}

module.exports = { csvField, csvLine };
