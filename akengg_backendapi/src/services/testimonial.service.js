const query = require("../utils/db");
const AppError = require("../utils/appError");

const SELECT_COLUMNS =
  "id, client_name, company, content, sort_order, created_at, updated_at";

const sanitizeInput = (payload) => {
  const cleanPayload = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    cleanPayload[key] = typeof value === "string" ? value.trim() : value;
  });
  return cleanPayload;
};

const mapTestimonial = (testimonial) => {
  if (!testimonial) {
    return null;
  }
  return {
    id: testimonial.id,
    client_name: testimonial.client_name,
    company: testimonial.company ?? null,
    content: testimonial.content,
    sort_order: testimonial.sort_order,
    created_at: testimonial.created_at ?? null,
    updated_at: testimonial.updated_at ?? null,
  };
};

const getTestimonials = async () => {
  const rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM testimonials ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(mapTestimonial);
};

const getTestimonialById = async (id) => {
  const rows = await query(
    `SELECT ${SELECT_COLUMNS} FROM testimonials WHERE id = ?`,
    [id]
  );
  if (!rows.length) {
    throw new AppError("Testimonial not found", 404);
  }
  return mapTestimonial(rows[0]);
};

const createTestimonial = async (payload) => {
  const cleanPayload = sanitizeInput(payload);

  const result = await query(
    `INSERT INTO testimonials (client_name, company, content, sort_order)
     VALUES (?, ?, ?, ?)`,
    [
      cleanPayload.client_name,
      cleanPayload.company || null,
      cleanPayload.content,
      Number(cleanPayload.sort_order) || 0,
    ]
  );

  return getTestimonialById(result.insertId);
};

const updateTestimonial = async (id, payload) => {
  await getTestimonialById(id);
  const cleanPayload = sanitizeInput(payload);

  const fields = [];
  const values = [];
  const setField = (column, value) => {
    fields.push(`${column} = ?`);
    values.push(value);
  };

  if (cleanPayload.client_name !== undefined) setField("client_name", cleanPayload.client_name);
  if (cleanPayload.company !== undefined) setField("company", cleanPayload.company || null);
  if (cleanPayload.content !== undefined) setField("content", cleanPayload.content);
  if (cleanPayload.sort_order !== undefined) setField("sort_order", Number(cleanPayload.sort_order) || 0);

  if (!fields.length) {
    return getTestimonialById(id);
  }

  values.push(id);
  await query(
    `UPDATE testimonials SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );

  return getTestimonialById(id);
};

const deleteTestimonial = async (id) => {
  await getTestimonialById(id);
  await query("DELETE FROM testimonials WHERE id = ?", [id]);
};

module.exports = {
  getTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
};
