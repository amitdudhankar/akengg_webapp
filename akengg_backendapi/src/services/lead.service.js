// src/services/lead.service.js
// ─────────────────────────────────────────────────────────────────────────
// Lead capture + pipeline CRM service.
//
// createPublicLead() is the "save-first, notify-after" entry point for the
// public quote form (mirrors contact.service.js's createContact — see that
// file for the pattern this one replicates: the DB write must never fail
// because of a downstream concern). File bytes are stored by the caller
// (controller) BEFORE this function runs, via storage.putPrivateBuffer() —
// this service only ever persists the returned {key, original_name,
// mime_type, size_bytes} metadata into lead_files, exactly like documents
// never touch storage.js from inside document.service.js.
//
// Lead numbering ("AK-2026-0001") is minted via leadNumbering.service's
// allocateNextLeadNumber(conn, date), which MUST run inside the same
// withTransaction connection so the SELECT ... FOR UPDATE lock on
// lead_sequences is held for the life of the insert (see that file).
// ─────────────────────────────────────────────────────────────────────────
const db = require("../utils/db");
const query = db; // callable default export, same idiom as document.service.js

const AppError = require("../utils/appError");
const storage = require("../utils/storage");
const { allocateNextLeadNumber } = require("./leadNumbering.service");

// ── field whitelist ─────────────────────────────────────────────────────
// Mirrors validateLead.js's UPDATE_LEAD_FIELDS exactly — status/lost_reason/
// lost_note are deliberately excluded, that transition only ever happens via
// changeStatus().
const UPDATE_LEAD_FIELDS = [
  "contact_person",
  "company_name",
  "designation",
  "phone",
  "email",
  "industry",
  "city",
  "state",
  "plant_location",
  "product",
  "requirement",
  "technical_details",
  "source",
  "medium",
  "campaign",
  "priority",
  "assigned_to",
  "estimated_value",
  "quotation_value",
  "next_followup_date",
];

// ── mapLead ──────────────────────────────────────────────────────────────
/**
 * Shape a raw `leads` row (plus whatever join aliases the caller SELECTed
 * alongside it, e.g. assigned_to_name) for API responses: DECIMAL columns
 * arrive from mysql2 as strings, and technical_details may or may not
 * already be parsed depending on driver JSON handling — both are normalized
 * here. Everything else passes through untouched (DATE/TIME columns are
 * left exactly as the SELECT already formatted them).
 *
 * @param {Object|null} row
 * @returns {Object|null}
 */
const mapLead = (row) => {
  if (!row) {
    return null;
  }

  return {
    ...row,
    estimated_value:
      row.estimated_value === null || row.estimated_value === undefined
        ? null
        : Number(row.estimated_value),
    quotation_value:
      row.quotation_value === null || row.quotation_value === undefined
        ? null
        : Number(row.quotation_value),
    technical_details:
      typeof row.technical_details === "string"
        ? JSON.parse(row.technical_details)
        : row.technical_details,
  };
};

// ── shared WHERE builder ────────────────────────────────────────────────
/**
 * Build a parameterized WHERE clause shared by getLeads(), the CSV export
 * iterator, and leadReport.service. Returned whereSql already includes the
 * "WHERE" keyword (or "" when no filters apply), same convention as
 * party.service.js's getParties().
 *
 * @param {Object} filters
 * @returns {{ whereSql: string, params: Array }}
 */
