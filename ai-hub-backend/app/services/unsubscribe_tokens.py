"""Opaque one-click unsubscribe tokens (spec AD3).

Format: ``v1.<kid>.<subscription_id>.<signature>``

- ``kid``: 8 hex characters derived from the signing secret, so the verifier
  can pick the matching key while two secrets are live during a rotation.
- ``signature``: unpadded base64url HMAC-SHA256 over
  ``unsubscribe.v1.<kid>.<subscription_id>``.

Tokens carry the Beehiiv subscription id, never an email address. Minting
without a usable secret returns None (the sender degrades); verification
without a usable secret always fails (fail closed).
"""

import base64
import hashlib
import hmac
import re

TOKEN_VERSION = "v1"
MIN_SECRET_LENGTH = 32
_PURPOSE = "unsubscribe"
_SUBSCRIPTION_ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{1,64}")
_TOKEN_PATTERN = re.compile(r"v1\.([0-9a-f]{8})\.([A-Za-z0-9_-]{1,64})\.([A-Za-z0-9_-]{43})")


def usable_secret(secret: str | None) -> bool:
    """True when a signing secret is long enough to trust."""
    return bool(secret) and len(secret) >= MIN_SECRET_LENGTH


def key_id(secret: str) -> str:
    """Public 8-hex identifier of a signing secret."""
    return hmac.new(secret.encode(), b"unsubscribe-key-id", hashlib.sha256).hexdigest()[:8]


def _signature(secret: str, kid: str, subscription_id: str) -> str:
    message = f"{_PURPOSE}.{TOKEN_VERSION}.{kid}.{subscription_id}".encode()
    digest = hmac.new(secret.encode(), message, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


def mint_token(subscription_id: str | None, secret: str | None) -> str | None:
    """Token for one subscription, or None when the secret or the id is unusable."""
    if not usable_secret(secret) or not subscription_id:
        return None
    if not _SUBSCRIPTION_ID_PATTERN.fullmatch(subscription_id):
        return None
    kid = key_id(secret)
    return f"{TOKEN_VERSION}.{kid}.{subscription_id}.{_signature(secret, kid, subscription_id)}"


def verify_token(token: str | None, keys: list[str]) -> str | None:
    """Subscription id for a valid token, else None. Fails closed without usable keys."""
    match = _TOKEN_PATTERN.fullmatch(token or "")
    if not match:
        return None
    kid, subscription_id, signature = match.groups()
    for secret in keys:
        if usable_secret(secret) and hmac.compare_digest(key_id(secret), kid):
            expected = _signature(secret, kid, subscription_id)
            return subscription_id if hmac.compare_digest(expected, signature) else None
    return None


def verification_keys(settings) -> list[str]:
    """Usable current and previous signing secrets, current first.

    Empty when SIGNING_SECRET itself is unusable: verification fails closed even
    if SIGNING_SECRET_PREVIOUS is still set (a rotation always has a current key).
    """
    if not usable_secret(settings.signing_secret):
        return []
    return [s for s in (settings.signing_secret, settings.signing_secret_previous) if usable_secret(s)]
