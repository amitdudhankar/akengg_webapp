import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { addService, getServiceById, updateService } from "../../api/api";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import ImageField from "../../components/ui/ImageField";
import FormActions from "../../components/ui/FormActions";

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
  const [saving, setSaving] = useState(false);

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
    if (saving) return;
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title={isEdit ? "Update Service" : "Add a Service"}
        subtitle="Shown on the website services page and the homepage panel."
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Service title"
          required
        />
        <Field
          label="Sort Order"
          name="sort_order"
          type="number"
          value={formData.sort_order}
          onChange={handleChange}
          hint="Lower numbers appear first."
        />
        <Field
          label="Short Description"
          name="description"
          as="textarea"
          rows={2}
          value={formData.description}
          onChange={handleChange}
          placeholder="Short description shown on cards"
          required
          full
        />
        <Field
          label="Details"
          name="details"
          as="textarea"
          value={formData.details}
          onChange={handleChange}
          placeholder="Longer details (optional)"
          full
        />
        <Field
          label="Features"
          name="features"
          as="textarea"
          rows={4}
          value={formData.features}
          onChange={handleChange}
          placeholder="One feature per line"
          hint="Enter one feature per line."
          full
        />
        <Field
          label="Icon (optional)"
          name="icon"
          value={formData.icon}
          onChange={handleChange}
          placeholder="Icon name / class"
        />
        <Field
          label="Gradient (optional)"
          name="gradient"
          value={formData.gradient}
          onChange={handleChange}
          placeholder="e.g. from-indigo-500 to-purple-500"
        />

        <ImageField
          preview={previewImage}
          onChange={handleImageChange}
          isEdit={isEdit}
        />

        <FormActions
          saving={saving}
          submitLabel={isEdit ? "Update Service" : "Create Service"}
          onCancel={() => navigate("/services")}
        />
      </form>
    </Card>
  );
};

export default ServiceForm;
