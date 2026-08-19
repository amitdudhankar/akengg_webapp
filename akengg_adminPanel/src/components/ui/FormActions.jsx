import Button from "./Button";

/**
 * Submit/Cancel row. `saving` drives the spinner and disables the button, which
 * is what stops a double submit.
 */
function FormActions({ saving = false, submitLabel = "Save", onCancel, cancelLabel = "Cancel" }) {
  return (
    <div className="md:col-span-2 mt-2 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row">
      {onCancel && (
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          {cancelLabel}
        </Button>
      )}
      <Button type="submit" loading={saving}>
        {saving ? "Saving..." : submitLabel}
      </Button>
    </div>
  );
}

export default FormActions;
