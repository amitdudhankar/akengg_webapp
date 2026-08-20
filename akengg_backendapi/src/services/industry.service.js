const query = require("../utils/db");
const AppError = require("../utils/appError");
const { keyFromFile, assetUrl, deleteAsset } = require("../utils/storage");

const STORAGE_FOLDER = "industries";

const SELECT_COLUMNS =
  "id, slug, name, meta_title, meta_description, hero_heading, hero_subheading, image, " +
  "overview, challenges, solutions, applications, related_products, sort_order, is_published, " +
  "created_at, updated_at";

// The list-ish columns are LONGTEXT holding a JSON array of strings, exactly
// like services.features / projects.features.
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

const sanitizeIndustryInput = (payload) => {
  const cleanPayload = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    cleanPayload[key] = typeof value === "string" ? value.trim() : value;
  });
  return cleanPayload;
};

// Multipart form-data sends everything as a string, so "0"/"1"/"true"/"" all
// arrive here as text. Coerce rather than reject.
const toFlag = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase()) ? 1 : 0;
};

const toNullableText = (value) =>
  value === undefined || value === null || value === "" ? null : value;

const createSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "industry";

// "pharmaceutical" -> "pharmaceutical-2" -> "pharmaceutical-3" … until free.
// `industryId` is excluded so re-saving a row keeps its own slug.
const ensureUniqueSlug = async (desired, industryId) => {
  const baseSlug = createSlug(desired);
  let slug = baseSlug;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await query(
      "SELECT id FROM industries WHERE slug = ? AND id <> ? LIMIT 1",
      [slug, industryId || 0]
    );

    if (!rows.length) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
};

// async: assetUrl presigns under the s3 driver.
const mapIndustry = async (industry) => {
  if (!industry) {
    return null;
  }
  return {
    id: industry.id,
    slug: industry.slug,
    name: industry.name,
    meta_title: industry.meta_title ?? null,
    meta_description: industry.meta_description ?? null,
    hero_heading: industry.hero_heading ?? null,
    hero_subheading: industry.hero_subheading ?? null,
    image: await assetUrl(industry.image),
    overview: parseFeatures(industry.overview),
    challenges: parseFeatures(industry.challenges),
    solutions: parseFeatures(industry.solutions),
    applications: parseFeatures(industry.applications),
    related_products: parseFeatures(industry.related_products),
    sort_order: industry.sort_order,
    is_published: Number(industry.is_published) === 1 ? 1 : 0,
    created_at: industry.created_at ?? null,
    updated_at: industry.updated_at ?? null,
  };
};

const getIndustries = async ({ includeUnpublished = false } = {}) => {
  const whereClause = includeUnpublished ? "" : "WHERE is_published = 1";

  const rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM industries ${whereClause} ORDER BY sort_order ASC, id ASC`
  );

  return Promise.all(rows.map(mapIndustry));
};

// Public lookup: an all-digits identifier is an id, anything else is a slug.
// A draft page is a 404 for the public and readable for the admin panel.
const getIndustryByIdOrSlug = async (idOrSlug, { includeUnpublished = false } = {}) => {
  const identifier = String(idOrSlug ?? "").trim();
  const isNumericId = /^[0-9]+$/.test(identifier);

  const rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM industries WHERE ${
      isNumericId ? "id = ?" : "slug = ?"
    } LIMIT 1`,
    [isNumericId ? Number(identifier) : identifier]
  );

  if (!rows.length) {
    throw new AppError("Industry not found", 404);
  }

  if (!includeUnpublished && Number(rows[0].is_published) !== 1) {
    throw new AppError("Industry not found", 404);
  }

  return mapIndustry(rows[0]);
};

// Returns the raw stored image key (not the public URL) and asserts existence.
const getRawImageKey = async (id) => {
  const rows = await query("SELECT image FROM industries WHERE id = ?", [id]);
  if (!rows.length) {
    throw new AppError("Industry not found", 404);
  }
  return rows[0].image;
};

