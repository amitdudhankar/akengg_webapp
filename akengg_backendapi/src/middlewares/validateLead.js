// src/middlewares/validateLead.js
// Request validation for the lead pipeline. Mirrors validateContact.js /
// validateDocument.js style: each guard throws AppError(msg, 400) and the
// exported middleware forwards it via next(error); success calls next().
const AppError = require("../utils/appError");
const leadOptions = require("../config/leadOptions");

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TECHNICAL_DETAILS_KEY_REGEX = /^[a-z0-9_]{1,60}$/;
const TECHNICAL_DETAILS_MAX_KEYS = 40;
const TECHNICAL_DETAILS_MAX_VALUE_LENGTH = 500;
const TECHNICAL_DETAILS_MAX_SERIALIZED_LENGTH = 8192;

const FOLLOWUP_ACTIONS = ["COMPLETE", "MISS", "CANCEL", "RESCHEDULE"];
const FOLLOWUP_DUE_OPTIONS = ["today", "tomorrow", "overdue", "upcoming"];

const PUBLIC_CREATE_FIELDS = [
  "contact_person",
  "company_name",
  "designation",
  "phone",
  "email",
  "industry",
  "city",
  "state",
  "plant_location",
  "product",
  "requirement",
  "technical_details",
  "source",
  "medium",
  "campaign",
  "utm_term",
  "utm_content",
  "landing_page",
  "referrer",
  "website",
];

const UPDATE_LEAD_FIELDS = [
  "contact_person",
  "company_name",
  "designation",
  "phone",
  "email",
  "industry",
  "city",
  "state",
  "plant_location",
  "product",
  "requirement",
  "technical_details",
  "source",
  "medium",
  "campaign",
  "priority",
  "assigned_to",
  "estimated_value",
  "quotation_value",
  "next_followup_date",
];

const STATUS_CHANGE_FIELDS = ["status", "lost_reason", "lost_note", "notes"];
const CREATE_NOTE_FIELDS = ["note"];
const CREATE_FOLLOWUP_FIELDS = ["followup_date", "followup_time", "type", "notes"];
const FOLLOWUP_ACTION_FIELDS = ["action", "followup_date", "followup_time", "notes"];
const CONVERT_TO_PARTY_FIELDS = ["party_id"];
const CONVERT_CONTACT_FIELDS = [
  "industry",
  "product",
  "company_name",
  "designation",
  "city",
  "state",
  "plant_location",
];

// ── shared primitives (same shape as validateContact.js) ───────────────────
const isPlainObject = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const normalizeString = (value) => {
  return typeof value === "string" ? value.trim() : value;
};

const validateBody = (body) => {
  if (!isPlainObject(body)) {
    throw new AppError("Request body must be a valid JSON object", 400);
  }
};

const validateAllowedFields = (payload, allowedFields) => {
  const keys = Object.keys(payload);
  const invalidField = keys.find((key) => !allowedFields.includes(key));

  if (invalidField) {
    throw new AppError(`Field '${invalidField}' is not allowed`, 400);
  }

  return keys;
};

// ── field-level validators ──────────────────────────────────────────────
const validateOptionalText = (value, label, max) => {
  const normalized = normalizeString(value);

  if (normalized === undefined || normalized === "") {
    return;
  }

  if (typeof normalized !== "string" || normalized.length > max) {
    throw new AppError(`${label} must be at most ${max} characters`, 400);
  }
};

const validateContactPerson = (value, isRequired = false) => {
  const normalized = normalizeString(value);

  if (!normalized && isRequired) {
    throw new AppError("Contact person is required", 400);
  }

  if (normalized === undefined || normalized === "") {
    return;
  }

  if (typeof normalized !== "string" || normalized.length < 2 || normalized.length > 100) {
    throw new AppError("Contact person must be between 2 and 100 characters", 400);
  }
};

