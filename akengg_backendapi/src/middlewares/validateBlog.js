const AppError = require("../utils/appError");

const isPlainObject = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const normalizeString = (value) => {
  return typeof value === "string" ? value.trim() : value;
};

const stripHtml = (value) => {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

const validateBlogId = (req, res, next) => {
  try {
    const blogId = Number(req.params.id);

    if (!Number.isInteger(blogId) || blogId <= 0) {
      throw new AppError("Blog id must be a positive integer", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateBlogListQuery = (req, res, next) => {
  try {
    const { page, limit, search } = req.query;

    if (page !== undefined) {
      const parsedPage = Number(page);
      if (!Number.isInteger(parsedPage) || parsedPage <= 0) {
        throw new AppError("Page must be a positive integer", 400);
      }
    }

    if (limit !== undefined) {
      const parsedLimit = Number(limit);
      if (!Number.isInteger(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
        throw new AppError("Limit must be a positive integer up to 100", 400);
      }
    }

    if (search !== undefined && typeof search !== "string") {
      throw new AppError("Search must be a string", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateCreateBlog = (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      throw new AppError("Request body must be a valid form payload", 400);
    }

    const title = normalizeString(req.body.title);
    const descrip = normalizeString(req.body.descrip);
    const content = normalizeString(req.body.content);
    const plainContent = stripHtml(content);

    if (!title || title.length < 5 || title.length > 200) {
      throw new AppError("Title must be between 5 and 200 characters", 400);
    }

    if (!descrip || descrip.length < 20 || descrip.length > 500) {
      throw new AppError("Description must be between 20 and 500 characters", 400);
    }

    if (!content || plainContent.length < 50) {
      throw new AppError("Content must contain at least 50 meaningful characters", 400);
    }

    if (!req.file) {
      throw new AppError("Featured image is required", 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

const validateUpdateBlog = (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      throw new AppError("Request body must be a valid form payload", 400);
    }

    const allowedFields = ["title", "descrip", "content"];
    const invalidField = Object.keys(req.body).find((key) => !allowedFields.includes(key));

    if (invalidField) {
      throw new AppError(`Field '${invalidField}' is not allowed`, 400);
    }

    if (Object.keys(req.body).length === 0 && !req.file) {
      throw new AppError("At least one field or image is required to update the blog", 400);
    }

    if (req.body.title !== undefined) {
      const title = normalizeString(req.body.title);
      if (!title || title.length < 5 || title.length > 200) {
        throw new AppError("Title must be between 5 and 200 characters", 400);
      }
    }

    if (req.body.descrip !== undefined) {
      const descrip = normalizeString(req.body.descrip);
      if (!descrip || descrip.length < 20 || descrip.length > 500) {
        throw new AppError("Description must be between 20 and 500 characters", 400);
      }
    }

    if (req.body.content !== undefined) {
      const content = normalizeString(req.body.content);
      const plainContent = stripHtml(content);
      if (!content || plainContent.length < 50) {
        throw new AppError("Content must contain at least 50 meaningful characters", 400);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateBlogId,
  validateBlogListQuery,
  validateCreateBlog,
  validateUpdateBlog,
};
