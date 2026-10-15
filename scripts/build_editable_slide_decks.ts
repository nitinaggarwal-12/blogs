/**
 * 🎞️ PromptCanvas Vision Module — Google Cloud Architecture Center & Next '26 Editable Slide Deck Builder
 *
 * Compiles 100% native editable PowerPoint / Google Slides (.pptx) decks across Workstreams 1–5
 * and the Combined Master Program Deck following Google Cloud Architecture Center & Material Design 3 Guidelines:
 *   • 100% Crisp Light-Theme Executive Design Default (Rule 54: #F8FAFC / #FFFFFF surfaces, #202124 typography)
 *   • Signature Google 4-Color Top Ribbon (#4285F4, #EA4335, #FBBC04, #34A853) + Google Cloud Header Bar
 *   • 3 Distinct Narrative & Architectural Slide Layouts:
 *       - Layout A (`cards`): Structured Architecture Cards with Inner Google Cloud Stack & Target SLA Boxes
 *       - Layout B (`table`): Multi-Column Google Cloud Architecture Comparison Matrix + Decision Cards
 *       - Layout C (`pipeline`): 5-Hop Horizontal Cryptographic Verification Pipeline (Hop 1 -> Hop 5)
 *   • 3-Slide Diagram Set per blueprint:
 *       1. 100% Decomposed Native Editable Vector Canvas (56 shapes + 23 connectors) + 4-Zone Architecture Center Sidebar
 *       2. Step-by-Step End-to-End Logical Flow (4-Zone Ribbon + 8-Card Sequential Walkthrough)
 *       3. Step-by-Step End-to-End Technical Flow (8-Row Protocol/Code Table + 3-Pillar Well-Architected Bar)
 *   • Architecture Blueprint Summary & Source Lineage Slide
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

// Official Google Cloud Architecture Center & Material 3 Light Theme Palette (Rule 54)
const G_BLUE = '4285F4';
const G_BLUE_DARK = '1A73E8';
const G_BLUE_DEEP = '174EA6';
const G_BLUE_TINT = 'E8F0FE';

const G_RED = 'EA4335';
const G_RED_DARK = 'D93025';
const G_RED_DEEP = 'A50E0E';
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
const G_PURPLE_DEEP = '681DA8';
const G_PURPLE_TINT = 'F3E8FD';

const G_TEAL = '00897B';
const G_TEAL_DEEP = '004D40';
const G_TEAL_TINT = 'E0F2F1';

const TEXT_DARK = '202124'; // Google Grey 900
const TEXT_BODY = '3C4043'; // Google Grey 800
const TEXT_MUTED = '5F6368'; // Google Grey 700
const BORDER_GREY = 'DADCE0'; // Google Grey 300
const SURFACE_BG = 'F8FAFC'; // Crisp Slate 50 Canvas
const SPEC_BOX_BG = 'F1F5F9'; // Subtle Spec Card Fill
const WHITE = 'FFFFFF';

const SERIES_LINE = 'Multi-Tenant Agentic AI on Google Cloud • Vertex AI Agent Engine, Gemini Enterprise & ADK 2.0';

interface BrandAccent {
  bar: string;
  tint: string;
  text: string;
  border: string;
}

const GOOGLE_CARD_ACCENTS: BrandAccent[] = [
  { bar: G_BLUE_DARK, tint: G_BLUE_TINT, text: G_BLUE_DEEP, border: 'AECBFA' },
  { bar: G_BLUE_DEEP, tint: G_BLUE_TINT, text: G_BLUE_DEEP, border: 'AECBFA' },
  { bar: G_BLUE_DARK, tint: G_BLUE_TINT, text: G_BLUE_DEEP, border: 'AECBFA' },
  { bar: G_BLUE_DEEP, tint: G_BLUE_TINT, text: G_BLUE_DEEP, border: 'AECBFA' },
  { bar: G_BLUE_DARK, tint: G_BLUE_TINT, text: G_BLUE_DEEP, border: 'AECBFA' },
  { bar: G_BLUE_DEEP, tint: G_BLUE_TINT, text: G_BLUE_DEEP, border: 'AECBFA' },
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

interface CardTechSpec {
  stack: string;
  sla: string;
  tag?: string;
}

interface PipelineStepSpec {
  hop: string;
  stage: string;
  title: string;
  service: string;
  mechanism: string;
  invariant: string;
  gate: string;
}

interface DeckSection {
  heading: string;
  layout?: 'cards' | 'table' | 'pipeline';
  bullets: string[];
  specs?: CardTechSpec[];
  tableHeaders?: string[];
  tableRows?: string[][];
  tableColW?: number[];
  pipelineSteps?: PipelineStepSpec[];
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
  tldrSpecs?: CardTechSpec[];
  sections: DeckSection[];
  diagrams: DeckDiagram[];
  takeaways: string[];
  takeawaySpecs?: CardTechSpec[];
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
      'blogs/ws2-pattern-a-pooled-architecture.md',
      'workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md',
      'workstream-2-pattern-a-pooled/2.5-breach-simulation-suite/run_breach_simulations.py',
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
      'blogs/ws3-pattern-b-sovereign-silos.md',
      'workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md',
      'workstream-3-pattern-b-siloed/3.5-exfiltration-and-cmek-revocation-tests/run_silo_security_tests.py',
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
      'blogs/ws4-pattern-c-hybrid-dynamic-tiering.md',
      'workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md',
      'workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/run_tier_migration_suite.py',
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
      'blogs/ws5-decision-guide-and-agentic-triad.md',
      'workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md',
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

  slide.addText(
    [
      { text: 'Google Cloud  ', options: { fontSize: 10.5, bold: true, color: TEXT_DARK } },
      { text: 'Architecture Center', options: { fontSize: 10, color: TEXT_MUTED } },
    ],
    { x: 0.9, y: RIBBON_H + 0.07, w: 2.85, h: 0.34, valign: 'middle', fontFace: 'Arial' }
  );

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

  const titleX = Number((3.75 + pillW + 0.18).toFixed(3));
  const badgeText = rightBadge || 'VERTEX AI & ADK 2.0 • 100% EDITABLE';
  const rightPillW = 2.55;
  slide.addText(title, {
    x: titleX,
    y: RIBBON_H + 0.08,
    w: Number((SLIDE_W - titleX - rightPillW - 0.5).toFixed(3)),
    h: 0.32,
    fontSize: 9.8,
    bold: true,
    color: TEXT_BODY,
    valign: 'middle',
    fontFace: 'Arial',
  });

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
    fontSize: 7.4,
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
      { text: 'GOOGLE CLOUD ARCHITECTURE CENTER  •  ', options: { fontSize: 7.5, bold: true, color: G_BLUE_DARK } },
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

function addLightExecutiveCalloutBanner(
  pptx: Pptx,
  slide: Slide,
  badgeLabel: string,
  bannerText: string,
  isGreen: boolean = false
) {
  const bannerY = SLIDE_H - 0.80;
  const fillHex = isGreen ? G_GREEN_TINT : G_BLUE_TINT;
  const borderHex = isGreen ? 'CEEAD6' : 'AECBFA';
  const badgeFill = isGreen ? G_GREEN_DARK : G_BLUE_DARK;
  const textHex = isGreen ? G_GREEN_DEEP : G_BLUE_DEEP;

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4,
    y: bannerY,
    w: SLIDE_W - 0.8,
    h: 0.44,
    rectRadius: 0.06,
    fill: { color: fillHex },
    line: { color: borderHex, width: 0.85 },
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.52,
    y: bannerY + 0.07,
    w: 2.05,
    h: 0.3,
    rectRadius: 0.05,
    fill: { color: badgeFill },
  });
  slide.addText(badgeLabel, {
    x: 0.52,
    y: bannerY + 0.07,
    w: 2.05,
    h: 0.3,
    fontSize: 7.8,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: 'Arial',
  });
  slide.addText(bannerText, {
    x: 2.7,
    y: bannerY + 0.05,
    w: SLIDE_W - 3.25,
    h: 0.34,
    fontSize: 8.8,
    bold: true,
    color: textHex,
    valign: 'middle',
    fontFace: 'Arial',
  });
}

interface ParsedBulletCard {
  title: string;
  body: string;
  tags: string[];
  stack: string;
  sla: string;
}

function parseBulletIntoCard(raw: string, index: number, explicitSpec?: CardTechSpec): ParsedBulletCard {
  const clean = raw.replace(/\s+/g, ' ').trim();
  let title = '';
  let body = clean;

  const colonIdx = clean.indexOf(':');
  const semiIdx = clean.indexOf(';');
  if (colonIdx > 2 && colonIdx <= 64) {
    title = clean.slice(0, colonIdx).trim();
    body = clean.slice(colonIdx + 1).trim();
  } else if (semiIdx > 8 && semiIdx <= 64) {
    title = clean.slice(0, semiIdx).trim();
    body = clean.slice(semiIdx + 1).trim();
  } else {
    const words = clean.split(' ');
    title = words.slice(0, Math.min(6, words.length)).join(' ').replace(/[,.;:]$/, '');
    body = clean;
  }

  if (title.length > 0) title = title[0].toUpperCase() + title[1] ? title[0].toUpperCase() + title.slice(1) : title;
  if (body.length > 0) body = body[0].toUpperCase() + body.slice(1);

  const lower = clean.toLowerCase();
  const tagCandidates: { label: string; stack: string; sla: string; match: (s: string) => boolean }[] = [
    {
      label: 'Pattern A: Pooled Runtime',
      stack: 'Cloud Run v2 • Vertex AI Agent Engine • AlloyDB RLS',
      sla: '$42/mo Unit Cost • 90% Shared Prompt Cache Discount',
      match: (s) => s.includes('pattern a') || s.includes('pooled') || s.includes('$42'),
    },
    {
      label: 'Pattern B: Sovereign Silos',
      stack: 'Per-Tenant GCP Project • VPC-SC • IAM PAB • Cloud KMS CMEK',
      sla: '$1,850/mo Dedicated Vault • <60s HTTP 423 Kill-Switch',
      match: (s) => s.includes('pattern b') || s.includes('sovereign') || s.includes('silo'),
    },
    {
      label: 'Pattern C: Dynamic Hybrid PSC',
      stack: 'Hub ALB • Firestore Tier Router • Private Service Connect',
      sla: '0ms Lag Live Tier Migration • 0 Dropped Active Sessions',
      match: (s) => s.includes('pattern c') || s.includes('hybrid') || s.includes('private service connect') || s.includes('psc'),
    },
    {
      label: 'Hop 1: Edge WAF & OBO/DPoP',
      stack: 'Google Cloud Armor • IAP • IAM STS (RFC 8693 & RFC 9449)',
      sla: 'Strips Spoofed Headers (HTTP 401) • Sender-Constrained JWT',
      match: (s) => s.includes('cloud armor') || s.includes('iap') || s.includes('dpop') || s.includes('hop 1'),
    },
    {
      label: 'Hop 2: Agent Registry Filter',
      stack: 'Vertex AI Agent Engine Registry • ARD Visibility Proxy',
      sla: 'Blocks Cross-Tenant Agent & MCP Discovery (HTTP 403)',
      match: (s) => s.includes('registry') || s.includes('catalog') || s.includes('hop 2') || s.includes('enumeration'),
    },
    {
      label: 'Hop 4: Model Armor & Cloud DLP',
      stack: 'Vertex AI Model Armor • Cloud Sensitive Data Protection',
      sla: 'Blocks Jailbreaks (400) & NLCs (422) • Masks IBAN/PAN',
      match: (s) => s.includes('model armor') || s.includes('prompt injection') || s.includes('redact') || s.includes('hop 4'),
    },
    {
      label: 'Hop 5: AlloyDB RLS & BigQuery',
      stack: 'AlloyDB PostgreSQL RLS • Cloud KMS CMEK • BigQuery OTel',
      sla: 'SET LOCAL app.current_tenant_id • 0 Unauthorized SQL Rows',
      match: (s) => s.includes('alloydb') || s.includes('row-level') || s.includes('bigquery') || s.includes('hop 5'),
    },
    {
      label: '90% Prefix Cache FinOps',
      stack: 'Gemini 2.5 Pro ContextCacheConfig • Memorystore for Valkey',
      sla: '84.7% Net Token Savings • 120 vs. 600 RPM Quota Bulkheads',
      match: (s) => s.includes('90%') || s.includes('cache') || s.includes('84.7%') || s.includes('quota'),
    },
  ];

  let matched = tagCandidates.find((c) => c.match(lower));
  if (!matched) {
    matched = tagCandidates[index % tagCandidates.length];
  }

  return {
    title,
    body,
    tags: [explicitSpec?.tag || matched.label],
    stack: explicitSpec?.stack || matched.stack,
    sla: explicitSpec?.sla || matched.sla,
  };
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
  norm = norm.replace(/<b\b([^>]*)>([\s\S]*?)<\/b>/gi, (_m, attrs, inner) => {
    const flatInner = String(inner).replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
    return `<b${attrs}>${flatInner}</b>`;
  });
  norm = norm
    .replace(/<\/b>\s*(?!<br\b)(<span\b|<div\b|<font\b)/gi, '</b><br/>$1')
    .replace(/<\/div>\s*(?!<br\b)(<div\b|<span\b|<b\b)/gi, '</div><br/>$1')
    .replace(/<\/span>\s*(?!<br\b)(<span\b|<div\b|<b\b)/gi, '</span><br/>$1');
  return norm;
}

// ---------------------------------------------------------------------------------------------
// Slide 1: 100% Crisp Light-Theme Google Cloud Architecture Center Cover Slide (Rule 54)
// ---------------------------------------------------------------------------------------------

function addTitleSlide(pptx: Pptx, deck: DeckJson, spec: DeckSpec | null) {
  const slide = pptx.addSlide();
  slide.background = { color: SURFACE_BG };
  addGoogleFourColorRibbon(pptx, slide, 0, 0.085);

  // Left Hero Card (Crisp White Surface with Google Blue Accent Bar)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.45,
    y: 0.36,
    w: 7.42,
    h: 5.58,
    rectRadius: 0.09,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 1 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.45,
    y: 0.36,
    w: 0.12,
    h: 5.58,
    fill: { color: G_BLUE_DARK },
  });

  // Google Cloud 4-color dots + Architecture Center Kicker
  addGoogleFourColorDots(pptx, slide, 0.82, 0.72);
  slide.addText('GOOGLE CLOUD ARCHITECTURE CENTER  •  REFERENCE BLUEPRINT & CODEBASE', {
    x: 1.42,
    y: 0.58,
    w: 6.2,
    h: 0.28,
    fontSize: 9.0,
    bold: true,
    color: G_BLUE_DARK,
    fontFace: 'Arial',
    valign: 'middle',
  });

  // Workstream Pill
  const wsBadgeText = spec ? spec.label.toUpperCase() : 'COMPLETE PROGRAM DECK • WORKSTREAMS 1–5';
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.82,
    y: 0.96,
    w: 6.75,
    h: 0.32,
    rectRadius: 0.06,
    fill: { color: G_BLUE_TINT },
    line: { color: 'AECBFA', width: 0.85 },
  });
  slide.addText(wsBadgeText, {
    x: 0.92,
    y: 0.96,
    w: 6.55,
    h: 0.32,
    fontSize: 8.6,
    bold: true,
    color: G_BLUE_DEEP,
    valign: 'middle',
    fontFace: 'Arial',
  });

  // Main Deck Title
  slide.addText(deck.deckTitle, {
    x: 0.82,
    y: 1.34,
    w: 6.80,
    h: 1.42,
    fontSize: 19.5,
    bold: true,
    color: TEXT_DARK,
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  });

  // Subtitle + UI Key Point Callout Box (1:1 with UI '> Key point:')
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.82,
    y: 2.82,
    w: 6.80,
    h: 1.18,
    rectRadius: 0.06,
    fill: { color: G_BLUE_TINT },
    line: { color: 'AECBFA', width: 1 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.82,
    y: 2.82,
    w: 0.09,
    h: 1.18,
    fill: { color: G_BLUE_DARK },
  });
  slide.addText('KEY POINT • GOOGLE CLOUD ARCHITECTURE CENTER', {
    x: 1.00,
    y: 2.88,
    w: 6.50,
    h: 0.22,
    fontSize: 7.8,
    bold: true,
    color: G_BLUE_DEEP,
    fontFace: 'Arial',
    valign: 'middle',
  });
  slide.addText(deck.deckSubtitle, {
    x: 1.00,
    y: 3.10,
    w: 6.50,
    h: 0.84,
    fontSize: 9.2,
    color: TEXT_DARK,
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  });

  // 3 Workstream Overview Pillars bound 1:1 to deck.tldr (top-of-page UI overview)
  const pillarColors = [
    { bar: G_BLUE_DARK, tint: G_BLUE_TINT, border: 'AECBFA', text: G_BLUE_DEEP },
    { bar: G_GREEN_DARK, tint: G_GREEN_TINT, border: 'CEEAD6', text: G_GREEN_DEEP },
    { bar: G_YELLOW_DARK, tint: G_YELLOW_TINT, border: 'FDE293', text: G_YELLOW_TEXT },
  ];
  const rawTldr = deck.tldr && deck.tldr.length >= 3
    ? deck.tldr.slice(0, 3)
    : [
        'Pattern A • Pooled Runtime: Shared Cloud Run v2 & AlloyDB RLS with 90% Gemini prefix cache ($42/mo)',
        'Pattern B • Sovereign Silos: Dedicated GCP project, VPC-SC, IAM PAB & <60s CMEK kill-switch ($1,850/mo)',
        'Pattern C • Dynamic Hybrid: Unified Hub ALB, Private Service Connect spokes & 0ms live tier upgrades',
      ];
  const pillars = rawTldr.map((item, idx) => {
    const colonIdx = item.indexOf(':');
    const label = colonIdx > 0 && colonIdx < 52 ? item.slice(0, colonIdx).trim() : `Pillar ${idx + 1}`;
    const sub = colonIdx > 0 && colonIdx < 52 ? item.slice(colonIdx + 1).trim() : item.trim();
    return {
      label,
      sub,
      ...pillarColors[idx % pillarColors.length],
    };
  });
  pillars.forEach((p, idx) => {
    const px = Number((0.82 + idx * 2.28).toFixed(3));
    slide.addShape(pptx.ShapeType.roundRect, {
      x: px,
      y: 4.12,
      w: 2.16,
      h: 1.62,
      rectRadius: 0.06,
      fill: { color: SURFACE_BG },
      line: { color: p.border, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: px,
      y: 4.12,
      w: 2.16,
      h: 0.06,
      fill: { color: p.bar },
    });
    slide.addText(p.label, {
      x: px + 0.10,
      y: 4.20,
      w: 1.96,
      h: 0.36,
      fontSize: 8.2,
      bold: true,
      color: p.text,
      fontFace: 'Arial',
      valign: 'middle',
      wrap: true,
    });
    slide.addText(p.sub, {
      x: px + 0.10,
      y: 4.58,
      w: 1.96,
      h: 1.10,
      fontSize: 7.3,
      color: TEXT_BODY,
      fontFace: 'Arial',
      valign: 'top',
      wrap: true,
    });
  });

  // Right Column: Official 4-Zone Hub-and-Spoke Reference Architecture Card (#78)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 8.05,
    y: 0.36,
    w: 4.83,
    h: 5.58,
    rectRadius: 0.09,
    fill: { color: WHITE },
    line: { color: 'AECBFA', width: 1.25 },
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 8.05,
    y: 0.36,
    w: 4.83,
    h: 0.44,
    rectRadius: 0.06,
    fill: { color: G_BLUE_TINT },
    line: { color: 'AECBFA', width: 1 },
  });
  slide.addText('OFFICIAL 4-ZONE HUB-AND-SPOKE TOPOLOGY (#78)', {
    x: 8.18,
    y: 0.39,
    w: 4.56,
    h: 0.38,
    fontSize: 8.8,
    bold: true,
    color: G_BLUE_DEEP,
    align: 'center',
    valign: 'middle',
    fontFace: 'Arial',
  });

  const titleZones = [
    {
      badge: 'ZONE 1 • ROUTING HUB',
      title: '1. Edge WAF, OBO/DPoP & Tier Router',
      sub: 'Cloud Armor, IAP, IAM STS & Agent Engine Registry verify OIDC identity, strip spoofed headers & filter tools.',
      fill: 'AECBFA',
      border: '174EA6',
      text: '174EA6',
    },
    {
      badge: 'ZONE 2 • GOVERNANCE HUB',
      title: '2. Security, CMEK & FinOps Telemetry',
      sub: 'Security Command Center, Cloud KMS CMEK & BigQuery OTel govern encryption liveness and zero-PII chargeback.',
      fill: 'CEEAD6',
      border: '137333',
      text: '0D652D',
    },
    {
      badge: 'ZONE 3 • LEFT SPOKE',
      title: '3. Model Armor, ADK & 90% Prefix Cache',
      sub: 'Screens prompts (4/6), executes Gemini 2.5 Pro with 90% cache (5), clamps RPM in Valkey & isolates L1–L5 memory.',
      fill: 'FEEFC3',
      border: 'B06000',
      text: 'B06000',
    },
    {
      badge: 'ZONE 4 • RIGHT SPOKE',
      title: '4. 2LO/3LO MCP, AlloyDB RLS & PSC Vaults',
      sub: 'Enforces PostgreSQL Row-Level Security, 3LO step-up consent, VPC-SC perimeters & <60s CMEK kill-switches.',
      fill: 'FAD2CF',
      border: 'C5221F',
      text: 'A50E0E',
    },
  ];

  titleZones.forEach((tz, zIdx) => {
    const zy = Number((0.92 + zIdx * 1.09).toFixed(3));
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.22,
      y: zy,
      w: 4.48,
      h: 0.98,
      rectRadius: 0.06,
      fill: { color: SURFACE_BG },
      line: { color: tz.border, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 8.22,
      y: zy,
      w: 0.1,
      h: 0.98,
      fill: { color: tz.border },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.38,
      y: Number((zy + 0.08).toFixed(3)),
      w: 1.62,
      h: 0.22,
      rectRadius: 0.04,
      fill: { color: tz.fill },
    });
    slide.addText(tz.badge, {
      x: 8.38,
      y: Number((zy + 0.08).toFixed(3)),
      w: 1.62,
      h: 0.22,
      fontSize: 6.5,
      bold: true,
      color: tz.text,
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial',
    });
    slide.addText(tz.title, {
      x: 10.06,
      y: Number((zy + 0.06).toFixed(3)),
      w: 2.56,
      h: 0.26,
      fontSize: 8.6,
      bold: true,
      color: TEXT_DARK,
      valign: 'middle',
      fontFace: 'Arial',
    });
    slide.addText(tz.sub, {
      x: 8.38,
      y: Number((zy + 0.36).toFixed(3)),
      w: 4.22,
      h: 0.56,
      fontSize: 7.7,
      color: TEXT_BODY,
      valign: 'top',
      fontFace: 'Arial',
      wrap: true,
    });
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 8.22,
    y: 5.34,
    w: 4.48,
    h: 0.44,
    rectRadius: 0.05,
    fill: { color: G_GREEN_TINT },
    line: { color: 'CEEAD6', width: 0.85 },
  });
  slide.addText('3 Slides per Blueprint: ① Editable Diagram → ② Logical Flow → ③ Technical Flow', {
    x: 8.24,
    y: 5.34,
    w: 4.44,
    h: 0.44,
    fontSize: 7.4,
    bold: true,
    color: G_GREEN_DEEP,
    align: 'center',
    valign: 'middle',
    fontFace: 'Arial',
  });

  // Bottom 4-Card KPI Ribbon (Light Theme White Cards with Colored Left Bars)
  const kpis = [
    {
      val: '3 Isolation Topologies',
      lbl: 'Pattern A Pooled ($42/mo), Pattern B Sovereign Silos ($1,850/mo) & Pattern C Hybrid PSC',
      color: G_BLUE_DARK,
    },
    {
      val: '5 Cryptographic Hops',
      lbl: 'Verified across Edge OBO/DPoP, Agent Registry, Memory Bank, Model Armor & AlloyDB RLS',
      color: G_GREEN_DARK,
    },
    {
      val: '84.7% Token Savings',
      lbl: 'Gemini 2.5 Pro ContextCacheConfig (90% prefix discount) + Memorystore Valkey bulkheads',
      color: G_YELLOW_DARK,
    },
    {
      val: '20/20 Verified Gates',
      lbl: '10/10 Pattern A Breach, 6/6 Pattern B Silo Kill-Switch & 4/4 Pattern C Live Migration PASS',
      color: G_RED_DARK,
    },
  ];
  kpis.forEach((k, idx) => {
    const kx = Number((0.45 + idx * 3.15).toFixed(3));
    slide.addShape(pptx.ShapeType.roundRect, {
      x: kx,
      y: 6.10,
      w: 2.98,
      h: 1.04,
      rectRadius: 0.07,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 0.85 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: kx,
      y: 6.10,
      w: 0.09,
      h: 1.04,
      fill: { color: k.color },
    });
    slide.addText(k.val, {
      x: kx + 0.18,
      y: 6.16,
      w: 2.70,
      h: 0.34,
      fontSize: 12.2,
      bold: true,
      color: TEXT_DARK,
      fontFace: 'Arial',
      valign: 'middle',
    });
    slide.addText(k.lbl, {
      x: kx + 0.18,
      y: 6.50,
      w: 2.70,
      h: 0.56,
      fontSize: 7.9,
      color: TEXT_BODY,
      fontFace: 'Arial',
      valign: 'top',
      wrap: true,
    });
  });

  addFooter(pptx, slide, SERIES_LINE);
  slide.addNotes(`${deck.deckTitle}\n\n${deck.deckSubtitle}\n\nSeries: ${SERIES_LINE}`);
  return slide;
}

// ---------------------------------------------------------------------------------------------
// Layout A: Enhanced Structured Architecture Cards with Inner Technical Spec Boxes (`cards`)
// ---------------------------------------------------------------------------------------------

function addBulletSlide(
  pptx: Pptx,
  kicker: string,
  heading: string,
  bullets: string[],
  opts: {
    notes?: string;
    footer?: string;
    accent?: string;
    isTakeaways?: boolean;
    specs?: CardTechSpec[];
  } = {}
) {
  const slide = pptx.addSlide();
  slide.background = { color: SURFACE_BG };
  const isTakeaways = Boolean(opts.isTakeaways) || heading.toLowerCase().includes('takeaway');
  const isTldr = heading.toLowerCase().includes('tl;dr') || heading.toLowerCase().includes('program map');
  const primaryAccent = opts.accent || (isTakeaways ? G_GREEN_DARK : G_BLUE_DARK);

  addHeaderBar(
    pptx,
    slide,
    kicker,
    heading,
    isTakeaways ? 'PRODUCTION MANDATES • EDITABLE' : isTldr ? 'EXECUTIVE SUMMARY • EDITABLE' : 'GOOGLE CLOUD ARCHITECTURE'
  );

  // Top Section Title Banner Card
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4,
    y: HEADER_H + 0.12,
    w: SLIDE_W - 0.8,
    h: 0.72,
    rectRadius: 0.07,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 0.75 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4,
    y: HEADER_H + 0.12,
    w: 0.11,
    h: 0.72,
    fill: { color: primaryAccent },
  });

  const subKicker = isTakeaways
    ? 'KEY ARCHITECTURAL TAKEAWAYS & PRODUCTION VERIFICATION CHECKLIST'
    : isTldr
      ? 'EXECUTIVE SUMMARY • MULTI-TENANT AGENTIC AI REFERENCE PILLARS'
      : 'GOOGLE CLOUD ARCHITECTURE CENTER • TECHNICAL REFERENCE BREAKDOWN';

  slide.addText(subKicker, {
    x: 0.65,
    y: HEADER_H + 0.17,
    w: 8.8,
    h: 0.20,
    fontSize: 8.2,
    bold: true,
    color: primaryAccent,
    fontFace: 'Arial',
    valign: 'middle',
  });
  slide.addText(heading, {
    x: 0.65,
    y: HEADER_H + 0.37,
    w: 9.3,
    h: 0.40,
    fontSize: 17.5,
    bold: true,
    color: TEXT_DARK,
    fontFace: 'Arial',
    valign: 'middle',
  });

  // Right-side count pill inside Title Banner
  const countBadgeW = 2.65;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: SLIDE_W - countBadgeW - 0.58,
    y: HEADER_H + 0.29,
    w: countBadgeW,
    h: 0.36,
    rectRadius: 0.06,
    fill: { color: isTakeaways ? G_GREEN_TINT : G_BLUE_TINT },
    line: { color: isTakeaways ? 'CEEAD6' : 'AECBFA', width: 0.75 },
  });
  slide.addText(`${bullets.length} Architectural Pillars`, {
    x: SLIDE_W - countBadgeW - 0.58,
    y: HEADER_H + 0.29,
    w: countBadgeW,
    h: 0.36,
    fontSize: 8.8,
    bold: true,
    color: isTakeaways ? G_GREEN_DEEP : G_BLUE_DEEP,
    align: 'center',
    valign: 'middle',
    fontFace: 'Arial',
  });

  // Bento Card Grid Geometry
  const gridTop = HEADER_H + 0.96;
  const gridBottom = SLIDE_H - 0.92;
  const availH = gridBottom - gridTop;
  const leftMargin = 0.4;
  const availW = SLIDE_W - leftMargin * 2;
  const gapX = 0.20;
  const gapY = 0.16;

  const parsedCards = bullets.map((b, i) => parseBulletIntoCard(b, i, opts.specs?.[i]));
  const n = parsedCards.length;

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
    const row1H = availH * 0.505 - gapY / 2;
    const row2H = availH * 0.495 - gapY / 2;
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
      rectRadius: 0.07,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 1 },
    });

    // Top Colored Accent Stripe
    slide.addShape(pptx.ShapeType.rect, {
      x: cx,
      y: cy,
      w: cw,
      h: 0.06,
      fill: { color: accent.bar },
    });

    // Numbered Step Pill Badge (01, 02, ...)
    const numStr = String(idx + 1).padStart(2, '0');
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((cx + 0.14).toFixed(3)),
      y: Number((cy + 0.12).toFixed(3)),
      w: 0.38,
      h: 0.28,
      rectRadius: 0.05,
      fill: { color: accent.tint },
      line: { color: accent.border, width: 0.75 },
    });
    slide.addText(numStr, {
      x: Number((cx + 0.14).toFixed(3)),
      y: Number((cy + 0.12).toFixed(3)),
      w: 0.38,
      h: 0.28,
      fontSize: 9.2,
      bold: true,
      color: accent.text,
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial',
    });

    // Card Title
    slide.addText(card.title, {
      x: Number((cx + 0.60).toFixed(3)),
      y: Number((cy + 0.10).toFixed(3)),
      w: Number((cw - 0.74).toFixed(3)),
      h: 0.36,
      fontSize: cw > 4.5 ? 11.2 : 10.4,
      bold: true,
      color: TEXT_DARK,
      fontFace: 'Arial',
      valign: 'middle',
      wrap: true,
    });

    // Subtle divider line inside card
    slide.addShape(pptx.ShapeType.rect, {
      x: Number((cx + 0.14).toFixed(3)),
      y: Number((cy + 0.50).toFixed(3)),
      w: Number((cw - 0.28).toFixed(3)),
      h: 0.01,
      fill: { color: 'E2E8F0' },
    });

    // Card Narrative Body
    const specBoxH = 0.52;
    const tagBarH = 0.23;
    const bodyH = Math.max(0.42, ch - 0.54 - specBoxH - tagBarH - 0.18);
    slide.addText(card.body, {
      x: Number((cx + 0.14).toFixed(3)),
      y: Number((cy + 0.54).toFixed(3)),
      w: Number((cw - 0.28).toFixed(3)),
      h: Number(bodyH.toFixed(3)),
      fontSize: cw > 4.5 ? 9.6 : 9.0,
      color: TEXT_BODY,
      fontFace: 'Arial',
      valign: 'top',
      wrap: true,
    });

    // Inner Google Cloud Technical Specification Box (Fills lower-middle card with high-value specs!)
    const specY = Number((cy + ch - tagBarH - specBoxH - 0.12).toFixed(3));
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((cx + 0.14).toFixed(3)),
      y: specY,
      w: Number((cw - 0.28).toFixed(3)),
      h: specBoxH,
      rectRadius: 0.04,
      fill: { color: SURFACE_BG },
      line: { color: accent.border, width: 0.65 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: Number((cx + 0.14).toFixed(3)),
      y: specY,
      w: 0.06,
      h: specBoxH,
      fill: { color: accent.bar },
    });
    slide.addText(
      [
        {
          text: `▸ Cloud Stack: ${card.stack}\n`,
          options: { fontSize: 7.4, bold: true, color: accent.text },
        },
        {
          text: `▸ Target & SLA: ${card.sla}`,
          options: { fontSize: 7.2, bold: false, color: TEXT_BODY },
        },
      ],
      {
        x: Number((cx + 0.24).toFixed(3)),
        y: Number((specY + 0.03).toFixed(3)),
        w: Number((cw - 0.42).toFixed(3)),
        h: Number((specBoxH - 0.06).toFixed(3)),
        fontFace: 'Arial',
        valign: 'middle',
        wrap: true,
      }
    );

    // Bottom Technical Component Tag Pill inside card
    const tagStr = card.tags.join('  •  ');
    const tagY = Number((cy + ch - tagBarH - 0.06).toFixed(3));
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((cx + 0.14).toFixed(3)),
      y: tagY,
      w: Number((cw - 0.28).toFixed(3)),
      h: tagBarH,
      rectRadius: 0.04,
      fill: { color: accent.tint },
    });
    slide.addText(tagStr, {
      x: Number((cx + 0.20).toFixed(3)),
      y: tagY,
      w: Number((cw - 0.40).toFixed(3)),
      h: tagBarH,
      fontSize: 7.5,
      bold: true,
      color: accent.text,
      valign: 'middle',
      fontFace: 'Arial',
    });
  });

  addLightExecutiveCalloutBanner(
    pptx,
    slide,
    isTakeaways ? 'NEXT STEP / ACTION' : 'ARCHITECTURAL MANDATE',
    opts.footer || SERIES_LINE,
    isTakeaways
  );
  addFooter(pptx, slide, SERIES_LINE);
  slide.addNotes(opts.notes || `${heading}\n\n${bullets.map((b) => `• ${b}`).join('\n')}`);
  return slide;
}

// ---------------------------------------------------------------------------------------------
// Layout B: Google Cloud Architecture Comparison Matrix + Bottom Decision Cards (`table`)
// ---------------------------------------------------------------------------------------------

function addComparisonTableSlide(
  pptx: Pptx,
  kicker: string,
  section: DeckSection,
  opts: { footer?: string } = {}
) {
  const slide = pptx.addSlide();
  slide.background = { color: SURFACE_BG };
  addHeaderBar(pptx, slide, kicker, section.heading, 'ARCHITECTURE COMPARISON MATRIX');

  // Top Section Title Banner Card
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4,
    y: HEADER_H + 0.10,
    w: SLIDE_W - 0.8,
    h: 0.64,
    rectRadius: 0.06,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 0.75 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4,
    y: HEADER_H + 0.10,
    w: 0.10,
    h: 0.64,
    fill: { color: G_BLUE_DARK },
  });
  slide.addText('GOOGLE CLOUD WELL-ARCHITECTED EVALUATION MATRIX & PRODUCTION TAKEAWAYS', {
    x: 0.62,
    y: HEADER_H + 0.14,
    w: 9.0,
    h: 0.18,
    fontSize: 7.8,
    bold: true,
    color: G_BLUE_DARK,
    fontFace: 'Arial',
  });
  slide.addText(section.heading, {
    x: 0.62,
    y: HEADER_H + 0.32,
    w: 9.4,
    h: 0.36,
    fontSize: 16.0,
    bold: true,
    color: TEXT_DARK,
    fontFace: 'Arial',
    valign: 'middle',
  });

  // Build Comparison Table
  const headers = section.tableHeaders || ['Dimension', 'Option A', 'Option B', 'Option C'];
  const rawRows = section.tableRows || [];
  const isDenseTable = rawRows.length >= 8;
  const isMediumTable = rawRows.length >= 5 && rawRows.length < 8;
  const headerFont = isDenseTable ? 8.0 : isMediumTable ? 8.4 : 8.6;
  const cellFontFirst = isDenseTable ? 7.2 : isMediumTable ? 7.7 : 8.0;
  const cellFontBody = isDenseTable ? 7.0 : isMediumTable ? 7.5 : 7.8;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableData: any[][] = [
    headers.map((h) => ({
      text: h,
      options: {
        bold: true,
        fill: { color: G_BLUE_DEEP },
        color: WHITE,
        fontSize: headerFont,
        valign: 'middle',
      },
    })),
  ];

  rawRows.forEach((r, rIdx) => {
    const rowBg = rIdx % 2 === 0 ? WHITE : SURFACE_BG;
    tableData.push(
      r.map((cellText, cIdx) => ({
        text: cellText,
        options: {
          fontSize: cIdx === 0 ? cellFontFirst : cellFontBody,
          bold: cIdx === 0 || (cIdx === r.length - 1 && cellText.includes('PASS')),
          color:
            cIdx === 0
              ? G_BLUE_DEEP
              : cIdx === r.length - 1 && (cellText.includes('PASS') || cellText.includes('$'))
                ? G_GREEN_DEEP
                : TEXT_BODY,
          fill: { color: rowBg },
          valign: 'middle',
        },
      }))
    );
  });

  const colW = section.tableColW || [2.35, 3.35, 3.4, 3.433];
  slide.addTable(tableData, {
    x: 0.4,
    y: HEADER_H + 0.80,
    w: SLIDE_W - 0.8,
    colW,
    border: { type: 'solid', color: BORDER_GREY, pt: 0.75 },
    fill: { color: WHITE },
    fontFace: 'Arial',
  });

  // Render bottom 3 decision cards ONLY when table has <= 3 rows so full UI matrices never overlap
  if (rawRows.length <= 3 && section.bullets && section.bullets.length > 0) {
    const summaryCards = section.bullets.slice(0, 3).map((b, i) => parseBulletIntoCard(b, i, section.specs?.[i]));
    const cardTop = 4.34;
    const cardH = 2.18;
    const gapX = 0.20;
    const cardW = (SLIDE_W - 0.8 - gapX * (summaryCards.length - 1)) / Math.max(1, summaryCards.length);

    summaryCards.forEach((card, idx) => {
      const cx = Number((0.4 + idx * (cardW + gapX)).toFixed(3));
      const accent = GOOGLE_CARD_ACCENTS[idx % GOOGLE_CARD_ACCENTS.length];
      slide.addShape(pptx.ShapeType.roundRect, {
        x: cx,
        y: cardTop,
        w: Number(cardW.toFixed(3)),
        h: cardH,
        rectRadius: 0.07,
        fill: { color: WHITE },
        line: { color: BORDER_GREY, width: 1 },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: cx,
        y: cardTop,
        w: Number(cardW.toFixed(3)),
        h: 0.06,
        fill: { color: accent.bar },
      });
      slide.addText(card.title, {
        x: Number((cx + 0.14).toFixed(3)),
        y: Number((cardTop + 0.10).toFixed(3)),
        w: Number((cardW - 0.28).toFixed(3)),
        h: 0.34,
        fontSize: 9.8,
        bold: true,
        color: accent.text,
        fontFace: 'Arial',
        valign: 'middle',
        wrap: true,
      });
      slide.addText(card.body, {
        x: Number((cx + 0.14).toFixed(3)),
        y: Number((cardTop + 0.46).toFixed(3)),
        w: Number((cardW - 0.28).toFixed(3)),
        h: 0.88,
        fontSize: 8.3,
        color: TEXT_BODY,
        fontFace: 'Arial',
        valign: 'top',
        wrap: true,
      });
      const specY = Number((cardTop + 1.36).toFixed(3));
      slide.addShape(pptx.ShapeType.roundRect, {
        x: Number((cx + 0.14).toFixed(3)),
        y: specY,
        w: Number((cardW - 0.28).toFixed(3)),
        h: 0.48,
        rectRadius: 0.04,
        fill: { color: SURFACE_BG },
        line: { color: accent.border, width: 0.6 },
      });
      slide.addText(
        [
          { text: `▸ Stack: ${card.stack}\n`, options: { fontSize: 6.9, bold: true, color: accent.text } },
          { text: `▸ SLA: ${card.sla}`, options: { fontSize: 6.8, color: TEXT_BODY } },
        ],
        {
          x: Number((cx + 0.20).toFixed(3)),
          y: Number((specY + 0.03).toFixed(3)),
          w: Number((cardW - 0.38).toFixed(3)),
          h: 0.42,
          fontFace: 'Arial',
          valign: 'middle',
          wrap: true,
        }
      );
      slide.addShape(pptx.ShapeType.roundRect, {
        x: Number((cx + 0.14).toFixed(3)),
        y: Number((cardTop + cardH - 0.27).toFixed(3)),
        w: Number((cardW - 0.28).toFixed(3)),
        h: 0.21,
        rectRadius: 0.04,
        fill: { color: accent.tint },
      });
      slide.addText(card.tags[0], {
        x: Number((cx + 0.20).toFixed(3)),
        y: Number((cardTop + cardH - 0.27).toFixed(3)),
        w: Number((cardW - 0.40).toFixed(3)),
        h: 0.21,
        fontSize: 7.2,
        bold: true,
        color: accent.text,
        fontFace: 'Arial',
        valign: 'middle',
      });
    });
  }

  addLightExecutiveCalloutBanner(pptx, slide, 'ARCHITECTURAL MANDATE', opts.footer || SERIES_LINE, false);
  addFooter(pptx, slide, SERIES_LINE);
  slide.addNotes(`${section.heading}\n\n${section.bullets.map((b) => `• ${b}`).join('\n')}`);
  return slide;
}

// ---------------------------------------------------------------------------------------------
// Layout C: 5-Hop Horizontal Cryptographic Verification Pipeline (`pipeline`)
// ---------------------------------------------------------------------------------------------

function addPipelineSlide(
  pptx: Pptx,
  kicker: string,
  section: DeckSection,
  opts: { footer?: string } = {}
) {
  const slide = pptx.addSlide();
  slide.background = { color: SURFACE_BG };
  addHeaderBar(pptx, slide, kicker, section.heading, '5-HOP CRYPTOGRAPHIC PIPELINE');

  // Top Section Title Banner Card
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4,
    y: HEADER_H + 0.10,
    w: SLIDE_W - 0.8,
    h: 0.64,
    rectRadius: 0.06,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 0.75 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4,
    y: HEADER_H + 0.10,
    w: 0.10,
    h: 0.64,
    fill: { color: G_BLUE_DARK },
  });
  slide.addText('END-TO-END 5-HOP CRYPTOGRAPHIC DEFENSE-IN-DEPTH PIPELINE (ZERO TRUST BY DESIGN)', {
    x: 0.62,
    y: HEADER_H + 0.14,
    w: 9.2,
    h: 0.18,
    fontSize: 7.8,
    bold: true,
    color: G_BLUE_DARK,
    fontFace: 'Arial',
  });
  slide.addText(section.heading, {
    x: 0.62,
    y: HEADER_H + 0.32,
    w: 9.6,
    h: 0.36,
    fontSize: 16.0,
    bold: true,
    color: TEXT_DARK,
    fontFace: 'Arial',
    valign: 'middle',
  });

  const steps: PipelineStepSpec[] = section.pipelineSteps || [];
  const pipeTop = HEADER_H + 0.84;
  const pipeH = 5.10;
  const gapX = 0.18;
  const colW = Number(((SLIDE_W - 0.8 - gapX * 4) / 5).toFixed(3)); // ~2.362" per hop column

  steps.slice(0, 5).forEach((st, idx) => {
    const cx = Number((0.4 + idx * (colW + gapX)).toFixed(3));
    const accent = GOOGLE_CARD_ACCENTS[idx % GOOGLE_CARD_ACCENTS.length];

    // Column Outer Card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx,
      y: pipeTop,
      w: colW,
      h: pipeH,
      rectRadius: 0.07,
      fill: { color: WHITE },
      line: { color: accent.border, width: 1.1 },
    });

    // Top Colored Hop Banner
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx,
      y: pipeTop,
      w: colW,
      h: 0.42,
      rectRadius: 0.05,
      fill: { color: accent.bar },
    });
    slide.addText(`${st.hop}  •  ${st.stage.toUpperCase()}`, {
      x: Number((cx + 0.08).toFixed(3)),
      y: pipeTop,
      w: Number((colW - 0.16).toFixed(3)),
      h: 0.42,
      fontSize: 8.0,
      bold: true,
      color: WHITE,
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial',
    });

    // Hop Title
    slide.addText(st.title, {
      x: Number((cx + 0.12).toFixed(3)),
      y: Number((pipeTop + 0.50).toFixed(3)),
      w: Number((colW - 0.24).toFixed(3)),
      h: 0.54,
      fontSize: 9.4,
      bold: true,
      color: TEXT_DARK,
      fontFace: 'Arial',
      valign: 'top',
      wrap: true,
    });

    // Google Cloud Service Pill
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((cx + 0.12).toFixed(3)),
      y: Number((pipeTop + 1.08).toFixed(3)),
      w: Number((colW - 0.24).toFixed(3)),
      h: 0.34,
      rectRadius: 0.05,
      fill: { color: accent.tint },
      line: { color: accent.border, width: 0.75 },
    });
    slide.addText(st.service, {
      x: Number((cx + 0.16).toFixed(3)),
      y: Number((pipeTop + 1.08).toFixed(3)),
      w: Number((colW - 0.32).toFixed(3)),
      h: 0.34,
      fontSize: 7.4,
      bold: true,
      color: accent.text,
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial',
      wrap: true,
    });

    // Architectural Mechanism Body
    slide.addText(st.mechanism, {
      x: Number((cx + 0.12).toFixed(3)),
      y: Number((pipeTop + 1.50).toFixed(3)),
      w: Number((colW - 0.24).toFixed(3)),
      h: 1.72,
      fontSize: 8.2,
      color: TEXT_BODY,
      fontFace: 'Arial',
      valign: 'top',
      wrap: true,
    });

    // Cryptographic Invariant Box
    const invY = Number((pipeTop + 3.28).toFixed(3));
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((cx + 0.12).toFixed(3)),
      y: invY,
      w: Number((colW - 0.24).toFixed(3)),
      h: 0.96,
      rectRadius: 0.05,
      fill: { color: SURFACE_BG },
      line: { color: BORDER_GREY, width: 0.75 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: Number((cx + 0.12).toFixed(3)),
      y: invY,
      w: 0.06,
      h: 0.96,
      fill: { color: accent.bar },
    });
    slide.addText(
      [
        { text: 'CRYPTOGRAPHIC INVARIANT\n', options: { fontSize: 6.8, bold: true, color: accent.text } },
        { text: st.invariant, options: { fontSize: 7.5, bold: true, color: TEXT_DARK } },
      ],
      {
        x: Number((cx + 0.22).toFixed(3)),
        y: Number((invY + 0.06).toFixed(3)),
        w: Number((colW - 0.38).toFixed(3)),
        h: 0.84,
        fontFace: 'Arial',
        valign: 'middle',
        wrap: true,
      }
    );

    // Bottom Fail-Closed HTTP Gate Pill
    const gateY = Number((pipeTop + 4.34).toFixed(3));
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((cx + 0.12).toFixed(3)),
      y: gateY,
      w: Number((colW - 0.24).toFixed(3)),
      h: 0.64,
      rectRadius: 0.05,
      fill: { color: G_RED_TINT },
      line: { color: 'FAD2CF', width: 0.75 },
    });
    slide.addText(
      [
        { text: 'FAIL-CLOSED GATE\n', options: { fontSize: 6.6, bold: true, color: G_RED_DEEP } },
        { text: st.gate, options: { fontSize: 7.3, bold: true, color: 'C5221F' } },
      ],
      {
        x: Number((cx + 0.18).toFixed(3)),
        y: Number((gateY + 0.04).toFixed(3)),
        w: Number((colW - 0.36).toFixed(3)),
        h: 0.56,
        align: 'center',
        valign: 'middle',
        fontFace: 'Arial',
        wrap: true,
      }
    );

    // Directional Arrow Badge Between Hop Columns
    if (idx < 4) {
      const arrowX = Number((cx + colW + (gapX - 0.22) / 2).toFixed(3));
      const arrowY = Number((pipeTop + pipeH / 2 - 0.11).toFixed(3));
      slide.addShape(pptx.ShapeType.ellipse, {
        x: arrowX,
        y: arrowY,
        w: 0.22,
        h: 0.22,
        fill: { color: G_BLUE_DARK },
      });
      slide.addText('→', {
        x: arrowX,
        y: arrowY,
        w: 0.22,
        h: 0.22,
        fontSize: 8.5,
        bold: true,
        color: WHITE,
        align: 'center',
        valign: 'middle',
        fontFace: 'Arial',
      });
    }
  });

  addLightExecutiveCalloutBanner(pptx, slide, '5-HOP VERIFICATION', opts.footer || SERIES_LINE, false);
  addFooter(pptx, slide, SERIES_LINE);
  slide.addNotes(`${section.heading}\n\n${section.bullets.map((b) => `• ${b}`).join('\n')}`);
  return slide;
}

function addSectionSlideDispatch(
  pptx: Pptx,
  kicker: string,
  section: DeckSection,
  opts: { footer?: string } = {}
) {
  if (section.layout === 'table' && section.tableRows && section.tableRows.length > 0) {
    return addComparisonTableSlide(pptx, kicker, section, opts);
  }
  if (section.layout === 'pipeline' && section.pipelineSteps && section.pipelineSteps.length > 0) {
    return addPipelineSlide(pptx, kicker, section, opts);
  }
  return addBulletSlide(pptx, kicker, section.heading, section.bullets, {
    footer: opts.footer,
    specs: section.specs,
  });
}

// ---------------------------------------------------------------------------------------------
// Light-Theme Section Divider & Blueprint Summary Slide (Rule 54)
// ---------------------------------------------------------------------------------------------

function addSectionDivider(pptx: Pptx, kicker: string, heading: string, sub: string) {
  const slide = pptx.addSlide();
  slide.background = { color: SURFACE_BG };
  addGoogleFourColorRibbon(pptx, slide, 0, 0.085);

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.7,
    y: 1.15,
    w: SLIDE_W - 1.4,
    h: 5.1,
    rectRadius: 0.12,
    fill: { color: WHITE },
    line: { color: 'AECBFA', width: 1.5 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.7,
    y: 1.15,
    w: 0.14,
    h: 5.1,
    fill: { color: G_BLUE_DARK },
  });

  addGoogleFourColorDots(pptx, slide, 1.15, 1.75);
  slide.addText(`${kicker.toUpperCase()}  •  GOOGLE CLOUD ARCHITECTURE CENTER WORKSTREAM`, {
    x: 1.75,
    y: 1.6,
    w: SLIDE_W - 2.8,
    h: 0.3,
    fontSize: 10.5,
    bold: true,
    color: G_BLUE_DARK,
    fontFace: 'Arial',
    valign: 'middle',
  });
  slide.addText(heading, {
    x: 1.15,
    y: 2.15,
    w: SLIDE_W - 2.3,
    h: 1.65,
    fontSize: 26,
    bold: true,
    color: TEXT_DARK,
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  });
  slide.addText(sub, {
    x: 1.15,
    y: 3.95,
    w: SLIDE_W - 2.3,
    h: 1.15,
    fontSize: 13.5,
    color: TEXT_BODY,
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  });
  addFooter(pptx, slide, SERIES_LINE);
  slide.addNotes(`${heading}\n${sub}`);
  return slide;
}

function addAssetsSlide(pptx: Pptx, spec: DeckSpec | null, deck: DeckJson, manifest: ManifestItem[], diagramIds: string[]) {
  const displayIds = diagramIds.slice(0, 6);
  const isCompactTable = displayIds.length >= 4;
  const tblFont = isCompactTable ? 7.6 : 8.4;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[][] = [
    [
      { text: 'Architecture Blueprint (3-Slide Sequence)', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 8.8 } },
      { text: 'Architectural Question Answered', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 8.8 } },
      { text: 'Google Cloud Solution & Verification Outcome', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 8.8 } },
      { text: 'Core Google Cloud Stack', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 8.8 } },
    ],
  ];
  for (let idx = 0; idx < displayIds.length; idx++) {
    const id = displayIds[idx];
    const m = manifest.find((x) => x.id === id);
    if (!m) continue;
    const flow = getDiagramFlowById(id);
    const rowBg = idx % 2 === 0 ? WHITE : SURFACE_BG;
    const questionText = flow?.questionAnswered || m.subtitle || 'How do we isolate multi-tenant agents safely on Google Cloud?';
    let solutionText = flow?.outcomeBody || m.subtitle;
    if (isCompactTable && solutionText.length > 145) {
      const firstSentence = solutionText.split(/(?<=[.!?])\s+/)[0];
      solutionText = firstSentence && firstSentence.length <= 165 ? firstSentence : `${flow?.outcomeTitle || m.title}.`;
    }
    const servicesText = flow?.execCloudServices || 'Cloud Armor, IAP, Vertex AI Agent Engine, Model Armor, AlloyDB & BigQuery';
    rows.push([
      { text: `${m.badge} — ${m.title}`, options: { fontSize: tblFont, color: TEXT_DARK, bold: true, fill: { color: rowBg } } },
      { text: questionText, options: { fontSize: tblFont, color: G_BLUE_DARK, fill: { color: rowBg } } },
      { text: solutionText, options: { fontSize: tblFont, color: TEXT_BODY, fill: { color: rowBg } } },
      { text: servicesText, options: { fontSize: Number((tblFont - 0.2).toFixed(1)), color: G_GREEN_DARK, bold: true, fill: { color: rowBg } } },
    ]);
  }
  const slide = pptx.addSlide();
  slide.background = { color: SURFACE_BG };
  addHeaderBar(pptx, slide, spec ? spec.key : 'PROGRAM', 'Architecture Blueprint Summary & Reference Lineage', 'EXECUTIVE REFERENCE');

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4,
    y: HEADER_H + 0.14,
    w: SLIDE_W - 0.8,
    h: 0.62,
    rectRadius: 0.06,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 0.75 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4,
    y: HEADER_H + 0.14,
    w: 0.1,
    h: 0.62,
    fill: { color: G_BLUE_DARK },
  });
  slide.addText('At-a-Glance Blueprint Index: Architectural Questions, Verified Outcomes & Google Cloud Services', {
    x: 0.65,
    y: HEADER_H + 0.2,
    w: SLIDE_W - 1.3,
    h: 0.48,
    fontSize: 15.0,
    bold: true,
    color: TEXT_DARK,
    fontFace: 'Arial',
    valign: 'middle',
  });

  slide.addTable(rows, {
    x: 0.4,
    y: HEADER_H + 0.84,
    w: SLIDE_W - 0.8,
    colW: [3.05, 3.0, 3.65, 2.833],
    border: { type: 'solid', color: BORDER_GREY, pt: 0.75 },
    fill: { color: WHITE },
    fontFace: 'Arial',
  });

  const sourceCards = [
    {
      title: '1. 3-Slide Sequence per Blueprint',
      body: 'Every architecture blueprint in this deck includes (1) a 100% Native Editable Diagram + 4-Zone Reference Sidebar, (2) a Step-by-Step Logical Flow, and (3) a Protocol & Code Technical Flow.',
      tag: '56 Editable Shapes + 23 Connectors per Diagram',
      accent: GOOGLE_CARD_ACCENTS[0],
    },
    {
      title: '2. Automated Security & FinOps Proof',
      body: 'All patterns are certified by 12 forensic checks and 20 simulation assertions—proving zero cross-tenant data bleed, 90% shared prefix caching savings, and <60s CMEK revocation.',
      tag: '12/12 Forensic Gates • 20/20 Simulations PASS',
      accent: GOOGLE_CARD_ACCENTS[1],
    },
    {
      title: '3. Official Architecture Center Alignment',
      body: 'Extends the official Google Cloud Architecture Center multi-tenant agentic AI blueprint (#78) with production-ready code and Terraform for Pooled, Siloed, and Hybrid SaaS.',
      tag: 'Google Cloud Architecture Center • Hub & Spoke',
      accent: GOOGLE_CARD_ACCENTS[2],
    },
  ];
  const rowUnitH = displayIds.length >= 6 ? 0.54 : displayIds.length >= 4 ? 0.64 : 0.76;
  const estimatedTableH = 0.36 + displayIds.length * rowUnitH;
  const cardY = Number(Math.min(SLIDE_H - 1.92, Math.max(HEADER_H + 0.84 + estimatedTableH + 0.18, 3.55)).toFixed(3));
  const cardH = Number(Math.min(2.15, Math.max(1.36, SLIDE_H - cardY - 0.56)).toFixed(3));
  const cardW = (SLIDE_W - 0.8 - 0.4) / 3;
  sourceCards.forEach((sc, idx) => {
    const sx = Number((0.4 + idx * (cardW + 0.2)).toFixed(3));
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sx,
      y: cardY,
      w: Number(cardW.toFixed(3)),
      h: cardH,
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
      y: cardY + 0.1,
      w: cardW - 0.3,
      h: 0.28,
      fontSize: 10.2,
      bold: true,
      color: sc.accent.text,
      fontFace: 'Arial',
      valign: 'middle',
    });
    slide.addText(sc.body, {
      x: sx + 0.15,
      y: cardY + 0.4,
      w: cardW - 0.3,
      h: Math.max(0.62, cardH - 0.74),
      fontSize: 8.4,
      color: TEXT_BODY,
      fontFace: 'Arial',
      valign: 'top',
      wrap: true,
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sx + 0.14,
      y: Number((cardY + cardH - 0.29).toFixed(3)),
      w: Number((cardW - 0.28).toFixed(3)),
      h: 0.21,
      rectRadius: 0.04,
      fill: { color: sc.accent.tint },
    });
    slide.addText(sc.tag, {
      x: sx + 0.2,
      y: Number((cardY + cardH - 0.29).toFixed(3)),
      w: Number((cardW - 0.4).toFixed(3)),
      h: 0.21,
      fontSize: 7.4,
      bold: true,
      color: sc.accent.text,
      fontFace: 'Arial',
      valign: 'middle',
    });
  });

  addFooter(pptx, slide, deck.callToAction);
  slide.addNotes(deck.callToAction);
  return slide;
}

// ---------------------------------------------------------------------------------------------
// Diagram E2E Flow Loader (diagrams/diagram_e2e_flows.json)
// ---------------------------------------------------------------------------------------------

interface DiagramZoneSummary {
  zoneId: string;
  colorHex: string;
  borderHex: string;
  name: string;
  role: string;
  nodes: string[];
}

interface DiagramLogicalStep {
  step: string;
  badgeNum: string;
  zone: string;
  title: string;
  logicalNarrative: string;
  components: string;
}

interface DiagramTechnicalStep {
  step: string;
  hopName: string;
  route: string;
  protocolAndMechanism: string;
  codeAndResource: string;
  verifiedOutcome: string;
}

interface DiagramFlowEntry {
  index: number;
  id: string;
  workstream: string;
  workstreamLabel: string;
  badge: string;
  patternBadge: string;
  title: string;
  subtitle: string;
  questionAnswered: string;
  gcpProject: string;
  runtimeTarget: string;
  codeModules: string;
  execCloudServices?: string;
  execTechSummary?: string;
  outcomeTitle: string;
  outcomeBody: string;
  outcomeTech: string;
  zonesSummary: DiagramZoneSummary[];
  logicalSteps: DiagramLogicalStep[];
  technicalSteps: DiagramTechnicalStep[];
}

let cachedDiagramFlows: Map<string, DiagramFlowEntry> | null = null;
function getDiagramFlowById(diagramId: string): DiagramFlowEntry | undefined {
  if (!cachedDiagramFlows) {
    cachedDiagramFlows = new Map<string, DiagramFlowEntry>();
    const flowPath = path.join(FDE_BLOGS_ROOT, 'diagrams', 'diagram_e2e_flows.json');
    if (fs.existsSync(flowPath)) {
      const raw = readJson<{ diagrams: DiagramFlowEntry[] }>(flowPath);
      for (const d of raw.diagrams || []) {
        cachedDiagramFlows.set(d.id, d);
      }
    }
  }
  return cachedDiagramFlows.get(diagramId);
}

// ---------------------------------------------------------------------------------------------
// Right-Hand Official Google Cloud Architecture Center 4-Zone & Walkthrough Sidebar (Slide 1 of 3)
// ---------------------------------------------------------------------------------------------

function renderArchitectureCenterDiagramSidebar(
  pptx: Pptx,
  slide: Slide,
  sideX: number,
  sideY: number,
  sideW: number,
  sideH: number,
  figureLabel: string,
  diagramTitle: string,
  flowEntry: DiagramFlowEntry | undefined,
  talkingPoints: string[],
  vertexCount: number,
  edgeCount: number
) {
  // Outer Sidebar Card
  slide.addShape(pptx.ShapeType.roundRect, {
    x: sideX,
    y: sideY,
    w: sideW,
    h: sideH,
    rectRadius: 0.08,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 1 },
  });

  // 1. Top Header Banner inside Sidebar
  const hdrH = 0.86;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: Number((sideX + 0.12).toFixed(3)),
    y: Number((sideY + 0.10).toFixed(3)),
    w: Number((sideW - 0.24).toFixed(3)),
    h: hdrH,
    rectRadius: 0.06,
    fill: { color: G_BLUE_TINT },
    line: { color: 'AECBFA', width: 0.85 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: Number((sideX + 0.12).toFixed(3)),
    y: Number((sideY + 0.10).toFixed(3)),
    w: 0.08,
    h: hdrH,
    fill: { color: G_BLUE_DARK },
  });
  slide.addText(`${figureLabel.toUpperCase()} • ARCHITECTURE CENTER GUIDE (#78)`, {
    x: Number((sideX + 0.26).toFixed(3)),
    y: Number((sideY + 0.14).toFixed(3)),
    w: Number((sideW - 0.44).toFixed(3)),
    h: 0.18,
    fontSize: 7.4,
    bold: true,
    color: G_BLUE_DEEP,
    fontFace: 'Arial',
  });
  const qText = flowEntry?.questionAnswered || diagramTitle;
  slide.addText(qText, {
    x: Number((sideX + 0.26).toFixed(3)),
    y: Number((sideY + 0.33).toFixed(3)),
    w: Number((sideW - 0.44).toFixed(3)),
    h: 0.58,
    fontSize: 8.1,
    bold: true,
    color: TEXT_DARK,
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  });

  // 2. Section Label: 4 Official Hub-and-Spoke Zones
  slide.addText('4-ZONE HUB-AND-SPOKE BOUNDARIES', {
    x: Number((sideX + 0.14).toFixed(3)),
    y: Number((sideY + 1.02).toFixed(3)),
    w: Number((sideW - 0.28).toFixed(3)),
    h: 0.18,
    fontSize: 7.2,
    bold: true,
    color: TEXT_MUTED,
    fontFace: 'Arial',
  });

  const zones = flowEntry?.zonesSummary || [
    { zoneId: 'Zone 1', colorHex: '#aecbfa', borderHex: '#174ea6', name: 'Routing Hub', role: 'Edge WAF, IAP OIDC & Tier Router', nodes: [] },
    { zoneId: 'Zone 2', colorHex: '#ceead6', borderHex: '#137333', name: 'Governance Hub', role: 'SCC, Cloud KMS CMEK & BigQuery OTel', nodes: [] },
    { zoneId: 'Zone 3', colorHex: '#feefc3', borderHex: '#b06000', name: 'Left Spoke', role: 'Model Armor, ADK & 90% Prefix Cache', nodes: [] },
    { zoneId: 'Zone 4', colorHex: '#fad2cf', borderHex: '#c5221f', name: 'Right Spoke', role: 'MCP Servers, AlloyDB RLS & PSC Spokes', nodes: [] },
  ];

  const zoneStartY = sideY + 1.22;
  const zoneCardH = 0.56;
  const zoneGap = 0.06;
  zones.slice(0, 4).forEach((zn, zIdx) => {
    const zy = Number((zoneStartY + zIdx * (zoneCardH + zoneGap)).toFixed(3));
    const fillHex = zn.colorHex.replace('#', '').toUpperCase();
    const borderHex = zn.borderHex.replace('#', '').toUpperCase();
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((sideX + 0.12).toFixed(3)),
      y: zy,
      w: Number((sideW - 0.24).toFixed(3)),
      h: zoneCardH,
      rectRadius: 0.05,
      fill: { color: SURFACE_BG },
      line: { color: borderHex, width: 0.75 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: Number((sideX + 0.12).toFixed(3)),
      y: zy,
      w: 0.07,
      h: zoneCardH,
      fill: { color: borderHex },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((sideX + 0.24).toFixed(3)),
      y: Number((zy + 0.05).toFixed(3)),
      w: 0.88,
      h: 0.17,
      rectRadius: 0.03,
      fill: { color: fillHex },
    });
    slide.addText(zn.zoneId.toUpperCase(), {
      x: Number((sideX + 0.24).toFixed(3)),
      y: Number((zy + 0.05).toFixed(3)),
      w: 0.88,
      h: 0.17,
      fontSize: 6.0,
      bold: true,
      color: borderHex,
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial',
    });
    slide.addText(zn.name, {
      x: Number((sideX + 1.18).toFixed(3)),
      y: Number((zy + 0.03).toFixed(3)),
      w: Number((sideW - 1.36).toFixed(3)),
      h: 0.20,
      fontSize: 7.4,
      bold: true,
      color: TEXT_DARK,
      valign: 'middle',
      fontFace: 'Arial',
    });
    slide.addText(zn.role, {
      x: Number((sideX + 0.24).toFixed(3)),
      y: Number((zy + 0.24).toFixed(3)),
      w: Number((sideW - 0.42).toFixed(3)),
      h: 0.29,
      fontSize: 6.7,
      color: TEXT_BODY,
      valign: 'top',
      fontFace: 'Arial',
      wrap: true,
    });
  });

  // 3. Key Walkthrough Takeaways (4 Compact Numbered Cards)
  const tpLabelY = zoneStartY + 4 * (zoneCardH + zoneGap) + 0.04;
  slide.addText('KEY ARCHITECTURAL WALKTHROUGH POINTS', {
    x: Number((sideX + 0.14).toFixed(3)),
    y: Number(tpLabelY.toFixed(3)),
    w: Number((sideW - 0.28).toFixed(3)),
    h: 0.18,
    fontSize: 7.2,
    bold: true,
    color: TEXT_MUTED,
    fontFace: 'Arial',
  });

  const tpList = talkingPoints.slice(0, 4);
  const tpStartY = tpLabelY + 0.20;
  const bottomPillY = sideY + sideH - 0.46;
  const tpAvailH = bottomPillY - tpStartY - 0.08;
  const tpGap = 0.055;
  const tpCardH = (tpAvailH - tpGap * (tpList.length - 1)) / Math.max(1, tpList.length);

  tpList.forEach((tp, idx) => {
    const ty = Number((tpStartY + idx * (tpCardH + tpGap)).toFixed(3));
    const accent = GOOGLE_CARD_ACCENTS[idx % GOOGLE_CARD_ACCENTS.length];
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((sideX + 0.12).toFixed(3)),
      y: ty,
      w: Number((sideW - 0.24).toFixed(3)),
      h: Number(tpCardH.toFixed(3)),
      rectRadius: 0.05,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 0.7 },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((sideX + 0.20).toFixed(3)),
      y: Number((ty + (tpCardH - 0.22) / 2).toFixed(3)),
      w: 0.24,
      h: 0.22,
      rectRadius: 0.04,
      fill: { color: accent.tint },
    });
    slide.addText(String(idx + 1), {
      x: Number((sideX + 0.20).toFixed(3)),
      y: Number((ty + (tpCardH - 0.22) / 2).toFixed(3)),
      w: 0.24,
      h: 0.22,
      fontSize: 7.2,
      bold: true,
      color: accent.text,
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial',
    });
    slide.addText(tp, {
      x: Number((sideX + 0.50).toFixed(3)),
      y: Number((ty + 0.03).toFixed(3)),
      w: Number((sideW - 0.68).toFixed(3)),
      h: Number((tpCardH - 0.06).toFixed(3)),
      fontSize: 6.9,
      color: TEXT_BODY,
      fontFace: 'Arial',
      valign: 'middle',
      wrap: true,
    });
  });

  // 4. Bottom Verification & Live GCP Target Pill (Light Theme Green)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: Number((sideX + 0.12).toFixed(3)),
    y: Number(bottomPillY.toFixed(3)),
    w: Number((sideW - 0.24).toFixed(3)),
    h: 0.36,
    rectRadius: 0.05,
    fill: { color: G_GREEN_TINT },
    line: { color: 'CEEAD6', width: 0.85 },
  });
  slide.addText(
    `✅ ${vertexCount} Editable Shapes • ${edgeCount} Connectors • GCP: ${flowEntry?.gcpProject?.split(' ')[0] || 'ramp-portal-dev'}`,
    {
      x: Number((sideX + 0.18).toFixed(3)),
      y: Number(bottomPillY.toFixed(3)),
      w: Number((sideW - 0.36).toFixed(3)),
      h: 0.36,
      fontSize: 7.1,
      bold: true,
      color: G_GREEN_DEEP,
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial',
    }
  );
}

// ---------------------------------------------------------------------------------------------
// Google Cloud Branded 3-Slide Diagram Set:
//   Slide 1 of 3: Left 100% Native Editable Diagram (56 shapes + 23 connectors) + Right 4-Zone Guide Sidebar
//   Slide 2 of 3: Step-by-Step End-to-End Logical Flow (Steps ①–⑦ + Outcome + Zones 1–4)
//   Slide 3 of 3: Step-by-Step End-to-End Technical Flow (8-Row Protocol Table + Well-Architected Bar)
// ---------------------------------------------------------------------------------------------

async function appendGoogleBrandedDiagramSlides(
  pptx: Pptx,
  xmlContent: string,
  kicker: string,
  figureLabel: string,
  diagramTitle: string,
  blueprintId: string,
  _masterImageSrc: string | undefined,
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

  const diagramIdClean = path.basename(sourceDrawioRelPath).replace(/\.drawio(\.xml)?$/i, '');
  const flowEntry = getDiagramFlowById(diagramIdClean);

  // Split Widescreen Layout on Slide 1 of 3:
  // Left 7.62" Card = 100% Native Editable Diagram (preserves full 6.20" vertical height with zero side whitespace!)
  // Right 5.03" Card = Official Google Cloud Architecture Center 4-Zone & Walkthrough Guide Sidebar
  const canvasCardX = 0.28;
  const canvasCardY = HEADER_H + 0.08;
  const canvasCardW = 7.62;
  const canvasCardH = Number((SLIDE_H - HEADER_H - 0.42).toFixed(3)); // 6.36"

  const sideX = 8.02;
  const sideW = Number((SLIDE_W - sideX - 0.28).toFixed(3)); // 5.033"

  // =========================================================================
  // SLIDE 1 OF 3: 100% DECOMPOSED NATIVE EDITABLE ARCHITECTURE DIAGRAM + SIDEBAR
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

  // Render Right-Hand Google Cloud Architecture Center Sidebar
  renderArchitectureCenterDiagramSidebar(
    pptx,
    slide2,
    sideX,
    canvasCardY,
    sideW,
    canvasCardH,
    figureLabel,
    diagramTitle,
    flowEntry,
    talkingPoints,
    vertices.length,
    edges.length
  );

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

  // Uniform 1:1 scaling inside the Left 7.62" x 6.36" Canvas Card (fills >92% of both width and height!)
  const padX = 0.12;
  const padY = 0.08;
  const availW = canvasCardW - padX * 2;
  const availH = canvasCardH - padY * 2;
  const uniformScale = Math.min(availW / effGraphW, availH / effGraphH);
  const scaleX = uniformScale;
  const scaleY = uniformScale;
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

  const renderVertexNode = async (node: ParsedMxCell) => {
    const style = node.style;
    const rawFill = style.fillColor;
    const rawStroke = style.strokeColor;
    const isCircleStepBadge =
      (style.ellipse === '1' || style.shape === 'ellipse') && node.width <= 55 && node.height <= 55;
    const bw = isCircleStepBadge ? toSlideH(node.height) : toSlideW(node.width);
    const bh = toSlideH(node.height);
    const bx = isCircleStepBadge
      ? Number((toSlideX(node.absX + node.width / 2) - bw / 2).toFixed(3))
      : toSlideX(node.absX);
    const by = isCircleStepBadge
      ? Number((toSlideY(node.absY + node.height / 2) - bh / 2).toFixed(3))
      : toSlideY(node.absY);

    const validSvgs = node.extractedSvgs.filter(
      (s) => !/display\s*:\s*none/i.test(s) && !/width\s*=\s*["']0["']/i.test(s)
    );
    const inlineImgSrc = extractInlineImgSrc(node.value);
    const isImageShape =
      style.shape === 'image' || Boolean(node.imageDataUrl) || Boolean(inlineImgSrc) || validSvgs.length > 0;
    const isTextCallout = node.id.startsWith('lbl_') || style.text === '1';

    const hasFill =
      !isTextCallout &&
      rawFill !== 'none' &&
      rawFill !== 'transparent' &&
      Boolean(rawFill) &&
      !(isImageShape && !isCircleStepBadge && node.width <= 55 && node.height <= 55);
    const hasStroke =
      !isTextCallout &&
      rawStroke !== 'none' &&
      rawStroke !== 'transparent' &&
      Boolean(rawStroke) &&
      !(isImageShape && !isCircleStepBadge && node.width <= 55 && node.height <= 55);

    const fillColor = normalizeHexColor(rawFill, isDarkDiagram ? '1E293B' : 'FFFFFF');
    const rawStrokeNorm = normalizeHexColor(rawStroke, isDarkDiagram ? '3B82F6' : 'DADCE0');
    const isContainer = style.container === '1' || parentIds.has(node.id);

    let strokeColor = rawStrokeNorm;
    if (!isDarkDiagram && (rawStrokeNorm === '202124' || rawStrokeNorm === '0F172A' || rawStrokeNorm === '1E293B')) {
      strokeColor = isContainer ? '9AA0A6' : 'DADCE0';
    }
    const strokeWidth = isCircleStepBadge
      ? 0.85
      : node.id === 'gcp_outer_frame' || strokeColor === '1A73E8'
        ? 1.25
        : 0.85;
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
          : { type: 'none' },
      });
    }

    if (!title && !subtitle && iconSource) {
      const bannerDataUrl = await rasterizeSvgIcon(iconSource, 256, 64);
      if (bannerDataUrl) {
        addImagePreservingAspect(slide2, bannerDataUrl, bx, by, bw, bh);
      }
      return;
    }

    if (isTableCard) {
      const iconSq = Number(Math.min(0.22, Math.max(0.14, Math.min(bh * 0.52, bw * 0.2))).toFixed(3));
      let padLeft = 0.045;
      const cardIconCandidate =
        (structured.leftIconSvg &&
        !/display\s*:\s*none/i.test(structured.leftIconSvg) &&
        !/width\s*=\s*["']0["']/i.test(structured.leftIconSvg)
          ? structured.leftIconSvg
          : undefined) || iconSource;
      if (cardIconCandidate) {
        const leftDataUrl = await rasterizeSvgIcon(cardIconCandidate, 128, 128);
        if (leftDataUrl) {
          const lx = Number((bx + 0.045).toFixed(3));
          const ly = Number((by + (bh - iconSq) / 2).toFixed(3));
          slide2.addImage({ data: leftDataUrl, x: lx, y: ly, w: iconSq, h: iconSq });
          padLeft = iconSq + 0.07;
        }
      }

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
        const secondaryTextLen = consolidatedLines[1]?.text.length || 0;
        const isDenseCard = primaryTextLen >= 18 || secondaryTextLen >= 18;
        const cardTitlePt = isDenseCard ? 5.0 : bh < 0.42 ? 5.5 : 5.8;
        const cardSubPt = isDenseCard ? 4.3 : bh < 0.42 ? 4.7 : 4.9;

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
          w: Number(Math.max(0.22, bw - padLeft - 0.025).toFixed(3)),
          h: bh,
          align: 'left',
          valign: 'middle',
          margin: 0,
          fit: 'shrink',
          lineSpacingMultiple: isDenseCard ? 0.85 : 0.9,
          fontFace: 'Arial',
          wrap: true,
        });
      }
      return;
    }

    if (isCircleStepBadge && (title || subtitle)) {
      slide2.addText(title || subtitle, {
        x: bx,
        y: by,
        w: bw,
        h: bh,
        fontSize: 6.2,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        valign: 'middle',
        margin: 0,
        fontFace: 'Arial',
      });
      return;
    }

    let textOffsetLeft = 0;
    const textOffsetTop = 0;
    if (iconSource && !isContainer) {
      const iconDataUrl = await rasterizeSvgIcon(iconSource, 128, 128);
      if (iconDataUrl) {
        const iconSq = Number(Math.min(0.18, Math.max(0.13, Math.min(bh * 0.46, bw * 0.18))).toFixed(3));
        const ix = Number((bx + 0.045).toFixed(3));
        const iy = Number((by + (bh - iconSq) / 2).toFixed(3));
        slide2.addImage({ data: iconDataUrl, x: ix, y: iy, w: iconSq, h: iconSq });
        textOffsetLeft = Number((iconSq + 0.06).toFixed(3));
      }
    }

    if (title || subtitle) {
      if (isContainer) {
        const isTopFullWidthContainer = node.absY < 340 && node.width > 800;
        const isSpokeOuterWrapper = node.absY >= 700 && (!hasFill || fillColor === 'FFFFFF');
        const isZone1RoutingHub = fillColor === 'AECBFA' && node.absY >= 300 && node.absY < 420;
        const isColoredZone =
          fillColor === 'AECBFA' || fillColor === 'CEEAD6' || fillColor === 'FEEFC3' || fillColor === 'FAD2CF';
        let displayTitle = title;
        if (isTopFullWidthContainer && displayTitle.length > 38) {
          displayTitle = displayTitle
            .replace(/\s*\+\s*\/28.*$/i, '')
            .replace(/\s*\/\s*cymbal-[a-z0-9-]+$/i, '')
            .replace(/\s*•\s*[^•]+$/i, '')
            .replace(/\s*\([^)]*\)\s*$/, '')
            .trim();
        } else if (isSpokeOuterWrapper && displayTitle.length > 40) {
          displayTitle = displayTitle
            .replace(/\s*•\s*Project:\s*/i, ' — ')
            .replace(/\s*\(Regulated Scale\)/i, '')
            .replace(/\s*\(High Density\)/i, '')
            .replace(/\s*—\s*cymbal-[a-z0-9_-]+.*$/i, '')
            .trim();
        }
        let displaySubtitle = subtitle;
        if (isZone1RoutingHub && displaySubtitle && displaySubtitle.length > 56) {
          displaySubtitle = displaySubtitle.replace(/\s*\([^)]*\)/g, '').trim();
        }
        const contTitlePt = isTopFullWidthContainer
          ? 4.6
          : isSpokeOuterWrapper
            ? displayTitle.length > 46
              ? 4.1
              : displayTitle.length > 38
                ? 4.4
                : 4.8
            : isColoredZone
              ? 4.9
              : 5.5;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contRuns: any[] = [
          {
            text: displayTitle,
            options: {
              fontSize: contTitlePt,
              bold: true,
              color: resolvedTitleColor,
              breakLine: Boolean(displaySubtitle) && !isTopFullWidthContainer && !isSpokeOuterWrapper,
            },
          },
        ];
        if (displaySubtitle && !isTopFullWidthContainer && !isSpokeOuterWrapper) {
          contRuns.push({
            text: displaySubtitle,
            options: {
              fontSize: 4.2,
              bold: false,
              color: resolvedSubtitleColor,
            },
          });
        }
        const contTextW = isTopFullWidthContainer
          ? Number(Math.min(bw * 0.46, 2.55).toFixed(3))
          : isZone1RoutingHub
            ? Number(Math.min(bw * 0.66, 2.02).toFixed(3))
            : Number(Math.max(0.35, bw - 0.12).toFixed(3));
        const contTextH = isTopFullWidthContainer || isSpokeOuterWrapper ? 0.15 : isColoredZone ? 0.21 : 0.26;
        slide2.addText(contRuns, {
          x: Number((bx + 0.06).toFixed(3)),
          y: Number((by + 0.012).toFixed(3)),
          w: contTextW,
          h: contTextH,
          align: style.align === 'right' ? 'right' : 'left',
          valign: 'top',
          margin: 0,
          fit: 'shrink',
          lineSpacingMultiple: 0.85,
          fontFace: 'Arial',
          wrap: !(isTopFullWidthContainer || isSpokeOuterWrapper),
        });
      } else {
        const isFloatingLabel = !hasFill && !hasStroke;
        const lblTitlePt = isFloatingLabel ? 5.0 : bh < 0.42 ? 5.3 : 5.6;
        const lblSubPt = isFloatingLabel ? 4.4 : bh < 0.42 ? 4.5 : 4.8;

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
          w: Number(Math.max(0.22, bw - textOffsetLeft - (textOffsetLeft > 0 ? 0.03 : 0)).toFixed(3)),
          h: Number(Math.max(0.12, effBoxH - textOffsetTop).toFixed(3)),
          align: textOffsetLeft > 0
            ? 'left'
            : style.align === 'left'
              ? 'left'
              : style.align === 'right'
                ? 'right'
                : 'center',
          valign: 'middle',
          margin: 0,
          fit: 'shrink',
          lineSpacingMultiple: 0.88,
          fontFace: 'Arial',
          wrap: true,
        });
      }
    }
  };

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

  for (const node of backgroundVertices) {
    await renderVertexNode(node);
  }

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
    const strokeWidth = 1.0;
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

      const isTinyElbowStub = allPoints.length > 2 && Math.max(lineW, lineH) < 0.03;
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

  for (const node of foregroundVertices) {
    await renderVertexNode(node);
  }

  addFooter(
    pptx,
    slide2,
    `${blueprintId} (${sourceDrawioRelPath})  •  100% Native Editable Shapes + 4-Zone Architecture Center Guide  •  Next: Step-by-Step Logical Flow`
  );

  // =========================================================================
  // SLIDE 2 OF 3: STEP-BY-STEP END-TO-END LOGICAL FLOW (ARCHITECTURAL WALKTHROUGH)
  // =========================================================================
  const logicalSlide = pptx.addSlide();
  logicalSlide.background = { color: SURFACE_BG };
  addHeaderBar(
    pptx,
    logicalSlide,
    kicker,
    `${figureLabel} — ${diagramTitle} • Step-by-Step Logical Flow`,
    'LOGICAL FLOW • STEPS ①–⑦'
  );

  // Top 4-Zone Hub-and-Spoke Summary Ribbon
  const zones = flowEntry?.zonesSummary || [
    { zoneId: 'Zone 1', colorHex: '#aecbfa', borderHex: '#174ea6', name: '1. Routing Hub', role: 'Verifies OIDC identity and routes per tier.', nodes: [] },
    { zoneId: 'Zone 2', colorHex: '#ceead6', borderHex: '#137333', name: '2. Governance Hub', role: 'Manages KMS CMEK and BigQuery OTel billing.', nodes: [] },
    { zoneId: 'Zone 3', colorHex: '#feefc3', borderHex: '#b06000', name: '3. Left Spoke', role: 'Enforces Model Armor and Gemini 90% cache.', nodes: [] },
    { zoneId: 'Zone 4', colorHex: '#fad2cf', borderHex: '#c5221f', name: '4. Right Spoke', role: 'Enforces AlloyDB RLS, MCP 3LO & PSC spokes.', nodes: [] },
  ];
  const zoneRibbonY = HEADER_H + 0.1;
  const zoneRibbonH = 0.68;
  const zoneGap = 0.16;
  const zoneCardW = Number(((SLIDE_W - 0.64 - zoneGap * 3) / 4).toFixed(3));

  zones.slice(0, 4).forEach((zn, zIdx) => {
    const zx = Number((0.32 + zIdx * (zoneCardW + zoneGap)).toFixed(3));
    const fillHex = zn.colorHex.replace('#', '').toUpperCase();
    const borderHex = zn.borderHex.replace('#', '').toUpperCase();
    logicalSlide.addShape(pptx.ShapeType.roundRect, {
      x: zx,
      y: zoneRibbonY,
      w: zoneCardW,
      h: zoneRibbonH,
      rectRadius: 0.06,
      fill: { color: WHITE },
      line: { color: borderHex, width: 1 },
    });
    logicalSlide.addShape(pptx.ShapeType.rect, {
      x: zx,
      y: zoneRibbonY,
      w: 0.09,
      h: zoneRibbonH,
      fill: { color: borderHex },
    });
    logicalSlide.addShape(pptx.ShapeType.roundRect, {
      x: Number((zx + 0.14).toFixed(3)),
      y: Number((zoneRibbonY + 0.06).toFixed(3)),
      w: 0.92,
      h: 0.19,
      rectRadius: 0.04,
      fill: { color: fillHex },
    });
    logicalSlide.addText(zn.zoneId.toUpperCase(), {
      x: Number((zx + 0.14).toFixed(3)),
      y: Number((zoneRibbonY + 0.06).toFixed(3)),
      w: 0.92,
      h: 0.19,
      fontSize: 6.3,
      bold: true,
      color: borderHex,
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial',
    });
    logicalSlide.addText(zn.name, {
      x: Number((zx + 1.11).toFixed(3)),
      y: Number((zoneRibbonY + 0.04).toFixed(3)),
      w: Number((zoneCardW - 1.18).toFixed(3)),
      h: 0.24,
      fontSize: 7.4,
      bold: true,
      color: TEXT_DARK,
      valign: 'middle',
      fontFace: 'Arial',
      wrap: true,
    });
    logicalSlide.addText(zn.role, {
      x: Number((zx + 0.14).toFixed(3)),
      y: Number((zoneRibbonY + 0.31).toFixed(3)),
      w: Number((zoneCardW - 0.22).toFixed(3)),
      h: 0.33,
      fontSize: 6.7,
      color: TEXT_BODY,
      valign: 'top',
      fontFace: 'Arial',
      wrap: true,
    });
  });

  // Main 8-Card Sequential Logical Flow Grid (2 Rows x 4 Columns: Steps ①–⑦ + Outcome)
  const logicalSteps: DiagramLogicalStep[] =
    flowEntry?.logicalSteps ||
    talkingPoints.slice(0, 8).map((tp, idx) => ({
      step: idx < 7 ? `Step ${idx + 1}` : 'Outcome',
      badgeNum: String(idx + 1).padStart(2, '0'),
      zone: 'End-to-End Flow',
      title: `Step ${idx + 1} Key Action`,
      logicalNarrative: tp,
      components: diagramTitle,
    }));

  const lGridTop = zoneRibbonY + zoneRibbonH + 0.1;
  const lGridBottom = SLIDE_H - 0.42;
  const lAvailH = lGridBottom - lGridTop;
  const lCols = 4;
  const lRows = 2;
  const lGapX = 0.16;
  const lGapY = 0.14;
  const lCardW = Number(((SLIDE_W - 0.64 - lGapX * (lCols - 1)) / lCols).toFixed(3));
  const lCardH = Number(((lAvailH - lGapY * (lRows - 1)) / lRows).toFixed(3));

  logicalSteps.slice(0, 8).forEach((st, idx) => {
    const r = Math.floor(idx / lCols);
    const c = idx % lCols;
    const cx = Number((0.32 + c * (lCardW + lGapX)).toFixed(3));
    const cy = Number((lGridTop + r * (lCardH + lGapY)).toFixed(3));
    const isOutcome = st.step === 'Outcome' || idx === 7;
    const accent = isOutcome
      ? { bar: G_GREEN_DARK, tint: G_GREEN_TINT, text: G_GREEN_DEEP, border: 'CEEAD6' }
      : GOOGLE_CARD_ACCENTS[idx % GOOGLE_CARD_ACCENTS.length];

    logicalSlide.addShape(pptx.ShapeType.roundRect, {
      x: cx,
      y: cy,
      w: lCardW,
      h: lCardH,
      rectRadius: 0.07,
      fill: { color: isOutcome ? 'F0FDF4' : WHITE },
      line: { color: isOutcome ? G_GREEN : BORDER_GREY, width: isOutcome ? 1.25 : 0.85 },
    });
    logicalSlide.addShape(pptx.ShapeType.rect, {
      x: cx,
      y: cy,
      w: lCardW,
      h: 0.055,
      fill: { color: accent.bar },
    });

    logicalSlide.addShape(pptx.ShapeType.roundRect, {
      x: Number((cx + 0.12).toFixed(3)),
      y: Number((cy + 0.09).toFixed(3)),
      w: 0.68,
      h: 0.22,
      rectRadius: 0.04,
      fill: { color: accent.tint },
      line: { color: accent.border, width: 0.6 },
    });
    logicalSlide.addText(st.step, {
      x: Number((cx + 0.12).toFixed(3)),
      y: Number((cy + 0.09).toFixed(3)),
      w: 0.68,
      h: 0.22,
      fontSize: 7.5,
      bold: true,
      color: accent.text,
      align: 'center',
      valign: 'middle',
      fontFace: 'Arial',
    });

    logicalSlide.addText(st.zone, {
      x: Number((cx + 0.84).toFixed(3)),
      y: Number((cy + 0.09).toFixed(3)),
      w: Number((lCardW - 0.94).toFixed(3)),
      h: 0.22,
      fontSize: 6.6,
      bold: true,
      color: TEXT_MUTED,
      align: 'right',
      valign: 'middle',
      fontFace: 'Arial',
    });

    logicalSlide.addText(st.title, {
      x: Number((cx + 0.12).toFixed(3)),
      y: Number((cy + 0.34).toFixed(3)),
      w: Number((lCardW - 0.24).toFixed(3)),
      h: 0.36,
      fontSize: 8.2,
      bold: true,
      color: TEXT_DARK,
      valign: 'top',
      fontFace: 'Arial',
      wrap: true,
    });

    const narrH = Number(Math.max(0.84, lCardH - 1.06).toFixed(3));
    logicalSlide.addText(st.logicalNarrative, {
      x: Number((cx + 0.12).toFixed(3)),
      y: Number((cy + 0.72).toFixed(3)),
      w: Number((lCardW - 0.24).toFixed(3)),
      h: narrH,
      fontSize: 7.4,
      color: TEXT_BODY,
      valign: 'top',
      fontFace: 'Arial',
      wrap: true,
    });

    logicalSlide.addShape(pptx.ShapeType.roundRect, {
      x: Number((cx + 0.12).toFixed(3)),
      y: Number((cy + lCardH - 0.28).toFixed(3)),
      w: Number((lCardW - 0.24).toFixed(3)),
      h: 0.21,
      rectRadius: 0.04,
      fill: { color: accent.tint },
    });
    logicalSlide.addText(st.components, {
      x: Number((cx + 0.16).toFixed(3)),
      y: Number((cy + lCardH - 0.28).toFixed(3)),
      w: Number((lCardW - 0.32).toFixed(3)),
      h: 0.21,
      fontSize: 6.6,
      bold: true,
      color: accent.text,
      valign: 'middle',
      fontFace: 'Arial',
    });
  });

  addFooter(
    pptx,
    logicalSlide,
    `${figureLabel} Step-by-Step Logical Flow  •  Next Slide: Protocol, Code & SLA Technical Flow`
  );

  // =========================================================================
  // SLIDE 3 OF 3: STEP-BY-STEP TECHNICAL FLOW + WELL-ARCHITECTED 3-PILLAR BAR
  // =========================================================================
  const techSlide = pptx.addSlide();
  techSlide.background = { color: SURFACE_BG };
  addHeaderBar(
    pptx,
    techSlide,
    kicker,
    `${figureLabel} — ${diagramTitle} • Step-by-Step Technical Flow`,
    'TECHNICAL FLOW • GOOGLE CLOUD'
  );

  // Top Light-Theme Google Cloud Technology Summary Strip (Rule 54: Zero Dark Navy!)
  const stripY = HEADER_H + 0.08;
  const stripH = 0.52;
  techSlide.addShape(pptx.ShapeType.roundRect, {
    x: 0.32,
    y: stripY,
    w: SLIDE_W - 0.64,
    h: stripH,
    rectRadius: 0.06,
    fill: { color: G_BLUE_TINT },
    line: { color: 'AECBFA', width: 1 },
  });
  techSlide.addShape(pptx.ShapeType.roundRect, {
    x: 0.44,
    y: Number((stripY + 0.10).toFixed(3)),
    w: 2.15,
    h: 0.32,
    rectRadius: 0.04,
    fill: { color: G_BLUE_DARK },
  });
  techSlide.addText(flowEntry?.patternBadge || 'GOOGLE CLOUD ARCHITECTURE', {
    x: 0.44,
    y: Number((stripY + 0.10).toFixed(3)),
    w: 2.15,
    h: 0.32,
    fontSize: 7.0,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: 'Arial',
  });
  techSlide.addText(
    [
      {
        text: `Google Cloud Stack: ${flowEntry?.execCloudServices || 'Cloud Armor • IAP • Vertex AI Agent Engine • Model Armor • AlloyDB • BigQuery'}\n`,
        options: { fontSize: 7.3, bold: true, color: G_BLUE_DEEP },
      },
      {
        text: `Architecture Summary: ${flowEntry?.execTechSummary || flowEntry?.outcomeBody || diagramTitle}`,
        options: { fontSize: 7.1, bold: false, color: TEXT_BODY },
      },
    ],
    {
      x: 2.70,
      y: Number((stripY + 0.04).toFixed(3)),
      w: SLIDE_W - 3.14,
      h: 0.44,
      valign: 'middle',
      fontFace: 'Arial',
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const techRows: any[][] = [
    [
      { text: 'Step & Hop', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 7.9 } },
      { text: 'Google Cloud Service (Zone)', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 7.9 } },
      { text: 'Protocol & Architectural Mechanism', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 7.9 } },
      { text: 'Security & Code Resource', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 7.9 } },
      { text: 'Verified Outcome & SLA', options: { bold: true, fill: { color: G_BLUE_DEEP }, color: WHITE, fontSize: 7.9 } },
    ],
  ];

  const techSteps: DiagramTechnicalStep[] = flowEntry?.technicalSteps || [];
  techSteps.forEach((ts, idx) => {
    const isTelemetry = ts.step === 'Telemetry' || ts.step === 'Cost & Audit' || idx === 7;
    const rowBg = isTelemetry ? 'F0FDF4' : idx % 2 === 0 ? WHITE : SURFACE_BG;
    techRows.push([
      {
        text: `${ts.step} — ${ts.hopName}`,
        options: { fontSize: 7.1, bold: true, color: isTelemetry ? G_GREEN_DEEP : G_BLUE_DARK, fill: { color: rowBg } },
      },
      {
        text: ts.route,
        options: { fontSize: 7.1, bold: true, color: TEXT_DARK, fill: { color: rowBg } },
      },
      {
        text: ts.protocolAndMechanism,
        options: { fontSize: 7.0, color: TEXT_BODY, fill: { color: rowBg } },
      },
      {
        text: ts.codeAndResource,
        options: { fontSize: 7.0, bold: true, color: G_PURPLE_DEEP, fill: { color: rowBg } },
      },
      {
        text: ts.verifiedOutcome,
        options: { fontSize: 7.0, bold: true, color: G_GREEN_DEEP, fill: { color: rowBg } },
      },
    ]);
  });

  techSlide.addTable(techRows, {
    x: 0.32,
    y: stripY + stripH + 0.06,
    w: SLIDE_W - 0.64,
    colW: [1.65, 2.30, 4.20, 2.15, 2.393],
    border: { type: 'solid', color: BORDER_GREY, pt: 0.5 },
    fill: { color: WHITE },
    fontFace: 'Arial',
  });

  // Bottom 3-Pillar Google Cloud Well-Architected Alignment Bar
  const waTop = SLIDE_H - 1.00;
  const waH = 0.64;
  const waGap = 0.16;
  const waColW = Number(((SLIDE_W - 0.64 - waGap * 2) / 3).toFixed(3));
  const waPillars = [
    {
      title: 'Well-Architected Pillar 1: Security & Compliance',
      body: `Enforces RFC 8693 OBO + DPoP, Hop 2 ARD filter, Model Armor & CMEK (${flowEntry?.gcpProject || 'ramp-portal-dev'}).`,
      accent: GOOGLE_CARD_ACCENTS[0],
    },
    {
      title: 'Well-Architected Pillar 2: Reliability & Isolation',
      body: `Enforces Valkey RPM bulkheads, thinking budget caps (4k/8k) & fail-closed HTTP 401/403/422/423/429 gates.`,
      accent: GOOGLE_CARD_ACCENTS[1],
    },
    {
      title: 'Well-Architected Pillar 3: Cost Optimization (FinOps)',
      body: `Captures 90% Gemini 2.5 Pro prefix cache discount and streams zero-PII OTel spans to BigQuery chargeback.`,
      accent: GOOGLE_CARD_ACCENTS[2],
    },
  ];
  waPillars.forEach((wp, idx) => {
    const wx = Number((0.32 + idx * (waColW + waGap)).toFixed(3));
    techSlide.addShape(pptx.ShapeType.roundRect, {
      x: wx,
      y: waTop,
      w: waColW,
      h: waH,
      rectRadius: 0.05,
      fill: { color: WHITE },
      line: { color: wp.accent.border, width: 0.85 },
    });
    techSlide.addShape(pptx.ShapeType.rect, {
      x: wx,
      y: waTop,
      w: 0.08,
      h: waH,
      fill: { color: wp.accent.bar },
    });
    techSlide.addText(wp.title, {
      x: Number((wx + 0.14).toFixed(3)),
      y: Number((waTop + 0.05).toFixed(3)),
      w: Number((waColW - 0.22).toFixed(3)),
      h: 0.20,
      fontSize: 7.4,
      bold: true,
      color: wp.accent.text,
      fontFace: 'Arial',
    });
    techSlide.addText(wp.body, {
      x: Number((wx + 0.14).toFixed(3)),
      y: Number((waTop + 0.26).toFixed(3)),
      w: Number((waColW - 0.22).toFixed(3)),
      h: 0.34,
      fontSize: 6.8,
      color: TEXT_BODY,
      fontFace: 'Arial',
      wrap: true,
    });
  });

  addFooter(
    pptx,
    techSlide,
    `${figureLabel} Step-by-Step Technical Flow  •  100% Editable Native Table & Well-Architected Pillars  •  Verified on Google Cloud`
  );

  const notes = `${figureLabel} — ${diagramTitle}\n\n${talkingPoints.map((t) => `• ${t}`).join('\n')}\n\nEditable source: ${sourceDrawioRelPath}`;
  slide2.addNotes(notes);
  logicalSlide.addNotes(`${figureLabel} Step-by-Step End-to-End Logical Flow for ${diagramTitle}`);
  techSlide.addNotes(`${figureLabel} Step-by-Step End-to-End Technical Flow for ${diagramTitle}`);

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
  pptx.author = 'Google Cloud Architecture Center • PromptCanvas Vision Decompiler';
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
  addTitleSlide(pptx, deck, spec);
  slideCount++;

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

  for (const section of deck.sections) {
    addSectionSlideDispatch(pptx, spec.key, section, {
      footer: `${spec.label}  •  100% Editable Google Cloud Architecture Center Slide`,
    });
    slideCount++;
  }

  if (deck.takeaways.length) {
    addBulletSlide(pptx, spec.key, "What's next — Series Navigation & Engineering Deliverables", deck.takeaways, {
      footer: deck.callToAction,
      accent: G_BLUE_DARK,
      isTakeaways: true,
      specs: deck.takeawaySpecs,
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
    deckTitle: 'Google Cloud Multi-Tenant Agentic AI: Pooled, Sovereign Silos & Hybrid — Complete Program Deck',
    deckSubtitle:
      'All 14 Google Cloud Architecture Center (#78) blueprints across Workstreams 1–5 as 3-slide sequences (Editable Diagram → Logical Flow → Technical Flow)',
    tldr: [
      'Workstream 1 Reference Taxonomy: Defines Pattern A (Pooled), Pattern B (Sovereign Silos), and Pattern C (Dynamic Hybrid) built on one 80% reusable 5-hop ADK 2.0 security codebase.',
      'Workstream 2 Pattern A Pooled: Serves hundreds of commercial tenants inside one shared Google Cloud project with 90% shared prefix cache savings and 10/10 red-team attacks blocked.',
      'Workstream 3 Pattern B Sovereign Silos: Gives regulated banking and healthcare enterprises a dedicated GCP project, VPC Service Controls perimeter, IAM PAB, and <60s CMEK kill-switch.',
      'Workstream 4 Pattern C Dynamic Hybrid: Routes Standard tenants to the shared pool and Enterprise tenants over Private Service Connect with zero-downtime live tier upgrades (4/4 PASS).',
      'Workstream 5 Executive Decision Guide: Provides a 2-question topology selector, Well-Architected comparison matrix, 1,000-tenant FinOps TCO model, and 10-week rollout roadmap.',
    ],
    sections: [],
    diagrams: [],
    takeaways: [],
    callToAction:
      'Explore any 3-slide diagram sequence in this deck: (1) Editable Diagram + 4-Zone Guide, (2) Step-by-Step Logical Flow, and (3) Google Cloud Technical Flow.',
  };
  const pptx = newDeck(deck.deckTitle);
  let slideCount = 0;
  addTitleSlide(pptx, deck, null);
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
    addBulletSlide(pptx, spec.key, 'Architecture Overview & Key Point', wsDeck.tldr, {
      footer: spec.label,
      specs: wsDeck.tldrSpecs,
    });
    slideCount++;
    if (wsDeck.takeaways.length) {
      addBulletSlide(pptx, spec.key, "What's next — Key Takeaways", wsDeck.takeaways, {
        footer: wsDeck.callToAction,
        accent: G_BLUE_DARK,
        isTakeaways: true,
        specs: wsDeck.takeawaySpecs,
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
  console.log('🎞️  PromptCanvas Vision Module — Building Google Cloud Architecture Center 100% Editable Slide Decks...');
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
      'PromptCanvas Vision Decompiler • Google Cloud Architecture Center Light-Theme Multi-Layout Canvas • pptxgenjs LAYOUT_WIDE 16:9',
    decks: results,
  };
  fs.writeFileSync(path.join(SLIDES_DIR, 'slides_manifest.json'), JSON.stringify(slidesManifest, null, 2), 'utf8');
  console.log(`\n🎉 ${results.length} Google Cloud Architecture Center decks written to slides/ (manifest: slides/slides_manifest.json)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
