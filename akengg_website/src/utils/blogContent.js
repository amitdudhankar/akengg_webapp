// src/utils/blogContent.js
// ─────────────────────────────────────────────────────────────────────────
// Blog bodies are authored in the admin panel's Jodit rich-text editor, so
// blogs.content holds real HTML ("<p><span>…</span></p>"), not plain text.
// Rendering it with {content} makes React escape it and print the tags on the
// page, so it has to go through dangerouslySetInnerHTML — which means it must
// be sanitized first.
//
// Authors are authenticated staff, so this is not the usual hostile-input
// case, but a compromised employee account would otherwise be able to run
// script in every public visitor's browser. Sanitizing keeps that contained.
// ─────────────────────────────────────────────────────────────────────────
import DOMPurify from "dompurify";

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Does this look like markup rather than plain prose? */
const looksLikeHtml = (value) => /<[a-z][\s\S]*>/i.test(value);

/**
 * Plain text -> paragraphs. Used for the hardcoded fallback post (and any
 * legacy row saved before the rich-text editor was introduced), which is
 * blank-line separated prose.
 */
const textToHtml = (text) =>
  String(text)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");

/**
 * Turn stored blog content into HTML that is safe to inject.
 * @param {string} content raw value from blogs.content
 * @returns {string} sanitized HTML ("" when there is nothing to show)
 */
export const toSafeHtml = (content) => {
  if (!content) {
    return "";
  }

  const html = looksLikeHtml(content) ? content : textToHtml(content);

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    // Jodit emits these; keep them so authored formatting survives.
    ADD_ATTR: ["target", "rel", "colspan", "rowspan", "loading"],
    FORBID_TAGS: ["style", "script", "iframe", "form", "input", "button"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "srcset"],
  });
};

/**
 * Strip markup down to readable prose for <meta description> and JSON-LD,
 * where raw tags would otherwise leak into search results.
 *
 * Deliberately regex-based rather than DOM-based: this runs during the
 * Puppeteer prerender pass too, and it only ever feeds a truncated meta string.
 *
 * @param {string} content
 * @param {number} [maxLength=155]
 * @returns {string|undefined}
 */
export const toExcerpt = (content, maxLength = 155) => {
  if (!content) {
    return undefined;
  }

  const text = String(content)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return undefined;
  }

  if (text.length <= maxLength) {
    return text;
  }

  // Trim at a word boundary so the description doesn't end mid-word.
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};
