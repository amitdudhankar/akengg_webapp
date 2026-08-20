// Shared status pill. Covers document statuses (draft/finalized/cancelled),
// contact-lead statuses (new/contacted/closed), newsletter subscription
// states, and the 10-stage sales lead pipeline (new/contacted/qualified/
// site_visit/technical_discussion/quotation/negotiation/won/lost/on_hold);
// anything unrecognised falls back to neutral slate.
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
  qualified: "bg-violet-100 text-violet-700",
  site_visit: "bg-cyan-100 text-cyan-700",
  technical_discussion: "bg-blue-100 text-blue-700",
  quotation: "bg-amber-100 text-amber-700",
  negotiation: "bg-orange-100 text-orange-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-rose-100 text-rose-700",
  on_hold: "bg-yellow-100 text-yellow-800",
};

function StatusBadge({ status }) {
  const key = String(status || "").toLowerCase();
  // Normalise "site_visit" -> "Site visit": lowercase, turn underscores into
  // spaces, then capitalise only the first letter (CSS `capitalize` would
  // upper-case every word, e.g. "Site Visit", which we don't want here).
  const label = key ? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[key] || "bg-slate-100 text-slate-600"
      }`}
    >
      {label || "—"}
    </span>
  );
}

export default StatusBadge;
