import os
import re
import io
import json
import logging
from typing import Dict, Any, Tuple
from pypdf import PdfReader
import docx
from app.schemas.resume import ResumeData
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)

def extract_text_from_file(filename: str, content: bytes) -> Tuple[str, str]:
    """
    Extracts text and format from an uploaded resume file.
    Returns (extracted_text, file_type).
    """
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == ".json":
        text = content.decode("utf-8", errors="replace")
        return text, "json"
    
    if ext == ".pdf":
        try:
            reader = PdfReader(io.BytesIO(content))
            pages_text = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    pages_text.append(page_text)
            return "\n\n".join(pages_text), "pdf"
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            raise ValueError(f"Could not read PDF document: {str(e)}")
            
    if ext in [".docx", ".doc"]:
        try:
            doc = docx.Document(io.BytesIO(content))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_text:
                        paragraphs.append(row_text)
            return "\n".join(paragraphs), "docx"
        except Exception as e:
            logger.error(f"DOCX extraction error: {e}")
            raise ValueError(f"Could not read Word document: {str(e)}")
            
    # Default to plain text
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1", errors="replace")
    return text, "text"


def parse_resume_heuristically(raw_text: str) -> Dict[str, Any]:
    """
    Fast regex and heuristic extractor for resume text.
    """
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    
    # Email
    email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', raw_text)
    email = email_match.group(0) if email_match else ""
    
    # Phone
    phone_match = re.search(r'(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}', raw_text)
    phone = phone_match.group(0).strip() if phone_match else ""
    
    # LinkedIn
    linkedin_match = re.search(r'https?://(?:www\.)?linkedin\.com/in/[A-Za-z0-9_\-]+', raw_text, re.IGNORECASE)
    linkedin = linkedin_match.group(0) if linkedin_match else ""
    
    # GitHub
    github_match = re.search(r'https?://(?:www\.)?github\.com/[A-Za-z0-9_\-]+', raw_text, re.IGNORECASE)
    github = github_match.group(0) if github_match else ""
    
    # Full Name and Professional Title heuristic from first non-contact lines
    candidate_name = ""
    candidate_title = ""
    
    for line in lines[:5]:
        if email and email in line:
            continue
        if phone and phone in line:
            continue
        if "http" in line or "@" in line:
            continue
        if not candidate_name and len(line.split()) in [2, 3, 4] and not any(char in line for char in ":|/"):
            candidate_name = line
            continue
        if candidate_name and not candidate_title and len(line) < 60:
            candidate_title = line
            break
            
    if not candidate_name:
        candidate_name = lines[0] if lines else "Candidate Name"
    if not candidate_title:
        candidate_title = "Professional"

    # Split into rough sections
    sections = {
        "summary": "",
        "experience": [],
        "education": [],
        "skills": [],
        "projects": [],
        "certifications": []
    }
    
    current_section = None
    section_buffer = []
    
    section_keywords = {
        "summary": ["summary", "profile", "about me", "objective", "professional summary"],
        "experience": ["experience", "employment", "work history", "work experience", "professional experience"],
        "education": ["education", "academic", "qualifications", "academics"],
        "skills": ["skills", "technical skills", "competencies", "core skills", "technologies"],
        "projects": ["projects", "personal projects", "academic projects", "key projects"],
        "certifications": ["certifications", "certificates", "licenses", "awards"]
    }
    
    for line in lines:
        lower = line.lower().strip(":").strip()
        matched_section = None
        for sec, keywords in section_keywords.items():
            if any(lower == kw or lower.startswith(kw + " ") for kw in keywords):
                matched_section = sec
                break
                
        if matched_section:
            if current_section and section_buffer:
                sections[current_section] = "\n".join(section_buffer)
            current_section = matched_section
            section_buffer = []
        elif current_section:
            section_buffer.append(line)
            
    if current_section and section_buffer:
        sections[current_section] = "\n".join(section_buffer)
        
    # Process Skills
    parsed_skills = []
    raw_skills_text = sections.get("skills", "")
    if raw_skills_text:
        skill_items = [s.strip().strip("•-*,") for s in re.split(r'[,|•\n]', raw_skills_text) if s.strip()]
        if skill_items:
            parsed_skills.append({
                "id": "1",
                "category_name": "Technical & Core Skills",
                "skills": skill_items[:25]
            })
            
    if not parsed_skills:
        parsed_skills = [
            {"id": "1", "category_name": "Core Skills", "skills": ["Communication", "Problem Solving", "Project Management"]}
        ]
        
    # Process Experience
    raw_exp = sections.get("experience", "")
    exp_list = []
    if raw_exp:
        chunks = re.split(r'\n(?=[A-Z][A-Za-z0-9\s]{2,40}\s*(?:–|-|at|@|,)\s*)', raw_exp)
        for i, chunk in enumerate(chunks[:5]):
            chunk_lines = [c.strip() for c in chunk.splitlines() if c.strip()]
            if not chunk_lines:
                continue
            title_line = chunk_lines[0]
            rest = "\n".join(chunk_lines[1:])
            exp_list.append({
                "id": str(i + 1),
                "job_title": title_line[:40],
                "company": "Company / Organization",
                "location": "City, Country",
                "start_date": "2021",
                "end_date": "Present",
                "currently_working": True,
                "responsibilities": rest or "Collaborated with cross-functional teams to deliver critical deliverables.",
                "achievements": ""
            })
            
    # Process Education
    raw_edu = sections.get("education", "")
    edu_list = []
    if raw_edu:
        edu_lines = [l.strip() for l in raw_edu.splitlines() if l.strip()]
        for i, eline in enumerate(edu_lines[:3]):
            edu_list.append({
                "id": str(i + 1),
                "degree": eline[:50],
                "institution": "University / College",
                "location": "",
                "start_date": "2018",
                "end_date": "2022",
                "gpa": "",
                "coursework": ""
            })
            
    # Projects
    raw_proj = sections.get("projects", "")
    proj_list = []
    if raw_proj:
        proj_lines = [p.strip() for p in raw_proj.splitlines() if p.strip()]
        for i, pline in enumerate(proj_lines[:3]):
            proj_list.append({
                "id": str(i + 1),
                "name": pline[:40],
                "technologies": "",
                "github_url": "",
                "live_url": "",
                "description": pline
            })
            
    return {
        "personal_info": {
            "full_name": candidate_name,
            "professional_title": candidate_title,
            "email": email,
            "phone": phone,
            "city_country": "",
            "linkedin_url": linkedin,
            "github_url": github,
            "portfolio_url": "",
            "photo_url": ""
        },
        "professional_summary": sections.get("summary") or "Dedicated professional with proven expertise and strong track record of success.",
        "experience": exp_list,
        "education": edu_list,
        "projects": proj_list,
        "skills": parsed_skills,
        "certifications": [],
        "additional_sections": [],
        "customization": {
            "font_family": "Inter",
            "primary_color": "#D62828",
            "layout_spacing": "normal"
        }
    }


