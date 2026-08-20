// Shared helpers for turning a raw phone-number-ish string into a working
// wa.me deep link. Kept dependency-free (no external phone-parsing library)
// so any component can build a WhatsApp link from whatever settings/config
// value it has on hand without guessing at formatting rules itself.
//
//   import { buildWaLink } from "../utils/whatsapp";
//   const link = buildWaLink(settings?.whatsapp_number, "Hi, I'd like a quote");
//   if (!link) return null; // hide the WhatsApp UI rather than emit a broken link

/**
 * Normalize a raw phone number string into the digits-only format wa.me
 * expects (country code + number, no "+", spaces, or punctuation).
 *
 * - Strips everything but digits.
 * - A bare 10-digit Indian mobile number (no country code) is assumed and
 *   prefixed with "91".
 * - An 11–15 digit number is assumed to already include a country code and
 *   is returned as-is.
 * - Anything else (empty, too short, too long) is treated as unusable and
 *   returns "" so callers can hide WhatsApp UI instead of linking to a
 *   broken number.
 *
 * @param {string} raw
 * @returns {string}
 */
export function normalizeWaNumber(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");

  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;

  return "";
}

/**
 * Build a https://wa.me/ link for the given number, optionally prefilled
 * with a message.
 *
 * @param {string} number - Raw phone number (any format).
 * @param {string} [text] - Prefilled message text.
 * @returns {string | null} The wa.me URL, or null if the number is unusable.
 */
export function buildWaLink(number, text) {
  const normalized = normalizeWaNumber(number);
  if (!normalized) return null;

  const base = `https://wa.me/${normalized}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
