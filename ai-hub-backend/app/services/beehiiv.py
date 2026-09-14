"""Minimal Beehiiv API client for subscription changes (Beehiiv is the list of record)."""

from urllib.parse import quote

import requests

BEEHIIV_API = "https://api.beehiiv.com/v2"
TIMEOUT_SECONDS = 15


class BeehiivError(RuntimeError):
    """Unexpected Beehiiv status. Messages carry the status only, never response bodies."""


def _headers(api_key: str) -> dict:
    return {"Authorization": f"Bearer {api_key}"}


def unsubscribe_subscription(api_key: str, publication_id: str, subscription_id: str) -> str:
    """Unsubscribe one subscription by id. Returns "unsubscribed" or "not_found"."""
    response = requests.put(
        f"{BEEHIIV_API}/publications/{publication_id}/subscriptions/{quote(subscription_id, safe='')}",
        headers=_headers(api_key),
        json={"unsubscribe": True},
        timeout=TIMEOUT_SECONDS,
    )
    if response.status_code == 404:
        return "not_found"
    if not response.ok:
        raise BeehiivError(f"Beehiiv unsubscribe returned HTTP {response.status_code}")
    return "unsubscribed"


def find_subscription_id(api_key: str, publication_id: str, email: str) -> str | None:
    """Subscription id for an address, or None when Beehiiv has no such subscription."""
    response = requests.get(
        f"{BEEHIIV_API}/publications/{publication_id}/subscriptions/by_email/{quote(email, safe='')}",
        headers=_headers(api_key),
        timeout=TIMEOUT_SECONDS,
    )
    if response.status_code == 404:
        return None
    if not response.ok:
        raise BeehiivError(f"Beehiiv subscription lookup returned HTTP {response.status_code}")
    return (response.json().get("data") or {}).get("id")
