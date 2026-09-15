"""Every newsletter edition carries the AI label near the top, in the subscriber's language (spec AD7)."""

import html

import pytest

import app.services.newsletter_sender as sender
from app.config import Settings, get_settings
from newsletter_fixtures import LANGS, period_data

# The plan's "AI label copy" table: label and link text.
EXPECTED = {
    "en": ("AI-generated: summaries written by AI from the linked sources.", "How we use AI"),
    "de": ("KI-generiert: Die Zusammenfassungen schreibt eine KI auf Grundlage der verlinkten Quellen.", "So nutzen wir KI"),
    "zh": ("AI 生成：摘要由 AI 根据所链接的来源撰写。", "我们如何使用 AI"),
    "fr": ("Généré par IA : résumés rédigés par une IA à partir des sources citées.", "Notre usage de l'IA"),
    "es": ("Generado por IA: resúmenes redactados por IA a partir de las fuentes enlazadas.", "Cómo usamos la IA"),
    "pt": ("Gerado por IA: resumos escritos por IA a partir das fontes indicadas.", "Como usamos a IA"),
    "ja": ("AI生成：要約はリンク先の情報源をもとにAIが作成しています。", "AIの利用について"),
    "ko": ("AI 생성: 요약은 링크된 출처를 바탕으로 AI가 작성했습니다.", "AI 활용 방식"),
}


@pytest.mark.parametrize("lang", LANGS)
def test_label_copy_matches_the_plan(lang):
    assert (sender.EMAIL_STRINGS[lang]["ai_label"], sender.EMAIL_STRINGS[lang]["ai_label_link"]) == EXPECTED[lang]


@pytest.mark.parametrize("lang", LANGS)
def test_label_sits_above_the_first_summary_and_links_the_disclosure(lang):
    rendered = sender._build_email_html(period_data(), lang)
    label = html.escape(EXPECTED[lang][0])
    first_summary_block = html.escape(sender._clean_label(sender._s(lang, "tldr_label")))

    assert label in rendered
    assert rendered.index(label) < rendered.index(first_summary_block)
    assert f'href="{get_settings().site_url}/ai-disclosure"' in rendered
    assert html.escape(EXPECTED[lang][1]) in rendered


def test_founder_line_renders_only_when_a_founder_name_is_set(monkeypatch):
    assert "Made by" not in sender._build_email_html(period_data(), "en")

    monkeypatch.setattr(sender, "get_settings", lambda: Settings(_env_file=None, founder_name="Jane Doe"))

    assert "Made by Jane Doe" in sender._build_email_html(period_data(), "en")
