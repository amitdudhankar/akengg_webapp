// Single source of truth for SEO / site-wide metadata. Change SITE_URL here
// (or via VITE_SITE_URL in .env) once your real domain is confirmed — every
// canonical URL, Open Graph tag, sitemap entry and robots.txt line derives
// from it. NAP (name/address/phone) mirrors the SettingsContext fallbacks.
const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://www.akengg.in").replace(
  /\/+$/,
  ""
);

export const SITE = {
  url: SITE_URL,
  name: "A K Engineering",
  legalName: "A K Engineering",
  description:
    "A K Engineering — turnkey IBR & non-IBR boiler systems, industrial fabrication, water treatment and pollution-control solutions for pharma, chemical, food, textile, power and automotive industries.",
  phone: "+91 9822845408",
  email: "kiran.dudhankar@akengg.in",
  address: {
    street: "Sai Shraddha Bungalow Society, Pisoli",
    city: "Pune",
    region: "Maharashtra",
    postalCode: "411060",
    country: "IN",
  },
  // Absolute URL to the default social-share image (served from /public/assets).
  defaultImage: `${SITE_URL}/assets/Logo.png`,
};

// Build an absolute canonical URL for a route path.
export const canonical = (path = "/") =>
  `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;

export default SITE;
