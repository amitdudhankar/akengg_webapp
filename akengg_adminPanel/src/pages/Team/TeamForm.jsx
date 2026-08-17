import { StepBack } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { addTeamMember, getTeamMemberById, updateTeamMember } from "../../api/api";

const EMPTY = {
  name: "",
  title: "",
  subtitle: "",
  description: "",
  sort_order: 0,
  image: null,
};

const TeamForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState(null);
  const [formData, setFormData] = useState(EMPTY);

  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        const res = await getTeamMemberById(id);
        const member = res.data?.data;
        if (member) {
          setFormData({
            name: member.name || "",
            title: member.title || "",
            subtitle: member.subtitle || "",
            description: member.description || "",
            sort_order: member.sort_order ?? 0,
            image: null,
          });
          setPreviewImage(member.image || null);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load team member");
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
    const loadingToast = toast.loading(isEdit ? "Updating member..." : "Creating member...");

    const payload = new FormData();
    payload.append("name", formData.name);
    payload.append("title", formData.title);
    payload.append("subtitle", formData.subtitle);
    payload.append("description", formData.description);
    payload.append("sort_order", formData.sort_order);
    if (formData.image) payload.append("image", formData.image);

    try {
      if (isEdit) {
        await updateTeamMember(id, payload);
      } else {
        await addTeamMember(payload);
      }
      toast.success(isEdit ? "Team member updated!" : "Team member created!", {
        id: loadingToast,
      });
      navigate("/team");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save team member", {
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
          {isEdit ? "Update Team Member" : "Add Team Member"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-base font-medium">Name</label>
          <input
            type="text"
            name="name"
            placeholder="Full name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-base font-medium">Title</label>
          <input
            type="text"
            name="title"
            placeholder="e.g. Engineering Head"
            value={formData.title}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-base font-medium">Subtitle</label>
          <input
            type="text"
            name="subtitle"
            placeholder="e.g. Technical Operations"
            value={formData.subtitle}
            onChange={handleChange}
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
          <label className="mb-1 block text-base font-medium">Description</label>
          <textarea
            name="description"
            placeholder="Short bio / role description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-base font-semibold text-gray-700">
            Photo {isEdit ? "(leave empty to keep current)" : ""}
          </label>
          {previewImage ? (
            <div className="mb-3 flex justify-center">
              <img
                src={previewImage}
                alt="Preview"
                className="h-40 w-40 rounded-full border border-gray-200 object-cover shadow"
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
            {isEdit ? "Update Member" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeamForm;
