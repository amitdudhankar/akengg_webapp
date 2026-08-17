const express = require("express");

const sellerProfileController = require("../controllers/sellerProfile.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { createUploader } = require("../utils/storage");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const { validateUpdate } = require("../middlewares/validateSellerProfile");

const router = express.Router();

const uploadSellerAsset = createUploader("seller");

// Admin & employees can read the seller profile.
router.get(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  asyncHandler(sellerProfileController.getSellerProfile)
);

// Admin only: edit the seller profile.
router.put(
  "/",
  verifyToken,
  authorizeRoles("admin"),
  validateUpdate,
  asyncHandler(sellerProfileController.updateSellerProfile)
);

// Admin only: upload the seller logo.
router.post(
  "/logo",
  verifyToken,
  authorizeRoles("admin"),
  uploadSellerAsset.single("logo"),
  asyncHandler(sellerProfileController.uploadLogo)
);

// Admin only: upload the seller signature.
router.post(
  "/signature",
  verifyToken,
  authorizeRoles("admin"),
  uploadSellerAsset.single("signature"),
  asyncHandler(sellerProfileController.uploadSignature)
);

module.exports = router;
