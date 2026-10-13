import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Search, Sparkles, Eye, ArrowRight, Check, X, LayoutTemplate, 
  Info, FileEdit, CheckCircle2, RefreshCw, Layout 
} from 'lucide-react';
import api from '../services/api';
import ResumeRenderer from '../templates/ResumeRenderer';

// Complete demonstration resume data for realistic gallery preview & sample display
const SAMPLE_PREVIEW_DATA = {
  personal_info: {
    full_name: "Alex Morgan",
    professional_title: "Senior Full Stack & AI Engineer",
    email: "alex.morgan@example.com",
    phone: "+1 (555) 234-5678",
    city_country: "San Francisco, CA",
    linkedin_url: "https://linkedin.com/in/alexmorgan",
    github_url: "https://github.com/alexmorgan",
    portfolio_url: "https://alexmorgan.dev"
  },
  professional_summary: "Results-driven Software Engineer with 6+ years of experience architecting high-throughput microservices, real-time distributed platforms, and production-grade Generative AI applications. Track record of reducing system latency by 40% and leading agile engineering squads to deliver mission-critical enterprise deliverables.",
  experience: [
    {
      id: "1",
      job_title: "Senior Full Stack & AI Lead",
      company: "Nexus Technologies",
      location: "San Francisco, CA",
      employment_type: "Full-time",
      start_date: "2022",
      end_date: "Present",
      currently_working: true,
      responsibilities: "Architected distributed analytics pipeline with FastAPI, PostgreSQL, and Redis handling 3M+ daily requests.\nEngineered modern React component design system with responsive layouts and sub-second rendering.\nIntegrated Gemini LLM workflows for automated candidate screening and unstructured data classification.",
      achievements: "Reduced server response time by 40% through intelligent query caching and index restructuring."
    },
    {
      id: "2",
      job_title: "Software Engineer",
      company: "Apex Digital Labs",
      location: "Austin, TX",
      employment_type: "Full-time",
      start_date: "2019",
      end_date: "2022",
      currently_working: false,
      responsibilities: "Developed RESTful APIs and integrated third-party payment gateways with 99.99% uptime.\nRefactored legacy monolith into Dockerized microservices, cutting deployment cycles from 2 hours to 10 minutes.",
      achievements: "Recognized with Engineering Excellence Award for zero-downtime database migration."
    }
  ],
  education: [
    {
      id: "1",
      degree: "B.Tech in Computer Science & Engineering",
      institution: "State University of Technology",
      location: "Austin, TX",
      start_date: "2015",
      end_date: "2019",
      gpa: "3.88 / 4.0",
      coursework: "Data Structures & Algorithms, Distributed Systems, Database Management, Machine Learning"
    }
  ],
  projects: [
    {
      id: "1",
      name: "CloudScale Distributed Monitor",
      technologies: "Python, FastAPI, Redis, Docker, Tailwind CSS",
      github_url: "https://github.com/alexmorgan/cloudscale",
      live_url: "https://cloudscale.demo",
      description: "Real-time telemetry dashboard monitoring server clusters with automated alert triggers and predictive load forecasting."
    }
  ],
  skills: [
    { id: "1", category_name: "Languages & Core", skills: ["Python", "JavaScript", "TypeScript", "SQL", "Go"] },
    { id: "2", category_name: "Frameworks & Cloud", skills: ["React", "FastAPI", "Node.js", "Docker", "PostgreSQL", "AWS", "Tailwind CSS"] }
  ],
  certifications: [
    { id: "1", name: "AWS Certified Solutions Architect – Associate", issuer: "Amazon Web Services", issue_date: "2023" }
  ],
  customization: {
    font_family: "Inter",
    primary_color: "#D62828",
    layout_spacing: "normal"
  }
};

