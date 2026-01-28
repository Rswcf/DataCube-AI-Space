#!/usr/bin/env python3
"""
AI Weekly Content Regenerator

Regenerates content for a specific week/section with human feedback.
Uses cached raw RSS data to avoid re-fetching.

Usage:
    # Regenerate a single article
    python scripts/regenerate.py --week 2025-kw04 --section tech --id 3 \
        --feedback "Too technical, use simpler language"

    # Regenerate an entire section
    python scripts/regenerate.py --week 2025-kw04 --section investment \
        --feedback "Remove secondary market data, only keep funding and M&A"

    # Regenerate all sections
    python scripts/regenerate.py --week 2025-kw04 --all \
        --feedback "More casual newsletter style"

    # Parse from GitHub PR comment
    python scripts/regenerate.py --from-comment "/regenerate tech --feedback 'simplify'"

Environment:
    OPENROUTER_API_KEY  - Required
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
PUBLIC_DATA = PROJECT_ROOT / "public" / "data"
CACHE_DIR = SCRIPT_DIR / ".cache"


def get_llm_client():
    """Create OpenAI client pointing to OpenRouter."""
    from openai import OpenAI

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("Error: OPENROUTER_API_KEY environment variable not set.")
        sys.exit(1)

    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )


def load_cached_raw(week_id: str) -> dict:
    """Load cached raw RSS data for a week.

    Prefers classified.json (from two-stage pipeline) over raw.json,
    since classified data has better section assignments.
    """
    classified_file = CACHE_DIR / week_id / "classified.json"
    raw_file = CACHE_DIR / week_id / "raw.json"

    if classified_file.exists():
        with open(classified_file, "r") as f:
            return json.load(f)

    if raw_file.exists():
        with open(raw_file, "r") as f:
            return json.load(f)

    print(f"Error: No cached data found for {week_id}")
    print(f"Expected at: {classified_file} or {raw_file}")
    print("Run collect.py first to fetch and cache RSS data.")
    sys.exit(1)


def load_existing(week_id: str, section: str) -> dict:
    """Load existing generated JSON for a section."""
    filepath = PUBLIC_DATA / week_id / f"{section}.json"
    if not filepath.exists():
        print(f"Error: No existing data found at {filepath}")
        sys.exit(1)

    with open(filepath, "r") as f:
        return json.load(f)


def regenerate_section(client, section: str, raw_articles: list[dict], existing_data: dict, feedback: str, article_id: int | None = None) -> dict:
    """Regenerate content for a section with feedback."""

    existing_json = json.dumps(existing_data, indent=2, ensure_ascii=False)
    articles_text = "\n\n".join(
        f"Source: {a.get('source', 'Unknown')}\nTitle: {a['title']}\nSummary: {a['summary'][:500]}"
        for a in raw_articles[:20]
    )

    if article_id is not None:
        target = f"article with id {article_id}"
    else:
        target = "the entire section"

    prompt = f"""You are regenerating content for an AI weekly newsletter.

SECTION: {section}
TARGET: {target}

HUMAN FEEDBACK:
{feedback}

ORIGINAL RAW ARTICLES:
{articles_text}

CURRENT GENERATED CONTENT:
{existing_json}

Please regenerate the content based on the human feedback.
{"Only modify the article with id " + str(article_id) + ", keep all others unchanged." if article_id else "Regenerate all articles in this section."}

Output the complete JSON in the same structure as the current generated content.
Apply the feedback to improve the content.
Output ONLY valid JSON, no markdown fences."""

    response = client.chat.completions.create(
        model="deepseek/deepseek-v3.2",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    try:
        return json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        text = response.choices[0].message.content
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        print("Error: Could not parse LLM response as JSON")
        sys.exit(1)


def parse_comment(comment: str) -> dict:
    """Parse a GitHub PR comment into arguments.

    Formats:
        /regenerate tech --feedback "simplify language"
        /regenerate investment 3 --feedback "not relevant"
        /regenerate all --feedback "more casual"
    """
    # Remove /regenerate prefix
    text = comment.strip()
    if text.startswith("/regenerate"):
        text = text[len("/regenerate"):].strip()

    result = {"section": None, "id": None, "feedback": "", "all": False}

    # Extract --feedback
    feedback_match = re.search(r'--feedback\s+["\'](.+?)["\']', text)
    if feedback_match:
        result["feedback"] = feedback_match.group(1)
        text = text[: feedback_match.start()].strip()

    parts = text.split()
    if parts:
        if parts[0] == "all":
            result["all"] = True
        else:
            result["section"] = parts[0]
            if len(parts) > 1 and parts[1].isdigit():
                result["id"] = int(parts[1])

    return result


def main():
    parser = argparse.ArgumentParser(description="AI Weekly Content Regenerator")
    parser.add_argument("--week", type=str, help="Week ID (e.g., 2025-kw04)")
    parser.add_argument("--section", type=str, choices=["tech", "investment", "tips"], help="Section to regenerate")
    parser.add_argument("--id", type=int, default=None, help="Specific article ID to regenerate")
    parser.add_argument("--feedback", type=str, default="", help="Human feedback for regeneration")
    parser.add_argument("--all", action="store_true", help="Regenerate all sections")
    parser.add_argument("--from-comment", type=str, default=None, help="Parse from GitHub PR comment")
    args = parser.parse_args()

    # Parse from PR comment if provided
    if args.from_comment:
        parsed = parse_comment(args.from_comment)
        if not args.section:
            args.section = parsed["section"]
        if args.id is None:
            args.id = parsed["id"]
        if not args.feedback:
            args.feedback = parsed["feedback"]
        if not args.all:
            args.all = parsed["all"]

    if not args.week:
        # Try to infer from existing data
        weeks_file = PUBLIC_DATA / "weeks.json"
        if weeks_file.exists():
            with open(weeks_file, "r") as f:
                weeks_data = json.load(f)
            current = next((w for w in weeks_data["weeks"] if w.get("current")), None)
            if current:
                args.week = current["id"]

    if not args.week:
        print("Error: --week is required")
        sys.exit(1)

    if not args.feedback:
        print("Error: --feedback is required")
        sys.exit(1)

    if not args.all and not args.section:
        print("Error: --section or --all is required")
        sys.exit(1)

    # Load cached raw data
    raw_data = load_cached_raw(args.week)

    client = get_llm_client()

    sections = ["tech", "investment", "tips"] if args.all else [args.section]

    for section in sections:
        print(f"\nRegenerating {section}...")
        raw_articles = raw_data.get(section, [])
        existing = load_existing(args.week, section)
        regenerated = regenerate_section(client, section, raw_articles, existing, args.feedback, args.id)

        # Write back
        filepath = PUBLIC_DATA / args.week / f"{section}.json"
        with open(filepath, "w") as f:
            json.dump(regenerated, f, indent=2, ensure_ascii=False)
        print(f"Updated {filepath}")

    print("\nRegeneration complete.")


if __name__ == "__main__":
    main()
