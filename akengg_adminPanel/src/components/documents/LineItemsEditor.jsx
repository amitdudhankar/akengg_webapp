// src/components/documents/LineItemsEditor.jsx
// The line-items table for the document builder. Owns add/remove of rows and
// renders LineItemRow per line. Live per-line + grand totals come from the
// useDocumentTotals hook (client mirror of the backend GST engine), and the
// tax columns switch between CGST+SGST (intra-state) and IGST (inter-state)
// based on the computed supplyType.
//
// Controlled component: `items` and the GST context are props; every edit is
// lifted via onChange(nextItems). The parent typically renders a TotalsPanel
// from the same useDocumentTotals result for a single source of truth — but
// this editor also computes locally to drive the per-row display.
import React from "react";
import { Plus } from "lucide-react";
import LineItemRow from "./LineItemRow";
import useDocumentTotals from "../../hooks/useDocumentTotals";

/** A blank line with sensible defaults. */
export const emptyLine = () => ({
  name: "",
  description: "",
  hsn_sac: "",
  qty: 1,
  uqc: "NOS",
  rate: "",
  discountType: "percent",
  discountValue: "",
  gstRate: 18,
});

/**
 * @param {Object} props
 * @param {Array<object>} props.items
 * @param {(nextItems:Array<object>)=>void} props.onChange
 * @param {string} props.sellerStateCode
 * @param {string} props.placeOfSupplyStateCode
 * @param {boolean} [props.reverseCharge=false]
 * @param {string} [props.roundingMode='nearest']
 * @param {string} [props.taxTreatment='exclusive']
 * @param {boolean} [props.showGst=true]
 * @param {boolean} [props.disabled=false]
 */
export default function LineItemsEditor({
  items = [],
  onChange,
  sellerStateCode,
  placeOfSupplyStateCode,
  reverseCharge = false,
  roundingMode = "nearest",
  taxTreatment = "exclusive",
  showGst = true,
  disabled = false,
}) {
  const computed = useDocumentTotals({
    items,
    sellerStateCode,
    placeOfSupplyStateCode,
    reverseCharge,
    roundingMode,
    taxTreatment,
  });

  // Until both state codes are known computed is null; default to intra so the
  // CGST/SGST columns render (the most common case for this seller).
  const supplyType = computed?.supplyType || "intra";
  const computedItems = computed?.items || [];

  const patchLine = (index, patch) => {
    const next = items.map((line, i) =>
      i === index ? { ...line, ...patch } : line
    );
    onChange(next);
  };

  const addLine = () => onChange([...items, emptyLine()]);

  const removeLine = (index) => onChange(items.filter((_, i) => i !== index));

  const thCls = "px-2 py-2 text-left text-xs font-semibold text-gray-600";
  const thRight = "px-2 py-2 text-right text-xs font-semibold text-gray-600";

  return (
    <div className="rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className={thCls}>#</th>
              <th className={thCls}>Item / Description</th>
              <th className={thCls}>HSN/SAC</th>
              <th className={thRight}>Qty</th>
              <th className={thCls}>Unit</th>
              <th className={thRight}>Rate</th>
              <th className={thCls}>Discount</th>
              {showGst ? (
                <>
                  <th className={thRight}>Taxable</th>
                  <th className={thCls}>GST %</th>
                  {supplyType === "inter" ? (
                    <th className={thRight}>IGST</th>
                  ) : (
                    <>
                      <th className={thRight}>CGST</th>
                      <th className={thRight}>SGST</th>
                    </>
                  )}
                </>
              ) : null}
              <th className={thRight}>Line Total</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={showGst ? (supplyType === "inter" ? 12 : 13) : 9}
                  className="py-6 text-center text-sm text-gray-500"
                >
                  No line items yet. Add your first item below.
                </td>
              </tr>
            ) : (
              items.map((line, index) => (
                <LineItemRow
                  key={index}
                  index={index}
                  item={line}
                  computed={computedItems[index] || null}
                  supplyType={supplyType}
                  showGst={showGst}
                  disabled={disabled}
                  canRemove={items.length > 1}
                  onChange={(patch) => patchLine(index, patch)}
                  onRemove={() => removeLine(index)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {!disabled ? (
        <div className="border-t border-gray-200 p-2">
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100"
          >
            <Plus className="h-4 w-4" />
            Add line
          </button>
        </div>
      ) : null}
    </div>
  );
}
