import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  getSellerProfile,
  updateSellerProfile,
  uploadSellerLogo,
  uploadSellerSignature,
} from "../../api/api";
import { isValidGstin } from "../../utils/gstin";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import FormActions from "../../components/ui/FormActions";

// Shared control styling, matching components/ui/Field.
const CONTROL =
  "w-full rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";

const FIELDS = [
  // Company
  "legal_name",
  "trade_name",
  "email",
  "phone",
  // Tax IDs
  "gstin",
  "pan",
  "cin",
  // Address
  "address_line1",
  "address_line2",
  "city",
  "state",
  "state_code",
  "pincode",
  "country",
  // Bank
  "bank_name",
  "bank_account_name",
  "bank_account_no",
  "bank_ifsc",
  "bank_branch",
  "upi_id",
  // Signatory (printed in the document signature block)
  "signatory_name",
  "signatory_designation",
  // Defaults
  "default_terms",
  "default_declaration",
  "rounding_mode",
  "enable_rcm",
  "default_currency",
];

const emptyForm = FIELDS.reduce(
  (acc, field) => ({ ...acc, [field]: "" }),
  { enable_rcm: false, rounding_mode: "nearest", country: "India", default_currency: "INR" }
);

const ROUNDING_MODES = ["nearest", "up", "down", "none"];

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
        className={CONTROL}
      />
    ) : (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={CONTROL}
      />
    )}
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 className="md:col-span-2 mt-2 border-b pb-1 text-lg font-semibold text-gray-800">
    {children}
  </h2>
);

