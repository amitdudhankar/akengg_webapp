const partyService = require("../services/party.service");

const getParties = async (req, res) => {
  const result = await partyService.getParties(req.query);
  res.status(200).json({
    message: "Parties fetched successfully",
    data: result.parties,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    },
  });
};

const getPartyById = async (req, res) => {
  const party = await partyService.getPartyById(req.params.id);
  res.status(200).json({
    message: "Party fetched successfully",
    data: party,
  });
};

const createParty = async (req, res) => {
  const party = await partyService.createParty(req.body);
  res.status(201).json({
    message: "Party created successfully",
    data: party,
  });
};

const updateParty = async (req, res) => {
  const party = await partyService.updateParty(req.params.id, req.body);
  res.status(200).json({
    message: "Party updated successfully",
    data: party,
  });
};

const deleteParty = async (req, res) => {
  const result = await partyService.deleteParty(req.params.id);
  res.status(200).json({
    message: result.deactivated
      ? "Party is referenced by existing documents and was deactivated instead of deleted"
      : "Party deleted successfully",
    data: result,
  });
};

module.exports = {
  getParties,
  getPartyById,
  createParty,
  updateParty,
  deleteParty,
};
