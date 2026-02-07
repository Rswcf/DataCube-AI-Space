#!/usr/bin/env python3
"""
Upload local JSON data to the Railway API.
"""

import json
import os
import argparse
import requests
from pathlib import Path


def upload_week_data(
    api_url: str,
    api_key: str,
    week_id: str,
    data_path: Path,
):
    """Upload a week's data to the API."""
    week_path = data_path / week_id

    if not week_path.exists():
        print(f"Week path not found: {week_path}")
        return False

    # Load all JSON files
    payload = {"week_id": week_id}

    tech_file = week_path / "tech.json"
    if tech_file.exists():
        with open(tech_file) as f:
            payload["tech_data"] = json.load(f)
        print(f"  Loaded tech.json")

    investment_file = week_path / "investment.json"
    if investment_file.exists():
        with open(investment_file) as f:
            payload["investment_data"] = json.load(f)
        print(f"  Loaded investment.json")

    tips_file = week_path / "tips.json"
    if tips_file.exists():
        with open(tips_file) as f:
            payload["tips_data"] = json.load(f)
        print(f"  Loaded tips.json")

    trends_file = week_path / "trends.json"
    if trends_file.exists():
        with open(trends_file) as f:
            payload["trends_data"] = json.load(f)
        print(f"  Loaded trends.json")

    # Upload to API
    url = f"{api_url}/admin/import-week?week_id={week_id}"
    headers = {
        "X-API-Key": api_key,
        "Content-Type": "application/json",
    }

    print(f"  Uploading to {url}...")
    response = requests.post(url, json=payload, headers=headers, timeout=60)

    if response.status_code == 200:
        result = response.json()
        print(f"  Success: {result}")
        return True
    else:
        print(f"  Error {response.status_code}: {response.text}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Upload week data to Railway API")
    parser.add_argument("--api-url", default="https://api-production-3ee5.up.railway.app/api")
    parser.add_argument("--api-key", default=os.environ.get("ADMIN_API_KEY", ""), help="Admin API key")
    parser.add_argument("--data-path", default="../ai-information-hub/public/data")
    parser.add_argument("--week", help="Specific week to upload (e.g., 2026-kw05)")
    parser.add_argument("--all", action="store_true", help="Upload all weeks")
    args = parser.parse_args()

    data_path = Path(args.data_path)
    if not data_path.exists():
        print(f"Data path not found: {data_path}")
        return

    if args.week:
        weeks = [args.week]
    elif args.all:
        weeks = [d.name for d in data_path.iterdir() if d.is_dir() and d.name.startswith("20")]
    else:
        print("Please specify --week or --all")
        return

    print(f"Uploading {len(weeks)} week(s) to {args.api_url}")

    for week_id in sorted(weeks):
        print(f"\nProcessing {week_id}...")
        upload_week_data(args.api_url, args.api_key, week_id, data_path)


if __name__ == "__main__":
    main()
