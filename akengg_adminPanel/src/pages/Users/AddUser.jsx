import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { addUser } from "../../api/api";
import {
  getFirstValidationError,
  normalizeUserPayload,
  validateCreateUserForm,
} from "../../utils/userValidation";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import FormActions from "../../components/ui/FormActions";

const AddUser = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
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

  // An employee cannot mint an admin account.
  const roleOptions = [
    { value: "", label: "Select Role" },
    ...(userRole !== "employee" ? [{ value: "admin", label: "Admin" }] : []),
    { value: "employee", label: "Employee" },
  ];

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
    setFormData({ ...formData, [name]: nextValue });
  };

  const handleBlur = (field) => {
    validateAndSetFieldError(field, formData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const nextErrors = validateCreateUserForm(formData);
    const firstError = getFirstValidationError(nextErrors);

    setErrors(nextErrors);

    if (firstError) {
      toast.error(firstError);
      return;
    }

    setSaving(true);
    const payload = { ...formData };
    delete payload.confirmPassword;
    const normalizedPayload = normalizeUserPayload(payload);
    const loadingToast = toast.loading("Creating user...");

    try {
      const response = await addUser(normalizedPayload);
      toast.success(response?.data?.message || "User created successfully!", {
        id: loadingToast,
      });
      navigate("/users");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create user", {
        id: loadingToast,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title="Add User"
        subtitle="Create an account that can sign in to this admin panel."
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          onBlur={() => handleBlur("name")}
          error={errors.name}
          placeholder="Full Name"
          required
        />
        <Field
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={() => handleBlur("email")}
          error={errors.email}
          placeholder="name@company.com"
          required
        />
        <Field
          label="Phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          onBlur={() => handleBlur("phone")}
          error={errors.phone}
          placeholder="Phone number"
        />
        <Field
          label="Role"
          name="role"
          as="select"
          options={roleOptions}
          value={formData.role}
          onChange={handleChange}
          onBlur={() => handleBlur("role")}
          error={errors.role}
          required
        />
        <Field
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          onBlur={() => handleBlur("password")}
          error={errors.password}
          placeholder="Password"
          required
        />
        <Field
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          onBlur={() => handleBlur("confirmPassword")}
          error={errors.confirmPassword}
          placeholder="Re-enter password"
          required
        />

        <FormActions
          saving={saving}
          submitLabel="Create User"
          onCancel={() => navigate("/users")}
        />
      </form>
    </Card>
  );
};

export default AddUser;
