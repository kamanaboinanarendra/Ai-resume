from fastapi import APIRouter, HTTPException, status
from app.schemas.template import TemplateListResponse, TemplateInfo
from app.services.template_registry import get_all_templates, get_template_by_id, CATEGORIES

router = APIRouter(prefix="/templates", tags=["Templates"])

@router.get("", response_model=TemplateListResponse)
def list_templates():
    """Retrieve full catalog of 25 distinct resume templates across 5 categories."""
    templates = get_all_templates()
    return TemplateListResponse(
        total=len(templates),
        categories=CATEGORIES,
        templates=templates
    )

@router.get("/{template_id}", response_model=TemplateInfo)
def get_template(template_id: str):
    """Retrieve details for a specific resume template."""
    tmpl = get_template_by_id(template_id)
    if not tmpl:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' was not found in the registry."
        )
    return tmpl
