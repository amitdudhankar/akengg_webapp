const serviceService = require("../services/service.service");

const getServices = async (req, res) => {
  const services = await serviceService.getServices();
  res.status(200).json({
    message: "Services fetched successfully",
    data: services,
  });
};

const getServiceById = async (req, res) => {
  const service = await serviceService.getServiceById(req.params.id);
  res.status(200).json({
    message: "Service fetched successfully",
    data: service,
  });
};

const createService = async (req, res) => {
  const service = await serviceService.createService(req.body, req.file);
  res.status(201).json({
    message: "Service created successfully",
    data: service,
  });
};

const updateService = async (req, res) => {
  const service = await serviceService.updateService(req.params.id, req.body, req.file);
  res.status(200).json({
    message: "Service updated successfully",
    data: service,
  });
};

const deleteService = async (req, res) => {
  await serviceService.deleteService(req.params.id);
  res.status(200).json({
    message: "Service deleted successfully",
  });
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
