import { StepBack } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { addBlog } from "../../api/api"; // Adjust the path if needed
import BlogEditor from "./BlogEditor";

const AddBlog = () => {
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState(null);
  const [content, setContent] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    descrip: "",
    content: "",
    image: null,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setFormData({ ...formData, image: file });
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const loadingToast = toast.loading("Submitting blog...");

    const formPayload = new FormData();
    formPayload.append("title", formData.title);
    formPayload.append("descrip", formData.descrip);
    formPayload.append("content", formData.content);
    formPayload.append("image", formData.image);

    try {
      const response = await addBlog(formPayload);

      console.log("✅ Blog submitted successfully:", response?.data);
      toast.success("Blog added successfully!", { id: loadingToast });
      navigate("/blogs");
    } catch (error) {
      console.error("❌ Blog submission failed:", {
        message: error?.response?.data?.message,
        status: error?.response?.status,
        fullError: error,
      });

      toast.error(error?.response?.data?.message || "Failed to submit blog", {
        id: loadingToast,
      });
    }
  };

  return (
    <div className="mx-auto h-auto w-full rounded-lg bg-white p-4 shadow-md sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-indigo-600 hover:text-indigo-800 transition text-sm font-medium"
          >
            <StepBack />
          </button>
          <h1 className="text-2xl font-bold text-indigo-600">Add a Blog</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Title */}
        <div>
          <label className="block text-base font-medium mb-1">Title</label>
          <input
            type="text"
            name="title"
            placeholder="Enter Blog Title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        {/* Description */}
        <div>
          <label className="block text-base font-medium mb-1">
            Description
          </label>
          <textarea
            type="text"
            name="descrip"
            placeholder="Enter Short Description"
            value={formData.descrip}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Upload Image */}
        <div className="md:col-span-2">
          <label className="block text-base font-semibold text-gray-700 mb-2">
            Upload Featured Image
          </label>

          {previewImage ? (
            <div className="mt-4 flex justify-center">
              <img
                src={previewImage}
                alt="Preview"
                className="w-auto h-40 object-contain rounded-md shadow-md border border-gray-200"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-indigo-400 rounded-lg cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg
                    aria-hidden="true"
                    className="w-10 h-10 mb-3 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16l-4-4m0 0l4-4m-4 4h18"
                    ></path>
                  </svg>
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    All Images types (max 5MB)
                  </p>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setFormData({ ...formData, image: file });
                    if (file) {
                      setPreviewImage(URL.createObjectURL(file));
                    }
                  }}
                  required
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Blog Content (Jodit Editor) */}
        <div className="md:col-span-2">
          <label className="block text-base font-medium mb-1">Content</label>
          <BlogEditor
            value={formData.content}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, content: value }))
            }
          />
        </div>

        {/* Submit button */}
        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 sm:w-[200px]"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddBlog;
