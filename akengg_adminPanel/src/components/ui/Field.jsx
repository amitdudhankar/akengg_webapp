// One labelled control for every form in the admin. Renders an input, textarea
// or select from the same shell so spacing, focus rings and error text can
// never drift between pages.
function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  as = "input", // "input" | "textarea" | "select"
  placeholder,
  hint,
  error,
  required = false,
  rows = 3,
  options = [], // [{ value, label }] for as="select"
  full = false, // span both columns of the form grid
  className = "",
  ...rest
}) {
  const control =
    "w-full rounded-lg border bg-white p-2 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:outline-none focus:ring-2 disabled:bg-gray-50 " +
    (error
      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
      : "border-gray-200 focus:border-indigo-400 focus:ring-indigo-100");

  const shared = {
    id: name,
    name,
    value,
    onChange,
    required,
    placeholder,
    className: control,
    ...rest,
  };

  return (
    <div className={`${full ? "md:col-span-2" : ""} ${className}`}>
      {label && (
        <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}

      {as === "textarea" ? (
        <textarea rows={rows} {...shared} />
      ) : as === "select" ? (
        <select {...shared}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input type={type} {...shared} />
      )}

      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}

export default Field;
