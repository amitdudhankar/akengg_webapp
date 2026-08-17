const AppError = require("../utils/appError");

const ALLOWED_KINDS = ["goods", "service"];

const isPlainObject = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const normalizeString = (value) => {
  return typeof value === "string" ? value.trim() : value;
};

// Numeric coercion that rejects empty strings / non-numeric input.
const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }
  return Number(value);
};

const validateName = (value) => {
  const name = normalizeString(value);
  if (!name || typeof name !== "string" || name.length < 2 || name.length > 200) {
    throw new AppError("Name must be between 2 and 200 characters", 400);
  }
};

const validateKind = (value) => {
  if (!ALLOWED_KINDS.includes(value)) {
    throw new AppError("Kind must be one of: goods, service", 400);
  }
};

const validateHsnSac = (value) => {
  const hsnSac = normalizeString(value);
  if (hsnSac === "" || hsnSac === null || hsnSac === undefined) {
    return;
  }
  if (typeof hsnSac !== "string" || hsnSac.length > 8) {
    throw new AppError("HSN/SAC must be at most 8 characters", 400);
  }
};

const validateUqc = (value) => {
  const uqc = normalizeString(value);
  if (uqc === "" || uqc === null || uqc === undefined) {
    return;
  }
  if (typeof uqc !== "string" || uqc.length > 10) {
    throw new AppError("UQC must be at most 10 characters", 400);
  }
};

const validateDefaultRate = (value) => {
  const rate = toFiniteNumber(value);
  if (!Number.isFinite(rate) || rate < 0) {
    throw new AppError("Default rate must be a number greater than or equal to 0", 400);
  }
};

const validateDefaultGstRate = (value) => {
  const gstRate = toFiniteNumber(value);
  if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
    throw new AppError("Default GST rate must be a number between 0 and 100", 400);
  }
};

const validateItemId = (req, res, next) => {
  try {
    const itemId = Number(req.params.id);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new AppError("Item id must be a positive integer", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateItemListQuery = (req, res, next) => {
  try {
    const { page, limit, search, kind, is_active } = req.query;

    if (page !== undefined) {
      const parsedPage = Number(page);
      if (!Number.isInteger(parsedPage) || parsedPage <= 0) {
        throw new AppError("Page must be a positive integer", 400);
      }
    }

    if (limit !== undefined) {
      const parsedLimit = Number(limit);
      // Up to 1000 so the ItemAutocomplete picker can load the full active set
      // for client-side filtering (it requests limit:1000).
      if (!Number.isInteger(parsedLimit) || parsedLimit <= 0 || parsedLimit > 1000) {
        throw new AppError("Limit must be a positive integer up to 1000", 400);
      }
    }

    if (search !== undefined && typeof search !== "string") {
      throw new AppError("Search must be a string", 400);
    }

    if (kind !== undefined && kind !== "" && !ALLOWED_KINDS.includes(kind)) {
      throw new AppError("Kind must be one of: goods, service", 400);
    }

    if (
      is_active !== undefined &&
      is_active !== "" &&
      !["0", "1", "true", "false"].includes(String(is_active))
    ) {
      throw new AppError("is_active must be a boolean value", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateCreateItem = (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      throw new AppError("Request body must be a valid payload", 400);
    }

    validateName(req.body.name);

    if (req.body.kind !== undefined) {
      validateKind(req.body.kind);
    }

    validateHsnSac(req.body.hsn_sac);
    validateUqc(req.body.uqc);

    // default_rate / default_gst_rate fall back to DB defaults when omitted.
    if (req.body.default_rate !== undefined) {
      validateDefaultRate(req.body.default_rate);
    }

    if (req.body.default_gst_rate !== undefined) {
      validateDefaultGstRate(req.body.default_gst_rate);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateUpdateItem = (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      throw new AppError("Request body must be a valid payload", 400);
    }

    const allowedFields = [
      "kind",
      "name",
      "description",
      "hsn_sac",
      "uqc",
      "default_rate",
      "default_gst_rate",
      "is_active",
    ];

    const invalidField = Object.keys(req.body).find((key) => !allowedFields.includes(key));
    if (invalidField) {
      throw new AppError(`Field '${invalidField}' is not allowed`, 400);
    }

    if (Object.keys(req.body).length === 0) {
      throw new AppError("At least one field is required to update the item", 400);
    }

    if (req.body.name !== undefined) {
      validateName(req.body.name);
    }

    if (req.body.kind !== undefined) {
      validateKind(req.body.kind);
    }

    if (req.body.hsn_sac !== undefined) {
      validateHsnSac(req.body.hsn_sac);
    }

    if (req.body.uqc !== undefined) {
      validateUqc(req.body.uqc);
    }

    if (req.body.default_rate !== undefined) {
      validateDefaultRate(req.body.default_rate);
    }

    if (req.body.default_gst_rate !== undefined) {
      validateDefaultGstRate(req.body.default_gst_rate);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateItemId,
  validateItemListQuery,
  validateCreateItem,
  validateUpdateItem,
};
