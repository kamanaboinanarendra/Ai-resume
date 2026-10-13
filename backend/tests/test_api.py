import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.db.session import engine, Base, SessionLocal
from app.models.user import User
from app.models.resume import Resume

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Cleanup any stale test data before starting tests
    test_user_ids = [u.id for u in db.query(User).filter(User.email.like("test_%@example.com")).all()]
    if test_user_ids:
        db.query(Resume).filter(Resume.user_id.in_(test_user_ids)).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_(test_user_ids)).delete(synchronize_session=False)
        db.commit()
    db.close()

    yield

    # Cleanup test data created during tests
    db = SessionLocal()
    test_user_ids = [u.id for u in db.query(User).filter(User.email.like("test_%@example.com")).all()]
    if test_user_ids:
        db.query(Resume).filter(Resume.user_id.in_(test_user_ids)).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_(test_user_ids)).delete(synchronize_session=False)
        db.commit()
    db.close()


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_template_registry():
    response = client.get("/api/templates")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 50
    assert len(data["templates"]) == 50
    assert "Professional" in data["categories"]
    assert "Technology" in data["categories"]
    assert "Student and Fresher" in data["categories"]
    assert "Creative" in data["categories"]
    assert "ATS-Friendly" in data["categories"]

    # Test single template retrieval
    single_res = client.get("/api/templates/classic-professional")
    assert single_res.status_code == 200
    assert single_res.json()["name"] == "Classic Professional"

def test_user_registration_and_duplicate():
    email = "test_user1@example.com"
    # Register first user
    reg_res = client.post("/api/auth/register", json={
        "name": "Jane Doe",
        "email": email,
        "password": "Password123!"
    })
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert data["user"]["email"] == email

    # Duplicate registration must fail
    dup_res = client.post("/api/auth/register", json={
        "name": "Jane Doe",
        "email": email,
        "password": "Password123!"
    })
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

def test_login_flow():
    email = "test_user1@example.com"
    # Valid login
    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data

    # Invalid password
    bad_res = client.post("/api/auth/login", json={
        "email": email,
        "password": "WrongPassword!"
    })
    assert bad_res.status_code == 401

