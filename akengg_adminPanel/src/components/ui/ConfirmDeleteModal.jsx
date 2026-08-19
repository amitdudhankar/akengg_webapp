import { AlertTriangle } from "lucide-react";
import Button from "./Button";

/**
 * Props are unchanged from the original so every existing caller keeps working;
 * only the presentation was brought in line with the rest of the admin.
 */
const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onDelete,
  title = "Delete Item",
  itemName,
  isChecked,
  setIsChecked,
  // Optional overrides so this modal can also confirm non-delete actions (e.g.
  // Cancel Document). Existing delete callers pass none → behaviour unchanged.
  actionLabel = "Delete",
  confirmLabel = "I understand this action cannot be undone",
  description,
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-modal-title" className="text-base font-semibold text-gray-900">
              {title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {description || "Are you sure you want to delete"}{" "}
              {itemName && (
                <span className="font-medium text-gray-900">{itemName}</span>
              )}
              {description ? "" : "?"}
            </p>
          </div>
        </div>

        <label className="mt-4 flex items-start gap-2.5 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => setIsChecked(!isChecked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
          />
          {confirmLabel}
        </label>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onDelete} disabled={!isChecked} loading={loading}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
