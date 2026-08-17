// src/services/numbering.service.js
// ─────────────────────────────────────────────────────────────────────────
// Gap-free, per-(doc_type, financial_year) document numbering.
//
// MUST be called INSIDE db.withTransaction with the passed connection so the
// SELECT ... FOR UPDATE row lock is held until the surrounding finalize
// transaction commits. Two concurrent finalizes therefore serialize on the
// numbering_sequences row and can never mint a duplicate or skip a sequence.
//
// Strategy:
//   1. INSERT IGNORE the (doc_type, financial_year) row (no-op if it exists).
//   2. SELECT last_seq ... FOR UPDATE   (locks the row for this transaction).
//   3. UPDATE last_seq = last_seq + 1.
//   4. Return { seqNo, docNumber } where docNumber is "PREFIX/FY/0001".
// ─────────────────────────────────────────────────────────────────────────
const { formatDocNumber } = require("../utils/financialYear");

/**
 * Allocate the next sequence number for a document type within a financial
 * year, locking the numbering row for the life of the passed transaction.
 *
 * @param {import('mysql2/promise').PoolConnection} conn  connection from withTransaction
 * @param {('quotation'|'proforma'|'purchase_order'|'tax_invoice')} docType
 * @param {string} financialYear  FY label, e.g. "2026-27"
 * @param {string} prefix         series prefix, e.g. "INV"
 * @returns {Promise<{ seqNo: number, docNumber: string }>}
 */
const allocateNextNumber = async (conn, docType, financialYear, prefix) => {
  // 1. Ensure the sequence row exists (no-op if already present).
  await conn.execute(
    `INSERT IGNORE INTO numbering_sequences (doc_type, financial_year, prefix, last_seq)
     VALUES (?, ?, ?, 0)`,
    [docType, financialYear, prefix]
  );

  // 2. Lock the row and read the current sequence.
  const [rows] = await conn.execute(
    `SELECT last_seq
     FROM numbering_sequences
     WHERE doc_type = ? AND financial_year = ?
     FOR UPDATE`,
    [docType, financialYear]
  );

  const lastSeq = Number(rows[0]?.last_seq || 0);
  const seqNo = lastSeq + 1;

  // 3. Advance the sequence.
  await conn.execute(
    `UPDATE numbering_sequences
     SET last_seq = ?, updated_at = CURRENT_TIMESTAMP
     WHERE doc_type = ? AND financial_year = ?`,
    [seqNo, docType, financialYear]
  );

  // 4. Build the formatted number, e.g. "INV/2026-27/0001".
  return { seqNo, docNumber: formatDocNumber(prefix, financialYear, seqNo) };
};

/**
 * Compute what the NEXT document number WOULD be, without incrementing the
 * sequence. Advisory only (preview in the builder). Uses the callable query
 * helper (no transaction / no lock) — never use this to actually mint a number.
 *
 * @param {Function} query  the callable db query helper
 * @param {('quotation'|'proforma'|'purchase_order'|'tax_invoice')} docType
 * @param {string} financialYear  FY label, e.g. "2026-27"
 * @param {string} prefix         series prefix, e.g. "INV"
 * @returns {Promise<{ seqNo: number, docNumber: string }>}
 */
const peekNextNumber = async (query, docType, financialYear, prefix) => {
  const rows = await query(
    `SELECT last_seq
     FROM numbering_sequences
     WHERE doc_type = ? AND financial_year = ?`,
    [docType, financialYear]
  );

  const lastSeq = Number(rows[0]?.last_seq || 0);
  const seqNo = lastSeq + 1;

  return { seqNo, docNumber: formatDocNumber(prefix, financialYear, seqNo) };
};

module.exports = {
  allocateNextNumber,
  peekNextNumber,
};
