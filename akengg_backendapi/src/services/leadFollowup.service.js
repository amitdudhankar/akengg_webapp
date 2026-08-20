// src/services/leadFollowup.service.js
// ─────────────────────────────────────────────────────────────────────────
// Scheduled follow-up actions (calls, site visits, etc.) against a lead, plus
// the cross-lead aggregate list backing the admin Follow-ups page and the
// dashboard "due today / overdue" widget.
//
// leads.next_followup_date is a denormalized read-optimization column kept in
// sync with the earliest still-PENDING lead_followups.followup_date via
// syncNextFollowupDate(). It MUST be called with the same transaction
// connection that just wrote/updated the follow-up so the two tables never
// observe an inconsistent state, mirroring the SELECT ... FOR UPDATE +
// mutate + follow-up-recompute shape used across numbering.service.js /
// document.service.js's finalize().
// ─────────────────────────────────────────────────────────────────────────
const db = require("../utils/db");
const query = db; // callable default export
const AppError = require("../utils/appError");

const FOLLOWUP_SELECT_COLUMNS = `
  lf.id,
  lf.lead_id,
  DATE_FORMAT(lf.followup_date, '%Y-%m-%d') AS followup_date,
  TIME_FORMAT(lf.followup_time, '%H:%i') AS followup_time,
  lf.type,
  lf.notes,
  lf.status,
  lf.created_by,
  lf.completed_at,
  lf.created_at,
  lf.updated_at
`;

// Recompute leads.next_followup_date from the earliest still-PENDING
// follow-up for this lead. MUST be called inside an active transaction with
// the connection that just wrote the follow-up row, using conn.execute (real
// prepared statement — no LIMIT/OFFSET involved here).
//
// @param {import('mysql2/promise').PoolConnection} conn
// @param {number} leadId
async function syncNextFollowupDate(conn, leadId) {
  await conn.execute(
    `UPDATE leads
     SET next_followup_date = (
       SELECT MIN(followup_date)
       FROM lead_followups
       WHERE lead_id = ? AND status = 'PENDING'
     )
     WHERE id = ?`,
    [leadId, leadId]
  );
}

