// Assignment & value panel for the lead detail page's right rail. Unlike
// LeadCustomerCard's single edit-toggle, every control here is always live
// with its own inline Save button, so any one field (e.g. just Priority) can
// be updated without touching the rest -- each row keeps a local `draft`
// that resyncs whenever the saved value changes underneath it (a save, or a
// reload triggered by some other action on the page), so a successful save
// always snaps the row back to "unchanged" with no extra plumbing.
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Field from "../ui/Field";
import Button from "../ui/Button";
import { PRIORITIES } from "../../config/leadConfig";
import { formatINR } from "../../utils/money";
import { toDateInputValue } from "../../utils/date";

function MetaRow({
  label,
  name,
  as = "input",
  type = "text",
  options,
  value,
  hint,
  min,
  step,
  parse = (v) => v,
  validate,
  onSave,
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const isDirty = draft !== (value ?? "");

  const handleSave = async () => {
    if (saving || !isDirty) return;

    if (validate) {
      const validationError = validate(draft);
      if (validationError) {
        toast.error(validationError);
        return;
      }
    }

    const toastId = toast.loading(`Saving ${label.toLowerCase()}...`);
    setSaving(true);
    try {
      await onSave({ [name]: parse(draft) });
      toast.success(`${label} updated`, { id: toastId });
    } catch (error) {
      toast.error(error?.response?.data?.message || `Failed to update ${label.toLowerCase()}`, {
        id: toastId,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start gap-2">
      <Field
        label={label}
        name={name}
        as={as}
        type={type}
        options={options}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        hint={hint}
        min={min}
        step={step}
        className="flex-1"
      />
      {/* pt-6 lines the button's top edge up with the input's top edge,
          matching Field's label height (text-sm + mb-1) regardless of
          whether this row also renders a hint line below the input. */}
      <div className="pt-6">
        <Button
          type="button"
          variant="secondary"
          loading={saving}
          disabled={!isDirty}
          onClick={handleSave}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

const nonNegativeNumberError = (draft) => {
  const trimmed = String(draft).trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return "Enter a non-negative number";
  return null;
};

const parseOptionalNumber = (v) => (String(v).trim() === "" ? null : Number(v));
const parseOptionalText = (v) => v || null;

function LeadMetaCard({ lead, users, onSave }) {
  if (!lead) return null;

  // A non-admin role may be forbidden from listing users -- LeadDetail.jsx
  // fails that fetch soft to an empty array rather than erroring the page.
  // An empty list means the picker can't be trusted, so hide the whole row
  // instead of showing an always-empty/broken select.
  const assignableUsers = Array.isArray(users) ? users : [];

  return (
    <div className="space-y-5">
      {assignableUsers.length > 0 && (
        <MetaRow
          label="Assigned To"
          name="assigned_to"
          as="select"
          options={[
            { value: "", label: "Unassigned" },
            ...assignableUsers.map((u) => ({ value: String(u.id), label: u.name })),
          ]}
          value={lead.assigned_to != null ? String(lead.assigned_to) : ""}
          parse={parseOptionalText}
          onSave={onSave}
        />
      )}

      <MetaRow
        label="Priority"
        name="priority"
        as="select"
        options={PRIORITIES}
        value={lead.priority || ""}
        onSave={onSave}
      />

      <MetaRow
        label="Estimated Value"
        name="estimated_value"
        type="number"
        min="0"
        step="0.01"
        hint={`Current: ${formatINR(lead.estimated_value)}`}
        value={lead.estimated_value ?? ""}
        parse={parseOptionalNumber}
        validate={nonNegativeNumberError}
        onSave={onSave}
      />

      <MetaRow
        label="Quotation Value"
        name="quotation_value"
        type="number"
        min="0"
        step="0.01"
        hint={`Current: ${formatINR(lead.quotation_value)}`}
        value={lead.quotation_value ?? ""}
        parse={parseOptionalNumber}
        validate={nonNegativeNumberError}
        onSave={onSave}
      />

      <MetaRow
        label="Next Follow-up Date"
        name="next_followup_date"
        type="date"
        value={toDateInputValue(lead.next_followup_date)}
        parse={parseOptionalText}
        onSave={onSave}
      />
    </div>
  );
}

export default LeadMetaCard;
