const express = require("express");

const userController = require("../controllers/user.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const {
  validateUserId,
  validateCreateUser,
  validateUpdateUser,
  validateLogin,
} = require("../middlewares/validateUser");
const {
  verifyToken,
  attachUserIfTokenPresent,
  authorizeRoles,
  authorizeSelfOrRoles,
  preventRoleAssignmentUnlessAdmin,
} = require("../middlewares/auth");

const router = express.Router();

router.post("/login", validateLogin, asyncHandler(userController.loginUser));

router.get("/", verifyToken, authorizeRoles("admin"), asyncHandler(userController.getUsers));
router.get("/:id", verifyToken, validateUserId, authorizeSelfOrRoles("admin"), asyncHandler(userController.getUserById));
router.post(
  "/",
  attachUserIfTokenPresent,
  preventRoleAssignmentUnlessAdmin,
  validateCreateUser,
  asyncHandler(userController.createUser)
);
router.put(
  "/:id",
  verifyToken,
  validateUserId,
  authorizeSelfOrRoles("admin"),
  preventRoleAssignmentUnlessAdmin,
  validateUpdateUser,
  asyncHandler(userController.updateUser)
);
router.delete("/:id", verifyToken, validateUserId, authorizeRoles("admin"), asyncHandler(userController.deleteUser));

module.exports = router;
