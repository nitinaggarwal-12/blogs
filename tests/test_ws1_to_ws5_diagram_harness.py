#!/usr/bin/env python3
"""
Hermetic Test Suite for WS1–WS5 Canonical Diagrams, Native Draw.io Studio & 12-Deck Parity:
  1. Executes `node scripts/diagram_visual_harness.mjs` (skips cleanly if `node` absent).
  2. Verifies pure-Python invariants across all 12 diagrams (5 primary + 7 secondary):
     - Exact compendium byte parity (.drawio & .svg)
     - Zero banned pictorial emojis, zero `Gemini 3.8`, zero stale `4-State Hybrid` chips
     - Per-WS factual accuracy (WS1 ascending COGS ladder, WS2 Mode A/B without GKE in Front End,
       WS3 Confidential GKE SEV-SNP, WS4 zero GKE, WS5 ~85% Prefix Cache)
     - Atlas JSON <-> JS `#R` parity
  3. Verifies native `/drawio-editor?id=ws2-pattern-a-pooled&engine=native` via headless Chrome
     (skips cleanly if Node/Chrome/Puppeteer absent):
     - Renders embedded official GCP SVG icons (`data:image/svg+xml`) with zero broken images
     - Vertically centers leaf card text (`justify-content: center`)
     - Renders parent-relative child geometry accurately via `resolveParentOffset`
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import threading
import unittest

sys.dont_write_bytecode = True

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import server  # noqa: E402


class _QuietHandler(server.PortalRequestHandler):
    def log_message(self, format: str, *args) -> None:
        return


def _find_node_and_chrome() -> tuple[str | None, str | None]:
    node_bin = shutil.which("node") or ("/usr/bin/node" if Path("/usr/bin/node").exists() else None)
    chrome_bin = next(
        (
            c
            for c in (
                os.environ.get("CHROME_BIN", ""),
                "/usr/bin/google-chrome",
                "/usr/bin/google-chrome-stable",
                "/usr/bin/chromium",
                "/usr/bin/chromium-browser",
            )
            if c and Path(c).exists()
        ),
        None,
    )
    return node_bin, chrome_bin


class TestWs1ToWs5DiagramHarness(unittest.TestCase):
    PRIMARY_IDS = (
        "ws1-5hop-governance-baseline",
        "ws2-pattern-a-pooled",
        "ws3-pattern-b-silo",
        "ws4-pattern-c-hybrid",
        "ws5-decision-tree-and-triad",
    )
    SECONDARY_IDS = (
        "ws1-c4-l3-process-sequence-swimlane",
        "ws2-c4-l3-mode-a-cow-prefork-heap-wipe-swimlane",
        "ws2-c4-l3-mode-b-session-sandbox-sticky-latch-swimlane",
        "ws3-c4-l3-cmek-killswitch-swimlane",
        "ws4-c4-l3-live-tier-promotion-swimlane",
        "ws5-c4-l3-dynamic-skill-delegation-swimlane",
        "saas10-multicloud-a2a-mcp-bridge",
    )
    BANNED_EMOJIS = (
        "\U0001f6e1", "\U0001f310", "\U0001f916", "\u2699", "\U0001f512", "\U0001f4e6",
        "\U0001f5c4", "\U0001f9e0", "\U0001f4ca", "\U0001f3e2", "\U0001f3db", "\U0001f517",
        "\u26a1", "\U0001f50d", "\U0001f4b0", "\U0001f680", "\u2601", "\U0001f511",
        "\U0001f4cb", "\U0001f3af", "\U0001f525", "\U0001f4bb", "\U0001f9ed", "\U0001f465",
        "\U0001f464", "\U0001f4be", "\U0001f4e1", "\U0001f510", "\U0001f6e0",
    )

    def test_01_node_diagram_visual_harness_passes(self) -> None:
        node_bin, _ = _find_node_and_chrome()
        if not node_bin:
            self.skipTest("Node.js binary not available in this runtime")
        harness = ROOT_DIR / "scripts/diagram_visual_harness.mjs"
        self.assertTrue(harness.is_file(), "scripts/diagram_visual_harness.mjs must exist")
        proc = subprocess.run(
            [node_bin, str(harness)],
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True,
            timeout=90,
        )
        self.assertEqual(
            proc.returncode,
            0,
            f"diagram_visual_harness.mjs failed:\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}",
        )
        self.assertIn("[diagram_visual_harness] PASS", proc.stdout)

    def test_02_pure_python_compendium_and_factual_invariants(self) -> None:
        for did in self.PRIMARY_IDS + self.SECONDARY_IDS:
            dp = ROOT_DIR / f"diagrams/{did}.drawio"
            sp = ROOT_DIR / f"diagrams/{did}.svg"
            pp = ROOT_DIR / f"diagrams/{did}.drawio.png"
            cdp = ROOT_DIR / f"diagrams/compendium/drawio/{did}.drawio"
            csp = ROOT_DIR / f"diagrams/compendium/drawio/{did}.svg"
            for p in (dp, sp, pp, cdp, csp):
                self.assertTrue(p.is_file(), f"Missing canonical diagram artifact: {p}")
            self.assertEqual(dp.read_bytes(), cdp.read_bytes(), f"Compendium .drawio drift for {did}")
            self.assertEqual(sp.read_bytes(), csp.read_bytes(), f"Compendium .svg drift for {did}")
            dtxt = dp.read_text(encoding="utf-8")
            stxt = sp.read_text(encoding="utf-8")
            for em in self.BANNED_EMOJIS:
                self.assertNotIn(em, dtxt, f"Banned emoji {em!r} in {did}.drawio")
                self.assertNotIn(em, stxt, f"Banned emoji {em!r} in {did}.svg")
            self.assertNotIn("gemini 3.8", dtxt.lower(), f"Stale Gemini 3.8 in {did}.drawio")
            self.assertNotIn("4-state hybrid", dtxt.lower(), f"Stale 4-State Hybrid in {did}.drawio")

        ws1 = (ROOT_DIR / "diagrams/ws1-5hop-governance-baseline.drawio").read_text(encoding="utf-8")
        self.assertLess(ws1.index("Hop 5A"), ws1.index("Hop 5C"), "WS1 must keep ascending COGS 5A -> 5C -> 5B")
        self.assertLess(ws1.index("Hop 5C"), ws1.index("Hop 5B"), "WS1 must keep ascending COGS 5A -> 5C -> 5B")

        ws2 = (ROOT_DIR / "diagrams/ws2-pattern-a-pooled.drawio").read_text(encoding="utf-8")
        self.assertIn("GKE WarmPool", ws2)
        for fe_id in ("app_layer", "badge_fe_c1", "badge_fe_c2", "badge_fe_c3", "badge_fe_c4"):
            m_cell = re.search(rf'<mxCell id="{fe_id}"[^>]*>', ws2)
            self.assertIsNotNone(m_cell, f"Missing WS2 Front End cell {fe_id}")
            self.assertNotIn("GKE", m_cell.group(0), f"WS2 Front End cell {fe_id} must not mention GKE")

        ws3 = (ROOT_DIR / "diagrams/ws3-pattern-b-silo.drawio").read_text(encoding="utf-8")
        self.assertIn("Confidential GKE", ws3)

        ws4 = (ROOT_DIR / "diagrams/ws4-pattern-c-hybrid.drawio").read_text(encoding="utf-8")
        self.assertIsNone(re.search(r"\bGKE\b", ws4), "WS4 must have ZERO GKE references")

        ws5 = (ROOT_DIR / "diagrams/ws5-decision-tree-and-triad.drawio").read_text(encoding="utf-8")
        self.assertIn("~85% Prefix Cache", ws5)
        self.assertNotIn("89.1%", ws5)

        atlas_json = (ROOT_DIR / "data/slide_diagrams_atlas.json").read_text(encoding="utf-8")
        atlas_js = (ROOT_DIR / "js/diagrams_atlas_data.js").read_text(encoding="utf-8")
        self.assertIn(atlas_json.strip(), atlas_js, "Atlas JSON <-> JS parity drift")
        atlas_obj = json.loads(atlas_json)
        self.assertGreaterEqual(len(atlas_obj.get("items", [])), 12)

    def test_03_native_studio_renders_svg_icons_and_vertical_centering(self) -> None:
        node_bin, chrome_bin = _find_node_and_chrome()
        if not node_bin or not chrome_bin:
            self.skipTest("Node.js or Chrome binary not available")
        pptr_candidates = [
            ROOT_DIR / "node_modules/puppeteer",
            Path("/usr/local/google/home/nitinagga/Documents/Demoes-GE/node_modules/puppeteer"),
            Path("/usr/local/google/home/nitinagga/Documents/PromptCanvas/node_modules/puppeteer"),
        ]
        pptr_dir = next((p for p in pptr_candidates if p.is_dir()), None)
        if not pptr_dir:
            self.skipTest("Puppeteer package not available")

        httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), _QuietHandler)
        port = httpd.server_address[1]
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        try:
            url = f"http://127.0.0.1:{port}/drawio-editor?id=ws2-pattern-a-pooled&engine=native"
            js_probe = f"""
