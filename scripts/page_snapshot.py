#!/usr/bin/env python3
"""Capture and compare what readers and crawlers see on a list of site paths (spec AD1 and §9).

    python3 scripts/page_snapshot.py capture --base-url https://www.example.com \
        --paths scripts/page_snapshot_paths.txt --out before.json
    python3 scripts/page_snapshot.py compare before.json after.json

What a snapshot keeps:
- HTML responses: the title, meta tags, canonical and alternate links, JSON-LD blocks, and all
  visible body text, including navigation, sidebars and footers.
- Other responses: their lines, with ISO timestamps masked.

Standard library only.
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
import urllib.error
import urllib.request
from html.parser import HTMLParser
from typing import Callable, Tuple

USER_AGENT = "Mozilla/5.0 (compatible; page-snapshot/1.0)"
ISO_TIMESTAMP = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z")
HIDDEN_TAGS = {"script", "style", "noscript", "template"}

Fetcher = Callable[[str], Tuple[int, str, str]]


class _PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.meta: dict[str, str] = {}
        self.links: list[str] = []
        self.json_ld: list[str] = []
        self.body_text: list[str] = []
        self._in_title = False
        self._json_ld: list[str] | None = None
        self._hidden_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {name: value or "" for name, value in attrs}
        key = attributes.get("name") or attributes.get("property")
        if tag == "title":
            self._in_title = True
        elif tag == "meta" and key:
            self.meta[key] = attributes.get("content", "")
        elif tag == "link" and attributes.get("rel") in ("canonical", "alternate"):
            parts = (attributes.get(name, "") for name in ("rel", "hreflang", "type", "title", "href"))
            self.links.append(" ".join(part for part in parts if part))
        elif tag == "script" and attributes.get("type") == "application/ld+json":
            self._json_ld = []
        if tag in HIDDEN_TAGS:
            self._hidden_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        elif tag == "script" and self._json_ld is not None:
            self.json_ld.append("".join(self._json_ld).strip())
            self._json_ld = None
        if tag in HIDDEN_TAGS and self._hidden_depth:
            self._hidden_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data
            return
        if self._json_ld is not None:
            self._json_ld.append(data)
            return
        text = data.strip()
        if self._hidden_depth or not text:
            return
        self.body_text.append(text)


def _canonical_json(block: str) -> str:
    try:
        return json.dumps(json.loads(block), sort_keys=True, ensure_ascii=False)
    except json.JSONDecodeError:
        return block


def html_snapshot(html: str) -> dict:
    parser = _PageParser()
    parser.feed(html)
    parser.close()
    return {
        "title": parser.title.strip(),
        "meta": dict(sorted(parser.meta.items())),
        "links": sorted(parser.links),
        "jsonLd": [_canonical_json(block) for block in parser.json_ld],
        "text": parser.body_text,
    }


def text_snapshot(body: str) -> dict:
    return {"text": ISO_TIMESTAMP.sub("<timestamp>", body).splitlines()}


def fetch(url: str) -> Tuple[int, str, str]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.status, response.headers.get("Content-Type", ""), response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        return error.code, error.headers.get("Content-Type", ""), error.read().decode("utf-8", "replace")


def capture(base_url: str, paths: list[str], fetcher: Fetcher = fetch) -> dict:
    snapshots = {}
    for path in paths:
        status, content_type, body = fetcher(base_url.rstrip("/") + path)
        snapshot = html_snapshot(body) if "text/html" in content_type else text_snapshot(body)
        snapshots[path] = {"status": status, **snapshot}
    return snapshots


def compare(before: dict, after: dict) -> list[str]:
    report: list[str] = []
    for path in sorted(set(before) | set(after)):
        old = json.dumps(before.get(path), indent=2, sort_keys=True, ensure_ascii=False).splitlines()
        new = json.dumps(after.get(path), indent=2, sort_keys=True, ensure_ascii=False).splitlines()
        if old != new:
            report.append(f"=== {path}")
            report.extend(difflib.unified_diff(old, new, "before", "after", lineterm="", n=1))
    return report


def read_paths(path_file: str) -> list[str]:
    with open(path_file, encoding="utf-8") as handle:
        return [line.strip() for line in handle if line.strip() and not line.lstrip().startswith("#")]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    capture_parser = commands.add_parser("capture", help="snapshot every path under a base URL")
    capture_parser.add_argument("--base-url", required=True)
    capture_parser.add_argument("--paths", required=True, help="file with one site path per line")
    capture_parser.add_argument("--out", required=True)
    compare_parser = commands.add_parser("compare", help="print the differences between two snapshots")
    compare_parser.add_argument("before")
    compare_parser.add_argument("after")
    args = parser.parse_args(argv)

    if args.command == "capture":
        snapshots = capture(args.base_url, read_paths(args.paths))
        with open(args.out, "w", encoding="utf-8") as handle:
            json.dump(snapshots, handle, indent=2, sort_keys=True, ensure_ascii=False)
        print(f"captured {len(snapshots)} paths into {args.out}")
        return 0

    with open(args.before, encoding="utf-8") as before, open(args.after, encoding="utf-8") as after:
        report = compare(json.load(before), json.load(after))
    print("\n".join(report) if report else "no differences")
    return 0


if __name__ == "__main__":
    sys.exit(main())
