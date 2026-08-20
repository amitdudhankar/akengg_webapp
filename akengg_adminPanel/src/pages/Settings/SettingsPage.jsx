import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { getSettings, updateSettings } from "../../api/api";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import FormActions from "../../components/ui/FormActions";

const FIELDS = [
  "company_phone",
  "whatsapp_number",
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

const SectionTitle = ({ children }) => (
  <h2 className="md:col-span-2 mt-3 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-900">
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
    if (saving) return;
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
      <Card>
        <div className="space-y-4">
          <div className="h-7 w-48 animate-pulse rounded bg-gray-100" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                <div className="h-9 animate-pulse rounded-lg bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <PageHeader
        title="Site Settings"
        subtitle="These values feed the public website. Anything left blank falls back to the built-in copy."
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionTitle>Company Info</SectionTitle>
        <Field
          label="Phone"
          name="company_phone"
          value={formData.company_phone}
          onChange={handleChange}
          placeholder="+91 ..."
        />
        <Field
          label="WhatsApp Number"
          name="whatsapp_number"
          value={formData.whatsapp_number}
          onChange={handleChange}
          placeholder="+91 ..."
          hint="Used for the site's WhatsApp click-to-chat buttons. Falls back to the phone number above if left blank."
        />
        <Field
          label="Email"
          name="company_email"
          type="email"
          value={formData.company_email}
          onChange={handleChange}
        />
        <Field
          label="Address"
          name="company_address"
          as="textarea"
          value={formData.company_address}
          onChange={handleChange}
          full
        />
        <Field
          label="Business Hours"
          name="business_hours"
          value={formData.business_hours}
          onChange={handleChange}
          placeholder="Mon-Sat: 9 AM - 6 PM"
        />

        <SectionTitle>Social Links</SectionTitle>
        <Field
          label="LinkedIn URL"
          name="social_linkedin"
          value={formData.social_linkedin}
          onChange={handleChange}
        />
        <Field
          label="Facebook URL"
          name="social_facebook"
          value={formData.social_facebook}
          onChange={handleChange}
        />
        <Field
          label="Instagram URL"
          name="social_instagram"
          value={formData.social_instagram}
          onChange={handleChange}
        />

        <SectionTitle>Hero Section</SectionTitle>
        <Field
          label="Hero Headline"
          name="hero_headline"
          as="textarea"
          value={formData.hero_headline}
          onChange={handleChange}
          full
        />
        <Field
          label="Hero Subtext"
          name="hero_subtext"
          as="textarea"
          value={formData.hero_subtext}
          onChange={handleChange}
          full
        />

        <SectionTitle>About</SectionTitle>
        <Field
          label="Founding Year"
          name="founding_year"
          value={formData.founding_year}
          onChange={handleChange}
          placeholder="2005"
        />
        <Field
          label="About Text"
          name="about_text"
          as="textarea"
          value={formData.about_text}
          onChange={handleChange}
          full
        />

        <SectionTitle>Footer &amp; Map</SectionTitle>
        <Field
          label="Footer Description"
          name="footer_description"
          as="textarea"
          value={formData.footer_description}
          onChange={handleChange}
          full
        />
        <Field
          label="Google Maps Embed URL"
          name="map_embed_url"
          as="textarea"
          value={formData.map_embed_url}
          onChange={handleChange}
          hint="Paste the src URL from a Google Maps embed. Shown on the contact page."
          full
        />

        <FormActions saving={saving} submitLabel="Save Settings" />
      </form>
    </Card>
  );
};

export default SettingsPage;
