import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { resetUserPassword, sendEmailOTP, verifyEmailOTP } from "../api/api";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Proof that step 2 succeeded. The server requires it in step 3, so the OTP
  // check cannot be skipped by calling reset-password directly.
  const [resetToken, setResetToken] = useState("");

  const sendOtp = async () => {
    if (!email) return toast.error("Please enter your email.");
    const loadingToastId = toast.loading("Sending OTP...");
    try {
      const response = await sendEmailOTP({ email });
      toast.dismiss(loadingToastId); // Remove loader
      toast.success(response.data.message || "OTP sent to your email.");
      setStep(2);
    } catch (err) {
      toast.dismiss(loadingToastId); // Remove loader on error
      console.error("OTP Send Error:", err);
      toast.error(
        err.response?.data?.message || "Failed to send OTP. Please try again."
      );
    }
  };

  const verifyOtp = async () => {
    if (!otp) return toast.error("Please enter the OTP.");
    const loadingToastId = toast.loading("Verifying OTP...");
    try {
      const response = await verifyEmailOTP({ email, otp });
      toast.dismiss(loadingToastId); // Dismiss loading

      const token = response.data?.data?.resetToken;
      if (!token) {
        throw new Error("No reset token returned by the server.");
      }

      setResetToken(token);
      toast.success(response.data.message || "OTP verified successfully.");
      setStep(3);
    } catch (err) {
      toast.dismiss(loadingToastId); // Dismiss loading on error
      console.error("OTP Verification Error:", err);
      toast.error(
        err.response?.data?.message || "Invalid OTP. Please try again."
      );
    }
  };

  const resetPassword = async () => {
    if (!newPassword || !confirmPassword)
      return toast.error("Please enter both password fields.");
    if (newPassword !== confirmPassword)
      return toast.error("Passwords do not match.");
    if (!resetToken)
      return toast.error("Your reset session expired. Please start again.");
    // Mirrors the server rule so the user gets the message before a round trip.
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/.test(newPassword))
      return toast.error(
        "Password must be 8 to 64 characters and include uppercase, lowercase, and a number."
      );
    try {
      const response = await resetUserPassword({
        token: resetToken,
        newPassword,
      });
      toast.success(response.data.message || "Password reset successful.");

      // Show loading toast
      const loadingToastId = toast.loading("Redirecting to login...");

      setTimeout(() => {
        toast.dismiss(loadingToastId); // remove loader
        navigate("/login");
      }, 1500); // allow user to read the success toast
    } catch (err) {
      console.error("Password Reset Error:", err);
      toast.error(
        err.response?.data?.message ||
          "Failed to reset password. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-indigo-600 mb-6">
          Forgot Password
        </h2>

        {step === 1 && (
          <>
            <label className="block text-gray-700 font-medium mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-4 border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={sendOtp}
              className="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
            >
              Send OTP
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <label className="block text-gray-700 font-medium mb-1">
              OTP (sent to {email})
            </label>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full mb-4 border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={verifyOtp}
              className="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
            >
              Verify OTP
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <label className="block text-gray-700 font-medium mb-1">
              New Password
            </label>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full mb-4 border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <label className="block text-gray-700 font-medium mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full mb-4 border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={resetPassword}
              className="w-full bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition"
            >
              Reset Password
            </button>
          </>
        )}

        <div className="mt-4 text-center text-sm text-gray-500">
          Remembered your password?{" "}
          <a href="/login" className="text-indigo-600 hover:underline">
            Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
