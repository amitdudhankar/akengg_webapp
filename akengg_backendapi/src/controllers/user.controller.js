const userService = require("../services/user.service");

const getUsers = async (req, res) => {
  const users = await userService.getUsers();
  res.status(200).json({
    message: "Users fetched successfully",
    data: users,
  });
};

const getUserById = async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.status(200).json({
    message: "User fetched successfully",
    data: user,
  });
};

const createUser = async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(201).json({
    message: "User created successfully",
    data: user,
  });
};

const updateUser = async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);
  res.status(200).json({
    message: "User updated successfully",
    data: user,
  });
};

const deleteUser = async (req, res) => {
  await userService.deleteUser(req.params.id);
  res.status(200).json({
    message: "User deleted successfully",
  });
};

const loginUser = async (req, res) => {
  const result = await userService.loginUser(req.body);
  res.status(200).json({
    message: "Login successful",
    data: result,
  });
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
};
