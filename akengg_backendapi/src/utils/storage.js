// src/utils/storage.js
// ─────────────────────────────────────────────────────────────────────────
// Storage abstraction. The rest of the app NEVER deals with disk paths or
// bucket URLs directly — it only uses:
//   createUploader(folder) -> multer instance for handling uploads
//   keyFromFile(folder, f) -> the driver-agnostic KEY to store in the DB
//   assetUrl(key)          -> public URL built from a stored key
//   deleteAsset(key)       -> remove the underlying object
//
// Generated artifacts (e.g. rendered PDFs) use:
//   putBuffer(folder, filename, buffer, contentType) -> the stored KEY
//   getStream(key) -> a readable stream of the stored object
//
// To move to S3 later: set STORAGE_DRIVER=s3, fill in the s3 branches below
// (e.g. multer-s3 + @aws-sdk/client-s3) and set ASSET_BASE_URL to your CDN /
// bucket URL. DB rows, controllers and services stay UNCHANGED because they
// only ever persist the key (e.g. "services/172...-pump.jpg").
// ─────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const AppError = require("./appError");

const STORAGE_DRIVER = (process.env.STORAGE_DRIVER || "local").toLowerCase();
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Local disk root that is served publicly at /uploads (see app.js).
const UPLOAD_ROOT = path.join(__dirname, "..", "public", "uploads");

const trimSlashes = (value) => String(value || "").replace(/^\/+|\/+$/g, "");

// Base URL used to turn a stored key into a public URL.
// Local default: <PUBLIC_BASE_URL>/uploads. For S3/CDN set ASSET_BASE_URL.
const getAssetBaseUrl = () => {
  if (process.env.ASSET_BASE_URL) {
    return process.env.ASSET_BASE_URL.replace(/\/+$/, "");
  }

  const publicBase =
    process.env.PUBLIC_BASE_URL ||
    `http://localhost:${process.env.PORT || 8080}`;

  return `${publicBase.replace(/\/+$/, "")}/uploads`;
};

const sanitizeFileName = (originalName) => {
  const extension = path.extname(originalName || "").toLowerCase();
  const base =
    path
      .basename(originalName || "file", extension)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file";

  return `${base}${extension}`;
};

const imageFileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    return cb(null, true);
  }

  return cb(new AppError("Invalid file type. Only image files are allowed.", 400));
};

const createLocalUploader = (folder) => {
  const destination = path.join(UPLOAD_ROOT, folder);
  fs.mkdirSync(destination, { recursive: true });

  const storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, destination);
    },
    filename(req, file, cb) {
      cb(null, `${Date.now()}-${sanitizeFileName(file.originalname)}`);
    },
  });

  return multer({
    storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
  });
};

/**
 * Returns a configured multer instance for a logical folder (e.g. "services").
 * Swap to S3 by implementing the s3 branch (multer-s3) — callers don't change.
 */
const createUploader = (folder) => {
  if (STORAGE_DRIVER === "s3") {
    // TODO(s3): const { S3Client } = require("@aws-sdk/client-s3");
    //           const multerS3 = require("multer-s3");
    //           return multer({ storage: multerS3({ s3, bucket, key: ... }),
    //                           fileFilter: imageFileFilter,
    //                           limits: { fileSize: MAX_FILE_SIZE } });
    throw new AppError("S3 storage driver is not configured yet", 500);
  }

  return createLocalUploader(folder);
};

/**
 * Driver-agnostic storage key to persist in the DB: "<folder>/<filename>".
 * With multer-s3, file.key already contains the full object key.
 */
const keyFromFile = (folder, file) => {
  if (!file) {
    return null;
  }

  if (file.key) {
    return file.key; // multer-s3
  }

  return `${trimSlashes(folder)}/${file.filename}`;
};

/**
 * Build a public URL from a stored key. Absolute URLs are returned untouched
 * (keeps backwards-compatibility if a full URL was ever stored).
 */
const assetUrl = (key) => {
  if (!key) {
    return null;
  }

  if (/^https?:\/\//i.test(key)) {
    return key;
  }

  return `${getAssetBaseUrl()}/${trimSlashes(key)}`;
};

/**
 * Delete the object behind a stored key. No-op for absolute/legacy URLs.
 */
const deleteAsset = async (key) => {
  if (!key || /^https?:\/\//i.test(key)) {
    return;
  }

  if (STORAGE_DRIVER === "s3") {
    // TODO(s3): await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
    return;
  }

  const filePath = path.join(UPLOAD_ROOT, trimSlashes(key));

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

/**
 * Persist an in-memory buffer (e.g. a freshly rendered PDF) under a logical
 * folder and return the driver-agnostic storage KEY ("<folder>/<filename>").
 * This complements multer-based uploads for artifacts the server generates
 * itself. Callers persist ONLY the returned key in the DB.
 *
 * @param {string} folder       logical folder (e.g. "documents")
 * @param {string} filename     file name incl. extension (e.g. "INV-2026-27-0001.pdf")
 * @param {Buffer} buffer       file contents
 * @param {string} [contentType] MIME type (used by the S3 branch only)
 * @returns {Promise<string>}   the stored key, e.g. "documents/INV-2026-27-0001.pdf"
 */
const putBuffer = async (folder, filename, buffer, contentType) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new AppError("putBuffer requires a Buffer", 500);
  }

  const key = `${trimSlashes(folder)}/${filename}`;

  if (STORAGE_DRIVER === "s3") {
    // TODO(s3): await s3.send(new PutObjectCommand({
    //             Bucket, Key: key, Body: buffer, ContentType: contentType }));
    //           return key;
    throw new AppError("S3 storage driver is not configured yet", 500);
  }

  const destination = path.join(UPLOAD_ROOT, trimSlashes(folder));
  await fs.promises.mkdir(destination, { recursive: true });
  await fs.promises.writeFile(path.join(destination, filename), buffer);

  return key;
};

/**
 * Return a readable stream for the object behind a stored key. Used to pipe a
 * stored PDF to an HTTP response without buffering it all in memory.
 *
 * @param {string} key driver-agnostic storage key
 * @returns {import('stream').Readable}
 */
const getStream = (key) => {
  if (!key) {
    throw new AppError("getStream requires a storage key", 500);
  }

  if (STORAGE_DRIVER === "s3") {
    // TODO(s3): const res = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
    //           return res.Body; // a Node Readable stream
    throw new AppError("S3 storage driver is not configured yet", 500);
  }

  const filePath = path.join(UPLOAD_ROOT, trimSlashes(key));
  return fs.createReadStream(filePath);
};

/**
 * Read the whole object behind a stored key into a Buffer. Used to inline an
 * asset (e.g. the seller logo) as a data: URI so a renderer never has to fetch
 * it over the network. Throws if the object is missing.
 *
 * @param {string} key driver-agnostic storage key
 * @returns {Promise<Buffer>}
 */
const readBuffer = async (key) => {
  if (!key) {
    throw new AppError("readBuffer requires a storage key", 500);
  }

  if (STORAGE_DRIVER === "s3") {
    // TODO(s3): const res = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
    //           return Buffer.from(await res.Body.transformToByteArray());
    throw new AppError("S3 storage driver is not configured yet", 500);
  }

  const filePath = path.join(UPLOAD_ROOT, trimSlashes(key));
  return fs.promises.readFile(filePath);
};

module.exports = {
  STORAGE_DRIVER,
  UPLOAD_ROOT,
  createUploader,
  keyFromFile,
  assetUrl,
  deleteAsset,
  putBuffer,
  getStream,
  readBuffer,
};
