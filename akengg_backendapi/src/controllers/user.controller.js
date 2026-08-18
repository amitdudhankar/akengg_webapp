const userService = require("../services/user.service");
const passwordResetService = require("../services/passwordReset.service");

// ── Forgot password ─────────────────────────────────────────────────────────
// Step 1. The response is intentionally identical whether or not the address
// has an account — otherwise this endpoint becomes a way to discover who does.
const sendPasswordOtp = async (req, res) => {
  const { expiresInMinutes } = await passwordResetService.requestOtp(
    req.body.email
  );

  res.status(200).json({
    message: `If an account exists for that email, a reset code has been sent. It expires in ${expiresInMinutes} minutes.`,
  });
};

// Step 2. Returns the token that step 3 requires.
const verifyPasswordOtp = async (req, res) => {
  const { resetToken, expiresIn } = await passwordResetService.verifyOtp(
    req.body.email,
    req.body.otp
  );

  res.status(200).json({
    message: "OTP verified successfully.",
    data: { resetToken, expiresIn },
  });
};

// Step 3. Requires the step-2 token — an email address alone is never enough.
const resetPassword = async (req, res) => {
  await passwordResetService.resetPassword(req.body.token, req.body.newPassword);

  res.status(200).json({
    message: "Password reset successfully. You can now log in.",
  });
};

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
  sendPasswordOtp,
  verifyPasswordOtp,
  resetPassword,
};
