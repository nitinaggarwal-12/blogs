#!/usr/bin/env node
/**
 * Canonical Single-Source Diagram Builder for ge-blogs (WS1–WS5 Primaries + 7 Secondary Diagrams).
 *
 * 1. Compiles all 5 primary workstream specs (WS1–WS5) at 1600x900 @ 7620 EMU/px into:
 *    - diagrams/<id>.drawio + diagrams/compendium/drawio/<id>.drawio
 *    - diagrams/<id>.svg    + diagrams/compendium/drawio/<id>.svg
 *    - Native DrawingML slide XML (pic=0) exported to /tmp/ge_blogs_ws1_ws5_slides_bundle.json
 * 2. Cleans all 7 secondary C4/bridge diagrams (0 banned emojis, 0 stale 4-state chip,
 *    container=1 on saas10 runtime container box, compendium byte parity).
 * 3. Validates all 5 primary .drawio files via scripts/lib/drawioValidator.ts (fail-closed: 0 errors).
 * 4. Renders full 3200x1800 (2x Retina, 1.778 aspect ratio) .drawio.png via headless Chrome
 *    + viewer-static.min.js (loaded from local PromptCanvas/tmp — never copied into diagrams/).
 */

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import {
  CANVAS_W,
  CANVAS_H,
  compileToDrawioXml,
  compileToStandaloneSvg,
  compileToSlideXml,
} from './lib/diagram_spec_compiler.mjs';
import { PRIMARY_WORKSTREAM_SPECS } from './lib/ws1_to_ws5_specs.mjs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIAGRAMS_DIR = path.join(ROOT_DIR, 'diagrams');
const COMP_DRAWIO_DIR = path.join(DIAGRAMS_DIR, 'compendium', 'drawio');

export const SECONDARY_DIAGRAM_IDS = [
  'ws1-c4-l3-process-sequence-swimlane',
  'ws2-c4-l3-mode-a-cow-prefork-heap-wipe-swimlane',
  'ws2-c4-l3-mode-b-session-sandbox-sticky-latch-swimlane',
  'ws3-c4-l3-cmek-killswitch-swimlane',
  'ws4-c4-l3-live-tier-promotion-swimlane',
  'ws5-c4-l3-dynamic-skill-delegation-swimlane',
  'saas10-multicloud-a2a-mcp-bridge',
];

const EMOJI_CLEANUP_RULES = [
  [/▶\s*4-State Hybrid\s*(?:&amp;amp;|&amp;|&)\s*Draw\.io\s*↗/gi, 'Edit in Draw.io ↗'],
  [/4-State Hybrid\s*(?:&amp;amp;|&amp;|&)\s*Draw\.io\s*↗/gi, 'Edit in Draw.io ↗'],
  [/▶\s*Edit in Draw\.io ↗/g, 'Edit in Draw.io ↗'],
  [/✏️\s*Edit in Draw\.io ↗/g, 'Edit in Draw.io ↗'],
  [/🔗\s*Edit in Draw\.io ↗/g, 'Edit in Draw.io ↗'],
  [/▶\s*/g, '→ '],
  [/✅\s*/g, '✓ '],
  [/❌\s*/g, '✕ '],
  [/⚡\s*/g, ''],
  [/🛡️\s*/g, ''],
  [/🛡\s*/g, ''],
  [/⚙️\s*/g, ''],
  [/⚙\s*/g, ''],
  [/🌐\s*/g, ''],
  [/🔒\s*/g, ''],
  [/🔑\s*/g, ''],
  [/🔄\s*/g, ''],
  [/🔐\s*/g, ''],
  [/🔍\s*/g, ''],
  [/📊\s*/g, ''],
  [/✦\s*/g, ''],
  [/❖/g, 'GW'],
  [/🔗\s*/g, ''],
  [/✏️\s*/g, ''],
  [/✏\s*/g, ''],
  [/\uFE0F/g, ''],
];

