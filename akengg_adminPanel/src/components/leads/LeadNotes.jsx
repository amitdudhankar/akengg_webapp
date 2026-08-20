// Notes panel for the lead detail page: a free-text add form up top, then
// every existing note rendered newest-first underneath. Mirrors
// StatusHistory.jsx's "System" fallback for an entry with no resolvable
// human author, and its defensive re-sort -- render should never depend on
// the API already returning notes in a particular order.
import { useState } from "react";
import { toast } from "react-hot-toast";
import { addLeadNote } from "../../api/api";
import { formatDateDisplay } from "../../utils/date";
import Field from "../ui/Field";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import { StickyNote } from "lucide-react";

function LeadNotes({ leadId, notes, onNoteAdded }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const noteList = Array.isArray(notes) ? notes : [];
  const sorted = [...noteList].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = note.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    const toastId = toast.loading("Adding note...");
    try {
      await addLeadNote(leadId, { note: trimmed });
      toast.success("Note added", { id: toastId });
      setNote("");
      onNoteAdded?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add note", {
        id: toastId,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <Field
          as="textarea"
          name="note"
          label="Add a note"
          rows={3}
          placeholder="Log a call summary, an internal remark, anything worth remembering..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <Button type="submit" loading={saving} disabled={!note.trim()}>
            Add Note
          </Button>
        </div>
      </form>

      <div className="mt-5 border-t border-gray-100 pt-4">
        {sorted.length === 0 ? (
          <EmptyState icon={StickyNote} title="No notes yet" message="Notes added here are visible to the whole team." />
        ) : (
          <ul className="space-y-3">
            {sorted.map((entry, index) => {
              const author = entry.created_by_name || entry.author_name || "System";
              return (
                <li
                  key={entry.id ?? `${entry.created_at}-${index}`}
                  className="rounded-lg bg-gray-50 p-3"
                >
                  <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{author}</span>
                    <span>{formatDateDisplay(entry.created_at) || "—"}</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-800">
                    {entry.note}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default LeadNotes;
