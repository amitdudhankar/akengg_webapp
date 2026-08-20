// Config for the multi-section "Request a Quote" form (products, industries,
// per-product-group technical fields, and file-upload rules).
//
// This file mirrors akengg_backendapi/src/config/leadOptions.js and
// akengg_adminPanel/src/config/leadConfig.js -- keep all three in sync.

// PRODUCTS -- value is the exact human-readable string the backend expects
// in the `product` field (not a slug). `group` selects which extra technical
// fields (TECH_FIELD_GROUPS) render in Section 3 of the quote form.
export const PRODUCTS = [
  { value: "IBR Steam Boiler", label: "IBR Steam Boiler", group: "boiler" },
  { value: "Non-IBR Steam Boiler", label: "Non-IBR Steam Boiler", group: "boiler" },
  { value: "Industrial Steam Boiler", label: "Industrial Steam Boiler", group: "boiler" },
  { value: "Thermic Fluid Heater", label: "Thermic Fluid Heater", group: "thermic" },
  { value: "Hot Water Generator", label: "Hot Water Generator", group: "boiler" },
  { value: "Industrial Piping", label: "Industrial Piping", group: "piping" },
  { value: "IBR Piping", label: "IBR Piping", group: "piping" },
  { value: "Non-IBR Piping", label: "Non-IBR Piping", group: "piping" },
  { value: "Industrial Fabrication", label: "Industrial Fabrication", group: "fabrication" },
  { value: "SS Fabrication", label: "SS Fabrication", group: "fabrication" },
  { value: "MS Fabrication", label: "MS Fabrication", group: "fabrication" },
  { value: "Industrial Chimney", label: "Industrial Chimney", group: "generic" },
  { value: "Ducting", label: "Ducting", group: "generic" },
  { value: "Industrial Tanks", label: "Industrial Tanks", group: "generic" },
  { value: "Pollution Control Equipment", label: "Pollution Control Equipment", group: "generic" },
  { value: "Water Treatment Plant", label: "Water Treatment Plant", group: "generic" },
  { value: "Installation / Commissioning", label: "Installation / Commissioning", group: "generic" },
  { value: "Maintenance / Service", label: "Maintenance / Service", group: "generic" },
  { value: "Other", label: "Other", group: "generic" },
];

// INDUSTRIES -- value equals label; the backend `industry` field expects the
// human-readable string directly.
export const INDUSTRIES = [
  { value: "Pharmaceutical", label: "Pharmaceutical" },
  { value: "Chemical", label: "Chemical" },
  { value: "Food & Beverage", label: "Food & Beverage" },
  { value: "Textile", label: "Textile" },
  { value: "Dairy", label: "Dairy" },
  { value: "Packaging", label: "Packaging" },
  { value: "Automotive", label: "Automotive" },
  { value: "Engineering", label: "Engineering" },
  { value: "Manufacturing", label: "Manufacturing" },
  { value: "Paper", label: "Paper" },
  { value: "Sugar", label: "Sugar" },
  { value: "Distillery", label: "Distillery" },
  { value: "Hospital", label: "Hospital" },
  { value: "Hospitality", label: "Hospitality" },
  { value: "Power", label: "Power" },
  { value: "Cement", label: "Cement" },
  { value: "Other", label: "Other" },
];

// Shared fuel-type options used by both the "boiler" and "thermic" groups.
const FUEL_TYPE_OPTIONS = [
  "Coal",
  "Wood-Biomass",
  "Agro Waste",
  "Furnace Oil",
  "Diesel",
  "Natural Gas-PNG",
  "LPG",
  "Electric",
  "Other",
];

