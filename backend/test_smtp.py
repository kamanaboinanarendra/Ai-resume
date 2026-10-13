#!/usr/bin/env python3
"""
SMTP Diagnostic & Verification Tool for AI Resume Builder.
Tests your email delivery configuration directly against your SMTP provider.

Usage:
    # 1. Test SMTP credentials and connection:
    python test_smtp.py

    # 2. Test sending a real test verification email to your inbox:
    python test_smtp.py your_email@example.com
"""

import sys
import os
from pathlib import Path

# Ensure backend root is in sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.config import settings
from app.services.email_service import email_service

def mask_secret(s: str) -> str:
    if not s:
        return "<empty>"
    if len(s) <= 4:
        return "••••"
    return s[:2] + "•" * (len(s) - 4) + s[-2:]

def main():
    print("=" * 70)
    print("  AI RESUME BUILDER - SMTP DIAGNOSTIC & VERIFICATION TOOL")
    print("=" * 70)

    host = email_service.smtp_host
    port = email_service.smtp_port
    user = email_service.smtp_user
    password = email_service.smtp_password
    from_email = email_service.from_email
    use_ssl = email_service.smtp_use_ssl
    use_tls = email_service.smtp_use_tls

    print("\n[1] DETECTED SMTP CONFIGURATION:")
    print(f"  * SMTP_HOST:    {host or '[NOT SET]'}")
    print(f"  * SMTP_PORT:    {port}")
    print(f"  * SMTP_USER:    {user or '[NOT SET]'}")
    print(f"  * SMTP_PASSWORD:{mask_secret(password)}")
    print(f"  * EMAIL_FROM:   {from_email}")
    print(f"  * SSL Enabled:  {use_ssl} (Port 465)")
    print(f"  * TLS Enabled:  {use_tls} (Port 587)")

    missing = email_service.get_missing_config()
    if missing:
        print("\n" + "!" * 70)
        print("[!] SMTP IS NOT FULLY CONFIGURED YET")
        print(f"    Missing required variables in backend/.env: {', '.join(missing)}")
        print("!" * 70)
        print("\nTo configure email delivery for password recovery:")
        print("1. Open backend/.env in your editor.")
        print("2. For Gmail:")
        print("     SMTP_HOST=smtp.gmail.com")
        print("     SMTP_PORT=587")
        print("     SMTP_USER=your_email@gmail.com")
        print("     SMTP_PASSWORD=your_16_char_google_app_password")
        print("     EMAIL_FROM=your_email@gmail.com")
        print("     SMTP_USE_TLS=true")
        print("     SMTP_USE_SSL=false")
        print("   (Note: Create a Gmail App Password at: https://myaccount.google.com/apppasswords)")
        print("\n3. Save backend/.env and re-run: python test_smtp.py")
        sys.exit(1)

    print("\n[2] TESTING SMTP SERVER CONNECTION & AUTHENTICATION...")
    test_result = email_service.test_connection()
    if not test_result.get("success"):
        print(f"\n[X] Connection Failed: {test_result.get('error')}")
        print("\nTroubleshooting Tips:")
        print("* Gmail: Ensure 2-Step Verification is active, and use an App Password (16 letters).")
        print("* Firewall/Port: Ensure port 587 (TLS) or port 465 (SSL) is open on your network.")
        print("* Credentials: Confirm SMTP_USER matches your exact email or provider login.")
        sys.exit(1)

    print("[OK] " + test_result.get("message", "Connection and authentication successful!"))

    # Test sending actual email if recipient provided
    recipient = sys.argv[1] if len(sys.argv) > 1 else None
    if recipient:
        print(f"\n[3] SENDING TEST VERIFICATION CODE TO: {recipient}...")
        try:
            send_res = email_service.send_password_reset_code(
                to_email=recipient,
                user_name="Valued Tester",
                code="849201"
            )
            print(f"[OK] Real email sent successfully to {recipient}.")
            print("     Check your inbox (and spam/junk folder) for the verification code email.")
        except Exception as e:
            print(f"[X] Delivery failed: {str(e)}")
            sys.exit(1)
    else:
        print("\n[3] SEND A TEST EMAIL:")
        print(f"    To test delivering a real email to your inbox, run:")
        print(f"    python test_smtp.py your_email@example.com")


    print("\n" + "=" * 70)
    print("  SMTP SERVICE IS VERIFIED & READY FOR PASSWORD RECOVERY!")
    print("=" * 70)

if __name__ == "__main__":
    main()
