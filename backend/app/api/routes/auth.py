from datetime import datetime, timezone, timedelta
import secrets
import hashlib
import hmac
import re
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.password_reset import PasswordResetCode
from app.schemas.auth import (
    UserCreate, UserLogin, UserResponse, Token,
    ForgotPasswordRequest, ForgotPasswordResponse,
    VerifyCodeRequest, VerifyCodeResponse,
    ResetPasswordRequest, ResetPasswordResponse
)
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings
import logging
from app.api.dependencies import get_current_user
from app.services.email_service import email_service, EmailNotConfiguredError, EmailDeliveryError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, response: Response, db: Session = Depends(get_db)):
    """Register a new user account with unique email enforcement."""
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    user = User(
        name=user_in.name.strip(),
        email=user_in.email.lower().strip(),
        password_hash=get_password_hash(user_in.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(subject=user.id)
    
    # Set HttpOnly session cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=bool(settings.COOKIE_SECURE)  # auto: True iff https public URL
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, response: Response, db: Session = Depends(get_db)):
    """Authenticate existing user credentials and return signed JWT."""
    user = db.query(User).filter(User.email == login_data.email.lower().strip()).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=user.id)

    # Set HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=bool(settings.COOKIE_SECURE)  # auto: True iff https public URL
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Initiates password recovery by sending a 6-digit verification code to the registered email.
    Enforces rate-limiting, secure code hashing, and anti-enumeration generic responses.
    """
    clean_email = req.email.lower().strip()
    now = datetime.now(timezone.utc)

    # 1. Rate-limit check: cooldown between code requests (60 seconds)
    recent_request = db.query(PasswordResetCode).filter(
        PasswordResetCode.email == clean_email,
        PasswordResetCode.created_at > (now - timedelta(seconds=60))
    ).first()
    if recent_request:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="A verification code was requested recently. Please wait 60 seconds before requesting a new code."
        )

    # 2. Check if user exists
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        # Anti-enumeration protection: return generic message so attackers cannot probe accounts
        return ForgotPasswordResponse(
            message=f"If an account is associated with {clean_email}, a 6-digit verification code has been sent.",
            email=clean_email
        )

    # 3. Invalidate previous unused codes for this email
    db.query(PasswordResetCode).filter(
        PasswordResetCode.email == clean_email,
        PasswordResetCode.is_used == False
    ).update({"is_used": True})

    # 4. Generate 6-digit cryptographically secure code and store as SHA-256 hash
    code = f"{secrets.randbelow(900000) + 100000}"
    code_hash = hashlib.sha256(f"{clean_email}:{code}".encode()).hexdigest()
    expires_at = now + timedelta(minutes=10)

    reset_record = PasswordResetCode(
        email=clean_email,
        code=None,  # Never store plaintext verification code
        code_hash=code_hash,
        expires_at=expires_at,
        is_used=False,
        attempts=0,
        max_attempts=5,
        last_requested_at=now
    )
    db.add(reset_record)
    db.commit()

    # 5. Send verification code via configured SMTP delivery service
    try:
        email_service.send_password_reset_code(
            to_email=clean_email,
            user_name=user.name,
            code=code
        )
    except EmailNotConfiguredError as e:
        # Roll back record to prevent orphaned unusable tokens
        db.delete(reset_record)
        db.commit()
        logger.warning(
            "Password reset aborted: SMTP delivery service is not configured. "
            "Missing settings: %s. Configure them in backend/.env.",
            email_service.get_missing_config()
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password recovery is temporarily unavailable because the email delivery service is not configured on the server. Please contact support or try again later."
        )
    except EmailDeliveryError as e:
        db.delete(reset_record)
        db.commit()
        logger.error("Password reset email delivery failed for %s: %s", clean_email, str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We were unable to deliver the verification email due to an email server issue. Please check your SMTP configuration or try again later."
        )
    except Exception as e:
        db.delete(reset_record)
        db.commit()
        logger.error("Unexpected error delivering password reset email: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your password reset. Please try again."
        )


    return ForgotPasswordResponse(
        message=f"If an account is associated with {clean_email}, a 6-digit verification code has been sent.",
        email=clean_email
    )

@router.post("/verify-reset-code", response_model=VerifyCodeResponse)
def verify_reset_code(req: VerifyCodeRequest, db: Session = Depends(get_db)):
    """
    Validates the 6-digit verification code.
    Enforces expiration, attempt limits, and returns a short-lived authorization token.
    """
    clean_email = req.email.lower().strip()
    clean_code = req.code.strip()

    if not re.match(r"^\d{6}$", clean_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code must be exactly 6 numeric digits."
        )

    now = datetime.now(timezone.utc)
    record = db.query(PasswordResetCode).filter(
        PasswordResetCode.email == clean_email,
        PasswordResetCode.is_used == False,
        PasswordResetCode.expires_at > now
    ).order_by(PasswordResetCode.created_at.desc()).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new one."
        )

    # Check attempt limit
    if record.attempts >= record.max_attempts:
        record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect verification attempts. This code has been invalidated for security. Please request a new code."
        )

    # Constant-time hash verification
    expected_hash = hashlib.sha256(f"{clean_email}:{clean_code}".encode()).hexdigest()
    if not hmac.compare_digest(expected_hash, record.code_hash):
        record.attempts += 1
        db.commit()
        remaining = max(record.max_attempts - record.attempts, 0)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect verification code. You have {remaining} attempt(s) remaining."
        )

    # Verification successful: generate short-lived, server-validated reset authorization token
    reset_token = secrets.token_urlsafe(32)
    record.reset_token_hash = hashlib.sha256(reset_token.encode()).hexdigest()
    record.reset_token_expires_at = now + timedelta(minutes=15)
    db.commit()

    return VerifyCodeResponse(
        message="Verification code is valid. Proceed to reset your password.",
        valid=True,
        reset_token=reset_token
    )

@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Updates the user's password once verified via the short-lived reset authorization token.
    Enforces password complexity, invalidates the token, and prevents token reuse.
    """
    clean_email = req.email.lower().strip()
    clean_token = req.reset_token.strip()

    # Password complexity requirements
    if len(req.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )
    if req.confirm_password and req.new_password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation password do not match."
        )

    now = datetime.now(timezone.utc)
    record = db.query(PasswordResetCode).filter(
        PasswordResetCode.email == clean_email,
        PasswordResetCode.is_used == False,
        PasswordResetCode.reset_token_expires_at > now
    ).order_by(PasswordResetCode.created_at.desc()).first()

    if not record or not record.reset_token_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset session. Please request and verify a new verification code."
        )

    # Verify authorization token
    expected_token_hash = hashlib.sha256(clean_token.encode()).hexdigest()
    if not hmac.compare_digest(expected_token_hash, record.reset_token_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset authorization token. Please verify your code again."
        )

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    # Update user password using bcrypt hash
    user.password_hash = get_password_hash(req.new_password)
    # Invalidate token and code to prevent reuse
    record.is_used = True
    record.reset_token_hash = None
    db.commit()

    return ResetPasswordResponse(
        message="Your password has been reset successfully. You can now log in.",
        success=True
    )

@router.post("/logout")
def logout(response: Response):
    """Log out current user by clearing session cookie."""
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Logged out successfully."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve profile of the currently authenticated user."""
    return UserResponse.model_validate(current_user)

