"""
Central application settings.

Environment philosophy (see root ``.env.example``):

* Only a handful of variables are *important* for a real deployment
  (an AI key if you want AI features, and ``JWT_SECRET_KEY`` /
  ``POSTGRES_PASSWORD`` if you want stable logins / a non-default DB
  password).  Everything else is OPTIONAL.
* Every optional variable is auto-detected or falls back to a sensible
  default, e.g.:

  - ``DATABASE_URL`` is assembled from ``POSTGRES_HOST/PORT/DB/USER/
    PASSWORD`` (set automatically by docker-compose) when not given.
  - ``DOMAIN`` / ``PUBLIC_URL`` derive the public origin, CORS list and
    the Secure-cookie flag when not given (defaults: same-origin,
    which is always correct because the frontend calls relative
    ``/api`` URLs and is served by this very backend / nginx).
  - ``JWT_SECRET_KEY`` left unset -> an ephemeral per-boot secret is
    generated and a loud warning is printed (the Docker entrypoint
    persists a generated secret to a volume so logins survive
    restarts even with zero configuration).
"""
import os
import secrets
import sys
from pathlib import Path
from typing import List, Optional
from urllib.parse import quote_plus

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

_INSECURE_JWT_SECRETS = {
    "",
    "change-this-to-a-very-secure-random-secret-key-in-production-32bytes",
    "change-me",
    "changeme",
}

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


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Resume Builder"
    API_V1_STR: str = "/api"

    # -- Public origin (OPTIONAL, auto-detected) --------------------------
    # Set DOMAIN=resumes.example.com   (scheme optional)  OR
    #     PUBLIC_URL=https://resumes.example.com          OR
    # leave both empty: same-origin deployment (the default under
    # Docker/nginx) needs no origin at all -- it just works on any
    # domain, IP or localhost without rebuilding the frontend.
    DOMAIN: str = ""
    PUBLIC_URL: str = ""
    # Explicit overrides (rarely needed):
    FRONTEND_URL: str = ""
    CORS_ORIGINS: str = ""  # comma-separated, e.g. "https://a.com,https://b.com"
    ALLOWED_ORIGINS: List[str] = []

    # -- Database (OPTIONAL, auto-assembled) -------------------------------
    # Either a full DATABASE_URL, or the POSTGRES_* components below.
    DATABASE_URL: str = ""
    POSTGRES_HOST: str = ""
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "ai_resume_builder"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    # Generic aliases accepted as a convenience:
    DB_HOST: str = ""
    DB_PORT: Optional[int] = None

    # -- JWT Authentication --------------------------------------------------
    # IMPORTANT for production (stable logins across restarts/replicas);
    # auto-generated when left unset -- see module docstring.
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    JWT_SECRET_IS_EPHEMERAL: bool = False

    # -- AI Assistance (Supports Google Gemini and OpenRouter) -------------
    # IMPORTANT only if you want AI features; the app runs fully without it.
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openrouter/free"

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
        # --- public URL ------------------------------------------------
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

        # --- CORS --------------------------------------------------------
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
        origins.update(_split_origins(os.environ.get("ALLOWED_ORIGINS", "")
                                       if not self.ALLOWED_ORIGINS else ""))
        self.ALLOWED_ORIGINS = sorted(o for o in origins if o)

        # --- cookie security ---------------------------------------------
        if self.COOKIE_SECURE is None:
            self.COOKIE_SECURE = public.startswith("https://")

        if not self.EMAIL_FROM:
            self.EMAIL_FROM = self.SMTP_FROM or (
                f"noreply@{public.split('://', 1)[-1].split('/')[0]}"
                if public else "noreply@airesumebuilder.local"
            )
        if not self.SMTP_FROM:
            self.SMTP_FROM = self.EMAIL_FROM

        # --- database URL ---------------------------------------------------
        if not self.DATABASE_URL:
            host = self.POSTGRES_HOST or self.DB_HOST or os.environ.get("DB_HOST", "")
            if host:
                port = self.DB_PORT or self.POSTGRES_PORT or 5432
                self.DATABASE_URL = (
                    f"postgresql+psycopg://{quote_plus(self.POSTGRES_USER)}:"
                    f"{quote_plus(self.POSTGRES_PASSWORD)}@{host}:{port}/"
                    f"{quote_plus(self.POSTGRES_DB)}"
                )
            else:
                # Local (non-Docker) developer default -- unchanged behaviour.
                self.DATABASE_URL = (
                    "postgresql+psycopg://postgres:postgres"
                    "@localhost:5433/ai_resume_builder"
                )

        # --- JWT secret ------------------------------------------------------
        if (self.JWT_SECRET_KEY or "").strip() in _INSECURE_JWT_SECRETS:
            self.JWT_SECRET_KEY = secrets.token_hex(32)
            self.JWT_SECRET_IS_EPHEMERAL = True
            print(
                "\n"
                "================================================================\n"
                "  IMPORTANT: JWT_SECRET_KEY is not set.\n"
                "  A random secret was generated for this boot only, so all\n"
                "  logins will be invalidated when the server restarts.\n"
                "  For production set JWT_SECRET_KEY in your .env, e.g.:\n"
                "      JWT_SECRET_KEY=$(openssl rand -hex 32)\n"
                "  (Under docker-compose a generated secret is persisted\n"
                "   automatically in the `app_secrets` volume instead.)\n"
                "================================================================\n",
                file=sys.stderr,
            )
        return self

    @property
    def public_url(self) -> str:
        """Public base URL of the whole app ('' when not configured)."""
        return self.PUBLIC_URL


settings = Settings()
