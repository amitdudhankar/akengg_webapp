const testimonialService = require("../services/testimonial.service");

const getTestimonials = async (req, res) => {
  const testimonials = await testimonialService.getTestimonials();
  res.status(200).json({
    message: "Testimonials fetched successfully",
    data: testimonials,
  });
};

const getTestimonialById = async (req, res) => {
  const testimonial = await testimonialService.getTestimonialById(req.params.id);
  res.status(200).json({
    message: "Testimonial fetched successfully",
    data: testimonial,
  });
};

const createTestimonial = async (req, res) => {
  const testimonial = await testimonialService.createTestimonial(req.body);
  res.status(201).json({
    message: "Testimonial created successfully",
    data: testimonial,
  });
};

const updateTestimonial = async (req, res) => {
  const testimonial = await testimonialService.updateTestimonial(req.params.id, req.body);
  res.status(200).json({
    message: "Testimonial updated successfully",
    data: testimonial,
  });
};

const deleteTestimonial = async (req, res) => {
  await testimonialService.deleteTestimonial(req.params.id);
  res.status(200).json({
    message: "Testimonial deleted successfully",
  });
};

module.exports = {
  getTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
};
