// Generalized horizontal-bar breakdown — same bar-width math and Tailwind
// classes as DocTypeBreakdown, but driven by an arbitrary `rows` array
// instead of a fixed 4-key document-type list. Bars share one tone (indigo,
// this app's primary) rather than a per-row color, since rows here are a
// ranked magnitude list (report rows of unknown/variable length), not a
// fixed small set of distinct categories.
/**
 * @param {{
 *   rows: Array<{ label: string, value: number, sub?: string|number }>,
 *   barClassName?: string,
 * }} props
 */
function BreakdownBars({ rows = [], barClassName = "bg-indigo-500" }) {
  if (!rows.length) return null;

  const max = Math.max(1, ...rows.map((r) => Number(r.value) || 0));

  return (
    <div className="space-y-3.5">
      {rows.map((row, index) => {
        const value = Number(row.value) || 0;
        return (
          <div key={`${row.label}-${index}`}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="truncate pr-2 text-gray-600">{row.label}</span>
              <span className="shrink-0 whitespace-nowrap font-semibold text-gray-900">
                {value}
                {row.sub !== undefined && row.sub !== null && row.sub !== "" ? (
                  <span className="ml-1.5 font-normal text-gray-400">
                    ({row.sub})
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${barClassName} transition-all`}
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default BreakdownBars;
