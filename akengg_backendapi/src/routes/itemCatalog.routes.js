const express = require("express");

const itemCatalogController = require("../controllers/itemCatalog.controller");
const asyncHandler = require("../middlewares/asyncHandler");
const { verifyToken, authorizeRoles } = require("../middlewares/auth");
const {
  validateItemId,
  validateItemListQuery,
  validateCreateItem,
  validateUpdateItem,
} = require("../middlewares/validateItemCatalog");

const router = express.Router();

router.get(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateItemListQuery,
  asyncHandler(itemCatalogController.getItems)
);

router.get(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateItemId,
  asyncHandler(itemCatalogController.getItemById)
);

router.post(
  "/",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateCreateItem,
  asyncHandler(itemCatalogController.createItem)
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("admin", "employee"),
  validateItemId,
  validateUpdateItem,
  asyncHandler(itemCatalogController.updateItem)
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  validateItemId,
  asyncHandler(itemCatalogController.deleteItem)
);

module.exports = router;