const buildLeadWhere = (filters = {}) => {
  const { status, product, industry, source, priority, assigned_to, date_from, date_to, search } =
    filters;

  const conditions = [];
  const params = [];

  if (status) {
    conditions.push("leads.status = ?");
    params.push(status);
  }

  if (product) {
    conditions.push("leads.product = ?");
    params.push(product);
  }

  if (industry) {
    conditions.push("leads.industry = ?");
    params.push(industry);
  }

  if (source) {
    conditions.push("leads.source = ?");
    params.push(source);
  }

  if (priority) {
    conditions.push("leads.priority = ?");
    params.push(priority);
  }

  if (assigned_to !== undefined && assigned_to !== null && assigned_to !== "") {
    conditions.push("leads.assigned_to = ?");
    params.push(assigned_to);
  }

  if (date_from) {
    conditions.push("leads.created_at >= ?");
    params.push(`${date_from} 00:00:00`);
  }

  if (date_to) {
    conditions.push("leads.created_at <= ?");
    params.push(`${date_to} 23:59:59`);
  }

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      "(leads.contact_person LIKE ? OR leads.company_name LIKE ? OR leads.phone LIKE ? OR leads.email LIKE ? OR leads.lead_number LIKE ?)"
    );
    params.push(like, like, like, like, like);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return { whereSql, params };
};

// Clamp page/limit to safe positive integers BEFORE they are ever inlined
// into a SQL string — never bound via a ? placeholder for LIMIT/OFFSET, per
// utils/db.js's query() comment (this MySQL server rejects prepared
// LIMIT/OFFSET placeholders).
const clampInt = (value, { min, max, fallback }) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  let clamped = parsed;
  if (min !== undefined) {
    clamped = Math.max(min, clamped);
  }
  if (max !== undefined) {
    clamped = Math.min(max, clamped);
  }

  return clamped;
};

// ── public create ────────────────────────────────────────────────────────
/**
 * Create a lead from the public quote form. `payload` is already validated
 * by validatePublicCreateLead (technical_details, if present, is already a
 * parsed object). `files` is metadata for bytes the caller already stored
 * via storage.putPrivateBuffer() BEFORE calling this function — storage
 * never happens inside the DB transaction.
 *
 * @param {Object} payload
 * @param {Array<{key: string, original_name: string, mime_type: string, size_bytes: number}>} [files]
 * @returns {Promise<{ id: number, lead_number: string }>}
 */
const createPublicLead = async (payload, files = []) => {
  const attemptInsert = async () =>
    db.withTransaction(async (conn) => {
      const { leadNumber } = await allocateNextLeadNumber(conn, new Date());

      const [result] = await conn.execute(
        `INSERT INTO leads (
           lead_number, contact_person, company_name, designation, phone, email,
           industry, city, state, plant_location, product, requirement,
           technical_details, source, medium, campaign, utm_term, utm_content,
           landing_page, referrer, status
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'NEW')`,
        [
          leadNumber,
          payload.contact_person,
          payload.company_name ?? null,
          payload.designation ?? null,
          payload.phone,
          payload.email ?? null,
          payload.industry ?? null,
          payload.city ?? null,
          payload.state ?? null,
          payload.plant_location ?? null,
          payload.product,
          payload.requirement ?? null,
          payload.technical_details ? JSON.stringify(payload.technical_details) : null,
          payload.source ?? null,
          payload.medium ?? null,
          payload.campaign ?? null,
          payload.utm_term ?? null,
          payload.utm_content ?? null,
          payload.landing_page ?? null,
          payload.referrer ?? null,
        ]
      );

      const leadId = result.insertId;

      await conn.execute(
        `INSERT INTO lead_status_history (lead_id, old_status, new_status, changed_by, notes)
         VALUES (?, NULL, 'NEW', NULL, NULL)`,
        [leadId]
      );

      for (const f of files) {
        await conn.execute(
          `INSERT INTO lead_files (lead_id, original_name, storage_key, mime_type, size_bytes, uploaded_by)
           VALUES (?, ?, ?, ?, ?, NULL)`,
          [leadId, f.original_name, f.key, f.mime_type, f.size_bytes]
        );
      }

      return { id: leadId, lead_number: leadNumber };
    });

  try {
    return await attemptInsert();
  } catch (error) {
    // lead_sequences races are vanishingly rare (the row is locked for the
    // life of the transaction) but not impossible under retried commits —
    // retry the whole transaction exactly once, then let it propagate.
    const isLeadNumberDup =
      error && error.code === "ER_DUP_ENTRY" && /lead_number/i.test(error.sqlMessage || error.message || "");

    if (isLeadNumberDup) {
      return attemptInsert();
    }

    throw error;
  }
};

