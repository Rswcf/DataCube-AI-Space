"""
Newsletter sender service.

Fetches daily content from PostgreSQL, builds HTML email,
retrieves subscribers from Beehiiv, and sends via Resend.

Design based on best practices from TLDR, Morning Brew, Superhuman AI:
- Table-based layout for email client compatibility
- Single-column 600px max-width
- WCAG AA compliant colors
- Dark header/footer bookends for brand identity
- Section-colored left-border accents
- Vertical video cards with large thumbnails
- No content limits — shows all items from each collection
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
from app.services.i18n_utils import get_field, SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)

SITE_URL = "https://www.datacubeai.space"

# ---------------------------------------------------------------------------
# Design tokens (WCAG AA compliant)
# ---------------------------------------------------------------------------

# Brand accents (decorative borders only)
ACCENT_TECH = "#2563eb"
ACCENT_INVEST = "#d97706"
ACCENT_TIPS = "#059669"
ACCENT_VIDEO = "#e8533f"

# Darkened variants for text (pass WCAG AA 4.5:1 on white)
TEXT_TECH = "#1d4ed8"
TEXT_INVEST = "#b45309"
TEXT_TIPS = "#047857"
TEXT_VIDEO = "#c7382a"

# Section background tints
BG_TECH = "#eff6ff"
BG_INVEST = "#fffbeb"
BG_TIPS = "#ecfdf5"
BG_VIDEO = "#fef2f2"

# Neutral palette
BG_DARK = "#1a1a2e"
TEXT_HEADLINE = "#111827"
TEXT_BODY = "#1f2937"
TEXT_META = "#6b7280"
BORDER_DIVIDER = "#e5e7eb"
LINK_COLOR = "#1d4ed8"

# Typography
FONT_SERIF = "Georgia, 'Times New Roman', Times, serif"
FONT_SANS = (
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', "
    "Roboto, 'Helvetica Neue', Arial, sans-serif"
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


def _divider() -> str:
    """Section divider — 1px gray line with vertical spacing."""
    return f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="border-top:1px solid {BORDER_DIVIDER};font-size:0;line-height:0;" height="1">&nbsp;</td></tr>
          </table>
        </td>
      </tr>
    </table>"""


