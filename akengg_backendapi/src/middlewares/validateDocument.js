// src/middlewares/validateDocument.js
// Request validation for the document builder. Mirrors validateBlog style:
// each guard throws AppError(msg, 400) and forwards to next(error).
const AppError = require("../utils/appError");

const DOC_TYPES = ["quotation", "proforma", "purchase_order", "tax_invoice"];
const TAX_TREATMENTS = ["exclusive", "inclusive", "no_tax"];
const DISCOUNT_TYPES = ["percent", "amount"];
const KINDS = ["goods", "service"];

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isValidDate = (value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return false;
  }
  const time = new Date(value).getTime();
  return !Number.isNaN(time);
};

const isFiniteNumber = (value) =>
  value !== "" && value !== null && Number.isFinite(Number(value));

// Validate the shared body shape used by both create and update. `requireType`
// is false on update (doc_type may be omitted to keep the existing type).
const validateDocumentBody = (body, { requireType }) => {
  if (!isPlainObject(body)) {
    throw new AppError("Request body must be a valid JSON object", 400);
  }

  // doc_type
  if (requireType || body.doc_type !== undefined) {
    if (!DOC_TYPES.includes(body.doc_type)) {
      throw new AppError(
        `doc_type must be one of: ${DOC_TYPES.join(", ")}`,
        400
      );
    }
  }

  // doc_date (required)
  if (!isValidDate(body.doc_date)) {
    throw new AppError("doc_date is required and must be a valid date", 400);
  }

  // due_date (optional)
  if (
    body.due_date !== undefined &&
    body.due_date !== null &&
    body.due_date !== "" &&
    !isValidDate(body.due_date)
  ) {
    throw new AppError("due_date must be a valid date", 400);
  }

  // tax_treatment (optional)
  if (
    body.tax_treatment !== undefined &&
    !TAX_TREATMENTS.includes(body.tax_treatment)
  ) {
    throw new AppError(
      `tax_treatment must be one of: ${TAX_TREATMENTS.join(", ")}`,
      400
    );
  }

  // place_of_supply_code (optional; 2-char GST state code if supplied)
  if (
    body.place_of_supply_code !== undefined &&
    body.place_of_supply_code !== null &&
    body.place_of_supply_code !== "" &&
    !/^[0-9]{2}$/.test(String(body.place_of_supply_code))
  ) {
    throw new AppError(
      "place_of_supply_code must be a 2-digit GST state code",
      400
    );
  }

  // party_id (optional positive integer)
  if (
    body.party_id !== undefined &&
    body.party_id !== null &&
    body.party_id !== ""
  ) {
    const partyId = Number(body.party_id);
    if (!Number.isInteger(partyId) || partyId <= 0) {
      throw new AppError("party_id must be a positive integer", 400);
    }
  }

  // items (required, non-empty array)
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new AppError("At least one line item is required", 400);
  }

  body.items.forEach((line, index) => {
    const position = index + 1;

    if (!isPlainObject(line)) {
      throw new AppError(`Line item ${position} must be an object`, 400);
    }

    if (
      line.name !== undefined &&
      line.name !== null &&
      typeof line.name !== "string"
    ) {
      throw new AppError(`Line item ${position}: name must be a string`, 400);
    }

    if (!isFiniteNumber(line.qty) || Number(line.qty) <= 0) {
      throw new AppError(
        `Line item ${position}: qty must be a number greater than 0`,
        400
      );
    }

    if (!isFiniteNumber(line.rate) || Number(line.rate) < 0) {
      throw new AppError(
        `Line item ${position}: rate must be a number of 0 or more`,
        400
      );
    }

    if (
      !isFiniteNumber(line.gst_rate) ||
      Number(line.gst_rate) < 0 ||
      Number(line.gst_rate) > 100
    ) {
      throw new AppError(
        `Line item ${position}: gst_rate must be between 0 and 100`,
        400
      );
    }

    if (
      line.discount_type !== undefined &&
      line.discount_type !== null &&
      !DISCOUNT_TYPES.includes(line.discount_type)
    ) {
      throw new AppError(
        `Line item ${position}: discount_type must be 'percent' or 'amount'`,
        400
      );
    }

    if (
      line.discount_value !== undefined &&
      line.discount_value !== null &&
      line.discount_value !== "" &&
      (!isFiniteNumber(line.discount_value) || Number(line.discount_value) < 0)
    ) {
      throw new AppError(
        `Line item ${position}: discount_value must be 0 or more`,
        400
      );
    }

    if (
      line.kind !== undefined &&
      line.kind !== null &&
      !KINDS.includes(line.kind)
    ) {
      throw new AppError(
        `Line item ${position}: kind must be 'goods' or 'service'`,
        400
      );
    }
  });
};

const validateCreate = (req, res, next) => {
  try {
    validateDocumentBody(req.body, { requireType: true });
    next();
  } catch (error) {
    next(error);
  }
};

const validateUpdate = (req, res, next) => {
  try {
    validateDocumentBody(req.body, { requireType: false });
    next();
  } catch (error) {
    next(error);
  }
};

const validateDocumentId = (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Document id must be a positive integer", 400);
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Convert body: target_type must be a known doc type (syntactic check, 400).
// Whether the source may actually become that type (the conversion matrix) is a
// business rule enforced in document.service (422).
const validateConvert = (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      throw new AppError("Request body must be a valid JSON object", 400);
    }
    if (!DOC_TYPES.includes(req.body.target_type)) {
      throw new AppError(
        `target_type must be one of: ${DOC_TYPES.join(", ")}`,
        400
      );
    }
    next();
  } catch (error) {
    next(error);
  }
};

const validateNextNumberQuery = (req, res, next) => {
  try {
    if (!DOC_TYPES.includes(req.query.doc_type)) {
      throw new AppError(
        `doc_type must be one of: ${DOC_TYPES.join(", ")}`,
        400
      );
    }
    if (
      req.query.doc_date !== undefined &&
      req.query.doc_date !== "" &&
      !isValidDate(req.query.doc_date)
    ) {
      throw new AppError("doc_date must be a valid date", 400);
    }
    next();
  } catch (error) {
    next(error);
  }
};

const validateListQuery = (req, res, next) => {
  try {
    const { type, status, page, limit } = req.query;

    if (type !== undefined && type !== "" && !DOC_TYPES.includes(type)) {
      throw new AppError(`type must be one of: ${DOC_TYPES.join(", ")}`, 400);
    }

    if (
      status !== undefined &&
      status !== "" &&
      !["draft", "finalized", "cancelled"].includes(status)
    ) {
      throw new AppError(
        "status must be one of: draft, finalized, cancelled",
        400
      );
    }

    if (page !== undefined) {
      const parsedPage = Number(page);
      if (!Number.isInteger(parsedPage) || parsedPage <= 0) {
        throw new AppError("page must be a positive integer", 400);
      }
    }

    if (limit !== undefined) {
      const parsedLimit = Number(limit);
      if (
        !Number.isInteger(parsedLimit) ||
        parsedLimit <= 0 ||
        parsedLimit > 100
      ) {
        throw new AppError("limit must be a positive integer up to 100", 400);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateCreate,
  validateUpdate,
  validateDocumentId,
  validateConvert,
  validateNextNumberQuery,
  validateListQuery,
};
