"""
Central application settings.

MANDATORY environment variables -- the app refuses to start without
all three (see root ``.env.example``):

    POSTGRES_URI    Full PostgreSQL connection URI, e.g.
                    postgresql://user:password@host:5432/ai_resume_builder
                    (``postgres://`` and ``postgresql+psycopg://`` are
                    also accepted and normalised automatically.
                    ``DATABASE_URL`` is accepted as a legacy alias.)
    JWT_SECRET_KEY  Secret used to sign login tokens.
                    Generate one with:  openssl rand -hex 32
    GEMINI_API_KEY  Google Gemini API key (Google AI Studio).

Every other variable is OPTIONAL and auto-detected or falls back to a
sensible default, e.g. ``DOMAIN`` / ``PUBLIC_URL`` derive the public
origin, CORS list and the Secure-cookie flag, which is always correct
when unset because the frontend calls relative ``/api`` URLs and is
served by this very backend / nginx.
"""
import os
import sys
from pathlib import Path
from typing import List, Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# Ensure backend directory is in sys.path regardless of where uvicorn or python is executed
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # .../backend
WORKSPACE_DIR = BASE_DIR.parent                          # repository root

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Search for .env in backend/ first, then workspace root or current directory
ENV_CANDIDATES = [
    BASE_DIR / ".env",
    WORKSPACE_DIR / ".env",
    Path.cwd() / "backend" / ".env",
    Path.cwd() / ".env"
]

FOUND_ENV_FILES = [str(p) for p in ENV_CANDIDATES if p.is_file()]

# Explicitly load environment variables into os.environ
for env_path in FOUND_ENV_FILES:
    load_dotenv(dotenv_path=env_path, override=False)

# Values that must never be used as a real JWT secret (unset, docs
# placeholders, and the secret that used to be hardcoded in this repo).
_INSECURE_JWT_SECRETS = {
    "",
    "change-this-to-a-very-secure-random-secret-key-in-production-32bytes",
    "change-me",
    "changeme",
    "b91a78fa8115663738092284cf72c81d3467e4125b290df621a5a04a6e872c65",
}

MANDATORY_ENV_VARS = ("POSTGRES_URI", "JWT_SECRET_KEY", "GEMINI_API_KEY")

_LOCAL_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost",
    "http://127.0.0.1",
]


def _split_origins(raw: str) -> List[str]:
    return [o.strip().rstrip("/") for o in (raw or "").split(",") if o.strip()]