def _section_header(label: str, accent: str, text_color: str, bg_tint: str) -> str:
    """Section header with left-border accent and tinted background."""
    return f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0 0 12px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background-color:{accent};width:4px;font-size:0;">&nbsp;</td>
              <td style="padding:8px 12px;background-color:{bg_tint};font-family:{FONT_SANS};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:{text_color};">
                {label}
              </td>
            </tr>
          </table>
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
    for h in highlights:
        bullets += f"""
        <tr>
          <td style="padding:0 0 4px 0;font-family:{FONT_SANS};font-size:14px;line-height:1.5;color:{TEXT_BODY};">
            \u2022 {_esc(h)}
          </td>
        </tr>"""

    return f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:16px 20px;background-color:#f3f4f6;border-radius:8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:0 0 8px 0;font-family:{FONT_SANS};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#4b5563;">
                {_esc(label)}
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
        <td align="center" style="padding:8px;background-color:#f3f4f6;font-family:{FONT_SANS};font-size:12px;color:#6b7280;">
          <a href="{week_url}" style="color:#6b7280;text-decoration:underline;">{_s(lang, "view_in_browser")}</a>
        </td>
      </tr>
    </table>""")

    # ── Dark Header ──────────────────────────────────────────────
    sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background-color:{BG_DARK};padding:24px 24px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-family:{FONT_SERIF};font-size:28px;font-weight:700;color:#ffffff;line-height:1.2;">
                \U0001f9ca Data Cube AI
              </td>
              <td align="right" style="font-family:{FONT_SANS};font-size:13px;color:#9ca3af;line-height:1.4;">
                {_esc(date_label)}
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-top:8px;font-family:{FONT_SANS};font-size:14px;color:#d1d5db;">
                {_esc(tagline)}
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
        {_section_header(_s(lang, "tech_label"), ACCENT_TECH, TEXT_TECH, BG_TECH)}
      </td></tr>
    </table>""")

        for post in tech:
            content = _esc(get_field(post, "content", lang) or "")
            category = _esc(get_field(post, "category", lang) or "")
            impact = _esc(post.impact)

            # Impact dot color
            impact_lower = (post.impact or "").lower()
            if impact_lower == "high":
                dot_color = "#dc2626"
            elif impact_lower == "medium":
                dot_color = "#f59e0b"
            else:
                dot_color = "#22c55e"

            source_link = ""
            if post.source_url:
                source_link = (
                    f' <a href="{_esc(post.source_url)}" '
                    f'style="color:{LINK_COLOR};text-decoration:underline;'
                    f'font-size:13px;">[{_esc(post.source)}]</a>'
                )

            sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0 24px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border-left:4px solid {ACCENT_TECH};">
            <tr>
              <td style="padding:10px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family:{FONT_SANS};font-size:12px;color:{TEXT_META};padding-bottom:4px;">
                      {category}
                      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:{dot_color};vertical-align:middle;margin-left:6px;"></span>
                      <span style="font-size:11px;color:{TEXT_META};vertical-align:middle;margin-left:2px;">{impact}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family:{FONT_SANS};font-size:15px;line-height:1.55;color:{TEXT_BODY};">
                      {content}{source_link}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
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
        {_section_header(_s(lang, "invest_label"), ACCENT_INVEST, TEXT_INVEST, BG_INVEST)}
      </td></tr>
    </table>""")

    # Funding table
    if funding:
        rows = ""
        for p in funding:
            amount = _esc(get_field(p, "amount", lang) or "N/A")
            rows += f"""
              <tr>
                <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-family:{FONT_SANS};font-size:14px;color:{TEXT_BODY};">{_esc(p.company)}</td>
                <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-family:{FONT_SANS};font-size:14px;color:{TEXT_BODY};white-space:nowrap;">{amount}</td>
                <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-family:{FONT_SANS};font-size:14px;color:{TEXT_META};">{_esc(p.round)}</td>
              </tr>"""

        sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0 24px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:0 0 8px 0;font-family:{FONT_SANS};font-size:13px;font-weight:600;color:{TEXT_INVEST};">
                {_esc(_s(lang, "primary_market"))}
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border:1px solid {BORDER_DIVIDER};border-radius:6px;">
            <tr style="background-color:{BG_INVEST};">
              <th style="text-align:left;padding:10px;font-family:{FONT_SANS};font-size:12px;font-weight:700;color:{TEXT_INVEST};border-bottom:2px solid {ACCENT_INVEST};">{_s(lang, "header_company")}</th>
              <th style="text-align:left;padding:10px;font-family:{FONT_SANS};font-size:12px;font-weight:700;color:{TEXT_INVEST};border-bottom:2px solid {ACCENT_INVEST};">{_s(lang, "header_amount")}</th>
              <th style="text-align:left;padding:10px;font-family:{FONT_SANS};font-size:12px;font-weight:700;color:{TEXT_INVEST};border-bottom:2px solid {ACCENT_INVEST};">{_s(lang, "header_round")}</th>
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
              <td style="padding:0 0 8px 0;font-family:{FONT_SANS};font-size:13px;font-weight:600;color:{TEXT_INVEST};">
                M&amp;A
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>""")

        for m in ma:
            content = _esc(get_field(m, "content", lang) or "")
            deal_val = _esc(get_field(m, "deal_value", lang) or "")
            deal_info = f" ({deal_val})" if deal_val else ""
            sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0 24px 10px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border-left:4px solid {ACCENT_INVEST};">
            <tr>
              <td style="padding:8px 16px;font-family:{FONT_SANS};font-size:15px;line-height:1.5;color:{TEXT_BODY};">
                <strong style="color:{TEXT_HEADLINE};">{_esc(m.acquirer)}</strong>
                <span style="color:{TEXT_META};">\u2192</span>
                <strong style="color:{TEXT_HEADLINE};">{_esc(m.target)}</strong>
                <span style="font-size:13px;color:{TEXT_META};">{deal_info}</span>
                <br>
                <span style="font-size:14px;color:{TEXT_BODY};">{content}</span>
              </td>
            </tr>
          </table>
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
        {_section_header(_s(lang, "tips_label"), ACCENT_TIPS, TEXT_TIPS, BG_TIPS)}
      </td></tr>
    </table>""")

        for t in tips:
            content = _esc(get_field(t, "content", lang) or "")
            category = _esc(get_field(t, "category", lang) or "")
            sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0 24px 10px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border-left:4px solid {ACCENT_TIPS};">
            <tr>
              <td style="padding:10px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family:{FONT_SANS};font-size:12px;color:{TEXT_META};padding-bottom:4px;">
                      {category}
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family:{FONT_SANS};font-size:15px;line-height:1.55;color:{TEXT_BODY};">
                      {content}
                    </td>
                  </tr>
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

    # ── Videos Section (vertical card layout) ────────────────────
    videos = data["videos"]
    if videos:
        sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:0 24px;">
        {_section_header(_s(lang, "videos_label"), ACCENT_VIDEO, TEXT_VIDEO, BG_VIDEO)}
      </td></tr>
    </table>""")

        for v in videos:
            content = _esc(get_field(v, "content", lang) or "")
            yt_url = f"https://youtube.com/watch?v={_esc(v.video_id)}"
            thumb = f"https://img.youtube.com/vi/{_esc(v.video_id)}/hqdefault.jpg"
            channel = _esc(getattr(v, "source", "") or "")

            sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0 24px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border:1px solid {BORDER_DIVIDER};border-radius:8px;">
            <tr>
              <td style="padding:0;">
                <a href="{yt_url}" target="_blank" style="text-decoration:none;">
                  <img src="{thumb}"
                       alt="{_esc(content[:60])}"
                       width="552"
                       height="310"
                       style="display:block;width:100%;max-width:552px;height:auto;border:0;border-radius:8px 8px 0 0;" />
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 16px 14px;background-color:#fafafa;border-radius:0 0 8px 8px;">
                <a href="{yt_url}" target="_blank"
                   style="text-decoration:none;color:{TEXT_HEADLINE};font-family:{FONT_SANS};font-size:16px;font-weight:600;line-height:1.35;">
                  {content[:120]}
                </a>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:6px 0 0;font-family:{FONT_SANS};font-size:13px;color:{TEXT_META};line-height:1.4;">
                      <strong style="color:#4b5563;">{channel}</strong>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:10px 0 0;">
                      <a href="{yt_url}" target="_blank"
                         style="font-family:{FONT_SANS};font-size:13px;font-weight:600;color:{TEXT_VIDEO};text-decoration:none;">
                        &#9654; {_s(lang, "watch_label")}
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

    # ── CTA Button ───────────────────────────────────────────────
    cta_text = _s(lang, "cta").format(date=date_label)
    sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:32px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="background-color:{LINK_COLOR};border-radius:8px;">
                <a href="{week_url}" target="_blank"
                   style="display:inline-block;padding:14px 32px;font-family:{FONT_SANS};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                  {cta_text}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>""")

    # ── Dark Footer ──────────────────────────────────────────────
    sections.append(f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background-color:{BG_DARK};padding:24px;text-align:center;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-family:{FONT_SERIF};font-size:18px;color:#ffffff;padding-bottom:8px;">
                \U0001f9ca Data Cube AI
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:12px;">
                <a href="{SITE_URL}" style="font-family:{FONT_SANS};font-size:13px;color:#60a5fa;text-decoration:underline;">datacubeai.space</a>
              </td>
            </tr>
            <tr>
              <td style="font-family:{FONT_SANS};font-size:12px;color:#9ca3af;line-height:1.6;">
                {_esc(_s(lang, "footer_msg"))}
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px;font-family:{FONT_SANS};font-size:12px;color:#9ca3af;">
                Open Source &bull; MIT License
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px;font-family:{FONT_SANS};font-size:12px;color:#9ca3af;">
                Data Cube AI &bull; Frankfurt am Main, Germany
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px;font-family:{FONT_SANS};font-size:12px;">
                <a href="{SITE_URL}/unsubscribe" style="color:#9ca3af;text-decoration:underline;">{_s(lang, "unsubscribe")}</a>
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
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:{FONT_SANS};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!--[if mso]>
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td>
  <![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
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
    """Fetch all active subscribers with language preference from Beehiiv."""
    subscribers: list[dict] = []
    page = 1

    while True:
        resp = requests.get(
            f"https://api.beehiiv.com/v2/publications/{publication_id}/subscriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            params={"status": "active", "limit": 100, "page": page, "expand[]": "custom_fields"},
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
                lang = "de"  # default
                for field in sub.get("custom_fields", []):
                    if field.get("name", "").lower() == "language":
                        lang = field.get("value", "de")
                subscribers.append({"email": email, "language": lang})
            else:
                logger.warning(f"Subscriber without email: {sub.get('id', 'unknown')}")

        # Check pagination
        total_pages = data.get("total_pages", 1)
        if page >= total_pages:
            break
        page += 1

    return subscribers


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
    failed = 0
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
            result = resend.Batch.send(emails)
            logger.info(f"Resend batch {i // batch_size + 1} result: {result}")
            sent += len(batch)
        except Exception as e:
            logger.error(f"Resend batch error for {[addr for addr in batch]}: {e}", exc_info=True)
            failed += len(batch)

    if failed:
        logger.warning(f"Failed to send {failed} emails across batches")
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
        week = db.query(Week).filter(Week.id == period_id).first()
        if not week:
            period_id = current_day_id()
            if not db.query(Week).filter(Week.id == period_id).first():
                logger.warning("No recent period found, skipping newsletter")
                return
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

    # Group subscribers by language preference (8 languages supported)
    by_lang: dict[str, list[str]] = {lang: [] for lang in SUPPORTED_LANGUAGES}
    for sub in subscribers:
        lang = sub["language"] if sub["language"] in SUPPORTED_LANGUAGES else "de"
        by_lang[lang].append(sub["email"])

    lang_counts = {lang: len(addrs) for lang, addrs in by_lang.items() if addrs}
    logger.info(f"Language split: {lang_counts}")

    # Build and send per language (only to subscribers who chose that language)
    total_sent = 0
    for lang, addrs in by_lang.items():
        if not addrs:
            continue

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

        sent = _send_via_resend(
            settings.newsletter_from_email,
            subject,
            html_content,
            addrs,
        )
        total_sent += sent
        logger.info(f"Sent {lang.upper()} newsletter: {sent} emails")

    logger.info(
        f"Newsletter complete: {total_sent} total emails sent for {period_id}"
    )
