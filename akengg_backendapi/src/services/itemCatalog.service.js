const query = require("../utils/db");
const AppError = require("../utils/appError");

const ITEM_COLUMNS = [
  "id",
  "kind",
  "name",
  "description",
  "hsn_sac",
  "uqc",
  "default_rate",
  "default_gst_rate",
  "is_active",
  "created_at",
  "updated_at",
];

const SELECT_COLUMNS = ITEM_COLUMNS.join(", ");

// Writable fields accepted from clients (id/timestamps are managed by the DB).
const WRITABLE_FIELDS = [
  "kind",
  "name",
  "description",
  "hsn_sac",
  "uqc",
  "default_rate",
  "default_gst_rate",
  "is_active",
];

// mysql2 returns DECIMAL columns as strings; coerce to Number for the API.
const toNumber = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const mapItem = (item) => {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    description: item.description ?? null,
    hsn_sac: item.hsn_sac ?? null,
    uqc: item.uqc ?? null,
    default_rate: toNumber(item.default_rate),
    default_gst_rate: toNumber(item.default_gst_rate),
    is_active: Number(item.is_active) === 1,
    created_at: item.created_at ?? null,
    updated_at: item.updated_at ?? null,
  };
};

// Build a clean payload of only the writable fields that were actually provided.
const sanitizeItemInput = (payload = {}) => {
  const cleanPayload = {};

  WRITABLE_FIELDS.forEach((field) => {
    if (payload[field] === undefined) {
      return;
    }

    let value = payload[field];

    if (field === "name" || field === "description" || field === "hsn_sac" || field === "uqc" || field === "kind") {
      value = typeof value === "string" ? value.trim() : value;
      if (field !== "name" && field !== "kind" && value === "") {
        value = null;
      }
    }

    if (field === "default_rate" || field === "default_gst_rate") {
      value = Number(value);
    }

    if (field === "is_active") {
      value = value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;
    }

    cleanPayload[field] = value;
  });

  return cleanPayload;
};

const getItems = async ({ page = 1, limit = 10, search = "", kind, is_active } = {}) => {
  const parsedPage = Number(page) || 1;
  const parsedLimit = Number(limit) || 10;
  const offset = (parsedPage - 1) * parsedLimit;
  const normalizedSearch = String(search || "").trim();
  const filters = [];
  const values = [];

  if (normalizedSearch) {
    filters.push("(name LIKE ? OR description LIKE ? OR hsn_sac LIKE ?)");
    values.push(`%${normalizedSearch}%`, `%${normalizedSearch}%`, `%${normalizedSearch}%`);
  }

  if (kind !== undefined && kind !== "") {
    filters.push("kind = ?");
    values.push(kind);
  }

  if (is_active !== undefined && is_active !== "") {
    const activeFlag =
      is_active === true || is_active === 1 || is_active === "1" || is_active === "true" ? 1 : 0;
    filters.push("is_active = ?");
    values.push(activeFlag);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM item_catalog
     ${whereClause}`,
    values
  );

  const totalItems = Number(countRows[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / parsedLimit));

  const itemRows = await query(
    `SELECT ${SELECT_COLUMNS}
     FROM item_catalog
     ${whereClause}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [...values, parsedLimit, offset]
  );

  return {
    items: itemRows.map(mapItem),
    page: parsedPage,
    limit: parsedLimit,
    totalItems,
    totalPages,
  };
};

const getItemById = async (id) => {
  const rows = await query(
    `SELECT ${SELECT_COLUMNS}
     FROM item_catalog
     WHERE id = ?`,
    [id]
  );

  if (!rows.length) {
    throw new AppError("Item not found", 404);
  }

  return mapItem(rows[0]);
};

const createItem = async (payload) => {
  const cleanPayload = sanitizeItemInput(payload);

  const result = await query(
    `INSERT INTO item_catalog
       (kind, name, description, hsn_sac, uqc, default_rate, default_gst_rate, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cleanPayload.kind ?? "goods",
      cleanPayload.name,
      cleanPayload.description ?? null,
      cleanPayload.hsn_sac ?? null,
      cleanPayload.uqc ?? null,
      cleanPayload.default_rate ?? 0,
      cleanPayload.default_gst_rate ?? 0,
      cleanPayload.is_active ?? 1,
    ]
  );

  return getItemById(result.insertId);
};

const updateItem = async (id, payload) => {
  await getItemById(id);

  const cleanPayload = sanitizeItemInput(payload);
  const fields = [];
  const values = [];

  Object.entries(cleanPayload).forEach(([key, value]) => {
    fields.push(`${key} = ?`);
    values.push(value);
  });

  if (!fields.length) {
    return getItemById(id);
  }

  values.push(id);

  await query(
    `UPDATE item_catalog
     SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    values
  );

  return getItemById(id);
};

// Count document lines that reference this item. Free-text lines carry
// item_id = NULL and never match, so they never block a delete.
const countItemReferences = async (id) => {
  const rows = await query(
    "SELECT COUNT(*) AS total FROM document_items WHERE item_id = ?",
    [id]
  );
  return Number(rows[0]?.total || 0);
};

// Soft-deactivate when referenced by any document line; hard-delete when orphan.
const deleteItem = async (id) => {
  await getItemById(id); // 404 if missing

  const references = await countItemReferences(id);
  if (references > 0) {
    await query(
      "UPDATE item_catalog SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );
    return { deactivated: true, references };
  }

  await query("DELETE FROM item_catalog WHERE id = ?", [id]);
  return { deactivated: false, references: 0 };
};

module.exports = {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  countItemReferences,
};
