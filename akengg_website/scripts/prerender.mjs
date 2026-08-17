// Build-time pre-rendering for the SPA. After `vite build`, this serves the
// built dist with `vite preview`, visits each route with headless Chromium,
// and writes the fully-rendered HTML to dist/<route>/index.html. Crawlers and
// social scrapers then get real content (incl. the <Seo> head tags) instead of
// an empty #root shell; the SPA still hydrates for real users.
//
// It renders the FALLBACK content (the API may be unreachable at build time),
// which is exactly what we want for stable, indexable HTML. Run via
// `npm run build:seo` (vite build && this).
import { preview } from "vite";
import puppeteer from "puppeteer";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist");
const PORT = 4178;

// Static routes to pre-render. Dynamic /blogs/:id pages are served by the SPA
// fallback (and indexed after Google renders them); add specific IDs here if
// you want them statically pre-rendered too.
//
// NOTE: "/" is rendered LAST. Writing it earlier would overwrite dist/index.html
// (which doubles as the SPA fallback served for the other routes), leaking the
// home page's <head> into every page.
const ROUTES = [
  "/about",
  "/services",
  "/projects",
  "/contact",
  "/blogs",
  "/faq",
  "/privacy-policy",
  "/terms",
  "/",
];

const server = await preview({ preview: { port: PORT, strictPort: true } });
const base = `http://localhost:${PORT}`;
const browser = await puppeteer.launch({
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

let failures = 0;
try {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    try {
      await page.goto(base + route, { waitUntil: "networkidle2", timeout: 45000 });
      // Wait until React has rendered something into #root.
      await page
        .waitForFunction(
          () => {
            const r = document.getElementById("root");
            return r && r.children.length > 0;
          },
          { timeout: 15000 }
        )
        .catch(() => {});

      // De-duplicate <head> SEO tags. A client (createRoot) render appends its
      // title/meta/canonical without removing the static shell defaults, so we
      // keep only the LAST <title> and the last of each meta[name]/meta[property]/
      // canonical — i.e. the page-specific ones React rendered.
      await page.evaluate(() => {
        const head = document.head;
        const titles = [...head.querySelectorAll("title")];
        titles.slice(0, -1).forEach((t) => t.remove());

        const seen = new Set();
        const tags = [
          ...head.querySelectorAll('meta[name], meta[property], link[rel="canonical"]'),
        ].reverse();
        for (const el of tags) {
          const key =
            el.getAttribute("name") ||
            el.getAttribute("property") ||
            `link:${el.getAttribute("rel")}`;
          if (!key) continue;
          if (seen.has(key)) el.remove();
          else seen.add(key);
        }
      });

      const html = await page.content();
      const outDir = route === "/" ? distDir : join(distDir, route.replace(/^\//, ""));
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, "index.html"), html, "utf8");
      console.log(`✓ prerendered ${route} (${html.length} bytes)`);
    } catch (err) {
      failures += 1;
      console.error(`✗ failed ${route}: ${err.message}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

console.log(failures ? `Prerender finished with ${failures} failure(s).` : "Prerender complete.");
process.exit(failures ? 1 : 0);
