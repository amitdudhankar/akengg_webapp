const AppError = require("../utils/appError");

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : value;

// Everything a case study accepts. Anything else is a 400 rather than a
// silently ignored field — a typo in the admin form should be loud.
const ALLOWED_FIELDS = [
  // legacy card fields
  "title",
  "industry",
  "description",
  "features",
  "sort_order",
  // case study fields
  "slug",
  "location",
  "client_name",
  "show_client_name",
  "customer_requirement",
  "problem",
  "solution",
  "equipment",
  "capacity",
  "scope_engineering",
  "scope_fabrication",
  "scope_installation",
  "scope_commissioning",
  "result",
  "related_service_slug",
  "industry_id",
  "completed_on",
  "meta_title",
  "meta_description",
  "is_published",
];

// Accepted as a real array, a JSON string, or newline/comma separated text
// typed into a textarea — the service normalises all three shapes.
const LIST_FIELDS = ["features", "equipment"];

// Free-text narrative columns are LONGTEXT in the database; the cap here only
// exists so a runaway paste cannot be used to bloat a row.
const NARRATIVE_MAX = 20000;

const NARRATIVE_FIELDS = [
  ["customer_requirement", "Customer requirement"],
  ["problem", "Problem"],
  ["solution", "Solution"],
  ["scope_engineering", "Engineering scope"],
  ["scope_fabrication", "Fabrication scope"],
  ["scope_installation", "Installation scope"],
  ["scope_commissioning", "Commissioning scope"],
  ["result", "Result"],
];

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const assertAllowedFields = (body) => {
  const invalidField = Object.keys(body).find((key) => !ALLOWED_FIELDS.includes(key));
  if (invalidField) {
    throw new AppError(`Field '${invalidField}' is not allowed`, 400);
  }
};

const validateText = (value, label, { required, min, max }) => {
  const normalized = normalizeString(value);

  if ((normalized === undefined || normalized === "") && required) {
    throw new AppError(`${label} is required`, 400);
  }
  if (normalized === undefined || normalized === "") {
    return;
  }
  if (typeof normalized !== "string" || normalized.length < min || normalized.length > max) {
    throw new AppError(`${label} must be between ${min} and ${max} characters`, 400);
  }
};

const validateSlugField = (value, label, max) => {
  const slug = normalizeString(value);
  if (slug === undefined || slug === "") {
    return;
  }
  if (typeof slug !== "string" || slug.length < 2 || slug.length > max) {
    throw new AppError(`${label} must be between 2 and ${max} characters`, 400);
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw new AppError(`${label} may contain only lowercase letters, numbers and hyphens`, 400);
  }
};

const validateListField = (value, label) => {
  if (value === undefined || value === null || value === "") {
    return;
  }
  if (Array.isArray(value)) {
    if (value.some((item) => typeof item === "object" && item !== null)) {
      throw new AppError(`${label} must be a list of plain text items`, 400);
    }
    return;
  }
  if (typeof value !== "string") {
    throw new AppError(`${label} must be an array or newline separated text`, 400);
  }
};

const validateSortOrder = (value) => {
  if (value === undefined || value === "") {
    return;
  }
  const sortOrder = Number(value);
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new AppError("Sort order must be a non-negative integer", 400);
  }
};

// Empty means "not linked to an industry page"; anything else must be a real id.
const validateIndustryId = (value) => {
  if (value === undefined || value === null || value === "") {
    return;
  }
  const industryId = Number(value);
  if (!Number.isInteger(industryId) || industryId <= 0) {
    throw new AppError("Industry id must be a positive integer", 400);
  }
};

const validateCompletedOn = (value) => {
  const completedOn = normalizeString(value);
  if (completedOn === undefined || completedOn === "") {
    return;
  }
  if (typeof completedOn !== "string" || !DATE_PATTERN.test(completedOn)) {
    throw new AppError("Completed on must be a date in YYYY-MM-DD format", 400);
  }
  if (Number.isNaN(Date.parse(completedOn))) {
    throw new AppError("Completed on is not a valid date", 400);
  }
};

