// src/controllers/lead.controller.js
// Thin HTTP layer for the lead pipeline: delegates to lead.service /
// leadFollowup.service / leadFile.service / leadReport.service. Responds
// { message, data } (list endpoints add a `pagination` envelope), matching
// document.controller.js / party.controller.js. Every handler is wrapped in
// asyncHandler so a rejected promise reaches errorHandler via next(error).
const asyncHandler = require("../middlewares/asyncHandler");
const AppError = require("../utils/appError");
const { csvLine } = require("../utils/csv");

const leadService = require("../services/lead.service");
const leadFollowupService = require("../services/leadFollowup.service");
const leadFileService = require("../services/leadFile.service");
const leadReportService = require("../services/leadReport.service");
const emailService = require("../services/email.service");

// Manual local-date string ("YYYY-MM-DD"), same convention as
// leadFollowup.service.js's / leadReport.service.js's todayDateString() —
// deliberately not a UTC/ISO split, and duplicated here rather than reached
// into across files (neither service exports it).
const todayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Fire off the two lead-capture emails without making the caller (createLead)
// wait on them — the DB row is already committed and the enquirer has already
// been told "submitted successfully". Wrapped in Promise.resolve().then(...)
// rather than called directly so that if email.service.js does not (yet)
// export sendLeadNotification/sendLeadAutoReply, the resulting TypeError is
// caught by .catch() instead of escaping as an unhandled rejection.
const sendLeadCaptureEmails = (leadId, { filesCount } = {}) => {
  leadService
    .getLeadById(leadId)
    .then((leadRow) => {
      if (!leadRow) {
        return;
      }

      Promise.resolve()
        .then(() => emailService.sendLeadNotification(leadRow, { filesCount }))
        .catch((err) => console.error("[leads] notification email failed", err));

      Promise.resolve()
        .then(() => emailService.sendLeadAutoReply(leadRow))
        .catch((err) => console.error("[leads] auto-reply email failed", err));
    })
    .catch((err) => console.error("[leads] failed to load lead for notification email", err));
};

// ── public capture ──────────────────────────────────────────────────────
const createLead = asyncHandler(async (req, res) => {
  if (req.isHoneypotTripped) {
    res.status(201).json({
      message: "Enquiry submitted successfully",
      data: null,
    });
    return;
  }

  const storedFiles = await leadFileService.storeIncomingFiles(req.files || []);
  const created = await leadService.createPublicLead(req.body, storedFiles);

  res.status(201).json({
    message: "Enquiry submitted successfully",
    data: { id: created.id, lead_number: created.lead_number },
  });

  sendLeadCaptureEmails(created.id, { filesCount: storedFiles.length });
});

// ── list / stats ─────────────────────────────────────────────────────────
const getLeads = asyncHandler(async (req, res) => {
  const result = await leadService.getLeads(req.query);

  res.status(200).json({
    message: "Leads fetched successfully",
    data: result.items,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    },
  });
});

const getLeadStats = asyncHandler(async (req, res) => {
  const stats = await leadReportService.getLeadStats(req.query);

  res.status(200).json({
    message: "Lead stats fetched successfully",
    data: stats,
  });
});

// ── single lead ──────────────────────────────────────────────────────────
const getLeadById = asyncHandler(async (req, res) => {
  const lead = await leadService.getLeadById(req.params.id);

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  res.status(200).json({
    message: "Lead fetched successfully",
    data: lead,
  });
});

const updateLead = asyncHandler(async (req, res) => {
  const lead = await leadService.updateLead(req.params.id, req.body, req.user?.id);

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  res.status(200).json({
    message: "Lead updated successfully",
    data: lead,
  });
});

const changeStatus = asyncHandler(async (req, res) => {
  const lead = await leadService.changeStatus(req.params.id, req.body, req.user?.id);

  res.status(200).json({
    message: "Lead status updated successfully",
    data: lead,
  });
});

const deleteLead = asyncHandler(async (req, res) => {
  const lead = await leadService.getLeadById(req.params.id);

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  await leadService.deleteLead(req.params.id);

  res.status(200).json({
    message: "Lead deleted successfully",
  });
});

const convertToParty = asyncHandler(async (req, res) => {
  const result = await leadService.convertToParty(req.params.id, req.body, req.user?.id);

  res.status(200).json({
    message: "Lead converted to party successfully",
    data: result,
  });
});

