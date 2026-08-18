const fs = require("fs");
const path = require("path");

const query = require("../utils/db");
const AppError = require("../utils/appError");
const { keyFromFile, assetUrl, deleteAsset } = require("../utils/storage");

const STORAGE_FOLDER = "blogs";

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

// Blogs predate the storage layer, so two shapes live in blogs.image:
//   legacy — a BARE filename ("172...-photo.jpg"); the file sits in
//            src/public/blog_images and is served at /blog-images
//   current — a storage KEY ("blogs/172...-photo.jpg") handled by the storage
//            driver (local disk or S3, per STORAGE_DRIVER)
// The "/" is what tells them apart, so old rows keep working untouched and no
// database migration is needed. Legacy rows convert themselves the next time
// their image is replaced.
const isLegacyImage = (image) => Boolean(image) && !image.includes("/");

const buildImageUrl = async (image) => {
  if (!image) {
    return null;
  }

  if (isLegacyImage(image)) {
    const baseUrl =
      process.env.PUBLIC_BASE_URL ||
      `http://localhost:${process.env.PORT || 8080}`;

    return `${baseUrl}/blog-images/${image}`;
  }

  return assetUrl(image);
};

// async: assetUrl presigns under the s3 driver.
const mapBlog = async (blog) => {
  if (!blog) {
    return null;
  }

  const mappedBlog = BLOG_COLUMNS.reduce((accumulator, column) => {
    accumulator[column] = blog[column] ?? null;
    return accumulator;
  }, {});

  mappedBlog.image = await buildImageUrl(blog.image);
  return mappedBlog;
};

// The raw stored value (legacy filename or storage key), not the public URL.
const getRawImageKey = async (id) => {
  const rows = await query("SELECT image FROM blogs WHERE id = ?", [id]);
  if (!rows.length) {
    throw new AppError("Blog not found", 404);
  }
  return rows[0].image;
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
    blogs: await Promise.all(blogRows.map(mapBlog)),
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

// Public lookup: prefer the slug (a slug made purely of digits would shadow an
// id, so slug wins), fall back to id so legacy /blogs/12 URLs keep resolving.
const getBlogByIdOrSlug = async (identifier) => {
  const value = String(identifier).trim();

  const rows = await query(
    `SELECT id, title, slug, descrip, content, image, created_at, updated_at
     FROM blogs
     WHERE slug = ?
     LIMIT 1`,
    [value]
  );

  if (rows.length) {
    return mapBlog(rows[0]);
  }

  if (/^[0-9]+$/.test(value)) {
    return getBlogById(Number(value));
  }

  throw new AppError("Blog not found", 404);
};

const removeBlogImage = async (image) => {
  if (!image) {
    return;
  }

  // Legacy rows still point at a plain file under src/public/blog_images,
  // which the storage layer knows nothing about.
  if (isLegacyImage(image)) {
    const imagePath = path.join(blogImagesDirectory, image);

    try {
      await fs.promises.unlink(imagePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    return;
  }

  await deleteAsset(image);
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
      keyFromFile(STORAGE_FOLDER, file),
    ]
  );

  return getBlogById(result.insertId);
};

const updateBlog = async (id, payload, file) => {
  const oldImageKey = await getRawImageKey(id); // also asserts existence
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
    values.push(keyFromFile(STORAGE_FOLDER, file));
  }

  values.push(id);

  await query(
    `UPDATE blogs
     SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    values
  );

  if (file && oldImageKey) {
    await removeBlogImage(oldImageKey);
  }

  return getBlogById(id);
};

const deleteBlog = async (id) => {
  const oldImageKey = await getRawImageKey(id); // also asserts existence

  await query("DELETE FROM blogs WHERE id = ?", [id]);

  if (oldImageKey) {
    await removeBlogImage(oldImageKey);
  }
};

module.exports = {
  getBlogs,
  getBlogById,
  getBlogByIdOrSlug,
  createBlog,
  updateBlog,
  deleteBlog,
};
