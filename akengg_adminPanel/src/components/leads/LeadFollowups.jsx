// Follow-ups panel for the lead detail page: a schedule form up top, then the
// existing follow-ups below with pending ones first and the isOverdue
// treatment applied to any still-pending one whose date has passed.
//
// Product requirement: completing a follow-up always offers to schedule the
// next one in the same breath, pre-filled ~3 days out with the same type as
// the one just completed. That happens via a small inline prompt embedded
// under the row being completed rather than a separate modal.
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Ban, CalendarClock, Check, X } from "lucide-react";
import { addLeadFollowup, updateLeadFollowup } from "../../api/api";
import { FOLLOWUP_TYPES } from "../../config/leadConfig";
import { formatEnumLabel, isOverdue } from "../../utils/leadUtils";
import { formatDateDisplay, toDateInputValue } from "../../utils/date";
import Field from "../ui/Field";
import Button from "../ui/Button";
import FormActions from "../ui/FormActions";
import IconButton from "../ui/IconButton";
import EmptyState from "../ui/EmptyState";

const TYPE_LABELS = FOLLOWUP_TYPES.reduce((acc, t) => {
  acc[t.value] = t.label;
  return acc;
}, {});
const typeLabel = (value) => (value ? TYPE_LABELS[value] || formatEnumLabel(value) : "");

const STATUS_STYLES = {
  PENDING: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  MISSED: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};
const STATUS_LABELS = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  MISSED: "Missed",
  CANCELLED: "Cancelled",
};

const emptyForm = { followup_date: "", followup_time: "", type: "CALL", notes: "" };

const getDateInDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateInputValue(d);
};

// Ascending date order, but every still-PENDING follow-up sorts ahead of any
// COMPLETED/MISSED/CANCELLED one regardless of date.
const sortFollowups = (list) =>
  [...list].sort((a, b) => {
    const aPending = a.status === "PENDING" ? 0 : 1;
    const bPending = b.status === "PENDING" ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return toDateInputValue(a.followup_date).localeCompare(toDateInputValue(b.followup_date));
  });

