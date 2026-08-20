const industryService = require("../services/industry.service");

// The industry routes stay public (attachUserIfTokenPresent, not verifyToken),
// so req.user is only set when a valid token happened to be sent. Drafts are
// visible to the admin panel and invisible to the website.
const isStaff = (req) => ["admin", "employee"].includes(req.user?.role);

const wantsAll = (req) => String(req.query.status || "").toLowerCase() === "all";

const getIndustries = async (req, res) => {
  const industries = await industryService.getIndustries({
    includeUnpublished: wantsAll(req) && isStaff(req),
  });

  res.status(200).json({
    message: "Industries fetched successfully",
    data: industries,
  });
};

const getIndustry = async (req, res) => {
  // No ?status=all needed on the detail route: the admin panel opens a draft
  // straight from its edit link, and a request without a staff token still
  // gets a 404 for anything unpublished.
  const industry = await industryService.getIndustryByIdOrSlug(req.params.idOrSlug, {
    includeUnpublished: isStaff(req),
  });

  res.status(200).json({
    message: "Industry fetched successfully",
    data: industry,
  });
};

const createIndustry = async (req, res) => {
  const industry = await industryService.createIndustry(req.body, req.file);
  res.status(201).json({
    message: "Industry created successfully",
    data: industry,
  });
};

const updateIndustry = async (req, res) => {
  const industry = await industryService.updateIndustry(req.params.id, req.body, req.file);
  res.status(200).json({
    message: "Industry updated successfully",
    data: industry,
  });
};

const deleteIndustry = async (req, res) => {
  await industryService.deleteIndustry(req.params.id);
  res.status(200).json({
    message: "Industry deleted successfully",
  });
};

module.exports = {
  getIndustries,
  getIndustry,
  createIndustry,
  updateIndustry,
  deleteIndustry,
};
