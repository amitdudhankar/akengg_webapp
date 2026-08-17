import { StepBack } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { addService, getServiceById, updateService } from "../../api/api";

const EMPTY = {
  title: "",
  description: "",
  details: "",
  features: "",
  icon: "",
  gradient: "",
  sort_order: 0,
  image: null,
};

const ServiceForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState(null);
  const [formData, setFormData] = useState(EMPTY);

  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        const res = await getServiceById(id);
        const service = res.data?.data;
        if (service) {
          setFormData({
            title: service.title || "",
            description: service.description || "",
            details: service.details || "",
            features: Array.isArray(service.features) ? service.features.join("\n") : "",
            icon: service.icon || "",
            gradient: service.gradient || "",
            sort_order: service.sort_order ?? 0,
            image: null,
          });
          setPreviewImage(service.image || null);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load service");
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
    const loadingToast = toast.loading(isEdit ? "Updating service..." : "Creating service...");

    const payload = new FormData();
    payload.append("title", formData.title);
    payload.append("description", formData.description);
    payload.append("details", formData.details);
    payload.append("features", formData.features);
    payload.append("icon", formData.icon);
    payload.append("gradient", formData.gradient);
    payload.append("sort_order", formData.sort_order);
    if (formData.image) payload.append("image", formData.image);

    try {
      if (isEdit) {
        await updateService(id, payload);
      } else {
        await addService(payload);
      }
      toast.success(isEdit ? "Service updated successfully!" : "Service created successfully!", {
        id: loadingToast,
      });
      navigate("/services");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save service", {
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
          {isEdit ? "Update Service" : "Add a Service"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-base font-medium">Title</label>
          <input
            type="text"
            name="title"
            placeholder="Service title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 p-2"
          />
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
          <label className="mb-1 block text-base font-medium">Short Description</label>
          <textarea
            name="description"
            placeholder="Short description shown on cards"
            value={formData.description}
            onChange={handleChange}
            required
            rows={2}
            className="w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-base font-medium">Details</label>
          <textarea
            name="details"
            placeholder="Longer details (optional)"
            value={formData.details}
            onChange={handleChange}
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
          <label className="mb-1 block text-base font-medium">Icon (optional)</label>
          <input
            type="text"
            name="icon"
            placeholder="Icon name / class"
            value={formData.icon}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-base font-medium">Gradient (optional)</label>
          <input
            type="text"
            name="gradient"
            placeholder="e.g. from-indigo-500 to-purple-500"
            value={formData.gradient}
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
            {isEdit ? "Update Service" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ServiceForm;
