// src/utils/leadUtils.js
// ─────────────────────────────────────────────────────────────────────────
// Shared helpers for the Leads / Follow-ups module: enum label fallback,
// follow-up date bucketing, tel:/wa.me link builders, and the blob-download
// sequence used for CSV exports and lead file downloads.
//
// Date-only helpers (today-as-YYYY-MM-DD, display formatting) already live
// in src/utils/date.js — reused here rather than reimplemented.
// ─────────────────────────────────────────────────────────────────────────

import { getTodayDateInputValue, toDateInputValue } from "./date";

/**
 * Title-case, space-separated fallback for any raw enum string that isn't
 * (yet) present in one of the lookup tables in src/config/leadConfig.js —
 * e.g. "TECHNICAL_DISCUSSION" -> "Technical Discussion". Ensures an
 * unrecognized future enum value never renders as a raw ugly string.
 * @param {string} value
 * @returns {string}
 */
export const formatEnumLabel = (value) => {
  if (!value) return "";
  return String(value)
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getTomorrowDateInputValue = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateInputValue(tomorrow);
};

/**
 * True only when dateString is strictly earlier than today. Compares plain
 * YYYY-MM-DD strings lexicographically — never constructs a JS Date from a
 * bare date-only string and compares against "now", which would introduce
 * timezone-boundary bugs.
 * @param {string|null|undefined} dateString
 * @returns {boolean}
 */
export const isOverdue = (dateString) => {
  const normalized = toDateInputValue(dateString);
  if (!normalized) return false;
  return normalized < getTodayDateInputValue();
};

/**
 * True only when dateString exactly equals today's date.
 * @param {string|null|undefined} dateString
 * @returns {boolean}
 */
export const isDueToday = (dateString) => {
  const normalized = toDateInputValue(dateString);
  if (!normalized) return false;
  return normalized === getTodayDateInputValue();
};

/**
 * Buckets a follow-up date relative to today for grouping/badging in the
 * Follow-ups list. Tomorrow is computed via date arithmetic (setDate), not
 * string manipulation, so month/year boundaries roll over correctly.
 * @param {string|null|undefined} dateString
 * @returns {"overdue"|"today"|"tomorrow"|"upcoming"}
 */
export const followupBucket = (dateString) => {
  const normalized = toDateInputValue(dateString);
  if (!normalized) return "upcoming";

  const today = getTodayDateInputValue();
  if (normalized < today) return "overdue";
  if (normalized === today) return "today";
  if (normalized === getTomorrowDateInputValue()) return "tomorrow";
  return "upcoming";
};

/**
 * Builds a tel: URL for a phone string, stripping whitespace.
 * @param {string|null|undefined} phone
 * @returns {string} empty string when phone is falsy
 */
export const telHref = (phone) => {
  if (!phone) return "";
  return `tel:${String(phone).replace(/\s+/g, "")}`;
};

/**
 * Builds a https://wa.me/ deep link for a phone string.
 * - Strips all non-digit characters.
 * - A 10-digit result is assumed to be a bare Indian mobile number and gets
 *   "91" prefixed.
 * - Anything still under 10 digits after that is unusable -> returns null.
 * - A non-empty text is appended as a URL-encoded ?text= param.
 * @param {string|null|undefined} phone
 * @param {string} [text]
 * @returns {string|null}
 */
export const waHref = (phone, text) => {
  if (!phone) return null;

  let digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 10) return null;

  const base = `https://wa.me/${digits}`;
  if (text && String(text).trim() !== "") {
    return `${base}?text=${encodeURIComponent(text)}`;
  }
  return base;
};

/**
 * Saves an axios blob response (responseType: "blob") as a downloaded file.
 * Mirrors the exact object-URL + synthetic-anchor sequence used elsewhere in
 * this codebase (see Documents/DocumentsList.jsx) — required because these
 * endpoints need the Bearer auth header that only the shared axios instance
 * attaches, so a plain <a href> can't be used.
 * @param {{data: Blob}} axiosResponse
 * @param {string} filename
 */
export const downloadBlob = (axiosResponse, filename) => {
  const blob = axiosResponse?.data;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
