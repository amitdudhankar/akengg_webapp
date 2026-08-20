const AppError = require("../utils/appError");

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : value;

// Everything an industry page accepts. Anything else is a 400 rather than a
// silently ignored field — a typo in the admin form should be loud.
const ALLOWED_FIELDS = [
  "name",
  "slug",
  "meta_title",
  "meta_description",
  "hero_heading",
  "hero_subheading",
  "overview",
  "challenges",
  "solutions",
  "applications",
  "related_products",
  "sort_order",
  "is_published",
];

// The list-ish columns. Each is accepted as a real array, a JSON string, or
// newline/comma separated text typed into a textarea — the service normalises
// all three shapes.
const LIST_FIELDS = [
  "overview",
  "challenges",
  "solutions",
  "applications",
  "related_products",
];

const SLUG_PATTERN = /^[a-z0-9-]+$/;

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

const validateSlug = (value) => {
  const slug = normalizeString(value);
  if (slug === undefined || slug === "") {
    return;
  }
  if (typeof slug !== "string" || slug.length < 2 || slug.length > 120) {
    throw new AppError("Slug must be between 2 and 120 characters", 400);
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw new AppError("Slug may contain only lowercase letters, numbers and hyphens", 400);
  }
};

// A textarea posts a string; an axios JSON client may post a real array. Both
// are fine — anything else is not.
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

// Multipart form-data has no booleans, so 0/1/"0"/"1"/true/false all arrive as
// text. Accept them all and hand the service a clean 0 or 1.
const normalizePublishedFlag = (body) => {
  if (body.is_published === undefined || body.is_published === "") {
    return;
  }

  const raw = body.is_published;
  const value = typeof raw === "boolean" ? String(raw) : String(raw).trim().toLowerCase();

  if (!["0", "1", "true", "false"].includes(value)) {
    throw new AppError("Published must be 0 or 1", 400);
  }

  body.is_published = value === "1" || value === "true" ? 1 : 0;
};

const validateIndustryId = (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Industry id must be a positive integer", 400);
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Public detail route: accepts either a numeric id or a slug ("pharmaceutical").
const validateIndustryIdOrSlug = (req, res, next) => {
  try {
    const identifier = String(req.params.idOrSlug || "").trim();
    const isNumericId = /^[0-9]+$/.test(identifier);

    if (isNumericId) {
      const id = Number(identifier);
      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError("Industry id must be a positive integer", 400);
      }
    } else if (!SLUG_PATTERN.test(identifier) || identifier.length > 120) {
      throw new AppError("Industry identifier must be a valid id or slug", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateIndustryPayload = (req, isCreate) => {
  if (!isPlainObject(req.body)) {
    throw new AppError("Request body must be a valid form payload", 400);
  }

  assertAllowedFields(req.body);

  validateText(req.body.name, "Name", { required: isCreate, min: 2, max: 120 });
  validateSlug(req.body.slug);
  validateText(req.body.meta_title, "Meta title", { required: false, min: 1, max: 200 });
  validateText(req.body.meta_description, "Meta description", {
    required: false,
    min: 1,
    max: 300,
  });
  validateText(req.body.hero_heading, "Hero heading", { required: false, min: 1, max: 200 });
  validateText(req.body.hero_subheading, "Hero subheading", {
    required: false,
    min: 1,
    max: 500,
  });

  LIST_FIELDS.forEach((field) => validateListField(req.body[field], field));

  validateSortOrder(req.body.sort_order);
  normalizePublishedFlag(req.body);
};

const validateCreateIndustry = (req, res, next) => {
  try {
    validateIndustryPayload(req, true);
    next();
  } catch (error) {
    next(error);
  }
};

const validateUpdateIndustry = (req, res, next) => {
  try {
    validateIndustryPayload(req, false);

    if (Object.keys(req.body).length === 0 && !req.file) {
      throw new AppError("At least one field or image is required to update the industry", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateIndustryId,
  validateIndustryIdOrSlug,
  validateCreateIndustry,
  validateUpdateIndustry,
};