const SellerProfilePage = () => {
  const [formData, setFormData] = useState(emptyForm);
  const [logoUrl, setLogoUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const logoInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  const applyData = (data) => {
    const next = { ...emptyForm };
    FIELDS.forEach((field) => {
      if (field === "enable_rcm") {
        next[field] = Boolean(Number(data[field]));
      } else {
        next[field] = data[field] ?? emptyForm[field] ?? "";
      }
    });
    setFormData(next);
    setLogoUrl(data.logo ?? data.logo_url ?? data.logo_key ?? "");
    setSignatureUrl(data.signature ?? data.signature_url ?? data.signature_key ?? "");
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getSellerProfile();
        const data = res.data?.data || {};
        applyData(data);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load seller profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  // Advisory seller GSTIN feedback (server validates on save + at finalize).
  const sellerGstin = (formData.gstin || "").trim().toUpperCase();
  const sellerGstinValid = !sellerGstin || isValidGstin(sellerGstin);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const loadingToast = toast.loading("Saving seller profile...");
    try {
      const payload = { ...formData, enable_rcm: formData.enable_rcm ? 1 : 0 };
      const res = await updateSellerProfile(payload);
      const data = res.data?.data;
      if (data) applyData(data);
      toast.success("Seller profile saved successfully!", { id: loadingToast });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save seller profile", {
        id: loadingToast,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const loadingToast = toast.loading("Uploading logo...");
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await uploadSellerLogo(fd);
      const data = res.data?.data || {};
      setLogoUrl(data.logo ?? data.logo_url ?? data.logo_key ?? logoUrl);
      toast.success("Logo uploaded successfully!", { id: loadingToast });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to upload logo", {
        id: loadingToast,
      });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSignature(true);
    const loadingToast = toast.loading("Uploading signature...");
    try {
      const fd = new FormData();
      fd.append("signature", file);
      const res = await uploadSellerSignature(fd);
      const data = res.data?.data || {};
      setSignatureUrl(data.signature ?? data.signature_url ?? data.signature_key ?? signatureUrl);
      toast.success("Signature uploaded successfully!", { id: loadingToast });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to upload signature", {
        id: loadingToast,
      });
    } finally {
      setUploadingSignature(false);
      if (signatureInputRef.current) signatureInputRef.current.value = "";
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
        title="Seller Profile"
        subtitle="Your company details as they appear on every quotation and invoice."
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionTitle>Company</SectionTitle>
        <Field label="Legal Name" name="legal_name" value={formData.legal_name} onChange={handleChange} placeholder="Registered legal name" />
        <Field label="Trade Name" name="trade_name" value={formData.trade_name} onChange={handleChange} placeholder="Brand / trade name" />
        <Field label="Email" name="email" value={formData.email} onChange={handleChange} type="email" />
        <Field label="Phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 ..." />

        <SectionTitle>Tax IDs</SectionTitle>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">GSTIN</label>
          <input
            type="text"
            name="gstin"
            value={formData.gstin}
            onChange={handleChange}
            placeholder="15-digit GSTIN"
            className={`w-full rounded-md border p-2 ${
              sellerGstin && !sellerGstinValid
                ? "border-red-400"
                : "border-gray-300"
            }`}
          />
          {sellerGstin && !sellerGstinValid ? (
            <p className="mt-1 text-sm text-red-600">
              Invalid GSTIN (format or checksum).
            </p>
          ) : null}
        </div>
        <Field label="PAN" name="pan" value={formData.pan} onChange={handleChange} placeholder="10-char PAN" />
        <Field label="CIN" name="cin" value={formData.cin} onChange={handleChange} placeholder="Optional" />

        <SectionTitle>Address</SectionTitle>
        <Field label="Address Line 1" name="address_line1" value={formData.address_line1} onChange={handleChange} />
        <Field label="Address Line 2" name="address_line2" value={formData.address_line2} onChange={handleChange} />
        <Field label="City" name="city" value={formData.city} onChange={handleChange} />
        <Field label="State" name="state" value={formData.state} onChange={handleChange} />
        <Field label="State Code" name="state_code" value={formData.state_code} onChange={handleChange} placeholder="e.g. 27" />
        <Field label="Pincode" name="pincode" value={formData.pincode} onChange={handleChange} />
        <Field label="Country" name="country" value={formData.country} onChange={handleChange} />

        <SectionTitle>Bank</SectionTitle>
        <Field label="Bank Name" name="bank_name" value={formData.bank_name} onChange={handleChange} />
        <Field label="Account Name" name="bank_account_name" value={formData.bank_account_name} onChange={handleChange} />
        <Field label="Account Number" name="bank_account_no" value={formData.bank_account_no} onChange={handleChange} />
        <Field label="IFSC" name="bank_ifsc" value={formData.bank_ifsc} onChange={handleChange} />
        <Field label="Branch" name="bank_branch" value={formData.bank_branch} onChange={handleChange} />
        <Field label="UPI ID" name="upi_id" value={formData.upi_id} onChange={handleChange} />

        <SectionTitle>Signatory</SectionTitle>
        <Field
          label="Signatory Name"
          name="signatory_name"
          value={formData.signatory_name}
          onChange={handleChange}
          placeholder="Printed below the signature space on documents"
        />
        <Field
          label="Designation"
          name="signatory_designation"
          value={formData.signatory_designation}
          onChange={handleChange}
          placeholder="Optional — e.g. Proprietor"
        />

        <SectionTitle>Defaults</SectionTitle>
        <Field label="Default Terms" name="default_terms" value={formData.default_terms} onChange={handleChange} textarea />
        <Field label="Default Declaration" name="default_declaration" value={formData.default_declaration} onChange={handleChange} textarea />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Rounding Mode</label>
          <select
            name="rounding_mode"
            value={formData.rounding_mode}
            onChange={handleChange}
            className={CONTROL}
          >
            {ROUNDING_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>
        <Field label="Default Currency" name="default_currency" value={formData.default_currency} onChange={handleChange} placeholder="INR" />
        <div className="md:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="enable_rcm"
            name="enable_rcm"
            checked={formData.enable_rcm}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="enable_rcm" className="text-sm font-medium text-gray-700">
            Enable Reverse Charge (RCM)
          </label>
        </div>

        <SectionTitle>Branding</SectionTitle>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Logo</label>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Seller logo"
              className="mb-2 h-24 w-auto rounded-md border border-gray-200 object-contain p-1"
            />
          ) : (
            <p className="mb-2 text-sm text-gray-400">No logo uploaded</p>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            disabled={uploadingLogo}
            className="w-full text-sm text-gray-700 file:mr-2 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-white hover:file:bg-indigo-700 disabled:opacity-60"
          />
          {uploadingLogo && <p className="mt-1 text-sm text-gray-500">Uploading...</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Signature</label>
          {signatureUrl ? (
            <img
              src={signatureUrl}
              alt="Seller signature"
              className="mb-2 h-24 w-auto rounded-md border border-gray-200 object-contain p-1"
            />
          ) : (
            <p className="mb-2 text-sm text-gray-400">No signature uploaded</p>
          )}
          <input
            ref={signatureInputRef}
            type="file"
            accept="image/*"
            onChange={handleSignatureUpload}
            disabled={uploadingSignature}
            className="w-full text-sm text-gray-700 file:mr-2 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-white hover:file:bg-indigo-700 disabled:opacity-60"
          />
          {uploadingSignature && <p className="mt-1 text-sm text-gray-500">Uploading...</p>}
          <p className="mt-1 text-xs text-gray-400">
            Not printed on documents — they show the Signatory name and a
            system-generated note instead.
          </p>
        </div>

        <FormActions saving={saving} submitLabel="Save Profile" />
      </form>
    </Card>
  );
};

export default SellerProfilePage;
