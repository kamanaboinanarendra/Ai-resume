import urllib.request
import urllib.error
import json

def test():
    data = json.dumps({"email": "nonexistent_user_12345@example.com"}).encode()
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/auth/forgot-password",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        res = urllib.request.urlopen(req)
        print("Success:", res.read().decode())
    except urllib.error.HTTPError as e:
        print("HTTPError:", e.code, e.read().decode())

if __name__ == "__main__":
    test()
