import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary:
    "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300",
  secondary:
    "border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700 disabled:bg-rose-300",
  ghost: "text-gray-600 hover:bg-gray-100 disabled:opacity-60",
};

/**
 * `loading` disables the button AND swaps in a spinner — the forms used to be
 * double-submittable because nothing changed between click and navigation.
 */
function Button({
  variant = "primary",
  type = "button",
  loading = false,
  disabled = false,
  icon: Icon,
  className = "",
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
        VARIANTS[variant] || VARIANTS.primary
      } ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon className="h-4 w-4" />
      )}
      {children}
    </button>
  );
}

export default Button;
