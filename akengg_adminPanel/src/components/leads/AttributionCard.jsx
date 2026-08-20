// Read-only marketing-attribution summary for the lead detail page's right
// rail: where the lead came from (source/medium/campaign/UTM params) plus
// the landing page / referrer URLs, which can be long so they're truncated
// and only rendered as real links when they're absolute URLs. Empty fields
// are omitted individually; only when every attribution field is empty does
// the card fall back to a single explanatory note.
import { formatDateDisplay } from "../../utils/date";

const ATTRIBUTION_FIELDS = [
  { name: "source", label: "Source" },
  { name: "medium", label: "Medium" },
  { name: "campaign", label: "Campaign" },
  { name: "utm_term", label: "UTM Term" },
  { name: "utm_content", label: "UTM Content" },
];

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(String(value || "").trim());

function LinkRow({ label, value }) {
  if (!value) return null;
  const absolute = isAbsoluteUrl(value);

  return (
    <div className="min-w-0 sm:col-span-2">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5">
        {absolute ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            title={value}
            className="block truncate text-sm text-indigo-600 hover:underline"
          >
            {value}
          </a>
        ) : (
          <span title={value} className="block truncate text-sm text-gray-700 underline decoration-dotted">
            {value}
          </span>
        )}
      </dd>
    </div>
  );
}

function AttributionCard({ lead }) {
  if (!lead) return null;

  const filledFields = ATTRIBUTION_FIELDS.filter((field) => lead[field.name]);
  const hasLandingPage = Boolean(lead.landing_page);
  const hasReferrer = Boolean(lead.referrer);
  const hasAnyAttribution = filledFields.length > 0 || hasLandingPage || hasReferrer;

  return (
    <div className="space-y-4">
      {hasAnyAttribution ? (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {filledFields.map((field) => (
            <div key={field.name} className="min-w-0">
              <dt className="text-xs text-gray-500">{field.label}</dt>
              <dd className="mt-0.5 truncate text-sm font-medium text-gray-900">
                {lead[field.name]}
              </dd>
            </div>
          ))}
          <LinkRow label="Landing Page" value={lead.landing_page} />
          <LinkRow label="Referrer" value={lead.referrer} />
        </dl>
      ) : (
        <p className="text-sm text-gray-500">No attribution data captured.</p>
      )}

      {lead.created_at && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500">First seen</p>
          <p className="mt-0.5 text-sm font-medium text-gray-900">
            {formatDateDisplay(lead.created_at)}
          </p>
        </div>
      )}
    </div>
  );
}

export default AttributionCard;
