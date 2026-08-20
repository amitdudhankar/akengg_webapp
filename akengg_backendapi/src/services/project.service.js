const query = require("../utils/db");
const AppError = require("../utils/appError");
const { keyFromFile, assetUrl, deleteAsset } = require("../utils/storage");

const STORAGE_FOLDER = "projects";

// The cover image lives on projects.image; gallery images live in
// project_images and share the same storage folder.
const SELECT_COLUMNS =
  "id, title, industry, description, features, image, sort_order, " +
  "slug, location, client_name, show_client_name, customer_requirement, problem, solution, " +
  "equipment, capacity, scope_engineering, scope_fabrication, scope_installation, " +
  "scope_commissioning, result, related_service_slug, industry_id, completed_on, " +
  "meta_title, meta_description, is_published, created_at, updated_at";

// Same column list qualified with the `p` alias, for the queries that LEFT JOIN
// `industries` (where a bare `id` would be ambiguous). One source of truth.
const PREFIXED_SELECT_COLUMNS = SELECT_COLUMNS.split(", ")
  .map((column) => `p.${column}`)
  .join(", ");

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

const toNullableText = (value) =>
  value === undefined || value === null || value === "" ? null : value;

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

const toNullableId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

// The validator has already enforced YYYY-MM-DD; this only strips an ISO time
// component so a JSON client posting "2026-05-01T00:00:00Z" still stores a DATE.
const toNullableDate = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value).slice(0, 10);
};

const createSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200) || "project";

// "boiler-upgrade" -> "boiler-upgrade-2" -> "boiler-upgrade-3" … until free.
// `projectId` is excluded so re-saving a row keeps its own slug.
const ensureUniqueSlug = async (desired, projectId) => {
  const baseSlug = createSlug(desired);
  let slug = baseSlug;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await query(
      "SELECT id FROM projects WHERE slug = ? AND id <> ? LIMIT 1",
      [slug, projectId || 0]
    );

    if (!rows.length) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
};

/**
 * async: assetUrl presigns under the s3 driver.
 *
 * `admin` controls one thing only: whether a confidential client name is
 * returned. A case study can name its client only when the owner ticked
 * show_client_name, so public reads get null for the rest — the name is still
 * stored, and the admin panel (which sends a token) still sees it to edit.
 */
const mapProject = async (project, { admin = false } = {}) => {
  if (!project) {
    return null;
  }

  const showClientName = Number(project.show_client_name) === 1 ? 1 : 0;

  return {
    id: project.id,
    title: project.title,
    industry: project.industry,
    description: project.description,
    features: parseFeatures(project.features),
    image: await assetUrl(project.image),
    sort_order: project.sort_order,
    slug: project.slug ?? null,
    location: project.location ?? null,
    client_name: admin || showClientName ? project.client_name ?? null : null,
    show_client_name: showClientName,
    customer_requirement: project.customer_requirement ?? null,
    problem: project.problem ?? null,
    solution: project.solution ?? null,
    equipment: parseFeatures(project.equipment),
    capacity: project.capacity ?? null,
    scope_engineering: project.scope_engineering ?? null,
    scope_fabrication: project.scope_fabrication ?? null,
    scope_installation: project.scope_installation ?? null,
    scope_commissioning: project.scope_commissioning ?? null,
    result: project.result ?? null,
    related_service_slug: project.related_service_slug ?? null,
    industry_id: project.industry_id ?? null,
    completed_on: project.completed_on ?? null,
    meta_title: project.meta_title ?? null,
    meta_description: project.meta_description ?? null,
    is_published: Number(project.is_published) === 1 ? 1 : 0,
    created_at: project.created_at ?? null,
    updated_at: project.updated_at ?? null,
  };
};

const mapProjectImage = async (row) => ({
  id: row.id,
  image_url: await assetUrl(row.image_key),
  caption: row.caption ?? null,
  sort_order: row.sort_order,
});

const getProjectImages = async (projectId) => {
  const rows = await query(
    `SELECT id, image_key, caption, sort_order
     FROM project_images
     WHERE project_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [projectId]
  );
  return Promise.all(rows.map(mapProjectImage));
};

/**
 * @param {{industry?: string, includeUnpublished?: boolean}} [options]
 *   `industry` matches EITHER a linked industry page slug (industries.slug)
 *   or the legacy free-text projects.industry label, so the filter keeps
 *   working for rows that were never linked to an industry record.
 */
const getProjects = async ({ industry, includeUnpublished = false } = {}) => {
  const filters = [];
  const values = [];

  if (!includeUnpublished) {
    filters.push("p.is_published = 1");
  }

  const industryFilter = typeof industry === "string" ? industry.trim() : "";
  if (industryFilter) {
    filters.push("(i.slug = ? OR p.industry = ?)");
    values.push(industryFilter, industryFilter);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const rows = await query(
    `SELECT ${PREFIXED_SELECT_COLUMNS}
     FROM projects p
     LEFT JOIN industries i ON i.id = p.industry_id
     ${whereClause}
     ORDER BY p.sort_order ASC, p.id ASC`,
    values
  );

  return Promise.all(rows.map((row) => mapProject(row, { admin: includeUnpublished })));
};

// Kept for backwards compatibility: id only, no published filter, no gallery.
// Used internally to echo a project back after create/update.
const getProjectById = async (id) => {
  const rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM projects WHERE id = ?`,
    [id]
  );
  if (!rows.length) {
    throw new AppError("Project not found", 404);
  }
  return mapProject(rows[0], { admin: true });
};

