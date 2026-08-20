// Generates public/sitemap.xml from the site's static routes plus the LIVE blog
// list pulled from the API.
//
//   node scripts/generate-sitemap.mjs            # warns but never fails the build
//   node scripts/generate-sitemap.mjs --strict   # exit 1 if the blogs can't be fetched
//
// Run BEFORE `vite build` so the fresh file is copied into dist/ along with the
// rest of public/. If dist/ already exists it is written too, so running after a
// build also works.
//
// <lastmod> is emitted only where the date is genuinely known:
//   /blogs/:slug      -> that row's updated_at (falling back to created_at)
//   /industries/:slug -> same, from the industries endpoint
//   /projects/:slug   -> same, from the projects endpoint
//   listing pages     -> the newest date among their own entries
//   static pages -> git commit date of the page source + its direct local imports
// A route with no reliable date gets no <lastmod> at all. Google ignores lastmod
// once it decides a site's values are untrustworthy, so stamping every URL with
// "today" on each deploy would be worse than omitting it.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const strict = process.argv.includes("--strict");

// Vite loads .env itself; plain node does not. The deploy workflow writes that
// file immediately before building, so it is where the production URLs live.
// A real environment variable always wins over the file.
function loadEnvFile() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const match = /^\s*([\w.-]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}
loadEnvFile();

const SITE_URL = (process.env.VITE_SITE_URL || "https://www.akengg.in").replace(/\/+$/, "");
const API_BASE = (
  process.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1"
).replace(/\/+$/, "");

// Mirrors src/routes.jsx. `source` is the page component; its direct local
// imports are walked too, so a change to Hero.jsx moves the home page's date.
const STATIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0", source: "src/Pages/Home.jsx" },
  { path: "/about", changefreq: "monthly", priority: "0.8", source: "src/Pages/AboutUs.jsx" },
  { path: "/services", changefreq: "monthly", priority: "0.9", source: "src/Pages/Services.jsx" },
  { path: "/projects", changefreq: "monthly", priority: "0.8", source: "src/Pages/Projects.jsx" },
  { path: "/industries", changefreq: "monthly", priority: "0.8", source: "src/Pages/Industries.jsx" },
  { path: "/blogs", changefreq: "weekly", priority: "0.7", source: "src/Pages/BlogListing.jsx" },
  { path: "/faq", changefreq: "monthly", priority: "0.6", source: "src/Pages/Faq.jsx" },
  { path: "/contact", changefreq: "yearly", priority: "0.7", source: "src/Pages/Contact.jsx" },
  { path: "/request-quote", changefreq: "monthly", priority: "0.9", source: "src/Pages/RequestQuote/RequestQuote.jsx" },
  { path: "/ibr-steam-boiler", changefreq: "monthly", priority: "0.8", source: "src/content/services/ibr-steam-boiler.js" },
  { path: "/non-ibr-steam-boiler", changefreq: "monthly", priority: "0.8", source: "src/content/services/non-ibr-steam-boiler.js" },
  { path: "/industrial-steam-boiler", changefreq: "monthly", priority: "0.8", source: "src/content/services/industrial-steam-boiler.js" },
  { path: "/thermic-fluid-heater", changefreq: "monthly", priority: "0.8", source: "src/content/services/thermic-fluid-heater.js" },
  { path: "/hot-water-generator", changefreq: "monthly", priority: "0.8", source: "src/content/services/hot-water-generator.js" },
  { path: "/industrial-piping", changefreq: "monthly", priority: "0.8", source: "src/content/services/industrial-piping.js" },
  { path: "/industrial-fabrication", changefreq: "monthly", priority: "0.8", source: "src/content/services/industrial-fabrication.js" },
  { path: "/pollution-control-equipment", changefreq: "monthly", priority: "0.8", source: "src/content/services/pollution-control-equipment.js" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3", source: "src/Pages/PrivacyPolicy.jsx" },
  { path: "/terms", changefreq: "yearly", priority: "0.3", source: "src/Pages/Terms.jsx" },
];

// The API caps `limit` at 100 (validateBlogListQuery), so large blog sets page.
const PAGE_SIZE = 100;
const MAX_PAGES = 50;
const FETCH_TIMEOUT_MS = 15000;

// ── dates ───────────────────────────────────────────────────────────────────
const toIso = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const newestIso = (values) => {
  const times = values.filter(Boolean).map((value) => new Date(value).getTime());
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
};

// ── git ─────────────────────────────────────────────────────────────────────
let gitUsable = true;

function gitLastCommitDate(file) {
  if (!gitUsable) return null;
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", file], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return toIso(out);
  } catch {
    // Not a repo, or git is missing. Stop shelling out for every file.
    gitUsable = false;
    return null;
  }
}

// ── source walking ──────────────────────────────────────────────────────────
const IMPORT_RE = /from\s+["'](\.[^"']+)["']/g;
const EXTENSIONS = ["", ".jsx", ".js", "/index.jsx", "/index.js"];

const asFile = (path) => {
  try {
    return statSync(path).isFile() ? path : null;
  } catch {
    return null;
  }
};

function resolveLocalImport(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  for (const extension of EXTENSIONS) {
    const found = asFile(base + extension);
    if (found) return found;
  }
  return null;
}

