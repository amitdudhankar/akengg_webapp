import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { fetchUsers, deleteUser } from "../../api/api";
import Pagination from "../../components/ui/Pagination";
import { Pencil, Trash2 } from "lucide-react";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

function Users() {
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isChecked, setIsChecked] = useState(false);

  const getUsers = async () => {
    try {
      const response = await fetchUsers();
      const usersData = response?.data?.data || [];

      setAllUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(error?.response?.data?.message || "Failed to fetch users");
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  const filteredUsers = allUsers.filter((user) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [user.name, user.email, user.phone, user.role]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil(filteredUsers.length / limit));

    setTotalPages(nextTotalPages);
    setPage((currentPage) => Math.min(currentPage, nextTotalPages));
  }, [filteredUsers.length, limit]);

  const paginatedUsers = filteredUsers.slice(
    (page - 1) * limit,
    page * limit
  );

  const handlePageChange = (pageNumber) => setPage(pageNumber);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleEditClick = (id) => {
    navigate(`/edit-users/${id}`);
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setIsChecked(false);
    setIsModalOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!isChecked) {
      toast.error("You must confirm the deletion.");
      return;
    }

    if (!selectedUser?.id) {
      toast.error("No user selected for deletion.");
      return;
    }

    try {
      const response = await deleteUser(selectedUser.id);

      toast.success(response?.data?.message || "User deleted successfully!");
      setIsModalOpen(false);
      setSelectedUser(null);
      getUsers();
    } catch (error) {
      const message =
        error?.response?.data?.message || "Failed to delete user.";
      toast.error(message);
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-indigo-600">Users</h1>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-5">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={handleSearchChange}
            className="w-full rounded-md border border-gray-300 p-2 sm:min-w-[240px]"
          />
          <button
            onClick={() => navigate("/add-users")}
            className="w-full shrink-0 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 sm:w-auto"
          >
            Add User
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border border-gray-200 divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-700">
                Full Name
              </th>
              <th className="text-left px-4 py-2 font-medium text-gray-700">
                Email
              </th>
              <th className="text-left px-4 py-2 font-medium text-gray-700">
                Phone Number
              </th>
              <th className="text-left px-4 py-2 font-medium text-gray-700">
                Role
              </th>
              <th className="text-left px-4 py-2 font-medium text-gray-700">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-4 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-2">{user.name}</td>
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">{user.phone}</td>
                  <td className="px-4 py-2 capitalize">{user.role}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-5">
                      <Pencil
                        className="cursor-pointer text-blue-600 hover:text-blue-800"
                        onClick={() => handleEditClick(user.id)}
                      />
                      <Trash2
                        className="cursor-pointer text-red-600 hover:text-red-800"
                        onClick={() => handleDeleteClick(user)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DeleteConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDeleteConfirmed}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        email={selectedUser?.email}
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

export default Users;
