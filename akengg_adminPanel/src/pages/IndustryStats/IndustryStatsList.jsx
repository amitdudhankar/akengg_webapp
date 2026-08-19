import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Plus, BarChart3 } from "lucide-react";
import { fetchIndustryStats, deleteIndustryStat } from "../../api/api";
import Pagination from "../../components/ui/Pagination";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import SearchInput from "../../components/ui/SearchInput";
import Button from "../../components/ui/Button";
import RowActions from "../../components/ui/RowActions";
import EmptyState from "../../components/ui/EmptyState";
import TableSkeleton from "../../components/ui/TableSkeleton";
import { TableWrap, Table, THead, Th, TBody, Tr, Td } from "../../components/ui/Table";

function IndustryStatsList() {
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getStats = async () => {
    try {
      const res = await fetchIndustryStats();
      setStats(res?.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch industry stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getStats();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return stats;
    return stats.filter((stat) =>
      [stat.name].filter(Boolean).some((value) => value.toLowerCase().includes(query))
    );
  }, [stats, search]);

  useEffect(() => {
    const next = Math.max(1, Math.ceil(filtered.length / limit));
    setTotalPages(next);
    setPage((current) => Math.min(current, next));
  }, [filtered.length, limit]);

  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleDeleteClick = (stat) => {
    setSelected(stat);
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
      const res = await deleteIndustryStat(selected.id);
      toast.success(res?.data?.message || "Industry stat deleted successfully");
      setIsModalOpen(false);
      setSelected(null);
      getStats();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete industry stat");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title="Industry Stats"
        subtitle={`${stats.length} industr${stats.length === 1 ? "y" : "ies"} shown on the projects page`}
      >
        <SearchInput
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search industries..."
        />
        <Button icon={Plus} onClick={() => navigate("/industry-stats/add")} className="shrink-0">
          Add Industry
        </Button>
      </PageHeader>

      <TableWrap>
        <Table minWidth="680px">
          <THead>
            <Th className="w-16">#</Th>
            <Th>Industry</Th>
            <Th className="w-24">Count</Th>
            <Th>Color</Th>
            <Th className="w-20">Order</Th>
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
                      icon={BarChart3}
                      title={search ? "No matching industries" : "No industry stats yet"}
                      message={
                        search
                          ? "Try a different search term."
                          : "These drive the industry breakdown on the projects page."
                      }
                      action={
                        !search && (
                          <Button icon={Plus} onClick={() => navigate("/industry-stats/add")}>
                            Add Industry
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginated.map((stat, index) => (
                  <Tr key={stat.id}>
                    <Td className="text-gray-400">{(page - 1) * limit + index + 1}</Td>
                    <Td className="font-medium text-gray-900">{stat.name}</Td>
                    <Td className="text-gray-500">{stat.count}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        {stat.color ? (
                          <span
                            className="inline-block h-4 w-4 rounded-full border border-gray-200"
                            style={{ backgroundColor: stat.color }}
                          />
                        ) : null}
                        <span className="text-gray-500">{stat.color || "—"}</span>
                      </div>
                    </Td>
                    <Td className="text-gray-500">{stat.sort_order}</Td>
                    <Td>
                      <RowActions
                        onEdit={() => navigate(`/industry-stats/edit/${stat.id}`)}
                        onDelete={() => handleDeleteClick(stat)}
                        editLabel="Edit industry stat"
                        deleteLabel="Delete industry stat"
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
        title="Delete Industry Stat"
        itemName={selected?.name}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        loading={deleting}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
}

export default IndustryStatsList;
