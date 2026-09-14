"""Keep subscriber and visitor email addresses out of log lines."""

import re

_EMAIL_PATTERN = re.compile(r"[^\s@\"'<>]+@[^\s@\"'<>]+")


def mask_email(value: str | None) -> str:
    """Log-safe form of an email address: first character and domain."""
    if not value or "@" not in value:
        return "<no-email>"
    local, _, domain = value.strip().rpartition("@")
    if not local or not domain:
        return "<no-email>"
    return f"{local[0]}***@{domain}"


def redact_emails(text: str) -> str:
    """Replace anything that looks like an email address in free text, e.g. provider errors."""
    return _EMAIL_PATTERN.sub("<email>", text)
