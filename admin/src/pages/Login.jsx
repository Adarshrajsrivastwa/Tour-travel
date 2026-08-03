import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Bus, Shield, Loader2, Lock, Mail, Key } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { login as loginRequest } from "../api/login";
import { requestAdminPasswordReset, verifyAdminOTP, resetAdminPassword } from "../api/admin";
import { useAuth } from "../contexts/AuthContext";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetStep, setResetStep] = useState("email"); // 'email', 'otp', 'password'
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { login: authLogin, user } = useAuth();

  // Redirect based on user role if already logged in
  useEffect(() => {
    if (user) {
      // Driver/Conductor should go to bookings, full admin goes to dashboard
      if (user?.accountDetails?.isDriverOrConductor) {
        navigate("/bookings", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, navigate]);

  // React Query mutation for login
  const mutation = useMutation({
    mutationFn: (payload) => loginRequest(payload),
    onSuccess: (response) => {
      // API returns response.data = { success, message, data: { user, token } }
      const resData = response?.data;
      if (resData?.success) {
        const { user, token } = resData.data;

        // Update AuthContext state - PublicRoute will handle redirect automatically
        authLogin(user, token);
      } else {
        setError(resData?.message || "Invalid credentials");
      }
    },
    onError: (err) => {
      setError(
        err?.response?.data?.message || "Login failed. Please try again."
      );
    },
  });

  // React Query mutation for password reset OTP request
  const resetPasswordMutation = useMutation({
    mutationFn: (email) => requestAdminPasswordReset(email),
    onSuccess: (response) => {
      const resData = response?.data;
      if (resData?.success) {
        setResetMessage("Password reset code has been sent to your email. Please check your inbox.");
        setResetStep("otp");
      } else {
        setResetMessage(resData?.message || "Failed to send reset code");
      }
    },
    onError: (err) => {
      setResetMessage(
        err?.response?.data?.message || "Failed to send password reset code. Please try again."
      );
    },
  });

  // React Query mutation for OTP verification
  const verifyOTPMutation = useMutation({
    mutationFn: ({ email, otp }) => verifyAdminOTP(email, otp),
    onSuccess: (response) => {
      const resData = response?.data;
      if (resData?.success) {
        setResetMessage("");
        setResetStep("password");
      } else {
        setResetMessage(resData?.message || "Invalid OTP code");
      }
    },
    onError: (err) => {
      setResetMessage(
        err?.response?.data?.message || "Failed to verify OTP. Please try again."
      );
    },
  });

  // React Query mutation for password reset
  const resetPasswordFinalMutation = useMutation({
    mutationFn: ({ email, newPassword }) => resetAdminPassword(email, newPassword),
    onSuccess: (response) => {
      const resData = response?.data;
      if (resData?.success) {
        setResetMessage("Password reset successfully! Please login with your new password.");
        setTimeout(() => {
          setShowResetPassword(false);
          setResetStep("email");
          setResetEmail("");
          setOtp("");
          setNewPassword("");
          setConfirmPassword("");
          setResetMessage("");
        }, 3000);
      } else {
        setResetMessage(resData?.message || "Failed to reset password");
      }
    },
    onError: (err) => {
      setResetMessage(
        err?.response?.data?.message || "Failed to reset password. Please try again."
      );
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "password" && value.length > 100) {
      setError("Password must not exceed 100 characters");
      return;
    }

    setFormData({ ...formData, [name]: value });
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    mutation.mutate(formData);
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setResetMessage("");
    if (!resetEmail.trim()) {
      setResetMessage("Please enter your email address");
      return;
    }
    resetPasswordMutation.mutate(resetEmail.trim());
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    setResetMessage("");
    if (!otp.trim() || otp.length !== 6) {
      setResetMessage("Please enter a valid 6-digit OTP code");
      return;
    }
    verifyOTPMutation.mutate({ email: resetEmail.trim(), otp: otp.trim() });
  };

  const handleResetPasswordFinal = (e) => {
    e.preventDefault();
    setResetMessage("");
    if (!newPassword.trim()) {
      setResetMessage("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      setResetMessage("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetMessage("Passwords do not match");
      return;
    }
    resetPasswordFinalMutation.mutate({ email: resetEmail.trim(), newPassword: newPassword.trim() });
  };

  const handleCloseResetModal = () => {
    setShowResetPassword(false);
    setResetStep("email");
    setResetEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setResetMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="rounded-full w-50 h-38">
              <img
                src="/logo.png"
                alt="GR Tour & Travel Logo"
                srcSet="/logo.png"
                className="h-full w-full"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            GR Tour & Travel Admin
          </h1>
          <p className="text-gray-600 mt-2">Sign in to your admin account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8 relative">
          {mutation.isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-90 rounded-xl flex items-center justify-center z-10">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  Signing you in...
                </p>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  maxLength={50}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder-gray-400"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  maxLength={100}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder-gray-400"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={mutation.isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg"
            >
              {mutation.isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  <span>Sign In</span>
                </div>
              )}
            </button>
          </form>

          {/* Forgot Password Link - Outside form to avoid form submission issues */}
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setShowResetPassword(true)}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
            >
              Forgot Password?
            </button>
          </div>

          {/* Password Reset Modal */}
          {showResetPassword && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseResetModal();
              }
            }}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
                <div className="text-center mb-6">
                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="flex justify-center mb-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Lock className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Reset Password
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {resetStep === "email" && "Enter your administrative email to receive a password reset code"}
                    {resetStep === "otp" && "Enter the 6-digit code sent to your email"}
                    {resetStep === "password" && "Enter your new password"}
                  </p>
                </div>

                {/* Step 1: Email Input */}
                {resetStep === "email" && (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label
                        htmlFor="resetEmail"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Admin Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          id="resetEmail"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder-gray-400"
                          placeholder="Enter your admin email"
                          required
                          disabled={resetPasswordMutation.isLoading}
                        />
                      </div>
                    </div>

                    {resetMessage && (
                      <div
                        className={`p-3 rounded-lg text-sm ${
                          resetMessage.includes("sent")
                            ? "bg-green-50 border border-green-200 text-green-700"
                            : "bg-red-50 border border-red-200 text-red-600"
                        }`}
                      >
                        {resetMessage}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleCloseResetModal}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        disabled={resetPasswordMutation.isLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={resetPasswordMutation.isLoading}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {resetPasswordMutation.isLoading ? (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span>Sending...</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2" />
                            <span>Send Reset Code</span>
                          </div>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 2: OTP Verification */}
                {resetStep === "otp" && (
                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    <div>
                      <label
                        htmlFor="otp"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        OTP Code
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          id="otp"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder-gray-400 text-center text-2xl tracking-widest"
                          placeholder="000000"
                          maxLength={6}
                          required
                          disabled={verifyOTPMutation.isLoading}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code sent to {resetEmail}</p>
                    </div>

                    {resetMessage && (
                      <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
                        {resetMessage}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setResetStep("email");
                          setOtp("");
                          setResetMessage("");
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        disabled={verifyOTPMutation.isLoading}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={verifyOTPMutation.isLoading || otp.length !== 6}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {verifyOTPMutation.isLoading ? (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span>Verifying...</span>
                          </div>
                        ) : (
                          <span>Verify OTP</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 3: New Password */}
                {resetStep === "password" && (
                  <form onSubmit={handleResetPasswordFinal} className="space-y-4">
                    <div>
                      <label
                        htmlFor="newPassword"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          id="newPassword"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder-gray-400"
                          placeholder="Enter new password"
                          required
                          disabled={resetPasswordFinalMutation.isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          id="confirmPassword"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder-gray-400"
                          placeholder="Confirm new password"
                          required
                          disabled={resetPasswordFinalMutation.isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {resetMessage && (
                      <div
                        className={`p-3 rounded-lg text-sm ${
                          resetMessage.includes("successfully")
                            ? "bg-green-50 border border-green-200 text-green-700"
                            : "bg-red-50 border border-red-200 text-red-600"
                        }`}
                      >
                        {resetMessage}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setResetStep("otp");
                          setNewPassword("");
                          setConfirmPassword("");
                          setResetMessage("");
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        disabled={resetPasswordFinalMutation.isLoading}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={resetPasswordFinalMutation.isLoading || !newPassword || newPassword !== confirmPassword}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {resetPasswordFinalMutation.isLoading ? (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span>Resetting...</span>
                          </div>
                        ) : (
                          <span>Reset Password</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            © 2025 GR Tour & Travel Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { Eye, EyeOff, Bus, Shield } from "lucide-react";
// import { useMutation } from "@tanstack/react-query";
// import { login as loginRequest } from "../api/login";

// const Login = () => {
//   const [formData, setFormData] = useState({ email: "", password: "" });
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState("");
//   const navigate = useNavigate();

//   // React Query mutation
//   const mutation = useMutation({
//     mutationFn: (payload) => loginRequest(payload),
//     onSuccess: (data) => {
//       if (data?.data?.success) {
//         localStorage.setItem("token", data.data.token);
//         navigate("/dashboard");
//       } else {
//         setError(data?.data?.error || "Invalid credentials");
//       }
//     },
//     onError: (err) => {
//       setError(
//         err?.response?.data?.message || "Login failed. Please try again."
//       );
//     },
//   });

//   const handleChange = (e) => {
//     const { name, value } = e.target;

//     if (name === "password" && value.length > 100) {
//       setError("Password must not exceed 100 characters");
//       return;
//     }

//     setFormData({ ...formData, [name]: value });
//     setError("");
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     setError("");
//     mutation.mutate(formData);
//   };

//   return (
//     <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
//       <div className="max-w-md w-full">
//         {/* Header */}
//         <div className="text-center mb-8">
//           <div className="flex justify-center mb-4">
//             <div className="bg-blue-600 p-3 rounded-full">
//               <Bus className="h-8 w-8 text-white" />
//             </div>
//           </div>
//           <h1 className="text-3xl font-bold text-gray-900">Bus GR Tour & Travel Admin</h1>
//           <p className="text-gray-600 mt-2">Sign in to your admin account</p>
//         </div>

//         {/* Login Form */}
//         <div className="bg-white rounded-xl shadow-lg p-8">
//           <form onSubmit={handleSubmit} className="space-y-6">
//             {/* Email Field */}
//             <div>
//               <label
//                 htmlFor="email"
//                 className="block text-sm font-medium text-gray-700 mb-2"
//               >
//                 Email
//               </label>
//               <div className="relative">
//                 <input
//                   type="email"
//                   id="email"
//                   name="email"
//                   value={formData.email}
//                   onChange={handleChange}
//                   maxLength={50}
//                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder-gray-400"
//                   placeholder="Enter your email"
//                   required
//                 />
//               </div>
//             </div>

//             {/* Password Field */}
//             <div>
//               <label
//                 htmlFor="password"
//                 className="block text-sm font-medium text-gray-700 mb-2"
//               >
//                 Password
//               </label>
//               <div className="relative">
//                 <input
//                   type={showPassword ? "text" : "password"}
//                   id="password"
//                   name="password"
//                   value={formData.password}
//                   onChange={handleChange}
//                   maxLength={100}
//                   className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder-gray-400"
//                   placeholder="Enter your password"
//                   required
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                 >
//                   {showPassword ? (
//                     <EyeOff className="h-5 w-5" />
//                   ) : (
//                     <Eye className="h-5 w-5" />
//                   )}
//                 </button>
//               </div>
//             </div>

//             {/* Error Message */}
//             {error && (
//               <div className="bg-red-50 border border-red-200 rounded-lg p-3">
//                 <p className="text-red-600 text-sm">{error}</p>
//               </div>
//             )}

//             {/* Submit Button */}
//             <button
//               type="submit"
//               disabled={mutation.isLoading}
//               className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
//             >
//               {mutation.isLoading ? (
//                 <div className="flex items-center">
//                   <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
//                   Signing in...
//                 </div>
//               ) : (
//                 <div className="flex items-center">
//                   <Shield className="h-5 w-5 mr-2" />
//                   Sign In
//                 </div>
//               )}
//             </button>
//           </form>

//           {/* Demo Credentials */}
//           <div className="mt-6 p-4 bg-blue-50 rounded-lg">
//             <h3 className="text-sm font-medium text-blue-900 mb-2">
//               Demo Credentials:
//             </h3>
//             <p className="text-sm text-blue-700">
//               <strong>Email:</strong> admin@example.com
//               <br />
//               <strong>Password:</strong> admin123
//             </p>
//           </div>
//         </div>

//         {/* Footer */}
//         <div className="text-center mt-8">
//           <p className="text-gray-500 text-sm">
//             © 2024 Bus GR Tour & Travel Management System
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Login;
