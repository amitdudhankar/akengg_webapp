// src/routes/document.routes.js
// Document builder routes (Phase 1 = Tax Invoice). Layering:
//   verifyToken -> authorizeRoles -> validate* -> asyncHandler(controller).
// Reads/create/update/finalize/re-export = admin + employee; delete = admin.
// NOTE: static "/next-number" is registered before "/:id" so it is not
// swallowed by the id param route.
const express = require("express");

const documentController = require("../controllers/document.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const {
  validateCreate,
  validateUpdate,
  validateDocumentId,
  validateConvert,
  validateDocumentEmail,
  validateNextNumberQuery,
  validateListQuery,
} = require("../middlewares/validateDocument");

const router = express.Router();

router.get(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateListQuery,
  asyncHandler(documentController.getDocuments)
);

router.get(
  "/next-number",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateNextNumberQuery,
  asyncHandler(documentController.getNextNumber)
);

router.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateDocumentId,
  asyncHandler(documentController.getDocumentById)
);

router.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateCreate,
  asyncHandler(documentController.createDocument)
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateDocumentId,
  validateUpdate,
  asyncHandler(documentController.updateDocument)
);

router.post(
  "/:id/finalize",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateDocumentId,
  asyncHandler(documentController.finalizeDocument)
);

router.get(
  "/:id/pdf",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateDocumentId,
  asyncHandler(documentController.downloadDocumentPdf)
);

router.get(
  "/:id/docx",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateDocumentId,
  asyncHandler(documentController.downloadDocumentDocx)
);

router.post(
  "/:id/re-export",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateDocumentId,
  asyncHandler(documentController.reExportDocumentPdf)
);

// Email the finalized document (PDF attached) to the party. Same audience as
// re-export: an employee who can issue a document can also send it.
router.post(
  "/:id/email",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateDocumentId,
  validateDocumentEmail,
  asyncHandler(documentController.emailDocument)
);

// Lifecycle (Phase 3): duplicate/convert clone into a new draft (admin+employee);
// cancel flips a finalized doc to cancelled (admin only, like delete).
router.post(
  "/:id/duplicate",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateDocumentId,
  asyncHandler(documentController.duplicateDocument)
);

router.post(
  "/:id/convert",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateDocumentId,
  validateConvert,
  asyncHandler(documentController.convertDocument)
);

router.post(
  "/:id/cancel",
  verifyToken,
  authorizeRoles("admin"),
  validateDocumentId,
  asyncHandler(documentController.cancelDocument)
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  validateDocumentId,
  asyncHandler(documentController.deleteDocument)
);

module.exports = router;
