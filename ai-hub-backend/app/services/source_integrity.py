"""Bind generated prose to retained source identities and select bounded inputs."""

import hashlib
import math
import re
from collections import Counter
from datetime import timezone
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from zoneinfo import ZoneInfo

from dateutil.parser import parse
from bs4 import BeautifulSoup


def canonical_url(value: str) -> str:
    try:
        u = urlsplit(value or "")
        if u.scheme not in {"http", "https"} or not u.hostname or u.username:
            return ""
        host = u.hostname.lower().removeprefix("www.")
        path = u.path.rstrip("/")
        if host == "reddit.com":
            match = re.search(r"/comments/([a-z0-9]{6,9})(?:/|$)", path, re.I)
            if match:
                path = "/comments/" + match[1].lower()
        query = urlencode(sorted((k, v) for k, v in parse_qsl(u.query)
                                 if not k.lower().startswith("utm_") and k not in {"fbclid", "gclid"}))
        return urlunsplit(("https", host, path, query, ""))
    except ValueError:
        return ""


def source_datetime(value: str):
    try:
        dt = parse(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except (ValueError, TypeError, OverflowError):
        return None


def source_date(value: str, zone: str = "Europe/Berlin") -> str | None:
    dt = source_datetime(value)
    return dt.astimezone(ZoneInfo(zone)).date().isoformat() if dt else None


def source_key(article: dict) -> str:
    return hashlib.sha256(canonical_url(article.get("link", "")).encode()).hexdigest()[:16]


def select_inputs(articles: list[dict], limit: int) -> list[dict]:
    """Rank first, then round-robin publisher families; fixed prompt size stays fixed.

    Prefer diverse sources in the first pass. Fill unused capacity afterward so
    quiet days do not lose relevant news merely to meet an arbitrary quota.
    """
    unique = {}
    def rank(a):
        dt = source_datetime(a.get("published"))
        return (-float(a.get("relevance") or 0), -(dt.timestamp() if dt else 0),
                canonical_url(a.get("link", "")), a.get("title", ""))
    for a in sorted(articles, key=rank):
        key = canonical_url(a.get("link", ""))
        if key:
            unique.setdefault(key, a)
    ranked = list(unique.values())
    counts = Counter()
    selected, deferred = [], []
    family_cap = max(1, math.ceil(limit / 4))
    for a in ranked:
        family = urlsplit(canonical_url(a["link"])).hostname
        if counts[family] < family_cap:
            selected.append(a)
            counts[family] += 1
        else:
            deferred.append(a)
    return (selected[:limit] + deferred[:max(0, limit - len(selected))])[:limit]


def bind_tips(items: list, sources: list[dict], count: int, zone: str) -> list[dict]:
    by_id = {source_key(a): a for a in sources}
    seen, result = set(), []
    for item in items:
        if not isinstance(item, dict):
            continue
        key = item.get("source_item_id")
        source = by_id.get(key) if isinstance(key, str) else None
        date = source_date(source.get("published"), zone) if source else None
        if not source or key in seen or not date or not item.get("content") or not item.get("tip"):
            continue
        seen.add(key)
        # The model never controls link, source name, platform or date.
        item = dict(item)
        item.update(sourceUrl=source["link"], source=source["source"], timestamp=date,
                    platform="Reddit" if "reddit.com" in canonical_url(source["link"]) else "Blog",
                    id=len(result) + 1, difficulty=item.get("difficulty") or "Intermediate",
                    metrics={"sourceStatus": "input_verified", "sourceKey": key, "dateBasis": "source"})
        result.append(item)
        if len(result) >= count:
            break
    return result


def evidence_text(value: str) -> str:
    """Remove feed markup before applying text budgets; retain code text."""
    return BeautifulSoup(value or "", "html.parser").get_text("\n", strip=True)
