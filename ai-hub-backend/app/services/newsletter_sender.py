"""
Newsletter sender service.

Fetches daily content from PostgreSQL, builds HTML email,
retrieves subscribers from Beehiiv, and sends via Resend.

Design based on OpenDesign warm editorial/newsletter craft:
- Table-based layout for email client compatibility
- Single-column 680px max-width
- WCAG AA compliant colors
- Warm paper surfaces with restrained terracotta accents
- Serif-led masthead and numbered editorial rows
- Media-list videos with compact thumbnails
- No content limits — shows all items from each collection
"""

import html
import logging
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import requests
import resend
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.tech import TechPost
from app.models.investment import PrimaryMarketPost, MAPost
from app.models.tip import TipPost
from app.models.week import Week
from app.models.newsletter_send import NewsletterSend
from app.services.period_utils import current_day_id
from app.services.i18n_utils import get_field, SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)

# In-progress rows older than this are considered orphaned (e.g. crashed run)
# and releasable for retry. Must exceed the gap between the two dual-DST cron
# slots (~1h apart) plus a healthy send cycle budget, so a legitimately
# still-running send is NOT reclaimed mid-flight by the second cron slot.
# 6h is deliberately conservative; tighten once we add a heartbeat.
_STALE_IN_PROGRESS_SECONDS = 6 * 3600  # 6 hours

SITE_URL = "https://www.datacubeai.space"

# ---------------------------------------------------------------------------
# Design tokens (WCAG AA compliant)
# ---------------------------------------------------------------------------

# Warm editorial palette adapted from OpenDesign's paper/editorial craft.
ACCENT_BRAND = "#c0512f"
ACCENT_TECH = "#0b5f9f"
ACCENT_INVEST = "#9a5c02"
ACCENT_TIPS = "#2f5b4f"
ACCENT_VIDEO = "#a13d2b"

TEXT_TECH = ACCENT_TECH
TEXT_INVEST = ACCENT_INVEST
TEXT_TIPS = ACCENT_TIPS
TEXT_VIDEO = ACCENT_VIDEO

BG_CANVAS = "#faf7f2"
BG_SURFACE = "#fffdf9"
BG_PANEL = "#f4efe6"
BG_CARD = "#fbf8f1"
BG_PROMO = "#ffef7a"
TEXT_HEADLINE = "#1c1a17"
TEXT_BODY = "#2c2924"
TEXT_META = "#7a726b"
BORDER_DIVIDER = "#e3ded4"
LINK_COLOR = ACCENT_BRAND
EMAIL_CONTAINER_WIDTH = 680

# Typography. Display gets editorial contrast; body remains multilingual-safe.
FONT_DISPLAY = "Georgia, 'Times New Roman', 'Songti SC', 'Hiragino Mincho ProN', serif"
FONT_SANS = (
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', "
    "Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans', "
    "'Microsoft YaHei', 'Noto Sans', sans-serif"
)

# ---------------------------------------------------------------------------
# Localized email strings for all 8 languages
# ---------------------------------------------------------------------------