export default function TemplateGalleryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Route contexts
  const noticeCreateFirst = searchParams.get('notice') === 'create_first';
  const switchForResumeId = searchParams.get('switch_for_resume');
  const applyImportMode = searchParams.get('apply_import') === 'true';

  // Check for imported resume stored in session
  const [importResumeData, setImportResumeData] = useState(null);
  const [switchResumeTitle, setSwitchResumeTitle] = useState('');

  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    // Check pending import data
    const rawImport = sessionStorage.getItem('import_resume_data');
    if (rawImport) {
      try {
        const parsed = JSON.parse(rawImport);
        setImportResumeData(parsed);
      } catch (err) {
        console.error('Error parsing import resume from session:', err);
      }
    }

    // Check if switching template for existing resume
    if (switchForResumeId) {
      api.get(`/resumes/${switchForResumeId}`)
        .then((res) => setSwitchResumeTitle(res.data.title || 'Resume'))
        .catch(() => {});
    }

    const fetchTemplates = async () => {
      try {
        const res = await api.get('/templates');
        setTemplates(res.data.templates || []);
        setCategories(res.data.categories || ["All"]);
      } catch (err) {
        console.error('Failed to load templates catalog:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [switchForResumeId]);

  const handleUseTemplate = async (templateId) => {
    setActionInProgress(true);
    try {
      const selectedTmpl = templates.find((t) => t.id === templateId);
      const chosenColor = selectedTmpl?.thumbnail_accent || '#D62828';

      // Case 1: Switching template for an existing resume
      if (switchForResumeId) {
        await api.put(`/resumes/${switchForResumeId}`, {
          template_id: templateId
        });
        localStorage.setItem('last_active_resume_id', switchForResumeId);
        navigate(`/builder/${switchForResumeId}`);
        return;
      }

      // Case 2: Applying template for imported resume file from system
      if (importResumeData) {
        const res = await api.post('/resumes', {
          title: importResumeData.title || 'Imported Resume',
          template_id: templateId,
          resume_data: {
            ...importResumeData.resume_data,
            customization: {
              ...(importResumeData.resume_data.customization || {}),
              primary_color: chosenColor
            }
          }
        });
        sessionStorage.removeItem('import_resume_data');
        localStorage.setItem('last_active_resume_id', res.data.id);
        localStorage.setItem('last_active_resume_title', res.data.title);
        navigate(`/builder/${res.data.id}`);
        return;
      }

      // Case 3: Creating standard new resume with chosen template
      const res = await api.post('/resumes', {
        title: "My New Resume",
        template_id: templateId,
        resume_data: {
          ...SAMPLE_PREVIEW_DATA,
          customization: {
            ...SAMPLE_PREVIEW_DATA.customization,
            primary_color: chosenColor
          }
        }
      });
      localStorage.setItem('last_active_resume_id', res.data.id);
      localStorage.setItem('last_active_resume_title', "My New Resume");
      navigate(`/builder/${res.data.id}`);
    } catch (err) {
      console.error('Failed to initialize or apply resume template:', err);
      alert('Could not apply resume template. Please try again.');
    } finally {
      setActionInProgress(false);
    }
  };

  const filteredTemplates = templates.filter((tmpl) => {
    const matchesCategory =
      selectedCategory === 'All' || tmpl.category === selectedCategory;
    const matchesSearch =
      tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.layout_family.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tmpl.recommended_for && tmpl.recommended_for.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Dynamic Context Banners */}
      {importResumeData && (
        <div className="mb-6 p-4 rounded-2xl bg-[#FFF7F7] border border-[#D62828]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D62828] text-white flex items-center justify-center flex-shrink-0">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#222222]">
                Applying template for your selected file: <strong>{importResumeData.title}</strong>
              </span>
              <p className="text-[11px] text-[#6B7280]">
                Choose any template below to render your imported resume content into that professional layout.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('import_resume_data');
              setImportResumeData(null);
            }}
            className="text-xs text-[#6B7280] hover:text-[#222222] underline"
          >
            Cancel import
          </button>
        </div>
      )}

      {switchForResumeId && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <Layout className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-xs">
              <strong className="font-semibold text-blue-950">
                Changing template for "{switchResumeTitle || 'Your Resume'}"
              </strong>
              <p className="text-blue-800 text-[11px]">
                Click "Use Template" on any design to instantly convert your resume to that layout.
              </p>
            </div>
          </div>
          <Link
            to={`/builder/${switchForResumeId}`}
            className="text-xs font-semibold text-blue-700 hover:underline"
          >
            Back to editor
          </Link>
        </div>
      )}

      {noticeCreateFirst && !importResumeData && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3 shadow-xs animate-in fade-in">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="text-xs">
            <strong className="font-semibold text-amber-950">You don't have any resume created yet.</strong>
            <p className="mt-0.5 text-amber-800">
              Select any of the 50 professional templates below to generate your initial resume. You can then edit every section, content, and style freely!
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF7F7] border border-[#E5E7EB] text-[#D62828] text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>50 Professional High-Impact Layouts</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#222222] tracking-tight">
          Available Templates Catalog
        </h1>
        <p className="mt-3 text-sm sm:text-base text-[#6B7280]">
          Explore our collection of 50 unique, professionally engineered resume templates. Each design features a distinct visual layout, curated color accents, and optimal ATS parsing structure.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-white p-3.5 rounded-2xl border border-[#E5E7EB] shadow-xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#D62828] text-white shadow-xs font-semibold'
                  : 'text-[#6B7280] hover:text-[#222222] hover:bg-[#FFF7F7]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 50 templates by role, layout, or keywords..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#D62828] focus:bg-white text-[#222222]"
          />
        </div>
      </div>

      {/* Templates Count Bar */}
      <div className="flex items-center justify-between mb-6 px-1">
        <span className="text-xs font-bold text-[#6B7280]">
          Showing {filteredTemplates.length} of {templates.length} templates
        </span>
        <span className="text-[11px] text-[#6B7280]">
          Click any card to inspect full-size photo preview
        </span>
      </div>

      {/* Templates Grid with Full Photo Previews */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-[#E5E7EB] border-t-[#D62828] rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-[#6B7280]">Loading 65 professional template layouts...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-[#E5E7EB] p-8">
          <LayoutTemplate className="w-12 h-12 text-[#6B7280] mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-semibold text-[#222222]">No templates found</h3>
          <p className="text-xs text-[#6B7280] mt-1">Try adjusting your search or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
          {filteredTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="group bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#D62828]/50 shadow-xs hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden"
            >
              {/* Full Realistic Photo Preview Container */}
              <div 
                className="relative h-[390px] bg-gray-100/80 border-b border-[#E5E7EB] p-3 flex flex-col items-center justify-start overflow-hidden cursor-pointer group/thumb"
                onClick={() => setPreviewTemplate(tmpl)}
              >
                {/* Scaled A4 Full Document Sheet with Genuine Info */}
                <div className="w-[760px] bg-white rounded-lg shadow-md border border-gray-300/80 origin-top transform scale-[0.34] sm:scale-[0.35] pointer-events-none select-none transition-transform duration-300 group-hover:scale-[0.36]">
                  <ResumeRenderer 
                    resumeData={{
                      ...(importResumeData?.resume_data || SAMPLE_PREVIEW_DATA),
                      customization: {
                        ...(importResumeData?.resume_data?.customization || SAMPLE_PREVIEW_DATA.customization),
                        primary_color: tmpl.thumbnail_accent || '#D62828'
                      }
                    }}
                    templateId={tmpl.id}
                  />
                </div>

                {/* Top Badge Overlay */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white shadow-xs uppercase tracking-wider"
                    style={{ backgroundColor: tmpl.thumbnail_accent || '#D62828' }}
                  >
                    {tmpl.category}
                  </span>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-white/95 text-[#222222] border border-gray-200/90 shadow-2xs">
                    {tmpl.layout_family}
                  </span>
                </div>

                {/* Hover Quick Action Overlay */}
                <div className="absolute inset-0 bg-[#222222]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 z-20">
                  <span className="inline-flex items-center gap-1.5 bg-white text-[#222222] font-semibold text-xs px-3.5 py-2 rounded-xl shadow-md transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Zoom Full Preview</span>
                  </span>
                </div>
              </div>

              {/* Template Details & Primary Action */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h3 className="font-bold text-sm text-[#222222] group-hover:text-[#D62828] transition-colors truncate">
                      {tmpl.name}
                    </h3>
                  </div>
                  <p className="text-xs text-[#6B7280] line-clamp-2 mb-2">
                    {tmpl.description}
                  </p>
                  {tmpl.recommended_for && (
                    <p className="text-[11px] text-[#6B7280] bg-gray-50 p-2 rounded-lg border border-gray-100 mb-3 truncate">
                      <strong className="text-gray-800">Best for: </strong>{tmpl.recommended_for}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#E5E7EB] flex items-center gap-2">
                  <button
                    onClick={() => setPreviewTemplate(tmpl)}
                    className="flex-1 py-2 text-xs font-semibold text-[#222222] hover:text-[#D62828] hover:bg-[#FFF7F7] rounded-xl border border-[#E5E7EB] transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Full Preview</span>
                  </button>
                  <button
                    onClick={() => handleUseTemplate(tmpl.id)}
                    disabled={actionInProgress}
                    className="flex-1 py-2 text-xs font-semibold bg-[#D62828] hover:bg-[#A61B1B] text-white rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <span>Use Template</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Realistic High-Definition Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-[#222222]/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-white border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-[#222222]">{previewTemplate.name}</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FFF7F7] text-[#D62828] border border-[#E5E7EB] font-semibold">
                    {previewTemplate.category}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">{previewTemplate.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    handleUseTemplate(previewTemplate.id);
                    setPreviewTemplate(null);
                  }}
                  disabled={actionInProgress}
                  className="px-4 py-2 bg-[#D62828] hover:bg-[#A61B1B] text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Use This Template</span>
                </button>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="p-2 text-[#6B7280] hover:text-[#222222] hover:bg-gray-100 rounded-xl"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Resume Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100 flex justify-center items-start">
              <div className="w-full max-w-[800px] shadow-xl rounded-xl bg-white mb-12">
                <ResumeRenderer 
                  resumeData={{
                    ...(importResumeData?.resume_data || SAMPLE_PREVIEW_DATA),
                    customization: {
                      ...(importResumeData?.resume_data?.customization || SAMPLE_PREVIEW_DATA.customization),
                      primary_color: previewTemplate.thumbnail_accent || '#D62828'
                    }
                  }}
                  templateId={previewTemplate.id}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
