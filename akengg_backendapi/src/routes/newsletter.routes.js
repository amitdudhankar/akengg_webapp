const express = require("express");

const newsletterController = require("../controllers/newsletter.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const {
  validateSubscribe,
  validateSubscriberId,
} = require("../middlewares/validateNewsletter");
const { createRateLimiter } = require("../middlewares/rateLimit");

const router = express.Router();

// Public subscribe — throttle to curb spam (5/min per IP).
const subscribeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many requests from this device. Please try again in a minute.",
});

// Public: anyone can subscribe from the website footer.
router.post("/", subscribeLimiter, validateSubscribe, asyncHandler(newsletterController.subscribe));

// Staff only: view and manage subscribers.
router.get(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  asyncHandler(newsletterController.getSubscribers)
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  validateSubscriberId,
  asyncHandler(newsletterController.deleteSubscriber)
);

module.exports = router;
