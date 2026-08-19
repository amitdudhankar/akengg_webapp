import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { addProject, getProjectById, updateProject } from "../../api/api";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import ImageField from "../../components/ui/ImageField";
import FormActions from "../../components/ui/FormActions";

const EMPTY = {
  title: "",
  industry: "",
  description: "",
  features: "",
  sort_order: 0,
  image: null,
};

const ProjectForm = () => {
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
        const res = await getProjectById(id);
        const project = res.data?.data;
        if (project) {
          setFormData({
            title: project.title || "",
            industry: project.industry || "",
            description: project.description || "",
            features: Array.isArray(project.features) ? project.features.join("\n") : "",
            sort_order: project.sort_order ?? 0,
            image: null,
          });
          setPreviewImage(project.image || null);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load project");
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
    const loadingToast = toast.loading(isEdit ? "Updating project..." : "Creating project...");

    const payload = new FormData();
    payload.append("title", formData.title);
    payload.append("industry", formData.industry);
    payload.append("description", formData.description);
    payload.append("features", formData.features);
    payload.append("sort_order", formData.sort_order);
    if (formData.image) payload.append("image", formData.image);

    try {
      if (isEdit) {
        await updateProject(id, payload);
      } else {
        await addProject(payload);
      }
      toast.success(isEdit ? "Project updated successfully!" : "Project created successfully!", {
        id: loadingToast,
      });
      navigate("/projects");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save project", {
        id: loadingToast,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title={isEdit ? "Update Project" : "Add a Project"}
        subtitle="Shown on the website projects page."
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Project title"
          required
        />
        <Field
          label="Industry"
          name="industry"
          value={formData.industry}
          onChange={handleChange}
          placeholder="e.g. Pharmaceutical"
        />
        <Field
          label="Description"
          name="description"
          as="textarea"
          value={formData.description}
          onChange={handleChange}
          placeholder="What the project involved"
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
          label="Sort Order"
          name="sort_order"
          type="number"
          value={formData.sort_order}
          onChange={handleChange}
          hint="Lower numbers appear first."
        />

        <ImageField preview={previewImage} onChange={handleImageChange} isEdit={isEdit} />

        <FormActions
          saving={saving}
          submitLabel={isEdit ? "Update Project" : "Create Project"}
          onCancel={() => navigate("/projects")}
        />
      </form>
    </Card>
  );
};

export default ProjectForm;
