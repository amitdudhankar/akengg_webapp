import { useNavigate } from "react-router-dom";
import { Phone } from "lucide-react";
import StatusBadge from "../../components/ui/StatusBadge";
import PriorityBadge from "../../components/ui/PriorityBadge";
import { formatDateDisplay } from "../../utils/date";
import { isOverdue, isDueToday, telHref } from "../../utils/leadUtils";

/**
 * Compact card used in place of the desktop table below the md breakpoint.
 * The whole card is a clickable region that navigates to the lead's detail
 * page; the phone number gets its own small tel: button that stops the click
 * from bubbling up so tapping it calls instead of opening the detail page.
 */
function LeadCard({ lead }) {
  const navigate = useNavigate();
  if (!lead) return null;

  const overdue = isOverdue(lead.next_followup_date);
  const dueToday = isDueToday(lead.next_followup_date);
  const followupClass = overdue
    ? "font-medium text-rose-600"
    : dueToday
    ? "font-medium text-amber-600"
    : "text-gray-500";

  const goToDetail = () => navigate(`/leads/${lead.id}`);

  const handleCall = (e) => {
    e.stopPropagation();
    const href = telHref(lead.phone);
    if (href) window.location.href = href;
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={goToDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToDetail();
        }
      }}
      className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-indigo-100 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      {/* Line 1: lead number + status + priority */}
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-sm font-semibold text-indigo-600">
          {lead.lead_number}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusBadge status={lead.status} />
          <PriorityBadge priority={lead.priority} />
        </div>
      </div>

      {/* Line 2: company + contact person */}
      <div className="mt-2.5 min-w-0">
        <p className="truncate text-sm font-bold text-gray-900">
          {lead.company_name || <span className="font-normal text-gray-400">No company</span>}
        </p>
        <p className="truncate text-xs text-gray-500">
          {lead.contact_person || <span className="text-gray-300">—</span>}
        </p>
      </div>

      {/* Line 3: product + source */}
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <span className="truncate">{lead.product || "—"}</span>
        {lead.source ? (
          <>
            <span className="text-gray-300">&bull;</span>
            <span className="truncate">{lead.source}</span>
          </>
        ) : null}
      </div>

      {/* Line 4: next follow-up + created, and a quick-call button for the phone */}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-gray-50 pt-2.5 text-xs">
        <div className="min-w-0">
          <p className={followupClass}>
            {lead.next_followup_date
              ? `Follow-up: ${formatDateDisplay(lead.next_followup_date)}`
              : "No follow-up set"}
          </p>
          <p className="mt-0.5 text-gray-400">Created {formatDateDisplay(lead.created_at)}</p>
        </div>
        {lead.phone ? (
          <button
            type="button"
            onClick={handleCall}
            aria-label={`Call ${lead.phone}`}
            title={lead.phone}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Phone className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default LeadCard;
