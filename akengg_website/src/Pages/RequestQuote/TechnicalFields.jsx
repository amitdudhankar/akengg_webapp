import { TECH_FIELD_GROUPS } from "../../config/quoteFormConfig";

// Section 3 of the quote form. Purely props-driven: looks up the field
// definitions for the current product group and renders each one (text/date
// input, select, or radio row) bound to `values`/`onChange`. Renders nothing
// for the "generic" group (and any group with no extra fields), since the
// only thing that group needs is the always-present Requirement textarea
// rendered by QuoteForm itself.
const fieldInputClass = (hasError) =>
  `w-full border-b-2 bg-gray-200 px-4 py-3 text-sm text-[#1c1f26] outline-none transition placeholder:text-gray-400 ${
    hasError
      ? "border-red-500"
      : "border-transparent focus:border-[#F4C542]"
  }`;

const TechnicalFields = ({ group, values = {}, onChange, errors = {}, onFocus }) => {
  const fields = TECH_FIELD_GROUPS[group] || [];
  if (fields.length === 0) return null;

  return (
    <div className="mt-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[#1c1f26]/60 mb-4">
        Technical Details
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {fields.map((field) => {
          const errorKey = `technical_${field.name}`;
          const hasError = Boolean(errors[errorKey]);
          const value = values?.[field.name] ?? "";
          const isWide = field.type === "radio";

          return (
            <div key={field.name} id={`field-${errorKey}`} className={isWide ? "sm:col-span-2" : ""}>
              <label className="block text-sm font-medium text-[#1c1f26] mb-1.5">
                {field.label}
                {field.required && <span className="ml-0.5 text-red-500">*</span>}
              </label>

              {field.type === "select" && (
                <select
                  value={value}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  onFocus={onFocus}
                  className={fieldInputClass(hasError)}
                >
                  <option value="">Select {field.label}</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {field.type === "radio" && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                  {field.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm text-[#1c1f26]">
                      <input
                        type="radio"
                        name={field.name}
                        value={opt}
                        checked={value === opt}
                        onChange={(e) => onChange(field.name, e.target.value)}
                        onFocus={onFocus}
                        className="h-4 w-4 accent-[#F4C542]"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {(field.type === "text" || field.type === "date") && (
                <input
                  type={field.type}
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  onFocus={onFocus}
                  className={fieldInputClass(hasError)}
                />
              )}

              {hasError && <p className="mt-1 text-xs text-red-600">{errors[errorKey]}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TechnicalFields;