// ── notes ────────────────────────────────────────────────────────────────
const getNotes = asyncHandler(async (req, res) => {
  const notes = await leadService.getNotes(req.params.id);

  res.status(200).json({
    message: "Notes fetched successfully",
    data: notes,
  });
});

const createNote = asyncHandler(async (req, res) => {
  const notes = await leadService.addNote(req.params.id, req.body.note, req.user?.id);

  res.status(201).json({
    message: "Note added successfully",
    data: notes,
  });
});

// ── follow-ups (sub-resource of a lead — delegates to leadFollowup.service) ─
const getFollowups = asyncHandler(async (req, res) => {
  const followups = await leadFollowupService.getFollowupsForLead(req.params.id);

  res.status(200).json({
    message: "Follow-ups fetched successfully",
    data: followups,
  });
});

const createFollowup = asyncHandler(async (req, res) => {
  const followup = await leadFollowupService.createFollowup(req.params.id, req.body, req.user?.id);

  res.status(201).json({
    message: "Follow-up created successfully",
    data: followup,
  });
});

const updateFollowupAction = asyncHandler(async (req, res) => {
  const followup = await leadFollowupService.applyFollowupAction(
    req.params.id,
    req.params.followupId,
    req.body,
    req.user?.id
  );

  res.status(200).json({
    message: "Follow-up updated successfully",
    data: followup,
  });
});

// ── files ────────────────────────────────────────────────────────────────
const getFiles = asyncHandler(async (req, res) => {
  const files = await leadFileService.getFilesForLead(req.params.id);

  res.status(200).json({
    message: "Files fetched successfully",
    data: files,
  });
});

const uploadFiles = asyncHandler(async (req, res) => {
  const files = await leadFileService.addFilesToLead(req.params.id, req.files || [], req.user?.id);

  res.status(201).json({
    message: "Files uploaded successfully",
    data: files,
  });
});

const downloadFile = asyncHandler(async (req, res) => {
  const file = await leadFileService.getFileForDownload(req.params.id, req.params.fileId);

  if (!file) {
    throw new AppError("File not found", 404);
  }

  const { stream, filename, mimeType } = file;
  // Strip non-ASCII characters for the legacy `filename` fallback; the
  // RFC 5987 `filename*` param carries the full UTF-8 name for clients that
  // understand it.
  const asciiFallback = filename.replace(/[^\x00-\x7F]/g, "") || "file";

  res.setHeader("Content-Type", mimeType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );

  stream.on("error", (err) => {
    res.destroy(err);
  });

  stream.pipe(res);
});

const deleteFile = asyncHandler(async (req, res) => {
  const deleted = await leadFileService.deleteFile(req.params.id, req.params.fileId);

  if (!deleted) {
    throw new AppError("File not found", 404);
  }

  res.status(200).json({
    message: "File deleted successfully",
  });
});

// ── CSV export (streamed, BOM-prefixed for Excel) ───────────────────────
const LEADS_CSV_COLUMNS = [
  "Lead Number",
  "Contact Person",
  "Company",
  "Phone",
  "Email",
  "Industry",
  "City",
  "State",
  "Product",
  "Status",
  "Priority",
  "Source",
  "Assigned To",
  "Estimated Value",
  "Quotation Value",
  "Next Follow-up",
  "Created At",
];

const exportLeadsCsv = asyncHandler(async (req, res) => {
  const todayStr = todayDateString();

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="leads-${todayStr}.csv"`);

  res.write("\uFEFF");
  res.write(csvLine(LEADS_CSV_COLUMNS));

  for await (const batch of leadService.iterateLeadsForExport(req.query)) {
    for (const row of batch) {
      res.write(
        csvLine([
          row.lead_number,
          row.contact_person,
          row.company_name,
          row.phone,
          row.email,
          row.industry,
          row.city,
          row.state,
          row.product,
          row.status,
          row.priority,
          row.source,
          row.assigned_to_name,
          row.estimated_value,
          row.quotation_value,
          row.next_followup_date,
          row.created_at,
        ])
      );
    }
  }

  res.end();
});

module.exports = {
  createLead,
  getLeads,
  getLeadStats,
  getLeadById,
  updateLead,
  changeStatus,
  deleteLead,
  convertToParty,
  getNotes,
  createNote,
  getFollowups,
  createFollowup,
  updateFollowupAction,
  getFiles,
  uploadFiles,
  downloadFile,
  deleteFile,
  exportLeadsCsv,
};
