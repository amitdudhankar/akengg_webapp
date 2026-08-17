import { StepBack } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { updateUser, fetchUserById } from "../../api/api";
import {
  getFirstValidationError,
  normalizeUserPayload,
  validateUpdateUserForm,
} from "../../utils/userValidation";

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetchUserById(id);
        const user = res.data?.data;

        if (user) {
          setFormData({
            name: user.name || "",
            email: user.email || "",
            phone: user.phone || "",
            role: user.role || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        toast.error("Failed to fetch user data");
      }
    };

    fetchUser();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === "email" ? value.toLowerCase() : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleBlur = (field) => {
    const nextErrors = validateUpdateUserForm(formData);
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: nextErrors[field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validateUpdateUserForm(formData);
    const firstError = getFirstValidationError(nextErrors);

    setErrors(nextErrors);

    if (firstError) {
      toast.error(firstError);
      return;
    }

    const normalizedPayload = normalizeUserPayload(formData);
    const loadingToast = toast.loading("Updating user...");

    try {
      const response = await updateUser(id, normalizedPayload);
      toast.success(response?.data?.message || "User updated successfully!", {
        id: loadingToast,
      });
      navigate("/users");
    } catch (error) {
      console.error("User update failed:", error);
      toast.error(error?.response?.data?.message || "Failed to update user", {
        id: loadingToast,
      });
    }
  };

  return (
    <div className="mx-auto h-auto w-full rounded-lg bg-white p-4 shadow-md sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-indigo-600 hover:text-indigo-800 transition text-sm font-medium"
          >
            <StepBack />
          </button>
          <h1 className="text-2xl font-bold text-indigo-600">Edit User</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-base font-medium mb-1">Full Name</label>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
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
          <label className="block text-base font-medium mb-1">Email</label>
          <input
            type="email"
            name="email"
            placeholder="Email"
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
          <label className="block text-base font-medium mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
            onBlur={() => handleBlur("phone")}
            className="w-full rounded-md border border-gray-300 p-2"
          />
          {errors.phone ? (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-base font-medium mb-1">Role</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            onBlur={() => handleBlur("role")}
            className="w-full rounded-md border border-gray-300 p-2"
          >
            <option value="">Select Role</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
          </select>
          {errors.role ? (
            <p className="mt-1 text-sm text-red-600">{errors.role}</p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 sm:w-[200px]"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditUser;
