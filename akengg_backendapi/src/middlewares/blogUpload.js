// src/middlewares/blogUpload.js
// Blog images go through the shared storage layer like every other upload, so
// they follow STORAGE_DRIVER (local disk or S3) with no special casing here.
// Kept as its own module so blog.routes.js keeps importing the same path.
const { createUploader } = require("../utils/storage");

module.exports = createUploader("blogs");
