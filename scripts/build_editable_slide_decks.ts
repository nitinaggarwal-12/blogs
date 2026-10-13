/**
 * 🎞️ PromptCanvas Vision Module — Google Cloud Next '26 Branded Editable Slide Deck Builder
 *
 * Compiles 100% native editable PowerPoint / Google Slides (.pptx) decks across Workstreams 1–5
 * and the Combined Master Program Deck following Google Cloud & Material Design 3 Branding Guidelines:
 *   • Signature Google 4-Color Top Ribbon (#4285F4, #EA4335, #FBBC04, #34A853) + Google Cloud Header Bar
 *   • Executive Keynote Title Slide with live framed blueprint preview & 4 KPI metric cards
 *   • Google Material 3 Bento Card Grid for Executive TL;DR, Narrative Sections & Key Takeaways
 *     (auto-parses bullets into titled cards, numbered badges, and technical component pills)
 *   • 3-Slide Diagram Set per blueprint:
 *       1. 1:1 Master High-Resolution Blueprint Slide
 *       2. 100% Decomposed Native Editable Vector Canvas (64% width) + Stacked Insights Cards (36% width)
 *       3. Google Cloud Component & Role Specification Table Slide
 *   • Assets, Deliverables & Source Lineage Slide
 */

import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

import {
  parseDrawioXmlForPptx,
  cleanHtmlToPlainText,
  renderInlineSvgToPngDataUrl,
  extractStructuredNodeLayout,
  CIRCLED_STEP_DIGITS,
  ParsedMxCell,
} from '../../PromptCanvas/src/lib/export/editablePptxCompiler';

const promptCanvasPkg = fs.existsSync(path.resolve(__dirname, '../../PromptCanvas/package.json'))
  ? path.resolve(__dirname, '../../PromptCanvas/package.json')
  : '/Users/nitinagga/Documents/PromptCanvas/package.json';
const requireFromPromptCanvas = createRequire(promptCanvasPkg);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PptxGenJS: any = requireFromPromptCanvas('pptxgenjs');

const FDE_BLOGS_ROOT = path.resolve(__dirname, '..');
const DIAGRAMS_DIR = path.join(FDE_BLOGS_ROOT, 'diagrams');
const SLIDES_DIR = path.join(FDE_BLOGS_ROOT, 'slides');
const MANIFEST_PATH = path.join(DIAGRAMS_DIR, 'diagrams_manifest.json');

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const RIBBON_H = 0.065;
const HEADER_H = 0.56;

// Official Google Cloud & Material 3 Brand Palette
const G_BLUE = '4285F4';
const G_BLUE_DARK = '1A73E8';
const G_BLUE_DEEP = '174EA6';
const G_BLUE_TINT = 'E8F0FE';

const G_RED = 'EA4335';
const G_RED_DARK = 'D93025';
const G_RED_TINT = 'FCE8E6';

const G_YELLOW = 'FBBC04';
const G_YELLOW_DARK = 'F29900';
const G_YELLOW_TEXT = 'B06000';
const G_YELLOW_TINT = 'FEF7E0';

const G_GREEN = '34A853';
const G_GREEN_DARK = '1E8E3E';
const G_GREEN_DEEP = '0D652D';
const G_GREEN_TINT = 'E6F4EA';

const G_PURPLE = '9334E6';
const G_PURPLE_TINT = 'F3E8FD';

const G_TEAL = '00897B';
const G_TEAL_TINT = 'E0F2F1';

const KEYNOTE_NAVY = '0B1426';
const KEYNOTE_CARD = '132238';
const KEYNOTE_BORDER = '233858';
const NAVY = '0F172A';
const SLATE = '1E293B';
const TEXT_DARK = '202124'; // Google Grey 900
const TEXT_BODY = '3C4043'; // Google Grey 800
const TEXT_MUTED = '5F6368'; // Google Grey 700
const BORDER_GREY = 'DADCE0'; // Google Grey 300
const SURFACE_BG = 'F8FAFC';
const WHITE = 'FFFFFF';

const SERIES_LINE = 'Multi-Tenant Agentic AI on Google Cloud • Gemini Enterprise Agent Platform (GEAP) & ADK 2.0';
const ARCH_CENTER = 'https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system';

interface BrandAccent {
  bar: string;
  tint: string;
  text: string;
  border: string;
}

const GOOGLE_CARD_ACCENTS: BrandAccent[] = [
  { bar: G_BLUE_DARK, tint: G_BLUE_TINT, text: G_BLUE_DEEP, border: 'AECBFA' },
  { bar: G_GREEN_DARK, tint: G_GREEN_TINT, text: G_GREEN_DEEP, border: 'CEEAD6' },
  { bar: G_YELLOW_DARK, tint: G_YELLOW_TINT, text: G_YELLOW_TEXT, border: 'FDE293' },
  { bar: G_RED_DARK, tint: G_RED_TINT, text: 'C5221F', border: 'FAD2CF' },
  { bar: G_PURPLE, tint: G_PURPLE_TINT, text: '681DA8', border: 'D7AEFB' },
  { bar: G_TEAL, tint: G_TEAL_TINT, text: '004D40', border: 'B2DFDB' },
];

interface ManifestItem {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  central_drawio_file?: string;
  central_drawio?: string;
  central_drawio_png?: string;
  vision_metadata?: string;
}

interface DeckSection {
  heading: string;
  bullets: string[];
}

interface DeckDiagram {
  id: string;
  figure: string;
  title: string;
  talkingPoints: string[];
}

interface DeckJson {
  workstream: string;
  deckTitle: string;
  deckSubtitle: string;
  tldr: string[];
  sections: DeckSection[];
  diagrams: DeckDiagram[];
  takeaways: string[];
  callToAction: string;
}

interface DeckSpec {
  key: string;
  label: string;
  fileName: string;
  blogFile: string;
  deckJsonFile: string;
  diagramIds: string[];
  sourceDocs: string[];
}

export const DECKS: DeckSpec[] = [
  {
    key: 'WS1',
    label: 'Workstream 1 • Reference Architecture & Cloud Architecture Center Doc PR',
    fileName: 'ws1-reference-architecture-editable-slides.pptx',
    blogFile: 'blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md',
    deckJsonFile: 'blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.deck.json',
    diagramIds: ['ws1-multi-tenant-taxonomy-overview', 'ws1-cloud-arch-center-5hop-baseline'],
    sourceDocs: [
      'workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md',
      'workstream-1-reference-architecture/1.3-cloud-architecture-center-doc-update-pr.md',
      'workstream-1-reference-architecture/1.4-eap-and-product-gap-tracker.md',
    ],
  },
  {
    key: 'WS2',
    label: 'Workstream 2 • Pattern A — High-Density Pooled Architecture',
    fileName: 'ws2-pattern-a-pooled-editable-slides.pptx',
    blogFile: 'blogs/ws2-pattern-a-pooled-architecture.md',
    deckJsonFile: 'blogs/ws2-pattern-a-pooled-architecture.deck.json',
    diagramIds: [
      'ws2-pattern-a-pooled-5hop-architecture',
      'ws2-pattern-a-breach-defense-sequence',
      'ws2-demo-env-and-3p-auth-sandbox-topology',
      'ws2-terraform-starter-resource-graph',
    ],
    sourceDocs: [
      'workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md',
      'workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py',
      'workstream-2-pattern-a-pooled/2.7-blog-pooled-architecture-governance.md',
    ],
  },
  {
    key: 'WS3',
    label: 'Workstream 3 • Pattern B — Zero-Trust Sovereign Silos',
    fileName: 'ws3-pattern-b-siloed-editable-slides.pptx',
    blogFile: 'blogs/ws3-pattern-b-sovereign-silos.md',
    deckJsonFile: 'blogs/ws3-pattern-b-sovereign-silos.deck.json',
    diagramIds: [
      'ws3-pattern-b-sovereign-silos-architecture',
      'ws3-multi-project-silo-and-cmek-setup-topology',
      'ws3-terraform-silo-blueprint-resource-graph',
    ],
    sourceDocs: [
      'workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md',
      'workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py',
      'workstream-3-pattern-b-siloed/3.7-blog-sovereign-silos.md',
    ],
  },
  {
    key: 'WS4',
    label: 'Workstream 4 • Pattern C — Dynamic Hybrid, PSC & Live Tier Migration',
    fileName: 'ws4-pattern-c-hybrid-editable-slides.pptx',
    blogFile: 'blogs/ws4-pattern-c-hybrid-dynamic-tiering.md',
    deckJsonFile: 'blogs/ws4-pattern-c-hybrid-dynamic-tiering.deck.json',
    diagramIds: [
      'ws4-pattern-c-hybrid-psc-and-migration',
      'ws4-hub-and-spoke-demo-env-setup-topology',
      'ws4-zero-downtime-tier-upgrade-sequence',
      'ws4-terraform-hybrid-psc-blueprint-resource-graph',
    ],
    sourceDocs: [
      'workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md',
      'workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite',
      'workstream-4-pattern-c-hybrid/4.7-blog-dynamic-tiering-and-migration.md',
    ],
  },
  {
    key: 'WS5',
    label: 'Workstream 5 • Decision Guide, Agentic Triad & Program Wrap-up',
    fileName: 'ws5-wrap-up-editable-slides.pptx',
    blogFile: 'blogs/ws5-decision-guide-and-agentic-triad.md',
    deckJsonFile: 'blogs/ws5-decision-guide-and-agentic-triad.deck.json',
    diagramIds: ['ws5-decision-tree-and-agentic-triad'],
    sourceDocs: [
      'workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md',
      'workstream-5-wrap-up-and-backlog/5.2-blog-multi-tenant-agentic-triad.md',
    ],
  },
];

const COMBINED_FILE = 'geap-multi-tenancy-all-workstreams-editable-slides.pptx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pptx = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Slide = any;

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

function fileToDataUri(absPath: string): string {
  const buf = fs.readFileSync(absPath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

function normalizeHexColor(colorStr: string | undefined, fallback: string): string {
  if (!colorStr || colorStr === 'none' || colorStr === 'transparent') return fallback;
  let clean = colorStr.replace('#', '').trim().toUpperCase();
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  if (/^[0-9A-F]{6}$/.test(clean)) {
    return clean;
  }
  return fallback;
}

function isDarkColor(hex: string): boolean {
  const clean = normalizeHexColor(hex, 'FFFFFF');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.52;
}

function fallbackDeckJson(spec: DeckSpec, manifest: ManifestItem[]): DeckJson {
  const items = spec.diagramIds.map((id) => manifest.find((m) => m.id === id)!).filter(Boolean);
  return {
    workstream: spec.key,
    deckTitle: spec.label,
    deckSubtitle: items[0]?.subtitle || SERIES_LINE,
    tldr: items.map((i) => `${i.badge}: ${i.title}`),
    sections: [],
    diagrams: items.map((i, idx) => ({
      id: i.id,
      figure: `Figure ${idx + 1}`,
      title: i.title,
      talkingPoints: [i.subtitle],
    })),
    takeaways: [],
    callToAction: `Read the full blog: ${spec.blogFile}`,
  };
}

// ---------------------------------------------------------------------------------------------
// Google Cloud Branded Header, 4-Color Ribbon & Smart Bullet Parser
// ---------------------------------------------------------------------------------------------

function addGoogleFourColorRibbon(pptx: Pptx, slide: Slide, y: number = 0, h: number = RIBBON_H) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y, w: 5.2, h, fill: { color: G_BLUE } });
  slide.addShape(pptx.ShapeType.rect, { x: 5.2, y, w: 2.7, h, fill: { color: G_RED } });
  slide.addShape(pptx.ShapeType.rect, { x: 7.9, y, w: 2.4, h, fill: { color: G_YELLOW } });
  slide.addShape(pptx.ShapeType.rect, { x: 10.3, y, w: SLIDE_W - 10.3, h, fill: { color: G_GREEN } });
}

