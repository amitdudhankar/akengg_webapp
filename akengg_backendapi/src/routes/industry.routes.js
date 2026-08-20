const express = require("express");

const industryController = require("../controllers/industry.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const createImageUpload = require("../middlewares/imageUpload");
const {
  verifyToken,
  attachUserIfTokenPresent,
  authorizeRoles,
} = require("../middlewares/auth");
const {
  validateIndustryId,
  validateIndustryIdOrSlug,
  validateCreateIndustry,
  validateUpdateIndustry,
} = require("../middlewares/validateIndustry");

const router = express.Router();
// compress runs AFTER validation so an invalid payload never leaves a stray
// object in the bucket.
const { upload, compress } = createImageUpload("industries");

// Both GETs stay public. attachUserIfTokenPresent only *optionally* decodes a
// token, so the website reads them anonymously (published rows only) while the
// admin panel — which always sends a token — can also see drafts.
router.get("/", attachUserIfTokenPresent, asyncHandler(industryController.getIndustries));
router.get(
  "/:idOrSlug",
  attachUserIfTokenPresent,
  validateIndustryIdOrSlug,
  asyncHandler(industryController.getIndustry)
);

router.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  upload.single("image"),
  validateCreateIndustry,
  compress,
  asyncHandler(industryController.createIndustry)
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateIndustryId,
  upload.single("image"),
  validateUpdateIndustry,
  compress,
  asyncHandler(industryController.updateIndustry)
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  validateIndustryId,
  asyncHandler(industryController.deleteIndustry)
);

module.exports = router;