EMAIL_STRINGS: dict[str, dict[str, str]] = {
    "de": {
        "tagline": "Dein t\u00e4gliches KI-Briefing",
        "view_in_browser": "Im Browser ansehen",
        "tldr_label": "Heute im \u00dcberblick",
        "tech_label": "\U0001f52c TECHNOLOGIE",
        "invest_label": "\U0001f4b0 INVESTMENT",
        "tips_label": "\U0001f4a1 TIPPS",
        "videos_label": "\U0001f3ac VIDEOS",
        "primary_market": "Prim\u00e4rmarkt",
        "header_company": "Unternehmen",
        "header_amount": "Betrag",
        "header_round": "Runde",
        "watch_label": "Auf YouTube ansehen",
        "cta": "Alle News vom {date} lesen \u2192",
        "promo_headline": "Die Signale, die z\u00e4hlen. Die Workflows, die helfen.",
        "footer_msg": "Du erh\u00e4ltst diese E-Mail, weil du den Data Cube AI Newsletter abonniert hast.",
        "unsubscribe": "Abmelden",
        "subject_week": "KI-News KW {num}",
        "subject_daily": "KI-News {date}",
        "week_prefix": "KW",
    },
    "en": {
        "tagline": "Your daily AI briefing",
        "view_in_browser": "View in browser",
        "tldr_label": "Today at a Glance",
        "tech_label": "\U0001f52c TECHNOLOGY",
        "invest_label": "\U0001f4b0 INVESTMENT",
        "tips_label": "\U0001f4a1 TIPS",
        "videos_label": "\U0001f3ac VIDEOS",
        "primary_market": "Primary Market",
        "header_company": "Company",
        "header_amount": "Amount",
        "header_round": "Round",
        "watch_label": "Watch on YouTube",
        "cta": "Read all news from {date} \u2192",
        "promo_headline": "The signals that matter. The workflows you need.",
        "footer_msg": "You received this email because you subscribed to the Data Cube AI newsletter.",
        "unsubscribe": "Unsubscribe",
        "subject_week": "AI News Week {num}",
        "subject_daily": "AI News {date}",
        "week_prefix": "Week",
    },
    "zh": {
        "tagline": "\u6bcf\u65e5AI\u7b80\u62a5",
        "view_in_browser": "\u5728\u6d4f\u89c8\u5668\u4e2d\u67e5\u770b",
        "tldr_label": "\u4eca\u65e5\u6982\u89c8",
        "tech_label": "\U0001f52c \u79d1\u6280",
        "invest_label": "\U0001f4b0 \u6295\u8d44",
        "tips_label": "\U0001f4a1 \u5b9e\u7528\u6280\u5de7",
        "videos_label": "\U0001f3ac \u89c6\u9891",
        "primary_market": "\u4e00\u7ea7\u5e02\u573a",
        "header_company": "\u516c\u53f8",
        "header_amount": "\u91d1\u989d",
        "header_round": "\u8f6e\u6b21",
        "watch_label": "\u5728YouTube\u89c2\u770b",
        "cta": "\u9605\u8bfb{date}\u7684\u6240\u6709\u65b0\u95fb \u2192",
        "promo_headline": "\u91cd\u8981\u7684 AI \u4fe1\u53f7\u3002\u53ef\u7528\u7684\u5de5\u4f5c\u6d41\u3002",
        "footer_msg": "\u60a8\u6536\u5230\u6b64\u90ae\u4ef6\u662f\u56e0\u4e3a\u60a8\u8ba2\u9605\u4e86Data Cube AI\u901a\u8baf\u3002",
        "unsubscribe": "\u53d6\u6d88\u8ba2\u9605",
        "subject_week": "AI\u65b0\u95fb \u7b2c{num}\u5468",
        "subject_daily": "AI\u65b0\u95fb {date}",
        "week_prefix": "\u7b2c{num}\u5468",
    },
    "fr": {
        "tagline": "Votre briefing IA quotidien",
        "view_in_browser": "Voir dans le navigateur",
        "tldr_label": "En bref aujourd'hui",
        "tech_label": "\U0001f52c TECHNOLOGIE",
        "invest_label": "\U0001f4b0 INVESTISSEMENT",
        "tips_label": "\U0001f4a1 ASTUCES",
        "videos_label": "\U0001f3ac VID\u00c9OS",
        "primary_market": "March\u00e9 primaire",
        "header_company": "Entreprise",
        "header_amount": "Montant",
        "header_round": "Tour",
        "watch_label": "Voir sur YouTube",
        "cta": "Lire toutes les actualit\u00e9s du {date} \u2192",
        "promo_headline": "Les signaux qui comptent. Les workflows utiles.",
        "footer_msg": "Vous recevez cet e-mail car vous \u00eates abonn\u00e9(e) \u00e0 la newsletter Data Cube AI.",
        "unsubscribe": "Se d\u00e9sabonner",
        "subject_week": "Actu IA Semaine {num}",
        "subject_daily": "Actu IA {date}",
        "week_prefix": "Sem.",
    },
    "es": {
        "tagline": "Tu resumen diario de IA",
        "view_in_browser": "Ver en el navegador",
        "tldr_label": "Resumen del d\u00eda",
        "tech_label": "\U0001f52c TECNOLOG\u00cdA",
        "invest_label": "\U0001f4b0 INVERSI\u00d3N",
        "tips_label": "\U0001f4a1 CONSEJOS",
        "videos_label": "\U0001f3ac VIDEOS",
        "primary_market": "Mercado primario",
        "header_company": "Empresa",
        "header_amount": "Monto",
        "header_round": "Ronda",
        "watch_label": "Ver en YouTube",
        "cta": "Leer todas las noticias del {date} \u2192",
        "promo_headline": "Las se\u00f1ales que importan. Los flujos que necesitas.",
        "footer_msg": "Recibes este correo porque te suscribiste al bolet\u00edn de Data Cube AI.",
        "unsubscribe": "Cancelar suscripci\u00f3n",
        "subject_week": "Noticias IA Semana {num}",
        "subject_daily": "Noticias IA {date}",
        "week_prefix": "Sem.",
    },
    "pt": {
        "tagline": "Seu resumo di\u00e1rio de IA",
        "view_in_browser": "Ver no navegador",
        "tldr_label": "Resumo do dia",
        "tech_label": "\U0001f52c TECNOLOGIA",
        "invest_label": "\U0001f4b0 INVESTIMENTO",
        "tips_label": "\U0001f4a1 DICAS",
        "videos_label": "\U0001f3ac V\u00cdDEOS",
        "primary_market": "Mercado prim\u00e1rio",
        "header_company": "Empresa",
        "header_amount": "Valor",
        "header_round": "Rodada",
        "watch_label": "Assistir no YouTube",
        "cta": "Ler todas as not\u00edcias de {date} \u2192",
        "promo_headline": "Os sinais que importam. Os fluxos que ajudam.",
        "footer_msg": "Voc\u00ea recebeu este e-mail por estar inscrito na newsletter Data Cube AI.",
        "unsubscribe": "Cancelar inscri\u00e7\u00e3o",
        "subject_week": "Not\u00edcias IA Semana {num}",
        "subject_daily": "Not\u00edcias IA {date}",
        "week_prefix": "Sem.",
    },
    "ja": {
        "tagline": "\u6bce\u65e5\u306eAI\u30d6\u30ea\u30fc\u30d5\u30a3\u30f3\u30b0",
        "view_in_browser": "\u30d6\u30e9\u30a6\u30b6\u3067\u8868\u793a",
        "tldr_label": "\u4eca\u65e5\u306e\u6982\u8981",
        "tech_label": "\U0001f52c \u30c6\u30af\u30ce\u30ed\u30b8\u30fc",
        "invest_label": "\U0001f4b0 \u6295\u8cc7",
        "tips_label": "\U0001f4a1 \u30d2\u30f3\u30c8",
        "videos_label": "\U0001f3ac \u52d5\u753b",
        "primary_market": "\u30d7\u30e9\u30a4\u30de\u30ea\u30fc\u30de\u30fc\u30b1\u30c3\u30c8",
        "header_company": "\u4f1a\u793e",
        "header_amount": "\u91d1\u984d",
        "header_round": "\u30e9\u30a6\u30f3\u30c9",
        "watch_label": "YouTube\u3067\u898b\u308b",
        "cta": "{date}\u306e\u5168\u30cb\u30e5\u30fc\u30b9\u3092\u8aad\u3080 \u2192",
        "promo_headline": "\u91cd\u8981\u306aAI\u30b7\u30b0\u30ca\u30eb\u3002\u4f7f\u3048\u308b\u30ef\u30fc\u30af\u30d5\u30ed\u30fc\u3002",
        "footer_msg": "Data Cube AI\u30cb\u30e5\u30fc\u30b9\u30ec\u30bf\u30fc\u3092\u8cfc\u8aad\u3057\u3066\u3044\u308b\u305f\u3081\u3053\u306e\u30e1\u30fc\u30eb\u304c\u5c4a\u3044\u3066\u3044\u307e\u3059\u3002",
        "unsubscribe": "\u8cfc\u8aad\u89e3\u9664",
        "subject_week": "AI\u30cb\u30e5\u30fc\u30b9 \u7b2c{num}\u9031",
        "subject_daily": "AI\u30cb\u30e5\u30fc\u30b9 {date}",
        "week_prefix": "\u7b2c{num}\u9031",
    },
    "ko": {
        "tagline": "\ub9e4\uc77c AI \ube0c\ub9ac\ud551",
        "view_in_browser": "\ube0c\ub77c\uc6b0\uc800\uc5d0\uc11c \ubcf4\uae30",
        "tldr_label": "\uc624\ub298\uc758 \uc694\uc57d",
        "tech_label": "\U0001f52c \uae30\uc220",
        "invest_label": "\U0001f4b0 \ud22c\uc790",
        "tips_label": "\U0001f4a1 \ud301",
        "videos_label": "\U0001f3ac \ub3d9\uc601\uc0c1",
        "primary_market": "\ud504\ub77c\uc774\uba38\ub9ac \ub9c8\ucf13",
        "header_company": "\ud68c\uc0ac",
        "header_amount": "\uae08\uc561",
        "header_round": "\ub77c\uc6b4\ub4dc",
        "watch_label": "YouTube\uc5d0\uc11c \ubcf4\uae30",
        "cta": "{date} \ubaa8\ub4e0 \ub274\uc2a4 \uc77d\uae30 \u2192",
        "promo_headline": "\uc911\uc694\ud55c AI \uc2e0\ud638. \ubc14\ub85c \uc4f0\ub294 \uc6cc\ud06c\ud50c\ub85c.",
        "footer_msg": "Data Cube AI \ub274\uc2a4\ub808\ud130\ub97c \uad6c\ub3c5\ud558\uc168\uae30 \ub54c\ubb38\uc5d0 \uc774 \uc774\uba54\uc77c\uc744 \ubc1b\uc73c\uc168\uc2b5\ub2c8\ub2e4.",
        "unsubscribe": "\uad6c\ub3c5 \ud574\uc9c0",
        "subject_week": "AI \ub274\uc2a4 {num}\uc8fc\ucc28",
        "subject_daily": "AI \ub274\uc2a4 {date}",
        "week_prefix": "{num}\uc8fc\ucc28",
    },
}


