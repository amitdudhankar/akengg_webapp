const AppError = require("../utils/appError");

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : value;

const validateName = (value, required) => {
  const normalized = normalizeString(value);
  if ((normalized === undefined || normalized === "") && required) {
    throw new AppError("Name is required", 400);
  }
  if (normalized === undefined || normalized === "") {
    return;
  }
  if (typeof normalized !== "string" || normalized.length < 2 || normalized.length > 120) {
    throw new AppError("Name must be between 2 and 120 characters", 400);
  }
};

const validateCount = (value) => {
  if (value === undefined) {
    return;
  }
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0) {
    throw new AppError("Count must be a non-negative integer", 400);
  }
};

const validateIndustryStatId = (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Industry stat id must be a positive integer", 400);
    }
    next();
  } catch (error) {
    next(error);
  }
};

const validateCreateIndustryStat = (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      throw new AppError("Request body must be a valid object", 400);
    }
    validateName(req.body.name, true);
    validateCount(req.body.count);
    next();
  } catch (error) {
    next(error);
  }
};

const validateUpdateIndustryStat = (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      throw new AppError("Request body must be a valid object", 400);
    }
    validateName(req.body.name, false);
    validateCount(req.body.count);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateIndustryStatId,
  validateCreateIndustryStat,
  validateUpdateIndustryStat,
};
