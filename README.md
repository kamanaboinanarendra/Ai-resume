# AI-Powered Resume Builder

A full-stack, enterprise-grade web application that empowers users to create, customize, AI-optimize, and export professional resumes. Built with a React/Vite frontend, a FastAPI backend, PostgreSQL database persistence, Google Gemini AI integration using the official `google-genai` SDK, and pixel-perfect PDF generation.

---

## 🚀 Deploy with Docker (recommended — one command from the repo root)

The frontend is **built into the backend image**: the FastAPI backend
serves the API under `/api/*` and the React app on every other path,
and **nginx** (the only published container) proxies both frontend
paths and `/api` to it.

```text
browser ──► nginx (:80) ──┬─ /api/*          ─► backend:8000 (FastAPI)
                          └─ /, /login, ...  ─► backend:8000 (integrated frontend)
backend ──► PostgreSQL (internal network only)
```

```bash
cp .env.example .env      # optional — zero config also works
docker compose up --build
# open http://localhost
```

Single image without compose (needs your own PostgreSQL):

```bash
docker build -t ai-resume .
docker run -p 8000:8000 -e DATABASE_URL=postgresql+psycopg://user:pass@host:5432/ai_resume_builder ai-resume
# open http://localhost:8000  (API docs: /api/docs)
```

**Environment variables — only these are important** (everything else
in `.env.example` is optional, auto-detected, or defaulted — domain
included: leave `DOMAIN` empty and the app works on any host):

| Variable | Why it matters |
|---|---|
| `JWT_SECRET_KEY` | 🔴 Production login stability. Empty = auto-generated & persisted in the `app_secrets` volume. `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | 🔴 Password of the bundled DB (default `postgres`). |
| `GEMINI_API_KEY` **or** `OPENROUTER_API_KEY` | 🟡 Only for AI features; the rest of the app works fully without one. |

Optional highlights: `DOMAIN`/`PUBLIC_URL` (pin a hostname / force
Secure cookies), `HTTP_PORT` (default `80`), `DATABASE_URL` (external
DB — then the `db` service can be removed), SMTP_* (password-reset
mail). Details and defaults: [`.env.example`](.env.example).

Manual (non-Docker) setup is documented further below.

---

## Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide React, React Router v6, Axios |
| **Backend** | Python 3.10+, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic, ReportLab |
| **Database** | PostgreSQL 18 (Structured models with JSONB for flexible resume content) |
| **AI Engine** | Google Gemini API via official `google-genai` Python SDK (`gemini-3.8-flash`) |
| **Security** | JWT Authentication, Bcrypt Password Hashing, User Data Isolation, HttpOnly Cookies |

---

## Key Features

1. **25 Real Resume Templates across 5 Categories**:
   - *Professional*: Classic Professional, Modern Professional, Corporate Executive, Clean Minimalist, Elegant Traditional
   - *Technology*: Software Developer, Python Developer, Full Stack Developer, Backend Developer, Data Analyst
   - *Student and Fresher*: College Student, Fresher Resume, Internship Resume, Campus Placement, Academic Resume
   - *Creative*: Creative Modern, Bold Header, Modern Two-Column, Elegant Typography, Accent Sidebar
   - *ATS-Friendly*: ATS Classic, ATS Modern, Single-Column Professional, Technical Skills Focus, Experience-Focused
   - 7 distinct architectural layout configurations (Single Column, Asymmetric Split, Left Sidebar, Bold Banner Header, Compact Grid, Accent Timeline, and ATS Clean).
2. **Permanent Floating AI Assistant (`FloatingAIChat.jsx`)**:
   - Mounted once inside the authenticated layout.
   - Preserves conversation history across route changes.
   - Context-aware: detects the active resume section and current field text.
   - Actions to copy suggestions or directly insert them into resume fields.
3. **Multi-Step Guided Resume Builder**:
   - Sections A through J: Personal Information, Professional Summary, Education, Experience & Internships, Projects, Technical Skills, Certifications, Additional Sections, Final Review, and Export.
   - Supports multiple entries, dynamic reordering, and custom sections.
4. **Reliable Autosave with Revision Tracking**:
   - Debounced autosave (1500ms) with visible status indicators: `"Saving..."`, `"All changes saved"`, and `"Unable to save. Retry"`.
   - Revision counter prevents out-of-order overwrites.
5. **Job Description Match Analyzer**:
   - Compares candidate resume text against target job descriptions.
   - Computes transparent keyword coverage score, lists matched skills, identifies gaps, and gives strengthening tips.
6. **Live Resume Preview & High-Resolution PDF Export**:
   - Responsive split-pane live preview updating instantly with user edits.
   - Server-side ReportLab PDF generation matching selected template, margins, fonts, and pagination.

---

## Project Structure

```text
ai-resume-builder/
├── Dockerfile               # multi-stage: frontend build -> integrated backend image
├── docker-compose.yml       # nginx + backend + PostgreSQL, from the repo root
├── nginx/nginx.conf.template
├── .env.example             # only JWT_SECRET_KEY / POSTGRES_PASSWORD / an AI key are important
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py          # /api/auth (register, login, logout, me)
│   │   │   │   ├── resumes.py       # /api/resumes (CRUD, duplicate, pdf)
│   │   │   │   ├── templates.py     # /api/templates (25 templates catalog)
│   │   │   │   └── ai.py            # /api/ai (chat, improve, skills, job-match)
│   │   │   └── dependencies.py      # JWT authentication and user isolation
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic BaseSettings (.env loader)
│   │   │   └── security.py          # Bcrypt hashing and JWT tokens
│   │   ├── db/
│   │   │   └── session.py           # SQLAlchemy 2.x engine and sessionmaker
│   │   ├── models/                  # User, Resume, Conversation, Message
│   │   ├── schemas/                 # Pydantic validation schemas
│   │   ├── services/
│   │   │   ├── gemini_service.py    # Official google-genai SDK integration
│   │   │   ├── job_match_service.py # Keyword alignment analyzer
│   │   │   ├── pdf_service.py       # ReportLab PDF generator
│   │   │   └── template_registry.py # 25 template definitions
│   │   └── main.py                  # FastAPI application entrypoint
│   ├── migrations/                  # Alembic migration environment and versions
│   ├── tests/                       # Automated test suite and live E2E runner
│   ├── requirements.txt             # Python dependencies
│   ├── .env.example                 # Backend environment variable template
│   └── .env                         # Active configuration
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── FloatingAIChat.jsx   # Permanent Gemini assistant
│   │   │   ├── AuthenticatedLayout.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Session management
│   │   │   └── AIChatContext.jsx    # App-wide chat state & field insertion
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx        # 2-field clean login
│   │   │   ├── RegisterPage.jsx     # Registration with validation
│   │   │   ├── DashboardPage.jsx    # Overview, stats, recent resumes
│   │   │   ├── MyResumesPage.jsx    # Full resume management
│   │   │   ├── TemplateGalleryPage.jsx # 25 templates gallery with previews
│   │   │   ├── ResumeBuilderPage.jsx   # Guided builder & Job Match Analyzer
│   │   │   └── AccountPage.jsx      # User profile
│   │   ├── services/
│   │   │   └── api.js               # Axios client with interceptors
│   │   ├── templates/
│   │   │   └── ResumeRenderer.jsx   # Universal dynamic template renderer
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── PROJECT_STATUS.md
├── TODO.md
└── README.md
```

---

## Setup & Running Instructions

### Prerequisites
- **Python**: 3.10, 3.11, 3.12, 3.13, or 3.14
- **Node.js**: v18+ (tested on v24) & npm
- **PostgreSQL**: 14+ (tested on PostgreSQL 18)

---

### Step 1: Database Setup
Ensure PostgreSQL is running. Create the database:
```sql
CREATE DATABASE ai_resume_builder;
```

---

### Step 2: Backend Configuration & Startup

1. **Navigate to the backend directory and activate the virtual environment**:
   ```bash
   cd backend
   # On Windows:
   .venv\Scripts\activate
   # On macOS/Linux:
   source .venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your settings:
   ```env
   # PostgreSQL Connection URL
   DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5433/ai_resume_builder

   # JWT Secret Key
   JWT_SECRET_KEY=b91a78fa8115663738092284cf72c81d3467e4125b290df621a5a04a6e872c65
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440

   # Google Gemini API Configuration
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   GEMINI_MODEL=gemini-3.8-flash

   # Frontend Origin
   FRONTEND_URL=http://localhost:5173
   PORT=8000
   ```

