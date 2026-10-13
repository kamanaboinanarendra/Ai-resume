import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, ShieldCheck, LogOut, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [resumeCount, setResumeCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await api.get('/resumes');
        setResumeCount(res.data?.length || 0);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCounts();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="border-b border-[#E5E7EB] pb-5 mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">
          Account Settings & Profile
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
          Manage your account credentials and personal preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Profile Card */}
        <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-[#D62828] text-white flex items-center justify-center font-black text-2xl shadow-md mb-4">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <h2 className="text-lg font-bold text-[#222222]">{user?.name}</h2>
          <p className="text-xs text-[#6B7280] mt-0.5">{user?.email}</p>

          <div className="w-full border-t border-[#E5E7EB] mt-6 pt-5 flex items-center justify-around text-xs">
            <div>
              <span className="font-bold text-base text-[#222222] block">{resumeCount}</span>
              <span className="text-[#6B7280] text-[11px]">Resumes</span>
            </div>
            <div className="h-8 w-[1px] bg-gray-200"></div>
            <div>
              <span className="font-bold text-base text-emerald-600 block">Active</span>
              <span className="text-[#6B7280] text-[11px]">Status</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full mt-6 py-2.5 px-4 border border-red-200 text-[#DC2626] hover:bg-red-50 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Right Details Panel */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#222222] flex items-center gap-2">
              <User className="w-4 h-4 text-[#D62828]" />
              <span>Personal Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Full Name</label>
                <div className="p-2.5 bg-gray-50 border border-[#E5E7EB] rounded-xl text-[#222222] font-medium">
                  {user?.name}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Email Address</label>
                <div className="p-2.5 bg-gray-50 border border-[#E5E7EB] rounded-xl text-[#222222] font-medium truncate">
                  {user?.email}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Account Created</label>
                <div className="p-2.5 bg-gray-50 border border-[#E5E7EB] rounded-xl text-[#222222] font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active'}</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Security Standard</label>
                <div className="p-2.5 bg-gray-50 border border-[#E5E7EB] rounded-xl text-emerald-700 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bcrypt Encrypted & JWT</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#FFF7F7] p-5 rounded-3xl border border-[#E5E7EB] flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#222222]">AI Integration Ready</h4>
              <p className="text-[11px] text-[#6B7280] mt-0.5">
                Google Gemini API connects server-side automatically through the backend environment. Your credentials and resumes are safely isolated.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
