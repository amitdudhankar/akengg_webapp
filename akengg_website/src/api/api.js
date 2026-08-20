// Public website → backend API client (fetch-based, no auth — all endpoints
// used here are public reads or public form submits). The backend wraps most
// reads in { message, data }; the blog LIST is the exception and returns the
// raw { blogs, page, totalItems, totalPages } object.
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

async function request(path, options = {}) {
  let res;

  try {
    const isFormData = options.body instanceof FormData;
    res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    // fetch() rejects with "Failed to fetch" / "NetworkError" when the API is
    // unreachable, offline or CORS-blocked. That string used to be shown to the
    // visitor verbatim, which means nothing to them — give them something they
    // can act on instead.
    throw new Error(
      "We could not reach our server. Please check your connection and try again."
    );
  }

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const error = new Error((json && json.message) || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return json;
}

const dataOf = (res) => (res && "data" in res ? res.data : res);

// ── Reads (public GET) ──────────────────────────────────────────────────────
export const getServices = () => request("/services").then((r) => dataOf(r) || []);

// Drops keys with no usable value so `{ industry: undefined }` never becomes
// the literal query string "industry=undefined".
const toQuery = (params = {}) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

// Projects: list is filterable by industry slug (`{ industry: "pharmaceutical" }`)
// and stays callable with no arguments for the plain "all projects" case.
export const getProjects = (params = {}) =>
  request(`/projects${toQuery(params)}`).then((r) => dataOf(r) || []);
export const getProject = (idOrSlug) =>
  request(`/projects/${encodeURIComponent(idOrSlug)}`).then((r) => dataOf(r) || null);

// Industries: published-only list, ordered by sort_order, plus the per-slug
// landing page payload.
export const getIndustries = () => request("/industries").then((r) => dataOf(r) || []);
export const getIndustry = (slug) =>
  request(`/industries/${encodeURIComponent(slug)}`).then((r) => dataOf(r) || null);
export const getIndustryStats = () =>
  request("/industry-stats").then((r) => dataOf(r) || []);
export const getTestimonials = () =>
  request("/testimonials").then((r) => dataOf(r) || []);
export const getTeam = () => request("/team").then((r) => dataOf(r) || []);
export const getSettings = () => request("/settings").then((r) => dataOf(r) || null);

// Blogs: list returns the raw paginated envelope; detail is { message, data }.
export const getBlogs = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/blogs${qs ? `?${qs}` : ""}`); // -> { blogs, page, totalItems, totalPages }
};
export const getBlog = (idOrSlug) =>
  request(`/blogs/${encodeURIComponent(idOrSlug)}`).then((r) => dataOf(r) || null);

// ── Forms (public POST) ─────────────────────────────────────────────────────
// payload: { name, number, email, message, service?, source? }
export const submitContact = (payload) =>
  request("/contacts", { method: "POST", body: JSON.stringify(payload) });

// Unlike submitContact (which returns the raw { message, data } envelope),
// submitLead unwraps to the data object because callers need lead_number specifically.
export const submitLead = (formData) =>
  request("/leads", { method: "POST", body: formData }).then((r) => dataOf(r));

export const subscribeNewsletter = (email) =>
  request("/newsletter", { method: "POST", body: JSON.stringify({ email }) });
