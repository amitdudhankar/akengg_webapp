const query = require("../utils/db");
const AppError = require("../utils/appError");
const { keyFromFile, assetUrl, deleteAsset } = require("../utils/storage");

const STORAGE_FOLDER = "services";

const SELECT_COLUMNS =
  "id, title, description, details, image, features, icon, gradient, sort_order, created_at, updated_at";

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

const sanitizeServiceInput = (payload) => {
  const cleanPayload = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    cleanPayload[key] = typeof value === "string" ? value.trim() : value;
  });
  return cleanPayload;
};

const mapService = (service) => {
  if (!service) {
    return null;
  }
  return {
    id: service.id,
    title: service.title,
    description: service.description,
    details: service.details ?? null,
    image: assetUrl(service.image),
    features: parseFeatures(service.features),
    icon: service.icon ?? null,
    gradient: service.gradient ?? null,
    sort_order: service.sort_order,
    created_at: service.created_at ?? null,
    updated_at: service.updated_at ?? null,
  };
};

const getServices = async () => {
  const rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM services ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(mapService);
};

const getServiceById = async (id) => {
  const rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM services WHERE id = ?`,
    [id]
  );
  if (!rows.length) {
    throw new AppError("Service not found", 404);
  }
  return mapService(rows[0]);
};

// Returns the raw stored image key (not the public URL) and asserts existence.
const getRawImageKey = async (id) => {
  const rows = await query("SELECT image FROM services WHERE id = ?", [id]);
  if (!rows.length) {
    throw new AppError("Service not found", 404);
  }
  return rows[0].image;
};

const createService = async (payload, file) => {
  const cleanPayload = sanitizeServiceInput(payload);

  const result = await query(
    `INSERT INTO services (title, description, details, image, features, icon, gradient, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cleanPayload.title,
      cleanPayload.description,
      cleanPayload.details || null,
      keyFromFile(STORAGE_FOLDER, file),
      JSON.stringify(normalizeFeaturesInput(cleanPayload.features)),
      cleanPayload.icon || null,
      cleanPayload.gradient || null,
      Number(cleanPayload.sort_order) || 0,
    ]
  );

  return getServiceById(result.insertId);
};

const updateService = async (id, payload, file) => {
  const oldImageKey = await getRawImageKey(id); // also asserts existence
  const cleanPayload = sanitizeServiceInput(payload);

  const fields = [];
  const values = [];
  const setField = (column, value) => {
    fields.push(`${column} = ?`);
    values.push(value);
  };

  if (cleanPayload.title !== undefined) setField("title", cleanPayload.title);
  if (cleanPayload.description !== undefined) setField("description", cleanPayload.description);
  if (cleanPayload.details !== undefined) setField("details", cleanPayload.details || null);
  if (cleanPayload.features !== undefined) {
    setField("features", JSON.stringify(normalizeFeaturesInput(cleanPayload.features)));
  }
  if (cleanPayload.icon !== undefined) setField("icon", cleanPayload.icon || null);
  if (cleanPayload.gradient !== undefined) setField("gradient", cleanPayload.gradient || null);
  if (cleanPayload.sort_order !== undefined) setField("sort_order", Number(cleanPayload.sort_order) || 0);

  if (file) {
    setField("image", keyFromFile(STORAGE_FOLDER, file));
  }

  if (!fields.length) {
    return getServiceById(id);
  }

  values.push(id);
  await query(
    `UPDATE services SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );

  if (file && oldImageKey) {
    await deleteAsset(oldImageKey);
  }

  return getServiceById(id);
};

const deleteService = async (id) => {
  const oldImageKey = await getRawImageKey(id);
  await query("DELETE FROM services WHERE id = ?", [id]);
  if (oldImageKey) {
    await deleteAsset(oldImageKey);
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
