import os
import sys
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# Ensure backend directory is in sys.path regardless of where uvicorn or python is executed
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # .../backend
WORKSPACE_DIR = BASE_DIR.parent                          # .../ai resume builder

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

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Resume Builder"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5433/ai_resume_builder"
    
    # JWT Authentication
    JWT_SECRET_KEY: str = "b91a78fa8115663738092284cf72c81d3467e4125b290df621a5a04a6e872c65"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    # AI Assistance (Supports Google Gemini and OpenRouter)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openrouter/free"
    
    # CORS
    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ]

    # Email / SMTP Delivery Service
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@airesumebuilder.local"
    EMAIL_FROM: str = "noreply@airesumebuilder.local"
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    SMTP_SECURE: Optional[bool] = None  # True indicates port 465 SSL; False indicates port 587 TLS
    
    PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=FOUND_ENV_FILES if FOUND_ENV_FILES else str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

