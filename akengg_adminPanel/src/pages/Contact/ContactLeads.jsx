import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Inbox, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { deleteContact, fetchContacts } from "../../api/api";
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

function ContactLeads() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getContacts = async () => {
    setLoading(true);
    try {
      const response = await fetchContacts({ status: statusFilter || undefined });
      setContacts(response?.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((contact) =>
      [contact.name, contact.email, contact.number, contact.message, contact.status]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [contacts, search]);

  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil(filteredContacts.length / limit));
    setTotalPages(nextTotalPages);
    setPage((currentPage) => Math.min(currentPage, nextTotalPages));
  }, [filteredContacts.length, limit]);

  const paginatedContacts = filteredContacts.slice((page - 1) * limit, page * limit);

  const newLeads = useMemo(
    () => contacts.filter((c) => String(c.status || "").toLowerCase() === "new").length,
    [contacts]
  );

  const handleDeleteClick = (contact) => {
    setSelectedContact(contact);
    setIsChecked(false);
    setIsModalOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!isChecked) {
      toast.error("You must confirm the deletion.");
      return;
    }
    if (!selectedContact?.id) {
      toast.error("No contact selected for deletion.");
      return;
    }
    setDeleting(true);
    try {
      const response = await deleteContact(selectedContact.id);
      toast.success(response?.data?.message || "Contact deleted successfully!");
      setIsModalOpen(false);
      setSelectedContact(null);
      getContacts();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete contact");
    } finally {
      setDeleting(false);
    }
  };

  const handleExportToExcel = () => {
    try {
      const exportData = filteredContacts.map((contact) => ({
        Name: contact.name,
        Email: contact.email,
        Number: contact.number,
        Status: contact.status,
        Message: contact.message,
        CreatedAt: contact.created_at,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Contacts");
      XLSX.writeFile(wb, "contact_leads.xlsx");
    } catch {
      toast.error("Failed to export contacts to Excel.");
    }
  };

  return (
    <Card>
      <PageHeader
        title="Contact Leads"
        subtitle={`${contacts.length} ${
          contacts.length === 1 ? "enquiry" : "enquiries"
        } · ${newLeads} new`}
      >
        <SearchInput
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search contacts..."
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          className="w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-auto sm:min-w-[160px]"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="closed">Closed</option>
        </select>
        <Button
          variant="secondary"
          icon={FileSpreadsheet}
          onClick={handleExportToExcel}
          disabled={!filteredContacts.length}
          className="shrink-0"
        >
          Export to Excel
        </Button>
      </PageHeader>

      <TableWrap>
        <Table minWidth="1080px">
          <THead>
            <Th className="w-16">#</Th>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Phone</Th>
            <Th className="w-28">Status</Th>
            <Th>Message</Th>
            <Th className="w-32">Created</Th>
            <Th className="w-24">Actions</Th>
          </THead>

          {loading ? (
            <TableSkeleton rows={6} cols={8} />
          ) : (
            <TBody>
              {paginatedContacts.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <EmptyState
                      icon={Inbox}
                      title={search || statusFilter ? "No matching leads" : "No enquiries yet"}
                      message={
                        search || statusFilter
                          ? "Try a different search term or status filter."
                          : "Submissions from the website contact form land here."
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((contact, index) => (
                  <Tr key={contact.id}>
                    <Td className="text-gray-400">{(page - 1) * limit + index + 1}</Td>
                    <Td className="font-medium text-gray-900">{contact.name}</Td>
                    <Td className="text-gray-500">{contact.email}</Td>
                    <Td className="whitespace-nowrap text-gray-500">{contact.number}</Td>
                    <Td>
                      <StatusBadge status={contact.status} />
                    </Td>
                    <Td className="max-w-sm text-gray-500">
                      <span className="line-clamp-2">{contact.message}</span>
                    </Td>
                    <Td className="whitespace-nowrap text-gray-500">
                      {fmtDate(contact.created_at)}
                    </Td>
                    <Td>
                      <RowActions
                        onEdit={() => navigate(`/edit-contact/${contact.id}`)}
                        onDelete={() => handleDeleteClick(contact)}
                        editLabel="Edit lead"
                        deleteLabel="Delete lead"
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
        title="Delete Contact Lead"
        itemName={selectedContact?.email}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        loading={deleting}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
}

export default ContactLeads;
