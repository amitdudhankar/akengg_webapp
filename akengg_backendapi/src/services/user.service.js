const bcrypt = require("bcryptjs");
const query = require("../utils/db");
const AppError = require("../utils/appError");
const jwt = require("jsonwebtoken");

const USER_COLUMNS = [
  "id",
  "name",
  "email",
  "phone",
  "role",
  "created_at",
  "updated_at",
];

const sanitizeUserInput = (payload) => {
  const cleanPayload = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (typeof value !== "string") {
      cleanPayload[key] = value;
      return;
    }

    const normalizedValue = value.trim();

    if (key === "email" || key === "role") {
      cleanPayload[key] = normalizedValue.toLowerCase();
      return;
    }

    cleanPayload[key] = normalizedValue;
  });

  return cleanPayload;
};

const mapUser = (user) => {
  if (!user) {
    return null;
  }

  return USER_COLUMNS.reduce((accumulator, column) => {
    accumulator[column] = user[column] ?? null;
    return accumulator;
  }, {});
};

const getUsers = async () => {
  const rows = await query(
    `SELECT ${USER_COLUMNS.join(", ")}
     FROM users
     ORDER BY id DESC`
  );

  return rows.map(mapUser);
};

const getUserById = async (id) => {
  const rows = await query(
    `SELECT ${USER_COLUMNS.join(", ")}
     FROM users
     WHERE id = ?`,
    [id]
  );

  if (!rows.length) {
    throw new AppError("User not found", 404);
  }

  return mapUser(rows[0]);
};

const getUserByEmailWithPassword = async (email) => {
  const rows = await query(
    `SELECT id, name, email, password, phone, role, created_at, updated_at
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  return rows[0] || null;
};

const ensureEmailIsUnique = async (email, userId) => {
  if (!email) {
    return;
  }

  const rows = await query(
    "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
    [email, userId || 0]
  );

  if (rows.length) {
    throw new AppError("Email is already in use", 409);
  }
};

const createUser = async (payload) => {
  const cleanPayload = sanitizeUserInput(payload);
  await ensureEmailIsUnique(cleanPayload.email);

  const hashedPassword = await bcrypt.hash(cleanPayload.password, 10);

  const result = await query(
    `INSERT INTO users (name, email, password, phone, role)
     VALUES (?, ?, ?, ?, ?)`,
    [
      cleanPayload.name,
      cleanPayload.email,
      hashedPassword,
      cleanPayload.phone || null,
      cleanPayload.role || "employee",
    ]
  );

  return getUserById(result.insertId);
};

const updateUser = async (id, payload) => {
  await getUserById(id);

  const cleanPayload = sanitizeUserInput(payload);
  await ensureEmailIsUnique(cleanPayload.email, id);

  if (cleanPayload.password) {
    cleanPayload.password = await bcrypt.hash(cleanPayload.password, 10);
  }

  const fields = [];
  const values = [];

  Object.entries(cleanPayload).forEach(([key, value]) => {
    fields.push(`${key} = ?`);
    values.push(value);
  });

  values.push(id);

  await query(
    `UPDATE users
     SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    values
  );

  return getUserById(id);
};

const deleteUser = async (id) => {
  await getUserById(id);

  await query("DELETE FROM users WHERE id = ?", [id]);
};

const loginUser = async ({ email, password }) => {
  const user = await getUserByEmailWithPassword(email.trim().toLowerCase());

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.SECRET_JWT_KEY,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );

  return {
    token,
    user: mapUser(user),
  };
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
};