// ── list ─────────────────────────────────────────────────────────────────
/**
 * @param {Object} filters status/product/industry/source/priority/assigned_to/
 *   date_from/date_to/search/page/limit
 */
const getLeads = async (filters = {}) => {
  const { whereSql, params } = buildLeadWhere(filters);

  const page = clampInt(filters.page, { min: 1, fallback: 1 });
  const limit = clampInt(filters.limit, { min: 1, max: 100, fallback: 20 });
  const offset = (page - 1) * limit;

  const countRows = await query(`SELECT COUNT(*) AS total FROM leads ${whereSql}`, params);
  const totalItems = Number(countRows[0]?.total || 0);

  const rows = await query(
    `SELECT leads.*, u.name AS assigned_to_name
     FROM leads
     LEFT JOIN users u ON u.id = leads.assigned_to
     ${whereSql}
     ORDER BY leads.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return {
    items: rows.map(mapLead),
    totalItems,
    page,
    limit,
    totalPages: Math.ceil(totalItems / limit),
  };
};

// ── notes (also reused by getLeadById) ──────────────────────────────────
const getNotes = async (id) =>
  query(
    `SELECT ln.id, ln.lead_id, ln.note, ln.created_by, u.name AS created_by_name, ln.created_at
     FROM lead_notes ln
     LEFT JOIN users u ON u.id = ln.created_by
     WHERE ln.lead_id = ?
     ORDER BY ln.created_at DESC`,
    [id]
  );

const addNote = async (id, note, userId) => {
  await query("INSERT INTO lead_notes (lead_id, note, created_by) VALUES (?, ?, ?)", [
    id,
    note,
    userId ?? null,
  ]);

  return getNotes(id);
};

// ── single lead + timeline ──────────────────────────────────────────────
/**
 * @param {number|string} id
 * @returns {Promise<Object|null>}
 */
const getLeadById = async (id) => {
  const rows = await query(
    `SELECT leads.*, u.name AS assigned_to_name, p.name AS party_name
     FROM leads
     LEFT JOIN users u ON u.id = leads.assigned_to
     LEFT JOIN parties p ON p.id = leads.party_id
     WHERE leads.id = ?`,
    [id]
  );

  if (!rows.length) {
    return null;
  }

  const [notes, followups, files, statusHistory] = await Promise.all([
    getNotes(id),
    query(
      `SELECT id, lead_id, DATE_FORMAT(followup_date, '%Y-%m-%d') AS followup_date,
              TIME_FORMAT(followup_time, '%H:%i') AS followup_time, type, notes, status,
              created_by, completed_at, created_at, updated_at
       FROM lead_followups
       WHERE lead_id = ?
       ORDER BY followup_date ASC, followup_time ASC`,
      [id]
    ),
    // storage_key is internal-only (a raw path/S3 key) and must never reach
    // an API response — it is deliberately left out of this SELECT.
    query(
      `SELECT id, original_name, mime_type, size_bytes, created_at
       FROM lead_files
       WHERE lead_id = ?
       ORDER BY id DESC`,
      [id]
    ),
    query(
      `SELECT lsh.id, lsh.old_status, lsh.new_status, lsh.changed_by, u.name AS changed_by_name,
              lsh.notes, lsh.created_at
       FROM lead_status_history lsh
       LEFT JOIN users u ON u.id = lsh.changed_by
       WHERE lsh.lead_id = ?
       ORDER BY lsh.created_at DESC`,
      [id]
    ),
  ]);

  return {
    ...mapLead(rows[0]),
    notes,
    followups,
    files,
    status_history: statusHistory,
  };
};

// ── update ───────────────────────────────────────────────────────────────
/**
 * Whitelist-driven partial update. status/lost_reason/lost_note are handled
 * exclusively by changeStatus().
 *
 * @param {number|string} id
 * @param {Object} payload
 * @param {number} [userId] reserved (leads has no updated_by column)
 * @returns {Promise<Object|null>} the updated lead, or null if not found
 */
const updateLead = async (id, payload = {}, userId) => {
  const fields = [];
  const values = [];

  UPDATE_LEAD_FIELDS.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) {
      return;
    }

    let value = payload[key];

    if (key === "technical_details" && value !== null && value !== undefined) {
      value = JSON.stringify(value);
    }

    fields.push(`${key} = ?`);
    values.push(value === undefined ? null : value);
  });

  if (!fields.length) {
    return getLeadById(id);
  }

  const existing = await query("SELECT id FROM leads WHERE id = ?", [id]);
  if (!existing.length) {
    return null;
  }

  values.push(id);

  await query(`UPDATE leads SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);

  return getLeadById(id);
};

