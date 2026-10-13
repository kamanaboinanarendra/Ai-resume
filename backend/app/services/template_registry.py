from typing import List, Optional
from app.schemas.template import TemplateInfo

TEMPLATES: List[TemplateInfo] = [
    # ==========================================
    # 1-10: PROFESSIONAL & CORPORATE (10 TEMPLATES)
    # ==========================================
    TemplateInfo(
        id="classic-professional",
        name="Classic Professional",
        category="Professional",
        description="Timeless traditional layout with centered header, refined horizontal rules, and balanced typography.",
        layout_family="classic-single",
        thumbnail_accent="#1E293B",
        recommended_for="Mid-to-senior corporate professionals, management, and traditional industries."
    ),
    TemplateInfo(
        id="modern-professional",
        name="Modern Professional",
        category="Professional",
        description="Sleek dual-column layout with left emphasis on summary and credentials, and spacious right experience section.",
        layout_family="modern-split",
        thumbnail_accent="#D62828",
        recommended_for="Engineers, consultants, and business analysts seeking a polished contemporary feel."
    ),
    TemplateInfo(
        id="clean-minimalist",
        name="Clean Minimalist",
        category="Professional",
        description="Airy, high-readability design with subtle dividers, generous margins, and distraction-free typography.",
        layout_family="minimal-border",
        thumbnail_accent="#475569",
        recommended_for="Professionals who prefer understated sophistication and clarity."
    ),
    TemplateInfo(
        id="elegant-traditional",
        name="Elegant Traditional",
        category="Professional",
        description="Classic serif styling with formal section headings and dignified vertical flow.",
        layout_family="classic-single",
        thumbnail_accent="#78350F",
        recommended_for="Legal, finance, administration, and academia."
    ),
    TemplateInfo(
        id="management-consultant",
        name="Management Consultant",
        category="Professional",
        description="Structured case-framework hierarchy highlighting client impact, quantitative savings, and deliverables.",
        layout_family="modern-split",
        thumbnail_accent="#1D4ED8",
        recommended_for="Strategy consultants, Big 4 advisors, and operations consultants."
    ),
    TemplateInfo(
        id="strategic-product-manager",
        name="Strategic Product Manager",
        category="Professional",
        description="Balanced feature-matrix layout spotlighting product roadmaps, cross-functional leadership, and user growth.",
        layout_family="modern-split",
        thumbnail_accent="#4338CA",
        recommended_for="Product managers, technical program managers, and product owners."
    ),
    TemplateInfo(
        id="scrum-agile-master",
        name="Agile Coach & Scrum Master",
        category="Professional",
        description="Sprint and delivery-focused layout detailing team velocity improvements and agile transformations.",
        layout_family="accent-timeline",
        thumbnail_accent="#047857",
        recommended_for="Scrum masters, agile delivery leads, and project managers."
    ),
    TemplateInfo(
        id="hr-talent-partner",
        name="HR & People Operations Lead",
        category="Professional",
        description="Warm, people-focused presentation emphasizing organizational culture, talent acquisition, and HR metrics.",
        layout_family="left-sidebar",
        thumbnail_accent="#0F766E",
        recommended_for="HR business partners, talent acquisition leads, and recruiters."
    ),
    TemplateInfo(
        id="business-development-exec",
        name="Enterprise Sales & BD Executive",
        category="Professional",
        description="Revenue-centric structure featuring deal closure sizes, quota overachievement, and territory growth metrics.",
        layout_family="bold-header",
        thumbnail_accent="#B45309",
        recommended_for="Account executives, sales directors, and business developers."
    ),
    TemplateInfo(
        id="operations-director",
        name="Operations & Logistics Director",
        category="Professional",
        description="Systematic matrix layout detailing supply chain efficiency, warehouse operations, and cost containment.",
        layout_family="compact-grid",
        thumbnail_accent="#334155",
        recommended_for="Supply chain managers, logistics heads, and operations leaders."
    ),

    # ==========================================
    # 11-20: TECHNOLOGY & ENGINEERING (10 TEMPLATES)
    # ==========================================
    TemplateInfo(
        id="software-developer",
        name="Software Developer",
        category="Technology",
        description="Technical-first layout featuring prominent skills matrices, GitHub/live links, and structured project callouts.",
        layout_family="compact-grid",
        thumbnail_accent="#0284C7",
        recommended_for="Software engineers, mobile app developers, and system programmers."
    ),
    TemplateInfo(
        id="python-developer",
        name="Python Developer",
        category="Technology",
        description="Clean tech layout highlighting backend frameworks, databases, package experience, and architectural contributions.",
        layout_family="compact-grid",
        thumbnail_accent="#0D9488",
        recommended_for="Python, Django, FastAPI, data pipelines, and automation specialists."
    ),
    TemplateInfo(
        id="full-stack-developer",
        name="Full Stack Developer",
        category="Technology",
        description="Dynamic split layout balancing frontend/backend skill sets with end-to-end full stack project demonstrations.",
        layout_family="modern-split",
        thumbnail_accent="#4F46E5",
        recommended_for="Full-stack web engineers and product developers."
    ),
    TemplateInfo(
        id="backend-developer",
        name="Backend Developer",
        category="Technology",
        description="Focused single-column technical hierarchy showcasing APIs, cloud infrastructure, and database design.",
        layout_family="accent-timeline",
        thumbnail_accent="#15803D",
        recommended_for="Backend engineers, cloud architects, and DevOps specialists."
    ),
    TemplateInfo(
        id="cloud-devops-architect",
        name="Cloud & DevOps Architect",
        category="Technology",
        description="Infrastructure-first layout showcasing CI/CD pipelines, Kubernetes, Terraform, and cloud reliability.",
        layout_family="compact-grid",
        thumbnail_accent="#0369A1",
        recommended_for="DevOps engineers, SREs, and cloud infrastructure architects."
    ),
    TemplateInfo(
        id="ai-ml-engineer",
        name="AI & Machine Learning Engineer",
        category="Technology",
        description="Research-and-engineering hybrid structure highlighting LLMs, neural networks, PyTorch, and ML deployment.",
        layout_family="modern-split",
        thumbnail_accent="#6D28D9",
        recommended_for="ML engineers, AI researchers, and data science leaders."
    ),
    TemplateInfo(
        id="cybersecurity-specialist",
        name="Cybersecurity Specialist",
        category="Technology",
        description="Security-focused architecture emphasizing threat mitigation, penetration testing, compliance, and SIEM.",
        layout_family="accent-timeline",
        thumbnail_accent="#BE123C",
        recommended_for="SecOps engineers, penetration testers, and CISO staff."
    ),
    TemplateInfo(
        id="mobile-ios-android",
        name="Mobile App Developer",
        category="Technology",
        description="Feature-oriented design emphasizing App Store releases, Flutter/React Native/Swift, and UI responsiveness.",
        layout_family="bold-header",
        thumbnail_accent="#EA580C",
        recommended_for="iOS developers, Android engineers, and cross-platform mobile builders."
    ),
    TemplateInfo(
        id="frontend-react-lead",
        name="Frontend React Specialist",
        category="Technology",
        description="Sleek interface-minded layout highlighting component libraries, Next.js, Web Vitals, and responsive UX.",
        layout_family="modern-split",
        thumbnail_accent="#7C3AED",
        recommended_for="Frontend developers, React engineers, and UI engineers."
    ),
    TemplateInfo(
        id="data-analyst",
        name="Data Analyst",
        category="Technology",
        description="Data-centric layout emphasizing analytical tools, SQL/Python proficiency, BI dashboards, and business insights.",
        layout_family="compact-grid",
        thumbnail_accent="#D97706",
        recommended_for="Data analysts, business intelligence analysts, and data scientists."
    ),

    # ==========================================
    # 21-30: EXECUTIVE & LEADERSHIP (10 TEMPLATES)
    # ==========================================
    TemplateInfo(
        id="corporate-executive",
        name="Corporate Executive",
        category="Executive",
        description="Authoritative structure featuring a distinguished bold banner header, executive summary spotlight, and milestone metrics.",
        layout_family="bold-header",
        thumbnail_accent="#0F172A",
        recommended_for="Directors, VPs, project managers, and executive leadership."
    ),
    TemplateInfo(
        id="chief-technology-officer",
        name="Chief Technology Officer (CTO)",
        category="Executive",
        description="Executive technology layout emphasizing org scaling, R&D budgets, patent portfolios, and digital transformation.",
        layout_family="bold-header",
        thumbnail_accent="#1E1B4B",
        recommended_for="CTOs, VP of Engineering, and Head of Technology applicants."
    ),
    TemplateInfo(
        id="cfo-finance-director",
        name="Chief Financial Officer (CFO)",
        category="Executive",
        description="Distinguished executive layout highlighting P&L management, audit compliance, IPO/fundraising, and capital planning.",
        layout_family="executive-framed",
        thumbnail_accent="#881337",
        recommended_for="CFOs, VP of Finance, and senior controllers."
    ),
    TemplateInfo(
        id="chief-marketing-officer",
        name="Chief Marketing Officer (CMO)",
        category="Executive",
        description="High-impact layout with revenue metrics, CAC/LTV improvement indicators, and global branding campaigns.",
        layout_family="bold-header",
        thumbnail_accent="#9F1239",
        recommended_for="CMOs, VP of Marketing, and global marketing leaders."
    ),
    TemplateInfo(
        id="fintech-quantitative",
        name="FinTech & Quant Analyst",
        category="Executive",
        description="Rigorous analytical structure highlighting quantitative modeling, algorithmic trading, and risk controls.",
        layout_family="modern-split",
        thumbnail_accent="#1E40AF",
        recommended_for="Quant developers, risk analysts, and algorithmic traders."
    ),
    TemplateInfo(
        id="investment-banking-analyst",
        name="Investment Banking Analyst",
        category="Executive",
        description="Dense, formal corporate hierarchy emphasizing M&A transaction volumes, financial modeling, and valuations.",
        layout_family="compact-grid",
        thumbnail_accent="#374151",
        recommended_for="Investment banking analysts, private equity associates, and venture capitalists."
    ),
    TemplateInfo(
        id="chartered-accountant",
        name="Chartered Accountant & CPA",
        category="Executive",
        description="Pristine accounting format detailing statutory audits, GAAP/IFRS expertise, and tax advisory.",
        layout_family="classic-single",
        thumbnail_accent="#115E59",
        recommended_for="CPAs, Chartered Accountants, and corporate controllers."
    ),
    TemplateInfo(
        id="attorney-legal-counsel",
        name="Corporate Attorney & Legal Counsel",
        category="Executive",
        description="Prestigious legal brief layout prioritizing bar admissions, litigation history, and regulatory compliance.",
        layout_family="executive-framed",
        thumbnail_accent="#451A03",
        recommended_for="Attorneys, legal counsels, and law firm partners."
    ),
    TemplateInfo(
        id="medical-physician-doctor",
        name="Medical Physician & Doctor",
        category="Executive",
        description="Clinical credential layout spotlighting medical licenses, residency, fellowships, and clinical procedures.",
        layout_family="classic-single",
        thumbnail_accent="#0369A1",
        recommended_for="Physicians, surgeons, and medical clinical directors."
    ),
    TemplateInfo(
        id="pharmaceutical-researcher",
        name="Biomedical & Clinical Scientist",
        category="Executive",
        description="Academic science layout detailing drug trial phases, peer-reviewed publications, and laboratory certifications.",
        layout_family="compact-grid",
        thumbnail_accent="#065F46",
        recommended_for="Biochemists, clinical trial managers, and biotech researchers."
    ),

    # ==========================================
    # 31-40: CREATIVE & MODERN (10 TEMPLATES)
    # ==========================================
    TemplateInfo(
        id="creative-modern",
        name="Creative Modern",
        category="Creative",
        description="Bold visual identity with distinct primary accent band, icon markers, and modern hierarchy.",
        layout_family="bold-header",
        thumbnail_accent="#E11D48",
        recommended_for="Creative professionals, copywriters, and content creators."
    ),
    TemplateInfo(
        id="ui-ux-product-designer",
        name="UI/UX Product Designer",
        category="Creative",
        description="Portfolio-first layout highlighting design systems, Figma prototypes, user research, and wireframe deliverables.",
        layout_family="left-sidebar",
        thumbnail_accent="#8B5CF6",
        recommended_for="Product designers, UI/UX leads, and design researchers."
    ),
    TemplateInfo(
        id="bold-header",
        name="Bold Header Impact",
        category="Creative",
        description="High-contrast banner design establishing an immediate visual statement with crisp typography.",
        layout_family="bold-header",
        thumbnail_accent="#18181B",
        recommended_for="Job seekers wanting an impactful and memorable initial glance."
    ),
    TemplateInfo(
        id="modern-two-column",
        name="Modern Two-Column",
        category="Creative",
        description="Dynamic asymmetrical layout grouping core competencies on the left with extended accomplishments on the right.",
        layout_family="modern-split",
        thumbnail_accent="#2563EB",
        recommended_for="Professionals with diverse projects, skills, and accomplishments."
    ),
    TemplateInfo(
        id="elegant-typography",
        name="Elegant Editorial Typography",
        category="Creative",
        description="Editorial-inspired hierarchy emphasizing graceful font weight contrasts and sophisticated spacing.",
        layout_family="classic-single",
        thumbnail_accent="#581C87",
        recommended_for="Writers, creative directors, and communications specialists."
    ),
    TemplateInfo(
        id="accent-sidebar",
        name="Accent Color Sidebar",
        category="Creative",
        description="Tinted vertical sidebar separating contact info and technical skills from career chronology.",
        layout_family="left-sidebar",
        thumbnail_accent="#0D9488",
        recommended_for="Engineers and designers seeking a clean, structured visual separation."
    ),
    TemplateInfo(
        id="creative-brand-director",
        name="Creative & Brand Director",
        category="Creative",
        description="Expressive editorial layout showcasing campaign case studies, rebranding wins, and design team management.",
        layout_family="bold-header",
        thumbnail_accent="#DB2777",
        recommended_for="Art directors, brand managers, and creative leads."
    ),
    TemplateInfo(
        id="digital-growth-marketer",
        name="Growth & Performance Marketer",
        category="Creative",
        description="Metric-driven creative layout featuring ROAS, funnel conversion percentages, and omnichannel campaigns.",
        layout_family="modern-split",
        thumbnail_accent="#D97706",
        recommended_for="Growth hackers, performance marketers, and SEO/SEM leads."
    ),
    TemplateInfo(
        id="content-copywriting-lead",
        name="Content Strategist & Writer",
        category="Creative",
        description="Narrative-focused layout detailing viral editorial campaigns, content audits, and brand voice guidelines.",
        layout_family="minimal-border",
        thumbnail_accent="#334155",
        recommended_for="Content managers, copywriters, and communications directors."
    ),
    TemplateInfo(
        id="biomedical-engineer",
        name="Innovation & Design Specialist",
        category="Creative",
        description="Balanced design showcasing patented prototypes, CAD designs, and interdisciplinary team leadership.",
        layout_family="accent-timeline",
        thumbnail_accent="#0284C7",
        recommended_for="Hardware engineers, industrial designers, and prototype specialists."
    ),

    # ==========================================
    # 41-45: STUDENT & FRESHER (5 TEMPLATES)
    # ==========================================
    TemplateInfo(
        id="college-student",
        name="College Student",
        category="Student and Fresher",
        description="Education-first layout designed to highlight coursework, academic projects, leadership, and honors.",
        layout_family="classic-single",
        thumbnail_accent="#0284C7",
        recommended_for="Current college undergraduates and diploma students."
    ),
    TemplateInfo(
        id="fresher-resume",
        name="Fresher Resume",
        category="Student and Fresher",
        description="Entry-level structure focusing on project deliverables, hackathons, certifications, and core competencies.",
        layout_family="accent-timeline",
        thumbnail_accent="#2563EB",
        recommended_for="Recent university graduates entering the professional workforce."
    ),
    TemplateInfo(
        id="internship-resume",
        name="Internship Resume",
        category="Student and Fresher",
        description="Compact, student-friendly layout highlighting coursework, student club leadership, and university awards.",
        layout_family="left-sidebar",
        thumbnail_accent="#0D9488",
        recommended_for="Students applying for summer internships, co-ops, and trainee programs."
    ),
    TemplateInfo(
        id="stem-graduate-fresher",
        name="STEM Graduate Trainee",
        category="Student and Fresher",
        description="Engineering graduate structure spotlighting senior year capstone projects, coding clubs, and lab skills.",
        layout_family="compact-grid",
        thumbnail_accent="#059669",
        recommended_for="Computer science, electronics, and mechanical engineering freshers."
    ),
    TemplateInfo(
        id="mba-graduate-associate",
        name="MBA Graduate Associate",
        category="Student and Fresher",
        description="Postgraduate business layout emphasizing case competitions, summer internship deliverables, and leadership.",
        layout_family="bold-header",
        thumbnail_accent="#7C2D12",
        recommended_for="MBA, PGDM, and master's degree business graduates."
    ),

    # ==========================================
    # 46-50: ATS-FRIENDLY & PARSER-SAFE (5 TEMPLATES)
    # ==========================================
    TemplateInfo(
        id="ats-classic",
        name="ATS Classic",
        category="ATS-Friendly",
        description="Single-column, text-optimized layout strictly engineered for 100% compliance with corporate applicant tracking systems.",
        layout_family="ats-clean",
        thumbnail_accent="#1F2937",
        recommended_for="Candidates applying through enterprise ATS portals like Workday, Taleo, and Greenhouse."
    ),
    TemplateInfo(
        id="ats-modern",
        name="ATS Modern Standard",
        category="ATS-Friendly",
        description="Clean, linear modern presentation that balances automated parser compatibility with exceptional human recruiter readability.",
        layout_family="ats-clean",
        thumbnail_accent="#111827",
        recommended_for="All job seekers seeking maximum parsing accuracy without sacrificing modern aesthetic polish."
    ),
    TemplateInfo(
        id="ats-high-volume-screener",
        name="ATS High-Volume Screener",
        category="ATS-Friendly",
        description="Linear single-column optimized for enterprise scanners with zero complex tables or graphic parser traps.",
        layout_family="ats-clean",
        thumbnail_accent="#1E3A8A",
        recommended_for="High-volume applications across fortune 500 portals."
    ),
    TemplateInfo(
        id="ats-hybrid-modern",
        name="ATS Hybrid Chronological",
        category="ATS-Friendly",
        description="Balanced combination of skills keyword clustering at top followed by strict reverse-chronological experience.",
        layout_family="ats-clean",
        thumbnail_accent="#374151",
        recommended_for="Applicants wanting strong keyword matching alongside verifiable tenure chronology."
    ),
    TemplateInfo(
        id="ats-functional-skills",
        name="ATS Functional Matrix",
        category="ATS-Friendly",
        description="Prominent technical competencies grid directly beneath the header for instant keyword match hits.",
        layout_family="ats-clean",
        thumbnail_accent="#1E40AF",
        recommended_for="Career changers and specialist contractors wanting skill-first parsing."
    ),
]

CATEGORIES = [
    "All",
    "Professional",
    "Technology",
    "Executive",
    "Creative",
    "Student and Fresher",
    "ATS-Friendly"
]

def get_all_templates() -> List[TemplateInfo]:
    return TEMPLATES

def get_template_by_id(template_id: str) -> Optional[TemplateInfo]:
    for t in TEMPLATES:
        if t.id == template_id:
            return t
    return None
