import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Check } from "lucide-react";
import { resetUserPassword, sendEmailOTP, verifyEmailOTP } from "../api/api";
import AuthLayout from "../components/ui/AuthLayout";
import Field from "../components/ui/Field";
import PasswordField from "../components/ui/PasswordField";
import Button from "../components/ui/Button";

const STEPS = ["Email", "Verify", "New password"];

// Mirrors the server rule so the user gets the message before a round trip.
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;

function StepIndicator({ current }) {
  return (
    <ol className="mb-6 flex items-center gap-2">
      {STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const done = current > stepNumber;
        const active = current === stepNumber;

        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold transition ${
                done
                  ? "bg-emerald-100 text-emerald-700"
                  : active
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : stepNumber}
            </span>
            <span
              className={`hidden text-xs font-medium sm:block ${
                active ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {label}
            </span>
            {stepNumber < STEPS.length && (
              <span className={`h-px flex-1 ${done ? "bg-emerald-200" : "bg-gray-100"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Proof that step 2 succeeded. The server requires it in step 3, so the OTP
  // check cannot be skipped by calling reset-password directly.
  const [resetToken, setResetToken] = useState("");

  const sendOtp = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim()) return toast.error("Please enter your email.");

    setBusy(true);
    const loadingToastId = toast.loading("Sending OTP...");
    try {
      const response = await sendEmailOTP({ email: email.trim().toLowerCase() });
      toast.success(response.data.message || "OTP sent to your email.", {
        id: loadingToastId,
      });
      setStep(2);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to send OTP. Please try again.",
        { id: loadingToastId }
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!otp.trim()) return toast.error("Please enter the OTP.");

    setBusy(true);
    const loadingToastId = toast.loading("Verifying OTP...");
    try {
      const response = await verifyEmailOTP({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      const token = response.data?.data?.resetToken;
      if (!token) {
        throw new Error("No reset token returned by the server.");
      }

      setResetToken(token);
      toast.success(response.data.message || "OTP verified successfully.", {
        id: loadingToastId,
      });
      setStep(3);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Invalid OTP. Please try again.",
        { id: loadingToastId }
      );
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (busy) return;

    if (!newPassword || !confirmPassword)
      return toast.error("Please enter both password fields.");
    if (newPassword !== confirmPassword)
      return toast.error("Passwords do not match.");
    if (!resetToken)
      return toast.error("Your reset session expired. Please start again.");
    if (!PASSWORD_RULE.test(newPassword))
      return toast.error(
        "Password must be 8 to 64 characters and include uppercase, lowercase, and a number."
      );

    setBusy(true);
    const loadingToastId = toast.loading("Resetting password...");
    try {
      const response = await resetUserPassword({
        token: resetToken,
        newPassword,
      });
      toast.success(response.data.message || "Password reset successful.", {
        id: loadingToastId,
      });

      // Give the user a moment to read the success toast before redirecting.
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Failed to reset password. Please try again.",
        { id: loadingToastId }
      );
      setBusy(false);
    }
  };

  const subtitle =
    step === 1
      ? "We'll email you a code to verify it's you."
      : step === 2
        ? `Enter the code we sent to ${email}.`
        : "Choose a new password for your account.";

  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={subtitle}
      footer={
        <>
          Remembered your password?{" "}
          <Link
            to="/login"
            className="font-medium text-indigo-600 transition hover:text-indigo-800 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <StepIndicator current={step} />

      {step === 1 && (
        <form onSubmit={sendOtp} className="space-y-4">
          <Field
            label="Email Address"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="username"
            required
          />
          <Button type="submit" loading={busy} className="w-full">
            {busy ? "Sending..." : "Send OTP"}
          </Button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={verifyOtp} className="space-y-4">
          <Field
            label="One-time code"
            name="otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter the 6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            hint="The code expires shortly after it is sent."
            required
          />
          <Button type="submit" loading={busy} className="w-full">
            {busy ? "Verifying..." : "Verify OTP"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setOtp("");
              setStep(1);
            }}
            disabled={busy}
            className="w-full text-sm font-medium text-gray-500 transition hover:text-gray-700 disabled:opacity-60"
          >
            Use a different email
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={resetPassword} className="space-y-4">
          <PasswordField
            label="New Password"
            name="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            autoComplete="new-password"
            hint="8–64 characters, with an uppercase letter, a lowercase letter and a number."
            required
          />
          <PasswordField
            label="Confirm Password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            error={passwordsMismatch ? "Passwords do not match." : undefined}
            required
          />
          <Button type="submit" loading={busy} className="w-full">
            {busy ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
