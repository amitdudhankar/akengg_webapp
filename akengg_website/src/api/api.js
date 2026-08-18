// Public website → backend API client (fetch-based, no auth — all endpoints
// used here are public reads or public form submits). The backend wraps most
// reads in { message, data }; the blog LIST is the exception and returns the
// raw { blogs, page, totalItems, totalPages } object.
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

async function request(path, options = {}) {
  let res;

  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
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
export const getProjects = () => request("/projects").then((r) => dataOf(r) || []);
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

export const subscribeNewsletter = (email) =>
  request("/newsletter", { method: "POST", body: JSON.stringify({ email }) });
