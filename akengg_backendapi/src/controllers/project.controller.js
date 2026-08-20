const projectService = require("../services/project.service");

// The project GETs stay public (attachUserIfTokenPresent, not verifyToken), so
// req.user is only set when a valid token happened to be sent. Drafts are
// visible to the admin panel and invisible to the website.
const isStaff = (req) => ["admin", "employee"].includes(req.user?.role);

const wantsAll = (req) => String(req.query.status || "").toLowerCase() === "all";

const getProjects = async (req, res) => {
  const projects = await projectService.getProjects({
    industry: req.query.industry,
    includeUnpublished: wantsAll(req) && isStaff(req),
  });

  res.status(200).json({
    message: "Projects fetched successfully",
    data: projects,
  });
};

const getProject = async (req, res) => {
  // No ?status=all needed on the detail route: the admin panel opens a draft
  // straight from its edit link, and a request without a staff token still
  // gets a 404 for anything unpublished.
  const project = await projectService.getProjectByIdOrSlug(req.params.idOrSlug, {
    includeUnpublished: isStaff(req),
  });

  res.status(200).json({
    message: "Project fetched successfully",
    data: project,
  });
};

const createProject = async (req, res) => {
  const project = await projectService.createProject(req.body, req.file);
  res.status(201).json({
    message: "Project created successfully",
    data: project,
  });
};

const updateProject = async (req, res) => {
  const project = await projectService.updateProject(req.params.id, req.body, req.file);
  res.status(200).json({
    message: "Project updated successfully",
    data: project,
  });
};

const deleteProject = async (req, res) => {
  await projectService.deleteProject(req.params.id);
  res.status(200).json({
    message: "Project deleted successfully",
  });
};

const addProjectImage = async (req, res) => {
  const image = await projectService.addProjectImage(
    req.params.id,
    req.file,
    req.body.caption
  );

  res.status(201).json({
    message: "Project image added successfully",
    data: image,
  });
};

const deleteProjectImage = async (req, res) => {
  await projectService.deleteProjectImage(req.params.id, req.params.imageId);
  res.status(200).json({
    message: "Project image deleted successfully",
  });
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addProjectImage,
  deleteProjectImage,
};
