import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { addBlog } from "../../api/api";
import BlogEditor from "./BlogEditor";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import ImageField from "../../components/ui/ImageField";
import FormActions from "../../components/ui/FormActions";

const AddBlog = () => {
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    descrip: "",
    content: "",
    image: null,
  });

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

    if (!formData.image) {
      toast.error("A featured image is required.");
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading("Submitting blog...");

    const formPayload = new FormData();
    formPayload.append("title", formData.title);
    formPayload.append("descrip", formData.descrip);
    formPayload.append("content", formData.content);
    formPayload.append("image", formData.image);

    try {
      await addBlog(formPayload);
      toast.success("Blog added successfully!", { id: loadingToast });
      navigate("/blogs");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit blog", {
        id: loadingToast,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title="Write a Blog"
        subtitle="Published to the website as soon as you save."
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter blog title"
          required
        />
        <Field
          label="Description"
          name="descrip"
          as="textarea"
          rows={2}
          value={formData.descrip}
          onChange={handleChange}
          placeholder="Short description shown on the blog card"
          required
        />

        <ImageField
          label="Featured Image"
          preview={previewImage}
          onChange={handleImageChange}
        />

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Content</label>
          <BlogEditor
            value={formData.content}
            onChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
          />
        </div>

        <FormActions
          saving={saving}
          submitLabel="Publish Blog"
          onCancel={() => navigate("/blogs")}
        />
      </form>
    </Card>
  );
};

export default AddBlog;
