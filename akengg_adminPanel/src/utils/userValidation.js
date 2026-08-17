const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;
const ALLOWED_ROLES = ["admin", "employee"];

const trimValue = (value) => (typeof value === "string" ? value.trim() : value);

export function normalizeUserPayload(payload) {
  const normalizedPayload = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    const normalizedValue = trimValue(value);

    if (normalizedValue === "") {
      return;
    }

    if (key === "email" || key === "role") {
      normalizedPayload[key] = normalizedValue.toLowerCase();
      return;
    }

    normalizedPayload[key] = normalizedValue;
  });

  return normalizedPayload;
}

export function validateName(name, isRequired = false) {
  const normalizedName = trimValue(name);

  if (!normalizedName && isRequired) {
    return "Name is required";
  }

  if (normalizedName === undefined) {
    return "";
  }

  if (
    typeof normalizedName !== "string" ||
    normalizedName.length < 2 ||
    normalizedName.length > 100
  ) {
    return "Name must be between 2 and 100 characters";
  }

  return "";
}

export function validateEmail(email, isRequired = false) {
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : email;

  if (!normalizedEmail && isRequired) {
    return "A valid email is required";
  }

  if (normalizedEmail === undefined) {
    return "";
  }

  if (
    typeof normalizedEmail !== "string" ||
    normalizedEmail.length > 150 ||
    !EMAIL_REGEX.test(normalizedEmail)
  ) {
    return "Email must be valid and at most 150 characters";
  }

  return "";
}

export function validatePassword(password, isRequired = false) {
  const normalizedPassword = trimValue(password);

  if (!normalizedPassword && isRequired) {
    return "Password is required";
  }

  if (normalizedPassword === undefined) {
    return "";
  }

  if (
    typeof normalizedPassword !== "string" ||
    !PASSWORD_REGEX.test(normalizedPassword)
  ) {
    return "Password must be 8 to 64 characters and include uppercase, lowercase, and a number";
  }

  return "";
}

export function validatePhone(phone) {
  const normalizedPhone = trimValue(phone);

  if (normalizedPhone === undefined) {
    return "";
  }

  if (typeof normalizedPhone !== "string" || !PHONE_REGEX.test(normalizedPhone)) {
    return "Phone must be 10 to 15 digits and may start with +";
  }

  return "";
}

export function validateRole(role) {
  const normalizedRole =
    typeof role === "string" ? role.trim().toLowerCase() : role;

  if (normalizedRole === undefined) {
    return "";
  }

  if (typeof normalizedRole !== "string" || !ALLOWED_ROLES.includes(normalizedRole)) {
    return "Role must be either 'admin' or 'employee'";
  }

  return "";
}

export function validateCreateUserForm(formData) {
  const errors = {
    name: validateName(formData.name, true),
    email: validateEmail(formData.email, true),
    password: validatePassword(formData.password, true),
    phone: validatePhone(formData.phone),
    role: validateRole(formData.role),
    confirmPassword: "",
  };

  if (trimValue(formData.confirmPassword) !== trimValue(formData.password)) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
}

export function validateUpdateUserForm(formData) {
  return {
    name: validateName(formData.name),
    email: validateEmail(formData.email),
    phone: validatePhone(formData.phone),
    role: validateRole(formData.role),
  };
}

export function validateLoginForm(formData) {
  return {
    email: validateEmail(formData.email, true),
    password:
      !formData.password || typeof formData.password !== "string" || !formData.password.trim()
        ? "Password is required"
        : "",
  };
}

export function getFirstValidationError(errors) {
  return Object.values(errors).find(Boolean) || "";
}
