import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  FileEdit, PlusCircle, ArrowRight, RefreshCw, FolderGit2, 
  Upload, FileText, CheckCircle2, AlertCircle, Layout, Sparkles,
  Download, Trash2, Calendar, FileType, Check, ArrowUpRight
} from 'lucide-react';
import api from '../services/api';

export default function EditResumePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  // Active view tab: 'system-files' or 'saved-resumes'
  const [activeTab, setActiveTab] = useState('system-files');

  // Saved resumes state
  const [savedResumes, setSavedResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [activeResumeId, setActiveResumeId] = useState(null);

  // File upload & parsing state
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [parsedResult, setParsedResult] = useState(null);
  const [savingDirectly, setSavingDirectly] = useState(false);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const res = await api.get('/resumes');
        const list = res.data || [];
        setSavedResumes(list);
        const lastId = localStorage.getItem('last_active_resume_id');
        if (lastId && list.some(r => r.id === lastId)) {
          setActiveResumeId(lastId);
        } else if (list.length > 0) {
          setActiveResumeId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load saved resumes:', err);
      } finally {
        setLoadingResumes(false);
      }
    };
    fetchResumes();
  }, []);

  // Handle Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file) => {
    setSelectedFile(file);
    setParseError(null);
    setParsedResult(null);
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/resumes/parse-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setParsedResult(res.data);
    } catch (err) {
      console.error('Resume parsing failed:', err);
      const detail = err.response?.data?.detail || 'Could not parse the selected file. Please ensure it is a valid PDF, Word document, text, or JSON file.';
      setParseError(detail);
    } finally {
      setParsing(false);
    }
  };

  // Option 1: Edit directly in the Resume Builder
  const handleEditDirectly = async () => {
    if (!parsedResult) return;
    setSavingDirectly(true);
    try {
      const res = await api.post('/resumes', {
        title: parsedResult.title || 'Imported Resume',
        template_id: 'classic-professional',
        resume_data: parsedResult.resume_data
      });

      localStorage.setItem('last_active_resume_id', res.data.id);
      localStorage.setItem('last_active_resume_title', res.data.title);
      navigate(`/builder/${res.data.id}`);
    } catch (err) {
      console.error('Failed to create resume from imported data:', err);
      alert('Could not save imported resume. Please try again.');
    } finally {
      setSavingDirectly(false);
    }
  };

  // Option 2: Use available templates for this selected resume
  const handleUseTemplatesForResume = () => {
    if (!parsedResult) return;
    // Store parsed resume in session storage for TemplateGalleryPage to consume
    sessionStorage.setItem('import_resume_data', JSON.stringify({
      title: parsedResult.title || 'Imported Resume',
      resume_data: parsedResult.resume_data
    }));
    navigate('/templates?apply_import=true');
  };

  // Download PDF for existing resume
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

  const activeResumeObj = savedResumes.find(r => r.id === activeResumeId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF7F7] border border-[#E5E7EB] text-[#D62828] text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Resume Management & Editing</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#222222] tracking-tight">
          Edit Your Resume
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[#6B7280]">
          Select an existing resume file from your computer to edit or apply professional templates, or choose from your saved resumes in PostgreSQL.
        </p>
      </div>

      {/* Quick Active Resume Banner (if available) */}
      {activeResumeObj && (
        <div className="mb-8 p-4 sm:p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF7F7] border border-[#D62828]/20 flex items-center justify-center text-[#D62828] flex-shrink-0">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#222222]">{activeResumeObj.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  Last Active
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] mt-0.5">
                Template: <strong className="capitalize">{activeResumeObj.template_id}</strong> • Last updated {new Date(activeResumeObj.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              to={`/builder/${activeResumeObj.id}`}
              className="flex-1 sm:flex-none px-4 py-2 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Continue Editing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to={`/templates?switch_for_resume=${activeResumeObj.id}`}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[#222222] text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Layout className="w-3.5 h-3.5 text-[#D62828]" />
              <span>Change Template</span>
            </Link>
          </div>
        </div>
      )}

      {/* Primary Mode Tabs */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <button
          onClick={() => setActiveTab('system-files')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'system-files'
              ? 'bg-[#D62828] text-white shadow-md'
              : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:text-[#222222] hover:bg-gray-50'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Select from Existing Files (My System)</span>
        </button>

        <button
          onClick={() => setActiveTab('saved-resumes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'saved-resumes'
              ? 'bg-[#D62828] text-white shadow-md'
              : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:text-[#222222] hover:bg-gray-50'
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          <span>My Saved Resumes ({savedResumes.length})</span>
        </button>
      </div>

      {/* TAB 1: SELECT & UPLOAD FROM EXISTING FILES IN MY SYSTEM */}
      {activeTab === 'system-files' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-10 shadow-sm text-center">
            {/* Hidden Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md,.json"
              onChange={handleFileChange}
              className="hidden"
            />

            {!parsedResult && !parsing && (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 cursor-pointer transition-all ${
                  dragActive
                    ? 'border-[#D62828] bg-[#FFF7F7]'
                    : 'border-[#E5E7EB] hover:border-[#D62828]/50 hover:bg-gray-50/60'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-[#FFF7F7] border border-[#E5E7EB] text-[#D62828] flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-[#222222]">
                  Select a Resume File From Your Computer
                </h3>
                <p className="text-xs text-[#6B7280] max-w-md mx-auto mt-1.5 mb-5">
                  Drag and drop your file here, or click to browse. We support PDF, Word (.docx), Plain Text, and JSON resume files.
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Browse Files in System</span>
                </div>

                <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-[#6B7280]">
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-[#D62828]" /> PDF</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><FileType className="w-3 h-3 text-[#D62828]" /> Word (.docx)</span>
                  <span>•</span>
                  <span>Text / Markdown</span>
                  <span>•</span>
                  <span>JSON</span>
                </div>
              </div>
            )}

            {/* Parsing Spinner */}
            {parsing && (
              <div className="py-16 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-[#E5E7EB] border-t-[#D62828] rounded-full animate-spin mx-auto"></div>
                <div>
                  <h4 className="text-sm font-bold text-[#222222]">Parsing Resume Document...</h4>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Extracting candidate identity, work history, education, and technical competencies.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {parseError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-left flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-800">
                  <strong className="font-semibold block mb-0.5">Could not parse selected file</strong>
                  <span>{parseError}</span>
                  <button
                    onClick={() => {
                      setParseError(null);
                      fileInputRef.current?.click();
                    }}
                    className="block mt-2 font-semibold text-[#D62828] hover:underline"
                  >
                    Try another file
                  </button>
                </div>
              </div>
            )}

            {/* Successfully Parsed Resume Summary Card */}
            {parsedResult && !parsing && (
              <div className="text-left bg-[#FFF7F7]/60 border border-[#D62828]/20 rounded-2xl p-6 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#222222]">
                        {parsedResult.title || 'Extracted Resume'}
                      </h4>
                      <p className="text-[11px] text-[#6B7280]">
                        File: {parsedResult.filename}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setParsedResult(null);
                      setSelectedFile(null);
                    }}
                    className="text-xs text-[#6B7280] hover:text-[#222222] hover:underline"
                  >
                    Select Different File
                  </button>
                </div>

                {/* Extracted Details Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5 text-xs">
                  <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB]">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                      Candidate Profile
                    </span>
                    <p className="font-bold text-[#222222]">
                      {parsedResult.resume_data?.personal_info?.full_name || 'Name not detected'}
                    </p>
                    <p className="text-[#6B7280]">
                      {parsedResult.resume_data?.personal_info?.professional_title || 'Role not specified'}
                    </p>
                    <p className="text-[#6B7280] text-[11px] mt-1 truncate">
                      {parsedResult.resume_data?.personal_info?.email || 'No email'} • {parsedResult.resume_data?.personal_info?.phone || 'No phone'}
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-[#E5E7EB]">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                      Detected Content
                    </span>
                    <ul className="space-y-1 text-[#6B7280]">
                      <li>• {parsedResult.resume_data?.experience?.length || 0} Work Experience roles</li>
                      <li>• {parsedResult.resume_data?.education?.length || 0} Educational credentials</li>
                      <li>• {parsedResult.resume_data?.skills?.flatMap(s => s.skills)?.length || 0} Skills detected</li>
                      <li>• {parsedResult.resume_data?.projects?.length || 0} Projects recognized</li>
                    </ul>
                  </div>
                </div>

                {/* Dual Decision CTAs */}
                <div className="pt-2 border-t border-[#E5E7EB]">
                  <p className="text-xs font-semibold text-[#222222] mb-3 text-center">
                    What would you like to do with this selected resume?
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Action 1: Edit Resume Directly */}
                    <button
                      onClick={handleEditDirectly}
                      disabled={savingDirectly}
                      className="py-3 px-4 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <FileEdit className="w-4 h-4" />
                      <span>{savingDirectly ? 'Opening Editor...' : 'Edit This Resume Directly'}</span>
                    </button>

                    {/* Action 2: Apply Available Templates */}
                    <button
                      onClick={handleUseTemplatesForResume}
                      className="py-3 px-4 bg-white border border-[#D62828] text-[#D62828] hover:bg-[#FFF7F7] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <Layout className="w-4 h-4 text-[#D62828]" />
                      <span>Choose Template for This Resume</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SELECT FROM MY SAVED RESUMES */}
      {activeTab === 'saved-resumes' && (
        <div>
          {loadingResumes ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-3 border-[#E5E7EB] border-t-[#D62828] rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-[#6B7280]">Loading saved resumes...</p>
            </div>
          ) : savedResumes.length === 0 ? (
            <div className="py-16 px-6 text-center bg-white rounded-3xl border border-[#E5E7EB] max-w-xl mx-auto">
              <FolderGit2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#222222]">No saved resumes found</h3>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1 mb-6">
                You don't have any saved resumes in your database account yet. You can upload a resume file from your computer or choose a template to create your first one.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setActiveTab('system-files')}
                  className="px-4 py-2 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Upload from System
                </button>
                <Link
                  to="/templates"
                  className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[#222222] text-xs font-semibold rounded-xl"
                >
                  Pick a Template
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedResumes.map((r) => (
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
                      Revision #{r.revision} • Last edited {new Date(r.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E5E7EB] space-y-2">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/builder/${r.id}`}
                        onClick={() => {
                          localStorage.setItem('last_active_resume_id', r.id);
                          localStorage.setItem('last_active_resume_title', r.title);
                        }}
                        className="flex-1 py-2 text-xs font-semibold bg-[#D62828] hover:bg-[#A61B1B] text-white rounded-xl shadow-xs transition-colors text-center flex items-center justify-center gap-1.5"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>Edit Resume</span>
                      </Link>

                      <Link
                        to={`/templates?switch_for_resume=${r.id}`}
                        className="flex-1 py-2 text-xs font-semibold bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[#222222] rounded-xl transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Layout className="w-3.5 h-3.5 text-[#D62828]" />
                        <span>Templates</span>
                      </Link>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleDownloadPDF(r.id, r.title)}
                        className="w-full py-1.5 text-[11px] font-medium border border-[#E5E7EB] hover:bg-[#FFF7F7] hover:text-[#D62828] rounded-lg flex items-center justify-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