def normalise_postgres_uri(uri: str) -> str:
    """Accept postgres:// / postgresql:// and return a SQLAlchemy URL."""
    uri = (uri or "").strip()
    if uri.startswith("postgres://"):
        return "postgresql+psycopg://" + uri[len("postgres://"):]
    if uri.startswith("postgresql://"):
        return "postgresql+psycopg://" + uri[len("postgresql://"):]
    return uri


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Resume Builder"
    API_V1_STR: str = "/api"

    # -- MANDATORY ---------------------------------------------------------
    # Full PostgreSQL URI. DATABASE_URL is a legacy alias (POSTGRES_URI wins).
    POSTGRES_URI: str = ""
    DATABASE_URL: str = ""
    # Signs login tokens. Generate: openssl rand -hex 32
    JWT_SECRET_KEY: str = ""
    # Google Gemini API key (Google AI Studio).
    GEMINI_API_KEY: str = ""

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # -- OPTIONAL AI settings ------------------------------------------------
    GEMINI_MODEL: str = "gemini-3.8-flash"
    # Optional alternative provider; GEMINI_API_KEY above is the
    # mandatory/default path.
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openrouter/free"

    # -- OPTIONAL public origin (auto-detected) ------------------------------
    # Set DOMAIN=resumes.example.com   (scheme optional)  OR
    #     PUBLIC_URL=https://resumes.example.com          OR
    # leave both empty: same-origin deployment (the default under
    # Docker/nginx) needs no origin at all -- it just works on any
    # domain, IP or localhost without rebuilding the frontend.
    DOMAIN: str = ""
    PUBLIC_URL: str = ""
    FRONTEND_URL: str = ""
    CORS_ORIGINS: str = ""  # comma-separated, e.g. "https://a.com,https://b.com"
    ALLOWED_ORIGINS: List[str] = []

    # Email / SMTP Delivery Service (OPTIONAL; password-reset mail only)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    EMAIL_FROM: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    SMTP_SECURE: Optional[bool] = None  # True indicates port 465 SSL; False indicates port 587 TLS

    # Secure flag for the auth cookie: None -> auto (True iff https public URL)
    COOKIE_SECURE: Optional[bool] = None

    PORT: int = 8000
    # Where the integrated frontend build lives (set by the Dockerfile).
    FRONTEND_DIST_DIR: str = ""

    model_config = SettingsConfigDict(
        env_file=FOUND_ENV_FILES if FOUND_ENV_FILES else str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # ------------------------------------------------------------------
    @model_validator(mode="after")
    def _resolve_derived_settings(self) -> "Settings":
        # --- mandatory variables: fail fast, all at once -----------------
        missing = []

        raw_uri = (self.POSTGRES_URI or self.DATABASE_URL or "").strip()
        if not raw_uri:
            missing.append(
                "POSTGRES_URI  (full PostgreSQL URI, e.g. "
                "postgresql://user:password@host:5432/ai_resume_builder)")
        if (self.JWT_SECRET_KEY or "").strip() in _INSECURE_JWT_SECRETS:
            missing.append(
                "JWT_SECRET_KEY  (generate one with: openssl rand -hex 32)")
        if not (self.GEMINI_API_KEY or "").strip():
            missing.append(
                "GEMINI_API_KEY  (from Google AI Studio: "
                "https://aistudio.google.com)")

        if missing:
            raise ValueError(
                "\n"
                "================================================================\n"
                "  IMPORTANT: mandatory environment variables are missing:\n"
                + "".join(f"    - {item}\n" for item in missing)
                + "  Set them in your .env file (see .env.example) or in the\n"
                "  environment of the Docker container, then restart.\n"
                "================================================================\n"
            )

        # --- database URI -------------------------------------------------
        self.POSTGRES_URI = normalise_postgres_uri(raw_uri)
        # Kept in sync for the existing SQLAlchemy/Alembic code paths.
        self.DATABASE_URL = self.POSTGRES_URI

        # --- public URL -----------------------------------------------------
        public = (self.PUBLIC_URL or "").strip().rstrip("/")
        domain = (self.DOMAIN or "").strip().rstrip("/")
        if not public and domain:
            public = domain if domain.startswith(("http://", "https://")) \
                else f"https://{domain}"
        self.PUBLIC_URL = public

        if not self.FRONTEND_URL:
            # Integrated deployment: frontend is same-origin.
            self.FRONTEND_URL = public or "http://localhost:5173"
        self.FRONTEND_URL = self.FRONTEND_URL.rstrip("/")

        # --- CORS -------------------------------------------------------------
        origins = set(_LOCAL_ORIGINS)
        origins.add(self.FRONTEND_URL)
        if public:
            origins.add(public)
            # A bare domain may be reached over either scheme locally.
            bare = public.split("://", 1)[-1]
            origins.add(f"https://{bare}")
            origins.add(f"http://{bare}")
        origins.update(self.ALLOWED_ORIGINS)
        origins.update(_split_origins(self.CORS_ORIGINS))
        self.ALLOWED_ORIGINS = sorted(o for o in origins if o)

        # --- cookie security ----------------------------------------------------
        if self.COOKIE_SECURE is None:
            self.COOKIE_SECURE = public.startswith("https://")

        if not self.EMAIL_FROM:
            self.EMAIL_FROM = self.SMTP_FROM or (
                f"noreply@{public.split('://', 1)[-1].split('/')[0]}"
                if public else "noreply@airesumebuilder.local"
            )
        if not self.SMTP_FROM:
            self.SMTP_FROM = self.EMAIL_FROM

        return self

    @property
    def public_url(self) -> str:
        """Public base URL of the whole app ('' when not configured)."""
        return self.PUBLIC_URL


settings = Settings()
