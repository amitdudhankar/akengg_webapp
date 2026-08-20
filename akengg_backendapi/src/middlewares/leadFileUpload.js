// src/middlewares/leadFileUpload.js
// Multer uploader for lead attachments (customer drawings, BOQs, spec PDFs,
// site photos, quotations) — unlike middlewares/imageUpload.js this accepts a
// mix of document and image types, not images only. Memory storage only, same
// as the rest of the app: multer buffers the upload in RAM so a later step
// can validate/store it, nothing is ever written straight to disk.
//
// Two exports:
//   leadUpload           the raw multer instance, for callers that want to
//                         wire up a different field name or count.
//   leadFilesMiddleware  leadUpload.array("files", ...) ready to mount as-is.
//
// Mount verifyLeadFiles AFTER leadFilesMiddleware: it checks each buffered
// file's magic numbers actually match its claimed type, since mimetype and
// extension are both just labels the client attaches to the upload.
const multer = require("multer");

const AppError = require("../utils/appError");

// extension (lowercased, from originalname) -> mimetypes the codebase accepts
// for it. Both the extension AND the mimetype must check out before a file is
// let through — either one alone is trivial for a client to spoof.
const EXT_MIME_MAP = {
  ".pdf": ["application/pdf"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".xls": ["application/vnd.ms-excel"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

const ALLOWED_TYPES_MESSAGE = "Invalid file type. Allowed: PDF, PNG, JPG, JPEG, WEBP, XLSX, XLS, DOCX.";

const extensionOf = (originalname) => {
  const name = String(originalname || "");
  const dotIndex = name.lastIndexOf(".");
  return dotIndex === -1 ? "" : name.slice(dotIndex).toLowerCase();
};

const leadFileFilter = (req, file, cb) => {
  const ext = extensionOf(file.originalname);
  const allowedMimeTypes = EXT_MIME_MAP[ext];

  if (!allowedMimeTypes || !allowedMimeTypes.includes(file.mimetype)) {
    return cb(new AppError(ALLOWED_TYPES_MESSAGE, 400));
  }

  return cb(null, true);
};

const LEAD_MAX_FILE_SIZE_MB = Number(process.env.LEAD_MAX_FILE_SIZE_MB) || 10;
const LEAD_MAX_FILES = Number(process.env.LEAD_MAX_FILES) || 5;

const leadUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: leadFileFilter,
  limits: {
    fileSize: LEAD_MAX_FILE_SIZE_MB * 1024 * 1024,
    files: LEAD_MAX_FILES,
  },
});

const leadFilesMiddleware = leadUpload.array("files", LEAD_MAX_FILES);

// ── Magic-number checks ─────────────────────────────────────────────────
// mimetype/extension are just labels the client attaches — this looks at the
// actual leading bytes of the buffered file so a renamed .exe claiming to be
// a .pdf still gets caught.
const PDF_SIGNATURE = Buffer.from("%PDF", "ascii");
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const RIFF_SIGNATURE = Buffer.from("RIFF", "ascii");
const WEBP_SIGNATURE = Buffer.from("WEBP", "ascii");
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // .xlsx / .docx (Office Open XML)
const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]); // .xls (legacy binary)

const matchesSignature = (buffer, signature, offset = 0) => {
  if (!buffer || buffer.length < offset + signature.length) {
    return false;
  }
  return buffer.slice(offset, offset + signature.length).equals(signature);
};

const isValidFileSignature = (file) => {
  const buffer = file.buffer;
  const ext = extensionOf(file.originalname);

  switch (ext) {
    case ".pdf":
      return matchesSignature(buffer, PDF_SIGNATURE);
    case ".png":
      return matchesSignature(buffer, PNG_SIGNATURE);
    case ".jpg":
    case ".jpeg":
      return matchesSignature(buffer, JPEG_SIGNATURE);
    case ".webp":
      return matchesSignature(buffer, RIFF_SIGNATURE) && matchesSignature(buffer, WEBP_SIGNATURE, 8);
    case ".xlsx":
    case ".docx":
      return matchesSignature(buffer, ZIP_SIGNATURE);
    case ".xls":
      return matchesSignature(buffer, OLE_SIGNATURE);
    default:
      return false;
  }
};

const verifyLeadFiles = (req, res, next) => {
  const files = req.files || [];

  const invalidFile = files.find((file) => !isValidFileSignature(file));

  if (invalidFile) {
    return next(
      new AppError(
        `File "${invalidFile.originalname}" does not appear to be a valid file of its declared type.`,
        400
      )
    );
  }

  return next();
};

module.exports = {
  leadUpload,
  leadFilesMiddleware,
  verifyLeadFiles,
};