// Create a follow-up for a lead and roll leads.next_followup_date forward.
//
// @param {number} leadId
// @param {{followup_date:string, followup_time?:string|null, type?:string, notes?:string|null}} payload
// @param {number|null} userId
// @returns {Promise<Object>} the created follow-up row
const createFollowup = async (leadId, payload, userId) => {
  const type = payload.type || "CALL";
  const followupTime = payload.followup_time === undefined ? null : payload.followup_time;
  const notes = payload.notes === undefined ? null : payload.notes;

  const followupId = await db.withTransaction(async (conn) => {
    const [leadRows] = await conn.execute(
      "SELECT id FROM leads WHERE id = ? FOR UPDATE",
      [leadId]
    );
    if (!leadRows.length) {
      throw new AppError("Lead not found", 404);
    }

    const [result] = await conn.execute(
      `INSERT INTO lead_followups
         (lead_id, followup_date, followup_time, type, notes, status, created_by)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
      [leadId, payload.followup_date, followupTime, type, notes, userId || null]
    );

    await syncNextFollowupDate(conn, leadId);

    return result.insertId;
  });

  const rows = await query(
    `SELECT ${FOLLOWUP_SELECT_COLUMNS}
     FROM lead_followups lf
     WHERE lf.id = ?`,
    [followupId]
  );

  return rows[0];
};

// All follow-ups logged against a single lead, earliest pending first.
//
// @param {number} leadId
// @returns {Promise<Array<Object>>}
const getFollowupsForLead = async (leadId) => {
  return query(
    `SELECT ${FOLLOWUP_SELECT_COLUMNS},
            u.name AS created_by_name
     FROM lead_followups lf
     LEFT JOIN users u ON u.id = lf.created_by
     WHERE lf.lead_id = ?
     ORDER BY lf.followup_date ASC, lf.followup_time ASC`,
    [leadId]
  );
};

// Apply COMPLETE / MISS / CANCEL / RESCHEDULE to a pending follow-up, then
// resync leads.next_followup_date. Only a PENDING follow-up may be acted on.
//
// @param {number} leadId
// @param {number} followupId
// @param {{action:'COMPLETE'|'MISS'|'CANCEL'|'RESCHEDULE', followup_date?:string, followup_time?:string|null, notes?:string}} body
// @param {number|null} userId
// @returns {Promise<Object>} the updated follow-up row
const applyFollowupAction = async (leadId, followupId, body, userId) => {
  const { action, followup_date: followupDate, followup_time: followupTime, notes } = body;

  await db.withTransaction(async (conn) => {
    const [rows] = await conn.execute(
      "SELECT status FROM lead_followups WHERE id = ? AND lead_id = ? FOR UPDATE",
      [followupId, leadId]
    );
    if (!rows.length) {
      throw new AppError("Follow-up not found", 404);
    }
    if (rows[0].status !== "PENDING") {
      throw new AppError("Only a pending follow-up can be updated", 409);
    }

    if (action === "COMPLETE") {
      await conn.execute(
        "UPDATE lead_followups SET status = 'COMPLETED', completed_at = NOW() WHERE id = ?",
        [followupId]
      );
    } else if (action === "MISS") {
      await conn.execute(
        "UPDATE lead_followups SET status = 'MISSED' WHERE id = ?",
        [followupId]
      );
    } else if (action === "CANCEL") {
      await conn.execute(
        "UPDATE lead_followups SET status = 'CANCELLED' WHERE id = ?",
        [followupId]
      );
    } else if (action === "RESCHEDULE") {
      if (notes !== undefined) {
        await conn.execute(
          `UPDATE lead_followups
           SET status = 'PENDING', followup_date = ?, followup_time = ?, notes = ?
           WHERE id = ?`,
          [followupDate, followupTime === undefined ? null : followupTime, notes, followupId]
        );
      } else {
        await conn.execute(
          `UPDATE lead_followups
           SET status = 'PENDING', followup_date = ?, followup_time = ?
           WHERE id = ?`,
          [followupDate, followupTime === undefined ? null : followupTime, followupId]
        );
      }
    } else {
      throw new AppError(`Unknown action '${action}'`, 400);
    }

    await syncNextFollowupDate(conn, leadId);
  });

  const rows = await query(
    `SELECT ${FOLLOWUP_SELECT_COLUMNS}
     FROM lead_followups lf
     WHERE lf.id = ?`,
    [followupId]
  );

  return rows[0];
};

// Build "today"/"tomorrow" as local YYYY-MM-DD strings from the server clock.
// Deliberately NOT SQL CURDATE() — per house convention this avoids drift
// between the app server's timezone and the DB server's timezone.
const todayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const addDays = (dateStr, days) => {
  const [y, m, day] = dateStr.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Shared WHERE-builder for the cross-lead aggregate query, used by both the
// paginated list and the export generator so their filters never drift.
const buildAggregateWhere = ({ due, status, type, date_from: dateFrom, date_to: dateTo }) => {
  const filters = ["lf.followup_date IS NOT NULL"];
  const values = [];

  const today = todayDateString();

  if (due === "today") {
    filters.push("lf.status = 'PENDING' AND lf.followup_date = ?");
    values.push(today);
  } else if (due === "tomorrow") {
    filters.push("lf.status = 'PENDING' AND lf.followup_date = ?");
    values.push(addDays(today, 1));
  } else if (due === "overdue") {
    filters.push("lf.status = 'PENDING' AND lf.followup_date < ?");
    values.push(today);
  } else if (due === "upcoming") {
    filters.push("lf.status = 'PENDING' AND lf.followup_date > ?");
    values.push(today);
  }

  if (status) {
    filters.push("lf.status = ?");
    values.push(status);
  }

  if (type) {
    filters.push("lf.type = ?");
    values.push(type);
  }

  if (!due && dateFrom && dateTo) {
    filters.push("lf.followup_date BETWEEN ? AND ?");
    values.push(dateFrom, dateTo);
  }

  return { whereClause: `WHERE ${filters.join(" AND ")}`, values };
};

const AGGREGATE_SELECT_COLUMNS = `
  lf.*,
  DATE_FORMAT(lf.followup_date, '%Y-%m-%d') AS followup_date,
  TIME_FORMAT(lf.followup_time, '%H:%i') AS followup_time,
  l.lead_number,
  l.contact_person,
  l.company_name,
  l.phone,
  l.status AS lead_status,
  l.priority AS lead_priority,
  u.name AS assigned_to_name
`;

// Cross-lead follow-up list for the admin Follow-ups page and dashboard
// widget, with the same COUNT + inlined-integer LIMIT/OFFSET pagination
// pattern as party.service.js's getParties / lead.service.js's getLeads.
//
// @param {{due?:string, status?:string, type?:string, date_from?:string, date_to?:string, page?:number, limit?:number}} filters
// @returns {Promise<{items:Array<Object>, totalItems:number, page:number, limit:number, totalPages:number}>}
const getFollowupsAggregate = async ({
  due,
  status,
  type,
  date_from,
  date_to,
  page = 1,
  limit = 20,
} = {}) => {
  const parsedPage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const parsedLimit =
    Number.isInteger(Number(limit)) && Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
  const offset = (parsedPage - 1) * parsedLimit;

  const { whereClause, values } = buildAggregateWhere({ due, status, type, date_from, date_to });

  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM lead_followups lf
     JOIN leads l ON l.id = lf.lead_id
     LEFT JOIN users u ON u.id = l.assigned_to
     ${whereClause}`,
    values
  );

  const totalItems = Number(countRows[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / parsedLimit));

  const items = await query(
    `SELECT ${AGGREGATE_SELECT_COLUMNS}
     FROM lead_followups lf
     JOIN leads l ON l.id = lf.lead_id
     LEFT JOIN users u ON u.id = l.assigned_to
     ${whereClause}
     ORDER BY lf.followup_date ASC, lf.followup_time ASC
     LIMIT ${parsedLimit} OFFSET ${offset}`,
    values
  );

  return { items, totalItems, page: parsedPage, limit: parsedLimit, totalPages };
};

// Keyset-paginated async generator over the same aggregate join query, for
// streaming CSV/export without loading the whole result set into memory.
// Same shape as lead.service.js's iterateLeadsForExport: ordered by id DESC,
// keyset on lf.id (WHERE lf.id < lastId), batched with inlined LIMIT.
//
// @param {{due?:string, status?:string, type?:string, date_from?:string, date_to?:string}} filters
// @yields {Object} one follow-up row (aggregate shape) at a time
async function* iterateFollowupsForExport(filters = {}) {
  const BATCH_SIZE = 500;
  const { whereClause, values } = buildAggregateWhere(filters);

  let lastId = null;

  for (;;) {
    const keysetClause = lastId === null ? "" : "AND lf.id < ?";
    const batchValues = lastId === null ? values : [...values, lastId];

    const rows = await query(
      `SELECT ${AGGREGATE_SELECT_COLUMNS}
       FROM lead_followups lf
       JOIN leads l ON l.id = lf.lead_id
       LEFT JOIN users u ON u.id = l.assigned_to
       ${whereClause} ${keysetClause}
       ORDER BY lf.id DESC
       LIMIT ${BATCH_SIZE}`,
      batchValues
    );

    if (!rows.length) {
      return;
    }

    for (const row of rows) {
      yield row;
    }

    lastId = rows[rows.length - 1].id;

    if (rows.length < BATCH_SIZE) {
      return;
    }
  }
}

module.exports = {
  createFollowup,
  getFollowupsForLead,
  applyFollowupAction,
  getFollowupsAggregate,
  iterateFollowupsForExport,
  syncNextFollowupDate,
};
