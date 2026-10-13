import React from 'react';
import { 
  Mail, Phone, MapPin, Linkedin, Github, Globe, ExternalLink, Calendar, Award, BookOpen
} from 'lucide-react';

export default function ResumeRenderer({ resumeData, templateId = 'classic-professional', printRef }) {
  const data = resumeData || {};
  const personal = data.personal_info || {};
  const summary = data.professional_summary || '';
  const education = data.education || [];
  const experience = data.experience || [];
  const projects = data.projects || [];
  const skills = data.skills || [];
  const certifications = data.certifications || [];
  const additionals = data.additional_sections || [];
  const customization = data.customization || {};

  // Customization tokens
  const fontFamily = customization.font_family || 'Inter';
  const primaryColor = customization.primary_color || '#D62828';
  const spacingMode = customization.layout_spacing || 'normal';

  const spacingClass = 
    spacingMode === 'compact' ? 'space-y-3' :
    spacingMode === 'relaxed' ? 'space-y-6' : 'space-y-4';

  const sectionMargin = 
    spacingMode === 'compact' ? 'mb-3' :
    spacingMode === 'relaxed' ? 'mb-6' : 'mb-4';

  // Determine layout family from 50 unique template IDs
  const getLayoutFamily = (id) => {
    // 1. Bold Header Banner
    if ([
      'corporate-executive', 'chief-technology-officer', 'chief-marketing-officer',
      'mobile-ios-android', 'business-development-exec', 'creative-modern',
      'bold-header', 'creative-brand-director', 'mba-graduate-associate'
    ].includes(id)) return 'bold-header';

    // 2. Modern Asymmetric Split (Dual-Column)
    if ([
      'modern-professional', 'full-stack-developer', 'ai-ml-engineer',
      'frontend-react-lead', 'fintech-quantitative', 'strategic-product-manager',
      'management-consultant', 'modern-two-column', 'digital-growth-marketer'
    ].includes(id)) return 'modern-split';

    // 3. Left Shaded Sidebar
    if ([
      'hr-talent-partner', 'ui-ux-product-designer', 'accent-sidebar', 'internship-resume'
    ].includes(id)) return 'left-sidebar';

    // 4. Compact Tech Grid
    if ([
      'software-developer', 'python-developer', 'data-analyst', 'cloud-devops-architect',
      'operations-director', 'investment-banking-analyst', 'pharmaceutical-researcher',
      'stem-graduate-fresher'
    ].includes(id)) return 'compact-grid';

    // 5. Accent Timeline
    if ([
      'backend-developer', 'cybersecurity-specialist', 'scrum-agile-master',
      'biomedical-engineer', 'fresher-resume'
    ].includes(id)) return 'accent-timeline';

    // 6. Executive Framed
    if ([
      'cfo-finance-director', 'attorney-legal-counsel'
    ].includes(id)) return 'executive-framed';

    // 7. Minimal Border
    if ([
      'clean-minimalist', 'content-copywriting-lead'
    ].includes(id)) return 'minimal-border';

    // 8. ATS Clean Single Column
    if ([
      'ats-classic', 'ats-modern', 'ats-high-volume-screener',
      'ats-hybrid-modern', 'ats-functional-skills'
    ].includes(id)) return 'ats-clean';

    // 9. Classic Single (Default)
    return 'classic-single';
  };

  const layoutFamily = getLayoutFamily(templateId);

  // Common Header Contact Information
  const renderContactItems = (isLightText = false, isCentered = false) => {
    const textColor = isLightText ? 'text-gray-100' : 'text-gray-600';
    const iconColor = isLightText ? 'text-gray-200' : 'text-gray-500';

    return (
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs ${textColor} ${isCentered ? 'justify-center' : ''}`}>
        {personal.email && (
          <span className="flex items-center gap-1.5">
            <Mail className={`w-3.5 h-3.5 ${iconColor}`} />
            <a href={`mailto:${personal.email}`} className="hover:underline">{personal.email}</a>
          </span>
        )}
        {personal.phone && (
          <span className="flex items-center gap-1.5">
            <Phone className={`w-3.5 h-3.5 ${iconColor}`} />
            <span>{personal.phone}</span>
          </span>
        )}
        {personal.city_country && (
          <span className="flex items-center gap-1.5">
            <MapPin className={`w-3.5 h-3.5 ${iconColor}`} />
            <span>{personal.city_country}</span>
          </span>
        )}
        {personal.linkedin_url && (
          <span className="flex items-center gap-1.5">
            <Linkedin className={`w-3.5 h-3.5 ${iconColor}`} />
            <a href={personal.linkedin_url} target="_blank" rel="noreferrer" className="hover:underline">LinkedIn</a>
          </span>
        )}
        {personal.github_url && (
          <span className="flex items-center gap-1.5">
            <Github className={`w-3.5 h-3.5 ${iconColor}`} />
            <a href={personal.github_url} target="_blank" rel="noreferrer" className="hover:underline">GitHub</a>
          </span>
        )}
        {personal.portfolio_url && (
          <span className="flex items-center gap-1.5">
            <Globe className={`w-3.5 h-3.5 ${iconColor}`} />
            <a href={personal.portfolio_url} target="_blank" rel="noreferrer" className="hover:underline">Portfolio</a>
          </span>
        )}
      </div>
    );
  };

  // Section Heading helper
  const renderSectionHeading = (title) => {
    if (layoutFamily === 'ats-clean') {
      return (
        <div className="border-b-2 border-gray-800 pb-1 mb-2.5">
          <h2 className="text-sm font-bold tracking-wider uppercase text-gray-900">{title}</h2>
        </div>
      );
    }
    if (layoutFamily === 'executive-framed') {
      return (
        <div className="border-b-2 border-gray-900 pb-1 mb-3 flex items-center justify-between">
          <h2 className="text-xs font-black tracking-widest uppercase text-gray-950">{title}</h2>
          <div className="w-8 h-1" style={{ backgroundColor: primaryColor }}></div>
        </div>
      );
    }
    if (layoutFamily === 'minimal-border') {
      return (
        <div className="pb-1 mb-2.5">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-gray-900">
            {title}
          </h2>
          <div className="w-12 h-0.5 mt-1" style={{ backgroundColor: primaryColor }}></div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3 border-b border-gray-200 pb-1.5 mb-3">
        <h2 
          className="text-xs font-bold tracking-wider uppercase"
          style={{ color: primaryColor }}
        >
          {title}
        </h2>
        <div className="flex-1 h-[1px] bg-gray-200"></div>
      </div>
    );
  };

  // Sections
  const renderSummary = () => {
    if (!summary) return null;
    return (
      <section className={sectionMargin}>
        {renderSectionHeading('Professional Summary')}
        <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{summary}</p>
      </section>
    );
  };

  const renderExperience = () => {
    if (!experience || experience.length === 0) return null;
    return (
      <section className={sectionMargin}>
        {renderSectionHeading('Experience')}
        <div className="space-y-3.5">
          {experience.map((exp, idx) => (
            <div 
              key={exp.id || idx} 
              className={layoutFamily === 'accent-timeline' ? 'pl-4 border-l-2 relative' : ''}
              style={layoutFamily === 'accent-timeline' ? { borderColor: primaryColor } : {}}
            >
              {layoutFamily === 'accent-timeline' && (
                <div 
                  className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
              <div className="flex items-baseline justify-between flex-wrap gap-1">
                <h3 className="text-xs font-bold text-gray-900">{exp.job_title}</h3>
                <span className="text-[11px] text-gray-500 font-medium">
                  {exp.start_date} – {exp.currently_working ? 'Present' : exp.end_date}
                </span>
              </div>
              <div className="text-xs text-gray-600 font-medium mb-1.5">
                {exp.company}{exp.location ? ` • ${exp.location}` : ''}
                {exp.employment_type ? ` (${exp.employment_type})` : ''}
              </div>

              {exp.responsibilities && (
                <ul className="list-disc list-outside ml-4 space-y-1 text-xs text-gray-700 leading-relaxed">
                  {exp.responsibilities.split('\n').filter(Boolean).map((line, lIdx) => (
                    <li key={lIdx}>{line.replace(/^[•\-*]\s*/, '')}</li>
                  ))}
                </ul>
              )}

              {exp.achievements && (
                <div className="mt-1.5 text-xs text-gray-800 bg-gray-50/80 p-2 rounded border border-gray-100">
                  <span className="font-semibold text-gray-900">Key Highlight: </span>
                  {exp.achievements}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderProjects = () => {
    if (!projects || projects.length === 0) return null;
    return (
      <section className={sectionMargin}>
        {renderSectionHeading('Projects')}
        <div className="space-y-3">
          {projects.map((proj, idx) => (
            <div key={proj.id || idx} className="text-xs">
              <div className="flex items-baseline justify-between flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900">{proj.name}</h3>
                  {proj.technologies && (
                    <span className="text-[11px] text-gray-500 font-normal">
                      | {proj.technologies}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                  {proj.github_url && (
                    <a href={proj.github_url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-0.5">
                      GitHub <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {proj.live_url && (
                    <a href={proj.live_url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-0.5" style={{ color: primaryColor }}>
                      Live <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>

              {proj.description && (
                <ul className="list-disc list-outside ml-4 mt-1 space-y-0.5 text-xs text-gray-700 leading-relaxed">
                  {proj.description.split('\n').filter(Boolean).map((line, lIdx) => (
                    <li key={lIdx}>{line.replace(/^[•\-*]\s*/, '')}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderEducation = () => {
    if (!education || education.length === 0) return null;
    return (
      <section className={sectionMargin}>
        {renderSectionHeading('Education')}
        <div className="space-y-2.5">
          {education.map((edu, idx) => (
            <div key={edu.id || idx} className="text-xs">
              <div className="flex items-baseline justify-between flex-wrap gap-1">
                <h3 className="font-bold text-gray-900">{edu.degree}</h3>
                <span className="text-[11px] text-gray-500">
                  {edu.start_date} – {edu.end_date}
                </span>
              </div>
              <div className="text-gray-600 font-medium">
                {edu.institution}{edu.location ? ` • ${edu.location}` : ''}
                {edu.gpa ? ` • GPA: ${edu.gpa}` : ''}
              </div>
              {edu.coursework && (
                <div className="text-[11px] text-gray-600 mt-0.5">
                  <span className="font-medium text-gray-700">Coursework: </span>
                  {edu.coursework}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderSkills = () => {
    if (!skills || skills.length === 0) return null;
    return (
      <section className={sectionMargin}>
        {renderSectionHeading('Skills')}
        <div className="space-y-1.5 text-xs">
          {skills.map((cat, idx) => (
            <div key={cat.id || idx} className="flex flex-wrap items-baseline gap-1.5">
              <span className="font-semibold text-gray-900 min-w-[120px]">{cat.category_name}:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {(cat.skills || []).map((skill, sIdx) => (
                  <span 
                    key={sIdx}
                    className="inline-block bg-gray-100/80 text-gray-800 text-[11px] px-2 py-0.5 rounded border border-gray-200/60 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderCertifications = () => {
    if (!certifications || certifications.length === 0) return null;
    return (
      <section className={sectionMargin}>
        {renderSectionHeading('Certifications')}
        <div className="space-y-1.5 text-xs">
          {certifications.map((cert, idx) => (
            <div key={cert.id || idx} className="flex items-baseline justify-between flex-wrap gap-1">
              <div>
                <span className="font-semibold text-gray-900">{cert.name}</span>
                <span className="text-gray-600"> — {cert.issuer}</span>
              </div>
              <span className="text-[11px] text-gray-500">{cert.issue_date}</span>
            </div>
          ))}
        </div>
      </section>
    );
  };

  // Render Custom Sections Added by User
  const renderAdditional = () => {
    if (!additionals || additionals.length === 0) return null;
    return (
      <>
        {additionals.map((sec, idx) => {
          const title = sec.title || 'Additional Information';
          const content = sec.content || '';
          if (!content.trim() && !title.trim()) return null;
          
          const lines = content.split('\n').filter(Boolean);
          const hasBullets = lines.some(l => /^[•\-*]/.test(l.trim()));

          return (
            <section key={sec.id || idx} className={sectionMargin}>
              {renderSectionHeading(title)}
              {hasBullets || lines.length > 1 ? (
                <ul className="list-disc list-outside ml-4 space-y-1 text-xs text-gray-700 leading-relaxed">
                  {lines.map((line, lIdx) => (
                    <li key={lIdx}>{line.replace(/^[•\-*]\s*/, '')}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {content}
                </div>
              )}
            </section>
          );
        })}
      </>
    );
  };

  // ==========================================
  // LAYOUT 1: BOLD HEADER BANNER
  // ==========================================
  if (layoutFamily === 'bold-header') {
    return (
      <div 
        ref={printRef}
        className="resume-paper rounded-xl overflow-visible font-sans text-gray-800 bg-white shadow-sm"
        style={{ fontFamily }}
      >
        <div 
          className="p-8 text-white transition-colors"
          style={{ backgroundColor: primaryColor }}
        >
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            {personal.full_name || 'Your Full Name'}
          </h1>
          {personal.professional_title && (
            <p className="text-sm text-gray-100 font-medium mb-3 tracking-wide">
              {personal.professional_title}
            </p>
          )}
          {renderContactItems(true)}
        </div>

        <div className={`p-8 ${spacingClass}`}>
          {renderSummary()}
          {renderExperience()}
          {renderProjects()}
          {renderEducation()}
          {renderSkills()}
          {renderCertifications()}
          {renderAdditional()}
        </div>
      </div>
    );
  }

  // ==========================================
  // LAYOUT 2: MODERN ASYMMETRIC SPLIT
  // ==========================================
  if (layoutFamily === 'modern-split') {
    return (
      <div 
        ref={printRef}
        className="resume-paper rounded-xl overflow-visible font-sans text-gray-800 bg-white p-8 shadow-sm"
        style={{ fontFamily }}
      >
        <div className="border-b-2 pb-5 mb-6" style={{ borderColor: primaryColor }}>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {personal.full_name || 'Your Full Name'}
          </h1>
          {personal.professional_title && (
            <p className="text-sm font-semibold tracking-wide mt-0.5" style={{ color: primaryColor }}>
              {personal.professional_title}
            </p>
          )}
          <div className="mt-2.5">
            {renderContactItems(false)}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-7">
          <div className="col-span-12 md:col-span-8 space-y-4">
            {renderSummary()}
            {renderExperience()}
            {renderProjects()}
          </div>
          <div className="col-span-12 md:col-span-4 space-y-4 border-l border-gray-200 pl-6">
            {renderSkills()}
            {renderEducation()}
            {renderCertifications()}
            {renderAdditional()}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // LAYOUT 3: LEFT SHADED SIDEBAR
  // ==========================================
  if (layoutFamily === 'left-sidebar') {
    return (
      <div 
        ref={printRef}
        className="resume-paper rounded-xl overflow-visible font-sans text-gray-800 bg-white grid grid-cols-12 min-h-[1050px] shadow-sm"
        style={{ fontFamily }}
      >
        {/* Left Column Sidebar */}
        <div className="col-span-12 md:col-span-4 bg-gray-50 border-r border-gray-200 p-6 space-y-5">
          <div>
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md mb-3"
              style={{ backgroundColor: primaryColor }}
            >
              {(personal.full_name || 'U').charAt(0)}
            </div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {personal.full_name || 'Your Full Name'}
            </h1>
            <p className="text-xs font-semibold mt-1" style={{ color: primaryColor }}>
              {personal.professional_title}
            </p>
          </div>

          <div className="space-y-2 border-t border-gray-200 pt-4 text-xs text-gray-600">
            <h3 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Contact</h3>
            {personal.email && <div className="truncate"><a href={`mailto:${personal.email}`}>{personal.email}</a></div>}
            {personal.phone && <div>{personal.phone}</div>}
            {personal.city_country && <div>{personal.city_country}</div>}
            {personal.linkedin_url && <div><a href={personal.linkedin_url} className="text-blue-600 hover:underline">LinkedIn</a></div>}
            {personal.github_url && <div><a href={personal.github_url} className="text-gray-900 hover:underline">GitHub</a></div>}
          </div>

          {renderSkills()}
          {renderEducation()}
          {renderCertifications()}
        </div>

        {/* Right Main Content */}
        <div className="col-span-12 md:col-span-8 p-7 space-y-4">
          {renderSummary()}
          {renderExperience()}
          {renderProjects()}
          {renderAdditional()}
        </div>
      </div>
    );
  }

  // ==========================================
  // LAYOUT 4: EXECUTIVE FRAMED
  // ==========================================
  if (layoutFamily === 'executive-framed') {
    return (
      <div 
        ref={printRef}
        className="resume-paper rounded-xl overflow-visible font-sans text-gray-800 bg-white p-8 shadow-sm border-t-8"
        style={{ fontFamily, borderColor: primaryColor }}
      >
        <div className="border-b-2 border-gray-900 pb-5 mb-6 text-center">
          <div 
            className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-white font-bold text-base mb-2 shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {(personal.full_name || 'U').substring(0, 2).toUpperCase()}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950 uppercase">
            {personal.full_name || 'Your Full Name'}
          </h1>
          {personal.professional_title && (
            <p className="text-xs font-bold tracking-widest text-gray-600 uppercase mt-1">
              {personal.professional_title}
            </p>
          )}
          <div className="mt-3 flex justify-center">
            {renderContactItems(false, true)}
          </div>
        </div>

        <div className={spacingClass}>
          {renderSummary()}
          {renderExperience()}
          {renderProjects()}
          {renderEducation()}
          {renderSkills()}
          {renderCertifications()}
          {renderAdditional()}
        </div>
      </div>
    );
  }

  // ==========================================
  // LAYOUT 5: MINIMAL BORDER
  // ==========================================
  if (layoutFamily === 'minimal-border') {
    return (
      <div 
        ref={printRef}
        className="resume-paper rounded-2xl overflow-visible font-sans text-gray-800 bg-white p-9 shadow-sm border border-gray-200"
        style={{ fontFamily }}
      >
        <div className="pb-5 mb-5 border-b border-gray-100">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {personal.full_name || 'Your Full Name'}
          </h1>
          {personal.professional_title && (
            <p className="text-xs font-medium tracking-wide mt-1 text-gray-500">
              {personal.professional_title}
            </p>
          )}
          <div className="mt-3">
            {renderContactItems(false)}
          </div>
        </div>

        <div className={spacingClass}>
          {renderSummary()}
          {renderExperience()}
          {renderProjects()}
          {renderEducation()}
          {renderSkills()}
          {renderCertifications()}
          {renderAdditional()}
        </div>
      </div>
    );
  }

  // ==========================================
  // LAYOUT 6: CLASSIC SINGLE / ELEGANT TRADITIONAL
  // ==========================================
  if (layoutFamily === 'classic-single') {
    return (
      <div 
        ref={printRef}
        className="resume-paper rounded-xl overflow-visible font-sans text-gray-800 bg-white p-8 shadow-sm"
        style={{ fontFamily }}
      >
        <div className="text-center pb-5 mb-5 border-b border-gray-200">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {personal.full_name || 'Your Full Name'}
          </h1>
          {personal.professional_title && (
            <p className="text-xs font-semibold tracking-wider uppercase mt-1" style={{ color: primaryColor }}>
              {personal.professional_title}
            </p>
          )}
          <div className="mt-2.5 flex justify-center">
            {renderContactItems(false, true)}
          </div>
        </div>

        <div className={spacingClass}>
          {renderSummary()}
          {renderExperience()}
          {renderProjects()}
          {renderEducation()}
          {renderSkills()}
          {renderCertifications()}
          {renderAdditional()}
        </div>
      </div>
    );
  }

  // ==========================================
  // DEFAULT & ATS-CLEAN & COMPACT-GRID & ACCENT-TIMELINE
  // ==========================================
  return (
    <div 
      ref={printRef}
      className="resume-paper rounded-xl overflow-visible font-sans text-gray-800 bg-white p-8 shadow-sm"
      style={{ fontFamily }}
    >
      {/* Header */}
      <div className={`pb-4 ${sectionMargin} border-b border-gray-200 text-left`}>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {personal.full_name || 'Your Full Name'}
        </h1>
        {personal.professional_title && (
          <p 
            className="text-sm font-semibold tracking-wide mt-1"
            style={{ color: layoutFamily === 'ats-clean' ? '#1F2937' : primaryColor }}
          >
            {personal.professional_title}
          </p>
        )}
        <div className="mt-2.5">
          {renderContactItems(false)}
        </div>
      </div>

      <div className={spacingClass}>
        {renderSummary()}
        {renderExperience()}
        {renderProjects()}
        {renderEducation()}
        {renderSkills()}
        {renderCertifications()}
        {renderAdditional()}
      </div>
    </div>
  );
}
