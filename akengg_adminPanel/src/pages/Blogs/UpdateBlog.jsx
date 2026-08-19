import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getBlogById, updateBlog } from "../../api/api";
import BlogEditor from "./BlogEditor";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import ImageField from "../../components/ui/ImageField";
import FormActions from "../../components/ui/FormActions";

const UpdateBlog = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    descrip: "",
    content: "",
    image: null,
  });

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const res = await getBlogById(id);
        const blog = res.data?.data;

        if (blog) {
          setFormData({
            title: blog.title || "",
            descrip: blog.descrip || "",
            content: blog.content || "",
            image: null,
          });
          setPreviewImage(blog.image);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to fetch blog data");
      } finally {
        setLoaded(true);
      }
    };

    fetchBlog();
  }, [id]);

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
    const loadingToast = toast.loading("Updating blog...");

    const formPayload = new FormData();
    formPayload.append("title", formData.title);
    formPayload.append("descrip", formData.descrip);
    formPayload.append("content", formData.content);
    // Only send the image when a NEW one was picked. Appending a null here
    // posted the literal string "null" and clobbered the existing image.
    if (formData.image) formPayload.append("image", formData.image);

    try {
      await updateBlog(id, formPayload);
      toast.success("Blog updated successfully!", { id: loadingToast });
      navigate("/blogs");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update blog", {
        id: loadingToast,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title="Update Blog"
        subtitle="Changes go live on the website as soon as you save."
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
          isEdit
        />

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Content</label>
          {/* Mounted only once the blog has loaded, so the editor is seeded with
              the existing content rather than an empty document. */}
          {loaded ? (
            <BlogEditor
              value={formData.content}
              onChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
            />
          ) : (
            <div className="h-[400px] animate-pulse rounded-lg border border-gray-100 bg-gray-50" />
          )}
        </div>

        <FormActions
          saving={saving}
          submitLabel="Update Blog"
          onCancel={() => navigate("/blogs")}
        />
      </form>
    </Card>
  );
};

export default UpdateBlog;
