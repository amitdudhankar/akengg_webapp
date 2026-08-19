import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Plus, Building2 } from "lucide-react";
import { fetchParties, deleteParty } from "../../api/api";
import Pagination from "../../components/ui/Pagination";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import SearchInput from "../../components/ui/SearchInput";
import Button from "../../components/ui/Button";
import RowActions from "../../components/ui/RowActions";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import TableSkeleton from "../../components/ui/TableSkeleton";
import { TableWrap, Table, THead, Th, TBody, Tr, Td } from "../../components/ui/Table";

const selectClass =
  "w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-auto";

function PartiesList() {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  // "" = all, "1" = active only, "0" = inactive only.
  const [activeFilter, setActiveFilter] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const getParties = async () => {
    setLoading(true);
    try {
      const res = await fetchParties({
        type: typeFilter || undefined,
        search: debouncedSearch.trim() || undefined,
        is_active: activeFilter === "" ? undefined : activeFilter,
        page,
        limit,
      });
      setParties(res?.data?.data || []);
      setTotalPages(res?.data?.pagination?.totalPages || 1);
      setTotalItems(res?.data?.pagination?.totalItems ?? 0);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch parties");
    } finally {
      setLoading(false);
    }
  };

  // Server-side pagination: refetch on filter/page change.
  useEffect(() => {
    getParties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, activeFilter, debouncedSearch, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const handleDeleteClick = (party) => {
    setSelected(party);
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
      const res = await deleteParty(selected.id);
      toast.success(res?.data?.message || "Party deleted successfully");
      setIsModalOpen(false);
      setSelected(null);
      getParties();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete party");
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = Boolean(debouncedSearch || typeFilter || activeFilter);

  return (
    <Card>
      <PageHeader
        title="Parties"
        subtitle={`${totalItems} client${totalItems === 1 ? "" : "s"} and vendors`}
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
          <option value="client">Client</option>
          <option value="vendor">Vendor</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          className={selectClass}
        >
          <option value="">All statuses</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search parties..."
        />
        <Button icon={Plus} onClick={() => navigate("/parties/add")} className="shrink-0">
          Add Party
        </Button>
      </PageHeader>

      <TableWrap>
        <Table minWidth="980px">
          <THead>
            <Th className="w-16">#</Th>
            <Th>Name</Th>
            <Th className="w-24">Type</Th>
            <Th>GSTIN</Th>
            <Th>City / State</Th>
            <Th className="w-28">Registered</Th>
            <Th className="w-28">Active</Th>
            <Th className="w-24">Actions</Th>
          </THead>

          {loading ? (
            <TableSkeleton rows={6} cols={8} />
          ) : (
            <TBody>
              {parties.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <EmptyState
                      icon={Building2}
                      title={hasFilters ? "No matching parties" : "No parties yet"}
                      message={
                        hasFilters
                          ? "Try a different search term or clear the filters."
                          : "Add the clients and vendors you raise documents against."
                      }
                      action={
                        !hasFilters && (
                          <Button icon={Plus} onClick={() => navigate("/parties/add")}>
                            Add Party
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                parties.map((party, index) => (
                  <Tr key={party.id}>
                    <Td className="text-gray-400">{(page - 1) * limit + index + 1}</Td>
                    <Td className="font-medium text-gray-900">{party.name}</Td>
                    <Td className="capitalize text-gray-500">{party.party_type}</Td>
                    <Td className="whitespace-nowrap text-gray-500">
                      {party.gstin || <span className="text-gray-300">—</span>}
                    </Td>
                    <Td className="text-gray-500">
                      {[party.billing_city, party.billing_state].filter(Boolean).join(", ") || (
                        <span className="text-gray-300">—</span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge
                        status={Number(party.party_is_registered) ? "Yes" : "No"}
                      />
                    </Td>
                    <Td>
                      <StatusBadge status={Number(party.is_active) ? "active" : "inactive"} />
                    </Td>
                    <Td>
                      <RowActions
                        onEdit={() => navigate(`/parties/edit/${party.id}`)}
                        onDelete={() => handleDeleteClick(party)}
                        editLabel="Edit party"
                        deleteLabel="Delete party"
                      />
                    </Td>
                  </Tr>
                ))
              )}
            </TBody>
          )}
        </Table>
      </TableWrap>

      <ConfirmDeleteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDeleteConfirmed}
        title="Delete Party"
        description="If this party is used by any document it will be deactivated (kept for history) instead of deleted:"
        itemName={selected?.name}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        loading={deleting}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
}

export default PartiesList;
