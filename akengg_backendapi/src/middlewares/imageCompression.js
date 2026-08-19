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
//
// Two output modes, selected with the `format` option:
//   "webp"      (default) re-encode to WebP. For website imagery, whose only
//               consumer is a browser.
//   "preserve"  keep the original encoding — PNG stays PNG, JPEG stays JPEG —
//               and only resize/optimise. Used for the seller logo and
//               signature, which html-to-docx embeds into .docx invoices:
//               older Word builds cannot render WebP and would print a broken
//               image on a document that goes out to a customer. PNG is
//               re-encoded LOSSLESSLY here for the same reason.
//
// What is never re-encoded: SVG (vector — rasterising it would make it both
// larger and blurrier) and anything outside image/*, which is stored
// byte-for-byte exactly as uploaded.
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
  format: "webp",
};

// Image types we store verbatim rather than re-encode.
const PASSTHROUGH_MIME_TYPES = new Set(["image/svg+xml"]);

// Only raster images are candidates for re-encoding. A non-image upload (a PDF
// datasheet, say) is stored exactly as it arrived.
const isRasterImage = (mimetype) =>
  Boolean(mimetype) &&
  mimetype.startsWith("image/") &&
  !PASSTHROUGH_MIME_TYPES.has(mimetype);

const WEBP = { ext: ".webp", contentType: "image/webp" };

// sharp's format id -> how we store it. Only formats we are willing to re-emit
// in "preserve" mode appear here; anything else becomes WebP, which is still
// far better than storing the untouched original.
const PRESERVABLE = {
  jpeg: { ext: ".jpg", contentType: "image/jpeg" },
  png: { ext: ".png", contentType: "image/png" },
  webp: WEBP,
};

const outputFormat = (mode, sourceFormat) =>
  (mode === "preserve" && PRESERVABLE[sourceFormat]) || WEBP;

const encodeAs = (pipeline, target, quality) => {
  if (target.contentType === "image/png") {
    // Lossless — this path only runs in "preserve" mode, i.e. for assets that
    // get printed onto an invoice.
    return pipeline.png({ compressionLevel: 9 });
  }

  if (target.contentType === "image/jpeg") {
    return pipeline.jpeg({ quality, mozjpeg: true });
  }

  return pipeline.webp({ quality });
};

const kb = (bytes) => `${Math.round(bytes / 1024)}KB`;

/**
 * @param {string} folder logical storage folder, e.g. "blogs"
 * @param {{maxWidth?: number, maxHeight?: number, quality?: number,
 *          format?: "webp"|"preserve"}} [options]
 */
const compressUploadedImage = (folder, options = {}) => {
  const { maxWidth, maxHeight, quality, format } = { ...DEFAULTS, ...options };

  return async (req, res, next) => {
    const file = req.file;

    // Nothing uploaded (e.g. a PUT that only edits text), or an uploader that
    // already wrote the file itself — either way there is nothing to do.
    if (!file || !file.buffer) {
      return next();
    }

    try {
      const safeName = sanitizeFileName(file.originalname);
      const { name: baseName } = path.parse(safeName);
      let body = file.buffer;
      let filename = `${Date.now()}-${baseName}${path.extname(safeName)}`;
      let contentType = file.mimetype;

      if (isRasterImage(file.mimetype)) {
        let compressed;
        let target;

        try {
          // Read the header first: animated images need every frame, and
          // .rotate() is not valid for multi-page input.
          const metadata = await sharp(file.buffer).metadata();
          const isAnimated = Number(metadata.pages) > 1;

          const pipeline = sharp(file.buffer, { animated: isAnimated });

          // rotate() bakes in EXIF orientation before sharp strips metadata,
          // otherwise phone photos come out sideways. Stripping the rest also
          // removes GPS coordinates from the published file.
          const resized = (isAnimated ? pipeline : pipeline.rotate()).resize({
            width: maxWidth,
            height: maxHeight,
            fit: "inside",
            withoutEnlargement: true,
          });

          target = outputFormat(format, metadata.format);
          compressed = await encodeAs(resized, target, quality).toBuffer();
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
          filename = `${Date.now()}-${baseName}${target.ext}`;
          contentType = target.contentType;
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
