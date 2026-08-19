import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  addCatalogItem,
  getCatalogItemById,
  updateCatalogItem,
} from "../../api/api";
import { GST_RATE_OPTIONS, UQC_OPTIONS } from "../../config/docConfig";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import FormActions from "../../components/ui/FormActions";

const EMPTY = {
  kind: "goods",
  name: "",
  description: "",
  hsn_sac: "",
  uqc: "NOS",
  default_rate: "",
  default_gst_rate: 18,
  is_active: true,
};

const KIND_OPTIONS = [
  { value: "goods", label: "Goods" },
  { value: "service", label: "Service" },
];

const CatalogForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [formData, setFormData] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        const res = await getCatalogItemById(id);
        const item = res.data?.data;
        if (item) {
          setFormData({
            kind: item.kind || "goods",
            name: item.name || "",
            description: item.description || "",
            hsn_sac: item.hsn_sac || "",
            uqc: item.uqc || "",
            default_rate: item.default_rate ?? "",
            default_gst_rate: item.default_gst_rate ?? 0,
            is_active: Boolean(Number(item.is_active)),
          });
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load item");
      }
    };

    load();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const loadingToast = toast.loading(isEdit ? "Updating item..." : "Creating item...");

    const payload = {
      kind: formData.kind,
      name: formData.name,
      description: formData.description,
      hsn_sac: formData.hsn_sac,
      uqc: formData.uqc,
      default_rate: Number(formData.default_rate) || 0,
      default_gst_rate: Number(formData.default_gst_rate) || 0,
      is_active: formData.is_active ? 1 : 0,
    };

    try {
      if (isEdit) {
        await updateCatalogItem(id, payload);
      } else {
        await addCatalogItem(payload);
      }
      toast.success(isEdit ? "Item updated successfully!" : "Item created successfully!", {
        id: loadingToast,
      });
      navigate("/catalog");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save item", {
        id: loadingToast,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title={isEdit ? "Update Item" : "Add a Catalog Item"}
        subtitle="Saved items autocomplete when you build a document."
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Kind"
          name="kind"
          as="select"
          options={KIND_OPTIONS}
          value={formData.kind}
          onChange={handleChange}
        />
        <Field
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Item or service name"
          required
        />
        <Field
          label="Description"
          name="description"
          as="textarea"
          rows={2}
          value={formData.description}
          onChange={handleChange}
          placeholder="Optional line description"
          full
        />
        <Field
          label="HSN / SAC"
          name="hsn_sac"
          value={formData.hsn_sac}
          onChange={handleChange}
          placeholder="e.g. 8402"
        />
        <Field
          label="UQC"
          name="uqc"
          as="select"
          options={UQC_OPTIONS.map((u) => ({ value: u, label: u }))}
          value={formData.uqc}
          onChange={handleChange}
          hint="Unit quantity code printed on the invoice."
        />
        <Field
          label="Default Rate"
          name="default_rate"
          type="number"
          step="0.01"
          value={formData.default_rate}
          onChange={handleChange}
          placeholder="0.00"
        />
        <Field
          label="Default GST %"
          name="default_gst_rate"
          as="select"
          options={GST_RATE_OPTIONS.map((r) => ({ value: r, label: `${r}%` }))}
          value={formData.default_gst_rate}
          onChange={handleChange}
        />

        <div className="md:col-span-2">
          <label
            htmlFor="is_active"
            className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
          >
            <input
              id="is_active"
              name="is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Active — available to pick when building a document
          </label>
        </div>

        <FormActions
          saving={saving}
          submitLabel={isEdit ? "Update Item" : "Create Item"}
          onCancel={() => navigate("/catalog")}
        />
      </form>
    </Card>
  );
};

export default CatalogForm;
