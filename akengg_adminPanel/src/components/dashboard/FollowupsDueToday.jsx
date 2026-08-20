import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, Eye, MessageCircle, Phone } from "lucide-react";
import Panel from "./Panel";
import StatusBadge from "../ui/StatusBadge";
import PriorityBadge from "../ui/PriorityBadge";
import IconButton from "../ui/IconButton";
import EmptyState from "../ui/EmptyState";
import { telHref, waHref } from "../../utils/leadUtils";

/**
 * The single most important dashboard widget (per product requirements):
 * every sales follow-up due today, with one-tap call/WhatsApp and a link
 * into the lead. A standing banner surfaces overdue follow-ups whenever
 * there are any, since those need attention even more urgently than today's.
 * @param {{ items: any[], overdueCount?: number|null, className?: string }} props
 */
function FollowupsDueToday({ items = [], overdueCount, className = "" }) {
  return (
    <Panel
      title="Follow-ups Due Today"
      icon={CalendarClock}
      action={{ to: "/followups?tab=today", label: "View all" }}
      className={className}
    >
      {overdueCount > 0 && (
        <Link
          to="/followups?tab=overdue"
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 transition hover:bg-rose-100"
        >
          <span className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {overdueCount} overdue follow-up{overdueCount === 1 ? "" : "s"} need attention
          </span>
          <span className="shrink-0 text-xs font-semibold underline">View overdue</span>
        </Link>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="All caught up!"
          message="No follow-ups are due today — great work staying on top of the pipeline."
        />
      ) : (
        <ul className="-my-1 divide-y divide-gray-100">
          {items.map((f) => {
            const tel = telHref(f.phone);
            const wa = waHref(f.phone);
            return (
              <li key={f.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-gray-900">
                      {f.company_name || f.contact_person || "Unknown"}
                    </span>
                    <StatusBadge status={f.lead_status} />
                    <PriorityBadge priority={f.lead_priority} />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-gray-500">
                    {f.contact_person}
                    {f.contact_person && f.product ? " · " : ""}
                    {f.product}
                  </div>
                  {f.followup_time && (
                    <div className="mt-0.5 text-xs text-gray-400">{f.followup_time}</div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {tel && (
                    <IconButton
                      icon={Phone}
                      label={`Call ${f.contact_person || f.company_name || ""}`}
                      tone="emerald"
                      onClick={() => {
                        window.location.href = tel;
                      }}
                    />
                  )}
                  {wa && (
                    <IconButton
                      icon={MessageCircle}
                      label="WhatsApp"
                      tone="emerald"
                      onClick={() => window.open(wa, "_blank", "noopener,noreferrer")}
                    />
                  )}
                  {f.lead_id && (
                    <Link
                      to={`/leads/${f.lead_id}`}
                      aria-label="View lead"
                      title="View lead"
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export default FollowupsDueToday;
