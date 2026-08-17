import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { deleteBlog, fetchBlogs } from "../../api/api"; // Adjust the path if needed
import Pagination from "../../components/ui/Pagination";
import { Pencil, Trash2 } from "lucide-react";
import DeleteBlog from "./DeleteBlog";

function BlogsList() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [limit] = useState(10); // You can make this user-selectable if needed
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBlogId, setSelectedBlogId] = useState(null);
  const [selectedBlog, setSelectedBlog] = useState(null);

  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const [isChecked, setIsChecked] = useState(false);

  const getBlogs = async () => {
    try {
      const response = await fetchBlogs({ page, limit, search });
      const data = response.data;

      setBlogs(data.blogs);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Error fetching blogs:", error);
      toast.error(error?.response?.data?.message || "Failed to fetch blogs");
    }
  };

  useEffect(() => {
    getBlogs();
  }, [page, search]);

  const handlePageChange = (pageNumber) => setPage(pageNumber);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on new search
  };

  const handleEditClick = (id) => {
    navigate(`/edit-blog/${id}`);
  };

  const handleDeleteClick = (blogId) => {
    const selectedBlog = blogs.find((blog) => blog.id === blogId);
    setSelectedBlog(selectedBlog);
    setSelectedBlogId(blogId); // Set the selectedBlogId here
    setIsModalOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!selectedBlogId) {
      toast.error("You must select a valid blog to delete.");
      return;
    }

    try {
      // Call deleteBlog API to delete the selected blog
      const response = await deleteBlog(selectedBlogId);
      toast.success(response?.data?.message || "Blog deleted successfully");

      // After successful deletion, close the modal and refresh the blogs list
      setIsModalOpen(false);
      setSelectedBlogId(null); // Reset selectedBlogId after deletion
      getBlogs(); // Refresh the list of blogs
    } catch (error) {
      console.error("Error deleting blog:", error);
      toast.error(error?.response?.data?.message || "Failed to delete blog");
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left side: Title */}
        <h1 className="text-2xl font-bold text-indigo-600">Blogs List</h1>

        {/* Right side: Search + Add button */}
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-5">
          <input
            type="text"
            placeholder="Search Blogs..."
            value={search}
            onChange={handleSearchChange}
            className="w-full rounded-md border border-gray-300 p-2 sm:min-w-[240px]"
          />
          <button
            onClick={() => navigate("/add-blog")}
            className="w-full shrink-0 whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 sm:w-auto"
          >
            Write a Blog
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border border-gray-200 divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left py-2 px-4 font-medium text-gray-700">
                Sr. No.
              </th>
              <th className="text-left py-2 px-4 font-medium text-gray-700">
                Title
              </th>
              <th className="text-left py-2 px-4 font-medium text-gray-700">
                Description
              </th>
              <th className="text-left py-2 px-4 font-medium text-gray-700">
                Image
              </th>
              <th className="text-left py-2 px-4 font-medium text-gray-700">
                Created At
              </th>
              <th className="text-left py-2 px-4 font-medium text-gray-700">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {blogs.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-500">
                  No blogs found.
                </td>
              </tr>
            ) : (
              blogs.map((blog, index) => (
                <tr key={blog.id}>
                  <td className="py-2 px-4">
                    {(page - 1) * limit + index + 1}
                  </td>{" "}
                  <td className="py-2 px-4">{blog.title}</td>
                  <td className="py-2 px-4">{blog.descrip}</td>
                  <td className="py-2 px-4">
                    <div className="flex flex-col items-center gap-2">
                      <a
                        href={blog.image}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={blog.image}
                          alt={blog.title}
                          className="w-16 h-16 object-cover rounded border border-gray-300"
                        />
                      </a>
                    </div>
                  </td>

                  <td className="py-2 px-4">
                    {new Date(blog.created_at)
                      .toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                      .toUpperCase()}
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-5">
                      <Pencil
                        className="cursor-pointer text-blue-600 hover:text-blue-800"
                        onClick={() => handleEditClick(blog.id)}
                      />
                      <Trash2
                        className="cursor-pointer text-red-600 hover:text-red-800"
                        onClick={() => handleDeleteClick(blog.id)} // Pass the blog id here
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Delete Modal */}
      <DeleteBlog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDeleteConfirmed}
        itemName={selectedBlog ? selectedBlog.title : ""}
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

export default BlogsList;
