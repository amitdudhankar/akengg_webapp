import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  getSellerProfile,
  createDocument,
  updateDocument,
  finalizeDocument,
  getDocumentById,
  downloadDocumentPdf,
  downloadDocumentDocx,
  duplicateDocument,
  convertDocument,
  cancelDocument,
  emailDocument,
  getPartyById,
} from "../../api/api";
import {
  getDocConfig,
  getConvertTargets,
  TYPE_TO_SLUG,
  TYPE_LABELS,
} from "../../config/docConfig";
import { useAuth } from "../../context/AuthContext";
import PartyPicker from "../../components/documents/PartyPicker";
import DocumentMeta from "../../components/documents/DocumentMeta";
import LineItemsEditor, { emptyLine } from "../../components/documents/LineItemsEditor";
import TotalsPanel from "../../components/documents/TotalsPanel";
import BuilderActions from "../../components/documents/BuilderActions";
import EmailDocumentModal from "../../components/documents/EmailDocumentModal";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import useDocumentTotals from "../../hooks/useDocumentTotals";
import { getTodayDateInputValue, toDateInputValue } from "../../utils/date";

// ── helpers ────────────────────────────────────────────────────────────────

const todayISO = () => getTodayDateInputValue();

// A fresh, empty document state for "new" mode, seeded from the config.
const blankDoc = (config) => ({
  party: null,
  meta: {
    doc_date: todayISO(),
    due_date: "",
    reference_no: "",
    place_of_supply: "",
    place_of_supply_code: "",
    reverse_charge: false,
  },
  items: [emptyLine()],
  taxTreatment: config.taxTreatment || "exclusive",
  terms: "",
  notes: "",
});

// Map a line row coming back from the server (document_items snapshot) into the
// raw editor line shape the components expect.
const serverLineToEditor = (row) => ({
  item_id: row.item_id ?? null,
  name: row.name || "",
  description: row.description || "",
  hsn_sac: row.hsn_sac || "",
  qty: row.qty ?? 1,
  uqc: row.uqc || "NOS",
  rate: row.rate ?? "",
  discountType: row.discount_type || "percent",
  discountValue: row.discount_value ?? "",
  gstRate: row.gst_rate ?? 0,
});

// Reconstruct a party-like object from a document's snapshot columns so the
// PartyPicker can display the chosen party on an existing (esp. finalized) doc.
const partyFromSnapshot = (doc) => {
  if (!doc) return null;
  if (!doc.party_id && !doc.party_name) return null;
  return {
    id: doc.party_id,
    party_type: doc.party_type,
    name: doc.party_name,
    gstin: doc.party_gstin,
    pan: doc.party_pan,
    email: doc.party_email,
    phone: doc.party_phone,
    party_is_registered: doc.party_is_registered,
    billing_address_line1: doc.party_billing_address_line1,
    billing_address_line2: doc.party_billing_address_line2,
    billing_city: doc.party_billing_city,
    billing_state: doc.party_billing_state,
    billing_state_code: doc.party_billing_state_code,
    billing_pincode: doc.party_billing_pincode,
    billing_country: doc.party_billing_country,
    shipping_address_line1: doc.party_shipping_address_line1,
    shipping_address_line2: doc.party_shipping_address_line2,
    shipping_city: doc.party_shipping_city,
    shipping_state: doc.party_shipping_state,
    shipping_state_code: doc.party_shipping_state_code,
    shipping_pincode: doc.party_shipping_pincode,
    shipping_country: doc.party_shipping_country,
  };
};

// ── component ────────────────────────────────────────────────────────────────