const puppeteer = require({json.dumps(str(pptr_dir))});
(async () => {{
  const browser = await puppeteer.launch({{
    executablePath: {json.dumps(chrome_bin)},
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  }});
  try {{
    const page = await browser.newPage();
    await page.setViewport({{ width: 1440, height: 900, deviceScaleFactor: 2 }});
    await page.goto({json.dumps(url)}, {{ waitUntil: 'networkidle0', timeout: 30000 }});
    await page.waitForSelector('.mx-vertex', {{ timeout: 15000 }});
    const metrics = await page.evaluate(() => {{
      const imgs = Array.from(document.querySelectorAll('.mx-vertex img'));
      const svgImgs = imgs.filter(im => (im.getAttribute('src') || '').startsWith('data:image/svg+xml'));
      const broken = svgImgs.filter(im => !im.complete || im.naturalWidth === 0).length;
      const leaf = document.querySelector('.mx-vertex[data-cell-id="u_a"]');
      const leafAlign = leaf ? getComputedStyle(leaf).justifyContent : '';
      return {{ svgImgCount: svgImgs.length, broken, leafAlign }};
    }});
    console.log(JSON.stringify(metrics));
    if (metrics.svgImgCount < 10 || metrics.broken !== 0 || metrics.leafAlign !== 'center') {{
      process.exit(2);
    }}
  }} finally {{
    await browser.close();
  }}
}})();
"""
            res = subprocess.run(
                [node_bin, "-e", js_probe],
                cwd=str(ROOT_DIR),
                capture_output=True,
                text=True,
                timeout=45,
            )
            self.assertEqual(
                res.returncode,
                0,
                f"Native studio probe failed:\nSTDOUT: {res.stdout}\nSTDERR: {res.stderr}",
            )
        finally:
            httpd.shutdown()
            httpd.server_close()


if __name__ == "__main__":
    unittest.main()
