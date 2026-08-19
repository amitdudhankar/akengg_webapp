import { Pencil, Trash2 } from "lucide-react";

/**
 * Edit/delete controls for a table row. These were bare <Pencil onClick> icons
 * before — not focusable, no accessible name, no hit area. Real buttons now.
 */
function RowActions({ onEdit, onDelete, editLabel = "Edit", deleteLabel = "Delete" }) {
  return (
    <div className="flex items-center gap-1">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          title={editLabel}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={deleteLabel}
          title={deleteLabel}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default RowActions;
