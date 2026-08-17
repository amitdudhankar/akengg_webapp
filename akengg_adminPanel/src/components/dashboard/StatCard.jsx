import { Link } from "react-router-dom";

// Icon tint per semantic tone — keeps the KPI grid colourful but consistent.
const tones = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
  rose: "bg-rose-50 text-rose-600",
  violet: "bg-violet-50 text-violet-600",
  slate: "bg-slate-100 text-slate-600",
};

/**
 * Compact metric tile: icon + label + value (+ optional sub-text). When `to`
 * is given the whole card becomes a link to that route.
 */
function StatCard({ icon: Icon, label, value, sub, tone = "indigo", to }) {
  const card = (
    <div className="flex h-full items-start gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${
          tones[tone] || tones.indigo
        }`}
      >
        {Icon && <Icon className="h-5 w-5" />}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm text-gray-500">{label}</div>
        <div className="mt-0.5 truncate text-2xl font-semibold text-gray-900">
          {value}
        </div>
        {sub && <div className="mt-0.5 truncate text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl">
      {card}
    </Link>
  ) : (
    card
  );
}

export default StatCard;
