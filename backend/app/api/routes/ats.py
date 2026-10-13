import os
import io
import urllib.parse
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.resume import Resume
from app.api.dependencies import get_current_user
from app.services.resume_parser import extract_text_from_file, parse_resume_heuristically
from app.services.ats_service import ats_scorer
from app.services.pdf_service import generate_ats_report_pdf

router = APIRouter(prefix="/ats", tags=["ATS Resume Checker"])

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB limit
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".json"}

@router.post("/analyze")
async def analyze_resume_ats(
    file: Optional[UploadFile] = File(None),
    resume_id: Optional[str] = Form(None),
    job_title: Optional[str] = Form(None),
    company_name: Optional[str] = Form(None),
    job_description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Analyzes an uploaded resume (PDF, DOCX) or an existing saved resume.
    Calculates deterministic General ATS Compatibility Score (out of 100),
    separate Job Description Match Score (out of 100), category rubrics,
    and contextual AI recommendations.
    """
    resume_data: Dict[str, Any] = {}
    raw_text: str = ""
    source_filename = "resume.pdf"

    # Case 1: Uploaded file
    if file:
        filename = file.filename or "uploaded_resume.pdf"
        source_filename = filename
        ext = os.path.splitext(filename)[1].lower()

        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '{ext}'. Please upload a PDF or DOCX resume document."
            )

        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds the maximum 5 MB limit (uploaded size: {round(len(content) / (1024*1024), 2)} MB)."
            )

        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is empty."
            )

        try:
            raw_text, _ = extract_text_from_file(filename, content)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read or parse document: {str(e)}"
            )

        # Scanned PDF / OCR Detection
        if not raw_text or len(raw_text.strip()) < 40:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "The uploaded document contains insufficient extractable text (< 40 characters). "
                    "If this is a scanned image PDF, optical character recognition (OCR) is required "
                    "because ATS systems cannot read image-only text layers."
                )
            )

        resume_data = parse_resume_heuristically(raw_text)

    # Case 2: Analyze an existing saved resume by ID
    elif resume_id:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Saved resume not found."
            )
        resume_data = resume.resume_data or {}
        source_filename = f"{resume.title}.pdf"
        raw_text = str(resume_data)

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a resume file (PDF or DOCX) to analyze."
        )

    # Calculate deterministic rubric score
    analysis = ats_scorer.analyze(
        resume_data=resume_data,
        job_description=job_description,
        target_role=job_title,
        company_name=company_name,
        raw_text_length=len(raw_text)
    )

    # Enrich with contextual AI recommendations (gracefully skips if offline)
    analysis = await ats_scorer.enrich_with_ai(
        analysis_result=analysis,
        raw_text=raw_text,
        job_description=job_description
    )

    return {
        "filename": source_filename,
        "analysis": analysis,
        **analysis,
        "parsed_resume_data": resume_data
    }

@router.post("/export-report")
async def export_ats_report(
    report_data: Dict[str, Any] = Body(...)
):
    """
    Generates and downloads a server-side PDF audit report of the ATS analysis.
    """
    analysis = report_data.get("analysis") or report_data
    try:
        pdf_buffer = generate_ats_report_pdf(analysis)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate ATS PDF report: {str(e)}"
        )

    filename = "ATS_Resume_Score_Audit_Report.pdf"
    encoded_filename = urllib.parse.quote(filename)
    headers = {
        "Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{encoded_filename}",
        "Access-Control-Expose-Headers": "Content-Disposition"
    }

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers=headers
    )
