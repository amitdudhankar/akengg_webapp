const query = require("../utils/db");
const AppError = require("../utils/appError");

const SELECT_COLUMNS = "id, name, count, color, sort_order, created_at, updated_at";

const sanitizeInput = (payload) => {
  const cleanPayload = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    cleanPayload[key] = typeof value === "string" ? value.trim() : value;
  });
  return cleanPayload;
};

const mapStat = (stat) => {
  if (!stat) {
    return null;
  }
  return {
    id: stat.id,
    name: stat.name,
    count: stat.count,
    color: stat.color ?? null,
    sort_order: stat.sort_order,
    created_at: stat.created_at ?? null,
    updated_at: stat.updated_at ?? null,
  };
};

const getIndustryStats = async () => {
  const rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM industry_stats ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(mapStat);
};

const getIndustryStatById = async (id) => {
  const rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM industry_stats WHERE id = ?`,
    [id]
  );
  if (!rows.length) {
    throw new AppError("Industry stat not found", 404);
  }
  return mapStat(rows[0]);
};

const createIndustryStat = async (payload) => {
  const cleanPayload = sanitizeInput(payload);

  const result = await query(
    `INSERT INTO industry_stats (name, count, color, sort_order)
     VALUES (?, ?, ?, ?)`,
    [
      cleanPayload.name,
      Number(cleanPayload.count) || 0,
      cleanPayload.color || null,
      Number(cleanPayload.sort_order) || 0,
    ]
  );

  return getIndustryStatById(result.insertId);
};

const updateIndustryStat = async (id, payload) => {
  await getIndustryStatById(id);
  const cleanPayload = sanitizeInput(payload);

  const fields = [];
  const values = [];
  const setField = (column, value) => {
    fields.push(`${column} = ?`);
    values.push(value);
  };

  if (cleanPayload.name !== undefined) setField("name", cleanPayload.name);
  if (cleanPayload.count !== undefined) setField("count", Number(cleanPayload.count) || 0);
  if (cleanPayload.color !== undefined) setField("color", cleanPayload.color || null);
  if (cleanPayload.sort_order !== undefined) setField("sort_order", Number(cleanPayload.sort_order) || 0);

  if (!fields.length) {
    return getIndustryStatById(id);
  }

  values.push(id);
  await query(
    `UPDATE industry_stats SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );

  return getIndustryStatById(id);
};

const deleteIndustryStat = async (id) => {
  await getIndustryStatById(id);
  await query("DELETE FROM industry_stats WHERE id = ?", [id]);
};

module.exports = {
  getIndustryStats,
  getIndustryStatById,
  createIndustryStat,
  updateIndustryStat,
  deleteIndustryStat,
};
