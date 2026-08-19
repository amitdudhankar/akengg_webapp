import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Plus, ShieldCheck } from "lucide-react";
import { fetchUsers, deleteUser } from "../../api/api";
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

const ROLE_STYLES = {
  admin: "bg-indigo-100 text-indigo-700",
  employee: "bg-sky-100 text-sky-700",
};

function RoleBadge({ role }) {
  const key = String(role || "").toLowerCase();
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        ROLE_STYLES[key] || "bg-slate-100 text-slate-600"
      }`}
    >
      {role || "—"}
    </span>
  );
}

function Users() {
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getUsers = async () => {
    try {
      const response = await fetchUsers();
      setAllUsers(response?.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allUsers;

    return allUsers.filter((user) =>
      [user.name, user.email, user.phone, user.role]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [allUsers, search]);

  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil(filteredUsers.length / limit));
    setTotalPages(nextTotalPages);
    setPage((currentPage) => Math.min(currentPage, nextTotalPages));
  }, [filteredUsers.length, limit]);

  const paginatedUsers = filteredUsers.slice((page - 1) * limit, page * limit);

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
    setDeleting(true);
    try {
      const response = await deleteUser(selectedUser.id);
      toast.success(response?.data?.message || "User deleted successfully!");
      setIsModalOpen(false);
      setSelectedUser(null);
      getUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title="Users"
        subtitle={`${allUsers.length} account${allUsers.length === 1 ? "" : "s"} with admin access`}
      >
        <SearchInput
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search users..."
        />
        <Button icon={Plus} onClick={() => navigate("/add-users")} className="shrink-0">
          Add User
        </Button>
      </PageHeader>

      <TableWrap>
        <Table minWidth="680px">
          <THead>
            <Th>Full Name</Th>
            <Th>Email</Th>
            <Th>Phone</Th>
            <Th className="w-32">Role</Th>
            <Th className="w-24">Actions</Th>
          </THead>

          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : (
            <TBody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <EmptyState
                      icon={ShieldCheck}
                      title={search ? "No matching users" : "No users yet"}
                      message={
                        search
                          ? "Try a different search term."
                          : "Add an account so a colleague can sign in."
                      }
                      action={
                        !search && (
                          <Button icon={Plus} onClick={() => navigate("/add-users")}>
                            Add User
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <Tr key={user.id}>
                    <Td className="font-medium text-gray-900">{user.name}</Td>
                    <Td className="text-gray-500">{user.email}</Td>
                    <Td className="whitespace-nowrap text-gray-500">{user.phone}</Td>
                    <Td>
                      <RoleBadge role={user.role} />
                    </Td>
                    <Td>
                      <RowActions
                        onEdit={() => navigate(`/edit-users/${user.id}`)}
                        onDelete={() => handleDeleteClick(user)}
                        editLabel="Edit user"
                        deleteLabel="Delete user"
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
        title="Delete User"
        itemName={selectedUser?.email}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        loading={deleting}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
}

export default Users;
