import os
import sys
import io
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.db.session import engine, Base, SessionLocal
from app.models.user import User
from app.models.password_reset import PasswordResetCode
from app.core.security import get_password_hash
from app.services.email_service import email_service, EmailNotConfiguredError, EmailDeliveryError

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_users():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Create test user for forgot password flow
    test_email = "test_fp_user@example.com"
    existing = db.query(User).filter(User.email == test_email).first()
    if not existing:
        user = User(
            email=test_email,
            name="Forgot Password Tester",
            password_hash=get_password_hash("OldPassword123!")
        )
        db.add(user)
        db.commit()
    db.close()

    yield

    db = SessionLocal()
    db.query(PasswordResetCode).filter(PasswordResetCode.email == test_email).delete()
    db.query(User).filter(User.email == test_email).delete()
    db.commit()
    db.close()


def test_forgot_password_generic_response_and_generation():
    """Verify forgot password generates code and sends email via SMTP."""
    test_email = "test_fp_user@example.com"

    with patch("app.services.email_service.email_service.send_password_reset_code") as mock_email:
        mock_email.return_value = {"status": "sent"}

        res = client.post("/api/auth/forgot-password", json={"email": test_email})
        assert res.status_code == 200
        data = res.json()
        assert "message" in data
        assert "dev_code" not in data  # Security: never return verification code in response
        assert mock_email.called

        # Verify record exists in DB with hashed code
        db = SessionLocal()
        record = db.query(PasswordResetCode).filter(
            PasswordResetCode.email == test_email,
            PasswordResetCode.is_used == False
        ).order_by(PasswordResetCode.created_at.desc()).first()
        assert record is not None
        assert record.code_hash is not None
        assert record.attempts == 0
        db.close()


def test_verify_code_invalid_and_attempt_limit():
    """Verify wrong code increases attempt count and caps at 5."""
    test_email = "test_fp_user@example.com"

    # Wrong code attempt
    res = client.post("/api/auth/verify-reset-code", json={
        "email": test_email,
        "code": "000000"
    })
    assert res.status_code == 400
    assert "Incorrect verification code" in res.json()["detail"]


def test_unconfigured_smtp_friendly_error_and_rollback():
    """Verify missing SMTP credentials return clean 503 error without orphaned DB records."""
    test_email = "test_unconfigured_smtp@example.com"
    db = SessionLocal()
    if not db.query(User).filter(User.email == test_email).first():
        db.add(User(email=test_email, name="Unconfigured Tester", password_hash=get_password_hash("Pass123!")))
    db.query(PasswordResetCode).filter(PasswordResetCode.email == test_email).delete()
    db.commit()
    db.close()

    with patch("app.services.email_service.email_service.send_password_reset_code", side_effect=EmailNotConfiguredError("Missing credentials")):
        res = client.post("/api/auth/forgot-password", json={"email": test_email})
        assert res.status_code == 503
        data = res.json()
        assert "Password recovery is temporarily unavailable" in data["detail"]
        assert "SMTP_HOST" not in data["detail"]  # Never leak raw backend internals in user-facing message

        # Ensure DB record was rolled back so no unusable token remains
        db = SessionLocal()
        record = db.query(PasswordResetCode).filter(
            PasswordResetCode.email == test_email,
            PasswordResetCode.is_used == False
        ).first()
        assert record is None
        db.close()


def test_smtp_delivery_failure_handling():
    """Verify delivery errors return 502 with friendly message."""
    test_email = "test_delivery_fail@example.com"
    db = SessionLocal()
    if not db.query(User).filter(User.email == test_email).first():
        db.add(User(email=test_email, name="Delivery Tester", password_hash=get_password_hash("Pass123!")))
    db.query(PasswordResetCode).filter(PasswordResetCode.email == test_email).delete()
    db.commit()
    db.close()

    with patch("app.services.email_service.email_service.send_password_reset_code", side_effect=EmailDeliveryError("Connection refused")):
        res = client.post("/api/auth/forgot-password", json={"email": test_email})
        assert res.status_code == 502
        data = res.json()
        assert "unable to deliver the verification email" in data["detail"]



def test_email_service_configuration_detection():
    """Verify EmailService detects missing settings and connection testing."""
    with patch.dict(os.environ, {"SMTP_HOST": "", "SMTP_USER": "", "SMTP_PASSWORD": ""}, clear=False):
        missing = email_service.get_missing_config()
        assert "SMTP_HOST" in missing or len(missing) >= 1
        res = email_service.test_connection()
        assert res["success"] is False
        assert "Missing SMTP configuration" in res["error"]


