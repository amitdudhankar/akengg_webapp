const express = require("express");

const blogController = require("../controllers/blog.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { uploadBlogImage, compressBlogImage } = require("../middlewares/blogUpload");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const {
  validateBlogId,
  validateBlogIdOrSlug,
  validateBlogListQuery,
  validateCreateBlog,
  validateUpdateBlog,
} = require("../middlewares/validateBlog");

const router = express.Router();

router.get("/", validateBlogListQuery, asyncHandler(blogController.getBlogs));
// Public detail: matched by slug, with numeric id kept as a fallback so URLs
// indexed before the slug switch keep working. Admin PUT/DELETE stay id-only.
router.get("/:idOrSlug", validateBlogIdOrSlug, asyncHandler(blogController.getBlog));
// compressBlogImage runs AFTER validation so an invalid payload never leaves a
// stray object in the bucket.
router.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  uploadBlogImage.single("image"),
  validateCreateBlog,
  compressBlogImage,
  asyncHandler(blogController.createBlog)
);
router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateBlogId,
  uploadBlogImage.single("image"),
  validateUpdateBlog,
  compressBlogImage,
  asyncHandler(blogController.updateBlog)
);
router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  validateBlogId,
  asyncHandler(blogController.deleteBlog)
);

module.exports = router;
