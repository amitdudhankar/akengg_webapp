import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { addTestimonial, getTestimonialById, updateTestimonial } from "../../api/api";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import FormActions from "../../components/ui/FormActions";

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
  const [saving, setSaving] = useState(false);

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
    if (saving) return;
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title={isEdit ? "Update Testimonial" : "Add a Testimonial"}
        subtitle="Appears in the slider on the website homepage."
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Client Name"
          name="client_name"
          value={formData.client_name}
          onChange={handleChange}
          placeholder="Who gave the testimonial"
          required
        />
        <Field
          label="Company"
          name="company"
          value={formData.company}
          onChange={handleChange}
          placeholder="Their company (optional)"
        />
        <Field
          label="Testimonial"
          name="content"
          as="textarea"
          rows={5}
          value={formData.content}
          onChange={handleChange}
          placeholder="What they said"
          required
          full
        />
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
          submitLabel={isEdit ? "Update Testimonial" : "Create Testimonial"}
          onCancel={() => navigate("/testimonials")}
        />
      </form>
    </Card>
  );
};

export default TestimonialForm;
