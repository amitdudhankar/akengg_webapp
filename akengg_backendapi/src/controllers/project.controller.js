const projectService = require("../services/project.service");

const getProjects = async (req, res) => {
  const projects = await projectService.getProjects();
  res.status(200).json({
    message: "Projects fetched successfully",
    data: projects,
  });
};

const getProjectById = async (req, res) => {
  const project = await projectService.getProjectById(req.params.id);
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

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
