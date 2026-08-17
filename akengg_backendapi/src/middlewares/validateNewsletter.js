const AppError = require("../utils/appError");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const validateSubscribe = (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      throw new AppError("Request body must be a valid object", 400);
    }

    const email =
      typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : req.body.email;

    if (!email) {
      throw new AppError("Email is required", 400);
    }
    if (typeof email !== "string" || email.length > 150 || !EMAIL_REGEX.test(email)) {
      throw new AppError("Email must be valid and at most 150 characters", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateSubscriberId = (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Subscriber id must be a positive integer", 400);
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateSubscribe,
  validateSubscriberId,
};
