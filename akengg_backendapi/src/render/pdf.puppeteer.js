// src/render/pdf.puppeteer.js
// ─────────────────────────────────────────────────────────────────────────
// PDF render pipeline — Puppeteer (headless Chromium) + Handlebars.
//
// Two layers:
//   1. renderHtmlToPdf(html, options) — low-level: takes ready HTML, returns a
//      PDF Buffer. Uses a SINGLE shared browser (lazy singleton) so we pay the
//      Chromium launch cost once per process; each render gets a fresh page
//      which is closed afterwards (the browser stays warm).
//   2. renderer.renderPdf(documentJson) — high-level interface: compiles the
//      Handlebars base template (with partials) against the computed document
//      JSON, then delegates to renderHtmlToPdf. This is the contract every
//      caller (documentPdf.service, future Word renderer) conforms to.
//
// The base template + partials are generic; the per-type body partial is
// chosen by documentJson.doc.bodyPartial, so Phase 2 adds Quotation / Proforma
// / Purchase Order by registering a new body partial — no change here.
// ─────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const Handlebars = require("handlebars");

const TEMPLATES_DIR = path.join(__dirname, "templates");
const PARTIALS_DIR = path.join(TEMPLATES_DIR, "partials");

// ── Handlebars helpers ─────────────────────────────────────────────────────
// Indian-format money with the Rupee glyph. Falls back gracefully to "0.00".
const formatINR = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

let helpersRegistered = false;
const registerHelpers = () => {
  if (helpersRegistered) {
    return;
  }

  // ₹ amount (the template font stack renders U+20B9; "₹" is prefixed here).
  Handlebars.registerHelper("inr", (value) => `₹ ${formatINR(value)}`);

  // Quantity with up to 3 decimals, trailing zeros trimmed.
  Handlebars.registerHelper("qty", (value) => {
    const n = Number(value) || 0;
    return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(3)));
  });

  // Percentage with a trailing % (e.g. 9 -> "9%", 2.5 -> "2.5%").
  Handlebars.registerHelper("pct", (value) => {
    const n = Number(value) || 0;
    return `${parseFloat(n.toFixed(2))}%`;
  });

  // 1-based index for {{#each}} rows.
  Handlebars.registerHelper("inc", (index) => Number(index) + 1);

  // Equality for {{#if (eq a b)}}.
  Handlebars.registerHelper("eq", (a, b) => a === b);

  // Newlines -> <br> for free-text blocks (terms/declaration). Escapes HTML
  // first so user text can't inject markup, then converts the newlines.
  Handlebars.registerHelper("nl2br", (text) => {
    const escaped = Handlebars.escapeExpression(text == null ? "" : text);
    return new Handlebars.SafeString(escaped.replace(/\r?\n/g, "<br/>"));
  });

  helpersRegistered = true;
};

// ── Template loading / compilation ─────────────────────────────────────────
let compiledBase = null;
let partialsRegistered = false;

const registerPartials = () => {
  if (partialsRegistered) {
    return;
  }

  const files = fs
    .readdirSync(PARTIALS_DIR)
    .filter((file) => file.endsWith(".hbs"));

  files.forEach((file) => {
    const name = path.basename(file, ".hbs");
    const source = fs.readFileSync(path.join(PARTIALS_DIR, file), "utf8");
    Handlebars.registerPartial(name, source);
  });

  partialsRegistered = true;
};

const getCompiledBase = () => {
  registerHelpers();
  registerPartials();

  if (!compiledBase) {
    const source = fs.readFileSync(path.join(TEMPLATES_DIR, "base.hbs"), "utf8");
    compiledBase = Handlebars.compile(source);
  }

  return compiledBase;
};

/**
 * Build the full HTML document for a computed-document JSON payload.
 * @param {Object} documentJson { doc, seller, party, items, totals, hsnSummary }
 * @returns {string} HTML
 */
const buildHtml = (documentJson) => {
  const template = getCompiledBase();
  return template(documentJson || {});
};

// ── Shared browser singleton ───────────────────────────────────────────────
let browserPromise = null;

/**
 * Lazily launch (once) and reuse a single headless Chromium instance. The
 * launch args make it portable in Docker (no /dev/shm, no sandbox).
 * @returns {Promise<import('puppeteer').Browser>}
 */
const getBrowser = async () => {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      })
      .catch((err) => {
        // Reset so a later call can retry a failed launch.
        browserPromise = null;
        throw err;
      });
  }

  return browserPromise;
};

/**
 * Close the shared browser (e.g. on graceful shutdown). Safe to call when no
 * browser was ever launched.
 * @returns {Promise<void>}
 */
const closeBrowser = async () => {
  if (browserPromise) {
    const browser = await browserPromise.catch(() => null);
    browserPromise = null;
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};

/**
 * Render ready HTML to a PDF Buffer using the shared browser. A fresh page is
 * created and closed per render; the browser is kept warm.
 *
 * @param {string} html
 * @param {Object} [options]
 * @param {string} [options.footerText] override the default "Page X of Y" footer
 * @param {Object} [options.margin] page margins
 * @returns {Promise<Buffer>}
 */
const renderHtmlToPdf = async (html, options = {}) => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: "networkidle0" });

    const footerText =
      options.footerText ||
      'Page <span class="pageNumber"></span> of <span class="totalPages"></span>';

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      margin: options.margin || {
        top: "14mm",
        bottom: "16mm",
        left: "10mm",
        right: "10mm",
      },
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="width:100%; font-size:8px; color:#6b7280; padding:0 10mm;">' +
        '<span style="float:right;">' +
        footerText +
        "</span></div>",
    });

    // page.pdf() may return a Uint8Array on newer puppeteer — normalize to Buffer.
    return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
  } finally {
    await page.close().catch(() => {});
  }
};

/**
 * Renderer interface: build HTML from templates, then render to PDF.
 * Every PDF consumer goes through this so the template/engine stays swappable.
 */
const renderer = {
  /**
   * @param {Object} documentJson computed document JSON (see buildHtml)
   * @param {Object} [options] forwarded to renderHtmlToPdf
   * @returns {Promise<Buffer>} the rendered PDF
   */
  renderPdf: async (documentJson, options = {}) => {
    const html = buildHtml(documentJson);
    return renderHtmlToPdf(html, options);
  },
};

module.exports = {
  renderHtmlToPdf,
  renderer,
  renderPdf: renderer.renderPdf,
  buildHtml,
  getBrowser,
  closeBrowser,
};
