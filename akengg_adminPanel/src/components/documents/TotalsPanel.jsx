// src/components/documents/TotalsPanel.jsx
// Read-only totals summary driven by a computeDocument() result (the same
// object useDocumentTotals returns). Shows the tax rows appropriate to the
// supply type (CGST+SGST for intra-state, IGST for inter-state), round-off,
// grand total, and the amount in words, with a clear intra/inter indicator.
import React from "react";
import { formatINR } from "../../utils/money";

/**
 * @param {Object} props
 * @param {object|null} props.totals   computeDocument() result, or null
 * @param {boolean} [props.reverseCharge=false]
 * @param {boolean} [props.showGst=true]
 */
export default function TotalsPanel({
  totals: result,
  reverseCharge = false,
  showGst = true,
}) {
  if (!result) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
        Select a party / place of supply to compute totals.
      </div>
    );
  }

  const { supplyType, totals } = result;
  const isInter = supplyType === "inter";

  const Row = ({ label, value, strong = false, muted = false }) => (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className={muted ? "text-gray-500" : "text-gray-700"}>{label}</span>
      <span
        className={
          strong ? "font-semibold text-gray-900" : "tabular-nums text-gray-800"
        }
      >
        {value}
      </span>
    </div>
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* intra / inter indicator */}
      {showGst ? (
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Tax Mode
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isInter
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isInter ? "Inter-State · IGST" : "Intra-State · CGST + SGST"}
          </span>
        </div>
      ) : null}

      <Row label="Sub Total" value={formatINR(totals.subTotal)} />
      {totals.totalDiscount > 0 ? (
        <Row
          label="Discount"
          value={`- ${formatINR(totals.totalDiscount)}`}
          muted
        />
      ) : null}
      <Row
        label={showGst ? "Taxable Value" : "Net Amount"}
        value={formatINR(totals.totalTaxable)}
      />

      {showGst ? (
        isInter ? (
          <Row label="IGST" value={formatINR(totals.totalIgst)} />
        ) : (
          <>
            <Row label="CGST" value={formatINR(totals.totalCgst)} />
            <Row label="SGST" value={formatINR(totals.totalSgst)} />
          </>
        )
      ) : null}

      {showGst ? (
        <Row label="Total Tax" value={formatINR(totals.totalTax)} muted />
      ) : null}

      {totals.roundOff !== 0 ? (
        <Row
          label="Round Off"
          value={`${totals.roundOff > 0 ? "+ " : "- "}${formatINR(
            Math.abs(totals.roundOff)
          )}`}
          muted
        />
      ) : null}

      <div className="my-2 border-t border-gray-200" />

      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-gray-900">
          Grand Total
        </span>
        <span className="text-lg font-bold text-indigo-600">
          {formatINR(totals.grandTotal)}
        </span>
      </div>

      {showGst ? null : (
        <p className="mt-1 text-xs text-amber-700">
          GST extra as applicable at invoicing.
        </p>
      )}

      {reverseCharge ? (
        <p className="mt-1 text-xs text-amber-700">
          Reverse charge: tax payable by recipient — excluded from grand total.
        </p>
      ) : null}

      {result.amountInWords ? (
        <p className="mt-3 rounded-md bg-gray-50 p-2 text-xs italic text-gray-600">
          {result.amountInWords}
        </p>
      ) : null}
    </div>
  );
}
