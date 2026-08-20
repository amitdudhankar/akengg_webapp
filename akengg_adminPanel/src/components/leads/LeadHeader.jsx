// Full-width header for the lead detail page: lead number + status/priority
// pills, one-tap Call/WhatsApp/Email quick actions, and the status control
// that drives StatusChangeModal (built alongside this file by another agent
// in the same effort -- see the prop contract on that component below).
import { useState } from "react";
import { ChevronDown, Mail, MessageCircle, Phone } from "lucide-react";
import Card from "../ui/Card";
import StatusBadge from "../ui/StatusBadge";
import PriorityBadge from "../ui/PriorityBadge";
import { LEAD_STATUSES } from "../../config/leadConfig";
import { telHref, waHref } from "../../utils/leadUtils";
import StatusChangeModal from "./StatusChangeModal";

const quickActionClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

function LeadHeader({ lead, onStatusChanged }) {
  // Tracks which status the user just picked from the select, pending
  // confirmation in StatusChangeModal -- null means no modal is open. The
  // select itself stays controlled by lead.status, so cancelling the modal
  // snaps the select back to the current value with no extra reset logic.
  const [targetStatus, setTargetStatus] = useState(null);

  if (!lead) return null;

  const tel = telHref(lead.phone);
  const waMessage = `Hi ${lead.contact_person || "there"}, this is regarding your enquiry ${
    lead.lead_number || ""
  }${lead.product ? ` for ${lead.product}` : ""}.`.replace(/\s+/g, " ").trim();
  const wa = waHref(lead.phone, waMessage);
  const mailHref = lead.email
    ? `mailto:${lead.email}?subject=${encodeURIComponent(
        `Regarding Lead ${lead.lead_number || ""}`.trim()
      )}`
    : null;

  const handleStatusSelect = (e) => {
    const next = e.target.value;
    if (next && next !== lead.status) setTargetStatus(next);
  };

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-lg font-semibold tracking-tight text-gray-900 sm:text-xl">
              {lead.lead_number || "—"}
            </h1>
            <StatusBadge status={lead.status} />
            <PriorityBadge priority={lead.priority} />
          </div>
          <p className="mt-1 truncate text-sm text-gray-600">
            {lead.contact_person || "Unnamed contact"}
            {lead.company_name ? ` · ${lead.company_name}` : ""}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {tel && (
              <a href={tel} className={quickActionClass}>
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className={quickActionClass}>
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
            {mailHref && (
              <a href={mailHref} className={quickActionClass}>
                <Mail className="h-3.5 w-3.5" /> Email
              </a>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <label
            htmlFor="lead-status-select"
            className="mb-1 block text-xs font-medium text-gray-500"
          >
            Change status
          </label>
          <div className="relative">
            <select
              id="lead-status-select"
              value={lead.status || ""}
              onChange={handleStatusSelect}
              className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-800 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-56"
            >
              {LEAD_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {targetStatus && (
        <StatusChangeModal
          lead={lead}
          targetStatus={targetStatus}
          onClose={() => setTargetStatus(null)}
          onChanged={() => {
            setTargetStatus(null);
            onStatusChanged?.();
          }}
        />
      )}
    </Card>
  );
}

export default LeadHeader;
