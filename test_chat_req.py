import urllib.request
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# 1. Login to get token
login_req = urllib.request.Request(
    "http://127.0.0.1:8000/api/auth/login",
    data=json.dumps({"email": "priya.sharma.live@example.com", "password": "SecurePassword123!"}).encode(),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(login_req) as resp:
        login_data = json.loads(resp.read().decode())
        token = login_data.get("access_token")
        print("Logged in successfully. Obtained token.", flush=True)

    # 2. Call AI chat with token
    chat_req = urllib.request.Request(
        "http://127.0.0.1:8000/api/ai/chat",
        data=json.dumps({"message": "Hello! Give me 3 tips for a software engineering resume."}).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )

    with urllib.request.urlopen(chat_req) as resp:
        chat_data = json.loads(resp.read().decode())
        print("Status code:", resp.getcode(), flush=True)
        print("AI Response:\n", chat_data.get("reply"), flush=True)
except Exception as e:
    print("Test failed:", type(e).__name__, str(e), flush=True)
