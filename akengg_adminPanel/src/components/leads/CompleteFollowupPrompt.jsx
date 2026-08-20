// Small inline "schedule the next follow-up?" prompt shown right after a
// follow-up is marked complete. Product requirement: completing a follow-up
// always offers to schedule the next one in the same breath, pre-filled ~3
// days out with the same type as the one just completed.
//
// This exact prompt already lives inline inside components/leads/LeadFollowups.jsx
// (the lead detail page's own follow-up list), tightly coupled to that list's
// row markup and local state. Extracting *that* usage into this component
// would mean editing LeadFollowups.jsx, which another agent owns in this same
// effort, so it hasn't been touched. This component instead gives
// pages/Followups/FollowupsPage.jsx (a flat, cross-lead follow-up list) the
// same prompt without duplicating the JSX by hand. The two API calls
// (complete, schedule-next) are injected as callback props rather than
// imported here, so the component stays a pure "form + two buttons" and
// doesn't need to know which axios functions or lead id are involved -- if
// LeadFollowups.jsx is ever refactored to consume this too, it can just wire
// its own callbacks the same way.
import { useState } from "react";
import { FOLLOWUP_TYPES } from "../../config/leadConfig";
import { toDateInputValue } from "../../utils/date";
import Field from "../ui/Field";
import Button from "../ui/Button";

const getDateInDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateInputValue(d);
};

/**
 * @param {object} props
 * @param {{ type?: string }} props.followup - only `type` is read, to seed the default.
 * @param {"COMPLETE_ONLY"|"COMPLETE_SCHEDULE"|null} props.busyAction - which of
 *   this prompt's two actions is currently in flight, so only that button
 *   spins and both are disabled meanwhile.
 * @param {() => void} props.onCancel
 * @param {() => void} props.onCompleteOnly - perform the plain COMPLETE call.
 * @param {(nextForm: {followup_date: string, followup_time: string, type: string, notes: string}) => void} props.onCompleteAndSchedule
 */
function CompleteFollowupPrompt({
  followup,
  busyAction,
  onCancel,
  onCompleteOnly,
  onCompleteAndSchedule,
}) {
  const [nextForm, setNextForm] = useState({
    followup_date: getDateInDays(3),
    followup_time: "",
    type: followup?.type || "CALL",
    notes: "",
  });

  const isOnlyBusy = busyAction === "COMPLETE_ONLY";
  const isScheduleBusy = busyAction === "COMPLETE_SCHEDULE";
  const rowBusy = Boolean(busyAction);

  return (
    <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
      <p className="text-xs font-medium text-indigo-900">Schedule the next follow-up?</p>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          as="input"
          type="date"
          name="next_followup_date"
          label="Date"
          required
          value={nextForm.followup_date}
          onChange={(e) => setNextForm((c) => ({ ...c, followup_date: e.target.value }))}
        />
        <Field
          as="input"
          type="time"
          name="next_followup_time"
          label="Time"
          value={nextForm.followup_time}
          onChange={(e) => setNextForm((c) => ({ ...c, followup_time: e.target.value }))}
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
        <Button type="button" variant="ghost" disabled={rowBusy} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={isOnlyBusy}
          disabled={rowBusy}
          onClick={onCompleteOnly}
        >
          Just Complete
        </Button>
        <Button
          type="button"
          loading={isScheduleBusy}
          disabled={rowBusy || !nextForm.followup_date}
          onClick={() => onCompleteAndSchedule(nextForm)}
        >
          Complete &amp; Schedule Next
        </Button>
      </div>
    </div>
  );
}

export default CompleteFollowupPrompt;
