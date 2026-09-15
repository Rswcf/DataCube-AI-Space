"""Tests for scripts/page_snapshot.py."""

import tempfile
import unittest
from pathlib import Path

from scripts.page_snapshot import capture, compare, html_snapshot, read_paths, text_snapshot

PAGE = """<!DOCTYPE html><html lang="en"><head>
<title>AI News | Acme</title>
<meta charset="utf-8"/>
<meta name="description" content="Curated AI news."/>
<meta property="og:title" content="AI News | Acme"/>
<link rel="canonical" href="https://acme.example/en"/>
<link rel="alternate" hreflang="de" href="https://acme.example/de"/>
<link rel="stylesheet" href="/app.css"/>
<script type="application/ld+json">{"name":"Acme","@type":"Organization"}</script>
<style>.x{color:red}</style>
</head><body><nav>Menu</nav><main><h1>AI News</h1><p>First <b>story</b>.</p><script>var hidden = 1</script></main></body></html>"""


class HtmlSnapshotTest(unittest.TestCase):
    def test_keeps_what_readers_and_crawlers_see(self):
        snapshot = html_snapshot(PAGE)
        self.assertEqual(snapshot["title"], "AI News | Acme")
        self.assertEqual(snapshot["meta"], {"description": "Curated AI news.", "og:title": "AI News | Acme"})
        self.assertEqual(snapshot["links"], ["alternate de https://acme.example/de", "canonical https://acme.example/en"])
        self.assertEqual(snapshot["jsonLd"], ['{"@type": "Organization", "name": "Acme"}'])
        self.assertEqual(snapshot["text"], ["Menu", "AI News", "First", "story", "."])

    def test_keeps_text_outside_main_such_as_sidebars_and_footers(self):
        html = "<html><body><aside>Made by Ada</aside><main><p>Story</p></main><footer>© Acme</footer></body></html>"
        self.assertEqual(html_snapshot(html)["text"], ["Made by Ada", "Story", "© Acme"])


class TextSnapshotTest(unittest.TestCase):
    def test_keeps_lines_and_masks_timestamps(self):
        self.assertEqual(text_snapshot("generated: 2026-09-15T17:09:36.123Z\nok")["text"], ["generated: <timestamp>", "ok"])


class CaptureAndCompareTest(unittest.TestCase):
    def test_capture_follows_the_content_type_and_compare_reports_changed_paths_only(self):
        pages = {
            "https://acme.example/a": (200, "text/html; charset=utf-8", "<html><head><title>A</title></head><body><main>One</main></body></html>"),
            "https://acme.example/robots.txt": (200, "text/plain", "User-Agent: *\nAllow: /"),
        }
        before = capture("https://acme.example/", ["/a", "/robots.txt"], fetcher=lambda url: pages[url])
        self.assertEqual(before["/a"]["title"], "A")
        self.assertEqual(before["/a"]["status"], 200)
        self.assertEqual(before["/robots.txt"]["text"], ["User-Agent: *", "Allow: /"])

        pages["https://acme.example/a"] = (200, "text/html", "<html><head><title>B</title></head><body><main>One</main></body></html>")
        after = capture("https://acme.example", ["/a", "/robots.txt"], fetcher=lambda url: pages[url])
        report = "\n".join(compare(before, after))
        self.assertIn("=== /a", report)
        self.assertIn('-  "title": "A"', report)
        self.assertIn('+  "title": "B"', report)
        self.assertNotIn("/robots.txt", report)
        self.assertEqual(compare(before, before), [])


class ReadPathsTest(unittest.TestCase):
    def test_skips_blank_lines_and_comments(self):
        with tempfile.TemporaryDirectory() as tmp:
            path_file = Path(tmp) / "paths.txt"
            path_file.write_text("# comment\n/en\n\n/about\n", encoding="utf-8")
            self.assertEqual(read_paths(str(path_file)), ["/en", "/about"])


if __name__ == "__main__":
    unittest.main()
