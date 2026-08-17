// Horizontal bars showing how documents split across the 4 builder types.
const ROWS = [
  { key: "tax_invoice", label: "Tax Invoices", bar: "bg-emerald-500" },
  { key: "proforma", label: "Proforma", bar: "bg-violet-500" },
  { key: "quotation", label: "Quotations", bar: "bg-sky-500" },
  { key: "purchase_order", label: "Purchase Orders", bar: "bg-amber-500" },
];

function DocTypeBreakdown({ byType }) {
  const max = Math.max(1, ...ROWS.map((r) => byType[r.key] || 0));

  return (
    <div className="space-y-3.5">
      {ROWS.map(({ key, label, bar }) => {
        const count = byType[key] || 0;
        return (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-gray-600">{label}</span>
              <span className="font-semibold text-gray-900">{count}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${bar} transition-all`}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DocTypeBreakdown;
