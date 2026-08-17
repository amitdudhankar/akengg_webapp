import React from "react";

const DeleteContactModal = ({
  isOpen,
  onClose,
  onDelete,
  email,
  isChecked,
  setIsChecked,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg sm:p-6">
        <h2 className="mb-4 text-xl font-semibold text-red-600">
          Delete Contact
        </h2>
        <p className="mb-4 text-gray-700">
          Are you sure you want to delete this contact:
          <br />
          <span className="font-semibold text-black">{email}</span>?
        </p>

        <label className="mb-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => setIsChecked(!isChecked)}
          />
          I understand this action cannot be undone
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteContactModal;
