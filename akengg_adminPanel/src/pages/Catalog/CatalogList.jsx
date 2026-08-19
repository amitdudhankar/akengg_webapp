import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Plus, Package } from "lucide-react";
import { fetchCatalog, deleteCatalogItem } from "../../api/api";
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
import { formatINR } from "../../utils/money";

const selectClass =
  "w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-auto";

function CatalogList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
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

  const getCatalog = async () => {
    setLoading(true);
    try {
      const res = await fetchCatalog({
        kind: kindFilter || undefined,
        search: debouncedSearch.trim() || undefined,
        is_active: activeFilter === "" ? undefined : activeFilter,
        page,
        limit,
      });
      setItems(res?.data?.data || []);
      setTotalPages(res?.data?.pagination?.totalPages || 1);
      setTotalItems(res?.data?.pagination?.totalItems ?? 0);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch catalog");
    } finally {
      setLoading(false);
    }
  };

  // Server-side pagination: refetch on filter/page change.
  useEffect(() => {
    getCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindFilter, activeFilter, debouncedSearch, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const handleDeleteClick = (item) => {
    setSelected(item);
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
      const res = await deleteCatalogItem(selected.id);
      toast.success(res?.data?.message || "Item deleted successfully");
      setIsModalOpen(false);
      setSelected(null);
      getCatalog();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete item");
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = Boolean(debouncedSearch || kindFilter || activeFilter);

  return (
    <Card>
      <PageHeader
        title="Item Catalog"
        subtitle={`${totalItems} item${totalItems === 1 ? "" : "s"} available to documents`}
      >
        <select
          value={kindFilter}
          onChange={(e) => {
            setKindFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by kind"
          className={selectClass}
        >
          <option value="">All kinds</option>
          <option value="goods">Goods</option>
          <option value="service">Service</option>
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
          placeholder="Search catalog..."
        />
        <Button icon={Plus} onClick={() => navigate("/catalog/add")} className="shrink-0">
          Add Item
        </Button>
      </PageHeader>

      <TableWrap>
        <Table minWidth="980px">
          <THead>
            <Th className="w-16">#</Th>
            <Th>Name</Th>
            <Th className="w-24">Kind</Th>
            <Th className="w-28">HSN/SAC</Th>
            <Th className="w-20">UQC</Th>
            <Th className="w-28 text-right">Rate</Th>
            <Th className="w-20 text-right">GST %</Th>
            <Th className="w-28">Active</Th>
            <Th className="w-24">Actions</Th>
          </THead>

          {loading ? (
            <TableSkeleton rows={6} cols={9} />
          ) : (
            <TBody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <EmptyState
                      icon={Package}
                      title={hasFilters ? "No matching items" : "No catalog items yet"}
                      message={
                        hasFilters
                          ? "Try a different search term or clear the filters."
                          : "Saved items autocomplete when you build a document."
                      }
                      action={
                        !hasFilters && (
                          <Button icon={Plus} onClick={() => navigate("/catalog/add")}>
                            Add Item
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <Tr key={item.id}>
                    <Td className="text-gray-400">{(page - 1) * limit + index + 1}</Td>
                    <Td className="font-medium text-gray-900">{item.name}</Td>
                    <Td className="capitalize text-gray-500">{item.kind}</Td>
                    <Td className="text-gray-500">
                      {item.hsn_sac || <span className="text-gray-300">—</span>}
                    </Td>
                    <Td className="text-gray-500">
                      {item.uqc || <span className="text-gray-300">—</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-right font-medium text-gray-800">
                      {formatINR(item.default_rate)}
                    </Td>
                    <Td className="text-right text-gray-500">
                      {Number(item.default_gst_rate)}%
                    </Td>
                    <Td>
                      <StatusBadge status={Number(item.is_active) ? "active" : "inactive"} />
                    </Td>
                    <Td>
                      <RowActions
                        onEdit={() => navigate(`/catalog/edit/${item.id}`)}
                        onDelete={() => handleDeleteClick(item)}
                        editLabel="Edit item"
                        deleteLabel="Delete item"
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
        title="Delete Catalog Item"
        description="If this item is used by any document it will be deactivated (kept for history) instead of deleted:"
        itemName={selected?.name}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        loading={deleting}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
}

export default CatalogList;
