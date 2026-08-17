const settingService = require("../services/setting.service");

const getSettings = async (req, res) => {
  const settings = await settingService.getSettings();
  res.status(200).json({
    message: "Settings fetched successfully",
    data: settings,
  });
};

const updateSettings = async (req, res) => {
  const settings = await settingService.updateSettings(req.body);
  res.status(200).json({
    message: "Settings updated successfully",
    data: settings,
  });
};

module.exports = {
  getSettings,
  updateSettings,
};
