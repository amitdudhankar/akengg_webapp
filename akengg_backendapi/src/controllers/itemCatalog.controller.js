const itemCatalogService = require("../services/itemCatalog.service");

const getItems = async (req, res) => {
  const result = await itemCatalogService.getItems(req.query);
  res.status(200).json({
    message: "Items fetched successfully",
    data: result.items,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    },
  });
};

const getItemById = async (req, res) => {
  const item = await itemCatalogService.getItemById(req.params.id);
  res.status(200).json({
    message: "Item fetched successfully",
    data: item,
  });
};

const createItem = async (req, res) => {
  const item = await itemCatalogService.createItem(req.body);
  res.status(201).json({
    message: "Item created successfully",
    data: item,
  });
};

const updateItem = async (req, res) => {
  const item = await itemCatalogService.updateItem(req.params.id, req.body);
  res.status(200).json({
    message: "Item updated successfully",
    data: item,
  });
};

const deleteItem = async (req, res) => {
  const result = await itemCatalogService.deleteItem(req.params.id);
  res.status(200).json({
    message: result.deactivated
      ? "Item is referenced by existing documents and was deactivated instead of deleted"
      : "Item deleted successfully",
    data: result,
  });
};

module.exports = {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
};