/**
 * Public case-study lookup. An all-digits identifier is an id, anything else is
 * a slug, so /projects/12 keeps resolving alongside /projects/my-case-study.
 *
 * Returns the project plus its `images` gallery, and — when the row is linked
 * to an industry page — replaces the legacy free-text `industry` label with a
 * nested { id, slug, name } object. Both frontends already read either shape.
 */
const getProjectByIdOrSlug = async (idOrSlug, { includeUnpublished = false } = {}) => {
  const identifier = String(idOrSlug ?? "").trim();
  const isNumericId = /^[0-9]+$/.test(identifier);

  const rows = await query(
    `SELECT ${PREFIXED_SELECT_COLUMNS},
            i.id AS linked_industry_id, i.slug AS linked_industry_slug,
            i.name AS linked_industry_name
     FROM projects p
     LEFT JOIN industries i ON i.id = p.industry_id
     WHERE ${isNumericId ? "p.id = ?" : "p.slug = ?"}
     LIMIT 1`,
    [isNumericId ? Number(identifier) : identifier]
  );

  if (!rows.length) {
    throw new AppError("Project not found", 404);
  }

  const row = rows[0];

  if (!includeUnpublished && Number(row.is_published) !== 1) {
    throw new AppError("Project not found", 404);
  }

  const project = await mapProject(row, { admin: includeUnpublished });

  if (row.linked_industry_id) {
    project.industry = {
      id: row.linked_industry_id,
      slug: row.linked_industry_slug,
      name: row.linked_industry_name,
    };
  }

  project.images = await getProjectImages(row.id);

  return project;
};

// Returns the raw stored image key (not the public URL) and asserts existence.
const getRawImageKey = async (id) => {
  const rows = await query("SELECT image FROM projects WHERE id = ?", [id]);
  if (!rows.length) {
    throw new AppError("Project not found", 404);
  }
  return rows[0].image;
};

// The bits updateProject needs up front: the old image key to clean up, plus
// the current title/slug so a slug can be (re)derived.
const getProjectRow = async (id) => {
  const rows = await query("SELECT id, title, slug, image FROM projects WHERE id = ?", [id]);
  if (!rows.length) {
    throw new AppError("Project not found", 404);
  }
  return rows[0];
};

