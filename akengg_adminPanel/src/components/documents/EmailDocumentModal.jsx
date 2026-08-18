import React, { useEffect, useState } from "react";
import { Mail, X } from "lucide-react";
import { TYPE_LABELS } from "../../config/docConfig";

// Compose window for "email this document". Every field is optional on the
// wire — leaving them untouched sends to the party's stored address under a
// server-generated subject — but we prefill "To" from the party so the user
// can see (and correct) where it is going before sending.
//
// The PDF is attached server-side; nothing is uploaded from here.
const EmailDocumentModal = ({ isOpen, document: doc, onClose, onSend, isSending }) => {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [message, setMessage] = useState("");

  // Reset the form whenever a different document is opened.
  useEffect(() => {
    if (isOpen) {
      setTo(doc?.party_email || "");
      setCc("");
      setMessage("");
    }
  }, [isOpen, doc?.id, doc?.party_email]);

  if (!isOpen) return null;

  const typeLabel = TYPE_LABELS[doc?.doc_type] || "Document";
  const canSend = to.trim().length > 0 && !isSending;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSend) return;
    onSend({
      to: to.trim(),
      cc: cc.trim() || undefined,
      message: message.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-lg sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-indigo-600">
            <Mail className="h-5 w-5" />
            Email {typeLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 transition hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          <span className="font-mono font-semibold text-black">
            {doc?.doc_number}
          </span>{" "}
          will be sent as a PDF attachment
          {doc?.party_name ? ` to ${doc.party_name}` : ""}.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            To <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="customer@example.com"
            required
            className="mb-1 w-full rounded-md border border-gray-300 p-2"
          />
          <p className="mb-3 text-xs text-gray-500">
            Separate multiple addresses with commas.
          </p>

          <label className="mb-1 block text-sm font-medium text-gray-700">
            Cc
          </label>
          <input
            type="text"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="accounts@example.com (optional)"
            className="mb-3 w-full rounded-md border border-gray-300 p-2"
          />

          <label className="mb-1 block text-sm font-medium text-gray-700">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={5000}
            placeholder="Optional note to include above the document details."
            className="mb-4 w-full rounded-md border border-gray-300 p-2"
          />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="w-full rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 disabled:opacity-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSend}
              className={`w-full rounded-md px-4 py-2 text-white sm:w-auto ${
                canSend
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "cursor-not-allowed bg-indigo-300"
              }`}
            >
              {isSending ? "Sending..." : "Send Email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailDocumentModal;