def _s(lang: str, key: str) -> str:
    """Get a localized email string, falling back to English."""
    return EMAIL_STRINGS.get(lang, EMAIL_STRINGS["en"]).get(
        key, EMAIL_STRINGS["en"].get(key, "")
    )


# ---------------------------------------------------------------------------
# 1. Fetch content from database (no limits — show ALL content)
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
        .all()
    )
    videos = (
        db.query(TechPost)
        .filter(TechPost.week_id == period_id, TechPost.is_video == True)  # noqa: E712
        .order_by(TechPost.display_order)
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


def _clean_label(label: str) -> str:
    for marker in ("🔬", "💰", "💡", "🎬"):
        label = label.replace(marker, "")
    return " ".join(label.split())


def _brand_mark(size: int = 36) -> str:
    """Email-safe cube mark built from table cells."""
    cell = max(6, size // 4)
    gap = 2
    colors = [
        ["#1c1a17", "#1c1a17", ACCENT_TECH],
        ["#1c1a17", ACCENT_TIPS, ACCENT_INVEST],
    ]
    rows = ""
    for row in colors:
        cells = ""
        for color in row:
            cells += (
                f'<td width="{cell}" height="{cell}" '
                f'style="width:{cell}px;height:{cell}px;background-color:{color};font-size:0;line-height:0;">&nbsp;</td>'
                f'<td width="{gap}" style="width:{gap}px;font-size:0;line-height:0;">&nbsp;</td>'
            )
        rows += f"<tr>{cells}</tr>"
    return f"""
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
           style="display:inline-table;background-color:{BG_SURFACE};padding:4px;border:1px solid {TEXT_HEADLINE};">
      {rows}
    </table>"""


def _brand_lockup(text_color: str = TEXT_HEADLINE, muted_color: str = TEXT_META, align: str = "left") -> str:
    align_attr = ' align="center"' if align == "center" else ""
    return f"""
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"{align_attr}>
      <tr>
        <td valign="middle" style="padding:0 10px 0 0;">{_brand_mark(34)}</td>
        <td valign="middle" style="font-family:{FONT_SANS};font-size:13px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:{text_color};line-height:1.15;">
          Data Cube AI
          <div style="font-family:{FONT_SANS};font-size:11px;font-weight:600;letter-spacing:0.7px;text-transform:none;color:{muted_color};padding-top:3px;">
            Intelligence memo
          </div>
        </td>
      </tr>
    </table>"""


def _divider() -> str:
    """Section divider with editorial whitespace."""
    return f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:22px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="border-top:1px solid {BORDER_DIVIDER};font-size:0;line-height:0;" height="1">&nbsp;</td></tr>
          </table>
        </td>
      </tr>
    </table>"""


def _section_header(label: str, accent: str, text_color: str) -> str:
    """Editorial section header: label plus rule, no dashboard-card styling."""
    label = _clean_label(label)
    return f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="152" valign="middle" style="padding:0 14px 12px 0;font-family:{FONT_SANS};font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:{text_color};line-height:1.2;white-space:nowrap;">
          {label}
        </td>
        <td valign="middle" style="padding:0 0 12px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="border-top:1px solid {accent};font-size:0;line-height:0;" height="1">&nbsp;</td></tr>
          </table>
        </td>
      </tr>
    </table>"""


def _headline_limit(lang: str) -> int:
    return 36 if lang in {"zh", "ja", "ko"} else 78


def _sentence_case_fragment(text: str) -> str:
    if not text:
        return ""
    return text[0].upper() + text[1:] if text[0].isascii() else text


def _split_headline_deck(text: str, max_headline: int = 78) -> tuple[str, str]:
    """Split summary text into a magazine-style headline and supporting deck."""
    clean = " ".join((text or "").split())
    if not clean:
        return "", ""

    for separator in (": ", " — ", " – ", " - "):
        position = clean.find(separator)
        if 20 <= position <= max_headline:
            return clean[:position].rstrip(" ."), clean[position + len(separator):].strip()

    for separator, include_separator in ((" that ", False), (" to ", True)):
        position = clean.find(separator, 28, max_headline)
        if position > 0:
            if include_separator:
                deck = clean[position + 1:].strip()
                if separator == " to " and " from " in clean[:position].lower():
                    deck = "toward " + clean[position + len(separator):].strip()
            else:
                deck = clean[position + len(separator):].strip()
            return clean[:position].rstrip(" .,-;:"), _sentence_case_fragment(deck)

    for separator in (". ", "? ", "! "):
        position = clean.find(separator)
        if 24 <= position <= max_headline and position + len(separator) < len(clean):
            return clean[:position + 1], clean[position + len(separator):].strip()

    if len(clean) <= max_headline:
        return clean, ""

    cut = -1
    for separator in (",", ";"):
        cut = max(cut, clean.rfind(separator, 35, max_headline))
    if cut > 0:
        return clean[:cut].rstrip(" ,;"), clean[cut + 1:].strip()

    cut = clean.rfind(" ", 45, max_headline)
    if cut == -1:
        cut = max_headline
    return clean[:cut].rstrip(" .,-;:"), clean[cut:].lstrip(" .,-;:")


def _story_row(
    index: int,
    meta: str,
    headline: str,
    deck: str,
    accent: str,
    source_link: str = "",
) -> str:
    deck_block = ""
    if deck or source_link:
        deck_block = f"""
          <div style="padding-top:10px;font-family:{FONT_SANS};font-size:14px;line-height:1.62;color:{TEXT_BODY};">
            {deck}{source_link}
          </div>"""

    return f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="54" valign="top" style="padding:19px 16px 20px 0;border-top:1px solid {BORDER_DIVIDER};font-family:{FONT_DISPLAY};font-size:28px;line-height:1;color:{accent};">
          {index:02d}
        </td>
        <td valign="top" style="padding:17px 0 20px;border-top:1px solid {BORDER_DIVIDER};">
          <div style="font-family:{FONT_SANS};font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:{ACCENT_BRAND};line-height:1.4;padding-bottom:7px;">
            {meta}
          </div>
          <div style="font-family:{FONT_DISPLAY};font-size:23px;line-height:1.22;color:{TEXT_HEADLINE};letter-spacing:-0.2px;padding-bottom:10px;border-bottom:1px solid {BORDER_DIVIDER};">
            {headline}
          </div>
          {deck_block}
        </td>
      </tr>
    </table>"""


def _build_preheader(data: dict, lang: str) -> str:
    """Build hidden preheader text for inbox preview."""
    items = []
    for post in data["tech"][:3]:
        content = get_field(post, "content", lang)
        if content:
            items.append(content[:60].split(".")[0])
    if not items:
        return ""
    preview = " | ".join(items)
    return f"""<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:0;color:#f9fafb;line-height:0;">{_esc(preview)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>"""


def _build_tldr(data: dict, lang: str) -> str:
    """Build a quick TLDR summary of today's highlights."""
    highlights = []
    for post in data["tech"][:3]:
        content = get_field(post, "content", lang)
        if content:
            first_sentence = content.split(".")[0] + "."
            if len(first_sentence) > 80:
                first_sentence = first_sentence[:77] + "..."
            highlights.append(first_sentence)

    if not highlights:
        return ""

    label = _s(lang, "tldr_label")
    bullets = ""
    for idx, h in enumerate(highlights, start=1):
        bullets += f"""
        <tr>
          <td width="28" valign="top" style="padding:0 12px 10px 0;font-family:{FONT_DISPLAY};font-size:18px;line-height:1.1;color:{ACCENT_BRAND};">
            {idx}
          </td>
          <td style="padding:0 0 10px 0;font-family:{FONT_SANS};font-size:15px;line-height:1.6;color:{TEXT_BODY};">
            {_esc(h)}
          </td>
        </tr>"""

    return f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:18px 0 8px;background-color:{BG_SURFACE};border-top:2px solid {TEXT_HEADLINE};border-bottom:1px solid {BORDER_DIVIDER};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td colspan="2" style="padding:0 0 13px 0;font-family:{FONT_SANS};font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:{ACCENT_BRAND};">
                {_esc(_clean_label(label))}
              </td>
            </tr>
            {bullets}
          </table>
        </td>
      </tr>
    </table>"""


def _format_date_label(period_id: str, lang: str) -> str:
    """Format a period ID into a human-readable date label."""
    if "-kw" in period_id:
        week_num = period_id.split("-kw")[1]
        prefix = _s(lang, "week_prefix")
        if "{num}" in prefix:
            return prefix.format(num=week_num)
        return f"{prefix} {week_num}"
    else:
        parts = period_id.split("-")
        if lang == "de":
            return f"{parts[2]}.{parts[1]}.{parts[0]}"
        else:
            d = date(int(parts[0]), int(parts[1]), int(parts[2]))
            return d.strftime("%b %d, %Y")


def _build_email_html(data: dict, lang: str) -> str:
    """Build a professional HTML newsletter email."""
    period_id = data["period_id"]
    week_url = f"{SITE_URL}/{lang}/week/{period_id}"
    date_label = _format_date_label(period_id, lang)

    title = f"{'KI' if lang == 'de' else 'AI'}-News \u2014 {date_label}"
    tagline = _s(lang, "tagline")

    sections: list[str] = []

    # Preheader (hidden inbox preview text)
    sections.append(_build_preheader(data, lang))

    # ── View in Browser ───────────────────────────────────────────
    sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:12px 16px;background-color:{BG_CANVAS};font-family:{FONT_SANS};font-size:12px;color:{TEXT_META};">
          <a href="{week_url}" style="color:{TEXT_META};text-decoration:underline;">{_s(lang, "view_in_browser")}</a>
        </td>
      </tr>
    </table>""")

    # ── Magazine Masthead ────────────────────────────────────────
    sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background-color:{BG_SURFACE};padding:26px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="35%" valign="middle" style="font-family:{FONT_SANS};font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:{TEXT_META};line-height:1.3;">
                AI Intelligence
              </td>
              <td width="30%" align="center" valign="middle">
                {_brand_mark(30)}
              </td>
              <td width="35%" align="right" valign="middle" style="font-family:{FONT_SANS};font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:{TEXT_META};line-height:1.3;">
                {_esc(date_label)}
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding-top:16px;font-family:{FONT_DISPLAY};font-size:48px;font-weight:400;letter-spacing:-1.1px;color:{TEXT_HEADLINE};line-height:0.95;">
                Data Cube AI
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:8px;font-family:{FONT_SANS};font-size:11px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:{TEXT_META};line-height:1.4;">
                The Intelligence Memo
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:10px;font-family:{FONT_DISPLAY};font-size:17px;color:{TEXT_BODY};line-height:1.45;">
                {_esc(tagline)}
              </td>
            </tr>
            <tr>
              <td style="padding-top:24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr><td style="border-top:2px solid {TEXT_HEADLINE};font-size:0;line-height:0;" height="2">&nbsp;</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid {BORDER_DIVIDER};font-family:{FONT_SANS};font-size:10px;font-weight:800;letter-spacing:0.9px;text-transform:uppercase;color:{TEXT_HEADLINE};line-height:1.4;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" width="25%">Technology</td>
                    <td align="center" width="25%">Capital</td>
                    <td align="center" width="25%">Workflows</td>
                    <td align="center" width="25%">Video</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>""")

    # ── TLDR Summary ─────────────────────────────────────────────
    tldr = _build_tldr(data, lang)
    if tldr:
        sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:20px 24px 0;">{tldr}</td></tr>
    </table>""")

    # ── Tech Section ─────────────────────────────────────────────
    tech = data["tech"]
    if tech:
        sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:24px 24px 0;">
        {_section_header(_s(lang, "tech_label"), TEXT_HEADLINE, ACCENT_BRAND)}
      </td></tr>
    </table>""")

        for idx, post in enumerate(tech, start=1):
            raw_content = get_field(post, "content", lang) or ""
            headline, deck = _split_headline_deck(raw_content, _headline_limit(lang))
            category = _esc(get_field(post, "category", lang) or "")
            impact = _esc(post.impact)

            source_link = ""
            if post.source_url:
                source_link = (
                    f' <a href="{_esc(post.source_url)}" '
                    f'style="color:{LINK_COLOR};text-decoration:none;'
                    f'border-bottom:1px solid {ACCENT_BRAND};font-size:13px;">{_esc(post.source)}</a>'
                )

            sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0 24px;">
          {_story_row(
              idx,
              f'{category} &middot; {impact}',
              _esc(headline),
              _esc(deck),
              ACCENT_BRAND,
              source_link,
          )}
        </td>
      </tr>
    </table>""")

    # ── Section Divider ──────────────────────────────────────────
    if tech and (data["funding"] or data["ma"]):
        sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:0 24px;">{_divider()}</td></tr>
    </table>""")

    # ── Investment Section (Funding + M&A) ───────────────────────
    funding = data["funding"]
    ma = data["ma"]
    if funding or ma:
        sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:0 24px;">
        {_section_header(_s(lang, "invest_label"), TEXT_HEADLINE, ACCENT_BRAND)}
      </td></tr>
    </table>""")

    # Funding table
    if funding:
        rows = ""
        for p in funding:
            amount = _esc(get_field(p, "amount", lang) or "N/A")
            rows += f"""
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid {BORDER_DIVIDER};font-family:{FONT_SANS};font-size:14px;font-weight:700;color:{TEXT_HEADLINE};">{_esc(p.company)}</td>
                <td style="padding:12px 10px;border-bottom:1px solid {BORDER_DIVIDER};font-family:{FONT_DISPLAY};font-size:18px;color:{TEXT_HEADLINE};white-space:nowrap;">{amount}</td>
                <td style="padding:12px 0;border-bottom:1px solid {BORDER_DIVIDER};font-family:{FONT_SANS};font-size:13px;color:{TEXT_META};">{_esc(p.round)}</td>
              </tr>"""

        sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0 24px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:0 0 8px 0;font-family:{FONT_SANS};font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:{ACCENT_BRAND};">
                {_esc(_s(lang, "primary_market"))}
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border-top:1px solid {TEXT_HEADLINE};background-color:{BG_SURFACE};">
            <tr>
              <th style="text-align:left;padding:12px 0 8px;font-family:{FONT_SANS};font-size:10px;font-weight:800;letter-spacing:0.9px;text-transform:uppercase;color:{TEXT_META};border-bottom:1px solid {BORDER_DIVIDER};">{_s(lang, "header_company")}</th>
              <th style="text-align:left;padding:12px 10px 8px;font-family:{FONT_SANS};font-size:10px;font-weight:800;letter-spacing:0.9px;text-transform:uppercase;color:{TEXT_META};border-bottom:1px solid {BORDER_DIVIDER};">{_s(lang, "header_amount")}</th>
              <th style="text-align:left;padding:12px 0 8px;font-family:{FONT_SANS};font-size:10px;font-weight:800;letter-spacing:0.9px;text-transform:uppercase;color:{TEXT_META};border-bottom:1px solid {BORDER_DIVIDER};">{_s(lang, "header_round")}</th>
            </tr>
            {rows}
          </table>
        </td>
      </tr>
    </table>""")

    # M&A deals
    if ma:
        sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0 24px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:0 0 8px 0;font-family:{FONT_SANS};font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:{ACCENT_BRAND};">
                M&amp;A
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>""")

        for idx, m in enumerate(ma, start=1):
            content = _esc(get_field(m, "content", lang) or "")
            deal_val = _esc(get_field(m, "deal_value", lang) or "")
            deal_info = f" ({deal_val})" if deal_val else ""
            deal_headline = (
                f'<strong style="color:{TEXT_HEADLINE};">{_esc(m.acquirer)}</strong> '
                f'<span style="color:{TEXT_META};">&rarr;</span> '
                f'<strong style="color:{TEXT_HEADLINE};">{_esc(m.target)}</strong>'
                f'<span style="font-size:13px;color:{TEXT_META};">{deal_info}</span>'
            )
            sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0 24px;">
          {_story_row(idx, "M&amp;A", deal_headline, content, ACCENT_BRAND)}
        </td>
      </tr>
    </table>""")

    # ── Section Divider ──────────────────────────────────────────
    if (funding or ma) and data["tips"]:
        sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:0 24px;">{_divider()}</td></tr>
    </table>""")

    # ── Tips Section ─────────────────────────────────────────────
    tips = data["tips"]
    if tips:
        sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:0 24px;">
        {_section_header(_s(lang, "tips_label"), TEXT_HEADLINE, ACCENT_BRAND)}
      </td></tr>
    </table>""")

        for t in tips:
            raw_content = get_field(t, "content", lang) or ""
            headline, deck = _split_headline_deck(raw_content, _headline_limit(lang))
            category = _esc(get_field(t, "category", lang) or "")
            sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0 24px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background-color:{BG_SURFACE};border-top:1px solid {TEXT_HEADLINE};border-bottom:1px solid {BORDER_DIVIDER};">
            <tr>
              <td style="padding:18px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family:{FONT_SANS};font-size:11px;font-weight:800;letter-spacing:0.9px;text-transform:uppercase;color:{ACCENT_BRAND};padding-bottom:9px;">
                      {category}
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family:{FONT_DISPLAY};font-size:23px;line-height:1.22;color:{TEXT_HEADLINE};letter-spacing:-0.2px;padding-bottom:10px;border-bottom:1px solid {BORDER_DIVIDER};">
                      {_esc(headline)}
                    </td>
                  </tr>
                  {f'<tr><td style="padding-top:10px;font-family:{FONT_SANS};font-size:14px;line-height:1.62;color:{TEXT_BODY};">{_esc(deck)}</td></tr>' if deck else ''}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>""")

    # ── Section Divider ──────────────────────────────────────────
    if tips and data["videos"]:
        sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:0 24px;">{_divider()}</td></tr>
    </table>""")

    # ── Videos Section (editorial media list) ────────────────────
    videos = data["videos"]
    if videos:
        sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:0 24px;">
        {_section_header(_s(lang, "videos_label"), TEXT_HEADLINE, ACCENT_BRAND)}
      </td></tr>
    </table>""")

        for idx, v in enumerate(videos, start=1):
            raw_content = get_field(v, "content", lang) or ""
            headline, deck = _split_headline_deck(raw_content, _headline_limit(lang))
            yt_url = f"https://youtube.com/watch?v={_esc(v.video_id)}"
            thumb = f"https://img.youtube.com/vi/{_esc(v.video_id)}/hqdefault.jpg"
            channel = _esc(getattr(v, "source", "") or "")
            video_deck = f"""
                <div style="padding-top:10px;font-family:{FONT_SANS};font-size:14px;line-height:1.55;color:{TEXT_BODY};">
                  {_esc(deck)}
                </div>""" if deck else ""

            sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0 24px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border-top:1px solid {TEXT_HEADLINE};border-bottom:1px solid {BORDER_DIVIDER};background-color:{BG_SURFACE};">
            <tr>
              <td width="178" valign="top" style="padding:18px 18px 18px 0;">
                <a href="{yt_url}" target="_blank" style="text-decoration:none;">
                  <img src="{thumb}"
                       alt="{_esc(raw_content[:60])}"
                       width="178"
                       style="display:block;width:178px;max-width:178px;height:auto;border:1px solid {BORDER_DIVIDER};" />
                </a>
              </td>
              <td valign="top" style="padding:18px 0 18px;">
                <div style="font-family:{FONT_DISPLAY};font-size:21px;line-height:1;color:{ACCENT_BRAND};padding-bottom:8px;">
                  {idx:02d}
                </div>
                <div style="font-family:{FONT_SANS};font-size:11px;font-weight:800;letter-spacing:0.9px;text-transform:uppercase;color:{ACCENT_BRAND};line-height:1.4;padding-bottom:7px;">
                  {channel}
                </div>
                <a href="{yt_url}" target="_blank"
                   style="display:block;text-decoration:none;color:{TEXT_HEADLINE};font-family:{FONT_DISPLAY};font-size:21px;font-weight:400;line-height:1.22;letter-spacing:-0.2px;padding-bottom:10px;border-bottom:1px solid {BORDER_DIVIDER};">
                  {_esc(headline)}
                </a>
                {video_deck}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:10px 0 0;">
                      <a href="{yt_url}" target="_blank"
                         style="font-family:{FONT_SANS};font-size:13px;font-weight:700;color:{TEXT_HEADLINE};text-decoration:none;border-bottom:1px solid {TEXT_HEADLINE};">
                        {_s(lang, "watch_label")}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>""")

    # ── Magazine Ad CTA ──────────────────────────────────────────
    cta_text = _s(lang, "cta").format(date=date_label)
    sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:34px 24px 40px;border-top:1px solid {BORDER_DIVIDER};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background-color:{BG_PROMO};border:1px solid {TEXT_HEADLINE};">
            <tr>
              <td align="center" style="padding:34px 28px 10px;font-family:{FONT_SANS};font-size:11px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:{TEXT_HEADLINE};">
                Data Cube AI
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 28px 22px;font-family:{FONT_DISPLAY};font-size:30px;font-weight:400;letter-spacing:-0.5px;line-height:1.12;color:{TEXT_HEADLINE};">
                {_esc(_s(lang, "promo_headline"))}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 28px 34px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="background-color:{TEXT_HEADLINE};border-radius:4px;">
                      <a href="{week_url}" target="_blank"
                         style="display:inline-block;padding:13px 24px;font-family:{FONT_SANS};font-size:15px;font-weight:800;color:{BG_SURFACE};text-decoration:none;border-radius:4px;">
                        {cta_text}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>""")

    # ── Editorial Footer ─────────────────────────────────────────
    sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background-color:{BG_SURFACE};padding:28px 32px;border-top:2px solid {TEXT_HEADLINE};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-bottom:14px;">
                {_brand_lockup(TEXT_HEADLINE, TEXT_META)}
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:10px;">
                <a href="{SITE_URL}" style="font-family:{FONT_SANS};font-size:13px;font-weight:700;color:{LINK_COLOR};text-decoration:none;border-bottom:1px solid {ACCENT_BRAND};">datacubeai.space</a>
              </td>
            </tr>
            <tr>
              <td style="font-family:{FONT_SANS};font-size:12px;color:{TEXT_META};line-height:1.6;">
                {_esc(_s(lang, "footer_msg"))}
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px;font-family:{FONT_SANS};font-size:12px;color:{TEXT_META};">
                Open Source &bull; MIT License
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px;font-family:{FONT_SANS};font-size:12px;color:{TEXT_META};">
                Data Cube AI &bull; Frankfurt am Main, Germany
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px;font-family:{FONT_SANS};font-size:12px;">
                <a href="{SITE_URL}/unsubscribe" style="color:{TEXT_META};text-decoration:underline;">{_s(lang, "unsubscribe")}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>""")

    body = "\n".join(sections)

    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>{_esc(title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:{BG_CANVAS};font-family:{FONT_SANS};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!--[if mso]>
  <table role="presentation" width="{EMAIL_CONTAINER_WIDTH}" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td>
  <![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:{EMAIL_CONTAINER_WIDTH}px;margin:0 auto;background-color:{BG_SURFACE};">
    <tr>
      <td>
        {body}
      </td>
    </tr>
  </table>
  <!--[if mso]>
  </td></tr></table>
  <![endif]-->
</body>
</html>"""


