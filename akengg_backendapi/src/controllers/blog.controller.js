const blogService = require("../services/blog.service");

const getBlogs = async (req, res) => {
  const result = await blogService.getBlogs(req.query);
  res.status(200).json(result);
};

const getBlogById = async (req, res) => {
  const blog = await blogService.getBlogById(req.params.id);
  res.status(200).json({
    message: "Blog fetched successfully",
    data: blog,
  });
};

const createBlog = async (req, res) => {
  const blog = await blogService.createBlog(req.body, req.file);
  res.status(201).json({
    message: "Blog created successfully",
    data: blog,
  });
};

const updateBlog = async (req, res) => {
  const blog = await blogService.updateBlog(req.params.id, req.body, req.file);
  res.status(200).json({
    message: "Blog updated successfully",
    data: blog,
  });
};

const deleteBlog = async (req, res) => {
  await blogService.deleteBlog(req.params.id);
  res.status(200).json({
    message: "Blog deleted successfully",
  });
};

module.exports = {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
};
