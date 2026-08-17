const express = require("express");

const settingController = require("../controllers/setting.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const { validateUpdateSettings } = require("../middlewares/validateSetting");

const router = express.Router();

// Public: the website reads site-wide settings.
router.get("/", asyncHandler(settingController.getSettings));

// Admin only: edit site-wide settings.
router.put(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  validateUpdateSettings,
  asyncHandler(settingController.updateSettings)
);

module.exports = router;
