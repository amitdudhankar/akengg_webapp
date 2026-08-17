const teamService = require("../services/team.service");

const getTeamMembers = async (req, res) => {
  const members = await teamService.getTeamMembers();
  res.status(200).json({
    message: "Team members fetched successfully",
    data: members,
  });
};

const getTeamMemberById = async (req, res) => {
  const member = await teamService.getTeamMemberById(req.params.id);
  res.status(200).json({
    message: "Team member fetched successfully",
    data: member,
  });
};

const createTeamMember = async (req, res) => {
  const member = await teamService.createTeamMember(req.body, req.file);
  res.status(201).json({
    message: "Team member created successfully",
    data: member,
  });
};

const updateTeamMember = async (req, res) => {
  const member = await teamService.updateTeamMember(req.params.id, req.body, req.file);
  res.status(200).json({
    message: "Team member updated successfully",
    data: member,
  });
};

const deleteTeamMember = async (req, res) => {
  await teamService.deleteTeamMember(req.params.id);
  res.status(200).json({
    message: "Team member deleted successfully",
  });
};

module.exports = {
  getTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
};
