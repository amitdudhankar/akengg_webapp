const express = require("express");

const projectController = require("../controllers/project.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const createImageUpload = require("../middlewares/imageUpload");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const {
  validateProjectId,
  validateCreateProject,
  validateUpdateProject,
} = require("../middlewares/validateProject");

const router = express.Router();
// compress runs AFTER validation so an invalid payload never leaves a stray
// object in the bucket.
const { upload, compress } = createImageUpload("projects");

router.get("/", asyncHandler(projectController.getProjects));
router.get("/:id", validateProjectId, asyncHandler(projectController.getProjectById));

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

module.exports = router;
