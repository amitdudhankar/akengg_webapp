import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { addParty, getPartyById, updateParty } from "../../api/api";
import { GST_STATES } from "../../config/docConfig";
import { isValidGstin, gstinStateCode } from "../../utils/gstin";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import FormActions from "../../components/ui/FormActions";

const EMPTY = {
  party_type: "client",
  name: "",
  gstin: "",
  party_is_registered: false,
  pan: "",
  email: "",
  phone: "",
  // billing
  billing_address_line1: "",
  billing_address_line2: "",
  billing_city: "",
  billing_state: "",
  billing_state_code: "",
  billing_pincode: "",
  billing_country: "India",
  // shipping
  shipping_address_line1: "",
  shipping_address_line2: "",
  shipping_city: "",
  shipping_state: "",
  shipping_state_code: "",
  shipping_pincode: "",
  shipping_country: "India",
  is_active: true,
};

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";

const Field = ({ label, name, value, onChange, type = "text", placeholder }) => (
  <div>
    <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={inputCls}
    />
  </div>
);

const StateSelect = ({ label, codeName, nameName, codeValue, onPick }) => (
  <div>
    <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
    <select
      value={codeValue || ""}
      onChange={(e) => {
        const code = e.target.value;
        const match = GST_STATES.find((s) => s.code === code);
        onPick({ [codeName]: code, [nameName]: match ? match.name : "" });
      }}
      className={inputCls}
    >
      <option value="">Select state...</option>
      {GST_STATES.map((s) => (
        <option key={s.code} value={s.code}>
          {s.code} — {s.name}
        </option>
      ))}
    </select>
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 className="md:col-span-2 mt-3 flex items-center gap-2.5 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-900">
    {children}
  </h2>
);

const PartyForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [formData, setFormData] = useState(EMPTY);
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        const res = await getPartyById(id);
        const party = res.data?.data;
        if (party) {
          const next = { ...EMPTY };
          Object.keys(EMPTY).forEach((key) => {
            if (key === "party_is_registered" || key === "is_active") {
              next[key] = Boolean(Number(party[key]));
            } else {
              next[key] = party[key] ?? EMPTY[key] ?? "";
            }
          });
          setFormData(next);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load party");
      }
    };

    load();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const patch = (obj) => setFormData((prev) => ({ ...prev, ...obj }));

  // Advisory GSTIN feedback (the server is authoritative on save + finalize).
  const gstinTrimmed = (formData.gstin || "").trim().toUpperCase();
  const gstinValid = !gstinTrimmed || isValidGstin(gstinTrimmed);
  const gstinStateMismatch =
    gstinValid &&
    gstinTrimmed &&
    formData.billing_state_code &&
    gstinStateCode(gstinTrimmed) !== formData.billing_state_code;

  const handleSameAsBilling = (checked) => {
    setSameAsBilling(checked);
    if (checked) {
      patch({
        shipping_address_line1: formData.billing_address_line1,
        shipping_address_line2: formData.billing_address_line2,
        shipping_city: formData.billing_city,
        shipping_state: formData.billing_state,
        shipping_state_code: formData.billing_state_code,
        shipping_pincode: formData.billing_pincode,
        shipping_country: formData.billing_country,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (gstinTrimmed && !gstinValid) {
      toast.error("Enter a valid GSTIN, or clear the field.");
      return;
    }
    setSaving(true);
    const loadingToast = toast.loading(isEdit ? "Updating party..." : "Creating party...");

    const payload = {
      ...formData,
      party_is_registered: formData.party_is_registered ? 1 : 0,
      is_active: formData.is_active ? 1 : 0,
    };

    try {
      if (isEdit) {
        await updateParty(id, payload);
      } else {
        await addParty(payload);
      }
      toast.success(isEdit ? "Party updated successfully!" : "Party created successfully!", {
        id: loadingToast,
      });
      navigate("/parties");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save party", {
        id: loadingToast,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title={isEdit ? "Update Party" : "Add a Party"}
        subtitle="Clients and vendors you raise documents against."
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionTitle>Details</SectionTitle>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Party Type</label>
          <select
            name="party_type"
            value={formData.party_type}
            onChange={handleChange}
            className={inputCls}
          >
            <option value="client">Client</option>
            <option value="vendor">Vendor</option>
          </select>
        </div>

        <Field
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Party / company name"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">GSTIN</label>
          <input
            type="text"
            name="gstin"
            value={formData.gstin}
            onChange={handleChange}
            placeholder="15-digit GSTIN"
            className={`${inputCls} ${gstinTrimmed && !gstinValid ? "border-red-400" : ""}`}
          />
          {gstinTrimmed && !gstinValid ? (
            <p className="mt-1 text-sm text-red-600">
              Invalid GSTIN (format or checksum).
            </p>
          ) : gstinStateMismatch ? (
            <p className="mt-1 text-sm text-amber-600">
              GSTIN state code ({gstinStateCode(gstinTrimmed)}) differs from the
              billing state code ({formData.billing_state_code}).
            </p>
          ) : null}
        </div>
        <Field label="PAN" name="pan" value={formData.pan} onChange={handleChange} placeholder="10-char PAN" />
        <Field label="Email" name="email" value={formData.email} onChange={handleChange} type="email" />
        <Field label="Phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 ..." />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="party_is_registered"
            name="party_is_registered"
            checked={formData.party_is_registered}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="party_is_registered" className="text-sm font-medium text-gray-700">
            GST Registered (B2B)
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            Active
          </label>
        </div>

        <SectionTitle>Billing Address</SectionTitle>
        <Field label="Address Line 1" name="billing_address_line1" value={formData.billing_address_line1} onChange={handleChange} />
        <Field label="Address Line 2" name="billing_address_line2" value={formData.billing_address_line2} onChange={handleChange} />
        <Field label="City" name="billing_city" value={formData.billing_city} onChange={handleChange} />
        <StateSelect
          label="State"
          codeName="billing_state_code"
          nameName="billing_state"
          codeValue={formData.billing_state_code}
          onPick={patch}
        />
        <Field label="State Code" name="billing_state_code" value={formData.billing_state_code} onChange={handleChange} placeholder="e.g. 27" />
        <Field label="Pincode" name="billing_pincode" value={formData.billing_pincode} onChange={handleChange} />
        <Field label="Country" name="billing_country" value={formData.billing_country} onChange={handleChange} />

        <SectionTitle>Shipping Address</SectionTitle>
        <div className="md:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="sameAsBilling"
            checked={sameAsBilling}
            onChange={(e) => handleSameAsBilling(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="sameAsBilling" className="text-sm font-medium text-gray-700">
            Same as billing address
          </label>
        </div>
        <Field label="Address Line 1" name="shipping_address_line1" value={formData.shipping_address_line1} onChange={handleChange} />
        <Field label="Address Line 2" name="shipping_address_line2" value={formData.shipping_address_line2} onChange={handleChange} />
        <Field label="City" name="shipping_city" value={formData.shipping_city} onChange={handleChange} />
        <StateSelect
          label="State"
          codeName="shipping_state_code"
          nameName="shipping_state"
          codeValue={formData.shipping_state_code}
          onPick={patch}
        />
        <Field label="State Code" name="shipping_state_code" value={formData.shipping_state_code} onChange={handleChange} placeholder="e.g. 27" />
        <Field label="Pincode" name="shipping_pincode" value={formData.shipping_pincode} onChange={handleChange} />
        <Field label="Country" name="shipping_country" value={formData.shipping_country} onChange={handleChange} />

        <FormActions
          saving={saving}
          submitLabel={isEdit ? "Update Party" : "Create Party"}
          onCancel={() => navigate("/parties")}
        />
      </form>
    </Card>
  );
};

export default PartyForm;
