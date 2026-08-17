const express = require("express");

const projectController = require("../controllers/project.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { createUploader } = require("../utils/storage");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const {
  validateProjectId,
  validateCreateProject,
  validateUpdateProject,
} = require("../middlewares/validateProject");

const router = express.Router();
const upload = createUploader("projects");

router.get("/", asyncHandler(projectController.getProjects));
router.get("/:id", validateProjectId, asyncHandler(projectController.getProjectById));

router.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  upload.single("image"),
  validateCreateProject,
  asyncHandler(projectController.createProject)
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateProjectId,
  upload.single("image"),
  validateUpdateProject,
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
