// src/controllers/document.controller.js
// Thin HTTP layer: delegates to document.service. Responds { message, data }
// (list returns the paginated envelope directly, matching blog.controller).
// PDF streaming delegates to documentPdf.service (owned by the PDF agent).
const documentService = require("../services/document.service");
const documentPdfService = require("../services/documentPdf.service");
const emailService = require("../services/email.service");

const getDocuments = async (req, res) => {
  const result = await documentService.list(req.query);
  res.status(200).json({
    message: "Documents fetched successfully",
    data: result.documents,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    },
  });
};

const getNextNumber = async (req, res) => {
  const data = await documentService.previewNextNumber({
    doc_type: req.query.doc_type,
    doc_date: req.query.doc_date,
  });
  res.status(200).json({
    message: "Next document number computed successfully",
    data,
  });
};

const getDocumentById = async (req, res) => {
  const document = await documentService.getById(req.params.id);
  res.status(200).json({
    message: "Document fetched successfully",
    data: document,
  });
};

const createDocument = async (req, res) => {
  const document = await documentService.create(req.body);
  res.status(201).json({
    message: "Document created successfully",
    data: document,
  });
};

const updateDocument = async (req, res) => {
  const document = await documentService.update(req.params.id, req.body);
  res.status(200).json({
    message: "Document updated successfully",
    data: document,
  });
};

const finalizeDocument = async (req, res) => {
  const document = await documentService.finalize(req.params.id);
  res.status(200).json({
    message: "Document finalized successfully",
    data: document,
  });
};

const deleteDocument = async (req, res) => {
  await documentService.remove(req.params.id);
  res.status(200).json({
    message: "Document deleted successfully",
  });
};

// Clone any document into a fresh draft of the SAME type (201 — new resource).
const duplicateDocument = async (req, res) => {
  const document = await documentService.duplicate(req.params.id);
  res.status(201).json({
    message: "Document duplicated successfully",
    data: document,
  });
};

// Convert into a fresh draft of a DIFFERENT type, recording provenance (201).
const convertDocument = async (req, res) => {
  const document = await documentService.convert(
    req.params.id,
    req.body.target_type
  );
  res.status(201).json({
    message: "Document converted successfully",
    data: document,
  });
};

// Cancel a finalized document (200 — in-place state change).
const cancelDocument = async (req, res) => {
  const document = await documentService.cancel(req.params.id);
  res.status(200).json({
    message: "Document cancelled successfully",
    data: document,
  });
};

// Stream the document PDF. Finalized docs stream the stored PDF; drafts are
// rendered on the fly with a DRAFT watermark (handled by documentPdf.service).
const downloadDocumentPdf = async (req, res) => {
  const { stream, filename } = await documentPdfService.getPdfStream(
    req.params.id
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${filename}"`
  );

  stream.on("error", (err) => {
    res.destroy(err);
  });

  stream.pipe(res);
};

// Stream the document as a Word (.docx) file. Rendered on the fly for any
// status (Word is a convenience export; the PDF remains the stored artifact).
const downloadDocumentDocx = async (req, res) => {
  const { stream, filename } = await documentPdfService.getDocxStream(
    req.params.id
  );

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );

  stream.on("error", (err) => {
    res.destroy(err);
  });

  stream.pipe(res);
};

// Re-render and re-store the PDF for an already-finalized document.
const reExportDocumentPdf = async (req, res) => {
  const pdfKey = await documentPdfService.generateAndStorePdf(req.params.id);
  res.status(200).json({
    message: "Document PDF re-exported successfully",
    data: { pdf_key: pdfKey },
  });
};

// Email a finalized document to the party with the PDF attached. Every body
// field is optional: {} sends to the party's stored email with a generated
// subject. Awaited (unlike the contact-form mails) because the admin user is
// waiting on the outcome.
const emailDocument = async (req, res) => {
  const result = await emailService.sendDocumentEmail(req.params.id, {
    to: req.body?.to,
    cc: req.body?.cc,
    subject: req.body?.subject,
    message: req.body?.message,
  });

  res.status(200).json({
    message: `Document emailed to ${result.to.join(", ")}`,
    data: result,
  });
};

module.exports = {
  getDocuments,
  getNextNumber,
  getDocumentById,
  createDocument,
  updateDocument,
  finalizeDocument,
  deleteDocument,
  duplicateDocument,
  convertDocument,
  cancelDocument,
  downloadDocumentPdf,
  downloadDocumentDocx,
  reExportDocumentPdf,
  emailDocument,
};
