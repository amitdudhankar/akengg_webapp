const errorHandler = (err, req, res, next) => {
  if (err.name === "MulterError") {
    return res.status(400).json({
      message: err.message || "File upload error",
    });
  }

  const statusCode = err.statusCode || 500;

  console.error(err.stack);

  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
  });
};

module.exports = { errorHandler };
