const industryStatService = require("../services/industryStat.service");

const getIndustryStats = async (req, res) => {
  const stats = await industryStatService.getIndustryStats();
  res.status(200).json({
    message: "Industry stats fetched successfully",
    data: stats,
  });
};

const getIndustryStatById = async (req, res) => {
  const stat = await industryStatService.getIndustryStatById(req.params.id);
  res.status(200).json({
    message: "Industry stat fetched successfully",
    data: stat,
  });
};

const createIndustryStat = async (req, res) => {
  const stat = await industryStatService.createIndustryStat(req.body);
  res.status(201).json({
    message: "Industry stat created successfully",
    data: stat,
  });
};

const updateIndustryStat = async (req, res) => {
  const stat = await industryStatService.updateIndustryStat(req.params.id, req.body);
  res.status(200).json({
    message: "Industry stat updated successfully",
    data: stat,
  });
};

const deleteIndustryStat = async (req, res) => {
  await industryStatService.deleteIndustryStat(req.params.id);
  res.status(200).json({
    message: "Industry stat deleted successfully",
  });
};

module.exports = {
  getIndustryStats,
  getIndustryStatById,
  createIndustryStat,
  updateIndustryStat,
  deleteIndustryStat,
};
