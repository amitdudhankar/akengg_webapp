import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { fetchSubscribers, deleteSubscriber } from "../../api/api";
import Pagination from "../../components/ui/Pagination";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";

function NewsletterList() {
  const [subscribers, setSubscribers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isChecked, setIsChecked] = useState(false);

  const getSubscribers = async () => {
    try {
      const res = await fetchSubscribers();
      setSubscribers(res?.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch subscribers");
    }
  };

  useEffect(() => {
    getSubscribers();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return subscribers;
    return subscribers.filter((sub) =>
      [sub.email, sub.status].filter(Boolean).some((value) => value.toLowerCase().includes(query))
    );
  }, [subscribers, search]);

  useEffect(() => {
    const next = Math.max(1, Math.ceil(filtered.length / limit));
    setTotalPages(next);
    setPage((current) => Math.min(current, next));
  }, [filtered.length, limit]);

  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleDeleteClick = (sub) => {
    setSelected(sub);
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
      const res = await deleteSubscriber(selected.id);
      toast.success(res?.data?.message || "Subscriber deleted successfully");
      setIsModalOpen(false);
      setSelected(null);
      getSubscribers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete subscriber");
    }
  };

  const handleExportToExcel = () => {
    try {
      const exportData = filtered.map((sub) => ({
        Email: sub.email,
        Status: sub.status,
        SubscribedAt: sub.created_at,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Subscribers");
      XLSX.writeFile(wb, "newsletter_subscribers.xlsx");
    } catch (error) {
      console.error("Error exporting subscribers:", error);
      toast.error("Failed to export subscribers to Excel.");
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-indigo-600">Newsletter Subscribers</h1>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-5">
          <input
            type="text"
            placeholder="Search subscribers..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-gray-300 p-2 sm:min-w-[220px]"
          />
          <button
            onClick={handleExportToExcel}
            className="w-full shrink-0 whitespace-nowrap rounded-lg bg-gradient-to-r from-[#217346] to-[#1e623d] px-4 py-2 font-semibold text-white shadow-lg transition-all hover:scale-105 sm:w-auto"
          >
            Export to Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border border-gray-200 divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Sr. No</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Email</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Subscribed At</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-4 text-center text-gray-500">
                  No subscribers found.
                </td>
              </tr>
            ) : (
              paginated.map((sub, index) => (
                <tr key={sub.id}>
                  <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                  <td className="px-4 py-2">{sub.email}</td>
                  <td className="px-4 py-2 capitalize">{sub.status}</td>
                  <td className="px-4 py-2">
                    {new Date(sub.created_at)
                      .toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                      .toUpperCase()}
                  </td>
                  <td className="px-4 py-2">
                    <Trash2
                      className="cursor-pointer text-red-600 hover:text-red-800"
                      onClick={() => handleDeleteClick(sub)}
                    />
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
        title="Delete Subscriber"
        itemName={selected?.email}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

export default NewsletterList;