const validatePhone = (value, isRequired = false) => {
  const normalized = normalizeString(value);

  if (!normalized && isRequired) {
    throw new AppError("Phone is required", 400);
  }

  if (normalized === undefined || normalized === "") {
    return;
  }

  if (typeof normalized !== "string") {
    throw new AppError("Phone must be 10 to 15 digits", 400);
  }

  // A leading + on the raw input is harmless: \D strips it along with any
  // spaces/hyphens/parentheses before the digit-count check runs.
  const digitsOnly = normalized.replace(/\D/g, "");

  if (!/^[0-9]{10,15}$/.test(digitsOnly)) {
    throw new AppError("Phone must be 10 to 15 digits", 400);
  }
};

const validateEmail = (value, isRequired = false) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : value;

  if (!normalized && isRequired) {
    throw new AppError("A valid email is required", 400);
  }

  if (normalized === undefined || normalized === "") {
    return;
  }

  if (typeof normalized !== "string" || normalized.length > 150 || !EMAIL_REGEX.test(normalized)) {
    throw new AppError("Email must be valid and at most 150 characters", 400);
  }
};

const validateIndustry = (value, isRequired = false) => {
  const normalized = normalizeString(value);

  if (!normalized && isRequired) {
    throw new AppError("Industry is required", 400);
  }

  if (normalized === undefined || normalized === "") {
    return;
  }

  if (!leadOptions.INDUSTRIES.includes(normalized)) {
    throw new AppError(`Industry must be one of: ${leadOptions.INDUSTRIES.join(", ")}`, 400);
  }
};

const validateProduct = (value, isRequired = false) => {
  const normalized = normalizeString(value);

  if (!normalized && isRequired) {
    throw new AppError("Product is required", 400);
  }

  if (normalized === undefined || normalized === "") {
    return;
  }

  if (!leadOptions.PRODUCTS.includes(normalized)) {
    throw new AppError(`Product must be one of: ${leadOptions.PRODUCTS.join(", ")}`, 400);
  }
};

const validateRequirement = (value) => {
  const normalized = normalizeString(value);

  if (normalized === undefined || normalized === "") {
    return;
  }

  if (typeof normalized !== "string" || normalized.length < 5 || normalized.length > 5000) {
    throw new AppError("Requirement must be between 5 and 5000 characters", 400);
  }
};

const validatePriority = (value) => {
  const normalized = normalizeString(value);

  if (normalized === undefined || normalized === "") {
    return;
  }

  if (typeof normalized !== "string" || !leadOptions.PRIORITIES.includes(normalized)) {
    throw new AppError(`Priority must be one of: ${leadOptions.PRIORITIES.join(", ")}`, 400);
  }
};

const validateAssignedTo = (value) => {
  if (value === undefined || value === null) {
    return;
  }

  const assignedTo = Number(value);

  if (!Number.isInteger(assignedTo) || assignedTo <= 0) {
    throw new AppError("assigned_to must be a positive integer or null", 400);
  }
};

const validateNonNegativeAmount = (value, label) => {
  if (value === undefined || value === null) {
    return;
  }

  const amount = Number(value);

  if (value === "" || !Number.isFinite(amount) || amount < 0) {
    throw new AppError(`${label} must be a non-negative number or null`, 400);
  }
};

const validateDateOrNull = (value, label) => {
  if (value === undefined || value === null) {
    return;
  }

  if (typeof value !== "string" || !DATE_REGEX.test(value)) {
    throw new AppError(`${label} must be a date in YYYY-MM-DD format or null`, 400);
  }
};

const validateRequiredDate = (value, label) => {
  if (typeof value !== "string" || !DATE_REGEX.test(value)) {
    throw new AppError(`${label} is required and must be in YYYY-MM-DD format`, 400);
  }
};

const validateOptionalTime = (value, label) => {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "string" || !TIME_REGEX.test(value)) {
    throw new AppError(`${label} must be in HH:MM format`, 400);
  }
};

