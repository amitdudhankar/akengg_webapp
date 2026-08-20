const express = require("express");

const contactController = require("../controllers/contact.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/auth");
const {
  validateContactId,
  validateCreateContact,
  validateUpdateContact,
  validateContactFilters,
} = require("../middlewares/validateContact");
const { createRateLimiter } = require("../middlewares/rateLimit");

const router = express.Router();

// Public form submit — throttle to curb spam (5 enquiries/min per IP).
const submitLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many enquiries from this device. Please try again in a minute.",
});

router.post("/", submitLimiter, validateCreateContact, asyncHandler(contactController.createContact));

router.get(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateContactFilters,
  asyncHandler(contactController.getContacts)
);
router.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateContactId,
  asyncHandler(contactController.getContactById)
);
router.post(
  "/:id/convert-to-lead",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateContactId,
  require("../middlewares/validateLead").validateConvertContact,
  asyncHandler(contactController.convertToLead)
);
router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateContactId,
  validateUpdateContact,
  asyncHandler(contactController.updateContact)
);
router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  validateContactId,
  asyncHandler(contactController.deleteContact)
);

module.exports = router;