function addGoogleFourColorDots(pptx: Pptx, slide: Slide, startX: number, centerY: number) {
  const colors = [G_BLUE, G_RED, G_YELLOW, G_GREEN];
  const d = 0.095;
  const gap = 0.125;
  colors.forEach((c, idx) => {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: Number((startX + idx * gap).toFixed(3)),
      y: Number((centerY - d / 2).toFixed(3)),
      w: d,
      h: d,
      fill: { color: c },
    });
  });
}

function addHeaderBar(pptx: Pptx, slide: Slide, kicker: string, title: string, rightBadge?: string) {
  // Clean white Google Cloud top navigation bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: RIBBON_H,
    w: SLIDE_W,
    h: HEADER_H - RIBBON_H,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 0.75 },
  });
  addGoogleFourColorRibbon(pptx, slide, 0, RIBBON_H);
  addGoogleFourColorDots(pptx, slide, 0.35, RIBBON_H + (HEADER_H - RIBBON_H) / 2);

  // Google Cloud Brand Label
  slide.addText(
    [
      { text: 'Google Cloud  ', options: { fontSize: 10.5, bold: true, color: TEXT_DARK } },
      { text: 'Architecture Center', options: { fontSize: 10, color: TEXT_MUTED } },
    ],
    { x: 0.9, y: RIBBON_H + 0.07, w: 2.85, h: 0.34, valign: 'middle', fontFace: 'Arial' }
  );

  // Workstream Pill Badge
  const kickerClean = kicker.toUpperCase();
  const pillW = Math.max(0.85, Math.min(2.1, kickerClean.length * 0.09 + 0.32));
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 3.75,
    y: RIBBON_H + 0.11,
    w: pillW,
    h: 0.27,
    rectRadius: 0.06,
    fill: { color: G_BLUE_TINT },
    line: { color: 'AECBFA', width: 0.75 },
  });
  slide.addText(kickerClean, {
    x: 3.75,
    y: RIBBON_H + 0.11,
    w: pillW,
    h: 0.27,
    fontSize: 8.5,
    bold: true,
    color: G_BLUE_DEEP,
    align: 'center',
    valign: 'middle',
    fontFace: 'Arial',
  });

  // Slide Title in Header
  const titleX = Number((3.75 + pillW + 0.18).toFixed(3));
  const badgeText = rightBadge || 'GEAP & ADK 2.0 • 100% EDITABLE';
  const rightPillW = 2.45;
  slide.addText(title, {
    x: titleX,
    y: RIBBON_H + 0.08,
    w: Number((SLIDE_W - titleX - rightPillW - 0.5).toFixed(3)),
    h: 0.32,
    fontSize: 10,
    bold: true,
    color: TEXT_BODY,
    valign: 'middle',
    fontFace: 'Arial',
  });

  // Right-hand Editable Canvas Verification Pill
  slide.addShape(pptx.ShapeType.roundRect, {
    x: SLIDE_W - rightPillW - 0.35,
    y: RIBBON_H + 0.11,
    w: rightPillW,
    h: 0.27,
    rectRadius: 0.06,
    fill: { color: G_GREEN_TINT },
    line: { color: 'CEEAD6', width: 0.75 },
  });
  slide.addText(badgeText, {
    x: SLIDE_W - rightPillW - 0.35,
    y: RIBBON_H + 0.11,
    w: rightPillW,
    h: 0.27,
    fontSize: 7.5,
    bold: true,
    color: G_GREEN_DEEP,
    align: 'center',
    valign: 'middle',
    fontFace: 'Arial',
  });
}

function addFooter(pptx: Pptx, slide: Slide, text: string) {
  slide.addText(
    [
      { text: 'GOOGLE CLOUD ENTERPRISE ARCHITECTURE  •  ', options: { fontSize: 7.5, bold: true, color: G_BLUE_DARK } },
      { text, options: { fontSize: 7.5, color: TEXT_MUTED } },
    ],
    {
      x: 0.4,
      y: SLIDE_H - 0.28,
      w: SLIDE_W - 0.8,
      h: 0.22,
      fontFace: 'Arial',
      align: 'left',
      valign: 'middle',
    }
  );
}

interface ParsedBulletCard {
  title: string;
  body: string;
  tags: string[];
}

