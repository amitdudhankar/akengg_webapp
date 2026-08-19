import { ArrowLeft } from "lucide-react";

/**
 * Title block shared by every page. `onBack` renders the back affordance the
 * form pages used to draw by hand with a bare <StepBack /> icon; `children` is
 * the action area (search box, "Add X" button, filters).
 */
function PageHeader({ title, subtitle, onBack, children }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="mt-0.5 rounded-lg border border-gray-200 p-1.5 text-gray-600 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>

      {children && (
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          {children}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