export default function DocumentBuilder() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const config = getDocConfig(type);
  const isEdit = Boolean(id);

  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const convertTargets = getConvertTargets(type);

  const [sellerStateCode, setSellerStateCode] = useState("");
  const [roundingMode, setRoundingMode] = useState("nearest");
  const [doc, setDoc] = useState(() => (config ? blankDoc(config) : null));
  const [status, setStatus] = useState("draft");
  const [docNumber, setDocNumber] = useState(null);
  const [savedId, setSavedId] = useState(id || null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [convertedFrom, setConvertedFrom] = useState(null); // { id, number, type }
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelChecked, setCancelChecked] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const seededFromNavRef = useRef(false);

  const finalized = status === "finalized";
  const cancelled = status === "cancelled";
  const readOnly = finalized || cancelled;

  // Load the seller's state code once — it drives intra (CGST+SGST) vs inter
  // (IGST) supply in both the live totals and the backend recompute.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await getSellerProfile();
        const data = res?.data?.data || {};
        if (active) {
          setSellerStateCode(data.state_code || "");
          if (data.rounding_mode) setRoundingMode(data.rounding_mode);
        }
      } catch (error) {
        if (active)
          toast.error(
            error?.response?.data?.message || "Failed to load seller profile"
          );
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // Load an existing document in edit mode.
  useEffect(() => {
    if (!isEdit || !config) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getDocumentById(id);
        const data = res?.data?.data;
        if (active && data) {
          const items = Array.isArray(data.items) && data.items.length
            ? data.items.map(serverLineToEditor)
            : [emptyLine()];
          setDoc({
            party: partyFromSnapshot(data),
            meta: {
              doc_date: toDateInputValue(data.doc_date) || todayISO(),
              due_date: toDateInputValue(data.due_date),
              reference_no: data.reference_no || "",
              place_of_supply: data.place_of_supply || "",
              place_of_supply_code: data.place_of_supply_code || "",
              reverse_charge: Boolean(Number(data.reverse_charge)),
            },
            items,
            taxTreatment: data.tax_treatment || config.taxTreatment || "exclusive",
            terms: data.terms || "",
            notes: data.notes || "",
          });
          setStatus(data.status || "draft");
          setDocNumber(data.doc_number || null);
          setSavedId(data.id);
          setConvertedFrom(
            data.converted_from_id
              ? {
                  id: data.converted_from_id,
                  number: data.converted_from_number || null,
                  type: data.converted_from_type || null,
                }
              : null
          );
        }
      } catch (error) {
        if (active)
          toast.error(
            error?.response?.data?.message || "Failed to load document"
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [id, isEdit, config]);

  // Place of supply defaults from the picked party's billing state code, but
  // the user can override it explicitly in DocumentMeta.
  const placeOfSupplyStateCode =
    doc?.meta?.place_of_supply_code || doc?.party?.billing_state_code || "";

  // Live totals (client mirror of the GST engine; the server is authoritative).
  const computed = useDocumentTotals({
    items: doc?.items || [],
    sellerStateCode,
    placeOfSupplyStateCode,
    reverseCharge: doc?.meta?.reverse_charge,
    roundingMode,
    taxTreatment: doc?.taxTreatment,
  });

  const supplyType = computed?.supplyType || "intra";

  const patchMeta = (patch) =>
    setDoc((prev) => ({ ...prev, meta: { ...prev.meta, ...patch } }));

  const handlePartyChange = (party) => {
    setDoc((prev) => {
      // When no explicit place of supply is set yet, seed it from the party's
      // billing state so the tax mode indicator is correct immediately.
      const next = { ...prev, party };
      if (party && !prev.meta.place_of_supply_code && party.billing_state_code) {
        next.meta = {
          ...prev.meta,
          place_of_supply_code: party.billing_state_code,
          place_of_supply: party.billing_state || "",
        };
      }
      return next;
    });
  };

  // Pre-seed a brand-new document with a party + reference number handed off
  // from elsewhere (e.g. "Create Quotation" from a Lead). Prefers react-router
  // navigation state; falls back to URL query params (?party_id=&ref=) so a
  // page refresh/direct link still works since navigation state doesn't
  // survive that. Runs once on mount, only in create mode.
  useEffect(() => {
    if (isEdit || !config || seededFromNavRef.current) return;
    seededFromNavRef.current = true;

    const seedPartyId = location.state?.partyId || searchParams.get("party_id");
    const seedReference = location.state?.reference || searchParams.get("ref");

    if (seedReference) {
      patchMeta({ reference_no: seedReference });
    }

    if (!seedPartyId) return;
    let active = true;
    (async () => {
      try {
        const res = await getPartyById(seedPartyId);
        const party = res?.data?.data;
        if (active && party) handlePartyChange(party);
      } catch (error) {
        if (active)
          toast.error(
            error?.response?.data?.message || "Failed to load pre-selected party"
          );
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, config]);

  // Build the payload the backend expects. Lines are sent raw; the server
  // recomputes the GST via gst.engine.
  const buildPayload = () => ({
    doc_type: config.type,
    party_id: doc.party?.id ?? null,
    doc_date: doc.meta.doc_date || null,
    due_date: doc.meta.due_date || null,
    reference_no: doc.meta.reference_no || null,
    place_of_supply: doc.meta.place_of_supply || null,
    place_of_supply_code: placeOfSupplyStateCode || null,
    tax_treatment: doc.taxTreatment,
    reverse_charge: doc.meta.reverse_charge ? 1 : 0,
    terms: doc.terms || null,
    notes: doc.notes || null,
    items: (doc.items || []).map((line, index) => ({
      item_id: line.item_id ?? null,
      line_no: index + 1,
      name: line.name || "",
      description: line.description || null,
      hsn_sac: line.hsn_sac || null,
      qty: Number(line.qty) || 0,
      uqc: line.uqc || null,
      rate: Number(line.rate) || 0,
      discount_type: line.discountType || "percent",
      discount_value: Number(line.discountValue) || 0,
      gst_rate: Number(line.gstRate) || 0,
    })),
  });

  // Persist the draft. Returns the saved id (or null on failure) so finalize
  // can chain off a fresh save.
  const persist = async () => {
    const payload = buildPayload();
    if (savedId) {
      const res = await updateDocument(savedId, payload);
      return res?.data?.data?.id || savedId;
    }
    const res = await createDocument(payload);
    const newId = res?.data?.data?.id;
    if (newId) setSavedId(newId);
    return newId;
  };

  const handleSaveDraft = async () => {
    if (readOnly) return;
    setSaving(true);
    const loadingToast = toast.loading("Saving draft...");
    try {
      const newId = await persist();
      toast.success("Draft saved", { id: loadingToast });
      // Move to a stable edit URL so refresh/back behaves and the id is in the
      // route (only when this was a brand-new doc).
      if (!isEdit && newId) {
        navigate(`/documents/${type}/edit/${newId}`, { replace: true });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save draft", {
        id: loadingToast,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (readOnly) return;
    if (!doc.party) {
      toast.error("Select a party before finalizing.");
      return;
    }
    if (!placeOfSupplyStateCode) {
      toast.error("Set the place of supply before finalizing.");
      return;
    }
    setFinalizing(true);
    const loadingToast = toast.loading("Finalizing...");
    try {
      // Always persist the latest edits first, then finalize that document.
      const targetId = await persist();
      if (!targetId) throw new Error("Could not save document before finalize");
      const res = await finalizeDocument(targetId);
      const data = res?.data?.data || {};
      setStatus(data.status || "finalized");
      setDocNumber(data.doc_number || null);
      setSavedId(targetId);
      toast.success(
        data.doc_number ? `Finalized as ${data.doc_number}` : "Document finalized",
        { id: loadingToast }
      );
      // Reflect the finalized (locked) state in the URL if needed.
      if (!isEdit) {
        navigate(`/documents/${type}/edit/${targetId}`, { replace: true });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to finalize", {
        id: loadingToast,
      });
    } finally {
      setFinalizing(false);
    }
  };

  const handleDownload = async () => {
    if (!savedId) {
      toast.error("Save the document before downloading.");
      return;
    }
    setDownloading(true);
    const loadingToast = toast.loading("Preparing PDF...");
    try {
      const res = await downloadDocumentPdf(savedId);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const baseName = docNumber
        ? docNumber.replace(/[\\/]/g, "-")
        : `${config.type}-draft-${savedId}`;
      link.download = `${baseName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded", { id: loadingToast });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to download PDF", {
        id: loadingToast,
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadWord = async () => {
    if (!savedId) {
      toast.error("Save the document before downloading.");
      return;
    }
    setDownloadingWord(true);
    const loadingToast = toast.loading("Preparing Word file...");
    try {
      const res = await downloadDocumentDocx(savedId);
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const baseName = docNumber
        ? docNumber.replace(/[\\/]/g, "-")
        : `${config.type}-draft-${savedId}`;
      link.download = `${baseName}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Word file downloaded", { id: loadingToast });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to download Word file", {
        id: loadingToast,
      });
    } finally {
      setDownloadingWord(false);
    }
  };

  // For lifecycle actions on an editable draft, persist the latest edits first
  // so the clone reflects them. Finalized/cancelled docs are already frozen.
  const ensureSaved = async () => {
    if (readOnly) return savedId;
    return persist();
  };

  const handleDuplicate = async () => {
    setLifecycleBusy(true);
    const loadingToast = toast.loading("Duplicating...");
    try {
      const sourceId = await ensureSaved();
      if (!sourceId) throw new Error("Save the document before duplicating.");
      const res = await duplicateDocument(sourceId);
      const nd = res?.data?.data;
      if (!nd?.id) throw new Error("Duplicate failed");
      toast.success("Duplicated as a new draft", { id: loadingToast });
      const slug = TYPE_TO_SLUG[nd.doc_type] || type;
      navigate(`/documents/${slug}/edit/${nd.id}`);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || "Failed to duplicate",
        { id: loadingToast }
      );
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleConvert = async (target) => {
    setLifecycleBusy(true);
    const loadingToast = toast.loading(`Converting to ${target.title}...`);
    try {
      const sourceId = await ensureSaved();
      if (!sourceId) throw new Error("Save the document before converting.");
      const res = await convertDocument(sourceId, target.type);
      const nd = res?.data?.data;
      if (!nd?.id) throw new Error("Convert failed");
      toast.success(`Converted to ${target.title} (draft)`, { id: loadingToast });
      // Nudge when a no_tax source becomes a taxable target: its carried GST
      // rates first become real tax the user hasn't reviewed on the quotation.
      const taxableTarget =
        target.type === "tax_invoice" || target.type === "proforma";
      const sourceNoTax =
        (doc?.taxTreatment || config?.taxTreatment) === "no_tax";
      if (taxableTarget && sourceNoTax) {
        toast("Review GST rates before finalizing.", { icon: "⚠️" });
      }
      navigate(`/documents/${target.slug}/edit/${nd.id}`);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error.message || "Failed to convert",
        { id: loadingToast }
      );
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleCancelConfirmed = async () => {
    if (!cancelChecked || !savedId) return;
    setLifecycleBusy(true);
    const loadingToast = toast.loading("Cancelling...");
    try {
      const res = await cancelDocument(savedId);
      const data = res?.data?.data || {};
      setStatus(data.status || "cancelled");
      setCancelOpen(false);
      setCancelChecked(false);
      toast.success("Document cancelled", { id: loadingToast });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to cancel", {
        id: loadingToast,
      });
    } finally {
      setLifecycleBusy(false);
    }
  };

  // Email the finalized document to the party (PDF attached server-side). The
  // modal stays open on failure so the address can be corrected and retried.
  const handleSendEmail = async (payload) => {
    if (!savedId) return;
    setSendingEmail(true);
    const loadingToast = toast.loading("Sending email...");
    try {
      const res = await emailDocument(savedId, payload);
      toast.success(res?.data?.message || "Document emailed", {
        id: loadingToast,
      });
      setEmailOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send email", {
        id: loadingToast,
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Advisory number preview before finalize (the backend issues the real one).
  const numberPreview = useMemo(() => {
    if (docNumber) return docNumber;
    return `${config?.numberPrefix || "DOC"}/____-__/####`;
  }, [docNumber, config]);

  // ── render guards ──────────────────────────────────────────────────────
  if (!config) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-red-600">Unknown document type</h1>
        <p className="mt-2 text-gray-600">
          "{type}" is not a configured document type.
        </p>
        <button
          onClick={() => navigate("/documents")}
          className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          Back to Documents
        </button>
      </div>
    );
  }

  if (loading || !doc) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-gray-100 bg-white"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/documents")}
          className="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Back to documents"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {finalized && docNumber ? `${config.title} ${docNumber}` : `New ${config.title}`}
        </h1>
        {finalized ? (
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Finalized
          </span>
        ) : cancelled ? (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Cancelled
          </span>
        ) : (
          <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
            Draft
          </span>
        )}
      </div>

      {/* Provenance: shown when this doc was produced by /convert */}
      {convertedFrom ? (
        <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Converted from{" "}
          {convertedFrom.number && convertedFrom.type ? (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/documents/${TYPE_TO_SLUG[convertedFrom.type]}/edit/${convertedFrom.id}`
                )
              }
              className="font-semibold underline hover:text-blue-900"
            >
              {TYPE_LABELS[convertedFrom.type] || "document"} {convertedFrom.number}
            </button>
          ) : (
            <span className="font-semibold">document #{convertedFrom.id}</span>
          )}
        </div>
      ) : null}

      {/* Tax mode indicator */}
      {config.showGst ? (
        <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
          Supply type:{" "}
          <span className="font-semibold text-gray-800">
            {supplyType === "inter" ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}
          </span>
          {sellerStateCode ? (
            <span className="ml-2 text-gray-400">
              seller {sellerStateCode} → place of supply {placeOfSupplyStateCode || "—"}
            </span>
          ) : (
            <span className="ml-2 text-amber-600">
              Set the seller state code in Seller Profile.
            </span>
          )}
        </div>
      ) : null}

      {/* Party */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <PartyPicker
          role={config.partyRole}
          label={config.partyLabel}
          value={doc.party}
          onChange={handlePartyChange}
          disabled={readOnly}
          addHref="/parties/add"
        />
      </div>

      {/* Meta */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <DocumentMeta
          value={doc.meta}
          onChange={patchMeta}
          showFields={config.showFields}
          numberPreview={numberPreview}
          disabled={readOnly}
        />
      </div>

      {/* Line items */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Line Items</h2>
        <LineItemsEditor
          items={doc.items}
          onChange={(items) => setDoc((prev) => ({ ...prev, items }))}
          sellerStateCode={sellerStateCode}
          placeOfSupplyStateCode={placeOfSupplyStateCode}
          reverseCharge={doc.meta.reverse_charge}
          roundingMode={roundingMode}
          taxTreatment={doc.taxTreatment}
          showGst={config.showGst}
          disabled={readOnly}
        />
      </div>

      {/* Totals + notes/terms */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-base font-medium text-gray-700">Terms</label>
              <textarea
                value={doc.terms}
                disabled={readOnly}
                onChange={(e) => setDoc((prev) => ({ ...prev, terms: e.target.value }))}
                rows={3}
                placeholder="Terms & conditions"
                className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-base font-medium text-gray-700">Notes</label>
              <textarea
                value={doc.notes}
                disabled={readOnly}
                onChange={(e) => setDoc((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Notes (printed on the document)"
                className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-50"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <TotalsPanel
            totals={computed}
            reverseCharge={doc.meta.reverse_charge}
            showGst={config.showGst}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <BuilderActions
          status={status}
          finalizeLabel={config.finalizeLabel}
          canFinalize={(doc.items || []).length > 0 && !readOnly}
          saving={saving}
          finalizing={finalizing}
          downloading={downloading}
          lifecycleBusy={lifecycleBusy}
          isAdmin={isAdmin}
          convertTargets={convertTargets}
          onSaveDraft={handleSaveDraft}
          onFinalize={handleFinalize}
          onDownloadPdf={savedId ? handleDownload : undefined}
          onDownloadWord={savedId ? handleDownloadWord : undefined}
          downloadingWord={downloadingWord}
          onDuplicate={savedId ? handleDuplicate : undefined}
          onConvert={savedId && convertTargets.length ? handleConvert : undefined}
          onCancel={finalized && isAdmin ? () => setCancelOpen(true) : undefined}
          onEmail={savedId ? () => setEmailOpen(true) : undefined}
        />
      </div>

      <EmailDocumentModal
        isOpen={emailOpen}
        document={{
          id: savedId,
          doc_type: config.type,
          doc_number: docNumber,
          party_name: doc.party?.name,
          party_email: doc.party?.email,
        }}
        isSending={sendingEmail}
        onClose={() => setEmailOpen(false)}
        onSend={handleSendEmail}
      />

      <ConfirmDeleteModal
        isOpen={cancelOpen}
        onClose={() => {
          setCancelOpen(false);
          setCancelChecked(false);
        }}
        onDelete={handleCancelConfirmed}
        title="Cancel Document"
        description="This document will be marked cancelled. Its number is retained and cannot be reused:"
        itemName={docNumber || (savedId ? `${config.title} #${savedId}` : config.title)}
        actionLabel="Cancel Document"
        confirmLabel="I understand this cannot be undone"
        isChecked={cancelChecked}
        setIsChecked={setCancelChecked}
      />
    </div>
  );
}
