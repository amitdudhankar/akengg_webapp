import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Pencil, Trash2 } from "lucide-react";
import { deleteContact, fetchContacts } from "../../api/api";
import Pagination from "../../components/ui/Pagination";
import DeleteContactModal from "./DeleteContactModal";
import * as XLSX from "xlsx";

function ContactLeads() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [isChecked, setIsChecked] = useState(false);

  const getContacts = async () => {
    try {
      const response = await fetchContacts({
        status: statusFilter || undefined,
      });
      const contactsData = response?.data?.data || [];

      setContacts(contactsData);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error(error?.response?.data?.message || "Failed to fetch contacts");
    }
  };

  useEffect(() => {
    getContacts();
  }, [statusFilter]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return contacts;
    }

    return contacts.filter((contact) =>
      [
        contact.name,
        contact.email,
        contact.number,
        contact.message,
        contact.status,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [contacts, search]);

  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil(filteredContacts.length / limit));

    setTotalPages(nextTotalPages);
    setPage((currentPage) => Math.min(currentPage, nextTotalPages));
  }, [filteredContacts.length, limit]);

  const paginatedContacts = filteredContacts.slice(
    (page - 1) * limit,
    page * limit
  );

  const handlePageChange = (pageNumber) => setPage(pageNumber);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleEditClick = (id) => {
    navigate(`/edit-contact/${id}`);
  };

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

    try {
      const response = await deleteContact(selectedContact.id);

      toast.success(response?.data?.message || "Contact deleted successfully!");
      setIsModalOpen(false);
      setSelectedContact(null);
      getContacts();
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error(
        error?.response?.data?.message || "Failed to delete contact"
      );
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
    } catch (error) {
      console.error("Error exporting contacts:", error);
      toast.error("Failed to export contacts to Excel.");
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-indigo-600">Contact Leads</h1>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-5">
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={handleSearchChange}
            className="w-full rounded-md border border-gray-300 p-2 sm:min-w-[220px]"
          />
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="w-full rounded-md border border-gray-300 p-2 sm:min-w-[180px]"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </select>
          <button
            onClick={handleExportToExcel}
            className="w-full shrink-0 whitespace-nowrap rounded-lg bg-gradient-to-r from-[#217346] to-[#1e623d] px-4 py-2 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#217346] focus:ring-opacity-50 sm:w-auto"
          >
            Export to Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border border-gray-200 divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">
                Sr. No
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">
                Full Name
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">
                Email
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">
                Phone Number
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">
                Status
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">
                Message
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">
                Created At
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedContacts.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-4 text-center text-gray-500">
                  No contact leads found.
                </td>
              </tr>
            ) : (
              paginatedContacts.map((contact, index) => (
                <tr key={contact.id}>
                  <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                  <td className="px-4 py-2">{contact.name}</td>
                  <td className="px-4 py-2">{contact.email}</td>
                  <td className="px-4 py-2">{contact.number}</td>
                  <td className="px-4 py-2 capitalize">{contact.status}</td>
                  <td className="px-4 py-2">{contact.message}</td>
                  <td className="px-4 py-2">
                    {new Date(contact.created_at)
                      .toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                      .toUpperCase()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-5">
                      <Pencil
                        className="cursor-pointer text-blue-600 hover:text-blue-800"
                        onClick={() => handleEditClick(contact.id)}
                      />
                      <Trash2
                        className="cursor-pointer text-red-600 hover:text-red-800"
                        onClick={() => handleDeleteClick(contact)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DeleteContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDeleteConfirmed}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        email={selectedContact?.email}
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

export default ContactLeads;
