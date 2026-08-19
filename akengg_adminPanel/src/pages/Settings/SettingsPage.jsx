import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { getSettings, updateSettings } from "../../api/api";

const FIELDS = [
  "company_phone",
  "company_email",
  "company_address",
  "business_hours",
  "social_linkedin",
  "social_facebook",
  "social_instagram",
  "hero_headline",
  "hero_subtext",
  "about_text",
  "founding_year",
  "map_embed_url",
  "footer_description",
];

const emptyForm = FIELDS.reduce((acc, field) => ({ ...acc, [field]: "" }), {});

const Field = ({ label, name, value, onChange, type = "text", textarea = false, placeholder }) => (
  <div className={textarea ? "md:col-span-2" : ""}>
    <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
    {textarea ? (
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={3}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 p-2"
      />
    ) : (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 p-2"
      />
    )}
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 className="md:col-span-2 mt-2 border-b pb-1 text-lg font-semibold text-gray-800">
    {children}
  </h2>
);

const SettingsPage = () => {
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getSettings();
        const data = res.data?.data || {};
        const next = { ...emptyForm };
        FIELDS.forEach((field) => {
          next[field] = data[field] ?? "";
        });
        setFormData(next);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const loadingToast = toast.loading("Saving settings...");
    try {
      await updateSettings(formData);
      toast.success("Settings saved successfully!", { id: loadingToast });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save settings", {
        id: loadingToast,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-md text-gray-500">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full rounded-lg bg-white p-4 shadow-md sm:p-6">
      <h1 className="mb-4 text-2xl font-bold text-indigo-600">Site Settings</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionTitle>Company Info</SectionTitle>
        <Field label="Phone" name="company_phone" value={formData.company_phone} onChange={handleChange} placeholder="+91 ..." />
        <Field label="Email" name="company_email" value={formData.company_email} onChange={handleChange} type="email" />
        <Field label="Address" name="company_address" value={formData.company_address} onChange={handleChange} textarea />
        <Field label="Business Hours" name="business_hours" value={formData.business_hours} onChange={handleChange} placeholder="Mon-Sat: 9 AM - 6 PM" />

        <SectionTitle>Social Links</SectionTitle>
        <Field label="LinkedIn URL" name="social_linkedin" value={formData.social_linkedin} onChange={handleChange} />
        <Field label="Facebook URL" name="social_facebook" value={formData.social_facebook} onChange={handleChange} />
        <Field label="Instagram URL" name="social_instagram" value={formData.social_instagram} onChange={handleChange} />

        <SectionTitle>Hero Section</SectionTitle>
        <Field label="Hero Headline" name="hero_headline" value={formData.hero_headline} onChange={handleChange} textarea />
        <Field label="Hero Subtext" name="hero_subtext" value={formData.hero_subtext} onChange={handleChange} textarea />

        <SectionTitle>About</SectionTitle>
        <Field label="Founding Year" name="founding_year" value={formData.founding_year} onChange={handleChange} placeholder="2005" />
        <Field label="About Text" name="about_text" value={formData.about_text} onChange={handleChange} textarea />

        <SectionTitle>Footer & Map</SectionTitle>
        <Field label="Footer Description" name="footer_description" value={formData.footer_description} onChange={handleChange} textarea />
        <Field label="Google Maps Embed URL" name="map_embed_url" value={formData.map_embed_url} onChange={handleChange} textarea />

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 disabled:opacity-60 sm:w-[200px]"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
