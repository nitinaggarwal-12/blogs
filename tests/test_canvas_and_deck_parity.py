#!/usr/bin/env python3
"""
Multi-Plane Parity & /drawio-editor Visual/DOM Geometry Test Suite:
  1. Offline TypeScript compiler gate (`tsc --noEmit -p tsconfig.json`) exits 0.
  2. WS1-WS5 + WS1_EXEC lean visual deck OOXML structural parity (`WS1=8, WS2=7, WS3=6,
     WS4=7, WS5=7, WS1_EXEC=10`), zero `<a:tr h="0">`, strictly positive table row heights,
     and SHA-256 + slideCount + preview PNG freshness lock with `slides/cloud_viewer_manifest.json`.
  3. Multi-viewport headless Chrome Puppeteer verification of `/drawio-editor`
     (Desktop 1440x900, Compact 1024x720, Inline 860x680), verifying:
       - Dynamic `fit` zoom scaling (`compactZoom < desktopZoom`), `#zoom-pct-label` parity,
         and `.canvas-scroll` horizontal fit
       - Manual zoom (`#btn-zoom-in`, `#btn-zoom-out`) and `Fit` restore (`#btn-zoom-fit`)
       - `isCompactBadge` (`h <= 28`) overflow visibility and zero sibling badge collisions
       - `#drawio-edge-svg` `viewBox` sync after diagram switch & window resize
       - Zoom-compensated vertex drag deltas (`delta / currentZoom`)
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import threading
import unittest
import xml.etree.ElementTree as ET
import zipfile

sys.dont_write_bytecode = True

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import server  # noqa: E402


class QuietPortalHandler(server.PortalRequestHandler):
    def log_message(self, format: str, *args) -> None:
        return


def _find_node_and_puppeteer() -> tuple[str | None, str | None]:
    node_bin = "/usr/bin/node" if Path("/usr/bin/node").exists() else None
    chrome_bin = next(
        (
            c
            for c in [
                os.environ.get("CHROME_BIN", ""),
                "/usr/bin/google-chrome",
                "/usr/bin/google-chrome-stable",
                "/usr/bin/chromium",
            ]
            if c and Path(c).exists()
        ),
        None,
    )
    return node_bin, chrome_bin


class TestCanvasAndDeckParity(unittest.TestCase):
    httpd: server.ThreadingHTTPServer
    thread: threading.Thread
    base_url: str

    @classmethod
    def setUpClass(cls) -> None:
        cls.httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), QuietPortalHandler)
        port = cls.httpd.server_address[1]
        cls.base_url = f"http://127.0.0.1:{port}"
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def test_01_typescript_zero_errors(self) -> None:
        local_tsc = ROOT_DIR / "node_modules/.bin/tsc"
        tsc = str(local_tsc) if local_tsc.exists() else "/usr/bin/tsc"
        if not Path(tsc).exists():
            self.fail(f"TypeScript compiler missing at {tsc}")
        tsconfig = ROOT_DIR / "tsconfig.json"
        self.assertTrue(tsconfig.exists(), "blogs/tsconfig.json must exist")
        tsc_cmd = [tsc, "--noEmit", "-p", str(tsconfig)]
        if tsc == "/usr/bin/tsc":
            tsc_cmd.extend(["--ignoreDeprecations", "6.0"])
        proc = subprocess.run(
            tsc_cmd,
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True,
            timeout=60,
        )
        self.assertEqual(
            proc.returncode,
            0,
            f"tsc failed (rc={proc.returncode}):\n{proc.stdout}\n{proc.stderr}",
        )

    def test_02_workstream_lean_deck_ooxml_manifest_and_table_parity(self) -> None:
        manifest_path = ROOT_DIR / "slides/cloud_viewer_manifest.json"
        self.assertTrue(manifest_path.exists(), "slides/cloud_viewer_manifest.json missing")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        slides_map = manifest.get("slides", {})

        lean_decks = [
            ("WS1", "slides/ws1-12slide-visual-deck.pptx", "slides/previews/ws1-12slide-visual-deck", 7),
            ("WS2", "slides/ws2-12slide-visual-deck.pptx", "slides/previews/ws2-12slide-visual-deck", 7),
            ("WS3", "slides/ws3-12slide-visual-deck.pptx", "slides/previews/ws3-12slide-visual-deck", 6),
            ("WS4", "slides/ws4-12slide-visual-deck.pptx", "slides/previews/ws4-12slide-visual-deck", 7),
            ("WS5", "slides/ws5-12slide-visual-deck.pptx", "slides/previews/ws5-12slide-visual-deck", 7),
            ("WS1_EXEC", "slides/ws1-executive-architecture-23slide-deck.pptx", "slides/previews/ws1-executive-architecture-23slide-deck", 10),
            ("WS2_EXEC", "slides/ws2-executive-architecture-10slide-deck.pptx", "slides/previews/ws2-executive-architecture-10slide-deck", 10),
            ("WS3_EXEC", "slides/ws3-executive-architecture-10slide-deck.pptx", "slides/previews/ws3-executive-architecture-10slide-deck", 10),
            ("WS4_EXEC", "slides/ws4-executive-architecture-10slide-deck.pptx", "slides/previews/ws4-executive-architecture-10slide-deck", 10),
            ("WS5_EXEC", "slides/ws5-executive-architecture-10slide-deck.pptx", "slides/previews/ws5-executive-architecture-10slide-deck", 10),
        ]
        ns = {
            "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
            "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
        }
        total_tables_checked = 0

        for key, rel_pptx, rel_preview, expected_n in lean_decks:
            pptx_path = ROOT_DIR / rel_pptx
            self.assertTrue(pptx_path.exists(), f"{pptx_path} missing")
            sha = hashlib.sha256(pptx_path.read_bytes()).hexdigest()
            entry = slides_map.get(key)
            self.assertIsInstance(entry, dict, f"{key} missing in cloud_viewer_manifest.json")
            self.assertEqual(entry.get("sha256"), sha, f"{key} manifest sha256 mismatch")
            self.assertEqual(
                entry.get("slideCount"),
                expected_n,
                f"{key} manifest slideCount != {expected_n}",
            )

            with zipfile.ZipFile(pptx_path) as zf:
                names = zf.namelist()
                slide_xmls = [n for n in names if re.match(r"ppt/slides/slide\d+\.xml$", n)]
                note_xmls = [n for n in names if re.match(r"ppt/notesSlides/notesSlide\d+\.xml$", n)]
                self.assertEqual(len(slide_xmls), expected_n, f"{key} has {len(slide_xmls)} slides != {expected_n}")
                self.assertEqual(len(note_xmls), expected_n, f"{key} has {len(note_xmls)} notes != {expected_n}")
                for sxml in slide_xmls:
                    xml_str = zf.read(sxml).decode("utf-8", "ignore")
                    self.assertNotIn('h="0"', xml_str, f"{key} {sxml} contains auto-collapsing <a:tr h=\"0\">")
                    troot = ET.fromstring(xml_str)
                    snum = int(re.search(r"slide(\d+)\.xml$", sxml).group(1))
                    fracs = []
                    for sp in troot.findall(".//p:sp", ns):
                        off_el = sp.find(".//a:xfrm/a:off", ns)
                        y_emu = int(off_el.attrib.get("y", "0")) if off_el is not None else 0
                        if y_emu < 5800000:
                            continue
                        for t_el in sp.findall(".//a:t", ns):
                            tv = (t_el.text or "").strip()
                            if re.fullmatch(rf"\d+\s*/\s*{expected_n}", tv):
                                fracs.append(tv)
                    valid_footers = {f"{snum} / {expected_n}", f"{snum:02d} / {expected_n}"}
                    for frac in fracs:
                        self.assertIn(
                            frac,
                            valid_footers,
                            f"{key} {sxml} has off-by-one/wrong footer '{frac}' not in {valid_footers}",
                        )
                    if snum == expected_n:
                        self.assertTrue(
                            any(f in valid_footers for f in fracs),
                            f"{key} slide{expected_n}.xml missing final '{expected_n} / {expected_n}' footer (got {fracs})",
                        )
                    trs = troot.findall(".//a:tbl/a:tr", ns)
                    if trs:
                        total_tables_checked += 1
                        for tr in trs:
                            h_val = int(tr.attrib.get("h", "0"))
                            self.assertGreater(h_val, 0, f"Zero-height table row in {key} {sxml}")

            preview_dir = ROOT_DIR / rel_preview
            pptx_mtime = pptx_path.stat().st_mtime
            for snum in range(1, expected_n + 1):
                png_path = preview_dir / f"slide_{snum:02d}.png"
                self.assertTrue(png_path.exists(), f"{key} preview missing: {png_path}")
                self.assertGreaterEqual(
                    png_path.stat().st_mtime + 1.0,
                    pptx_mtime,
                    f"{key} {png_path.name} is stale relative to {pptx_path.name}",
                )

        self.assertGreaterEqual(total_tables_checked, 6, "Expected >= 6 OOXML table slides audited across lean decks")

    def test_03_drawio_editor_multi_viewport_zoom_badges_and_drag_scaling(self) -> None:
        node_bin, chrome_bin = _find_node_and_puppeteer()
        if not node_bin or not chrome_bin:
            self.skipTest("Node or Chrome binary unavailable for headless Puppeteer test")
        pptr_dir = ROOT_DIR / "node_modules/puppeteer-core"
        if not pptr_dir.exists():
            self.fail(f"Self-contained puppeteer-core missing at {pptr_dir}")

        js_script = r"""
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const puppeteer = require(require('path').join(process.cwd(), 'node_modules', 'puppeteer-core'));

