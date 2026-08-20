import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { BarChart3, Globe, Package } from "lucide-react";
import { fetchLeadSourceReport, fetchLeadProductReport } from "../../api/api";
import PageHeader from "../../components/ui/PageHeader";
import Panel from "../../components/dashboard/Panel";
import BreakdownBars from "../../components/dashboard/BreakdownBars";
import EmptyState from "../../components/ui/EmptyState";
import Field from "../../components/ui/Field";
import Button from "../../components/ui/Button";
import { TableWrap, Table, THead, Th, TBody, Tr, Td } from "../../components/ui/Table";
import { toDateInputValue, getTodayDateInputValue } from "../../utils/date";

// Same "N days back" arithmetic as leadUtils.js's tomorrow helper — date math
// via setDate(), never string manipulation, so month/year boundaries roll
// over correctly.
const daysAgoDateInputValue = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toDateInputValue(d);
};

const numOrZero = (value) => (value === null || value === undefined ? 0 : value);

const textOrDash = (value) =>
  value === null || value === undefined || value === "" ? (
    <span className="text-gray-300">—</span>
  ) : (
    value
  );

// Sorts a report's rows by lead count, descending, without mutating the
// source array — keeps the bar chart and the table beneath it in the same
// (most-leads-first) reading order.
const byLeadsDesc = (rows) =>
  [...rows].sort((a, b) => (Number(b.leads) || 0) - (Number(a.leads) || 0));

/**
 * One report section: a BreakdownBars chart (leads by row) above a compact
 * table of every column the endpoint returns. Handles its own loading
 * skeleton and empty state so LeadReports only has to supply data + columns.
 */
function ReportPanel({ title, icon, loading, rows, barRows, rowKey, columns, emptyMessage }) {
  return (
    <Panel title={title} icon={icon}>
      {loading ? (
        <div className="space-y-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={BarChart3} title="No data for this range" message={emptyMessage} />
      ) : (
        <>
          <BreakdownBars rows={barRows} />

          <div className="mt-5 border-t border-gray-100 pt-4">
            <TableWrap>
              <Table minWidth={`${columns.length * 110}px`}>
                <THead>
                  {columns.map((col) => (
                    <Th key={col.key} className={col.align === "right" ? "text-right" : ""}>
                      {col.label}
                    </Th>
                  ))}
                </THead>
                <TBody>
                  {rows.map((row, index) => (
                    <Tr key={rowKey(row, index)}>
                      {columns.map((col) => (
                        <Td
                          key={col.key}
                          className={col.align === "right" ? "whitespace-nowrap text-right" : ""}
                        >
                          {col.render(row)}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </div>
        </>
      )}
    </Panel>
  );
}

function LeadReports() {
  // Draft date-range inputs (edited freely); "applied" is what was last
  // confirmed via the Apply button and is what actually drives the fetch.
  const [fromDraft, setFromDraft] = useState(() => daysAgoDateInputValue(30));
  const [toDraft, setToDraft] = useState(() => getTodayDateInputValue());
  const [appliedFrom, setAppliedFrom] = useState(fromDraft);
  const [appliedTo, setAppliedTo] = useState(toDraft);

  const [sourceRows, setSourceRows] = useState([]);
  const [productRows, setProductRows] = useState([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = {
      date_from: appliedFrom || undefined,
      date_to: appliedTo || undefined,
    };

    setSourcesLoading(true);
    fetchLeadSourceReport(params)
      .then((res) => {
        if (cancelled) return;
        setSourceRows(Array.isArray(res?.data?.data) ? res.data.data : []);
      })
      .catch((error) => {
        if (cancelled) return;
        setSourceRows([]);
        toast.error(
          error?.response?.data?.message || "Failed to load the lead sources report"
        );
      })
      .finally(() => {
        if (!cancelled) setSourcesLoading(false);
      });

    setProductsLoading(true);
    fetchLeadProductReport(params)
      .then((res) => {
        if (cancelled) return;
        setProductRows(Array.isArray(res?.data?.data) ? res.data.data : []);
      })
      .catch((error) => {
        if (cancelled) return;
        setProductRows([]);
        toast.error(
          error?.response?.data?.message || "Failed to load the products report"
        );
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appliedFrom, appliedTo]);

  const handleApply = () => {
    if (fromDraft && toDraft && fromDraft > toDraft) {
      toast.error("'From' date must be on or before 'To' date.");
      return;
    }
    setAppliedFrom(fromDraft);
    setAppliedTo(toDraft);
  };

  const sortedSourceRows = useMemo(() => byLeadsDesc(sourceRows), [sourceRows]);
  const sortedProductRows = useMemo(() => byLeadsDesc(productRows), [productRows]);

  const sourceBarRows = useMemo(
    () =>
      sortedSourceRows.map((r) => ({
        label: r.source || "Unknown",
        value: numOrZero(r.leads),
        sub: `${numOrZero(r.won)} won`,
      })),
    [sortedSourceRows]
  );
  const productBarRows = useMemo(
    () =>
      sortedProductRows.map((r) => ({
        label: r.product || "Unknown",
        value: numOrZero(r.leads),
        sub: `${numOrZero(r.won)} won`,
      })),
    [sortedProductRows]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Reports"
        subtitle="Lead sources and product performance for the selected date range."
      >
        <Field
          label="From"
          name="date_from"
          type="date"
          value={fromDraft}
          onChange={(e) => setFromDraft(e.target.value)}
          max={toDraft || undefined}
        />
        <Field
          label="To"
          name="date_to"
          type="date"
          value={toDraft}
          onChange={(e) => setToDraft(e.target.value)}
          min={fromDraft || undefined}
        />
        <Button
          variant="primary"
          onClick={handleApply}
          className="self-end"
        >
          Apply
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ReportPanel
          title="Lead Sources"
          icon={Globe}
          loading={sourcesLoading}
          rows={sortedSourceRows}
          barRows={sourceBarRows}
          rowKey={(row, index) => `${row.source}-${index}`}
          emptyMessage="No leads were recorded from any source in this date range."
          columns={[
            { key: "source", label: "Source", render: (r) => textOrDash(r.source) },
            { key: "leads", label: "Leads", align: "right", render: (r) => numOrZero(r.leads) },
            {
              key: "qualified",
              label: "Qualified",
              align: "right",
              render: (r) => numOrZero(r.qualified),
            },
            { key: "won", label: "Won", align: "right", render: (r) => numOrZero(r.won) },
          ]}
        />

        <ReportPanel
          title="Products"
          icon={Package}
          loading={productsLoading}
          rows={sortedProductRows}
          barRows={productBarRows}
          rowKey={(row, index) => `${row.product}-${index}`}
          emptyMessage="No leads were recorded for any product in this date range."
          columns={[
            { key: "product", label: "Product", render: (r) => textOrDash(r.product) },
            { key: "leads", label: "Leads", align: "right", render: (r) => numOrZero(r.leads) },
            {
              key: "qualified",
              label: "Qualified",
              align: "right",
              render: (r) => numOrZero(r.qualified),
            },
            {
              key: "quotation",
              label: "Quotation",
              align: "right",
              render: (r) => numOrZero(r.quotation),
            },
            { key: "won", label: "Won", align: "right", render: (r) => numOrZero(r.won) },
            { key: "lost", label: "Lost", align: "right", render: (r) => numOrZero(r.lost) },
          ]}
        />
      </div>
    </div>
  );
}

export default LeadReports;
