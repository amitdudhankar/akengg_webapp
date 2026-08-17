import { StepBack } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { addTestimonial, getTestimonialById, updateTestimonial } from "../../api/api";

const EMPTY = {
  client_name: "",
  company: "",
  content: "",
  sort_order: 0,
};

const TestimonialForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [formData, setFormData] = useState(EMPTY);

  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        const res = await getTestimonialById(id);
        const item = res.data?.data;
        if (item) {
          setFormData({
            client_name: item.client_name || "",
            company: item.company || "",
            content: item.content || "",
            sort_order: item.sort_order ?? 0,
          });
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load testimonial");
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
      client_name: formData.client_name,
      company: formData.company,
      content: formData.content,
      sort_order: Number(formData.sort_order) || 0,
    };

    try {
      if (isEdit) {
        await updateTestimonial(id, payload);
      } else {
        await addTestimonial(payload);
      }
      toast.success(isEdit ? "Testimonial updated!" : "Testimonial created!", {
        id: loadingToast,
      });
      navigate("/testimonials");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save testimonial", {
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
          {isEdit ? "Update Testimonial" : "Add Testimonial"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-base font-medium">Client Name</label>
          <input
            type="text"
            name="client_name"
            placeholder="e.g. Rajesh Kumar"
            value={formData.client_name}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-base font-medium">Company (optional)</label>
          <input
            type="text"
            name="company"
            placeholder="e.g. Pharma Industries Ltd"
            value={formData.company}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-base font-medium">Testimonial</label>
          <textarea
            name="content"
            placeholder="What the client said"
            value={formData.content}
            onChange={handleChange}
            required
            rows={4}
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

export default TestimonialForm;
