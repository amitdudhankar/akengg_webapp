// src/controllers/followup.controller.js
// Thin HTTP layer for the cross-lead follow-ups list (admin Follow-ups page +
// CSV export). Delegates entirely to leadFollowup.service. Responds
// { message, data } with a pagination envelope for the list, matching
// lead.controller.js / document.controller.js.
const asyncHandler = require("../middlewares/asyncHandler");
const { csvLine } = require("../utils/csv");

const leadFollowupService = require("../services/leadFollowup.service");

const getFollowups = asyncHandler(async (req, res) => {
  const result = await leadFollowupService.getFollowupsAggregate(req.query);

  res.status(200).json({
    message: "Follow-ups fetched successfully",
    data: result.items,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    },
  });
});

// ── CSV export (streamed, BOM-prefixed for Excel) ───────────────────────
const FOLLOWUPS_CSV_COLUMNS = [
  "Follow-up Date",
  "Time",
  "Lead Number",
  "Company",
  "Contact Person",
  "Phone",
  "Type",
  "Status",
  "Notes",
  "Assigned To",
];

// Manual local-date string, same convention as lead.controller.js's /
// leadFollowup.service.js's todayDateString() — duplicated here since it is
// not exported from either.
const todayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const exportFollowupsCsv = asyncHandler(async (req, res) => {
  const todayStr = todayDateString();

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="followups-${todayStr}.csv"`);

  res.write("\uFEFF");
  res.write(csvLine(FOLLOWUPS_CSV_COLUMNS));

  for await (const row of leadFollowupService.iterateFollowupsForExport(req.query)) {
    res.write(
      csvLine([
        row.followup_date,
        row.followup_time,
        row.lead_number,
        row.company_name,
        row.contact_person,
        row.phone,
        row.type,
        row.status,
        row.notes,
        row.assigned_to_name,
      ])
    );
  }

  res.end();
});

module.exports = {
  getFollowups,
  exportFollowupsCsv,
};
