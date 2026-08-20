// src/services/leadReport.service.js
// ─────────────────────────────────────────────────────────────────────────
// Read-only aggregate reporting over `leads` / `lead_followups` for the admin
// dashboard and reports pages. Every function here is a plain SELECT via the
// query() helper — no writes, no transaction, nothing that needs a row lock.
//
// The QUALIFIED_PLUS_STATUSES / QUOTATION_PLUS_STATUSES status lists are
// pulled from config/leadOptions.js (the single source of truth the header
// comment there names) rather than re-typed as SQL literals, so a future
// change to the pipeline can't silently drift between the enum and these
// reports. They are fixed, developer-controlled constants (never derived
// from request input), so inlining them into the SQL text is safe.
//
// todayDateString() mirrors leadFollowup.service.js's todayDateString(): a
// manual local-date string, deliberately NOT SQL CURDATE(), so "today" can't
// drift between the app server's timezone and the DB server's timezone. It
// is not exported from that file, so it is duplicated here rather than
// reached into across files.
// ─────────────────────────────────────────────────────────────────────────
const query = require("../utils/db");
const { LEAD_STATUSES, QUALIFIED_PLUS_STATUSES, QUOTATION_PLUS_STATUSES } = require("../config/leadOptions");

// Fixed, developer-controlled enum values only — never built from user
// input. Safe to inline directly into a SQL IN (...) list.
const inList = (values) => values.map((value) => `'${value}'`).join(", ");

const QUALIFIED_PLUS_SQL = inList(QUALIFIED_PLUS_STATUSES);
const QUOTATION_PLUS_SQL = inList(QUOTATION_PLUS_STATUSES);

// Same manual local-date convention as leadFollowup.service.js's
// todayDateString() — deliberately not SQL CURDATE().
const todayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Shared optional created_at range filter for the three report queries
// below. Half-open on the upper bound (created_at < date_to + 1 day) so a
// TIMESTAMP column is never truncated against a bare DATE string.
//
// @param {string} [dateFrom] "YYYY-MM-DD"
// @param {string} [dateTo]   "YYYY-MM-DD"
// @returns {{ sql: string, params: Array }}
const buildDateFilter = (dateFrom, dateTo) => {
  const conditions = [];
  const params = [];

  if (dateFrom) {
    conditions.push("created_at >= ?");
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push("created_at < DATE_ADD(?, INTERVAL 1 DAY)");
    params.push(dateTo);
  }

  return { sql: conditions.length ? ` AND ${conditions.join(" AND ")}` : "", params };
};

// ── dashboard stats ─────────────────────────────────────────────────────
/**
 * Headline counters for the admin dashboard: total/new/open lead counts, the
 * open pipeline's estimated value, today's/overdue pending follow-ups, and a
 * zero-filled breakdown by every LEAD_STATUSES value (so a status with no
 * leads yet still appears as 0, not missing).
 *
 * @param {{date_from?:string, date_to?:string}} [filters]
 * @returns {Promise<Object>}
 */
