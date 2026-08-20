// src/services/leadNumbering.service.js
// ─────────────────────────────────────────────────────────────────────────
// Gap-free, per-(prefix, year_label) lead numbering.
//
// This mirrors numbering.service.js's SELECT ... FOR UPDATE lock pattern
// exactly, but against its own lead_sequences table keyed by calendar year
// (not financial year) so the documents system's numbering_sequences table
// / ENUM never needs to be touched for leads.
//
// MUST be called INSIDE db.withTransaction with the passed connection so the
// SELECT ... FOR UPDATE row lock is held until the surrounding transaction
// commits. Two concurrent callers therefore serialize on the lead_sequences
// row and can never mint a duplicate or skip a sequence.
//
// Strategy:
//   1. INSERT IGNORE the (prefix, year_label) row (no-op if it exists).
//   2. SELECT last_seq ... FOR UPDATE   (locks the row for this transaction).
//   3. UPDATE last_seq = last_seq + 1.
//   4. Return { seqNo, leadNumber } where leadNumber is "AK-2026-0001".
// ─────────────────────────────────────────────────────────────────────────

/**
 * Format a lead number from its parts.
 *   formatLeadNumber("AK", "2026", 7) -> "AK-2026-0007"
 *
 * Pure helper, exported separately so it's unit-testable without a DB.
 *
 * @param {string} prefix     Lead prefix (e.g. "AK").
 * @param {string} yearLabel  Calendar year label (e.g. "2026").
 * @param {number|string} seqNo  Sequence number, zero-padded to 4 digits.
 * @returns {string} Formatted lead number.
 */
const formatLeadNumber = (prefix, yearLabel, seqNo) =>
  `${prefix}-${yearLabel}-${String(seqNo).padStart(4, "0")}`;

/**
 * Allocate the next sequence number for a lead within a calendar year,
 * locking the numbering row for the life of the passed transaction.
 *
 * @param {import('mysql2/promise').PoolConnection} conn  connection from withTransaction
 * @param {Date} date  JS Date to derive the calendar year label from. Callers
 *                     must always pass this explicitly (no internal default)
 *                     so the function stays deterministic for testing.
 * @returns {Promise<{ seqNo: number, leadNumber: string }>}
 */
const allocateNextLeadNumber = async (conn, date) => {
  const prefix = process.env.LEAD_NUMBER_PREFIX || "AK";
  const yearLabel = String(date.getFullYear());

  // 1. Ensure the sequence row exists (no-op if already present).
  await conn.execute(
    `INSERT IGNORE INTO lead_sequences (prefix, year_label, last_seq)
     VALUES (?, ?, 0)`,
    [prefix, yearLabel]
  );

  // 2. Lock the row and read the current sequence.
  const [rows] = await conn.execute(
    `SELECT last_seq
     FROM lead_sequences
     WHERE prefix = ? AND year_label = ?
     FOR UPDATE`,
    [prefix, yearLabel]
  );

  const lastSeq = Number(rows[0]?.last_seq || 0);
  const nextSeq = lastSeq + 1;

  // 3. Advance the sequence.
  await conn.execute(
    `UPDATE lead_sequences
     SET last_seq = ?
     WHERE prefix = ? AND year_label = ?`,
    [nextSeq, prefix, yearLabel]
  );

  // 4. Build the formatted number, e.g. "AK-2026-0001".
  const leadNumber = formatLeadNumber(prefix, yearLabel, nextSeq);

  return { seqNo: nextSeq, leadNumber };
};

module.exports = {
  allocateNextLeadNumber,
  formatLeadNumber,
};
