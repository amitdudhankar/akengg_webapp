// A read-only, reverse-chronological timeline of a lead's status transitions.
// The very first entry (created at public quote-form submission time) has no
// human actor -- it falls back to "System" rather than showing a blank.
import { LEAD_STATUSES } from "../../config/leadConfig";
import { formatEnumLabel } from "../../utils/leadUtils";
import { formatDateDisplay } from "../../utils/date";

const STATUS_LABELS = LEAD_STATUSES.reduce((acc, status) => {
  acc[status.value] = status.label;
  return acc;
}, {});

// Falls back to formatEnumLabel() for any status value not (yet) in
// leadConfig's lookup table, so an unrecognised future status never renders
// as a raw upper-snake-case string.
const statusLabel = (value) => (value ? STATUS_LABELS[value] || formatEnumLabel(value) : "");

function StatusHistory({ history }) {
  const entries = Array.isArray(history) ? history : [];

  // Defensively sort newest-first -- render should not depend on the API
  // always returning the array in a particular order.
  const sorted = [...entries].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );

  if (!sorted.length) {
    return <p className="text-sm text-gray-500">No status changes recorded yet.</p>;
  }

  return (
    <ol>
      {sorted.map((entry, index) => {
        const actor = entry.changed_by_name || entry.changed_by || "System";
        const isLast = index === sorted.length - 1;

        return (
          <li
            key={entry.id ?? `${entry.created_at}-${index}`}
            className="relative pb-5 pl-5 last:pb-0"
          >
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-[5px] top-2.5 h-full w-px bg-gray-200"
              />
            )}
            <span
              aria-hidden="true"
              className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-500 ring-2 ring-indigo-100"
            />

            <div className="text-sm">
              <p className="font-medium text-gray-900">
                {entry.old_status && (
                  <>
                    <span className="text-gray-500">{statusLabel(entry.old_status)}</span>
                    <span className="mx-1.5 text-gray-400">&rarr;</span>
                  </>
                )}
                <span>{statusLabel(entry.new_status)}</span>
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {actor} &middot; {formatDateDisplay(entry.created_at) || "—"}
              </p>
              {entry.notes && (
                <p className="mt-1 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600">
                  {entry.notes}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default StatusHistory;
