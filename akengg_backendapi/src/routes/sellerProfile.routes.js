const express = require("express");

const sellerProfileController = require("../controllers/sellerProfile.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const createImageUpload = require("../middlewares/imageUpload");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const { validateUpdate } = require("../middlewares/validateSellerProfile");

const router = express.Router();

// format: "preserve" — unlike website imagery, these two are embedded into the
// PDF *and* .docx exports of an invoice. Word's WebP support is unreliable on
// older builds, so the logo and signature are resized and optimised but keep
// their original encoding (PNG losslessly).
const { upload: uploadSellerAsset, compress: compressSellerAsset } =
  createImageUpload("seller", { format: "preserve" });

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
  compressSellerAsset,
  asyncHandler(sellerProfileController.uploadLogo)
);

// Admin only: upload the seller signature.
router.post(
  "/signature",
  verifyToken,
  authorizeRoles("admin"),
  uploadSellerAsset.single("signature"),
  compressSellerAsset,
  asyncHandler(sellerProfileController.uploadSignature)
);

module.exports = router;
