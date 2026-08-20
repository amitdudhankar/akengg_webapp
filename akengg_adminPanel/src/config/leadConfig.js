// src/config/leadConfig.js
// ─────────────────────────────────────────────────────────────────────────
// Static option lists & labels for the Leads / Follow-ups module.
//
// This file mirrors akengg_backendapi/src/config/leadOptions.js and
// akengg_website/src/config/quoteFormConfig.js — keep all three in sync.
// ─────────────────────────────────────────────────────────────────────────

// Lead pipeline statuses, in the exact order the pipeline moves through.
export const LEAD_STATUSES = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "SITE_VISIT", label: "Site Visit" },
  { value: "TECHNICAL_DISCUSSION", label: "Technical Discussion" },
  { value: "QUOTATION", label: "Quotation" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "ON_HOLD", label: "On Hold" },
];

export const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

// Exact product strings used by the public quote form / backend — value === label.
export const PRODUCTS = [
  "IBR Steam Boiler",
  "Non-IBR Steam Boiler",
  "Industrial Steam Boiler",
  "Thermic Fluid Heater",
  "Hot Water Generator",
  "Industrial Piping",
  "IBR Piping",
  "Non-IBR Piping",
  "Industrial Fabrication",
  "SS Fabrication",
  "MS Fabrication",
  "Industrial Chimney",
  "Ducting",
  "Industrial Tanks",
  "Pollution Control Equipment",
  "Water Treatment Plant",
  "Installation / Commissioning",
  "Maintenance / Service",
  "Other",
].map((value) => ({ value, label: value }));

// Exact industry strings used by the public quote form / backend — value === label.
export const INDUSTRIES = [
  "Pharmaceutical",
  "Chemical",
  "Food & Beverage",
  "Textile",
  "Dairy",
  "Packaging",
  "Automotive",
  "Engineering",
  "Manufacturing",
  "Paper",
  "Sugar",
  "Distillery",
  "Hospital",
  "Hospitality",
  "Power",
  "Cement",
  "Other",
].map((value) => ({ value, label: value }));

// Exact lost-reason strings used by the backend — value === label.
export const LOST_REASONS = [
  "Price",
  "Competitor",
  "Project Cancelled",
  "Project Delayed",
  "No Response",
  "Technical Mismatch",
  "Location",
  "Timeline",
  "Other",
].map((value) => ({ value, label: value }));

export const FOLLOWUP_TYPES = [
  { value: "CALL", label: "Call" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
  { value: "SITE_VISIT", label: "Site Visit" },
  { value: "MEETING", label: "Meeting" },
  { value: "OTHER", label: "Other" },
];

export const FOLLOWUP_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
  { value: "MISSED", label: "Missed" },
  { value: "CANCELLED", label: "Cancelled" },
];

// Short human-readable labels for the snake_case keys the public quote form
// stores inside a lead's technical_details object. Used to prettify the lead
// detail page's rendering of that object. Any key not listed here should be
// prettified with formatEnumLabel() (src/utils/leadUtils.js) as a fallback.
export const TECH_FIELD_LABELS = {
  steam_capacity: "Steam Capacity",
  pressure: "Pressure",
  fuel_type: "Fuel Type",
  operating_hours: "Operating Hours",
  has_existing_boiler: "Has Existing Boiler",
  installation_type: "Installation Type",
  required_installation_date: "Required Installation Date",
  heating_capacity: "Heating Capacity",
  operating_temperature: "Operating Temperature",
  fuel: "Fuel",
  application: "Application",
  has_existing_system: "Has Existing System",
  pipe_type: "Pipe Type",
  diameter: "Diameter",
  approximate_length: "Approximate Length",
  material: "Material",
  working_pressure: "Working Pressure",
  drawing_boq_availability: "Drawing / BOQ Availability",
  approximate_dimensions: "Approximate Dimensions",
  quantity: "Quantity",
  drawing_availability: "Drawing Availability",
};
