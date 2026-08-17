const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const ALLOWED_STATUS = ["new", "contacted", "closed"];

const trimValue = (value) => (typeof value === "string" ? value.trim() : value);

export function normalizeContactPayload(payload) {
  const normalizedPayload = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    const normalizedValue = trimValue(value);

    if (normalizedValue === "") {
      return;
    }

    if (key === "email" || key === "status") {
      normalizedPayload[key] = normalizedValue.toLowerCase();
      return;
    }

    normalizedPayload[key] = normalizedValue;
  });

  return normalizedPayload;
}

export function validateContactName(name) {
  const normalizedName = trimValue(name);

  if (normalizedName === undefined) {
    return "";
  }

  if (!normalizedName) {
    return "Name is required";
  }

  if (normalizedName.length < 2 || normalizedName.length > 100) {
    return "Name must be between 2 and 100 characters";
  }

  return "";
}

export function validateContactNumber(number) {
  const normalizedNumber = trimValue(number);

  if (normalizedNumber === undefined) {
    return "";
  }

  if (!normalizedNumber) {
    return "Number is required";
  }

  if (!PHONE_REGEX.test(normalizedNumber)) {
    return "Number must be 10 to 15 digits and may start with +";
  }

  return "";
}

export function validateContactEmail(email) {
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : email;

  if (normalizedEmail === undefined) {
    return "";
  }

  if (!normalizedEmail) {
    return "A valid email is required";
  }

  if (normalizedEmail.length > 150 || !EMAIL_REGEX.test(normalizedEmail)) {
    return "Email must be valid and at most 150 characters";
  }

  return "";
}

export function validateContactMessage(message) {
  const normalizedMessage = trimValue(message);

  if (normalizedMessage === undefined) {
    return "";
  }

  if (!normalizedMessage) {
    return "Message is required";
  }

  if (normalizedMessage.length < 10 || normalizedMessage.length > 2000) {
    return "Message must be between 10 and 2000 characters";
  }

  return "";
}

export function validateContactStatus(status) {
  const normalizedStatus =
    typeof status === "string" ? status.trim().toLowerCase() : status;

  if (normalizedStatus === undefined) {
    return "";
  }

  if (!normalizedStatus) {
    return "Status is required";
  }

  if (!ALLOWED_STATUS.includes(normalizedStatus)) {
    return "Status must be one of 'new', 'contacted', or 'closed'";
  }

  return "";
}

export function validateContactUpdateForm(formData) {
  return {
    name: validateContactName(formData.name),
    number: validateContactNumber(formData.number),
    email: validateContactEmail(formData.email),
    message: validateContactMessage(formData.message),
    status: validateContactStatus(formData.status),
  };
}

export function getFirstContactError(errors) {
  return Object.values(errors).find(Boolean) || "";
}
