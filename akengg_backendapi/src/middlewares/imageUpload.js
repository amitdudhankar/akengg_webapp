// src/middlewares/imageUpload.js
// The ONE way an image gets into storage. Blogs, services, projects, team
// members and the seller assets all go through this, so they cannot drift apart
// — and there is no longer a second, uncompressed path to wire a new route to
// by mistake.
//
// Three steps, in this order:
//   1. upload.single("image")  multer buffers the upload in RAM
//   2. ...the payload validator...
//   3. compress                re-encode + store, setting req.file.key
//
// Routes mount the two halves either side of their validator on purpose: a
// rejected payload must never leave an orphaned object in the bucket. See
// blog.routes.js for the canonical ordering.
const { createMemoryUploader } = require("../utils/storage");
const compressUploadedImage = require("./imageCompression");

/**
 * @param {string} folder logical storage folder ("blogs", "services", ...)
 * @param {{format?: "webp"|"preserve", maxWidth?: number, maxHeight?: number,
 *          quality?: number}} [options] passed through to compressUploadedImage
 * @returns {{upload: import("multer").Multer, compress: Function}}
 */
const createImageUpload = (folder, options = {}) => ({
  upload: createMemoryUploader(),
  compress: compressUploadedImage(folder, options),
});

module.exports = createImageUpload;