// The page file plus one level of local imports. Deliberately shallow: this is a
// heuristic for "did this page change", not a build graph.
function sourceFilesFor(relativePath) {
  const entry = asFile(join(root, relativePath));
  if (!entry) return [];
  const files = new Set([entry]);
  for (const [, spec] of readFileSync(entry, "utf8").matchAll(IMPORT_RE)) {
    const resolved = resolveLocalImport(entry, spec);
    if (resolved) files.add(resolved);
  }
  return [...files];
}

// ── blogs ───────────────────────────────────────────────────────────────────
async function fetchAllBlogs() {
  const all = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= MAX_PAGES) {
    const url = `${API_BASE}/blogs?limit=${PAGE_SIZE}&page=${page}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);

    const body = await res.json();
    const blogs = Array.isArray(body?.blogs) ? body.blogs : [];
    all.push(...blogs);
    totalPages = Number(body?.totalPages) || 1;
    // Guard against a server that ignores paging and would loop forever.
    if (!blogs.length) break;
    page += 1;
  }

  return all;
}

// ── industries & projects ───────────────────────────────────────────────────
// Both endpoints return the whole published, ordered collection in one shot
// inside the standard { message, data } envelope - no paging to unwind.
async function fetchCollection(path) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);

  const body = await res.json();
  if (Array.isArray(body?.data)) return body.data;
  return Array.isArray(body) ? body : [];
}

// Only slug URLs are emitted: a row the owner has not slugged yet has no
// canonical detail URL to point a crawler at.
const detailEntries = (rows, prefix, priority) =>
  rows
    .filter((row) => row && row.slug)
    .map((row) => ({
      loc: `${SITE_URL}${prefix}/${encodeURIComponent(row.slug)}`,
      lastmod: toIso(row.updated_at) || toIso(row.created_at),
      changefreq: "monthly",
      priority,
    }));

// ── xml ─────────────────────────────────────────────────────────────────────
const xmlEscape = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function urlEntry({ loc, lastmod, changefreq, priority }) {
  const lines = [`    <loc>${xmlEscape(loc)}</loc>`];
  if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) lines.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${lines.join("\n")}\n  </url>`;
}

// ── main ────────────────────────────────────────────────────────────────────
let blogs = [];
let blogError = null;
try {
  blogs = await fetchAllBlogs();
} catch (error) {
  blogError = error;
}

// Same tolerance as the blogs above: an unreachable API costs those URLs, it
// never fails the build (unless --strict was asked for).
let industries = [];
let industryError = null;
try {
  industries = await fetchCollection("/industries");
} catch (error) {
  industryError = error;
}

let projects = [];
let projectError = null;
try {
  projects = await fetchCollection("/projects");
} catch (error) {
  projectError = error;
}

const blogEntries = blogs
  .filter((blog) => blog && blog.id !== undefined && blog.id !== null)
  .map((blog) => ({
    loc: `${SITE_URL}/blogs/${encodeURIComponent(blog.slug || blog.id)}`,
    lastmod: toIso(blog.updated_at) || toIso(blog.created_at),
    changefreq: "monthly",
    priority: "0.6",
  }));

const industryEntries = detailEntries(industries, "/industries", "0.7");
const projectEntries = detailEntries(projects, "/projects", "0.6");

// A listing page changes whenever one of the things it lists does.
const LISTING_DATES = {
  "/blogs": newestIso(blogEntries.map((entry) => entry.lastmod)),
  "/industries": newestIso(industryEntries.map((entry) => entry.lastmod)),
  "/projects": newestIso(projectEntries.map((entry) => entry.lastmod)),
};

const staticEntries = STATIC_ROUTES.map((route) => {
  const gitDate = newestIso(sourceFilesFor(route.source).map(gitLastCommitDate));
  return {
    loc: `${SITE_URL}${route.path}`,
    lastmod: LISTING_DATES[route.path] || gitDate,
    changefreq: route.changefreq,
    priority: route.priority,
  };
});

const entries = [...staticEntries, ...blogEntries, ...industryEntries, ...projectEntries];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/generate-sitemap.mjs - do not edit by hand.
     Regenerate with \`npm run sitemap\` (also runs as part of \`npm run build:seo\`). -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(urlEntry).join("\n")}
</urlset>
`;

const fetchErrors = [
  ["blog", blogError],
  ["industry", industryError],
  ["project", projectError],
].filter(([, error]) => error);

// Under --strict, bail before writing so a degraded sitemap never lands on disk.
if (fetchErrors.length && strict) {
  for (const [label, error] of fetchErrors) {
    console.error(
      `::error::${label} URLs missing from sitemap - ${API_BASE} unreachable: ${error.message}`
    );
  }
  process.exit(1);
}

// public/ is the source of truth; dist/ is updated too so this works whether it
// runs before or after `vite build`.
const targets = [join(root, "public", "sitemap.xml")];
if (existsSync(join(root, "dist"))) targets.push(join(root, "dist", "sitemap.xml"));

for (const target of targets) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, xml, "utf8");
  console.log(`✓ wrote ${target}`);
}

console.log(
  `  ${entries.length} URLs (${staticEntries.length} static, ${blogEntries.length} blog, ` +
    `${industryEntries.length} industry, ${projectEntries.length} project) @ ${SITE_URL}`
);
if (!gitUsable) {
  console.warn("  ! no usable git history - static pages have no <lastmod>.");
}
for (const [label, error] of fetchErrors) {
  console.warn(
    `  ! ${label} URLs missing from sitemap - ${API_BASE} unreachable: ${error.message}`
  );
}
