const query = require("../utils/db");
const AppError = require("../utils/appError");
const { keyFromFile, assetUrl, deleteAsset } = require("../utils/storage");

const STORAGE_FOLDER = "projects";

const SELECT_COLUMNS =
  "id, title, industry, description, features, image, sort_order, created_at, updated_at";

const parseFeatures = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const normalizeFeaturesInput = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch (error) {
    // not JSON — fall back to newline/comma separated values
  }
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const sanitizeProjectInput = (payload) => {
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
const mapProject = async (project) => {
  if (!project) {
    return null;
  }
  return {
    id: project.id,
    title: project.title,
    industry: project.industry,
    description: project.description,
    features: parseFeatures(project.features),
    image: await assetUrl(project.image),
    sort_order: project.sort_order,
    created_at: project.created_at ?? null,
    updated_at: project.updated_at ?? null,
  };
};

const getProjects = async () => {
  const rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM projects ORDER BY sort_order ASC, id ASC`
  );
  return Promise.all(rows.map(mapProject));
};

const getProjectById = async (id) => {
  const rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM projects WHERE id = ?`,
    [id]
  );
  if (!rows.length) {
    throw new AppError("Project not found", 404);
  }
  return mapProject(rows[0]);
};

const getRawImageKey = async (id) => {
  const rows = await query("SELECT image FROM projects WHERE id = ?", [id]);
  if (!rows.length) {
    throw new AppError("Project not found", 404);
  }
  return rows[0].image;
};

const createProject = async (payload, file) => {
  const cleanPayload = sanitizeProjectInput(payload);

  const result = await query(
    `INSERT INTO projects (title, industry, description, features, image, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      cleanPayload.title,
      cleanPayload.industry,
      cleanPayload.description,
      JSON.stringify(normalizeFeaturesInput(cleanPayload.features)),
      keyFromFile(STORAGE_FOLDER, file),
      Number(cleanPayload.sort_order) || 0,
    ]
  );

  return getProjectById(result.insertId);
};

const updateProject = async (id, payload, file) => {
  const oldImageKey = await getRawImageKey(id); // also asserts existence
  const cleanPayload = sanitizeProjectInput(payload);

  const fields = [];
  const values = [];
  const setField = (column, value) => {
    fields.push(`${column} = ?`);
    values.push(value);
  };

  if (cleanPayload.title !== undefined) setField("title", cleanPayload.title);
  if (cleanPayload.industry !== undefined) setField("industry", cleanPayload.industry);
  if (cleanPayload.description !== undefined) setField("description", cleanPayload.description);
  if (cleanPayload.features !== undefined) {
    setField("features", JSON.stringify(normalizeFeaturesInput(cleanPayload.features)));
  }
  if (cleanPayload.sort_order !== undefined) setField("sort_order", Number(cleanPayload.sort_order) || 0);

  if (file) {
    setField("image", keyFromFile(STORAGE_FOLDER, file));
  }

  if (!fields.length) {
    return getProjectById(id);
  }

  values.push(id);
  await query(
    `UPDATE projects SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );

  if (file && oldImageKey) {
    await deleteAsset(oldImageKey);
  }

  return getProjectById(id);
};

const deleteProject = async (id) => {
  const oldImageKey = await getRawImageKey(id);
  await query("DELETE FROM projects WHERE id = ?", [id]);
  if (oldImageKey) {
    await deleteAsset(oldImageKey);
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
