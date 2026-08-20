import { PRODUCTS, TECH_FIELD_GROUPS, groupOf, FILE_RULES } from "../config/quoteFormConfig";

// Simple RFC-5322-lite email shape check — good enough to catch typos
// without rejecting valid real-world addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

const fileExt = (name = "") => {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
};

/**
 * Validate the "Request a Quote" form. Rules are checked in a fixed
 * priority order and each one only ever adds its own key to `errors` —
 * since JS preserves string-key insertion order, `Object.keys(errors)[0]`
 * (returned here as `firstErrorKey`) always matches the first rule that was
 * actually violated, so callers can toast/scroll to it without re-deriving
 * the priority order themselves.
 *
 * @param {object} form       scalar quote-form fields (contact_person, phone, email, ...)
 * @param {object} technical  product-specific technical fields, keyed by field name
 * @param {File[]} files      currently-selected attachments
 * @returns {{ errors: Record<string, string>, firstErrorKey: string|null }}
 */
export function validateQuote(form = {}, technical = {}, files = []) {
  const errors = {};

  // 1. product
  if (isBlank(form.product) || !PRODUCTS.some((p) => p.value === form.product)) {
    errors.product = "Please select a product or service.";
  }

  // 2. contact_person
  const contactPerson = String(form.contact_person || "").trim();
  if (!contactPerson) {
    errors.contact_person = "Please enter your name.";
  } else if (contactPerson.length < 2 || contactPerson.length > 100) {
    errors.contact_person = "Name should be between 2 and 100 characters.";
  }

  // 3. company_name
  const companyName = String(form.company_name || "").trim();
  if (!companyName) {
    errors.company_name = "Please enter your company name.";
  } else if (companyName.length < 2 || companyName.length > 200) {
    errors.company_name = "Company name should be between 2 and 200 characters.";
  }

  // 4. phone
  const phoneDigits = String(form.phone || "").replace(/\D/g, "");
  if (!phoneDigits) {
    errors.phone = "Please enter your phone number.";
  } else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    errors.phone = "Please enter a valid phone number (10-15 digits).";
  }

  // 5. email
  const email = String(form.email || "").trim();
  if (!email) {
    errors.email = "Please enter your email address.";
  } else if (!EMAIL_RE.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  // 6. requirement
  const requirement = String(form.requirement || "").trim();
  if (!requirement) {
    errors.requirement = "Please describe your requirement.";
  } else if (requirement.length < 10) {
    errors.requirement = "Please add a little more detail (at least 10 characters).";
  }

  // 7. required technical fields for the currently-selected product's group
  const group = groupOf(form.product);
  const fieldDefs = TECH_FIELD_GROUPS[group] || [];
  fieldDefs.forEach((field) => {
    if (!field.required) return;
    if (isBlank(technical ? technical[field.name] : undefined)) {
      errors[`technical_${field.name}`] = `Please provide ${field.label}.`;
    }
  });

  // 8. files — defensive re-check even though FileUpload.jsx already filters
  // at selection time (belt-and-braces against any state built another way).
  if (Array.isArray(files) && files.length > FILE_RULES.maxFiles) {
    errors.files = `You can attach up to ${FILE_RULES.maxFiles} files.`;
  } else if (Array.isArray(files)) {
    const maxBytes = FILE_RULES.maxSizeMB * 1024 * 1024;
    const badFile = files.find((file) => {
      const ext = fileExt(file?.name);
      const badType = !FILE_RULES.accept.includes(ext);
      const badSize = typeof file?.size === "number" && file.size > maxBytes;
      return badType || badSize;
    });

    if (badFile) {
      const ext = fileExt(badFile.name);
      errors.files = !FILE_RULES.accept.includes(ext)
        ? `"${badFile.name}" is not an accepted file type.`
        : `"${badFile.name}" exceeds the ${FILE_RULES.maxSizeMB}MB per-file limit.`;
    }
  }

  const keys = Object.keys(errors);
  return { errors, firstErrorKey: keys.length ? keys[0] : null };
}

export default validateQuote;