const validatePageParam = (value) => {
  if (value === undefined) {
    return;
  }

  const page = Number(value);

  if (!Number.isInteger(page) || page <= 0) {
    throw new AppError("page must be a positive integer", 400);
  }
};

const validateLimitParam = (value) => {
  if (value === undefined) {
    return;
  }

  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    throw new AppError("limit must be a positive integer up to 100", 400);
  }
};

// technical_details arrives as a JSON string on the public multipart create
// (every scalar field in a multipart body is a string) and, in practice, may
// arrive already parsed on the JSON admin PATCH — both are accepted here.
// Whichever product's field list applies (or the generic bounded-object rule
// when the product has none) is enforced, and the parsed object REPLACES the
// raw value on the body so downstream code never re-parses it.
const parseTechnicalDetailsValue = (raw, product) => {
  let parsed = raw;

  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new AppError("technical_details must be valid JSON", 400);
    }
  }

  if (!isPlainObject(parsed)) {
    throw new AppError("technical_details must be a JSON object", 400);
  }

  const fieldDefs = leadOptions.TECHNICAL_FIELDS[product];

  if (fieldDefs) {
    const allowedKeys = fieldDefs.map((field) => field.key);

    Object.keys(parsed).forEach((key) => {
      if (!allowedKeys.includes(key)) {
        throw new AppError(`technical_details key '${key}' is not valid for product '${product}'`, 400);
      }
    });

    return parsed;
  }

  const keys = Object.keys(parsed);

  if (keys.length > TECHNICAL_DETAILS_MAX_KEYS) {
    throw new AppError(`technical_details may have at most ${TECHNICAL_DETAILS_MAX_KEYS} keys`, 400);
  }

  keys.forEach((key) => {
    if (!TECHNICAL_DETAILS_KEY_REGEX.test(key)) {
      throw new AppError(`technical_details key '${key}' is invalid`, 400);
    }

    const value = parsed[key];

    if (value === null || typeof value === "object") {
      throw new AppError(`technical_details value for '${key}' must be a string, number, or boolean`, 400);
    }

    if (String(value).length > TECHNICAL_DETAILS_MAX_VALUE_LENGTH) {
      throw new AppError(`technical_details value for '${key}' must be at most ${TECHNICAL_DETAILS_MAX_VALUE_LENGTH} characters`, 400);
    }
  });

  if (JSON.stringify(parsed).length > TECHNICAL_DETAILS_MAX_SERIALIZED_LENGTH) {
    throw new AppError(`technical_details must be at most ${TECHNICAL_DETAILS_MAX_SERIALIZED_LENGTH} bytes serialized`, 400);
  }

  return parsed;
};

