import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { submitLead } from "../../api/api";
import { useToast } from "../../Components/Toast/ToastProvider";
import { trackEvent, trackPageView } from "../../utils/analytics";
import { getAttribution } from "../../utils/attribution";
import { validateQuote } from "../../utils/validateQuote";
import { PRODUCTS, INDUSTRIES, groupOf } from "../../config/quoteFormConfig";
import TechnicalFields from "./TechnicalFields";
import FileUpload from "./FileUpload";

const EMPTY_FORM = {
  product: "",
  contact_person: "",
  company_name: "",
  designation: "",
  phone: "",
  email: "",
  industry: "",
  city: "",
  state: "",
  plant_location: "",
  requirement: "",
  website: "", // honeypot — real visitors never fill this in
};

// Human-readable group headings for the (optional) visual grouping of the
// product select — purely cosmetic, does not affect groupOf()/TECH_FIELD_GROUPS.
const PRODUCT_GROUP_LABELS = {
  boiler: "Boilers & Heaters",
  thermic: "Thermic Fluid Heaters",
  piping: "Piping",
  fabrication: "Fabrication",
  generic: "Other Products & Services",
};

const PRODUCT_OPTGROUPS = PRODUCTS.reduce((groups, product) => {
  let bucket = groups.find((g) => g.group === product.group);
  if (!bucket) {
    bucket = { group: product.group, label: PRODUCT_GROUP_LABELS[product.group] || product.group, items: [] };
    groups.push(bucket);
  }
  bucket.items.push(product);
  return groups;
}, []);

const fieldClass = (hasError) =>
  `w-full border-b-2 bg-gray-200 px-4 py-3 text-sm text-[#1c1f26] outline-none transition placeholder:text-gray-400 ${
    hasError
      ? "border-red-500"
      : "border-transparent focus:border-[#F4C542]"
  }`;

const sectionClass =
  "bg-white border border-gray-200 border-t-[3px] border-t-[#F4C542] p-6 md:p-8";