# ---------------------------------------------------------------------------
# 3. Fetch subscribers from Beehiiv
# ---------------------------------------------------------------------------

def _fetch_beehiiv_subscribers(api_key: str, publication_id: str) -> list[dict]:
    """Fetch all active subscribers with language preference from Beehiiv.

    Behaviour notes:
      * 401/403 → raise. Silently swallowing auth failures used to surface
        as "no subscribers found" and let the workflow report green
        without ever sending anything.
      * Other 4xx/5xx → raise. Same reason.
      * Default language → ``en``. The previous default was ``de`` which
        meant any sub whose custom field was missing/misnamed was
        silently bucketed into DE; an empty DE-only mailing then made the
        majority of (EN-speaking) subs receive nothing. EN matches the
        site's primary audience and reduces silent misallocation.
      * Unknown language values → bucketed to ``en`` and warned.
      * If NO subscriber on the first page returns any custom_fields,
        log loudly — almost certainly a Beehiiv API misconfig.
    """
    subscribers: list[dict] = []
    page = 1
    saw_any_custom_fields = False
    total_seen = 0

    while True:
        resp = requests.get(
            f"https://api.beehiiv.com/v2/publications/{publication_id}/subscriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            params={"status": "active", "limit": 100, "page": page, "expand[]": "custom_fields"},
            timeout=30,
        )
        if not resp.ok:
            # Used to `break` here, returning [] silently. That made auth
            # errors look like "no subscribers" to upstream — workflow
            # would log success and never send. Now we raise so the
            # admin endpoint surfaces 5xx and the workflow turns red.
            raise RuntimeError(
                f"Beehiiv API error {resp.status_code} on page {page}: "
                f"{resp.text[:300]}"
            )

        data = resp.json()
        subs = data.get("data", [])
        if not subs:
            break

        for sub in subs:
            email = sub.get("email")
            if not email:
                logger.warning(f"Subscriber without email: {sub.get('id', 'unknown')}")
                continue
            total_seen += 1
            raw_lang: str | None = None
            for field in sub.get("custom_fields", []):
                saw_any_custom_fields = True
                if field.get("name", "").lower() == "language":
                    val = field.get("value")
                    if isinstance(val, str) and val.strip():
                        raw_lang = val.strip().lower()
                    break
            if raw_lang is None:
                lang = "en"
            elif raw_lang not in SUPPORTED_LANGUAGES:
                logger.warning(
                    f"Subscriber {email} has unrecognised language '{raw_lang}'; "
                    f"defaulting to 'en'"
                )
                lang = "en"
            else:
                lang = raw_lang
            subscribers.append({"email": email, "language": lang})

        total_pages = data.get("total_pages", 1)
        if page >= total_pages:
            break
        page += 1

    if total_seen > 0 and not saw_any_custom_fields:
        logger.error(
            "Beehiiv returned %d subscribers but ZERO custom_fields entries — "
            "either the publication has no Language custom field or the "
            "expand[]=custom_fields request was stripped. All subs will fall "
            "back to default language. Check Beehiiv dashboard.",
            total_seen,
        )

    return subscribers


