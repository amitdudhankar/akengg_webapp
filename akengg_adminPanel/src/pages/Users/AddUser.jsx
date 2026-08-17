import { StepBack } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { addUser } from "../../api/api";
import {
  getFirstValidationError,
  normalizeUserPayload,
  validateCreateUserForm,
} from "../../utils/userValidation";

const AddUser = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState("");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const storedUserData = localStorage.getItem("userData");
    if (storedUserData) {
      const parsedData = JSON.parse(storedUserData);
      setUserRole(parsedData.role);
    }
  }, []);

  const validateAndSetFieldError = (field, nextFormData) => {
    const nextErrors = validateCreateUserForm(nextFormData);
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: nextErrors[field],
      ...(field === "password" ? { confirmPassword: nextErrors.confirmPassword } : {}),
      ...(field === "confirmPassword" ? { password: nextErrors.password } : {}),
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === "email" ? value.toLowerCase() : value;
    const nextFormData = { ...formData, [name]: nextValue };

    setFormData(nextFormData);
  };

  const handleBlur = (field) => {
    validateAndSetFieldError(field, formData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validateCreateUserForm(formData);
    const firstError = getFirstValidationError(nextErrors);

    setErrors(nextErrors);

    if (firstError) {
      toast.error(firstError);
      return;
    }

    const { confirmPassword, ...payload } = formData;
    const normalizedPayload = normalizeUserPayload(payload);
    const loadingToast = toast.loading("Creating user...");

    try {
      const response = await addUser(normalizedPayload);

      toast.success(response?.data?.message || "User created successfully!", {
        id: loadingToast,
      });
      navigate("/users");
    } catch (error) {
      console.error("User creation failed:", error);

      toast.error(error?.response?.data?.message || "Failed to create user", {
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
          <h1 className="text-2xl font-bold text-indigo-600">Add User</h1>
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
            required
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
            required
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
            {userRole !== "employee" && <option value="admin">Admin</option>}
            <option value="employee">Employee</option>
          </select>
          {errors.role ? (
            <p className="mt-1 text-sm text-red-600">{errors.role}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-base font-medium mb-1">Password</label>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            onBlur={() => handleBlur("password")}
            minLength={8}
            maxLength={64}
            required
            className="w-full rounded-md border border-gray-300 p-2"
          />
          {errors.password ? (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              Use 8-64 characters with uppercase, lowercase, and a number.
            </p>
          )}
        </div>

        <div>
          <label className="block text-base font-medium mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={() => handleBlur("confirmPassword")}
            required
            className="w-full rounded-md border border-gray-300 p-2"
          />
          {errors.confirmPassword ? (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
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

export default AddUser;
