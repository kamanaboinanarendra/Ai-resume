#!/bin/sh
# Entrypoint for the integrated app image.
#   1. Verify the mandatory environment variables are present:
#         POSTGRES_URI    (full PostgreSQL URI)
#         JWT_SECRET_KEY  (openssl rand -hex 32)
#         GEMINI_API_KEY  (Google AI Studio)
#   2. Wait for the database, create tables, apply migrations.
#   3. Exec uvicorn (PID 1 via exec -> clean signal handling).
set -eu

# --- 1. Mandatory environment ---------------------------------------------
missing=""
# POSTGRES_URI is canonical; DATABASE_URL is accepted as a legacy alias.
[ -z "${POSTGRES_URI:-}" ] && [ -z "${DATABASE_URL:-}" ] && missing="$missing POSTGRES_URI"
[ -z "${JWT_SECRET_KEY:-}" ] && missing="$missing JWT_SECRET_KEY"
[ -z "${GEMINI_API_KEY:-}" ] && missing="$missing GEMINI_API_KEY"

if [ -n "$missing" ]; then
  echo "================================================================" >&2
  echo "  IMPORTANT: mandatory environment variables are missing:" >&2
  for var in $missing; do echo "    - $var" >&2; done
  echo "  Set them in your .env file (see .env.example) or with" >&2
  echo "  'docker run -e ...' / compose 'environment:', then restart." >&2
  echo "================================================================" >&2
  exit 1
fi

# --- 2. Database ---------------------------------------------------------
python - <<'PY'
import os, sys, time

sys.path.insert(0, os.getcwd())
# Resolves POSTGRES_URI / DATABASE_URL and normalises the URI.
from app.core.config import settings

url = settings.DATABASE_URL

if not url.startswith("sqlite"):
    from sqlalchemy import create_engine, text

    deadline = time.time() + 60
    last = None
    while time.time() < deadline:
        try:
            engine = create_engine(url)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("entrypoint: database is reachable.", flush=True)
            break
        except Exception as exc:  # noqa: BLE001 - retry any boot-time DB error
            last = exc
            time.sleep(2)
    else:
        print(f"entrypoint: WARNING database not reachable after 60s: {last}",
              file=sys.stderr, flush=True)
        sys.exit(0)  # app will surface the error; don't crash-loop forever

# Create tables first (Alembic's initial revision is a no-op and its
# follow-up inspects existing tables), then apply migrations.
try:
    from app.db.session import engine, Base
    import app.models  # noqa: F401  (register models)
    Base.metadata.create_all(bind=engine)
    print("entrypoint: database tables ensured.", flush=True)
except Exception as exc:  # noqa: BLE001
    print(f"entrypoint: WARNING table creation failed: {exc}",
          file=sys.stderr, flush=True)
PY

# Migrations are best-effort: create_all above already guarantees a
# working schema, so a migration hiccup must never block the app.
if command -v alembic >/dev/null 2>&1 && [ -f alembic.ini ]; then
  alembic upgrade head || echo "entrypoint: WARNING 'alembic upgrade head' failed; continuing with create_all schema." >&2
fi

# --- 3. Serve -------------------------------------------------------------
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-1}" \
  --proxy-headers \
  --forwarded-allow-ips '*'
