import { StepBack } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { addIndustryStat, getIndustryStatById, updateIndustryStat } from "../../api/api";

const EMPTY = {
  name: "",
  count: 0,
  color: "",
  sort_order: 0,
};

const IndustryStatForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [formData, setFormData] = useState(EMPTY);

  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        const res = await getIndustryStatById(id);
        const stat = res.data?.data;
        if (stat) {
          setFormData({
            name: stat.name || "",
            count: stat.count ?? 0,
            color: stat.color || "",
            sort_order: stat.sort_order ?? 0,
          });
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load industry stat");
      }
    };

    load();
  }, [id, isEdit]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading(isEdit ? "Updating..." : "Creating...");

    const payload = {
      name: formData.name,
      count: Number(formData.count) || 0,
      color: formData.color,
      sort_order: Number(formData.sort_order) || 0,
    };

    try {
      if (isEdit) {
        await updateIndustryStat(id, payload);
      } else {
        await addIndustryStat(payload);
      }
      toast.success(isEdit ? "Industry stat updated!" : "Industry stat created!", {
        id: loadingToast,
      });
      navigate("/industry-stats");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save industry stat", {
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
          {isEdit ? "Update Industry Stat" : "Add Industry Stat"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-base font-medium">Industry Name</label>
          <input
            type="text"
            name="name"
            placeholder="e.g. Pharmaceutical"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-base font-medium">Project Count</label>
          <input
            type="number"
            name="count"
            min="0"
            value={formData.count}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-base font-medium">Color (optional)</label>
          <input
            type="text"
            name="color"
            placeholder="e.g. #F4C542"
            value={formData.color}
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
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 sm:w-[200px]"
          >
            {isEdit ? "Update" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default IndustryStatForm;
