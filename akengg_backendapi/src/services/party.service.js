const query = require("../utils/db");
const AppError = require("../utils/appError");

// Columns mirror the `parties` table in src/sql/document_builder_schema.sql.
const PARTY_COLUMNS = [
  "id",
  "party_type",
  "name",
  "gstin",
  "party_is_registered",
  "pan",
  "email",
  "phone",
  "billing_address_line1",
  "billing_address_line2",
  "billing_city",
  "billing_state",
  "billing_state_code",
  "billing_pincode",
  "billing_country",
  "shipping_address_line1",
  "shipping_address_line2",
  "shipping_city",
  "shipping_state",
  "shipping_state_code",
  "shipping_pincode",
  "shipping_country",
  "is_active",
  "created_at",
  "updated_at",
];

// Fields a client may write (excludes id + timestamps).
const WRITABLE_FIELDS = [
  "party_type",
  "name",
  "gstin",
  "party_is_registered",
  "pan",
  "email",
  "phone",
  "billing_address_line1",
  "billing_address_line2",
  "billing_city",
  "billing_state",
  "billing_state_code",
  "billing_pincode",
  "billing_country",
  "shipping_address_line1",
  "shipping_address_line2",
  "shipping_city",
  "shipping_state",
  "shipping_state_code",
  "shipping_pincode",
  "shipping_country",
  "is_active",
];

// Boolean-ish columns stored as TINYINT(1).
const BOOLEAN_FIELDS = new Set(["party_is_registered", "is_active"]);

const SELECT_COLUMNS = PARTY_COLUMNS.join(", ");

const toBooleanInt = (value) => {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return 1;
  }
  if (value === false || value === 0 || value === "0" || value === "false") {
    return 0;
  }
  return value ? 1 : 0;
};

// Trim strings, coerce TINYINT flags, and drop undefined keys so partial
// updates only touch the fields the caller actually supplied.
const sanitizeInput = (payload = {}) => {
  const clean = {};

  WRITABLE_FIELDS.forEach((field) => {
    const value = payload[field];

    if (value === undefined) {
      return;
    }

    if (BOOLEAN_FIELDS.has(field)) {
      clean[field] = toBooleanInt(value);
      return;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      clean[field] = trimmed === "" ? null : trimmed;
      return;
    }

    clean[field] = value;
  });

  return clean;
};

const mapParty = (party) => {
  if (!party) {
    return null;
  }

  return PARTY_COLUMNS.reduce((accumulator, column) => {
    let value = party[column] ?? null;

    if (BOOLEAN_FIELDS.has(column) && value !== null) {
      value = Number(value) === 1;
    }

    accumulator[column] = value;
    return accumulator;
  }, {});
};

const getParties = async ({
  page = 1,
  limit = 10,
  search = "",
  type = "",
  is_active = "",
} = {}) => {
  const parsedPage = Number(page) || 1;
  const parsedLimit = Number(limit) || 10;
  const offset = (parsedPage - 1) * parsedLimit;

  const filters = [];
  const values = [];

  const normalizedSearch = String(search || "").trim();
  if (normalizedSearch) {
    filters.push("(name LIKE ? OR gstin LIKE ? OR email LIKE ? OR phone LIKE ?)");
    const like = `%${normalizedSearch}%`;
    values.push(like, like, like, like);
  }

  const normalizedType = String(type || "").trim().toLowerCase();
  if (normalizedType) {
    filters.push("party_type = ?");
    values.push(normalizedType);
  }

  if (is_active !== undefined && is_active !== "" && is_active !== null) {
    filters.push("is_active = ?");
    values.push(toBooleanInt(is_active));
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM parties
     ${whereClause}`,
    values
  );

  const totalItems = Number(countRows[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / parsedLimit));

  const partyRows = await query(
    `SELECT ${SELECT_COLUMNS}
     FROM parties
     ${whereClause}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [...values, parsedLimit, offset]
  );

  return {
    parties: partyRows.map(mapParty),
    page: parsedPage,
    limit: parsedLimit,
    totalItems,
    totalPages,
  };
};

const getPartyById = async (id) => {
  const rows = await query(
    `SELECT ${SELECT_COLUMNS}
     FROM parties
     WHERE id = ?`,
    [id]
  );

  if (!rows.length) {
    throw new AppError("Party not found", 404);
  }

  return mapParty(rows[0]);
};

const createParty = async (payload) => {
  const clean = sanitizeInput(payload);

  const fields = Object.keys(clean);
  const placeholders = fields.map(() => "?");
  const values = fields.map((field) => clean[field]);

  const result = await query(
    `INSERT INTO parties (${fields.join(", ")})
     VALUES (${placeholders.join(", ")})`,
    values
  );

  return getPartyById(result.insertId);
};

const updateParty = async (id, payload) => {
  await getPartyById(id);

  const clean = sanitizeInput(payload);
  const fields = Object.keys(clean);

  if (!fields.length) {
    return getPartyById(id);
  }

  const assignments = fields.map((field) => `${field} = ?`);
  const values = fields.map((field) => clean[field]);
  values.push(id);

  await query(
    `UPDATE parties
     SET ${assignments.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    values
  );

  return getPartyById(id);
};

// Count documents that reference this party (any status). Free-text / deleted
// links don't matter — only a live party_id soft ref counts.
const countPartyReferences = async (id) => {
  const rows = await query(
    "SELECT COUNT(*) AS total FROM documents WHERE party_id = ?",
    [id]
  );
  return Number(rows[0]?.total || 0);
};

// Soft-deactivate when referenced (preserve the row so historical/draft docs
// keep resolving it), hard-delete only when it's an orphan. Returns a flag so
// the controller can tailor the message.
const deleteParty = async (id) => {
  await getPartyById(id); // 404 if missing

  const references = await countPartyReferences(id);
  if (references > 0) {
    await query(
      "UPDATE parties SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );
    return { deactivated: true, references };
  }

  await query("DELETE FROM parties WHERE id = ?", [id]);
  return { deactivated: false, references: 0 };
};

module.exports = {
  getParties,
  getPartyById,
  createParty,
  updateParty,
  deleteParty,
  countPartyReferences,
};