async def parse_resume_with_ai(raw_text: str) -> Dict[str, Any]:
    """
    Uses Gemini AI or OpenRouter to extract exact structured JSON matching ResumeData schema.
    Falls back gracefully to heuristic parsing if AI is unavailable or fails.
    """
    if not gemini_service.is_configured():
        return parse_resume_heuristically(raw_text)
        
    prompt = f"""You are an expert ATS resume parser. Extract the following raw resume text into a strict JSON object matching this schema:
{{
  "personal_info": {{
    "full_name": "Full Name",
    "professional_title": "Current or Target Title",
    "email": "Email Address",
    "phone": "Phone Number",
    "city_country": "City, Country",
    "linkedin_url": "LinkedIn URL or empty",
    "github_url": "GitHub URL or empty",
    "portfolio_url": "Portfolio URL or empty",
    "photo_url": ""
  }},
  "professional_summary": "Extracted or synthesized professional summary paragraph",
  "experience": [
    {{
      "id": "1",
      "job_title": "Job Title",
      "company": "Company Name",
      "location": "Location",
      "employment_type": "Full-time",
      "start_date": "Year or Month Year",
      "end_date": "Year or Present",
      "currently_working": false,
      "responsibilities": "Bullet points joined with newline",
      "achievements": "Key accomplishments if any"
    }}
  ],
  "education": [
    {{
      "id": "1",
      "degree": "Degree and Major",
      "institution": "University / School",
      "location": "Location",
      "start_date": "Year",
      "end_date": "Year",
      "gpa": "",
      "coursework": ""
    }}
  ],
  "projects": [
    {{
      "id": "1",
      "name": "Project Name",
      "technologies": "Tech stack used",
      "github_url": "",
      "live_url": "",
      "description": "Description of project"
    }}
  ],
  "skills": [
    {{
      "id": "1",
      "category_name": "Technical / Domain Category",
      "skills": ["Skill1", "Skill2"]
    }}
  ],
  "certifications": [
    {{
      "id": "1",
      "name": "Certification Name",
      "issuer": "Issuing Body",
      "issue_date": "Year"
    }}
  ],
  "additional_sections": [],
  "customization": {{
    "font_family": "Inter",
    "primary_color": "#D62828",
    "layout_spacing": "normal"
  }}
}}

Raw Resume Content:
\"\"\"
{raw_text[:8000]}
\"\"\"

Output ONLY valid JSON. Do not include markdown code block syntax (like ```json). Just the raw JSON string."""

    try:
        response_text = await gemini_service.generate_text(prompt, temperature=0.1)
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        data = json.loads(cleaned)
        # Validate against schema
        validated = ResumeData.model_validate(data)
        return validated.model_dump()
    except Exception as e:
        logger.warning(f"AI parsing failed ({e}), falling back to heuristic parsing.")
        return parse_resume_heuristically(raw_text)


async def parse_uploaded_resume(filename: str, content: bytes) -> Dict[str, Any]:
    """
    Unified entrypoint to parse an uploaded file from disk.
    """
    text, file_type = extract_text_from_file(filename, content)
    
    if file_type == "json":
        try:
            data = json.loads(text)
            # If wrapped in resume_data or direct ResumeData
            if "resume_data" in data and isinstance(data["resume_data"], dict):
                data = data["resume_data"]
            validated = ResumeData.model_validate(data)
            return validated.model_dump()
        except Exception as e:
            logger.info(f"JSON validation failed for uploaded file: {e}")
            
    # Extract with AI or heuristics
    return await parse_resume_with_ai(text)
