import re
from typing import Dict, Any, List, Optional, Set, Tuple
import logging
from app.services.gemini_service import gemini_service, GeminiServiceError, GeminiNotConfiguredError
from app.services.job_match_service import COMMON_TECH_KEYWORDS, normalize_text

logger = logging.getLogger(__name__)

# ==============================================================================
# ATS SCORING ENGINE RUBRIC SPECIFICATION (Total: 100 Points)
# ------------------------------------------------------------------------------
# 1. Resume Parsing & Readability         - 20 Points (Category A)
# 2. Important Resume Sections            - 20 Points (Category B)
# 3. Skills & Keyword Coverage            - 25 Points (Category C)
# 4. Experience & Achievement Quality     - 20 Points (Category D)
# 5. Formatting & Consistency             - 15 Points (Category E)
# ==============================================================================

STRONG_ACTION_VERBS = {
    "accelerated", "accomplished", "achieved", "acquired", "administered", "advanced",
    "analyzed", "architected", "automated", "boosted", "built", "centralized", "championed",
    "collaborated", "constructed", "converted", "created", "decreased", "delivered",
    "deployed", "designed", "developed", "devised", "directed", "eliminated", "enabled",
    "engineered", "enhanced", "established", "executed", "expanded", "expedited", "fabricated",
    "facilitated", "formulated", "generated", "guided", "headed", "implemented", "improved",
    "increased", "initiated", "innovated", "inspected", "instituted", "integrated", "introduced",
    "launched", "led", "maximized", "mentored", "migrated", "minimized", "modernized",
    "negotiated", "optimized", "orchestrated", "overhauled", "oversaw", "partnered",
    "pioneered", "planned", "produced", "programmed", "promoted", "re-engineered", "reduced",
    "refactored", "remodeled", "resolved", "restructured", "revamped", "saved", "scaled",
    "secured", "simplified", "slashed", "spearheaded", "standardized", "steered", "streamlined",
    "strengthened", "surpassed", "trained", "transformed", "unified", "upgraded", "validated"
}

PASSIVE_WEAK_STARTERS = [
    "responsible for", "tasked with", "helped to", "helped with", "worked on",
    "assisted in", "assisted with", "handled", "participated in", "duties included",
    "involved in", "supported the", "served as", "contributed to", "part of a team that",
    "was in charge of", "helped the"
]

CLICHE_BUZZWORDS = [
    "go-getter", "think outside the box", "team player", "hard worker", "results-driven",
    "detail-oriented", "synergy", "ninja", "rockstar", "guru", "self-starter",
    "people person", "fast learner", "hardworking", "punctual", "dynamic professional",
    "visionary leader", "passionate developer"
]

METRIC_PATTERNS = [
    r'\b\d+%',                                           # e.g. 25%, 100%
    r'\$\s?\d+(?:,\d{3})*(?:\.\d+)?\s?[kKmMbB]?',        # e.g. $50k, $1.2M, $500
    r'\b\d+(?:\.\d+)?\s?[xX]\b',                         # e.g. 3x, 10x faster
    r'\b\d{1,3}(?:,\d{3})+\b',                           # e.g. 10,000, 150,000
    r'\b\d+\+?\s?(?:users|clients|customers|students|leads|downloads|subscribers|members|requests|endpoints)\b',
    r'\b\d+\+?\s?(?:hours|days|weeks|months|years|minutes|seconds|ms)\b',
    r'\b\d+\+?\s?(?:projects|releases|endpoints|services|repositories|features|bugs|tickets|prs)\b',
    r'\b(?:top|first|1st|2nd|3rd)\s?\d*%\b',
    r'\b\d+\s?(?:million|billion|thousand|k|m)\b'
]

DATE_PATTERNS = [
    r'\b(?:19|20)\d{2}\b',                               # 2023
    r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(?:19|20)\d{2}\b', # Jan 2023
    r'\b\d{1,2}/\d{4}\b',                                # 05/2023
    r'\bPresent\b|\bCurrent\b'
]

def check_contains_metric(text: str) -> bool:
    """Checks if text contains quantifiable numbers, percentages, or scale metrics."""
    text_lower = text.lower()
    for pat in METRIC_PATTERNS:
        if re.search(pat, text_lower):
            return True
    return False

