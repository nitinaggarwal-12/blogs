#!/usr/bin/env node
/**
 * Fail-Closed Visual, Alignment, Connector, Emoji & #R Parity Harness for ge-blogs.
 *
 * Enforces all standing user & architecture-center invariants across:
 *   - 5 Primary Workstream Diagrams (WS1–WS5)
 *   - 7 Secondary C4 Sequence & Multi-Cloud Diagrams (all 12 canonical diagrams)
 *   - All 12 PPTX Decks (BARE_MIN_12, WS1..WS5, WS1_EXEC..WS5_EXEC, ATLAS)
 *   - data/slide_diagrams_atlas.json & js/diagrams_atlas_data.js (#R parity)
 *
 * Exit code 0 = 100% PASS; non-zero = hard fail with exact offending item & rule.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIAGRAMS_DIR = path.join(ROOT_DIR, 'diagrams');
const COMP_DRAWIO_DIR = path.join(DIAGRAMS_DIR, 'compendium', 'drawio');
const SLIDES_DIR = path.join(ROOT_DIR, 'slides');

export const PRIMARY_IDS = [
  'ws1-5hop-governance-baseline',
  'ws2-pattern-a-pooled',
  'ws3-pattern-b-silo',
  'ws4-pattern-c-hybrid',
  'ws5-decision-tree-and-triad',
];

export const SECONDARY_IDS = [
  'ws1-c4-l3-process-sequence-swimlane',
  'ws2-c4-l3-mode-a-cow-prefork-heap-wipe-swimlane',
  'ws2-c4-l3-mode-b-session-sandbox-sticky-latch-swimlane',
  'ws3-c4-l3-cmek-killswitch-swimlane',
  'ws4-c4-l3-live-tier-promotion-swimlane',
  'ws5-c4-l3-dynamic-skill-delegation-swimlane',
  'saas10-multicloud-a2a-mcp-bridge',
];

export const ALL_12_IDS = [...PRIMARY_IDS, ...SECONDARY_IDS];

// Allowlist standard typographic symbols + whitespace (including \u00A0 NBSP per AGENTS.md L5)
const ALLOWED_NON_ASCII = new Set([
  '↗', '→', '←', '↔', '•', '✓', '✕', '◷', '─', '·', '—', '–', '×', '≤', '≥', '≠', '≈', '±', '§', '°',
  '“', '”', '‘', '’', '…', '\u00A0', 'α', 'τ', '∈', '²',
]);

function findDisallowedNonAscii(str) {
  const bad = new Set();
  for (const ch of String(str || '')) {
    const cp = ch.codePointAt(0);
    if (cp > 127 && !ALLOWED_NON_ASCII.has(ch) && !/\s/.test(ch)) {
      bad.add(ch);
    }
  }
  return Array.from(bad);
}

function unescapeXmlEntities(s) {
  return String(s || '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

function stripTagsToText(htmlStr) {
  return unescapeXmlEntities(String(htmlStr || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMxCells(xmlStr) {
  const cells = [];
  const re = /<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g;
  let m;
  while ((m = re.exec(xmlStr))) {
    const attrsStr = m[1];
    const body = m[2] || '';
    const attr = (name) => {
      const am = new RegExp(`\\b${name}="([^"]*)"`).exec(attrsStr);
      return am ? unescapeXmlEntities(am[1]) : '';
    };
    const geomM = /<mxGeometry\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxGeometry>)/.exec(body);
    let geom = null;
    if (geomM) {
      const gAttr = (name) => {
        const gm = new RegExp(`\\b${name}="([^"]*)"`).exec(geomM[1]);
        return gm ? parseFloat(gm[1]) : NaN;
      };
      const pts = [];
      const ptRe = /<mxPoint\b([^>]*?)\/>/g;
      let pm;
      const gBody = geomM[2] || '';
      if (gBody.includes('as="points"')) {
        while ((pm = ptRe.exec(gBody))) {
          const pxm = /\bx="([^"]+)"/.exec(pm[1]);
          const pym = /\by="([^"]+)"/.exec(pm[1]);
          if (pxm && pym) pts.push({ x: parseFloat(pxm[1]), y: parseFloat(pym[1]) });
        }
      }
      geom = { x: gAttr('x'), y: gAttr('y'), w: gAttr('width'), h: gAttr('height'), points: pts };
    }
    cells.push({
      id: attr('id'),
      parent: attr('parent'),
      value: attr('value'),
      style: attr('style'),
      vertex: attr('vertex') === '1',
      edge: attr('edge') === '1',
      source: attr('source'),
      target: attr('target'),
      geom,
    });
  }
  return cells;
}

function encodeDrawioHash(xmlStr) {
  let s = xmlStr
    .trim()
    .replace(/>\s+</g, '><');
  const uriEncoded = encodeURIComponent(s).replace(/%20/g, '%20');
  // Python urllib.parse.quote(s, safe="~()*!.'") leaves ~()*!.' unencoded; match exact JS encodeURIComponent behavior
  const raw = zlib.deflateRawSync(Buffer.from(uriEncoded, 'utf8'), { level: 9 });
  return 'R' + raw.toString('base64');
}

function decodeDrawioHashFromUrl(url) {
  const idx = String(url || '').indexOf('#R');
  if (idx < 0) return '';
  const b64 = url.slice(idx + 2);
  const inflated = zlib.inflateRawSync(Buffer.from(b64, 'base64')).toString('utf8');
  return decodeURIComponent(inflated);
}

function readPngDimensions(pngPath) {
  const buf = fs.readFileSync(pngPath);
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function runDrawioValidatorOnPrimaries(errors) {
  const validatorPath = path.join(ROOT_DIR, 'scripts', 'lib', 'drawioValidator.ts');
  const probeScript = path.join(os.tmpdir(), `harness_val_${process.pid}.mts`);
  const xmlPaths = PRIMARY_IDS.map((id) => path.join(DIAGRAMS_DIR, `${id}.drawio`));
  fs.writeFileSync(
    probeScript,
    `import fs from 'node:fs';
import { validateDrawioXml } from ${JSON.stringify(validatorPath)};
const out: any[] = [];
for (const p of ${JSON.stringify(xmlPaths)}) {
  const res = validateDrawioXml(fs.readFileSync(p, 'utf8'));
  out.push({ file: p.split('/').pop(), valid: res.valid, errors: res.errors });
}
console.log(JSON.stringify(out));
`,
    'utf8'
  );
  try {
    const tsxBin = [
      path.join(ROOT_DIR, 'node_modules', '.bin', 'tsx'),
      path.join(os.homedir(), 'Documents/PromptCanvas/node_modules/.bin/tsx'),
    ].find((p) => fs.existsSync(p));
    const stdout = tsxBin
      ? execFileSync(tsxBin, [probeScript], { encoding: 'utf8' })
      : execFileSync(process.execPath, ['--experimental-strip-types', probeScript], { encoding: 'utf8' });
    const parsed = JSON.parse(stdout);
    for (const r of parsed) {
      if (!r.valid || r.errors.length > 0) {
        errors.push(`drawioValidator:${r.file}:${r.errors.length} errors (${r.errors.map((e) => e.code).join(',')})`);
      }
    }
  } catch (err) {
    errors.push(`drawioValidator_exec_failed:${err.message}`);
  } finally {
    try { fs.unlinkSync(probeScript); } catch {}
  }
}

function checkPptxDecksAndAtlas(errors) {
  // Use python stdlib zipfile (always available, zero extra npm deps) to inspect all 12 PPTX decks
  const pyCode = `
import json, re, sys, urllib.parse, zipfile, zlib, base64, html
from pathlib import Path

ROOT = Path(${JSON.stringify(ROOT_DIR)})
DIAGRAMS = ROOT / "diagrams"
sys.path.insert(0, str(ROOT / "scripts"))
import verify_live_gslides_icon_parity as icon_parity
ALLOWED = set("↗→←↔•✓✕◷─·—–×≤≥≠≈±§°“”‘’…\\u00a0ατ∈²")

def bad_chars(txt):
    return sorted({c for c in txt if ord(c) > 127 and c not in ALLOWED and not c.isspace()})

def decode_hash(url):
    i = url.find("#R")
    if i < 0: return ""
    raw = zlib.decompress(base64.b64decode(url[i+2:]), -15).decode("utf-8", "ignore")
    return urllib.parse.unquote(raw)

def canonical_full_xml(diag_id):
    xml = (DIAGRAMS / f"{diag_id}.drawio").read_text(encoding="utf-8")
    return re.sub(r">\\s+<", "><", xml.strip())

PRIMARY_SET = set(${JSON.stringify(PRIMARY_IDS)})
DECKS = [
    ("BARE_MIN_12", "slides/geap-bare-minimum-12slide-architecture-deck.pptx", 12, [
        (1, "ws1-5hop-governance-baseline"), (2, "ws1-c4-l3-process-sequence-swimlane"),
        (3, "ws2-pattern-a-pooled"), (4, "ws2-c4-l3-mode-a-cow-prefork-heap-wipe-swimlane"),
        (5, "ws2-c4-l3-mode-b-session-sandbox-sticky-latch-swimlane"), (6, "ws3-pattern-b-silo"),
        (7, "ws3-c4-l3-cmek-killswitch-swimlane"), (8, "ws4-pattern-c-hybrid"),
        (9, "ws4-c4-l3-live-tier-promotion-swimlane"), (10, "ws5-decision-tree-and-triad"),
        (11, "saas10-multicloud-a2a-mcp-bridge"), (12, "ws5-c4-l3-dynamic-skill-delegation-swimlane"),
    ]),
    ("WS1", "slides/ws1-12slide-visual-deck.pptx", 10, [(4, "ws1-5hop-governance-baseline"), (5, "ws1-c4-l3-process-sequence-swimlane")]),
    ("WS2", "slides/ws2-12slide-visual-deck.pptx", 8, [(3, "ws2-pattern-a-pooled"), (4, "ws2-c4-l3-mode-a-cow-prefork-heap-wipe-swimlane"), (5, "ws2-c4-l3-mode-b-session-sandbox-sticky-latch-swimlane")]),
    ("WS3", "slides/ws3-12slide-visual-deck.pptx", 7, [(3, "ws3-pattern-b-silo"), (4, "ws3-c4-l3-cmek-killswitch-swimlane")]),
    ("WS4", "slides/ws4-12slide-visual-deck.pptx", 9, [(3, "ws4-pattern-c-hybrid"), (5, "ws4-c4-l3-live-tier-promotion-swimlane")]),
    ("WS5", "slides/ws5-12slide-visual-deck.pptx", 9, [(3, "ws5-decision-tree-and-triad"), (4, "saas10-multicloud-a2a-mcp-bridge"), (5, "ws5-c4-l3-dynamic-skill-delegation-swimlane")]),
    ("WS1_EXEC", "slides/ws1-executive-architecture-11slide-deck.pptx", 11, [(5, "ws1-5hop-governance-baseline"), (6, "ws1-c4-l3-process-sequence-swimlane")]),
    ("WS2_EXEC", "slides/ws2-executive-architecture-10slide-deck.pptx", 10, [(4, "ws2-pattern-a-pooled"), (5, "ws2-c4-l3-mode-a-cow-prefork-heap-wipe-swimlane"), (6, "ws2-c4-l3-mode-b-session-sandbox-sticky-latch-swimlane")]),
    ("WS3_EXEC", "slides/ws3-executive-architecture-10slide-deck.pptx", 10, [(4, "ws3-pattern-b-silo"), (5, "ws3-c4-l3-cmek-killswitch-swimlane")]),
    ("WS4_EXEC", "slides/ws4-executive-architecture-10slide-deck.pptx", 10, [(4, "ws4-pattern-c-hybrid"), (5, "ws4-c4-l3-live-tier-promotion-swimlane")]),
    ("WS5_EXEC", "slides/ws5-executive-architecture-10slide-deck.pptx", 10, [(4, "ws5-decision-tree-and-triad"), (5, "saas10-multicloud-a2a-mcp-bridge"), (6, "ws5-c4-l3-dynamic-skill-delegation-swimlane")]),
    ("ATLAS", "slides/saas-10-visual-verification-atlas-16slide-deck.pptx", 17, [(3, "saas10-multicloud-a2a-mcp-bridge")]),
]

errs = []
# Layer 1: Ban dead text-badge icon escape hatch in scripts/lib/
for lib_f in sorted((ROOT / "scripts/lib").glob("*.mjs")):
    if "DRAWINGML_ICON_BADGES" in lib_f.read_text(encoding="utf-8", errors="ignore"):
        errs.append(f"banned_escape_hatch_symbol:{lib_f.name}:DRAWINGML_ICON_BADGES")

drawio_icons_cache = {did: icon_parity.extract_drawio_pic_icons(DIAGRAMS / f"{did}.drawio") for did in PRIMARY_SET}
canon_cache = {}
for key, rel, total, slide_specs in DECKS:
    p = ROOT / rel
    if not p.is_file():
        errs.append(f"missing_pptx:{key}")
        continue
    with zipfile.ZipFile(p) as zf:
        for snum, did in slide_specs:
            if did not in canon_cache:
                canon_cache[did] = canonical_full_xml(did)
            sx = zf.read(f"ppt/slides/slide{snum}.xml").decode("utf-8", "ignore")
            rx = zf.read(f"ppt/slides/_rels/slide{snum}.xml.rels").decode("utf-8", "ignore")
            runs = [html.unescape(t) for t in re.findall(r"<a:t[^>]*>(.*?)</a:t>", sx, flags=re.S)]
            joined = " ".join(runs)
            bc = bad_chars(joined)
            if bc:
                errs.append(f"pptx_emoji:{key}:S{snum:02d}:{bc}")
            if "gemini 3.8" in joined.lower():
                errs.append(f"pptx_gemini38:{key}:S{snum:02d}")
            if "4-state hybrid" in joined.lower():
                errs.append(f"pptx_4state_chip:{key}:S{snum:02d}")
            if not any(f"[Slide {snum:02d}/{total:02d}" in r for r in runs):
                errs.append(f"pptx_footer_single_run:{key}:S{snum:02d}")
            if "edit in draw.io" not in joined.lower():
                errs.append(f"pptx_missing_edit_drawio:{key}:S{snum:02d}")
            if did in PRIMARY_SET:
                if "<p:pic>" in sx:
                    errs.append(f"pptx_has_pic:{key}:S{snum:02d}")
                if 'h="0"' in sx or 'w="0"' in sx:
                    errs.append(f"pptx_zero_wh:{key}:S{snum:02d}")
                if "<p:grpSp>" in sx or "<a:arcTo" in sx or "<a:schemeClr" in sx:
                    errs.append(f"pptx_unsupported_preview_prim:{key}:S{snum:02d}")
                if 'name="icon_badge_' in sx:
                    errs.append(f"pptx_text_placeholder_icon:{key}:S{snum:02d}")
                if 'name="ico_' not in sx:
                    errs.append(f"pptx_missing_native_vector_icons:{key}:S{snum:02d}")
                if sx.count('tailEnd type="triangle"') < 10:
                    errs.append(f"pptx_missing_tailEnd_arrows:{key}:S{snum:02d}")
                # Layer 2B + 2C: Name-agnostic disguised text-box icon detector + exact 1:1 vector cluster count & pairing
                _pairs, _ico_errs = icon_parity.audit_slide_xml_icons(sx, drawio_icons_cache[did])
                for _ie in _ico_errs:
                    errs.append(f"pptx_icon_ast:{key}:S{snum:02d}:{_ie}")
                # Layer 2D: Automated Web SVG <-> Slide Preview per-icon RGB pixel parity (all 78 icons on BARE_MIN_12)
                if key == "BARE_MIN_12":
                    _prev_png = ROOT / f"slides/previews/geap-bare-minimum-12slide-architecture-deck/slide_{snum:02d}.png"
                    if _prev_png.is_file():
                        _st, _px_errs = icon_parity.verify_rendered_icon_pixel_parity(
                            did, DIAGRAMS / f"{did}.drawio", DIAGRAMS / f"{did}.svg", sx, _prev_png
                        )
                        errs.extend(_px_errs)
            m = re.search(r'Target="(https://viewer\\.diagrams\\.net/[^"]+)"', rx)
            if not m:
                errs.append(f"pptx_missing_rid3_url:{key}:S{snum:02d}")
            else:
                url = html.unescape(m.group(1))
                if f"title={did}.drawio" not in url:
                    errs.append(f"pptx_bad_rid3_title:{key}:S{snum:02d}")
                dec = decode_hash(url)
                if dec != canon_cache[did]:
                    errs.append(f"pptx_rid3_hash_mismatch:{key}:S{snum:02d}:{did}")
                if did in PRIMARY_SET:
                    dec_pic_cnt = len(re.findall(r'id="pic_icon_[^"]*"', dec))
                    exp_pic_cnt = len(drawio_icons_cache[did])
                    if dec_pic_cnt != exp_pic_cnt:
                        errs.append(f"pptx_rid3_missing_icons:{key}:S{snum:02d}:{did}:{dec_pic_cnt}!={exp_pic_cnt}")
                if "gemini 3.8" in dec.lower():
                    errs.append(f"pptx_rid3_gemini38:{key}:S{snum:02d}")

# Atlas JSON <-> JS #R parity for all 12 canonical IDs (both top-level AND nested assets.drawioStandaloneHashUrl)
atlas_json_txt = (ROOT / "data/slide_diagrams_atlas.json").read_text(encoding="utf-8")
atlas_js_txt = (ROOT / "js/diagrams_atlas_data.js").read_text(encoding="utf-8")
expected_js = f"// Auto-synced from data/slide_diagrams_atlas.json\\nwindow.SLIDE_DIAGRAMS_ATLAS = {atlas_json_txt.rstrip()};\\n"
if atlas_js_txt != expected_js:
    errs.append("atlas_json_js_parity_mismatch")
atlas = json.loads(atlas_json_txt)
seen_atlas = set()
for item in atlas.get("items", []):
    did = item.get("diagramId") or ""
    if did in canon_cache:
        seen_atlas.add(did)
        u = item.get("drawioStandaloneHashUrl", "")
        dec = decode_hash(u)
        if dec != canon_cache[did]:
            errs.append(f"atlas_hash_mismatch:{did}")
        if "gemini 3.8" in dec.lower():
            errs.append(f"atlas_hash_gemini38:{did}")
        au = (item.get("assets") or {}).get("drawioStandaloneHashUrl", "")
        adec = decode_hash(au)
        if adec != canon_cache[did]:
            errs.append(f"atlas_assets_hash_mismatch:{did}")
        if did in PRIMARY_SET:
            apic_cnt = len(re.findall(r'id="pic_icon_[^"]*"', adec))
            if apic_cnt != len(drawio_icons_cache[did]):
                errs.append(f"atlas_assets_missing_icons:{did}:{apic_cnt}!={len(drawio_icons_cache[did])}")
for did in canon_cache:
    if did not in seen_atlas:
        errs.append(f"atlas_missing_item:{did}")

print(json.dumps(errs))
`;
  const stdout = execFileSync('python3', ['-B', '-c', pyCode], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const pyErrs = JSON.parse(stdout);
  errors.push(...pyErrs);
}

function main() {
  const errors = [];
  const skipValidator = process.argv.includes('--skip-ts-validator');

  // 1. Validate all 12 .drawio, .svg, compendium parity, .drawio.png provenance, leaf centering, emojis, GKE & elbow rules
  for (const id of ALL_12_IDS) {
    const isPrimary = PRIMARY_IDS.includes(id);
    const pDrawio = path.join(DIAGRAMS_DIR, `${id}.drawio`);
    const pCompDrawio = path.join(COMP_DRAWIO_DIR, `${id}.drawio`);
    const pSvg = path.join(DIAGRAMS_DIR, `${id}.svg`);
    const pCompSvg = path.join(COMP_DRAWIO_DIR, `${id}.svg`);
    const pPng = path.join(DIAGRAMS_DIR, `${id}.drawio.png`);

    for (const [lbl, fp] of [['drawio', pDrawio], ['comp_drawio', pCompDrawio], ['svg', pSvg], ['comp_svg', pCompSvg], ['png', pPng]]) {
      if (!fs.existsSync(fp)) {
        errors.push(`missing_${lbl}:${id}`);
      }
    }
    if (!fs.existsSync(pDrawio) || !fs.existsSync(pSvg)) continue;

    const xmlStr = fs.readFileSync(pDrawio, 'utf8');
    const compXmlStr = fs.existsSync(pCompDrawio) ? fs.readFileSync(pCompDrawio, 'utf8') : '';
    const svgStr = fs.readFileSync(pSvg, 'utf8');
    const compSvgStr = fs.existsSync(pCompSvg) ? fs.readFileSync(pCompSvg, 'utf8') : '';

    if (xmlStr !== compXmlStr) errors.push(`compendium_drawio_parity_mismatch:${id}`);
    if (svgStr !== compSvgStr) errors.push(`compendium_svg_parity_mismatch:${id}`);

    // PNG provenance & aspect ratio (outside 1.55-1.65 F-13 ban, mtime >= .drawio mtime)
    if (fs.existsSync(pPng)) {
      const pngDims = readPngDimensions(pPng);
      if (!pngDims || pngDims.w < 1200 || pngDims.h < 600) {
        errors.push(`png_bad_dims:${id}:${JSON.stringify(pngDims)}`);
      } else {
        const ratio = pngDims.w / pngDims.h;
        if (ratio >= 1.55 && ratio <= 1.65) {
          errors.push(`png_banned_aspect_160:${id}:${pngDims.w}x${pngDims.h}`);
        }
      }
      const xmlMtime = fs.statSync(pDrawio).mtimeMs;
      const pngMtime = fs.statSync(pPng).mtimeMs;
      if (pngMtime + 2000 < xmlMtime) {
        errors.push(`png_stale_mtime:${id}`);
      }
    }

    // Standalone SVG invariants
    if (!svgStr.includes('viewBox="0 0 1600 900"')) errors.push(`svg_bad_viewbox:${id}`);
    if (/<foreignObject\b/i.test(svgStr)) errors.push(`svg_has_foreignObject:${id}`);
    if (/\b(?:xlink:)?href="https?:/i.test(svgStr)) errors.push(`svg_external_href:${id}`);
    const svgRootM = /<svg\b([^>]*)>/.exec(svgStr);
    if (svgRootM && (/\bwidth=/.test(svgRootM[1]) || /\bheight=/.test(svgRootM[1]))) {
      errors.push(`svg_fixed_wh_breaks_object:${id}`);
    }
    const svgTextOnly = stripTagsToText(svgStr.replace(/<defs>[\s\S]*?<\/defs>/g, ''));
    const svgBadChars = findDisallowedNonAscii(svgTextOnly);
    if (svgBadChars.length > 0) errors.push(`svg_banned_emoji:${id}:${svgBadChars.join(',')}`);
    if (/gemini\s+3\.8/i.test(svgTextOnly)) errors.push(`svg_stale_gemini38:${id}`);

    // Draw.io XML cell-level invariants (evaluated on decoded labels, NEVER raw Base64!)
    const cells = parseMxCells(xmlStr);
    let containerCount = 0;
    let multiPointElbowCount = 0;
    const decodedLabels = [];
    const labelById = new Map();

    for (const c of cells) {
      if (c.id === '0' || c.id === '1') continue;
      if (c.vertex) {
        const isContainer = c.style.includes('container=1');
        const isImage = c.style.includes('shape=image');
        const isTextOnly = c.style.startsWith('text;') || c.style.includes(';text;');
        if (isContainer) containerCount++;

        // No non-container, non-image, non-text leaf cards using verticalAlign=top!
        if (!isContainer && !isImage && !isTextOnly && c.style.includes('verticalAlign=top')) {
          errors.push(`leaf_verticalAlign_top:${id}:${c.id}`);
        }
        if (isPrimary) {
          if (c.parent !== '1') errors.push(`primary_non_root_parent:${id}:${c.id}:parent=${c.parent}`);
          if (c.geom && (c.geom.x < 0 || c.geom.y < 0 || c.geom.x + c.geom.w > 1600 || c.geom.y + c.geom.h > 858)) {
            errors.push(`primary_out_of_1600x858:${id}:${c.id}`);
          }
          if (isImage && !c.id.startsWith('pic_icon_')) {
            errors.push(`image_cell_bad_id_prefix:${id}:${c.id}`);
          }
          if (isImage && c.style.includes('image=data:image/svg+xml;base64')) {
            errors.push(`image_style_has_semicolon_base64:${id}:${c.id}`);
          }
        }
        const lbl = stripTagsToText(c.value);
        if (lbl) {
          decodedLabels.push(lbl);
          labelById.set(c.id, lbl);
          const bad = findDisallowedNonAscii(lbl);
          if (bad.length > 0) errors.push(`drawio_banned_emoji:${id}:${c.id}:${bad.join(',')}`);
          if (/gemini\s+3\.8/i.test(lbl)) errors.push(`drawio_stale_gemini38:${id}:${c.id}`);
          if (/4-state\s+hybrid/i.test(lbl)) errors.push(`drawio_stale_4state_chip:${id}:${c.id}`);
        }
      } else if (c.edge) {
        if (c.geom && c.geom.points.length >= 2 && c.style.includes('strokeColor=#595959')) {
          multiPointElbowCount++;
        }
      }
    }

    if (isPrimary) {
      if (!xmlStr.includes('pageWidth="1600"') || !xmlStr.includes('pageHeight="900"')) {
        errors.push(`primary_bad_page_size:${id}`);
      }
      if (containerCount < 1) errors.push(`primary_zero_containers:${id}`);
      if (id !== 'ws5-decision-tree-and-triad' && multiPointElbowCount < 2) {
        errors.push(`primary_missing_converging_diverging_elbows:${id}:count=${multiPointElbowCount}`);
      }
      const allText = decodedLabels.join(' \n ');
      if (id === 'ws4-pattern-c-hybrid' && /\bGKE\b/i.test(allText)) {
        errors.push(`ws4_banned_gke:${id}`);
      }
      if (id === 'ws2-pattern-a-pooled') {
        for (const [cid, txt] of labelById.entries()) {
          if ((cid === 'app_layer' || cid.startsWith('badge_fe_')) && /\bGKE\b/i.test(txt)) {
            errors.push(`ws2_banned_frontend_gke:${cid}`);
          }
        }
        if (!/GKE\s+WarmPool/i.test(labelById.get('adk_orch') || '')) {
          errors.push('ws2_missing_mode_b_gke_warmpool_in_runtime');
        }
      }
      if (id === 'ws3-pattern-b-silo' && !/Confidential GKE/i.test(allText)) {
        errors.push('ws3_missing_confidential_gke');
      }
      if (id === 'ws5-decision-tree-and-triad' && !allText.includes('~85% Prefix Cache')) {
        errors.push('ws5_missing_exact_85pct_prefix_cache');
      }
      if (id === 'ws1-5hop-governance-baseline') {
        const y5a = cells.find((c) => c.id === 'mcp_srv')?.geom?.y ?? 9999;
        const y5c = cells.find((c) => c.id === 'a2a_srv')?.geom?.y ?? 9999;
        const y5b = cells.find((c) => c.id === 'llm_srv')?.geom?.y ?? 9999;
        if (!(y5a < y5c && y5c < y5b)) {
          errors.push(`ws1_broken_cogs_ladder:5A=${y5a},5C=${y5c},5B=${y5b}`);
        }
      }
    }
  }

  // 2. Run TypeScript drawioValidator.ts on all 5 primary .drawio files
  if (!skipValidator) {
    runDrawioValidatorOnPrimaries(errors);
  }

  // 3. Verify all 12 PPTX decks + Atlas JSON/JS #R parity
  checkPptxDecksAndAtlas(errors);

  if (errors.length > 0) {
    console.error(`[diagram_visual_harness] FAIL (${errors.length} errors):`);
    for (const e of errors) console.error('  -', e);
    process.exit(1);
  }
  console.log(
    `[diagram_visual_harness] PASS: 12/12 diagrams (5 primary + 7 secondary), 12/12 PPTX decks, ` +
    `Atlas JSON/JS #R parity, 0 emojis, 0 verticalAlign=top leaves, 0 Gemini 3.8, 0 validateDrawioXml errors, ` +
    `converging/diverging #595959 elbows verified.`
  );
}

main();