def test_full_password_reset_flow():

    """Verify end-to-end: request -> verify -> reset -> login with new password."""
    test_email = "test_full_reset@example.com"
    captured_code = None

    # Ensure user exists for full reset test
    db = SessionLocal()
    existing = db.query(User).filter(User.email == test_email).first()
    if not existing:
        user = User(
            email=test_email,
            name="Full Reset Tester",
            password_hash=get_password_hash("OldPassword123!")
        )
        db.add(user)
        db.commit()
    # Clear prior reset codes to avoid cooldown
    db.query(PasswordResetCode).filter(PasswordResetCode.email == test_email).delete()
    db.commit()
    db.close()

    def fake_send_email(to_email, user_name, code):
        nonlocal captured_code
        captured_code = code
        return {"status": "sent"}

    with patch("app.services.email_service.email_service.send_password_reset_code", side_effect=fake_send_email):
        # 1. Request code
        req_res = client.post("/api/auth/forgot-password", json={"email": test_email})
        assert req_res.status_code == 200
        assert captured_code is not None
        assert len(captured_code) == 6

        # 2. Verify code
        verify_res = client.post("/api/auth/verify-reset-code", json={
            "email": test_email,
            "code": captured_code
        })
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        assert verify_data["verified"] is True
        assert "reset_token" in verify_data
        reset_token = verify_data["reset_token"]

        # 3. Reset password using reset_token
        new_pw = "NewSecurePassword456!"
        reset_res = client.post("/api/auth/reset-password", json={
            "email": test_email,
            "reset_token": reset_token,
            "new_password": new_pw
        })
        assert reset_res.status_code == 200
        assert "successfully" in reset_res.json()["message"]

        # 4. Old password must fail
        old_login = client.post("/api/auth/login", json={
            "email": test_email,
            "password": "OldPassword123!"
        })
        assert old_login.status_code == 401

        # 5. New password must succeed
        new_login = client.post("/api/auth/login", json={
            "email": test_email,
            "password": new_pw
        })
        assert new_login.status_code == 200
        assert "access_token" in new_login.json()

        # 6. Reusing reset_token must fail
        reuse_res = client.post("/api/auth/reset-password", json={
            "email": test_email,
            "reset_token": reset_token,
            "new_password": "AnotherPassword789!"
        })
        assert reuse_res.status_code == 400


def test_ats_analysis_deterministic_scoring():
    """Verify ATS analyzer returns evidence-based rubric score across 5 categories."""
    sample_text = (
        "ALEX MORGAN\n"
        "alex.morgan@example.com | (555) 019-2834 | San Francisco, CA | linkedin.com/in/alexmorgan\n\n"
        "PROFESSIONAL SUMMARY\n"
        "Senior Software Engineer with 6+ years of experience architecting high-scale Python microservices and React web applications.\n\n"
        "TECHNICAL SKILLS\n"
        "Languages: Python, JavaScript, TypeScript, SQL\n"
        "Frameworks: FastAPI, React, Node.js, Django\n"
        "Cloud & DevOps: Docker, Kubernetes, AWS, PostgreSQL, Redis, CI/CD, Git\n\n"
        "WORK EXPERIENCE\n"
        "Senior Software Engineer | Stripe | 2021 - Present\n"
        "- Engineered distributed payments pipeline processing $45M in monthly transactions, reducing latency by 35%.\n"
        "- Implemented caching layer with Redis that improved throughput by 50% across 12 microservices.\n"
        "- Spearheaded migration of legacy services to Docker and Kubernetes with 99.99% uptime.\n\n"
        "Software Engineer | Acme Corp | 2018 - 2021\n"
        "- Developed customer dashboard using React, TypeScript, and FastAPI serving 150,000 active users.\n"
        "- Optimized PostgreSQL queries, cutting p95 response times by 40%.\n\n"
        "EDUCATION\n"
        "Bachelor of Science in Computer Science | Stanford University | 2014 - 2018\n\n"
        "PROJECTS\n"
        "Cloud Monitoring CLI: Open-source monitoring tool written in Python with 2,000 GitHub stars.\n\n"
        "CERTIFICATIONS\n"
        "AWS Certified Solutions Architect\n"
    )

    fake_file = io.BytesIO(sample_text.encode("utf-8"))
    files = {"file": ("alex_morgan_resume.docx", fake_file, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}

    with patch("app.api.routes.ats.extract_text_from_file", return_value=(sample_text, False)):
        res = client.post(
            "/api/ats/analyze",
            files=files,
            data={
                "job_title": "Senior Backend Engineer",
                "job_description": "We need a Senior Backend Engineer experienced in Python, FastAPI, Docker, PostgreSQL, and AWS."
            }
        )
        assert res.status_code == 200
        data = res.json()

        # Check General ATS Compatibility score
        assert "general_score" in data
        assert 60 <= data["general_score"] <= 100

        # Check 5 categories
        cats = data["categories"]
        assert "parsing" in cats
        assert "sections" in cats
        assert "skills" in cats
        assert "quality" in cats
        assert "formatting" in cats

        assert cats["parsing"]["max_score"] == 20
        assert cats["sections"]["max_score"] == 20
        assert cats["skills"]["max_score"] == 25
        assert cats["quality"]["max_score"] == 20
        assert cats["formatting"]["max_score"] == 15

        # Check Job Match score
        assert data["job_match_score"] is not None
        assert data["job_match_score"] >= 70
        assert len(data["job_match_analysis"]["matched_required_skills"]) > 0

        # Check export report
        export_res = client.post("/api/ats/export-report", json=data["analysis"])
        assert export_res.status_code == 200
        assert export_res.headers["content-type"] == "application/pdf"
        assert export_res.content.startswith(b"%PDF")
