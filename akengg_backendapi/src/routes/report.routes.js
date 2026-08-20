// src/routes/report.routes.js
// Read-only aggregate reporting endpoints for the admin dashboard/reports
// pages. getLeadStats is mounted at /leads/stats instead (see
// lead.routes.js) — this router stays focused on lead-sources / lead-products.
const express = require("express");

const reportController = require("../controllers/report.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const { validateReportFilters } = require("../middlewares/validateLead");

const router = express.Router();

router.get(
  "/lead-sources",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateReportFilters,
  asyncHandler(reportController.getLeadSources)
);

router.get(
  "/lead-products",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateReportFilters,
  asyncHandler(reportController.getLeadProducts)
);

module.exports = router;