function parseBulletIntoCard(raw: string, index: number): ParsedBulletCard {
  const clean = raw.replace(/\s+/g, ' ').trim();
  let title = '';
  let body = clean;

  const colonIdx = clean.indexOf(':');
  const semiIdx = clean.indexOf(';');
  if (colonIdx > 2 && colonIdx <= 54) {
    title = clean.slice(0, colonIdx).trim();
    body = clean.slice(colonIdx + 1).trim();
  } else if (semiIdx > 8 && semiIdx <= 62) {
    title = clean.slice(0, semiIdx).trim();
    body = clean.slice(semiIdx + 1).trim();
  } else {
    const words = clean.split(' ');
    title = words.slice(0, Math.min(6, words.length)).join(' ').replace(/[,.;:]$/, '');
    body = clean;
  }

  // Capitalize first letter of body and title
  if (title.length > 0) title = title[0].toUpperCase() + title.slice(1);
  if (body.length > 0) body = body[0].toUpperCase() + body.slice(1);

  // Extract technical tags from the bullet for the bottom chip bar
  const tagCandidates = [
    'Pattern A Pooled',
    'Pattern B Sovereign Silos',
    'Pattern C Dynamic Hybrid',
    'Cloud Armor + IAP',
    'RFC 8693 OBO',
    'RFC 9449 DPoP',
    'Model Armor',
    'Sensitive Data Protection',
    'AlloyDB RLS',
    'ContextCacheConfig',
    '90% COGS Savings',
    'VPC-SC Perimeter',
    'IAM PAB',
    'Cloud KMS CMEK',
    'Gemma 3 27B',
    'Private Service Connect',
    'Gemini 2.5 Pro',
    'ADK 2.0',
    'GEAP Registry',
    'gVisor Sandbox',
    '5-Level Memory Bank',
    'Entra ID 3LO',
    'Google OIDC',
    'Zero-Downtime Migration',
    '5-Hop Context Chain',
    'Q4 2026 EAP',
  ];
  const foundTags: string[] = [];
  const lower = clean.toLowerCase();
  for (const cand of tagCandidates) {
    if (lower.includes(cand.toLowerCase().split(' ')[0]) && foundTags.length < 2) {
      if (
        (cand.includes('Pattern A') && lower.includes('pattern a')) ||
        (cand.includes('Pattern B') && lower.includes('pattern b')) ||
        (cand.includes('Pattern C') && lower.includes('pattern c')) ||
        (cand.includes('Cloud Armor') && lower.includes('cloud armor')) ||
        (cand.includes('RFC 8693') && (lower.includes('8693') || lower.includes('obo'))) ||
        (cand.includes('DPoP') && lower.includes('dpop')) ||
        (cand.includes('Model Armor') && lower.includes('model armor')) ||
        (cand.includes('AlloyDB') && (lower.includes('alloydb') || lower.includes('rls'))) ||
        (cand.includes('ContextCacheConfig') && lower.includes('cache')) ||
        (cand.includes('VPC-SC') && lower.includes('vpc-sc')) ||
        (cand.includes('CMEK') && lower.includes('cmek')) ||
        (cand.includes('PSC') && lower.includes('psc')) ||
        (cand.includes('5-Hop') && lower.includes('5-hop')) ||
        (cand.includes('EAP') && lower.includes('eap')) ||
        (cand.includes('gVisor') && lower.includes('gvisor')) ||
        (cand.includes('Entra') && lower.includes('entra'))
      ) {
        foundTags.push(cand);
      }
    }
  }
  if (foundTags.length === 0) {
    const fallbackTags = [
      'Edge & Identity PEP',
      'Catalog & Registry PDP',
      'Runtime & Memory Isolation',
      'Guardrails & DLP Redaction',
      'Transactional RLS & OTel',
    ];
    foundTags.push(fallbackTags[index % fallbackTags.length]);
  }

  return { title, body, tags: foundTags };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sharpInstance: any = (() => {
  try {
    const s = requireFromPromptCanvas('sharp');
    return s.default || s;
  } catch {
    return null;
  }
})();

async function rasterizeSvgIcon(svgOrDataUrl: string, widthPx: number = 128, heightPx: number = 128): Promise<string | null> {
  if (!svgOrDataUrl) return null;
  let clean = svgOrDataUrl.trim();
  if (clean.startsWith('data:image/png') || clean.startsWith('data:image/jpeg')) {
    return clean;
  }
  if (clean.startsWith('data:image/svg+xml')) {
    const commaIdx = clean.indexOf(',');
    if (commaIdx !== -1) {
      const header = clean.slice(0, commaIdx);
      const payload = clean.slice(commaIdx + 1);
      if (header.includes('base64')) {
        clean = Buffer.from(payload, 'base64').toString('utf-8');
      } else {
        try {
          clean = decodeURIComponent(payload);
        } catch {
          clean = payload;
        }
      }
    }
  }
  if (!clean.includes('xmlns=')) {
    clean = clean.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  clean = clean.replace(/<svg\b([^>]*)>/i, (_m, attrs) => {
    const stripped = attrs.replace(/\s+(?:width|height)\s*=\s*["'][^"']*["']/gi, '');
    return `<svg${stripped} width="${widthPx}" height="${heightPx}">`;
  });
  if (sharpInstance) {
    try {
      const pngBuf = await sharpInstance(Buffer.from(clean, 'utf-8')).resize(widthPx, heightPx).png().toBuffer();
      return `data:image/png;base64,${pngBuf.toString('base64')}`;
    } catch {
      // fall through
    }
  }
  return renderInlineSvgToPngDataUrl(svgOrDataUrl, widthPx, heightPx);
}

function extractInlineImgSrc(htmlValue: string | undefined): string | undefined {
  if (!htmlValue) return undefined;
  const decoded = htmlValue
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  const m = decoded.match(/<img[^>]+src=["'](data:image\/[^"']+)["']/i);
  return m ? m[1] : undefined;
}

function getPngDimensionsFromDataUri(dataUri: string): { width: number; height: number } | null {
  try {
    const commaIdx = dataUri.indexOf(',');
    if (commaIdx === -1) return null;
    const b64 = dataUri.slice(commaIdx + 1);
    const buf = Buffer.from(b64, 'base64');
    if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      if (width > 0 && height > 0) return { width, height };
    }
  } catch {
    // ignore
  }
  return null;
}

function addImagePreservingAspect(
  slide: Slide,
  dataUri: string,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
) {
  const dims = getPngDimensionsFromDataUri(dataUri);
  if (!dims) {
    slide.addImage({ data: dataUri, x: boxX, y: boxY, w: boxW, h: boxH });
    return;
  }
  const imgRatio = dims.width / dims.height;
  const boxRatio = boxW / boxH;
  let fitW = boxW;
  let fitH = boxH;
  if (imgRatio > boxRatio) {
    fitW = boxW;
    fitH = boxW / imgRatio;
  } else {
    fitH = boxH;
    fitW = boxH * imgRatio;
  }
  const fitX = Number((boxX + (boxW - fitW) / 2).toFixed(3));
  const fitY = Number((boxY + (boxH - fitH) / 2).toFixed(3));
  slide.addImage({
    data: dataUri,
    x: fitX,
    y: fitY,
    w: Number(fitW.toFixed(3)),
    h: Number(fitH.toFixed(3)),
  });
}

function normalizeDrawioHtmlForSlides(rawHtml: string | undefined): string {
  if (!rawHtml) return '';
  let norm = rawHtml;
  // Flatten <br/> inside <b>...</b> so multi-word bold titles stay on one clean title line
  norm = norm.replace(/<b\b([^>]*)>([\s\S]*?)<\/b>/gi, (_m, attrs, inner) => {
    const flatInner = String(inner).replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
    return `<b${attrs}>${flatInner}</b>`;
  });
  // Ensure block boundaries between </b> and <span, </div> and <div, </span> and <span
  norm = norm
    .replace(/<\/b>\s*(?!<br\b)(<span\b|<div\b|<font\b)/gi, '</b><br/>$1')
    .replace(/<\/div>\s*(?!<br\b)(<div\b|<span\b|<b\b)/gi, '</div><br/>$1')
    .replace(/<\/span>\s*(?!<br\b)(<span\b|<div\b|<b\b)/gi, '</span><br/>$1');
  return norm;
}

// ---------------------------------------------------------------------------------------------
// Slide Builders: Executive Title, Bento Narrative Grid, Section Divider & Assets
// ---------------------------------------------------------------------------------------------

function addTitleSlide(pptx: Pptx, deck: DeckJson, spec: DeckSpec | null, manifest: ManifestItem[]) {
  const slide = pptx.addSlide();
  slide.background = { color: KEYNOTE_NAVY };
  addGoogleFourColorRibbon(pptx, slide, 0, 0.085);

  // Subtle decorative background geometry card
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.5,
    y: 0.42,
    w: 7.35,
    h: 5.55,
    rectRadius: 0.1,
    fill: { color: KEYNOTE_CARD },
    line: { color: KEYNOTE_BORDER, width: 1 },
  });
  // Left Google Blue accent bar on hero card
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: 0.42,
    w: 0.12,
    h: 5.55,
    fill: { color: G_BLUE },
  });

  // Google Cloud 4-color dots + Keynote Kicker Badge
  addGoogleFourColorDots(pptx, slide, 0.85, 0.82);
  slide.addText('GOOGLE CLOUD NEXT ’26  •  ENTERPRISE AGENTIC ARCHITECTURE', {
    x: 1.45,
    y: 0.68,
    w: 6.1,
    h: 0.28,
    fontSize: 9.5,
    bold: true,
    color: '8AB4F8',
    fontFace: 'Arial',
    valign: 'middle',
  });

  // Workstream Pill
  const wsBadgeText = spec ? spec.label.toUpperCase() : 'COMPLETE PROGRAM DECK • WORKSTREAMS 1–5';
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.85,
    y: 1.08,
    w: 6.7,
    h: 0.34,
    rectRadius: 0.06,
    fill: { color: '172B4D' },
    line: { color: G_BLUE, width: 0.75 },
  });
  slide.addText(wsBadgeText, {
    x: 0.95,
    y: 1.08,
    w: 6.5,
    h: 0.34,
    fontSize: 9,
    bold: true,
    color: 'E8F0FE',
    valign: 'middle',
    fontFace: 'Arial',
  });

  // Main Deck Title
  slide.addText(deck.deckTitle, {
    x: 0.85,
    y: 1.56,
    w: 6.75,
    h: 1.85,
    fontSize: 24,
    bold: true,
    color: WHITE,
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  });

  // Subtitle
  slide.addText(deck.deckSubtitle, {
    x: 0.85,
    y: 3.45,
    w: 6.75,
    h: 0.95,
    fontSize: 12.5,
    color: 'CBD5E1',
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  });

  // 3 Pattern Pillar Mini-Badges inside the Hero Card
  const pillars = [
    { label: 'Pattern A • Pooled SaaS', sub: 'Shared Runtime + 90% Cache Save', color: G_BLUE },
    { label: 'Pattern B • Sovereign Silos', sub: 'VPC-SC + CMEK + Gemma 3 Air-Gap', color: G_GREEN },
    { label: 'Pattern C • Dynamic Hybrid', sub: 'PSC Spokes + Live Tier Upgrade', color: G_YELLOW },
  ];
  pillars.forEach((p, idx) => {
    const px = 0.85 + idx * 2.26;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: px,
      y: 4.58,
      w: 2.14,
      h: 1.12,
      rectRadius: 0.06,
      fill: { color: KEYNOTE_NAVY },
      line: { color: p.color, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: px,
      y: 4.58,
      w: 2.14,
      h: 0.06,
      fill: { color: p.color },
    });
    slide.addText(p.label, {
      x: px + 0.1,
      y: 4.7,
      w: 1.94,
      h: 0.34,
      fontSize: 9.5,
      bold: true,
      color: WHITE,
      fontFace: 'Arial',
      valign: 'middle',
    });
    slide.addText(p.sub, {
      x: px + 0.1,
      y: 5.06,
      w: 1.94,
      h: 0.54,
      fontSize: 8.2,
      color: '94A3B8',
      fontFace: 'Arial',
      valign: 'top',
      wrap: true,
    });
  });

  // Right Column: Framed Hero Blueprint Card showing the workstream's primary diagram
  const primaryDiagramId = spec ? spec.diagramIds[0] : 'ws1-multi-tenant-taxonomy-overview';
  const primaryManifest = manifest.find((m) => m.id === primaryDiagramId);
  const pngPath = primaryManifest
    ? path.join(FDE_BLOGS_ROOT, primaryManifest.central_drawio_png || `diagrams/${primaryManifest.id}.drawio.png`)
    : '';

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 8.05,
    y: 0.42,
    w: 4.78,
    h: 5.55,
    rectRadius: 0.1,
    fill: { color: WHITE },
    line: { color: G_BLUE, width: 1.5 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 8.05,
    y: 0.42,
    w: 4.78,
    h: 0.42,
    fill: { color: G_BLUE_TINT },
  });
  slide.addText('100% NATIVE EDITABLE ARCHITECTURE BLUEPRINT', {
    x: 8.2,
    y: 0.45,
    w: 4.48,
    h: 0.36,
    fontSize: 8.5,
    bold: true,
    color: G_BLUE_DEEP,
    align: 'center',
    valign: 'middle',
    fontFace: 'Arial',
  });
  if (pngPath && fs.existsSync(pngPath)) {
    addImagePreservingAspect(slide, fileToDataUri(pngPath), 8.18, 0.92, 4.52, 4.45);
  }
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 8.2,
    y: 5.45,
    w: 4.48,
    h: 0.38,
    rectRadius: 0.05,
    fill: { color: G_GREEN_TINT },
    line: { color: 'CEEAD6', width: 0.75 },
  });
  slide.addText('PromptCanvas Vision AST → Decomposed Native PPTX Shapes', {
    x: 8.2,
    y: 5.45,
    w: 4.48,
    h: 0.38,
    fontSize: 8,
    bold: true,
    color: G_GREEN_DEEP,
    align: 'center',
    valign: 'middle',
    fontFace: 'Arial',
  });

  // Bottom 4-Card KPI Ribbon
  const kpis = [
    { val: '100% Editable', lbl: 'Native PPTX & Google Slides Shapes, Icons & Connectors', color: G_BLUE },
    { val: '5-Hop Chain', lbl: 'Edge OBO+DPoP → Registry PDP → Sandbox → Model Armor → RLS', color: G_GREEN },
    { val: '12/12 PASS', lbl: 'Automated Deep Forensic Audit & Schema Verification', color: G_YELLOW },
    { val: '20/20 PASS', lbl: 'Live Breach Defense, Silo CMEK & Zero-Downtime Upgrade Sims', color: G_RED },
  ];
  kpis.forEach((k, idx) => {
    const kx = 0.5 + idx * 3.12;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: kx,
      y: 6.14,
      w: 2.97,
      h: 1.02,
      rectRadius: 0.07,
      fill: { color: KEYNOTE_CARD },
      line: { color: KEYNOTE_BORDER, width: 0.75 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: kx,
      y: 6.14,
      w: 0.09,
      h: 1.02,
      fill: { color: k.color },
    });
    slide.addText(k.val, {
      x: kx + 0.18,
      y: 6.22,
      w: 2.68,
      h: 0.34,
      fontSize: 13,
      bold: true,
      color: WHITE,
      fontFace: 'Arial',
      valign: 'middle',
    });
    slide.addText(k.lbl, {
      x: kx + 0.18,
      y: 6.56,
      w: 2.68,
      h: 0.52,
      fontSize: 8.2,
      color: '94A3B8',
      fontFace: 'Arial',
      valign: 'top',
      wrap: true,
    });
  });

  slide.addNotes(`${deck.deckTitle}\n\n${deck.deckSubtitle}\n\nSeries: ${SERIES_LINE}`);
  return slide;
}

