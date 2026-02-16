"""
Newsletter sender service.

Fetches daily content from PostgreSQL, builds HTML email,
retrieves subscribers from Beehiiv, and sends via Resend.
"""

import html
import logging
from datetime import date, timedelta

import requests
import resend
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.tech import TechPost
from app.models.investment import PrimaryMarketPost, MAPost
from app.models.tip import TipPost
from app.models.week import Week
from app.services.period_utils import current_day_id

logger = logging.getLogger(__name__)

SITE_URL = "https://www.datacubeai.space"


# ---------------------------------------------------------------------------
# 1. Fetch content from database
# ---------------------------------------------------------------------------

def _fetch_period_content(db: Session, period_id: str) -> dict:
    """Fetch all content for a period from the database."""
    week = db.query(Week).filter(Week.id == period_id).first()
    if not week:
        raise ValueError(f"Period {period_id} not found in database")

    tech_posts = (
        db.query(TechPost)
        .filter(TechPost.week_id == period_id, TechPost.is_video == False)  # noqa: E712
        .order_by(TechPost.display_order)
        .limit(10)
        .all()
    )
    videos = (
        db.query(TechPost)
        .filter(TechPost.week_id == period_id, TechPost.is_video == True)  # noqa: E712
        .order_by(TechPost.display_order)
        .limit(3)
        .all()
    )
    funding = (
        db.query(PrimaryMarketPost)
        .filter(PrimaryMarketPost.week_id == period_id)
        .all()
    )
    ma_deals = db.query(MAPost).filter(MAPost.week_id == period_id).all()
    tips = (
        db.query(TipPost)
        .filter(TipPost.week_id == period_id)
        .limit(5)
        .all()
    )

    return {
        "period_id": period_id,
        "tech": tech_posts,
        "videos": videos,
        "funding": funding,
        "ma": ma_deals,
        "tips": tips,
    }


# ---------------------------------------------------------------------------
# 2. Build HTML email
# ---------------------------------------------------------------------------

def _esc(text: str) -> str:
    return html.escape(text or "")