# ---------------------------------------------------------------------------
# 4. Send via Resend
# ---------------------------------------------------------------------------

def _send_via_resend(
    from_email: str,
    subject: str,
    html_content: str,
    recipients: list[str],
) -> tuple[int, int]:
    """Send newsletter to all recipients via Resend.

    Returns (sent, failed) so the caller can distinguish partial failures
    (some batches OK, some not) from total failure. Previously returned
    only `sent`, which let partial failures masquerade as full success
    and made the idempotency lock mark the cohort 'sent' even when
    some recipients got nothing.
    """
    sent = 0
    failed = 0
    batch_size = 100  # Resend batch API supports up to 100

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
            result = resend.Batch.send(emails)
            # Resend Batch.send returns {"data": [{"id": "..."}, ...]} on success.
            # Older code blindly bumped `sent += len(batch)` regardless of
            # response shape — if Resend rejected the batch (unverified
            # sender domain, invalid From, etc.) but the SDK chose not to
            # raise, every "send" was counted as a success and nothing
            # actually arrived. Validate the response: an "id" per email
            # is the only proof of acceptance.
            ids: list[str] = []
            if isinstance(result, dict):
                payload = result.get("data") or result.get("emails")
                if isinstance(payload, list):
                    ids = [item.get("id") for item in payload if isinstance(item, dict) and item.get("id")]
                elif result.get("id"):  # single-email shape, just in case
                    ids = [result["id"]]

            if ids:
                sent += len(ids)
                # If the API accepted fewer than we sent, count the rest as failed.
                if len(ids) < len(batch):
                    short = len(batch) - len(ids)
                    failed += short
                    logger.error(
                        f"Resend batch {i // batch_size + 1}: only {len(ids)}/{len(batch)} "
                        f"emails accepted; {short} silently rejected. result={result}"
                    )
                else:
                    logger.info(
                        f"Resend batch {i // batch_size + 1}: {len(ids)}/{len(batch)} accepted"
                    )
            else:
                # No ids in response = total batch rejection (most commonly
                # 4xx that the SDK didn't raise on, e.g. unverified domain).
                failed += len(batch)
                logger.error(
                    f"Resend batch {i // batch_size + 1}: ZERO ids in response — "
                    f"treating all {len(batch)} as failed. result={result!r}"
                )
        except Exception as e:
            logger.error(
                f"Resend batch error for {batch}: {e}", exc_info=True
            )
            failed += len(batch)

    if failed:
        logger.warning(f"Resend partial failure: {failed}/{len(recipients)} emails failed")
    return sent, failed


