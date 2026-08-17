const express = require("express");

const industryStatController = require("../controllers/industryStat.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const {
  validateIndustryStatId,
  validateCreateIndustryStat,
  validateUpdateIndustryStat,
} = require("../middlewares/validateIndustryStat");

const router = express.Router();

router.get("/", asyncHandler(industryStatController.getIndustryStats));
router.get("/:id", validateIndustryStatId, asyncHandler(industryStatController.getIndustryStatById));

router.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateCreateIndustryStat,
  asyncHandler(industryStatController.createIndustryStat)
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateIndustryStatId,
  validateUpdateIndustryStat,
  asyncHandler(industryStatController.updateIndustryStat)
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  validateIndustryStatId,
  asyncHandler(industryStatController.deleteIndustryStat)
);

module.exports = router;