// ── status transitions ──────────────────────────────────────────────────
/**
 * @param {number|string} id
 * @param {{status: string, lost_reason?: string, lost_note?: string, notes?: string}} change
 * @param {number} [userId]
 */
const changeStatus = async (id, { status, lost_reason, lost_note, notes } = {}, userId) => {
  await db.withTransaction(async (conn) => {
    const [rows] = await conn.execute("SELECT status FROM leads WHERE id = ? FOR UPDATE", [id]);

    if (!rows.length) {
      throw new AppError("Lead not found", 404);
    }

    const oldStatus = rows[0].status;

    if (oldStatus === status) {
      throw new AppError("Lead is already in that status", 400);
    }

    const nextLostReason = status === "LOST" ? lost_reason ?? null : null;
    const nextLostNote = status === "LOST" ? lost_note ?? null : null;

    await conn.execute("UPDATE leads SET status = ?, lost_reason = ?, lost_note = ? WHERE id = ?", [
      status,
      nextLostReason,
      nextLostNote,
      id,
    ]);

    await conn.execute(
      `INSERT INTO lead_status_history (lead_id, old_status, new_status, changed_by, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [id, oldStatus, status, userId ?? null, notes ?? null]
    );
  });

  return getLeadById(id);
};

// ── delete ───────────────────────────────────────────────────────────────
/**
 * Deletes the lead row (cascades to notes/followups/files/history via FK)
 * then best-effort cleans up the underlying stored files. A storage failure
 * is logged, never thrown — the DB row is already gone by that point.
 *
 * @param {number|string} id
 */
const deleteLead = async (id) => {
  const files = await query("SELECT storage_key FROM lead_files WHERE lead_id = ?", [id]);

  await query("DELETE FROM leads WHERE id = ?", [id]);

  for (const f of files) {
    try {
      await storage.deletePrivateAsset(f.storage_key);
    } catch (error) {
      console.error(`[lead] failed to delete stored file for lead ${id}:`, error.message);
    }
  }
};

// ── convert to party ────────────────────────────────────────────────────
/**
 * @param {number|string} id
 * @param {{party_id?: number}} options
 * @param {number} [userId] reserved (parties has no created_by column)
 * @returns {Promise<{ lead: Object, party_id: number }>}
 */
const convertToParty = async (id, { party_id } = {}, userId) => {
  const resolvedPartyId = await db.withTransaction(async (conn) => {
    const [rows] = await conn.execute("SELECT * FROM leads WHERE id = ? FOR UPDATE", [id]);

    if (!rows.length) {
      throw new AppError("Lead not found", 404);
    }

    const lead = rows[0];

    if (lead.party_id) {
      throw new AppError("Lead is already linked to a party", 409);
    }

    if (lead.status === "LOST") {
      throw new AppError("Cannot convert a lost lead to a party", 422);
    }

    let partyId;

    if (party_id) {
      const [partyRows] = await conn.execute("SELECT id FROM parties WHERE id = ?", [party_id]);

      if (!partyRows.length) {
        throw new AppError("Party not found", 404);
      }

      partyId = partyRows[0].id;
    } else {
      const [partyResult] = await conn.execute(
        `INSERT INTO parties (party_type, name, phone, email, billing_city, billing_state, is_active)
         VALUES ('client', ?, ?, ?, ?, ?, 1)`,
        [lead.company_name || lead.contact_person, lead.phone, lead.email, lead.city, lead.state]
      );

      partyId = partyResult.insertId;
    }

    await conn.execute("UPDATE leads SET party_id = ? WHERE id = ?", [partyId, id]);

    return partyId;
  });

  return { lead: await getLeadById(id), party_id: resolvedPartyId };
};

// ── convert from contact (admin promotes an enquiry to a lead) ─────────────
/**
 * @param {number|string} contactId
 * @param {Object} overrides industry/product/company_name/designation/city/state/plant_location
 * @param {number} [userId]
 * @returns {Promise<Object>} the created lead
 */
const createLeadFromContact = async (contactId, overrides = {}, userId) => {
  const leadId = await db.withTransaction(async (conn) => {
    const [contactRows] = await conn.execute("SELECT * FROM contacts WHERE id = ? FOR UPDATE", [
      contactId,
    ]);

    if (!contactRows.length) {
      throw new AppError("Contact not found", 404);
    }

    const contact = contactRows[0];

    const [existingLeadRows] = await conn.execute(
      "SELECT id FROM leads WHERE converted_from_contact_id = ?",
      [contactId]
    );

    if (existingLeadRows.length) {
      throw new AppError("This enquiry has already been converted to a lead", 409);
    }

    const { leadNumber } = await allocateNextLeadNumber(conn, new Date());

    const [result] = await conn.execute(
      `INSERT INTO leads (
         lead_number, contact_person, company_name, designation, phone, email,
         industry, city, state, plant_location, product, requirement, source,
         converted_from_contact_id, status
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'NEW')`,
      [
        leadNumber,
        contact.name,
        overrides.company_name ?? null,
        overrides.designation ?? null,
        contact.number,
        contact.email ?? null,
        overrides.industry ?? null,
        overrides.city ?? null,
        overrides.state ?? null,
        overrides.plant_location ?? null,
        overrides.product ?? null,
        contact.message ?? null,
        contact.source || "Website Contact Form",
        contactId,
      ]
    );

    const newLeadId = result.insertId;

    await conn.execute(
      `INSERT INTO lead_status_history (lead_id, old_status, new_status, changed_by, notes)
       VALUES (?, NULL, 'NEW', ?, NULL)`,
      [newLeadId, userId ?? null]
    );

    await conn.execute("UPDATE contacts SET status = 'closed' WHERE id = ?", [contactId]);

    return newLeadId;
  });

  return getLeadById(leadId);
};

// ── CSV / bulk export (keyset pagination) ───────────────────────────────
/**
 * Streams all leads matching `filters` in DESC id order, 500 at a time, via
 * keyset pagination (no LIMIT/OFFSET drift on a large export).
 *
 * @param {Object} filters same shape as getLeads()
 * @yields {Array<Object>} a page (<=500) of mapLead()-shaped rows
 */
async function* iterateLeadsForExport(filters = {}) {
  const { whereSql, params } = buildLeadWhere(filters);
  let lastId = null;

  for (;;) {
    const keysetSql = lastId === null ? "" : whereSql ? "AND leads.id < ?" : "WHERE leads.id < ?";
    const queryParams = lastId === null ? params : [...params, lastId];

    const rows = await query(
      `SELECT leads.*, u.name AS assigned_to_name
       FROM leads
       LEFT JOIN users u ON u.id = leads.assigned_to
       ${whereSql}
       ${keysetSql}
       ORDER BY leads.id DESC
       LIMIT 500`,
      queryParams
    );

    if (!rows.length) {
      return;
    }

    yield rows.map(mapLead);

    lastId = rows[rows.length - 1].id;
  }
}

module.exports = {
  createPublicLead,
  getLeads,
  getLeadById,
  updateLead,
  changeStatus,
  deleteLead,
  convertToParty,
  createLeadFromContact,
  addNote,
  getNotes,
  iterateLeadsForExport,
  buildLeadWhere,
  mapLead,
};
