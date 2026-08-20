// src/routes/lead.routes.js
// Lead pipeline routes. Layering (protected routes):
//   verifyToken -> authorizeRoles -> validate* -> asyncHandler(controller).
// The public quote-form POST is the one exception — it must stay reachable
// without a token, so it is registered FIRST, above router.use(verifyToken)
// would ever be applied, and every route below it instead applies
// verifyToken/authorizeRoles per-route (same public-POST + protected-rest
// shape as contact.routes.js).
//
// Reads/create/update/status/notes/follow-ups/file-upload/convert = admin +
// employee; deleting a file or the lead itself = admin only (mirrors
// document.routes.js's delete-is-admin-only convention).
//
// NOTE: static paths "/stats" and "/export.csv" are registered before "/:id"
// so Express doesn't swallow them as the id param (same rule document.routes.js
// follows for "/next-number").
const express = require("express");

const leadController = require("../controllers/lead.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const { createRateLimiter } = require("../middlewares/rateLimit");
const { leadFilesMiddleware, verifyLeadFiles } = require("../middlewares/leadFileUpload");
const {
  validateLeadId,
  validatePublicCreateLead,
  validateUpdateLead,
  validateStatusChange,
  validateCreateNote,
  validateCreateFollowup,
  validateFollowupAction,
  validateLeadFilters,
  validateConvertToParty,
} = require("../middlewares/validateLead");

const router = express.Router();

// Public quote-form submit — throttled to curb spam (5 enquiries/min per IP),
// same limit/message shape as contact.routes.js's submitLimiter. Order matters:
// rate limiter -> multer (populates req.body + req.files) -> field validator
// (needs req.body) -> magic-byte verifier (needs req.files) -> handler.
const publicCreateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many enquiries from this device. Please try again in a minute.",
});

router.post(
  "/",
  publicCreateLimiter,
  leadFilesMiddleware,
  validatePublicCreateLead,
  verifyLeadFiles,
  asyncHandler(leadController.createLead)
);

// ── static paths BEFORE "/:id" ──────────────────────────────────────────
router.get(
  "/stats",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateLeadFilters,
  asyncHandler(leadController.getLeadStats)
);

router.get(
  "/export.csv",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateLeadFilters,
  asyncHandler(leadController.exportLeadsCsv)
);

router.get(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateLeadFilters,
  asyncHandler(leadController.getLeads)
);

router.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateLeadId,
  asyncHandler(leadController.getLeadById)
);

router.patch(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateLeadId,
  validateUpdateLead,
  asyncHandler(leadController.updateLead)
);

router.patch(
  "/:id/status",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateLeadId,
  validateStatusChange,
  asyncHandler(leadController.changeStatus)
);

router.get(
  "/:id/notes",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateLeadId,
  asyncHandler(leadController.getNotes)
);

router.post(
  "/:id/notes",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateLeadId,
  validateCreateNote,
  asyncHandler(leadController.createNote)
);

router.get(
  "/:id/followups",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateLeadId,
  asyncHandler(leadController.getFollowups)
);

router.post(
  "/:id/followups",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateLeadId,
  validateCreateFollowup,
  asyncHandler(leadController.createFollowup)
);

router.patch(
  "/:id/followups/:followupId",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateLeadId,
  validateFollowupAction,
  asyncHandler(leadController.updateFollowupAction)
);

router.get(
  "/:id/files",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateLeadId,
  asyncHandler(leadController.getFiles)
);

router.post(
  "/:id/files",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateLeadId,
  leadFilesMiddleware,
  verifyLeadFiles,
  asyncHandler(leadController.uploadFiles)
);

router.get(
  "/:id/files/:fileId",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateLeadId,
  asyncHandler(leadController.downloadFile)
);

router.delete(
  "/:id/files/:fileId",
  verifyToken,
  authorizeRoles("admin"),
  validateLeadId,
  asyncHandler(leadController.deleteFile)
);

router.post(
  "/:id/convert-to-party",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateLeadId,
  validateConvertToParty,
  asyncHandler(leadController.convertToParty)
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  validateLeadId,
  asyncHandler(leadController.deleteLead)
);

module.exports = router;
