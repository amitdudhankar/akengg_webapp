// src/services/leadFile.service.js
// ─────────────────────────────────────────────────────────────────────────
// Storage + DB glue for lead attachments (customer drawings, BOQs, spec
// PDFs, site photos, quotations) — private counterpart to
// utils/storage.js's public asset helpers. Every object lives under
// storage.js's PRIVATE_ROOT (local) / never-public-listed prefix (s3);
// nothing here is ever reachable via express.static() or a direct/presigned
// link — files only ever leave the server through getFileForDownload()'s
// stream, piped by an authenticated route.
//
// storeIncomingFiles() is PURE storage I/O — it never touches the DB, so it
// is safe to call before or outside any transaction. It backs two callers:
//   - lead.service.js's createPublicLead(), which stores files BEFORE
//     opening its numbering-lock transaction (storage writes must never
//     happen while the lead_sequences row lock is held — see that file's
//     header comment), then inserts the returned {key, original_name,
//     mime_type, size_bytes} metadata itself inside that transaction.
//   - addFilesToLead() below, for admin uploads to an already-existing lead,
//     where there is no numbering lock to protect and each insert is
//     independent.
//
// storage_key is intentionally never selected back out of lead_files by
// getFilesForLead() — same rule lead.service.js's getLeadById() follows for
// its own inline lead_files SELECT.
// ─────────────────────────────────────────────────────────────────────────
const crypto = require("crypto");

const query = require("../utils/db");
const storage = require("../utils/storage");

// ── key building ─────────────────────────────────────────────────────────
/**
 * Build the driver-agnostic storage key a newly-uploaded lead file will be
 * stored under, e.g. "lead-files/2026/08/1755678901234-a1b2c3d4-boq.pdf".
 * The Date.now() + random-hex suffix guards against two files in the same
 * multipart request colliding on the same millisecond.
 *
 * Private helper — deliberately not exported. Callers only ever see the key
 * storage.putPrivateBuffer() actually persisted the bytes under (see
 * storeIncomingFiles()), which is reconstructed from the same folder/
 * filename split and so always matches this.
 *
 * @param {string} originalName
 * @returns {string}
 */
const buildLeadFileKey = (originalName) => {
  const sanitized = storage.sanitizeFileName(originalName);
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  return `lead-files/${yyyy}/${mm}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${sanitized}`;
};

// ── pure storage I/O (no DB) ────────────────────────────────────────────
/**
 * Persist a batch of multer memory-buffered files to private storage. Pure
 * storage I/O — never touches the DB. storage.putPrivateBuffer() expects a
 * folder and a filename as separate arguments (it rejoins them internally as
 * "<folder>/<filename>"), so the full key from buildLeadFileKey() is split
 * on its last "/" before the call; the key persisted in the DB is always
 * whatever putPrivateBuffer() actually returns, not the pre-split string.
 *
 * @param {Array<{originalname:string, mimetype:string, size:number, buffer:Buffer}>} files
 *   multer's req.files (memory storage)
 * @returns {Promise<Array<{original_name:string, key:string, mime_type:string, size_bytes:number}>>}
 */
const storeIncomingFiles = async (files = []) => {
  const stored = [];

  for (const file of files) {
    const fullKey = buildLeadFileKey(file.originalname);
    const splitAt = fullKey.lastIndexOf("/");
    const folder = fullKey.slice(0, splitAt);
    const filename = fullKey.slice(splitAt + 1);

    const key = await storage.putPrivateBuffer(folder, filename, file.buffer, file.mimetype);

    stored.push({
      original_name: file.originalname,
      key,
      mime_type: file.mimetype,
      size_bytes: file.size,
    });
  }

  return stored;
};

// ── admin upload to an existing lead ────────────────────────────────────
/**
 * Store + persist a batch of admin-uploaded files against an existing lead.
 * `files` must already be multer-buffered and magic-number verified (see
 * middlewares/leadFileUpload.js's verifyLeadFiles). Each insert stands on
 * its own, so unlike lead.service.js's changeStatus()/convertToParty() this
 * deliberately does not run inside db.withTransaction.
 *
 * @param {number|string} leadId
 * @param {Array<{originalname:string, mimetype:string, size:number, buffer:Buffer}>} files
 * @param {number|null} [userId]
 * @returns {Promise<Array<Object>>} the newly inserted lead_files rows (storage_key omitted)
 */
const addFilesToLead = async (leadId, files, userId) => {
  const stored = await storeIncomingFiles(files);

  const inserted = [];

  for (const item of stored) {
    const result = await query(
      `INSERT INTO lead_files (lead_id, original_name, storage_key, mime_type, size_bytes, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [leadId, item.original_name, item.key, item.mime_type, item.size_bytes, userId ?? null]
    );

    inserted.push({
      id: result.insertId,
      lead_id: Number(leadId),
      original_name: item.original_name,
      mime_type: item.mime_type,
      size_bytes: item.size_bytes,
      uploaded_by: userId ?? null,
    });
  }

  return inserted;
};

// ── list (metadata only — never the storage key) ────────────────────────
/**
 * @param {number|string} leadId
 * @returns {Promise<Array<Object>>}
 */
const getFilesForLead = async (leadId) =>
  query(
    `SELECT id, original_name, mime_type, size_bytes, created_at
     FROM lead_files
     WHERE lead_id = ?
     ORDER BY created_at DESC`,
    [leadId]
  );

// ── download ─────────────────────────────────────────────────────────────
/**
 * Resolve one lead file to a readable stream, scoped to its owning lead. The
 * "WHERE id = ? AND lead_id = ?" pair IS the authorization check: a fileId
 * that belongs to a different lead must 404, never leak, so this returns
 * null rather than looking the file up by id alone.
 *
 * @param {number|string} leadId
 * @param {number|string} fileId
 * @returns {Promise<{stream: import('stream').Readable, filename: string, mimeType: string}|null>}
 */
const getFileForDownload = async (leadId, fileId) => {
  const rows = await query(
    "SELECT original_name, storage_key, mime_type FROM lead_files WHERE id = ? AND lead_id = ?",
    [fileId, leadId]
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  const stream = await storage.getPrivateStream(row.storage_key);

  return { stream, filename: row.original_name, mimeType: row.mime_type };
};

// ── delete ───────────────────────────────────────────────────────────────
/**
 * Delete one lead file: the DB row first, then best-effort clean up the
 * underlying stored object (logged, never thrown — the row is already gone
 * by that point), same order/rule as lead.service.js's deleteLead().
 *
 * @param {number|string} leadId
 * @param {number|string} fileId
 * @returns {Promise<boolean>} true if a row was found and deleted, false otherwise
 */
const deleteFile = async (leadId, fileId) => {
  const rows = await query(
    "SELECT storage_key FROM lead_files WHERE id = ? AND lead_id = ?",
    [fileId, leadId]
  );

  if (!rows.length) {
    return false;
  }

  const { storage_key: storageKey } = rows[0];

  await query("DELETE FROM lead_files WHERE id = ?", [fileId]);

  try {
    await storage.deletePrivateAsset(storageKey);
  } catch (error) {
    console.error(`[leadFile] failed to delete stored file ${storageKey}:`, error.message);
  }

  return true;
};

module.exports = {
  storeIncomingFiles,
  addFilesToLead,
  getFilesForLead,
  getFileForDownload,
  deleteFile,
};