def extract_bullets_from_resume(resume_data: Dict[str, Any]) -> List[Dict[str, str]]:
    """Extracts all work experience and project bullet points with metadata."""
    bullets = []
    
    # Work Experience
    for exp in resume_data.get("experience", []):
        company = exp.get("company", "Experience")
        role = exp.get("job_title", "Role")
        
        for field in ["responsibilities", "achievements"]:
            val = exp.get(field, "")
            if val:
                lines = re.split(r'[\r\n]+|[•\-\*]\s+', val)
                for line in lines:
                    clean = line.strip().lstrip("•-* ").strip()
                    if clean and len(clean) > 8:
                        bullets.append({
                            "section": "Work Experience",
                            "context": f"{role} at {company}",
                            "text": clean
                        })

    # Projects
    for proj in resume_data.get("projects", []):
        name = proj.get("name", "Project")
        desc = proj.get("description", "")
        if desc:
            lines = re.split(r'[\r\n]+|[•\-\*]\s+', desc)
            for line in lines:
                clean = line.strip().lstrip("•-* ").strip()
                if clean and len(clean) > 8:
                    bullets.append({
                        "section": "Projects",
                        "context": f"Project: {name}",
                        "text": clean
                    })

    return bullets

def calculate_full_text(resume_data: Dict[str, Any]) -> str:
    """Aggregates all resume text into a normalized corpus."""
    parts = []
    p = resume_data.get("personal_info", {})
    parts.append(p.get("full_name", ""))
    parts.append(p.get("professional_title", ""))
    parts.append(p.get("email", ""))
    parts.append(p.get("phone", ""))
    parts.append(p.get("city_country", "") or p.get("location", ""))
    parts.append(p.get("linkedin_url", "") or p.get("linkedin", ""))
    parts.append(p.get("github_url", "") or p.get("github", ""))
    parts.append(p.get("portfolio_url", "") or p.get("portfolio", ""))
    parts.append(resume_data.get("professional_summary", ""))

    for exp in resume_data.get("experience", []):
        parts.append(exp.get("job_title", ""))
        parts.append(exp.get("company", ""))
        parts.append(exp.get("location", ""))
        parts.append(exp.get("start_date", ""))
        parts.append(exp.get("end_date", ""))
        parts.append(exp.get("responsibilities", ""))
        parts.append(exp.get("achievements", ""))

    for proj in resume_data.get("projects", []):
        parts.append(proj.get("name", ""))
        parts.append(proj.get("description", ""))
        parts.append(proj.get("technologies", ""))

    for edu in resume_data.get("education", []):
        parts.append(edu.get("degree", ""))
        parts.append(edu.get("institution", ""))
        parts.append(edu.get("field_of_study", ""))
        parts.append(edu.get("coursework", ""))

    for cat in resume_data.get("skills", []):
        parts.append(cat.get("category_name", ""))
        parts.extend(cat.get("skills", []))

    for cert in resume_data.get("certifications", []):
        parts.append(cert.get("name", ""))
        parts.append(cert.get("issuer", ""))

    for sec in resume_data.get("additional_sections", []):
        parts.append(sec.get("title", ""))
        parts.append(sec.get("content", ""))

    return " ".join([str(x) for x in parts if x])


