"""Tests for scripts/brand_guard.py."""

import contextlib
import io
import os
import tempfile
import unittest
from pathlib import Path

from scripts.brand_guard import Violation, classify, main, scan_text


class ClassifyTest(unittest.TestCase):
    def test_brand_sources_docs_tests_promo_and_images_are_not_checked_as_code(self):
        self.assertEqual(classify("ai-information-hub/lib/brand-defaults.json"), "brand-source")
        self.assertEqual(classify("ai-information-hub/lib/brand.ts"), "brand-source")
        self.assertEqual(classify("ai-hub-backend/app/config.py"), "brand-source")
        self.assertEqual(classify("scripts/brand_guard.py"), "guard")
        for path in (
            "docs/brand-guidelines.md",
            "README.md",
            "ai-information-hub/CLAUDE.md",
            "LICENSE",
            "promo-video/src/Root.tsx",
            "ai-hub-backend/tests/test_privacy.py",
            "ai-information-hub/lib/newsletter/unsubscribe-token.test.ts",
            "ai-information-hub/test/golden/__goldens__/feed-en.xml",
            "ai-information-hub/public/og-image.svg",
        ):
            self.assertEqual(classify(path), "exempt", path)

    def test_workflows_and_everything_else_are_checked(self):
        self.assertEqual(classify(".github/workflows/daily-collect.yml"), "workflow")
        for path in (
            "ai-information-hub/app/layout.tsx",
            "ai-information-hub/public/llms.txt",
            "ai-hub-backend/app/services/newsletter_sender.py",
            "ai-hub-backend/.env.example",
            "scripts/page_snapshot.py",
        ):
            self.assertEqual(classify(path), "code", path)


class ScanTextTest(unittest.TestCase):
    def test_flags_every_legacy_spelling_in_code(self):
        text = "\n".join([
            "title: 'Data Cube AI'",
            "name: 'DataCube AI'",
            "url: 'https://www.datacubeai.space'",
            "filename=datacube-ai-deals.csv",
            'return "dcai_" + token',
            "id='dcai-takeaways'",
            "const ok = 'Acme News'",
        ])
        violations = scan_text("ai-information-hub/app/page.tsx", text)
        self.assertEqual([v.line for v in violations], [1, 2, 3, 4, 5, 6])
        self.assertEqual(violations[0], Violation("ai-information-hub/app/page.tsx", 1, "title: 'Data Cube AI'"))

    def test_ignores_words_that_merely_contain_the_letters(self):
        self.assertEqual(scan_text("ai-hub-backend/app/x.py", "metadata = cubes\nabcdcai_value = 1"), [])

    def test_never_flags_exempt_or_brand_source_files(self):
        text = "Data Cube AI https://www.datacubeai.space dcai_"
        for path in ("docs/a.md", "ai-hub-backend/tests/test_a.py", "promo-video/src/a.tsx", "ai-information-hub/lib/brand.ts"):
            self.assertEqual(scan_text(path, text), [], path)

    def test_workflows_may_name_the_legacy_site_only_as_the_site_url_fallback(self):
        allowed = "          SITE=\"${{ vars.SITE_URL || 'https://www.datacubeai.space' }}\""
        self.assertEqual(scan_text(".github/workflows/daily-collect.yml", allowed), [])
        hardcoded = '              "host": "www.datacubeai.space",'
        self.assertEqual(len(scan_text(".github/workflows/daily-collect.yml", hardcoded)), 1)


class MainTest(unittest.TestCase):
    def test_prints_violations_and_exits_1_or_exits_0_when_clean(self):
        previous = os.getcwd()
        with tempfile.TemporaryDirectory() as tmp:
            os.chdir(tmp)
            try:
                Path("ai-information-hub/app").mkdir(parents=True)
                Path("ai-information-hub/app/page.tsx").write_text("const a = 1\nconst b = 'Data Cube AI'\n", encoding="utf-8")
                Path("ai-information-hub/app/clean.tsx").write_text("const a = 'Acme'\n", encoding="utf-8")
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    self.assertEqual(main(["ai-information-hub/app/page.tsx", "./ai-information-hub/app/clean.tsx"]), 1)
                self.assertIn("ai-information-hub/app/page.tsx:2: const b = 'Data Cube AI'", output.getvalue())
                with contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(main(["ai-information-hub/app/clean.tsx"]), 0)
            finally:
                os.chdir(previous)


if __name__ == "__main__":
    unittest.main()
