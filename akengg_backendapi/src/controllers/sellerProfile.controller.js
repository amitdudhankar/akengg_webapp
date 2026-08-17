const sellerProfileService = require("../services/sellerProfile.service");
const AppError = require("../utils/appError");
const { keyFromFile } = require("../utils/storage");

const getSellerProfile = async (req, res) => {
  const profile = await sellerProfileService.getSellerProfile();
  res.status(200).json({
    message: "Seller profile fetched successfully",
    data: profile,
  });
};

const updateSellerProfile = async (req, res) => {
  const profile = await sellerProfileService.updateSellerProfile(req.body);
  res.status(200).json({
    message: "Seller profile updated successfully",
    data: profile,
  });
};

const uploadLogo = async (req, res) => {
  if (!req.file) {
    throw new AppError("Logo image is required", 400);
  }

  const key = keyFromFile("seller", req.file);
  const profile = await sellerProfileService.updateLogo(key);

  res.status(200).json({
    message: "Seller logo updated successfully",
    data: profile,
  });
};

const uploadSignature = async (req, res) => {
  if (!req.file) {
    throw new AppError("Signature image is required", 400);
  }

  const key = keyFromFile("seller", req.file);
  const profile = await sellerProfileService.updateSignature(key);

  res.status(200).json({
    message: "Seller signature updated successfully",
    data: profile,
  });
};

module.exports = {
  getSellerProfile,
  updateSellerProfile,
  uploadLogo,
  uploadSignature,
};