def _build_email_html(data: dict, lang: str) -> str:
    """Build a styled HTML email from period content."""
    period_id = data["period_id"]
    week_url = f"{SITE_URL}/{lang}/week/{period_id}"

    # Date label
    if "-kw" in period_id:
        week_num = period_id.split("-kw")[1]
        date_label = f"KW {week_num}" if lang == "de" else f"Week {week_num}"
    else:
        parts = period_id.split("-")
        if lang == "de":
            date_label = f"{parts[2]}.{parts[1]}.{parts[0]}"
        else:
            d = date(int(parts[0]), int(parts[1]), int(parts[2]))
            date_label = d.strftime("%b %d, %Y")

    title = f"KI-News — {date_label}" if lang == "de" else f"AI News — {date_label}"

    sections: list[str] = []

    # Header
    sections.append(f"""
    <div style="text-align:center;padding:32px 0 16px">
      <h1 style="font-family:Georgia,serif;font-size:28px;color:#1a1a2e;margin:0">{_esc(title)}</h1>
      <p style="color:#6b7280;font-size:14px;margin:8px 0 0">
        {'Kuratiert von Data Cube AI' if lang == 'de' else 'Curated by Data Cube AI'}
      </p>
    </div>
    """)

    # Tech
    tech = data["tech"]
    if tech:
        heading = "🔬 Technologie" if lang == "de" else "🔬 Technology"
        sections.append(f'<h2 style="font-family:Georgia,serif;font-size:20px;color:#2563eb;border-bottom:2px solid #2563eb;padding-bottom:6px;margin:24px 0 12px">{heading}</h2>')
        for post in tech:
            content = _esc(getattr(post, f"content_{lang}"))
            category = _esc(getattr(post, f"category_{lang}"))
            impact = _esc(post.impact)
            source_link = f' <a href="{_esc(post.source_url)}" style="color:#2563eb;text-decoration:none">[{_esc(post.source)}]</a>' if post.source_url else ""
            sections.append(f"""
            <div style="margin:0 0 12px;padding:10px 12px;border-left:3px solid #2563eb;background:#f0f7ff">
              <div style="font-size:11px;color:#6b7280;margin-bottom:2px">{category} · {impact}</div>
              <div style="font-size:14px;color:#1a1a2e;line-height:1.5">{content}{source_link}</div>
            </div>
            """)

    # Videos
    videos = data["videos"]
    if videos:
        heading = "🎬 Videos"
        sections.append(f'<h2 style="font-family:Georgia,serif;font-size:20px;color:#e8533f;border-bottom:2px solid #e8533f;padding-bottom:6px;margin:24px 0 12px">{heading}</h2>')
        for v in videos:
            content = _esc(getattr(v, f"content_{lang}"))[:120]
            yt_url = f"https://youtube.com/watch?v={_esc(v.video_id)}"
            thumb = f"https://img.youtube.com/vi/{_esc(v.video_id)}/mqdefault.jpg"
            sections.append(f"""
            <div style="margin:0 0 12px">
              <a href="{yt_url}" style="text-decoration:none;display:flex;gap:12px;align-items:center">
                <img src="{thumb}" width="120" height="68" style="border-radius:6px;object-fit:cover" alt="" />
                <span style="font-size:14px;color:#1a1a2e;line-height:1.4">{content}</span>
              </a>
            </div>
            """)

    # Funding
    funding = data["funding"]
    if funding:
        heading = "💰 Primärmarkt" if lang == "de" else "💰 Primary Market"
        sections.append(f'<h2 style="font-family:Georgia,serif;font-size:20px;color:#d97706;border-bottom:2px solid #d97706;padding-bottom:6px;margin:24px 0 12px">{heading}</h2>')
        sections.append('<table style="width:100%;border-collapse:collapse;font-size:13px">')
        sections.append('<tr style="background:#fffbeb"><th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb">Company</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb">Amount</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb">Round</th></tr>')
        for p in funding[:7]:
            amount = _esc(getattr(p, f"amount_{lang}"))
            sections.append(f'<tr><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">{_esc(p.company)}</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">{amount}</td><td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">{_esc(p.round)}</td></tr>')
        sections.append('</table>')

    # M&A
    ma = data["ma"]
    if ma:
        heading = "🤝 M&A"
        sections.append(f'<h2 style="font-family:Georgia,serif;font-size:20px;color:#d97706;border-bottom:2px solid #d97706;padding-bottom:6px;margin:24px 0 12px">{heading}</h2>')
        for m in ma:
            content = _esc(getattr(m, f"content_{lang}"))
            deal_val = _esc(getattr(m, f"deal_value_{lang}") or "")
            sections.append(f"""
            <div style="margin:0 0 8px;font-size:14px;color:#1a1a2e">
              <strong>{_esc(m.acquirer)}</strong> → {_esc(m.target)}{f' ({deal_val})' if deal_val else ''}: {content}
            </div>
            """)

    # Tips
    tips = data["tips"]
    if tips:
        heading = "💡 Tipps" if lang == "de" else "💡 Tips"
        sections.append(f'<h2 style="font-family:Georgia,serif;font-size:20px;color:#059669;border-bottom:2px solid #059669;padding-bottom:6px;margin:24px 0 12px">{heading}</h2>')
        for t in tips:
            content = _esc(getattr(t, f"content_{lang}"))
            category = _esc(getattr(t, f"category_{lang}"))
            sections.append(f"""
            <div style="margin:0 0 10px;padding:10px 12px;border-left:3px solid #059669;background:#f0fdf4">
              <div style="font-size:11px;color:#6b7280;margin-bottom:2px">{category}</div>
              <div style="font-size:14px;color:#1a1a2e;line-height:1.5">{content}</div>
            </div>
            """)

    # CTA
    cta_text = f"Alle News vom {date_label} lesen →" if lang == "de" else f"Read all news from {date_label} →"
    sections.append(f"""
    <div style="text-align:center;margin:32px 0">
      <a href="{week_url}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">{cta_text}</a>
    </div>
    """)

    # Footer
    sections.append(f"""
    <div style="text-align:center;padding:16px 0;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px">
      <p style="margin:0">Data Cube AI · <a href="{SITE_URL}" style="color:#2563eb;text-decoration:none">datacubeai.space</a></p>
      <p style="margin:4px 0 0">{'Du erhältst diese E-Mail, weil du den Data Cube AI Newsletter abonniert hast.' if lang == 'de' else 'You received this email because you subscribed to the Data Cube AI newsletter.'}</p>
    </div>
    """)

    body = "\n".join(sections)

    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:16px;background:#ffffff">
    {body}
  </div>
