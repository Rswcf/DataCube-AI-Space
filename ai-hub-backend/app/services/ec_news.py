"""Read the Commission's public news index; metadata only, no article crawling."""
from datetime import datetime, timezone
from urllib.parse import urljoin, urlsplit
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup


def parse_ec_news(content: bytes, url: str) -> list[dict]:
    soup = BeautifulSoup(content, "html.parser")
    cards = soup.select("article.ecl-content-item")
    if not cards:
        raise ValueError("Commission news index structure changed")
    result = []
    for card in cards:
        anchor = card.select_one("a[data-ecl-title-link]")
        meta = card.select(".ecl-content-block__primary-meta-item")
        if not anchor or not meta:
            continue
        try:
            day = datetime.strptime(meta[-1].get_text(strip=True), "%d %B %Y")
        except ValueError:
            continue
        link = urljoin(url, anchor.get("href", ""))
        if urlsplit(link).hostname != "digital-strategy.ec.europa.eu":
            continue
        description = card.select_one(".ecl-content-block__description")
        result.append({"title": anchor.get_text(" ", strip=True), "link": link,
                       "summary": description.get_text(" ", strip=True) if description else "",
                       "published": day.replace(tzinfo=ZoneInfo("Europe/Brussels")).astimezone(timezone.utc).replace(tzinfo=None).isoformat()})
    return result
