import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { updateUser, fetchUserById } from "../../api/api";
import {
  getFirstValidationError,
  normalizeUserPayload,
  validateUpdateUserForm,
} from "../../utils/userValidation";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import FormActions from "../../components/ui/FormActions";

const ROLE_OPTIONS = [
  { value: "", label: "Select Role" },
  { value: "admin", label: "Admin" },
  { value: "employee", label: "Employee" },
];

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
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
        toast.error(error?.response?.data?.message || "Failed to fetch user data");
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
    if (saving) return;

    const nextErrors = validateUpdateUserForm(formData);
    const firstError = getFirstValidationError(nextErrors);

    setErrors(nextErrors);

    if (firstError) {
      toast.error(firstError);
      return;
    }

    setSaving(true);
    const normalizedPayload = normalizeUserPayload(formData);
    const loadingToast = toast.loading("Updating user...");

    try {
      const response = await updateUser(id, normalizedPayload);
      toast.success(response?.data?.message || "User updated successfully!", {
        id: loadingToast,
      });
      navigate("/users");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update user", {
        id: loadingToast,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <PageHeader
        title="Edit User"
        subtitle="Change the account details or role."
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
          required
        />
        <Field
          label="Phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          onBlur={() => handleBlur("phone")}
          error={errors.phone}
        />
        <Field
          label="Role"
          name="role"
          as="select"
          options={ROLE_OPTIONS}
          value={formData.role}
          onChange={handleChange}
          onBlur={() => handleBlur("role")}
          error={errors.role}
          required
        />

        <FormActions
          saving={saving}
          submitLabel="Update User"
          onCancel={() => navigate("/users")}
        />
      </form>
    </Card>
  );
};

export default EditUser;
