import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Pencil, Trash2 } from "lucide-react";
import { fetchTestimonials, deleteTestimonial } from "../../api/api";
import Pagination from "../../components/ui/Pagination";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";

function TestimonialsList() {
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isChecked, setIsChecked] = useState(false);

  const getTestimonials = async () => {
    try {
      const res = await fetchTestimonials();
      setTestimonials(res?.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch testimonials");
    }
  };

  useEffect(() => {
    getTestimonials();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return testimonials;
    return testimonials.filter((item) =>
      [item.client_name, item.company, item.content]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [testimonials, search]);

  useEffect(() => {
    const next = Math.max(1, Math.ceil(filtered.length / limit));
    setTotalPages(next);
    setPage((current) => Math.min(current, next));
  }, [filtered.length, limit]);

  const paginated = filtered.slice((page - 1) * limit, page * limit);

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
      const res = await deleteTestimonial(selected.id);
      toast.success(res?.data?.message || "Testimonial deleted successfully");
      setIsModalOpen(false);
      setSelected(null);
      getTestimonials();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete testimonial");
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-indigo-600">Testimonials</h1>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-5">
          <input
            type="text"
            placeholder="Search testimonials..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-gray-300 p-2 sm:min-w-[240px]"
          />
          <button
            onClick={() => navigate("/testimonials/add")}
            className="w-full shrink-0 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 sm:w-auto"
          >
            Add Testimonial
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border border-gray-200 divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Sr. No</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Client</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Company</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Testimonial</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Order</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-4 text-center text-gray-500">
                  No testimonials found.
                </td>
              </tr>
            ) : (
              paginated.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                  <td className="px-4 py-2">{item.client_name}</td>
                  <td className="px-4 py-2">{item.company || "—"}</td>
                  <td className="max-w-md px-4 py-2">
                    <span className="line-clamp-2">{item.content}</span>
                  </td>
                  <td className="px-4 py-2">{item.sort_order}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-5">
                      <Pencil
                        className="cursor-pointer text-blue-600 hover:text-blue-800"
                        onClick={() => navigate(`/testimonials/edit/${item.id}`)}
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
        title="Delete Testimonial"
        itemName={selected?.client_name}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

export default TestimonialsList;
