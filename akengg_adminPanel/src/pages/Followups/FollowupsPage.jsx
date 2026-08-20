// Route page at /followups. A cross-lead follow-up worklist: five tabs
// (Today / Overdue / Tomorrow / Upcoming / All), synced to a `tab`
// query-string parameter so a link like /followups?tab=overdue lands
// directly on that tab (see the Dashboard's "N overdue" style widgets, which
// can deep-link here the same way LeadsList is deep-linked to today).
//
// Data-fetching strategy per tab:
//   - Today / Overdue: GET /followups?due=today|overdue, server-paginated.
//   - Tomorrow / Upcoming: the backend's `due` filter only draws the line at
//     "today" -- there's no separate due=tomorrow call used here on purpose.
//     Per the product spec for this page, both tabs are served from ONE
//     GET /followups?due=upcoming call (every pending follow-up dated after
//     today), then split client-side with leadUtils' followupBucket() into
//     "tomorrow" vs "upcoming". Splitting client-side (rather than trusting
//     a hypothetical due=tomorrow filter) guarantees the two buckets can
//     never disagree with each other about where the tomorrow/upcoming line
//     falls. Because that one call has to carry both tabs, it's fetched with
//     a generously large page size (UPCOMING_FETCH_LIMIT) instead of the
//     usual 10-row page -- there's no server-side "page" that means anything
//     across two client-derived buckets, so pagination for these two tabs is
//     done in-memory over the already-fetched set.
//   - All: GET /followups with status/type/date_from/date_to filters, server-paginated.
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  CalendarClock,
  Check,
  Download,
  ExternalLink,
  MessageCircle,
  Phone,
} from "lucide-react";
import {
  fetchFollowups,
  exportFollowupsCsv,
  updateLeadFollowup,
  addLeadFollowup,
} from "../../api/api";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import IconButton from "../../components/ui/IconButton";
import Field from "../../components/ui/Field";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import PriorityBadge from "../../components/ui/PriorityBadge";
import TableSkeleton from "../../components/ui/TableSkeleton";
import Pagination from "../../components/ui/Pagination";
import { TableWrap, Table, THead, Th, TBody, Tr, Td } from "../../components/ui/Table";
import CompleteFollowupPrompt from "../../components/leads/CompleteFollowupPrompt";
import { FOLLOWUP_TYPES, FOLLOWUP_STATUSES } from "../../config/leadConfig";
import {
  formatEnumLabel,
  isOverdue,
  followupBucket,
  telHref,
  waHref,
  downloadBlob,
} from "../../utils/leadUtils";
import { formatDateDisplay, getTodayDateInputValue } from "../../utils/date";

const PAGE_SIZE = 10;
// One call has to represent both the Tomorrow and Upcoming tabs (see file
// header) -- fetched generously large rather than paginated so the
// client-side bucket split has (practically) everything to work with.
const UPCOMING_FETCH_LIMIT = 500;

const TABS = [
  { key: "today", label: "Today" },
  { key: "overdue", label: "Overdue" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "upcoming", label: "Upcoming" },
  { key: "all", label: "All" },
];
const TAB_KEYS = TABS.map((t) => t.key);

const TYPE_LABELS = FOLLOWUP_TYPES.reduce((acc, t) => {
  acc[t.value] = t.label;
  return acc;
}, {});
const typeLabel = (value) => (value ? TYPE_LABELS[value] || formatEnumLabel(value) : "");

// Mirrors the local status pill styling in components/leads/LeadFollowups.jsx
// (a follow-up's own PENDING/COMPLETED/MISSED/CANCELLED status -- distinct
// from the lead's pipeline status, which gets the shared StatusBadge instead).
const FOLLOWUP_STATUS_STYLES = {
  PENDING: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  MISSED: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};
const FOLLOWUP_STATUS_LABELS = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  MISSED: "Missed",
  CANCELLED: "Cancelled",
};

const buildWhatsAppMessage = (row) => {
  const who = row.contact_person ? row.contact_person : "there";
  const about = row.product ? `${row.product} enquiry` : "enquiry";
  const leadRef = row.lead_number ? ` (Lead ${row.lead_number})` : "";
  return `Hi ${who}, following up on your ${about}${leadRef}.`;
};

