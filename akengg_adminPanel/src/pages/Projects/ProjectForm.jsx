import { StepBack } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { addProject, getProjectById, updateProject } from "../../api/api";

const EMPTY = {
  title: "",
  industry: "",
  description: "",
  features: "",
  sort_order: 0,
  image: null,
};

const ProjectForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState(null);
  const [formData, setFormData] = useState(EMPTY);

  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        const res = await getProjectById(id);
        const project = res.data?.data;
        if (project) {
          setFormData({
            title: project.title || "",
            industry: project.industry || "",
            description: project.description || "",
            features: Array.isArray(project.features) ? project.features.join("\n") : "",
            sort_order: project.sort_order ?? 0,
            image: null,
          });
          setPreviewImage(project.image || null);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load project");
      }
    };

    load();
  }, [id, isEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setFormData({ ...formData, image: file });
    if (file) setPreviewImage(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading(isEdit ? "Updating project..." : "Creating project...");

    const payload = new FormData();
    payload.append("title", formData.title);
    payload.append("industry", formData.industry);
    payload.append("description", formData.description);
    payload.append("features", formData.features);
    payload.append("sort_order", formData.sort_order);
    if (formData.image) payload.append("image", formData.image);

    try {
      if (isEdit) {
        await updateProject(id, payload);
      } else {
        await addProject(payload);
      }
      toast.success(isEdit ? "Project updated successfully!" : "Project created successfully!", {
        id: loadingToast,
      });
      navigate("/projects");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save project", {
        id: loadingToast,
      });
    }
  };

  return (
    <div className="mx-auto h-auto w-full rounded-lg bg-white p-4 shadow-md sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-medium text-indigo-600 transition hover:text-indigo-800"
        >
          <StepBack />
        </button>
        <h1 className="text-2xl font-bold text-indigo-600">
          {isEdit ? "Update Project" : "Add a Project"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-base font-medium">Title</label>
          <input
            type="text"
            name="title"
            placeholder="Project title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-base font-medium">Industry</label>
          <input
            type="text"
            name="industry"
            placeholder="e.g. Pharmaceutical"
            value={formData.industry}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-base font-medium">Description</label>
          <textarea
            name="description"
            placeholder="Project description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={3}
            className="w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-base font-medium">Features</label>
          <textarea
            name="features"
            placeholder="One feature per line"
            value={formData.features}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-md border border-gray-300 p-2"
          />
          <p className="mt-1 text-xs text-gray-500">Enter one feature per line.</p>
        </div>

        <div>
          <label className="mb-1 block text-base font-medium">Sort Order</label>
          <input
            type="number"
            name="sort_order"
            value={formData.sort_order}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-base font-semibold text-gray-700">
            Image {isEdit ? "(leave empty to keep current)" : ""}
          </label>
          {previewImage ? (
            <div className="mb-3 flex justify-center">
              <img
                src={previewImage}
                alt="Preview"
                className="h-40 w-auto rounded-md border border-gray-200 object-contain shadow"
              />
            </div>
          ) : null}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 sm:w-[200px]"
          >
            {isEdit ? "Update Project" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;
