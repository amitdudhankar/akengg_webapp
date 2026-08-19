// Shared status pill. Covers document statuses (draft/finalized/cancelled),
// contact-lead statuses (new/contacted/closed) and newsletter subscription
// states; anything unrecognised falls back to neutral slate.
const styles = {
  draft: "bg-amber-100 text-amber-700",
  finalized: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  new: "bg-indigo-100 text-indigo-700",
  contacted: "bg-sky-100 text-sky-700",
  closed: "bg-slate-100 text-slate-600",
  subscribed: "bg-emerald-100 text-emerald-700",
  unsubscribed: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
};

function StatusBadge({ status }) {
  const key = String(status || "").toLowerCase();
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        styles[key] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "—"}
    </span>
  );
}

export default StatusBadge;
