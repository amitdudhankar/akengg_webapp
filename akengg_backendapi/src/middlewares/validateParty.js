const AppError = require("../utils/appError");
const { isValidGstin } = require("../utils/gstin");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{7,20}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const STATE_CODE_REGEX = /^[0-9]{2}$/;
const PINCODE_REGEX = /^[0-9]{6}$/;

const PARTY_TYPES = ["client", "vendor"];

// Mirrors the writable columns of the `parties` table.
const ALLOWED_FIELDS = [
  "party_type",
  "name",
  "gstin",
  "party_is_registered",
  "pan",
  "email",
  "phone",
  "billing_address_line1",
  "billing_address_line2",
  "billing_city",
  "billing_state",
  "billing_state_code",
  "billing_pincode",
  "billing_country",
  "shipping_address_line1",
  "shipping_address_line2",
  "shipping_city",
  "shipping_state",
  "shipping_state_code",
  "shipping_pincode",
  "shipping_country",
  "is_active",
];

const isPlainObject = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const normalizeString = (value) => {
  return typeof value === "string" ? value.trim() : value;
};

const isEmpty = (value) => {
  return value === undefined || value === null || value === "";
};

const validateBody = (body) => {
  if (!isPlainObject(body)) {
    throw new AppError("Request body must be a valid JSON object", 400);
  }
};

const validateAllowedFields = (payload) => {
  const keys = Object.keys(payload);
  const invalidField = keys.find((key) => !ALLOWED_FIELDS.includes(key));

  if (invalidField) {
    throw new AppError(`Field '${invalidField}' is not allowed`, 400);
  }

  return keys;
};

const validateName = (name, isRequired = false) => {
  const normalized = normalizeString(name);

  if (isEmpty(normalized)) {
    if (isRequired) {
      throw new AppError("Name is required", 400);
    }
    return;
  }

  if (typeof normalized !== "string" || normalized.length < 2 || normalized.length > 150) {
    throw new AppError("Name must be between 2 and 150 characters", 400);
  }
};

const validatePartyType = (type, isRequired = false) => {
  const normalized =
    typeof type === "string" ? type.trim().toLowerCase() : type;

  if (isEmpty(normalized)) {
    if (isRequired) {
      throw new AppError("Party type is required", 400);
    }
    return;
  }

  if (typeof normalized !== "string" || !PARTY_TYPES.includes(normalized)) {
    throw new AppError("Party type must be either 'client' or 'vendor'", 400);
  }
};

const validateGstin = (gstin) => {
  const normalized =
    typeof gstin === "string" ? gstin.trim().toUpperCase() : gstin;

  if (isEmpty(normalized)) {
    return;
  }

  if (typeof normalized !== "string" || normalized.length !== 15) {
    throw new AppError("GSTIN must be exactly 15 characters", 400);
  }

  if (!isValidGstin(normalized)) {
    throw new AppError(
      "GSTIN is invalid (format or checksum check failed)",
      400
    );
  }
};

const validatePan = (pan) => {
  const normalized = typeof pan === "string" ? pan.trim().toUpperCase() : pan;

  if (isEmpty(normalized)) {
    return;
  }

  if (typeof normalized !== "string" || normalized.length !== 10 || !PAN_REGEX.test(normalized)) {
    throw new AppError("PAN must be a valid 10-character PAN", 400);
  }
};

const validateEmail = (email) => {
  const normalized =
    typeof email === "string" ? email.trim().toLowerCase() : email;

  if (isEmpty(normalized)) {
    return;
  }

  if (typeof normalized !== "string" || normalized.length > 150 || !EMAIL_REGEX.test(normalized)) {
    throw new AppError("Email must be valid and at most 150 characters", 400);
  }
};

const validatePhone = (phone) => {
  const normalized = normalizeString(phone);

  if (isEmpty(normalized)) {
    return;
  }

  if (typeof normalized !== "string" || normalized.length > 20 || !PHONE_REGEX.test(normalized)) {
    throw new AppError("Phone must be 7 to 20 digits and may start with +", 400);
  }
};

const validateStateCode = (value, label) => {
  const normalized = normalizeString(value);

  if (isEmpty(normalized)) {
    return;
  }

  if (typeof normalized !== "string" || normalized.length !== 2 || !STATE_CODE_REGEX.test(normalized)) {
    throw new AppError(`${label} must be a 2-digit GST state code`, 400);
  }
};

