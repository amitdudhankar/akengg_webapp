// Single source of truth for lead enums. Mirrored by
// akengg_website/src/config/quoteFormConfig.js and
// akengg_adminPanel/src/config/leadConfig.js — keep all three in sync when
// changing this file.

const INDUSTRIES = [
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
];

const PRODUCTS = [
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
];

const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "SITE_VISIT",
  "TECHNICAL_DISCUSSION",
  "QUOTATION",
  "NEGOTIATION",
  "WON",
  "LOST",
  "ON_HOLD",
];

const OPEN_STATUSES = LEAD_STATUSES.filter(
  (s) => s !== "WON" && s !== "LOST"
);

const QUALIFIED_PLUS_STATUSES = [
  "QUALIFIED",
  "SITE_VISIT",
  "TECHNICAL_DISCUSSION",
  "QUOTATION",
  "NEGOTIATION",
  "WON",
];

const QUOTATION_PLUS_STATUSES = ["QUOTATION", "NEGOTIATION", "WON"];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const LOST_REASONS = [
  "Price",
  "Competitor",
  "Project Cancelled",
  "Project Delayed",
  "No Response",
  "Technical Mismatch",
  "Location",
  "Timeline",
  "Other",
];

const FOLLOWUP_TYPES = ["CALL", "WHATSAPP", "EMAIL", "SITE_VISIT", "MEETING", "OTHER"];

const FOLLOWUP_STATUSES = ["PENDING", "COMPLETED", "MISSED", "CANCELLED"];

// ── technical_details per-product field maps ────────────────────────────────
// Products absent from TECHNICAL_FIELDS have no fixed schema — consumers fall
// back to the generic bounded-object rule (max 40 keys, each key matching
// /^[a-z0-9_]{1,60}$/, each value a string/number/boolean <=500 chars, whole
// object <=8KB serialized).

const BOILER_FIELDS = [
  { key: "steam_capacity", label: "Required Steam Capacity" },
  { key: "pressure", label: "Pressure" },
  { key: "fuel_type", label: "Fuel Type" },
  { key: "operating_hours", label: "Operating Hours" },
  { key: "has_existing_boiler", label: "Existing Boiler" },
  { key: "installation_type", label: "New Installation / Replacement" },
  { key: "required_installation_date", label: "Required Installation Date" },
];

const THERMIC_FIELDS = [
  { key: "heating_capacity", label: "Heating Capacity" },
  { key: "operating_temperature", label: "Operating Temperature" },
  { key: "fuel", label: "Fuel" },
  { key: "application", label: "Application" },
  { key: "has_existing_system", label: "Existing System" },
  { key: "installation_type", label: "New / Replacement" },
];

const PIPING_FIELDS = [
  { key: "pipe_type", label: "Pipe Type" },
  { key: "diameter", label: "Diameter" },
  { key: "approximate_length", label: "Approximate Length" },
  { key: "material", label: "Material" },
  { key: "working_pressure", label: "Working Pressure" },
  { key: "installation_type", label: "Existing/New Installation" },
  { key: "drawing_boq_availability", label: "Drawing/BOQ Availability" },
];

const FABRICATION_FIELDS = [
  { key: "material", label: "Material" },
  { key: "approximate_dimensions", label: "Approximate Dimensions" },
  { key: "quantity", label: "Quantity" },
  { key: "application", label: "Application" },
  { key: "drawing_availability", label: "Drawing Availability" },
];

const TECHNICAL_FIELDS = {
  "IBR Steam Boiler": BOILER_FIELDS,
  "Non-IBR Steam Boiler": BOILER_FIELDS,
  "Industrial Steam Boiler": BOILER_FIELDS,
  "Hot Water Generator": BOILER_FIELDS,

  "Thermic Fluid Heater": THERMIC_FIELDS,

  "Industrial Piping": PIPING_FIELDS,
  "IBR Piping": PIPING_FIELDS,
  "Non-IBR Piping": PIPING_FIELDS,

  "Industrial Fabrication": FABRICATION_FIELDS,
  "SS Fabrication": FABRICATION_FIELDS,
  "MS Fabrication": FABRICATION_FIELDS,
};

module.exports = {
  INDUSTRIES,
  PRODUCTS,
  LEAD_STATUSES,
  OPEN_STATUSES,
  QUALIFIED_PLUS_STATUSES,
  QUOTATION_PLUS_STATUSES,
  PRIORITIES,
  LOST_REASONS,
  FOLLOWUP_TYPES,
  FOLLOWUP_STATUSES,
  TECHNICAL_FIELDS,
};
