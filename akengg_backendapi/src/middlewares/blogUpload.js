// src/middlewares/blogUpload.js
// Blog images are buffered in memory so they can be compressed before being
// persisted, then written through the shared storage layer — so they still
// follow STORAGE_DRIVER (local disk or S3) with no special casing here.
//
// Two middlewares, used in this order in blog.routes.js:
//   uploadBlogImage.single("image")  parse the multipart body into req.file
//   ...payload validation...
//   compressBlogImage                re-encode, store, set req.file.key
const { createMemoryUploader } = require("../utils/storage");
const compressUploadedImage = require("./imageCompression");

const STORAGE_FOLDER = "blogs";

module.exports = {
  uploadBlogImage: createMemoryUploader(),
  compressBlogImage: compressUploadedImage(STORAGE_FOLDER),
};
