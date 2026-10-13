import urllib.parse
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.resume import Resume
from app.schemas.resume import (
    ResumeCreate, ResumeUpdate, ResumeResponse, ResumeListItem, ResumeData
)
from app.api.dependencies import get_current_user
from app.services.pdf_service import generate_resume_pdf
from app.services.resume_parser import parse_uploaded_resume

router = APIRouter(prefix="/resumes", tags=["Resumes"])

@router.get("", response_model=List[ResumeListItem])
def list_my_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all resumes owned by the authenticated user."""
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.updated_at.desc()).all()
    return [ResumeListItem.model_validate(r) for r in resumes]

@router.post("", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
def create_resume(
    resume_in: ResumeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new resume owned by the authenticated user."""
    initial_data = resume_in.resume_data or ResumeData().model_dump()
    new_resume = Resume(
        user_id=current_user.id,
        title=resume_in.title.strip() or "Untitled Resume",
        template_id=resume_in.template_id or "classic-professional",
        resume_data=initial_data,
        revision=1
    )
    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)
    return ResumeResponse.model_validate(new_resume)

@router.post("/parse-file")
async def parse_resume_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Parses an uploaded PDF, DOCX, TXT, or JSON resume from the user's local system.
    Extracts structured fields without saving to the database, allowing user to preview,
    edit directly, or apply any available template.
    """
    try:
        content = await file.read()
        filename = file.filename or "uploaded_resume.txt"
        base_title = os.path.splitext(filename)[0].replace("_", " ").title()
        
        parsed_data = await parse_uploaded_resume(filename, content)
        return {
            "title": base_title,
            "filename": filename,
            "resume_data": parsed_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse resume file: {str(e)}"
        )

@router.post("/import", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def import_resume_file(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    template_id: Optional[str] = Form("classic-professional"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Uploads a resume file from local system, extracts its structured data,
    creates a new resume record in PostgreSQL, and returns it.
    """
    try:
        content = await file.read()
        filename = file.filename or "uploaded_resume.txt"
        resume_title = title or os.path.splitext(filename)[0].replace("_", " ").title()
        
        parsed_data = await parse_uploaded_resume(filename, content)
        
        new_resume = Resume(
            user_id=current_user.id,
            title=resume_title.strip() or "Imported Resume",
            template_id=template_id or "classic-professional",
            resume_data=parsed_data,
            revision=1
        )
        db.add(new_resume)
        db.commit()
        db.refresh(new_resume)
        return ResumeResponse.model_validate(new_resume)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to import resume file: {str(e)}"
        )

@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve a single resume owned by the authenticated user."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You do not own this resume.")
    return ResumeResponse.model_validate(resume)

@router.put("/{resume_id}", response_model=ResumeResponse)
def update_resume(
    resume_id: str,
    resume_in: ResumeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update resume title, template_id, or structured data.
    Enforces ownership and increments revision counter for autosave serialization.
    """
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You do not own this resume.")

    # Concurrency check: if client sent an outdated revision, reject stale overwrite
    if resume_in.revision is not None and resume_in.revision < resume.revision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Conflict: Newer changes exist (current revision {resume.revision}). Please refresh."
        )

    if resume_in.title is not None:
        resume.title = resume_in.title.strip() or resume.title
    if resume_in.template_id is not None:
        resume.template_id = resume_in.template_id
    if resume_in.resume_data is not None:
        resume.resume_data = resume_in.resume_data

    resume.revision += 1
    db.commit()
    db.refresh(resume)
    return ResumeResponse.model_validate(resume)

@router.delete("/{resume_id}", status_code=status.HTTP_200_OK)
def delete_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a resume with confirmation and ownership enforcement."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You do not own this resume.")

    db.delete(resume)
    db.commit()
    return {"message": f"Resume '{resume.title}' deleted successfully."}

@router.post("/{resume_id}/duplicate", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
def duplicate_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Duplicate an existing resume as a new record."""
    source_resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not source_resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
    if source_resume.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You do not own this resume.")

    duplicated = Resume(
        user_id=current_user.id,
        title=f"Copy of {source_resume.title}",
        template_id=source_resume.template_id,
        resume_data=dict(source_resume.resume_data),
        revision=1
    )
    db.add(duplicated)
    db.commit()
    db.refresh(duplicated)
    return ResumeResponse.model_validate(duplicated)

@router.get("/{resume_id}/pdf")
def export_resume_pdf(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate and download server-side PDF for the resume."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    try:
        pdf_buffer = generate_resume_pdf(
            resume_data=resume.resume_data,
            template_id=resume.template_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF generation failed: {str(e)}"
        )

    safe_title = "".join(c for c in resume.title if c.isalnum() or c in (' ', '_', '-')).strip()
    safe_title = safe_title.replace(' ', '_') or "Resume"
    encoded_filename = urllib.parse.quote(f"{safe_title}.pdf")

    headers = {
        "Content-Disposition": f"attachment; filename=\"{safe_title}.pdf\"; filename*=UTF-8''{encoded_filename}",
        "Access-Control-Expose-Headers": "Content-Disposition"
    }

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers=headers
    )