# ---------------------------------------------------------------------------
# 5. Idempotency helpers (NewsletterSend lock)
# ---------------------------------------------------------------------------


def _acquire_send_lock(db: Session, period_id: str, language: str) -> bool:
    """Try to claim the send slot for (period_id, language). Race-safe.

    Returns True if the caller should proceed to send, False if another
    run already owns this slot.

    Implementation:
      1. INSERT ... ON CONFLICT DO NOTHING RETURNING — atomic first-writer-wins.
         If RETURNING yields a row, we created it and own the slot.
      2. If no row was returned, a row already existed. Re-SELECT with
         FOR UPDATE to serialize concurrent readers, then inspect state:
         - 'sent': return False (duplicate protection).
         - 'in_progress' fresh: return False (another worker holds it).
         - 'in_progress' stale (> _STALE_IN_PROGRESS_SECONDS): reclaim.
         - 'failed': reclaim for retry.
    """
    now = datetime.utcnow()

    # Step 1: atomic insert-if-absent with RETURNING to detect insert winner.
    insert_stmt = (
        pg_insert(NewsletterSend)
        .values(
            period_id=period_id,
            language=language,
            status="in_progress",
            started_at=now,
        )
        .on_conflict_do_nothing(index_elements=["period_id", "language"])
        .returning(NewsletterSend.period_id)
    )
    result = db.execute(insert_stmt).first()
    db.commit()
    if result is not None:
        # We inserted — we own the lock.
        return True

    # Step 2: row existed; lock it and inspect.
    row = (
        db.query(NewsletterSend)
        .filter(
            NewsletterSend.period_id == period_id,
            NewsletterSend.language == language,
        )
        .with_for_update()
        .one()
    )

    if row.status == "sent":
        db.commit()  # release FOR UPDATE lock
        return False

    if row.status == "in_progress":
        age = (now - (row.started_at or now)).total_seconds()
        if age < _STALE_IN_PROGRESS_SECONDS:
            db.commit()
            return False
        logger.warning(
            f"Reclaiming stale in_progress lock for {period_id}/{language} "
            f"(age={age:.0f}s)"
        )

    # status == 'failed' or stale 'in_progress' — reclaim.
    row.status = "in_progress"
    row.started_at = now
    row.completed_at = None
    row.error = None
    db.commit()
    return True


