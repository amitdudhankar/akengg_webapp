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
} from "lucide-react";
import useDashboardData from "../hooks/useDashboardData";
import { formatINR } from "../utils/money";
import StatCard from "../components/dashboard/StatCard";
import Panel from "../components/dashboard/Panel";
import StatusBadge from "../components/dashboard/StatusBadge";
import DocTypeBreakdown from "../components/dashboard/DocTypeBreakdown";
import RecentDocuments from "../components/dashboard/RecentDocuments";
import RecentLeads from "../components/dashboard/RecentLeads";

// Small section heading with a coloured accent bar — echoes the sidebar's
// Website / Document grouping.
function SectionTitle({ children, tone = "indigo" }) {
  const bar = { indigo: "bg-indigo-500", sky: "bg-sky-500" }[tone] || "bg-indigo-500";
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

function Dashboard() {
  const { loading, error, data, reload } = useDashboardData();

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
                title="Recent Leads"
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
