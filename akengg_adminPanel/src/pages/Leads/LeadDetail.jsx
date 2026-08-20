// Route page at /leads/:id. Fetches the full lead detail object (notes,
// followups, files, status_history all nested in the one GET /leads/:id
// response) and hands a single `reload` callback down to every child that
// can mutate the lead, so any action anywhere on this page always leaves the
// UI reflecting the latest server state.
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import { getLeadById, updateLead, fetchUsers } from "../../api/api";
import Card from "../../components/ui/Card";
import LeadHeader from "../../components/leads/LeadHeader";
import LeadCustomerCard from "../../components/leads/LeadCustomerCard";
import RequirementCard from "../../components/leads/RequirementCard";
import AttributionCard from "../../components/leads/AttributionCard";
import LeadMetaCard from "../../components/leads/LeadMetaCard";
import LeadFilesCard from "../../components/leads/LeadFilesCard";
import LeadNotes from "../../components/leads/LeadNotes";
import LeadFollowups from "../../components/leads/LeadFollowups";
import StatusHistory from "../../components/leads/StatusHistory";

// A small heading + Card shell shared by every section on this page so the
// spacing/typography can never drift between sections.
function Section({ title, children }) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </Card>
  );
}

function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [users, setUsers] = useState([]);

  // The one reload path every mutating child action funnels through (status
  // change, note/followup/file added, customer or meta fields saved, ...).
  const reload = useCallback(async () => {
    try {
      const res = await getLeadById(id);
      const data = res?.data?.data;
      if (!data) {
        setNotFound(true);
        return;
      }
      setLead(data);
      setNotFound(false);
    } catch (error) {
      if (error?.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error(error?.response?.data?.message || "Failed to load lead");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    reload();
  }, [reload]);

  // Assignable users for LeadMetaCard's "Assigned To" select. A non-admin
  // role may be forbidden from listing every user -- that failure is fully
  // expected and non-blocking, so it fails soft to an empty array instead of
  // erroring the page, matching how LeadsList.jsx handles the same fetch.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetchUsers();
        if (active) setUsers(res?.data?.data || []);
      } catch {
        if (active) setUsers([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Shared by LeadCustomerCard and LeadMetaCard: both call PATCH /leads/:id
  // with a partial-update payload, toast the outcome, and reload on success.
  // Errors are rethrown (after toasting) so the calling card's own edit UI
  // knows the save failed and can stay open rather than assuming success.
  const savePartial = async (payload) => {
    const toastId = toast.loading("Saving changes...");
    try {
      await updateLead(id, payload);
      toast.success("Lead updated", { id: toastId });
      await reload();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update lead", {
        id: toastId,
      });
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-xl border border-gray-100 bg-white" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-xl border border-gray-100 bg-white"
              />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-xl border border-gray-100 bg-white"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !lead) {
    return (
      <Card>
        <h1 className="text-xl font-semibold text-gray-900">Lead not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          This lead may have been removed, or the link is incorrect.
        </p>
        <button
          type="button"
          onClick={() => navigate("/leads")}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/leads")}
          aria-label="Back to leads"
          className="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-gray-500">Back to Leads</span>
      </div>

      <LeadHeader lead={lead} onStatusChanged={reload} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Wider left column */}
        <div className="space-y-4 lg:col-span-2">
          <Section title="Customer">
            <LeadCustomerCard lead={lead} onSave={savePartial} />
          </Section>

          <Section title="Requirement">
            <RequirementCard lead={lead} />
          </Section>

          <Section title="Files">
            <LeadFilesCard leadId={id} files={lead.files || []} onFilesChanged={reload} />
          </Section>

          <Section title="Notes">
            <LeadNotes leadId={id} notes={lead.notes || []} onNoteAdded={reload} />
          </Section>

          <Section title="Follow-ups">
            <LeadFollowups leadId={id} followups={lead.followups || []} onChanged={reload} />
          </Section>

          <Section title="Status History">
            <StatusHistory history={lead.status_history || []} />
          </Section>
        </div>

        {/* Narrower right column */}
        <div className="space-y-4">
          <Section title="Assignment & Value">
            <LeadMetaCard lead={lead} users={users} onSave={savePartial} />
          </Section>

          <Section title="Attribution">
            <AttributionCard lead={lead} />
          </Section>
        </div>
      </div>
    </div>
  );
}

export default LeadDetail;
