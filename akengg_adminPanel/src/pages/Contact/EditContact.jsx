import { StepBack } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { fetchContactById, updateContact } from "../../api/api";
import {
  getFirstContactError,
  normalizeContactPayload,
  validateContactUpdateForm,
} from "../../utils/contactValidation";

const EditContact = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    number: "",
    email: "",
    message: "",
    status: "new",
  });

  useEffect(() => {
    const getContact = async () => {
      try {
        const response = await fetchContactById(id);
        const contact = response?.data?.data;

        if (contact) {
          setFormData({
            name: contact.name || "",
            number: contact.number || "",
            email: contact.email || "",
            message: contact.message || "",
            status: contact.status || "new",
          });
        }
      } catch (error) {
        console.error("Failed to fetch contact:", error);
        toast.error(error?.response?.data?.message || "Failed to fetch contact");
      }
    };

    getContact();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue =
      name === "email" || name === "status" ? value.toLowerCase() : value;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: nextValue,
    }));
  };

  const handleBlur = (field) => {
    const nextErrors = validateContactUpdateForm(formData);
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: nextErrors[field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validateContactUpdateForm(formData);
    const firstError = getFirstContactError(nextErrors);

    setErrors(nextErrors);

    if (firstError) {
      toast.error(firstError);
      return;
    }

    const normalizedPayload = normalizeContactPayload(formData);
    const loadingToast = toast.loading("Updating contact...");

    try {
      const response = await updateContact(id, normalizedPayload);
      toast.success(response?.data?.message || "Contact updated successfully!", {
        id: loadingToast,
      });
      navigate("/contact-leads");
    } catch (error) {
      console.error("Contact update failed:", error);
      toast.error(
        error?.response?.data?.message || "Failed to update contact",
        {
          id: loadingToast,
        }
      );
    }
  };

  return (
    <div className="mx-auto h-auto w-full rounded-lg bg-white p-4 shadow-md sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-indigo-600 transition hover:text-indigo-800 text-sm font-medium"
          >
            <StepBack />
          </button>
          <h1 className="text-2xl font-bold text-indigo-600">Edit Contact</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-base font-medium">Full Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={() => handleBlur("name")}
            className="w-full rounded-md border border-gray-300 p-2"
          />
          {errors.name ? (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-base font-medium">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={() => handleBlur("email")}
            maxLength={150}
            className="w-full rounded-md border border-gray-300 p-2"
          />
          {errors.email ? (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-base font-medium">Number</label>
          <input
            type="tel"
            name="number"
            value={formData.number}
            onChange={handleChange}
            onBlur={() => handleBlur("number")}
            className="w-full rounded-md border border-gray-300 p-2"
          />
          {errors.number ? (
            <p className="mt-1 text-sm text-red-600">{errors.number}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-base font-medium">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            onBlur={() => handleBlur("status")}
            className="w-full rounded-md border border-gray-300 p-2"
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </select>
          {errors.status ? (
            <p className="mt-1 text-sm text-red-600">{errors.status}</p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-base font-medium">Message</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            onBlur={() => handleBlur("message")}
            rows={6}
            className="w-full rounded-md border border-gray-300 p-2"
          />
          {errors.message ? (
            <p className="mt-1 text-sm text-red-600">{errors.message}</p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 sm:w-[200px]"
          >
            Update Contact
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditContact;
