const express = require("express");

const partyController = require("../controllers/party.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const {
  validatePartyId,
  validatePartyListQuery,
  validateCreateParty,
  validateUpdateParty,
} = require("../middlewares/validateParty");

const router = express.Router();

router.get(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validatePartyListQuery,
  asyncHandler(partyController.getParties)
);

router.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validatePartyId,
  asyncHandler(partyController.getPartyById)
);

router.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateCreateParty,
  asyncHandler(partyController.createParty)
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validatePartyId,
  validateUpdateParty,
  asyncHandler(partyController.updateParty)
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  validatePartyId,
  asyncHandler(partyController.deleteParty)
);

module.exports = router;
