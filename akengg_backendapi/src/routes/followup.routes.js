// src/routes/followup.routes.js
// Cross-lead follow-ups list (admin Follow-ups page) + CSV export. Both
// routes are literal paths ("/" and "/export.csv"), so there is no ":id"
// route to guard against and no ordering concern here.
const express = require("express");

const followupController = require("../controllers/followup.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const { validateFollowupFilters } = require("../middlewares/validateLead");

const router = express.Router();

router.get(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateFollowupFilters,
  asyncHandler(followupController.getFollowups)
);

router.get(
  "/export.csv",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateFollowupFilters,
  asyncHandler(followupController.exportFollowupsCsv)
);

module.exports = router;