// Multipart form-data has no booleans, so 0/1/"0"/"1"/true/false all arrive as
// text. Accept them all and hand the service a clean 0 or 1.
const normalizeFlag = (body, field, label) => {
  if (body[field] === undefined || body[field] === "") {
    return;
  }

  const raw = body[field];
  const value = typeof raw === "boolean" ? String(raw) : String(raw).trim().toLowerCase();

  if (!["0", "1", "true", "false"].includes(value)) {
    throw new AppError(`${label} must be 0 or 1`, 400);
  }

  body[field] = value === "1" || value === "true" ? 1 : 0;
};

const validateProjectId = (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Project id must be a positive integer", 400);
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Public detail route: accepts either a numeric id (legacy /projects/12 URLs)
// or a slug ("boiler-house-upgrade").
const validateProjectIdOrSlug = (req, res, next) => {
  try {
    const identifier = String(req.params.idOrSlug || "").trim();
    const isNumericId = /^[0-9]+$/.test(identifier);

    if (isNumericId) {
      const id = Number(identifier);
      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError("Project id must be a positive integer", 400);
      }
    } else if (!SLUG_PATTERN.test(identifier) || identifier.length > 220) {
      throw new AppError("Project identifier must be a valid id or slug", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateProjectImageId = (req, res, next) => {
  try {
    const imageId = Number(req.params.imageId);
    if (!Number.isInteger(imageId) || imageId <= 0) {
      throw new AppError("Project image id must be a positive integer", 400);
    }
    next();
  } catch (error) {
    next(error);
  }
};

const validateProjectPayload = (req, isCreate) => {
  if (!isPlainObject(req.body)) {
    throw new AppError("Request body must be a valid form payload", 400);
  }

  assertAllowedFields(req.body);

  validateText(req.body.title, "Title", { required: isCreate, min: 2, max: 200 });
  validateText(req.body.industry, "Industry", { required: isCreate, min: 2, max: 120 });
  validateText(req.body.description, "Description", { required: isCreate, min: 2, max: 1000 });

  validateSlugField(req.body.slug, "Slug", 220);
  validateSlugField(req.body.related_service_slug, "Related service slug", 120);

  validateText(req.body.location, "Location", { required: false, min: 1, max: 200 });
  validateText(req.body.client_name, "Client name", { required: false, min: 1, max: 200 });
  validateText(req.body.capacity, "Capacity", { required: false, min: 1, max: 200 });
  validateText(req.body.meta_title, "Meta title", { required: false, min: 1, max: 200 });
  validateText(req.body.meta_description, "Meta description", {
    required: false,
    min: 1,
    max: 300,
  });

  NARRATIVE_FIELDS.forEach(([field, label]) => {
    validateText(req.body[field], label, { required: false, min: 1, max: NARRATIVE_MAX });
  });

  LIST_FIELDS.forEach((field) => validateListField(req.body[field], field));

  validateSortOrder(req.body.sort_order);
  validateIndustryId(req.body.industry_id);
  validateCompletedOn(req.body.completed_on);
  normalizeFlag(req.body, "show_client_name", "Show client name");
  normalizeFlag(req.body, "is_published", "Published");
};

const validateCreateProject = (req, res, next) => {
  try {
    validateProjectPayload(req, true);
    next();
  } catch (error) {
    next(error);
  }
};

const validateUpdateProject = (req, res, next) => {
  try {
    validateProjectPayload(req, false);

    if (Object.keys(req.body).length === 0 && !req.file) {
      throw new AppError("At least one field or image is required to update the project", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Gallery upload payload. Runs between upload.single("image") and compress, so
// req.file is the in-memory upload and nothing has been stored yet.
const validateCreateProjectImage = (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      throw new AppError("Request body must be a valid form payload", 400);
    }

    const invalidField = Object.keys(req.body).find((key) => key !== "caption");
    if (invalidField) {
      throw new AppError(`Field '${invalidField}' is not allowed`, 400);
    }

    if (!req.file) {
      throw new AppError("Image file is required", 400);
    }

    validateText(req.body.caption, "Caption", { required: false, min: 1, max: 300 });

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateProjectId,
  validateProjectIdOrSlug,
  validateProjectImageId,
  validateCreateProject,
  validateUpdateProject,
  validateCreateProjectImage,
};