const createProject = async (payload, file) => {
  const cleanPayload = sanitizeProjectInput(payload);
  // A slug is derived from the title whenever the editor leaves it blank.
  const slug = await ensureUniqueSlug(cleanPayload.slug || cleanPayload.title);

  const result = await query(
    `INSERT INTO projects
       (title, industry, description, features, image, sort_order,
        slug, location, client_name, show_client_name, customer_requirement, problem, solution,
        equipment, capacity, scope_engineering, scope_fabrication, scope_installation,
        scope_commissioning, result, related_service_slug, industry_id, completed_on,
        meta_title, meta_description, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cleanPayload.title,
      cleanPayload.industry,
      cleanPayload.description,
      JSON.stringify(normalizeFeaturesInput(cleanPayload.features)),
      keyFromFile(STORAGE_FOLDER, file),
      Number(cleanPayload.sort_order) || 0,
      slug,
      toNullableText(cleanPayload.location),
      toNullableText(cleanPayload.client_name),
      toFlag(cleanPayload.show_client_name, 0),
      toNullableText(cleanPayload.customer_requirement),
      toNullableText(cleanPayload.problem),
      toNullableText(cleanPayload.solution),
      JSON.stringify(normalizeFeaturesInput(cleanPayload.equipment)),
      toNullableText(cleanPayload.capacity),
      toNullableText(cleanPayload.scope_engineering),
      toNullableText(cleanPayload.scope_fabrication),
      toNullableText(cleanPayload.scope_installation),
      toNullableText(cleanPayload.scope_commissioning),
      toNullableText(cleanPayload.result),
      toNullableText(cleanPayload.related_service_slug),
      toNullableId(cleanPayload.industry_id),
      toNullableDate(cleanPayload.completed_on),
      toNullableText(cleanPayload.meta_title),
      toNullableText(cleanPayload.meta_description),
      // Matches the column default: a new case study is live unless the editor
      // explicitly saves it as a draft.
      toFlag(cleanPayload.is_published, 1),
    ]
  );

  return getProjectById(result.insertId);
};

const updateProject = async (id, payload, file) => {
  const current = await getProjectRow(id); // also asserts existence
  const oldImageKey = current.image;
  const cleanPayload = sanitizeProjectInput(payload);

  const fields = [];
  const values = [];
  const setField = (column, value) => {
    fields.push(`${column} = ?`);
    values.push(value);
  };

  // An explicit slug wins; otherwise a retitled project re-derives one, as does
  // any row still carrying the rough slug the migration backfilled (or none at
  // all). ensureUniqueSlug() ignores this row, so an unchanged title is a no-op.
  if (cleanPayload.slug) {
    setField("slug", await ensureUniqueSlug(cleanPayload.slug, id));
  } else if (cleanPayload.title !== undefined || !current.slug) {
    setField("slug", await ensureUniqueSlug(cleanPayload.title || current.title, id));
  }

  if (cleanPayload.title !== undefined) setField("title", cleanPayload.title);
  if (cleanPayload.industry !== undefined) setField("industry", cleanPayload.industry);
  if (cleanPayload.description !== undefined) setField("description", cleanPayload.description);
  if (cleanPayload.features !== undefined) {
    setField("features", JSON.stringify(normalizeFeaturesInput(cleanPayload.features)));
  }
  if (cleanPayload.sort_order !== undefined) setField("sort_order", Number(cleanPayload.sort_order) || 0);

  if (cleanPayload.equipment !== undefined) {
    setField("equipment", JSON.stringify(normalizeFeaturesInput(cleanPayload.equipment)));
  }

  [
    "location",
    "client_name",
    "customer_requirement",
    "problem",
    "solution",
    "capacity",
    "scope_engineering",
    "scope_fabrication",
    "scope_installation",
    "scope_commissioning",
    "result",
    "related_service_slug",
    "meta_title",
    "meta_description",
  ].forEach((column) => {
    if (cleanPayload[column] !== undefined) {
      setField(column, toNullableText(cleanPayload[column]));
    }
  });

  if (cleanPayload.show_client_name !== undefined) {
    setField("show_client_name", toFlag(cleanPayload.show_client_name, 0));
  }
  if (cleanPayload.is_published !== undefined) {
    setField("is_published", toFlag(cleanPayload.is_published, 1));
  }
  if (cleanPayload.industry_id !== undefined) {
    setField("industry_id", toNullableId(cleanPayload.industry_id));
  }
  if (cleanPayload.completed_on !== undefined) {
    setField("completed_on", toNullableDate(cleanPayload.completed_on));
  }

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

/**
 * Append one image to a case-study gallery. sort_order is assigned as
 * "next after the last one", so the gallery renders in upload order.
 */
const addProjectImage = async (projectId, file, caption) => {
  await getRawImageKey(projectId); // asserts the project exists

  const imageKey = keyFromFile(STORAGE_FOLDER, file);
  if (!imageKey) {
    throw new AppError("Image file is required", 400);
  }

  const orderRows = await query(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM project_images WHERE project_id = ?",
    [projectId]
  );

  const result = await query(
    "INSERT INTO project_images (project_id, image_key, caption, sort_order) VALUES (?, ?, ?, ?)",
    [
      projectId,
      imageKey,
      toNullableText(typeof caption === "string" ? caption.trim() : caption),
      Number(orderRows[0]?.next_order) || 0,
    ]
  );

  const rows = await query(
    "SELECT id, image_key, caption, sort_order FROM project_images WHERE id = ?",
    [result.insertId]
  );

  return mapProjectImage(rows[0]);
};

const deleteProjectImage = async (projectId, imageId) => {
  // Scoped by project_id as well as id: an image can only be deleted through
  // the project it belongs to.
  const rows = await query(
    "SELECT id, image_key FROM project_images WHERE id = ? AND project_id = ?",
    [imageId, projectId]
  );

  if (!rows.length) {
    throw new AppError("Project image not found", 404);
  }

  await query("DELETE FROM project_images WHERE id = ?", [rows[0].id]);

  // Best effort: the row is already gone, so a storage hiccup must not turn a
  // successful delete into a 500. Worst case the object is orphaned.
  try {
    await deleteAsset(rows[0].image_key);
  } catch (error) {
    console.error("Failed to delete project image asset:", error.message);
  }
};

const deleteProject = async (id) => {
  const oldImageKey = await getRawImageKey(id); // also asserts existence

  // Read the gallery keys BEFORE the delete: project_images rows go away with
  // the project (ON DELETE CASCADE), but the stored objects do not.
  const galleryRows = await query(
    "SELECT image_key FROM project_images WHERE project_id = ?",
    [id]
  );

  await query("DELETE FROM projects WHERE id = ?", [id]);

  if (oldImageKey) {
    try {
      await deleteAsset(oldImageKey);
    } catch (error) {
      console.error("Failed to delete project cover image:", error.message);
    }
  }

  for (const row of galleryRows) {
    try {
      await deleteAsset(row.image_key);
    } catch (error) {
      console.error("Failed to delete project gallery image:", error.message);
    }
  }
};

module.exports = {
  getProjects,
  getProjectById,
  getProjectByIdOrSlug,
  createProject,
  updateProject,
  deleteProject,
  addProjectImage,
  deleteProjectImage,
};
