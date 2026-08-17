import { Link } from "react-router-dom";

/**
 * Card surface with a titled header and an optional header action link.
 * @param {{ title: string, icon?: any, action?: {to: string, label: string},
 *           children: any, className?: string }} props
 */
function Panel({ title, icon: Icon, action, children, className = "" }) {
  return (
    <section
      className={`flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          {Icon && <Icon className="h-4 w-4 text-gray-400" />}
          {title}
        </h2>
        {action && (
          <Link
            to={action.to}
            className="shrink-0 text-xs font-medium text-indigo-600 transition hover:text-indigo-700"
          >
            {action.label}
          </Link>
        )}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}

export default Panel;
