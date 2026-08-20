// Read-only requirement summary for the lead detail page: the free-text
// requirement, then the structured technical_details object (captured by the
// public quote form) rendered as a two-column definition list. Any key not
// present in TECH_FIELD_LABELS still renders via formatEnumLabel() so a
// future/unknown technical field is never silently dropped.
import { TECH_FIELD_LABELS } from "../../config/leadConfig";
import { formatEnumLabel } from "../../utils/leadUtils";

// technical_details normally arrives as an already-parsed object, but is
// guarded defensively in case it ever comes across the wire as a raw JSON
// string -- a parse failure falls back to an empty object rather than
// throwing and breaking the whole card.
const parseTechnicalDetails = (raw) => {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? raw : {};
};

const techLabel = (key) => TECH_FIELD_LABELS[key] || formatEnumLabel(key);

const displayValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

function RequirementCard({ lead }) {
  if (!lead) return null;

  const technicalDetails = parseTechnicalDetails(lead.technical_details);
  const techEntries = Object.entries(technicalDetails);

  return (
    <div className="space-y-5">
      <p className="whitespace-pre-wrap text-sm text-gray-900">
        {lead.requirement || (
          <span className="text-gray-400">No requirement details captured.</span>
        )}
      </p>

      {techEntries.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Technical Details
          </h3>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {techEntries.map(([key, value]) => (
              <div key={key} className="min-w-0">
                <dt className="text-xs text-gray-500">{techLabel(key)}</dt>
                <dd className="mt-0.5 truncate text-sm font-medium text-gray-900">
                  {displayValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

export default RequirementCard;