function FieldWrapper({ id, label, required, error, children }) {
  return (
    <div id={id}>
      <label className="block text-sm font-medium text-[#1c1f26] mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Main "Request a Quote" form. Owns all form/technical/file/error/submitting
// state; RequestQuote.jsx only owns whether a lead has been created yet.
const QuoteForm = ({ initialProduct = "", onSuccess }) => {
  const toast = useToast();
  const startedRef = useRef(false); // fires "quote_request_started" once

  const [form, setForm] = useState(() => {
    const seededProduct = PRODUCTS.some((p) => p.value === initialProduct) ? initialProduct : "";
    return { ...EMPTY_FORM, product: seededProduct };
  });
  const [technical, setTechnical] = useState({});
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // The previous product's technical fields are no longer relevant once the
  // visitor picks a different product.
  useEffect(() => {
    setTechnical({});
  }, [form.product]);

  const markStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackEvent("quote_request_started", form.product ? { product: form.product } : {});
  };

  const clearError = (key) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    markStarted();
    setForm((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  const handleTechnicalChange = (name, value) => {
    markStarted();
    setTechnical((prev) => ({ ...prev, [name]: value }));
    clearError(`technical_${name}`);
  };

  const handleFilesChange = (nextFiles) => {
    setFiles(nextFiles);
    clearError("files");
  };

  const scrollToField = (key) => {
    const el = document.getElementById(`field-${key}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { errors: validationErrors, firstErrorKey } = validateQuote(form, technical, files);
    if (firstErrorKey) {
      setErrors(validationErrors);
      toast.error(validationErrors[firstErrorKey]);
      scrollToField(firstErrorKey);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const fd = new FormData();
      const scalarFields = [
        "product",
        "contact_person",
        "company_name",
        "designation",
        "phone",
        "email",
        "industry",
        "city",
        "state",
        "plant_location",
        "requirement",
        "website",
      ];
      scalarFields.forEach((key) => {
        const raw = form[key] ?? "";
        // Same convention as Contact.jsx: digits are stripped from phone
        // only in the outgoing payload, not from what the visitor sees/types.
        const value = key === "phone" ? String(raw).replace(/\D/g, "") : raw;
        fd.append(key, value);
      });
      fd.append("technical_details", JSON.stringify(technical));

      const attribution = getAttribution();
      ["source", "medium", "campaign", "utm_term", "utm_content", "landing_page", "referrer"].forEach(
        (key) => {
          if (attribution[key]) fd.append(key, attribution[key]);
        }
      );

      files.forEach((file) => fd.append("files", file));

      const lead = await submitLead(fd);

      trackEvent("quote_request_submitted", { product: form.product, file_count: files.length });
      // GA4's recommended "generate_lead" event name — doubles as a conversion signal.
      trackEvent("generate_lead", {
        product: form.product,
        source: attribution.source,
        medium: attribution.medium,
        lead_number: lead?.lead_number,
      });
      // Not a real route — a virtual page view keeps GA4 funnels meaningful anyway.
      trackPageView("/request-quote/success", "Request a Quote | Success");

      onSuccess?.({ ...lead, product: form.product });
    } catch (err) {
      toast.error(err.message || "We could not submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const group = groupOf(form.product);
  const submitLabel = submitting && files.length > 0 ? "Uploading files..." : "Submit Requirement";

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-6">
      {/* SECTION 1 — Product / Service */}
      <div className={sectionClass}>
        <h2 className="text-lg md:text-xl font-semibold text-[#1c1f26] mb-1">What are you looking for?</h2>
        <p className="text-sm text-gray-500 mb-5">Select the product or service you'd like a quotation for.</p>

        <FieldWrapper id="field-product" label="Product / Service" required error={errors.product}>
          <select
            name="product"
            required
            value={form.product}
            onChange={handleFieldChange}
            onFocus={markStarted}
            className={fieldClass(Boolean(errors.product))}
          >
            <option value="" disabled>
              Select a product/service
            </option>
            {PRODUCT_OPTGROUPS.map((g) => (
              <optgroup key={g.group} label={g.label}>
                {g.items.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </FieldWrapper>
      </div>

      {/* SECTION 2 — Your Details */}
      <div className={sectionClass}>
        <h2 className="text-lg md:text-xl font-semibold text-[#1c1f26] mb-1">Your Details</h2>
        <p className="text-sm text-gray-500 mb-5">Tell us how our team can reach you.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FieldWrapper id="field-contact_person" label="Contact Person" required error={errors.contact_person}>
            <input
              type="text"
              name="contact_person"
              required
              value={form.contact_person}
              onChange={handleFieldChange}
              onFocus={markStarted}
              placeholder="Your full name"
              className={fieldClass(Boolean(errors.contact_person))}
            />
          </FieldWrapper>

          <FieldWrapper id="field-company_name" label="Company Name" required error={errors.company_name}>
            <input
              type="text"
              name="company_name"
              required
              value={form.company_name}
              onChange={handleFieldChange}
              onFocus={markStarted}
              placeholder="Your company name"
              className={fieldClass(Boolean(errors.company_name))}
            />
          </FieldWrapper>

          <FieldWrapper id="field-designation" label="Designation">
            <input
              type="text"
              name="designation"
              value={form.designation}
              onChange={handleFieldChange}
              onFocus={markStarted}
              placeholder="e.g. Plant Manager"
              className={fieldClass(false)}
            />
          </FieldWrapper>

          <FieldWrapper id="field-phone" label="Phone" required error={errors.phone}>
            <input
              type="tel"
              name="phone"
              required
              value={form.phone}
              onChange={handleFieldChange}
              onFocus={markStarted}
              placeholder="10-digit mobile number"
              className={fieldClass(Boolean(errors.phone))}
            />
          </FieldWrapper>

          <FieldWrapper id="field-email" label="Email" required error={errors.email}>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleFieldChange}
              onFocus={markStarted}
              placeholder="you@company.com"
              className={fieldClass(Boolean(errors.email))}
            />
          </FieldWrapper>

          <FieldWrapper id="field-industry" label="Industry">
            <select
              name="industry"
              value={form.industry}
              onChange={handleFieldChange}
              onFocus={markStarted}
              className={fieldClass(false)}
            >
              <option value="">Select an industry</option>
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </FieldWrapper>

          <FieldWrapper id="field-city" label="City">
            <input
              type="text"
              name="city"
              value={form.city}
              onChange={handleFieldChange}
              onFocus={markStarted}
              placeholder="City"
              className={fieldClass(false)}
            />
          </FieldWrapper>

          <FieldWrapper id="field-state" label="State">
            <input
              type="text"
              name="state"
              value={form.state}
              onChange={handleFieldChange}
              onFocus={markStarted}
              placeholder="State"
              className={fieldClass(false)}
            />
          </FieldWrapper>

          <div className="sm:col-span-2">
            <FieldWrapper id="field-plant_location" label="Plant Location">
              <input
                type="text"
                name="plant_location"
                value={form.plant_location}
                onChange={handleFieldChange}
                onFocus={markStarted}
                placeholder="Where the equipment will be installed, if different from above"
                className={fieldClass(false)}
              />
            </FieldWrapper>
          </div>
        </div>
      </div>

      {/* SECTION 3 — Technical Requirement */}
      <div className={sectionClass}>
        <h2 className="text-lg md:text-xl font-semibold text-[#1c1f26] mb-1">Technical Requirement</h2>
        <p className="text-sm text-gray-500 mb-1">
          Share the specifications that will help us prepare an accurate quote.
        </p>

        <TechnicalFields
          group={group}
          values={technical}
          onChange={handleTechnicalChange}
          errors={errors}
          onFocus={markStarted}
        />

        <div className="mt-6">
          <FieldWrapper id="field-requirement" label="Requirement" required error={errors.requirement}>
            <textarea
              name="requirement"
              required
              rows={5}
              value={form.requirement}
              onChange={handleFieldChange}
              onFocus={markStarted}
              placeholder="Describe the capacity, specifications, timeline or any other details we should know..."
              className={fieldClass(Boolean(errors.requirement))}
            />
          </FieldWrapper>
        </div>
      </div>

      {/* FILE UPLOAD */}
      <div className={sectionClass}>
        <FileUpload files={files} onChange={handleFilesChange} errors={errors} />
      </div>

      {/* HONEYPOT — off-screen, not tabbable, not autofilled. Real visitors
          never see or fill this in; a bot that fills every input will. */}
      <div className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          value={form.website}
          onChange={handleFieldChange}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* SUBMIT */}
      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 bg-[#1c1f26] px-6 py-4 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting && <Loader2 className="animate-spin" size={18} aria-hidden="true" />}
        {submitLabel}
      </button>
    </form>
  );
};

export default QuoteForm;