function addBulletSlide(
  pptx: Pptx,
  kicker: string,
  heading: string,
  bullets: string[],
  opts: { notes?: string; footer?: string; accent?: string; isTakeaways?: boolean } = {}
) {
  const slide = pptx.addSlide();
  slide.background = { color: SURFACE_BG };
  const isTakeaways = Boolean(opts.isTakeaways) || heading.toLowerCase().includes('takeaway');
  const isTldr = heading.toLowerCase().includes('tl;dr');
  const primaryAccent = opts.accent || (isTakeaways ? G_GREEN_DARK : G_BLUE_DARK);

  addHeaderBar(
    pptx,
    slide,
    kicker,
    heading,
    isTakeaways ? 'EXECUTIVE MANDATES • EDITABLE' : isTldr ? 'EXECUTIVE SUMMARY • EDITABLE' : 'ARCHITECTURE DEEP DIVE'
  );

  // Top Section Title Banner Card
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4,
    y: HEADER_H + 0.14,
    w: SLIDE_W - 0.8,
    h: 0.76,
    rectRadius: 0.07,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 0.75 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4,
    y: HEADER_H + 0.14,
    w: 0.11,
    h: 0.76,
    fill: { color: primaryAccent },
  });

  const subKicker = isTakeaways
    ? 'KEY ARCHITECTURAL TAKEAWAYS & PRODUCTION CHECKLIST'
    : isTldr
      ? 'EXECUTIVE SUMMARY • CORE MULTI-TENANT GOVERNANCE PILLARS'
      : 'GOOGLE CLOUD ENTERPRISE REFERENCE ARCHITECTURE • TECHNICAL BREAKDOWN';

  slide.addText(subKicker, {
    x: 0.65,
    y: HEADER_H + 0.2,
    w: 8.5,
    h: 0.22,
    fontSize: 8.5,
    bold: true,
    color: primaryAccent,
    fontFace: 'Arial',
    valign: 'middle',
  });
  slide.addText(heading, {
    x: 0.65,
    y: HEADER_H + 0.41,
    w: 9.2,
    h: 0.42,
    fontSize: 18.5,
    bold: true,
    color: TEXT_DARK,
    fontFace: 'Arial',
    valign: 'middle',
  });

  // Right-side count pill inside Title Banner
  const countBadgeW = 2.55;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: SLIDE_W - countBadgeW - 0.6,
    y: HEADER_H + 0.32,
    w: countBadgeW,
    h: 0.38,
    rectRadius: 0.06,
    fill: { color: isTakeaways ? G_GREEN_TINT : G_BLUE_TINT },
    line: { color: isTakeaways ? 'CEEAD6' : 'AECBFA', width: 0.75 },
  });
  slide.addText(`${bullets.length} Native Editable Bento Cards`, {
    x: SLIDE_W - countBadgeW - 0.6,
    y: HEADER_H + 0.32,
    w: countBadgeW,
    h: 0.38,
    fontSize: 9,
    bold: true,
    color: isTakeaways ? G_GREEN_DEEP : G_BLUE_DEEP,
    align: 'center',
    valign: 'middle',
    fontFace: 'Arial',
  });

  // Bento Card Grid Geometry
  const gridTop = HEADER_H + 1.04;
  const gridBottom = SLIDE_H - 0.96; // Reserve bottom for Callout Ribbon + Footer
  const availH = gridBottom - gridTop;
  const leftMargin = 0.4;
  const availW = SLIDE_W - leftMargin * 2;
  const gapX = 0.22;
  const gapY = 0.2;

  const parsedCards = bullets.map((b, i) => parseBulletIntoCard(b, i));
  const n = parsedCards.length;

  // Compute per-card (x, y, w, h) in a responsive Google Material 3 Bento Grid
  const cardRects: { x: number; y: number; w: number; h: number }[] = [];
  if (n <= 3) {
    const colW = (availW - gapX * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      cardRects.push({ x: leftMargin + i * (colW + gapX), y: gridTop, w: colW, h: availH });
    }
  } else if (n === 4) {
    const colW = (availW - gapX) / 2;
    const rowH = (availH - gapY) / 2;
    for (let i = 0; i < 4; i++) {
      const r = Math.floor(i / 2);
      const c = i % 2;
      cardRects.push({
        x: leftMargin + c * (colW + gapX),
        y: gridTop + r * (rowH + gapY),
        w: colW,
        h: rowH,
      });
    }
  } else if (n === 5) {
    // Row 1: 3 cards, Row 2: 2 wider cards
    const row1H = availH * 0.51 - gapY / 2;
    const row2H = availH * 0.49 - gapY / 2;
    const colW3 = (availW - gapX * 2) / 3;
    const colW2 = (availW - gapX) / 2;
    for (let i = 0; i < 3; i++) {
      cardRects.push({
        x: leftMargin + i * (colW3 + gapX),
        y: gridTop,
        w: colW3,
        h: row1H,
      });
    }
    for (let i = 0; i < 2; i++) {
      cardRects.push({
        x: leftMargin + i * (colW2 + gapX),
        y: gridTop + row1H + gapY,
        w: colW2,
        h: row2H,
      });
    }
  } else {
    // 6+ cards: 3 columns x 2 rows
    const cols = 3;
    const rows = Math.ceil(n / cols);
    const colW = (availW - gapX * (cols - 1)) / cols;
    const rowH = (availH - gapY * (rows - 1)) / rows;
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      cardRects.push({
        x: leftMargin + c * (colW + gapX),
        y: gridTop + r * (rowH + gapY),
        w: colW,
        h: rowH,
      });
    }
  }

  parsedCards.forEach((card, idx) => {
    const rect = cardRects[idx];
    const accent = GOOGLE_CARD_ACCENTS[idx % GOOGLE_CARD_ACCENTS.length];
    const cx = Number(rect.x.toFixed(3));
    const cy = Number(rect.y.toFixed(3));
    const cw = Number(rect.w.toFixed(3));
    const ch = Number(rect.h.toFixed(3));

    // Card Surface
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx,
      y: cy,
      w: cw,
      h: ch,
      rectRadius: 0.08,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 1 },
    });

    // Top Colored Accent Stripe
    slide.addShape(pptx.ShapeType.rect, {
      x: cx,
      y: cy,
      w: cw,
      h: 0.065,
      fill: { color: accent.bar },
    });

    // Numbered Step Pill Badge (01, 02, ...)
    const numStr = String(idx + 1).padStart(2, '0');
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((cx + 0.16).toFixed(3)),
      y: Number((cy + 0.16).toFixed(3)),
      w: 0.42,
      h: 0.32,
      rectRadius: 0.06,
      fill: { color: accent.tint },
      line: { color: accent.border, width: 0.75 },
    });
    slide.addText(numStr, {
      x: Number((cx + 0.16).toFixed(3)),
      y: Number((cy + 0.16).toFixed(3)),
      w: 0.42,
      h: 0.32,
      fontSize: 10,
      bold: true,
      color: accent.text,
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial',
    });

    // Card Title
    slide.addText(card.title, {
      x: Number((cx + 0.66).toFixed(3)),
      y: Number((cy + 0.14).toFixed(3)),
      w: Number((cw - 0.82).toFixed(3)),
      h: 0.42,
      fontSize: cw > 4.5 ? 12.5 : 11.5,
      bold: true,
      color: TEXT_DARK,
      fontFace: 'Arial',
      valign: 'middle',
      wrap: true,
    });

    // Subtle divider line inside card
    slide.addShape(pptx.ShapeType.rect, {
      x: Number((cx + 0.16).toFixed(3)),
      y: Number((cy + 0.6).toFixed(3)),
      w: Number((cw - 0.32).toFixed(3)),
      h: 0.012,
      fill: { color: 'F1F5F9' },
    });

    // Card Body Description
    const bodyH = Math.max(0.55, ch - 1.08);
    slide.addText(card.body, {
      x: Number((cx + 0.16).toFixed(3)),
      y: Number((cy + 0.66).toFixed(3)),
      w: Number((cw - 0.32).toFixed(3)),
      h: Number(bodyH.toFixed(3)),
      fontSize: cw > 4.5 ? 11 : 10.2,
      color: TEXT_BODY,
      fontFace: 'Arial',
      valign: 'top',
      wrap: true,
    });

    // Bottom Technical Component Tag Pill inside card
    const tagStr = card.tags.join('  •  ');
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((cx + 0.16).toFixed(3)),
      y: Number((cy + ch - 0.36).toFixed(3)),
      w: Number((cw - 0.32).toFixed(3)),
      h: 0.25,
      rectRadius: 0.05,
      fill: { color: accent.tint },
    });
    slide.addText(tagStr, {
      x: Number((cx + 0.22).toFixed(3)),
      y: Number((cy + ch - 0.36).toFixed(3)),
      w: Number((cw - 0.44).toFixed(3)),
      h: 0.25,
      fontSize: 8,
      bold: true,
      color: accent.text,
      valign: 'middle',
      fontFace: 'Arial',
    });
  });

  // Bottom Executive Callout / Next-Step Banner
  const bannerY = SLIDE_H - 0.82;
  const bannerFill = isTakeaways ? G_GREEN_DEEP : KEYNOTE_NAVY;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4,
    y: bannerY,
    w: SLIDE_W - 0.8,
    h: 0.46,
    rectRadius: 0.06,
    fill: { color: bannerFill },
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.52,
    y: bannerY + 0.08,
    w: 1.95,
    h: 0.3,
    rectRadius: 0.05,
    fill: { color: isTakeaways ? G_GREEN : G_BLUE },
  });
  slide.addText(isTakeaways ? 'NEXT STEP / ACTION' : 'ARCHITECTURAL MANDATE', {
    x: 0.52,
    y: bannerY + 0.08,
    w: 1.95,
    h: 0.3,
    fontSize: 8,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: 'Arial',
  });
  slide.addText(opts.footer || SERIES_LINE, {
    x: 2.6,
    y: bannerY + 0.06,
    w: SLIDE_W - 3.15,
    h: 0.34,
    fontSize: 9.5,
    bold: true,
    color: WHITE,
    valign: 'middle',
    fontFace: 'Arial',
  });

  addFooter(pptx, slide, SERIES_LINE);
  slide.addNotes(opts.notes || `${heading}\n\n${bullets.map((b) => `• ${b}`).join('\n')}`);
  return slide;
}

function addSectionDivider(pptx: Pptx, kicker: string, heading: string, sub: string) {
  const slide = pptx.addSlide();
  slide.background = { color: KEYNOTE_NAVY };
  addGoogleFourColorRibbon(pptx, slide, 0, 0.085);

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.7,
    y: 1.35,
    w: SLIDE_W - 1.4,
    h: 4.8,
    rectRadius: 0.12,
    fill: { color: KEYNOTE_CARD },
    line: { color: G_BLUE, width: 1.25 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.7,
    y: 1.35,
    w: 0.14,
    h: 4.8,
    fill: { color: G_BLUE },
  });

  addGoogleFourColorDots(pptx, slide, 1.15, 1.95);
  slide.addText(`${kicker.toUpperCase()}  •  GOOGLE CLOUD ARCHITECTURE WORKSTREAM`, {
    x: 1.75,
    y: 1.8,
    w: SLIDE_W - 2.8,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: '8AB4F8',
    fontFace: 'Arial',
    valign: 'middle',
  });
  slide.addText(heading, {
    x: 1.15,
    y: 2.35,
    w: SLIDE_W - 2.3,
    h: 1.65,
    fontSize: 28,
    bold: true,
    color: WHITE,
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  });
  slide.addText(sub, {
    x: 1.15,
    y: 4.15,
    w: SLIDE_W - 2.3,
    h: 1.2,
    fontSize: 14,
    color: 'CBD5E1',
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  });
  slide.addNotes(`${heading}\n${sub}`);
  return slide;
}

