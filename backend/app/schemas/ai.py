from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    conversation_id: Optional[str] = None
    section_context: Optional[str] = None # e.g. "summary", "experience", "skills", "projects"
    current_text: Optional[str] = None
    resume_context: Optional[Dict[str, Any]] = None

class AIChatResponse(BaseModel):
    reply: str
    conversation_id: str
    suggestion: Optional[str] = None
    section_context: Optional[str] = None

class SummaryImproveRequest(BaseModel):
    text: str = ""
    role: Optional[str] = ""
    skills: Optional[List[str]] = []
    action: str = "improve" # "generate", "improve", "shorten", "action-verbs"

class DescriptionImproveRequest(BaseModel):
    text: str = ""
    role_or_project: Optional[str] = ""
    section_type: str = "experience" # "experience" or "project" or "internship"
    action: str = "improve" # "improve", "ats-optimize", "quantify", "grammar"

class SkillsSuggestRequest(BaseModel):
    job_title: str = ""
    industry: Optional[str] = ""
    current_skills: List[str] = []

class JobAnalyzeRequest(BaseModel):
    job_description: str = Field(..., min_length=10)
    resume_data: Dict[str, Any]

class KeywordMatch(BaseModel):
    keyword: str
    found: bool
    importance: str = "high" # "high", "medium", "standard"

class JobAnalyzeResponse(BaseModel):
    match_score: int # 0 to 100
    matched_skills: List[str]
    missing_skills: List[str]
    matched_keywords: List[str]
    missing_keywords: List[str]
    experience_highlights: List[str]
    strengthening_suggestions: List[str]
    keyword_coverage_percent: float
    disclaimer: str = "Score reflects keyword and qualification alignment against provided text. This is an objective alignment heuristic and does not guarantee employer hiring outcomes."

class ATSScoreRequest(BaseModel):
    resume_id: Optional[str] = None
    resume_data: Optional[Dict[str, Any]] = None
    raw_text: Optional[str] = None
    job_description: Optional[str] = None

class ATSFixBulletRequest(BaseModel):
    bullet_text: str = Field(..., min_length=3)
    mistake_id: Optional[str] = None
    job_title: Optional[str] = None
    action: Optional[str] = "quantify_and_elevate"

