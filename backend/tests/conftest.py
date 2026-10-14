"""Test bootstrap.

POSTGRES_URI, JWT_SECRET_KEY and GEMINI_API_KEY are mandatory in
real deployments (the app refuses to start without them), so the
test suite provides throwaway local values when the environment
does not already provide real ones. The database is a local SQLite
file and the Gemini key is a dummy -- AI calls fail gracefully and
the routes under test assert exactly that behaviour.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

os.environ.setdefault(
    "POSTGRES_URI", "sqlite:////tmp/ai_resume_builder_tests.db")
os.environ.setdefault(
    "JWT_SECRET_KEY", "test-only-jwt-secret-not-for-production-0123456789")
os.environ.setdefault("GEMINI_API_KEY", "test-only-dummy-gemini-key")