function addAssetsSlide(pptx: Pptx, spec: DeckSpec | null, deck: DeckJson, manifest: ManifestItem[], diagramIds: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[][] = [
    [
      { text: 'Blueprint ID & Title', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 9.5 } },
      { text: 'Editable Draw.io Source', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 9.5 } },
      { text: 'High-Res PNG Blueprint', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 9.5 } },
      { text: 'PromptCanvas Vision AST', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 9.5 } },
    ],
  ];
  for (let idx = 0; idx < diagramIds.length; idx++) {
    const id = diagramIds[idx];
    const m = manifest.find((x) => x.id === id);
    if (!m) continue;
    const rowBg = idx % 2 === 0 ? WHITE : SURFACE_BG;
    rows.push([
      { text: `${m.badge} — ${m.title}`, options: { fontSize: 8.5, color: TEXT_DARK, bold: true, fill: { color: rowBg } } },
      { text: `diagrams/${id}.drawio`, options: { fontSize: 8.5, color: G_BLUE_DARK, fill: { color: rowBg } } },
      { text: `diagrams/${id}.drawio.png`, options: { fontSize: 8.5, color: G_GREEN_DARK, fill: { color: rowBg } } },
      { text: `diagrams/vision_metadata/${id}.vision.json`, options: { fontSize: 8.5, color: G_PURPLE, fill: { color: rowBg } } },
    ]);
  }
  const slide = pptx.addSlide();
  slide.background = { color: SURFACE_BG };
  addHeaderBar(pptx, slide, spec ? spec.key : 'PROGRAM', 'Assets, Editable Diagrams & Source Lineage', 'VERIFIED DELIVERABLES');

  // Top Banner
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4,
    y: HEADER_H + 0.14,
    w: SLIDE_W - 0.8,
    h: 0.66,
    rectRadius: 0.06,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 0.75 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4,
    y: HEADER_H + 0.14,
    w: 0.1,
    h: 0.66,
    fill: { color: G_BLUE_DARK },
  });
  slide.addText('Editable Architecture Blueprints, Source Blogs & Executable Code Artifacts', {
    x: 0.65,
    y: HEADER_H + 0.22,
    w: SLIDE_W - 1.3,
    h: 0.5,
    fontSize: 16.5,
    bold: true,
    color: TEXT_DARK,
    fontFace: 'Arial',
    valign: 'middle',
  });

  slide.addTable(rows, {
    x: 0.4,
    y: HEADER_H + 0.92,
    w: SLIDE_W - 0.8,
    colW: [4.3, 2.8, 2.8, 2.633],
    border: { type: 'solid', color: BORDER_GREY, pt: 0.75 },
    fill: { color: WHITE },
    fontFace: 'Arial',
  });

  // Bottom 3 Bento Cards for Source Documentation & Links
  const sourceCards = [
    {
      title: '1. Explanatory & Flagship Blogs',
      body: spec ? `Primary Blog: ${spec.blogFile}\nDeck Spec: ${spec.deckJsonFile}` : 'All 5 workstream blogs (blogs/ws1..ws5*.md) & 4 flagship deep-dives',
      accent: GOOGLE_CARD_ACCENTS[0],
    },
    {
      title: '2. Workstream Source Deliverables',
      body: spec ? spec.sourceDocs.join('\n') : 'All 360 verified files across Workstreams 1–5 (Python 5-Hop, Terraform, Codelabs)',
      accent: GOOGLE_CARD_ACCENTS[1],
    },
    {
      title: '3. Reference Architecture & Repo',
      body: `Cloud Architecture Center:\n${ARCH_CENTER}\nGitHub: https://github.com/nitinaggarwal-12/blogs`,
      accent: GOOGLE_CARD_ACCENTS[2],
    },
  ];
  const cardY = SLIDE_H - 2.15;
  const cardW = (SLIDE_W - 0.8 - 0.4) / 3;
  sourceCards.forEach((sc, idx) => {
    const sx = Number((0.4 + idx * (cardW + 0.2)).toFixed(3));
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sx,
      y: cardY,
      w: Number(cardW.toFixed(3)),
      h: 1.65,
      rectRadius: 0.07,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: sx,
      y: cardY,
      w: Number(cardW.toFixed(3)),
      h: 0.06,
      fill: { color: sc.accent.bar },
    });
    slide.addText(sc.title, {
      x: sx + 0.15,
      y: cardY + 0.12,
      w: cardW - 0.3,
      h: 0.32,
      fontSize: 10.5,
      bold: true,
      color: sc.accent.text,
      fontFace: 'Arial',
      valign: 'middle',
    });
    slide.addText(sc.body, {
      x: sx + 0.15,
      y: cardY + 0.46,
      w: cardW - 0.3,
      h: 1.1,
      fontSize: 8.5,
      color: TEXT_BODY,
      fontFace: 'Arial',
      valign: 'top',
      wrap: true,
    });
  });

  addFooter(pptx, slide, deck.callToAction);
  slide.addNotes(deck.callToAction);
  return slide;
}

// ---------------------------------------------------------------------------------------------
// Google Cloud Branded Right-Hand Architectural Walkthrough Sidebar Helper
// ---------------------------------------------------------------------------------------------

function renderDiagramWalkthroughSidebar(
  pptx: Pptx,
  slide: Slide,
  sideX: number,
  sideW: number,
  figureLabel: string,
  diagramTitle: string,
  talkingPoints: string[],
  bottomPillText: string
) {
  const sideTop = HEADER_H + 0.12;

  // Sidebar Header Card
  slide.addShape(pptx.ShapeType.roundRect, {
    x: sideX,
    y: sideTop,
    w: sideW,
    h: 0.78,
    rectRadius: 0.07,
    fill: { color: G_BLUE_TINT },
    line: { color: 'AECBFA', width: 1 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: sideX,
    y: sideTop,
    w: 0.09,
    h: 0.78,
    fill: { color: G_BLUE_DARK },
  });
  slide.addText(`${figureLabel.toUpperCase()} • ARCHITECTURAL WALKTHROUGH`, {
    x: sideX + 0.18,
    y: sideTop + 0.08,
    w: sideW - 0.28,
    h: 0.22,
    fontSize: 8,
    bold: true,
    color: G_BLUE_DEEP,
    fontFace: 'Arial',
  });
  slide.addText(diagramTitle, {
    x: sideX + 0.18,
    y: sideTop + 0.3,
    w: sideW - 0.28,
    h: 0.42,
    fontSize: 10.2,
    bold: true,
    color: TEXT_DARK,
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  });

  // Stacked Talking-Point Cards
  const tpList = talkingPoints.slice(0, 6);
  const tpAreaTop = sideTop + 0.88;
  const tpAreaBottom = SLIDE_H - 0.86;
  const tpAvailH = tpAreaBottom - tpAreaTop;
  const tpGap = 0.07;
  const tpCardH = (tpAvailH - tpGap * (tpList.length - 1)) / Math.max(1, tpList.length);

  tpList.forEach((tp, idx) => {
    const ty = Number((tpAreaTop + idx * (tpCardH + tpGap)).toFixed(3));
    const accent = GOOGLE_CARD_ACCENTS[idx % GOOGLE_CARD_ACCENTS.length];
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sideX,
      y: ty,
      w: sideW,
      h: Number(tpCardH.toFixed(3)),
      rectRadius: 0.06,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 0.75 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: sideX,
      y: ty,
      w: 0.07,
      h: Number(tpCardH.toFixed(3)),
      fill: { color: accent.bar },
    });
    // Badge
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sideX + 0.14,
      y: Number((ty + (tpCardH - 0.24) / 2).toFixed(3)),
      w: 0.26,
      h: 0.24,
      rectRadius: 0.04,
      fill: { color: accent.tint },
    });
    slide.addText(String(idx + 1), {
      x: sideX + 0.14,
      y: Number((ty + (tpCardH - 0.24) / 2).toFixed(3)),
      w: 0.26,
      h: 0.24,
      fontSize: 8,
      bold: true,
      color: accent.text,
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial',
    });
    slide.addText(tp, {
      x: sideX + 0.46,
      y: Number((ty + 0.04).toFixed(3)),
      w: sideW - 0.54,
      h: Number((tpCardH - 0.08).toFixed(3)),
      fontSize: 8.4,
      color: TEXT_BODY,
      fontFace: 'Arial',
      valign: 'middle',
      wrap: true,
    });
  });

  // Bottom Status Pill Card
  slide.addShape(pptx.ShapeType.roundRect, {
    x: sideX,
    y: SLIDE_H - 0.76,
    w: sideW,
    h: 0.42,
    rectRadius: 0.06,
    fill: { color: KEYNOTE_NAVY },
  });
  slide.addText(bottomPillText, {
    x: sideX + 0.12,
    y: SLIDE_H - 0.76,
    w: sideW - 0.24,
    h: 0.42,
    fontSize: 7.8,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: 'Arial',
  });
}

// ---------------------------------------------------------------------------------------------
// Google Cloud Branded 3-Slide Diagram Set (Master + Decomposed Editable + Spec Table)
// ---------------------------------------------------------------------------------------------