const getLeadStats = async ({ date_from, date_to } = {}) => {
  const dateFilter = buildDateFilter(date_from, date_to);

  const totalsRows = await query(
    `SELECT
       COUNT(*) AS total_leads,
       SUM(status = 'NEW') AS new_leads,
       SUM(status NOT IN ('WON', 'LOST')) AS open_leads,
       SUM(CASE WHEN status NOT IN ('WON', 'LOST') THEN COALESCE(quotation_value, estimated_value, 0) ELSE 0 END) AS open_pipeline_value
     FROM leads
     WHERE 1 = 1${dateFilter.sql}`,
    dateFilter.params
  );

  const statusRows = await query(
    `SELECT status, COUNT(*) AS count
     FROM leads
     WHERE 1 = 1${dateFilter.sql}
     GROUP BY status`,
    dateFilter.params
  );

  const todayStr = todayDateString();

  const followupRows = await query(
    `SELECT
       SUM(CASE WHEN status = 'PENDING' AND followup_date = ? THEN 1 ELSE 0 END) AS due_today,
       SUM(CASE WHEN status = 'PENDING' AND followup_date < ? THEN 1 ELSE 0 END) AS overdue
     FROM lead_followups`,
    [todayStr, todayStr]
  );

  const totals = totalsRows[0] || {};
  const followups = followupRows[0] || {};

  const byStatus = LEAD_STATUSES.reduce((accumulator, status) => {
    accumulator[status] = 0;
    return accumulator;
  }, {});

  statusRows.forEach((row) => {
    byStatus[row.status] = Number(row.count || 0);
  });

  return {
    total_leads: Number(totals.total_leads || 0),
    new_leads: Number(totals.new_leads || 0),
    open_leads: Number(totals.open_leads || 0),
    open_pipeline_value: Number(totals.open_pipeline_value || 0),
    followups_due_today: Number(followups.due_today || 0),
    followups_overdue: Number(followups.overdue || 0),
    by_status: byStatus,
  };
};

// ── source report ───────────────────────────────────────────────────────
/**
 * Lead volume, qualification and win counts grouped by `source`. Blank/NULL
 * sources are bucketed under "Unknown" rather than dropped or left blank.
 *
 * @param {{date_from?:string, date_to?:string}} [filters]
 * @returns {Promise<Array<{source:string, leads:number, qualified:number, won:number}>>}
 */
const getSourceReport = async ({ date_from, date_to } = {}) => {
  const dateFilter = buildDateFilter(date_from, date_to);

  const rows = await query(
    `SELECT
       COALESCE(NULLIF(TRIM(source), ''), 'Unknown') AS source,
       COUNT(*) AS leads,
       SUM(CASE WHEN status IN (${QUALIFIED_PLUS_SQL}) THEN 1 ELSE 0 END) AS qualified,
       SUM(CASE WHEN status = 'WON' THEN 1 ELSE 0 END) AS won
     FROM leads
     WHERE 1 = 1${dateFilter.sql}
     GROUP BY 1
     ORDER BY leads DESC`,
    dateFilter.params
  );

  return rows.map((row) => ({
    source: row.source,
    leads: Number(row.leads || 0),
    qualified: Number(row.qualified || 0),
    won: Number(row.won || 0),
  }));
};

// ── product report ──────────────────────────────────────────────────────
/**
 * Lead volume, qualification, quotation, win and loss counts grouped by
 * `product`. NULL products are bucketed under "Unspecified".
 *
 * @param {{date_from?:string, date_to?:string}} [filters]
 * @returns {Promise<Array<{product:string, leads:number, qualified:number, quotation:number, won:number, lost:number}>>}
 */
const getProductReport = async ({ date_from, date_to } = {}) => {
  const dateFilter = buildDateFilter(date_from, date_to);

  const rows = await query(
    `SELECT
       COALESCE(product, 'Unspecified') AS product,
       COUNT(*) AS leads,
       SUM(CASE WHEN status IN (${QUALIFIED_PLUS_SQL}) THEN 1 ELSE 0 END) AS qualified,
       SUM(CASE WHEN status IN (${QUOTATION_PLUS_SQL}) THEN 1 ELSE 0 END) AS quotation,
       SUM(CASE WHEN status = 'WON' THEN 1 ELSE 0 END) AS won,
       SUM(CASE WHEN status = 'LOST' THEN 1 ELSE 0 END) AS lost
     FROM leads
     WHERE 1 = 1${dateFilter.sql}
     GROUP BY 1
     ORDER BY leads DESC`,
    dateFilter.params
  );

  return rows.map((row) => ({
    product: row.product,
    leads: Number(row.leads || 0),
    qualified: Number(row.qualified || 0),
    quotation: Number(row.quotation || 0),
    won: Number(row.won || 0),
    lost: Number(row.lost || 0),
  }));
};

module.exports = {
  getLeadStats,
  getSourceReport,
  getProductReport,
};