// ── id param ─────────────────────────────────────────────────────────────
const validateLeadId = (req, res, next) => {
  try {
    const leadId = Number(req.params.id);

    if (!Number.isInteger(leadId) || leadId <= 0) {
      throw new AppError("Invalid lead id", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ── public quote-form create (multipart/form-data + optional files) ────────
const validatePublicCreateLead = (req, res, next) => {
  try {
    validateBody(req.body);
    validateAllowedFields(req.body, PUBLIC_CREATE_FIELDS);

    validateContactPerson(req.body.contact_person, true);
    validatePhone(req.body.phone, true);
    validateProduct(req.body.product, true);

    validateOptionalText(req.body.company_name, "company_name", 200);
    validateOptionalText(req.body.designation, "designation", 100);
    validateEmail(req.body.email);
    validateIndustry(req.body.industry);
    validateOptionalText(req.body.city, "city", 100);
    validateOptionalText(req.body.state, "state", 100);
    validateOptionalText(req.body.plant_location, "plant_location", 200);
    validateRequirement(req.body.requirement);
    validateOptionalText(req.body.source, "source", 100);
    validateOptionalText(req.body.medium, "medium", 100);
    validateOptionalText(req.body.campaign, "campaign", 150);
    validateOptionalText(req.body.utm_term, "utm_term", 150);
    validateOptionalText(req.body.utm_content, "utm_content", 150);
    validateOptionalText(req.body.landing_page, "landing_page", 500);
    validateOptionalText(req.body.referrer, "referrer", 500);
    // Honeypot: no real validation, just a defensive length cap.
    validateOptionalText(req.body.website, "website", 200);

    if (req.body.technical_details !== undefined) {
      req.body.technical_details = parseTechnicalDetailsValue(req.body.technical_details, req.body.product);
    }

    if (typeof req.body.website === "string" && req.body.website.trim() !== "") {
      req.isHoneypotTripped = true;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ── admin partial update (status/lost fields excluded on purpose) ──────────
const validateUpdateLead = (req, res, next) => {
  try {
    validateBody(req.body);

    ["status", "lost_reason", "lost_note"].forEach((key) => {
      if (req.body[key] !== undefined) {
        throw new AppError("Use PATCH /leads/:id/status to change status", 400);
      }
    });

    validateAllowedFields(req.body, UPDATE_LEAD_FIELDS);

    validateContactPerson(req.body.contact_person);
    validateOptionalText(req.body.company_name, "company_name", 200);
    validateOptionalText(req.body.designation, "designation", 100);
    validatePhone(req.body.phone);
    validateEmail(req.body.email);
    validateIndustry(req.body.industry);
    validateOptionalText(req.body.city, "city", 100);
    validateOptionalText(req.body.state, "state", 100);
    validateOptionalText(req.body.plant_location, "plant_location", 200);
    validateProduct(req.body.product);
    validateRequirement(req.body.requirement);
    validateOptionalText(req.body.source, "source", 100);
    validateOptionalText(req.body.medium, "medium", 100);
    validateOptionalText(req.body.campaign, "campaign", 150);
    validatePriority(req.body.priority);
    validateAssignedTo(req.body.assigned_to);
    validateNonNegativeAmount(req.body.estimated_value, "estimated_value");
    validateNonNegativeAmount(req.body.quotation_value, "quotation_value");
    validateDateOrNull(req.body.next_followup_date, "next_followup_date");

    if (req.body.technical_details !== undefined) {
      req.body.technical_details = parseTechnicalDetailsValue(req.body.technical_details, req.body.product);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ── status change (the only path allowed to touch status/lost fields) ──────
const validateStatusChange = (req, res, next) => {
  try {
    validateBody(req.body);
    validateAllowedFields(req.body, STATUS_CHANGE_FIELDS);

    const rawStatus = normalizeString(req.body.status);

    if (typeof rawStatus !== "string" || rawStatus === "") {
      throw new AppError("Status is required", 400);
    }

    const status = rawStatus.toUpperCase();

    if (!leadOptions.LEAD_STATUSES.includes(status)) {
      throw new AppError(`Status must be one of: ${leadOptions.LEAD_STATUSES.join(", ")}`, 400);
    }

    req.body.status = status;

    if (status === "LOST") {
      const rawReason = normalizeString(req.body.lost_reason);

      if (typeof rawReason !== "string" || !leadOptions.LOST_REASONS.includes(rawReason)) {
        throw new AppError(`lost_reason is required and must be one of: ${leadOptions.LOST_REASONS.join(", ")}`, 400);
      }

      req.body.lost_reason = rawReason;
      validateOptionalText(req.body.lost_note, "lost_note", 1000);
    } else {
      if (req.body.lost_reason !== undefined) {
        throw new AppError("lost_reason may only be set when status is 'LOST'", 400);
      }

      if (req.body.lost_note !== undefined) {
        throw new AppError("lost_note may only be set when status is 'LOST'", 400);
      }
    }

    validateOptionalText(req.body.notes, "notes", 1000);

    next();
  } catch (error) {
    next(error);
  }
};

// ── free-text note ──────────────────────────────────────────────────────
const validateCreateNote = (req, res, next) => {
  try {
    validateBody(req.body);
    validateAllowedFields(req.body, CREATE_NOTE_FIELDS);

    const note = normalizeString(req.body.note);

    if (!note) {
      throw new AppError("Note is required", 400);
    }

    if (typeof note !== "string" || note.length < 1 || note.length > 2000) {
      throw new AppError("Note must be between 1 and 2000 characters", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ── follow-up create ─────────────────────────────────────────────────────
const validateCreateFollowup = (req, res, next) => {
  try {
    validateBody(req.body);
    validateAllowedFields(req.body, CREATE_FOLLOWUP_FIELDS);

    validateRequiredDate(req.body.followup_date, "followup_date");
    validateOptionalTime(req.body.followup_time, "followup_time");

    if (req.body.type !== undefined) {
      if (typeof req.body.type !== "string" || !leadOptions.FOLLOWUP_TYPES.includes(req.body.type)) {
        throw new AppError(`type must be one of: ${leadOptions.FOLLOWUP_TYPES.join(", ")}`, 400);
      }
    }

    validateOptionalText(req.body.notes, "notes", 1000);

    next();
  } catch (error) {
    next(error);
  }
};

// ── follow-up action (complete/miss/cancel/reschedule) ─────────────────────
const validateFollowupAction = (req, res, next) => {
  try {
    validateBody(req.body);
    validateAllowedFields(req.body, FOLLOWUP_ACTION_FIELDS);

    const rawAction = normalizeString(req.body.action);

    if (typeof rawAction !== "string" || rawAction === "") {
      throw new AppError("action is required", 400);
    }

    const action = rawAction.toUpperCase();

    if (!FOLLOWUP_ACTIONS.includes(action)) {
      throw new AppError(`action must be one of: ${FOLLOWUP_ACTIONS.join(", ")}`, 400);
    }

    req.body.action = action;

    if (action === "RESCHEDULE") {
      validateRequiredDate(req.body.followup_date, "followup_date");
      validateOptionalTime(req.body.followup_time, "followup_time");
    }

    validateOptionalText(req.body.notes, "notes", 1000);

    next();
  } catch (error) {
    next(error);
  }
};

// ── list / export / stats query filters ─────────────────────────────────
const validateLeadFilters = (req, res, next) => {
  try {
    const { product, industry, source, assigned_to, date_from, date_to, search, page, limit } = req.query;

    if (req.query.status !== undefined) {
      const status = String(req.query.status).trim().toUpperCase();

      if (!leadOptions.LEAD_STATUSES.includes(status)) {
        throw new AppError(`status must be one of: ${leadOptions.LEAD_STATUSES.join(", ")}`, 400);
      }

      req.query.status = status;
    }

    if (product !== undefined && !leadOptions.PRODUCTS.includes(product)) {
      throw new AppError(`product must be one of: ${leadOptions.PRODUCTS.join(", ")}`, 400);
    }

    if (industry !== undefined && !leadOptions.INDUSTRIES.includes(industry)) {
      throw new AppError(`industry must be one of: ${leadOptions.INDUSTRIES.join(", ")}`, 400);
    }

    if (source !== undefined && (typeof source !== "string" || source.length > 100)) {
      throw new AppError("source must be at most 100 characters", 400);
    }

    if (req.query.priority !== undefined) {
      const priority = String(req.query.priority).trim().toUpperCase();

      if (!leadOptions.PRIORITIES.includes(priority)) {
        throw new AppError(`priority must be one of: ${leadOptions.PRIORITIES.join(", ")}`, 400);
      }

      req.query.priority = priority;
    }

    if (assigned_to !== undefined) {
      const assignedTo = Number(assigned_to);

      if (!Number.isInteger(assignedTo) || assignedTo <= 0) {
        throw new AppError("assigned_to must be a positive integer", 400);
      }
    }

    if (date_from !== undefined && !DATE_REGEX.test(date_from)) {
      throw new AppError("date_from must be in YYYY-MM-DD format", 400);
    }

    if (date_to !== undefined && !DATE_REGEX.test(date_to)) {
      throw new AppError("date_to must be in YYYY-MM-DD format", 400);
    }

    if (search !== undefined && (typeof search !== "string" || search.length > 100)) {
      throw new AppError("search must be at most 100 characters", 400);
    }

    validatePageParam(page);
    validateLimitParam(limit);

    next();
  } catch (error) {
    next(error);
  }
};

// ── follow-up list query filters ─────────────────────────────────────────
const validateFollowupFilters = (req, res, next) => {
  try {
    const { due, date_from, date_to, page, limit } = req.query;

    if (due !== undefined && !FOLLOWUP_DUE_OPTIONS.includes(due)) {
      throw new AppError(`due must be one of: ${FOLLOWUP_DUE_OPTIONS.join(", ")}`, 400);
    }

    if (req.query.status !== undefined) {
      const status = String(req.query.status).trim().toUpperCase();

      if (!leadOptions.FOLLOWUP_STATUSES.includes(status)) {
        throw new AppError(`status must be one of: ${leadOptions.FOLLOWUP_STATUSES.join(", ")}`, 400);
      }

      req.query.status = status;
    }

    if (req.query.type !== undefined) {
      const type = String(req.query.type).trim().toUpperCase();

      if (!leadOptions.FOLLOWUP_TYPES.includes(type)) {
        throw new AppError(`type must be one of: ${leadOptions.FOLLOWUP_TYPES.join(", ")}`, 400);
      }

      req.query.type = type;
    }

    if (date_from !== undefined && !DATE_REGEX.test(date_from)) {
      throw new AppError("date_from must be in YYYY-MM-DD format", 400);
    }

    if (date_to !== undefined && !DATE_REGEX.test(date_to)) {
      throw new AppError("date_to must be in YYYY-MM-DD format", 400);
    }

    validatePageParam(page);
    validateLimitParam(limit);

    next();
  } catch (error) {
    next(error);
  }
};

// ── report query filters ─────────────────────────────────────────────────
const validateReportFilters = (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;

    if (date_from !== undefined && !DATE_REGEX.test(date_from)) {
      throw new AppError("date_from must be in YYYY-MM-DD format", 400);
    }

    if (date_to !== undefined && !DATE_REGEX.test(date_to)) {
      throw new AppError("date_to must be in YYYY-MM-DD format", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ── convert-to-party ─────────────────────────────────────────────────────
const validateConvertToParty = (req, res, next) => {
  try {
    const body = req.body === undefined ? {} : req.body;
    validateBody(body);
    validateAllowedFields(body, CONVERT_TO_PARTY_FIELDS);

    if (body.party_id !== undefined && body.party_id !== null) {
      const partyId = Number(body.party_id);

      if (!Number.isInteger(partyId) || partyId <= 0) {
        throw new AppError("party_id must be a positive integer", 400);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ── convert-to-contact overrides ─────────────────────────────────────────
const validateConvertContact = (req, res, next) => {
  try {
    const body = req.body === undefined ? {} : req.body;
    validateBody(body);
    validateAllowedFields(body, CONVERT_CONTACT_FIELDS);

    validateIndustry(body.industry);
    validateProduct(body.product);
    validateOptionalText(body.company_name, "company_name", 200);
    validateOptionalText(body.designation, "designation", 100);
    validateOptionalText(body.city, "city", 100);
    validateOptionalText(body.state, "state", 100);
    validateOptionalText(body.plant_location, "plant_location", 200);

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateLeadId,
  validatePublicCreateLead,
  validateUpdateLead,
  validateStatusChange,
  validateCreateNote,
  validateCreateFollowup,
  validateFollowupAction,
  validateLeadFilters,
  validateFollowupFilters,
  validateReportFilters,
  validateConvertToParty,
  validateConvertContact,
};
