import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Plus, Factory } from "lucide-react";
import { fetchIndustries, deleteIndustry } from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { formatDateDisplay } from "../../utils/date";
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

function IndustriesList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";

  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // status=all so drafts stay visible in the admin — the public site only ever
  // sees published rows.
  const getIndustries = async () => {
    try {
      const res = await fetchIndustries({ status: "all" });
      setIndustries(res?.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch industries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getIndustries();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return industries;
    return industries.filter((industry) =>
      [industry.name, industry.slug]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [industries, search]);

  useEffect(() => {
    const next = Math.max(1, Math.ceil(filtered.length / limit));
    setTotalPages(next);
    setPage((current) => Math.min(current, next));
  }, [filtered.length, limit]);

  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleDeleteClick = (industry) => {
    setSelected(industry);
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
      const res = await deleteIndustry(selected.id);
      toast.success(res?.data?.message || "Industry deleted successfully");
      setIsModalOpen(false);
      setSelected(null);
      getIndustries();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete industry");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title="Industries"
        subtitle={`${industries.length} industry page${
          industries.length === 1 ? "" : "s"
        } on the website`}
      >
        <SearchInput
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search industries..."
        />
        <Button icon={Plus} onClick={() => navigate("/industries/add")} className="shrink-0">
          Add Industry
        </Button>
      </PageHeader>

      <TableWrap>
        <Table minWidth="900px">
          <THead>
            <Th className="w-20">Order</Th>
            <Th className="w-24">Image</Th>
            <Th>Name</Th>
            <Th className="w-28">Published</Th>
            <Th className="w-32">Updated</Th>
            <Th className="w-24">Actions</Th>
          </THead>

          {loading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
            <TBody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <EmptyState
                      icon={Factory}
                      title={search ? "No matching industries" : "No industries yet"}
                      message={
                        search
                          ? "Try a different search term."
                          : "Add an industry page and it appears on the website straight away."
                      }
                      action={
                        !search && (
                          <Button icon={Plus} onClick={() => navigate("/industries/add")}>
                            Add Industry
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginated.map((industry) => (
                  <Tr key={industry.id}>
                    <Td className="text-gray-500">{industry.sort_order}</Td>
                    <Td>
                      {industry.image ? (
                        <img
                          src={industry.image}
                          alt={industry.name}
                          className="h-10 w-14 rounded-md border border-gray-200 object-cover"
                        />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="font-medium text-gray-900">{industry.name}</div>
                      {industry.slug && (
                        <div className="text-xs text-gray-400">/{industry.slug}</div>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge
                        status={Number(industry.is_published) ? "active" : "inactive"}
                      />
                    </Td>
                    <Td className="text-gray-500">
                      {formatDateDisplay(industry.updated_at) || "—"}
                    </Td>
                    <Td>
                      <RowActions
                        onEdit={() => navigate(`/industries/edit/${industry.id}`)}
                        // Deleting an industry page is admin-only on the API, so
                        // non-admins never see a control that would only 403.
                        onDelete={isAdmin ? () => handleDeleteClick(industry) : undefined}
                        editLabel="Edit industry"
                        deleteLabel="Delete industry"
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
        title="Delete Industry"
        itemName={selected?.name}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        loading={deleting}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
}

export default IndustriesList;
