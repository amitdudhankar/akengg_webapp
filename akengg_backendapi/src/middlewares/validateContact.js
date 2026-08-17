const AppError = require("../utils/appError");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const PUBLIC_FIELDS = ["name", "number", "email", "message", "service", "source"];
const ADMIN_FIELDS = ["name", "number", "email", "message", "service", "source", "status"];
const ALLOWED_STATUS = ["new", "contacted", "closed"];

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

const validateName = (name, isRequired = false) => {
  const normalizedName = normalizeString(name);

  if (!normalizedName && isRequired) {
    throw new AppError("Name is required", 400);
  }

  if (normalizedName === undefined) {
    return;
  }

  if (typeof normalizedName !== "string" || normalizedName.length < 2 || normalizedName.length > 100) {
    throw new AppError("Name must be between 2 and 100 characters", 400);
  }
};

const validateNumber = (number, isRequired = false) => {
  const normalizedNumber = normalizeString(number);

  if (!normalizedNumber && isRequired) {
    throw new AppError("Number is required", 400);
  }

  if (normalizedNumber === undefined) {
    return;
  }

  if (typeof normalizedNumber !== "string" || !PHONE_REGEX.test(normalizedNumber)) {
    throw new AppError("Number must be 10 to 15 digits and may start with +", 400);
  }
};

const validateEmail = (email, isRequired = false) => {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : email;

  if (!normalizedEmail && isRequired) {
    throw new AppError("A valid email is required", 400);
  }

  if (normalizedEmail === undefined) {
    return;
  }

  if (typeof normalizedEmail !== "string" || normalizedEmail.length > 150 || !EMAIL_REGEX.test(normalizedEmail)) {
    throw new AppError("Email must be valid and at most 150 characters", 400);
  }
};

const validateMessage = (message, isRequired = false) => {
  const normalizedMessage = normalizeString(message);

  if (!normalizedMessage && isRequired) {
    throw new AppError("Message is required", 400);
  }

  if (normalizedMessage === undefined) {
    return;
  }

  if (typeof normalizedMessage !== "string" || normalizedMessage.length < 10 || normalizedMessage.length > 2000) {
    throw new AppError("Message must be between 10 and 2000 characters", 400);
  }
};

const validateOptionalText = (value, label, max) => {
  const normalized = normalizeString(value);

  if (normalized === undefined || normalized === "") {
    return;
  }

  if (typeof normalized !== "string" || normalized.length > max) {
    throw new AppError(`${label} must be at most ${max} characters`, 400);
  }
};

const validateStatus = (status) => {
  const normalizedStatus = typeof status === "string" ? status.trim().toLowerCase() : status;

  if (normalizedStatus === undefined) {
    return;
  }

  if (typeof normalizedStatus !== "string" || !ALLOWED_STATUS.includes(normalizedStatus)) {
    throw new AppError("Status must be one of 'new', 'contacted', or 'closed'", 400);
  }
};

const validateContactId = (req, res, next) => {
  try {
    const contactId = Number(req.params.id);

    if (!Number.isInteger(contactId) || contactId <= 0) {
      throw new AppError("Contact id must be a positive integer", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateCreateContact = (req, res, next) => {
  try {
    validateBody(req.body);
    validateAllowedFields(req.body, PUBLIC_FIELDS);

    validateName(req.body.name, true);
    validateNumber(req.body.number, true);
    validateEmail(req.body.email, true);
    validateMessage(req.body.message, true);
    validateOptionalText(req.body.service, "Service", 120);
    validateOptionalText(req.body.source, "Source", 50);

    next();
  } catch (error) {
    next(error);
  }
};

const validateUpdateContact = (req, res, next) => {
  try {
    validateBody(req.body);
    const keys = validateAllowedFields(req.body, ADMIN_FIELDS);

    if (keys.length === 0) {
      throw new AppError("At least one field is required to update the contact", 400);
    }

    validateName(req.body.name);
    validateNumber(req.body.number);
    validateEmail(req.body.email);
    validateMessage(req.body.message);
    validateOptionalText(req.body.service, "Service", 120);
    validateOptionalText(req.body.source, "Source", 50);
    validateStatus(req.body.status);

    next();
  } catch (error) {
    next(error);
  }
};

const validateContactFilters = (req, res, next) => {
  try {
    const { status } = req.query;

    if (status !== undefined) {
      validateStatus(status);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateContactId,
  validateCreateContact,
  validateUpdateContact,
  validateContactFilters,
};
