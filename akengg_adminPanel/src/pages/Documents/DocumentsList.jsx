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
  Mail,
} from "lucide-react";
import {
  fetchDocuments,
  deleteDocument,
  downloadDocumentPdf,
  downloadDocumentDocx,
  duplicateDocument,
  cancelDocument,
  emailDocument,
} from "../../api/api";
import Pagination from "../../components/ui/Pagination";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import EmailDocumentModal from "../../components/documents/EmailDocumentModal";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import SearchInput from "../../components/ui/SearchInput";
import IconButton from "../../components/ui/IconButton";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import TableSkeleton from "../../components/ui/TableSkeleton";
import { TableWrap, Table, THead, Th, TBody, Tr, Td } from "../../components/ui/Table";
import { formatINR } from "../../utils/money";
import { DOC_TYPES, TYPE_LABELS, TYPE_TO_SLUG } from "../../config/docConfig";
import { useAuth } from "../../context/AuthContext";
import { toDateInputValue } from "../../utils/date";

const selectClass =
  "w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-auto";

function DocumentsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
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
  // Email-compose modal.
  const [emailTarget, setEmailTarget] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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
    setLoading(true);
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
      setTotalItems(res?.data?.pagination?.totalItems ?? 0);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch documents");
    } finally {
      setLoading(false);
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

  // Email a finalized document (PDF attached server-side). The modal stays open
  // on failure so the user can fix the address and retry.
  const handleSendEmail = async (payload) => {
    if (!emailTarget?.id) return;
    setIsSendingEmail(true);
    const loadingToast = toast.loading("Sending email...");
    try {
      const res = await emailDocument(emailTarget.id, payload);
      toast.success(res?.data?.message || "Document emailed", {
        id: loadingToast,
      });
      setEmailTarget(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send email", {
        id: loadingToast,
      });
    } finally {
      setIsSendingEmail(false);
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
    <Card>
      <PageHeader
        title="Documents"
        subtitle={`${totalItems} quotation${totalItems === 1 ? "" : "s"}, invoices and orders`}
      >
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by type"
          className={selectClass}
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
          aria-label="Filter by status"
          className={selectClass}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="finalized">Finalized</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <SearchInput
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search number / party..."
        />

        {/* "New Document" dropdown — one entry per configured document type. */}
        <div className="relative w-full shrink-0 sm:w-auto" ref={newMenuRef}>
          <button
            type="button"
            onClick={() => setNewMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={newMenuOpen}
            className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            New Document
            <ChevronDown className="h-4 w-4" />
          </button>

          {newMenuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg sm:w-56"
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
      </PageHeader>

      <TableWrap>
        <Table minWidth="960px">
          <THead>
            <Th className="w-14">#</Th>
            <Th>Number</Th>
            <Th>Type</Th>
            <Th>Party</Th>
            <Th className="w-28">Date</Th>
            <Th className="w-32 text-right">Grand Total</Th>
            <Th className="w-28">Status</Th>
            <Th className="w-56">Actions</Th>
          </THead>

          {loading ? (
            <TableSkeleton rows={6} cols={8} />
          ) : (
          <TBody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <EmptyState
                    icon={FileText}
                    title={
                      debouncedSearch || typeFilter || statusFilter
                        ? "No matching documents"
                        : "No documents yet"
                    }
                    message={
                      debouncedSearch || typeFilter || statusFilter
                        ? "Try a different search term or clear the filters."
                        : "Create a quotation, proforma, purchase order or tax invoice."
                    }
                  />
                </td>
              </tr>
            ) : (
              documents.map((doc, index) => {
                const isDraft = doc.status === "draft";
                const rowBusy = actionBusyId === doc.id;
                return (
                  <Tr key={doc.id}>
                    <Td className="text-gray-400">{(page - 1) * limit + index + 1}</Td>
                    <Td className="font-mono font-medium text-gray-900">
                      {doc.doc_number || <span className="italic text-gray-400">Draft</span>}
                    </Td>
                    <Td className="text-gray-500">
                      {TYPE_LABELS[doc.doc_type] || doc.doc_type}
                    </Td>
                    <Td className="text-gray-500">
                      {doc.party_name || <span className="text-gray-300">—</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-gray-500">
                      {doc.doc_date ? (
                        toDateInputValue(doc.doc_date)
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-right font-medium text-gray-800">
                      {formatINR(doc.grand_total)}
                    </Td>
                    <Td>
                      <StatusBadge status={doc.status} />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-0.5">
                        <IconButton
                          icon={Pencil}
                          label="Edit"
                          tone="indigo"
                          onClick={() => handleEdit(doc)}
                        />
                        <IconButton
                          icon={Download}
                          label="Download PDF"
                          tone="indigo"
                          disabled={downloadingId === doc.id}
                          onClick={() => handleDownload(doc)}
                        />
                        <IconButton
                          icon={FileText}
                          label="Download Word"
                          tone="indigo"
                          disabled={downloadingWordId === doc.id}
                          onClick={() => handleDownloadWord(doc)}
                        />
                        <IconButton
                          icon={Copy}
                          label="Duplicate"
                          disabled={rowBusy}
                          onClick={() => handleDuplicate(doc)}
                        />
                        {doc.status === "finalized" ? (
                          <IconButton
                            icon={Mail}
                            label="Email to party"
                            tone="emerald"
                            disabled={rowBusy}
                            onClick={() => setEmailTarget(doc)}
                          />
                        ) : null}
                        {doc.status === "finalized" && isAdmin ? (
                          <IconButton
                            icon={Ban}
                            label="Cancel document"
                            tone="rose"
                            disabled={rowBusy}
                            onClick={() => handleCancelClick(doc)}
                          />
                        ) : null}
                        <IconButton
                          icon={Trash2}
                          label={
                            isDraft && isAdmin
                              ? "Delete"
                              : "Only draft documents can be deleted by an admin"
                          }
                          tone="rose"
                          disabled={!(isDraft && isAdmin)}
                          onClick={() => handleDeleteClick(doc)}
                        />
                      </div>
                    </Td>
                  </Tr>
                );
              })
            )}
          </TBody>
          )}
        </Table>
      </TableWrap>

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

      <EmailDocumentModal
        isOpen={Boolean(emailTarget)}
        document={emailTarget}
        isSending={isSendingEmail}
        onClose={() => setEmailTarget(null)}
        onSend={handleSendEmail}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
}

export default DocumentsList;

