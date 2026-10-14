#!/bin/sh
# Entrypoint for the integrated app image.
#   1. Persist an auto-generated JWT secret when none was provided
#      (so `docker compose up` with zero config keeps logins valid
#       across restarts; set JWT_SECRET_KEY to override).
#   2. Wait for the database, create tables, apply migrations.
#   3. Exec uvicorn (PID 1 via exec -> clean signal handling).
set -eu

SECRETS_DIR="${SECRETS_DIR:-/app/secrets}"

# --- 1. JWT secret ------------------------------------------------------
case "${JWT_SECRET_KEY:-}" in
  ""|change-this-to-a-very-secure-random-secret-key-in-production-32bytes|change-me|changeme)
    mkdir -p "$SECRETS_DIR" 2>/dev/null || true
    SECRET_FILE="$SECRETS_DIR/jwt_secret"
    if [ ! -s "$SECRET_FILE" ]; then
      python -c "import secrets; print(secrets.token_hex(32))" > "$SECRET_FILE" 2>/dev/null \
        || echo "ephemeral-$(date +%s)-$$" > "$SECRET_FILE"
      chmod 600 "$SECRET_FILE" 2>/dev/null || true
      echo "entrypoint: generated a JWT secret in $SECRET_FILE (set JWT_SECRET_KEY to use your own)."
    fi
    JWT_SECRET_KEY="$(cat "$SECRET_FILE")"
    export JWT_SECRET_KEY
    ;;
esac

# --- 2. Database ---------------------------------------------------------
python - <<'PY'
import os, sys, time

url = os.environ.get("DATABASE_URL", "")
if not url:
    # Assemble from POSTGRES_* components exactly like the app does.
    try:
        sys.path.insert(0, os.getcwd())
        from app.core.config import settings
        url = settings.DATABASE_URL
    except Exception:
        sys.exit(0)

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
        sys.exit(0)  # app will keep warning; don't crash-loop forever

# Create tables first (Alembic's initial revision is a no-op and its
# follow-up inspects existing tables), then apply migrations.
try:
    sys.path.insert(0, os.getcwd())
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
