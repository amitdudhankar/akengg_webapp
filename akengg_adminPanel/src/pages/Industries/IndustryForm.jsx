import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { createIndustry, getIndustryById, updateIndustry } from "../../api/api";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import ImageField from "../../components/ui/ImageField";
import FormActions from "../../components/ui/FormActions";

const EMPTY = {
  name: "",
  slug: "",
  sort_order: 0,
  is_published: "1",
  hero_heading: "",
  hero_subheading: "",
  meta_title: "",
  meta_description: "",
  overview: "",
  challenges: "",
  solutions: "",
  applications: "",
  related_products: "",
  image: null,
};

const PUBLISHED_OPTIONS = [
  { value: "1", label: "Published" },
  { value: "0", label: "Draft" },
];

// The list-ish columns come back from the API as real arrays but are edited as
// plain textareas — one item per line — and posted back as the raw text. The
// backend accepts an array, a JSON string or newline/comma separated text.
const toLines = (value) => {
  if (Array.isArray(value)) return value.join("\n");
  return value ?? "";
};

const LIST_HINT = "One item per line.";

const SectionTitle = ({ children }) => (
  <h2 className="md:col-span-2 mt-2 border-b pb-1 text-lg font-semibold text-gray-800">
    {children}
  </h2>
);

const IndustryForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState(null);
  const [formData, setFormData] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        const res = await getIndustryById(id);
        const industry = res.data?.data;
        if (industry) {
          setFormData({
            name: industry.name || "",
            slug: industry.slug || "",
            sort_order: industry.sort_order ?? 0,
            is_published: String(industry.is_published ?? 1),
            hero_heading: industry.hero_heading || "",
            hero_subheading: industry.hero_subheading || "",
            meta_title: industry.meta_title || "",
            meta_description: industry.meta_description || "",
            overview: toLines(industry.overview),
            challenges: toLines(industry.challenges),
            solutions: toLines(industry.solutions),
            applications: toLines(industry.applications),
            related_products: toLines(industry.related_products),
            image: null,
          });
          setPreviewImage(industry.image || null);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load industry");
      }
    };

    load();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: "" }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setFormData({ ...formData, image: file });
    if (file) setPreviewImage(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!formData.name.trim()) {
      setErrors({ name: "Name is required." });
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading(isEdit ? "Updating industry..." : "Creating industry...");

    const payload = new FormData();
    payload.append("name", formData.name);
    payload.append("slug", formData.slug);
    payload.append("sort_order", formData.sort_order);
    payload.append("is_published", formData.is_published);
    payload.append("hero_heading", formData.hero_heading);
    payload.append("hero_subheading", formData.hero_subheading);
    payload.append("meta_title", formData.meta_title);
    payload.append("meta_description", formData.meta_description);
    payload.append("overview", formData.overview);
    payload.append("challenges", formData.challenges);
    payload.append("solutions", formData.solutions);
    payload.append("applications", formData.applications);
    payload.append("related_products", formData.related_products);
    if (formData.image) payload.append("image", formData.image);

    try {
      if (isEdit) {
        await updateIndustry(id, payload);
      } else {
        await createIndustry(payload);
      }
      toast.success(isEdit ? "Industry updated successfully!" : "Industry created successfully!", {
        id: loadingToast,
      });
      navigate("/industries");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save industry", {
        id: loadingToast,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title={isEdit ? "Update Industry" : "Add an Industry"}
        subtitle="Drives an industry landing page on the website."
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionTitle>Basics</SectionTitle>
        <Field
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Industry name"
          error={errors.name}
          required
        />
        <Field
          label="Slug"
          name="slug"
          value={formData.slug}
          onChange={handleChange}
          placeholder="url-friendly-name"
          hint="Leave blank to generate it from the name."
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
          label="Published"
          name="is_published"
          as="select"
          options={PUBLISHED_OPTIONS}
          value={formData.is_published}
          onChange={handleChange}
          hint="Drafts stay hidden from the website."
        />

        <SectionTitle>Hero</SectionTitle>
        <Field
          label="Hero Heading"
          name="hero_heading"
          value={formData.hero_heading}
          onChange={handleChange}
          placeholder="Headline shown at the top of the page"
        />
        <Field
          label="Hero Subheading"
          name="hero_subheading"
          value={formData.hero_subheading}
          onChange={handleChange}
          placeholder="Supporting line under the headline"
        />

        <SectionTitle>Page content</SectionTitle>
        <Field
          label="Overview"
          name="overview"
          as="textarea"
          rows={5}
          value={formData.overview}
          onChange={handleChange}
          placeholder="One paragraph per line"
          hint={LIST_HINT}
          full
        />
        <Field
          label="Challenges"
          name="challenges"
          as="textarea"
          rows={4}
          value={formData.challenges}
          onChange={handleChange}
          placeholder="One challenge per line"
          hint={LIST_HINT}
          full
        />
        <Field
          label="Solutions"
          name="solutions"
          as="textarea"
          rows={4}
          value={formData.solutions}
          onChange={handleChange}
          placeholder="One solution per line"
          hint={LIST_HINT}
          full
        />
        <Field
          label="Applications"
          name="applications"
          as="textarea"
          rows={4}
          value={formData.applications}
          onChange={handleChange}
          placeholder="One application per line"
          hint={LIST_HINT}
          full
        />
        <Field
          label="Related Products"
          name="related_products"
          as="textarea"
          rows={4}
          value={formData.related_products}
          onChange={handleChange}
          placeholder="One product per line"
          hint={LIST_HINT}
          full
        />

        <SectionTitle>SEO</SectionTitle>
        <Field
          label="Meta Title"
          name="meta_title"
          value={formData.meta_title}
          onChange={handleChange}
          placeholder="Title shown in search results"
        />
        <Field
          label="Meta Description"
          name="meta_description"
          as="textarea"
          rows={2}
          value={formData.meta_description}
          onChange={handleChange}
          placeholder="Summary shown in search results"
        />

        <SectionTitle>Hero image</SectionTitle>
        <ImageField preview={previewImage} onChange={handleImageChange} isEdit={isEdit} />

        <FormActions
          saving={saving}
          submitLabel={isEdit ? "Update Industry" : "Create Industry"}
          onCancel={() => navigate("/industries")}
        />
      </form>
    </Card>
  );
};

export default IndustryForm;