function cleanSecondaryContent(txt, isSaas10Drawio = false) {
  let out = txt;
  for (const [re, rep] of EMOJI_CLEANUP_RULES) {
    out = out.replace(re, rep);
  }
  if (isSaas10Drawio) {
    // saas10 'runtime' box encloses adk_orch; mark it container=1 so no leaf cell uses verticalAlign=top
    out = out.replace(
      /(<mxCell\b[^>]*\bid="runtime"[^>]*\bstyle="[^"]*verticalAlign=top;?)([^"]*")/,
      (m, p1, p2) => (m.includes('container=1') ? m : `${p1}container=1;collapsible=0;pointerEvents=0;${p2}`)
    );
  }
  return out;
}

function findViewerStaticPath() {
  const candidates = [
    process.env.DRAWIO_VIEWER_JS || '',
    '/usr/local/google/home/nitinagga/Documents/PromptCanvas/public/viewer-static.min.js',
    '/tmp/viewer-static.min.js',
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('viewer-static.min.js not found. Set DRAWIO_VIEWER_JS or ensure PromptCanvas/public/viewer-static.min.js exists.');
}

function findChromeBinary() {
  for (const c of [process.env.CHROME_BIN, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].filter(Boolean)) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('Chrome binary not found');
}

function runTsDrawioValidator(xmlPaths) {
  const probeScript = path.join(os.tmpdir(), `validate_ws1_ws5_${process.pid}.mts`);
  const validatorPath = path.join(ROOT_DIR, 'scripts', 'lib', 'drawioValidator.ts');
  const code = `
import fs from 'node:fs';
import { validateDrawioXml } from ${JSON.stringify(validatorPath)};
const paths: string[] = ${JSON.stringify(xmlPaths)};
let totalErrors = 0;
for (const p of paths) {
  const xml = fs.readFileSync(p, 'utf8');
  const res = validateDrawioXml(xml);
  console.log(\`[validateDrawioXml] \${p.split('/').pop()}: valid=\${res.valid}, errors=\${res.errors.length}, warnings=\${res.warnings.length}\`);
  for (const e of res.errors) {
    console.error(\`   ERROR [\${e.code}] (\${e.cells.join(',')}): \${e.detail}\`);
  }
  for (const w of res.warnings) {
    console.warn(\`   WARN  [\${w.code}] (\${w.cells.join(',')}): \${w.detail}\`);
  }
  totalErrors += res.errors.length;
}
if (totalErrors > 0) process.exit(1);
`;
  fs.writeFileSync(probeScript, code, 'utf8');
  try {
    // Run using tsx or node --experimental-strip-types (Node 22+) or PromptCanvas tsx
    const tsxCandidates = [
      path.join(ROOT_DIR, 'node_modules', '.bin', 'tsx'),
      '/usr/local/google/home/nitinagga/Documents/PromptCanvas/node_modules/.bin/tsx',
    ];
    const tsxBin = tsxCandidates.find((p) => fs.existsSync(p));
    let stdout;
    if (tsxBin) {
      stdout = execFileSync(tsxBin, [probeScript], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } else {
      stdout = execFileSync(process.execPath, ['--experimental-strip-types', probeScript], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    }
    process.stdout.write(stdout);
  } finally {
    try { fs.unlinkSync(probeScript); } catch {}
  }
}

async function renderDrawioPngsAndVerifySvgs(diagramIds, primaryIds, verifyOutDir) {
  const puppeteer = require(path.join(ROOT_DIR, 'node_modules', 'puppeteer-core'));
  const viewerJsPath = findViewerStaticPath();
  const viewerJsBytes = fs.readFileSync(viewerJsPath);
  const chromeBin = findChromeBinary();

  // Ephemeral local server serving viewer-static.min.js and diagram files
  const server = http.createServer((req, res) => {
    const u = new URL(req.url || '/', 'http://127.0.0.1');
    if (u.pathname === '/viewer-static.min.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(viewerJsBytes);
      return;
    }
    if (u.pathname.startsWith('/diagrams/')) {
      const fname = path.basename(u.pathname);
      const fp = path.join(DIAGRAMS_DIR, fname);
      if (fs.existsSync(fp)) {
        const ct = fname.endsWith('.svg') ? 'image/svg+xml' : 'application/xml; charset=utf-8';
        res.writeHead(200, { 'Content-Type': ct });
        res.end(fs.readFileSync(fp));
        return;
      }
    }
    if (u.pathname === '/render.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><html><head><meta charset="utf-8"><style>
        html,body{margin:0;padding:0;background:#FFFFFF;width:${CANVAS_W}px;height:${CANVAS_H}px;overflow:hidden;}
        #canvas-wrap{width:${CANVAS_W}px;height:${CANVAS_H}px;background:#FFFFFF;position:relative;}
        .mxgraph{width:${CANVAS_W}px !important;height:${CANVAS_H}px !important;}
        .geDiagramContainer{border:none !important;box-shadow:none !important;background:#FFFFFF !important;overflow:hidden !important;}
      </style></head><body><div id="canvas-wrap"></div><script src="/viewer-static.min.js"></script></body></html>`);
      return;
    }
    if (u.pathname === '/svg-check.html') {
      const id = u.searchParams.get('id') || '';
      const mode = u.searchParams.get('mode') || 'img';
      const inner = mode === 'object'
        ? `<object id="target-svg" type="image/svg+xml" data="/diagrams/${id}.svg" style="width:${CANVAS_W}px;height:${CANVAS_H}px;display:block;"></object>`
        : `<img id="target-svg" src="/diagrams/${id}.svg" style="width:${CANVAS_W}px;height:${CANVAS_H}px;display:block;"/>`;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#FFFFFF;width:${CANVAS_W}px;height:${CANVAS_H}px;overflow:hidden;}</style></head><body>${inner}</body></html>`);
      return;
    }
    res.writeHead(404);
    res.end('Not found');
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome_drawio_render_'));

  const browser = await puppeteer.launch({
    executablePath: chromeBin,
    headless: 'new',
    userDataDir: tmpProfile,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: CANVAS_W, height: CANVAS_H, deviceScaleFactor: 2 });

    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    for (const diagId of diagramIds) {
      const xmlPath = path.join(DIAGRAMS_DIR, `${diagId}.drawio`);
      const outPng = path.join(DIAGRAMS_DIR, `${diagId}.drawio.png`);
      const xmlStr = fs.readFileSync(xmlPath, 'utf8');

      await page.goto(`${baseUrl}/render.html`, { waitUntil: 'networkidle0', timeout: 30000 });
      const stats = await page.evaluate(async (xml) => {
        const wrap = document.getElementById('canvas-wrap');
        const div = document.createElement('div');
        div.className = 'mxgraph';
        div.setAttribute('data-mxgraph', JSON.stringify({
          highlight: '#1a73e8',
          nav: false,
          resize: false,
          toolbar: '',
          'toolbar-position': 'none',
          zoom: 1,
          border: 0,
          xml,
        }));
        wrap.appendChild(div);
        if (window.GraphViewer && typeof window.GraphViewer.processElements === 'function') {
          window.GraphViewer.processElements();
        }
        // Wait for SVG + embedded images to finish painting
        await new Promise((r) => setTimeout(r, 450));
        const svgEl = wrap.querySelector('svg');
        const imgs = Array.from(wrap.querySelectorAll('image, img'));
        let brokenImgs = 0;
        for (const im of imgs) {
          if (im.tagName.toLowerCase() === 'img' && (!im.complete || im.naturalWidth === 0)) {
            brokenImgs++;
          }
        }
        // Ensure container is exactly 1600x900 aligned at (0,0) without scrollbars
        const ge = wrap.querySelector('.geDiagramContainer');
        if (ge) {
          ge.style.width = '1600px';
          ge.style.height = '900px';
          ge.style.maxWidth = '1600px';
          ge.style.maxHeight = '900px';
        }
        if (svgEl) {
          svgEl.setAttribute('viewBox', '0 0 1600 900');
          svgEl.style.width = '1600px';
          svgEl.style.height = '900px';
        }
        await new Promise((r) => setTimeout(r, 120));
        return {
          hasSvg: Boolean(svgEl),
          imgCount: imgs.length,
          brokenImgs,
          svgW: svgEl ? svgEl.getBoundingClientRect().width : 0,
          svgH: svgEl ? svgEl.getBoundingClientRect().height : 0,
        };
      }, xmlStr);

      if (!stats.hasSvg || stats.brokenImgs > 0) {
        throw new Error(`Draw.io render failed for ${diagId}: ${JSON.stringify(stats)}`);
      }
      await page.screenshot({
        path: outPng,
        clip: { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H },
        omitBackground: false,
      });
      const bytes = fs.statSync(outPng).size;
      console.log(`[render.drawio.png] ${diagId}.drawio.png -> ${bytes.toLocaleString()} B (imgs=${stats.imgCount}, broken=${stats.brokenImgs})`);
    }

    // Verify all 5 primary standalone SVGs inside BOTH <img> AND <object> (tab_overview.html)
    if (verifyOutDir) {
      fs.mkdirSync(verifyOutDir, { recursive: true });
      for (const diagId of primaryIds) {
        for (const mode of ['img', 'object']) {
          await page.goto(`${baseUrl}/svg-check.html?id=${encodeURIComponent(diagId)}&mode=${mode}`, {
            waitUntil: 'networkidle0',
            timeout: 20000,
          });
          await new Promise((r) => setTimeout(r, 200));
          const ok = await page.evaluate((m) => {
            const el = document.getElementById('target-svg');
            if (!el) return { ok: false, reason: 'missing' };
            if (m === 'img') {
              return { ok: el.complete && el.naturalWidth > 0, w: el.naturalWidth, h: el.naturalHeight };
            }
            const doc = el.contentDocument;
            const svg = doc && doc.querySelector('svg');
            return { ok: Boolean(svg), texts: svg ? svg.querySelectorAll('text').length : 0 };
          }, mode);
          if (!ok.ok) {
            throw new Error(`Standalone SVG ${mode} check failed for ${diagId}: ${JSON.stringify(ok)}`);
          }
          if (mode === 'object') {
            const outSvgShot = path.join(verifyOutDir, `${diagId}_svg_object_render.png`);
            await page.screenshot({
              path: outSvgShot,
              clip: { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H },
            });
          }
        }
        console.log(`[verify.svg] ${diagId}.svg PASS inside both <img> and <object>`);
      }
    }

    if (pageErrors.length > 0) {
      throw new Error(`Headless Chrome page errors during render: ${pageErrors.join(' | ')}`);
    }
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tmpProfile, { recursive: true, force: true });
  }
}

async function main() {
  const skipRender = process.argv.includes('--no-render');
  const verifyOutArg = process.argv.find((a) => a.startsWith('--verify-out='));
  const verifyOutDir = verifyOutArg ? verifyOutArg.split('=')[1] : '';

  const primaryXmlPaths = [];
  const slideBundle = {};
  const bm12Meta = {
    'ws1-5hop-governance-baseline': { bmSlide: 1, partLabel: 'PART 1 (WS1)' },
    'ws2-pattern-a-pooled': { bmSlide: 3, partLabel: 'PART 2 (WS2)' },
    'ws3-pattern-b-silo': { bmSlide: 6, partLabel: 'PART 3 (WS3)' },
    'ws4-pattern-c-hybrid': { bmSlide: 8, partLabel: 'PART 4 (WS4)' },
    'ws5-decision-tree-and-triad': { bmSlide: 10, partLabel: 'PART 5 (WS5)' },
  };

  console.log('=== 1. Compiling 5 Primary Workstream Diagrams (WS1–WS5 @ 1600x900) ===');
  for (const spec of PRIMARY_WORKSTREAM_SPECS) {
    const drawioXml = compileToDrawioXml(spec);
    const svgXml = compileToStandaloneSvg(spec);
    const meta = bm12Meta[spec.id];
    const bmFooter = `[Slide ${String(meta.bmSlide).padStart(2, '0')}/12 • ${meta.partLabel}]`;
    const slideXml = compileToSlideXml(spec, bmFooter, 'rId3');

    const pDrawio = path.join(DIAGRAMS_DIR, `${spec.id}.drawio`);
    const pCompDrawio = path.join(COMP_DRAWIO_DIR, `${spec.id}.drawio`);
    const pSvg = path.join(DIAGRAMS_DIR, `${spec.id}.svg`);
    const pCompSvg = path.join(COMP_DRAWIO_DIR, `${spec.id}.svg`);

    fs.writeFileSync(pDrawio, drawioXml, 'utf8');
    fs.writeFileSync(pCompDrawio, drawioXml, 'utf8');
    fs.writeFileSync(pSvg, svgXml, 'utf8');
    fs.writeFileSync(pCompSvg, svgXml, 'utf8');

    primaryXmlPaths.push(pDrawio);
    slideBundle[spec.id] = {
      bmSlide: meta.bmSlide,
      partLabel: meta.partLabel,
      slideXml,
    };
    console.log(`  Compiled ${spec.id}: .drawio=${drawioXml.length}B, .svg=${svgXml.length}B, slideXml=${slideXml.length}B`);
  }

  console.log('\n=== 2. Cleaning 7 Secondary C4/Bridge Diagrams (0 emojis, 0 stale chips) ===');
  for (const sid of SECONDARY_DIAGRAM_IDS) {
    const pDrawio = path.join(DIAGRAMS_DIR, `${sid}.drawio`);
    const pCompDrawio = path.join(COMP_DRAWIO_DIR, `${sid}.drawio`);
    const pSvg = path.join(DIAGRAMS_DIR, `${sid}.svg`);
    const pCompSvg = path.join(COMP_DRAWIO_DIR, `${sid}.svg`);

    const cleanDrawio = cleanSecondaryContent(fs.readFileSync(pDrawio, 'utf8'), sid === 'saas10-multicloud-a2a-mcp-bridge');
    const cleanSvg = cleanSecondaryContent(fs.readFileSync(pSvg, 'utf8'), false);
    fs.writeFileSync(pDrawio, cleanDrawio, 'utf8');
    fs.writeFileSync(pCompDrawio, cleanDrawio, 'utf8');
    fs.writeFileSync(pSvg, cleanSvg, 'utf8');
    fs.writeFileSync(pCompSvg, cleanSvg, 'utf8');
    console.log(`  Cleaned ${sid}: .drawio=${cleanDrawio.length}B, .svg=${cleanSvg.length}B`);
  }

  console.log('\n=== 3. Running Fail-Closed validateDrawioXml() on All 5 Primary Diagrams ===');
  runTsDrawioValidator(primaryXmlPaths);

  const bundlePath = path.join(os.tmpdir(), 'ge_blogs_ws1_ws5_slides_bundle.json');
  fs.writeFileSync(bundlePath, JSON.stringify(slideBundle), 'utf8');
  console.log(`\nWrote native DrawingML slide bundle to ${bundlePath}`);

  if (!skipRender) {
    console.log('\n=== 4. Rendering 2x Retina (3200x1800) .drawio.png & Verifying SVG <img>/<object> ===');
    const primaryIds = PRIMARY_WORKSTREAM_SPECS.map((s) => s.id);
    await renderDrawioPngsAndVerifySvgs([...primaryIds, ...SECONDARY_DIAGRAM_IDS], primaryIds, verifyOutDir);
  }
  console.log('\nALL DIAGRAMS COMPILED, VALIDATED & RENDERED SUCCESSFULLY.');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
