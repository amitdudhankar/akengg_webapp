const fs = require("fs");
const path = require("path");

const query = require("../utils/db");
const AppError = require("../utils/appError");

const BLOG_COLUMNS = [
  "id",
  "title",
  "slug",
  "descrip",
  "content",
  "image",
  "created_at",
  "updated_at",
];

const blogImagesDirectory = path.join(__dirname, "..", "public", "blog_images");

const sanitizeBlogInput = (payload) => {
  const cleanPayload = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    cleanPayload[key] = typeof value === "string" ? value.trim() : value;
  });

  return cleanPayload;
};

const buildImageUrl = (imageName) => {
  if (!imageName) {
    return null;
  }

  const baseUrl =
    process.env.PUBLIC_BASE_URL ||
    `http://localhost:${process.env.PORT || 8080}`;

  return `${baseUrl}/blog-images/${imageName}`;
};

const mapBlog = (blog) => {
  if (!blog) {
    return null;
  }

  const mappedBlog = BLOG_COLUMNS.reduce((accumulator, column) => {
    accumulator[column] = blog[column] ?? null;
    return accumulator;
  }, {});

  mappedBlog.image = buildImageUrl(blog.image);
  return mappedBlog;
};

const createSlug = (title) => {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 180) || "blog";
};

const ensureUniqueSlug = async (title, blogId) => {
  const baseSlug = createSlug(title);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const rows = await query(
      "SELECT id FROM blogs WHERE slug = ? AND id <> ? LIMIT 1",
      [slug, blogId || 0]
    );

    if (!rows.length) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
};

const getBlogs = async ({ page = 1, limit = 10, search = "" } = {}) => {
  const parsedPage = Number(page) || 1;
  const parsedLimit = Number(limit) || 10;
  const offset = (parsedPage - 1) * parsedLimit;
  const normalizedSearch = String(search || "").trim();
  const filters = [];
  const values = [];

  if (normalizedSearch) {
    filters.push("(title LIKE ? OR descrip LIKE ?)");
    values.push(`%${normalizedSearch}%`, `%${normalizedSearch}%`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM blogs
     ${whereClause}`,
    values
  );

  const totalItems = Number(countRows[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / parsedLimit));

  const blogRows = await query(
    `SELECT id, title, slug, descrip, content, image, created_at, updated_at
     FROM blogs
     ${whereClause}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [...values, parsedLimit, offset]
  );

  return {
    blogs: blogRows.map(mapBlog),
    page: parsedPage,
    limit: parsedLimit,
    totalItems,
    totalPages,
  };
};

const getBlogById = async (id) => {
  const rows = await query(
    `SELECT id, title, slug, descrip, content, image, created_at, updated_at
     FROM blogs
     WHERE id = ?`,
    [id]
  );

  if (!rows.length) {
    throw new AppError("Blog not found", 404);
  }

  return mapBlog(rows[0]);
};

const removeBlogImage = async (imageName) => {
  if (!imageName) {
    return;
  }

  const imagePath = path.join(blogImagesDirectory, imageName);

  try {
    await fs.promises.unlink(imagePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

const createBlog = async (payload, file) => {
  const cleanPayload = sanitizeBlogInput(payload);
  const slug = await ensureUniqueSlug(cleanPayload.title);

  const result = await query(
    `INSERT INTO blogs (title, slug, descrip, content, image)
     VALUES (?, ?, ?, ?, ?)`,
    [
      cleanPayload.title,
      slug,
      cleanPayload.descrip,
      cleanPayload.content,
      file.filename,
    ]
  );

  return getBlogById(result.insertId);
};

const updateBlog = async (id, payload, file) => {
  const existingBlog = await getBlogById(id);
  const cleanPayload = sanitizeBlogInput(payload);
  const fields = [];
  const values = [];

  if (cleanPayload.title !== undefined) {
    cleanPayload.slug = await ensureUniqueSlug(cleanPayload.title, id);
  }

  Object.entries(cleanPayload).forEach(([key, value]) => {
    fields.push(`${key} = ?`);
    values.push(value);
  });

  if (file) {
    fields.push("image = ?");
    values.push(file.filename);
  }

  values.push(id);

  await query(
    `UPDATE blogs
     SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    values
  );

  if (file && existingBlog.image) {
    await removeBlogImage(path.basename(existingBlog.image));
  }

  return getBlogById(id);
};

const deleteBlog = async (id) => {
  const existingBlog = await getBlogById(id);

  await query("DELETE FROM blogs WHERE id = ?", [id]);

  if (existingBlog.image) {
    await removeBlogImage(path.basename(existingBlog.image));
  }
};

module.exports = {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
};
