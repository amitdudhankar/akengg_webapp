const query = require("../utils/db");
const AppError = require("../utils/appError");
const { keyFromFile, assetUrl, deleteAsset } = require("../utils/storage");

const STORAGE_FOLDER = "team";

const SELECT_COLUMNS =
  "id, name, title, subtitle, description, image, sort_order, created_at, updated_at";

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

// async: assetUrl presigns under the s3 driver.
const mapMember = async (member) => {
  if (!member) {
    return null;
  }
  return {
    id: member.id,
    name: member.name,
    title: member.title ?? null,
    subtitle: member.subtitle ?? null,
    description: member.description ?? null,
    image: await assetUrl(member.image),
    sort_order: member.sort_order,
    created_at: member.created_at ?? null,
    updated_at: member.updated_at ?? null,
  };
};

const getTeamMembers = async () => {
  const rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM team_members ORDER BY sort_order ASC, id ASC`
  );
  return Promise.all(rows.map(mapMember));
};

const getTeamMemberById = async (id) => {
  const rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM team_members WHERE id = ?`,
    [id]
  );
  if (!rows.length) {
    throw new AppError("Team member not found", 404);
  }
  return mapMember(rows[0]);
};

const getRawImageKey = async (id) => {
  const rows = await query("SELECT image FROM team_members WHERE id = ?", [id]);
  if (!rows.length) {
    throw new AppError("Team member not found", 404);
  }
  return rows[0].image;
};

const createTeamMember = async (payload, file) => {
  const cleanPayload = sanitizeInput(payload);

  const result = await query(
    `INSERT INTO team_members (name, title, subtitle, description, image, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      cleanPayload.name,
      cleanPayload.title || null,
      cleanPayload.subtitle || null,
      cleanPayload.description || null,
      keyFromFile(STORAGE_FOLDER, file),
      Number(cleanPayload.sort_order) || 0,
    ]
  );

  return getTeamMemberById(result.insertId);
};

const updateTeamMember = async (id, payload, file) => {
  const oldImageKey = await getRawImageKey(id); // also asserts existence
  const cleanPayload = sanitizeInput(payload);

  const fields = [];
  const values = [];
  const setField = (column, value) => {
    fields.push(`${column} = ?`);
    values.push(value);
  };

  if (cleanPayload.name !== undefined) setField("name", cleanPayload.name);
  if (cleanPayload.title !== undefined) setField("title", cleanPayload.title || null);
  if (cleanPayload.subtitle !== undefined) setField("subtitle", cleanPayload.subtitle || null);
  if (cleanPayload.description !== undefined) setField("description", cleanPayload.description || null);
  if (cleanPayload.sort_order !== undefined) setField("sort_order", Number(cleanPayload.sort_order) || 0);

  if (file) {
    setField("image", keyFromFile(STORAGE_FOLDER, file));
  }

  if (!fields.length) {
    return getTeamMemberById(id);
  }

  values.push(id);
  await query(
    `UPDATE team_members SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );

  if (file && oldImageKey) {
    await deleteAsset(oldImageKey);
  }

  return getTeamMemberById(id);
};

const deleteTeamMember = async (id) => {
  const oldImageKey = await getRawImageKey(id);
  await query("DELETE FROM team_members WHERE id = ?", [id]);
  if (oldImageKey) {
    await deleteAsset(oldImageKey);
  }
};

module.exports = {
  getTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
};
