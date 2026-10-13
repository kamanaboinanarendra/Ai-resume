import re
from typing import Dict, Any, List, Set
from app.services.gemini_service import gemini_service

COMMON_TECH_KEYWORDS = [
    # Languages
    "python", "javascript", "typescript", "java", "c++", "c#", "golang", "rust", "ruby", "php", "sql", "html", "css",
    # Frameworks & Libraries
    "react", "angular", "vue", "next.js", "node.js", "express", "django", "fastapi", "flask", "spring boot", "asp.net",
    "tailwind", "bootstrap", "redux", "graphql", "rest api", "restful",
    # Databases & Caching
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "sqlite", "oracle", "cassandra", "dynamodb",
    # Cloud & DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "git", "github", "gitlab", "linux", "terraform", "ansible",
    # Architecture & Practices
    "microservices", "agile", "scrum", "unit testing", "tdd", "system design", "oop", "mvc", "data structures", "algorithms"
]

def normalize_text(text: str) -> str:
    """Normalize text for consistent keyword matching."""
    return re.sub(r'[^\w\s\+\#\.\/]', ' ', text.lower())

def extract_resume_all_text(resume_data: Dict[str, Any]) -> str:
    """Combines all user-entered resume text into a searchable corpus."""
    tokens = []
    
    # Personal Info
    p = resume_data.get("personal_info", {})
    tokens.append(p.get("professional_title", ""))
    
    # Summary
    tokens.append(resume_data.get("professional_summary", ""))
    
    # Skills
    for cat in resume_data.get("skills", []):
        tokens.append(cat.get("category_name", ""))
        for s in cat.get("skills", []):
            tokens.append(s)
            
    # Experience
    for exp in resume_data.get("experience", []):
        tokens.append(exp.get("job_title", ""))
        tokens.append(exp.get("company", ""))
        tokens.append(exp.get("responsibilities", ""))
        tokens.append(exp.get("achievements", ""))
        
    # Projects
    for proj in resume_data.get("projects", []):
        tokens.append(proj.get("name", ""))
        tokens.append(proj.get("description", ""))
        tokens.append(proj.get("technologies", ""))
        
    # Education
    for edu in resume_data.get("education", []):
        tokens.append(edu.get("degree", ""))
        tokens.append(edu.get("coursework", ""))

    return " ".join(tokens)

async def analyze_job_description_match(
    job_description: str,
    resume_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Performs transparent keyword and skill analysis against the resume data.
    """
    jd_norm = normalize_text(job_description)
    resume_text = extract_resume_all_text(resume_data)
    resume_norm = normalize_text(resume_text)

    # 1. Identify keywords in JD
    jd_keywords_found: Set[str] = set()
    for kw in COMMON_TECH_KEYWORDS:
        # Match as whole word or phrase
        pattern = r'\b' + re.escape(kw) + r'\b'
        if re.search(pattern, jd_norm):
            jd_keywords_found.add(kw)

    # Also detect candidate specific skills mentioned in JD
    for cat in resume_data.get("skills", []):
        for s in cat.get("skills", []):
            s_clean = s.strip().lower()
            if s_clean and len(s_clean) > 2 and re.search(r'\b' + re.escape(s_clean) + r'\b', jd_norm):
                jd_keywords_found.add(s_clean)

    # 2. Check which JD keywords exist in candidate resume
    matched_keywords: List[str] = []
    missing_keywords: List[str] = []

    for kw in sorted(jd_keywords_found):
        pattern = r'\b' + re.escape(kw) + r'\b'
        if re.search(pattern, resume_norm):
            matched_keywords.append(kw.title() if len(kw) > 3 else kw.upper())
        else:
            missing_keywords.append(kw.title() if len(kw) > 3 else kw.upper())

    total_jd_keywords = len(jd_keywords_found)
    if total_jd_keywords > 0:
        coverage_percent = round((len(matched_keywords) / total_jd_keywords) * 100, 1)
        match_score = int(coverage_percent)
    else:
        # General matching if no standard technical keywords are in JD
        words_jd = set(re.findall(r'\b[a-zA-Z]{4,15}\b', jd_norm))
        words_res = set(re.findall(r'\b[a-zA-Z]{4,15}\b', resume_norm))
        overlap = words_jd.intersection(words_res)
        coverage_percent = round((len(overlap) / max(len(words_jd), 1)) * 100, 1)
        match_score = min(max(int(coverage_percent * 1.5), 20), 85)

    # Matched skills specifically from skills section
    resume_skills_set = set()
    for cat in resume_data.get("skills", []):
        for s in cat.get("skills", []):
            resume_skills_set.add(s.strip().lower())

    matched_skills = [
        kw for kw in matched_keywords
        if kw.lower() in resume_skills_set
    ]
    missing_skills = [
        kw for kw in missing_keywords
        if kw.lower() not in resume_skills_set
    ]

    # Generate heuristic advice
    suggestions = []
    if missing_keywords:
        suggestions.append(f"Consider integrating relevant experience with: {', '.join(missing_keywords[:4])} if you have truthful background with them.")
    if len(matched_keywords) < 5:
        suggestions.append("Tailor your professional summary to explicitly mention 2-3 target qualifications highlighted in this role.")
    suggestions.append("Quantify your project outcomes with metrics (e.g. latency reduced, user load handled, test coverage improved).")

    highlights = [
        f"Strong alignment detected in: {', '.join(matched_keywords[:4])}" if matched_keywords else "General background provides an adaptable baseline."
    ]

    # If Gemini is configured, enrich with AI-tailored insights
    if gemini_service.is_configured():
        try:
            ai_insights = await gemini_service.analyze_job_match(
                job_description=job_description,
                resume_summary_text=resume_text
            )
            if ai_insights.get("highlights"):
                highlights = ai_insights["highlights"]
            if ai_insights.get("actionable_tips"):
                suggestions = ai_insights["actionable_tips"]
        except Exception:
            pass # Keep reliable deterministic results

    return {
        "match_score": match_score,
        "matched_skills": matched_skills or matched_keywords[:5],
        "missing_skills": missing_skills[:10],
        "matched_keywords": matched_keywords,
        "missing_keywords": missing_keywords[:12],
        "experience_highlights": highlights,
        "strengthening_suggestions": suggestions,
        "keyword_coverage_percent": coverage_percent,
        "disclaimer": "Score reflects keyword and qualification alignment against provided text. This is an objective alignment heuristic and does not guarantee employer hiring outcomes."
    }
