import { useEffect, useState } from "react";
import {
  RefreshCw,
  IndianRupee,
  FileText,
  Inbox,
  Building2,
  Newspaper,
  Wrench,
  FolderKanban,
  UsersRound,
  MessageSquareQuote,
  BarChart3,
  Mail,
  Package,
  ShieldCheck,
  AlertCircle,
  UserPlus,
  CalendarClock,
  AlertTriangle,
  BadgeCheck,
  Receipt,
  Handshake,
  Trophy,
  XCircle,
  Target,
} from "lucide-react";
import useDashboardData from "../hooks/useDashboardData";
import { fetchLeads } from "../api/api";
import { formatINR } from "../utils/money";
import { dateSortValue, formatDateDisplay } from "../utils/date";
import StatCard from "../components/dashboard/StatCard";
import Panel from "../components/dashboard/Panel";
import StatusBadge from "../components/ui/StatusBadge";
import PriorityBadge from "../components/ui/PriorityBadge";
import DocTypeBreakdown from "../components/dashboard/DocTypeBreakdown";
import RecentDocuments from "../components/dashboard/RecentDocuments";
import RecentLeads from "../components/dashboard/RecentLeads";
import FollowupsDueToday from "../components/dashboard/FollowupsDueToday";

// Small section heading with a coloured accent bar — echoes the sidebar's
// Website / Document grouping.
function SectionTitle({ children, tone = "indigo" }) {
  const bar =
    { indigo: "bg-indigo-500", sky: "bg-sky-500", emerald: "bg-emerald-500" }[tone] ||
    "bg-indigo-500";
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className={`h-5 w-1.5 rounded-full ${bar}`} />
      <h2 className="text-base font-semibold text-gray-900">{children}</h2>
    </div>
  );
}

function SkeletonCard() {
  return <div className="h-23 animate-pulse rounded-xl border border-gray-100 bg-white" />;
}

