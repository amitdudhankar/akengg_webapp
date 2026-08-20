// Customer details panel for the lead detail page. Read-only two-column grid
// by default; an "Edit" toggle swaps the same nine fields into a Field-based
// form with Save/Cancel. Only the fields that actually changed are sent to
// onSave, so a partial edit never clobbers untouched columns server-side.
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Pencil } from "lucide-react";
import Field from "../ui/Field";
import Button from "../ui/Button";
import FormActions from "../ui/FormActions";
import { INDUSTRIES } from "../../config/leadConfig";

// Mirrors the email/phone shape checks already used by the contact-lead edit
// form (src/utils/contactValidation.js). Those helpers are tailored to that
// form's own required-field wording and aren't exported individually, so the
// same regexes are reproduced here rather than written from scratch.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

const INDUSTRY_OPTIONS = [{ value: "", label: "Select industry" }, ...INDUSTRIES];

const FIELDS = [
  { name: "contact_person", label: "Contact Person", required: true },
  { name: "company_name", label: "Company Name", required: true },
  { name: "designation", label: "Designation" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email", type: "email" },
  { name: "industry", label: "Industry", as: "select", options: INDUSTRY_OPTIONS },
  { name: "city", label: "City" },
  { name: "state", label: "State" },
  { name: "plant_location", label: "Plant Location" },
];

const buildForm = (lead) =>
  FIELDS.reduce((acc, field) => {
    acc[field.name] = lead?.[field.name] || "";
    return acc;
  }, {});

const validate = (form) => {
  const errors = {};

  if (!form.contact_person.trim()) errors.contact_person = "Contact person is required";
  if (!form.company_name.trim()) errors.company_name = "Company name is required";

  if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (form.phone.trim() && !PHONE_REGEX.test(form.phone.trim())) {
    errors.phone = "Phone must be 10 to 15 digits and may start with +";
  }

  return errors;
};

function LeadCustomerCard({ lead, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(() => buildForm(lead));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  if (!lead) return null;

  const handleEdit = () => {
    setForm(buildForm(lead));
    setErrors({});
    setIsEditing(true);
  };

  const handleCancel = () => {
    setForm(buildForm(lead));
    setErrors({});
    setIsEditing(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const nextErrors = validate(form);
    setErrors(nextErrors);
    const firstError = Object.values(nextErrors).find(Boolean);
    if (firstError) {
      toast.error(firstError);
      return;
    }

    // Diff against the last-known saved values so the PATCH body only ever
    // carries what actually changed.
    const original = buildForm(lead);
    const payload = {};
    FIELDS.forEach(({ name }) => {
      const nextValue = form[name].trim();
      if (nextValue !== original[name]) payload[name] = nextValue;
    });

    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(payload);
      setIsEditing(false);
    } catch (error) {
      // Stay in edit mode on failure so the user doesn't lose their input.
      toast.error(error?.response?.data?.message || "Failed to update customer details");
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div>
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" icon={Pencil} onClick={handleEdit}>
            Edit
          </Button>
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {FIELDS.map(({ name, label }) => (
            <div key={name} className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {label}
              </dt>
              <dd className="mt-0.5 truncate text-sm text-gray-900">
                {lead[name] || <span className="text-gray-300">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {FIELDS.map(({ name, label, required, type, as, options }) => (
        <Field
          key={name}
          label={label}
          name={name}
          type={type || "text"}
          as={as}
          options={options}
          value={form[name]}
          onChange={handleChange}
          error={errors[name]}
          required={required}
        />
      ))}
      <FormActions saving={saving} onCancel={handleCancel} />
    </form>
  );
}

export default LeadCustomerCard;
