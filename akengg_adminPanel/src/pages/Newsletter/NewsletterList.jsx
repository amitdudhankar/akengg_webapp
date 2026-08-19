import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Mail, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { fetchSubscribers, deleteSubscriber } from "../../api/api";
import Pagination from "../../components/ui/Pagination";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import SearchInput from "../../components/ui/SearchInput";
import Button from "../../components/ui/Button";
import RowActions from "../../components/ui/RowActions";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import TableSkeleton from "../../components/ui/TableSkeleton";
import { TableWrap, Table, THead, Th, TBody, Tr, Td } from "../../components/ui/Table";

const fmtDate = (value) =>
  value
    ? new Date(value)
        .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        .toUpperCase()
    : "—";

function NewsletterList() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getSubscribers = async () => {
    try {
      const res = await fetchSubscribers();
      setSubscribers(res?.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch subscribers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getSubscribers();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return subscribers;
    return subscribers.filter((sub) =>
      [sub.email, sub.status].filter(Boolean).some((value) => value.toLowerCase().includes(query))
    );
  }, [subscribers, search]);

  useEffect(() => {
    const next = Math.max(1, Math.ceil(filtered.length / limit));
    setTotalPages(next);
    setPage((current) => Math.min(current, next));
  }, [filtered.length, limit]);

  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleDeleteClick = (sub) => {
    setSelected(sub);
    setIsChecked(false);
    setIsModalOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!isChecked) {
      toast.error("You must confirm the deletion.");
      return;
    }
    if (!selected?.id) return;
    setDeleting(true);
    try {
      const res = await deleteSubscriber(selected.id);
      toast.success(res?.data?.message || "Subscriber deleted successfully");
      setIsModalOpen(false);
      setSelected(null);
      getSubscribers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete subscriber");
    } finally {
      setDeleting(false);
    }
  };

  const handleExportToExcel = () => {
    try {
      const exportData = filtered.map((sub) => ({
        Email: sub.email,
        Status: sub.status,
        SubscribedAt: sub.created_at,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Subscribers");
      XLSX.writeFile(wb, "newsletter_subscribers.xlsx");
    } catch {
      toast.error("Failed to export subscribers to Excel.");
    }
  };

  return (
    <Card>
      <PageHeader
        title="Newsletter Subscribers"
        subtitle={`${subscribers.length} subscriber${subscribers.length === 1 ? "" : "s"}`}
      >
        <SearchInput
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search subscribers..."
        />
        <Button
          variant="secondary"
          icon={FileSpreadsheet}
          onClick={handleExportToExcel}
          disabled={!filtered.length}
          className="shrink-0"
        >
          Export to Excel
        </Button>
      </PageHeader>

      <TableWrap>
        <Table minWidth="680px">
          <THead>
            <Th className="w-16">#</Th>
            <Th>Email</Th>
            <Th className="w-32">Status</Th>
            <Th className="w-40">Subscribed</Th>
            <Th className="w-24">Actions</Th>
          </THead>

          {loading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : (
            <TBody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <EmptyState
                      icon={Mail}
                      title={search ? "No matching subscribers" : "No subscribers yet"}
                      message={
                        search
                          ? "Try a different search term."
                          : "Sign-ups from the website footer land here."
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginated.map((sub, index) => (
                  <Tr key={sub.id}>
                    <Td className="text-gray-400">{(page - 1) * limit + index + 1}</Td>
                    <Td className="font-medium text-gray-900">{sub.email}</Td>
                    <Td>
                      <StatusBadge status={sub.status} />
                    </Td>
                    <Td className="whitespace-nowrap text-gray-500">{fmtDate(sub.created_at)}</Td>
                    <Td>
                      <RowActions
                        onDelete={() => handleDeleteClick(sub)}
                        deleteLabel="Delete subscriber"
                      />
                    </Td>
                  </Tr>
                ))
              )}
            </TBody>
          )}
        </Table>
      </TableWrap>

      <ConfirmDeleteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDeleteConfirmed}
        title="Delete Subscriber"
        itemName={selected?.email}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        loading={deleting}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
}

export default NewsletterList;
