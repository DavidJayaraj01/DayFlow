"""Email service — sends emails in production, logs to console in dev mode."""

import logging
from typing import Optional

from src.core.config import settings

logger = logging.getLogger(__name__)


async def send_employee_credentials_email(
    to_email: str,
    employee_name: str,
    login_id: str,
    temp_password: str,
    company_name: str,
) -> None:
    """Send login credentials to a newly provisioned employee.

    In dev mode, logs to console instead of sending real email.
    """
    subject = f"Welcome to {company_name} — Your Dayflow Login Credentials"
    body = f"""
Hello {employee_name},

Welcome to {company_name}! Your Dayflow HRMS account has been created.

Your login credentials:
  Login ID: {login_id}
  Temporary Password: {temp_password}

Please log in at your earliest convenience. You will be required to change
your password on first login.

Best regards,
{company_name} HR Team (via Dayflow)
"""

    if settings.is_dev or not settings.MAIL_USERNAME:
        logger.info("=" * 60)
        logger.info("DEV EMAIL — Would send to: %s", to_email)
        logger.info("Subject: %s", subject)
        logger.info(body)
        logger.info("=" * 60)
        return

    # Production: send real email via fastapi-mail
    try:
        from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

        conf = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_STARTTLS=settings.MAIL_STARTTLS,
            MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
            USE_CREDENTIALS=True,
        )
        message = MessageSchema(
            subject=subject,
            recipients=[to_email],
            body=body,
            subtype=MessageType.plain,
        )
        fm = FastMail(conf)
        await fm.send_message(message)
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, str(e))
        raise


async def send_generic_email(
    to_email: str,
    subject: str,
    body: str,
) -> None:
    """Send a generic email. Dev mode logs to console."""
    if settings.is_dev or not settings.MAIL_USERNAME:
        logger.info("DEV EMAIL — To: %s | Subject: %s", to_email, subject)
        logger.info(body)
        return

    try:
        from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

        conf = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_STARTTLS=settings.MAIL_STARTTLS,
            MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
            USE_CREDENTIALS=True,
        )
        message = MessageSchema(
            subject=subject,
            recipients=[to_email],
            body=body,
            subtype=MessageType.plain,
        )
        fm = FastMail(conf)
        await fm.send_message(message)
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, str(e))
        raise
