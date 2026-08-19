import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Plus, Wrench } from "lucide-react";
import { fetchServices, deleteService } from "../../api/api";
import Pagination from "../../components/ui/Pagination";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import SearchInput from "../../components/ui/SearchInput";
import Button from "../../components/ui/Button";
import RowActions from "../../components/ui/RowActions";
import EmptyState from "../../components/ui/EmptyState";
import TableSkeleton from "../../components/ui/TableSkeleton";
import { TableWrap, Table, THead, Th, TBody, Tr, Td } from "../../components/ui/Table";

function ServicesList() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getServices = async () => {
    try {
      const res = await fetchServices();
      setServices(res?.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getServices();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return services;
    return services.filter((service) =>
      [service.title, service.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [services, search]);

  useEffect(() => {
    const next = Math.max(1, Math.ceil(filtered.length / limit));
    setTotalPages(next);
    setPage((current) => Math.min(current, next));
  }, [filtered.length, limit]);

  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleDeleteClick = (service) => {
    setSelected(service);
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
      const res = await deleteService(selected.id);
      toast.success(res?.data?.message || "Service deleted successfully");
      setIsModalOpen(false);
      setSelected(null);
      getServices();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete service");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title="Services"
        subtitle={`${services.length} service${services.length === 1 ? "" : "s"} on the website`}
      >
        <SearchInput
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search services..."
        />
        <Button icon={Plus} onClick={() => navigate("/services/add")} className="shrink-0">
          Add Service
        </Button>
      </PageHeader>

      <TableWrap>
        <Table>
          <THead>
            <Th className="w-16">#</Th>
            <Th>Title</Th>
            <Th>Description</Th>
            <Th className="w-24">Image</Th>
            <Th className="w-20">Order</Th>
            <Th className="w-24">Actions</Th>
          </THead>

          {loading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
            <TBody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <EmptyState
                      icon={Wrench}
                      title={search ? "No matching services" : "No services yet"}
                      message={
                        search
                          ? "Try a different search term."
                          : "Add a service and it appears on the website straight away."
                      }
                      action={
                        !search && (
                          <Button icon={Plus} onClick={() => navigate("/services/add")}>
                            Add Service
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginated.map((service, index) => (
                  <Tr key={service.id}>
                    <Td className="text-gray-400">{(page - 1) * limit + index + 1}</Td>
                    <Td className="font-medium text-gray-900">{service.title}</Td>
                    <Td className="max-w-md truncate text-gray-500">{service.description}</Td>
                    <Td>
                      {service.image ? (
                        <img
                          src={service.image}
                          alt={service.title}
                          className="h-10 w-14 rounded-md border border-gray-200 object-cover"
                        />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </Td>
                    <Td className="text-gray-500">{service.sort_order}</Td>
                    <Td>
                      <RowActions
                        onEdit={() => navigate(`/services/edit/${service.id}`)}
                        onDelete={() => handleDeleteClick(service)}
                        editLabel="Edit service"
                        deleteLabel="Delete service"
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
        title="Delete Service"
        itemName={selected?.title}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        loading={deleting}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
}

export default ServicesList;
