from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base
import app.models # Ensure all models are registered
from app.api.routes import auth, resumes, templates, ai, ats

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist on startup
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Database table creation encountered an issue: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Resume Builder API with PostgreSQL, Gemini Integration, and PDF Export",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
origins = list(set([settings.FRONTEND_URL] + settings.ALLOWED_ORIGINS))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(resumes.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(ats.router, prefix="/api")

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "database": "connected"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
