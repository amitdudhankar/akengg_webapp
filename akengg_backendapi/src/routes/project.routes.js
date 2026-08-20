const express = require("express");

const projectController = require("../controllers/project.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const createImageUpload = require("../middlewares/imageUpload");
const {
  verifyToken,
  attachUserIfTokenPresent,
  authorizeRoles,
} = require("../middlewares/auth");
const {
  validateProjectId,
  validateProjectIdOrSlug,
  validateProjectImageId,
  validateCreateProject,
  validateUpdateProject,
  validateCreateProjectImage,
} = require("../middlewares/validateProject");

const router = express.Router();
// compress runs AFTER validation so an invalid payload never leaves a stray
// object in the bucket. Cover images and gallery images share one folder, and
// therefore one uploader.
const { upload, compress } = createImageUpload("projects");

// Both GETs stay public. attachUserIfTokenPresent only *optionally* decodes a
// token, so the website reads them anonymously (published rows only) while the
// admin panel — which always sends a token — can also see drafts.
//   GET /?industry=<slug|legacy label>&status=all
router.get("/", attachUserIfTokenPresent, asyncHandler(projectController.getProjects));
// Public detail: matched by slug, with numeric id kept as a fallback so URLs
// indexed before the slug switch keep working (same shape as blog.routes.js).
// This only ever matches a single path segment, so the two-segment
// "/:id/images…" routes below are not shadowed by it.
router.get(
  "/:idOrSlug",
  attachUserIfTokenPresent,
  validateProjectIdOrSlug,
  asyncHandler(projectController.getProject)
);

router.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  upload.single("image"),
  validateCreateProject,
  compress,
  asyncHandler(projectController.createProject)
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateProjectId,
  upload.single("image"),
  validateUpdateProject,
  compress,
  asyncHandler(projectController.updateProject)
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  validateProjectId,
  asyncHandler(projectController.deleteProject)
);

// ── Case-study gallery ──────────────────────────────────────────────────────
// A gallery image hangs off a SAVED project, so the project id is in the path.
router.post(
  "/:id/images",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateProjectId,
  upload.single("image"),
  validateCreateProjectImage,
  compress,
  asyncHandler(projectController.addProjectImage)
);

router.delete(
  "/:id/images/:imageId",
  verifyToken,
  authorizeRoles("admin"),
  validateProjectId,
  validateProjectImageId,
  asyncHandler(projectController.deleteProjectImage)
);

module.exports = router;
