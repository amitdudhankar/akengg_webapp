import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser } from "../api/api";
import toast from "react-hot-toast";
import {
  getFirstValidationError,
  validateLoginForm,
} from "../utils/userValidation";

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
      console.error("Login failed:", error);

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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 shadow-md rounded-xl">
        <div className="flex justify-center mb-6">
          <img
            src="/assets/LogoRemoveBG.png"
            alt="A K Engg Admin"
            className="h-16"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur("email", { email, password })}
              className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="amit@example.com"
              maxLength={150}
              required
            />
            {errors.email ? (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleBlur("password", { email, password })}
              className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your password"
              required
            />
            {errors.password ? (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            ) : null}
          </div>
          <Link to="/forgot-password">
            <p className="text-sm text-blue-600 hover:underline cursor-pointer mb-4">
              Forgot Password
            </p>
          </Link>{" "}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