function LeadFollowups({ leadId, followups, onChanged }) {
  const [form, setForm] = useState(emptyForm);
  const [scheduling, setScheduling] = useState(false);

  // Which followup's "schedule the next one?" prompt is open, and the
  // pre-filled draft for that prompt.
  const [completingId, setCompletingId] = useState(null);
  const [nextForm, setNextForm] = useState(emptyForm);

  // `${followupId}-${ACTION}` of whichever single action is currently
  // in-flight, so only that row/button shows a spinner and every action on
  // that row is disabled meanwhile.
  const [actionId, setActionId] = useState(null);

  const followupList = Array.isArray(followups) ? followups : [];
  const sorted = sortFollowups(followupList);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!form.followup_date || scheduling) return;

    setScheduling(true);
    const toastId = toast.loading("Scheduling follow-up...");
    try {
      const payload = { followup_date: form.followup_date, type: form.type };
      if (form.followup_time) payload.followup_time = form.followup_time;
      if (form.notes.trim()) payload.notes = form.notes.trim();
      await addLeadFollowup(leadId, payload);
      toast.success("Follow-up scheduled", { id: toastId });
      setForm(emptyForm);
      onChanged?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to schedule follow-up", {
        id: toastId,
      });
    } finally {
      setScheduling(false);
    }
  };

  const openCompletePrompt = (followup) => {
    setCompletingId(followup.id);
    setNextForm({
      followup_date: getDateInDays(3),
      followup_time: "",
      type: followup.type || "CALL",
      notes: "",
    });
  };

  const closeCompletePrompt = () => setCompletingId(null);

  const performComplete = async (followup, scheduleNext) => {
    const actionKey = `${followup.id}-${scheduleNext ? "COMPLETE_SCHEDULE" : "COMPLETE_ONLY"}`;
    setActionId(actionKey);
    const toastId = toast.loading("Completing follow-up...");
    try {
      await updateLeadFollowup(leadId, followup.id, { action: "COMPLETE" });

      if (scheduleNext) {
        try {
          const payload = { followup_date: nextForm.followup_date, type: nextForm.type };
          if (nextForm.followup_time) payload.followup_time = nextForm.followup_time;
          if (nextForm.notes.trim()) payload.notes = nextForm.notes.trim();
          await addLeadFollowup(leadId, payload);
          toast.success("Follow-up completed and next one scheduled", { id: toastId });
        } catch (scheduleError) {
          // The completion itself already succeeded -- don't report this as a
          // full failure, but do surface that the follow-on scheduling didn't.
          toast.error(
            scheduleError?.response?.data?.message ||
              "Follow-up completed, but scheduling the next one failed",
            { id: toastId }
          );
        }
      } else {
        toast.success("Follow-up completed", { id: toastId });
      }

      setCompletingId(null);
      onChanged?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to complete follow-up", {
        id: toastId,
      });
    } finally {
      setActionId(null);
    }
  };

  const handleSimpleAction = async (followup, action) => {
    setActionId(`${followup.id}-${action}`);
    const toastId = toast.loading(
      action === "MISS" ? "Marking as missed..." : "Cancelling follow-up..."
    );
    try {
      await updateLeadFollowup(leadId, followup.id, { action });
      toast.success(action === "MISS" ? "Marked as missed" : "Follow-up cancelled", {
        id: toastId,
      });
      onChanged?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Action failed", { id: toastId });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <form onSubmit={handleSchedule} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          as="input"
          type="date"
          name="followup_date"
          label="Date"
          required
          value={form.followup_date}
          onChange={handleFormChange}
        />
        <Field
          as="input"
          type="time"
          name="followup_time"
          label="Time"
          value={form.followup_time}
          onChange={handleFormChange}
        />
        <Field
          as="select"
          name="type"
          label="Type"
          options={FOLLOWUP_TYPES}
          value={form.type}
          onChange={handleFormChange}
        />
        <Field
          as="textarea"
          name="notes"
          label="Notes"
          rows={2}
          value={form.notes}
          onChange={handleFormChange}
          full
        />
        <FormActions saving={scheduling} submitLabel="Schedule Follow-up" />
      </form>

      <div className="mt-5 border-t border-gray-100 pt-4">
        {sorted.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No follow-ups yet"
            message="Schedule the next call, site visit, or check-in above."
          />
        ) : (
          <ul className="space-y-3">
            {sorted.map((f) => {
              const overdue = f.status === "PENDING" && isOverdue(f.followup_date);
              const isOnlyBusy = actionId === `${f.id}-COMPLETE_ONLY`;
              const isScheduleBusy = actionId === `${f.id}-COMPLETE_SCHEDULE`;
              const isMissBusy = actionId === `${f.id}-MISS`;
              const isCancelBusy = actionId === `${f.id}-CANCEL`;
              const rowBusy = isOnlyBusy || isScheduleBusy || isMissBusy || isCancelBusy;

              return (
                <li
                  key={f.id}
                  className={`rounded-lg border p-3 ${
                    overdue ? "border-rose-200 bg-rose-50/60" : "border-gray-100"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {formatDateDisplay(f.followup_date) || "—"}
                          {f.followup_time ? ` · ${f.followup_time}` : ""}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_STYLES[f.status] || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {STATUS_LABELS[f.status] || formatEnumLabel(f.status)}
                        </span>
                        {overdue && (
                          <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{typeLabel(f.type)}</p>
                      {f.notes && (
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-700">
                          {f.notes}
                        </p>
                      )}
                    </div>

                    {f.status === "PENDING" && (
                      <div className="flex shrink-0 gap-1">
                        <IconButton
                          icon={Check}
                          label="Complete"
                          tone="emerald"
                          disabled={rowBusy}
                          onClick={() => openCompletePrompt(f)}
                        />
                        <IconButton
                          icon={X}
                          label="Mark as missed"
                          tone="rose"
                          disabled={rowBusy}
                          onClick={() => handleSimpleAction(f, "MISS")}
                        />
                        <IconButton
                          icon={Ban}
                          label="Cancel follow-up"
                          tone="gray"
                          disabled={rowBusy}
                          onClick={() => handleSimpleAction(f, "CANCEL")}
                        />
                      </div>
                    )}
                  </div>

                  {completingId === f.id && (
                    <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                      <p className="text-xs font-medium text-indigo-900">
                        Schedule the next follow-up?
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field
                          as="input"
                          type="date"
                          name="next_followup_date"
                          label="Date"
                          required
                          value={nextForm.followup_date}
                          onChange={(e) =>
                            setNextForm((c) => ({ ...c, followup_date: e.target.value }))
                          }
                        />
                        <Field
                          as="input"
                          type="time"
                          name="next_followup_time"
                          label="Time"
                          value={nextForm.followup_time}
                          onChange={(e) =>
                            setNextForm((c) => ({ ...c, followup_time: e.target.value }))
                          }
                        />
                        <Field
                          as="select"
                          name="next_followup_type"
                          label="Type"
                          options={FOLLOWUP_TYPES}
                          value={nextForm.type}
                          onChange={(e) => setNextForm((c) => ({ ...c, type: e.target.value }))}
                          className="sm:col-span-2"
                        />
                        <Field
                          as="textarea"
                          name="next_followup_notes"
                          label="Notes"
                          rows={2}
                          value={nextForm.notes}
                          onChange={(e) => setNextForm((c) => ({ ...c, notes: e.target.value }))}
                          className="sm:col-span-2"
                        />
                      </div>
                      <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={rowBusy}
                          onClick={closeCompletePrompt}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          loading={isOnlyBusy}
                          disabled={rowBusy}
                          onClick={() => performComplete(f, false)}
                        >
                          Just Complete
                        </Button>
                        <Button
                          type="button"
                          loading={isScheduleBusy}
                          disabled={rowBusy || !nextForm.followup_date}
                          onClick={() => performComplete(f, true)}
                        >
                          Complete &amp; Schedule Next
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default LeadFollowups;