4. **Apply Alembic Migrations**:
   ```bash
   alembic upgrade head
   ```

5. **Start the FastAPI Backend**:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   The backend API will be live at `http://127.0.0.1:8000`.
   Interactive Swagger documentation is available at `http://127.0.0.1:8000/api/docs`.

---

### Step 3: Frontend Setup & Startup

1. **Open a new terminal and navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

---

### Step 4: Obtaining a Google Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** and generate a new key.
4. Copy the API key and paste it into `backend/.env`:
   ```env
   GEMINI_API_KEY=your_copied_key_here
   ```
5. Restart the backend server. The application automatically connects.
   *Note*: If `GEMINI_API_KEY` is empty, the assistant displays a friendly configuration notice while all resume builder, template, autosave, and PDF export features remain 100% operational.

---

## Running Automated Tests

Run the backend test suite:
```bash
# In the project root with the virtual environment activated:
backend\.venv\Scripts\pytest.exe backend\tests -v
```

Run the live end-to-end integration test runner against active servers:
```bash
backend\.venv\Scripts\python.exe backend\tests\verify_e2e_live.py
```

All 9 test units and all 12 live E2E integration workflows pass with 100% success rate.

---

## Troubleshooting Guide

### 1. PostgreSQL Connection Error (`FATAL: password authentication failed` or `Connection refused`)
- Verify PostgreSQL is running: `Get-Service *postgres*` on Windows or `sudo systemctl status postgresql` on Linux.
- Check the port in `DATABASE_URL`. The default standalone local cluster uses port `5433` (or `5432` for system PostgreSQL installations).
- Verify database existence: `psql -U postgres -h 127.0.0.1 -p 5433 -l`

### 2. Gemini API / AI Features
- If AI requests return a message saying the API key is not configured, verify that `GEMINI_API_KEY` in `backend/.env` is not blank.
- Supported models: `gemini-3.8-flash` (recommended), `gemini-flash-latest`.
- Ensure the machine has outbound internet connectivity to `generativelanguage.googleapis.com`.

### 3. CORS / Network Error in Browser
- Ensure the backend is running on `http://localhost:8000`.
- Verify `FRONTEND_URL=http://localhost:5173` matches the frontend Vite port.
- Vite dev server automatically proxies `/api` requests to `http://localhost:8000`.

### 4. PDF Generation Failure
- The PDF export uses ReportLab, which requires no external OS libraries or GTK/WebKit dependencies.
- Ensure `reportlab` is installed in your Python environment: `pip show reportlab`.
