import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Users APIs
export const loginUser = (payload) => api.post("/users/login", payload);
export const addUser = (payload) => api.post("/users", payload);
export const updateUser = (id, payload) => api.put(`/users/${id}`, payload);
export const fetchUsers = () => api.get("/users");
export const fetchUserById = (id) => api.get(`/users/${id}`);
export const deleteUser = (id) => api.delete(`/users/${id}`);

// Contact admin APIs
export const fetchContacts = ({ status } = {}) =>
  api.get("/contacts", {
    params: status ? { status } : {},
  });
export const fetchContactById = (id) => api.get(`/contacts/${id}`);
export const updateContact = (id, payload) => api.put(`/contacts/${id}`, payload);
export const deleteContact = (id) => api.delete(`/contacts/${id}`);
export const convertContactToLead = (contactId, payload = {}) =>
  api.post(`/contacts/${contactId}/convert-to-lead`, payload);

// ---- Leads ----
export const fetchLeads = (params = {}) => api.get("/leads", { params });
export const fetchLeadStats = () => api.get("/leads/stats");
export const exportLeadsCsv = (params = {}) =>
  api.get("/leads/export.csv", { params, responseType: "blob" });
export const getLeadById = (id) => api.get(`/leads/${id}`);
export const updateLead = (id, payload) => api.patch(`/leads/${id}`, payload);
export const updateLeadStatus = (id, payload) =>
  api.patch(`/leads/${id}/status`, payload);
export const fetchLeadNotes = (id) => api.get(`/leads/${id}/notes`);
export const addLeadNote = (id, payload) =>
  api.post(`/leads/${id}/notes`, payload);
export const fetchLeadFollowups = (id) => api.get(`/leads/${id}/followups`);
export const addLeadFollowup = (id, payload) =>
  api.post(`/leads/${id}/followups`, payload);
export const updateLeadFollowup = (leadId, followupId, payload) =>
  api.patch(`/leads/${leadId}/followups/${followupId}`, payload);
export const fetchLeadFiles = (id) => api.get(`/leads/${id}/files`);
export const uploadLeadFiles = (id, formData) =>
  api.post(`/leads/${id}/files`, formData, multipart);
export const downloadLeadFile = (leadId, fileId) =>
  api.get(`/leads/${leadId}/files/${fileId}`, { responseType: "blob" });
export const deleteLeadFile = (leadId, fileId) =>
  api.delete(`/leads/${leadId}/files/${fileId}`);
export const deleteLead = (id) => api.delete(`/leads/${id}`);
export const convertLeadToParty = (id, payload = {}) =>
  api.post(`/leads/${id}/convert-to-party`, payload);

// ---- Followups ----
export const fetchFollowups = (params = {}) =>
  api.get("/followups", { params });
export const exportFollowupsCsv = (params = {}) =>
  api.get("/followups/export.csv", { params, responseType: "blob" });

// ---- Lead reports ----
export const fetchLeadSourceReport = (params = {}) =>
  api.get("/reports/lead-sources", { params });
export const fetchLeadProductReport = (params = {}) =>
  api.get("/reports/lead-products", { params });

// Forgot Password APIs (3 steps).
// verify-otp returns { data: { resetToken } }; that token MUST be passed to
// reset-password — the server will not change a password from an email address
// alone, otherwise anyone could reset any account.
export const sendEmailOTP = (payload) => api.post("/users/send-otp", payload);
export const verifyEmailOTP = (payload) =>
  api.post("/users/verify-otp", payload);
export const resetUserPassword = ({ token, newPassword }) =>
  api.post("/users/reset-password", { token, newPassword });