const validatePincode = (value, label) => {
  const normalized = normalizeString(value);

  if (isEmpty(normalized)) {
    return;
  }

  if (typeof normalized !== "string" || !PINCODE_REGEX.test(normalized)) {
    throw new AppError(`${label} must be a 6-digit pincode`, 400);
  }
};

const validateOptionalText = (value, label, max) => {
  const normalized = normalizeString(value);

  if (isEmpty(normalized)) {
    return;
  }

  if (typeof normalized !== "string" || normalized.length > max) {
    throw new AppError(`${label} must be at most ${max} characters`, 400);
  }
};

const validateBoolean = (value, label) => {
  if (value === undefined) {
    return;
  }

  const allowed = [true, false, 0, 1, "0", "1", "true", "false"];
  if (!allowed.includes(value)) {
    throw new AppError(`${label} must be a boolean value`, 400);
  }
};

// Shared field-level checks reused by create and update.
const validateCommonFields = (body) => {
  validatePartyType(body.party_type);
  validateGstin(body.gstin);
  validatePan(body.pan);
  validateEmail(body.email);
  validatePhone(body.phone);
  validateBoolean(body.party_is_registered, "Registered flag");
  validateBoolean(body.is_active, "Active flag");

  validateOptionalText(body.billing_address_line1, "Billing address line 1", 255);
  validateOptionalText(body.billing_address_line2, "Billing address line 2", 255);
  validateOptionalText(body.billing_city, "Billing city", 100);
  validateOptionalText(body.billing_state, "Billing state", 100);
  validateStateCode(body.billing_state_code, "Billing state code");
  validatePincode(body.billing_pincode, "Billing pincode");
  validateOptionalText(body.billing_country, "Billing country", 100);

  validateOptionalText(body.shipping_address_line1, "Shipping address line 1", 255);
  validateOptionalText(body.shipping_address_line2, "Shipping address line 2", 255);
  validateOptionalText(body.shipping_city, "Shipping city", 100);
  validateOptionalText(body.shipping_state, "Shipping state", 100);
  validateStateCode(body.shipping_state_code, "Shipping state code");
  validatePincode(body.shipping_pincode, "Shipping pincode");
  validateOptionalText(body.shipping_country, "Shipping country", 100);
};

const validatePartyId = (req, res, next) => {
  try {
    const partyId = Number(req.params.id);

    if (!Number.isInteger(partyId) || partyId <= 0) {
      throw new AppError("Party id must be a positive integer", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validatePartyListQuery = (req, res, next) => {
  try {
    const { page, limit, search, type, is_active } = req.query;

    if (page !== undefined) {
      const parsedPage = Number(page);
      if (!Number.isInteger(parsedPage) || parsedPage <= 0) {
        throw new AppError("Page must be a positive integer", 400);
      }
    }

    if (limit !== undefined) {
      const parsedLimit = Number(limit);
      // Up to 1000 so the PartyPicker can load the full active set for
      // client-side filtering (it requests limit:1000).
      if (!Number.isInteger(parsedLimit) || parsedLimit <= 0 || parsedLimit > 1000) {
        throw new AppError("Limit must be a positive integer up to 1000", 400);
      }
    }

    if (search !== undefined && typeof search !== "string") {
      throw new AppError("Search must be a string", 400);
    }

    if (type !== undefined && type !== "") {
      validatePartyType(type);
    }

    if (is_active !== undefined && is_active !== "") {
      validateBoolean(is_active, "Active filter");
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateCreateParty = (req, res, next) => {
  try {
    validateBody(req.body);
    validateAllowedFields(req.body);

    validateName(req.body.name, true);
    validatePartyType(req.body.party_type);
    validateCommonFields(req.body);

    next();
  } catch (error) {
    next(error);
  }
};

const validateUpdateParty = (req, res, next) => {
  try {
    validateBody(req.body);
    const keys = validateAllowedFields(req.body);

    if (keys.length === 0) {
      throw new AppError("At least one field is required to update the party", 400);
    }

    validateName(req.body.name);
    validateCommonFields(req.body);

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validatePartyId,
  validatePartyListQuery,
  validateCreateParty,
  validateUpdateParty,
};
