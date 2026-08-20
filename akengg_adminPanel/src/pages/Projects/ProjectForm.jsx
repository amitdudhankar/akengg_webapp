import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  addProject,
  fetchIndustries,
  getProjectById,
  updateProject,
} from "../../api/api";
import { toDateInputValue } from "../../utils/date";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import ImageField from "../../components/ui/ImageField";
import FormActions from "../../components/ui/FormActions";
import ProjectGallery from "../../components/projects/ProjectGallery";

const EMPTY = {
  // Basics
  title: "",
  slug: "",
  industry: "",
  industry_id: "",
  location: "",
  completed_on: "",
  client_name: "",
  show_client_name: false,
  sort_order: 0,
  is_published: "1",
  // Summary
  description: "",
  features: "",
  equipment: "",
  capacity: "",
  // Narrative
  customer_requirement: "",
  problem: "",
  solution: "",
  result: "",
  // Scope of work
  scope_engineering: "",
  scope_fabrication: "",
  scope_installation: "",
  scope_commissioning: "",
  // SEO
  meta_title: "",
  meta_description: "",
  related_service_slug: "",
  // Cover image
  image: null,
};

// Every text field posted as-is. The cover image is appended separately and
// only when a new file was picked, so an update without a new file keeps the
// stored one.
const TEXT_FIELDS = Object.keys(EMPTY).filter(
  (key) => key !== "image" && key !== "show_client_name"
);

const PUBLISHED_OPTIONS = [
  { value: "1", label: "Published" },
  { value: "0", label: "Draft" },
];

// The eight service pages that exist on the website. A case study can point at
// one of them so the page can cross-link back to the service.
const SERVICE_SLUGS = [
  "ibr-steam-boiler",
  "non-ibr-steam-boiler",
  "industrial-steam-boiler",
  "thermic-fluid-heater",
  "hot-water-generator",
  "industrial-piping",
  "industrial-fabrication",
  "pollution-control-equipment",
];

const SERVICE_SLUG_OPTIONS = [
  { value: "", label: "None" },
  ...SERVICE_SLUGS.map((slug) => ({ value: slug, label: slug })),
];

// `industry` is overloaded on the single-project response: it is the legacy
// free-text label on older rows, but the API also describes a nested
// { id, slug, name } object once a row is linked to an industry page. Accept
// either rather than rendering "[object Object]" into the text input.
const legacyIndustryLabel = (project) => {
  const value = project?.industry;
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.name || "";
  return "";
};

const SectionTitle = ({ children }) => (
  <h2 className="md:col-span-2 mt-2 border-b pb-1 text-lg font-semibold text-gray-800">
    {children}
  </h2>
);

const ProjectForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState(null);
  const [formData, setFormData] = useState(EMPTY);
  const [industries, setIndustries] = useState([]);
  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);

  // status=all so a draft industry page can still be linked from here.
  useEffect(() => {
    fetchIndustries({ status: "all" })
      .then((res) => setIndustries(res?.data?.data || []))
      // Non-critical: without it the dropdown is simply empty, and a toast on
      // every visit would be noise.
      .catch(() => setIndustries([]));
  }, []);

  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        const res = await getProjectById(id);
        const project = res.data?.data;
        if (project) {
          setFormData({
            title: project.title || "",
            slug: project.slug || "",
            industry: legacyIndustryLabel(project),
            industry_id: String(project.industry_id ?? project.industry?.id ?? ""),
            location: project.location || "",
            completed_on: toDateInputValue(project.completed_on),
            client_name: project.client_name || "",
            show_client_name: Boolean(Number(project.show_client_name)),
            sort_order: project.sort_order ?? 0,
            is_published: String(project.is_published ?? 1),
            description: project.description || "",
            features: Array.isArray(project.features) ? project.features.join("\n") : "",
            equipment: Array.isArray(project.equipment) ? project.equipment.join("\n") : "",
            capacity: project.capacity || "",
            customer_requirement: project.customer_requirement || "",
            problem: project.problem || "",
            solution: project.solution || "",
            result: project.result || "",
            scope_engineering: project.scope_engineering || "",
            scope_fabrication: project.scope_fabrication || "",
            scope_installation: project.scope_installation || "",
            scope_commissioning: project.scope_commissioning || "",
            meta_title: project.meta_title || "",
            meta_description: project.meta_description || "",
            related_service_slug: project.related_service_slug || "",
            image: null,
          });
          setImages(Array.isArray(project.images) ? project.images : []);
          setPreviewImage(project.image || null);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load project");
      }
    };

    load();
  }, [id, isEdit]);

  // Re-read ONLY the gallery after an upload/delete. Reloading the whole
  // project here would throw away whatever the editor has typed but not saved.
  const refreshImages = useCallback(async () => {
    if (!isEdit) return;
    try {
      const res = await getProjectById(id);
      const next = res.data?.data?.images;
      setImages(Array.isArray(next) ? next : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to refresh the gallery");
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
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
    TEXT_FIELDS.forEach((key) => payload.append(key, formData[key]));
    payload.append("show_client_name", formData.show_client_name ? 1 : 0);
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

  const industryOptions = [
    { value: "", label: "Not linked" },
    ...industries.map((industry) => ({
      value: String(industry.id),
      label: industry.name,
    })),
  ];

  return (
    <Card>
      <PageHeader
        title={isEdit ? "Update Project" : "Add a Project"}
        subtitle="Shown on the website projects page and as a full case study."
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionTitle>Basics</SectionTitle>
        <Field
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Project title"
          required
        />
        <Field
          label="Slug"
          name="slug"
          value={formData.slug}
          onChange={handleChange}
          placeholder="url-friendly-title"
          hint="Leave blank to generate it from the title."
        />
        <Field
          label="Industry page"
          name="industry_id"
          as="select"
          options={industryOptions}
          value={formData.industry_id}
          onChange={handleChange}
          hint="Links this case study to an industry page."
        />
        <Field
          label="Industry label (legacy)"
          name="industry"
          value={formData.industry}
          onChange={handleChange}
          placeholder="Industry name"
          hint="Free text still printed on the current project cards. The dropdown above is what links the case study to an industry page."
        />
        <Field
          label="Location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="City, state"
        />
        <Field
          label="Completed On"
          name="completed_on"
          type="date"
          value={formData.completed_on}
          onChange={handleChange}
          hint="Date the project was handed over."
        />
        <Field
          label="Client Name"
          name="client_name"
          value={formData.client_name}
          onChange={handleChange}
          placeholder="Customer or site name"
        />
        <div className="flex items-end">
          <label
            htmlFor="show_client_name"
            className="inline-flex w-full cursor-pointer items-start gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
          >
            <input
              id="show_client_name"
              name="show_client_name"
              type="checkbox"
              checked={formData.show_client_name}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              Show client name publicly
              <span className="mt-0.5 block text-xs text-gray-500">
                Only tick this once the customer has given permission to be named.
              </span>
            </span>
          </label>
        </div>
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

        <SectionTitle>Summary</SectionTitle>
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
          label="Equipment"
          name="equipment"
          as="textarea"
          rows={4}
          value={formData.equipment}
          onChange={handleChange}
          placeholder="One item of equipment per line"
          hint="Enter one item per line."
          full
        />
        <Field
          label="Capacity"
          name="capacity"
          value={formData.capacity}
          onChange={handleChange}
          placeholder="e.g. 2 TPH"
        />

        <SectionTitle>Case study narrative</SectionTitle>
        <Field
          label="Customer Requirement"
          name="customer_requirement"
          as="textarea"
          rows={5}
          value={formData.customer_requirement}
          onChange={handleChange}
          placeholder="Describe what the customer needed"
          full
        />
        <Field
          label="Problem"
          name="problem"
          as="textarea"
          rows={5}
          value={formData.problem}
          onChange={handleChange}
          placeholder="Describe the constraints or issues to solve"
          full
        />
        <Field
          label="Solution"
          name="solution"
          as="textarea"
          rows={5}
          value={formData.solution}
          onChange={handleChange}
          placeholder="Describe what was designed and delivered"
          full
        />
        <Field
          label="Result"
          name="result"
          as="textarea"
          rows={5}
          value={formData.result}
          onChange={handleChange}
          placeholder="Describe the outcome for the customer"
          full
        />

        <SectionTitle>Scope of work</SectionTitle>
        <Field
          label="Engineering"
          name="scope_engineering"
          as="textarea"
          rows={3}
          value={formData.scope_engineering}
          onChange={handleChange}
          placeholder="Design and engineering work carried out"
        />
        <Field
          label="Fabrication"
          name="scope_fabrication"
          as="textarea"
          rows={3}
          value={formData.scope_fabrication}
          onChange={handleChange}
          placeholder="Fabrication work carried out"
        />
        <Field
          label="Installation"
          name="scope_installation"
          as="textarea"
          rows={3}
          value={formData.scope_installation}
          onChange={handleChange}
          placeholder="Installation work carried out"
        />
        <Field
          label="Commissioning"
          name="scope_commissioning"
          as="textarea"
          rows={3}
          value={formData.scope_commissioning}
          onChange={handleChange}
          placeholder="Commissioning and handover work carried out"
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
          label="Related Service"
          name="related_service_slug"
          as="select"
          options={SERVICE_SLUG_OPTIONS}
          value={formData.related_service_slug}
          onChange={handleChange}
          hint="Service page this case study links back to."
        />
        <Field
          label="Meta Description"
          name="meta_description"
          as="textarea"
          rows={2}
          value={formData.meta_description}
          onChange={handleChange}
          placeholder="Summary shown in search results"
          full
        />

        <SectionTitle>Cover image</SectionTitle>
        <ImageField preview={previewImage} onChange={handleImageChange} isEdit={isEdit} />

        <FormActions
          saving={saving}
          submitLabel={isEdit ? "Update Project" : "Create Project"}
          onCancel={() => navigate("/projects")}
        />
      </form>

      {/* Outside the <form> on purpose: the gallery has its own inputs and its
          own submit button, and nesting them would make Enter save the project. */}
      <div className="mt-8">
        <SectionTitle>Gallery</SectionTitle>
        {isEdit ? (
          <div className="mt-4">
            <ProjectGallery projectId={id} images={images} onChanged={refreshImages} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            Save the project first — gallery images can be added once it exists.
          </p>
        )}
      </div>
    </Card>
  );
};

export default ProjectForm;
