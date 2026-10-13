import requests
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/api"

def run_e2e_live_test():
    session = requests.Session()
    print("=" * 60)
    print("STARTING LIVE E2E INTEGRATION SUITE ON LIVE SERVERS")
    print("=" * 60)

    # 1. Health Check
    print("\n[1] Verifying Backend & Database Health...")
    r = session.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("[OK] Health check:", r.json())

    # 2. Template Catalog (50 templates across curated categories)
    print("\n[2] Verifying Template Catalog...")
    r = session.get(f"{BASE_URL}/templates")
    assert r.status_code == 200, f"Templates failed: {r.text}"
    tmpl_data = r.json()
    assert tmpl_data["total"] == 50, f"Expected 50 templates, got {tmpl_data['total']}"
    assert len(tmpl_data["templates"]) == 50
    print(f"[OK] Found all {tmpl_data['total']} templates across categories: {tmpl_data['categories']}")

    # 3. Registration
    email = "priya.sharma.live@example.com"
    password = "SecurePassword123!"
    print(f"\n[3] Registering User '{email}'...")
    r = session.post(f"{BASE_URL}/auth/register", json={
        "name": "Priya Sharma",
        "email": email,
        "password": password
    })
    if r.status_code == 400 and "already exists" in r.text:
        print("User already registered, proceeding to login...")
    else:
        assert r.status_code == 201, f"Registration failed: {r.text}"
        print("[OK] Registration succeeded:", r.json()["user"]["name"])

    # 4. Login
    print("\n[4] Authenticating with credentials...")
    r = session.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    print("[OK] Login succeeded. JWT token issued and session active.")

    # 5. Verify /auth/me
    print("\n[5] Verifying authenticated profile (/api/auth/me)...")
    r = session.get(f"{BASE_URL}/auth/me")
    assert r.status_code == 200
    user_me = r.json()
    assert user_me["email"] == email
    print("[OK] Profile verified:", user_me)

    # 6. Create Resume from Template
    print("\n[6] Creating resume with 'software-developer' template...")
    r = session.post(f"{BASE_URL}/resumes", json={
        "title": "Priya Sharma — Python & AI Resume",
        "template_id": "software-developer",
        "resume_data": {
            "personal_info": {
                "full_name": "Priya Sharma",
                "professional_title": "Full Stack Developer & AI Specialist",
                "email": email,
                "phone": "+91 98765 43210",
                "city_country": "Bengaluru, India"
            },
            "professional_summary": "Passionate Computer Science engineer with expertise in FastAPI, PostgreSQL, and React.",
            "skills": [
                {"id": "1", "category_name": "Languages", "skills": ["Python", "JavaScript", "SQL"]},
                {"id": "2", "category_name": "Frameworks", "skills": ["FastAPI", "React", "Docker"]}
            ]
        }
    })
    assert r.status_code == 201, f"Create resume failed: {r.text}"
    resume = r.json()
    resume_id = resume["id"]
    print(f"[OK] Resume created in PostgreSQL. ID: {resume_id}, Revision: {resume['revision']}")

    # 7. Update Resume (Simulating Editor Autosave)
    print("\n[7] Simulating autosave updates...")
    r = session.put(f"{BASE_URL}/resumes/{resume_id}", json={
        "title": "Priya Sharma — Lead Engineer Resume",
        "template_id": "bold-header",
        "revision": 1,
        "resume_data": {
            "personal_info": {
                "full_name": "Priya Sharma, B.Tech CSE",
                "professional_title": "Lead Python & Cloud Engineer",
                "email": email,
                "phone": "+91 98765 43210",
                "city_country": "Bengaluru, India"
            },
            "professional_summary": "Experienced engineer with deep background in high-throughput microservices and generative AI tools.",
            "skills": [
                {"id": "1", "category_name": "Core Tech", "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "React"]}
            ],
            "experience": [
                {
                    "id": "exp1",
                    "job_title": "Backend Engineering Intern",
                    "company": "TechNova",
                    "location": "Bengaluru",
                    "employment_type": "Internship",
                    "start_date": "2023",
                    "end_date": "Present",
                    "currently_working": True,
                    "responsibilities": "Engineered REST APIs with FastAPI and reduced query response times by 30%."
                }
            ]
        }
    })
    assert r.status_code == 200, f"Autosave update failed: {r.text}"
    updated = r.json()
    assert updated["revision"] == 2
    print(f"[OK] Autosave verified. Updated Title: '{updated['title']}', Revision: {updated['revision']}")

    # 8. AI Chat & Context Awareness
    print("\n[8] Testing persistent AI floating assistant chat...")
    r = session.post(f"{BASE_URL}/ai/chat", json={
        "message": "Write a strong bullet point about optimizing a PostgreSQL database.",
        "section_context": "experience",
        "current_text": "worked on postgres database"
    })
    assert r.status_code == 200, f"AI chat failed: {r.text}"
    chat_res = r.json()
    assert "reply" in chat_res
    assert "conversation_id" in chat_res
    print("[OK] AI Assistant replied:", chat_res["reply"][:100] + "...")

    # 9. Job Description Match Analyzer
    print("\n[9] Testing Job Description Match Analyzer...")
    jd_text = """
    We are seeking a Senior Python Engineer experienced in FastAPI, PostgreSQL, Docker, and REST APIs.
    Must have hands-on experience in building microservices and cloud deployments with AWS.
    """
    r = session.post(f"{BASE_URL}/ai/analyze-job-description", json={
        "job_description": jd_text,
        "resume_data": updated["resume_data"]
    })
    assert r.status_code == 200, f"Job match failed: {r.text}"
    jd_res = r.json()
    assert jd_res["match_score"] > 0
    print(f"[OK] Job Match Analyzer calculated score: {jd_res['match_score']}%")
    print("  Matched keywords:", jd_res["matched_keywords"])
    print("  Missing keywords:", jd_res["missing_keywords"][:3])

    # 10. Duplicate Resume
    print("\n[10] Testing resume duplication...")
    r = session.post(f"{BASE_URL}/resumes/{resume_id}/duplicate")
    assert r.status_code == 201, f"Duplication failed: {r.text}"
    dup_res = r.json()
    assert "Copy of" in dup_res["title"]
    print(f"[OK] Duplicated successfully: '{dup_res['title']}' (ID: {dup_res['id']})")

    # 11. PDF Export
    print("\n[11] Testing server-side PDF export...")
    r = session.get(f"{BASE_URL}/resumes/{resume_id}/pdf")
    assert r.status_code == 200, f"PDF export failed: {r.text}"
    assert r.headers.get("content-type") == "application/pdf"
    assert len(r.content) > 1000
    print(f"[OK] Generated valid PDF: {len(r.content)} bytes with PDF header '{r.content[:4].decode()}'")

    # 12. Cleanup duplicated resume
    print("\n[12] Testing resume deletion...")
    r = session.delete(f"{BASE_URL}/resumes/{dup_res['id']}")
    assert r.status_code == 200
    print("[OK] Deleted duplicate resume.")

    print("\n" + "=" * 60)
    print("ALL 12 E2E LIVE INTEGRATION WORKFLOWS VERIFIED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_e2e_live_test()
