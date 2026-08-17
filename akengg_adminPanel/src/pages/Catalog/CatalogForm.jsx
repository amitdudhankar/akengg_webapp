import { StepBack } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  addCatalogItem,
  getCatalogItemById,
  updateCatalogItem,
} from "../../api/api";
import { GST_RATE_OPTIONS, UQC_OPTIONS } from "../../config/docConfig";

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

const inputCls = "w-full rounded-md border border-gray-300 p-2";

const CatalogForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [formData, setFormData] = useState(EMPTY);

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
          {isEdit ? "Update Item" : "Add a Catalog Item"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-base font-medium text-gray-700">Kind</label>
          <select name="kind" value={formData.kind} onChange={handleChange} className={inputCls}>
            <option value="goods">Goods</option>
            <option value="service">Service</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-base font-medium text-gray-700">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Item / service name"
            required
            className={inputCls}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-base font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={2}
            placeholder="Optional description"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1 block text-base font-medium text-gray-700">HSN / SAC</label>
          <input
            type="text"
            name="hsn_sac"
            value={formData.hsn_sac}
            onChange={handleChange}
            placeholder="e.g. 8471"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1 block text-base font-medium text-gray-700">UQC (Unit)</label>
          <input
            type="text"
            name="uqc"
            list="catalog-uqc-options"
            value={formData.uqc}
            onChange={handleChange}
            placeholder="NOS"
            className={inputCls}
          />
          <datalist id="catalog-uqc-options">
            {UQC_OPTIONS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-base font-medium text-gray-700">Default Rate</label>
          <input
            type="number"
            min="0"
            step="any"
            name="default_rate"
            value={formData.default_rate}
            onChange={handleChange}
            placeholder="0.00"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1 block text-base font-medium text-gray-700">Default GST Rate</label>
          <select
            name="default_gst_rate"
            value={formData.default_gst_rate}
            onChange={handleChange}
            className={inputCls}
          >
            {GST_RATE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}%
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            Active
          </label>
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 sm:w-[200px]"
          >
            {isEdit ? "Update Item" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CatalogForm;
