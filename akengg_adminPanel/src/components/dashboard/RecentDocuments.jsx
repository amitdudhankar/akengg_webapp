import { formatINR } from "../../utils/money";
import { formatDateDisplay } from "../../utils/date";
import StatusBadge from "./StatusBadge";

const TYPE_LABELS = {
  quotation: "Quotation",
  proforma: "Proforma",
  purchase_order: "Purchase Order",
  tax_invoice: "Tax Invoice",
};

const fmtDate = (value) => formatDateDisplay(value) || "—";

function RecentDocuments({ items = [] }) {
  if (!items.length) {
    return <p className="py-6 text-center text-sm text-gray-400">No documents yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
            <th className="pb-2 pr-4 font-medium">Document</th>
            <th className="pb-2 pr-4 font-medium">Party</th>
            <th className="pb-2 pr-4 text-right font-medium">Total</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((d) => (
            <tr key={d.id} className="transition hover:bg-gray-50">
              <td className="py-2.5 pr-4">
                <div className="font-medium text-gray-900">
                  {d.doc_number || "Draft"}
                </div>
                <div className="text-xs text-gray-400">
                  {TYPE_LABELS[d.doc_type] || d.doc_type}
                </div>
              </td>
              <td className="max-w-[12rem] truncate py-2.5 pr-4 text-gray-600">
                {d.party_name || "—"}
              </td>
              <td className="whitespace-nowrap py-2.5 pr-4 text-right font-medium text-gray-800">
                {formatINR(d.grand_total)}
              </td>
              <td className="py-2.5 pr-4">
                <StatusBadge status={d.status} />
              </td>
              <td className="whitespace-nowrap py-2.5 text-gray-500">
                {fmtDate(d.doc_date || d.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RecentDocuments;

