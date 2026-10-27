"""Identified, robots-aware HTTP access. No identity changes or access bypasses."""

import threading
import time
from urllib.parse import urlsplit, urljoin
from urllib.robotparser import RobotFileParser

import requests

from app.config import get_settings

_cache = {}
_lock = threading.Lock()
_arxiv_lock = threading.Lock()
_arxiv_last_request = 0.0


class SourceAccessError(RuntimeError):
    pass


def _get(url, **kwargs):
    """arXiv's RSS terms require one connection and >=3s between requests."""
    global _arxiv_last_request
    host = urlsplit(url).hostname or ""
    if host != "arxiv.org" and not host.endswith(".arxiv.org"):
        return requests.get(url, **kwargs)
    with _arxiv_lock:
        time.sleep(max(0, 3 - (time.monotonic() - _arxiv_last_request)))
        try:
            return requests.get(url, **kwargs)
        finally:
            _arxiv_last_request = time.monotonic()


def robots_allowed(url: str, timeout: float = 10) -> bool:
    u = urlsplit(url)
    if u.scheme not in {"https", "http"} or not u.hostname or u.username:
        return False
    origin = f"{u.scheme}://{u.netloc}"
    ua = get_settings().rss_user_agent
    with _lock:
        saved = _cache.get((origin, ua))
    if not saved or time.monotonic() - saved[0] > 21600:
        r = _get(origin + "/robots.txt", headers={"User-Agent": ua}, timeout=timeout)
        if r.status_code == 404:
            parser = None
        elif r.status_code == 200:
            parser = RobotFileParser()
            parser.parse(r.text.splitlines())
        else:
            raise SourceAccessError(f"robots unavailable: HTTP {r.status_code}")
        saved = (time.monotonic(), parser)
        with _lock:
            _cache[(origin, ua)] = saved
    return saved[1] is None or saved[1].can_fetch(ua, url)


def fetch_source(url: str, timeout: float = 20):
    for _ in range(4):
        if not robots_allowed(url, min(timeout, 10)):
            raise SourceAccessError("robots disallows this URL")
        r = _get(url, headers={"User-Agent": get_settings().rss_user_agent},
                         timeout=timeout, allow_redirects=False)
        if r.status_code in {301, 302, 303, 307, 308}:
            url = urljoin(url, r.headers.get("Location", ""))
            continue
        r.raise_for_status()
        return r
    raise SourceAccessError("Too many redirects")