// Blogs API
export const addBlog = (formData) =>
  api.post("/blogs", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
export const updateBlog = (id, formData) =>
  api.put(`/blogs/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
export const getBlogById = (id) => api.get(`/blogs/${id}`);
export const fetchBlogs = ({ page = 1, limit = 10, search = "" }) =>
  api.get(
    `/blogs?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
  );
export const deleteBlog = (id) => api.delete(`/blogs/${id}`);

const multipart = { headers: { "Content-Type": "multipart/form-data" } };

// Services API
export const fetchServices = () => api.get("/services");
export const getServiceById = (id) => api.get(`/services/${id}`);
export const addService = (formData) => api.post("/services", formData, multipart);
export const updateService = (id, formData) =>
  api.put(`/services/${id}`, formData, multipart);
export const deleteService = (id) => api.delete(`/services/${id}`);

// Projects API
// `params` is optional and backwards compatible: { status: "all" } includes
// unpublished case studies (admin only — the interceptor already attaches the
// token), { industry: "<slug>" } filters to one industry page.
export const fetchProjects = (params = {}) => api.get("/projects", { params });
export const getProjectById = (id) => api.get(`/projects/${id}`);
export const addProject = (formData) => api.post("/projects", formData, multipart);
export const updateProject = (id, formData) =>
  api.put(`/projects/${id}`, formData, multipart);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// Project gallery images. A gallery image can only hang off a SAVED project,
// which is why the project id is in the path — the editor hides the gallery
// entirely until the case study has been created.
export const uploadProjectImage = (projectId, formData) =>
  api.post(`/projects/${projectId}/images`, formData, multipart);
export const deleteProjectImage = (projectId, imageId) =>
  api.delete(`/projects/${projectId}/images/${imageId}`);

// Industries API (CMS-managed industry landing pages).
// GET returns published rows only; pass { status: "all" } to include drafts.
// Array-ish fields (overview/challenges/solutions/applications/
// related_products) come back parsed as arrays but are SENT as newline
// separated text — see pages/Industries/IndustryForm.jsx.
export const fetchIndustries = (params = {}) => api.get("/industries", { params });
export const getIndustryById = (idOrSlug) => api.get(`/industries/${idOrSlug}`);
export const createIndustry = (formData) =>
  api.post("/industries", formData, multipart);
export const updateIndustry = (id, formData) =>
  api.put(`/industries/${id}`, formData, multipart);
export const deleteIndustry = (id) => api.delete(`/industries/${id}`);

// Industry stats API
export const fetchIndustryStats = () => api.get("/industry-stats");
export const getIndustryStatById = (id) => api.get(`/industry-stats/${id}`);
export const addIndustryStat = (payload) => api.post("/industry-stats", payload);
export const updateIndustryStat = (id, payload) =>
  api.put(`/industry-stats/${id}`, payload);
export const deleteIndustryStat = (id) => api.delete(`/industry-stats/${id}`);

// Testimonials API
export const fetchTestimonials = () => api.get("/testimonials");
export const getTestimonialById = (id) => api.get(`/testimonials/${id}`);
export const addTestimonial = (payload) => api.post("/testimonials", payload);
export const updateTestimonial = (id, payload) =>
  api.put(`/testimonials/${id}`, payload);
export const deleteTestimonial = (id) => api.delete(`/testimonials/${id}`);

// Team API
export const fetchTeam = () => api.get("/team");
export const getTeamMemberById = (id) => api.get(`/team/${id}`);
export const addTeamMember = (formData) => api.post("/team", formData, multipart);
export const updateTeamMember = (id, formData) =>
  api.put(`/team/${id}`, formData, multipart);
export const deleteTeamMember = (id) => api.delete(`/team/${id}`);

// Newsletter API
export const fetchSubscribers = () => api.get("/newsletter");
export const deleteSubscriber = (id) => api.delete(`/newsletter/${id}`);

// Site settings API
export const getSettings = () => api.get("/settings");
export const updateSettings = (payload) => api.put("/settings", payload);

// Seller profile API
export const getSellerProfile = () => api.get("/seller-profile");
export const updateSellerProfile = (payload) =>
  api.put("/seller-profile", payload);
export const uploadSellerLogo = (formData) =>
  api.post("/seller-profile/logo", formData, multipart);
export const uploadSellerSignature = (formData) =>
  api.post("/seller-profile/signature", formData, multipart);

// Parties API (role maps to the backend's party_type filter)
export const fetchParties = ({ role, type, search, page, limit, is_active } = {}) =>
  api.get("/parties", {
    params: { type: type || role, search, page, limit, is_active },
  });
export const getPartyById = (id) => api.get(`/parties/${id}`);
export const addParty = (payload) => api.post("/parties", payload);
export const updateParty = (id, payload) => api.put(`/parties/${id}`, payload);
export const deleteParty = (id) => api.delete(`/parties/${id}`);

// Item catalog API
export const fetchCatalog = (params = {}) => api.get("/item-catalog", { params });
export const getCatalogItemById = (id) => api.get(`/item-catalog/${id}`);
export const addCatalogItem = (payload) => api.post("/item-catalog", payload);
export const updateCatalogItem = (id, payload) =>
  api.put(`/item-catalog/${id}`, payload);
export const deleteCatalogItem = (id) => api.delete(`/item-catalog/${id}`);

// Documents API
export const fetchDocuments = (params = {}) =>
  api.get("/documents", { params });
export const getDocumentById = (id) => api.get(`/documents/${id}`);
export const previewNextNumber = (docType) =>
  api.get("/documents/next-number", { params: { doc_type: docType } });
export const createDocument = (payload) => api.post("/documents", payload);
export const updateDocument = (id, payload) =>
  api.put(`/documents/${id}`, payload);
export const finalizeDocument = (id) => api.post(`/documents/${id}/finalize`);
export const deleteDocument = (id) => api.delete(`/documents/${id}`);
export const reExportDocument = (id) => api.post(`/documents/${id}/re-export`);
export const downloadDocumentPdf = (id) =>
  api.get(`/documents/${id}/pdf`, { responseType: "blob" });
export const downloadDocumentDocx = (id) =>
  api.get(`/documents/${id}/docx`, { responseType: "blob" });
// Lifecycle (Phase 3): duplicate/convert return the NEW draft in res.data.data;
// cancel returns the updated (cancelled) document. targetType = backend enum.
export const duplicateDocument = (id) => api.post(`/documents/${id}/duplicate`);
export const convertDocument = (id, targetType) =>
  api.post(`/documents/${id}/convert`, { target_type: targetType });
export const cancelDocument = (id) => api.post(`/documents/${id}/cancel`);
// Email a FINALIZED document to the party with the PDF attached. Every field
// in the payload is optional: {} sends to the party's stored email under a
// server-generated subject.
export const emailDocument = (id, payload = {}) =>
  api.post(`/documents/${id}/email`, payload);
