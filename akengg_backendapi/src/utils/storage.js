// src/utils/storage.js
// ─────────────────────────────────────────────────────────────────────────
// Storage abstraction. The rest of the app NEVER deals with disk paths or
// bucket URLs directly — it only uses:
//   createUploader(folder) -> multer instance for handling uploads
//   keyFromFile(folder, f) -> the driver-agnostic KEY to store in the DB
//   assetUrl(key)          -> public URL built from a stored key  [async]
//   deleteAsset(key)       -> remove the underlying object
//
// Generated artifacts (e.g. rendered PDFs) use:
//   putBuffer(folder, filename, buffer, contentType) -> the stored KEY
//   getStream(key)  -> a readable stream of the stored object     [async]
//   readBuffer(key) -> the whole object as a Buffer
//
// Drivers are selected with STORAGE_DRIVER=local|s3.
//   local: files under src/public/uploads, served at /uploads by app.js.
//   s3:    objects in AWS_S3_BUCKET. The bucket is expected to be PRIVATE —
//          assetUrl() returns a time-limited presigned GET URL rather than a
//          plain public URL. Prefixes listed in S3_PUBLIC_FOLDERS are treated
//          as public instead and get a plain ASSET_BASE_URL/CDN link.
//
// DB rows, controllers and services only ever persist the KEY (e.g.
// "services/172...-pump.jpg"), so switching drivers needs no data migration
// beyond copying the files into the bucket under the same key.
//
// NOTE: assetUrl() and getStream() are ASYNC because presigning and S3
// GetObject are. Every caller must await them under both drivers.
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

// ── S3 wiring ──────────────────────────────────────────────────────────────
// Everything below is lazily required/constructed so the local driver never
// pays for the AWS SDK (and a missing bucket config can't break local dev).
let s3ClientSingleton = null;

const s3Bucket = () => {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new AppError(
      "S3 storage is enabled but AWS_S3_BUCKET is not set",
      500
    );
  }
  return bucket;
};

const getS3Client = () => {
  if (s3ClientSingleton) {
    return s3ClientSingleton;
  }

  const { S3Client } = require("@aws-sdk/client-s3");
  const region = process.env.AWS_REGION;

  if (!region) {
    throw new AppError("S3 storage is enabled but AWS_REGION is not set", 500);
  }

  // Explicit keys when provided; otherwise fall back to the default provider
  // chain (IAM instance/task role) so production can run without secrets in env.
  const credentials =
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined;

  s3ClientSingleton = new S3Client({ region, ...(credentials && { credentials }) });
  return s3ClientSingleton;
};

// Translate raw AWS SDK errors into AppErrors so the error handler emits a
// sensible status instead of a blanket 500 with an SDK message. The common
// case by far is a key in the DB whose object isn't in the bucket — e.g. after
// switching STORAGE_DRIVER=s3 without running scripts/migrate-uploads-to-s3.js.
const asStorageError = (error, key) => {
  const status = error.$metadata && error.$metadata.httpStatusCode;

  if (error.name === "NoSuchKey" || error.name === "NotFound" || status === 404) {
    return new AppError(`File not found in storage: ${key}`, 404);
  }

  if (error.name === "AccessDenied" || status === 403) {
    return new AppError(
      `Storage access denied for: ${key}. Check the bucket policy / IAM permissions.`,
      502
    );
  }

  if (error.name === "NoSuchBucket") {
    return new AppError("Configured S3 bucket does not exist", 500);
  }

  return error;
};

// SigV4 caps presigned URLs at 7 days; clamp so a typo can't produce URLs that
// AWS rejects outright.
const MAX_SIGNED_TTL = 7 * 24 * 60 * 60;

const signedUrlTtl = () => {
  const parsed = Number(process.env.S3_SIGNED_URL_TTL);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 3600; // 1 hour
  }
  return Math.min(Math.floor(parsed), MAX_SIGNED_TTL);
};

// Prefixes served as plain public URLs instead of presigned ones. Empty by
// default (= every object is private). Only set this for prefixes you have
// actually made public-readable in the bucket policy, e.g. website images
// behind a CDN — a presigned URL expires, which breaks long-lived HTML.
const publicFolders = () =>
  String(process.env.S3_PUBLIC_FOLDERS || "")
    .split(",")
    .map((folder) => trimSlashes(folder))
    .filter(Boolean);

const isPublicKey = (key) => {
  const normalized = trimSlashes(key);
  return publicFolders().some(
    (folder) => normalized === folder || normalized.startsWith(`${folder}/`)
  );
};

