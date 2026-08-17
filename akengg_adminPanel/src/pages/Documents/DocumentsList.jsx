import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Pencil,
  Trash2,
  Download,
  FileText,
  Plus,
  ChevronDown,
  Copy,
  Ban,
} from "lucide-react";
import {
  fetchDocuments,
  deleteDocument,
  downloadDocumentPdf,
  downloadDocumentDocx,
  duplicateDocument,
  cancelDocument,
} from "../../api/api";
import Pagination from "../../components/ui/Pagination";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import { formatINR } from "../../utils/money";
import { DOC_TYPES, TYPE_LABELS, TYPE_TO_SLUG } from "../../config/docConfig";
import { useAuth } from "../../context/AuthContext";
import { toDateInputValue } from "../../utils/date";

const STATUS_BADGE = {
  draft: "bg-yellow-100 text-yellow-700",
  finalized: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function DocumentsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const [documents, setDocuments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadingWordId, setDownloadingWordId] = useState(null);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newMenuRef = useRef(null);
  // Cancel-confirm modal (separate from the delete modal).
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelChecked, setCancelChecked] = useState(false);

  // Close the "New Document" dropdown on any outside click.
  useEffect(() => {
    if (!newMenuOpen) return undefined;
    const onClick = (e) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target)) {
        setNewMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [newMenuOpen]);

  // Debounce the search box so we don't refetch on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const getDocuments = async () => {
    try {
      const res = await fetchDocuments({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: debouncedSearch.trim() || undefined,
        page,
        limit,
      });
      setDocuments(res?.data?.data || []);
      setTotalPages(res?.data?.pagination?.totalPages || 1);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch documents");
    }
  };

  // Server-side pagination: refetch when filters or the page change.
  useEffect(() => {
    getDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, debouncedSearch, page]);

  // If the current page falls past the end (e.g. after a delete), step back.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const handleDeleteClick = (doc) => {
    setSelected(doc);
    setIsChecked(false);
    setIsModalOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!isChecked) {
      toast.error("You must confirm the deletion.");
      return;
    }
    if (!selected?.id) return;
    try {
      const res = await deleteDocument(selected.id);
      toast.success(res?.data?.message || "Document deleted successfully");
      setIsModalOpen(false);
      setSelected(null);
      getDocuments();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete document");
    }
  };

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id);
    const loadingToast = toast.loading("Preparing PDF...");
    try {
      const res = await downloadDocumentPdf(doc.id);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const baseName = doc.doc_number
        ? doc.doc_number.replace(/[\\/]/g, "-")
        : `${doc.doc_type || "document"}-draft-${doc.id}`;
      link.download = `${baseName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded", { id: loadingToast });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to download PDF", {
        id: loadingToast,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadWord = async (doc) => {
    setDownloadingWordId(doc.id);
    const loadingToast = toast.loading("Preparing Word file...");
    try {
      const res = await downloadDocumentDocx(doc.id);
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const baseName = doc.doc_number
        ? doc.doc_number.replace(/[\\/]/g, "-")
        : `${doc.doc_type || "document"}-draft-${doc.id}`;
      link.download = `${baseName}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Word file downloaded", { id: loadingToast });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to download Word file", {
        id: loadingToast,
      });
    } finally {
      setDownloadingWordId(null);
    }
  };

  const handleEdit = (doc) => {
    const slug = TYPE_TO_SLUG[doc.doc_type] || "tax-invoice";
    navigate(`/documents/${slug}/edit/${doc.id}`);
  };

  // Duplicate → fresh draft of the same type; open it for editing.
  const handleDuplicate = async (doc) => {
    setActionBusyId(doc.id);
    const loadingToast = toast.loading("Duplicating...");
    try {
      const res = await duplicateDocument(doc.id);
      const nd = res?.data?.data;
      if (!nd?.id) throw new Error("Duplicate failed");
      toast.success("Duplicated as a new draft", { id: loadingToast });
      const slug = TYPE_TO_SLUG[nd.doc_type] || "tax-invoice";
      navigate(`/documents/${slug}/edit/${nd.id}`);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to duplicate document",
        { id: loadingToast }
      );
    } finally {
      setActionBusyId(null);
    }
  };

  const handleCancelClick = (doc) => {
    setCancelTarget(doc);
    setCancelChecked(false);
  };

  const handleCancelConfirmed = async () => {
    if (!cancelChecked || !cancelTarget?.id) return;
    setActionBusyId(cancelTarget.id);
    const loadingToast = toast.loading("Cancelling...");
    try {
      const res = await cancelDocument(cancelTarget.id);
      toast.success(res?.data?.message || "Document cancelled", {
        id: loadingToast,
      });
      setCancelTarget(null);
      setCancelChecked(false);
      getDocuments();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to cancel document", {
        id: loadingToast,
      });
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-indigo-600">Documents</h1>

        {/* "New Document" dropdown — one entry per configured document type. */}
        <div className="relative w-full sm:w-auto" ref={newMenuRef}>
          <button
            type="button"
            onClick={() => setNewMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={newMenuOpen}
            className="flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            New Document
            <ChevronDown className="h-4 w-4" />
          </button>

          {newMenuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg sm:w-56"
            >
              {DOC_TYPES.map((cfg) => (
                <button
                  key={cfg.key}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setNewMenuOpen(false);
                    navigate(`/documents/${cfg.key}/new`);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {cfg.title}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-md border border-gray-300 p-2 sm:w-auto"
        >
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-md border border-gray-300 p-2 sm:w-auto"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="finalized">Finalized</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          type="text"
          placeholder="Search number / party..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-md border border-gray-300 p-2 sm:min-w-[240px]"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border border-gray-200 divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Sr</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Number</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Type</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Party</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Date</th>
              <th className="px-4 py-2 text-right font-medium text-gray-700">Grand Total</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {documents.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-4 text-center text-gray-500">
                  No documents found.
                </td>
              </tr>
            ) : (
              documents.map((doc, index) => {
                const isDraft = doc.status === "draft";
                const rowBusy = actionBusyId === doc.id;
                return (
                  <tr key={doc.id}>
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2 font-mono">
                      {doc.doc_number || <span className="italic text-gray-400">Draft</span>}
                    </td>
                    <td className="px-4 py-2">{TYPE_LABELS[doc.doc_type] || doc.doc_type}</td>
                    <td className="px-4 py-2">
                      {doc.party_name || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      {doc.doc_date ? toDateInputValue(doc.doc_date) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right">{formatINR(doc.grand_total)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${
                          STATUS_BADGE[doc.status] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-4">
                        <Pencil
                          className="cursor-pointer text-blue-600 hover:text-blue-800"
                          aria-label="Edit"
                          onClick={() => handleEdit(doc)}
                        />
                        <button
                          type="button"
                          aria-label="Download PDF"
                          title="Download PDF"
                          disabled={downloadingId === doc.id}
                          onClick={() => handleDownload(doc)}
                          className="disabled:opacity-50"
                        >
                          <Download className="cursor-pointer text-indigo-600 hover:text-indigo-800" />
                        </button>
                        <button
                          type="button"
                          aria-label="Download Word"
                          title="Download Word"
                          disabled={downloadingWordId === doc.id}
                          onClick={() => handleDownloadWord(doc)}
                          className="disabled:opacity-50"
                        >
                          <FileText className="cursor-pointer text-blue-600 hover:text-blue-800" />
                        </button>
                        <button
                          type="button"
                          aria-label="Duplicate"
                          title="Duplicate"
                          disabled={rowBusy}
                          onClick={() => handleDuplicate(doc)}
                          className="disabled:opacity-50"
                        >
                          <Copy className="cursor-pointer text-gray-600 hover:text-gray-800" />
                        </button>
                        {doc.status === "finalized" && isAdmin ? (
                          <button
                            type="button"
                            aria-label="Cancel document"
                            title="Cancel document"
                            disabled={rowBusy}
                            onClick={() => handleCancelClick(doc)}
                            className="disabled:opacity-50"
                          >
                            <Ban className="cursor-pointer text-red-600 hover:text-red-800" />
                          </button>
                        ) : null}
                        {isDraft && isAdmin ? (
                          <Trash2
                            className="cursor-pointer text-red-600 hover:text-red-800"
                            aria-label="Delete"
                            onClick={() => handleDeleteClick(doc)}
                          />
                        ) : (
                          <Trash2 className="text-gray-300" aria-label="Delete disabled" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDeleteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDeleteConfirmed}
        title="Delete Document"
        itemName={selected?.doc_number || `${TYPE_LABELS[selected?.doc_type] || "Document"} draft`}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(cancelTarget)}
        onClose={() => {
          setCancelTarget(null);
          setCancelChecked(false);
        }}
        onDelete={handleCancelConfirmed}
        title="Cancel Document"
        description="This document will be marked cancelled. Its number is retained and cannot be reused:"
        itemName={
          cancelTarget?.doc_number ||
          `${TYPE_LABELS[cancelTarget?.doc_type] || "Document"}`
        }
        actionLabel="Cancel Document"
        confirmLabel="I understand this cannot be undone"
        isChecked={cancelChecked}
        setIsChecked={setCancelChecked}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

export default DocumentsList;

