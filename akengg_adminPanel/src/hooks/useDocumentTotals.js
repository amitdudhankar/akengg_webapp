// src/hooks/useDocumentTotals.js
// Live GST totals for the document builder. Wraps the client mirror of the
// backend GST engine (utils/gst.js computeDocument) in useMemo so the per-line
// breakup + grand totals recompute ONLY when a relevant input changes.
//
// The server recomputes the same math at save/finalize and is authoritative;
// this hook is purely for instant UX feedback while the user edits.
import { useMemo } from "react";
import { computeDocument } from "../utils/gst";

/**
 * @typedef {Object} LineItemInput
 * @property {number|string} qty
 * @property {number|string} rate
 * @property {('percent'|'amount')} [discountType]
 * @property {number|string} [discountValue]
 * @property {number|string} [gstRate]
 */

/**
 * @param {Object} params
 * @param {LineItemInput[]} params.items
 * @param {string} params.sellerStateCode          2-char GST state code (seller)
 * @param {string} params.placeOfSupplyStateCode   2-char GST state code (place of supply)
 * @param {boolean} [params.reverseCharge=false]
 * @param {('nearest'|'up'|'down'|'none')} [params.roundingMode='nearest']
 * @param {('exclusive'|'inclusive'|'no_tax')} [params.taxTreatment='exclusive']
 * @returns {Object|null} computeDocument() result, or null until both state
 *          codes are known (mirrors utils/gst.js graceful-null behaviour).
 */
export default function useDocumentTotals({
  items = [],
  sellerStateCode,
  placeOfSupplyStateCode,
  reverseCharge = false,
  roundingMode = "nearest",
  taxTreatment = "exclusive",
}) {
  return useMemo(
    () =>
      computeDocument({
        sellerStateCode,
        placeOfSupplyStateCode,
        taxTreatment,
        reverseCharge,
        roundingMode,
        items,
      }),
    [
      items,
      sellerStateCode,
      placeOfSupplyStateCode,
      reverseCharge,
      roundingMode,
      taxTreatment,
    ]
  );
}
