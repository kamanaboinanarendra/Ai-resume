import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, UploadCloud, CheckCircle2, AlertCircle, RefreshCw, 
  Download, ArrowRight, Sparkles, ShieldCheck, Target, 
  HelpCircle, AlertTriangle, ChevronDown, ChevronUp, Edit3, 
  FileCheck, Briefcase, Building, Layers, Eye, FileSpreadsheet
} from 'lucide-react';
import api from '../services/api';

export default function ATSCheckerPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Upload & Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [targetJobTitle, setTargetJobTitle] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // User's saved resumes (for quick selection if logged in)
  const [savedResumes, setSavedResumes] = useState([]);
  const [selectedSavedResumeId, setSelectedSavedResumeId] = useState('');

  // Processing & Results State
  const [analyzing, setAnalyzing] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'categories' | 'suggestions' | 'job-match'

  // Load user's saved resumes on mount
  useEffect(() => {
    api.get('/resumes')
      .then((res) => setSavedResumes(res.data || []))
      .catch(() => {});
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
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setError('');
    // Validation: 5MB size limit
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5MB limit. Please upload a smaller file.');
      return;
    }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) {
      setError('Unsupported file format. Please upload a PDF (.pdf) or Word document (.docx).');
      return;
    }
    setSelectedFile(file);
    setSelectedSavedResumeId(''); // clear saved resume selection
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Perform Analysis
  const handleAnalyze = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedFile && !selectedSavedResumeId) {
      setError('Please upload a resume file (PDF/DOCX) or select one of your saved resumes to analyze.');
      return;
    }

    setAnalyzing(true);
    setResults(null);

    const formData = new FormData();
    if (selectedFile) {
      formData.append('file', selectedFile);
    }
    if (selectedSavedResumeId) {
      formData.append('saved_resume_id', selectedSavedResumeId);
    }
    if (targetJobTitle.trim()) {
      formData.append('target_job_title', targetJobTitle.trim());
    }
    if (targetCompany.trim()) {
      formData.append('target_company', targetCompany.trim());
    }
    if (jobDescription.trim()) {
      formData.append('job_description', jobDescription.trim());
    }

    try {
      const response = await api.post('/ats/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(response.data);
      setActiveTab('overview');
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Analysis failed. Please verify that your document is not empty or corrupted.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // Download ATS PDF Report
  const handleDownloadPDFReport = async () => {
    if (!results) return;
    setDownloadingReport(true);
    try {
      const response = await api.post(
        '/ats/export-report',
        {
          general_score: results.general_score,
          job_match_score: results.job_match_score,
          filename: results.filename || 'resume',
          categories: results.categories,
          issues: results.issues,
          keyword_analysis: results.keyword_analysis,
          job_match_analysis: results.job_match_analysis,
          executive_summary: results.executive_summary,
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ATS_Score_Report_${results.filename || 'resume'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate PDF audit report. Please try again.');
    } finally {
      setDownloadingReport(false);
    }
  };

  // Score Color and Badge Utilities
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 65) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreGrade = (score) => {
    if (score >= 85) return 'Excellent ATS Compatibility';
    if (score >= 70) return 'Good - Minor Improvements Needed';
    if (score >= 55) return 'Fair - Moderate Formatting/Keyword Risks';
    return 'Needs Attention - Significant ATS Risks Detected';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Top Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF7F7] border border-[#D62828]/30 text-[#D62828] text-xs font-bold uppercase tracking-wider mb-2.5">
          <Target className="w-3.5 h-3.5" />
          <span>Evidence-Based ATS Evaluator</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">
          Check Your Resume ATS Score
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-[#6B7280] max-w-3xl leading-relaxed">
          Analyze your resume, discover important mistakes, and get practical recommendations to improve compatibility with applicant tracking systems.
        </p>
      </div>

      {/* Main Two-Column Layout (Form on Left / Results or Welcome on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload & Options Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-[#E5E7EB] p-6 shadow-sm">
            <h2 className="text-sm font-bold text-[#222222] mb-4 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#D62828]" />
              <span>1. Upload Resume Document</span>
            </h2>

            {/* Drag & Drop File Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-[#D62828] bg-[#FFF7F7]'
                  : selectedFile
                  ? 'border-emerald-300 bg-emerald-50/40'
                  : 'border-gray-300 hover:border-[#D62828] bg-gray-50/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-[#222222] truncate max-w-full px-2">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready for extraction
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    className="mt-1 text-xs text-red-600 hover:underline font-semibold"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFF7F7] text-[#D62828] flex items-center justify-center shadow-xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#222222]">Click to browse</span>
                    <span className="text-xs text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Supports PDF and DOCX documents (up to 5MB)
                  </p>
                </div>
              )}
            </div>

            {/* Quick Option: Analyze Existing Saved Resume */}
            {savedResumes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="block text-xs font-semibold text-[#222222] mb-1.5">
                  Or pick a resume built in the app:
                </label>
                <select
                  value={selectedSavedResumeId}
                  onChange={(e) => {
                    setSelectedSavedResumeId(e.target.value);
                    if (e.target.value) setSelectedFile(null);
                  }}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828] text-[#222222]"
                >
                  <option value="">-- Choose one of your saved resumes --</option>
                  {savedResumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.template_id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Optional Target Job Match Fields */}
            <div className="mt-6 pt-5 border-t border-gray-100 space-y-4">
              <h2 className="text-sm font-bold text-[#222222] flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#D62828]" />
                <span>2. Target Role (Optional)</span>
              </h2>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Target Job Title
                </label>
                <input
                  type="text"
                  value={targetJobTitle}
                  onChange={(e) => setTargetJobTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828] text-[#222222]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Target Company Name
                </label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. Google, Amazon, Stripe"
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828] text-[#222222]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
                  <span>Job Description</span>
                  <span className="text-[10px] text-gray-400">Enables Job Match Score</span>
                </label>
                <textarea
                  rows={4}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the target job description or requirements here to calculate a dedicated Job Match score..."
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828] text-[#222222] resize-y"
                />
              </div>
            </div>

            {/* Privacy Guarantee Notice */}
            <div className="mt-5 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-2 text-[11px] text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Privacy Guaranteed:</strong> Files are processed in transient memory for extraction and scoring. Your document is never permanently stored or shared publicly.
              </span>
            </div>

            {/* Error Feedback */}
            {error && (
              <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-[#DC2626]">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Action */}
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing || (!selectedFile && !selectedSavedResumeId)}
              className="mt-6 w-full py-3.5 px-4 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Extracting & Analyzing Resume...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Resume ATS Score</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: ATS Results Dashboard or Initial State */}
        <div className="lg:col-span-7">
          {analyzing ? (
            <div className="bg-white rounded-3xl border border-[#E5E7EB] p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full border-4 border-gray-100 border-t-[#D62828] animate-spin flex items-center justify-center">
                <Target className="w-6 h-6 text-[#D62828]" />
              </div>
              <h3 className="text-base font-bold text-[#222222]">Evaluating Resume Compatibility</h3>
              <p className="text-xs text-gray-500 max-w-md">
                Performing deterministic text extraction, verifying core sections, scoring skill keywords, measuring metrics, and evaluating formatting against ATS standards...
              </p>
            </div>
          ) : results ? (
            <div className="space-y-6">
              {/* Main Score Banner */}
              <div className="bg-white rounded-3xl border border-[#E5E7EB] p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  {/* General ATS Score Circle */}
                  <div className="flex items-center gap-5">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="#F3F4F6"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke={results.general_score >= 80 ? '#10B981' : results.general_score >= 65 ? '#2563EB' : results.general_score >= 50 ? '#D97706' : '#DC2626'}
                          strokeWidth="8"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * results.general_score) / 100}
                          strokeLinecap="round"
                          fill="transparent"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-black text-[#222222]">{results.general_score}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">/ 100</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Evaluated Score
                      </span>
                      <h2 className="text-lg font-extrabold text-[#222222]">
                        General ATS Compatibility
                      </h2>
                      <p className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getScoreColor(results.general_score)}`}>
                        {getScoreGrade(results.general_score)}
                      </p>
                    </div>
                  </div>

                  {/* Secondary Job Match Score (If Provided) */}
                  {results.job_match_score !== null && results.job_match_score !== undefined && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-black text-indigo-600">{results.job_match_score}%</div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Match</span>
                      </div>
                      <div className="border-l border-gray-200 pl-3">
                        <h4 className="text-xs font-bold text-gray-900">Job Match Score</h4>
                        <p className="text-[11px] text-gray-500">
                          {results.job_match_analysis?.matched_required_skills?.length || 0} required skills matched
                        </p>
                      </div>
                    </div>
                  )}

                  {/* PDF Download Button */}
                  <div className="flex sm:flex-col gap-2">
                    <button
                      onClick={handleDownloadPDFReport}
                      disabled={downloadingReport}
                      className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      title="Download complete ATS report as PDF"
                    >
                      {downloadingReport ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Export PDF</span>
                    </button>
                    <Link
                      to="/templates"
                      className="px-4 py-2.5 bg-[#FFF7F7] border border-[#D62828]/40 hover:border-[#D62828] text-[#D62828] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Fix in Builder</span>
                    </Link>
                  </div>
                </div>

                {/* Scanned PDF / OCR Alert if detected */}
                {results.ocr_needed && (
                  <div className="mt-5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <strong>Low Extractable Text / Scanned Image Detected:</strong> Most ATS parsers fail when reading image-only PDFs. Consider re-exporting your resume directly from your editor or builder.
                    </div>
                  </div>
                )}

                {/* Rubric Disclaimer */}
                <p className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400 leading-relaxed">
                  * Note: This score is calculated via our documented 5-category scoring rubric (100 pts total) based on real parser compatibility checks. Different employers use different ATS configurations; no software can guarantee an interview.
                </p>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-[#D62828] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Overview & Findings
                </button>
                <button
                  onClick={() => setActiveTab('categories')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    activeTab === 'categories'
                      ? 'bg-[#D62828] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Category Breakdown (5)
                </button>
                <button
                  onClick={() => setActiveTab('suggestions')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    activeTab === 'suggestions'
                      ? 'bg-[#D62828] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Improvement Plan ({results.issues?.length || 0})
                </button>
                {results.job_match_score !== null && (
                  <button
                    onClick={() => setActiveTab('job-match')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      activeTab === 'job-match'
                        ? 'bg-[#D62828] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Job Match Analysis
                  </button>
                )}
              </div>

              {/* TAB 1: OVERVIEW & FINDINGS */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Executive Summary Card */}
                  <div className="bg-white rounded-3xl border border-[#E5E7EB] p-6 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Executive Evaluation
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                      {results.executive_summary || 'Your resume has been processed against industry ATS extraction criteria.'}
                    </p>
                  </div>

                  {/* Category Progress Bars Snapshot */}
                  <div className="bg-white rounded-3xl border border-[#E5E7EB] p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-[#222222]">Scoring Rubric Breakdown</h3>
                    <div className="space-y-3">
                      {results.categories && Object.entries(results.categories).map(([key, cat]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-gray-700">{cat.name}</span>
                            <span className="font-bold text-gray-900">
                              {cat.score} / {cat.max_score} pts
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="h-2.5 rounded-full bg-[#D62828] transition-all duration-700"
                              style={{ width: `${(cat.score / cat.max_score) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* High Priority Quick Wins */}
                  {results.issues && results.issues.filter(i => i.priority === 'High').length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-3xl p-6 space-y-3">
                      <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span>High Priority Issues Requiring Attention</span>
                      </div>
                      <div className="space-y-2.5">
                        {results.issues
                          .filter(i => i.priority === 'High')
                          .slice(0, 3)
                          .map((issue, idx) => (
                            <div key={idx} className="bg-white p-3.5 rounded-2xl border border-red-100 text-xs">
                              <span className="font-bold text-gray-900">{issue.title}: </span>
                              <span className="text-gray-600">{issue.problem}</span>
                              <div className="mt-1.5 text-[#D62828] font-medium">
                                Recommendation: {issue.recommendation}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DETAILED CATEGORY BREAKDOWN */}
              {activeTab === 'categories' && (
                <div className="space-y-4">
                  {results.categories && Object.entries(results.categories).map(([key, cat]) => (
                    <div key={key} className="bg-white rounded-3xl border border-[#E5E7EB] p-6 shadow-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{cat.name}</h4>
                          <span className="text-[11px] text-gray-400">Weighted ATS Component</span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-extrabold text-[#D62828]">{cat.score}</span>
                          <span className="text-xs text-gray-400"> / {cat.max_score} pts</span>
                        </div>
                      </div>

                      {/* Checks performed */}
                      {cat.checks && cat.checks.length > 0 && (
                        <div>
                          <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Checks Performed:
                          </h5>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-gray-600">
                            {cat.checks.map((chk, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                <span>{chk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Strengths */}
                      {cat.strengths && cat.strengths.length > 0 && (
                        <div className="pt-2">
                          <h5 className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                            Identified Strengths:
                          </h5>
                          <ul className="space-y-1 text-xs text-gray-600">
                            {cat.strengths.map((str, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-emerald-500 font-bold">✓</span>
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Issues */}
                      {cat.issues && cat.issues.length > 0 && (
                        <div className="pt-2">
                          <h5 className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-1">
                            Issues to Address:
                          </h5>
                          <ul className="space-y-1 text-xs text-gray-600">
                            {cat.issues.map((iss, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-red-500 font-bold">!</span>
                                <span>{iss}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: PRIORITIZED IMPROVEMENT PLAN */}
              {activeTab === 'suggestions' && (
                <div className="space-y-4">
                  {results.issues && results.issues.length > 0 ? (
                    results.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={`bg-white rounded-3xl border p-6 shadow-sm space-y-3 ${
                          issue.priority === 'High'
                            ? 'border-red-200'
                            : issue.priority === 'Medium'
                            ? 'border-amber-200'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                issue.priority === 'High'
                                  ? 'bg-red-100 text-red-700'
                                  : issue.priority === 'Medium'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {issue.priority} Priority
                            </span>
                            <span className="text-xs font-semibold text-gray-400">
                              {issue.category}
                            </span>
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-gray-900">{issue.title}</h4>

                        <div className="text-xs text-gray-700">
                          <strong>Problem: </strong> {issue.problem}
                        </div>

                        {issue.why_it_matters && (
                          <div className="text-xs text-gray-500 italic">
                            <strong>Why it matters: </strong> {issue.why_it_matters}
                          </div>
                        )}

                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-800">
                          <strong className="text-[#D62828]">Practical Recommendation: </strong>
                          {issue.recommendation}
                        </div>

                        {issue.example && (
                          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900">
                            <strong>Illustrative Example: </strong>
                            <span className="italic font-mono">"{issue.example}"</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="bg-white rounded-3xl border border-[#E5E7EB] p-8 text-center text-gray-500 text-xs">
                      No critical issues found! Your resume passes the primary rubric criteria.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: JOB MATCH ANALYSIS */}
              {activeTab === 'job-match' && results.job_match_analysis && (
                <div className="space-y-6">
                  {/* Match Score Gauge */}
                  <div className="bg-white rounded-3xl border border-[#E5E7EB] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-gray-900">Job Description Alignment</h3>
                      <span className="text-xl font-black text-indigo-600">
                        {results.job_match_score}% Match
                      </span>
                    </div>

                    {/* Matched Required Skills */}
                    <div className="space-y-2 mb-4">
                      <h4 className="text-xs font-bold text-emerald-700">
                        Demonstrated Required Skills ({results.job_match_analysis.matched_required_skills?.length || 0}):
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {results.job_match_analysis.matched_required_skills?.map((sk, i) => (
                          <span
                            key={i}
                            className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-medium"
                          >
                            ✓ {sk}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Missing Required Skills */}
                    <div className="space-y-2 mb-4">
                      <h4 className="text-xs font-bold text-red-600">
                        Missing Required Skills ({results.job_match_analysis.missing_required_skills?.length || 0}):
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {results.job_match_analysis.missing_required_skills?.map((sk, i) => (
                          <span
                            key={i}
                            className="text-xs px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium"
                          >
                            ✗ {sk}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Missing Preferred Skills */}
                    {results.job_match_analysis.missing_preferred_skills?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-amber-700">
                          Missing Preferred / Bonus Skills:
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {results.job_match_analysis.missing_preferred_skills.map((sk, i) => (
                            <span
                              key={i}
                              className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-medium"
                            >
                              + {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Welcome / Empty State Before Analysis */
            <div className="bg-white rounded-3xl border border-[#E5E7EB] p-8 sm:p-12 text-center shadow-sm space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-[#FFF7F7] text-[#D62828] flex items-center justify-center mx-auto shadow-sm">
                <Target className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-[#222222]">Ready to Evaluate Your Resume</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  Upload your resume file on the left or select an existing resume. Our ATS scanner will evaluate parsing readability, section completeness, keywords, measurable metrics, and formatting.
                </p>
              </div>

              {/* Rubric Preview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-4 border-t border-gray-100 max-w-lg mx-auto">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                  <div className="font-bold text-gray-900">1. Parsing & Readability (20)</div>
                  <div className="text-[11px] text-gray-500">Text density, extraction fidelity, no table traps</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                  <div className="font-bold text-gray-900">2. Important Sections (20)</div>
                  <div className="text-[11px] text-gray-500">Contact, summary, experience, skills, education</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                  <div className="font-bold text-gray-900">3. Skills & Keywords (25)</div>
                  <div className="text-[11px] text-gray-500">Technical depth, tools, role-specific vocabulary</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                  <div className="font-bold text-gray-900">4. Experience Quality (20)</div>
                  <div className="text-[11px] text-gray-500">Action verbs, quantified metrics, impact</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
