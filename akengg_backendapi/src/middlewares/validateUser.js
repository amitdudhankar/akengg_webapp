const AppError = require("../utils/appError");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const ALLOWED_FIELDS = ["name", "email", "password", "phone", "role"];
const ALLOWED_ROLES = ["admin", "employee"];

const isPlainObject = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const normalizeString = (value) => {
  return typeof value === "string" ? value.trim() : value;
};

const validateRequestBody = (body) => {
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

const validatePassword = (password, isRequired = false) => {
  const normalizedPassword = normalizeString(password);

  if (!normalizedPassword && isRequired) {
    throw new AppError("Password is required", 400);
  }

  if (normalizedPassword === undefined) {
    return;
  }

  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;

  if (typeof normalizedPassword !== "string" || !strongPassword.test(normalizedPassword)) {
    throw new AppError(
      "Password must be 8 to 64 characters and include uppercase, lowercase, and a number",
      400
    );
  }
};

// ── Forgot-password flow ───────────────────────────────────────────────────
// Syntactic checks only. Whether the address has an account, whether the code
// is right, and whether the token is valid are decided in
// passwordReset.service — deliberately, so this layer cannot leak which of
// those failed.

const validateForgotPasswordRequest = (req, res, next) => {
  try {
    validateRequestBody(req.body);
    validateEmail(req.body.email, true);
    next();
  } catch (error) {
    next(error);
  }
};

const validateVerifyOtp = (req, res, next) => {
  try {
    validateRequestBody(req.body);
    validateEmail(req.body.email, true);

    const otp = normalizeString(req.body.otp);
    if (!otp || typeof otp !== "string" || !/^[0-9]{4,8}$/.test(otp)) {
      throw new AppError("A valid OTP is required", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateResetPassword = (req, res, next) => {
  try {
    validateRequestBody(req.body);

    const token = normalizeString(req.body.token);
    if (!token || typeof token !== "string") {
      throw new AppError(
        "A verified reset token is required. Start the reset again.",
        401
      );
    }

    validatePassword(req.body.newPassword, true);

    next();
  } catch (error) {
    next(error);
  }
};

const validatePhone = (phone) => {
  const normalizedPhone = normalizeString(phone);

  if (normalizedPhone === undefined) {
    return;
  }

  if (typeof normalizedPhone !== "string" || !PHONE_REGEX.test(normalizedPhone)) {
    throw new AppError("Phone must be 10 to 15 digits and may start with +", 400);
  }
};

const validateRole = (role) => {
  const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : role;

  if (normalizedRole === undefined) {
    return;
  }

  if (typeof normalizedRole !== "string" || !ALLOWED_ROLES.includes(normalizedRole)) {
    throw new AppError("Role must be either 'admin' or 'employee'", 400);
  }
};

const validateUserId = (req, res, next) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new AppError("User id must be a positive integer", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateCreateUser = (req, res, next) => {
  try {
    validateRequestBody(req.body);
    validateAllowedFields(req.body);

    validateName(req.body.name, true);
    validateEmail(req.body.email, true);
    validatePassword(req.body.password, true);
    validatePhone(req.body.phone);
    validateRole(req.body.role);

    next();
  } catch (error) {
    next(error);
  }
};

const validateUpdateUser = (req, res, next) => {
  try {
    validateRequestBody(req.body);

    const keys = validateAllowedFields(req.body);

    if (keys.length === 0) {
      throw new AppError("At least one field is required to update the user", 400);
    }

    validateName(req.body.name);
    validateEmail(req.body.email);
    validatePassword(req.body.password);
    validatePhone(req.body.phone);
    validateRole(req.body.role);

    next();
  } catch (error) {
    next(error);
  }
};

const validateLogin = (req, res, next) => {
  try {
    validateRequestBody(req.body);

    const allowedFields = ["email", "password"];
    const invalidField = Object.keys(req.body).find((key) => !allowedFields.includes(key));

    if (invalidField) {
      throw new AppError(`Field '${invalidField}' is not allowed for login`, 400);
    }

    validateEmail(req.body.email, true);

    if (!req.body.password || typeof req.body.password !== "string" || !req.body.password.trim()) {
      throw new AppError("Password is required", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateUserId,
  validateCreateUser,
  validateUpdateUser,
  validateLogin,
  validateForgotPasswordRequest,
  validateVerifyOtp,
  validateResetPassword,
};