async function appendGoogleBrandedDiagramSlides(
  pptx: Pptx,
  xmlContent: string,
  kicker: string,
  figureLabel: string,
  diagramTitle: string,
  blueprintId: string,
  masterImageSrc: string | undefined,
  talkingPoints: string[],
  sourceDrawioRelPath: string
): Promise<{ vertexCount: number; edgeCount: number; slides: number }> {
  const { cells, minX, minY, maxX, maxY, isDarkDiagram, diagramBgHex } = parseDrawioXmlForPptx(xmlContent);

  const vertices = cells
    .filter((c) => c.vertex && (c.width > 0 || c.height > 0))
    .sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return b.width * b.height - a.width * a.height;
    });
  const edges = cells.filter((c) => c.edge);

  // Shared 2-Column Google Cloud Architecture Center Geometry (Left Diagram Card + Right Walkthrough Sidebar)
  const canvasCardX = 0.32;
  const canvasCardY = HEADER_H + 0.12;
  const canvasCardW = 6.18;
  const canvasCardH = SLIDE_H - HEADER_H - 0.46;
  const sideX = 6.66;
  const sideW = SLIDE_W - sideX - 0.32;

  // =========================================================================
  // SLIDE 1 OF 3: 1:1 MASTER HIGH-RESOLUTION BLUEPRINT SLIDE (ZERO STRETCH)
  // =========================================================================
  const masterSlide = pptx.addSlide();
  masterSlide.background = { color: SURFACE_BG };
  addHeaderBar(pptx, masterSlide, kicker, `${figureLabel} — ${diagramTitle}`, '1:1 MASTER BLUEPRINT');

  // Left Framed Blueprint Container Card
  masterSlide.addShape(pptx.ShapeType.roundRect, {
    x: canvasCardX,
    y: canvasCardY,
    w: canvasCardW,
    h: canvasCardH,
    rectRadius: 0.08,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 1 },
  });
  if (masterImageSrc) {
    addImagePreservingAspect(
      masterSlide,
      masterImageSrc,
      canvasCardX + 0.1,
      canvasCardY + 0.08,
      canvasCardW - 0.2,
      canvasCardH - 0.16
    );
  }
  renderDiagramWalkthroughSidebar(
    pptx,
    masterSlide,
    sideX,
    sideW,
    figureLabel,
    diagramTitle,
    talkingPoints,
    `1:1 Aspect-Locked Master PNG • Next Slide: ${vertices.length} Editable Native Shapes`
  );
  addFooter(pptx, masterSlide, `${figureLabel}: ${diagramTitle}  •  Next slide: 100% Decomposed Native Editable Shapes`);

  // =========================================================================
  // SLIDE 2 OF 3: 100% DECOMPOSED NATIVE EDITABLE VECTOR SHAPES + INSIGHTS SIDEBAR
  // =========================================================================
  const slide2 = pptx.addSlide();
  slide2.background = { color: SURFACE_BG };
  addHeaderBar(
    pptx,
    slide2,
    kicker,
    `${figureLabel} — ${diagramTitle} (100% Native Editable Shapes)`,
    `${vertices.length} SHAPES • ${edges.length} CONNECTORS`
  );

  slide2.addShape(pptx.ShapeType.roundRect, {
    x: canvasCardX,
    y: canvasCardY,
    w: canvasCardW,
    h: canvasCardH,
    rectRadius: 0.08,
    fill: { color: isDarkDiagram ? diagramBgHex : WHITE },
    line: { color: BORDER_GREY, width: 1 },
  });

  // Compute effective bounding box of rendered nodes (excluding skipped hdr_title_box & full-bleed bg)
  let effMinX = Infinity;
  let effMinY = Infinity;
  let effMaxX = -Infinity;
  let effMaxY = -Infinity;
  for (const node of vertices) {
    if ((node.id === 'bg' || node.id.includes('bg')) && node.width >= 700 && node.height >= 400) continue;
    const rawFill = node.style.fillColor;
    if (
      node.id === 'hdr_title_box' ||
      (node.id.includes('title') && node.absY < 48 && (!rawFill || rawFill === 'none') && node.width >= 500)
    ) {
      continue;
    }
    effMinX = Math.min(effMinX, node.absX);
    effMinY = Math.min(effMinY, node.absY);
    effMaxX = Math.max(effMaxX, node.absX + node.width);
    effMaxY = Math.max(effMaxY, node.absY + node.height);
  }
  if (!Number.isFinite(effMinX)) {
    effMinX = minX;
    effMinY = minY;
    effMaxX = maxX;
    effMaxY = maxY;
  }
  const effGraphW = Math.max(400, effMaxX - effMinX);
  const effGraphH = Math.max(300, effMaxY - effMinY);

  // Strictly uniform 1:1 scaling (scaleX === scaleY) so Google Slides never stretches shapes horizontally
  const padX = 0.1;
  const padY = 0.08;
  const availW = canvasCardW - padX * 2;
  const availH = canvasCardH - padY * 2;
  const uniformScale = Math.min(availW / effGraphW, availH / effGraphH);
  const scaleX = uniformScale;
  const scaleY = uniformScale;
  const scale = uniformScale;
  const renderedW = effGraphW * scaleX;
  const renderedH = effGraphH * scaleY;
  const offsetX = canvasCardX + padX + (availW - renderedW) / 2;
  const offsetY = canvasCardY + padY + (availH - renderedH) / 2;

  const toSlideX = (x: number) => Number((offsetX + (x - effMinX) * scaleX).toFixed(3));
  const toSlideY = (y: number) => Number((offsetY + (y - effMinY) * scaleY).toFixed(3));
  const toSlideW = (w: number) => Number(Math.max(0.08, w * scaleX).toFixed(3));
  const toSlideH = (h: number) => Number(Math.max(0.08, h * scaleY).toFixed(3));

  const cellMap = new Map<string, ParsedMxCell>();
  cells.forEach((c) => cellMap.set(c.id, c));

  const parentIds = new Set<string>();
  cells.forEach((c) => {
    if (c.parent && c.parent !== '0' && c.parent !== '1') {
      parentIds.add(c.parent);
    }
  });
  for (const outer of vertices) {
    if ((outer.id === 'bg' || outer.id.includes('bg')) && outer.width >= 700 && outer.height >= 400) continue;
    const outerArea = outer.width * outer.height;
    if (outerArea < 12000) continue;
    for (const inner of vertices) {
      if (inner.id === outer.id) continue;
      const innerArea = inner.width * inner.height;
      if (innerArea >= outerArea * 0.85) continue;
      const cx = inner.absX + inner.width / 2;
      const cy = inner.absY + inner.height / 2;
      if (
        cx >= outer.absX + 4 &&
        cx <= outer.absX + outer.width - 4 &&
        cy >= outer.absY + 4 &&
        cy <= outer.absY + outer.height - 4
      ) {
        parentIds.add(outer.id);
        break;
      }
    }
  }

  // Helper to render a single vertex (used in Pass 1 for containers/wordmarks and Pass 3 for foreground cards/badges/labels)
  const renderVertexNode = async (node: ParsedMxCell) => {
    const style = node.style;
    const rawFill = style.fillColor;
    const rawStroke = style.strokeColor;
    const isCircleStepBadge =
      (style.ellipse === '1' || style.shape === 'ellipse') && node.width <= 55 && node.height <= 55;
    const bx = toSlideX(node.absX);
    const by = toSlideY(node.absY);
    const bw = isCircleStepBadge ? toSlideH(node.height) : toSlideW(node.width);
    const bh = toSlideH(node.height);

    const validSvgs = node.extractedSvgs.filter(
      (s) => !/display\s*:\s*none/i.test(s) && !/width\s*=\s*["']0["']/i.test(s)
    );
    const inlineImgSrc = extractInlineImgSrc(node.value);
    const isImageShape =
      style.shape === 'image' || Boolean(node.imageDataUrl) || Boolean(inlineImgSrc) || validSvgs.length > 0;

    const hasFill =
      rawFill !== 'none' &&
      rawFill !== 'transparent' &&
      Boolean(rawFill) &&
      !(isImageShape && !isCircleStepBadge && node.width <= 55 && node.height <= 55);
    const hasStroke =
      rawStroke !== 'none' &&
      rawStroke !== 'transparent' &&
      Boolean(rawStroke) &&
      !(isImageShape && !isCircleStepBadge && node.width <= 55 && node.height <= 55);

    const fillColor = normalizeHexColor(rawFill, isDarkDiagram ? '1E293B' : 'FFFFFF');
    const rawStrokeNorm = normalizeHexColor(rawStroke, isDarkDiagram ? '3B82F6' : 'DADCE0');
    const isContainer = style.container === '1' || parentIds.has(node.id);

    // Official Google Cloud Architecture Center border refinement (no thick 2pt black cartoon borders)
    let strokeColor = rawStrokeNorm;
    if (!isDarkDiagram && (rawStrokeNorm === '202124' || rawStrokeNorm === '0F172A' || rawStrokeNorm === '1E293B')) {
      strokeColor = isContainer ? '9AA0A6' : 'DADCE0';
    }
    const strokeWidth = isCircleStepBadge
      ? 0.75
      : node.id === 'gcp_outer_frame' || strokeColor === '1A73E8'
        ? 1.0
        : 0.75;
    const isDashed = style.dashed === '1';
    const isCylinder =
      Boolean(style.shape && style.shape.toLowerCase().includes('cylinder')) || style.cylinder === '1';

    let shapeType = pptx.ShapeType.rect;
    if (isCylinder) {
      shapeType = pptx.ShapeType.can;
    } else if (style.ellipse === '1' || style.shape === 'ellipse') {
      shapeType = pptx.ShapeType.ellipse;
    } else if (style.rhombus === '1' || style.shape === 'rhombus') {
      shapeType = pptx.ShapeType.diamond;
    } else if (style.rounded === '1') {
      shapeType = pptx.ShapeType.roundRect;
    }

    const normalizedHtml = normalizeDrawioHtmlForSlides(node.value);
    const { title, subtitle } = cleanHtmlToPlainText(normalizedHtml);
    const structured = extractStructuredNodeLayout(normalizedHtml);

    const isDarkNodeFill = hasFill ? isDarkColor(fillColor) : isDarkDiagram;
    let resolvedTitleColor = style.fontColor
      ? normalizeHexColor(style.fontColor, isDarkNodeFill ? 'FFFFFF' : '202124')
      : node.htmlTitleColor
        ? node.htmlTitleColor
        : isDarkNodeFill
          ? 'FFFFFF'
          : '202124';
    if (isDarkNodeFill && isDarkColor(resolvedTitleColor)) {
      resolvedTitleColor = 'FFFFFF';
    } else if (!isDarkNodeFill && !isDarkColor(resolvedTitleColor)) {
      resolvedTitleColor = '202124';
    }

    let resolvedSubtitleColor = node.htmlSubtitleColor
      ? node.htmlSubtitleColor
      : isDarkNodeFill
        ? 'CBD5E1'
        : '5F6368';
    if (isDarkNodeFill && isDarkColor(resolvedSubtitleColor)) {
      resolvedSubtitleColor = 'CBD5E1';
    } else if (!isDarkNodeFill && !isDarkColor(resolvedSubtitleColor)) {
      resolvedSubtitleColor = '5F6368';
    }

    const isTableCard = !isContainer && structured.kind === 'table-card';
    const iconSource = validSvgs[0] || inlineImgSrc || node.imageDataUrl;

    if (hasFill || hasStroke) {
      slide2.addShape(shapeType, {
        x: bx,
        y: by,
        w: bw,
        h: bh,
        rectRadius: shapeType === pptx.ShapeType.roundRect ? (isContainer ? 0.03 : 0.04) : undefined,
        fill: hasFill ? { color: fillColor } : undefined,
        line: hasStroke
          ? {
              color: strokeColor,
              width: strokeWidth,
              dashType: isDashed ? 'dash' : 'solid',
            }
          : undefined,
      });
    }

    // Pure wordmark / banner image node (no text)
    if (!title && !subtitle && iconSource) {
      const bannerDataUrl = await rasterizeSvgIcon(iconSource, 256, 64);
      if (bannerDataUrl) {
        addImagePreservingAspect(slide2, bannerDataUrl, bx, by, bw, bh);
      }
      return;
    }

    // Service Card with left Google Cloud product icon + 2-line typography
    if (isTableCard) {
      const iconSq = Number(Math.min(0.18, Math.max(0.12, Math.min(bh * 0.56, bw * 0.21))).toFixed(3));
      let padLeft = 0.035;
      const cardIconCandidate =
        (structured.leftIconSvg &&
        !/display\s*:\s*none/i.test(structured.leftIconSvg) &&
        !/width\s*=\s*["']0["']/i.test(structured.leftIconSvg)
          ? structured.leftIconSvg
          : undefined) || iconSource;
      if (cardIconCandidate) {
        const leftDataUrl = await rasterizeSvgIcon(cardIconCandidate, 128, 128);
        if (leftDataUrl) {
          const lx = Number((bx + 0.035).toFixed(3));
          const ly = Number((by + (bh - iconSq) / 2).toFixed(3));
          slide2.addImage({ data: leftDataUrl, x: lx, y: ly, w: iconSq, h: iconSq });
          padLeft = iconSq + 0.055;
        }
      }

      // Consolidate card lines to at most 2 clean lines (1 bold title + 1 muted subtitle) so Google Slides never overflows
      const rawLines = structured.bodyLines;
      if (rawLines.length > 0) {
        const consolidatedLines: { text: string; bold?: boolean }[] =
          rawLines.length <= 2
            ? rawLines
            : [
                {
                  text: rawLines
                    .slice(0, rawLines.length - 1)
                    .map((l) => l.text)
                    .join(' '),
                  bold: true,
                },
                {
                  text: rawLines[rawLines.length - 1].text,
                  bold: false,
                },
              ];

        const primaryTextLen = consolidatedLines[0]?.text.length || 0;
        const cardTitlePt = primaryTextLen >= 24 ? 4.1 : bh < 0.34 ? 4.6 : 4.9;
        const cardSubPt = primaryTextLen >= 24 ? 3.7 : bh < 0.34 ? 4.0 : 4.2;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const textRuns: any[] = [];
        if (structured.stepBadge) {
          const badgeChar = CIRCLED_STEP_DIGITS[structured.stepBadge.num] || `${structured.stepBadge.num}.`;
          textRuns.push({
            text: `${badgeChar} `,
            options: { fontSize: cardTitlePt, bold: true, color: structured.stepBadge.bgHex },
          });
        }
        consolidatedLines.forEach((ln, idx) => {
          textRuns.push({
            text: ln.text,
            options: {
              fontSize: idx === 0 ? cardTitlePt : cardSubPt,
              bold: idx === 0 || Boolean(ln.bold),
              color: idx === 0 ? resolvedTitleColor : resolvedSubtitleColor,
              breakLine: idx < consolidatedLines.length - 1,
            },
          });
        });
        slide2.addText(textRuns, {
          x: Number((bx + padLeft).toFixed(3)),
          y: by,
          w: Number(Math.max(0.18, bw - padLeft - 0.02).toFixed(3)),
          h: bh,
          align: 'left',
          valign: 'middle',
          margin: 0,
          fit: 'shrink',
          lineSpacingMultiple: 0.92,
          fontFace: 'Arial',
          wrap: true,
        });
      }
      return;
    }

    // Numbered Blue Step Circle Badge (1..7)
    if (isCircleStepBadge && (title || subtitle)) {
      slide2.addText(title || subtitle, {
        x: bx,
        y: by,
        w: bw,
        h: bh,
        fontSize: 5.5,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        valign: 'middle',
        margin: 0,
        fontFace: 'Arial',
      });
      return;
    }

    // Standard icon + text node or container header or floating edge label
    const isColumnCenteredActor =
      !isContainer &&
      Boolean(iconSource) &&
      (style.align === 'center' || /flex-direction\s*:\s*column/i.test(node.value || ''));

    let textOffsetLeft = 0;
    let textOffsetTop = 0;
    if (iconSource && !isContainer) {
      const iconDataUrl = await rasterizeSvgIcon(iconSource, 128, 128);
      if (iconDataUrl) {
        if (isColumnCenteredActor) {
          const iconSq = Number(Math.min(0.13, Math.max(0.1, bh * 0.34)).toFixed(3));
          const ix = Number((bx + (bw - iconSq) / 2).toFixed(3));
          const iy = Number((by + 0.02).toFixed(3));
          slide2.addImage({ data: iconDataUrl, x: ix, y: iy, w: iconSq, h: iconSq });
          textOffsetTop = Number((iconSq + 0.02).toFixed(3));
        } else {
          const iconSq = Number(Math.min(0.18, Math.max(0.12, Math.min(bh * 0.52, bw * 0.22))).toFixed(3));
          const ix = Number((bx + 0.035).toFixed(3));
          const iy = Number((by + (bh - iconSq) / 2).toFixed(3));
          slide2.addImage({ data: iconDataUrl, x: ix, y: iy, w: iconSq, h: iconSq });
          textOffsetLeft = iconSq + 0.055;
        }
      }
    }

    if (title || subtitle) {
      if (isContainer) {
        // Container Header (e.g., Google Cloud Organization, Pattern A Enclave, Zone 1..4)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contRuns: any[] = [
          {
            text: title,
            options: {
              fontSize: 5.2,
              bold: true,
              color: resolvedTitleColor,
              breakLine: Boolean(subtitle),
            },
          },
        ];
        if (subtitle) {
          contRuns.push({
            text: subtitle,
            options: {
              fontSize: 4.3,
              bold: false,
              color: resolvedSubtitleColor,
            },
          });
        }
        slide2.addText(contRuns, {
          x: Number((bx + 0.05).toFixed(3)),
          y: Number((by + 0.015).toFixed(3)),
          w: Number(Math.max(0.3, bw - 0.1).toFixed(3)),
          h: 0.24,
          align: style.align === 'right' ? 'right' : 'left',
          valign: 'top',
          margin: 0,
          lineSpacingMultiple: 0.92,
          fontFace: 'Arial',
          wrap: true,
        });
      } else {
        // Non-container card or floating connector label
        const isFloatingLabel = !hasFill && !hasStroke;
        const lblTitlePt = isColumnCenteredActor ? 4.5 : isFloatingLabel ? 4.4 : bh < 0.34 ? 4.6 : 5.0;
        const lblSubPt = isColumnCenteredActor ? 3.8 : isFloatingLabel ? 4.0 : bh < 0.34 ? 4.0 : 4.3;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const runs: any[] = [
          {
            text: title,
            options: {
              fontSize: lblTitlePt,
              bold: true,
              color: resolvedTitleColor,
              breakLine: Boolean(subtitle),
            },
          },
        ];
        if (subtitle) {
          runs.push({
            text: subtitle,
            options: {
              fontSize: lblSubPt,
              bold: false,
              color: resolvedSubtitleColor,
            },
          });
        }
        const effBoxH = isFloatingLabel && subtitle ? Math.max(bh, 0.24) : bh;
        const effBoxY = isFloatingLabel && subtitle ? Number((by - (effBoxH - bh) / 2).toFixed(3)) : by;
        slide2.addText(runs, {
          x: Number((bx + textOffsetLeft).toFixed(3)),
          y: Number((effBoxY + textOffsetTop).toFixed(3)),
          w: Number(Math.max(0.18, bw - textOffsetLeft).toFixed(3)),
          h: Number(Math.max(0.1, effBoxH - textOffsetTop).toFixed(3)),
          align: isColumnCenteredActor
            ? 'center'
            : textOffsetLeft > 0
              ? 'left'
              : style.align === 'left'
                ? 'left'
                : style.align === 'right'
                  ? 'right'
                  : 'center',
          valign: 'middle',
          margin: 0,
          fit: 'shrink',
          lineSpacingMultiple: 0.92,
          fontFace: 'Arial',
          wrap: true,
        });
      }
    }
  };

  // Partition vertices into Pass 1 (Background Enclaves/Containers & Wordmarks) and Pass 3 (Foreground Cards, Step Circles & Labels)
  const backgroundVertices: ParsedMxCell[] = [];
  const foregroundVertices: ParsedMxCell[] = [];
  for (const node of vertices) {
    if ((node.id === 'bg' || node.id.includes('bg')) && node.width >= 700 && node.height >= 400) continue;
    const rawFill = node.style.fillColor;
    if (
      node.id === 'hdr_title_box' ||
      (node.id.includes('title') && node.absY < 48 && (!rawFill || rawFill === 'none') && node.width >= 500)
    ) {
      continue;
    }
    const isCont = node.style.container === '1' || parentIds.has(node.id);
    const normHtml = normalizeDrawioHtmlForSlides(node.value);
    const { title, subtitle } = cleanHtmlToPlainText(normHtml);
    const isWordmarkOnly = !title && !subtitle;
    if (isCont || isWordmarkOnly) {
      backgroundVertices.push(node);
    } else {
      foregroundVertices.push(node);
    }
  }

  // PASS 1: Render Background Containers, Enclaves, Zones & Google Cloud Wordmark
  for (const node of backgroundVertices) {
    await renderVertexNode(node);
  }

  // PASS 2: Render Connector Edges (behind Foreground Cards & Blue Step Circles 1..7!)
  for (const edge of edges) {
    const src = cellMap.get(edge.source || '');
    const tgt = cellMap.get(edge.target || '');
    let ptStart: { x: number; y: number } | undefined;
    let ptEnd: { x: number; y: number } | undefined;

    if (src) {
      const exitXVal = parseFloat(edge.style.exitX ?? '0.5');
      const exitYVal = parseFloat(edge.style.exitY ?? '0.5');
      ptStart = { x: src.absX + src.width * exitXVal, y: src.absY + src.height * exitYVal };
    } else if (edge.sourcePoint) {
      ptStart = edge.sourcePoint;
    }

    if (tgt) {
      const entryXVal = parseFloat(edge.style.entryX ?? '0.5');
      const entryYVal = parseFloat(edge.style.entryY ?? '0.5');
      ptEnd = { x: tgt.absX + tgt.width * entryXVal, y: tgt.absY + tgt.height * entryYVal };
    } else if (edge.targetPoint) {
      ptEnd = edge.targetPoint;
    }

    if (!ptStart || !ptEnd) continue;

    const rawPoints = [ptStart, ...edge.waypoints.map((wp) => ({ ...wp })), ptEnd];
    const allPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < rawPoints.length; i++) {
      const curr = rawPoints[i];
      if (allPoints.length === 0) {
        allPoints.push(curr);
        continue;
      }
      const prev = allPoints[allPoints.length - 1];
      const dx = Math.abs(curr.x - prev.x);
      const dy = Math.abs(curr.y - prev.y);
      if (dx > 4 && dy > 4) {
        const midX = (prev.x + curr.x) / 2;
        allPoints.push({ x: midX, y: prev.y });
        allPoints.push({ x: midX, y: curr.y });
      }
      allPoints.push(curr);
    }

    const rawEdgeStroke = normalizeHexColor(edge.style.strokeColor, '5F6368');
    const strokeColor =
      rawEdgeStroke === '202124' || rawEdgeStroke === '1E293B' || rawEdgeStroke === '0F172A'
        ? '5F6368'
        : rawEdgeStroke;
    const isDashed = edge.style.dashed === '1';
    const strokeWidth = 0.85;
    const hasStartArrow = Boolean(edge.style.startArrow) && edge.style.startArrow !== 'none';
    const hasEndArrow = !edge.style.endArrow || edge.style.endArrow !== 'none';

    for (let i = 0; i < allPoints.length - 1; i++) {
      const p1 = allPoints[i];
      const p2 = allPoints[i + 1];
      const x1 = toSlideX(p1.x);
      const y1 = toSlideY(p1.y);
      const x2 = toSlideX(p2.x);
      const y2 = toSlideY(p2.y);
      const lineW = Number(Math.abs(x2 - x1).toFixed(3));
      const lineH = Number(Math.abs(y2 - y1).toFixed(3));
      if (lineW === 0 && lineH === 0) continue;

      const isTinyElbowStub = allPoints.length > 2 && Math.max(lineW, lineH) < 0.085;
      slide2.addShape(pptx.ShapeType.line, {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        w: lineW,
        h: lineH,
        flipH: x2 < x1,
        flipV: y2 < y1,
        line: {
          color: strokeColor,
          width: strokeWidth,
          dashType: isDashed ? 'dash' : 'solid',
          beginArrowType: i === 0 && hasStartArrow && !isTinyElbowStub ? 'triangle' : undefined,
          endArrowType: i === allPoints.length - 2 && hasEndArrow ? 'triangle' : undefined,
        },
      });
    }
  }

  // PASS 3: Render Foreground Service Cards, Actor Cards, Blue Step Circles (1..7) & Floating Labels ON TOP OF Connectors
  for (const node of foregroundVertices) {
    await renderVertexNode(node);
  }

  // Right-Hand Google Cloud Architecture Walkthrough Sidebar
  renderDiagramWalkthroughSidebar(
    pptx,
    slide2,
    sideX,
    sideW,
    figureLabel,
    diagramTitle,
    talkingPoints,
    `${vertices.length} Native Shapes • ${edges.length} Connectors • Source: ${sourceDrawioRelPath}`
  );
  addFooter(pptx, slide2, `${blueprintId}  •  Click any box, icon, or connector in PowerPoint / Google Slides to edit`);

  // =========================================================================
  // SLIDE 3 OF 3: COMPONENT & GOVERNANCE SPECIFICATION TABLE SLIDE
  // =========================================================================
  const tableSlide = pptx.addSlide();
  tableSlide.background = { color: SURFACE_BG };
  addHeaderBar(pptx, tableSlide, kicker, `${figureLabel} — Architectural Component Inventory`, 'SPECIFICATION TABLE');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const specRows: any[][] = [
    [
      { text: 'Object ID', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 9 } },
      { text: 'Component / Enclave Name', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 9 } },
      { text: 'Architectural Role & Governance Details', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 9 } },
      { text: 'Layer Type', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 9 } },
    ],
  ];

  const meaningfulNodes = vertices
    .filter((v) => {
      const { title: t } = cleanHtmlToPlainText(normalizeDrawioHtmlForSlides(v.value));
      return t.length > 2 && !t.startsWith('[WORKSTREAM');
    })
    .slice(0, 14);

  meaningfulNodes.forEach((v, idx) => {
    const { title: t, subtitle: s } = cleanHtmlToPlainText(normalizeDrawioHtmlForSlides(v.value));
    const isCont = v.style.container === '1' || parentIds.has(v.id);
    const rowBg = idx % 2 === 0 ? WHITE : SURFACE_BG;
    specRows.push([
      {
        text: `OBJ-${String(idx + 1).padStart(2, '0')}`,
        options: { fontSize: 8, bold: true, color: G_BLUE_DARK, fill: { color: rowBg } },
      },
      {
        text: t.slice(0, 68),
        options: { fontSize: 8.2, bold: true, color: TEXT_DARK, fill: { color: rowBg } },
      },
      {
        text: (s || (isCont ? 'Security & Governance Enclave Boundary' : 'Core GEAP Architecture Node')).slice(0, 95),
        options: { fontSize: 8, color: TEXT_BODY, fill: { color: rowBg } },
      },
      {
        text: isCont ? 'Enclave / Tier' : 'Service Node',
        options: {
          fontSize: 8,
          bold: true,
          color: isCont ? G_PURPLE : G_GREEN_DEEP,
          fill: { color: rowBg },
        },
      },
    ]);
  });

  tableSlide.addTable(specRows, {
    x: 0.4,
    y: HEADER_H + 0.18,
    w: SLIDE_W - 0.8,
    colW: [1.1, 4.1, 5.833, 1.5],
    border: { type: 'solid', color: BORDER_GREY, pt: 0.5 },
    fill: { color: WHITE },
    fontFace: 'Arial',
  });
  addFooter(pptx, tableSlide, `${figureLabel} Component Specification Table  •  Source: ${sourceDrawioRelPath}`);

  const notes = `${figureLabel} — ${diagramTitle}\n\n${talkingPoints.map((t) => `• ${t}`).join('\n')}\n\nEditable source: ${sourceDrawioRelPath}`;
  masterSlide.addNotes(notes);
  slide2.addNotes(notes);
  tableSlide.addNotes(`${figureLabel} component inventory for ${diagramTitle}`);

  return {
    vertexCount: vertices.length,
    edgeCount: edges.length,
    slides: 3,
  };
}

