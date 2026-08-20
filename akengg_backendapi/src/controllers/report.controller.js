// src/controllers/report.controller.js
// Thin HTTP layer for the two /reports/* aggregate endpoints. getLeadStats
// lives in lead.controller.js instead (mounted at /leads/stats) — this file
// stays focused on lead-sources and lead-products. Delegates entirely to
// leadReport.service. Responds { message, data }, matching
// lead.controller.js / document.controller.js.
const asyncHandler = require("../middlewares/asyncHandler");

const leadReportService = require("../services/leadReport.service");

const getLeadSources = asyncHandler(async (req, res) => {
  const sources = await leadReportService.getSourceReport(req.query);

  res.status(200).json({
    message: "Lead source report fetched successfully",
    data: sources,
  });
});

const getLeadProducts = asyncHandler(async (req, res) => {
  const products = await leadReportService.getProductReport(req.query);

  res.status(200).json({
    message: "Lead product report fetched successfully",
    data: products,
  });
});

module.exports = {
  getLeadSources,
  getLeadProducts,
};
