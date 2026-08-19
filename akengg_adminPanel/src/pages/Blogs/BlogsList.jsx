import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Plus, Newspaper } from "lucide-react";
import { deleteBlog, fetchBlogs } from "../../api/api";
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

const fmtDate = (value) =>
  value
    ? new Date(value)
        .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        .toUpperCase()
    : "—";

function BlogsList() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  // Blogs are paginated and searched SERVER-side, so the raw input is debounced
  // before it becomes a query — otherwise every keystroke fires a request.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const getBlogs = async () => {
    setLoading(true);
    try {
      const response = await fetchBlogs({ page, limit, search: debouncedSearch });
      const data = response.data;
      // /blogs answers the flat { blogs, page, totalItems, totalPages } envelope.
      setBlogs(data.blogs || []);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems ?? 0);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch blogs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  const handleDeleteClick = (blog) => {
    setSelectedBlog(blog);
    setIsChecked(false);
    setIsModalOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!isChecked) {
      toast.error("You must confirm the deletion.");
      return;
    }
    if (!selectedBlog?.id) return;
    setDeleting(true);
    try {
      const response = await deleteBlog(selectedBlog.id);
      toast.success(response?.data?.message || "Blog deleted successfully");
      setIsModalOpen(false);
      setSelectedBlog(null);
      getBlogs();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete blog");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title="Blogs"
        subtitle={`${totalItems} post${totalItems === 1 ? "" : "s"} published`}
      >
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search blogs..."
        />
        <Button icon={Plus} onClick={() => navigate("/add-blog")} className="shrink-0">
          Write a Blog
        </Button>
      </PageHeader>

      <TableWrap>
        <Table minWidth="960px">
          <THead>
            <Th className="w-16">#</Th>
            <Th>Title</Th>
            <Th>Description</Th>
            <Th className="w-24">Image</Th>
            <Th className="w-32">Created</Th>
            <Th className="w-24">Actions</Th>
          </THead>

          {loading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
            <TBody>
              {blogs.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <EmptyState
                      icon={Newspaper}
                      title={debouncedSearch ? "No matching blogs" : "No blogs yet"}
                      message={
                        debouncedSearch
                          ? "Try a different search term."
                          : "Write your first post — it goes live on the website immediately."
                      }
                      action={
                        !debouncedSearch && (
                          <Button icon={Plus} onClick={() => navigate("/add-blog")}>
                            Write a Blog
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                blogs.map((blog, index) => (
                  <Tr key={blog.id}>
                    <Td className="text-gray-400">{(page - 1) * limit + index + 1}</Td>
                    <Td className="font-medium text-gray-900">{blog.title}</Td>
                    <Td className="max-w-md text-gray-500">
                      <span className="line-clamp-2">{blog.descrip}</span>
                    </Td>
                    <Td>
                      {blog.image ? (
                        <img
                          src={blog.image}
                          alt={blog.title}
                          className="h-10 w-14 rounded-md border border-gray-200 object-cover"
                        />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-gray-500">{fmtDate(blog.created_at)}</Td>
                    <Td>
                      <RowActions
                        onEdit={() => navigate(`/edit-blog/${blog.id}`)}
                        onDelete={() => handleDeleteClick(blog)}
                        editLabel="Edit blog"
                        deleteLabel="Delete blog"
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
        title="Delete Blog"
        itemName={selectedBlog?.title}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        loading={deleting}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
}

export default BlogsList;
