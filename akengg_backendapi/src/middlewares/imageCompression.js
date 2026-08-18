// src/middlewares/imageCompression.js
// Re-encodes an uploaded image BEFORE it is persisted, then stores the result
// through the normal storage layer (local disk or S3, per STORAGE_DRIVER).
//
// Pairs with createMemoryUploader(): multer buffers the upload in RAM, this
// middleware shrinks it, putBuffer() writes the compressed bytes, and the
// resulting storage key is set on req.file.key — which is exactly what
// keyFromFile() already reads, so services and controllers need no changes.
//
// Mount it AFTER the payload validators. Nothing is written to S3 until the
// request is known to be valid, so a rejected blog no longer leaves an orphaned
// object in the bucket the way a direct multer-s3 stream did.
const path = require("path");

const sharp = require("sharp");

const AppError = require("../utils/appError");
const { putBuffer, sanitizeFileName } = require("../utils/storage");

const DEFAULTS = {
  // Roughly 2x the widest slot the blog layout renders (max-w-4xl), so the
  // image still looks sharp on a HiDPI screen without shipping camera-sized
  // originals.
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 80,
};

// SVG is vector: rasterising it to WebP would make it both larger and blurrier.
// Stored byte-for-byte instead, which is what happened before this middleware.
const PASSTHROUGH_MIME_TYPES = new Set(["image/svg+xml"]);

const kb = (bytes) => `${Math.round(bytes / 1024)}KB`;

/**
 * @param {string} folder logical storage folder, e.g. "blogs"
 * @param {{maxWidth?: number, maxHeight?: number, quality?: number}} [options]
 */
const compressUploadedImage = (folder, options = {}) => {
  const { maxWidth, maxHeight, quality } = { ...DEFAULTS, ...options };

  return async (req, res, next) => {
    const file = req.file;

    // Nothing uploaded (e.g. a PUT that only edits text), or an uploader that
    // already wrote the file itself — either way there is nothing to do.
    if (!file || !file.buffer) {
      return next();
    }

    try {
      const { name: baseName } = path.parse(sanitizeFileName(file.originalname));
      let body = file.buffer;
      let filename = `${Date.now()}-${baseName}${path.extname(sanitizeFileName(file.originalname))}`;
      let contentType = file.mimetype;

      if (!PASSTHROUGH_MIME_TYPES.has(file.mimetype)) {
        let compressed;

        try {
          // Read the header first: animated images need every frame, and
          // .rotate() is not valid for multi-page input.
          const metadata = await sharp(file.buffer).metadata();
          const isAnimated = Number(metadata.pages) > 1;

          const pipeline = sharp(file.buffer, { animated: isAnimated });

          compressed = await (isAnimated ? pipeline : pipeline.rotate())
            // rotate() bakes in EXIF orientation before sharp strips metadata,
            // otherwise phone photos come out sideways. Stripping the rest also
            // removes GPS coordinates from the published file.
            .resize({
              width: maxWidth,
              height: maxHeight,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({ quality })
            .toBuffer();
        } catch (error) {
          throw new AppError(
            "Uploaded file could not be processed as an image.",
            400
          );
        }

        // Re-encoding a small, already-optimised image can come out bigger.
        // "Compress" should never mean "inflate", so keep whichever is smaller.
        if (compressed.length < file.buffer.length) {
          body = compressed;
          filename = `${Date.now()}-${baseName}.webp`;
          contentType = "image/webp";
        }
      }

      // Outside the try above on purpose: a storage failure is a 5xx, not a
      // "your image is invalid" 400.
      file.key = await putBuffer(folder, filename, body, contentType);
      file.size = body.length;

      console.log(
        `[upload] ${folder}/${filename} ${kb(file.buffer.length)} -> ${kb(body.length)}`
      );

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

module.exports = compressUploadedImage;
