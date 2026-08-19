const express = require("express");

const teamController = require("../controllers/team.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const createImageUpload = require("../middlewares/imageUpload");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const {
  validateTeamMemberId,
  validateCreateTeamMember,
  validateUpdateTeamMember,
} = require("../middlewares/validateTeam");

const router = express.Router();
// compress runs AFTER validation so an invalid payload never leaves a stray
// object in the bucket.
const { upload, compress } = createImageUpload("team");

router.get("/", asyncHandler(teamController.getTeamMembers));
router.get("/:id", validateTeamMemberId, asyncHandler(teamController.getTeamMemberById));

router.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  upload.single("image"),
  validateCreateTeamMember,
  compress,
  asyncHandler(teamController.createTeamMember)
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateTeamMemberId,
  upload.single("image"),
  validateUpdateTeamMember,
  compress,
  asyncHandler(teamController.updateTeamMember)
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  validateTeamMemberId,
  asyncHandler(teamController.deleteTeamMember)
);

module.exports = router;