// ---------------------------------------------------------------------------------------------
// Deck assembly
// ---------------------------------------------------------------------------------------------
function newDeck(title: string): Pptx {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Google Cloud FDE • PromptCanvas Vision Decompiler';
  pptx.company = 'Google Cloud';
  pptx.title = title;
  return pptx;
}

async function buildWorkstreamDeck(spec: DeckSpec, manifest: ManifestItem[]) {
  const deckJsonPath = path.join(FDE_BLOGS_ROOT, spec.deckJsonFile);
  const hasDeckJson = fs.existsSync(deckJsonPath);
  const deck: DeckJson = hasDeckJson ? readJson<DeckJson>(deckJsonPath) : fallbackDeckJson(spec, manifest);

  const pptx = newDeck(deck.deckTitle);
  let slideCount = 0;
  addTitleSlide(pptx, deck, spec, manifest);
  slideCount++;

  addBulletSlide(pptx, spec.key, 'Executive TL;DR', deck.tldr, {
    footer: `${spec.label} • ${SERIES_LINE}`,
  });
  slideCount++;

  for (const section of deck.sections) {
    addBulletSlide(pptx, spec.key, section.heading, section.bullets, {
      footer: `${spec.label}  •  Click any Bento card to edit text, badges, or styling`,
    });
    slideCount++;
  }

  let totalVertices = 0;
  let totalEdges = 0;
  for (let i = 0; i < spec.diagramIds.length; i++) {
    const id = spec.diagramIds[i];
    const m = manifest.find((x) => x.id === id);
    if (!m) throw new Error(`Diagram ${id} missing from diagrams_manifest.json`);
    const dj = deck.diagrams.find((d) => d.id === id);
    const figureLabel = dj?.figure || `Figure ${i + 1}`;
    const relDrawio = m.central_drawio_file || m.central_drawio || `diagrams/${m.id}.drawio`;
    const xmlPath = path.join(FDE_BLOGS_ROOT, relDrawio);
    const pngPath = path.join(FDE_BLOGS_ROOT, m.central_drawio_png || `diagrams/${m.id}.drawio.png`);
    const xml = fs.readFileSync(xmlPath, 'utf8');
    const masterImageSrc = fs.existsSync(pngPath) ? fileToDataUri(pngPath) : undefined;
    const talking = dj?.talkingPoints?.length ? dj.talkingPoints : [m.subtitle];

    const r = await appendGoogleBrandedDiagramSlides(
      pptx,
      xml,
      spec.key,
      figureLabel,
      dj?.title || m.title,
      `VIS-${m.id.toUpperCase()}`,
      masterImageSrc,
      talking,
      relDrawio
    );
    totalVertices += r.vertexCount;
    totalEdges += r.edgeCount;
    slideCount += r.slides;
  }

  if (deck.takeaways.length) {
    addBulletSlide(pptx, spec.key, 'Key Takeaways', deck.takeaways, {
      footer: deck.callToAction,
      accent: G_GREEN_DARK,
      isTakeaways: true,
    });
    slideCount++;
  }
  addAssetsSlide(pptx, spec, deck, manifest, spec.diagramIds);
  slideCount++;

  const outPath = path.join(SLIDES_DIR, spec.fileName);
  await pptx.writeFile({ fileName: outPath });
  const bytes = fs.statSync(outPath).size;
  console.log(
    `   ✅ ${spec.key} → slides/${spec.fileName}  (${slideCount} slides, ${spec.diagramIds.length} diagrams, ${totalVertices} editable shapes, ${totalEdges} connectors, ${Math.round(bytes / 1024)} KB${hasDeckJson ? '' : ', fallback narrative'})`
  );
  return {
    key: spec.key,
    file: `slides/${spec.fileName}`,
    blog: spec.blogFile,
    slides: slideCount,
    diagrams: spec.diagramIds,
    shapes: totalVertices,
    connectors: totalEdges,
    bytes,
    narrative: hasDeckJson ? 'blog deck.json' : 'fallback',
  };
}

