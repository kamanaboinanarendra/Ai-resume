import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  PlusCircle, FolderGit2, Sparkles, FileText, ArrowRight, 
  Calendar, Eye, Download, Layout, Layers, CheckCircle2, Edit3, Target 
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAIChat } from '../context/AIChatContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const { setIsOpen: setOpenAIChat, setIsMinimized } = useAIChat();
  const navigate = useNavigate();

  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/resumes');
        setResumes(res.data || []);
      } catch (err) {
        console.error('Failed to fetch user resumes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const handleDownloadPDF = async (resumeId, title) => {
    try {
      const response = await api.get(`/resumes/${resumeId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Hero Welcome Banner */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden mb-10">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF7F7] border border-[#E5E7EB] text-[#D62828] text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Resume Engineering</span>
          </div>

          {/* Exact required heading and subtitle */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#222222] tracking-tight">
            Welcome to Your AI Resume Builder
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#6B7280] leading-relaxed">
            Create, improve, and manage your professional resumes with AI.
          </p>

          {/* Working Primary Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/templates"
              className="px-5 py-2.5 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Resume</span>
            </Link>

            <Link
              to="/builder"
              className="px-4 py-2.5 bg-[#FFF7F7] border border-[#D62828]/40 hover:border-[#D62828] text-[#D62828] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
              title={resumes.length > 0 ? `Continue editing: ${resumes[0].title}` : 'Edit Resume'}
            >
              <Edit3 className="w-4 h-4 text-[#D62828]" />
              <span>Edit Resume</span>
            </Link>

            <Link
              to="/ats-checker"
              className="px-4 py-2.5 bg-gradient-to-r from-[#D62828] to-[#B91C1C] hover:from-[#B91C1C] hover:to-[#991B1B] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
              title="Check your resume ATS score and get actionable feedback"
            >
              <Target className="w-4 h-4" />
              <span>ATS Resume Score</span>
            </Link>

            <Link
              to="/my-resumes"
              className="px-4 py-2.5 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[#222222] text-xs font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              <FolderGit2 className="w-4 h-4 text-[#D62828]" />
              <span>My Resumes</span>
            </Link>

            <button
              onClick={() => {
                setOpenAIChat(true);
                setIsMinimized(false);
              }}
              className="px-4 py-2.5 bg-[#FFF7F7] border border-[#D62828]/30 hover:border-[#D62828] text-[#D62828] text-xs font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Resume Assistance</span>
            </button>
          </div>
        </div>

        {/* Decorative corner accent */}
        <div className="hidden lg:block absolute -right-10 -bottom-10 w-72 h-72 bg-[#FFF7F7] rounded-full -z-0 opacity-80 border border-[#E5E7EB]/60"></div>
      </div>

      {/* Stats Overview Grid - 4 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Total Resumes</span>
            <div className="w-8 h-8 rounded-xl bg-[#FFF7F7] flex items-center justify-center text-[#D62828]">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#222222] mt-2">
            {loading ? '...' : resumes.length}
          </p>
          <span className="text-[11px] text-[#6B7280]">Real saved documents in database</span>
        </div>

        <Link
          to="/templates"
          id="available-templates-card"
          className="bg-white p-5 rounded-2xl border border-[#E5E7EB] hover:border-[#D62828] shadow-2xs hover:shadow-md transition-all block cursor-pointer group"
          title="Browse all 50 available resume templates"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] group-hover:text-[#D62828] transition-colors">Available Templates</span>
            <div className="w-8 h-8 rounded-xl bg-[#FFF7F7] group-hover:bg-[#D62828] group-hover:text-white flex items-center justify-center text-[#D62828] transition-all">
              <Layout className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#222222] mt-2 group-hover:text-[#D62828] transition-colors">50</p>
          <span className="text-[11px] text-[#D62828] font-semibold flex items-center gap-1 mt-0.5">
            <span>Explore all 50 unique templates</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>

        {/* ATS Score Checker Card */}
        <Link
          to="/ats-checker"
          className="bg-white p-5 rounded-2xl border border-[#E5E7EB] hover:border-[#D62828] shadow-2xs hover:shadow-md transition-all block cursor-pointer group"
          title="Analyze your resume with evidence-based ATS scoring"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280] group-hover:text-[#D62828] transition-colors">ATS Resume Score</span>
            <div className="w-8 h-8 rounded-xl bg-[#FFF7F7] group-hover:bg-[#D62828] group-hover:text-white flex items-center justify-center text-[#D62828] transition-all">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base font-bold text-[#222222] mt-3 group-hover:text-[#D62828] transition-colors">Audit & Score</p>
          <span className="text-[11px] text-[#D62828] font-semibold flex items-center gap-1 mt-0.5">
            <span>Check ATS Compatibility</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">AI Assistant Status</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-sm font-bold text-[#222222] mt-3">Ready on every page</p>
          <span className="text-[11px] text-[#6B7280]">Google GenAI floating assistant</span>
        </div>
      </div>

      {/* Recent Resumes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#222222]">Recent Resumes</h2>
            <p className="text-xs text-[#6B7280]">Continue editing or export your documents.</p>
          </div>
          {resumes.length > 0 && (
            <Link
              to="/my-resumes"
              className="text-xs font-semibold text-[#D62828] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-[#E5E7EB]">
            <div className="w-8 h-8 border-3 border-[#E5E7EB] border-t-[#D62828] rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-[#6B7280]">Loading your resumes...</p>
          </div>
        ) : resumes.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-6 text-center bg-white rounded-3xl border border-[#E5E7EB] shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF7F7] border border-[#E5E7EB] flex items-center justify-center mx-auto mb-3 text-[#D62828]">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#222222]">No resumes created yet</h3>
            <p className="text-xs text-[#6B7280] max-w-md mx-auto mt-1 mb-6">
              You haven't built any resumes yet. Start by exploring our 50 professional templates and create your first resume with AI assistance.
            </p>
            <Link
              to="/templates"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Resume</span>
            </Link>
          </div>
        ) : (
          /* Resumes Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {resumes.slice(0, 6).map((r) => (
              <div
                key={r.id}
                className="bg-white p-5 rounded-2xl border border-[#E5E7EB] hover:border-[#D62828]/40 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FFF7F7] text-[#D62828] border border-[#E5E7EB] uppercase tracking-wider">
                      {r.template_id}
                    </span>
                    <span className="text-[11px] text-[#6B7280] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(r.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-[#222222] truncate mb-1">
                    {r.title}
                  </h3>
                  <p className="text-xs text-[#6B7280] mb-4">
                    Revision #{r.revision}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E5E7EB] flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/builder/${r.id}`)}
                    className="flex-1 py-2 text-xs font-semibold bg-[#D62828] hover:bg-[#A61B1B] text-white rounded-xl shadow-xs transition-colors text-center"
                  >
                    Edit Resume
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(r.id, r.title)}
                    className="p-2 border border-[#E5E7EB] hover:bg-[#FFF7F7] text-[#6B7280] hover:text-[#D62828] rounded-xl transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
