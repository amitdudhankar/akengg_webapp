import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Pencil, Trash2 } from "lucide-react";
import { fetchCatalog, deleteCatalogItem } from "../../api/api";
import Pagination from "../../components/ui/Pagination";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import { formatINR } from "../../utils/money";

function CatalogList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  // "" = all, "1" = active only, "0" = inactive only.
  const [activeFilter, setActiveFilter] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isChecked, setIsChecked] = useState(false);

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const getCatalog = async () => {
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
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch catalog");
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
    try {
      const res = await deleteCatalogItem(selected.id);
      toast.success(res?.data?.message || "Item deleted successfully");
      setIsModalOpen(false);
      setSelected(null);
      getCatalog();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete item");
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-indigo-600">Item Catalog</h1>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <select
            value={kindFilter}
            onChange={(e) => {
              setKindFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-gray-300 p-2 sm:w-auto"
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
            className="w-full rounded-md border border-gray-300 p-2 sm:w-auto"
          >
            <option value="">All statuses</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
          <input
            type="text"
            placeholder="Search catalog..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-gray-300 p-2 sm:min-w-[240px]"
          />
          <button
            onClick={() => navigate("/catalog/add")}
            className="w-full shrink-0 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 sm:w-auto"
          >
            Add Item
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border border-gray-200 divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Sr. No</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Kind</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">HSN/SAC</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">UQC</th>
              <th className="px-4 py-2 text-right font-medium text-gray-700">Rate</th>
              <th className="px-4 py-2 text-right font-medium text-gray-700">GST %</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Active</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-4 text-center text-gray-500">
                  No items found.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-2 capitalize">{item.kind}</td>
                  <td className="px-4 py-2">{item.hsn_sac || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-2">{item.uqc || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-2 text-right">{formatINR(item.default_rate)}</td>
                  <td className="px-4 py-2 text-right">{Number(item.default_gst_rate)}%</td>
                  <td className="px-4 py-2">
                    {Number(item.is_active) ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-5">
                      <Pencil
                        className="cursor-pointer text-blue-600 hover:text-blue-800"
                        onClick={() => navigate(`/catalog/edit/${item.id}`)}
                      />
                      <Trash2
                        className="cursor-pointer text-red-600 hover:text-red-800"
                        onClick={() => handleDeleteClick(item)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDeleteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDeleteConfirmed}
        title="Delete Catalog Item"
        description="If this item is used by any document it will be deactivated (kept for history) instead of deleted:"
        itemName={selected?.name}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

export default CatalogList;
