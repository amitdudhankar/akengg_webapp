import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Plus, FolderKanban } from "lucide-react";
import { fetchProjects, deleteProject } from "../../api/api";
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

// `industry` is the legacy free-text label, but the API also describes a nested
// { id, slug, name } object once a project is linked to an industry page — so
// read either shape rather than printing "[object Object]".
const industryLabel = (project) => {
  const value = project?.industry;
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.name || "";
  return "";
};

function ProjectsList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getProjects = async () => {
    try {
      // status=all so drafts stay visible in the admin — the public site only
      // ever sees published case studies.
      const res = await fetchProjects({ status: "all" });
      setProjects(res?.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProjects();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) =>
      [project.title, industryLabel(project), project.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [projects, search]);

  useEffect(() => {
    const next = Math.max(1, Math.ceil(filtered.length / limit));
    setTotalPages(next);
    setPage((current) => Math.min(current, next));
  }, [filtered.length, limit]);

  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleDeleteClick = (project) => {
    setSelected(project);
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
      const res = await deleteProject(selected.id);
      toast.success(res?.data?.message || "Project deleted successfully");
      setIsModalOpen(false);
      setSelected(null);
      getProjects();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} project${projects.length === 1 ? "" : "s"} on the website`}
      >
        <SearchInput
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search projects..."
        />
        <Button icon={Plus} onClick={() => navigate("/projects/add")} className="shrink-0">
          Add Project
        </Button>
      </PageHeader>

      <TableWrap>
        <Table minWidth="1000px">
          <THead>
            <Th className="w-16">#</Th>
            <Th>Title</Th>
            <Th>Industry</Th>
            <Th className="w-24">Image</Th>
            <Th className="w-28">Published</Th>
            <Th className="w-20">Order</Th>
            <Th className="w-24">Actions</Th>
          </THead>

          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : (
            <TBody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState
                      icon={FolderKanban}
                      title={search ? "No matching projects" : "No projects yet"}
                      message={
                        search
                          ? "Try a different search term."
                          : "Add a project and it appears on the website straight away."
                      }
                      action={
                        !search && (
                          <Button icon={Plus} onClick={() => navigate("/projects/add")}>
                            Add Project
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginated.map((project, index) => (
                  <Tr key={project.id}>
                    <Td className="text-gray-400">{(page - 1) * limit + index + 1}</Td>
                    <Td className="font-medium text-gray-900">{project.title}</Td>
                    <Td className="text-gray-500">
                      {industryLabel(project) || <span className="text-gray-300">—</span>}
                    </Td>
                    <Td>
                      {project.image ? (
                        <img
                          src={project.image}
                          alt={project.title}
                          className="h-10 w-14 rounded-md border border-gray-200 object-cover"
                        />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge
                        status={Number(project.is_published ?? 1) ? "active" : "inactive"}
                      />
                    </Td>
                    <Td className="text-gray-500">{project.sort_order}</Td>
                    <Td>
                      <RowActions
                        onEdit={() => navigate(`/projects/edit/${project.id}`)}
                        onDelete={() => handleDeleteClick(project)}
                        editLabel="Edit project"
                        deleteLabel="Delete project"
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
        title="Delete Project"
        itemName={selected?.title}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        loading={deleting}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
}

export default ProjectsList;