// Recent real sales leads (as opposed to raw contact-form enquiries, shown
// separately below). A small one-off fetch local to the dashboard page
// rather than threaded through useDashboardData, per this file's own recent-
// lists sorting the newest-first the same way useDashboardData does.
function RecentSalesLeads({ items }) {
  if (items == null) {
    return <p className="py-6 text-center text-sm text-gray-400">Loading…</p>;
  }
  if (!items.length) {
    return <p className="py-6 text-center text-sm text-gray-400">No leads yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
            <th className="pb-2 pr-4 font-medium">Lead</th>
            <th className="pb-2 pr-4 font-medium">Product</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 pr-4 font-medium">Priority</th>
            <th className="pb-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((lead) => (
            <tr key={lead.id} className="transition hover:bg-gray-50">
              <td className="py-2.5 pr-4">
                <div className="font-medium text-gray-900">
                  {lead.company_name || lead.contact_person || lead.lead_number}
                </div>
                <div className="text-xs text-gray-400">{lead.contact_person}</div>
              </td>
              <td className="max-w-[10rem] truncate py-2.5 pr-4 text-gray-600">
                {lead.product || "—"}
              </td>
              <td className="py-2.5 pr-4">
                <StatusBadge status={lead.status} />
              </td>
              <td className="py-2.5 pr-4">
                <PriorityBadge priority={lead.priority} />
              </td>
              <td className="whitespace-nowrap py-2.5 text-gray-500">
                {formatDateDisplay(lead.created_at) || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dashboard() {
  const { loading, error, data, reload } = useDashboardData();

  // Small one-off fetch for the "Recent Leads" (real sales leads) panel —
  // not worth threading through the shared hook for a single lightweight
  // call. null while loading, [] once loaded (even on failure — a failed
  // fetch just shows "No leads yet." rather than crashing the panel).
  const [recentSalesLeads, setRecentSalesLeads] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchLeads({ limit: 5 })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data?.data) ? res.data.data : [];
        setRecentSalesLeads(
          [...list].sort((a, b) => dateSortValue(b.created_at) - dateSortValue(a.created_at)).slice(0, 5)
        );
      })
      .catch(() => {
        if (!cancelled) setRecentSalesLeads([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <h2 className="mt-3 text-lg font-semibold text-gray-900">
          Couldn&apos;t load the dashboard
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          The server may be offline or your session expired.
        </p>
        <button
          onClick={reload}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  const c = data?.counts;
  const docs = data?.documents;
  const leads = data?.leads;
  const sales = data?.sales;
  const salesStats = sales?.stats;
  const byStage = salesStats?.by_status || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Overview of your website content and GST documents.
          </p>
        </div>
        <button
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && !data ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl border border-gray-100 bg-white" />
        </div>
      ) : (
        <>
          {/* Headline KPIs */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={IndianRupee}
              tone="emerald"
              label="Total Invoiced"
              value={docs.available ? formatINR(docs.revenue) : null}
              sub={
                docs.partial
                  ? `Finalized tax invoices · newest ${docs.counted} of ${c.documents} documents`
                  : "Finalized tax invoices"
              }
            />
            <StatCard
              icon={FileText}
              tone="indigo"
              label="Documents"
              value={c.documents}
              sub={
                docs.available
                  ? `${docs.byStatus.finalized} finalized · ${docs.byStatus.draft} drafts`
                  : null
              }
              to="/documents"
            />
            <StatCard
              icon={Inbox}
              tone="amber"
              label="New Leads"
              value={c.newLeads}
              sub={c.contacts == null ? null : `${c.contacts} total enquiries`}
              to="/contact-leads"
            />
            <StatCard
              icon={Building2}
              tone="sky"
              label="Parties"
              value={c.parties}
              sub={
                c.clients == null
                  ? null
                  : `${c.clients} clients · ${c.vendors} vendors`
              }
              to="/parties"
            />
          </div>

          {/* Sales */}
          <div>
            <SectionTitle tone="emerald">Sales</SectionTitle>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <FollowupsDueToday
                className="lg:col-span-2"
                items={sales?.followupsToday || []}
                overdueCount={salesStats?.followups_overdue}
              />

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-1 lg:grid-cols-1">
                <StatCard
                  icon={UserPlus}
                  tone="indigo"
                  label="New Leads"
                  value={salesStats?.new_leads}
                  to="/leads?status=NEW"
                />
                <StatCard
                  icon={CalendarClock}
                  tone="sky"
                  label="Follow-ups Today"
                  value={salesStats?.followups_due_today}
                  to="/followups?tab=today"
                />
                <StatCard
                  icon={AlertTriangle}
                  tone="rose"
                  label="Overdue"
                  value={salesStats?.followups_overdue}
                  to="/followups?tab=overdue"
                />
                <StatCard
                  icon={BadgeCheck}
                  tone="violet"
                  label="Qualified"
                  value={byStage.QUALIFIED}
                  to="/leads?status=QUALIFIED"
                />
                <StatCard
                  icon={Receipt}
                  tone="amber"
                  label="Quotation"
                  value={byStage.QUOTATION}
                  to="/leads?status=QUOTATION"
                />
                <StatCard
                  icon={Handshake}
                  tone="slate"
                  label="Negotiation"
                  value={byStage.NEGOTIATION}
                  to="/leads?status=NEGOTIATION"
                />
                <StatCard
                  icon={Trophy}
                  tone="emerald"
                  label="Won"
                  value={byStage.WON}
                  to="/leads?status=WON"
                />
                <StatCard
                  icon={XCircle}
                  tone="rose"
                  label="Lost"
                  value={byStage.LOST}
                  to="/leads?status=LOST"
                />
                <StatCard
                  icon={IndianRupee}
                  tone="emerald"
                  label="Pipeline Value"
                  value={salesStats ? formatINR(salesStats.open_pipeline_value) : null}
                  to="/leads"
                />
              </div>
            </div>

            <div className="mt-5">
              <Panel title="Recent Leads" icon={Target} action={{ to: "/leads", label: "View all" }}>
                <RecentSalesLeads items={recentSalesLeads} />
              </Panel>
            </div>
          </div>

          {/* Document Control */}
          <div>
            <SectionTitle tone="indigo">Document Control</SectionTitle>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Panel
                title="Recent Documents"
                icon={FileText}
                action={{ to: "/documents", label: "View all" }}
                className="lg:col-span-2"
              >
                <RecentDocuments items={docs.recent} />
              </Panel>

              <Panel title="Documents by Type" icon={BarChart3}>
                <DocTypeBreakdown byType={docs.byType} />
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-gray-100 pt-4 text-center">
                  {[
                    ["draft", docs.byStatus.draft],
                    ["finalized", docs.byStatus.finalized],
                    ["cancelled", docs.byStatus.cancelled],
                  ].map(([status, count]) => (
                    <div key={status} className="space-y-1">
                      <div className="text-lg font-semibold text-gray-900">{count}</div>
                      <StatusBadge status={status} />
                    </div>
                  ))}
                </div>
                {docs.partial && (
                  <p className="mt-3 text-center text-xs text-gray-400">
                    Counts cover the newest {docs.counted} of {c.documents} documents
                    — the API returns at most 100 per page.
                  </p>
                )}
              </Panel>
            </div>
          </div>

          {/* Website Control */}
          <div>
            <SectionTitle tone="sky">Website Control</SectionTitle>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <StatCard icon={Newspaper} tone="indigo" label="Blogs" value={c.blogs} to="/blogs" />
                  <StatCard icon={Wrench} tone="violet" label="Services" value={c.services} to="/services" />
                  <StatCard icon={FolderKanban} tone="amber" label="Projects" value={c.projects} to="/projects" />
                  <StatCard icon={UsersRound} tone="sky" label="Team" value={c.team} to="/team" />
                  <StatCard icon={MessageSquareQuote} tone="emerald" label="Testimonials" value={c.testimonials} to="/testimonials" />
                  <StatCard icon={BarChart3} tone="rose" label="Industry Stats" value={c.industryStats} to="/industry-stats" />
                  <StatCard icon={Mail} tone="sky" label="Subscribers" value={c.subscribers} to="/newsletter" />
                  <StatCard icon={Package} tone="violet" label="Item Catalog" value={c.catalog} to="/catalog" />
                  <StatCard icon={ShieldCheck} tone="slate" label="Users" value={c.users} to="/users" />
                </div>
              </div>

              <Panel
                title="Recent Enquiries"
                icon={Inbox}
                action={{ to: "/contact-leads", label: "View all" }}
                className="lg:col-span-1"
              >
                <RecentLeads items={leads.recent} />
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
