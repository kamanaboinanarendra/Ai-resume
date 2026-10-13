from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class PersonalInfo(BaseModel):
    full_name: str = ""
    professional_title: str = ""
    email: str = ""
    phone: str = ""
    city_country: str = ""
    linkedin_url: str = ""
    github_url: str = ""
    portfolio_url: str = ""
    photo_url: str = ""

class EducationEntry(BaseModel):
    id: str = ""
    degree: str = ""
    institution: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    gpa: str = ""
    coursework: str = ""

class ExperienceEntry(BaseModel):
    id: str = ""
    job_title: str = ""
    company: str = ""
    location: str = ""
    employment_type: str = "Full-time"
    start_date: str = ""
    end_date: str = ""
    currently_working: bool = False
    responsibilities: str = ""
    achievements: str = ""

class ProjectEntry(BaseModel):
    id: str = ""
    name: str = ""
    description: str = ""
    technologies: str = ""
    github_url: str = ""
    live_url: str = ""

class SkillCategory(BaseModel):
    id: str = ""
    category_name: str = ""
    skills: List[str] = []

class CertificationEntry(BaseModel):
    id: str = ""
    name: str = ""
    issuer: str = ""
    issue_date: str = ""
    credential_url: str = ""

class AdditionalSection(BaseModel):
    id: str = ""
    title: str = ""
    content: str = "" # multi-line or bulleted items

class ResumeCustomization(BaseModel):
    font_family: str = "Inter"
    primary_color: str = "#D62828"
    accent_color: str = "#A61B1B"
    layout_spacing: str = "normal" # compact, normal, relaxed
    section_order: List[str] = [
        "summary",
        "experience",
        "projects",
        "education",
        "skills",
        "certifications",
        "additional"
    ]

class ResumeData(BaseModel):
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    professional_summary: str = ""
    education: List[EducationEntry] = []
    experience: List[ExperienceEntry] = []
    projects: List[ProjectEntry] = []
    skills: List[SkillCategory] = []
    certifications: List[CertificationEntry] = []
    additional_sections: List[AdditionalSection] = []
    customization: ResumeCustomization = Field(default_factory=ResumeCustomization)

class ResumeCreate(BaseModel):
    title: str = "Untitled Resume"
    template_id: str = "classic-professional"
    resume_data: Optional[Dict[str, Any]] = None

class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    template_id: Optional[str] = None
    resume_data: Optional[Dict[str, Any]] = None
    revision: Optional[int] = None # For optimistic concurrency & autosave ordering

class ResumeResponse(BaseModel):
    id: str
    user_id: str
    title: str
    template_id: str
    resume_data: Dict[str, Any]
    revision: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ResumeListItem(BaseModel):
    id: str
    user_id: str
    title: str
    template_id: str
    revision: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
