from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.conversation import Conversation, Message
from app.schemas.ai import (
    AIChatRequest, AIChatResponse,
    SummaryImproveRequest, DescriptionImproveRequest,
    SkillsSuggestRequest, JobAnalyzeRequest, JobAnalyzeResponse
)
from app.api.dependencies import get_current_user
from app.services.gemini_service import gemini_service, GeminiServiceError, GeminiNotConfiguredError
from app.services.job_match_service import analyze_job_description_match

router = APIRouter(prefix="/ai", tags=["AI Assistance"])

@router.post("/chat", response_model=AIChatResponse)
async def chat_with_assistant(
    chat_req: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Main endpoint for the persistent floating AI assistant.
    Maintains conversation persistence in the database and injects section context.
    """
    # 1. Retrieve or create conversation for user
    conversation = None
    if chat_req.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == chat_req.conversation_id,
            Conversation.user_id == current_user.id
        ).first()

    if not conversation:
        conversation = Conversation(
            user_id=current_user.id,
            title="AI Resume Assistance"
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 2. Record user message
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=chat_req.message.strip(),
        section_context=chat_req.section_context
    )
    db.add(user_msg)
    db.commit()

    # 3. Build recent history for context
    past_messages = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.created_at.asc()).all()

    history_payload = [
        {"role": m.role, "content": m.content}
        for m in past_messages[-6:]
    ]

    # 4. Invoke Gemini service
    try:
        gemini_result = await gemini_service.generate_chat_response(
            message=chat_req.message,
            history=history_payload,
            section_context=chat_req.section_context,
            current_text=chat_req.current_text,
            resume_context=chat_req.resume_context
        )
        reply_text = gemini_result["reply"]
        suggestion_text = gemini_result["suggestion"]
    except GeminiNotConfiguredError as e:
        reply_text = (
            "⚠️ The AI Assistant is not currently configured on the server.\n\n"
            "To activate live AI responses, add your `GEMINI_API_KEY` (from Google AI Studio) or `OPENROUTER_API_KEY` to `backend/.env`.\n"
            "In the meantime, all resume builder, template, autosave, and PDF features are fully operational!"
        )
        suggestion_text = None
    except GeminiServiceError as e:
        reply_text = f"An error occurred while connecting to the AI service: {str(e)}. Please try again."
        suggestion_text = None

    # 5. Record assistant response in database
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=reply_text,
        section_context=chat_req.section_context
    )
    db.add(assistant_msg)
    db.commit()

    return AIChatResponse(
        reply=reply_text,
        conversation_id=conversation.id,
        suggestion=suggestion_text,
        section_context=chat_req.section_context
    )

@router.get("/conversations/active")
def get_active_conversation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves existing chat messages to restore assistant state upon navigation/reload."""
    conv = db.query(Conversation).filter(
        Conversation.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).first()

    if not conv:
        return {"conversation_id": None, "messages": []}

    msgs = db.query(Message).filter(
        Message.conversation_id == conv.id
    ).order_by(Message.created_at.asc()).all()

    return {
        "conversation_id": conv.id,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "section_context": m.section_context,
                "created_at": m.created_at.isoformat()
            }
            for m in msgs
        ]
    }

@router.delete("/conversations/clear")
def clear_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clears conversation history for the current user."""
    db.query(Conversation).filter(Conversation.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Chat history cleared successfully."}

@router.post("/improve-summary")
async def improve_summary(
    req: SummaryImproveRequest,
    current_user: User = Depends(get_current_user)
):
    """Contextual AI action: generate or improve professional summary."""
    try:
        improved = await gemini_service.improve_summary(
            text=req.text,
            role=req.role,
            skills=req.skills,
            action=req.action
        )
        return {"improved_text": improved}
    except GeminiNotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except GeminiServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/improve-description")
async def improve_description(
    req: DescriptionImproveRequest,
    current_user: User = Depends(get_current_user)
):
    """Contextual AI action: improve bullet points for experience/projects."""
    try:
        improved = await gemini_service.improve_description(
            text=req.text,
            role_or_project=req.role_or_project,
            section_type=req.section_type,
            action=req.action
        )
        return {"improved_text": improved}
    except GeminiNotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except GeminiServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/suggest-skills")
async def suggest_skills(
    req: SkillsSuggestRequest,
    current_user: User = Depends(get_current_user)
):
    """Contextual AI action: suggest in-demand technical skills."""
    try:
        skills = await gemini_service.suggest_skills(
            job_title=req.job_title,
            current_skills=req.current_skills
        )
        return {"suggested_skills": skills}
    except GeminiNotConfiguredError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except GeminiServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/analyze-job-description", response_model=JobAnalyzeResponse)
async def analyze_job(
    req: JobAnalyzeRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Job Description Match Analyzer.
    Produces transparent keyword score, matched/missing skills, and tailored advice.
    """
    result = await analyze_job_description_match(
        job_description=req.job_description,
        resume_data=req.resume_data
    )
    return JobAnalyzeResponse(**result)
