import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

// Replaces window.alert() for form feedback. alert() blocks the whole page,
// cannot be styled, and looks like a browser error rather than a reply from the
// site — so a submitted enquiry read as something going wrong.
//
// Usage:
//   const toast = useToast();
//   toast.success("Thank you! We'll be in touch soon.");
//   toast.error(err.message);
const ToastContext = createContext(null);

const AUTO_DISMISS_MS = 5000;
const EXIT_MS = 200; // keep in sync with the toast-out animation in index.css

const VARIANTS = {
  success: {
    Icon: CheckCircle2,
    // Brand blue mark on the site's yellow, so a confirmation reads as ours.
    iconClass: "bg-[#234B97] text-[#F4C542]",
    barClass: "bg-[#F4C542]",
    defaultTitle: "Thank you",
  },
  error: {
    // Deliberately NOT brand-coloured: a failure has to read as a failure, and
    // blue-on-yellow would look like another success.
    Icon: AlertCircle,
    iconClass: "bg-red-600 text-white",
    barClass: "bg-red-500",
    defaultTitle: "Something went wrong",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // A counter, not Date.now(): two toasts fired in the same millisecond would
  // collide on a timestamp key.
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    // Mark it leaving so the exit animation can play, then drop it.
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast))
    );
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, EXIT_MS);
  }, []);

  const push = useCallback(
    (variant, message, title) => {
      if (!message) return null;

      const id = (nextId.current += 1);
      setToasts((current) => [...current, { id, variant, message, title, leaving: false }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      success: (message, title) => push("success", message, title),
      error: (message, title) => push("error", message, title),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Sits below the sticky header (h ~72px) and above everything else.
          The wrapper ignores clicks so it never blocks the page underneath. */}
      <div
        className="pointer-events-none fixed top-20 right-0 z-[60] flex w-full max-w-sm flex-col gap-3 p-4"
        aria-live="polite"
      >
        {toasts.map(({ id, variant, message, title, leaving }) => {
          const { Icon, iconClass, barClass, defaultTitle } =
            VARIANTS[variant] || VARIANTS.success;

          return (
            <div
              key={id}
              role={variant === "error" ? "alert" : "status"}
              className={`pointer-events-auto overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)] ${
                leaving ? "animate-[toast-out_200ms_ease-in_forwards]" : "animate-[toast-in_260ms_cubic-bezier(0.16,1,0.3,1)]"
              }`}
            >
              <div className="flex items-start gap-3 p-4">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}
                >
                  <Icon size={20} aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-grow pt-0.5">
                  <p className="text-sm font-semibold text-[#1c1f26]">
                    {title || defaultTitle}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed break-words text-gray-600">
                    {message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => dismiss(id)}
                  aria-label="Dismiss notification"
                  className="-mr-1 -mt-1 shrink-0 rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drains to show the auto-dismiss running out. */}
              <div className="h-1 w-full bg-gray-100">
                <div
                  className={`h-full origin-left ${barClass} animate-[toast-progress_5s_linear_forwards]`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }

  return context;
}

export default ToastProvider;