def _mark_send_sent(db: Session, period_id: str, language: str, count: int) -> None:
    row = (
        db.query(NewsletterSend)
        .filter(
            NewsletterSend.period_id == period_id,
            NewsletterSend.language == language,
        )
        .first()
    )
    if row is None:
        return
    row.status = "sent"
    row.completed_at = datetime.utcnow()
    row.sent_count = count
    row.error = None
    db.commit()


def _mark_send_failed(db: Session, period_id: str, language: str, error: str) -> None:
    row = (
        db.query(NewsletterSend)
        .filter(
            NewsletterSend.period_id == period_id,
            NewsletterSend.language == language,
        )
        .first()
    )
    if row is None:
        return
    row.status = "failed"
    row.completed_at = datetime.utcnow()
    row.error = (error or "")[:1000]
    db.commit()


# ---------------------------------------------------------------------------
# 6. Main entry point
# ---------------------------------------------------------------------------

def send_newsletter(db: Session, period_id: str | None = None) -> dict:
    """Send daily newsletter for a specific period.

    Returns a dict so the HTTP endpoint can surface real success/failure
    to upstream callers (workflow, monitoring). Old signature returned
    None, which made every call look like success regardless of how many
    emails actually went out.

    Returns:
        {
            "period_id": str,
            "status": "sent" | "no_subscribers" | "no_content" | "skipped" | "no_period",
            "total_sent": int,
            "total_failed": int,
            "lang_breakdown": {lang: {"sent": int, "failed": int, "attempted": int}},
            "skipped_already_sent": int,
        }
    """
    settings = get_settings()

    if not settings.resend_api_key:
        raise ValueError("RESEND_API_KEY not configured")
    if not settings.beehiiv_api_key:
        raise ValueError("BEEHIIV_API_KEY not configured")
    if not settings.beehiiv_publication_id:
        raise ValueError("BEEHIIV_PUBLICATION_ID not configured")

    # Configure Resend
    resend.api_key = settings.resend_api_key

    # Default to yesterday in the configured app timezone (Berlin), not UTC.
    # A UTC-based date.today() can land on the wrong day when the cron fires
    # late evening UTC (= early morning Berlin) and "yesterday" then points
    # to the day before the one we actually want.
    def _empty_result(status: str) -> dict:
        return {
            "period_id": period_id,
            "status": status,
            "total_sent": 0,
            "total_failed": 0,
            "lang_breakdown": {},
            "skipped_already_sent": 0,
        }

    if not period_id:
        tz = ZoneInfo(settings.app_timezone)
        yesterday = (datetime.now(tz) - timedelta(days=1)).date()
        period_id = yesterday.strftime("%Y-%m-%d")
        week = db.query(Week).filter(Week.id == period_id).first()
        if not week:
            period_id = current_day_id()
            if not db.query(Week).filter(Week.id == period_id).first():
                logger.warning("No recent period found, skipping newsletter")
                return _empty_result("no_period")
            logger.info(f"Yesterday not found, using {period_id}")

    logger.info(f"Building newsletter for period {period_id}")

    # Fetch content
    data = _fetch_period_content(db, period_id)

    # Check there's actual content (count ALL section types)
    total_items = (
        len(data["tech"]) + len(data["funding"]) + len(data["tips"])
        + len(data.get("ma", [])) + len(data.get("videos", []))
    )
    if total_items == 0:
        logger.warning(f"No content for {period_id}, skipping newsletter")
        return _empty_result("no_content")

    # Fetch subscribers — raises on Beehiiv API errors so caller surfaces 5xx
    subscribers = _fetch_beehiiv_subscribers(
        settings.beehiiv_api_key, settings.beehiiv_publication_id
    )
    if not subscribers:
        logger.warning("No active subscribers found, skipping")
        return _empty_result("no_subscribers")

    logger.info(f"Sending to {len(subscribers)} subscriber(s)")

    # Group subscribers by language preference (8 languages supported).
    # Subs with unrecognised language already coerced to "en" in
    # _fetch_beehiiv_subscribers; this assertion is just belt-and-braces.
    by_lang: dict[str, list[str]] = {lang: [] for lang in SUPPORTED_LANGUAGES}
    for sub in subscribers:
        lang = sub["language"] if sub["language"] in SUPPORTED_LANGUAGES else "en"
        by_lang[lang].append(sub["email"])

    lang_counts = {lang: len(addrs) for lang, addrs in by_lang.items() if addrs}
    logger.info(f"Language split: {lang_counts}")

    # Build and send per language (only to subscribers who chose that language).
    # Each (period_id, lang) slot is guarded by the NewsletterSend lock to
    # prevent duplicates on manual re-runs, dual cron fires, or workflow retries.
    total_sent = 0
    total_failed = 0
    skipped_already_sent = 0
    lang_breakdown: dict[str, dict[str, int]] = {}
    for lang, addrs in by_lang.items():
        if not addrs:
            continue

        if not _acquire_send_lock(db, period_id, lang):
            logger.info(
                f"Skip {lang.upper()} newsletter for {period_id}: already sent "
                f"or another worker holds the lock"
            )
            skipped_already_sent += 1
            continue

        try:
            html_content = _build_email_html(data, lang)

            # Build subject line with lead story preview
            lead_preview = ""
            if data["tech"]:
                first_content = get_field(data["tech"][0], "content", lang)
                if first_content:
                    first_sentence = first_content.split(".")[0]
                    if len(first_sentence) > 30:
                        first_sentence = first_sentence[:27] + "..."
                    lead_preview = f": {first_sentence}"

            if "-kw" in period_id:
                week_num = period_id.split("-kw")[1]
                subject = _s(lang, "subject_week").format(num=week_num)
            else:
                date_label = _format_date_label(period_id, lang)
                subject = _s(lang, "subject_daily").format(date=date_label)

            subject = f"\U0001f9ca {subject}{lead_preview}"

            sent, failed = _send_via_resend(
                settings.newsletter_from_email,
                subject,
                html_content,
                addrs,
            )
            lang_breakdown[lang] = {"sent": sent, "failed": failed, "attempted": len(addrs)}
            if sent == 0 and failed > 0:
                # Total failure: leave the lock in 'failed' so the next
                # workflow run can retry this cohort.
                _mark_send_failed(
                    db, period_id, lang,
                    f"All {failed} emails failed via Resend",
                )
                logger.error(
                    f"{lang.upper()} newsletter total failure for {period_id}: "
                    f"{failed}/{len(addrs)} emails failed"
                )
                total_failed += failed
            else:
                # All-success OR partial success: mark 'sent' to avoid the
                # next retry re-sending to already-delivered recipients.
                # Partial failures are logged loudly in _send_via_resend.
                # (Proper fix requires per-recipient tracking; deferred.)
                _mark_send_sent(db, period_id, lang, sent)
                total_sent += sent
                total_failed += failed
                if failed > 0:
                    logger.warning(
                        f"{lang.upper()} newsletter partial success for {period_id}: "
                        f"{sent} sent, {failed} failed — NOT retrying failed cohort "
                        f"to avoid duplicate sends to the {sent} that succeeded"
                    )
                else:
                    logger.info(f"Sent {lang.upper()} newsletter: {sent} emails")
        except Exception as e:
            _mark_send_failed(db, period_id, lang, str(e))
            lang_breakdown[lang] = {"sent": 0, "failed": len(addrs), "attempted": len(addrs)}
            total_failed += len(addrs)
            logger.exception(f"Failed to send {lang.upper()} newsletter for {period_id}: {e}")
            # Continue with other languages rather than aborting the whole run.
            continue

    logger.info(
        f"Newsletter complete: {total_sent} sent, {total_failed} failed for {period_id} "
        f"(skipped {skipped_already_sent} already-sent language cohorts)"
    )

    # Status reflects whether any email actually went out. Workflow keys on
    # this via the HTTP layer to decide red/green.
    if total_sent == 0 and total_failed > 0:
        status = "all_failed"
    elif total_sent == 0 and skipped_already_sent > 0:
        status = "skipped"  # all cohorts were already sent
    elif total_failed > 0:
        status = "partial"
    elif total_sent > 0:
        status = "sent"
    else:
        status = "skipped"

    return {
        "period_id": period_id,
        "status": status,
        "total_sent": total_sent,
        "total_failed": total_failed,
        "lang_breakdown": lang_breakdown,
        "skipped_already_sent": skipped_already_sent,
    }
