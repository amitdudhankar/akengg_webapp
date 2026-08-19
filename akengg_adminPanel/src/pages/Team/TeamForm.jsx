import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { addTeamMember, getTeamMemberById, updateTeamMember } from "../../api/api";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import ImageField from "../../components/ui/ImageField";
import FormActions from "../../components/ui/FormActions";

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
  const [saving, setSaving] = useState(false);

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
    if (saving) return;
    setSaving(true);
    const loadingToast = toast.loading(isEdit ? "Updating member..." : "Adding member...");

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
      toast.success(isEdit ? "Team member updated!" : "Team member added!", {
        id: loadingToast,
      });
      navigate("/team");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save team member", {
        id: loadingToast,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title={isEdit ? "Update Team Member" : "Add a Team Member"}
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Full name"
          required
        />
        <Field
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g. Managing Director"
        />
        <Field
          label="Subtitle"
          name="subtitle"
          value={formData.subtitle}
          onChange={handleChange}
          placeholder="Optional secondary line"
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
          label="Description"
          name="description"
          as="textarea"
          rows={4}
          value={formData.description}
          onChange={handleChange}
          placeholder="Short bio"
          full
        />

        <ImageField
          label="Photo"
          preview={previewImage}
          onChange={handleImageChange}
          isEdit={isEdit}
        />

        <FormActions
          saving={saving}
          submitLabel={isEdit ? "Update Member" : "Add Member"}
          onCancel={() => navigate("/team")}
        />
      </form>
    </Card>
  );
};

export default TeamForm;
