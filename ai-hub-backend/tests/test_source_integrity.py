import json

import pytest

from app.services.llm_processor import LLMProcessor
from app.services.source_integrity import bind_tips, select_inputs, source_key


def article(i, host="publisher.example", relevance=.5):
    return {"source": host, "title": f"Useful workflow {i}", "summary": 'Run `tool --check` on a copy first.',
            "link": f"https://{host}/story/{i}", "published": "2026-10-26T23:30:00Z", "relevance": relevance}


def test_tip_metadata_comes_from_source_not_model():
    a = article(1)
    out = bind_tips([{"source_item_id": source_key(a), "content": "Use tool", "tip": "Run tool",
                      "sourceUrl": "https://invented.example", "timestamp": "2026-02-01", "platform": "X"}], [a], 5, "Europe/Berlin")
    assert out[0]["sourceUrl"] == a["link"]
    assert out[0]["timestamp"] == "2026-10-27"
    assert out[0]["platform"] == "Blog"
    assert out[0]["source"] == a["source"]


def test_unknown_duplicate_undated_and_empty_tips_are_rejected():
    a, bad = article(1), article(2)
    bad["published"] = "not a date"
    good = {"source_item_id": source_key(a), "content": "A", "tip": "B"}
    out = bind_tips([good, good, {**good, "source_item_id": "invented"},
                     {**good, "source_item_id": source_key(bad)}, {**good, "tip": ""}], [a, bad], 5, "Europe/Berlin")
    assert len(out) == 1


def test_feed_markup_does_not_consume_evidence_budget_or_remove_code_text():
    from app.services.source_integrity import evidence_text
    assert evidence_text('<p>Run <code>tool --path &lt;copy&gt;</code></p>') == "Run\ntool --path <copy>"


def test_high_relevance_tail_is_ranked_before_cap_and_families_are_balanced():
    items = [article(i) for i in range(45)] + [article(99, "research.example", .99)]
    selected = select_inputs(items, 15)
    assert selected[0]["link"] == items[-1]["link"]
    assert len(selected) == 15
    assert select_inputs(list(reversed(items)), 15) == selected


def test_soft_domain_cap_admits_other_publishers_before_filling_spare_capacity():
    dominant = [article(i, relevance=.99) for i in range(20)]
    others = [article(i, f"publisher{i}.example", .7) for i in range(11)]
    selected = select_inputs(dominant + others, 15)
    assert len(selected) == 15
    assert sum(a["source"] == "publisher.example" for a in selected) == 4
    assert len(select_inputs(dominant, 15)) == 15


def test_tips_prompt_preserves_evidence_and_resolves_reference(monkeypatch):
    p = LLMProcessor.__new__(LLMProcessor)
    a = article(1)
    prompts = []
    def call(prompt, **kwargs):
        prompts.append(prompt)
        return json.dumps({"en": [{"source_item_id": source_key(a), "content": "Check first", "tip": "tool --check"}]})
    monkeypatch.setattr(p, "_call_llm", call)
    out = p.process_tips_articles([a], 5)
    assert a["summary"] in prompts[0]
    assert out["en"][0]["sourceUrl"] == a["link"]
    monkeypatch.setattr(p, "_call_llm", lambda *a, **k: '{"en":[{"source_item_id":"fake","content":"x","tip":"y"}]}')
    with pytest.raises(ValueError, match="source identity"):
        p.process_tips_articles([a])


def test_video_prompt_uses_transcript_and_server_rejects_invented_video(monkeypatch):
    p = LLMProcessor.__new__(LLMProcessor)
    v = {"video_id": "known", "original_title": "An AI workflow", "channel_name": "Publisher",
         "view_count_formatted": "20K", "duration_formatted": "5:00", "description": "Useful description of an AI workflow and its limitations.",
         "transcript": "FIRST_HAND_EVIDENCE: test on a copy, do not overwrite production."}
    prompts = []
    def call(prompt, **kw):
        prompts.append(prompt)
        return '{"en":[{"video_id":"known","title":"Workflow","summary":"Use a copy first."},{"video_id":"invented","title":"X","summary":"Y"}]}'
    monkeypatch.setattr(p, "_call_llm", call)
    out = p.process_youtube_videos([v])
    assert "FIRST_HAND_EVIDENCE" in prompts[0]
    assert len(out["en"]) == 1
    assert out["en"][0]["summary"].startswith("Based on a transcript excerpt:")
    v["transcript"] = None
    assert p.process_youtube_videos([v])["en"][0]["summary"].startswith("Based on the publisher's description:")


def test_current_transcript_api_and_unavailability(monkeypatch):
    import youtube_transcript_api
    from app.services.youtube_fetcher import fetch_video_transcript
    from types import SimpleNamespace
    data = SimpleNamespace(to_raw_data=lambda: [{"text": "Verified captions"}])
    transcript = SimpleNamespace(fetch=lambda: data)
    monkeypatch.setattr(youtube_transcript_api, "YouTubeTranscriptApi", lambda **kw: SimpleNamespace(
        list=lambda video_id: SimpleNamespace(find_transcript=lambda languages: transcript)))
    assert fetch_video_transcript("fixture") == "Verified captions"
    monkeypatch.setattr(youtube_transcript_api, "YouTubeTranscriptApi", lambda **kw: SimpleNamespace(
        list=lambda video_id: (_ for _ in ()).throw(RuntimeError("Unavailable"))))
    assert fetch_video_transcript("fixture") is None