const createIndustry = async (payload, file) => {
  const cleanPayload = sanitizeIndustryInput(payload);
  // A slug is derived from the name whenever the editor leaves it blank.
  const slug = await ensureUniqueSlug(cleanPayload.slug || cleanPayload.name);

  const result = await query(
    `INSERT INTO industries
       (slug, name, meta_title, meta_description, hero_heading, hero_subheading, image,
        overview, challenges, solutions, applications, related_products,
        sort_order, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      slug,
      cleanPayload.name,
      toNullableText(cleanPayload.meta_title),
      toNullableText(cleanPayload.meta_description),
      toNullableText(cleanPayload.hero_heading),
      toNullableText(cleanPayload.hero_subheading),
      keyFromFile(STORAGE_FOLDER, file),
      JSON.stringify(normalizeFeaturesInput(cleanPayload.overview)),
      JSON.stringify(normalizeFeaturesInput(cleanPayload.challenges)),
      JSON.stringify(normalizeFeaturesInput(cleanPayload.solutions)),
      JSON.stringify(normalizeFeaturesInput(cleanPayload.applications)),
      JSON.stringify(normalizeFeaturesInput(cleanPayload.related_products)),
      Number(cleanPayload.sort_order) || 0,
      toFlag(cleanPayload.is_published, 0),
    ]
  );

  return getIndustryByIdOrSlug(result.insertId, { includeUnpublished: true });
};

const updateIndustry = async (id, payload, file) => {
  const oldImageKey = await getRawImageKey(id); // also asserts existence
  const cleanPayload = sanitizeIndustryInput(payload);

  const fields = [];
  const values = [];
  const setField = (column, value) => {
    fields.push(`${column} = ?`);
    values.push(value);
  };

  // An explicit slug wins; otherwise a renamed industry re-derives one. Either
  // way ensureUniqueSlug() ignores this row, so an unchanged name is a no-op.
  if (cleanPayload.slug) {
    setField("slug", await ensureUniqueSlug(cleanPayload.slug, id));
  } else if (cleanPayload.name !== undefined) {
    setField("slug", await ensureUniqueSlug(cleanPayload.name, id));
  }

  if (cleanPayload.name !== undefined) setField("name", cleanPayload.name);
  if (cleanPayload.meta_title !== undefined)
    setField("meta_title", toNullableText(cleanPayload.meta_title));
  if (cleanPayload.meta_description !== undefined)
    setField("meta_description", toNullableText(cleanPayload.meta_description));
  if (cleanPayload.hero_heading !== undefined)
    setField("hero_heading", toNullableText(cleanPayload.hero_heading));
  if (cleanPayload.hero_subheading !== undefined)
    setField("hero_subheading", toNullableText(cleanPayload.hero_subheading));

  ["overview", "challenges", "solutions", "applications", "related_products"].forEach(
    (column) => {
      if (cleanPayload[column] !== undefined) {
        setField(column, JSON.stringify(normalizeFeaturesInput(cleanPayload[column])));
      }
    }
  );

  if (cleanPayload.sort_order !== undefined)
    setField("sort_order", Number(cleanPayload.sort_order) || 0);
  if (cleanPayload.is_published !== undefined)
    setField("is_published", toFlag(cleanPayload.is_published, 0));

  if (file) {
    setField("image", keyFromFile(STORAGE_FOLDER, file));
  }

  if (!fields.length) {
    return getIndustryByIdOrSlug(id, { includeUnpublished: true });
  }

  values.push(id);
  await query(
    `UPDATE industries SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );

  if (file && oldImageKey) {
    await deleteAsset(oldImageKey);
  }

  return getIndustryByIdOrSlug(id, { includeUnpublished: true });
};

const deleteIndustry = async (id) => {
  const oldImageKey = await getRawImageKey(id); // also asserts existence

  await query("DELETE FROM industries WHERE id = ?", [id]);

  // Best effort: the row is already gone, so a storage hiccup must not turn a
  // successful delete into a 500. Worst case the object is orphaned.
  if (oldImageKey) {
    try {
      await deleteAsset(oldImageKey);
    } catch (error) {
      console.error("Failed to delete industry image:", error.message);
    }
  }
};

module.exports = {
  getIndustries,
  getIndustryByIdOrSlug,
  createIndustry,
  updateIndustry,
  deleteIndustry,
};
