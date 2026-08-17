const AppError = require("../utils/appError");

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : value;

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

const validateCreateProject = (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      throw new AppError("Request body must be a valid object", 400);
    }
    validateText(req.body.title, "Title", { required: true, min: 2, max: 200 });
    validateText(req.body.industry, "Industry", { required: true, min: 2, max: 120 });
    validateText(req.body.description, "Description", { required: true, min: 2, max: 1000 });
    next();
  } catch (error) {
    next(error);
  }
};

const validateUpdateProject = (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      throw new AppError("Request body must be a valid object", 400);
    }
    validateText(req.body.title, "Title", { required: false, min: 2, max: 200 });
    validateText(req.body.industry, "Industry", { required: false, min: 2, max: 120 });
    validateText(req.body.description, "Description", { required: false, min: 2, max: 1000 });
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateProjectId,
  validateCreateProject,
  validateUpdateProject,
};
