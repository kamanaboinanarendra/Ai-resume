from typing import List, Optional
from pydantic import BaseModel

class TemplateInfo(BaseModel):
    id: str
    name: str
    category: str # "Professional", "Technology", "Student and Fresher", "Creative", "ATS-Friendly"
    description: str
    layout_family: str # "classic-single", "modern-split", "left-sidebar", "bold-header", "accent-timeline", "compact-grid", "ats-clean"
    thumbnail_accent: str
    recommended_for: str

class TemplateListResponse(BaseModel):
    total: int
    categories: List[str]
    templates: List[TemplateInfo]
