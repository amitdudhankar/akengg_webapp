import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser } from "../api/api";
import toast from "react-hot-toast";
import {
  getFirstValidationError,
  validateLoginForm,
} from "../utils/userValidation";
import AuthLayout from "../components/ui/AuthLayout";
import Field from "../components/ui/Field";
import PasswordField from "../components/ui/PasswordField";
import Button from "../components/ui/Button";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBlur = (field, values) => {
    const nextErrors = validateLoginForm(values);
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: nextErrors[field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedValues = {
      email: email.trim().toLowerCase(),
      password,
    };
    const nextErrors = validateLoginForm(trimmedValues);
    const firstError = getFirstValidationError(nextErrors);

    setErrors(nextErrors);

    if (firstError) {
      toast.error(firstError);
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Logging in...");

    try {
      const response = await loginUser(trimmedValues);
      const loginData = response?.data?.data;
      const token = loginData?.token;
      const user = loginData?.user;

      if (!token || !user) {
        throw new Error("Invalid login response received from server.");
      }

      login({ token, user });

      toast.success(response?.data?.message || "Login successful!", {
        id: loadingToast,
      });

      navigate("/");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || "Login failed",
        {
          id: loadingToast,
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Manage your website content and GST documents."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => handleBlur("email", { email, password })}
          error={errors.email}
          placeholder="you@example.com"
          autoComplete="username"
          maxLength={150}
          required
        />

        <PasswordField
          label="Password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => handleBlur("password", { email, password })}
          error={errors.password}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-indigo-600 transition hover:text-indigo-800 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default Login;