// Small pulse skeleton for the mobile card list -- TableSkeleton only makes
// sense inside a <table>, matching the same split LeadsList.jsx uses.
function FollowupCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="h-3.5 w-28 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-16 animate-pulse rounded-full bg-gray-100" />
      </div>
      <div className="mt-3 h-3.5 w-40 animate-pulse rounded bg-gray-100" />
      <div className="mt-2 h-3 w-28 animate-pulse rounded bg-gray-100" />
      <div className="mt-3 h-3 w-32 animate-pulse rounded bg-gray-100" />
    </div>
  );
}

function FollowupsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get("tab");
  const activeTab = TAB_KEYS.includes(rawTab) ? rawTab : "today";
  const isServerTab = activeTab === "today" || activeTab === "overdue" || activeTab === "all";

  // Server-paginated tabs (today / overdue / all) share one page + result set,
  // since only one of them is ever visible at a time.
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Tomorrow / Upcoming: one shared raw fetch, bucketed and paginated client-side.
  const [upcomingRaw, setUpcomingRaw] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [clientPage, setClientPage] = useState(1);

  // All-tab filter bar.
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [exporting, setExporting] = useState(false);

  // Which row's "schedule the next one?" prompt is open, and which single
  // action on that row is currently in flight.
  const [completingId, setCompletingId] = useState(null);
  const [busyFollowupId, setBusyFollowupId] = useState(null);
  const [busyAction, setBusyAction] = useState(null); // "COMPLETE_ONLY" | "COMPLETE_SCHEDULE"

  const getDueList = useCallback(async (tab, pageArg) => {
    setLoading(true);
    try {
      const res = await fetchFollowups({
        due: tab === "today" ? "today" : "overdue",
        page: pageArg,
        limit: PAGE_SIZE,
      });
      setRows(res?.data?.data || []);
      setTotalPages(res?.data?.pagination?.totalPages || 1);
      setTotalItems(res?.data?.pagination?.totalItems ?? 0);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllList = useCallback(
    async (pageArg) => {
      setLoading(true);
      try {
        const res = await fetchFollowups({
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page: pageArg,
          limit: PAGE_SIZE,
        });
        setRows(res?.data?.data || []);
        setTotalPages(res?.data?.pagination?.totalPages || 1);
        setTotalItems(res?.data?.pagination?.totalItems ?? 0);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load follow-ups");
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, typeFilter, dateFrom, dateTo]
  );

  const getUpcoming = useCallback(async () => {
    setUpcomingLoading(true);
    try {
      const res = await fetchFollowups({ due: "upcoming", page: 1, limit: UPCOMING_FETCH_LIMIT });
      setUpcomingRaw(res?.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load follow-ups");
    } finally {
      setUpcomingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "today" || activeTab === "overdue") getDueList(activeTab, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page]);

  useEffect(() => {
    if (activeTab === "all") getAllList(page);
  }, [activeTab, page, getAllList]);

  // Fetch the shared "upcoming" set only when *entering* the Tomorrow/Upcoming
  // pair from elsewhere -- toggling directly between those two tabs re-uses
  // the same fetch rather than re-requesting it, matching the "call once"
  // requirement in the file header.
  const inUpcomingGroup = activeTab === "tomorrow" || activeTab === "upcoming";
  useEffect(() => {
    if (inUpcomingGroup) getUpcoming();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inUpcomingGroup]);

  // If the current page falls past the end (e.g. after a delete/status
  // change elsewhere), step back -- same guard as LeadsList/DocumentsList.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const tomorrowRows = useMemo(
    () => upcomingRaw.filter((r) => followupBucket(r.followup_date) === "tomorrow"),
    [upcomingRaw]
  );
  const laterUpcomingRows = useMemo(
    () => upcomingRaw.filter((r) => followupBucket(r.followup_date) === "upcoming"),
    [upcomingRaw]
  );
  const clientSource = activeTab === "tomorrow" ? tomorrowRows : laterUpcomingRows;
  const clientTotalPages = Math.max(1, Math.ceil(clientSource.length / PAGE_SIZE));
  useEffect(() => {
    if (clientPage > clientTotalPages) setClientPage(clientTotalPages);
  }, [clientTotalPages, clientPage]);
  const clientPageRows = useMemo(
    () => clientSource.slice((clientPage - 1) * PAGE_SIZE, clientPage * PAGE_SIZE),
    [clientSource, clientPage]
  );

  const visibleRows = isServerTab ? rows : clientPageRows;
  const isLoading = isServerTab ? loading : upcomingLoading;
  const currentPage = isServerTab ? page : clientPage;
  const currentTotalPages = isServerTab ? totalPages : clientTotalPages;
  const onPageChange = isServerTab ? setPage : setClientPage;
  const visibleTotalItems = isServerTab ? totalItems : clientSource.length;

  // Reset to page 1 in the same handler that changes the tab/filter, so the
  // page-watching effects above only ever fire once per change (not once for
  // the old page immediately followed by a second fetch for page 1).
  const handleTabClick = (key) => {
    const next = new URLSearchParams(searchParams);
    if (key === "today") next.delete("tab");
    else next.set("tab", key);
    setSearchParams(next);
    setPage(1);
    setClientPage(1);
  };

  const refreshActiveTab = () => {
    if (activeTab === "today" || activeTab === "overdue") getDueList(activeTab, page);
    else if (activeTab === "all") getAllList(page);
    else getUpcoming();
  };

  const handleExportCsv = async () => {
    setExporting(true);
    const toastId = toast.loading("Preparing CSV export...");
    try {
      // "Effective filters" = whatever params actually feed the visible tab.
      // Tomorrow has no filter of its own on the backend (see file header),
      // so its export is the same due=upcoming set as the Upcoming tab.
      let params = {};
      if (activeTab === "today") params = { due: "today" };
      else if (activeTab === "overdue") params = { due: "overdue" };
      else if (activeTab === "tomorrow" || activeTab === "upcoming") params = { due: "upcoming" };
      else {
        params = {
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        };
      }
      const res = await exportFollowupsCsv(params);
      downloadBlob(res, `followups-${activeTab}-${getTodayDateInputValue()}.csv`);
      toast.success("Follow-ups exported", { id: toastId });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to export follow-ups", {
        id: toastId,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleCall = (row) => {
    const href = telHref(row.phone);
    if (href) window.location.href = href;
  };

  const handleWhatsApp = (row) => {
    const href = waHref(row.phone, buildWhatsAppMessage(row));
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  };

  const openComplete = (row) => setCompletingId(row.id);
  const closeComplete = () => setCompletingId(null);

  const handleCompleteOnly = async (row) => {
    setBusyFollowupId(row.id);
    setBusyAction("COMPLETE_ONLY");
    const toastId = toast.loading("Completing follow-up...");
    try {
      await updateLeadFollowup(row.lead_id, row.id, { action: "COMPLETE" });
      toast.success("Follow-up completed", { id: toastId });
      setCompletingId(null);
      refreshActiveTab();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to complete follow-up", {
        id: toastId,
      });
    } finally {
      setBusyFollowupId(null);
      setBusyAction(null);
    }
  };

  const handleCompleteAndSchedule = async (row, nextForm) => {
    setBusyFollowupId(row.id);
    setBusyAction("COMPLETE_SCHEDULE");
    const toastId = toast.loading("Completing follow-up...");
    try {
      await updateLeadFollowup(row.lead_id, row.id, { action: "COMPLETE" });
      try {
        const payload = { followup_date: nextForm.followup_date, type: nextForm.type };
        if (nextForm.followup_time) payload.followup_time = nextForm.followup_time;
        if (nextForm.notes.trim()) payload.notes = nextForm.notes.trim();
        await addLeadFollowup(row.lead_id, payload);
        toast.success("Follow-up completed and next one scheduled", { id: toastId });
      } catch (scheduleError) {
        // The completion itself already succeeded -- don't report this as a
        // full failure, but do surface that the follow-on scheduling didn't.
        toast.error(
          scheduleError?.response?.data?.message ||
            "Follow-up completed, but scheduling the next one failed",
          { id: toastId }
        );
      }
      setCompletingId(null);
      refreshActiveTab();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to complete follow-up", {
        id: toastId,
      });
    } finally {
      setBusyFollowupId(null);
      setBusyAction(null);
    }
  };

  const hasAllFilters = Boolean(statusFilter || typeFilter || dateFrom || dateTo);

  const emptyContent = () => {
    switch (activeTab) {
      case "today":
        return { title: "Nothing due today", message: "You're all clear -- enjoy the breathing room." };
      case "overdue":
        return { title: "No overdue follow-ups", message: "Nice work -- you're fully caught up." };
      case "tomorrow":
        return { title: "Nothing due tomorrow", message: "No follow-ups are scheduled for tomorrow yet." };
      case "upcoming":
        return { title: "No upcoming follow-ups", message: "Nothing scheduled further out right now." };
      default:
        return hasAllFilters
          ? { title: "No matching follow-ups", message: "Try a different filter combination." }
          : { title: "No follow-ups yet", message: "Follow-ups scheduled from a lead will appear here." };
    }
  };
  const { title: emptyTitle, message: emptyMessage } = emptyContent();

  return (
    <Card>
      <PageHeader
        title="Follow-ups"
        subtitle={`${visibleTotalItems} follow-up${visibleTotalItems === 1 ? "" : "s"}`}
      >
        <Button variant="secondary" icon={Download} loading={exporting} onClick={handleExportCsv}>
          Export CSV
        </Button>
      </PageHeader>

      <div
        role="tablist"
        aria-label="Follow-up filters"
        className="mb-5 flex flex-wrap gap-1 rounded-lg border border-gray-100 bg-gray-50/60 p-1"
      >
        {TABS.map((t) => {
          const active = t.key === activeTab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleTabClick(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-white hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "all" && (
        <div className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Status"
            name="status"
            as="select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[{ value: "", label: "All statuses" }, ...FOLLOWUP_STATUSES]}
          />
          <Field
            label="Type"
            name="type"
            as="select"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            options={[{ value: "", label: "All types" }, ...FOLLOWUP_TYPES]}
          />
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
      )}

      {/* Desktop table -- hidden below md, replaced by a card list. */}
      <div className="hidden md:block">
        <TableWrap>
          <Table minWidth="1180px">
            <THead>
              <Th className="w-40">Date</Th>
              <Th>Lead</Th>
              <Th className="w-40">Product</Th>
              <Th className="w-44">Status / Priority</Th>
              <Th>Type &amp; Notes</Th>
              <Th className="w-44">Actions</Th>
            </THead>

            {isLoading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : (
              <TBody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <EmptyState icon={CalendarClock} title={emptyTitle} message={emptyMessage} />
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const overdue = row.status === "PENDING" && isOverdue(row.followup_date);
                    const rowBusyAction = busyFollowupId === row.id ? busyAction : null;
                    const canCall = Boolean(telHref(row.phone));
                    const canWhatsApp = Boolean(waHref(row.phone));

                    return (
                      <Fragment key={row.id}>
                        <Tr>
                          <Td>
                            <div
                              className={`text-sm ${
                                overdue ? "font-medium text-rose-600" : "text-gray-700"
                              }`}
                            >
                              {formatDateDisplay(row.followup_date) || "—"}
                              {row.followup_time ? ` · ${row.followup_time}` : ""}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                  FOLLOWUP_STATUS_STYLES[row.status] || "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {FOLLOWUP_STATUS_LABELS[row.status] || formatEnumLabel(row.status)}
                              </span>
                              {overdue && (
                                <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                                  Overdue
                                </span>
                              )}
                            </div>
                          </Td>
                          <Td>
                            <Link
                              to={`/leads/${row.lead_id}`}
                              className="font-mono text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                            >
                              {row.lead_number}
                            </Link>
                            <div className="mt-0.5 text-sm font-medium text-gray-900">
                              {row.company_name || <span className="text-gray-300">—</span>}
                            </div>
                            <div className="text-xs text-gray-500">{row.contact_person}</div>
                          </Td>
                          <Td className="text-gray-500">
                            {row.product || <span className="text-gray-300">—</span>}
                          </Td>
                          <Td>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <StatusBadge status={row.lead_status} />
                              <PriorityBadge priority={row.lead_priority} />
                            </div>
                          </Td>
                          <Td>
                            <div className="text-sm font-medium text-gray-700">
                              {typeLabel(row.type)}
                            </div>
                            {row.notes && (
                              <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                                {row.notes}
                              </p>
                            )}
                          </Td>
                          <Td>
                            <div className="flex items-center gap-0.5">
                              <IconButton
                                icon={Phone}
                                label={canCall ? `Call ${row.phone}` : "No phone number"}
                                tone="emerald"
                                disabled={!canCall}
                                onClick={() => handleCall(row)}
                              />
                              <IconButton
                                icon={MessageCircle}
                                label={canWhatsApp ? "Message on WhatsApp" : "No phone number"}
                                tone="emerald"
                                disabled={!canWhatsApp}
                                onClick={() => handleWhatsApp(row)}
                              />
                              <IconButton
                                icon={ExternalLink}
                                label="View lead"
                                tone="indigo"
                                onClick={() => navigate(`/leads/${row.lead_id}`)}
                              />
                              {row.status === "PENDING" && (
                                <IconButton
                                  icon={Check}
                                  label="Mark complete"
                                  tone="emerald"
                                  disabled={completingId === row.id}
                                  onClick={() => openComplete(row)}
                                />
                              )}
                            </div>
                          </Td>
                        </Tr>
                        {completingId === row.id && (
                          <tr>
                            <td colSpan="6" className="bg-gray-50/60 px-4 pb-4">
                              <CompleteFollowupPrompt
                                followup={row}
                                busyAction={rowBusyAction}
                                onCancel={closeComplete}
                                onCompleteOnly={() => handleCompleteOnly(row)}
                                onCompleteAndSchedule={(nextForm) =>
                                  handleCompleteAndSchedule(row, nextForm)
                                }
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TBody>
            )}
          </Table>
        </TableWrap>
      </div>

      {/* Mobile card list -- visible only below md. */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <FollowupCardSkeleton key={i} />)
        ) : visibleRows.length === 0 ? (
          <EmptyState icon={CalendarClock} title={emptyTitle} message={emptyMessage} />
        ) : (
          visibleRows.map((row) => {
            const overdue = row.status === "PENDING" && isOverdue(row.followup_date);
            const rowBusyAction = busyFollowupId === row.id ? busyAction : null;
            const canCall = Boolean(telHref(row.phone));
            const canWhatsApp = Boolean(waHref(row.phone));

            return (
              <div key={row.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      overdue ? "text-rose-600" : "text-gray-900"
                    }`}
                  >
                    {formatDateDisplay(row.followup_date) || "—"}
                    {row.followup_time ? ` · ${row.followup_time}` : ""}
                  </span>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      FOLLOWUP_STATUS_STYLES[row.status] || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {FOLLOWUP_STATUS_LABELS[row.status] || formatEnumLabel(row.status)}
                  </span>
                </div>
                {overdue && (
                  <span className="mt-1.5 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                    Overdue
                  </span>
                )}

                <div className="mt-2.5 min-w-0">
                  <Link
                    to={`/leads/${row.lead_id}`}
                    className="font-mono text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    {row.lead_number}
                  </Link>
                  <p className="mt-0.5 truncate text-sm font-bold text-gray-900">
                    {row.company_name || <span className="font-normal text-gray-400">No company</span>}
                  </p>
                  <p className="truncate text-xs text-gray-500">{row.contact_person}</p>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={row.lead_status} />
                  <PriorityBadge priority={row.lead_priority} />
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{typeLabel(row.type)}</span>
                  {row.product ? ` · ${row.product}` : ""}
                </div>
                {row.notes && <p className="mt-1 text-xs text-gray-500">{row.notes}</p>}

                <div className="mt-3 flex items-center gap-1 border-t border-gray-50 pt-2.5">
                  <IconButton
                    icon={Phone}
                    label={canCall ? `Call ${row.phone}` : "No phone number"}
                    tone="emerald"
                    disabled={!canCall}
                    onClick={() => handleCall(row)}
                  />
                  <IconButton
                    icon={MessageCircle}
                    label={canWhatsApp ? "Message on WhatsApp" : "No phone number"}
                    tone="emerald"
                    disabled={!canWhatsApp}
                    onClick={() => handleWhatsApp(row)}
                  />
                  <IconButton
                    icon={ExternalLink}
                    label="View lead"
                    tone="indigo"
                    onClick={() => navigate(`/leads/${row.lead_id}`)}
                  />
                  {row.status === "PENDING" && (
                    <IconButton
                      icon={Check}
                      label="Mark complete"
                      tone="emerald"
                      disabled={completingId === row.id}
                      onClick={() => openComplete(row)}
                    />
                  )}
                </div>

                {completingId === row.id && (
                  <CompleteFollowupPrompt
                    followup={row}
                    busyAction={rowBusyAction}
                    onCancel={closeComplete}
                    onCompleteOnly={() => handleCompleteOnly(row)}
                    onCompleteAndSchedule={(nextForm) => handleCompleteAndSchedule(row, nextForm)}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={currentTotalPages}
        onPageChange={onPageChange}
      />
    </Card>
  );
}

export default FollowupsPage;
