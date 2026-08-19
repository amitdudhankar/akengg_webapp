import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Plus, UsersRound } from "lucide-react";
import { fetchTeam, deleteTeamMember } from "../../api/api";
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

function TeamList() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getMembers = async () => {
    try {
      const res = await fetchTeam();
      setMembers(res?.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch team members");
    } finally {
      setLoading(false);
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
    setDeleting(true);
    try {
      const res = await deleteTeamMember(selected.id);
      toast.success(res?.data?.message || "Team member deleted successfully");
      setIsModalOpen(false);
      setSelected(null);
      getMembers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete team member");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title="Team Members"
        subtitle={`${members.length} member${members.length === 1 ? "" : "s"}`}
      >
        <SearchInput
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search team..."
        />
        <Button icon={Plus} onClick={() => navigate("/team/add")} className="shrink-0">
          Add Member
        </Button>
      </PageHeader>

      <TableWrap>
        <Table>
          <THead>
            <Th className="w-16">#</Th>
            <Th className="w-20">Photo</Th>
            <Th>Name</Th>
            <Th>Title</Th>
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
                      icon={UsersRound}
                      title={search ? "No matching members" : "No team members yet"}
                      message={
                        search ? "Try a different search term." : "Add the people behind the company."
                      }
                      action={
                        !search && (
                          <Button icon={Plus} onClick={() => navigate("/team/add")}>
                            Add Member
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginated.map((member, index) => (
                  <Tr key={member.id}>
                    <Td className="text-gray-400">{(page - 1) * limit + index + 1}</Td>
                    <Td>
                      {member.image ? (
                        <img
                          src={member.image}
                          alt={member.name}
                          className="h-10 w-10 rounded-full border border-gray-200 object-cover"
                        />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
                          {String(member.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Td>
                    <Td className="font-medium text-gray-900">{member.name}</Td>
                    <Td className="text-gray-500">{member.title || "—"}</Td>
                    <Td className="text-gray-500">{member.sort_order}</Td>
                    <Td>
                      <RowActions
                        onEdit={() => navigate(`/team/edit/${member.id}`)}
                        onDelete={() => handleDeleteClick(member)}
                        editLabel="Edit team member"
                        deleteLabel="Delete team member"
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
        title="Delete Team Member"
        itemName={selected?.name}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        loading={deleting}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
}

export default TeamList;
