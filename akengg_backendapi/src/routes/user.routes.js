const express = require("express");

const userController = require("../controllers/user.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const {
  validateUserId,
  validateCreateUser,
  validateUpdateUser,
  validateLogin,
  validateForgotPasswordRequest,
  validateVerifyOtp,
  validateResetPassword,
} = require("../middlewares/validateUser");
const { createRateLimiter } = require("../middlewares/rateLimit");
const {
  verifyToken,
  attachUserIfTokenPresent,
  authorizeRoles,
  authorizeSelfOrRoles,
  preventRoleAssignmentUnlessAdmin,
} = require("../middlewares/auth");

const router = express.Router();

router.post("/login", validateLogin, asyncHandler(userController.loginUser));

// ── Forgot password (public, unauthenticated) ───────────────────────────────
// Rate limited per IP on top of the per-row attempt cap in
// passwordReset.service: the limiter slows a single attacker, the row counter
// stops one who rotates IPs. Sending is the tightest limit because each call
// costs an email.
const otpRequestLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many reset requests. Please try again in a few minutes.",
});

const otpVerifyLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many attempts. Please try again in a few minutes.",
});

router.post(
  "/send-otp",
  otpRequestLimiter,
  validateForgotPasswordRequest,
  asyncHandler(userController.sendPasswordOtp)
);

router.post(
  "/verify-otp",
  otpVerifyLimiter,
  validateVerifyOtp,
  asyncHandler(userController.verifyPasswordOtp)
);

router.post(
  "/reset-password",
  otpVerifyLimiter,
  validateResetPassword,
  asyncHandler(userController.resetPassword)
);

router.get("/", verifyToken, authorizeRoles("admin"), asyncHandler(userController.getUsers));
router.get("/:id", verifyToken, validateUserId, authorizeSelfOrRoles("admin"), asyncHandler(userController.getUserById));
router.post(
  "/",
  attachUserIfTokenPresent,
  preventRoleAssignmentUnlessAdmin,
  validateCreateUser,
  asyncHandler(userController.createUser)
);
router.put(
  "/:id",
  verifyToken,
  validateUserId,
  authorizeSelfOrRoles("admin"),
  preventRoleAssignmentUnlessAdmin,
  validateUpdateUser,
  asyncHandler(userController.updateUser)
);
router.delete("/:id", verifyToken, validateUserId, authorizeRoles("admin"), asyncHandler(userController.deleteUser));

module.exports = router;
