"""
AI-Powered Resume Builder -- application entrypoint.

Routing layout (this is the *integrated* deployment):

    /api/*          ->  the FastAPI backend (auth, resumes, templates,
                        AI, ATS).  OpenAPI docs live at /api/docs.
    everything else ->  the built React frontend (``frontend/dist``,
                        baked into the Docker image / copied next to
                        this file), with SPA fallback to index.html
                        so client-side routes like /dashboard or
                        /login load correctly on refresh / deep link.

nginx (see ``nginx/nginx.conf.template`` + ``docker-compose.yml``)
sits in front of this app in the Docker deployment and proxies both
frontend paths (``/``, ``/login``, ``/assets/...``) and ``/api/*``
to this same process -- there is only one application container.
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine, Base
import app.models  # Ensure all models are registered
from app.api.routes import auth, resumes, templates, ai, ats


def _frontend_dist() -> Path | None:
    """Locate the built frontend, wherever this app is running."""
    candidates = []
    if settings.FRONTEND_DIST_DIR:
        candidates.append(Path(settings.FRONTEND_DIST_DIR))
    here = Path(__file__).resolve()
    candidates += [
        here.parent / "static",                 # backend/app/static
        here.parent.parent / "frontend_dist",   # backend/frontend_dist
        here.parent.parent.parent / "frontend" / "dist",  # repo dev build
    ]
    for candidate in candidates:
        if (candidate / "index.html").is_file():
            return candidate
    return None


FRONTEND_DIST = _frontend_dist()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist on startup
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Database table creation encountered an issue: {e}")
    if FRONTEND_DIST:
        print(f"Serving integrated frontend from {FRONTEND_DIST}")
    else:
        print("No frontend build found -- serving API only under /api "
              "(build the frontend or use the Docker image).")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Resume Builder API with PostgreSQL, Gemini Integration, and PDF Export",
    version="1.0.0",
    lifespan=lifespan,
    # The whole backend API surface lives under /api -- docs included.
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS Middleware. Same-origin (integrated) traffic does not need CORS
# at all; this list exists for split dev (Vite on :5173) and for an
# explicitly configured public domain. See app/core/config.py.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def _static_cache_headers(request: Request, call_next):
    response = await call_next(request)
    # Vite emits content-hashed filenames under /assets -- cache hard.
    if request.url.path.startswith("/assets/"):
        response.headers.setdefault(
            "Cache-Control", "public, max-age=31536000, immutable")
    elif request.url.path in ("/", "/index.html"):
        response.headers.setdefault("Cache-Control", "no-cache")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    return response


# Register API Routers -- everything backend lives under /api.
app.include_router(auth.router, prefix="/api")
app.include_router(resumes.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(ats.router, prefix="/api")


@app.get("/api/health", tags=["Health"])
def health_check():
    database = "connected"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        database = "unavailable"
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "database": database,
        "frontend": "integrated" if FRONTEND_DIST else "not-built",
    }


@app.get("/api", tags=["Health"])
def api_root():
    return {
        "app": settings.PROJECT_NAME,
        "docs": "/api/docs",
        "health": "/api/health",
    }


# ----------------------------------------------------------------------
# Integrated frontend (SPA). Registered last so /api always wins.
# ----------------------------------------------------------------------
if FRONTEND_DIST:
    _assets = FRONTEND_DIST / "assets"
    if _assets.is_dir():
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        # Unknown API paths must stay JSON 404s, never SPA HTML.
        if full_path == "api" or full_path.startswith("api/"):
            return JSONResponse(status_code=404,
                                content={"detail": "Not Found"})
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        # SPA fallback: every frontend route serves the app shell.
        return FileResponse(FRONTEND_DIST / "index.html")
else:

    @app.get("/", include_in_schema=False)
    def api_only_root():
        return {
            "app": settings.PROJECT_NAME,
            "message": "API is running under /api. Frontend build not "
                       "found -- use the Docker image for the full app.",
            "docs": "/api/docs",
            "health": "/api/health",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