async function buildCombinedDeck(manifest: ManifestItem[]) {
  const deck: DeckJson = {
    workstream: 'ALL',
    deckTitle: 'GEAP Multi-Tenant Agentic AI: Pooled, Sovereign Silos & Hybrid — Complete Program Deck',
    deckSubtitle: 'All 14 Google Cloud Architecture Center blueprints across Workstreams 1–5 as 100% editable slides',
    tldr: DECKS.map((d) => d.label),
    sections: [],
    diagrams: [],
    takeaways: [],
    callToAction: 'See blogs/ for the full explanatory articles and slides/ for per-workstream decks.',
  };
  const pptx = newDeck(deck.deckTitle);
  let slideCount = 0;
  addTitleSlide(pptx, deck, null, manifest);
  slideCount++;
  addBulletSlide(pptx, 'PROGRAM', 'Program Map • Workstreams 1–5', deck.tldr, {
    footer: deck.callToAction,
  });
  slideCount++;

  const allIds: string[] = [];
  for (const spec of DECKS) {
    const deckJsonPath = path.join(FDE_BLOGS_ROOT, spec.deckJsonFile);
    const wsDeck: DeckJson = fs.existsSync(deckJsonPath) ? readJson<DeckJson>(deckJsonPath) : fallbackDeckJson(spec, manifest);
    addSectionDivider(pptx, spec.key, wsDeck.deckTitle, wsDeck.deckSubtitle);
    slideCount++;
    addBulletSlide(pptx, spec.key, 'Executive TL;DR', wsDeck.tldr, { footer: spec.label });
    slideCount++;
    for (let i = 0; i < spec.diagramIds.length; i++) {
      const id = spec.diagramIds[i];
      const m = manifest.find((x) => x.id === id)!;
      const dj = wsDeck.diagrams.find((d) => d.id === id);
      const figureLabel = dj?.figure || `Figure ${i + 1}`;
      const relDrawio = m.central_drawio_file || m.central_drawio || `diagrams/${m.id}.drawio`;
      const xmlPath = path.join(FDE_BLOGS_ROOT, relDrawio);
      const pngPath = path.join(FDE_BLOGS_ROOT, m.central_drawio_png || `diagrams/${m.id}.drawio.png`);
      const xml = fs.readFileSync(xmlPath, 'utf8');
      const masterImageSrc = fs.existsSync(pngPath) ? fileToDataUri(pngPath) : undefined;
      const talking = dj?.talkingPoints?.length ? dj.talkingPoints : [m.subtitle];

      const r = await appendGoogleBrandedDiagramSlides(
        pptx,
        xml,
        spec.key,
        figureLabel,
        dj?.title || m.title,
        `VIS-${m.id.toUpperCase()}`,
        masterImageSrc,
        talking,
        relDrawio
      );
      slideCount += r.slides;
      allIds.push(id);
    }
    if (wsDeck.takeaways.length) {
      addBulletSlide(pptx, spec.key, 'Key Takeaways', wsDeck.takeaways, {
        footer: wsDeck.callToAction,
        accent: G_GREEN_DARK,
        isTakeaways: true,
      });
      slideCount++;
    }
  }
  addAssetsSlide(pptx, null, deck, manifest, allIds);
  slideCount++;

  const outPath = path.join(SLIDES_DIR, COMBINED_FILE);
  await pptx.writeFile({ fileName: outPath });
  const bytes = fs.statSync(outPath).size;
  console.log(`   ✅ ALL → slides/${COMBINED_FILE}  (${slideCount} slides, ${allIds.length} diagrams, ${Math.round(bytes / 1024)} KB)`);
  return { key: 'ALL', file: `slides/${COMBINED_FILE}`, slides: slideCount, diagrams: allIds, bytes };
}

function postProcessPptxArrowheadsForGoogleSlides() {
  const pyScript = `
import glob, os, zipfile, tempfile, shutil
for pptx_path in sorted(glob.glob(os.path.join(${JSON.stringify(SLIDES_DIR)}, "*.pptx"))):
    fd, tmp_path = tempfile.mkstemp(suffix=".pptx")
    os.close(fd)
    with zipfile.ZipFile(pptx_path, "r") as zin, zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename.startswith("ppt/slides/slide") and item.filename.endswith(".xml"):
                xml_str = data.decode("utf-8")
                xml_str = xml_str.replace('<a:headEnd type="triangle"/>', '<a:headEnd type="triangle" w="sm" len="sm"/>')
                xml_str = xml_str.replace('<a:tailEnd type="triangle"/>', '<a:tailEnd type="triangle" w="sm" len="sm"/>')
                xml_str = xml_str.replace('<a:headEnd type="arrow"/>', '<a:headEnd type="arrow" w="sm" len="sm"/>')
                xml_str = xml_str.replace('<a:tailEnd type="arrow"/>', '<a:tailEnd type="arrow" w="sm" len="sm"/>')
                data = xml_str.encode("utf-8")
            zout.writestr(item, data)
    shutil.move(tmp_path, pptx_path)
`;
  const { execFileSync } = require('child_process') as typeof import('child_process');
  execFileSync('python3', ['-c', pyScript], { stdio: 'inherit' });
}

async function main() {
  console.log('🎞️  PromptCanvas Vision Module — Building Google Cloud Branded 100% Editable Slide Decks...');
  fs.mkdirSync(SLIDES_DIR, { recursive: true });
  const manifest = readJson<ManifestItem[]>(MANIFEST_PATH);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];
  for (const spec of DECKS) {
    results.push(await buildWorkstreamDeck(spec, manifest));
  }
  results.push(await buildCombinedDeck(manifest));

  postProcessPptxArrowheadsForGoogleSlides();

  const slidesManifest = {
    generatedAt: new Date().toISOString(),
    engine:
      'PromptCanvas Vision Decompiler • Google Cloud Next 26 Branded Bento Canvas • pptxgenjs LAYOUT_WIDE 16:9',
    decks: results,
  };
  fs.writeFileSync(path.join(SLIDES_DIR, 'slides_manifest.json'), JSON.stringify(slidesManifest, null, 2), 'utf8');
  console.log(`\n🎉 ${results.length} Google-branded decks written to slides/ (manifest: slides/slides_manifest.json)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