def test_protected_routes_and_me():
    # Login to obtain token
    login_res = client.post("/api/auth/login", json={
        "email": "test_user1@example.com",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # /api/auth/me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "test_user1@example.com"

    # Unauthorized access (clearing client cookies)
    client.cookies.clear()
    unauth_res = client.get("/api/auth/me")
    assert unauth_res.status_code == 401

def test_resume_crud_and_autosave_lifecycle():
    # Login user 1
    login_res = client.post("/api/auth/login", json={
        "email": "test_user1@example.com",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create resume
    create_res = client.post("/api/resumes", headers=headers, json={
        "title": "Software Engineer Resume",
        "template_id": "software-developer",
        "resume_data": {
            "personal_info": {
                "full_name": "Jane Doe",
                "professional_title": "Full Stack Developer",
                "email": "jane@example.com"
            },
            "professional_summary": "Experienced engineer specializing in React and Python.",
            "skills": [
                {"id": "1", "category_name": "Languages", "skills": ["Python", "JavaScript", "SQL"]}
            ]
        }
    })
    assert create_res.status_code == 201
    created_resume = create_res.json()
    resume_id = created_resume["id"]
    assert created_resume["revision"] == 1

    # 2. List resumes
    list_res = client.get("/api/resumes", headers=headers)
    assert list_res.status_code == 200
    resumes_list = list_res.json()
    assert any(r["id"] == resume_id for r in resumes_list)

    # 3. Get single resume
    get_res = client.get(f"/api/resumes/{resume_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Software Engineer Resume"

    # 4. Update resume (simulating autosave)
    update_res = client.put(f"/api/resumes/{resume_id}", headers=headers, json={
        "title": "Senior Software Engineer Resume",
        "template_id": "modern-professional",
        "revision": 1,
        "resume_data": {
            "personal_info": {
                "full_name": "Jane Doe",
                "professional_title": "Senior Full Stack Developer",
                "email": "jane@example.com"
            },
            "professional_summary": "Experienced engineer with 5+ years of excellence."
        }
    })
    assert update_res.status_code == 200
    updated_resume = update_res.json()
    assert updated_resume["title"] == "Senior Software Engineer Resume"
    assert updated_resume["revision"] == 2

    # 5. Duplicate resume
    dup_res = client.post(f"/api/resumes/{resume_id}/duplicate", headers=headers)
    assert dup_res.status_code == 201
    duplicated = dup_res.json()
    assert duplicated["title"] == "Copy of Senior Software Engineer Resume"
    assert duplicated["id"] != resume_id

    # 6. PDF export
    pdf_res = client.get(f"/api/resumes/{resume_id}/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000 # Valid non-empty PDF binary

    # 7. Delete duplicated resume
    del_res = client.delete(f"/api/resumes/{duplicated['id']}", headers=headers)
    assert del_res.status_code == 200

def test_user_data_isolation():
    """Verify that User 2 cannot access, modify, or delete User 1's resume."""
    # Register User 2
    reg_u2 = client.post("/api/auth/register", json={
        "name": "Bob Smith",
        "email": "test_user2@example.com",
        "password": "Password456!"
    })
    token_u2 = reg_u2.json()["access_token"]
    headers_u2 = {"Authorization": f"Bearer {token_u2}"}

    # User 1 creates resume
    login_u1 = client.post("/api/auth/login", json={
        "email": "test_user1@example.com",
        "password": "Password123!"
    })
    token_u1 = login_u1.json()["access_token"]
    headers_u1 = {"Authorization": f"Bearer {token_u1}"}

    res_u1 = client.post("/api/resumes", headers=headers_u1, json={
        "title": "Private Resume User 1",
        "template_id": "classic-professional"
    }).json()
    u1_resume_id = res_u1["id"]

    # User 2 attempts to GET User 1's resume -> 403 Forbidden
    u2_get = client.get(f"/api/resumes/{u1_resume_id}", headers=headers_u2)
    assert u2_get.status_code == 403

    # User 2 attempts to UPDATE User 1's resume -> 403 Forbidden
    u2_put = client.put(f"/api/resumes/{u1_resume_id}", headers=headers_u2, json={"title": "Hacked Title"})
    assert u2_put.status_code == 403

    # User 2 attempts to DELETE User 1's resume -> 403 Forbidden
    u2_del = client.delete(f"/api/resumes/{u1_resume_id}", headers=headers_u2)
    assert u2_del.status_code == 403

    # User 2 attempts to PDF export User 1's resume -> 403 Forbidden
    u2_pdf = client.get(f"/api/resumes/{u1_resume_id}", headers=headers_u2)
    assert u2_pdf.status_code == 403

def test_job_match_analyzer():
    # Login user 1
    login_res = client.post("/api/auth/login", json={
        "email": "test_user1@example.com",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    job_description = """
    We are seeking a Senior Python Developer with deep experience in FastAPI, PostgreSQL, Docker, and React.
    Responsibilities include building microservices, developing REST APIs, and optimizing database queries.
    Experience with AWS and Kubernetes is a big plus.
    """

    resume_data = {
        "personal_info": {"professional_title": "Python Developer"},
        "professional_summary": "Python and FastAPI backend specialist with PostgreSQL experience.",
        "skills": [
            {"category_name": "Backend", "skills": ["Python", "FastAPI", "PostgreSQL", "REST API"]},
            {"category_name": "DevOps", "skills": ["Docker", "Git"]}
        ]
    }

    response = client.post("/api/ai/analyze-job-description", headers=headers, json={
        "job_description": job_description,
        "resume_data": resume_data
    })
    assert response.status_code == 200
    data = response.json()
    assert "match_score" in data
    assert data["match_score"] > 0
    assert "matched_keywords" in data
    assert any("python" in k.lower() for k in data["matched_keywords"])
    assert "missing_keywords" in data
    assert "strengthening_suggestions" in data

def test_ai_chat_graceful_handling():
    login_res = client.post("/api/auth/login", json={
        "email": "test_user1@example.com",
        "password": "Password123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Floating chat request without GEMINI_API_KEY configured
    chat_res = client.post("/api/ai/chat", headers=headers, json={
        "message": "Can you review my summary?",
        "section_context": "summary",
        "current_text": "Software engineer with python experience."
    })
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert "reply" in chat_data
    assert "conversation_id" in chat_data
