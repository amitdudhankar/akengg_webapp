// src/components/documents/LineItemRow.jsx
// A single editable line of the document. Presentational: all values come from
// props and every change is lifted via onChange(patch). The per-line computed
// tax breakup (computed) is read-only display, driven by the parent's
// useDocumentTotals result so it stays in lockstep with the grand totals.
import React from "react";
import { Trash2 } from "lucide-react";
import ItemAutocomplete from "./ItemAutocomplete";
import { formatNumber } from "../../utils/money";
import { GST_RATE_OPTIONS, UQC_OPTIONS } from "../../config/docConfig";

/**
 * @param {Object} props
 * @param {number} props.index               row index (for Sr. No)
 * @param {object} props.item                raw line input
 *        { name, description, hsn_sac, qty, uqc, rate, discountType,
 *          discountValue, gstRate }
 * @param {object|null} props.computed       computeDocument().items[index]
 * @param {('intra'|'inter')} props.supplyType
 * @param {boolean} props.showGst
 * @param {(patch:object)=>void} props.onChange   merge-patch this line
 * @param {()=>void} props.onRemove
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.canRemove=true]
 */
export default function LineItemRow({
  index,
  item,
  computed,
  supplyType,
  showGst,
  onChange,
  onRemove,
  disabled = false,
  canRemove = true,
}) {
  const inputCls =
    "w-full rounded-md border border-gray-300 p-1.5 text-sm disabled:cursor-not-allowed disabled:bg-gray-100";

  const handleCatalogSelect = (picked) => {
    onChange({
      name: picked.name,
      description: picked.description,
      hsn_sac: picked.hsn_sac,
      uqc: picked.uqc,
      rate: picked.default_rate,
      gstRate: picked.default_gst_rate,
    });
  };

  return (
    <tr className="align-top">
      <td className="px-2 py-2 text-sm text-gray-500">{index + 1}</td>

      {/* Name (autocomplete) + optional description */}
      <td className="px-2 py-2">
        <ItemAutocomplete
          value={item.name || ""}
          disabled={disabled}
          onChange={(name) => onChange({ name })}
          onSelect={handleCatalogSelect}
        />
        <input
          type="text"
          value={item.description || ""}
          disabled={disabled}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Description (optional)"
          className={`${inputCls} mt-1`}
        />
      </td>

      {/* HSN / SAC */}
      <td className="px-2 py-2">
        <input
          type="text"
          value={item.hsn_sac || ""}
          disabled={disabled}
          onChange={(e) => onChange({ hsn_sac: e.target.value })}
          placeholder="HSN/SAC"
          className={`${inputCls} w-24`}
        />
      </td>

      {/* Qty */}
      <td className="px-2 py-2">
        <input
          type="number"
          min="0"
          step="any"
          value={item.qty ?? ""}
          disabled={disabled}
          onChange={(e) => onChange({ qty: e.target.value })}
          className={`${inputCls} w-20 text-right`}
        />
      </td>

      {/* UQC */}
      <td className="px-2 py-2">
        <input
          type="text"
          list="uqc-options"
          value={item.uqc || ""}
          disabled={disabled}
          onChange={(e) => onChange({ uqc: e.target.value })}
          placeholder="NOS"
          className={`${inputCls} w-20`}
        />
        <datalist id="uqc-options">
          {UQC_OPTIONS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </td>

      {/* Rate */}
      <td className="px-2 py-2">
        <input
          type="number"
          min="0"
          step="any"
          value={item.rate ?? ""}
          disabled={disabled}
          onChange={(e) => onChange({ rate: e.target.value })}
          className={`${inputCls} w-24 text-right`}
        />
      </td>

      {/* Discount (type + value) */}
      <td className="px-2 py-2">
        <div className="flex items-center gap-1">
          <select
            value={item.discountType || "percent"}
            disabled={disabled}
            onChange={(e) => onChange({ discountType: e.target.value })}
            className={`${inputCls} w-14`}
          >
            <option value="percent">%</option>
            <option value="amount">₹</option>
          </select>
          <input
            type="number"
            min="0"
            step="any"
            value={item.discountValue ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ discountValue: e.target.value })}
            className={`${inputCls} w-20 text-right`}
          />
        </div>
      </td>

      {/* Taxable value (computed, read-only; dropped with the GST columns on
          no-tax docs where it would just duplicate Line Total) */}
      {showGst ? (
        <td className="px-2 py-2 text-right text-sm text-gray-700">
          {computed ? formatNumber(computed.taxableValue) : "—"}
        </td>
      ) : null}

      {/* GST rate + tax columns (switch by supplyType) */}
      {showGst ? (
        <>
          <td className="px-2 py-2">
            <select
              value={item.gstRate ?? 0}
              disabled={disabled}
              onChange={(e) => onChange({ gstRate: e.target.value })}
              className={`${inputCls} w-20`}
            >
              {GST_RATE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
          </td>

          {supplyType === "inter" ? (
            <td className="px-2 py-2 text-right text-sm text-gray-700">
              {computed ? formatNumber(computed.igstAmount) : "—"}
            </td>
          ) : (
            <>
              <td className="px-2 py-2 text-right text-sm text-gray-700">
                {computed ? formatNumber(computed.cgstAmount) : "—"}
              </td>
              <td className="px-2 py-2 text-right text-sm text-gray-700">
                {computed ? formatNumber(computed.sgstAmount) : "—"}
              </td>
            </>
          )}
        </>
      ) : null}

      {/* Line total */}
      <td className="px-2 py-2 text-right text-sm font-medium text-gray-900">
        {computed ? formatNumber(computed.lineTotal) : "—"}
      </td>

      {/* Remove */}
      <td className="px-2 py-2 text-center">
        {!disabled && canRemove ? (
          <button type="button" onClick={onRemove} aria-label="Remove line">
            <Trash2 className="mx-auto h-4 w-4 cursor-pointer text-red-600 hover:text-red-800" />
          </button>
        ) : null}
      </td>
    </tr>
  );
}