// TECH_FIELD_GROUPS -- keyed by product group; each entry is an array of
// field definitions rendered in Section 3 ("technical_details") of the quote
// form. Field shape: { name, label, type, required, placeholder?, options? }.
export const TECH_FIELD_GROUPS = {
  boiler: [
    {
      name: "steam_capacity",
      label: "Required Steam Capacity",
      type: "text",
      required: true,
      placeholder: "e.g. 2 TPH",
    },
    {
      name: "pressure",
      label: "Pressure",
      type: "text",
      required: false,
    },
    {
      name: "fuel_type",
      label: "Fuel Type",
      type: "select",
      required: false,
      options: FUEL_TYPE_OPTIONS,
    },
    {
      name: "operating_hours",
      label: "Operating Hours per Day",
      type: "select",
      required: false,
      options: ["Up to 8 hrs", "8-16 hrs", "16-24 hrs (continuous)"],
    },
    {
      name: "has_existing_boiler",
      label: "Existing Boiler?",
      type: "radio",
      required: false,
      options: ["Yes", "No"],
    },
    {
      name: "installation_type",
      label: "Installation Type",
      type: "radio",
      required: false,
      options: ["New Installation", "Replacement"],
    },
    {
      name: "required_installation_date",
      label: "Required Installation Date",
      type: "date",
      required: false,
    },
  ],
  thermic: [
    {
      name: "heating_capacity",
      label: "Heating Capacity",
      type: "text",
      required: false,
    },
    {
      name: "operating_temperature",
      label: "Operating Temperature",
      type: "text",
      required: false,
    },
    {
      name: "fuel",
      label: "Fuel",
      type: "select",
      required: false,
      options: FUEL_TYPE_OPTIONS,
    },
    {
      name: "application",
      label: "Application",
      type: "text",
      required: false,
    },
    {
      name: "has_existing_system",
      label: "Existing System?",
      type: "radio",
      required: false,
      options: ["Yes", "No"],
    },
    {
      name: "installation_type",
      label: "Installation Type",
      type: "radio",
      required: false,
      options: ["New", "Replacement"],
    },
  ],
  piping: [
    {
      name: "pipe_type",
      label: "Pipe Type",
      type: "select",
      required: false,
      options: ["IBR", "Non-IBR"],
    },
    {
      name: "diameter",
      label: "Diameter",
      type: "text",
      required: false,
    },
    {
      name: "approximate_length",
      label: "Approximate Length",
      type: "text",
      required: false,
    },
    {
      name: "material",
      label: "Material",
      type: "text",
      required: false,
    },
    {
      name: "working_pressure",
      label: "Working Pressure",
      type: "text",
      required: false,
    },
    {
      name: "installation_type",
      label: "Existing/New Installation",
      type: "radio",
      required: false,
      options: ["Existing", "New"],
    },
    {
      name: "drawing_boq_availability",
      label: "Drawing/BOQ Available?",
      type: "radio",
      required: false,
      options: ["Yes", "No"],
    },
  ],
  fabrication: [
    {
      name: "material",
      label: "Material",
      type: "text",
      required: false,
    },
    {
      name: "approximate_dimensions",
      label: "Approximate Dimensions",
      type: "text",
      required: false,
    },
    {
      name: "quantity",
      label: "Quantity",
      type: "text",
      required: false,
    },
    {
      name: "application",
      label: "Application",
      type: "text",
      required: false,
    },
    {
      name: "drawing_availability",
      label: "Drawing Available?",
      type: "radio",
      required: false,
      options: ["Yes", "No"],
    },
  ],
  generic: [],
};

// groupOf -- resolve a product's technical-field group by its exact display
// string. Falls back to "generic" (no extra fields) when unmatched.
export const groupOf = (productValue) => {
  const match = PRODUCTS.find((p) => p.value === productValue);
  return match ? match.group : "generic";
};

// FILE_RULES -- attachment constraints for Section 4 (uploaded under the
// repeated "files" multipart field, up to 5 files / 10MB each).
export const FILE_RULES = {
  maxFiles: 5,
  maxSizeMB: 10,
  accept: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".xlsx", ".xls", ".docx"],
};
