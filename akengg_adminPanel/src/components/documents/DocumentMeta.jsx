// src/components/documents/DocumentMeta.jsx
// Header meta fields for the document builder: document date, due date,
// reference no, place of supply (state name + 2-char GST code, kept in sync),
// reverse-charge toggle, and an advisory document-number preview.
//
// Controlled: every field reads from `value` and writes via onChange(patch).
// The number preview is ADVISORY only — the backend numbering.service issues
// the gap-free authoritative number at finalize.
import React from "react";
import { GST_STATES } from "../../config/docConfig";

/**
 * @param {Object} props
 * @param {object} props.value     { doc_date, due_date, reference_no,
 *        place_of_supply, place_of_supply_code, reverse_charge }
 * @param {(patch:object)=>void} props.onChange
 * @param {object} props.showFields  docConfig.showFields
 * @param {string} [props.numberPreview]  e.g. "INV/2026-27/####"
 * @param {boolean} [props.disabled=false]
 */
export default function DocumentMeta({
  value = {},
  onChange,
  showFields = {},
  numberPreview,
  disabled = false,
}) {
  const inputCls =
    "w-full rounded-md border border-gray-300 p-2 disabled:cursor-not-allowed disabled:bg-gray-100";

  // Selecting a state by code keeps the human-readable name in sync.
  const handleStateChange = (code) => {
    const match = GST_STATES.find((s) => s.code === code);
    onChange({
      place_of_supply_code: code,
      place_of_supply: match ? match.name : value.place_of_supply || "",
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Number preview (advisory) */}
      {numberPreview ? (
        <div className="md:col-span-2 lg:col-span-3">
          <span className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-600">
            Number preview:
            <span className="font-mono font-semibold text-gray-800">
              {numberPreview}
            </span>
            <span className="text-xs text-gray-400">
              (final number assigned on finalize)
            </span>
          </span>
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-base font-medium text-gray-700">
          Document Date
        </label>
        <input
          type="date"
          value={value.doc_date || ""}
          disabled={disabled}
          onChange={(e) => onChange({ doc_date: e.target.value })}
          className={inputCls}
        />
      </div>

      {showFields.dueDate ? (
        <div>
          <label className="mb-1 block text-base font-medium text-gray-700">
            Due Date
          </label>
          <input
            type="date"
            value={value.due_date || ""}
            disabled={disabled}
            onChange={(e) => onChange({ due_date: e.target.value })}
            className={inputCls}
          />
        </div>
      ) : null}

      {showFields.referenceNo ? (
        <div>
          <label className="mb-1 block text-base font-medium text-gray-700">
            Reference No
          </label>
          <input
            type="text"
            value={value.reference_no || ""}
            disabled={disabled}
            onChange={(e) => onChange({ reference_no: e.target.value })}
            placeholder="PO / reference"
            className={inputCls}
          />
        </div>
      ) : null}

      {showFields.placeOfSupply ? (
        <>
          <div>
            <label className="mb-1 block text-base font-medium text-gray-700">
              Place of Supply (State)
            </label>
            <select
              value={value.place_of_supply_code || ""}
              disabled={disabled}
              onChange={(e) => handleStateChange(e.target.value)}
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

          <div>
            <label className="mb-1 block text-base font-medium text-gray-700">
              State Code
            </label>
            <input
              type="text"
              value={value.place_of_supply_code || ""}
              disabled={disabled}
              onChange={(e) => handleStateChange(e.target.value.trim())}
              maxLength={2}
              placeholder="e.g. 27"
              className={`${inputCls} w-24`}
            />
          </div>
        </>
      ) : null}

      {showFields.reverseCharge ? (
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(value.reverse_charge)}
              disabled={disabled}
              onChange={(e) => onChange({ reverse_charge: e.target.checked })}
              className="h-4 w-4"
            />
            Reverse Charge (RCM)
            <span className="text-xs font-normal text-gray-400">
              recipient pays tax
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
}
