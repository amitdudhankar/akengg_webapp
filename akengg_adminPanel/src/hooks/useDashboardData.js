import { useCallback, useEffect, useState } from "react";
import {
  fetchDocuments,
  fetchContacts,
  fetchParties,
  fetchCatalog,
  fetchBlogs,
  fetchServices,
  fetchProjects,
  fetchIndustryStats,
  fetchTestimonials,
  fetchTeam,
  fetchSubscribers,
  fetchUsers,
} from "../api/api";
import { dateSortValue } from "../utils/date";

// Every list endpoint responds { data: { data: [...], pagination? } }. These
// helpers normalize that envelope so a single failing/empty call never throws.
const listOf = (res) => (Array.isArray(res?.data?.data) ? res.data.data : []);
const totalOf = (res) => res?.data?.pagination?.totalItems;
const value = (settled) => (settled.status === "fulfilled" ? settled.value : null);

const byDateDesc = (a, b) =>
  dateSortValue(b.created_at || b.doc_date) - dateSortValue(a.created_at || a.doc_date);

/**
 * Loads every dashboard data source in parallel (Promise.allSettled — one
 * endpoint failing degrades gracefully instead of blanking the page) and
 * derives the counts, money totals, breakdowns and "recent" slices the
 * dashboard renders. Returns { loading, error, data, reload }.
 */
export default function useDashboardData() {
  const [state, setState] = useState({ loading: true, error: false, data: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: false }));

    const settled = await Promise.allSettled([
      fetchDocuments({ limit: 100 }), // 0 — capped at 100 by the API
      fetchContacts(), // 1
      fetchParties({ limit: 1000 }), // 2
      fetchCatalog({ limit: 1000 }), // 3
      fetchBlogs({ page: 1, limit: 100, search: "" }), // 4
      fetchServices(), // 5
      fetchProjects(), // 6
      fetchIndustryStats(), // 7
      fetchTestimonials(), // 8
      fetchTeam(), // 9
      fetchSubscribers(), // 10
      fetchUsers(), // 11
    ]);

    // Only treat it as a hard error if literally everything failed (e.g. the
    // API is down / the token expired) — otherwise show whatever loaded.
    if (settled.every((r) => r.status !== "fulfilled")) {
      setState({ loading: false, error: true, data: null });
      return;
    }

    const [
      docsR, contactsR, partiesR, catalogR, blogsR, servicesR,
      projectsR, statsR, testimonialsR, teamR, subsR, usersR,
    ] = settled.map(value);

    const documents = listOf(docsR);
    const contacts = listOf(contactsR);
    const parties = listOf(partiesR);

    const byStatus = { draft: 0, finalized: 0, cancelled: 0 };
    const byType = { quotation: 0, proforma: 0, purchase_order: 0, tax_invoice: 0 };
    let revenue = 0; // sum of finalized tax-invoice grand totals
    documents.forEach((d) => {
      if (byStatus[d.status] !== undefined) byStatus[d.status] += 1;
      if (byType[d.doc_type] !== undefined) byType[d.doc_type] += 1;
      if (d.doc_type === "tax_invoice" && d.status === "finalized") {
        revenue += Number(d.grand_total) || 0;
      }
    });

    const newLeads = contacts.filter(
      (c) => String(c.status || "").toLowerCase() === "new"
    ).length;
    const clients = parties.filter((p) => p.party_type === "client").length;
    const vendors = parties.filter((p) => p.party_type === "vendor").length;

    setState({
      loading: false,
      error: false,
      data: {
        counts: {
          documents: totalOf(docsR) ?? documents.length,
          parties: totalOf(partiesR) ?? parties.length,
          clients,
          vendors,
          catalog: totalOf(catalogR) ?? listOf(catalogR).length,
          blogs: totalOf(blogsR) ?? listOf(blogsR).length,
          services: listOf(servicesR).length,
          projects: listOf(projectsR).length,
          industryStats: listOf(statsR).length,
          testimonials: listOf(testimonialsR).length,
          team: listOf(teamR).length,
          subscribers: listOf(subsR).length,
          users: listOf(usersR).length,
          contacts: contacts.length,
          newLeads,
        },
        documents: {
          byStatus,
          byType,
          revenue,
          recent: [...documents].sort(byDateDesc).slice(0, 6),
        },
        leads: {
          newLeads,
          total: contacts.length,
          recent: [...contacts].sort(byDateDesc).slice(0, 5),
        },
      },
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