// Base URL used to turn a stored key into a public URL.
// Local default: <PUBLIC_BASE_URL>/uploads. For S3/CDN set ASSET_BASE_URL.
const getAssetBaseUrl = () => {
  if (process.env.ASSET_BASE_URL) {
    return process.env.ASSET_BASE_URL.replace(/\/+$/, "");
  }

  if (STORAGE_DRIVER === "s3") {
    return `https://${s3Bucket()}.s3.${process.env.AWS_REGION}.amazonaws.com`;
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

const createS3Uploader = (folder) => {
  const multerS3 = require("multer-s3");

  const storage = multerS3({
    s3: getS3Client(),
    bucket: s3Bucket(),
    // No ACL: private buckets normally run with Object Ownership =
    // "Bucket owner enforced", where any ACL is rejected.
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key(req, file, cb) {
      cb(
        null,
        `${trimSlashes(folder)}/${Date.now()}-${sanitizeFileName(file.originalname)}`
      );
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
 * Callers are identical under both drivers.
 */
const createUploader = (folder) => {
  if (STORAGE_DRIVER === "s3") {
    return createS3Uploader(folder);
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
 * Build a browser-usable URL from a stored key. Absolute URLs are returned
 * untouched (keeps backwards-compatibility if a full URL was ever stored).
 *
 * Under the s3 driver this returns a PRESIGNED, EXPIRING url (see
 * S3_SIGNED_URL_TTL) unless the key sits under an S3_PUBLIC_FOLDERS prefix.
 *
 * @param {string} key driver-agnostic storage key
 * @returns {Promise<string|null>}
 */
const assetUrl = async (key) => {
  if (!key) {
    return null;
  }

  if (/^https?:\/\//i.test(key)) {
    return key;
  }

  const normalizedKey = trimSlashes(key);

  if (STORAGE_DRIVER === "s3" && !isPublicKey(normalizedKey)) {
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

    return getSignedUrl(
      getS3Client(),
      new GetObjectCommand({ Bucket: s3Bucket(), Key: normalizedKey }),
      { expiresIn: signedUrlTtl() }
    );
  }

  return `${getAssetBaseUrl()}/${normalizedKey}`;
};

/**
 * Delete the object behind a stored key. No-op for absolute/legacy URLs.
 */
const deleteAsset = async (key) => {
  if (!key || /^https?:\/\//i.test(key)) {
    return;
  }

  if (STORAGE_DRIVER === "s3") {
    const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: s3Bucket(), Key: trimSlashes(key) })
    );
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
 * @param {string} [contentType] MIME type
 * @returns {Promise<string>}   the stored key, e.g. "documents/INV-2026-27-0001.pdf"
 */
const putBuffer = async (folder, filename, buffer, contentType) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new AppError("putBuffer requires a Buffer", 500);
  }

  const key = `${trimSlashes(folder)}/${filename}`;

  if (STORAGE_DRIVER === "s3") {
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: s3Bucket(),
        Key: key,
        Body: buffer,
        ...(contentType && { ContentType: contentType }),
      })
    );
    return key;
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
 * @returns {Promise<import('stream').Readable>}
 */
const getStream = async (key) => {
  if (!key) {
    throw new AppError("getStream requires a storage key", 500);
  }

  if (STORAGE_DRIVER === "s3") {
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    try {
      const result = await getS3Client().send(
        new GetObjectCommand({ Bucket: s3Bucket(), Key: trimSlashes(key) })
      );
      return result.Body; // a Node Readable stream
    } catch (error) {
      throw asStorageError(error, key);
    }
  }

  const filePath = path.join(UPLOAD_ROOT, trimSlashes(key));
  return fs.createReadStream(filePath);
};

/**
 * Read the whole object behind a stored key into a Buffer. Used to inline an
 * asset (e.g. the seller logo) as a data: URI so a renderer never has to fetch
 * it over the network, and to attach a stored PDF to an email. Throws if the
 * object is missing.
 *
 * @param {string} key driver-agnostic storage key
 * @returns {Promise<Buffer>}
 */
const readBuffer = async (key) => {
  if (!key) {
    throw new AppError("readBuffer requires a storage key", 500);
  }

  if (STORAGE_DRIVER === "s3") {
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    try {
      const result = await getS3Client().send(
        new GetObjectCommand({ Bucket: s3Bucket(), Key: trimSlashes(key) })
      );
      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error) {
      throw asStorageError(error, key);
    }
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
