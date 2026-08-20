// Standalone priority pill for sales leads. Kept separate from StatusBadge's
// lookup map since priority (LOW/MEDIUM/HIGH/URGENT) is a conceptually
// different axis from status; anything unrecognised falls back to neutral
// slate showing the raw value so it never crashes on an unexpected value.
const styles = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-sky-100 text-sky-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-rose-100 text-rose-700",
};

function PriorityBadge({ priority }) {
  const key = String(priority || "").toLowerCase();
  const label = key ? key.charAt(0).toUpperCase() + key.slice(1) : String(priority ?? "—");
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

export default PriorityBadge;
