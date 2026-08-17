import React from "react";

const DeleteBlog = ({ isOpen, onClose, onDelete, itemName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg sm:p-6">
        <h2 className="mb-4 text-xl font-semibold text-red-600">Delete Blog</h2>
        <p className="mb-4 text-gray-700">
          Are you sure you want to delete this <b>{itemName}</b>?
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="w-full rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            className="w-full rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 sm:w-auto"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteBlog;