const BASE_URL = process.env.TEST_BASE_URL;
const CHROME_PATH = process.env.CHROME_PATH;
const USER_DATA_DIR = process.env.USER_DATA_DIR;

function assert(cond, msg) {
  if (!cond) {
    throw new Error('ASSERTION_FAILED: ' + msg);
  }
}

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: 'new',
  userDataDir: USER_DATA_DIR,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const consoleErrors = [];
const pageErrors = [];

try {
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // 1. Desktop 1440x900
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/drawio-editor?id=ws2-pattern-a-breach-defense-sequence&engine=native`, {
    waitUntil: 'networkidle2',
    timeout: 20000,
  });
  await page.waitForSelector('#drawio-fg-layer .mx-vertex', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 250));

  const desktopState = await page.evaluate(() => {
    const stg = document.getElementById('drawio-stage');
    const scroller = document.querySelector('.canvas-scroll');
    const pct = document.getElementById('zoom-pct-label')?.textContent?.trim() || '';
    const svg = document.getElementById('drawio-edge-svg');
    return {
      zoom: parseFloat(stg?.dataset?.zoom || '0'),
      zoomMode: stg?.dataset?.zoomMode || '',
      pct,
      stgRectW: stg?.getBoundingClientRect().width || 0,
      scrollerW: scroller?.clientWidth || 0,
      viewBox: svg?.getAttribute('viewBox') || '',
      stgStyleW: parseFloat(stg?.style?.width || '0'),
      stgStyleH: parseFloat(stg?.style?.height || '0'),
      vertexCount: document.querySelectorAll('#drawio-fg-layer .mx-vertex').length,
      scriptTagsInVertices: document.querySelectorAll('.mx-vertex script').length,
    };
  });

  assert(desktopState.zoomMode === 'fit', `Expected desktop fit mode, got ${desktopState.zoomMode}`);
  assert(desktopState.zoom >= 0.35 && desktopState.zoom <= 1.25, `Desktop zoom out of range: ${desktopState.zoom}`);
  assert(desktopState.pct === `${Math.round(desktopState.zoom * 100)}%`, `Desktop label mismatch: ${desktopState.pct} vs ${desktopState.zoom}`);
  assert(desktopState.stgRectW <= desktopState.scrollerW + 24, `Desktop stage overflows scroller: ${desktopState.stgRectW} > ${desktopState.scrollerW}`);
  assert(desktopState.viewBox === `0 0 ${desktopState.stgStyleW} ${desktopState.stgStyleH}`, `SVG viewBox mismatch: ${desktopState.viewBox}`);
  assert(desktopState.vertexCount >= 10, `Too few foreground vertices: ${desktopState.vertexCount}`);
  assert(desktopState.scriptTagsInVertices === 0, 'XSS script tag found in vertex');

  // 2. Resize to Compact 1024x720 -> triggers debounced resize fit
  await page.setViewport({ width: 1024, height: 720, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 260));
  const compactState = await page.evaluate(() => {
    const stg = document.getElementById('drawio-stage');
    const scroller = document.querySelector('.canvas-scroll');
    return {
      zoom: parseFloat(stg?.dataset?.zoom || '0'),
      zoomMode: stg?.dataset?.zoomMode || '',
      pct: document.getElementById('zoom-pct-label')?.textContent?.trim() || '',
      stgRectW: stg?.getBoundingClientRect().width || 0,
      scrollerW: scroller?.clientWidth || 0,
    };
  });
  assert(compactState.zoomMode === 'fit', `Compact resize left fit mode: ${compactState.zoomMode}`);
  assert(compactState.zoom < desktopState.zoom, `Compact zoom (${compactState.zoom}) should be < desktop zoom (${desktopState.zoom})`);
  assert(compactState.stgRectW <= compactState.scrollerW + 24, `Compact stage overflows scroller: ${compactState.stgRectW} > ${compactState.scrollerW}`);

  // 3. Manual zoom buttons + Fit button + Diagram Switch + Zoom-compensated vertex drag (on 1024x720 standalone)
  await page.click('#btn-zoom-in');
  await new Promise((r) => setTimeout(r, 80));
  const manualZoom = await page.evaluate(() => {
    const stg = document.getElementById('drawio-stage');
    return { mode: stg?.dataset?.zoomMode, zoom: parseFloat(stg?.dataset?.zoom || '0') };
  });
  assert(manualZoom.mode === 'manual', `Expected manual mode after zoom-in, got ${manualZoom.mode}`);
  assert(manualZoom.zoom > compactState.zoom, `Zoom did not increase after #btn-zoom-in: ${manualZoom.zoom} <= ${compactState.zoom}`);

  await page.click('#btn-zoom-fit');
  await new Promise((r) => setTimeout(r, 80));
  const refitZoom = await page.evaluate(() => {
    const stg = document.getElementById('drawio-stage');
    return { mode: stg?.dataset?.zoomMode, zoom: parseFloat(stg?.dataset?.zoom || '0') };
  });
  assert(refitZoom.mode === 'fit', `Expected fit mode after #btn-zoom-fit, got ${refitZoom.mode}`);
  assert(Math.abs(refitZoom.zoom - compactState.zoom) <= 0.02, `Fit restore mismatch: ${refitZoom.zoom} vs ${compactState.zoom}`);

  // Switch diagram to WS2 Pooled diagram (`ws2-pattern-a-pooled`) and verify viewBox updates + drag scales by 1/zoom
  await page.select('#studio-diag-select', 'ws2-pattern-a-pooled');
  await new Promise((r) => setTimeout(r, 500));
  const dragSetup = await page.evaluate(() => {
    const stg = document.getElementById('drawio-stage');
    const svg = document.getElementById('drawio-edge-svg');
    const zoom = parseFloat(stg?.dataset?.zoom || '1');
    const vertex = Array.from(document.querySelectorAll('#drawio-fg-layer .mx-vertex')).find((el) => {
      const r = el.getBoundingClientRect();
      if (parseFloat(el.style.width || '0') < 60 || parseFloat(el.style.height || '0') < 30) return false;
      if (r.left <= 0 || r.top <= 60 || r.right >= window.innerWidth - 380) return false;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return Boolean(hit && hit.closest('.mx-vertex') === el);
    });
    const rect = vertex?.getBoundingClientRect();
    return {
      zoom,
      viewBox: svg?.getAttribute('viewBox') || '',
      stgW: parseFloat(stg?.style?.width || '0'),
      stgH: parseFloat(stg?.style?.height || '0'),
      cellId: vertex?.dataset?.cellId || '',
      origLeft: parseFloat(vertex?.style?.left || '0'),
      origTop: parseFloat(vertex?.style?.top || '0'),
      cx: rect ? rect.left + rect.width / 2 : 0,
      cy: rect ? rect.top + rect.height / 2 : 0,
    };
  });
  assert(dragSetup.viewBox === `0 0 ${dragSetup.stgW} ${dragSetup.stgH}`, `Diagram switch SVG viewBox mismatch: ${dragSetup.viewBox}`);
  assert(dragSetup.cellId !== '', 'Could not locate visible foreground vertex for drag scaling test');
  assert(dragSetup.zoom < 0.95, `Expected scaled zoom < 0.95 at 1024px viewport for drag test, got ${dragSetup.zoom}`);

  const dragDxScreen = 44;
  const dragDyScreen = 22;
  await page.mouse.move(dragSetup.cx, dragSetup.cy);
  await page.mouse.down();
  await page.mouse.move(dragSetup.cx + dragDxScreen, dragSetup.cy + dragDyScreen, { steps: 6 });
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 100));

  const dragAfter = await page.evaluate((cellId) => {
    const el = document.querySelector(`#drawio-fg-layer .mx-vertex[data-cell-id="${CSS.escape(cellId)}"]`);
    return {
      left: parseFloat(el?.style?.left || '0'),
      top: parseFloat(el?.style?.top || '0'),
    };
  }, dragSetup.cellId);

  const actualDx = dragAfter.left - dragSetup.origLeft;
  const expectedDx = Math.round((dragDxScreen / dragSetup.zoom) / 2) * 2;
  assert(
    Math.abs(actualDx - expectedDx) <= 4,
    `Drag scaling mismatch at zoom=${dragSetup.zoom}: actualDx=${actualDx}, expectedDx=${expectedDx} (unscaled screen dx=${dragDxScreen})`
  );

  // 4. Inline 860x680 (`&inline=1`) + compact badge check
  await page.setViewport({ width: 860, height: 680, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/drawio-editor?id=ws2-pattern-a-breach-defense-sequence&engine=native&inline=1`, {
    waitUntil: 'networkidle2',
    timeout: 20000,
  });
  await page.waitForSelector('#drawio-fg-layer .mx-vertex', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 250));

  const inlineState = await page.evaluate(() => {
    const stg = document.getElementById('drawio-stage');
    const scroller = document.querySelector('.canvas-scroll');
    const compactBadges = [];
    for (const el of document.querySelectorAll('#drawio-fg-layer .mx-vertex')) {
      const h = parseFloat(el.style.height || '999');
      if (h <= 28) {
        const r = el.getBoundingClientRect();
        compactBadges.push({
          id: el.dataset.cellId || '',
          overflowX: el.style.overflowX,
          overflowY: el.style.overflowY,
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
        });
      }
    }
    const badgeCollisions = [];
    for (let i = 0; i < compactBadges.length; i++) {
      for (let j = i + 1; j < compactBadges.length; j++) {
        const a = compactBadges[i];
        const b = compactBadges[j];
        const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (ix > 2 && iy > 2) badgeCollisions.push([a.id, b.id, ix, iy]);
      }
    }
    return {
      zoom: parseFloat(stg?.dataset?.zoom || '0'),
      zoomMode: stg?.dataset?.zoomMode || '',
      stgRectW: stg?.getBoundingClientRect().width || 0,
      scrollerW: scroller?.clientWidth || 0,
      compactBadges,
      badgeCollisions,
    };
  });
  assert(inlineState.zoomMode === 'fit', `Expected inline fit mode, got ${inlineState.zoomMode}`);
  assert(inlineState.zoom <= desktopState.zoom, `Inline zoom (${inlineState.zoom}) > desktop zoom (${desktopState.zoom})`);
  assert(inlineState.stgRectW <= inlineState.scrollerW + 24, `Inline stage overflows scroller: ${inlineState.stgRectW} > ${inlineState.scrollerW}`);
  assert(inlineState.compactBadges.length >= 1, 'Expected at least 1 compact badge (h<=28) in ws2-pattern-a-breach-defense-sequence');
  for (const b of inlineState.compactBadges) {
    assert(b.overflowX === 'visible' && b.overflowY === 'visible', `Compact badge ${b.id} overflow not visible: ${b.overflowX}/${b.overflowY}`);
  }
  assert(inlineState.badgeCollisions.length === 0, `Sibling compact badge collisions: ${JSON.stringify(inlineState.badgeCollisions)}`);

  // 5. All 14 canonical blueprints across Desktop (1440x900) and Inline (860x680)
  const allDiagramIds = JSON.parse(process.env.DIAGRAM_IDS_JSON || '[]');
  assert(allDiagramIds.length === 14, `Expected 14 diagram IDs from manifest, got ${allDiagramIds.length}`);
  const matrixSummary = [];
  for (const diagId of allDiagramIds) {
    let diagDesktopZoom = 0;
    for (const vp of [
      { label: 'desktop', width: 1440, height: 900, inline: false },
      { label: 'inline', width: 860, height: 680, inline: true },
    ]) {
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });
      const url = `${BASE_URL}/drawio-editor?id=${encodeURIComponent(diagId)}&engine=native${vp.inline ? '&inline=1' : ''}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      await page.waitForSelector('#drawio-fg-layer .mx-vertex', { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 150));

      const st = await page.evaluate(() => {
        const stg = document.getElementById('drawio-stage');
        const scroller = document.querySelector('.canvas-scroll');
        const svg = document.getElementById('drawio-edge-svg');
        const pct = document.getElementById('zoom-pct-label')?.textContent?.trim() || '';
        const compactBadges = [];
        for (const el of document.querySelectorAll('#drawio-fg-layer .mx-vertex')) {
          const h = parseFloat(el.style.height || '999');
          if (h <= 28) {
            const r = el.getBoundingClientRect();
            compactBadges.push({
              id: el.dataset.cellId || '',
              overflowX: el.style.overflowX,
              overflowY: el.style.overflowY,
              left: r.left,
              top: r.top,
              right: r.right,
              bottom: r.bottom,
            });
          }
        }
        const badgeCollisions = [];
        for (let i = 0; i < compactBadges.length; i++) {
          for (let j = i + 1; j < compactBadges.length; j++) {
            const a = compactBadges[i];
            const b = compactBadges[j];
            const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
            const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
            if (ix > 2 && iy > 2) badgeCollisions.push([a.id, b.id, ix, iy]);
          }
        }
        return {
          zoom: parseFloat(stg?.dataset?.zoom || '0'),
          zoomMode: stg?.dataset?.zoomMode || '',
          pct,
          stgRectW: stg?.getBoundingClientRect().width || 0,
          scrollerW: scroller?.clientWidth || 0,
          viewBox: svg?.getAttribute('viewBox') || '',
          stgStyleW: parseFloat(stg?.style?.width || '0'),
          stgStyleH: parseFloat(stg?.style?.height || '0'),
          vertexCount: document.querySelectorAll('#drawio-fg-layer .mx-vertex').length,
          scriptTagsInVertices: document.querySelectorAll('.mx-vertex script').length,
          compactBadges,
          badgeCollisions,
        };
      });

      assert(st.zoomMode === 'fit', `${diagId} (${vp.label}) expected fit mode, got ${st.zoomMode}`);
      assert(st.zoom >= 0.30 && st.zoom <= 1.25, `${diagId} (${vp.label}) zoom out of range: ${st.zoom}`);
      if (!vp.inline) {
        diagDesktopZoom = st.zoom;
        assert(st.pct === `${Math.round(st.zoom * 100)}%`, `${diagId} (desktop) zoom label mismatch: ${st.pct} vs ${st.zoom}`);
      } else {
        assert(st.zoom <= diagDesktopZoom + 0.01, `${diagId} (inline) zoom ${st.zoom} > desktop ${diagDesktopZoom}`);
      }
      assert(st.stgRectW <= st.scrollerW + 24, `${diagId} (${vp.label}) overflows scroller: ${st.stgRectW} > ${st.scrollerW}`);
      assert(st.viewBox === `0 0 ${st.stgStyleW} ${st.stgStyleH}`, `${diagId} (${vp.label}) viewBox mismatch: ${st.viewBox}`);
      assert(st.vertexCount >= 10, `${diagId} (${vp.label}) too few vertices: ${st.vertexCount}`);
      assert(st.scriptTagsInVertices === 0, `${diagId} (${vp.label}) XSS script tag in vertex`);
      for (const b of st.compactBadges) {
        assert(b.overflowX === 'visible' && b.overflowY === 'visible', `${diagId} (${vp.label}) badge ${b.id} overflow: ${b.overflowX}/${b.overflowY}`);
      }
      assert(st.badgeCollisions.length === 0, `${diagId} (${vp.label}) compact badge collisions: ${JSON.stringify(st.badgeCollisions)}`);
    }
    matrixSummary.push(diagId);
  }

  assert(consoleErrors.length === 0, `Console errors: ${consoleErrors.join('; ')}`);
  assert(pageErrors.length === 0, `Page errors: ${pageErrors.join('; ')}`);

  console.log(JSON.stringify({
    desktopZoom: desktopState.zoom,
    compactZoom: compactState.zoom,
    inlineZoom: inlineState.zoom,
    dragZoom: dragSetup.zoom,
    actualDx,
    expectedDx,
    compactBadgesChecked: inlineState.compactBadges.length,
    diagramsVerified: matrixSummary.length,
  }));
} finally {
  await browser.close();
}
"""

        with tempfile.TemporaryDirectory(prefix="pptr_canvas_test_") as tdir:
            script_path = Path(tdir) / "verify_canvas.mjs"
            profile_dir = Path(tdir) / "chrome_profile"
            profile_dir.mkdir(parents=True, exist_ok=True)
            script_path.write_text(js_script, encoding="utf-8")
            manifest_data = json.loads((ROOT_DIR / "diagrams/diagrams_manifest.json").read_text(encoding="utf-8"))
            manifest_items = manifest_data.get("diagrams", manifest_data) if isinstance(manifest_data, dict) else manifest_data
            all_diagram_ids = [item["id"] for item in manifest_items if isinstance(item, dict) and item.get("id")]
            self.assertEqual(len(all_diagram_ids), 14, f"Expected 14 diagrams in diagrams_manifest.json, found {all_diagram_ids}")

            env = dict(os.environ)
            env["TEST_BASE_URL"] = self.base_url
            env["CHROME_PATH"] = chrome_bin
            env["USER_DATA_DIR"] = str(profile_dir)
            env["DIAGRAM_IDS_JSON"] = json.dumps(all_diagram_ids)
            proc = subprocess.run(
                [node_bin, str(script_path)],
                cwd=str(ROOT_DIR),
                env=env,
                capture_output=True,
                text=True,
                timeout=180,
            )
            self.assertEqual(
                proc.returncode,
                0,
                f"Headless Puppeteer /drawio-editor check failed (rc={proc.returncode}):\nSTDOUT: {proc.stdout}\nSTDERR: {proc.stderr}",
            )
            summary_payload = json.loads(proc.stdout.strip().splitlines()[-1])
            self.assertEqual(summary_payload.get("diagramsVerified"), 14)


if __name__ == "__main__":
    unittest.main()
