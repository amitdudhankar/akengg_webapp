// Confirmation modal driving every lead status transition, rendered by
// LeadHeader.jsx whenever the user picks a different status than the lead
// currently has. Overlay/panel markup mirrors the document-related modal
// already in this codebase (components/documents/EmailDocumentModal.jsx --
// header with an icon-less title + X close button) using this admin's
// rounded-xl/border/shadow-xl card language for the panel itself.
//
// Three branches on targetStatus:
//   LOST  -- required lost reason + optional note.
//   WON   -- plain confirm, then (same modal, second inline step) an optional
//            convert-to-party + start-a-quotation offer.
//   other -- plain confirm + optional note.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { X } from "lucide-react";
import { updateLeadStatus, convertLeadToParty } from "../../api/api";
import { LEAD_STATUSES, LOST_REASONS } from "../../config/leadConfig";
import { formatEnumLabel } from "../../utils/leadUtils";
import Field from "../ui/Field";
import Button from "../ui/Button";

const STATUS_LABELS = LEAD_STATUSES.reduce((acc, status) => {
  acc[status.value] = status.label;
  return acc;
}, {});
const statusLabel = (value) => (value ? STATUS_LABELS[value] || formatEnumLabel(value) : "");

const LOST_REASON_OPTIONS = [{ value: "", label: "Select a reason" }, ...LOST_REASONS];

function StatusChangeModal({ lead, targetStatus, onClose, onChanged }) {
  const navigate = useNavigate();

  const isLost = targetStatus === "LOST";
  const isWon = targetStatus === "WON";

  const [lostReason, setLostReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // WON only: once the status change itself has succeeded this flips to
  // true and the same modal swaps to the optional convert-to-party step
  // instead of closing outright.
  const [wonSaved, setWonSaved] = useState(false);
  const [converting, setConverting] = useState(false);

  if (!lead || !targetStatus) return null;

  const handleClose = () => {
    if (submitting || converting) return;
    onClose?.();
    // The WON status change already committed server-side by this point --
    // closing without deciding on conversion still needs the parent to pick
    // up the new status.
    if (wonSaved) onChanged?.();
  };

  const handleConfirmStatus = async () => {
    if (isLost && !lostReason) {
      toast.error("Select a lost reason to continue");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    const toastId = toast.loading("Updating status...");
    try {
      const payload = isLost
        ? { status: "LOST", lost_reason: lostReason, lost_note: notes.trim() || undefined }
        : { status: targetStatus, notes: notes.trim() || undefined };
      await updateLeadStatus(lead.id, payload);
      toast.success("Status updated", { id: toastId });

      if (isWon) {
        // Stay open -- the convert-to-party offer follows immediately.
        setWonSaved(true);
      } else {
        onClose?.();
        onChanged?.();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update status", {
        id: toastId,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvert = async () => {
    if (converting) return;
    setConverting(true);
    const toastId = toast.loading("Creating client record...");
    try {
      const res = await convertLeadToParty(lead.id, {});
      const partyId = res?.data?.data?.party_id;
      toast.success("Client record created", { id: toastId });
      onClose?.();
      onChanged?.();
      navigate("/documents/quotation/new", {
        state: { partyId, reference: lead.lead_number },
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create client record", {
        id: toastId,
      });
    } finally {
      setConverting(false);
    }
  };

  const handleSkipConvert = () => {
    onClose?.();
    onChanged?.();
  };

  const title = isLost
    ? "Mark Lead as Lost"
    : isWon
    ? wonSaved
      ? "Create Client Record?"
      : "Mark Lead as Won"
    : `Change Status to ${statusLabel(targetStatus)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-change-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="status-change-modal-title" className="text-base font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="text-gray-400 transition hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isWon && wonSaved ? (
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{lead.lead_number}</span> is now marked
              Won. Create a client record and start a quotation for{" "}
              {lead.company_name || "this customer"}?
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={handleSkipConvert} disabled={converting}>
                Not now
              </Button>
              <Button loading={converting} onClick={handleConvert}>
                Create Client &amp; Quotation
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {isLost ? (
              <div className="space-y-4">
                <Field
                  as="select"
                  name="lost_reason"
                  label="Lost Reason"
                  required
                  options={LOST_REASON_OPTIONS}
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                />
                <Field
                  as="textarea"
                  name="lost_note"
                  label="Notes"
                  rows={3}
                  placeholder="Optional context, e.g. lost to a competitor's lower price."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            ) : isWon ? (
              <p className="text-sm text-gray-600">
                Mark <span className="font-medium text-gray-900">{lead.lead_number}</span> as
                Won? This records the win on the lead&apos;s status history.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Change status to{" "}
                  <span className="font-medium text-gray-900">{statusLabel(targetStatus)}</span>?
                </p>
                <Field
                  as="textarea"
                  name="notes"
                  label="Notes"
                  rows={3}
                  placeholder="Optional note for the status history."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant={isLost ? "danger" : "primary"}
                loading={submitting}
                disabled={isLost && !lostReason}
                onClick={handleConfirmStatus}
              >
                {isLost ? "Mark as Lost" : isWon ? "Mark as Won" : "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatusChangeModal;
