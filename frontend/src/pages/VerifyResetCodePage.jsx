import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FileText, KeyRound, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, RefreshCw, Mail } from 'lucide-react';
import api from '../services/api';

export default function VerifyResetCodePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState(
    location.state?.email
      ? `A 6-digit verification code was dispatched to ${location.state.email}. Check your inbox and spam folder.`
      : ''
  );

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    const cleanCode = code.replace(/\D/g, '').trim();

    if (!trimmedEmail) {
      setError('Please provide your registered email address.');
      return;
    }
    if (cleanCode.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/verify-reset-code', {
        email: trimmedEmail,
        code: cleanCode,
      });

      if (response.data?.verified && response.data?.reset_token) {
        // Navigate to password reset with server-validated authorization token
        navigate('/reset-password', {
          state: {
            email: trimmedEmail,
            reset_token: response.data.reset_token,
          },
        });
      } else {
        setError('Verification succeeded, but no reset token was returned.');
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Invalid or expired verification code. Please check and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address to request a new code.');
      return;
    }

    setResending(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: trimmedEmail });
      setInfoMessage(`A fresh 6-digit code has been sent to ${trimmedEmail}.`);
      setCooldown(60); // 60 seconds cooldown
    } catch (err) {
      if (err.response?.status === 429) {
        setError(err.response?.data?.detail || 'Please wait before requesting another code.');
      } else {
        setError(err.response?.data?.detail || 'Failed to resend code. Please try again.');
      }
    } finally {
      setResending(false);
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
          Verify Reset Code
        </h2>
        <p className="mt-1.5 text-xs text-[#6B7280]">
          Enter the 6-digit verification code sent to your email.
        </p>
      </div>

      {/* Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl border border-[#E5E7EB] rounded-3xl">
          {/* Informational Message */}
          {infoMessage && (
            <div className="mb-5 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2.5 text-xs text-blue-800">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-blue-600" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-[#DC2626]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            {/* Email Field (editable if navigated directly) */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#222222] mb-1.5">
                Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2 text-xs bg-gray-50 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828] text-[#222222]"
                />
              </div>
            </div>

            {/* 6-Digit Verification Code */}
            <div>
              <label htmlFor="code" className="block text-xs font-semibold text-[#222222] mb-1.5">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="code"
                  type="text"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full pl-10 pr-3.5 py-2.5 text-center text-lg tracking-widest font-mono font-bold bg-gray-50 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828] focus:bg-white text-[#222222] transition-colors"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500 text-center">
                Code expires in 10 minutes. Maximum 5 verification attempts allowed.
              </p>
            </div>

            {/* Verify Code Button */}
            <button
              type="submit"
              disabled={loading || code.trim().length !== 6}
              className="w-full py-3 px-4 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating Code...</span>
                </>
              ) : (
                <>
                  <span>Verify Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Resend Code Section */}
          <div className="mt-5 text-center">
            {cooldown > 0 ? (
              <span className="text-xs text-gray-400">
                Resend code available in <strong className="text-gray-600">{cooldown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-xs font-semibold text-[#D62828] hover:underline inline-flex items-center gap-1 disabled:opacity-50"
              >
                {resending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Didn't receive a code? Resend Code</span>
              </button>
            )}
          </div>

          {/* Return to Login */}
          <div className="mt-6 pt-5 border-t border-[#E5E7EB] text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B7280] hover:text-[#222222] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
