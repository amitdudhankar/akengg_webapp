import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Plus, MessageSquareQuote } from "lucide-react";
import { fetchTestimonials, deleteTestimonial } from "../../api/api";
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

function TestimonialsList() {
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getTestimonials = async () => {
    try {
      const res = await fetchTestimonials();
      setTestimonials(res?.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch testimonials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTestimonials();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return testimonials;
    return testimonials.filter((item) =>
      [item.client_name, item.company, item.content]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [testimonials, search]);

  useEffect(() => {
    const next = Math.max(1, Math.ceil(filtered.length / limit));
    setTotalPages(next);
    setPage((current) => Math.min(current, next));
  }, [filtered.length, limit]);

  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const handleDeleteClick = (item) => {
    setSelected(item);
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
      const res = await deleteTestimonial(selected.id);
      toast.success(res?.data?.message || "Testimonial deleted successfully");
      setIsModalOpen(false);
      setSelected(null);
      getTestimonials();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete testimonial");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title="Testimonials"
        subtitle={`${testimonials.length} testimonial${testimonials.length === 1 ? "" : "s"} in the homepage slider`}
      >
        <SearchInput
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search testimonials..."
        />
        <Button icon={Plus} onClick={() => navigate("/testimonials/add")} className="shrink-0">
          Add Testimonial
        </Button>
      </PageHeader>

      <TableWrap>
        <Table>
          <THead>
            <Th className="w-16">#</Th>
            <Th>Client</Th>
            <Th>Company</Th>
            <Th>Testimonial</Th>
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
                      icon={MessageSquareQuote}
                      title={search ? "No matching testimonials" : "No testimonials yet"}
                      message={
                        search
                          ? "Try a different search term."
                          : "These appear in the slider on the homepage."
                      }
                      action={
                        !search && (
                          <Button icon={Plus} onClick={() => navigate("/testimonials/add")}>
                            Add Testimonial
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginated.map((item, index) => (
                  <Tr key={item.id}>
                    <Td className="text-gray-400">{(page - 1) * limit + index + 1}</Td>
                    <Td className="font-medium text-gray-900">{item.client_name}</Td>
                    <Td className="text-gray-500">{item.company || "—"}</Td>
                    <Td className="max-w-md text-gray-500">
                      <span className="line-clamp-2">{item.content}</span>
                    </Td>
                    <Td className="text-gray-500">{item.sort_order}</Td>
                    <Td>
                      <RowActions
                        onEdit={() => navigate(`/testimonials/edit/${item.id}`)}
                        onDelete={() => handleDeleteClick(item)}
                        editLabel="Edit testimonial"
                        deleteLabel="Delete testimonial"
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
        title="Delete Testimonial"
        itemName={selected?.client_name}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        loading={deleting}
      />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
}

export default TestimonialsList;
