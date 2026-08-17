const AppError = require("../utils/appError");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const validateUpdateSettings = (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      throw new AppError("Request body must be a valid object", 400);
    }

    const { company_email: companyEmail } = req.body;

    if (companyEmail !== undefined && companyEmail !== null && companyEmail !== "") {
      const normalized = String(companyEmail).trim().toLowerCase();
      if (normalized.length > 150 || !EMAIL_REGEX.test(normalized)) {
        throw new AppError("Company email must be a valid email address", 400);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateUpdateSettings,
};
