import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { addIndustryStat, getIndustryStatById, updateIndustryStat } from "../../api/api";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import FormActions from "../../components/ui/FormActions";

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
  const [saving, setSaving] = useState(false);

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
    if (saving) return;
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title={isEdit ? "Update Industry Stat" : "Add an Industry Stat"}
        subtitle="Drives the industry breakdown on the website projects page."
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Industry"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Pharmaceutical"
          required
        />
        <Field
          label="Count"
          name="count"
          type="number"
          value={formData.count}
          onChange={handleChange}
          hint="Number of projects delivered in this industry."
        />
        <div>
          <label htmlFor="color" className="mb-1 block text-sm font-medium text-gray-700">
            Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(formData.color) ? formData.color : "#4f46e5"}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              aria-label="Pick a colour"
              className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
            />
            <input
              id="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              placeholder="#4f46e5"
              className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">Used for this industry&apos;s bar colour.</p>
        </div>
        <Field
          label="Sort Order"
          name="sort_order"
          type="number"
          value={formData.sort_order}
          onChange={handleChange}
          hint="Lower numbers appear first."
        />

        <FormActions
          saving={saving}
          submitLabel={isEdit ? "Update Stat" : "Create Stat"}
          onCancel={() => navigate("/industry-stats")}
        />
      </form>
    </Card>
  );
};

export default IndustryStatForm;
