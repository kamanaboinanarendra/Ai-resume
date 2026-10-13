import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  PlusCircle, Edit3, Eye, Download, Copy, Trash2, 
  Calendar, Layout, Sparkles, AlertTriangle, Check, X, FileText 
} from 'lucide-react';
import api from '../services/api';
import ResumeRenderer from '../templates/ResumeRenderer';

export default function MyResumesPage() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Rename Modal State
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fullscreen Preview Modal State
  const [previewResume, setPreviewResume] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchResumes = async () => {
    try {
      const res = await api.get('/resumes');
      setResumes(res.data || []);
    } catch (err) {
      console.error('Failed to load resumes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleDuplicate = async (resumeId) => {
    try {
      await api.post(`/resumes/${resumeId}/duplicate`);
      fetchResumes();
    } catch (err) {
      alert('Failed to duplicate resume.');
    }
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!renameTarget || !renameInput.trim()) return;
    try {
      await api.put(`/resumes/${renameTarget.id}`, {
        title: renameInput.trim()
      });
      setRenameTarget(null);
      fetchResumes();
    } catch (err) {
      alert('Failed to rename resume.');
    }
  };

  const handleEditResume = (resume) => {
    localStorage.setItem('last_active_resume_id', resume.id);
    localStorage.setItem('last_active_resume_title', resume.title);
    navigate(`/builder/${resume.id}`);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/resumes/${deleteTarget.id}`);
      if (localStorage.getItem('last_active_resume_id') === deleteTarget.id) {
        localStorage.removeItem('last_active_resume_id');
        localStorage.removeItem('last_active_resume_title');
      }
      setDeleteTarget(null);
      fetchResumes();
    } catch (err) {
      alert('Failed to delete resume.');
    }
  };

  const handleOpenPreview = async (resumeId) => {
    setPreviewLoading(true);
    try {
      const res = await api.get(`/resumes/${resumeId}`);
      setPreviewResume(res.data);
    } catch (err) {
      alert('Failed to load resume details.');
    } finally {
      setPreviewLoading(false);
    }
  };

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
      alert('Failed to generate PDF.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">
            My Saved Resumes
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            Manage, duplicate, rename, or download all your resumes stored in PostgreSQL.
          </p>
        </div>

        <Link
          to="/templates"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-bold rounded-xl shadow-md transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Resume</span>
        </Link>
      </div>

      {/* Resumes List / Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-3 border-[#E5E7EB] border-t-[#D62828] rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-[#6B7280]">Loading resumes from database...</p>
        </div>
      ) : resumes.length === 0 ? (
        <div className="py-20 px-6 text-center bg-white rounded-3xl border border-[#E5E7EB] shadow-xs">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#222222]">No resumes found</h3>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1 mb-6">
            You don't have any saved resumes. Select a template to start building.
          </p>
          <Link
            to="/templates"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-bold rounded-xl"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Choose a Template</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#D62828]/40 shadow-xs hover:shadow-lg transition-all p-5 flex flex-col justify-between"
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

                <h3 className="font-bold text-base text-[#222222] truncate mb-1">
                  {r.title}
                </h3>
                <p className="text-[11px] text-[#6B7280] mb-4">
                  Revision #{r.revision} • Last modified {new Date(r.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Working Actions Bar */}
              <div className="pt-3 border-t border-[#E5E7EB] space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditResume(r)}
                    className="flex-1 py-2 text-xs font-semibold bg-[#D62828] hover:bg-[#A61B1B] text-white rounded-xl shadow-xs transition-colors text-center flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleOpenPreview(r.id)}
                    className="flex-1 py-2 text-xs font-semibold bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[#222222] rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                </div>

                {/* Secondary Action Buttons (Download, Duplicate, Rename, Delete) */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  <button
                    onClick={() => handleDownloadPDF(r.id, r.title)}
                    className="py-1.5 text-[11px] font-medium border border-[#E5E7EB] hover:bg-[#FFF7F7] hover:text-[#D62828] rounded-lg flex items-center justify-center gap-1 transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-3 h-3" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>

                  <button
                    onClick={() => handleDuplicate(r.id)}
                    className="py-1.5 text-[11px] font-medium border border-[#E5E7EB] hover:bg-gray-50 text-[#6B7280] hover:text-[#222222] rounded-lg flex items-center justify-center gap-1 transition-colors"
                    title="Duplicate Resume"
                  >
                    <Copy className="w-3 h-3" />
                    <span className="hidden sm:inline">Copy</span>
                  </button>

                  <button
                    onClick={() => {
                      setRenameTarget(r);
                      setRenameInput(r.title);
                    }}
                    className="py-1.5 text-[11px] font-medium border border-[#E5E7EB] hover:bg-gray-50 text-[#6B7280] hover:text-[#222222] rounded-lg flex items-center justify-center gap-1 transition-colors"
                    title="Rename Resume"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span className="hidden sm:inline">Rename</span>
                  </button>

                  <button
                    onClick={() => setDeleteTarget(r)}
                    className="py-1.5 text-[11px] font-medium border border-[#E5E7EB] hover:bg-red-50 text-gray-500 hover:text-[#DC2626] rounded-lg flex items-center justify-center gap-1 transition-colors"
                    title="Delete Resume"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RENAME MODAL */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 bg-[#222222]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-sm text-[#222222] mb-1">Rename Resume</h3>
            <p className="text-xs text-[#6B7280] mb-4">Enter a new title for this resume record.</p>

            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828]"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-3 py-1.5 text-xs text-[#6B7280] hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameInput.trim()}
                  className="px-4 py-1.5 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-[#222222]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-100 text-[#DC2626] flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-[#222222] mb-1">Delete Resume?</h3>
            <p className="text-xs text-[#6B7280] mb-5">
              Are you sure you want to delete <strong className="text-[#222222]">"{deleteTarget.title}"</strong>? This action permanently removes it from PostgreSQL and cannot be undone.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-[#E5E7EB] text-xs font-medium text-[#222222] rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-[#DC2626] hover:bg-[#A61B1B] text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN PREVIEW MODAL */}
      {previewResume && (
        <div className="fixed inset-0 z-50 bg-[#222222]/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-white border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#222222]">{previewResume.title}</h2>
                <p className="text-xs text-[#6B7280]">Template: {previewResume.template_id}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadPDF(previewResume.id, previewResume.title)}
                  className="px-3.5 py-1.5 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setPreviewResume(null)}
                  className="p-1.5 text-[#6B7280] hover:text-[#222222] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100 flex justify-center items-start">
              <div className="w-full max-w-[800px] shadow-lg rounded-xl bg-white mb-12">
                <ResumeRenderer 
                  resumeData={previewResume.resume_data}
                  templateId={previewResume.template_id}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
