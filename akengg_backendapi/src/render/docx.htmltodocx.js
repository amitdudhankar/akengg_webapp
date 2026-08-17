// src/render/docx.htmltodocx.js
// ─────────────────────────────────────────────────────────────────────────
// Word (.docx) renderer — a SIBLING of the Puppeteer PDF renderer. It consumes
// the SAME computed-document JSON and reuses the SAME Handlebars HTML
// (pdf.puppeteer.buildHtml), so Word output stays in lockstep with the PDF and
// there is no separate Word template to maintain. The HTML is converted to a
// .docx Buffer with html-to-docx.
//
// Contract mirrors the PDF renderer: renderDocx(documentJson) -> Promise<Buffer>.
//
// Two HTML adaptations are applied here (and ONLY here, so the PDF path is
// untouched):
//   1. Percentage column widths (e.g. <th style="width:4%">) are stripped —
//      html-to-docx's buildTableCellWidth throws on '%' cell widths. Word
//      auto-sizes the columns instead.
//   2. The DRAFT/CANCELLED diagonal watermark is a CSS ::before pseudo-element
//      that html-to-docx cannot render, so a visible status BANNER is injected
//      at the top of the page for non-finalized documents — a cancelled or
//      draft invoice must never look like a valid one in Word either.
// ─────────────────────────────────────────────────────────────────────────
const HTMLtoDOCX = require("html-to-docx");
const { buildHtml } = require("./pdf.puppeteer");

// Strip percentage widths from inline styles AND the <style> block (html-to-docx
// rejects '%' table-cell widths). The lookbehind keeps `min-width`/`max-width`
// intact; absolute (px) widths are left alone too.
const stripPercentWidths = (html) =>
  html.replace(/(?<![\w-])width:\s*\d+(?:\.\d+)?%\s*;?/gi, "");

// A visible banner for non-finalized docs (the CSS watermark doesn't survive the
// HTML→DOCX conversion). Inline-styled so it renders without the <style> block.
const statusBanner = (doc) => {
  const label = doc && doc.draft ? "DRAFT" : doc && doc.cancelled ? "CANCELLED" : null;
  if (!label) {
    return "";
  }
  return (
    `<div style="text-align:center;color:#dc2626;font-weight:700;font-size:18px;` +
    `border:2px solid #dc2626;padding:6px;margin-bottom:10px;letter-spacing:2px;">` +
    `${label} — NOT A VALID ${doc.cancelled ? "DOCUMENT" : "INVOICE"}</div>`
  );
};

// Inject the banner immediately inside the page container (first match only).
const injectBanner = (html, doc) => {
  const banner = statusBanner(doc);
  if (!banner) {
    return html;
  }
  if (html.includes('<div class="page">')) {
    return html.replace('<div class="page">', `<div class="page">${banner}`);
  }
  // Fallback: just after <body>.
  return html.replace(/<body[^>]*>/i, (m) => `${m}${banner}`);
};

const DOCX_OPTIONS = {
  font: "Arial",
  // 0.5in margins (twips: 1in = 1440).
  margins: { top: 720, right: 720, bottom: 720, left: 720 },
  table: { row: { cantSplit: true } },
  footer: true,
  pageNumber: true,
};

/**
 * Render a computed-document JSON payload to a .docx Buffer.
 * @param {Object} documentJson  same shape buildHtml/renderPdf consume
 * @param {Object} [options]     merged over DOCX_OPTIONS
 * @returns {Promise<Buffer>}
 */
const renderDocx = async (documentJson, options = {}) => {
  const baseHtml = buildHtml(documentJson || {});
  const html = stripPercentWidths(
    injectBanner(baseHtml, documentJson && documentJson.doc)
  );

  const result = await HTMLtoDOCX(html, null, { ...DOCX_OPTIONS, ...options });

  // html-to-docx returns a Buffer in Node, but a Blob on some versions/builds.
  if (Buffer.isBuffer(result)) {
    return result;
  }
  if (result && typeof result.arrayBuffer === "function") {
    return Buffer.from(await result.arrayBuffer());
  }
  return Buffer.from(result);
};

module.exports = {
  renderDocx,
  // exported for unit tests
  stripPercentWidths,
  statusBanner,
};
