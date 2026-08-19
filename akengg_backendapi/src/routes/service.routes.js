const express = require("express");

const serviceController = require("../controllers/service.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const createImageUpload = require("../middlewares/imageUpload");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const {
  validateServiceId,
  validateCreateService,
  validateUpdateService,
} = require("../middlewares/validateService");

const router = express.Router();
// compress runs AFTER validation so an invalid payload never leaves a stray
// object in the bucket.
const { upload, compress } = createImageUpload("services");

router.get("/", asyncHandler(serviceController.getServices));
router.get("/:id", validateServiceId, asyncHandler(serviceController.getServiceById));

router.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  upload.single("image"),
  validateCreateService,
  compress,
  asyncHandler(serviceController.createService)
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateServiceId,
  upload.single("image"),
  validateUpdateService,
  compress,
  asyncHandler(serviceController.updateService)
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  validateServiceId,
  asyncHandler(serviceController.deleteService)
);

module.exports = router;
