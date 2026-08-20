import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Users,
  Download,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { fetchLeads, exportLeadsCsv, deleteLead, fetchUsers } from "../../api/api";
import Pagination from "../../components/ui/Pagination";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import SearchInput from "../../components/ui/SearchInput";
import Button from "../../components/ui/Button";
import RowActions from "../../components/ui/RowActions";
import Field from "../../components/ui/Field";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import PriorityBadge from "../../components/ui/PriorityBadge";
import TableSkeleton from "../../components/ui/TableSkeleton";
import { TableWrap, Table, THead, Th, TBody, Tr, Td } from "../../components/ui/Table";
import LeadCard from "./LeadCard";
import { LEAD_STATUSES, PRIORITIES, PRODUCTS, INDUSTRIES } from "../../config/leadConfig";
import { isOverdue, isDueToday, telHref, downloadBlob } from "../../utils/leadUtils";
import { formatDateDisplay, getTodayDateInputValue } from "../../utils/date";
import { useAuth } from "../../context/AuthContext";

const selectClass =
  "w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-auto";

const followupClassFor = (dateString) => {
  if (isOverdue(dateString)) return "font-medium text-rose-600";
  if (isDueToday(dateString)) return "font-medium text-amber-600";
  return "text-gray-500";
};

// Small pulse skeleton for the mobile card list — TableSkeleton only makes
// sense inside a <table>, so the card layout gets its own lightweight version.
function LeadCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-16 animate-pulse rounded-full bg-gray-100" />
      </div>
      <div className="mt-3 h-3.5 w-40 animate-pulse rounded bg-gray-100" />
      <div className="mt-2 h-3 w-28 animate-pulse rounded bg-gray-100" />
      <div className="mt-3 h-3 w-32 animate-pulse rounded bg-gray-100" />
    </div>
  );
}

function LeadsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const [searchParams, setSearchParams] = useSearchParams();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(10);

  // Always-visible filters.
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [status, setStatus] = useState(() => searchParams.get("status") || "");
  const [product, setProduct] = useState(() => searchParams.get("product") || "");
  const [priority, setPriority] = useState(() => searchParams.get("priority") || "");
  const [source, setSource] = useState(() => searchParams.get("source") || "");

  // "More filters" — collapsed by default unless a deep link already set one.
  const [industry, setIndustry] = useState(() => searchParams.get("industry") || "");
  const [assignedTo, setAssignedTo] = useState(() => searchParams.get("assigned_to") || "");
  const [dateFrom, setDateFrom] = useState(() => searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(() => searchParams.get("date_to") || "");
  const [showMoreFilters, setShowMoreFilters] = useState(() =>
    Boolean(
      searchParams.get("industry") ||
        searchParams.get("assigned_to") ||
        searchParams.get("date_from") ||
        searchParams.get("date_to")
    )
  );

  // Debounce the free-text inputs so we don't refetch on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [debouncedSource, setDebouncedSource] = useState(source);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedSource(source);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search, source]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Users for the "Assigned to" filter. A non-admin role may not be allowed
  // to list users — in that case hide the control entirely rather than show
  // a broken/empty dropdown or an error toast.
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [usersAvailable, setUsersAvailable] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchUsers();
        if (!cancelled) setAssignableUsers(res?.data?.data || []);
      } catch {
        if (!cancelled) setUsersAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeFilters = useMemo(
    () => ({
      status: status || undefined,
      product: product || undefined,
      priority: priority || undefined,
      source: debouncedSource.trim() || undefined,
      industry: industry || undefined,
      assigned_to: assignedTo || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      search: debouncedSearch.trim() || undefined,
    }),
    [
      status,
      product,
      priority,
      debouncedSource,
      industry,
      assignedTo,
      dateFrom,
      dateTo,
      debouncedSearch,
    ]
  );

  const getLeads = async () => {
    setLoading(true);
    try {
      const res = await fetchLeads({ ...activeFilters, page, limit });
      setLeads(res?.data?.data || []);
      setTotalPages(res?.data?.pagination?.totalPages || 1);
      setTotalItems(res?.data?.pagination?.totalItems ?? 0);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  // Server-side pagination: refetch whenever a filter or the page changes.
  useEffect(() => {
    getLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters, page]);

  // If the current page falls past the end (e.g. after a delete), step back.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // Keep the URL in sync with the applied filters so the view is
  // shareable/bookmarkable and deep-linkable from elsewhere (e.g. dashboard).
  useEffect(() => {
    const next = {};
    if (activeFilters.status) next.status = activeFilters.status;
    if (activeFilters.product) next.product = activeFilters.product;
    if (activeFilters.priority) next.priority = activeFilters.priority;
    if (activeFilters.source) next.source = activeFilters.source;
    if (activeFilters.industry) next.industry = activeFilters.industry;
    if (activeFilters.assigned_to) next.assigned_to = activeFilters.assigned_to;
    if (activeFilters.date_from) next.date_from = activeFilters.date_from;
    if (activeFilters.date_to) next.date_to = activeFilters.date_to;
    if (activeFilters.search) next.search = activeFilters.search;
    if (page > 1) next.page = String(page);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters, page]);

  const handleDeleteClick = (lead) => {
    setSelected(lead);
    setIsChecked(false);
    setIsModalOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!isChecked) {
      toast.error("You must confirm the deletion.");
      return;
    }
    if (!selected?.id) return;
    setDeleting(true);
    try {
      const res = await deleteLead(selected.id);
      toast.success(res?.data?.message || "Lead deleted successfully");
      setIsModalOpen(false);
      setSelected(null);
      getLeads();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete lead");
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    const loadingToast = toast.loading("Preparing CSV export...");
    try {
      const res = await exportLeadsCsv(activeFilters);
      downloadBlob(res, `leads-${getTodayDateInputValue()}.csv`);
      toast.success("Leads exported", { id: loadingToast });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to export leads", {
        id: loadingToast,
      });
    } finally {
      setExporting(false);
    }
  };

  const hasMoreFiltersApplied = Boolean(industry || assignedTo || dateFrom || dateTo);
  const hasFilters = Boolean(
    debouncedSearch || status || product || priority || debouncedSource || hasMoreFiltersApplied
  );

  return (
    <Card>
      <PageHeader
        title="Leads"
        subtitle={`${totalItems} lead${totalItems === 1 ? "" : "s"} in the pipeline`}
      >
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / company / phone / email / lead #..."
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          className={selectClass}
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={product}
          onChange={(e) => {
            setProduct(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by product"
          className={selectClass}
        >
          <option value="">All products</option>
          {PRODUCTS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by priority"
          className={selectClass}
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Source..."
          aria-label="Filter by source"
          className="w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-700 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-36"
        />
        <Button
          variant="secondary"
          icon={SlidersHorizontal}
          onClick={() => setShowMoreFilters((v) => !v)}
          className="shrink-0"
        >
          More filters
          {hasMoreFiltersApplied ? (
            <span className="ml-0.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-700">
              •
            </span>
          ) : null}
          {showMoreFilters ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="secondary"
          icon={Download}
          loading={exporting}
          onClick={handleExportCsv}
          className="shrink-0"
        >
          Export CSV
        </Button>
      </PageHeader>

      {showMoreFilters ? (
        <div className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Industry"
            name="industry"
            as="select"
            value={industry}
            onChange={(e) => {
              setIndustry(e.target.value);
              setPage(1);
            }}
            options={[{ value: "", label: "All industries" }, ...INDUSTRIES]}
          />
          {usersAvailable ? (
            <Field
              label="Assigned to"
              name="assigned_to"
              as="select"
              value={assignedTo}
              onChange={(e) => {
                setAssignedTo(e.target.value);
                setPage(1);
              }}
              options={[
                { value: "", label: "Anyone" },
                ...assignableUsers.map((u) => ({ value: String(u.id), label: u.name })),
              ]}
            />
          ) : null}
          <Field
            label="From date"
            name="date_from"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
          <Field
            label="To date"
            name="date_to"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
      ) : null}

      {/* Desktop table — hidden below md, replaced by a card list. */}
      <div className="hidden md:block">
        <TableWrap>
          <Table minWidth="1180px">
            <THead>
              <Th className="w-28">Lead ID</Th>
              <Th>Company</Th>
              <Th className="w-32">Contact</Th>
              <Th>Product</Th>
              <Th className="w-40">Status</Th>
              <Th className="w-24">Priority</Th>
              <Th className="w-28">Source</Th>
              <Th className="w-32">Next Follow-up</Th>
              <Th className="w-24">Created</Th>
              <Th className="w-20">Actions</Th>
            </THead>

            {loading ? (
              <TableSkeleton rows={6} cols={10} />
            ) : (
              <TBody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan="10">
                      <EmptyState
                        icon={Users}
                        title={hasFilters ? "No matching leads" : "No leads yet"}
                        message={
                          hasFilters
                            ? "Try a different search term or clear the filters."
                            : "Leads captured from the website quote form will appear here."
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <Tr key={lead.id}>
                      <Td>
                        <button
                          type="button"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="font-mono text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline focus:outline-none"
                        >
                          {lead.lead_number}
                        </button>
                      </Td>
                      <Td>
                        <div className="font-medium text-gray-900">
                          {lead.company_name || <span className="text-gray-300">—</span>}
                        </div>
                        <div className="text-xs text-gray-500">{lead.contact_person}</div>
                      </Td>
                      <Td className="whitespace-nowrap">
                        {lead.phone ? (
                          <a
                            href={telHref(lead.phone)}
                            className="text-gray-700 hover:text-indigo-600 hover:underline"
                          >
                            {lead.phone}
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </Td>
                      <Td className="text-gray-500">{lead.product || "—"}</Td>
                      <Td>
                        <StatusBadge status={lead.status} />
                      </Td>
                      <Td>
                        <PriorityBadge priority={lead.priority} />
                      </Td>
                      <Td className="text-gray-500">
                        {lead.source || <span className="text-gray-300">—</span>}
                      </Td>
                      <Td className={`whitespace-nowrap ${followupClassFor(lead.next_followup_date)}`}>
                        {lead.next_followup_date ? (
                          formatDateDisplay(lead.next_followup_date)
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-gray-500">
                        {formatDateDisplay(lead.created_at)}
                      </Td>
                      <Td>
                        <RowActions
                          onEdit={() => navigate(`/leads/${lead.id}`)}
                          onDelete={isAdmin ? () => handleDeleteClick(lead) : undefined}
                          editLabel="View / edit lead"
                          deleteLabel="Delete lead"
                        />
                      </Td>
                    </Tr>
                  ))
                )}
              </TBody>
            )}
          </Table>
        </TableWrap>
      </div>

      {/* Mobile card list — visible only below md. */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <LeadCardSkeleton key={i} />)
        ) : leads.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasFilters ? "No matching leads" : "No leads yet"}
            message={
              hasFilters
                ? "Try a different search term or clear the filters."
                : "Leads captured from the website quote form will appear here."
            }
          />
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDeleteConfirmed}
        title="Delete Lead"
        itemName={selected?.lead_number || selected?.company_name}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        loading={deleting}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
}

export default LeadsList;
