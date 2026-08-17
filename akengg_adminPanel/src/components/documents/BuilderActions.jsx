// src/components/documents/BuilderActions.jsx
// Action bar for the document builder. Purely props-driven so the parent owns
// all state/handlers.
//
// Two clusters:
//   - Draft cluster (Save Draft / Finalize): only when status is 'draft'.
//   - Lifecycle cluster (Duplicate / Convert / Cancel): for draft AND finalized
//     docs (these stay available on a read-only finalized doc); hidden once the
//     doc is cancelled. Convert/Cancel visibility is further gated by the
//     conversion matrix and the admin role.
// Download PDF is always available once the doc has been saved.
import React, { useEffect, useRef, useState } from "react";
import {
  Save,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Copy,
  ArrowRightLeft,
  Ban,
  ChevronDown,
} from "lucide-react";

const baseBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";

// Convert control: one target → a direct button; multiple → a small dropdown.
function ConvertControl({ targets, onConvert, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!targets.length) return null;

  if (targets.length === 1) {
    const target = targets[0];
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onConvert(target)}
        className={`${baseBtn} border border-indigo-600 bg-white text-indigo-600 hover:bg-indigo-50`}
      >
        <ArrowRightLeft className="h-4 w-4" />
        Convert to {target.title}
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${baseBtn} border border-indigo-600 bg-white text-indigo-600 hover:bg-indigo-50`}
      >
        <ArrowRightLeft className="h-4 w-4" />
        Convert
        <ChevronDown className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {targets.map((target) => (
            <button
              key={target.slug}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onConvert(target);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-700"
            >
              {target.title}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {('draft'|'finalized'|'cancelled')} [props.status='draft']
 * @param {()=>void} props.onSaveDraft
 * @param {()=>void} props.onFinalize
 * @param {()=>void} props.onDownloadPdf
 * @param {()=>void} [props.onDuplicate]
 * @param {(target:{slug:string,type:string,title:string})=>void} [props.onConvert]
 * @param {()=>void} [props.onCancel]
 * @param {Array<{slug:string,type:string,title:string}>} [props.convertTargets]
 * @param {boolean} [props.isAdmin=false]
 * @param {boolean} [props.saving=false]
 * @param {boolean} [props.finalizing=false]
 * @param {boolean} [props.downloading=false]
 * @param {boolean} [props.lifecycleBusy=false]
 * @param {boolean} [props.canFinalize=true]   gate finalize (e.g. has items)
 * @param {string} [props.finalizeLabel='Finalize']
 */
export default function BuilderActions({
  status = "draft",
  onSaveDraft,
  onFinalize,
  onDownloadPdf,
  onDownloadWord,
  onDuplicate,
  onConvert,
  onCancel,
  convertTargets = [],
  isAdmin = false,
  saving = false,
  finalizing = false,
  downloading = false,
  downloadingWord = false,
  lifecycleBusy = false,
  canFinalize = true,
  finalizeLabel = "Finalize",
}) {
  const isFinalized = status === "finalized";
  const isCancelled = status === "cancelled";
  const busy = saving || finalizing || downloading || lifecycleBusy;

  // Duplicate stays available on cancelled docs (the backend allows duplicating
  // any status); Convert/Cancel do not apply once cancelled.
  const showLifecycle = onDuplicate || (!isCancelled && (onConvert || onCancel));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {isFinalized ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Finalized (read-only)
          </span>
        ) : isCancelled ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
            <Ban className="h-4 w-4" />
            Cancelled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
            Draft
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {!isFinalized && !isCancelled ? (
          <>
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={busy}
              className={`${baseBtn} bg-gray-200 text-gray-800 hover:bg-gray-300`}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Draft
            </button>

            <button
              type="button"
              onClick={onFinalize}
              disabled={busy || !canFinalize}
              className={`${baseBtn} bg-indigo-600 text-white hover:bg-indigo-700`}
            >
              {finalizing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {finalizeLabel}
            </button>
          </>
        ) : null}

        {showLifecycle ? (
          <>
            {onDuplicate ? (
              <button
                type="button"
                onClick={onDuplicate}
                disabled={busy}
                className={`${baseBtn} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}
              >
                {lifecycleBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Duplicate
              </button>
            ) : null}

            {onConvert && !isCancelled ? (
              <ConvertControl
                targets={convertTargets}
                onConvert={onConvert}
                disabled={busy}
              />
            ) : null}

            {onCancel && isFinalized && isAdmin ? (
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className={`${baseBtn} border border-red-300 bg-white text-red-600 hover:bg-red-50`}
              >
                <Ban className="h-4 w-4" />
                Cancel Document
              </button>
            ) : null}
          </>
        ) : null}

        {onDownloadPdf ? (
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={downloading}
            className={`${baseBtn} border border-indigo-600 bg-white text-indigo-600 hover:bg-indigo-50`}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download PDF
          </button>
        ) : null}

        {onDownloadWord ? (
          <button
            type="button"
            onClick={onDownloadWord}
            disabled={downloadingWord}
            className={`${baseBtn} border border-blue-600 bg-white text-blue-600 hover:bg-blue-50`}
          >
            {downloadingWord ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Word
          </button>
        ) : null}
      </div>
    </div>
  );
}
