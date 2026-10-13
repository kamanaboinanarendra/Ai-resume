import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FileText, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import api from '../services/api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || '';
  const resetToken = location.state?.reset_token || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // If no reset token is present in state, prompt to start recovery
  if (!resetToken) {
    return (
      <div className="min-h-screen bg-[#FFF7F7] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
          <div className="bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[#222222]">Session Expired or Missing Token</h2>
            <p className="text-xs text-[#6B7280]">
              To reset your password, you must first verify a 6-digit code sent to your registered email address.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              Start Password Recovery
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend password validation
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            successMessage: 'Password reset successfully. Please log in with your new password.',
            email: email.trim(),
          },
        });
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Failed to reset password. Your reset session may have expired. Please try again.'
      );
    } finally {
      setLoading(false);
    }

  };

  return (
    <div className="min-h-screen bg-[#FFF7F7] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-11 h-11 rounded-2xl bg-[#D62828] flex items-center justify-center text-white shadow-md group-hover:bg-[#A61B1B] transition-colors">
            <FileText className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight text-[#222222]">
            AI Resume <span className="text-[#D62828]">Builder</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-extrabold text-[#222222] tracking-tight">
          Create New Password
        </h2>
        <p className="mt-1.5 text-xs text-[#6B7280]">
          Enter your new password below to secure your account.
        </p>
      </div>

      {/* Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl border border-[#E5E7EB] rounded-3xl">
          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-[#DC2626]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Password Reset Successfully!</h3>
              <p className="text-xs text-gray-600">
                Your password has been updated securely. Redirecting you to sign in...
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  state={{
                    successMessage: 'Password reset successfully. Please log in with your new password.',
                    email: email.trim(),
                  }}
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#D62828] hover:underline"
                >
                  <span>Go to Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* Field 1: New Password */}
              <div>
                <label htmlFor="newPassword" className="block text-xs font-semibold text-[#222222] mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-gray-50 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828] focus:bg-white text-[#222222] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Field 2: Confirm New Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[#222222] mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-gray-50 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828] focus:bg-white text-[#222222] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Quality Checklist */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-[11px] space-y-1 text-gray-600">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${newPassword.length >= 8 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <span>Minimum 8 characters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${newPassword && newPassword === confirmPassword ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <span>Passwords match</span>
                </div>
              </div>

              {/* Reset Password Button */}
              <button
                type="submit"
                disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                className="w-full py-3 px-4 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Return to Login */}
          <div className="mt-6 pt-5 border-t border-[#E5E7EB] text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B7280] hover:text-[#222222] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