class ATSScorer:
    """
    Deterministic ATS Scoring Engine with documented rubrics and AI contextual explanations.
    """

    def analyze(
        self,
        resume_data: Dict[str, Any],
        job_description: Optional[str] = None,
        target_role: Optional[str] = None,
        company_name: Optional[str] = None,
        raw_text_length: Optional[int] = None
    ) -> Dict[str, Any]:
        full_text = calculate_full_text(resume_data)
        words = re.findall(r'\b[a-zA-Z0-9_\-\.\+\#]+\b', full_text.lower())
        total_word_count = len(words)
        bullets = extract_bullets_from_resume(resume_data)
        total_bullets = len(bullets)

        mistakes: List[Dict[str, Any]] = []
        passed_checks: List[Dict[str, str]] = []

        # =====================================================================
        # CATEGORY A: RESUME PARSING AND READABILITY (20 Points)
        # =====================================================================
        parsing_score = 20
        parsing_strengths: List[str] = []
        parsing_issues: List[str] = []

        # 1. Text extractability & content density
        if total_word_count < 100:
            parsing_score -= 10
            parsing_issues.append("Resume contains insufficient extracted text (< 100 words).")
            mistakes.append({
                "category": "Resume Parsing & Readability",
                "severity": "critical",
                "priority": "high",
                "title": "Insufficient Extractable Text",
                "points_deducted": 10,
                "problem": "The document has very little extractable text. If this was an image-based or heavily formatted PDF, ATS scanners cannot parse your profile.",
                "why_it_matters": "Applicant Tracking Systems parse text streams into relational database tables. When text extraction yields sparse content, the candidate profile is marked incomplete and discarded.",
                "recommendation": "Use a standard text-based PDF or DOCX file with readable digital fonts rather than scanned images or complex canvas drawings."
            })
        elif total_word_count < 250:
            parsing_score -= 5
            parsing_issues.append("Resume length is sparse (under 250 words).")
            mistakes.append({
                "category": "Resume Parsing & Readability",
                "severity": "warning",
                "priority": "medium",
                "title": "Sparse Document Content",
                "points_deducted": 5,
                "problem": f"Your resume contains only {total_word_count} words. Standard professional resumes average 400 - 750 words.",
                "why_it_matters": "Short resumes lack the technical depth, context, and keyword variety needed for automated relevance scoring.",
                "recommendation": "Add technical project details, expand experience descriptions with specific contributions, and flesh out your summary."
            })
        elif total_word_count > 1200:
            parsing_score -= 4
            parsing_issues.append("Resume exceeds optimal single/double page word count (> 1200 words).")
            mistakes.append({
                "category": "Resume Parsing & Readability",
                "severity": "warning",
                "priority": "low",
                "title": "Overly Verbose Resume Length",
                "points_deducted": 4,
                "problem": f"At {total_word_count} words, your resume may stretch onto 3+ pages.",
                "why_it_matters": "Long multi-page resumes dilute keyword density and reduce human recruiter scan rates.",
                "recommendation": "Condense descriptions to recent, high-impact career accomplishments."
            })
        else:
            parsing_strengths.append(f"Optimal word count ({total_word_count} words) ideal for 1-2 page standard review.")

        # 2. Unreadable or non-ASCII encoding checks
        non_ascii_ratio = len([c for c in full_text if ord(c) > 127]) / max(len(full_text), 1)
        if non_ascii_ratio > 0.15:
            parsing_score -= 5
            parsing_issues.append("High ratio of special characters or symbols that may impede ATS OCR/parsers.")
            mistakes.append({
                "category": "Resume Parsing & Readability",
                "severity": "warning",
                "priority": "medium",
                "title": "Potential Encoding or Complex Character Risk",
                "points_deducted": 5,
                "problem": "Unusual symbols, decorative icons, or complex characters make up more than 15% of the text.",
                "why_it_matters": "Some legacy ATS systems render decorative font icons and glyphs as garbled replacement characters (e.g., ???).",
                "recommendation": "Use standard unicode bullet points and standard text characters for contact info."
            })
        else:
            parsing_strengths.append("Clean text encoding with minimal parsing distortion risks.")

        parsing_score = max(min(parsing_score, 20), 0)

        # =====================================================================
        # CATEGORY B: IMPORTANT RESUME SECTIONS (20 Points)
        # =====================================================================
        sections_score = 20
        sections_strengths: List[str] = []
        sections_issues: List[str] = []

        p_info = resume_data.get("personal_info", {})
        has_summary = bool(resume_data.get("professional_summary", "").strip())
        has_experience = bool(resume_data.get("experience", []))
        has_projects = bool(resume_data.get("projects", []))
        has_education = bool(resume_data.get("education", []))
        has_skills = bool(resume_data.get("skills", []))

        # 1. Contact info check (4 points)
        contact_missing = []
        if not p_info.get("full_name"):
            contact_missing.append("Candidate Full Name")
        if not p_info.get("email"):
            contact_missing.append("Email Address")
        if not p_info.get("phone"):
            contact_missing.append("Phone Number")
        if not (p_info.get("city_country") or p_info.get("location")):
            contact_missing.append("City / Location")
        if not (p_info.get("linkedin_url") or p_info.get("linkedin") or "linkedin.com" in full_text.lower()):
            contact_missing.append("LinkedIn Profile")

        if contact_missing:
            ded = min(len(contact_missing) * 1.5, 4.0)
            sections_score -= ded
            sections_issues.append(f"Missing contact items: {', '.join(contact_missing)}.")
            mistakes.append({
                "category": "Important Resume Sections",
                "severity": "critical" if "Email Address" in contact_missing else "warning",
                "priority": "high",
                "title": "Incomplete Contact Information",
                "points_deducted": int(ded),
                "problem": f"Your contact section is missing: {', '.join(contact_missing)}.",
                "why_it_matters": "ATS parsers automatically populate recruiter CRM records from header metadata. Incomplete details prevent scheduling callbacks or reviewing online portfolios.",
                "recommendation": "Include your full name, professional email, phone number, location, and LinkedIn URL in the header."
            })
        else:
            sections_strengths.append("Complete contact header (Name, Email, Phone, Location, LinkedIn).")

        # 2. Professional Summary (4 points)
        if not has_summary:
            sections_score -= 4
            sections_issues.append("Missing Professional Summary section.")
            mistakes.append({
                "category": "Important Resume Sections",
                "severity": "warning",
                "priority": "medium",
                "title": "Missing Professional Summary",
                "points_deducted": 4,
                "problem": "No professional summary or career objective was identified.",
                "why_it_matters": "A concise summary provides immediate semantic context and serves as a prime location to naturally integrate core role keywords.",
                "recommendation": "Add a 3-4 sentence summary summarizing your core title, years of experience, technical specialties, and top achievement."
            })
        else:
            sections_strengths.append("Professional Summary section present.")

        # 3. Work Experience or Projects (4 points) - Accommodates fresh graduates!
        if not has_experience and not has_projects:
            sections_score -= 4
            sections_issues.append("Missing both Work Experience and Projects sections.")
            mistakes.append({
                "category": "Important Resume Sections",
                "severity": "critical",
                "priority": "high",
                "title": "No Experience or Projects Section Found",
                "points_deducted": 4,
                "problem": "Your resume has neither work experience nor technical project entries.",
                "why_it_matters": "Employers screen resumes primarily on demonstrated hands-on work and project outcomes.",
                "recommendation": "If you are a student or fresh graduate, add detailed academic or personal projects. If an experienced professional, detail work history."
            })
        elif not has_experience and has_projects:
            sections_strengths.append("Projects section present (fairly accommodating student/fresh graduate candidates).")
        else:
            sections_strengths.append("Work Experience section present.")

        # 4. Education (4 points)
        if not has_education:
            sections_score -= 4
            sections_issues.append("Missing Education section.")
            mistakes.append({
                "category": "Important Resume Sections",
                "severity": "critical",
                "priority": "high",
                "title": "Missing Education Section",
                "points_deducted": 4,
                "problem": "No education, degree, or university history detected.",
                "why_it_matters": "Many automated job requirements mandate minimum degree thresholds (B.S., B.Tech, M.S., High School).",
                "recommendation": "Add an Education section specifying your degree, university name, and graduation year."
            })
        else:
            sections_strengths.append("Education section present.")

        # 5. Technical Skills (4 points)
        if not has_skills:
            sections_score -= 4
            sections_issues.append("Missing dedicated Skills section.")
            mistakes.append({
                "category": "Important Resume Sections",
                "severity": "critical",
                "priority": "high",
                "title": "Missing Skills Section",
                "points_deducted": 4,
                "problem": "No dedicated Skills section identified.",
                "why_it_matters": "ATS keyword matching engines search dedicated skills taxonomies to score candidates against required qualifications.",
                "recommendation": "Create a distinct Skills section listing your programming languages, tools, frameworks, and methodologies."
            })
        else:
            sections_strengths.append("Dedicated Skills section present.")

        sections_score = max(min(sections_score, 20), 0)

        # =====================================================================
        # CATEGORY C: SKILLS AND KEYWORD COVERAGE (25 Points)
        # =====================================================================
        skills_score = 25
        skills_strengths: List[str] = []
        skills_issues: List[str] = []

        all_skills: List[str] = []
        skill_categories = resume_data.get("skills", [])
        for cat in skill_categories:
            all_skills.extend(cat.get("skills", []))

        skill_count = len(all_skills)

        # 1. Skill count and depth
        if skill_count == 0:
            skills_score -= 15
            skills_issues.append("Skills section contains zero skills.")
            mistakes.append({
                "category": "Skills & Keyword Coverage",
                "severity": "critical",
                "priority": "high",
                "title": "Zero Skills Listed",
                "points_deducted": 15,
                "problem": "Your skills section contains no entries.",
                "why_it_matters": "Keyword indexing will fail to match your resume with applicant filtering algorithms.",
                "recommendation": "List at least 10-18 technical competencies relevant to your target engineering domain."
            })
        elif skill_count < 8:
            skills_score -= 6
            skills_issues.append(f"Low skill count ({skill_count} skills listed).")
            mistakes.append({
                "category": "Skills & Keyword Coverage",
                "severity": "warning",
                "priority": "medium",
                "title": "Low Skill Variety",
                "points_deducted": 6,
                "problem": f"You have only {skill_count} skills listed. Standard technical resumes list 12-20 categorized skills.",
                "why_it_matters": "Listing few skills limits synonym matching when recruiters search for variations (e.g. 'Postgres' vs 'SQL').",
                "recommendation": "Expand your skills list to include frameworks, databases, cloud technologies, and developer tooling."
            })
        else:
            skills_strengths.append(f"Good technical repertoire ({skill_count} skills listed).")

        # 2. Skill categorization
        if skill_categories and len(skill_categories) == 1 and skill_count > 12:
            skills_score -= 4
            skills_issues.append("All skills are in one uncategorized block.")
            mistakes.append({
                "category": "Skills & Keyword Coverage",
                "severity": "warning",
                "priority": "medium",
                "title": "Uncategorized Skills List",
                "points_deducted": 4,
                "problem": "All skills are lumped together without category groupings.",
                "why_it_matters": "Modern ATS NLP models map categorized skill headers (Languages, Frameworks, Cloud, Databases) to corresponding job requirements.",
                "recommendation": "Group skills into distinct categories such as Languages, Web Frameworks, Databases, and Cloud & DevOps."
            })
        elif len(skill_categories) > 1:
            skills_strengths.append(f"Skills are neatly categorized across {len(skill_categories)} groups.")

        # 3. Excessive keyword repetition / keyword stuffing penalty
        word_counts: Dict[str, int] = {}
        for w in words:
            if len(w) > 3 and w in COMMON_TECH_KEYWORDS:
                word_counts[w] = word_counts.get(w, 0) + 1

        stuffed_keywords = [k for k, count in word_counts.items() if count > 12]
        if stuffed_keywords:
            skills_score -= 5
            skills_issues.append(f"Potential keyword stuffing detected ({', '.join(stuffed_keywords)} repeated excessively).")
            mistakes.append({
                "category": "Skills & Keyword Coverage",
                "severity": "warning",
                "priority": "low",
                "title": "Repetitive Keyword Stuffing Risk",
                "points_deducted": 5,
                "problem": f"Terms like '{stuffed_keywords[0]}' appear more than 12 times in your resume.",
                "why_it_matters": "Excessive artificial repetition triggers modern ATS spam heuristics and diminishes readability for human reviewers.",
                "recommendation": "Use keywords naturally in relevant project descriptions rather than repeating the same word excessively."
            })
        else:
            skills_strengths.append("Natural keyword distribution with zero artificial keyword stuffing.")

        skills_score = max(min(skills_score, 25), 0)

        # =====================================================================
        # CATEGORY D: EXPERIENCE & ACHIEVEMENT QUALITY (20 Points)
        # =====================================================================
        quality_score = 20
        quality_strengths: List[str] = []
        quality_issues: List[str] = []

        metric_bullets = [b for b in bullets if check_contains_metric(b["text"])]
        metric_count = len(metric_bullets)
        metric_ratio = (metric_count / max(total_bullets, 1)) if total_bullets > 0 else 0

        # 1. Measurable metrics & quantifiable achievements
        if total_bullets == 0:
            quality_score -= 15
            quality_issues.append("No bullet points describing work accomplishments.")
            mistakes.append({
                "category": "Experience & Achievement Quality",
                "severity": "critical",
                "priority": "high",
                "title": "Missing Descriptive Bullet Points",
                "points_deducted": 15,
                "problem": "Your work experience and projects lack structured bullet points.",
                "why_it_matters": "ATS parsers evaluate accomplishments and responsibilities from bullet points.",
                "recommendation": "Add 3-5 bullet points under each position explaining your technical contributions."
            })
        elif metric_count == 0:
            quality_score -= 10
            quality_issues.append("Zero quantifiable numbers, percentages, or metrics found in bullets.")
            mistakes.append({
                "category": "Experience & Achievement Quality",
                "severity": "critical",
                "priority": "high",
                "title": "Zero Quantifiable Achievements Detected",
                "points_deducted": 10,
                "problem": "None of your bullet points contain measurable metrics (%, $, latency, user numbers, or efficiency).",
                "why_it_matters": "Modern ATS screening models and hiring managers prioritize evidence-based achievements over generic job descriptions.",
                "recommendation": "Use the Google XYZ Formula: 'Accomplished [X], as measured by [Y], by doing [Z]'. Add specific percentages, user scale, or speedups.",
                "example_before": "Responsible for optimizing SQL queries and fixing backend bugs.",
                "example_after": "Optimized PostgreSQL indexes and query plans, cutting API response times by 42% across 1.5M daily queries."
            })
        elif metric_ratio < 0.35:
            quality_score -= 4
            quality_issues.append(f"Low metric density ({round(metric_ratio*100)}% of bullets include metrics vs 40%+ target).")
            mistakes.append({
                "category": "Experience & Achievement Quality",
                "severity": "warning",
                "priority": "medium",
                "title": "Low Metric Density",
                "points_deducted": 4,
                "problem": f"Only {metric_count} of your {total_bullets} bullets include measurable outcomes.",
                "why_it_matters": "Quantified results stand out in competitive applicant pools and demonstrate tangible business value.",
                "recommendation": "Add measurable impact to at least 2 more bullet points (e.g. latency cut, team size, code coverage %, user volume)."
            })
        else:
            quality_strengths.append(f"Strong quantifiable impact ({round(metric_ratio*100)}% of bullets contain concrete metrics).")

        # 2. Action verbs vs weak passive starters
        weak_starter_bullets = []
        strong_verb_count = 0
        for b in bullets:
            t = b["text"].lower()
            matched_weak = next((w for w in PASSIVE_WEAK_STARTERS if t.startswith(w)), None)
            if matched_weak:
                weak_starter_bullets.append(b)
            else:
                first_word = re.split(r'[\s\,\.]+', t)[0]
                if first_word in STRONG_ACTION_VERBS:
                    strong_verb_count += 1

        if weak_starter_bullets:
            ded = min(len(weak_starter_bullets) * 3, 6)
            quality_score -= ded
            quality_issues.append(f"Detected {len(weak_starter_bullets)} bullet points starting with passive phrases.")
            mistakes.append({
                "category": "Experience & Achievement Quality",
                "severity": "warning",
                "priority": "medium",
                "title": "Passive Phrasing in Bullet Points",
                "points_deducted": ded,
                "problem": f"Found bullet points starting with weak phrases like 'Responsible for' or 'Helped with'.",
                "why_it_matters": "Active voice communicates ownership and initiative, which ATS keyword parsers rank significantly higher.",
                "recommendation": "Begin every bullet point with an assertive action verb such as 'Architected', 'Engineered', 'Automated', or 'Spearheaded'.",
                "example_before": weak_starter_bullets[0]["text"],
                "example_after": "Re-engineered core application pipeline, reducing runtime by 30% and improving test reliability."
            })
        else:
            quality_strengths.append("All bullet points use active voice with zero passive starter phrases.")

        quality_score = max(min(quality_score, 20), 0)

        # =====================================================================
        # CATEGORY E: FORMATTING AND CONSISTENCY (15 Points)
        # =====================================================================
        format_score = 15
        format_strengths: List[str] = []
        format_issues: List[str] = []

        # 1. Cliché buzzwords check
        cliches_found = []
        for buzz in CLICHE_BUZZWORDS:
            if re.search(r'\b' + re.escape(buzz) + r'\b', full_text, re.IGNORECASE):
                cliches_found.append(buzz.title())

        if cliches_found:
            format_score -= 4
            format_issues.append(f"Found overused buzzwords: {', '.join(cliches_found)}.")
            mistakes.append({
                "category": "Formatting & Consistency",
                "severity": "warning",
                "priority": "low",
                "title": "Generic Cliché Buzzwords Detected",
                "points_deducted": 4,
                "problem": f"Contains generic buzzwords: {', '.join(cliches_found)}.",
                "why_it_matters": "Empty buzzwords ('hard worker', 'team player') consume space without providing verifiable evidence.",
                "recommendation": "Replace buzzwords with concrete examples of cross-functional delivery and technical accomplishments."
            })
        else:
            format_strengths.append("Professional tone with zero unverified buzzwords or clichés.")

        # 2. Date consistency check
        date_matches = re.findall(r'\b(?:19|20)\d{2}\b', full_text)
        if has_experience and len(date_matches) < len(resume_data.get("experience", [])):
            format_score -= 3
            format_issues.append("Some experience or education entries are missing dates.")
            mistakes.append({
                "category": "Formatting & Consistency",
                "severity": "warning",
                "priority": "medium",
                "title": "Missing or Inconsistent Dates",
                "points_deducted": 3,
                "problem": "Work history or education entries are missing clear start and end dates.",
                "why_it_matters": "ATS parsers calculate total years of experience from timeline dates. Missing dates can lead to inaccurate tenure calculations.",
                "recommendation": "Ensure each experience and education item specifies start and completion years (e.g. 2021 – 2023)."
            })
        else:
            format_strengths.append("Consistent chronological date formatting across sections.")

        # 3. Bullet point lengths
        overly_long_bullets = [b for b in bullets if len(b["text"].split()) > 50]
        if overly_long_bullets:
            format_score -= 3
            format_issues.append("Some bullet points are overly verbose blocks of text (> 50 words).")
            mistakes.append({
                "category": "Formatting & Consistency",
                "severity": "warning",
                "priority": "low",
                "title": "Overly Long Bullet Points",
                "points_deducted": 3,
                "problem": "Found bullet points exceeding 50 words in length.",
                "why_it_matters": "Dense paragraphs of text are hard to read and make it difficult for ATS entity extractors to separate actions from outcomes.",
                "recommendation": "Break lengthy bullet points into concise 15-30 word statements."
            })
        else:
            format_strengths.append("Well-proportioned bullet point lengths for quick scanning.")

        format_score = max(min(format_score, 15), 0)

        # =====================================================================
        # GENERAL ATS SCORE (Total: 100)
        # =====================================================================
        general_score = int(parsing_score + sections_score + skills_score + quality_score + format_score)
        general_score = max(min(general_score, 100), 10)

        if general_score >= 88:
            grade = "A+ (ATS Ready)"
            grade_color = "#10B981"
            verdict = "Excellent! Your resume exhibits high ATS compatibility, robust section organization, and strong quantifiable achievements."
        elif general_score >= 78:
            grade = "A (Strong Match)"
            grade_color = "#059669"
            verdict = "Strong resume foundation. Addressing the highlighted recommendations will position your profile in the top tier of applicants."
        elif general_score >= 65:
            grade = "B (Good - Polish Needed)"
            grade_color = "#D97706"
            verdict = "Solid profile, but specific missing metrics or formatting points may reduce your interview callback rate."
        elif general_score >= 50:
            grade = "C (Fair - Moderate Risk)"
            grade_color = "#EA580C"
            verdict = "Warning: Several key ATS filters will penalize this resume. Resolve the high-priority mistakes below."
        else:
            grade = "D (Needs Substantial Work)"
            grade_color = "#DC2626"
            verdict = "High risk of automated rejection. Critical section or content gaps detected."

        # =====================================================================
        # SEPARATE: JOB DESCRIPTION MATCH SCORE (Out of 100)
        # =====================================================================
        jd_match_result: Optional[Dict[str, Any]] = None
        has_jd = bool(job_description and len(job_description.strip()) > 20)

        if has_jd:
            jd_match_result = self._calculate_job_match(
                resume_data=resume_data,
                full_text=full_text,
                all_skills=all_skills,
                bullets=bullets,
                job_description=job_description or "",
                target_role=target_role,
                company_name=company_name
            )

        # Prioritized action plan
        prioritized_plan = {
            "high_priority": [m for m in mistakes if m.get("priority") == "high"],
            "medium_priority": [m for m in mistakes if m.get("priority") == "medium"],
            "low_priority": [m for m in mistakes if m.get("priority") == "low"]
        }

        categories_dict = {
            "parsing_readability": {
                "score": parsing_score,
                "max": 20,
                "max_score": 20,
                "label": "Resume Parsing & Readability",
                "name": "Resume Parsing & Readability",
                "strengths": parsing_strengths,
                "issues": parsing_issues,
                "checks": [
                    "Text extraction and encoding fidelity",
                    "No multi-column or complex table parsing traps",
                    "Word count and density within normal ATS limits",
                    "Standard non-confusing section organization"
                ]
            },
            "important_sections": {
                "score": sections_score,
                "max": 20,
                "max_score": 20,
                "label": "Important Resume Sections",
                "name": "Important Resume Sections",
                "strengths": sections_strengths,
                "issues": sections_issues,
                "checks": [
                    "Candidate contact info (email, phone, location)",
                    "Work experience or relevant internships",
                    "Structured technical skills section",
                    "Education credentials and institutions",
                    "Professional summary or objective"
                ]
            },
            "skills_keywords": {
                "score": skills_score,
                "max": 25,
                "max_score": 25,
                "label": "Skills & Keyword Coverage",
                "name": "Skills & Keyword Coverage",
                "strengths": skills_strengths,
                "issues": skills_issues,
                "checks": [
                    "Sufficient industry and domain keywords",
                    "Technical languages, frameworks, and tools",
                    "Natural keyword distribution (no artificial stuffing)"
                ]
            },
            "experience_quality": {
                "score": quality_score,
                "max": 20,
                "max_score": 20,
                "label": "Experience & Achievement Quality",
                "name": "Experience & Achievement Quality",
                "strengths": quality_strengths,
                "issues": quality_issues,
                "checks": [
                    "Active voice leadership and engineering verbs",
                    "Quantifiable metrics and measurable results",
                    "Impact-oriented bullet points without passive starters"
                ]
            },
            "formatting_consistency": {
                "score": format_score,
                "max": 15,
                "max_score": 15,
                "label": "Formatting & Consistency",
                "name": "Formatting & Consistency",
                "strengths": format_strengths,
                "issues": format_issues,
                "checks": [
                    "Chronological consistency in dates and tenure",
                    "Zero cliché buzzwords or filler phrasing",
                    "Clean bullet length and scannable visual layout"
                ]
            }
        }

        # Add short category aliases
        categories_dict["parsing"] = categories_dict["parsing_readability"]
        categories_dict["sections"] = categories_dict["important_sections"]
        categories_dict["skills"] = categories_dict["skills_keywords"]
        categories_dict["quality"] = categories_dict["experience_quality"]
        categories_dict["formatting"] = categories_dict["formatting_consistency"]

        return {
            "general_score": general_score,
            "grade": grade,
            "grade_color": grade_color,
            "verdict": verdict,
            "executive_summary": verdict,
            "categories": categories_dict,
            "job_match_score": jd_match_result["match_score"] if jd_match_result else None,
            "job_match_analysis": jd_match_result,
            "job_description_match": jd_match_result,
            "mistakes": mistakes,
            "issues": mistakes,
            "prioritized_plan": prioritized_plan,
            "metrics_summary": {
                "word_count": total_word_count,
                "bullet_count": total_bullets,
                "metric_bullets": metric_count,
                "metric_percentage": round(metric_ratio * 100),
                "skills_count": skill_count,
                "strong_verbs_count": strong_verb_count
            }
        }

    def _calculate_job_match(
        self,
        resume_data: Dict[str, Any],
        full_text: str,
        all_skills: List[str],
        bullets: List[Dict[str, str]],
        job_description: str,
        target_role: Optional[str] = None,
        company_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculates a separate, evidence-based Job Description Match Score out of 100."""
        jd_norm = normalize_text(job_description)
        resume_norm = normalize_text(full_text)

        # Extract target keywords from job description
        jd_keywords_found: Set[str] = set()
        for kw in COMMON_TECH_KEYWORDS:
            if re.search(r'\b' + re.escape(kw) + r'\b', jd_norm):
                jd_keywords_found.add(kw)

        # Also check all candidate skills
        for s in all_skills:
            sc = s.strip().lower()
            if len(sc) > 2 and re.search(r'\b' + re.escape(sc) + r'\b', jd_norm):
                jd_keywords_found.add(sc)

        matched_skills: List[str] = []
        missing_skills: List[str] = []
        demonstrated_skills: List[Dict[str, str]] = []
        mentioned_only_skills: List[str] = []

        for kw in sorted(jd_keywords_found):
            display_name = kw.title() if len(kw) > 3 else kw.upper()
            if re.search(r'\b' + re.escape(kw) + r'\b', resume_norm):
                matched_skills.append(display_name)
                # Check if demonstrated in bullet points
                evidence = next((b["text"] for b in bullets if re.search(r'\b' + re.escape(kw) + r'\b', b["text"].lower())), None)
                if evidence:
                    demonstrated_skills.append({
                        "skill": display_name,
                        "evidence": evidence
                    })
                else:
                    mentioned_only_skills.append(display_name)
            else:
                missing_skills.append(display_name)

        total_reqs = max(len(jd_keywords_found), 1)
        match_ratio = len(matched_skills) / total_reqs
        match_score = int(round(match_ratio * 100))
        match_score = max(min(match_score, 100), 5)

        # Recommendations for JD match
        jd_recommendations = []
        if missing_skills:
            jd_recommendations.append(
                f"Consider naturally adding experience with {', '.join(missing_skills[:5])} if you have genuine experience with these technologies."
            )
        if mentioned_only_skills:
            jd_recommendations.append(
                f"The skills {', '.join(mentioned_only_skills[:4])} appear only in your skills list. Demonstrate your hands-on use in work experience or project bullet points."
            )

        return {
            "has_job_description": True,
            "target_role": target_role or "Target Role",
            "company_name": company_name or None,
            "match_score": match_score,
            "matched_skills": matched_skills,
            "matched_required_skills": matched_skills,
            "missing_skills": missing_skills,
            "missing_required_skills": missing_skills,
            "missing_preferred_skills": [],
            "demonstrated_skills": demonstrated_skills[:6],
            "mentioned_only_skills": mentioned_only_skills[:6],
            "recommendations": jd_recommendations
        }

    async def enrich_with_ai(
        self,
        analysis_result: Dict[str, Any],
        raw_text: str,
        job_description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calls Gemini to provide contextual nuance, customized bullet improvement suggestions,
        and natural phrasing recommendations without modifying deterministic scores.
        """
        if not gemini_service.is_configured():
            analysis_result["ai_context"] = {
                "available": False,
                "note": "AI contextual review offline (API key unconfigured). Deterministic ATS checks completed with 100% accuracy."
            }
            return analysis_result

        prompt = f"""You are a principal ATS and executive resume auditor.
A deterministic ATS analysis was already completed with a General ATS Score of {analysis_result['general_score']}/100.
Do NOT change the score.

Candidate Resume Excerpt:
{raw_text[:2500]}

Target Job Description (if any):
{job_description[:1000] if job_description else 'None provided'}

Provide 3 concise, highly practical, contextual improvements:
1. One specific bullet point rewrite using the Google XYZ formula (Before -> After).
2. One strategic keyword or competency advice tailored to the candidate's field.
3. One high-impact summary recommendation.

Format as JSON with keys:
- "bullet_rewrite": {{"original": "...", "improved": "...", "rationale": "..."}}
- "competency_advice": "..."
- "summary_advice": "..."
"""
        try:
            ai_data = await gemini_service.generate_json(prompt)
            analysis_result["ai_context"] = {
                "available": True,
                "bullet_rewrite": ai_data.get("bullet_rewrite"),
                "competency_advice": ai_data.get("competency_advice"),
                "summary_advice": ai_data.get("summary_advice")
            }
        except Exception as e:
            logger.warning(f"AI enrichment skipped: {e}")
            analysis_result["ai_context"] = {
                "available": False,
                "note": f"AI review temporarily unavailable ({str(e)}). Full deterministic score and rubric checks are preserved."
            }

        return analysis_result


ats_scorer = ATSScorer()
