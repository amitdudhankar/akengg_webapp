const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (value) => String(value).padStart(2, "0");

const localDateParts = (date) => ({
  year: date.getFullYear(),
  month: pad2(date.getMonth() + 1),
  day: pad2(date.getDate()),
});

export const toDateInputValue = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (DATE_ONLY_RE.test(trimmed)) return trimmed;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const { year, month, day } = localDateParts(date);
  return `${year}-${month}-${day}`;
};

export const getTodayDateInputValue = () => toDateInputValue(new Date());

export const formatDateDisplay = (
  value,
  locale = "en-GB",
  options = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }
) => {
  const normalized = toDateInputValue(value);
  if (!normalized) return "";

  const [year, month, day] = normalized.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(locale, options);
};

export const dateSortValue = (value) => {
  const normalized = toDateInputValue(value);
  if (!normalized) return 0;

  const [year, month, day] = normalized.split("-").map(Number);
  return new Date(year, month - 1, day).getTime();
};
