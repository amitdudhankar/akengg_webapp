const AppError = require("../utils/appError");
const { isValidGstin } = require("../utils/gstin");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const validateUpdate = (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      throw new AppError("Request body must be a valid object", 400);
    }

    const { gstin, email } = req.body;

    if (gstin !== undefined && gstin !== null && gstin !== "") {
      const normalized = String(gstin).trim().toUpperCase();
      if (normalized.length !== 15) {
        throw new AppError("GSTIN must be exactly 15 characters", 400);
      }
      if (!isValidGstin(normalized)) {
        throw new AppError(
          "GSTIN is invalid (format or checksum check failed)",
          400
        );
      }
    }

    if (email !== undefined && email !== null && email !== "") {
      const normalized = String(email).trim().toLowerCase();
      if (normalized.length > 150 || !EMAIL_REGEX.test(normalized)) {
        throw new AppError("Email must be a valid email address", 400);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateUpdate,
};
