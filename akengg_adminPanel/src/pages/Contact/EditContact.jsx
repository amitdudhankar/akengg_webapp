import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { fetchContactById, updateContact } from "../../api/api";
import {
  getFirstContactError,
  normalizeContactPayload,
  validateContactUpdateForm,
} from "../../utils/contactValidation";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import FormActions from "../../components/ui/FormActions";

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "closed", label: "Closed" },
];

const EditContact = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    email: "",
    message: "",
    status: "new",
  });

  useEffect(() => {
    const getContact = async () => {
      try {
        const response = await fetchContactById(id);
        const contact = response?.data?.data;

        if (contact) {
          setFormData({
            name: contact.name || "",
            number: contact.number || "",
            email: contact.email || "",
            message: contact.message || "",
            status: contact.status || "new",
          });
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to fetch contact");
      }
    };

    getContact();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === "email" || name === "status" ? value.toLowerCase() : value;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: nextValue,
    }));
  };

  const handleBlur = (field) => {
    const nextErrors = validateContactUpdateForm(formData);
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: nextErrors[field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const nextErrors = validateContactUpdateForm(formData);
    const firstError = getFirstContactError(nextErrors);

    setErrors(nextErrors);

    if (firstError) {
      toast.error(firstError);
      return;
    }

    setSaving(true);
    const normalizedPayload = normalizeContactPayload(formData);
    const loadingToast = toast.loading("Updating contact...");

    try {
      const response = await updateContact(id, normalizedPayload);
      toast.success(response?.data?.message || "Contact updated successfully!", {
        id: loadingToast,
      });
      navigate("/contact-leads");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update contact", {
        id: loadingToast,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title="Edit Contact Lead"
        subtitle="Update the enquiry details or move it through the pipeline."
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          onBlur={() => handleBlur("name")}
          error={errors.name}
          required
        />
        <Field
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={() => handleBlur("email")}
          error={errors.email}
          required
        />
        <Field
          label="Number"
          name="number"
          value={formData.number}
          onChange={handleChange}
          onBlur={() => handleBlur("number")}
          error={errors.number}
        />
        <Field
          label="Status"
          name="status"
          as="select"
          options={STATUS_OPTIONS}
          value={formData.status}
          onChange={handleChange}
          onBlur={() => handleBlur("status")}
          error={errors.status}
        />
        <Field
          label="Message"
          name="message"
          as="textarea"
          rows={5}
          value={formData.message}
          onChange={handleChange}
          onBlur={() => handleBlur("message")}
          error={errors.message}
          full
        />

        <FormActions
          saving={saving}
          submitLabel="Update Contact"
          onCancel={() => navigate("/contact-leads")}
        />
      </form>
    </Card>
  );
};

export default EditContact;