</body>
</html>"""


# ---------------------------------------------------------------------------
# 3. Fetch subscribers from Beehiiv
# ---------------------------------------------------------------------------

def _fetch_beehiiv_subscribers(api_key: str, publication_id: str) -> list[str]:
    """Fetch all active subscriber emails from Beehiiv."""
    emails: list[str] = []
    page = 1

    while True:
        resp = requests.get(
            f"https://api.beehiiv.com/v2/publications/{publication_id}/subscriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            params={"status": "active", "limit": 100, "page": page},
            timeout=30,
        )
        if not resp.ok:
            logger.error(f"Beehiiv API error {resp.status_code}: {resp.text}")
            break

        data = resp.json()
        subs = data.get("data", [])
        if not subs:
            break

        for sub in subs:
            email = sub.get("email")
            if email:
                emails.append(email)

        # Check pagination
        total_pages = data.get("total_pages", 1)
        if page >= total_pages:
            break
        page += 1

    return emails


# ---------------------------------------------------------------------------
# 4. Send via Resend
# ---------------------------------------------------------------------------

def _send_via_resend(
    from_email: str,
    subject: str,
    html_content: str,
    recipients: list[str],
) -> int:
    """Send newsletter to all recipients via Resend. Returns count sent."""
    sent = 0
    # Resend batch API supports up to 100 recipients per call
    batch_size = 100

    for i in range(0, len(recipients), batch_size):
        batch = recipients[i : i + batch_size]
        emails = [
            {
                "from": from_email,
                "to": [addr],
                "subject": subject,
                "html": html_content,
            }
            for addr in batch
        ]

        try:
            resend.Batch.send(emails)
            sent += len(batch)
            logger.info(f"Sent batch {i // batch_size + 1}: {len(batch)} emails")
        except Exception as e:
            logger.error(f"Resend batch error: {e}")

    return sent


# ---------------------------------------------------------------------------
# 5. Main entry point
# ---------------------------------------------------------------------------

def send_newsletter(db: Session, period_id: str | None = None):
    """Send daily newsletter for a specific period."""
    settings = get_settings()

    if not settings.resend_api_key:
        raise ValueError("RESEND_API_KEY not configured")
    if not settings.beehiiv_api_key:
        raise ValueError("BEEHIIV_API_KEY not configured")
    if not settings.beehiiv_publication_id:
        raise ValueError("BEEHIIV_PUBLICATION_ID not configured")

    # Configure Resend
    resend.api_key = settings.resend_api_key

    # Default to yesterday (newsletter goes out morning after collection)
    if not period_id:
        yesterday = date.today() - timedelta(days=1)
        period_id = yesterday.strftime("%Y-%m-%d")
        # Check if yesterday's data exists, fall back to current_day_id
        week = db.query(Week).filter(Week.id == period_id).first()
        if not week:
            period_id = current_day_id()
            logger.info(f"Yesterday not found, using {period_id}")

    logger.info(f"Building newsletter for period {period_id}")

    # Fetch content
    data = _fetch_period_content(db, period_id)

    # Check there's actual content
    total_items = len(data["tech"]) + len(data["funding"]) + len(data["tips"])
    if total_items == 0:
        logger.warning(f"No content for {period_id}, skipping newsletter")
        return

    # Fetch subscribers
    subscribers = _fetch_beehiiv_subscribers(
        settings.beehiiv_api_key, settings.beehiiv_publication_id
    )
    if not subscribers:
        logger.warning("No active subscribers found, skipping")
        return

    logger.info(f"Sending to {len(subscribers)} subscriber(s)")

    # Build and send for each language
    total_sent = 0
    for lang in ["de", "en"]:
        html_content = _build_email_html(data, lang)

        if "-kw" in period_id:
            week_num = period_id.split("-kw")[1]
            subject = f"KI-News KW {week_num}" if lang == "de" else f"AI News Week {week_num}"
        else:
            parts = period_id.split("-")
            if lang == "de":
                subject = f"KI-News — {parts[2]}.{parts[1]}.{parts[0]}"
            else:
                d = date(int(parts[0]), int(parts[1]), int(parts[2]))
                subject = f"AI News — {d.strftime('%b %d, %Y')}"

        subject = f"🧊 {subject} | Data Cube AI"

        sent = _send_via_resend(
            settings.newsletter_from_email,
            subject,
            html_content,
            subscribers,
        )
        total_sent += sent
        logger.info(f"Sent {lang.upper()} newsletter: {sent} emails")

    logger.info(f"Newsletter complete: {total_sent} total emails sent for {period_id}")
