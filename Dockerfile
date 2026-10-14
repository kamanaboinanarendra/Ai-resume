# syntax=docker/dockerfile:1
# ==========================================================================
# AI-Powered Resume Builder -- ONE image for the whole application.
#
#   Build (from the repository root):   docker build -t ai-resume .
#   Run the full app (needs a DB):      docker compose up --build
#                                       # or see docker-compose.yml
#
# Stage 1 builds the React frontend; stage 2 is the FastAPI backend
# with that build baked in, so the backend itself serves:
#       /api/*   -> backend API        (docs: /api/docs)
#       /*       -> integrated frontend (SPA fallback)
# nginx (docker-compose.yml) proxies both kinds of paths to this image.
# ==========================================================================

# --------------------------------------------------------------------------
# Stage 1: build the frontend
# --------------------------------------------------------------------------
FROM node:20-alpine AS frontend-build
WORKDIR /build/frontend

# Install deps first (layer-cached until the lockfile changes).
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./
# The app calls the backend via relative "/api" URLs, so the bundle is
# domain-agnostic: no build-time API URL / domain is baked in.
RUN npm run build

# --------------------------------------------------------------------------
# Stage 2: backend + integrated frontend
# --------------------------------------------------------------------------
FROM python:3.12-slim AS app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000 \
    FRONTEND_DIST_DIR=/app/frontend_dist

WORKDIR /app

# Python dependencies (layer-cached until requirements change).
COPY backend/requirements.txt ./requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

# Backend code (app/, migrations/, alembic.ini, entrypoint).
COPY backend/ ./

# The built frontend, integrated into the backend image.
COPY --from=frontend-build /build/frontend/dist ./frontend_dist

RUN chmod +x docker-entrypoint.sh \
    && addgroup --system app && adduser --system --ingroup app app \
    && chown -R app:app /app
USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4)" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
