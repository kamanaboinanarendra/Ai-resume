import os
import ssl
import socket
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional, List
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailError(Exception):
    """Base exception for email service issues."""
    pass

class EmailNotConfiguredError(EmailError):
    """Raised when SMTP credentials are not configured."""
    pass

class EmailDeliveryError(EmailError):
    """Raised when SMTP delivery fails."""
    pass

class EmailService:
    def __init__(self):
        pass

    @property
    def smtp_host(self) -> str:
        return (os.environ.get("SMTP_HOST") or settings.SMTP_HOST or "").strip()

    @property
    def smtp_port(self) -> int:
        val = os.environ.get("SMTP_PORT") or settings.SMTP_PORT or 587
        try:
            return int(val)
        except (ValueError, TypeError):
            return 587

    @property
    def smtp_user(self) -> str:
        return (os.environ.get("SMTP_USER") or settings.SMTP_USER or "").strip()

    @property
    def smtp_password(self) -> str:
        return (os.environ.get("SMTP_PASSWORD") or settings.SMTP_PASSWORD or "").strip()

    @property
    def smtp_secure(self) -> Optional[bool]:
        env_val = os.environ.get("SMTP_SECURE")
        if env_val is not None:
            return env_val.strip().lower() in ("true", "1", "yes")
        return settings.SMTP_SECURE

    @property
    def smtp_use_ssl(self) -> bool:
        if self.smtp_secure is True:
            return True
        if self.smtp_port == 465:
            return True
        env_val = os.environ.get("SMTP_USE_SSL")
        if env_val is not None:
            return env_val.strip().lower() in ("true", "1", "yes")
        return bool(settings.SMTP_USE_SSL)

    @property
    def smtp_use_tls(self) -> bool:
        if self.smtp_use_ssl:
            return False
        env_val = os.environ.get("SMTP_USE_TLS")
        if env_val is not None:
            return env_val.strip().lower() in ("true", "1", "yes")
        return bool(settings.SMTP_USE_TLS)

    @property
    def from_email(self) -> str:
        configured = (
            os.environ.get("EMAIL_FROM")
            or settings.EMAIL_FROM
            or os.environ.get("SMTP_FROM")
            or settings.SMTP_FROM
            or ""
        ).strip()
        # If configured is still default placeholder or empty, but smtp_user is an email address,
        # prefer smtp_user to satisfy strict SMTP services like Gmail
        if configured and configured != "noreply@airesumebuilder.local":
            return configured
        if self.smtp_user and "@" in self.smtp_user:
            return self.smtp_user
        return configured or "noreply@airesumebuilder.com"

    def get_missing_config(self) -> List[str]:
        """Returns list of required SMTP environment variable names that are missing."""
        missing = []
        if not self.smtp_host:
            missing.append("SMTP_HOST")
        if not self.smtp_user:
            missing.append("SMTP_USER")
        if not self.smtp_password:
            missing.append("SMTP_PASSWORD")
        return missing

    def is_smtp_configured(self) -> bool:
        """Checks if all required SMTP settings are present."""
        return len(self.get_missing_config()) == 0

    def test_connection(self) -> Dict[str, Any]:
        """
        Tests the SMTP server connection and authentication.
        Useful for local verification scripts and diagnostic checks.
        """
        missing = self.get_missing_config()
        if missing:
            return {
                "success": False,
                "error": f"Missing SMTP configuration: {', '.join(missing)}",
                "missing": missing
            }

        context = ssl.create_default_context()
        try:
            if self.smtp_use_ssl:
                with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=12, context=context) as server:
                    server.ehlo()
                    if self.smtp_user and self.smtp_password:
                        server.login(self.smtp_user, self.smtp_password)
            else:
                with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=12) as server:
                    server.ehlo()
                    if self.smtp_use_tls or self.smtp_port in (587, 2525):
                        server.starttls(context=context)
                        server.ehlo()
                    if self.smtp_user and self.smtp_password:
                        server.login(self.smtp_user, self.smtp_password)

            return {
                "success": True,
                "message": f"Successfully connected and authenticated with {self.smtp_host}:{self.smtp_port}."
            }
        except smtplib.SMTPAuthenticationError as e:
            return {
                "success": False,
                "error": f"Authentication failed: {str(e)}. If using Gmail, make sure to use a 16-character App Password (not your normal Google password)."
            }
        except (socket.gaierror, smtplib.SMTPConnectError, socket.timeout, TimeoutError) as e:
            return {
                "success": False,
                "error": f"Connection failed to {self.smtp_host}:{self.smtp_port}: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"SMTP test failed: {str(e)}"
            }

    def send_password_reset_code(self, to_email: str, user_name: str, code: str) -> Dict[str, Any]:
        """
        Sends a 6-digit password reset verification code.
        Securely delivers through configured SMTP server.
        Raises EmailNotConfiguredError if SMTP is not set up.
        Raises EmailDeliveryError if SMTP delivery fails.
        Verification code is never logged to application logs.
        """
        if not self.is_smtp_configured():
            missing = self.get_missing_config()
            logger.warning(
                "Password reset requested, but SMTP credentials are not configured. "
                "Missing settings: %s. Configure them in .env.",
                ", ".join(missing)
            )
            raise EmailNotConfiguredError(
                f"Email delivery service is not configured on the server. "
                f"Missing settings: {', '.join(missing)} in .env."
            )

        subject = "AI Resume Builder - Your Password Reset Verification Code"
        
        html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFF7F7; margin: 0; padding: 24px; color: #222222; }}
    .container {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #E5E7EB; padding: 36px 32px; box-shadow: 0 8px 24px rgba(0,0,0,0.06); }}
    .logo {{ font-size: 22px; font-weight: 900; color: #222222; margin-bottom: 20px; }}
    .logo span {{ color: #D62828; }}
    .title {{ font-size: 20px; font-weight: 800; color: #222222; margin-bottom: 12px; }}
    .desc {{ font-size: 14px; color: #4B5563; line-height: 1.6; margin-bottom: 24px; }}
    .code-box {{ background-color: #FFF1F1; border: 2px dashed #D62828; border-radius: 16px; text-align: center; padding: 20px; margin: 24px 0; }}
    .code {{ font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #D62828; font-family: 'Courier New', Courier, monospace; }}
    .expiry {{ font-size: 12px; font-weight: 600; color: #DC2626; margin-top: 8px; }}
    .security-note {{ font-size: 13px; color: #6B7280; line-height: 1.5; margin-top: 24px; border-top: 1px solid #F3F4F6; padding-top: 20px; }}
    .footer {{ font-size: 11px; color: #9CA3AF; text-align: center; margin-top: 28px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">AI Resume <span>Builder</span></div>
    <div class="title">Reset Your Password</div>
    <p class="desc">
      Hello {user_name or 'there'},<br><br>
      We received a request to reset the password for your AI Resume Builder account.
      Enter the 6-digit verification code below to complete your password reset:
    </p>
    <div class="code-box">
      <div class="code">{code}</div>
      <div class="expiry">Expires in 10 minutes</div>
    </div>
    <div class="security-note">
      <strong>Security Notice:</strong> If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged. Never share this code with anyone.
    </div>
    <div class="footer">
      &copy; AI Resume Builder &bull; Secure Authentication Service
    </div>
  </div>
</body>
</html>"""

        text_content = f"""Hello {user_name or 'there'},

We received a request to reset your AI Resume Builder password.
Your 6-digit verification code is: {code}

This code will expire in 10 minutes.
If you did not request this password reset, please ignore this email. Your account remains secure.

-- AI Resume Builder Team"""

        context = ssl.create_default_context()
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to_email
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            if self.smtp_use_ssl:
                with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=15, context=context) as server:
                    server.ehlo()
                    if self.smtp_user and self.smtp_password:
                        server.login(self.smtp_user, self.smtp_password)
                    server.sendmail(self.from_email, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=15) as server:
                    server.ehlo()
                    if self.smtp_use_tls or self.smtp_port in (587, 2525):
                        server.starttls(context=context)
                        server.ehlo()
                    if self.smtp_user and self.smtp_password:
                        server.login(self.smtp_user, self.smtp_password)
                    server.sendmail(self.from_email, [to_email], msg.as_string())

            logger.info(f"Password reset verification email dispatched successfully to {to_email}")
            return {
                "success": True,
                "smtp_sent": True,
                "to_email": to_email
            }
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP Authentication error for {to_email}: {str(e)}")
            raise EmailDeliveryError(
                "SMTP authentication failed. Please verify your SMTP_USER and SMTP_PASSWORD credentials. "
                "For Gmail, use a 16-character App Password."
            )
        except (socket.gaierror, smtplib.SMTPConnectError, socket.timeout, TimeoutError) as e:
            logger.error(f"SMTP Connection error to {self.smtp_host}:{self.smtp_port}: {str(e)}")
            raise EmailDeliveryError(
                f"Could not connect to SMTP server at {self.smtp_host}:{self.smtp_port}. Please check your network and SMTP_HOST/SMTP_PORT settings."
            )
        except smtplib.SMTPRecipientsRefused as e:
            logger.error(f"SMTP Recipient refused: {to_email}: {str(e)}")
            raise EmailDeliveryError(
                f"The recipient email address {to_email} was rejected by the mail server."
            )
        except smtplib.SMTPDataError as e:
            logger.error(f"SMTP Data error for {to_email}: {str(e)}")
            raise EmailDeliveryError(
                f"The SMTP server rejected email data. Ensure EMAIL_FROM matches your authorized sending identity."
            )
        except Exception as e:
            logger.error(f"Failed to deliver SMTP email to {to_email}: {str(e)}")
            raise EmailDeliveryError(
                f"Failed to deliver verification email: {str(e)}. Please check your SMTP configuration."
            )

email_service = EmailService()

