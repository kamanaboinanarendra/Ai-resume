import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import api from '../services/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: trimmedEmail });
      const msg = response.data?.message || 'If an account exists with this email, a 6-digit verification code has been sent.';
      setSuccessMessage(msg);

      // Transition to code verification page with email state
      setTimeout(() => {
        navigate('/verify-reset-code', { state: { email: trimmedEmail } });
      }, 1500);
    } catch (err) {
      if (err.response?.status === 503) {
        setError(
          'Password recovery is temporarily unavailable because the email delivery service is not configured on the server. Please contact support or try again later.'
        );
      } else if (err.response?.status === 429) {
        setError(err.response?.data?.detail || 'Too many reset requests. Please wait a minute before requesting another code.');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Unable to connect to the backend server. Please verify your connection or try again later.');
      } else {
        setError(err.response?.data?.detail || 'Unable to process your password reset request. Please try again.');
      }
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
          Forgot your password?
        </h2>
        <p className="mt-1.5 text-xs text-[#6B7280]">
          Enter your registered email address and we'll send a 6-digit verification code.
        </p>
      </div>

      {/* Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl border border-[#E5E7EB] rounded-3xl">
          {/* Error Message */}
          {error && (
            <div className="mb-5 space-y-2">
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-[#DC2626]">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              {error.includes('email delivery service is not configured') && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                  <span className="font-bold">Setup Instructions:</span> Add <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">SMTP_HOST</code>, <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">SMTP_USER</code>, and <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">SMTP_PASSWORD</code> in <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">backend/.env</code> to enable live email delivery.
                </div>
              )}
            </div>
          )}


          {/* Success Message */}
          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#222222] mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-gray-50 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828] focus:bg-white text-[#222222] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Verification Code...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-5 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-2 text-[11px] text-gray-600">
            <ShieldCheck className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <span>Codes are cryptographically generated, expire in 10 minutes, and are rate-limited to protect your account.</span>
          </div>

          {/* Back to Login Link */}
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
