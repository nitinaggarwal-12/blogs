"""Regression tests for P2 (P2-01..P2-06) and P3 (P3-01..P3-02) portal consistency fixes."""

from __future__ import annotations

import glob
import os
import re
import unittest
import zipfile

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class TestP2P3PortalConsistency(unittest.TestCase):
    """Static and structural regression checks for all 8 P2 & P3 audit fixes."""

    def test_p3_01_anonymous_feedback_widget_and_api(self) -> None:
        widget_path = os.path.join(REPO_ROOT, "universal_feedback_widget.js")
        with open(widget_path, encoding="utf-8") as fh:
            widget_src = fh.read()

        self.assertNotIn("nitinagga@google.com", widget_src)
        self.assertNotIn("user@google.com", widget_src)
        self.assertNotIn("page=admin-feedback", widget_src)
        self.assertNotIn("'admin-feedback'", widget_src)
        self.assertIn("feedback_admin", widget_src)
        self.assertIn("Escape", widget_src)

        engine_path = os.path.join(REPO_ROOT, "scripts", "unified_feedback_engine.py")
        with open(engine_path, encoding="utf-8") as fh:
            engine_src = fh.read()
        self.assertIn('"recipientEmail": "architecture-portal-team"', engine_src)

        server_path = os.path.join(REPO_ROOT, "server.py")
        with open(server_path, encoding="utf-8") as fh:
            server_src = fh.read()
        self.assertIn("Admin access restricted to authorized portal administrators", server_src)
        self.assertNotIn("Admin access restricted to {resolved_email}", server_src)

    def test_p2_04_drawio_editor_excludes_stub_c4_svgs(self) -> None:
        server_path = os.path.join(REPO_ROOT, "server.py")
        with open(server_path, encoding="utf-8") as fh:
            server_src = fh.read()

        select_match = re.search(
            r'<select id="studio-diag-select"[^>]*>(.*?)</select>',
            server_src,
            re.DOTALL,
        )
        self.assertIsNotNone(select_match, "Expected #studio-diag-select in server.py")
        options = re.findall(r'<option value="([^"]+)"', select_match.group(1))
        self.assertEqual(len(options), 14, f"Expected exactly 14 Draw.io options, got {len(options)}: {options}")
        for opt in options:
            self.assertFalse(
                re.match(r"^ws[1-5]-l[134]-", opt),
                f"Slide-authored C4 stub option must not appear in Draw.io Studio: {opt}",
            )
            drawio_file = os.path.join(REPO_ROOT, "diagrams", f"{opt}.drawio")
            self.assertTrue(os.path.isfile(drawio_file), f"Missing .drawio XML for Studio option: {opt}")

    def test_p2_02_and_p2_03_deck_json_paths_and_slide_preview_parity(self) -> None:
        data_js_path = os.path.join(REPO_ROOT, "js", "data.js")
        with open(data_js_path, encoding="utf-8") as fh:
            data_js = fh.read()

        # Zero corrupted ACT II stripped labels (e.g. "12. I TRANSITION", "13. I (L3 PROCESS)") or duplicated Agentic Triad
        self.assertNotRegex(data_js, r"(?:\.\s+|—\s+|•\s+)I\s+(?:TRANSITION|\(L[134]\b)")
        self.assertNotIn("Agentic Triad Agentic Triad", data_js)
        self.assertNotRegex(data_js, r"\b\d+\s*/\s*31\b")

        deck_jsons = re.findall(r"deckJson:\s*'([^']+)'", data_js)
        self.assertEqual(len(deck_jsons), 6, f"Expected 6 deckJson entries, got {deck_jsons}")
        for rel_path in deck_jsons:
            full_path = os.path.join(REPO_ROOT, rel_path)
            self.assertTrue(os.path.isfile(full_path), f"deckJson file missing on disk: {rel_path}")

        # Verify 21/21 .pptx decks match their slides/previews/<stem>/slide_*.png count
        pptx_files = sorted(glob.glob(os.path.join(REPO_ROOT, "slides", "*.pptx")))
        self.assertGreaterEqual(len(pptx_files), 21)
        for pptx_path in pptx_files:
            stem = os.path.splitext(os.path.basename(pptx_path))[0]
            with zipfile.ZipFile(pptx_path, "r") as zf:
                slide_xmls = [
                    name for name in zf.namelist()
                    if re.match(r"^ppt/slides/slide\d+\.xml$", name)
                ]
            preview_pngs = glob.glob(
                os.path.join(REPO_ROOT, "slides", "previews", stem, "slide_*.png")
            )
            self.assertEqual(
                len(slide_xmls),
                len(preview_pngs),
                f"Preview count mismatch for {stem}: {len(slide_xmls)} slides vs {len(preview_pngs)} PNGs",
            )

    def test_p2_06_and_p3_02_html_css_print_and_attribute_hygiene(self) -> None:
        layout_css_path = os.path.join(REPO_ROOT, "css", "layout.css")
        with open(layout_css_path, encoding="utf-8") as fh:
            layout_css = fh.read()

        for required_print_sel in (
            "#portal-faq-modal",
            "#portal-toast-container",
            ".non-blocking-right-drawer",
            ".ufw-btn-wrap",
            ".ufw-backdrop",
        ):
            self.assertIn(required_print_sel, layout_css)

        html_files = [os.path.join(REPO_ROOT, "index.html")] + sorted(
            glob.glob(os.path.join(REPO_ROOT, "templates", "*.html"))
        )
        for html_path in html_files:
            with open(html_path, encoding="utf-8") as fh:
                content = fh.read()
            rel = os.path.relpath(html_path, REPO_ROOT)
            self.assertIsNone(
                re.search(r"</script>\s*</script>", content, re.IGNORECASE),
                f"Duplicate closing </script> found in {rel}",
            )
            self.assertNotIn(
                "pt-2;",
                content,
                f"Invalid Tailwind token 'pt-2;' inside inline style in {rel}",
            )
            # Check HTML opening tags outside <script> blocks for duplicate class= attributes
            stripped = re.sub(r"<script\b[^>]*>.*?</script>", "", content, flags=re.DOTALL | re.IGNORECASE)
            for tag_match in re.finditer(r"<[a-zA-Z][a-zA-Z0-9:-]*\b[^>]*>", stripped):
                tag_str = tag_match.group(0)
                class_attrs = re.findall(r'\bclass\s*=\s*["\']', tag_str, flags=re.IGNORECASE)
                self.assertLessEqual(
                    len(class_attrs),
                    1,
                    f"Duplicate class= attribute in {rel}: {tag_str[:120]}",
                )


if __name__ == "__main__":
    unittest.main()
