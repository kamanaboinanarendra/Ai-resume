import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Save, Download, Eye, Sparkles, ChevronLeft, ChevronRight, Plus, 
  Trash2, RefreshCw, CheckCircle2, AlertCircle, FileSearch, ArrowLeft,
  Layout, Type, Palette, ExternalLink, Printer, Check, Copy, Wand2,
  ChevronDown, FolderGit2
} from 'lucide-react';
import api from '../services/api';
import { useAIChat } from '../context/AIChatContext';
import ResumeRenderer from '../templates/ResumeRenderer';

const BASE_SECTIONS = [
  { id: 'personal', label: 'Personal Info' },
  { id: 'summary', label: 'Summary' },
  { id: 'education', label: 'Education' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'certifications', label: 'Certifications' },
];

const FONTS = ['Inter', 'Poppins', 'Playfair Display', 'Roboto Mono', 'Arial', 'Georgia'];

export default function ResumeBuilderPage() {
  const { resumeId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);

  // Global AI Chat context integration
  const { 
    setActiveSection, 
    setCurrentSectionText, 
    setResumeContext, 
    registerApplyCallback, 
    setIsOpen: setOpenAIChat 
  } = useAIChat();

  // Resume state
  const [loading, setLoading] = useState(true);
  const [resumeTitle, setResumeTitle] = useState('Untitled Resume');
  const [templateId, setTemplateId] = useState('classic-professional');
  const [revision, setRevision] = useState(1);
  const [resumeData, setResumeData] = useState({
    personal_info: {
      full_name: '',
      professional_title: '',
      email: '',
      phone: '',
      city_country: '',
      linkedin_url: '',
      github_url: '',
      portfolio_url: '',
      photo_url: ''
    },
    professional_summary: '',
    education: [],
    experience: [],
    projects: [],
    skills: [
      { id: '1', category_name: 'Programming Languages', skills: [] },
      { id: '2', category_name: 'Frameworks & Libraries', skills: [] },
      { id: '3', category_name: 'Databases & Tools', skills: [] }
    ],
    certifications: [],
    additional_sections: [],
    customization: {
      font_family: 'Inter',
      primary_color: '#D62828',
      layout_spacing: 'normal'
    }
  });

  // UI state
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [allTemplates, setAllTemplates] = useState([]);
  const [allUserResumes, setAllUserResumes] = useState([]);
  const [resumeSwitcherOpen, setResumeSwitcherOpen] = useState(false);
  const switcherRef = useRef(null);
  const [aiActionLoading, setAiActionLoading] = useState(null);

  // Job Match Analyzer Modal state
  const [jdModalOpen, setJdModalOpen] = useState(false);
  const [jobDescriptionInput, setJobDescriptionInput] = useState('');
  const [jdAnalyzing, setJdAnalyzing] = useState(false);
  const [jdAnalysisResult, setJdAnalysisResult] = useState(null);

  // Custom Section Modal state (+ symbol action)
  const [addCustomSectionModalOpen, setAddCustomSectionModalOpen] = useState(false);
  const [newSectionHeading, setNewSectionHeading] = useState('');
  const [newSectionContent, setNewSectionContent] = useState('');

  // Autosave debouncing ref
  const autosaveTimerRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  // Close resume switcher dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setResumeSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch resume data
  useEffect(() => {
    const fetchResume = async () => {
      try {
        const [resResume, resTemplates, resUserResumes] = await Promise.all([
          api.get(`/resumes/${resumeId}`),
          api.get('/templates'),
          api.get('/resumes')
        ]);

        const data = resResume.data;
        setResumeTitle(data.title || 'Untitled Resume');
        setTemplateId(data.template_id || 'classic-professional');
        setRevision(data.revision || 1);
        if (data.resume_data) {
          setResumeData(data.resume_data);
        }
        setAllTemplates(resTemplates.data.templates || []);
        setAllUserResumes(resUserResumes.data || []);

        // Persist active resume for Edit Resume nav tab
        localStorage.setItem('last_active_resume_id', resumeId);
        localStorage.setItem('last_active_resume_title', data.title || 'Untitled Resume');
      } catch (err) {
        console.error('Failed to load resume:', err);
        alert('Could not find resume. Returning to dashboard.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
        setTimeout(() => {
          isFirstLoadRef.current = false;
        }, 500);
      }
    };
    fetchResume();
  }, [resumeId, navigate]);

  // Dynamic sections computation: base sections + user custom sections + review + export
  const customSections = (resumeData.additional_sections || []).map((sec, idx) => ({
    id: `custom-${sec.id || idx}`,
    label: sec.title || `Custom ${idx + 1}`,
    isCustom: true,
    customId: sec.id || String(idx),
    customIndex: idx
  }));

  const allSections = [
    ...BASE_SECTIONS,
    ...customSections,
    { id: 'review', label: 'Review' },
    { id: 'export', label: 'Export' },
  ];

  const currentStep = allSections[activeStepIndex] || allSections[0] || { id: 'personal', label: 'Personal Info' };

  // Sync active section context with Floating Assistant
  useEffect(() => {
    const currentSectionKey = currentStep?.id;
    setActiveSection(currentSectionKey);
    setResumeContext(resumeData);

    let textForContext = '';
    if (currentSectionKey === 'summary') {
      textForContext = resumeData.professional_summary || '';
    } else if (currentSectionKey === 'experience' && resumeData.experience.length > 0) {
      textForContext = resumeData.experience[0].responsibilities || '';
    } else if (currentSectionKey === 'projects' && resumeData.projects.length > 0) {
      textForContext = resumeData.projects[0].description || '';
    } else if (currentStep?.isCustom && resumeData.additional_sections?.[currentStep.customIndex]) {
      const sec = resumeData.additional_sections[currentStep.customIndex];
      textForContext = `${sec.title}: ${sec.content}`;
    }
    setCurrentSectionText(textForContext);
  }, [currentStep, resumeData, setActiveSection, setCurrentSectionText, setResumeContext]);

  // Register callback to allow AI assistant suggestions to be inserted into fields
  useEffect(() => {
    registerApplyCallback((suggestedText, targetSection) => {
      if (!suggestedText) return;

      if (targetSection === 'summary' || currentStep?.id === 'summary') {
        setResumeData((prev) => ({
          ...prev,
          professional_summary: suggestedText
        }));
      } else if (targetSection === 'experience' || currentStep?.id === 'experience') {
        setResumeData((prev) => {
          const exps = [...prev.experience];
          if (exps.length > 0) {
            exps[0].responsibilities = suggestedText;
          }
          return { ...prev, experience: exps };
        });
      } else if (targetSection === 'projects' || currentStep?.id === 'projects') {
        setResumeData((prev) => {
          const projs = [...prev.projects];
          if (projs.length > 0) {
            projs[0].description = suggestedText;
          }
          return { ...prev, projects: projs };
        });
      } else if (currentStep?.isCustom && currentStep.customIndex !== undefined) {
        setResumeData((prev) => {
          const list = [...(prev.additional_sections || [])];
          if (list[currentStep.customIndex]) {
            list[currentStep.customIndex].content = suggestedText;
          }
          return { ...prev, additional_sections: list };
        });
      }
    });
  }, [registerApplyCallback, currentStep]);

  // Save changes to backend
  const saveResume = useCallback(async (dataToSave, titleToSave, templateToSave) => {
    setSaveStatus('saving');
    try {
      const res = await api.put(`/resumes/${resumeId}`, {
        title: titleToSave,
        template_id: templateToSave,
        resume_data: dataToSave,
        revision: revision
      });
      setRevision(res.data.revision);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Autosave error:', err);
      setSaveStatus('error');
    }
  }, [resumeId, revision]);

  // Trigger debounced autosave on data changes
  const handleDataChange = (updater) => {
    setResumeData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!isFirstLoadRef.current) {
        setSaveStatus('saving');
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = setTimeout(() => {
          saveResume(next, resumeTitle, templateId);
        }, 1500);
      }
      return next;
    });
  };

  const handleTitleChange = (newTitle) => {
    setResumeTitle(newTitle);
    localStorage.setItem('last_active_resume_title', newTitle);
    clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveResume(resumeData, newTitle, templateId);
    }, 1200);
  };

  const handleTemplateChange = (newTemplateId) => {
    setTemplateId(newTemplateId);
    // Optionally update primary accent to match template default
    const tmpl = allTemplates.find(t => t.id === newTemplateId);
    const updatedCustomization = {
      ...resumeData.customization,
      primary_color: tmpl?.thumbnail_accent || resumeData.customization?.primary_color || '#D62828'
    };
    const nextData = { ...resumeData, customization: updatedCustomization };
    setResumeData(nextData);
    saveResume(nextData, resumeTitle, newTemplateId);
  };

  // Contextual AI Actions in Editor
  const handleAISummary = async (action = 'improve') => {
    setAiActionLoading('summary');
    try {
      const res = await api.post('/ai/improve-summary', {
        text: resumeData.professional_summary,
        role: resumeData.personal_info.professional_title,
        skills: resumeData.skills.flatMap(c => c.skills),
        action
      });
      if (res.data?.improved_text) {
        handleDataChange(prev => ({
          ...prev,
          professional_summary: res.data.improved_text
        }));
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "AI improvement failed. Please check backend API configuration.";
      alert(msg);
    } finally {
      setAiActionLoading(null);
    }
  };

  const handleAIImproveExperience = async (expIndex) => {
    setAiActionLoading(`exp-${expIndex}`);
    const exp = resumeData.experience[expIndex];
    try {
      const res = await api.post('/ai/improve-description', {
        text: exp.responsibilities,
        role_or_project: exp.job_title,
        section_type: 'experience',
        action: 'improve'
      });
      if (res.data?.improved_text) {
        handleDataChange(prev => {
          const exps = [...prev.experience];
          exps[expIndex].responsibilities = res.data.improved_text;
          return { ...prev, experience: exps };
        });
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "AI improvement failed. Please try again.";
      alert(msg);
    } finally {
      setAiActionLoading(null);
    }
  };

  const handleAIImproveProject = async (projIndex) => {
    setAiActionLoading(`proj-${projIndex}`);
    const proj = resumeData.projects[projIndex];
    try {
      const res = await api.post('/ai/improve-description', {
        text: proj.description,
        role_or_project: proj.name,
        section_type: 'project',
        action: 'improve'
      });
      if (res.data?.improved_text) {
        handleDataChange(prev => {
          const projs = [...prev.projects];
          projs[projIndex].description = res.data.improved_text;
          return { ...prev, projects: projs };
        });
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "AI improvement failed. Please try again.";
      alert(msg);
    } finally {
      setAiActionLoading(null);
    }
  };

  const handleAISuggestSkills = async () => {
    setAiActionLoading('skills');
    try {
      const res = await api.post('/ai/suggest-skills', {
        job_title: resumeData.personal_info.professional_title || 'Software Engineer',
        current_skills: resumeData.skills.flatMap(c => c.skills)
      });
      const suggested = res.data?.suggested_skills || [];
      if (suggested.length > 0) {
        handleDataChange(prev => {
          const skillsList = [...prev.skills];
          if (skillsList.length > 0) {
            const existing = new Set(skillsList[0].skills);
            suggested.slice(0, 6).forEach(s => existing.add(s));
            skillsList[0].skills = Array.from(existing);
          }
          return { ...prev, skills: skillsList };
        });
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "AI skill recommendation failed.";
      alert(msg);
    } finally {
      setAiActionLoading(null);
    }
  };

  // Job Match Analyzer action
  const handleAnalyzeJob = async () => {
    if (!jobDescriptionInput.trim() || jdAnalyzing) return;
    setJdAnalyzing(true);
    try {
      const res = await api.post('/ai/analyze-job-description', {
        job_description: jobDescriptionInput,
        resume_data: resumeData
      });
      setJdAnalysisResult(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to analyze job description.");
    } finally {
      setJdAnalyzing(false);
    }
  };

  // PDF Export action
  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/resumes/${resumeId}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${resumeTitle.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to generate PDF. Retrying...');
    }
  };

  // Add custom section handler
  const handleAddCustomSection = () => {
    const title = (newSectionHeading || '').trim() || 'Custom Section';
    const newSec = {
      id: Date.now().toString(),
      title: title,
      content: (newSectionContent || '').trim()
    };
    const updatedAdditional = [...(resumeData.additional_sections || []), newSec];
    handleDataChange(prev => ({
      ...prev,
      additional_sections: updatedAdditional
    }));
    setNewSectionHeading('');
    setNewSectionContent('');
    setAddCustomSectionModalOpen(false);
    // Navigate directly to the new custom section
    setActiveStepIndex(BASE_SECTIONS.length + (resumeData.additional_sections?.length || 0));
  };

  // Delete custom section handler
  const handleDeleteCustomSection = (customId) => {
    handleDataChange(prev => ({
      ...prev,
      additional_sections: (prev.additional_sections || []).filter(s => s.id !== customId)
    }));
    setActiveStepIndex(prev => Math.max(0, prev - 1));
  };

  // AI polish for custom section
  const handleAIElevateCustomSection = async (customIndex) => {
    setAiActionLoading(`custom-${customIndex}`);
    const sec = resumeData.additional_sections?.[customIndex];
    if (!sec || !sec.content) return;
    try {
      const res = await api.post('/ai/improve-description', {
        text: sec.content,
        role_or_project: sec.title || 'Custom Section',
        section_type: 'custom',
        action: 'improve'
      });
      if (res.data?.improved_text) {
        handleDataChange(prev => {
          const list = [...(prev.additional_sections || [])];
          if (list[customIndex]) {
            list[customIndex].content = res.data.improved_text;
          }
          return { ...prev, additional_sections: list };
        });
      }
    } catch (err) {
      alert("AI improvement failed. Please try again.");
    } finally {
      setAiActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF7F7] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#E5E7EB] border-t-[#D62828] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#FFF7F7] min-h-0 overflow-hidden">
      {/* Top Builder Control Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between gap-4 no-print shadow-2xs z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/my-resumes"
            className="p-1.5 text-[#6B7280] hover:text-[#222222] hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            title="Back to My Resumes"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="relative flex items-center min-w-0" ref={switcherRef}>
            <input
              type="text"
              value={resumeTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="font-bold text-sm sm:text-base text-[#222222] bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#D62828] focus:outline-none px-1 py-0.5 truncate max-w-[180px] sm:max-w-xs"
            />
            {allUserResumes.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setResumeSwitcherOpen(!resumeSwitcherOpen)}
                  className="p-1 text-[#6B7280] hover:text-[#222222] hover:bg-gray-100 rounded-lg transition-colors ml-1"
                  title="Switch between your saved resumes"
                  aria-label="Switch between saved resumes"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                {resumeSwitcherOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3.5 py-1.5 border-b border-[#E5E7EB] flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                        Switch Resume
                      </span>
                      <span className="text-[10px] text-[#6B7280]">
                        {allUserResumes.length} total
                      </span>
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                      {allUserResumes.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setResumeSwitcherOpen(false);
                            if (r.id !== resumeId) {
                              navigate(`/builder/${r.id}`);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-xs transition-colors ${
                            r.id === resumeId
                              ? 'bg-[#FFF7F7] text-[#D62828] font-bold'
                              : 'text-[#222222] hover:bg-gray-50'
                          }`}
                        >
                          <span className="truncate flex-1">{r.title}</span>
                          {r.id === resumeId && <Check className="w-3.5 h-3.5 text-[#D62828] flex-shrink-0 ml-2" />}
                        </button>
                      ))}
                    </div>
                    <div className="pt-1.5 border-t border-[#E5E7EB] px-2 flex flex-col gap-1">
                      <Link
                        to="/templates"
                        onClick={() => setResumeSwitcherOpen(false)}
                        className="px-2.5 py-1 text-[11px] font-medium text-[#D62828] hover:bg-[#FFF7F7] rounded-lg flex items-center gap-1.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Create Another Resume</span>
                      </Link>
                      <Link
                        to="/my-resumes"
                        onClick={() => setResumeSwitcherOpen(false)}
                        className="px-2.5 py-1 text-[11px] font-medium text-[#6B7280] hover:text-[#222222] hover:bg-gray-50 rounded-lg flex items-center gap-1.5"
                      >
                        <FolderGit2 className="w-3 h-3" />
                        <span>Manage All in My Resumes</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Autosave Indicator */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D62828]" />
              <span className="hidden sm:inline">Saving...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">All changes saved</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <button
              onClick={() => saveResume(resumeData, resumeTitle, templateId)}
              className="flex items-center gap-1 text-xs text-[#DC2626] font-medium hover:underline"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Save failed. Retry</span>
            </button>
          )}

          {/* Quick Job Match Action */}
          <button
            onClick={() => setJdModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-[#222222] hover:text-[#D62828] hover:border-[#D62828] hover:bg-[#FFF7F7] transition-colors"
          >
            <FileSearch className="w-3.5 h-3.5 text-[#D62828]" />
            <span className="hidden md:inline">Job Match</span>
          </button>

          {/* Download PDF Action */}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          {/* Mobile Preview Toggle */}
          <button
            onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
            className="md:hidden flex items-center gap-1 p-2 text-[#6B7280] hover:text-[#222222] border border-[#E5E7EB] rounded-xl"
            title="Toggle Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Indicator Steps Bar */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-2 overflow-x-auto no-scrollbar no-print">
        <div className="flex items-center gap-1.5 min-w-max mx-auto max-w-7xl">
          {allSections.map((sec, idx) => {
            const isCurrent = activeStepIndex === idx;
            const isDone = activeStepIndex > idx;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveStepIndex(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isCurrent
                    ? 'bg-[#D62828] text-white shadow-xs font-semibold'
                    : isDone
                    ? 'text-[#222222] bg-[#FFF7F7] hover:bg-gray-100'
                    : 'text-[#6B7280] hover:text-[#222222] hover:bg-gray-50'
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                  isCurrent ? 'bg-white text-[#D62828]' : isDone ? 'bg-[#D62828] text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {isDone ? '✓' : idx + 1}
                </span>
                <span>{sec.label}</span>
                {sec.isCustom && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                    isCurrent ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                  }`}>
                    Custom
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick '+' Symbol Button to Add Custom Section */}
          <button
            type="button"
            onClick={() => setAddCustomSectionModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[#D62828] bg-[#FFF7F7] border border-dashed border-[#D62828]/60 hover:bg-[#D62828] hover:text-white transition-all shadow-2xs whitespace-nowrap ml-1"
            title="Add your own custom section with heading and information"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Section</span>
          </button>
        </div>
      </div>

      {/* Main Work Area: Left Editor + Right Live Preview */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT COLUMN: GUIDED FORM EDITOR */}
        <div className={`w-full md:w-1/2 lg:w-5/12 border-r border-[#E5E7EB] bg-white flex flex-col overflow-y-auto ${
          mobilePreviewOpen ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-6 flex-1 space-y-6 max-w-xl mx-auto w-full">
            {/* STEP 1: PERSONAL INFO */}
            {currentStep.id === 'personal' && (
              <div className="space-y-4">
                <div className="border-b border-[#E5E7EB] pb-3">
                  <h2 className="text-base font-bold text-[#222222]">Personal Information</h2>
                  <p className="text-xs text-[#6B7280]">Recruiters will use these details to contact you directly.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#222222] mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={resumeData.personal_info.full_name}
                      onChange={(e) => handleDataChange(prev => ({
                        ...prev,
                        personal_info: { ...prev.personal_info, full_name: e.target.value }
                      }))}
                      placeholder="e.g. Alex Morgan"
                      className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#222222] mb-1">Professional Title *</label>
                    <input
                      type="text"
                      value={resumeData.personal_info.professional_title}
                      onChange={(e) => handleDataChange(prev => ({
                        ...prev,
                        personal_info: { ...prev.personal_info, professional_title: e.target.value }
                      }))}
                      placeholder="e.g. Senior Full Stack Engineer"
                      className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#222222] mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={resumeData.personal_info.email}
                      onChange={(e) => handleDataChange(prev => ({
                        ...prev,
                        personal_info: { ...prev.personal_info, email: e.target.value }
                      }))}
                      placeholder="alex@example.com"
                      className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#222222] mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={resumeData.personal_info.phone}
                      onChange={(e) => handleDataChange(prev => ({
                        ...prev,
                        personal_info: { ...prev.personal_info, phone: e.target.value }
                      }))}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#222222] mb-1">City, State / Country</label>
                    <input
                      type="text"
                      value={resumeData.personal_info.city_country}
                      onChange={(e) => handleDataChange(prev => ({
                        ...prev,
                        personal_info: { ...prev.personal_info, city_country: e.target.value }
                      }))}
                      placeholder="San Francisco, CA"
                      className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#222222] mb-1">LinkedIn Profile</label>
                    <input
                      type="url"
                      value={resumeData.personal_info.linkedin_url}
                      onChange={(e) => handleDataChange(prev => ({
                        ...prev,
                        personal_info: { ...prev.personal_info, linkedin_url: e.target.value }
                      }))}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#222222] mb-1">GitHub Profile</label>
                    <input
                      type="url"
                      value={resumeData.personal_info.github_url}
                      onChange={(e) => handleDataChange(prev => ({
                        ...prev,
                        personal_info: { ...prev.personal_info, github_url: e.target.value }
                      }))}
                      placeholder="https://github.com/username"
                      className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#222222] mb-1">Portfolio / Personal Website</label>
                    <input
                      type="url"
                      value={resumeData.personal_info.portfolio_url}
                      onChange={(e) => handleDataChange(prev => ({
                        ...prev,
                        personal_info: { ...prev.personal_info, portfolio_url: e.target.value }
                      }))}
                      placeholder="https://yourportfolio.com"
                      className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PROFESSIONAL SUMMARY */}
            {currentStep.id === 'summary' && (
              <div className="space-y-4">
                <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#222222]">Professional Summary</h2>
                    <p className="text-xs text-[#6B7280]">A brief 3-4 sentence elevator pitch of your experience.</p>
                  </div>
                  {/* Contextual AI Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAISummary('generate')}
                      disabled={aiActionLoading === 'summary'}
                      className="px-2.5 py-1 text-xs bg-[#FFF7F7] border border-[#E5E7EB] hover:border-[#D62828] text-[#D62828] font-semibold rounded-lg flex items-center gap-1 transition-colors"
                      title="AI Generate"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate</span>
                    </button>
                    <button
                      onClick={() => handleAISummary('improve')}
                      disabled={aiActionLoading === 'summary' || !resumeData.professional_summary}
                      className="px-2.5 py-1 text-xs bg-[#D62828] hover:bg-[#A61B1B] text-white font-semibold rounded-lg flex items-center gap-1 transition-colors disabled:opacity-40"
                      title="AI Improve"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Improve</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={6}
                    value={resumeData.professional_summary}
                    onChange={(e) => handleDataChange(prev => ({
                      ...prev,
                      professional_summary: e.target.value
                    }))}
                    placeholder="Write a concise overview of your background, technical specialties, and major career achievements..."
                    className="w-full p-3.5 text-xs border border-[#E5E7EB] rounded-2xl focus:outline-none focus:border-[#D62828] leading-relaxed text-[#222222]"
                  />
                  <div className="flex justify-between items-center text-[11px] text-[#6B7280] mt-1 px-1">
                    <span>{resumeData.professional_summary.split(/\s+/).filter(Boolean).length} words</span>
                    <button
                      onClick={() => handleDataChange(prev => ({ ...prev, professional_summary: '' }))}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: EDUCATION */}
            {currentStep.id === 'education' && (
              <div className="space-y-4">
                <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#222222]">Education</h2>
                    <p className="text-xs text-[#6B7280]">Your degrees, university, and academic honors.</p>
                  </div>
                  <button
                    onClick={() => handleDataChange(prev => ({
                      ...prev,
                      education: [
                        ...prev.education,
                        { id: Date.now().toString(), degree: '', institution: '', location: '', start_date: '', end_date: '', gpa: '', coursework: '' }
                      ]
                    }))}
                    className="px-3 py-1.5 bg-[#FFF7F7] border border-[#E5E7EB] hover:border-[#D62828] text-[#D62828] text-xs font-semibold rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Degree</span>
                  </button>
                </div>

                {resumeData.education.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-[#E5E7EB] rounded-2xl">
                    <p className="text-xs text-[#6B7280]">No education entries added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {resumeData.education.map((edu, idx) => (
                      <div key={edu.id || idx} className="p-4 bg-gray-50 border border-[#E5E7EB] rounded-2xl space-y-3 relative">
                        <button
                          onClick={() => handleDataChange(prev => ({
                            ...prev,
                            education: prev.education.filter((_, i) => i !== idx)
                          }))}
                          className="absolute top-3 right-3 text-[#6B7280] hover:text-[#DC2626]"
                          title="Remove Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-6">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Degree *</label>
                            <input
                              type="text"
                              value={edu.degree}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.education];
                                list[idx].degree = e.target.value;
                                return { ...prev, education: list };
                              })}
                              placeholder="e.g. B.Tech in Computer Science"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Institution *</label>
                            <input
                              type="text"
                              value={edu.institution}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.education];
                                list[idx].institution = e.target.value;
                                return { ...prev, education: list };
                              })}
                              placeholder="e.g. Stanford University"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Location</label>
                            <input
                              type="text"
                              value={edu.location}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.education];
                                list[idx].location = e.target.value;
                                return { ...prev, education: list };
                              })}
                              placeholder="Stanford, CA"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Start Date</label>
                            <input
                              type="text"
                              value={edu.start_date}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.education];
                                list[idx].start_date = e.target.value;
                                return { ...prev, education: list };
                              })}
                              placeholder="2020"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">End Date</label>
                            <input
                              type="text"
                              value={edu.end_date}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.education];
                                list[idx].end_date = e.target.value;
                                return { ...prev, education: list };
                              })}
                              placeholder="2024"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">GPA / Percentage</label>
                            <input
                              type="text"
                              value={edu.gpa}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.education];
                                list[idx].gpa = e.target.value;
                                return { ...prev, education: list };
                              })}
                              placeholder="3.8 / 4.0 or 85%"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Relevant Coursework</label>
                            <input
                              type="text"
                              value={edu.coursework}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.education];
                                list[idx].coursework = e.target.value;
                                return { ...prev, education: list };
                              })}
                              placeholder="Algorithms, Databases, OS"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: EXPERIENCE */}
            {currentStep.id === 'experience' && (
              <div className="space-y-4">
                <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#222222]">Experience & Internships</h2>
                    <p className="text-xs text-[#6B7280]">Detail your employment history and impact.</p>
                  </div>
                  <button
                    onClick={() => handleDataChange(prev => ({
                      ...prev,
                      experience: [
                        ...prev.experience,
                        { id: Date.now().toString(), job_title: '', company: '', location: '', employment_type: 'Full-time', start_date: '', end_date: '', currently_working: false, responsibilities: '', achievements: '' }
                      ]
                    }))}
                    className="px-3 py-1.5 bg-[#FFF7F7] border border-[#E5E7EB] hover:border-[#D62828] text-[#D62828] text-xs font-semibold rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Role</span>
                  </button>
                </div>

                {resumeData.experience.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-[#E5E7EB] rounded-2xl">
                    <p className="text-xs text-[#6B7280]">No experience entries added. Click 'Add Role' above.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {resumeData.experience.map((exp, idx) => (
                      <div key={exp.id || idx} className="p-4 bg-gray-50 border border-[#E5E7EB] rounded-2xl space-y-3 relative">
                        <button
                          onClick={() => handleDataChange(prev => ({
                            ...prev,
                            experience: prev.experience.filter((_, i) => i !== idx)
                          }))}
                          className="absolute top-3 right-3 text-[#6B7280] hover:text-[#DC2626]"
                          title="Remove Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-6">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Job Title *</label>
                            <input
                              type="text"
                              value={exp.job_title}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.experience];
                                list[idx].job_title = e.target.value;
                                return { ...prev, experience: list };
                              })}
                              placeholder="e.g. Backend Developer"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Company *</label>
                            <input
                              type="text"
                              value={exp.company}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.experience];
                                list[idx].company = e.target.value;
                                return { ...prev, experience: list };
                              })}
                              placeholder="e.g. Acme Corp"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Location</label>
                            <input
                              type="text"
                              value={exp.location}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.experience];
                                list[idx].location = e.target.value;
                                return { ...prev, experience: list };
                              })}
                              placeholder="New York, NY"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Dates</label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={exp.start_date}
                                  onChange={(e) => handleDataChange(prev => {
                                    const list = [...prev.experience];
                                    list[idx].start_date = e.target.value;
                                    return { ...prev, experience: list };
                                  })}
                                  placeholder="2021"
                                  className="w-1/2 px-2 py-1 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                  type="text"
                                  disabled={exp.currently_working}
                                  value={exp.currently_working ? 'Present' : exp.end_date}
                                  onChange={(e) => handleDataChange(prev => {
                                    const list = [...prev.experience];
                                    list[idx].end_date = e.target.value;
                                    return { ...prev, experience: list };
                                  })}
                                  placeholder="2023"
                                  className="w-1/2 px-2 py-1 text-xs bg-white border border-[#E5E7EB] rounded-lg disabled:bg-gray-100"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="sm:col-span-2 flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`current-${idx}`}
                              checked={exp.currently_working}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.experience];
                                list[idx].currently_working = e.target.checked;
                                return { ...prev, experience: list };
                              })}
                              className="rounded text-[#D62828] focus:ring-[#D62828]"
                            />
                            <label htmlFor={`current-${idx}`} className="text-xs text-[#6B7280]">Currently working here</label>
                          </div>

                          {/* Responsibilities with contextual AI button */}
                          <div className="sm:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-[#222222]">Responsibilities & Bullet Points</label>
                              <button
                                onClick={() => handleAIImproveExperience(idx)}
                                disabled={aiActionLoading === `exp-${idx}` || !exp.responsibilities}
                                className="text-[11px] font-semibold text-[#D62828] hover:text-[#A61B1B] flex items-center gap-1 disabled:opacity-40"
                              >
                                <Wand2 className="w-3 h-3" />
                                <span>AI Elevate Bullets</span>
                              </button>
                            </div>
                            <textarea
                              rows={3}
                              value={exp.responsibilities}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.experience];
                                list[idx].responsibilities = e.target.value;
                                return { ...prev, experience: list };
                              })}
                              placeholder="• Built REST APIs utilizing FastAPI and PostgreSQL&#10;• Reduced latency by 25% through indexing optimizations"
                              className="w-full p-2.5 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: PROJECTS */}
            {currentStep.id === 'projects' && (
              <div className="space-y-4">
                <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#222222]">Projects</h2>
                    <p className="text-xs text-[#6B7280]">Showcase notable engineering and product builds.</p>
                  </div>
                  <button
                    onClick={() => handleDataChange(prev => ({
                      ...prev,
                      projects: [
                        ...prev.projects,
                        { id: Date.now().toString(), name: '', technologies: '', description: '', github_url: '', live_url: '' }
                      ]
                    }))}
                    className="px-3 py-1.5 bg-[#FFF7F7] border border-[#E5E7EB] hover:border-[#D62828] text-[#D62828] text-xs font-semibold rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Project</span>
                  </button>
                </div>

                {resumeData.projects.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-[#E5E7EB] rounded-2xl">
                    <p className="text-xs text-[#6B7280]">No projects added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {resumeData.projects.map((proj, idx) => (
                      <div key={proj.id || idx} className="p-4 bg-gray-50 border border-[#E5E7EB] rounded-2xl space-y-3 relative">
                        <button
                          onClick={() => handleDataChange(prev => ({
                            ...prev,
                            projects: prev.projects.filter((_, i) => i !== idx)
                          }))}
                          className="absolute top-3 right-3 text-[#6B7280] hover:text-[#DC2626]"
                          title="Remove Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-6">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Project Name *</label>
                            <input
                              type="text"
                              value={proj.name}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.projects];
                                list[idx].name = e.target.value;
                                return { ...prev, projects: list };
                              })}
                              placeholder="e.g. AI-Powered Resume Builder"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Tech Stack</label>
                            <input
                              type="text"
                              value={proj.technologies}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.projects];
                                list[idx].technologies = e.target.value;
                                return { ...prev, projects: list };
                              })}
                              placeholder="React, FastAPI, PostgreSQL, Tailwind"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">GitHub URL</label>
                            <input
                              type="url"
                              value={proj.github_url}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.projects];
                                list[idx].github_url = e.target.value;
                                return { ...prev, projects: list };
                              })}
                              placeholder="https://github.com/..."
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Live Demo URL</label>
                            <input
                              type="url"
                              value={proj.live_url}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.projects];
                                list[idx].live_url = e.target.value;
                                return { ...prev, projects: list };
                              })}
                              placeholder="https://myproject.com"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-[#222222]">Description & Outcomes</label>
                              <button
                                onClick={() => handleAIImproveProject(idx)}
                                disabled={aiActionLoading === `proj-${idx}` || !proj.description}
                                className="text-[11px] font-semibold text-[#D62828] hover:text-[#A61B1B] flex items-center gap-1 disabled:opacity-40"
                              >
                                <Wand2 className="w-3 h-3" />
                                <span>AI Refine Description</span>
                              </button>
                            </div>
                            <textarea
                              rows={3}
                              value={proj.description}
                              onChange={(e) => handleDataChange(prev => {
                                const list = [...prev.projects];
                                list[idx].description = e.target.value;
                                return { ...prev, projects: list };
                              })}
                              placeholder="Describe core features, challenges solved, and tangible performance metrics..."
                              className="w-full p-2.5 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 6: TECHNICAL SKILLS */}
            {currentStep.id === 'skills' && (
              <div className="space-y-4">
                <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#222222]">Technical Skills</h2>
                    <p className="text-xs text-[#6B7280]">Organize skills by category for clear readability.</p>
                  </div>
                  <button
                    onClick={handleAISuggestSkills}
                    disabled={aiActionLoading === 'skills'}
                    className="px-3 py-1.5 bg-[#FFF7F7] border border-[#E5E7EB] hover:border-[#D62828] text-[#D62828] text-xs font-semibold rounded-xl flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Suggest Skills</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {resumeData.skills.map((cat, idx) => (
                    <div key={cat.id || idx} className="p-4 bg-gray-50 border border-[#E5E7EB] rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={cat.category_name}
                          onChange={(e) => handleDataChange(prev => {
                            const list = [...prev.skills];
                            list[idx].category_name = e.target.value;
                            return { ...prev, skills: list };
                          })}
                          className="font-semibold text-xs text-[#222222] bg-white border border-[#E5E7EB] px-2.5 py-1 rounded-lg"
                        />
                        <button
                          onClick={() => handleDataChange(prev => ({
                            ...prev,
                            skills: prev.skills.filter((_, i) => i !== idx)
                          }))}
                          className="text-[#6B7280] hover:text-[#DC2626]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Skills tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {(cat.skills || []).map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1 bg-white border border-[#E5E7EB] px-2.5 py-1 rounded-lg text-xs font-medium text-[#222222]"
                          >
                            <span>{skill}</span>
                            <button
                              onClick={() => handleDataChange(prev => {
                                const list = [...prev.skills];
                                list[idx].skills = list[idx].skills.filter((_, i) => i !== sIdx);
                                return { ...prev, skills: list };
                              })}
                              className="text-gray-400 hover:text-red-500"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Add skill input */}
                      <div className="pt-1">
                        <input
                          type="text"
                          placeholder="Type a skill and press Enter..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                              e.preventDefault();
                              const val = e.target.value.trim();
                              handleDataChange(prev => {
                                const list = [...prev.skills];
                                if (!list[idx].skills.includes(val)) {
                                  list[idx].skills = [...list[idx].skills, val];
                                }
                                return { ...prev, skills: list };
                              });
                              e.target.value = '';
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#D62828]"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleDataChange(prev => ({
                      ...prev,
                      skills: [
                        ...prev.skills,
                        { id: Date.now().toString(), category_name: 'Tools & Other', skills: [] }
                      ]
                    }))}
                    className="w-full py-2 text-xs font-semibold text-[#D62828] border border-dashed border-[#D62828]/40 hover:border-[#D62828] rounded-xl flex items-center justify-center gap-1 bg-[#FFF7F7]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Skill Category</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 7: CERTIFICATIONS */}
            {currentStep.id === 'certifications' && (
              <div className="space-y-4">
                <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#222222]">Certifications</h2>
                    <p className="text-xs text-[#6B7280]">Official licenses and accredited credentials.</p>
                  </div>
                  <button
                    onClick={() => handleDataChange(prev => ({
                      ...prev,
                      certifications: [
                        ...prev.certifications,
                        { id: Date.now().toString(), name: '', issuer: '', issue_date: '', credential_url: '' }
                      ]
                    }))}
                    className="px-3 py-1.5 bg-[#FFF7F7] border border-[#E5E7EB] hover:border-[#D62828] text-[#D62828] text-xs font-semibold rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Certificate</span>
                  </button>
                </div>

                {resumeData.certifications.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-[#E5E7EB] rounded-2xl">
                    <p className="text-xs text-[#6B7280]">No certifications added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resumeData.certifications.map((cert, idx) => (
                      <div key={cert.id || idx} className="p-3.5 bg-gray-50 border border-[#E5E7EB] rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2 relative">
                        <button
                          onClick={() => handleDataChange(prev => ({
                            ...prev,
                            certifications: prev.certifications.filter((_, i) => i !== idx)
                          }))}
                          className="absolute top-2.5 right-2.5 text-[#6B7280] hover:text-[#DC2626]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Certificate Name *</label>
                          <input
                            type="text"
                            value={cert.name}
                            onChange={(e) => handleDataChange(prev => {
                              const list = [...prev.certifications];
                              list[idx].name = e.target.value;
                              return { ...prev, certifications: list };
                            })}
                            placeholder="AWS Certified Developer"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Issuing Organization *</label>
                          <input
                            type="text"
                            value={cert.issuer}
                            onChange={(e) => handleDataChange(prev => {
                              const list = [...prev.certifications];
                              list[idx].issuer = e.target.value;
                              return { ...prev, certifications: list };
                            })}
                            placeholder="Amazon Web Services"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Issue Date</label>
                          <input
                            type="text"
                            value={cert.issue_date}
                            onChange={(e) => handleDataChange(prev => {
                              const list = [...prev.certifications];
                              list[idx].issue_date = e.target.value;
                              return { ...prev, certifications: list };
                            })}
                            placeholder="2023"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#222222] mb-0.5">Credential URL</label>
                          <input
                            type="url"
                            value={cert.credential_url}
                            onChange={(e) => handleDataChange(prev => {
                              const list = [...prev.certifications];
                              list[idx].credential_url = e.target.value;
                              return { ...prev, certifications: list };
                            })}
                            placeholder="https://..."
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Custom Section Callout in Certifications */}
                <div className="p-4 bg-[#FFF7F7] border border-dashed border-[#D62828]/40 rounded-2xl flex items-center justify-between mt-4">
                  <div>
                    <h4 className="text-xs font-bold text-[#222222]">Need more sections?</h4>
                    <p className="text-[11px] text-[#6B7280]">Add your own heading & information like Languages, Publications, or Awards.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddCustomSectionModalOpen(true)}
                    className="px-3.5 py-1.5 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Section</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP: DYNAMIC CUSTOM SECTION */}
            {currentStep?.isCustom && resumeData.additional_sections?.[currentStep.customIndex] && (
              <div className="space-y-4">
                <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold mb-1 border border-amber-200">
                      <span>Custom User Section</span>
                    </div>
                    <h2 className="text-base font-bold text-[#222222]">
                      {resumeData.additional_sections[currentStep.customIndex]?.title || 'Custom Section'}
                    </h2>
                    <p className="text-xs text-[#6B7280]">
                      Recruiters will see this custom heading and your entered information on your resume.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomSection(currentStep.customId)}
                      className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-1 transition-colors border border-red-200 font-semibold"
                      title="Remove this custom section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-[#E5E7EB]">
                  <div>
                    <label className="block text-xs font-semibold text-[#222222] mb-1">
                      Section Heading / Title *
                    </label>
                    <input
                      type="text"
                      value={resumeData.additional_sections[currentStep.customIndex]?.title || ''}
                      onChange={(e) => handleDataChange(prev => {
                        const list = [...(prev.additional_sections || [])];
                        if (list[currentStep.customIndex]) {
                          list[currentStep.customIndex].title = e.target.value;
                        }
                        return { ...prev, additional_sections: list };
                      })}
                      placeholder="e.g. Languages, Volunteer Work, Publications, Honors & Awards..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl font-bold text-[#222222] focus:outline-none focus:border-[#D62828]"
                    />
                    <span className="text-[11px] text-[#6B7280]">Customize this title to display your desired heading.</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[#222222]">
                        Section Information & Content *
                      </label>
                      <button
                        type="button"
                        onClick={() => handleAIElevateCustomSection(currentStep.customIndex)}
                        disabled={aiActionLoading === `custom-${currentStep.customIndex}` || !resumeData.additional_sections[currentStep.customIndex]?.content}
                        className="text-[11px] font-semibold text-[#D62828] hover:text-[#A61B1B] flex items-center gap-1 disabled:opacity-40"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>AI Polish Content</span>
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={resumeData.additional_sections[currentStep.customIndex]?.content || ''}
                      onChange={(e) => handleDataChange(prev => {
                        const list = [...(prev.additional_sections || [])];
                        if (list[currentStep.customIndex]) {
                          list[currentStep.customIndex].content = e.target.value;
                        }
                        return { ...prev, additional_sections: list };
                      })}
                      placeholder="Enter bullet points or details...&#10;• English: Fluent / Bilingual&#10;• German: Working Professional"
                      className="w-full p-3 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828] leading-relaxed"
                    />
                    <span className="text-[11px] text-[#6B7280]">Supports bullet points (• or -) and multi-line formatting.</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setAddCustomSectionModalOpen(true)}
                    className="px-3.5 py-2 text-xs font-semibold text-[#D62828] bg-[#FFF7F7] border border-[#D62828]/40 hover:bg-[#D62828] hover:text-white rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Custom Section</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 9: FINAL REVIEW */}
            {currentStep.id === 'review' && (
              <div className="space-y-4">
                <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#222222]">Resume Completeness Review</h2>
                    <p className="text-xs text-[#6B7280]">Review key areas before finalizing your document.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddCustomSectionModalOpen(true)}
                    className="px-3 py-1.5 bg-[#FFF7F7] border border-[#D62828]/40 hover:bg-[#D62828] hover:text-white text-[#D62828] text-xs font-semibold rounded-xl flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Section</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Personal Information', complete: Boolean(resumeData.personal_info.full_name && resumeData.personal_info.email), step: 0 },
                    { label: 'Professional Summary', complete: Boolean(resumeData.professional_summary.length > 20), step: 1 },
                    { label: 'Education History', complete: Boolean(resumeData.education.length > 0), step: 2 },
                    { label: 'Experience & Internships', complete: Boolean(resumeData.experience.length > 0), step: 3 },
                    { label: 'Project Portfolio', complete: Boolean(resumeData.projects.length > 0), step: 4 },
                    { label: 'Technical Skills Matrix', complete: Boolean(resumeData.skills.some(c => c.skills.length > 0)), step: 5 },
                    { label: 'Certifications', complete: Boolean(resumeData.certifications.length > 0), step: 6 },
                    ...(resumeData.additional_sections || []).map((sec, sIdx) => ({
                      label: `${sec.title || 'Custom Section'} (Custom)`,
                      complete: Boolean(sec.content && sec.content.trim().length > 0),
                      step: BASE_SECTIONS.length + sIdx
                    }))
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 bg-gray-50 border border-[#E5E7EB] rounded-xl">
                      <div className="flex items-center gap-2.5">
                        {item.complete ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-[#222222]">{item.label}</span>
                      </div>
                      <button
                        onClick={() => setActiveStepIndex(item.step)}
                        className="text-xs font-medium text-[#D62828] hover:underline"
                      >
                        {item.complete ? 'Edit' : 'Fill Section'}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-[#FFF7F7] border border-[#E5E7EB] rounded-2xl flex items-center justify-between mt-6">
                  <div>
                    <h4 className="text-xs font-bold text-[#222222]">Ready for Export?</h4>
                    <p className="text-[11px] text-[#6B7280]">Switch to the Export tab to download your high-res PDF.</p>
                  </div>
                  <button
                    onClick={() => setActiveStepIndex(allSections.length - 1)}
                    className="px-4 py-2 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-semibold rounded-xl shadow-xs"
                  >
                    Proceed to Export
                  </button>
                </div>
              </div>
            )}

            {/* STEP 10: PREVIEW & EXPORT */}
            {currentStep.id === 'export' && (
              <div className="space-y-5">
                <div className="border-b border-[#E5E7EB] pb-3">
                  <h2 className="text-base font-bold text-[#222222]">Preview, Styling & PDF Export</h2>
                  <p className="text-xs text-[#6B7280]">Customize layout parameters and download your verified PDF.</p>
                </div>

                {/* Template Selector dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#222222] flex items-center gap-1.5">
                      <Layout className="w-3.5 h-3.5 text-[#D62828]" />
                      <span>Selected Template ({allTemplates.length || 50} Available)</span>
                    </label>
                    <Link
                      to={`/templates?switch_for_resume=${resumeId}`}
                      className="text-[11px] font-semibold text-[#D62828] hover:underline flex items-center gap-1"
                    >
                      <span>Browse Full Previews</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <select
                    value={templateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828] font-medium"
                  >
                    {allTemplates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.category} ({t.layout_family})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Typography Font Selector */}
                <div>
                  <label className="block text-xs font-semibold text-[#222222] mb-1.5 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-[#D62828]" />
                    <span>Typography Font</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {FONTS.map(f => (
                      <button
                        key={f}
                        onClick={() => handleDataChange(prev => ({
                          ...prev,
                          customization: { ...prev.customization, font_family: f }
                        }))}
                        className={`py-2 px-2.5 text-xs rounded-xl border text-center transition-all ${
                          resumeData.customization.font_family === f
                            ? 'border-[#D62828] bg-[#FFF7F7] text-[#D62828] font-bold shadow-2xs'
                            : 'border-[#E5E7EB] bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Palette Selector */}
                <div>
                  <label className="block text-xs font-semibold text-[#222222] mb-1.5 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#D62828]" />
                    <span>Primary Accent Color</span>
                  </label>
                  <div className="flex items-center gap-2.5">
                    {['#D62828', '#1E293B', '#0284C7', '#0D9488', '#15803D', '#7C3AED', '#E11D48'].map(color => (
                      <button
                        key={color}
                        onClick={() => handleDataChange(prev => ({
                          ...prev,
                          customization: { ...prev.customization, primary_color: color }
                        }))}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                          resumeData.customization.primary_color === color ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {resumeData.customization.primary_color === color && (
                          <Check className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Export Action Buttons */}
                <div className="pt-4 border-t border-[#E5E7EB] space-y-3">
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full py-3 bg-[#D62828] hover:bg-[#A61B1B] text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official PDF</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="w-full py-2.5 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[#222222] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Printer className="w-4 h-4 text-gray-600" />
                    <span>Print Directly (Browser)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Prev / Next Navigation Bar */}
          <div className="p-4 bg-white border-t border-[#E5E7EB] flex items-center justify-between no-print">
            <button
              onClick={() => setActiveStepIndex(Math.max(0, activeStepIndex - 1))}
              disabled={activeStepIndex === 0}
              className="px-4 py-2 text-xs font-semibold text-[#222222] hover:bg-gray-100 rounded-xl disabled:opacity-30 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-[11px] font-medium text-[#6B7280]">
              Step {activeStepIndex + 1} of {allSections.length}
            </span>

            <button
              onClick={() => setActiveStepIndex(Math.min(allSections.length - 1, activeStepIndex + 1))}
              disabled={activeStepIndex === allSections.length - 1}
              className="px-4 py-2 text-xs font-semibold bg-[#D62828] hover:bg-[#A61B1B] text-white rounded-xl disabled:opacity-30 flex items-center gap-1 transition-colors shadow-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE DYNAMIC RESUME PREVIEW */}
        <div className={`flex-1 bg-gray-100 p-4 sm:p-8 overflow-y-auto justify-center items-start ${
          mobilePreviewOpen ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="w-full max-w-[800px] mx-auto my-0 pb-28 pt-4">
            <ResumeRenderer 
              resumeData={resumeData}
              templateId={templateId}
              printRef={printRef}
            />
          </div>
        </div>
      </div>

      {/* JOB DESCRIPTION MATCH ANALYZER MODAL */}
      {jdModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#222222]/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-white border-b border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FFF7F7] border border-[#D62828]/20 flex items-center justify-center text-[#D62828]">
                  <FileSearch className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#222222]">Job Description Match Analyzer</h3>
                  <p className="text-[11px] text-[#6B7280]">Compare your resume against a target job posting</p>
                </div>
              </div>
              <button
                onClick={() => setJdModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {!jdAnalysisResult ? (
                <>
                  <p className="text-xs text-[#6B7280]">
                    Paste the target job description or requirements below. We'll analyze matching keywords, identify gaps, and provide transparent alignment metrics.
                  </p>
                  <textarea
                    rows={8}
                    value={jobDescriptionInput}
                    onChange={(e) => setJobDescriptionInput(e.target.value)}
                    placeholder="Paste job description text here (e.g. required skills, technologies, job responsibilities)..."
                    className="w-full p-3.5 text-xs border border-[#E5E7EB] rounded-2xl focus:outline-none focus:border-[#D62828] text-[#222222] leading-relaxed"
                  />
                  <button
                    onClick={handleAnalyzeJob}
                    disabled={!jobDescriptionInput.trim() || jdAnalyzing}
                    className="w-full py-2.5 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs disabled:opacity-40"
                  >
                    {jdAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Analyzing Keyword Alignment...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Analyze Match</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Score Card */}
                  <div className="p-4 bg-[#FFF7F7] border border-[#E5E7EB] rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Keyword Coverage</span>
                      <h4 className="text-2xl font-black text-[#D62828] mt-0.5">
                        {jdAnalysisResult.match_score}%
                      </h4>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">
                        {jdAnalysisResult.matched_keywords?.length || 0} matching keywords found in resume
                      </p>
                    </div>
                    <button
                      onClick={() => setJdAnalysisResult(null)}
                      className="text-xs font-medium text-[#D62828] hover:underline"
                    >
                      Analyze Another Job
                    </button>
                  </div>

                  {/* Matched Keywords */}
                  <div>
                    <h5 className="font-bold text-[#222222] mb-1.5 flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Matching Skills & Keywords Found</span>
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {jdAnalysisResult.matched_keywords?.map((kw, i) => (
                        <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-medium">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Missing Keywords */}
                  {jdAnalysisResult.missing_keywords?.length > 0 && (
                    <div>
                      <h5 className="font-bold text-[#222222] mb-1.5 flex items-center gap-1.5 text-amber-700">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Keywords Not Mentioned in Resume</span>
                      </h5>
                      <div className="flex flex-wrap gap-1.5">
                        {jdAnalysisResult.missing_keywords?.map((kw, i) => (
                          <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-medium">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {jdAnalysisResult.strengthening_suggestions?.length > 0 && (
                    <div className="p-3.5 bg-gray-50 border border-[#E5E7EB] rounded-2xl">
                      <h5 className="font-bold text-[#222222] mb-1.5">Strengthening Recommendations</h5>
                      <ul className="list-disc list-outside ml-4 space-y-1 text-[#6B7280]">
                        {jdAnalysisResult.strengthening_suggestions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-400 italic">
                    {jdAnalysisResult.disclaimer}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM SECTION MODAL (+ Symbol Modal) */}
      {addCustomSectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#222222]/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-white border-b border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FFF7F7] border border-[#D62828]/20 flex items-center justify-center text-[#D62828]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#222222]">Add Custom Section</h3>
                  <p className="text-[11px] text-[#6B7280]">Enter your own heading and information</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddCustomSectionModalOpen(false);
                  setNewSectionHeading('');
                  setNewSectionContent('');
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1.5">
                  Suggested Headings (Click to select or type your own):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Languages', 'Volunteer Work', 'Honors & Awards', 
                    'Publications', 'Key Achievements', 'Patents & IP', 
                    'Conferences & Talks', 'References', 'Interests & Hobbies'
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setNewSectionHeading(sug)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                        newSectionHeading === sug
                          ? 'bg-[#D62828] text-white border-[#D62828] font-bold shadow-2xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">
                  Section Heading / Title *
                </label>
                <input
                  type="text"
                  value={newSectionHeading}
                  onChange={(e) => setNewSectionHeading(e.target.value)}
                  placeholder="e.g. Languages, Volunteer Work, Publications, Honors..."
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl font-bold focus:outline-none focus:border-[#D62828] text-[#222222]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">
                  Section Information / Details *
                </label>
                <textarea
                  rows={5}
                  value={newSectionContent}
                  onChange={(e) => setNewSectionContent(e.target.value)}
                  placeholder="• Enter bullet points, achievements, or descriptions...&#10;• Example: English (Native), Spanish (Professional)"
                  className="w-full p-3 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828] text-[#222222] leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => {
                    setAddCustomSectionModalOpen(false);
                    setNewSectionHeading('');
                    setNewSectionContent('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#6B7280] hover:text-[#222222] hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomSection}
                  className="px-5 py-2 text-xs font-bold bg-[#D62828] hover:bg-[#A61B1B] text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Section to Resume</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
