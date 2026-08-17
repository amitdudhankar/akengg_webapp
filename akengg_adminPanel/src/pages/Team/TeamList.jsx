import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Pencil, Trash2 } from "lucide-react";
import { fetchTeam, deleteTeamMember } from "../../api/api";
import Pagination from "../../components/ui/Pagination";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";

function TeamList() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isChecked, setIsChecked] = useState(false);

  const getMembers = async () => {
    try {
      const res = await fetchTeam();
      setMembers(res?.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch team members");
    }
  };

  useEffect(() => {
    getMembers();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) =>
      [member.name, member.title, member.subtitle]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [members, search]);

  useEffect(() => {
    const next = Math.max(1, Math.ceil(filtered.length / limit));
    setTotalPages(next);
    setPage((current) => Math.min(current, next));
  }, [filtered.length, limit]);

  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleDeleteClick = (member) => {
    setSelected(member);
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
      const res = await deleteTeamMember(selected.id);
      toast.success(res?.data?.message || "Team member deleted successfully");
      setIsModalOpen(false);
      setSelected(null);
      getMembers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete team member");
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-indigo-600">Team Members</h1>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-5">
          <input
            type="text"
            placeholder="Search team..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-gray-300 p-2 sm:min-w-[240px]"
          />
          <button
            onClick={() => navigate("/team/add")}
            className="w-full shrink-0 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 sm:w-auto"
          >
            Add Member
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border border-gray-200 divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Sr. No</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Photo</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Title</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Order</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-4 text-center text-gray-500">
                  No team members found.
                </td>
              </tr>
            ) : (
              paginated.map((member, index) => (
                <tr key={member.id}>
                  <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                  <td className="px-4 py-2">
                    {member.image ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        className="h-12 w-12 rounded-full border border-gray-300 object-cover"
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{member.name}</td>
                  <td className="px-4 py-2">{member.title || "—"}</td>
                  <td className="px-4 py-2">{member.sort_order}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-5">
                      <Pencil
                        className="cursor-pointer text-blue-600 hover:text-blue-800"
                        onClick={() => navigate(`/team/edit/${member.id}`)}
                      />
                      <Trash2
                        className="cursor-pointer text-red-600 hover:text-red-800"
                        onClick={() => handleDeleteClick(member)}
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
        title="Delete Team Member"
        itemName={selected?.name}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

export default TeamList;
