import StatusBadge from "./StatusBadge";

const fmtDate = (v) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

function RecentLeads({ items = [] }) {
  if (!items.length) {
    return <p className="py-6 text-center text-sm text-gray-400">No contact leads yet.</p>;
  }

  return (
    <ul className="-my-1 divide-y divide-gray-100">
      {items.map((c) => (
        <li key={c.id} className="flex items-center gap-3 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
            {String(c.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-gray-900">
              {c.name || "Unknown"}
            </div>
            <div className="truncate text-xs text-gray-500">{c.email || c.number}</div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <StatusBadge status={c.status} />
            <span className="text-xs text-gray-400">{fmtDate(c.created_at)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default RecentLeads;
