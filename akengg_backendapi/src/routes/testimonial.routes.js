const express = require("express");

const testimonialController = require("../controllers/testimonial.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const {
  validateTestimonialId,
  validateCreateTestimonial,
  validateUpdateTestimonial,
} = require("../middlewares/validateTestimonial");

const router = express.Router();

router.get("/", asyncHandler(testimonialController.getTestimonials));
router.get("/:id", validateTestimonialId, asyncHandler(testimonialController.getTestimonialById));

router.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateCreateTestimonial,
  asyncHandler(testimonialController.createTestimonial)
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateTestimonialId,
  validateUpdateTestimonial,
  asyncHandler(testimonialController.updateTestimonial)
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  validateTestimonialId,
  asyncHandler(testimonialController.deleteTestimonial)
);

module.exports = router;
