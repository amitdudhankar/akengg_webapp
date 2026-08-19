import { Inbox } from "lucide-react";

/** Shown when a list genuinely has no rows — never while it is still loading. */
function EmptyState({ icon: Icon, title = "Nothing here yet", message, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-gray-100 text-gray-400">
        {Icon ? <Icon className="h-5 w-5" /> : <Inbox className="h-5 w-5" />}
      </div>
      <p className="mt-3 text-sm font-medium text-gray-900">{title}</p>
      {message && <p className="mt-1 text-sm text-gray-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
