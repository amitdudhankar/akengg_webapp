import React from "react";

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
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg sm:p-6">
        <h2 className="mb-4 text-xl font-semibold text-red-600">{title}</h2>
        {description ? (
          <p className="mb-4 text-gray-700">
            {description}
            <br />
            <span className="font-semibold text-black">{itemName}</span>
          </p>
        ) : (
          <p className="mb-4 text-gray-700">
            Are you sure you want to delete:
            <br />
            <span className="font-semibold text-black">{itemName}</span>?
          </p>
        )}

        <label className="mb-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => setIsChecked(!isChecked)}
          />
          {confirmLabel}
        </label>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="w-full rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            disabled={!isChecked}
            className={`w-full rounded-md px-4 py-2 text-white sm:w-auto ${
              isChecked
                ? "bg-red-600 hover:bg-red-700"
                : "cursor-not-allowed bg-red-300"
            }`}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
