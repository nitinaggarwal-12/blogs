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

// Official Google Slides & Presentation Brand Rules (`google-slides-design` plugin)
// Sequential Quad-Color Order: 1. Blue (#4285F4) -> 2. Red (#EA4335) -> 3. Yellow (#FBBC04) -> 4. Green (#34A853)
const G_BLUE = '4285F4';
const G_BLUE_DARK = '4285F4';
const G_BLUE_DEEP = '174EA6';
const G_BLUE_TINT = 'E8F0FE';

const G_RED = 'EA4335';
const G_RED_DARK = 'EA4335';
const G_RED_DEEP = 'A50E0E';
const G_RED_TINT = 'FCE8E6';

const G_YELLOW = 'FBBC04';
const G_YELLOW_DARK = 'FBBC04';
const G_YELLOW_TEXT = 'B06000';
const G_YELLOW_TINT = 'FEF7E0';

const G_GREEN = '34A853';
const G_GREEN_DARK = '34A853';
const G_GREEN_DEEP = '0D652D';
const G_GREEN_TINT = 'E6F4EA';

const FONT_TITLE = 'Google Sans';
const FONT_DISPLAY = 'Google Sans Display';
const FONT_BODY = 'Roboto';

const TEXT_DARK = '3C4043'; // Slide Titles & Display Numbers: Google Sans / Google Sans Display (Dark Gray #3C4043)
const TEXT_BODY = '5F6368'; // Body Copy & Captions: Roboto / Google Sans Text (Medium Gray #5F6368)
const TEXT_MUTED = '5F6368'; // Medium Gray #5F6368
const BORDER_GREY = 'DADCE0'; // Subtle container borders (#DADCE0)
const CARD_BG = 'F8F9FA'; // Content card container fill (#F8F9FA)
const SURFACE_BG = 'FFFFFF'; // Crisp white widescreen 16:9 slide canvas
const SPEC_BOX_BG = 'FFFFFF'; // Clean inner specification pill surface
const DIVIDER_CHARCOAL = '202124'; // Section divider dark charcoal (#202124)
const WHITE = 'FFFFFF';

const SERIES_LINE = 'Multi-Tenant Agentic AI on Google Cloud • Vertex AI Agent Engine, Gemini Enterprise & ADK 2.0';

interface BrandAccent {
  bar: string;
  tint: string;
  text: string;
  border: string;
}

// Strict Google Quad-Color Sequence: 1. Blue (#4285F4) -> 2. Red (#EA4335) -> 3. Yellow (#FBBC04) -> 4. Green (#34A853)
const GOOGLE_CARD_ACCENTS: BrandAccent[] = [
  { bar: G_BLUE, tint: G_BLUE_TINT, text: G_BLUE_DEEP, border: BORDER_GREY },
  { bar: G_RED, tint: G_RED_TINT, text: G_RED_DEEP, border: BORDER_GREY },
  { bar: G_YELLOW, tint: G_YELLOW_TINT, text: G_YELLOW_TEXT, border: BORDER_GREY },
  { bar: G_GREEN, tint: G_GREEN_TINT, text: G_GREEN_DEEP, border: BORDER_GREY },
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

function stripMarkdownFormatting(raw: string | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim();
}

function addGoogleFourColorRibbon(pptx: Pptx, slide: Slide, y: number = 0, h: number = RIBBON_H) {
  const segW = Number((SLIDE_W / 4).toFixed(3));
  slide.addShape(pptx.ShapeType.rect, { x: 0, y, w: segW, h, fill: { color: G_BLUE } });
  slide.addShape(pptx.ShapeType.rect, { x: segW, y, w: segW, h, fill: { color: G_RED } });
  slide.addShape(pptx.ShapeType.rect, { x: Number((segW * 2).toFixed(3)), y, w: segW, h, fill: { color: G_YELLOW } });
  slide.addShape(pptx.ShapeType.rect, {
    x: Number((segW * 3).toFixed(3)),
    y,
    w: Number((SLIDE_W - segW * 3).toFixed(3)),
    h,
    fill: { color: G_GREEN },
  });
}

function addGoogleFourColorDots(pptx: Pptx, slide: Slide, startX: number, centerY: number) {
  // Strict Google Quad-Color Order: 1. Blue (#4285F4) -> 2. Red (#EA4335) -> 3. Yellow (#FBBC04) -> 4. Green (#34A853)
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
  addGoogleFourColorDots(pptx, slide, 0.38, RIBBON_H + (HEADER_H - RIBBON_H) / 2);

  slide.addText(
    [
      { text: 'Google Cloud  ', options: { fontSize: 10.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE } },
      { text: 'Architecture Center', options: { fontSize: 10, color: TEXT_MUTED, fontFace: FONT_BODY } },
    ],
    { x: 0.92, y: RIBBON_H + 0.07, w: 2.85, h: 0.34, valign: 'middle', fontFace: FONT_TITLE }
  );

  const kickerClean = kicker.toUpperCase();
  const pillW = Math.max(0.85, Math.min(2.1, kickerClean.length * 0.09 + 0.32));
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 3.78,
    y: RIBBON_H + 0.11,
    w: pillW,
    h: 0.27,
    rectRadius: 0.08,
    fill: { color: CARD_BG },
    line: { color: BORDER_GREY, width: 0.75 },
  });
  slide.addText(kickerClean, {
    x: 3.78,
    y: RIBBON_H + 0.11,
    w: pillW,
    h: 0.27,
    fontSize: 8.5,
    bold: true,
    color: G_BLUE,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });

  const titleX = Number((3.78 + pillW + 0.18).toFixed(3));
  const badgeText = rightBadge || 'SEMANTIC LAYOUT • 16:9';
  const rightPillW = 2.55;
  slide.addText(stripMarkdownFormatting(title), {
    x: titleX,
    y: RIBBON_H + 0.08,
    w: Number((SLIDE_W - titleX - rightPillW - 0.5).toFixed(3)),
    h: 0.32,
    fontSize: 10.2,
    bold: true,
    color: TEXT_DARK,
    valign: 'middle',
    fontFace: FONT_TITLE,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: SLIDE_W - rightPillW - 0.38,
    y: RIBBON_H + 0.11,
    w: rightPillW,
    h: 0.27,
    rectRadius: 0.08,
    fill: { color: CARD_BG },
    line: { color: BORDER_GREY, width: 0.75 },
  });
  slide.addText(badgeText, {
    x: SLIDE_W - rightPillW - 0.38,
    y: RIBBON_H + 0.11,
    w: rightPillW,
    h: 0.27,
    fontSize: 7.5,
    bold: true,
    color: TEXT_BODY,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_BODY,
  });
}

function addFooter(pptx: Pptx, slide: Slide, text: string, isDarkSlide: boolean = false) {
  const cleanText = stripMarkdownFormatting(text);
  slide.addText(
    [
      {
        text: 'Google Cloud Architecture Center  •  ',
        options: { fontSize: 7.8, bold: true, color: isDarkSlide ? '8AB4F8' : G_BLUE, fontFace: FONT_TITLE },
      },
      {
        text: `${cleanText}  •  `,
        options: { fontSize: 7.6, color: isDarkSlide ? 'BDC1C6' : TEXT_BODY, fontFace: FONT_BODY },
      },
      {
        text: 'Proprietary + Confidential',
        options: { fontSize: 7.8, bold: true, color: isDarkSlide ? WHITE : TEXT_DARK, fontFace: FONT_TITLE },
      },
    ],
    {
      x: 0.4,
      y: SLIDE_H - 0.28,
      w: SLIDE_W - 0.8,
      h: 0.22,
      fontFace: FONT_BODY,
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
  const bannerY = SLIDE_H - 0.78;
  const badgeFill = isGreen ? G_GREEN : G_BLUE;

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4,
    y: bannerY,
    w: SLIDE_W - 0.8,
    h: 0.42,
    rectRadius: 0.08,
    fill: { color: CARD_BG },
    line: { color: BORDER_GREY, width: 0.85 },
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.52,
    y: bannerY + 0.07,
    w: 2.05,
    h: 0.28,
    rectRadius: 0.06,
    fill: { color: badgeFill },
  });
  slide.addText(badgeLabel, {
    x: 0.52,
    y: bannerY + 0.07,
    w: 2.05,
    h: 0.28,
    fontSize: 7.8,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });
  slide.addText(stripMarkdownFormatting(bannerText), {
    x: 2.7,
    y: bannerY + 0.05,
    w: SLIDE_W - 3.25,
    h: 0.32,
    fontSize: 8.8,
    bold: true,
    color: TEXT_DARK,
    valign: 'middle',
    fontFace: FONT_BODY,
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
  const clean = stripMarkdownFormatting(raw).replace(/\s+/g, ' ').trim();
  let title = '';
  let body = clean;

  const colonIdx = clean.indexOf(':');
  const semiIdx = clean.indexOf(';');
  if (colonIdx > 2 && colonIdx <= 68) {
    title = clean.slice(0, colonIdx).trim();
    body = clean.slice(colonIdx + 1).trim();
  } else if (semiIdx > 8 && semiIdx <= 68) {
    title = clean.slice(0, semiIdx).trim();
    body = clean.slice(semiIdx + 1).trim();
  } else {
    const words = clean.split(' ');
    title = words.slice(0, Math.min(6, words.length)).join(' ').replace(/[,.;:]$/, '');
    body = clean;
  }

  if (title.length > 1) title = title[0].toUpperCase() + title.slice(1);
  if (body.length > 1) body = body[0].toUpperCase() + body.slice(1);

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
    tags: [stripMarkdownFormatting(explicitSpec?.tag || matched.label)],
    stack: stripMarkdownFormatting(explicitSpec?.stack || matched.stack),
    sla: stripMarkdownFormatting(explicitSpec?.sla || matched.sla),
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
// Semantic Layout 1 (`title-cover`): Executive Cover Slide (Title, Subtitle, Author, Date, Confidential Tag)
// ---------------------------------------------------------------------------------------------

function addTitleSlide(pptx: Pptx, deck: DeckJson, spec: DeckSpec | null) {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  addGoogleFourColorRibbon(pptx, slide, 0, 0.085);

  // Left Hero Container (#F8F9FA card with #DADCE0 border and 8px border-radius)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.45,
    y: 0.38,
    w: 7.45,
    h: 6.56,
    rectRadius: 0.08,
    fill: { color: CARD_BG },
    line: { color: BORDER_GREY, width: 1 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.45,
    y: 0.38,
    w: 0.11,
    h: 6.56,
    fill: { color: G_BLUE },
  });

  // Google Quad-Color Dots + Architecture Center Kicker
  addGoogleFourColorDots(pptx, slide, 0.84, 0.78);
  slide.addText('GOOGLE CLOUD ARCHITECTURE CENTER  •  REFERENCE BLUEPRINT', {
    x: 1.44,
    y: 0.64,
    w: 6.2,
    h: 0.28,
    fontSize: 9.2,
    bold: true,
    color: G_BLUE,
    fontFace: FONT_TITLE,
    valign: 'middle',
  });

  // Workstream & Confidential Tag Pill
  const wsBadgeText = spec ? spec.label.toUpperCase() : 'COMPLETE PROGRAM DECK • WORKSTREAMS 1–5';
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.84,
    y: 1.04,
    w: 6.72,
    h: 0.34,
    rectRadius: 0.08,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 0.85 },
  });
  slide.addText(wsBadgeText, {
    x: 0.96,
    y: 1.04,
    w: 6.48,
    h: 0.34,
    fontSize: 8.5,
    bold: true,
    color: TEXT_DARK,
    valign: 'middle',
    fontFace: FONT_TITLE,
  });

  // Main Deck Title (Google Sans Display, Dark Gray #3C4043)
  slide.addText(stripMarkdownFormatting(deck.deckTitle), {
    x: 0.84,
    y: 1.52,
    w: 6.72,
    h: 1.50,
    fontSize: 22.0,
    bold: true,
    color: TEXT_DARK,
    fontFace: FONT_DISPLAY,
    valign: 'top',
    wrap: true,
  });

  // Key Point / Subtitle Container (#FFFFFF surface with #DADCE0 border)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.84,
    y: 3.12,
    w: 6.72,
    h: 1.16,
    rectRadius: 0.08,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 1 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.84,
    y: 3.12,
    w: 0.08,
    h: 1.16,
    fill: { color: G_BLUE },
  });
  slide.addText('KEY ARCHITECTURAL POINT', {
    x: 1.04,
    y: 3.20,
    w: 6.38,
    h: 0.22,
    fontSize: 8.0,
    bold: true,
    color: G_BLUE,
    fontFace: FONT_TITLE,
    valign: 'middle',
  });
  slide.addText(stripMarkdownFormatting(deck.deckSubtitle), {
    x: 1.04,
    y: 3.44,
    w: 6.38,
    h: 0.76,
    fontSize: 9.8,
    color: TEXT_BODY,
    fontFace: FONT_BODY,
    valign: 'top',
    wrap: true,
  });

  // 4 Executive Narrative Pillars in strict Quad-Color order: 1. Blue (#4285F4) -> 2. Red (#EA4335) -> 3. Yellow (#FBBC04) -> 4. Green (#34A853)
  const rawTldr =
    deck.tldr && deck.tldr.length >= 4
      ? deck.tldr.slice(0, 4)
      : [
          'Pattern A • Pooled Runtime: Shared Cloud Run v2 & AlloyDB RLS with 90% Gemini prefix cache ($42/mo)',
          'Pattern B • Sovereign Silos: Dedicated GCP project, VPC-SC, IAM PAB & <60s CMEK kill-switch ($1,850/mo)',
          'Pattern C • Dynamic Hybrid: Unified Hub ALB, Private Service Connect spokes & 0ms live tier upgrades',
          '5-Hop Defense & Verification: OBO/DPoP, ARD, Valkey, Model Armor & 20/20 automated security gates',
        ];
  rawTldr.forEach((item, idx) => {
    const cleanItem = stripMarkdownFormatting(item);
    const colonIdx = cleanItem.indexOf(':');
    const label = colonIdx > 0 && colonIdx < 52 ? cleanItem.slice(0, colonIdx).trim() : `Pillar ${idx + 1}`;
    const sub = colonIdx > 0 && colonIdx < 52 ? cleanItem.slice(colonIdx + 1).trim() : cleanItem;
    const accent = GOOGLE_CARD_ACCENTS[idx % GOOGLE_CARD_ACCENTS.length];
    const px = Number((0.84 + idx * 1.71).toFixed(3));

    slide.addShape(pptx.ShapeType.roundRect, {
      x: px,
      y: 4.44,
      w: 1.59,
      h: 1.72,
      rectRadius: 0.08,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: px,
      y: 4.44,
      w: 1.59,
      h: 0.06,
      fill: { color: accent.bar },
    });
    slide.addText(label, {
      x: px + 0.08,
      y: 4.54,
      w: 1.43,
      h: 0.40,
      fontSize: 8.0,
      bold: true,
      color: TEXT_DARK,
      fontFace: FONT_TITLE,
      valign: 'middle',
      wrap: true,
    });
    slide.addText(sub, {
      x: px + 0.08,
      y: 4.96,
      w: 1.43,
      h: 1.12,
      fontSize: 7.2,
      color: TEXT_BODY,
      fontFace: FONT_BODY,
      valign: 'top',
      wrap: true,
      fit: 'shrink',
    });
  });

  // Author, Date & Confidentiality Metadata Strip inside Cover
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.84,
    y: 6.32,
    w: 6.72,
    h: 0.42,
    rectRadius: 0.08,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 0.75 },
  });
  slide.addText(
    [
      {
        text: 'Authors: Principal AI Architect • Cloud Solutions Architecture • Google Cloud  •  Date: October 2026  •  ',
        options: { fontSize: 8.0, color: TEXT_BODY, fontFace: FONT_BODY },
      },
      {
        text: 'Proprietary + Confidential',
        options: { fontSize: 8.0, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE },
      },
    ],
    {
      x: 0.98,
      y: 6.32,
      w: 6.44,
      h: 0.42,
      valign: 'middle',
      fontFace: FONT_BODY,
    }
  );

  // Right Column: Official 4-Zone Hub-and-Spoke Reference Architecture Card (#78) in strict Quad-Color order
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 8.10,
    y: 0.38,
    w: 4.78,
    h: 6.56,
    rectRadius: 0.08,
    fill: { color: CARD_BG },
    line: { color: BORDER_GREY, width: 1 },
  });
  slide.addText('OFFICIAL 4-ZONE HUB-AND-SPOKE TOPOLOGY (#78)', {
    x: 8.30,
    y: 0.54,
    w: 4.38,
    h: 0.34,
    fontSize: 9.2,
    bold: true,
    color: TEXT_DARK,
    align: 'left',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });

  // Strict Quad-Color Order: 1. Blue (#4285F4) -> 2. Red (#EA4335) -> 3. Yellow (#FBBC04) -> 4. Green (#34A853)
  const titleZones = [
    {
      badge: '01 • ROUTING HUB',
      title: 'Edge WAF, OBO/DPoP & Tier Router',
      sub: 'Google Cloud Armor, IAP, IAM STS & Agent Engine Registry verify OIDC identity, strip spoofed headers & filter tools.',
      bar: G_BLUE,
      tint: G_BLUE_TINT,
      text: G_BLUE_DEEP,
    },
    {
      badge: '02 • RIGHT SPOKE',
      title: '2LO/3LO MCP, AlloyDB RLS & PSC Vaults',
      sub: 'Enforces PostgreSQL Row-Level Security, 3LO step-up consent, VPC-SC perimeters & <60s CMEK kill-switches.',
      bar: G_RED,
      tint: G_RED_TINT,
      text: G_RED_DEEP,
    },
    {
      badge: '03 • LEFT SPOKE',
      title: 'Model Armor, ADK & 90% Prefix Cache',
      sub: 'Screens prompts (4/6), executes Gemini 2.5 Pro with 90% cache (5), clamps RPM in Valkey & isolates L1–L5 memory.',
      bar: G_YELLOW,
      tint: G_YELLOW_TINT,
      text: G_YELLOW_TEXT,
    },
    {
      badge: '04 • GOVERNANCE HUB',
      title: 'Security, CMEK & FinOps Telemetry',
      sub: 'Security Command Center, Cloud KMS CMEK & BigQuery OTel govern encryption liveness and zero-PII chargeback.',
      bar: G_GREEN,
      tint: G_GREEN_TINT,
      text: G_GREEN_DEEP,
    },
  ];

  titleZones.forEach((tz, zIdx) => {
    const zy = Number((0.98 + zIdx * 1.30).toFixed(3));
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.28,
      y: zy,
      w: 4.42,
      h: 1.16,
      rectRadius: 0.08,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 8.28,
      y: zy,
      w: 0.09,
      h: 1.16,
      fill: { color: tz.bar },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.46,
      y: Number((zy + 0.12).toFixed(3)),
      w: 1.48,
      h: 0.24,
      rectRadius: 0.06,
      fill: { color: tz.tint },
    });
    slide.addText(tz.badge, {
      x: 8.46,
      y: Number((zy + 0.12).toFixed(3)),
      w: 1.48,
      h: 0.24,
      fontSize: 6.8,
      bold: true,
      color: tz.text,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
    slide.addText(tz.title, {
      x: 10.02,
      y: Number((zy + 0.10).toFixed(3)),
      w: 2.56,
      h: 0.28,
      fontSize: 8.8,
      bold: true,
      color: TEXT_DARK,
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
    slide.addText(tz.sub, {
      x: 8.46,
      y: Number((zy + 0.44).toFixed(3)),
      w: 4.10,
      h: 0.64,
      fontSize: 7.9,
      color: TEXT_BODY,
      valign: 'top',
      fontFace: FONT_BODY,
      wrap: true,
    });
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 8.28,
    y: 6.32,
    w: 4.42,
    h: 0.42,
    rectRadius: 0.08,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 0.85 },
  });
  slide.addText('3-Act Executive Arc (14 Slides): Act I Architecture → Act II Runtime → Act III Proof & Rollout', {
    x: 8.34,
    y: 6.32,
    w: 4.30,
    h: 0.42,
    fontSize: 7.4,
    bold: true,
    color: TEXT_DARK,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });

  addFooter(pptx, slide, SERIES_LINE);
  slide.addNotes(`${deck.deckTitle}\n\n${deck.deckSubtitle}\n\nSeries: ${SERIES_LINE}`);
  return slide;
}

// ---------------------------------------------------------------------------------------------
// Semantic Layout 2 (`quad-metrics`): 4 KPI Tiles with Prominent 48pt Numbers & 1-Line Captions
// ---------------------------------------------------------------------------------------------

function addQuadMetricsSlide(pptx: Pptx, spec: DeckSpec | null) {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  const kicker = spec ? spec.key : 'PROGRAM';
  const heading = 'Executive Impact & Production Verification Metrics';

  addHeaderBar(pptx, slide, kicker, heading, 'QUAD-METRICS • KPI SCORECARD');

  slide.addText(heading, {
    x: 0.45,
    y: HEADER_H + 0.18,
    w: SLIDE_W - 0.9,
    h: 0.42,
    fontSize: 20.0,
    bold: true,
    color: TEXT_DARK,
    fontFace: FONT_TITLE,
    valign: 'middle',
  });
  slide.addText(
    'Quantified unit economics, shared Gemini 2.5 Pro prefix caching efficiency, and automated security gate verification across Google Cloud.',
    {
      x: 0.45,
      y: HEADER_H + 0.62,
      w: SLIDE_W - 0.9,
      h: 0.28,
      fontSize: 10.5,
      color: TEXT_BODY,
      fontFace: FONT_BODY,
      valign: 'middle',
    }
  );

  const metricsByWorkstream: Record<string, { num: string; caption: string; detail: string; pill: string }[]> = {
    WS1: [
      {
        num: '3',
        caption: 'Production Multi-Tenant Isolation Topologies',
        detail: 'Pattern A Pooled ($42/mo), Pattern B Sovereign Silos ($1,850/mo), and Pattern C Dynamic Hybrid PSC sharing one 80% reusable ADK 2.0 core.',
        pill: 'Patterns A, B & C • Template #78',
      },
      {
        num: '5',
        caption: 'Cryptographic Defense-in-Depth Hops',
        detail: 'Every request enforces tenant identity across Edge OBO/DPoP, Agent Engine Registry, Memory Bank, Model Armor, and AlloyDB RLS.',
        pill: 'Hops 1–5 • Fail-Closed Guardrails',
      },
      {
        num: '84.7%',
        caption: 'Net Per-Turn Token Cost Reduction',
        detail: 'Gemini 2.5 Pro ContextCacheConfig caches the 32,000-token SRE system prefix once at a 90% discount across pooled commercial tenants.',
        pill: 'Gemini 2.5 Pro • ContextCacheConfig',
      },
      {
        num: '20/20',
        caption: 'Automated Security & Migration Gates PASS',
        detail: 'Verified across 10 Pattern A red-team breach tests, 6 Pattern B CMEK kill-switch tests, and 4 Pattern C zero-downtime live upgrade tests.',
        pill: '12/12 Forensic Audit • 20/20 Sims',
      },
    ],
    WS2: [
      {
        num: '$42',
        caption: 'Monthly Unit Cost per Pooled SaaS Tenant',
        detail: 'High-density shared Cloud Run v2 and Vertex AI Agent Engine worker pool serving hundreds of commercial tenants in one project.',
        pill: 'Pattern A • High-Density Pool',
      },
      {
        num: '10/10',
        caption: 'Red-Team Cross-Tenant Breach Attempts Blocked',
        detail: 'Blocks header spoofing (401), tool enumeration (403), memory bleed (403), prompt injection (400), NLC breach (422), and noisy neighbors (429).',
        pill: '2.5 Breach Simulation Suite PASS',
      },
      {
        num: '90%',
        caption: 'Shared System Prompt Prefix Cache Discount',
        detail: 'Amortizes the 32k-token immutable runbook prefix across all pooled tenants while isolating dynamic suffix context per request.',
        pill: 'Vertex AI Context Caching',
      },
      {
        num: '0',
        caption: 'Unauthorized Cross-Tenant SQL Rows Returned',
        detail: 'Transactional PostgreSQL FORCE ROW LEVEL SECURITY binds app.current_tenant_id on every pooled AlloyDB connection checkout.',
        pill: 'AlloyDB PostgreSQL RLS',
      },
    ],
    WS3: [
      {
        num: '$1,850',
        caption: 'Dedicated Monthly Sovereign Silo Footprint',
        detail: 'Dedicated GCP project per regulated enterprise tenant (cymbal-{tenant}-silo-prod) with zero shared runtime, memory, or database state.',
        pill: 'Pattern B • Dedicated GCP Project',
      },
      {
        num: '<60s',
        caption: 'Customer-Managed CMEK Revocation Kill-Switch',
        detail: 'Disabling the tenant Cloud KMS cryptoKeyVersion halts AlloyDB and Memory Bank access with deterministic HTTP 423 Locked.',
        pill: 'Cloud KMS CMEK • HTTP 423 Locked',
      },
      {
        num: '6/6',
        caption: 'Exfiltration & CMEK Revocation Tests PASS',
        detail: 'Certifies VPC Service Controls ingress/egress blocks, IAM Principal Access Boundaries, and dual-tenant FinVault + RetailStream silos.',
        pill: '3.5 Silo Security Suite PASS',
      },
      {
        num: '100%',
        caption: 'Air-Gapped Private GKE & VPC-SC Isolation',
        detail: 'Supports open-weights Gemma 3 (27B) on private GKE GPU nodes (172.16.0.2/28) inside a restricted Google APIs VPC-SC perimeter.',
        pill: 'VPC Service Controls + Private GKE',
      },
    ],
    WS4: [
      {
        num: '74%',
        caption: 'Lower Blended Portfolio Cloud Spend',
        detail: 'Serves 950 Standard tenants in the shared pool and 50 regulated Enterprise tenants in dedicated PSC spokes ($132k vs. $510k/mo).',
        pill: 'Pattern C • Portfolio FinOps',
      },
      {
        num: '0ms',
        caption: 'Active Session Interruption During Tier Upgrade',
        detail: '3-phase dual-read/dual-write backfill, transactional AlloyDB RLS-to-CMEK cutover, and atomic Firestore routing table flip.',
        pill: 'Zero-Downtime Tier Migration',
      },
      {
        num: '4/4',
        caption: 'Live Tier Upgrade & PSC Routing Gates PASS',
        detail: 'Verifies Standard-to-Enterprise live promotion for RetailStream Corp with zero global state bleed across concurrent tenants.',
        pill: '4.5 Tier Migration Suite PASS',
      },
      {
        num: '1-Way',
        caption: 'Unidirectional Private Service Connect (PSC)',
        detail: 'Hub router forwards traffic to Enterprise spoke service attachments (10.10.0.50 -> /24 NAT) with zero reverse spoke-to-hub path.',
        pill: 'Private Service Connect Spokes',
      },
    ],
    WS5: [
      {
        num: '80%',
        caption: 'Reusable Python ADK 2.0 Application Codebase',
        detail: 'All three patterns execute the identical 5-hop security pipeline (core-cymbal-agent/), parameterizing only 20% Terraform boundaries.',
        pill: 'Single Codebase • 3 Topologies',
      },
      {
        num: '2-Q',
        caption: 'Executive Topology Decision Tree',
        detail: 'Maps Contractual Blast-Radius / CMEK Kill-Switch (Q1) and Dynamic Tier Promotion (Q2) directly to Pattern A, B, or C.',
        pill: 'Architecture Selector Framework',
      },
      {
        num: '10-Wk',
        caption: 'Phased Production Rollout Roadmap',
        detail: 'Progresses from Pooled MVP (Weeks 1–3) to 5-Hop Hardening (Weeks 4–6), Sovereign Silos (Weeks 7–8), and Hybrid PSC (Weeks 9–10).',
        pill: 'Implementation Playbook',
      },
      {
        num: '14/14',
        caption: 'Certified Architecture Center (#78) Blueprints',
        detail: 'Every topology ships with 56 native editable Draw.io shapes, 23 vertex-bound connectors, and 14-slide 3-Act executive walkthroughs.',
        pill: '100% Editable Vector Assets',
      },
    ],
  };

  const kpis = metricsByWorkstream[kicker] || metricsByWorkstream.WS1;
  const cardTop = HEADER_H + 1.08;
  const cardH = 4.62;
  const gapX = 0.22;
  const cardW = Number(((SLIDE_W - 0.9 - gapX * 3) / 4).toFixed(3));

  kpis.slice(0, 4).forEach((k, idx) => {
    const cx = Number((0.45 + idx * (cardW + gapX)).toFixed(3));
    // Strict Quad-Color sequence: 1. Blue (#4285F4) -> 2. Red (#EA4335) -> 3. Yellow (#FBBC04) -> 4. Green (#34A853)
    const accent = GOOGLE_CARD_ACCENTS[idx % 4];

    // Neutral light gray container (#F8F9FA) with subtle border (#DADCE0) and 8px radius
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx,
      y: cardTop,
      w: cardW,
      h: cardH,
      rectRadius: 0.08,
      fill: { color: CARD_BG },
      line: { color: BORDER_GREY, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: cx,
      y: cardTop,
      w: cardW,
      h: 0.08,
      fill: { color: accent.bar },
    });

    // Metric Index Badge (01..04)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((cx + 0.18).toFixed(3)),
      y: Number((cardTop + 0.24).toFixed(3)),
      w: 0.44,
      h: 0.28,
      rectRadius: 0.06,
      fill: { color: accent.tint },
    });
    slide.addText(`0${idx + 1}`, {
      x: Number((cx + 0.18).toFixed(3)),
      y: Number((cardTop + 0.24).toFixed(3)),
      w: 0.44,
      h: 0.28,
      fontSize: 8.8,
      bold: true,
      color: accent.text,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });

    // Prominent 48pt Display Number (Google Sans Display, Dark Gray #3C4043)
    slide.addText(k.num, {
      x: Number((cx + 0.18).toFixed(3)),
      y: Number((cardTop + 0.68).toFixed(3)),
      w: Number((cardW - 0.36).toFixed(3)),
      h: 1.05,
      fontSize: 48,
      bold: true,
      color: TEXT_DARK,
      fontFace: FONT_DISPLAY,
      valign: 'middle',
    });

    // 1-Line Caption (Roboto / Google Sans Text, Medium Gray #5F6368)
    slide.addText(k.caption, {
      x: Number((cx + 0.18).toFixed(3)),
      y: Number((cardTop + 1.82).toFixed(3)),
      w: Number((cardW - 0.36).toFixed(3)),
      h: 0.48,
      fontSize: 10.5,
      bold: true,
      color: TEXT_DARK,
      fontFace: FONT_TITLE,
      valign: 'top',
      wrap: true,
    });

    // Subtle Divider
    slide.addShape(pptx.ShapeType.rect, {
      x: Number((cx + 0.18).toFixed(3)),
      y: Number((cardTop + 2.38).toFixed(3)),
      w: Number((cardW - 0.36).toFixed(3)),
      h: 0.012,
      fill: { color: BORDER_GREY },
    });

    // Supporting Evidence Copy (Roboto #5F6368)
    slide.addText(k.detail, {
      x: Number((cx + 0.18).toFixed(3)),
      y: Number((cardTop + 2.52).toFixed(3)),
      w: Number((cardW - 0.36).toFixed(3)),
      h: 1.46,
      fontSize: 8.8,
      color: TEXT_BODY,
      fontFace: FONT_BODY,
      valign: 'top',
      wrap: true,
    });

    // Bottom Verification Tag Pill
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((cx + 0.18).toFixed(3)),
      y: Number((cardTop + cardH - 0.46).toFixed(3)),
      w: Number((cardW - 0.36).toFixed(3)),
      h: 0.28,
      rectRadius: 0.06,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 0.75 },
    });
    slide.addText(k.pill, {
      x: Number((cx + 0.24).toFixed(3)),
      y: Number((cardTop + cardH - 0.46).toFixed(3)),
      w: Number((cardW - 0.48).toFixed(3)),
      h: 0.28,
      fontSize: 7.6,
      bold: true,
      color: accent.text,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
  });

  addLightExecutiveCalloutBanner(
    pptx,
    slide,
    'VERIFIED TELEMETRY',
    `${spec ? spec.label : SERIES_LINE} • Certified by 12 Forensic Checks & 20 Simulation Assertions`,
    true
  );
  addFooter(pptx, slide, SERIES_LINE);
  return slide;
}

// ---------------------------------------------------------------------------------------------
// Semantic Layouts 3 & 6 (`three-pillar` & `next-steps`): Neutral #F8F9FA Container Cards
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
  slide.background = { color: WHITE };
  const isTakeaways = Boolean(opts.isTakeaways) || heading.toLowerCase().includes('takeaway') || heading.toLowerCase().includes("what's next");
  const isTldr = heading.toLowerCase().includes('tl;dr') || heading.toLowerCase().includes('program map');

  const semanticBadge = isTakeaways
    ? 'NEXT-STEPS • ACTION PLAN'
    : isTldr
      ? 'THREE-PILLAR • OVERVIEW'
      : 'THREE-PILLAR • ARCHITECTURE';

  addHeaderBar(pptx, slide, kicker, heading, semanticBadge);

  // Clean Executive Slide Title + 1-Line Subtitle (Zero duplicate banner card clutter!)
  slide.addText(stripMarkdownFormatting(heading), {
    x: 0.45,
    y: HEADER_H + 0.16,
    w: SLIDE_W - 0.9,
    h: 0.40,
    fontSize: 19.0,
    bold: true,
    color: TEXT_DARK,
    fontFace: FONT_TITLE,
    valign: 'middle',
  });
  const subTitleText = isTakeaways
    ? 'Sequenced engineering action items, assigned platform owners, and production verification gates.'
    : 'Structured Google Cloud reference components, runtime isolation boundaries, and target SLAs.';
  slide.addText(subTitleText, {
    x: 0.45,
    y: HEADER_H + 0.56,
    w: SLIDE_W - 0.9,
    h: 0.26,
    fontSize: 10.0,
    color: TEXT_BODY,
    fontFace: FONT_BODY,
    valign: 'middle',
  });

  // Bento Card Grid Geometry (Light Gray #F8F9FA containers with subtle #DADCE0 borders & 8px radius)
  const gridTop = HEADER_H + 0.92;
  const gridBottom = SLIDE_H - 0.90;
  const availH = gridBottom - gridTop;
  const leftMargin = 0.45;
  const availW = SLIDE_W - leftMargin * 2;
  const gapX = 0.22;
  const gapY = 0.18;

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

  const nextStepOwners = [
    'Owner: Platform Architecture',
    'Owner: Cloud Security & IAM',
    'Owner: Data & FinOps SRE',
    'Owner: Tenant Onboarding',
    'Owner: Governance & CISO',
  ];

  parsedCards.forEach((card, idx) => {
    const rect = cardRects[idx];
    // Strict Quad-Color Order: 1. Blue (#4285F4) -> 2. Red (#EA4335) -> 3. Yellow (#FBBC04) -> 4. Green (#34A853)
    const accent = GOOGLE_CARD_ACCENTS[idx % GOOGLE_CARD_ACCENTS.length];
    const cx = Number(rect.x.toFixed(3));
    const cy = Number(rect.y.toFixed(3));
    const cw = Number(rect.w.toFixed(3));
    const ch = Number(rect.h.toFixed(3));

    // Neutral Light Gray Container (#F8F9FA) with subtle border (#DADCE0) and 8px border-radius
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx,
      y: cy,
      w: cw,
      h: ch,
      rectRadius: 0.08,
      fill: { color: CARD_BG },
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
      y: Number((cy + 0.14).toFixed(3)),
      w: 0.40,
      h: 0.28,
      rectRadius: 0.06,
      fill: { color: accent.tint },
    });
    slide.addText(numStr, {
      x: Number((cx + 0.16).toFixed(3)),
      y: Number((cy + 0.14).toFixed(3)),
      w: 0.40,
      h: 0.28,
      fontSize: 9.2,
      bold: true,
      color: accent.text,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });

    // Card Title (Google Sans, Dark Gray #3C4043)
    slide.addText(card.title, {
      x: Number((cx + 0.64).toFixed(3)),
      y: Number((cy + 0.12).toFixed(3)),
      w: Number((cw - 0.80).toFixed(3)),
      h: 0.36,
      fontSize: cw > 4.5 ? 11.4 : 10.4,
      bold: true,
      color: TEXT_DARK,
      fontFace: FONT_TITLE,
      valign: 'middle',
      wrap: true,
    });

    // Subtle divider line inside card
    slide.addShape(pptx.ShapeType.rect, {
      x: Number((cx + 0.16).toFixed(3)),
      y: Number((cy + 0.54).toFixed(3)),
      w: Number((cw - 0.32).toFixed(3)),
      h: 0.01,
      fill: { color: BORDER_GREY },
    });

    // Card Narrative Body (Roboto, Medium Gray #5F6368)
    const specBoxH = 0.54;
    const tagBarH = 0.24;
    const bodyH = Math.max(0.42, ch - 0.58 - specBoxH - tagBarH - 0.18);
    slide.addText(card.body, {
      x: Number((cx + 0.16).toFixed(3)),
      y: Number((cy + 0.60).toFixed(3)),
      w: Number((cw - 0.32).toFixed(3)),
      h: Number(bodyH.toFixed(3)),
      fontSize: cw > 4.5 ? 9.8 : 9.0,
      color: TEXT_BODY,
      fontFace: FONT_BODY,
      valign: 'top',
      wrap: true,
    });

    // Clean White Specification Box inside #F8F9FA Card
    const specY = Number((cy + ch - tagBarH - specBoxH - 0.12).toFixed(3));
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((cx + 0.16).toFixed(3)),
      y: specY,
      w: Number((cw - 0.32).toFixed(3)),
      h: specBoxH,
      rectRadius: 0.06,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 0.75 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: Number((cx + 0.16).toFixed(3)),
      y: specY,
      w: 0.06,
      h: specBoxH,
      fill: { color: accent.bar },
    });
    slide.addText(
      [
        {
          text: `Cloud Stack: ${card.stack}\n`,
          options: { fontSize: 7.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE },
        },
        {
          text: `Target & SLA: ${card.sla}`,
          options: { fontSize: 7.3, bold: false, color: TEXT_BODY, fontFace: FONT_BODY },
        },
      ],
      {
        x: Number((cx + 0.26).toFixed(3)),
        y: Number((specY + 0.03).toFixed(3)),
        w: Number((cw - 0.46).toFixed(3)),
        h: Number((specBoxH - 0.06).toFixed(3)),
        fontFace: FONT_BODY,
        valign: 'middle',
        wrap: true,
      }
    );

    // Bottom Tag / Action Owner Pill
    const tagStr = isTakeaways
      ? `${nextStepOwners[idx % nextStepOwners.length]}  •  ${card.tags.join(' • ')}`
      : card.tags.join('  •  ');
    const tagY = Number((cy + ch - tagBarH - 0.06).toFixed(3));
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((cx + 0.16).toFixed(3)),
      y: tagY,
      w: Number((cw - 0.32).toFixed(3)),
      h: tagBarH,
      rectRadius: 0.05,
      fill: { color: accent.tint },
    });
    slide.addText(tagStr, {
      x: Number((cx + 0.22).toFixed(3)),
      y: tagY,
      w: Number((cw - 0.44).toFixed(3)),
      h: tagBarH,
      fontSize: 7.5,
      bold: true,
      color: accent.text,
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
  });

  addLightExecutiveCalloutBanner(
    pptx,
    slide,
    isTakeaways ? 'NEXT STEPS & OWNERS' : 'ARCHITECTURAL MANDATE',
    opts.footer || SERIES_LINE,
    isTakeaways
  );
  addFooter(pptx, slide, SERIES_LINE);
  slide.addNotes(opts.notes || `${heading}\n\n${bullets.map((b) => `• ${b}`).join('\n')}`);
  return slide;
}

// ---------------------------------------------------------------------------------------------
// Semantic Layout 4 (`comparison-grid`): Clean Comparative Matrix + Bottom Three-Pillar Strip
// ---------------------------------------------------------------------------------------------

function addComparisonTableSlide(
  pptx: Pptx,
  kicker: string,
  section: DeckSection,
  opts: { footer?: string } = {}
) {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  addHeaderBar(pptx, slide, kicker, section.heading, 'COMPARISON-GRID • MATRIX');

  // Clean Executive Slide Title + Subtitle
  slide.addText(stripMarkdownFormatting(section.heading), {
    x: 0.45,
    y: HEADER_H + 0.14,
    w: SLIDE_W - 0.9,
    h: 0.38,
    fontSize: 18.0,
    bold: true,
    color: TEXT_DARK,
    fontFace: FONT_TITLE,
    valign: 'middle',
  });
  slide.addText('Side-by-side Google Cloud Well-Architected trade-off analysis, compensating controls, and target SLAs.', {
    x: 0.45,
    y: HEADER_H + 0.52,
    w: SLIDE_W - 0.9,
    h: 0.24,
    fontSize: 9.8,
    color: TEXT_BODY,
    fontFace: FONT_BODY,
    valign: 'middle',
  });

  // Build Comparison Table (with 100% of raw markdown backticks stripped!)
  const headers = (section.tableHeaders || ['Dimension', 'Option A', 'Option B', 'Option C']).map((h) =>
    stripMarkdownFormatting(h)
  );
  const rawRows = section.tableRows || [];
  const isDenseTable = rawRows.length >= 8;
  const isMediumTable = rawRows.length >= 5 && rawRows.length < 8;
  const headerFont = isDenseTable ? 8.0 : isMediumTable ? 8.5 : 8.8;
  const cellFontFirst = isDenseTable ? 7.3 : isMediumTable ? 7.8 : 8.2;
  const cellFontBody = isDenseTable ? 7.1 : isMediumTable ? 7.6 : 8.0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableData: any[][] = [
    headers.map((h) => ({
      text: h,
      options: {
        bold: true,
        fill: { color: G_BLUE },
        color: WHITE,
        fontSize: headerFont,
        fontFace: FONT_TITLE,
        valign: 'middle',
      },
    })),
  ];

  rawRows.forEach((r, rIdx) => {
    const rowBg = rIdx % 2 === 0 ? WHITE : CARD_BG;
    tableData.push(
      r.map((rawCell, cIdx) => {
        const cellText = stripMarkdownFormatting(rawCell);
        return {
          text: cellText,
          options: {
            fontSize: cIdx === 0 ? cellFontFirst : cellFontBody,
            bold: cIdx === 0 || (cIdx === r.length - 1 && cellText.includes('PASS')),
            fontFace: cIdx === 0 ? FONT_TITLE : FONT_BODY,
            color:
              cIdx === 0
                ? TEXT_DARK
                : cIdx === r.length - 1 && (cellText.includes('PASS') || cellText.includes('$'))
                  ? G_GREEN_DEEP
                  : TEXT_BODY,
            fill: { color: rowBg },
            valign: 'middle',
          },
        };
      })
    );
  });

  const colW = section.tableColW || [2.30, 3.32, 3.40, 3.413];
  const tableTop = HEADER_H + 0.80;
  slide.addTable(tableData, {
    x: 0.45,
    y: tableTop,
    w: SLIDE_W - 0.9,
    colW,
    border: { type: 'solid', color: BORDER_GREY, pt: 0.75 },
    fill: { color: WHITE },
    fontFace: FONT_BODY,
  });

  // Render bottom 4-pillar summary strip (#F8F9FA containers with strict Quad-Color bars: Blue -> Red -> Yellow -> Green) when space permits (<= 7 rows)
  if (rawRows.length <= 7) {
    const rowUnitH = rawRows.length >= 7 ? 0.49 : rawRows.length >= 5 ? 0.54 : 0.62;
    const estTableH = 0.36 + rawRows.length * rowUnitH;
    const stripTop = Number(Math.max(tableTop + estTableH + 0.14, 4.92).toFixed(3));
    const stripH = Number(Math.max(0.92, SLIDE_H - stripTop - 0.86).toFixed(3));

    if (stripTop + stripH <= SLIDE_H - 0.82) {
      const derivedRowPillars = rawRows.slice(0, 4).map((r, rIdx) => {
        const rawKey = stripMarkdownFormatting((r[0] || `Dimension ${rIdx + 1}`).replace(/\n+/g, ' • '));
        const shortKey = rawKey.length > 36 ? `${rawKey.slice(0, 34).trim()}…` : rawKey;
        const col1 = stripMarkdownFormatting((r[1] || '').replace(/\n+/g, ' '));
        const colLast = stripMarkdownFormatting((r[r.length - 1] || '').replace(/\n+/g, ' '));
        const combined = colLast && colLast !== col1 ? `${colLast} (${col1.slice(0, 56)})` : col1 || colLast;
        return {
          title: `${rIdx + 1}. ${shortKey}`,
          body: combined.length > 135 ? `${combined.slice(0, 132).trim()}…` : combined,
        };
      });
      const summaryCards =
        section.bullets && section.bullets.length >= 4
          ? section.bullets.slice(0, 4).map((b, i) => parseBulletIntoCard(b, i, section.specs?.[i]))
          : derivedRowPillars;
      const numCards = Math.min(4, summaryCards.length);
      const gapX = 0.18;
      const cardW = Number(((SLIDE_W - 0.9 - gapX * (numCards - 1)) / numCards).toFixed(3));

      summaryCards.slice(0, numCards).forEach((card, idx) => {
        const cx = Number((0.45 + idx * (cardW + gapX)).toFixed(3));
        const accent = GOOGLE_CARD_ACCENTS[idx % 4];
        slide.addShape(pptx.ShapeType.roundRect, {
          x: cx,
          y: stripTop,
          w: cardW,
          h: stripH,
          rectRadius: 0.08,
          fill: { color: CARD_BG },
          line: { color: BORDER_GREY, width: 1 },
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: cx,
          y: stripTop,
          w: cardW,
          h: 0.055,
          fill: { color: accent.bar },
        });
        slide.addText(stripMarkdownFormatting(card.title), {
          x: Number((cx + 0.12).toFixed(3)),
          y: Number((stripTop + 0.08).toFixed(3)),
          w: Number((cardW - 0.24).toFixed(3)),
          h: 0.28,
          fontSize: 8.2,
          bold: true,
          color: TEXT_DARK,
          fontFace: FONT_TITLE,
          valign: 'middle',
          wrap: true,
        });
        slide.addText(stripMarkdownFormatting(card.body), {
          x: Number((cx + 0.12).toFixed(3)),
          y: Number((stripTop + 0.36).toFixed(3)),
          w: Number((cardW - 0.24).toFixed(3)),
          h: Number(Math.max(0.42, stripH - 0.42).toFixed(3)),
          fontSize: 7.4,
          color: TEXT_BODY,
          fontFace: FONT_BODY,
          valign: 'top',
          wrap: true,
          fit: 'shrink',
        });
      });
    }
  }

  addLightExecutiveCalloutBanner(pptx, slide, 'ARCHITECTURAL DECISION', opts.footer || SERIES_LINE, false);
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
  slide.background = { color: WHITE };
  addHeaderBar(pptx, slide, kicker, section.heading, 'THREE-PILLAR • 5-HOP PIPELINE');

  slide.addText(stripMarkdownFormatting(section.heading), {
    x: 0.45,
    y: HEADER_H + 0.14,
    w: SLIDE_W - 0.9,
    h: 0.38,
    fontSize: 18.0,
    bold: true,
    color: TEXT_DARK,
    fontFace: FONT_TITLE,
    valign: 'middle',
  });
  slide.addText('End-to-end 5-hop cryptographic defense-in-depth pipeline enforcing zero cross-tenant leakage.', {
    x: 0.45,
    y: HEADER_H + 0.52,
    w: SLIDE_W - 0.9,
    h: 0.24,
    fontSize: 9.8,
    color: TEXT_BODY,
    fontFace: FONT_BODY,
    valign: 'middle',
  });

  const steps: PipelineStepSpec[] = section.pipelineSteps || [];
  const pipeTop = HEADER_H + 0.84;
  const pipeH = 5.10;
  const gapX = 0.18;
  const colW = Number(((SLIDE_W - 0.9 - gapX * 4) / 5).toFixed(3));

  steps.slice(0, 5).forEach((st, idx) => {
    const cx = Number((0.45 + idx * (colW + gapX)).toFixed(3));
    // Strict Quad-Color Order: 1. Blue (#4285F4) -> 2. Red (#EA4335) -> 3. Yellow (#FBBC04) -> 4. Green (#34A853)
    const accent = GOOGLE_CARD_ACCENTS[idx % GOOGLE_CARD_ACCENTS.length];

    // Column Outer Card (#F8F9FA with #DADCE0 border and 8px radius)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx,
      y: pipeTop,
      w: colW,
      h: pipeH,
      rectRadius: 0.08,
      fill: { color: CARD_BG },
      line: { color: BORDER_GREY, width: 1 },
    });

    // Top Colored Hop Banner
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx,
      y: pipeTop,
      w: colW,
      h: 0.42,
      rectRadius: 0.06,
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
      fontFace: FONT_TITLE,
    });

    // Hop Title (Google Sans, #3C4043)
    slide.addText(stripMarkdownFormatting(st.title), {
      x: Number((cx + 0.12).toFixed(3)),
      y: Number((pipeTop + 0.50).toFixed(3)),
      w: Number((colW - 0.24).toFixed(3)),
      h: 0.54,
      fontSize: 9.4,
      bold: true,
      color: TEXT_DARK,
      fontFace: FONT_TITLE,
      valign: 'top',
      wrap: true,
    });

    // Google Cloud Service Pill
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((cx + 0.12).toFixed(3)),
      y: Number((pipeTop + 1.08).toFixed(3)),
      w: Number((colW - 0.24).toFixed(3)),
      h: 0.34,
      rectRadius: 0.06,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 0.75 },
    });
    slide.addText(stripMarkdownFormatting(st.service), {
      x: Number((cx + 0.16).toFixed(3)),
      y: Number((pipeTop + 1.08).toFixed(3)),
      w: Number((colW - 0.32).toFixed(3)),
      h: 0.34,
      fontSize: 7.4,
      bold: true,
      color: accent.text,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
      wrap: true,
    });

    // Architectural Mechanism Body (Roboto, #5F6368)
    slide.addText(stripMarkdownFormatting(st.mechanism), {
      x: Number((cx + 0.12).toFixed(3)),
      y: Number((pipeTop + 1.50).toFixed(3)),
      w: Number((colW - 0.24).toFixed(3)),
      h: 1.72,
      fontSize: 8.2,
      color: TEXT_BODY,
      fontFace: FONT_BODY,
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
      rectRadius: 0.06,
      fill: { color: WHITE },
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
        { text: 'CRYPTOGRAPHIC INVARIANT\n', options: { fontSize: 6.8, bold: true, color: accent.text, fontFace: FONT_TITLE } },
        { text: stripMarkdownFormatting(st.invariant), options: { fontSize: 7.5, bold: true, color: TEXT_DARK, fontFace: FONT_BODY } },
      ],
      {
        x: Number((cx + 0.22).toFixed(3)),
        y: Number((invY + 0.06).toFixed(3)),
        w: Number((colW - 0.38).toFixed(3)),
        h: 0.84,
        fontFace: FONT_BODY,
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
      rectRadius: 0.06,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 0.75 },
    });
    slide.addText(
      [
        { text: 'FAIL-CLOSED GATE\n', options: { fontSize: 6.6, bold: true, color: G_RED_DEEP, fontFace: FONT_TITLE } },
        { text: stripMarkdownFormatting(st.gate), options: { fontSize: 7.3, bold: true, color: TEXT_DARK, fontFace: FONT_BODY } },
      ],
      {
        x: Number((cx + 0.18).toFixed(3)),
        y: Number((gateY + 0.04).toFixed(3)),
        w: Number((colW - 0.36).toFixed(3)),
        h: 0.56,
        align: 'center',
        valign: 'middle',
        fontFace: FONT_BODY,
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
        fill: { color: G_BLUE },
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
        fontFace: FONT_TITLE,
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
// Semantic Layout 5 (`section-divider`): Dark Charcoal Background (#202124) with White Text
// ---------------------------------------------------------------------------------------------

function addSectionDivider(pptx: Pptx, kicker: string, heading: string, sub: string) {
  const slide = pptx.addSlide();
  slide.background = { color: DIVIDER_CHARCOAL };
  addGoogleFourColorRibbon(pptx, slide, 0, 0.085);

  addGoogleFourColorDots(pptx, slide, 0.95, 1.85);
  slide.addText(`${kicker.toUpperCase()}  •  GOOGLE CLOUD ARCHITECTURE CENTER WORKSTREAM`, {
    x: 1.55,
    y: 1.70,
    w: SLIDE_W - 2.4,
    h: 0.30,
    fontSize: 10.5,
    bold: true,
    color: '8AB4F8',
    fontFace: FONT_TITLE,
    valign: 'middle',
  });
  slide.addText(stripMarkdownFormatting(heading), {
    x: 0.95,
    y: 2.30,
    w: SLIDE_W - 1.9,
    h: 1.75,
    fontSize: 28,
    bold: true,
    color: WHITE,
    fontFace: FONT_DISPLAY,
    valign: 'top',
    wrap: true,
  });
  slide.addText(stripMarkdownFormatting(sub), {
    x: 0.95,
    y: 4.20,
    w: SLIDE_W - 1.9,
    h: 1.25,
    fontSize: 14.0,
    color: 'DADCE0',
    fontFace: FONT_BODY,
    valign: 'top',
    wrap: true,
  });
  addFooter(pptx, slide, SERIES_LINE, true);
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
      { text: 'Architecture Blueprint (#78 Hub & Spoke)', options: { bold: true, fill: { color: G_BLUE }, color: WHITE, fontSize: 8.8, fontFace: FONT_TITLE } },
      { text: 'Architectural Question Answered', options: { bold: true, fill: { color: G_BLUE }, color: WHITE, fontSize: 8.8, fontFace: FONT_TITLE } },
      { text: 'Google Cloud Solution & Verification Outcome', options: { bold: true, fill: { color: G_BLUE }, color: WHITE, fontSize: 8.8, fontFace: FONT_TITLE } },
      { text: 'Core Google Cloud Stack', options: { bold: true, fill: { color: G_BLUE }, color: WHITE, fontSize: 8.8, fontFace: FONT_TITLE } },
    ],
  ];
  for (let idx = 0; idx < displayIds.length; idx++) {
    const id = displayIds[idx];
    const m = manifest.find((x) => x.id === id);
    if (!m) continue;
    const flow = getDiagramFlowById(id);
    const rowBg = idx % 2 === 0 ? WHITE : CARD_BG;
    const questionText = stripMarkdownFormatting(flow?.questionAnswered || m.subtitle || 'How do we isolate multi-tenant agents safely on Google Cloud?');
    let solutionText = stripMarkdownFormatting(flow?.outcomeBody || m.subtitle);
    if (isCompactTable && solutionText.length > 145) {
      const firstSentence = solutionText.split(/(?<=[.!?])\s+/)[0];
      solutionText = firstSentence && firstSentence.length <= 165 ? firstSentence : `${flow?.outcomeTitle || m.title}.`;
    }
    const servicesText = stripMarkdownFormatting(flow?.execCloudServices || 'Google Cloud Armor, IAP, Vertex AI Agent Engine, Model Armor, AlloyDB & BigQuery');
    rows.push([
      { text: `${m.badge} — ${m.title}`, options: { fontSize: tblFont, color: TEXT_DARK, bold: true, fill: { color: rowBg }, fontFace: FONT_TITLE } },
      { text: questionText, options: { fontSize: tblFont, color: G_BLUE_DEEP, fill: { color: rowBg }, fontFace: FONT_BODY } },
      { text: solutionText, options: { fontSize: tblFont, color: TEXT_BODY, fill: { color: rowBg }, fontFace: FONT_BODY } },
      { text: servicesText, options: { fontSize: Number((tblFont - 0.2).toFixed(1)), color: G_GREEN_DEEP, bold: true, fill: { color: rowBg }, fontFace: FONT_TITLE } },
    ]);
  }
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  addHeaderBar(pptx, slide, spec ? spec.key : 'PROGRAM', 'Architecture Blueprint Summary & Reference Lineage', 'COMPARISON-GRID • LINEAGE');

  slide.addText('At-a-Glance Blueprint Index: Architectural Questions, Verified Outcomes & Google Cloud Services', {
    x: 0.45,
    y: HEADER_H + 0.16,
    w: SLIDE_W - 0.9,
    h: 0.42,
    fontSize: 16.5,
    bold: true,
    color: TEXT_DARK,
    fontFace: FONT_TITLE,
    valign: 'middle',
  });

  slide.addTable(rows, {
    x: 0.45,
    y: HEADER_H + 0.68,
    w: SLIDE_W - 0.9,
    colW: [3.05, 2.95, 3.60, 2.833],
    border: { type: 'solid', color: BORDER_GREY, pt: 0.75 },
    fill: { color: WHITE },
    fontFace: FONT_BODY,
  });

  const sourceCards = [
    {
      title: '1. 3-Act Executive Deck Structure',
      body: 'Each workstream deck weaves Act I (Thesis & #78 Blueprint), Act II (3-Zone, Payload, UML & State Loops), and Act III (Matrices, Live Proof & Roadmap).',
      tag: '56 Editable Shapes + 23 Connectors per Diagram',
      accent: GOOGLE_CARD_ACCENTS[0],
    },
    {
      title: '2. Automated Security & FinOps Proof',
      body: 'All patterns are certified by 12 forensic checks and 20 simulation assertions—proving zero cross-tenant data bleed and 90% shared prefix caching.',
      tag: '12/12 Forensic Gates • 20/20 Simulations PASS',
      accent: GOOGLE_CARD_ACCENTS[1],
    },
    {
      title: '3. Official Architecture Center (#78)',
      body: 'Extends the official Google Cloud Architecture Center multi-tenant agentic AI blueprint (#78) with production-ready code for Pooled, Siloed, and Hybrid SaaS.',
      tag: 'Google Cloud Architecture Center • Hub & Spoke',
      accent: GOOGLE_CARD_ACCENTS[2],
    },
    {
      title: '4. Grounded Live Cloud Console Proof',
      body: 'Pairs 100% native editable vector shapes with authentic Google Cloud Console & Pantheon verification captures across 3 live GCP projects.',
      tag: '9 Verified Cloud Console Captures • 24 Code Files',
      accent: GOOGLE_CARD_ACCENTS[3],
    },
  ];
  const rowUnitH = displayIds.length >= 6 ? 0.54 : displayIds.length >= 4 ? 0.64 : 0.76;
  const estimatedTableH = 0.36 + displayIds.length * rowUnitH;
  const cardY = Number(Math.min(SLIDE_H - 1.92, Math.max(HEADER_H + 0.68 + estimatedTableH + 0.18, 3.55)).toFixed(3));
  const cardH = Number(Math.min(2.15, Math.max(1.36, SLIDE_H - cardY - 0.56)).toFixed(3));
  const cardW = (SLIDE_W - 0.9 - 0.54) / 4;
  sourceCards.forEach((sc, idx) => {
    const sx = Number((0.45 + idx * (cardW + 0.18)).toFixed(3));
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sx,
      y: cardY,
      w: Number(cardW.toFixed(3)),
      h: cardH,
      rectRadius: 0.08,
      fill: { color: CARD_BG },
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
      x: sx + 0.12,
      y: cardY + 0.1,
      w: cardW - 0.24,
      h: 0.28,
      fontSize: 9.2,
      bold: true,
      color: TEXT_DARK,
      fontFace: FONT_TITLE,
      valign: 'middle',
    });
    slide.addText(sc.body, {
      x: sx + 0.12,
      y: cardY + 0.4,
      w: cardW - 0.24,
      h: Math.max(0.62, cardH - 0.74),
      fontSize: 7.8,
      color: TEXT_BODY,
      fontFace: FONT_BODY,
      valign: 'top',
      wrap: true,
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sx + 0.14,
      y: Number((cardY + cardH - 0.29).toFixed(3)),
      w: Number((cardW - 0.28).toFixed(3)),
      h: 0.21,
      rectRadius: 0.05,
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
      fontFace: FONT_TITLE,
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
  // Outer Sidebar Card (#F8F9FA container with #DADCE0 border and 8px radius)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: sideX,
    y: sideY,
    w: sideW,
    h: sideH,
    rectRadius: 0.08,
    fill: { color: CARD_BG },
    line: { color: BORDER_GREY, width: 1 },
  });

  // 1. Top Header Banner inside Sidebar
  const hdrH = 0.86;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: Number((sideX + 0.12).toFixed(3)),
    y: Number((sideY + 0.10).toFixed(3)),
    w: Number((sideW - 0.24).toFixed(3)),
    h: hdrH,
    rectRadius: 0.08,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 0.85 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: Number((sideX + 0.12).toFixed(3)),
    y: Number((sideY + 0.10).toFixed(3)),
    w: 0.08,
    h: hdrH,
    fill: { color: G_BLUE },
  });
  slide.addText(`${figureLabel.toUpperCase()} • ARCHITECTURE CENTER GUIDE (#78)`, {
    x: Number((sideX + 0.26).toFixed(3)),
    y: Number((sideY + 0.14).toFixed(3)),
    w: Number((sideW - 0.44).toFixed(3)),
    h: 0.18,
    fontSize: 7.4,
    bold: true,
    color: G_BLUE,
    fontFace: FONT_TITLE,
  });
  const qText = stripMarkdownFormatting(flowEntry?.questionAnswered || diagramTitle);
  slide.addText(qText, {
    x: Number((sideX + 0.26).toFixed(3)),
    y: Number((sideY + 0.33).toFixed(3)),
    w: Number((sideW - 0.44).toFixed(3)),
    h: 0.58,
    fontSize: 8.1,
    bold: true,
    color: TEXT_DARK,
    fontFace: FONT_TITLE,
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
    fontFace: FONT_TITLE,
  });

  const zones = flowEntry?.zonesSummary || [
    { zoneId: 'Zone 1', colorHex: '#aecbfa', borderHex: '#4285F4', name: 'Routing Hub', role: 'Edge WAF, IAP OIDC & Tier Router', nodes: [] },
    { zoneId: 'Zone 2', colorHex: '#fad2cf', borderHex: '#EA4335', name: 'Right Spoke', role: 'MCP Servers, AlloyDB RLS & PSC Spokes', nodes: [] },
    { zoneId: 'Zone 3', colorHex: '#feefc3', borderHex: '#FBBC04', name: 'Left Spoke', role: 'Model Armor, ADK & 90% Prefix Cache', nodes: [] },
    { zoneId: 'Zone 4', colorHex: '#ceead6', borderHex: '#34A853', name: 'Governance Hub', role: 'SCC, Cloud KMS CMEK & BigQuery OTel', nodes: [] },
  ];

  const zoneStartY = sideY + 1.22;
  const zoneCardH = 0.56;
  const zoneGap = 0.06;
  zones.slice(0, 4).forEach((zn, zIdx) => {
    const zy = Number((zoneStartY + zIdx * (zoneCardH + zoneGap)).toFixed(3));
    // Strict Quad-Color sequence: 1. Blue (#4285F4) -> 2. Red (#EA4335) -> 3. Yellow (#FBBC04) -> 4. Green (#34A853)
    const accent = GOOGLE_CARD_ACCENTS[zIdx % 4];
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((sideX + 0.12).toFixed(3)),
      y: zy,
      w: Number((sideW - 0.24).toFixed(3)),
      h: zoneCardH,
      rectRadius: 0.06,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 0.75 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: Number((sideX + 0.12).toFixed(3)),
      y: zy,
      w: 0.07,
      h: zoneCardH,
      fill: { color: accent.bar },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((sideX + 0.24).toFixed(3)),
      y: Number((zy + 0.05).toFixed(3)),
      w: 0.88,
      h: 0.17,
      rectRadius: 0.04,
      fill: { color: accent.tint },
    });
    slide.addText(zn.zoneId.toUpperCase(), {
      x: Number((sideX + 0.24).toFixed(3)),
      y: Number((zy + 0.05).toFixed(3)),
      w: 0.88,
      h: 0.17,
      fontSize: 6.0,
      bold: true,
      color: accent.text,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
    slide.addText(stripMarkdownFormatting(zn.name), {
      x: Number((sideX + 1.18).toFixed(3)),
      y: Number((zy + 0.03).toFixed(3)),
      w: Number((sideW - 1.36).toFixed(3)),
      h: 0.20,
      fontSize: 7.4,
      bold: true,
      color: TEXT_DARK,
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
    slide.addText(stripMarkdownFormatting(zn.role), {
      x: Number((sideX + 0.24).toFixed(3)),
      y: Number((zy + 0.24).toFixed(3)),
      w: Number((sideW - 0.42).toFixed(3)),
      h: 0.29,
      fontSize: 6.7,
      color: TEXT_BODY,
      valign: 'top',
      fontFace: FONT_BODY,
      wrap: true,
    });
  });

  // 3. Key Walkthrough Takeaways (4 Compact Numbered Cards in Quad-Color sequence)
  const tpLabelY = zoneStartY + 4 * (zoneCardH + zoneGap) + 0.04;
  slide.addText('KEY ARCHITECTURAL WALKTHROUGH POINTS', {
    x: Number((sideX + 0.14).toFixed(3)),
    y: Number(tpLabelY.toFixed(3)),
    w: Number((sideW - 0.28).toFixed(3)),
    h: 0.18,
    fontSize: 7.2,
    bold: true,
    color: TEXT_MUTED,
    fontFace: FONT_TITLE,
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
      rectRadius: 0.06,
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
      fontFace: FONT_TITLE,
    });
    slide.addText(stripMarkdownFormatting(tp), {
      x: Number((sideX + 0.50).toFixed(3)),
      y: Number((ty + 0.03).toFixed(3)),
      w: Number((sideW - 0.68).toFixed(3)),
      h: Number((tpCardH - 0.06).toFixed(3)),
      fontSize: 6.9,
      color: TEXT_BODY,
      fontFace: FONT_BODY,
      valign: 'middle',
      wrap: true,
    });
  });

  // 4. Bottom Verification & Live GCP Target Pill
  slide.addShape(pptx.ShapeType.roundRect, {
    x: Number((sideX + 0.12).toFixed(3)),
    y: Number(bottomPillY.toFixed(3)),
    w: Number((sideW - 0.24).toFixed(3)),
    h: 0.36,
    rectRadius: 0.06,
    fill: { color: WHITE },
    line: { color: BORDER_GREY, width: 0.85 },
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
      fontFace: FONT_TITLE,
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
  sourceDrawioRelPath: string,
  singleSlideOnly: boolean = true
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
    `${blueprintId} (${sourceDrawioRelPath})  •  100% Native Editable Shapes + 4-Zone Architecture Center Guide`
  );

  const notes = `${figureLabel} — ${diagramTitle}\n\n${talkingPoints.map((t) => `• ${t}`).join('\n')}\n\nEditable source: ${sourceDrawioRelPath}`;
  slide2.addNotes(notes);

  if (singleSlideOnly) {
    return {
      vertexCount: vertices.length,
      edgeCount: edges.length,
      slides: 1,
    };
  }

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
        options: { fontSize: 7.0, bold: true, color: G_BLUE_DEEP, fill: { color: rowBg }, fontFace: FONT_TITLE },
      },
      {
        text: ts.verifiedOutcome,
        options: { fontSize: 7.0, bold: true, color: G_GREEN_DEEP, fill: { color: rowBg }, fontFace: FONT_TITLE },
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
    fontFace: FONT_BODY,
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
      rectRadius: 0.08,
      fill: { color: CARD_BG },
      line: { color: BORDER_GREY, width: 0.85 },
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
      fontFace: FONT_TITLE,
    });
    techSlide.addText(wp.body, {
      x: Number((wx + 0.14).toFixed(3)),
      y: Number((waTop + 0.26).toFixed(3)),
      w: Number((waColW - 0.22).toFixed(3)),
      h: 0.34,
      fontSize: 6.8,
      color: TEXT_BODY,
      fontFace: FONT_BODY,
      wrap: true,
    });
  });

  addFooter(
    pptx,
    techSlide,
    `${figureLabel} Step-by-Step Technical Flow  •  100% Editable Native Table & Well-Architected Pillars  •  Verified on Google Cloud`
  );

  logicalSlide.addNotes(`${figureLabel} Step-by-Step End-to-End Logical Flow for ${diagramTitle}`);
  techSlide.addNotes(`${figureLabel} Step-by-Step End-to-End Technical Flow for ${diagramTitle}`);

  return {
    vertexCount: vertices.length,
    edgeCount: edges.length,
    slides: 3,
  };
}

// ---------------------------------------------------------------------------------------------
// Cohesive 3-Act Workstream-Specific Native Editable Visual Archetypes
// (skills/slide-design/SKILL.md & rules/AGENTS.md — Zero Copy-Pasted Unrelated Example Text!)
//   1. architecture-zone-topology (Workstream-Specific 3-Zone Boundary & Control-to-Data Plane)
//   2. payload-transformation-triptych (Workstream-Specific 3-Stage Before/After Wire Payload)
//   3. uml-sequence-swimlane (Workstream-Specific 5-Actor Chronological UML Lifeline Steps 1..6)
//   4. async-state-flow-pipeline (Workstream-Specific 4-Node State & Closed-Loop Pipeline 1..5)
//   5. phased-roadmap-timeline (Workstream-Specific 3-Phase Connected Rollout & Migration Timeline)
//   6. strategic-operating-model-pillars (Workstream-Specific 3-Pillar Operating Model & SLAs)
//   7. live-screenshot-callout (Workstream-Specific Google Cloud Console Screenshots + Callouts)
// ---------------------------------------------------------------------------------------------

const EXEC_NAVY = '0F2942';
const EXEC_NAVY_DEEP = '0B2545';
const EXEC_TEAL = '0D7A75';
const EXEC_TEAL_ENGINE = '1B5E7B';
const EXEC_TEAL_GLASS = '367591';
const EXEC_SLATE = '54728C';
const EXEC_AMBER = 'CA8A04';
const EXEC_GREEN_DARK = '0F766E';
const ALERT_RED_BORDER = 'D93025';
const SUCCESS_GREEN_BORDER = '1E8E3E';

interface ZoneTopologySpec {
  slideTitle: string;
  zone1Title: string;
  callers: { badge: string; sub: string }[];
  arrow1Top: string;
  arrow1Bot: string;
  zone2Title: string;
  zone2SubContainer: string;
  gwCards: { icon: string; title: string }[];
  arrow2Top: string;
  arrow2Bot: string;
  zone3Title: string;
  z3TopBadge: string;
  z3TopTitle: string;
  z3MidPill1: string;
  z3MidPill2: string;
  z3MidTitle: string;
  z3BotBadge: string;
  z3BotTitle: string;
  footer: string;
}

const ZONE_TOPOLOGY_BY_WS: Record<string, ZoneTopologySpec> = {
  WS1: {
    slideTitle: 'WS1 • 3-Zone Multi-Tenant Reference Taxonomy & 5-Hop Control Plane',
    zone1Title: 'TENANT IDENTITY & EDGE INGRESS\n(Competing Enterprise Callers)',
    callers: [
      { badge: 'FinVault', sub: 'Google Cloud Identity\n(Enterprise Tier)' },
      { badge: 'Retail', sub: 'Microsoft Entra ID\n(Standard Tier)' },
      { badge: 'Partner', sub: 'Cloud Identity SAML\n(Federated Caller)' },
    ],
    arrow1Top: 'OIDC JWT +\nDPoP Proof',
    arrow1Bot: 'Cloud Armor\n+ IAP Edge',
    zone2Title: '5-HOP ADK 2.0 CONTROL PLANE\n(Shared 80% Core Pipeline)',
    zone2SubContainer: 'Vertex AI Agent Engine & Cloud Run',
    gwCards: [
      { icon: 'STS', title: 'Hop 1: IAM STS OBO\n& RFC 9449 DPoP' },
      { icon: 'ARD', title: 'Hops 2–3: ARD Filter\n& L1–L5 Memory Scope' },
      { icon: 'DLP', title: 'Hop 4: Model Armor,\nDLP & 90% Cache' },
    ],
    arrow2Top: 'Sealed TenantContext\nEnvelope',
    arrow2Bot: 'Tier-Aware Routing\n(Pool / Silo / PSC)',
    zone3Title: '3 ISOLATION DATA PLANES\n(Patterns A, B & C Execution)',
    z3TopBadge: 'PAT A',
    z3TopTitle: 'Pattern A: Shared Pool & AlloyDB RLS ($42/mo)',
    z3MidPill1: 'PAT B • Silo',
    z3MidPill2: 'PAT C • PSC',
    z3MidTitle: 'Dedicated Sovereign VPC-SC & Hybrid PSC Spokes',
    z3BotBadge: 'OTel',
    z3BotTitle: 'Hop 5: 2LO/3LO MCP Hub & BigQuery FinOps Ledger',
    footer: 'Workstream 1 Reference Taxonomy  •  Zone 1 (Tenant Ingress) → Zone 2 (5-Hop Control Plane) → Zone 3 (Patterns A, B & C)',
  },
  WS2: {
    slideTitle: 'WS2 • Pattern A High-Density Pooled Runtime & AlloyDB RLS Topology',
    zone1Title: 'POOLED SAAS TENANT CALLERS\n(Co-Hosted Commercial & Enterprise)',
    callers: [
      { badge: 'FinVault', sub: 'FinVault Bank\n(600 RPM / 8k Think)' },
      { badge: 'Retail', sub: 'RetailStream Corp\n(120 RPM / 4k Think)' },
      { badge: 'RedTeam', sub: 'Adversarial Probe\n(Spoofed Headers)' },
    ],
    arrow1Top: 'HTTPS + OIDC\nBearer Token',
    arrow1Bot: 'Cloud Armor\nHeader Strip',
    zone2Title: 'SHARED CLOUD RUN v2 POOL\n(cymbal-pooled-prod)',
    zone2SubContainer: 'Shared Vertex AI Agent Engine Pool',
    gwCards: [
      { icon: '90%', title: '90% Shared 32k\nPrefix Cache Hit' },
      { icon: 'RPM', title: 'Memorystore Valkey\nToken-Bucket Bulkhead' },
      { icon: 'DLP', title: 'Model Armor + NLC\n& SDP PII Redaction' },
    ],
    arrow2Top: 'SET LOCAL\napp.current_tenant_id',
    arrow2Bot: 'Scoped 2LO/3LO\nMCP Dispatch',
    zone3Title: 'SHARED MULTI-TENANT DATA PLANE\n(Cryptographic Logical Isolation)',
    z3TopBadge: 'RLS',
    z3TopTitle: 'Shared AlloyDB Cluster (FORCE ROW LEVEL SECURITY)',
    z3MidPill1: '2LO • M2M',
    z3MidPill2: '3LO • OAuth',
    z3MidTitle: 'Tenant-Scoped Memory Bank (/tenants/{id}/*) & MCP',
    z3BotBadge: 'KMS',
    z3BotTitle: 'Shared Cloud KMS CMEK & BigQuery OTel Cost Attribution',
    footer: 'Workstream 2 Pattern A Pooled  •  100+ Co-Hosted Tenants at $42/mo with 10/10 Red-Team Attacks Blocked',
  },
  WS3: {
    slideTitle: 'WS3 • Pattern B Sovereign Single-Tenant Project, VPC-SC & CMEK Silo',
    zone1Title: 'REGULATED ENTERPRISE CALLER\n(Dedicated Tenant Ingress)',
    callers: [
      { badge: 'FinVault', sub: 'FinVault Wealth AI\n(Google OIDC)' },
      { badge: 'CISO', sub: 'Tenant CISO Admin\n(KMS Key Custodian)' },
      { badge: 'Auditor', sub: 'OCC / GDPR Compliance\nVerifier' },
    ],
    arrow1Top: 'Dedicated\nHTTPS VIP',
    arrow1Bot: 'IAM PAB\nBoundary Check',
    zone2Title: 'VPC SERVICE CONTROLS PERIMETER\n(restricted.googleapis.com)',
    zone2SubContainer: 'Zero-Egress Sovereign Security Gateway',
    gwCards: [
      { icon: 'PAB', title: 'IAM Principal Access\nBoundary (PAB)' },
      { icon: 'VPC', title: 'VPC-SC Ingress/Egress\nDeny Perimeter' },
      { icon: 'KMS', title: 'Cloud KMS CMEK\nLiveness Gate (<60s)' },
    ],
    arrow2Top: 'Restricted VIP\n199.36.153.4/30',
    arrow2Bot: 'Zero Public\nInternet Egress',
    zone3Title: 'DEDICATED SOVEREIGN SILO VPC\n(cymbal-finvault-silo-prod)',
    z3TopBadge: 'GKE',
    z3TopTitle: 'Private GKE Inference (Gemma 3 27B) & Dedicated Vertex',
    z3MidPill1: 'MEM • Silo',
    z3MidPill2: 'ADK • Agent',
    z3MidTitle: 'Dedicated Agent Engine & Sovereign GCS Skills Bucket',
    z3BotBadge: 'CMEK',
    z3BotTitle: 'Dedicated AlloyDB Primary + Tenant CMEK Kill-Switch',
    footer: 'Workstream 3 Pattern B Sovereign Silos  •  Dedicated Project, VPC-SC, IAM PAB & <60s CMEK Kill-Switch',
  },
  WS4: {
    slideTitle: 'WS4 • Pattern C Hub-and-Spoke Control Plane & Unidirectional PSC Topology',
    zone1Title: 'UNIFIED MULTI-TENANT INGRESS HUB\n(Shared SaaS Control Plane)',
    callers: [
      { badge: 'Standard', sub: '850 Standard Tenants\n($42/mo Pooled Path)' },
      { badge: 'Promote', sub: 'RetailStream Enterprise\n(Live Tier Upgrade)' },
      { badge: 'Sovereign', sub: '150 Enterprise Tenants\n($1,850/mo Spoke Path)' },
    ],
    arrow1Top: 'Single Global\nAnycast URL',
    arrow1Bot: 'Firestore Tier\nLookup (0ms)',
    zone2Title: 'DUAL-PLANE TIER ROUTING ENGINE\n(Hub VPC + /28 PSC NAT)',
    zone2SubContainer: 'Dynamic Tier Router & Migration Coordinator',
    gwCards: [
      { icon: 'ARD', title: 'Firestore Atomic\nTier Routing Table' },
      { icon: 'SYNC', title: '3-Phase Dual-Write\nZero-Downtime Migrator' },
      { icon: 'PSC', title: 'Consumer PSC Endpoint\n& /28 NAT Subnet' },
    ],
    arrow2Top: 'Unidirectional\nPSC Producer',
    arrow2Bot: 'Zero Transitive\nVPC Peering',
    zone3Title: 'SOVEREIGN ENTERPRISE SPOKE VPC\n(Customer-Owned Producer Project)',
    z3TopBadge: 'PSC',
    z3TopTitle: 'ServiceAttachment (ACCEPT_SELECTED) & Internal ALB',
    z3MidPill1: 'ADK • Spoke',
    z3MidPill2: 'MEM • Spoke',
    z3MidTitle: 'Dedicated Spoke Agent Engine & Isolated Memory Bank',
    z3BotBadge: 'CMEK',
    z3BotTitle: 'Customer-CMEK AlloyDB Vault & Spoke MCP Servers',
    footer: 'Workstream 4 Pattern C Dynamic Hybrid  •  Shared Hub Control Plane + Unidirectional PSC Spokes + 0ms Live Cutover',
  },
  WS5: {
    slideTitle: 'WS5 • 80/20 Code Reuse Architecture & Multi-Tenant Agentic Triad',
    zone1Title: '2-QUESTION TOPOLOGY SELECTOR\n(Executive Decision Inputs)',
    callers: [
      { badge: 'Q1: Silo?', sub: 'Contractual Project /\nVPC-SC / CMEK Mandate?' },
      { badge: 'Q2: Hybrid?', sub: 'Single Control Plane +\nLive Tier Upgrades?' },
      { badge: 'FinOps', sub: '1,000-Tenant Portfolio\nTCO Target ($313k/mo)' },
    ],
    arrow1Top: 'Selects Pattern\nA, B, or C',
    arrow1Bot: '80% Shared\nPython Core',
    zone2Title: 'INVARIANT 5-HOP ADK 2.0 CORE\n(runtime_pipeline.py — 80% Reusable)',
    zone2SubContainer: 'Unified Multi-Tenant Agentic Triad',
    gwCards: [
      { icon: 'ADK', title: 'Shared Diagnostic &\nTenant Private Agents' },
      { icon: '90%', title: 'Gemini 2.5 Pro 90%\nShared Prefix Cache' },
      { icon: 'MCP', title: '2LO Telemetry & 3LO\nWorkspace MCP Hub' },
    ],
    arrow2Top: '20% Terraform\nTopology Adapter',
    arrow2Bot: '20/20 Automated\nCI/CD Gates',
    zone3Title: 'PARAMETERIZED TERRAFORM TARGETS\n(Modules 2.6, 3.6 & 4.6)',
    z3TopBadge: 'TF 2.6',
    z3TopTitle: 'Module 2.6: Pooled Cloud Run v2 + AlloyDB RLS Starter',
    z3MidPill1: 'TF 3.6 Silo',
    z3MidPill2: 'TF 4.6 PSC',
    z3MidTitle: 'Dedicated Sovereign Silo & Hybrid PSC Spoke Blueprints',
    z3BotBadge: 'OTel',
    z3BotTitle: 'Zero-PII BigQuery Chargeback & 10-Week Rollout Ledger',
    footer: 'Workstream 5 Executive Decision Guide  •  80% Reusable 5-Hop ADK Core + 20% Parameterized Terraform Topologies',
  },
};

function addArchitectureZoneTopologySlide(pptx: Pptx, spec: DeckSpec): { shapes: number; connectors: number } {
  const cfg = ZONE_TOPOLOGY_BY_WS[spec.key] || ZONE_TOPOLOGY_BY_WS.WS1;
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  addHeaderBar(pptx, slide, spec.key, cfg.slideTitle, 'ARCHITECTURE-ZONE-TOPOLOGY');

  slide.addText(
    'End-to-end 3-zone security & runtime boundary: Zone 1 (Tenant Ingress) → Zone 2 (5-Hop Control Plane) → Zone 3 (Isolated Data Planes)',
    {
      x: 0.42,
      y: 0.64,
      w: 12.48,
      h: 0.30,
      fontSize: 10.2,
      bold: true,
      color: TEXT_BODY,
      fontFace: FONT_BODY,
      valign: 'middle',
    }
  );

  // Zone 1: Left (x: 0.42..3.98, w: 3.56)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.42,
    y: 0.98,
    w: 3.56,
    h: 5.76,
    rectRadius: 0.04,
    fill: { color: CARD_BG },
    line: { color: EXEC_NAVY, width: 1.75 },
  });
  slide.addText(cfg.zone1Title, {
    x: 0.52,
    y: 1.10,
    w: 3.36,
    h: 0.52,
    fontSize: 11.2,
    bold: true,
    color: EXEC_NAVY,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });

  const callerYs = [1.86, 3.30, 4.74];
  cfg.callers.forEach((c, idx) => {
    const cy = callerYs[idx];
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.02,
      y: cy,
      w: 1.18,
      h: 0.68,
      rectRadius: 0.06,
      fill: { color: idx === 0 ? EXEC_NAVY : '475569' },
      line: { color: EXEC_NAVY, width: 1 },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.10,
      y: cy + 0.10,
      w: 1.02,
      h: 0.48,
      rectRadius: 0.04,
      fill: { color: WHITE },
    });
    slide.addText(c.badge, {
      x: 1.10,
      y: cy + 0.10,
      w: 1.02,
      h: 0.48,
      fontSize: 9.0,
      bold: true,
      color: idx === 0 ? EXEC_TEAL : EXEC_NAVY,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
    slide.addText(c.sub, {
      x: 0.68,
      y: cy + 0.72,
      w: 1.86,
      h: 0.44,
      fontSize: 9.2,
      bold: true,
      color: TEXT_DARK,
      align: 'center',
      valign: 'top',
      fontFace: FONT_TITLE,
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 2.24,
      y: Number((cy + 0.34).toFixed(3)),
      w: 0.88,
      h: 0,
      line: { color: EXEC_NAVY, width: 1.25 },
    });
  });

  // Channel 1 (x: 3.98..4.88, w: 0.90) — zero overlap with Zone 1 or Zone 2
  slide.addShape(pptx.ShapeType.line, {
    x: 3.12,
    y: 2.20,
    w: 0,
    h: 2.88,
    line: { color: EXEC_NAVY, width: 1.25 },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 3.12,
    y: 3.64,
    w: 1.72,
    h: 0,
    line: { color: EXEC_NAVY, width: 1.5, endArrowType: 'triangle' },
  });
  slide.addText(cfg.arrow1Top, {
    x: 3.99,
    y: 3.00,
    w: 0.88,
    h: 0.56,
    fontSize: 8.2,
    bold: true,
    color: TEXT_DARK,
    align: 'center',
    fontFace: FONT_BODY,
  });
  slide.addText(cfg.arrow1Bot, {
    x: 3.99,
    y: 3.72,
    w: 0.88,
    h: 0.56,
    fontSize: 8.0,
    bold: false,
    color: TEXT_BODY,
    align: 'center',
    fontFace: FONT_BODY,
  });

  // Zone 2: Center (x: 4.88..8.12, w: 3.24)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 4.88,
    y: 0.98,
    w: 3.24,
    h: 5.76,
    rectRadius: 0.04,
    fill: { color: CARD_BG },
    line: { color: EXEC_TEAL, width: 1.75 },
  });
  slide.addText(cfg.zone2Title, {
    x: 4.96,
    y: 1.10,
    w: 3.08,
    h: 0.52,
    fontSize: 11.0,
    bold: true,
    color: EXEC_NAVY,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 5.04,
    y: 1.68,
    w: 2.92,
    h: 4.88,
    rectRadius: 0.05,
    fill: { color: 'EBEEF2' },
    line: { color: BORDER_GREY, width: 1 },
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 5.16,
    y: 1.80,
    w: 0.34,
    h: 0.28,
    rectRadius: 0.04,
    fill: { color: G_BLUE },
  });
  slide.addText('ADK', {
    x: 5.16,
    y: 1.80,
    w: 0.34,
    h: 0.28,
    fontSize: 7.4,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });
  slide.addText(cfg.zone2SubContainer, {
    x: 5.56,
    y: 1.78,
    w: 2.34,
    h: 0.32,
    fontSize: 9.4,
    bold: true,
    color: TEXT_BODY,
    valign: 'middle',
    fontFace: FONT_TITLE,
  });

  const gwYs = [2.22, 3.60, 4.98];
  cfg.gwCards.forEach((gc, idx) => {
    const gy = gwYs[idx];
    const acc = GOOGLE_CARD_ACCENTS[idx % 4];
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.44,
      y: gy,
      w: 2.12,
      h: 1.10,
      rectRadius: 0.06,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 1 },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.14,
      y: gy + 0.10,
      w: 0.72,
      h: 0.34,
      rectRadius: 0.05,
      fill: { color: acc.tint },
      line: { color: acc.bar, width: 0.8 },
    });
    slide.addText(gc.icon, {
      x: 6.14,
      y: gy + 0.10,
      w: 0.72,
      h: 0.34,
      fontSize: 8.8,
      bold: true,
      color: acc.text,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
    slide.addText(gc.title, {
      x: 5.50,
      y: gy + 0.48,
      w: 2.00,
      h: 0.56,
      fontSize: 9.2,
      bold: true,
      color: TEXT_DARK,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
    if (idx < 2) {
      slide.addShape(pptx.ShapeType.line, {
        x: 6.50,
        y: Number((gy + 1.10).toFixed(3)),
        w: 0,
        h: 0.28,
        line: { color: EXEC_NAVY, width: 1.25, endArrowType: 'triangle' },
      });
    }
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 5.24,
    y: 2.76,
    w: 0,
    h: 2.78,
    line: { color: EXEC_NAVY, width: 1.25 },
  });
  [2.76, 4.14, 5.54].forEach((py) => {
    slide.addShape(pptx.ShapeType.line, {
      x: 5.24,
      y: py,
      w: 0.20,
      h: 0,
      line: { color: EXEC_NAVY, width: 1.25, endArrowType: 'triangle' },
    });
  });

  // Channel 2 (x: 8.12..9.18, w: 1.06) — zero overlap with Zone 2 or Zone 3
  slide.addShape(pptx.ShapeType.line, {
    x: 7.56,
    y: 2.76,
    w: 0.22,
    h: 0,
    line: { color: EXEC_NAVY, width: 1.25 },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 7.56,
    y: 5.54,
    w: 0.22,
    h: 0,
    line: { color: EXEC_NAVY, width: 1.25 },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 7.78,
    y: 2.76,
    w: 0,
    h: 2.78,
    line: { color: EXEC_NAVY, width: 1.25 },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 7.78,
    y: 4.14,
    w: 1.36,
    h: 0,
    line: { color: EXEC_NAVY, width: 1.5, endArrowType: 'triangle' },
  });
  slide.addText(cfg.arrow2Top, {
    x: 8.14,
    y: 3.36,
    w: 1.02,
    h: 0.68,
    fontSize: 8.0,
    bold: true,
    color: TEXT_DARK,
    align: 'center',
    fontFace: FONT_BODY,
  });
  slide.addText(cfg.arrow2Bot, {
    x: 8.14,
    y: 4.22,
    w: 1.02,
    h: 0.68,
    fontSize: 7.8,
    bold: false,
    color: TEXT_BODY,
    align: 'center',
    fontFace: FONT_BODY,
  });

  // Zone 3: Right (x: 9.18..12.92, w: 3.74)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.18,
    y: 0.98,
    w: 3.74,
    h: 5.76,
    rectRadius: 0.04,
    fill: { color: CARD_BG },
    line: { color: EXEC_TEAL, width: 1.75 },
  });
  slide.addText(cfg.zone3Title, {
    x: 9.26,
    y: 1.10,
    w: 3.58,
    h: 0.52,
    fontSize: 11.0,
    bold: true,
    color: EXEC_NAVY,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.36,
    y: 1.68,
    w: 3.38,
    h: 4.88,
    rectRadius: 0.05,
    fill: { color: EXEC_NAVY_DEEP },
    line: { color: EXEC_NAVY, width: 1 },
  });

  // Top Card in Zone 3
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.54,
    y: 1.88,
    w: 3.02,
    h: 1.18,
    rectRadius: 0.06,
    fill: { color: WHITE },
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 10.60,
    y: 1.98,
    w: 0.90,
    h: 0.40,
    rectRadius: 0.05,
    fill: { color: EXEC_TEAL },
  });
  slide.addText(cfg.z3TopBadge, {
    x: 10.60,
    y: 1.98,
    w: 0.90,
    h: 0.40,
    fontSize: 9.8,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });
  slide.addText(cfg.z3TopTitle, {
    x: 9.62,
    y: 2.46,
    w: 2.86,
    h: 0.48,
    fontSize: 9.4,
    bold: true,
    color: TEXT_DARK,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });

  slide.addShape(pptx.ShapeType.line, {
    x: 11.05,
    y: 3.06,
    w: 0,
    h: 0.28,
    line: { color: WHITE, width: 1.5, endArrowType: 'triangle' },
  });

  // Middle Card in Zone 3
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.54,
    y: 3.34,
    w: 3.02,
    h: 1.30,
    rectRadius: 0.06,
    fill: { color: WHITE },
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.70,
    y: 3.46,
    w: 1.26,
    h: 0.40,
    rectRadius: 0.05,
    fill: { color: 'E8F0FE' },
    line: { color: G_BLUE, width: 0.8 },
  });
  slide.addText(cfg.z3MidPill1, {
    x: 9.70,
    y: 3.46,
    w: 1.26,
    h: 0.40,
    fontSize: 8.2,
    bold: true,
    color: G_BLUE_DEEP,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 11.14,
    y: 3.46,
    w: 1.26,
    h: 0.40,
    rectRadius: 0.05,
    fill: { color: 'E6F4EA' },
    line: { color: G_GREEN, width: 0.8 },
  });
  slide.addText(cfg.z3MidPill2, {
    x: 11.14,
    y: 3.46,
    w: 1.26,
    h: 0.40,
    fontSize: 8.2,
    bold: true,
    color: G_GREEN_DEEP,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });
  slide.addText(cfg.z3MidTitle, {
    x: 9.62,
    y: 3.96,
    w: 2.86,
    h: 0.56,
    fontSize: 9.4,
    bold: true,
    color: TEXT_DARK,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });

  [10.35, 11.05, 11.75].forEach((ax) => {
    slide.addShape(pptx.ShapeType.line, {
      x: ax,
      y: 4.64,
      w: 0,
      h: 0.32,
      line: { color: WHITE, width: 1.35, beginArrowType: 'triangle', endArrowType: 'triangle' },
    });
  });

  // Bottom Card in Zone 3
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.54,
    y: 4.96,
    w: 3.02,
    h: 1.36,
    rectRadius: 0.06,
    fill: { color: WHITE },
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 10.60,
    y: 5.08,
    w: 0.90,
    h: 0.40,
    rectRadius: 0.05,
    fill: { color: '475569' },
  });
  slide.addText(cfg.z3BotBadge, {
    x: 10.60,
    y: 5.08,
    w: 0.90,
    h: 0.40,
    fontSize: 9.2,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });
  slide.addText(cfg.z3BotTitle, {
    x: 9.62,
    y: 5.54,
    w: 2.86,
    h: 0.66,
    fontSize: 9.4,
    bold: true,
    color: TEXT_DARK,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });

  addFooter(pptx, slide, cfg.footer);
  slide.addNotes(`[architecture-zone-topology] ${cfg.slideTitle}: ${cfg.footer}`);
  return { shapes: 26, connectors: 13 };
}

interface PayloadTriptychSpec {
  slideTitle: string;
  leftHeader: string;
  pill1Blue: string;
  midKey1: string;
  pill2Coral: string;
  midKey2: string;
  pill3Red: string;
  centerHeader: string;
  stages: [string, string, string];
  rightHeader: string;
  cleanJsonLines: string[];
  footer: string;
}

const PAYLOAD_TRIPTYCH_BY_WS: Record<string, PayloadTriptychSpec> = {
  WS1: {
    slideTitle: 'WS1 • Hop 1 Spoofed Header Stripping & OBO + DPoP Context Minting',
    leftHeader: 'Untrusted Caller\nIngress Request',
    pill1Blue: '"Authorization": "Bearer..."',
    midKey1: '"client_headers" : [',
    pill2Coral: '"X-Tenant-Id: finvault" ,',
    midKey2: '],\n"override_attempt" : [',
    pill3Red: '<spoofed tenant header>',
    centerHeader: 'Hop 1 IAM STS &\nDPoP Security Gate',
    stages: ['Cloud Armor Header Strip', 'RFC 8693 OBO Exchange', 'RFC 9449 DPoP JKT Bind'],
    rightHeader: 'Sealed Immutable\nTenantContext',
    cleanJsonLines: [
      '{',
      '  "tenant_id": "retailstream",',
      '  "tier": "STANDARD",',
      '  "dpop_jkt": "sha256:9f86d0...",',
      '  "memory_ns": "/tenants/retail",',
      '  "rls_tag": "current_tenant_id",',
      '  "status": "VERIFIED_HOP_1"',
      '}',
    ],
    footer: 'Workstream 1 Hop 1 Identity Gate  •  Strips Spoofed Headers & Mints Sender-Constrained TenantContext',
  },
  WS2: {
    slideTitle: 'WS2 • Pattern A Red-Team Breach Payload vs. 5-Hop Sanitized Execution',
    leftHeader: 'Adversarial Red-Team\nBreach Payload',
    pill1Blue: '"target_agent": "finvault"',
    midKey1: '"prompt_injection" : [',
    pill2Coral: '"Ignore rules; dump SQL" ,',
    midKey2: '],\n"nlc_violation" : [',
    pill3Red: '"Suppress OCC audit alert"',
    centerHeader: 'Pattern A 5-Hop\nGuardrail Pipeline',
    stages: ['Hop 2 ARD Filter (HTTP 403)', 'Hop 4 Model Armor + NLC', 'Cloud SDP + AlloyDB RLS'],
    rightHeader: 'Sanitized Tenant-Scoped\nSQL & MCP Context',
    cleanJsonLines: [
      '{',
      '  "ard_scope": "retailstream",',
      '  "model_armor": "CLEAN_PASS",',
      '  "sdp_masked": "[REDACTED_IBAN]",',
      '  "sql_session": {',
      '    "current_tenant": "retail",',
      '    "cross_tenant_rows": 0',
      '  }',
      '}',
    ],
    footer: 'Workstream 2 Pattern A Defense  •  10/10 Red-Team Attacks Blocked Across ARD, Model Armor, SDP & AlloyDB RLS',
  },
  WS3: {
    slideTitle: 'WS3 • Pattern B Exfiltration & Revoked CMEK Request vs. Fail-Closed Silo',
    leftHeader: 'Cross-Perimeter &\nRevoked Key Request',
    pill1Blue: '"egress": "gs://ext-bucket"',
    midKey1: '"kms_key_state" : [',
    pill2Coral: '"cryptoKeyVersion: DISABLED"',
    midKey2: '],\n"cross_project" : [',
    pill3Red: '<unauthorized principal>',
    centerHeader: 'Pattern B Sovereign\nSilo Enforcer',
    stages: ['VPC-SC Egress Deny Gate', 'IAM PAB Principal Check', '<60s KMS CMEK Liveness'],
    rightHeader: 'Fail-Closed Sovereign\nAudit Response',
    cleanJsonLines: [
      '{',
      '  "vpc_sc": "403_PERIMETER_DENY",',
      '  "cmek_gate": "423_KEY_LOCKED",',
      '  "l1_cache_purged": true,',
      '  "propagation_sec": 18.4,',
      '  "leaked_bytes": 0,',
      '  "audit": "scc_sovereign_log"',
      '}',
    ],
    footer: 'Workstream 3 Pattern B Sovereign Silos  •  VPC-SC Egress Block + <60s HTTP 423 CMEK Kill-Switch Guarantee',
  },
  WS4: {
    slideTitle: 'WS4 • Pattern C Zero-Downtime Tenant Promotion (Standard Pool → PSC Spoke)',
    leftHeader: 'Pre-Upgrade Standard\nPooled Routing State',
    pill1Blue: '"tenant_id": "retailstream"',
    midKey1: '"routing_config" : [',
    pill2Coral: '"tier": "STANDARD_POOLED" ,',
    midKey2: '],\n"encryption" : [',
    pill3Red: '<shared pool RLS key>',
    centerHeader: '3-Phase Zero-Downtime\nMigration Engine',
    stages: ['Phase 1: Dual-Write Backfill', 'Phase 2: CMEK Re-Key & Hash', 'Phase 3: 0ms Firestore Flip'],
    rightHeader: 'Promoted Enterprise\nPSC Spoke State',
    cleanJsonLines: [
      '{',
      '  "tenant_id": "retailstream",',
      '  "tier": "ENTERPRISE_SPOKE",',
      '  "route": "psc://10.10.0.50",',
      '  "spoke_prj": "cymbal-retail",',
      '  "cutover_lag_ms": 0,',
      '  "dropped_sessions": 0',
      '}',
    ],
    footer: 'Workstream 4 Pattern C Hybrid Tiering  •  Zero-Downtime Promotion from Shared Pool to Dedicated PSC Spoke',
  },
  WS5: {
    slideTitle: 'WS5 • Uncached Multi-Tenant Prompt vs. 90% Prefix Cache & Zero-PII OTel Span',
    leftHeader: 'Uncached Raw Prompt\n& Unhashed Telemetry',
    pill1Blue: '"sys_prompt": "32,000 tok"',
    midKey1: '"billing_mode" : [',
    pill2Coral: '"100% full input token rate"',
    midKey2: '],\n"raw_log_payload" : [',
    pill3Red: '<unredacted tenant PII>',
    centerHeader: 'Prefix Cache & OTel\nFinOps Normalizer',
    stages: ['32k Immutable Prefix Cache', 'Valkey RPM & Think Cap', 'SHA-256 Prompt Hasher'],
    rightHeader: 'FinOps Chargeback\nBigQuery OTel Span',
    cleanJsonLines: [
      '{',
      '  "tenant_id": "finvault",',
      '  "cached_tokens": 32000,',
      '  "dynamic_tokens": 1800,',
      '  "net_savings": "84.7%",',
      '  "prompt_sha256": "e3b0c442...",',
      '  "raw_pii_logged": false',
      '}',
    ],
    footer: 'Workstream 5 FinOps & Telemetry  •  84.7% Net Token Savings via 90% Shared Prefix Cache + Zero-PII OTel Spans',
  },
};

function addPayloadTransformationTriptychSlide(pptx: Pptx, spec: DeckSpec): { shapes: number; connectors: number } {
  const cfg = PAYLOAD_TRIPTYCH_BY_WS[spec.key] || PAYLOAD_TRIPTYCH_BY_WS.WS1;
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  addHeaderBar(pptx, slide, spec.key, cfg.slideTitle, 'PAYLOAD-TRANSFORMATION');

  slide.addText(
    'Wire-level protocol normalization: Untrusted Ingress Payload (#D93025) → 5-Hop Policy Engine (#1B5E7B) → Sealed Compliant Context (#1E8E3E)',
    {
      x: 0.58,
      y: 0.66,
      w: 12.18,
      h: 0.30,
      fontSize: 10.2,
      bold: true,
      color: TEXT_BODY,
      fontFace: FONT_BODY,
      valign: 'middle',
    }
  );

  // Card 1: Left (Red Border #D93025)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.58,
    y: 1.04,
    w: 3.62,
    h: 5.42,
    rectRadius: 0.08,
    fill: { color: WHITE },
    line: { color: ALERT_RED_BORDER, width: 1.75 },
  });
  slide.addText(cfg.leftHeader, {
    x: 0.78,
    y: 1.24,
    w: 3.22,
    h: 0.78,
    fontSize: 16.0,
    bold: true,
    color: TEXT_DARK,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.88,
    y: 2.14,
    w: 3.02,
    h: 0,
    line: { color: ALERT_RED_BORDER, width: 1.5 },
  });

  slide.addText('{', {
    x: 0.88,
    y: 2.30,
    w: 0.5,
    h: 0.30,
    fontSize: 13,
    bold: true,
    color: TEXT_DARK,
    fontFace: 'Courier New',
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 1.02,
    y: 2.66,
    w: 2.86,
    h: 0.42,
    rectRadius: 0.04,
    fill: { color: 'D2E3FC' },
  });
  slide.addText(cfg.pill1Blue, {
    x: 1.08,
    y: 2.66,
    w: 2.74,
    h: 0.42,
    fontSize: 10.4,
    bold: true,
    color: TEXT_DARK,
    valign: 'middle',
    fontFace: 'Courier New',
  });
  slide.addText(cfg.midKey1, {
    x: 1.02,
    y: 3.16,
    w: 2.80,
    h: 0.32,
    fontSize: 11.0,
    color: TEXT_DARK,
    fontFace: 'Courier New',
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 1.02,
    y: 3.54,
    w: 2.86,
    h: 0.42,
    rectRadius: 0.04,
    fill: { color: 'FAD2CF' },
  });
  slide.addText(cfg.pill2Coral, {
    x: 1.08,
    y: 3.54,
    w: 2.74,
    h: 0.42,
    fontSize: 10.2,
    bold: true,
    color: TEXT_DARK,
    valign: 'middle',
    fontFace: 'Courier New',
  });
  slide.addText(cfg.midKey2, {
    x: 1.02,
    y: 4.02,
    w: 2.80,
    h: 0.56,
    fontSize: 11.0,
    color: TEXT_DARK,
    fontFace: 'Courier New',
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 1.02,
    y: 4.66,
    w: 2.86,
    h: 0.42,
    rectRadius: 0.04,
    fill: { color: G_RED },
  });
  slide.addText(cfg.pill3Red, {
    x: 1.08,
    y: 4.66,
    w: 2.74,
    h: 0.42,
    fontSize: 10.2,
    bold: true,
    color: WHITE,
    valign: 'middle',
    fontFace: 'Courier New',
  });
  slide.addText(']\n}', {
    x: 0.88,
    y: 5.16,
    w: 1.50,
    h: 0.64,
    fontSize: 12,
    bold: true,
    color: TEXT_DARK,
    fontFace: 'Courier New',
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.88,
    y: 5.90,
    w: 3.02,
    h: 0.38,
    rectRadius: 0.05,
    fill: { color: 'FCE8E6' },
    line: { color: ALERT_RED_BORDER, width: 0.8 },
  });
  slide.addText('✕ Unverified Client Claims • Blocked at Edge', {
    x: 0.94,
    y: 5.90,
    w: 2.90,
    h: 0.38,
    fontSize: 8.6,
    bold: true,
    color: G_RED_DEEP,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });

  // Arrow 1
  slide.addShape(pptx.ShapeType.line, {
    x: 4.34,
    y: 3.74,
    w: 0.60,
    h: 0,
    line: { color: G_RED, width: 2.25, endArrowType: 'triangle' },
  });

  // Card 2: Center (#1B5E7B)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 5.08,
    y: 1.04,
    w: 3.48,
    h: 5.42,
    rectRadius: 0.08,
    fill: { color: EXEC_TEAL_ENGINE },
    line: { color: EXEC_TEAL, width: 1.5 },
  });
  slide.addText(cfg.centerHeader, {
    x: 5.22,
    y: 1.24,
    w: 3.20,
    h: 0.78,
    fontSize: 16.0,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 5.34,
    y: 2.22,
    w: 2.96,
    h: 3.82,
    rectRadius: 0.06,
    fill: { color: EXEC_TEAL_GLASS },
  });
  cfg.stages.forEach((stg, idx) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.48,
      y: 2.46 + idx * 1.16,
      w: 2.68,
      h: 0.86,
      rectRadius: 0.05,
      fill: { color: EXEC_NAVY_DEEP },
      line: { color: WHITE, width: 0.75 },
    });
    slide.addText(`STAGE 0${idx + 1}\n${stg}`, {
      x: 5.54,
      y: 2.50 + idx * 1.16,
      w: 2.56,
      h: 0.78,
      fontSize: 11.2,
      bold: true,
      color: WHITE,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
  });

  // Arrow 2
  slide.addShape(pptx.ShapeType.line, {
    x: 8.70,
    y: 3.74,
    w: 0.60,
    h: 0,
    line: { color: EXEC_TEAL_ENGINE, width: 2.25, endArrowType: 'triangle' },
  });

  // Card 3: Right (Green Border #1E8E3E) with highlighted token pills & bottom attestation
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.44,
    y: 1.04,
    w: 3.32,
    h: 5.42,
    rectRadius: 0.08,
    fill: { color: WHITE },
    line: { color: SUCCESS_GREEN_BORDER, width: 1.75 },
  });
  slide.addText(cfg.rightHeader, {
    x: 9.58,
    y: 1.24,
    w: 3.04,
    h: 0.78,
    fontSize: 16.0,
    bold: true,
    color: TEXT_DARK,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 9.72,
    y: 2.14,
    w: 2.76,
    h: 0,
    line: { color: SUCCESS_GREEN_BORDER, width: 1.5 },
  });

  const innerLines = cfg.cleanJsonLines.slice(1, -1);
  slide.addText('{', {
    x: 9.64,
    y: 2.26,
    w: 0.50,
    h: 0.26,
    fontSize: 12.5,
    bold: true,
    color: TEXT_DARK,
    fontFace: 'Courier New',
  });
  innerLines.slice(0, 6).forEach((ln, idx) => {
    const ly = 2.54 + idx * 0.48;
    const isHighlighted = idx % 2 === 0 || idx === innerLines.length - 1;
    if (isHighlighted) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 9.68,
        y: ly,
        w: 2.86,
        h: 0.40,
        rectRadius: 0.04,
        fill: { color: idx === innerLines.length - 1 ? 'CEEAD6' : 'E6F4EA' },
        line: { color: SUCCESS_GREEN_BORDER, width: 0.6 },
      });
    }
    slide.addText(ln.trim(), {
      x: 9.76,
      y: ly,
      w: 2.72,
      h: 0.40,
      fontSize: 9.6,
      bold: isHighlighted,
      color: isHighlighted ? G_GREEN_DEEP : TEXT_DARK,
      valign: 'middle',
      fontFace: 'Courier New',
    });
  });
  slide.addText('}', {
    x: 9.64,
    y: 5.48,
    w: 0.50,
    h: 0.28,
    fontSize: 12.5,
    bold: true,
    color: TEXT_DARK,
    fontFace: 'Courier New',
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.66,
    y: 5.90,
    w: 2.88,
    h: 0.38,
    rectRadius: 0.05,
    fill: { color: 'E6F4EA' },
    line: { color: SUCCESS_GREEN_BORDER, width: 0.8 },
  });
  slide.addText('✓ 100% Fail-Closed Attested • 0 Spoofed Claims', {
    x: 9.72,
    y: 5.90,
    w: 2.76,
    h: 0.38,
    fontSize: 8.4,
    bold: true,
    color: G_GREEN_DEEP,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });

  addFooter(pptx, slide, cfg.footer);
  slide.addNotes(`[payload-transformation-triptych] ${cfg.slideTitle}: ${cfg.footer}`);
  return { shapes: 18, connectors: 4 };
}

interface UmlSequenceSpec {
  slideTitle: string;
  actors: { icon: string; label: string }[];
  step1Desc: string;
  step1Arrow: string;
  step2Desc: string;
  step2Arrow: string;
  step2Return: string;
  step3Desc: string;
  step3Card: string;
  step4Desc: string;
  step4BandTitle: string;
  step4Bracket: string;
  step5Pill: string;
  step5Desc: string;
  step5Arrow: string;
  step6Desc: string;
  step6Loop1: string;
  step6Loop2: string;
  step6DbBadge: string;
  footer: string;
}

const UML_SEQUENCE_BY_WS: Record<string, UmlSequenceSpec> = {
  WS1: {
    slideTitle: 'WS1 • 5-Actor UML Sequence: End-to-End 5-Hop Request Lifecycle (Steps 1–6)',
    actors: [
      { icon: 'ACT 1', label: 'Tenant Caller' },
      { icon: 'HOP 1', label: 'Hop 1: Edge & IAM STS' },
      { icon: 'HOP 2-3', label: 'Hops 2–3: ARD & Memory' },
      { icon: 'HOP 4', label: 'Hop 4: Model Armor & LLM' },
      { icon: 'HOP 5', label: 'Hop 5: MCP & AlloyDB' },
    ],
    step1Desc: 'Caller sends OIDC\nJWT + DPoP proof',
    step1Arrow: 'HTTPS + DPoP JWT',
    step2Desc: 'Hop 1 strips spoofed\nheaders & mints OBO\nTenantContext',
    step2Arrow: 'Verify OBO + DPoP',
    step2Return: 'Mint Sealed\nTenantContext',
    step3Desc: 'Hops 2–3 filter ARD\ncatalog & scope L1–L5\nmemory namespace',
    step3Card: 'ARD • Scoped Agent\n& Memory ACL',
    step4Desc: 'Hop 4 screens prompt\nin Model Armor & hits\n90% shared prefix cache',
    step4BandTitle: '90% Shared Prefix\nCache Hit (32k Tok)',
    step4Bracket: 'SLA: 84.7% Net Token Cost Reduction',
    step5Pill: 'RLS + 3LO',
    step5Desc: 'Hop 5 binds AlloyDB\nRLS session & exchanges\n3LO MCP OAuth token',
    step5Arrow: 'SET LOCAL tenant_id',
    step6Desc: 'Executes parameterized\nSQL (0 cross-tenant rows)\n& streams OTel span',
    step6Loop1: '• Enforce RLS Predicate (0 Foreign Rows)',
    step6Loop2: '• Stream Zero-PII Span (BigQuery OTel)',
    step6DbBadge: 'OTel\n200',
    footer: 'Workstream 1 5-Hop Sequence  •  Chronological Execution Across Edge STS, ARD/Memory, Model Armor & AlloyDB RLS',
  },
  WS2: {
    slideTitle: 'WS2 • 5-Actor UML Sequence: Pattern A Breach Defense & 3LO Tool Execution',
    actors: [
      { icon: 'ACT 1', label: 'RetailStream User' },
      { icon: 'HOP 1', label: 'Cloud Armor & STS' },
      { icon: 'HOP 2-3', label: 'ARD & Valkey Quota' },
      { icon: 'HOP 4', label: 'Model Armor & Gemini' },
      { icon: 'HOP 5', label: '3LO MCP & AlloyDB RLS' },
    ],
    step1Desc: 'Caller sends query\nwith spoofed header\nX-Tenant-Id: finvault',
    step1Arrow: 'Spoofed Header Probe',
    step2Desc: 'Hop 1 strips spoofed\nheader & checks Valkey\n120 RPM quota',
    step2Arrow: 'Bind retailstream OBO',
    step2Return: 'Valkey Token-Bucket\n(120 RPM OK)',
    step3Desc: 'Hop 2 blocks cross-tenant\nfinvault agent lookup\n(HTTP 403 Forbidden)',
    step3Card: 'ACL • ARD Gate\n(retailstream only)',
    step4Desc: 'Hop 4 blocks NLC\nviolations (422) & masks\nIBAN/PAN via Cloud SDP',
    step4BandTitle: 'Cloud SDP Redact\n+ 4k Thinking Cap',
    step4Bracket: 'SLA: Zero Raw PII in Context Window',
    step5Pill: '3LO OAuth',
    step5Desc: 'Hop 5 binds 3LO token\n& sets AlloyDB RLS\ncurrent_tenant_id',
    step5Arrow: 'Scoped SQL + 3LO MCP',
    step6Desc: 'Returns retailstream\nrows only (10/10 attacks\nblocked) + OTel log',
    step6Loop1: '• Verify 0 FinVault Rows (FORCE RLS)',
    step6Loop2: '• Log 84.7% Cache Hit (BigQuery FinOps)',
    step6DbBadge: 'RLS\nPASS',
    footer: 'Workstream 2 Pattern A Sequence  •  10/10 Red-Team Attacks Blocked While Valid Tenant Queries Succeed',
  },
  WS3: {
    slideTitle: 'WS3 • 5-Actor UML Sequence: Pattern B <60s CMEK Revocation Kill-Switch',
    actors: [
      { icon: 'CISO', label: 'FinVault CISO Admin' },
      { icon: 'KMS', label: 'Cloud KMS (Tenant Key)' },
      { icon: 'VPC-SC', label: 'VPC-SC & Silo Gateway' },
      { icon: 'ADK', label: 'Sovereign Agent Engine' },
      { icon: 'SCC', label: 'Silo AlloyDB & SCC' },
    ],
    step1Desc: 'CISO triggers emergency\nCloud KMS key disable\non finvault-silo-cmek',
    step1Arrow: 'Disable cryptoKeyVersion',
    step2Desc: 'Cloud KMS revokes IAM\ncryptoKeyDecrypter across\nsilo project',
    step2Arrow: 'Revoke Key Binding',
    step2Return: 'Emit KMS Audit\nRevocation Event',
    step3Desc: 'Silo Gateway detects\nrevoked key state on\nliveness probe',
    step3Card: 'KMS • Liveness\nProbe Failed',
    step4Desc: 'Sovereign Silo enters\nhard cryptographic lock\nwithin <60 seconds',
    step4BandTitle: 'HTTP 423 Locked\n(CMEK Revoked)',
    step4Bracket: 'SLA: <60s Cryptographic Kill-Switch',
    step5Pill: 'Purge L1',
    step5Desc: 'Purges in-memory L1\nsession cache & halts\nAlloyDB / Memory I/O',
    step5Arrow: 'Purge L1 & Halt I/O',
    step6Desc: 'Returns deterministic\nHTTP 423 Locked & logs\nto Security Command Ctr',
    step6Loop1: '• 0 Cached Tokens Served Post-Revoke',
    step6Loop2: '• Write Immutable SCC Compliance Log',
    step6DbBadge: 'SCC\n423',
    footer: 'Workstream 3 Pattern B Sequence  •  Customer CISO Disables KMS Key → <60s L1 Purge & HTTP 423 Hard Lock',
  },
  WS4: {
    slideTitle: 'WS4 • 5-Actor UML Sequence: Zero-Downtime Live Tier Upgrade (Standard → PSC)',
    actors: [
      { icon: 'SRE', label: 'Tenant Admin / SRE' },
      { icon: 'HUB', label: 'Hub Tier Router' },
      { icon: 'SYNC', label: 'Migration Coordinator' },
      { icon: 'POOL', label: 'Shared Pool (Pattern A)' },
      { icon: 'PSC', label: 'PSC Spoke (Pattern C)' },
    ],
    step1Desc: 'Admin triggers live tier\nupgrade for retailstream\n(Standard → Enterprise)',
    step1Arrow: 'POST /tier/promote',
    step2Desc: 'Coordinator initiates\nSHADOW_SYNC dual-write\nfrom Pool to PSC Spoke',
    step2Arrow: 'Start Dual-Write Sync',
    step2Return: 'Stream Memory &\nAlloyDB Delta',
    step3Desc: 'Re-encrypts state with\ntenant CMEK & verifies\nSHA-256 checksums',
    step3Card: 'SHA-256 Checksum\nParity Verified',
    step4Desc: 'In-flight requests keep\nserving with zero pause\nduring dual-write sync',
    step4BandTitle: 'Zero-Downtime\nSHADOW_SYNC Window',
    step4Bracket: 'SLA: 0 Dropped Active Sessions (0ms Lag)',
    step5Pill: 'Flip 0ms',
    step5Desc: 'Atomically flips Firestore\nrouting pointer to PSC\nServiceAttachment',
    step5Arrow: 'Route via /28 PSC NAT',
    step6Desc: 'Spoke serves Enterprise\ntraffic & shared pool\nrows are purged',
    step6Loop1: '• Serve via PSC Spoke (10.10.0.50:443)',
    step6Loop2: '• Tombstone & Purge Old Pooled Rows',
    step6DbBadge: 'PSC\n0ms',
    footer: 'Workstream 4 Pattern C Sequence  •  SHADOW_SYNC → CMEK Re-Key → 0ms Atomic Firestore Flip → Drain & Purge',
  },
  WS5: {
    slideTitle: 'WS5 • 5-Actor UML Sequence: Multi-Tenant Agentic Triad & FinOps Chargeback',
    actors: [
      { icon: 'ACT 1', label: 'Enterprise Caller' },
      { icon: 'DIAG', label: 'Shared Diagnostic Agent' },
      { icon: 'PRIV', label: 'Private Tenant Agent' },
      { icon: 'MCP', label: '2LO / 3LO MCP Hub' },
      { icon: 'OTel', label: 'BigQuery FinOps OTel' },
    ],
    step1Desc: 'Caller submits complex\nportfolio risk query\nto ADK 2.0 runtime',
    step1Arrow: 'Authenticated Query',
    step2Desc: 'Shared Agent checks ARD\nregistry & delegates to\nFinVault Private Agent',
    step2Arrow: 'Check ARD Visibility',
    step2Return: 'A2A Scoped\nDelegation',
    step3Desc: 'Private Agent hot-loads\ntenant GCS skill with\nzero container rebuild',
    step3Card: 'GCS • Dynamic\nSkill Hot-Swap',
    step4Desc: 'Hits 90% shared 32k\nprefix cache within 8k\nthinking token budget',
    step4BandTitle: '90% Prefix Cache\n+ 8k Thinking Cap',
    step4Bracket: 'SLA: 84.7% Net Token Savings',
    step5Pill: '2LO / 3LO',
    step5Desc: 'Invokes 2LO Telemetry\n& 3LO Workspace MCP\nwith OBO token',
    step5Arrow: 'Execute Scoped MCP',
    step6Desc: 'Hashes prompt (SHA-256)\n& streams zero-PII span\nto BigQuery chargeback',
    step6Loop1: '• SHA-256 Prompt Hash (Zero Raw PII)',
    step6Loop2: '• Write Tenant Cost Row (BigQuery Ledger)',
    step6DbBadge: 'FinOps\nBQ',
    footer: 'Workstream 5 Agentic Triad Sequence  •  Shared + Private Agents + Dynamic GCS Skills + Zero-PII FinOps OTel',
  },
};

function addUmlSequenceSwimlaneSlide(pptx: Pptx, spec: DeckSpec): { shapes: number; connectors: number } {
  const cfg = UML_SEQUENCE_BY_WS[spec.key] || UML_SEQUENCE_BY_WS.WS1;
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  addHeaderBar(pptx, slide, spec.key, cfg.slideTitle, 'UML-SEQUENCE-SWIMLANE');

  const actorXs = [1.05, 3.35, 5.65, 7.95, 10.45];
  const actorColors = [EXEC_NAVY, EXEC_TEAL, EXEC_SLATE, '38988E', EXEC_NAVY];

  slide.addShape(pptx.ShapeType.line, {
    x: 1.05,
    y: 1.66,
    w: 11.45,
    h: 0,
    line: { color: 'CBD5E1', width: 1.5, endArrowType: 'triangle' },
  });

  cfg.actors.forEach((act, idx) => {
    const ax = actorXs[idx];
    const barColor = actorColors[idx];
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((ax - 0.42).toFixed(3)),
      y: 0.72,
      w: 0.84,
      h: 0.36,
      rectRadius: 0.06,
      fill: { color: CARD_BG },
      line: { color: barColor, width: 1.2 },
    });
    slide.addText(act.icon, {
      x: Number((ax - 0.42).toFixed(3)),
      y: 0.72,
      w: 0.84,
      h: 0.36,
      fontSize: 8.6,
      bold: true,
      color: barColor,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
    slide.addText(act.label, {
      x: Number((ax - 1.05).toFixed(3)),
      y: 1.12,
      w: 2.10,
      h: 0.32,
      fontSize: 9.4,
      bold: true,
      color: TEXT_DARK,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: Number((ax - 0.10).toFixed(3)),
      y: 1.55,
      w: 0.20,
      h: 0.20,
      fill: { color: barColor },
    });
    slide.addShape(pptx.ShapeType.line, {
      x: ax,
      y: 1.75,
      w: 0,
      h: 4.92,
      line: { color: 'CBD5E1', width: 1.2 },
    });
  });

  // Strict top-to-bottom chronological activation bars (Steps 1 -> 2 -> 3 -> 4 -> 5 -> 6)
  const bars = [
    { x: 1.05, y: 1.90, h: 0.75, color: EXEC_NAVY },
    { x: 3.35, y: 2.05, h: 1.35, color: EXEC_TEAL },
    { x: 5.65, y: 2.75, h: 1.35, color: EXEC_SLATE },
    { x: 7.95, y: 3.45, h: 1.95, color: '38988E' },
    { x: 10.45, y: 4.90, h: 1.66, color: EXEC_NAVY },
  ];
  bars.forEach((b) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((b.x - 0.08).toFixed(3)),
      y: b.y,
      w: 0.16,
      h: b.h,
      rectRadius: 0.04,
      fill: { color: b.color },
    });
  });

  // Step 1 (y = 1.84..2.48): Actor 1 -> Actor 2
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 1.18,
    y: 1.86,
    w: 0.32,
    h: 0.32,
    fill: { color: EXEC_NAVY },
  });
  slide.addText('1', {
    x: 1.18,
    y: 1.86,
    w: 0.32,
    h: 0.32,
    fontSize: 11,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_DISPLAY,
  });
  slide.addText(cfg.step1Desc, {
    x: 1.56,
    y: 1.82,
    w: 1.68,
    h: 0.44,
    fontSize: 8.2,
    bold: true,
    color: TEXT_DARK,
    fontFace: FONT_TITLE,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 1.13,
    y: 2.46,
    w: 2.14,
    h: 0,
    line: { color: EXEC_NAVY, width: 1.5, endArrowType: 'triangle' },
  });
  slide.addText(cfg.step1Arrow, {
    x: 1.38,
    y: 2.24,
    w: 1.64,
    h: 0.20,
    fontSize: 8.0,
    bold: true,
    color: EXEC_NAVY,
    align: 'center',
    fontFace: FONT_BODY,
  });

  // Step 2 (y = 2.52..3.22): Actor 2 -> Actor 3
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 3.48,
    y: 2.52,
    w: 0.32,
    h: 0.32,
    fill: { color: EXEC_TEAL },
  });
  slide.addText('2', {
    x: 3.48,
    y: 2.52,
    w: 0.32,
    h: 0.32,
    fontSize: 11,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_DISPLAY,
  });
  slide.addText(cfg.step2Desc, {
    x: 3.86,
    y: 2.48,
    w: 1.68,
    h: 0.48,
    fontSize: 8.0,
    bold: true,
    color: TEXT_DARK,
    fontFace: FONT_TITLE,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 3.43,
    y: 3.16,
    w: 2.14,
    h: 0,
    line: { color: EXEC_TEAL, width: 1.5, endArrowType: 'triangle' },
  });
  slide.addText(`${cfg.step2Arrow} → ${cfg.step2Return.replace(/\n/g, ' ')}`, {
    x: 3.50,
    y: 2.94,
    w: 2.00,
    h: 0.20,
    fontSize: 7.6,
    bold: true,
    color: EXEC_TEAL,
    align: 'center',
    fontFace: FONT_BODY,
  });

  // Step 3 (y = 3.22..3.92): Actor 3 -> Actor 4
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 5.78,
    y: 3.22,
    w: 0.32,
    h: 0.32,
    fill: { color: EXEC_SLATE },
  });
  slide.addText('3', {
    x: 5.78,
    y: 3.22,
    w: 0.32,
    h: 0.32,
    fontSize: 11,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_DISPLAY,
  });
  slide.addText(cfg.step3Desc, {
    x: 6.16,
    y: 3.18,
    w: 1.68,
    h: 0.48,
    fontSize: 8.0,
    bold: true,
    color: TEXT_DARK,
    fontFace: FONT_TITLE,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 5.73,
    y: 3.88,
    w: 2.14,
    h: 0,
    line: { color: EXEC_SLATE, width: 1.5, endArrowType: 'triangle' },
  });
  slide.addText(cfg.step3Card.replace(/\n/g, ' • '), {
    x: 5.80,
    y: 3.66,
    w: 2.00,
    h: 0.20,
    fontSize: 7.6,
    bold: true,
    color: EXEC_SLATE,
    align: 'center',
    fontFace: FONT_BODY,
  });

  // Step 4 (y = 3.92..4.82): Actor 4 Guardrail & Prefix Cache SLA Band
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 8.10,
    y: 3.50,
    w: 0.32,
    h: 0.32,
    fill: { color: '38988E' },
  });
  slide.addText('4', {
    x: 8.10,
    y: 3.50,
    w: 0.32,
    h: 0.32,
    fontSize: 11,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_DISPLAY,
  });
  slide.addText(cfg.step4Desc, {
    x: 8.48,
    y: 3.46,
    w: 1.88,
    h: 0.48,
    fontSize: 8.0,
    bold: true,
    color: TEXT_DARK,
    fontFace: FONT_TITLE,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 8.08,
    y: 4.02,
    w: 2.24,
    h: 0.72,
    rectRadius: 0.05,
    fill: { color: 'E6F4EA' },
    line: { color: SUCCESS_GREEN_BORDER, width: 1.0 },
  });
  slide.addText(cfg.step4BandTitle, {
    x: 8.14,
    y: 4.06,
    w: 2.12,
    h: 0.40,
    fontSize: 8.2,
    bold: true,
    color: G_GREEN_DEEP,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });
  slide.addText(cfg.step4Bracket, {
    x: 8.14,
    y: 4.46,
    w: 2.12,
    h: 0.24,
    fontSize: 7.4,
    bold: true,
    color: TEXT_DARK,
    align: 'center',
    fontFace: FONT_BODY,
  });

  // Step 5 (y = 4.92..5.58): Actor 4 -> Actor 5
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 8.10,
    y: 4.92,
    w: 0.32,
    h: 0.32,
    fill: { color: EXEC_TEAL },
  });
  slide.addText('5', {
    x: 8.10,
    y: 4.92,
    w: 0.32,
    h: 0.32,
    fontSize: 11,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_DISPLAY,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.86,
    y: 4.94,
    w: 0.94,
    h: 0.30,
    rectRadius: 0.05,
    fill: { color: EXEC_SLATE },
  });
  slide.addText(cfg.step5Pill, {
    x: 6.86,
    y: 4.94,
    w: 0.94,
    h: 0.30,
    fontSize: 8.0,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });
  slide.addText(cfg.step5Desc, {
    x: 5.82,
    y: 5.30,
    w: 2.02,
    h: 0.48,
    fontSize: 8.0,
    bold: true,
    color: TEXT_DARK,
    fontFace: FONT_TITLE,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 8.03,
    y: 5.36,
    w: 2.34,
    h: 0,
    line: { color: EXEC_NAVY, width: 1.5, endArrowType: 'triangle' },
  });
  slide.addText(cfg.step5Arrow, {
    x: 8.46,
    y: 5.12,
    w: 1.84,
    h: 0.20,
    fontSize: 8.0,
    bold: true,
    color: EXEC_NAVY,
    align: 'center',
    fontFace: FONT_BODY,
  });

  // Step 6 (y = 5.56..6.54): Actor 5 Final RLS & OTel Attestation
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 10.60,
    y: 5.00,
    w: 0.32,
    h: 0.32,
    fill: { color: EXEC_NAVY },
  });
  slide.addText('6', {
    x: 10.60,
    y: 5.00,
    w: 0.32,
    h: 0.32,
    fontSize: 11,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_DISPLAY,
  });
  slide.addText(cfg.step6Desc, {
    x: 10.98,
    y: 4.96,
    w: 1.94,
    h: 0.52,
    fontSize: 8.0,
    bold: true,
    color: TEXT_DARK,
    fontFace: FONT_TITLE,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 10.60,
    y: 5.58,
    w: 2.32,
    h: 0.96,
    rectRadius: 0.06,
    fill: { color: CARD_BG },
    line: { color: BORDER_GREY, width: 1.0 },
  });
  slide.addText(`${cfg.step6Loop1}\n${cfg.step6Loop2}`, {
    x: 10.68,
    y: 5.64,
    w: 1.54,
    h: 0.84,
    fontSize: 7.6,
    bold: true,
    color: TEXT_DARK,
    valign: 'middle',
    fontFace: FONT_BODY,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 12.24,
    y: 5.78,
    w: 0.60,
    h: 0.56,
    rectRadius: 0.06,
    fill: { color: EXEC_NAVY },
  });
  slide.addText(cfg.step6DbBadge, {
    x: 12.24,
    y: 5.78,
    w: 0.60,
    h: 0.56,
    fontSize: 7.8,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_TITLE,
  });

  addFooter(pptx, slide, cfg.footer);
  slide.addNotes(`[uml-sequence-swimlane] ${cfg.slideTitle}: ${cfg.footer}`);
  return { shapes: 31, connectors: 10 };
}

interface StateFlowPipelineSpec {
  slideTitle: string;
  canvasTitle: string;
  nodes: [string, string, string, string];
  step1Top: string;
  step2Bot: string;
  step3Top: string;
  step4Top: string;
  step5Loopback: string;
  footer: string;
}

const STATE_PIPELINE_BY_WS: Record<string, StateFlowPipelineSpec> = {
  WS1: {
    slideTitle: 'WS1 • 5-Hop Context Propagation & Closed-Loop OTel Governance Flow',
    canvasTitle: 'End-to-end tenant context propagation and closed-loop telemetry flow',
    nodes: [
      'Edge WAF &\nIAM STS (Hop 1)',
      'ARD & Memory\nScope (Hops 2–3)',
      'Model Armor &\n90% Cache (Hop 4)',
      'AlloyDB RLS &\nMCP Hub (Hop 5)',
    ],
    step1Top: '1. Validates OIDC JWT\n& RFC 9449 DPoP',
    step2Bot: '2. Rejects spoofed headers\nwith immediate HTTP\n401 / 403 fail-closed',
    step3Top: '3. Propagates sealed\nTenantContext to\nModel Armor & Gemini\n32k prefix cache',
    step4Top: '4. Binds AlloyDB RLS\nsession variable &\n3LO MCP OAuth token',
    step5Loopback: '5. Streams zero-PII OpenTelemetry\ncost & security spans back to\nBigQuery & tenant quota policy',
    footer: 'Workstream 1 State & Feedback Flow  •  Sealed TenantContext Propagation + Closed-Loop BigQuery OTel Governance',
  },
  WS2: {
    slideTitle: 'WS2 • Pattern A Valkey Token-Bucket & 90% Prefix Cache FinOps Pipeline',
    canvasTitle: 'High-density noisy-neighbor throttling and shared prefix cache flow',
    nodes: [
      'Pooled Tenant\nIngress Request',
      'Memorystore Valkey\nQuota Gate',
      'Gemini 2.5 Pro\n32k Prefix Cache',
      'AlloyDB RLS &\nBigQuery OTel',
    ],
    step1Top: '1. Sends burst traffic\n(Standard vs. Enterprise)',
    step2Bot: '2. Enforces 120/600 RPM;\nreturns HTTP 429\nRetry-After on burst',
    step3Top: '3. Matches immutable\n32k system prefix hash\nfor 90% token discount',
    step4Top: '4. Caps thinking budget\n(4k vs. 8k tokens) &\nexecutes RLS query',
    step5Loopback: '5. Emits real-time token utilization\n& cache-hit telemetry back to\nValkey rate-limiter & FinOps ledger',
    footer: 'Workstream 2 Pattern A Pipeline  •  Valkey 120/600 RPM Bulkheads + 90% Shared Prefix Cache + 4k/8k Thinking Caps',
  },
  WS3: {
    slideTitle: 'WS3 • Pattern B VPC-SC Air-Gapped Inference & Continuous KMS Attestation',
    canvasTitle: 'Zero-egress sovereign inference and continuous CMEK liveness flow',
    nodes: [
      'Sovereign Tenant\nIngress & PAB',
      'VPC-SC Perimeter\n& KMS Gate',
      'Private GKE Gemma 3\n/ Vertex Silo',
      'CMEK AlloyDB &\nSovereign GCS',
    ],
    step1Top: '1. Authenticates tenant\nprincipal inside PAB',
    step2Bot: '2. Blocks cross-perimeter\negress (HTTP 403) or\nrevoked CMEK (HTTP 423)',
    step3Top: '3. Routes over Restricted\nVIP (199.36.153.4/30)\nwith zero internet egress',
    step4Top: '4. Reads/writes dedicated\nAlloyDB & GCS skills\nencrypted with CMEK',
    step5Loopback: '5. Continuous <60s Cloud KMS key\nliveness attestation loops back to\npurge L1 cache immediately on revoke',
    footer: 'Workstream 3 Pattern B Pipeline  •  Restricted VIP Air-Gapped Inference + Continuous <60s KMS CMEK Liveness Loop',
  },
  WS4: {
    slideTitle: 'WS4 • Pattern C Unidirectional Private Service Connect & Live Cutover Flow',
    canvasTitle: 'Hub-and-spoke PSC traversal and zero-downtime state synchronization',
    nodes: [
      'Shared Hub ALB\n& Tier Router',
      'Consumer PSC\nEndpoint (/28 NAT)',
      'Spoke Producer\nServiceAttachment',
      'Sovereign Spoke\nAgent & AlloyDB',
    ],
    step1Top: '1. Looks up tenant tier\nin Firestore (0ms)',
    step2Bot: '2. Standard tenants route\ndirectly to shared pool\n($42/mo fast-path)',
    step3Top: '3. Enterprise tenants\ntraverse unidirectional\nPSC endpoint (10.10.0.50)',
    step4Top: '4. Spoke ServiceAttachment\nforwards to dedicated\nAgent Engine & CMEK DB',
    step5Loopback: '5. Live migration coordinator syncs\ndual-write checksums & flips Firestore\npointer back at the Hub with 0ms lag',
    footer: 'Workstream 4 Pattern C Pipeline  •  Unidirectional /28 PSC NAT Traversal + 0ms Firestore Pointer Cutover Loop',
  },
  WS5: {
    slideTitle: 'WS5 • Executive 2-Question Topology Selector & Live Promotion Loop',
    canvasTitle: 'Dynamic architecture selection and lifecycle promotion across Patterns A, B & C',
    nodes: [
      'Q1: Contractual\nSilo / CMEK?',
      'Q2: Single Hub +\nLive Upgrades?',
      'Terraform Module\n(2.6 / 3.6 / 4.6)',
      '20/20 Certified\nProduction Runtime',
    ],
    step1Top: '1. Evaluates regulatory\n& blast-radius mandate',
    step2Bot: '2. If Q1=Yes & single-org,\ndeploys Pattern B\nSovereign Silo ($1,850/mo)',
    step3Top: '3. Evaluates portfolio\nmix: Pattern A ($42/mo)\nvs. Pattern C Hybrid',
    step4Top: '4. Provisions 80% shared\nADK 2.0 core + 20%\nTerraform infrastructure',
    step5Loopback: '5. Commercial tenants onboarded on\nPattern A seamlessly promote to Pattern C\nPSC spokes as enterprise requirements grow',
    footer: 'Workstream 5 Decision & Promotion Loop  •  2-Question Selector + 80/20 Terraform Deployment + Live Tier Promotion',
  },
};

function addAsyncStateFlowPipelineSlide(pptx: Pptx, spec: DeckSpec): { shapes: number; connectors: number } {
  const cfg = STATE_PIPELINE_BY_WS[spec.key] || STATE_PIPELINE_BY_WS.WS1;
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  addHeaderBar(pptx, slide, spec.key, cfg.slideTitle, 'ASYNC-STATE-FLOW-PIPELINE');

  slide.addText(cfg.canvasTitle, {
    x: 0.55,
    y: 0.82,
    w: 12.10,
    h: 0.54,
    fontSize: 20.5,
    bold: true,
    color: TEXT_DARK,
    fontFace: FONT_DISPLAY,
    valign: 'middle',
  });

  const nodePositions = [
    { x: 0.58, fill: '12355B', label: cfg.nodes[0] },
    { x: 4.10, fill: EXEC_AMBER, label: cfg.nodes[1] },
    { x: 7.42, fill: EXEC_TEAL, label: cfg.nodes[2] },
    { x: 10.62, fill: EXEC_GREEN_DARK, label: cfg.nodes[3] },
  ];
  nodePositions.forEach((n) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: n.x,
      y: 3.12,
      w: 2.16,
      h: 1.44,
      rectRadius: 0.06,
      fill: { color: n.fill },
    });
    slide.addText(n.label, {
      x: n.x + 0.08,
      y: 3.12,
      w: 2.00,
      h: 1.44,
      fontSize: 13.0,
      bold: true,
      color: WHITE,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
  });

  // Transition 1 (Top Callout Card between Node 1 & Node 2)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 2.70,
    y: 1.72,
    w: 1.44,
    h: 1.12,
    rectRadius: 0.06,
    fill: { color: CARD_BG },
    line: { color: BORDER_GREY, width: 1.0 },
  });
  slide.addText(cfg.step1Top, {
    x: 2.74,
    y: 1.78,
    w: 1.36,
    h: 1.00,
    fontSize: 8.8,
    bold: true,
    color: TEXT_DARK,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_BODY,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 2.74,
    y: 3.48,
    w: 1.36,
    h: 0,
    line: { color: '12355B', width: 1.75, endArrowType: 'triangle' },
  });

  // Transition 2 (Bottom Callout Card between Node 1 & Node 2)
  slide.addShape(pptx.ShapeType.line, {
    x: 2.74,
    y: 4.08,
    w: 1.36,
    h: 0,
    line: { color: ALERT_RED_BORDER, width: 1.75, beginArrowType: 'triangle' },
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 2.66,
    y: 4.24,
    w: 1.52,
    h: 0.94,
    rectRadius: 0.06,
    fill: { color: 'FCE8E6' },
    line: { color: ALERT_RED_BORDER, width: 0.9 },
  });
  slide.addText(cfg.step2Bot, {
    x: 2.72,
    y: 4.28,
    w: 1.40,
    h: 0.86,
    fontSize: 8.2,
    bold: true,
    color: G_RED_DEEP,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_BODY,
  });

  // Transition 3 (Top Callout Card between Node 2 & Node 3)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 5.90,
    y: 1.72,
    w: 1.88,
    h: 1.12,
    rectRadius: 0.06,
    fill: { color: CARD_BG },
    line: { color: BORDER_GREY, width: 1.0 },
  });
  slide.addText(cfg.step3Top, {
    x: 5.96,
    y: 1.78,
    w: 1.76,
    h: 1.00,
    fontSize: 8.6,
    bold: true,
    color: TEXT_DARK,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_BODY,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 6.26,
    y: 3.84,
    w: 1.16,
    h: 0,
    line: { color: '12355B', width: 1.75, endArrowType: 'triangle' },
  });

  // Transition 4 (Top Callout Card between Node 3 & Node 4)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.10,
    y: 1.72,
    w: 1.88,
    h: 1.12,
    rectRadius: 0.06,
    fill: { color: CARD_BG },
    line: { color: BORDER_GREY, width: 1.0 },
  });
  slide.addText(cfg.step4Top, {
    x: 9.16,
    y: 1.78,
    w: 1.76,
    h: 1.00,
    fontSize: 8.6,
    bold: true,
    color: TEXT_DARK,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_BODY,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 9.58,
    y: 3.84,
    w: 1.04,
    h: 0,
    line: { color: '12355B', width: 1.75, endArrowType: 'triangle' },
  });

  // Transition 5: True End-to-End Closed-Loop Return Highway from Node 4 (x: 11.70) back to Node 1 (x: 1.66)
  slide.addShape(pptx.ShapeType.line, {
    x: 11.70,
    y: 4.56,
    w: 0,
    h: 1.24,
    line: { color: EXEC_TEAL, width: 2.0 },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 1.66,
    y: 5.80,
    w: 10.04,
    h: 0,
    line: { color: EXEC_TEAL, width: 2.0 },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 1.66,
    y: 4.56,
    w: 0,
    h: 1.24,
    line: { color: EXEC_TEAL, width: 2.0, beginArrowType: 'triangle' },
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 4.46,
    y: 5.36,
    w: 4.48,
    h: 0.88,
    rectRadius: 0.06,
    fill: { color: 'E6F4EA' },
    line: { color: EXEC_TEAL, width: 1.2 },
  });
  slide.addText(cfg.step5Loopback, {
    x: 4.56,
    y: 5.40,
    w: 4.28,
    h: 0.80,
    fontSize: 8.8,
    bold: true,
    color: G_GREEN_DEEP,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_BODY,
  });

  addFooter(pptx, slide, cfg.footer);
  slide.addNotes(`[async-state-flow-pipeline] ${cfg.slideTitle}: ${cfg.footer}`);
  return { shapes: 15, connectors: 7 };
}

interface PhasedRoadmapSpec {
  slideTitle: string;
  canvasTitle: string;
  phases: {
    phaseLabel: string;
    title: string;
    timeframe: string;
    outcome: string;
  }[];
  footer: string;
}

const ROADMAP_TIMELINE_BY_WS: Record<string, PhasedRoadmapSpec> = {
  WS1: {
    slideTitle: 'WS1 • Reference Architecture & 5-Hop Governance Rollout Timeline',
    canvasTitle: 'Workstream 1 Reference Architecture Rollout Roadmap',
    phases: [
      {
        phaseLabel: 'Phase 1: 5-Hop Core',
        title: 'Identity Context &\nARD Registry Gate',
        timeframe: '(Weeks 1–2)',
        outcome: 'RFC 8693 OBO + DPoP & Hop 2\nARD Catalog Filter Live',
      },
      {
        phaseLabel: 'Phase 2: Guardrails',
        title: 'Model Armor, RLS\n& GAP-01..05 Controls',
        timeframe: '(Weeks 3–4)',
        outcome: 'Hop 4 Model Armor + Cloud SDP\n& AlloyDB RLS Enforced',
      },
      {
        phaseLabel: 'Phase 3: Certification',
        title: '3-Pattern Taxonomy\n& 20/20 Audit Pass',
        timeframe: '(Weeks 5–6)',
        outcome: 'Patterns A, B & C Certified\nAcross 3 Live GCP Projects',
      },
    ],
    footer: 'Workstream 1 Rollout Timeline  •  Phase 1 (5-Hop Core) → Phase 2 (GAP-01..05 Controls) → Phase 3 (20/20 Certification)',
  },
  WS2: {
    slideTitle: 'WS2 • Pattern A High-Density Pooled Deployment & FinOps Roadmap',
    canvasTitle: 'Pattern A Pooled Multi-Tenant Implementation Timeline',
    phases: [
      {
        phaseLabel: 'Phase 1: Infra Starter',
        title: 'Terraform 2.6 &\nCloud Run v2 Pool',
        timeframe: '(Weeks 1–2)',
        outcome: 'WAF + IAP + Shared Cloud Run\n& AlloyDB RLS Provisioned',
      },
      {
        phaseLabel: 'Phase 2: FinOps & Quota',
        title: '90% Prefix Cache\n& Valkey Bulkheads',
        timeframe: '(Weeks 3–4)',
        outcome: '84.7% Net Token Savings &\n120/600 RPM Tenant Quotas',
      },
      {
        phaseLabel: 'Phase 3: Red-Team Gate',
        title: '10-Point Breach\nSimulation Suite',
        timeframe: '(Weeks 5–6)',
        outcome: '10/10 Cross-Tenant Attacks\nBlocked (0 Rows Leaked)',
      },
    ],
    footer: 'Workstream 2 Pattern A Timeline  •  Terraform 2.6 Starter → 90% Prefix Cache & Valkey → 10/10 Red-Team Certification',
  },
  WS3: {
    slideTitle: 'WS3 • Pattern B Zero-Trust Sovereign Silo Provisioning Timeline',
    canvasTitle: 'Pattern B Sovereign Single-Tenant Vault Rollout',
    phases: [
      {
        phaseLabel: 'Phase 1: Project Silo',
        title: 'Dedicated Project\n& IAM PAB Boundary',
        timeframe: '(Day 1 Automated)',
        outcome: 'cymbal-{tenant}-silo-prod +\nPrincipal Access Boundary',
      },
      {
        phaseLabel: 'Phase 2: Crypto & Network',
        title: 'VPC-SC Perimeter\n& Cloud KMS CMEK',
        timeframe: '(Days 2–3)',
        outcome: 'Restricted VIP 199.36.153.4/30\n& Tenant-Controlled CMEK',
      },
      {
        phaseLabel: 'Phase 3: Kill-Switch Gate',
        title: 'Private GKE Gemma 3\n& <60s Revocation',
        timeframe: '(Days 4–5)',
        outcome: '6/6 Sovereign Silo & <60s\nHTTP 423 Kill-Switch PASS',
      },
    ],
    footer: 'Workstream 3 Pattern B Timeline  •  Dedicated Project & PAB → VPC-SC & CMEK → Private GKE & <60s Kill-Switch',
  },
  WS4: {
    slideTitle: 'WS4 • Pattern C Zero-Downtime Live Tier Migration Timeline',
    canvasTitle: 'Pattern C Live Tenant Promotion Phases (Standard → Enterprise)',
    phases: [
      {
        phaseLabel: 'Phase 1: SHADOW_SYNC',
        title: 'Spoke Provision &\nDual-Write Backfill',
        timeframe: '(T-30 to T-5 Min)',
        outcome: 'Terraform 4.6 PSC Spoke +\nAsync Memory & SQL Backfill',
      },
      {
        phaseLabel: 'Phase 2: ATOMIC_CUTOVER',
        title: 'CMEK Re-Key &\nFirestore Pointer Flip',
        timeframe: '(T-0 Cutover: 0ms)',
        outcome: 'Checksum Parity Verified &\nAtomic Route Flip to PSC',
      },
      {
        phaseLabel: 'Phase 3: DRAIN_VERIFY',
        title: 'In-Flight Drain &\nShared Pool Purge',
        timeframe: '(T+1 to T+5 Min)',
        outcome: '0 Dropped Sessions & 100%\nPooled Row Tombstone Purge',
      },
    ],
    footer: 'Workstream 4 Pattern C Timeline  •  Phase 1 SHADOW_SYNC → Phase 2 ATOMIC_CUTOVER (0ms) → Phase 3 DRAIN_AND_VERIFY',
  },
  WS5: {
    slideTitle: 'WS5 • 10-Week Enterprise Multi-Tenant Rollout Roadmap',
    canvasTitle: 'Workstream 5 Complete 10-Week Production Rollout Roadmap',
    phases: [
      {
        phaseLabel: 'Phase 1: Pooled MVP',
        title: 'Pattern A Core &\n5-Hop Pipeline',
        timeframe: '(Weeks 1–3)',
        outcome: 'Onboard Commercial Tenants at\n$42/mo with 10/10 Breach Gate',
      },
      {
        phaseLabel: 'Phase 2: FinOps & Safety',
        title: 'Model Armor, Valkey\n& BigQuery OTel',
        timeframe: '(Weeks 4–6)',
        outcome: 'Activate 90% Prefix Cache &\nZero-PII Chargeback Ledger',
      },
      {
        phaseLabel: 'Phase 3: Sovereign & PSC',
        title: 'Pattern B Silos &\nPattern C PSC Spokes',
        timeframe: '(Weeks 7–10)',
        outcome: 'Onboard Regulated Tenants &\nEnable 0ms Live Tier Upgrades',
      },
    ],
    footer: 'Workstream 5 Program Roadmap  •  Weeks 1–3 (Pattern A MVP) → Weeks 4–6 (FinOps & OTel) → Weeks 7–10 (Silos & PSC)',
  },
};

function addPhasedRoadmapTimelineSlide(pptx: Pptx, spec: DeckSpec): { shapes: number; connectors: number } {
  const cfg = ROADMAP_TIMELINE_BY_WS[spec.key] || ROADMAP_TIMELINE_BY_WS.WS1;
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  addHeaderBar(pptx, slide, spec.key, cfg.slideTitle, 'PHASED-ROADMAP-TIMELINE');

  slide.addText(cfg.canvasTitle, {
    x: 0.58,
    y: 0.86,
    w: 12.0,
    h: 0.64,
    fontSize: 24,
    bold: true,
    color: EXEC_NAVY,
    fontFace: FONT_DISPLAY,
    valign: 'middle',
  });

  const phaseXs = [0.58, 4.78, 8.98];
  const phaseColors = [EXEC_NAVY, EXEC_TEAL, EXEC_SLATE];

  cfg.phases.forEach((p, idx) => {
    const px = phaseXs[idx];
    const headerColor = phaseColors[idx];
    slide.addShape(pptx.ShapeType.roundRect, {
      x: px,
      y: 1.68,
      w: 3.76,
      h: 4.86,
      rectRadius: 0.08,
      fill: { color: CARD_BG },
      line: { color: BORDER_GREY, width: 1.2 },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: px,
      y: 1.68,
      w: 3.76,
      h: 0.94,
      rectRadius: 0.06,
      fill: { color: headerColor },
    });
    slide.addText(p.phaseLabel, {
      x: px + 0.16,
      y: 1.68,
      w: 3.44,
      h: 0.94,
      fontSize: 17.0,
      bold: true,
      color: WHITE,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: px,
      y: 6.44,
      w: 3.76,
      h: 0.10,
      fill: { color: headerColor },
    });

    slide.addText(p.title, {
      x: px + 0.20,
      y: 2.86,
      w: 3.36,
      h: 1.12,
      fontSize: 20,
      bold: true,
      color: TEXT_DARK,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
    slide.addText(p.timeframe, {
      x: px + 0.20,
      y: 4.02,
      w: 3.36,
      h: 0.42,
      fontSize: 15.0,
      bold: false,
      color: TEXT_DARK,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_BODY,
    });
    slide.addShape(pptx.ShapeType.line, {
      x: Number((px + 1.32).toFixed(3)),
      y: 4.66,
      w: 1.12,
      h: 0,
      line: { color: headerColor, width: 2.5 },
    });
    slide.addText(p.outcome, {
      x: px + 0.20,
      y: 4.96,
      w: 3.36,
      h: 1.12,
      fontSize: 13.8,
      bold: false,
      color: TEXT_DARK,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_BODY,
    });

    if (idx === 0) {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: Number((px - 0.13).toFixed(3)),
        y: 4.04,
        w: 0.26,
        h: 0.26,
        fill: { color: headerColor },
      });
    }
    if (idx < 2) {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: Number((px + 3.63).toFixed(3)),
        y: 4.04,
        w: 0.26,
        h: 0.26,
        fill: { color: headerColor },
      });
      const nextColor = phaseColors[idx + 1];
      slide.addShape(pptx.ShapeType.ellipse, {
        x: Number((phaseXs[idx + 1] - 0.13).toFixed(3)),
        y: 4.04,
        w: 0.26,
        h: 0.26,
        fill: { color: nextColor },
      });
    }
  });

  addFooter(pptx, slide, cfg.footer);
  slide.addNotes(`[phased-roadmap-timeline] ${cfg.slideTitle}: ${cfg.footer}`);
  return { shapes: 20, connectors: 5 };
}

interface OperatingModelSpec {
  slideTitle: string;
  canvasTitle: string;
  pillars: {
    icon: string;
    title: string;
    bullets: [string, string, string];
  }[];
  footer: string;
}

const OPERATING_MODEL_BY_WS: Record<string, OperatingModelSpec> = {
  WS1: {
    slideTitle: 'WS1 • 3-Pillar Multi-Tenant Reference Architecture Operating Model',
    canvasTitle: 'Google Cloud Multi-Tenant Agentic AI Reference Pillars',
    pillars: [
      {
        icon: 'IAM',
        title: 'Pillar 1: Cryptographic\nIdentity & Edge Context',
        bullets: [
          'Strip client-supplied X-Tenant-Id headers at Cloud Armor edge',
          'Exchange OIDC JWTs via IAM STS (RFC 8693) + DPoP (RFC 9449)',
          'Propagate immutable TenantContext across all 5 runtime hops',
        ],
      },
      {
        icon: 'MEM',
        title: 'Pillar 2: Scoped Memory\n& Reasoning Guardrails',
        bullets: [
          'Filter Agent Engine Registry (ARD) discovery by tenant ACL',
          'Isolate L1–L5 memory under /tenants/{id}/namespaces/*',
          'Enforce Model Armor, NLC gates & Cloud SDP PII redaction',
        ],
      },
      {
        icon: 'RLS',
        title: 'Pillar 3: Data Isolation\n& Zero-PII FinOps',
        bullets: [
          'Bind AlloyDB FORCE ROW LEVEL SECURITY to session tenant_id',
          'Capture 90% Gemini 2.5 Pro shared prefix cache savings',
          'Stream SHA-256 hashed OTel spans to BigQuery chargeback',
        ],
      },
    ],
    footer: 'Workstream 1 Operating Model  •  Identity & Edge Context + Scoped Memory & Guardrails + Data Isolation & FinOps',
  },
  WS2: {
    slideTitle: 'WS2 • Pattern A Pooled Economics, Defense-in-Depth & Quota Governance',
    canvasTitle: 'Pattern A High-Density Pooled Operating Model Pillars',
    pillars: [
      {
        icon: 'FIN',
        title: 'Pillar 1: High-Density\nSaaS Unit Economics',
        bullets: [
          'Serve 100+ commercial tenants in one shared Cloud Run v2 pool',
          'Share 32,000-token immutable system prefix (90% cache discount)',
          'Achieve $42/mo per-tenant cost (84.7% net LLM token savings)',
        ],
      },
      {
        icon: 'SEC',
        title: 'Pillar 2: 10-Point Breach\nDefense-in-Depth',
        bullets: [
          'Block cross-tenant agent enumeration (403) & namespace overrides',
          'Enforce Natural Language Constraints (HTTP 422) & SDP masking',
          'Enforce PostgreSQL RLS + 2LO/3LO MCP token audience checks',
        ],
      },
      {
        icon: 'RPM',
        title: 'Pillar 3: Noisy-Neighbor\nBulkheads & Fair Share',
        bullets: [
          'Memorystore for Valkey token-bucket rate limits (120 vs 600 RPM)',
          'Cap Gemini 2.5 Pro thinking budgets (4k Standard vs 8k Enterprise)',
          'Fail-closed HTTP 429 Retry-After without starving peer tenants',
        ],
      },
    ],
    footer: 'Workstream 2 Pattern A Operating Model  •  $42/mo Unit Economics + 10/10 Breach Defense + Valkey Quota Bulkheads',
  },
  WS3: {
    slideTitle: 'WS3 • Pattern B Sovereign Project, Cryptographic & Model Governance',
    canvasTitle: 'Pattern B Zero-Trust Sovereign Silo Operating Model',
    pillars: [
      {
        icon: 'VPC',
        title: 'Pillar 1: Dedicated Project\n& Network Sovereignty',
        bullets: [
          'Provision 1:1 dedicated GCP project (cymbal-{tenant}-silo-prod)',
          'Enforce VPC Service Controls perimeter around Vertex, KMS & GCS',
          'Bind IAM Principal Access Boundary (PAB) to block cross-project access',
        ],
      },
      {
        icon: 'KMS',
        title: 'Pillar 2: Customer-Managed\nCryptography (CMEK)',
        bullets: [
          'Encrypt AlloyDB, Memory Bank, Vertex & GCS with tenant KMS key',
          'Sign A2A handshakes with asymmetric Cloud KMS ECDSA P-256 key',
          'Guarantee <60s HTTP 423 kill-switch & L1 cache purge on key revoke',
        ],
      },
      {
        icon: 'GKE',
        title: 'Pillar 3: Air-Gapped Open\nWeights & Auditability',
        bullets: [
          'Run self-hosted Gemma 3 (27B) on Private GKE (0 internet egress)',
          'Route all Google APIs exclusively via Restricted VIP 199.36.153.4/30',
          'Stream immutable Access Transparency & KMS logs to tenant SIEM',
        ],
      },
    ],
    footer: 'Workstream 3 Pattern B Operating Model  •  Project & VPC-SC Sovereignty + Tenant CMEK + Air-Gapped Gemma 3',
  },
  WS4: {
    slideTitle: 'WS4 • Pattern C Blended FinOps, Unidirectional PSC & Live Mobility',
    canvasTitle: 'Pattern C Dynamic Hybrid Hub-and-Spoke Operating Model',
    pillars: [
      {
        icon: 'TCO',
        title: 'Pillar 1: Blended Portfolio\nFinOps Optimization',
        bullets: [
          'Host 85% Standard tenants in Pattern A pool ($42/mo unit cost)',
          'Host 15% Regulated Enterprise tenants in dedicated PSC spokes',
          'Reduce 1,000-tenant portfolio spend by 74% ($313k vs $1.85M/mo)',
        ],
      },
      {
        icon: 'PSC',
        title: 'Pillar 2: Unidirectional\nPrivate Service Connect',
        bullets: [
          'Bridge Hub VPC to Spoke VPCs via /28 PSC NAT & ServiceAttachment',
          'Eliminate transitive VPC peering & CIDR exhaustion across 100+ spokes',
          'Enforce ACCEPT_SELECTED producer allowlists per enterprise spoke',
        ],
      },
      {
        icon: 'MIG',
        title: 'Pillar 3: Zero-Downtime\nLive Tier Mobility',
        bullets: [
          'Backfill Memory Bank & AlloyDB to spoke via SHADOW_SYNC dual-write',
          'Re-key tenant state with customer CMEK & verify SHA-256 checksums',
          'Flip Firestore tier pointer atomically in 0ms with 0 dropped sessions',
        ],
      },
    ],
    footer: 'Workstream 4 Pattern C Operating Model  •  74% Portfolio Savings + Unidirectional PSC + 0ms Live Tier Mobility',
  },
  WS5: {
    slideTitle: 'WS5 • 80/20 Code Reuse, Agentic Triad & Automated CI/CD Governance',
    canvasTitle: 'Workstream 5 Enterprise Program & Agentic Triad Operating Model',
    pillars: [
      {
        icon: 'ADK',
        title: 'Pillar 1: 80/20 Unified\nCodebase & Terraform',
        bullets: [
          'Write 5-hop ADK 2.0 security pipeline once in runtime_pipeline.py',
          'Swap infrastructure topologies via Terraform modules 2.6, 3.6 & 4.6',
          'Eliminate fork drift across Pooled, Siloed & Hybrid deployments',
        ],
      },
      {
        icon: 'MCP',
        title: 'Pillar 2: Multi-Tenant\nAgentic Triad & MCP',
        bullets: [
          'Combine Shared Diagnostic Agent with Tenant-Private Specialist Agents',
          'Hot-swap tenant GCS skills at runtime with zero container rebuilds',
          'Enforce 2LO (Service Account) vs 3LO (User OAuth) MCP tool boundaries',
        ],
      },
      {
        icon: '20/20',
        title: 'Pillar 3: Continuous 20/20\nForensic Gatekeeping',
        bullets: [
          'Run 10 Pattern A red-team breach simulations on every PR commit',
          'Run 6 Pattern B VPC-SC exfiltration & <60s CMEK revocation tests',
          'Run 4 Pattern C zero-downtime live tier upgrade verification gates',
        ],
      },
    ],
    footer: 'Workstream 5 Program Operating Model  •  80/20 Code Reuse + Multi-Tenant Agentic Triad + 20/20 CI/CD Gates',
  },
};

function addStrategicOperatingModelPillarsSlide(pptx: Pptx, spec: DeckSpec): { shapes: number; connectors: number } {
  const cfg = OPERATING_MODEL_BY_WS[spec.key] || OPERATING_MODEL_BY_WS.WS1;
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  addHeaderBar(pptx, slide, spec.key, cfg.slideTitle, 'STRATEGIC-OPERATING-MODEL');

  slide.addText(cfg.canvasTitle, {
    x: 0.58,
    y: 0.86,
    w: 12.16,
    h: 0.62,
    fontSize: 22.5,
    bold: true,
    color: TEXT_DARK,
    align: 'center',
    valign: 'middle',
    fontFace: FONT_DISPLAY,
  });

  const pillarXs = [0.58, 4.78, 8.98];
  const pillarAccents = [EXEC_NAVY, EXEC_TEAL, EXEC_SLATE];

  cfg.pillars.forEach((p, idx) => {
    const px = pillarXs[idx];
    const accent = pillarAccents[idx];
    slide.addShape(pptx.ShapeType.roundRect, {
      x: px,
      y: 1.62,
      w: 3.76,
      h: 4.96,
      rectRadius: 0.06,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 1.2 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: px,
      y: 1.62,
      w: 3.76,
      h: 0.11,
      fill: { color: accent },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: px,
      y: 6.47,
      w: 3.76,
      h: 0.11,
      fill: { color: accent },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: Number((px + 1.48).toFixed(3)),
      y: 1.92,
      w: 0.80,
      h: 0.64,
      rectRadius: 0.08,
      fill: { color: CARD_BG },
      line: { color: accent, width: 1.25 },
    });
    slide.addText(p.icon, {
      x: Number((px + 1.48).toFixed(3)),
      y: 1.92,
      w: 0.80,
      h: 0.64,
      fontSize: 11.5,
      bold: true,
      color: accent,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
    slide.addText(p.title, {
      x: px + 0.20,
      y: 2.72,
      w: 3.36,
      h: 0.92,
      fontSize: 14.8,
      bold: true,
      color: TEXT_DARK,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
    p.bullets.forEach((bText, bIdx) => {
      const by = 3.82 + bIdx * 0.82;
      slide.addShape(pptx.ShapeType.ellipse, {
        x: px + 0.28,
        y: by + 0.10,
        w: 0.12,
        h: 0.12,
        fill: { color: accent },
      });
      slide.addText(bText, {
        x: px + 0.50,
        y: by,
        w: 3.04,
        h: 0.72,
        fontSize: 11.2,
        bold: false,
        color: TEXT_DARK,
        valign: 'top',
        fontFace: FONT_BODY,
        wrap: true,
      });
    });
  });

  addFooter(pptx, slide, cfg.footer);
  slide.addNotes(`[strategic-operating-model-pillars] ${cfg.slideTitle}: ${cfg.footer}`);
  return { shapes: 22, connectors: 0 };
}

interface ScreenshotCalloutSpec {
  file1: string;
  badge1: string;
  cap1: string;
  file2: string;
  badge2: string;
  cap2: string;
  callouts: { badge: string; title: string; body: string }[];
}

const SCREENSHOT_CALLOUT_BY_WS: Record<string, ScreenshotCalloutSpec> = {
  WS1: {
    file1: 'gcp_console_02_cloud_run_revisions_deploy.png',
    badge1: 'LIVE GCP CONSOLE CAPTURE 01 • CLOUD RUN REVISIONS',
    cap1: 'ramp-portal-dev (#248990048888) & nitinagga-ge-2 (#638420508320) serving Pattern A/B/C endpoints (HTTP 200)',
    file2: 'gcp_console_07_logs_explorer_20_20_pass.png',
    badge2: 'LIVE GCP CONSOLE CAPTURE 02 • CLOUD LOGGING 20/20 PASS',
    cap2: 'Cloud Logging Explorer verifying 20/20 multi-tenant isolation & live tier upgrade simulations',
    callouts: [
      {
        badge: 'PROOF 01 • 3-PATTERN TAXONOMY LIVE',
        title: 'Patterns A, B & C Verified Across 3 GCP Projects',
        body: 'Live across ramp-portal-dev (#248990048888), nitinagga-ge-2 (#638420508320) & nitina-ggarwal-sandbox-647724.',
      },
      {
        badge: 'PROOF 02 • HOP 1–5 RUNTIME ENVELOPE',
        title: 'RFC 8693 OBO + DPoP & ARD Catalog Filter',
        body: 'Strips spoofed X-Tenant-Id headers at Cloud Armor edge and binds immutable TenantContext across all 5 hops.',
      },
      {
        badge: 'PROOF 03 • GAP-01..05 COMPENSATING GATES',
        title: 'Valkey RPM, Model Armor & Zero-PII OTel',
        body: 'Closes all 5 multi-tenant EAP product gaps with 100% deterministic fail-closed HTTP 401/403/422/423/429 gates.',
      },
      {
        badge: 'PROOF 04 • 12/12 FORENSIC + 20/20 SUITE',
        title: '100% Automated CI/CD Audit Certification',
        body: 'Verified by run_deep_forensic_audit.py (12/12 PASS) and 20/20 end-to-end security & migration simulations.',
      },
    ],
  },
  WS2: {
    file1: 'gcp_console_03_bigquery_studio_pattern_a_rls.png',
    badge1: 'LIVE GCP CONSOLE CAPTURE 01 • PATTERN A ROW ACCESS POLICY',
    cap1: 'BigQuery / AlloyDB ROW ACCESS POLICY tenant_pooled_rls_policy blocking cross-tenant reads (0 rows leaked)',
    file2: 'gcp_console_01_cloud_run_source_editor.png',
    badge2: 'LIVE GCP CONSOLE CAPTURE 02 • ADK 2.0 POOLED GATEWAY',
    cap2: 'Cloud Run source editor showing RFC 8693 OBO + DPoP & Hop 2 ARD filter enforcement',
    callouts: [
      {
        badge: 'PROOF 01 • 10/10 RED-TEAM BREACH SUITE',
        title: 'Zero Cross-Tenant Data or Memory Leakage',
        body: 'run_breach_simulations.py verifies 10/10 adversarial attacks blocked across FinVault and RetailStream.',
      },
      {
        badge: 'PROOF 02 • ALLOYDB & BIGQUERY RLS',
        title: 'FORCE ROW LEVEL SECURITY Session Binding',
        body: 'SET LOCAL app.current_tenant_id restricts every SQL and vector query to the authenticated tenant (0 foreign rows).',
      },
      {
        badge: 'PROOF 03 • 90% SHARED PREFIX CACHE',
        title: '84.7% Net Token Savings ($42/mo per Tenant)',
        body: 'Shares 32,000-token immutable system prefix across 100+ pooled tenants while isolating dynamic suffixes.',
      },
      {
        badge: 'PROOF 04 • VALKEY QUOTA BULKHEADS',
        title: '120 vs. 600 RPM & 4k vs. 8k Thinking Caps',
        body: 'Throttles noisy-neighbor bursts with HTTP 429 Retry-After while preserving <220ms p99 for peer tenants.',
      },
    ],
  },
  WS3: {
    file1: 'gcp_console_04_bigquery_studio_pattern_b_cmek.png',
    badge1: 'LIVE GCP CONSOLE CAPTURE 01 • PATTERN B SOVEREIGN CMEK VAULT',
    cap1: 'Dedicated sovereign dataset encrypted with customer-managed key finvault-silo-cmek',
    file2: 'gcp_console_05_cloud_kms_keyring_live.png',
    badge2: 'LIVE GCP CONSOLE CAPTURE 02 • CLOUD KMS KEYRING & P-256 SIGNING',
    cap2: 'Cloud KMS keyring verifying <60s cryptographic kill-switch & asymmetric ECDSA P-256 key',
    callouts: [
      {
        badge: 'PROOF 01 • DEDICATED PROJECT & VPC-SC',
        title: 'Zero Cross-Perimeter Data Exfiltration',
        body: 'VPC Service Controls perimeter around Vertex AI, AlloyDB, GCS & KMS blocks external bucket egress (HTTP 403).',
      },
      {
        badge: 'PROOF 02 • <60s CMEK KILL-SWITCH',
        title: 'Immediate HTTP 423 Locked & L1 Cache Purge',
        body: 'Disabling finvault-silo-cmek halts all agent memory and SQL reads in 18.4s (<60s SLA) and purges L1 cache.',
      },
      {
        badge: 'PROOF 03 • ASYMMETRIC ECDSA P-256 A2A',
        title: 'HSM-Signed Agent-to-Agent Handshakes',
        body: 'Every inter-agent delegation inside the sovereign silo is cryptographically signed via Cloud KMS P-256.',
      },
      {
        badge: 'PROOF 04 • PRIVATE GKE GEMMA 3 (27B)',
        title: 'Air-Gapped Open-Weights Inference Option',
        body: 'Supports self-hosted Gemma 3 27B on Private GKE via Restricted VIP 199.36.153.4/30 with zero internet egress.',
      },
    ],
  },
  WS4: {
    file1: 'gcp_console_06_vpc_psc_nat_subnet_live.png',
    badge1: 'LIVE GCP CONSOLE CAPTURE 01 • PATTERN C /28 PSC NAT SUBNET',
    cap1: 'Dedicated /28 PRIVATE_SERVICE_CONNECT NAT subnet bridging shared control plane to sovereign VPC',
    file2: 'gcp_console_09_vertex_ai_agent_builder_engines.png',
    badge2: 'LIVE GCP CONSOLE CAPTURE 02 • VERTEX AI AGENT ENGINE REGISTRY',
    cap2: 'Live Vertex AI Agent Builder & Engine routing table for zero-downtime Standard → Enterprise migration',
    callouts: [
      {
        badge: 'PROOF 01 • UNIDIRECTIONAL /28 PSC NAT',
        title: 'Hub-to-Spoke Bridge Without VPC Peering',
        body: 'Consumer PrivateServiceConnectEndpoint (10.10.0.50) targets Spoke ServiceAttachment with zero reverse ingress.',
      },
      {
        badge: 'PROOF 02 • SHADOW_SYNC DUAL-WRITE',
        title: '100% Checksum Parity & CMEK Re-Encryption',
        body: 'Streams live Memory Bank and AlloyDB rows to the dedicated spoke while re-keying under customer CMEK.',
      },
      {
        badge: 'PROOF 03 • 0ms ATOMIC FIRESTORE FLIP',
        title: '4/4 Live Tier Upgrade Simulations PASS',
        body: 'run_tier_migration_suite.py verifies 0 dropped sessions and 0ms routing lag during Standard → Enterprise promotion.',
      },
      {
        badge: 'PROOF 04 • 74% PORTFOLIO TCO REDUCTION',
        title: '$313,200/mo Blended vs. $1.85M/mo All-Silo',
        body: 'Serves 850 Standard tenants in the $42/mo pool and 150 Enterprise tenants in dedicated PSC spokes.',
      },
    ],
  },
  WS5: {
    file1: 'gcp_console_07_logs_explorer_20_20_pass.png',
    badge1: 'LIVE GCP CONSOLE CAPTURE 01 • 20/20 SIMULATION AUDIT LEDGER',
    cap1: 'Complete 20/20 security & migration telemetry across Patterns A, B & C in Cloud Logging',
    file2: 'pantheon_live_user_capture_ssh_verify.png',
    badge2: 'LIVE GCP CONSOLE CAPTURE 02 • PANTHEON LIVE VERIFICATION',
    cap2: 'Authentic Pantheon console & SSH runtime attestation across 3 Google Cloud projects',
    callouts: [
      {
        badge: 'PROOF 01 • 80/20 UNIFIED CODEBASE',
        title: '100% Identical 5-Hop Python Pipeline',
        body: 'runtime_pipeline.py executes unchanged across Pattern A Pool, Pattern B Silo, and Pattern C Hybrid PSC.',
      },
      {
        badge: 'PROOF 02 • MULTI-TENANT AGENTIC TRIAD',
        title: 'Shared + Private Agents + Dynamic GCS Skills',
        body: 'Combines Shared Diagnostic Agent with Tenant Private Agents and runtime GCS skill hot-swapping.',
      },
      {
        badge: 'PROOF 03 • ZERO-PII BIGQUERY FINOPS',
        title: 'SHA-256 Prompt Hashing & Token Chargeback',
        body: 'Logs cached vs. dynamic token counts and latency per tenant_id to BigQuery with zero raw PII text.',
      },
      {
        badge: 'PROOF 04 • COMPLETE 24-FILE WORKBENCH',
        title: 'Terraform 2.6 / 3.6 / 4.6 & 20/20 Test Suite',
        body: 'Ships production Terraform modules, ADK 2.0 runtime code, and 20/20 automated verification gates.',
      },
    ],
  },
};

function addLiveScreenshotCalloutSlide(pptx: Pptx, spec: DeckSpec): { shapes: number; connectors: number } {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  addHeaderBar(
    pptx,
    slide,
    spec.key,
    `${spec.label} • Grounded Google Cloud Console & Live Runtime Proof`,
    'LIVE-SCREENSHOT-CALLOUT'
  );

  const cfg = SCREENSHOT_CALLOUT_BY_WS[spec.key] || SCREENSHOT_CALLOUT_BY_WS.WS1;
  const shot1Path = path.join(FDE_BLOGS_ROOT, 'screenshots', 'cloud-console', cfg.file1);
  const shot2Path = path.join(FDE_BLOGS_ROOT, 'screenshots', 'cloud-console', cfg.file2);

  const shots = [
    {
      y: 0.82,
      path: shot1Path,
      fileName: cfg.file1,
      badge: cfg.badge1,
      caption: cfg.cap1,
      accent: GOOGLE_CARD_ACCENTS[0],
      verifyLines: [
        '• Project: nitinagga-ge-2 (#638420508320)',
        '• Sandbox: nitina-ggarwal-sandbox-647724',
        '• Status: 100% Live Console Verified (HTTP 200)',
        '• Aspect Ratio: Native 16:9 (1920×1080)',
      ],
    },
    {
      y: 3.84,
      path: shot2Path,
      fileName: cfg.file2,
      badge: cfg.badge2,
      caption: cfg.cap2,
      accent: GOOGLE_CARD_ACCENTS[1],
      verifyLines: [
        '• Audit Suite: 20/20 Runtime Simulations PASS',
        '• Forensic Gate: 12/12 Invariants Verified',
        '• Isolation: 0 Cross-Tenant Rows or Spans',
        '• Aspect Ratio: Native 16:9 (1920×1080)',
      ],
    },
  ];

  shots.forEach((sh) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.42,
      y: sh.y,
      w: 7.42,
      h: 2.86,
      rectRadius: 0.06,
      fill: { color: CARD_BG },
      line: { color: BORDER_GREY, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.42,
      y: sh.y,
      w: 7.42,
      h: 0.05,
      fill: { color: sh.accent.bar },
    });
    slide.addText(sh.badge, {
      x: 0.54,
      y: sh.y + 0.08,
      w: 7.18,
      h: 0.24,
      fontSize: 8.2,
      bold: true,
      color: sh.accent.text,
      fontFace: FONT_TITLE,
    });
    // Preserve true 16:9 aspect ratio (3.98" x 2.24" = 1.777:1) so console screenshots are never stretched
    if (fs.existsSync(sh.path)) {
      slide.addImage({
        data: fileToDataUri(sh.path),
        x: 0.54,
        y: sh.y + 0.38,
        w: 3.98,
        h: 2.24,
      });
    }
    // Companion editable verification metadata card on the right half of the 7.42" container
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 4.64,
      y: sh.y + 0.38,
      w: 3.06,
      h: 2.24,
      rectRadius: 0.05,
      fill: { color: WHITE },
      line: { color: BORDER_GREY, width: 0.8 },
    });
    slide.addText(sh.caption, {
      x: 4.74,
      y: sh.y + 0.46,
      w: 2.86,
      h: 0.72,
      fontSize: 8.6,
      bold: true,
      color: TEXT_DARK,
      fontFace: FONT_TITLE,
      valign: 'top',
      wrap: true,
    });
    slide.addText(sh.verifyLines.join('\n'), {
      x: 4.74,
      y: sh.y + 1.22,
      w: 2.86,
      h: 1.04,
      fontSize: 7.8,
      color: TEXT_BODY,
      fontFace: FONT_BODY,
      valign: 'top',
      wrap: true,
    });
    slide.addText(`Source: screenshots/cloud-console/${sh.fileName}`, {
      x: 4.74,
      y: sh.y + 2.32,
      w: 2.86,
      h: 0.22,
      fontSize: 6.8,
      color: TEXT_MUTED,
      fontFace: 'Courier New',
    });
  });

  cfg.callouts.forEach((c, idx) => {
    const cy = 0.82 + idx * 1.48;
    const acc = GOOGLE_CARD_ACCENTS[idx % 4];
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.04,
      y: cy,
      w: 4.86,
      h: 1.36,
      rectRadius: 0.08,
      fill: { color: CARD_BG },
      line: { color: BORDER_GREY, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 8.04,
      y: cy,
      w: 0.09,
      h: 1.36,
      fill: { color: acc.bar },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.24,
      y: cy + 0.10,
      w: 2.86,
      h: 0.24,
      rectRadius: 0.04,
      fill: { color: acc.tint },
    });
    slide.addText(c.badge, {
      x: 8.24,
      y: cy + 0.10,
      w: 2.86,
      h: 0.24,
      fontSize: 7.4,
      bold: true,
      color: acc.text,
      align: 'center',
      valign: 'middle',
      fontFace: FONT_TITLE,
    });
    slide.addText(c.title, {
      x: 8.24,
      y: cy + 0.38,
      w: 4.50,
      h: 0.30,
      fontSize: 10.5,
      bold: true,
      color: TEXT_DARK,
      fontFace: FONT_TITLE,
    });
    slide.addText(c.body, {
      x: 8.24,
      y: cy + 0.68,
      w: 4.50,
      h: 0.58,
      fontSize: 8.6,
      color: TEXT_BODY,
      fontFace: FONT_BODY,
      wrap: true,
    });
  });

  addFooter(
    pptx,
    slide,
    `${spec.label}  •  Grounded Google Cloud Console Screenshots + 100% Editable Callout Cards`
  );
  slide.addNotes(
    `[live-screenshot-callout] Authentic Google Cloud Console verification screenshots paired with 4 native editable callout cards for ${spec.label}.`
  );
  return { shapes: 18, connectors: 0 };
}

// ---------------------------------------------------------------------------------------------
// Deck assembly — Cohesive 3-Act, 14-Slide Executive Story Arc per Workstream (`WS1`..`WS5`)
//   Act I (Slides 1–4): Cover → Figure 1 Master Blueprint → Headline KPIs → Cloud Stack & Use Cases
//   Act II (Slides 5–8): 3-Zone Boundary → Payload Transformation → 5-Actor Sequence → 4-Node State Loop
//   Act III (Slides 9–14): Trade-Off Matrix → Deep-Dive Controls/FinOps → Live Console Proof →
//                          3-Phase Rollout Timeline → 3-Pillar Operating Model → Actionable Next Steps
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
  let totalVertices = 0;
  let totalEdges = 0;

  // =========================================================================
  // ACT I: EXECUTIVE CONTEXT, MASTER ARCHITECTURE & QUANTITATIVE OUTCOMES (Slides 1–4)
  // =========================================================================

  // Slide 1 (`title-cover`): Executive Cover & Architectural Thesis
  addTitleSlide(pptx, deck, spec);
  slideCount++;

  // Slide 2 (`decomposed-drawio-diagram`): Authoritative Figure 1 Official #78 Hub-and-Spoke Blueprint
  const primaryId = spec.diagramIds[0];
  const mPrimary = manifest.find((x) => x.id === primaryId);
  if (!mPrimary) throw new Error(`Diagram ${primaryId} missing from diagrams_manifest.json`);
  const djPrimary = deck.diagrams.find((d) => d.id === primaryId);
  const relDrawioPrimary = mPrimary.central_drawio_file || mPrimary.central_drawio || `diagrams/${mPrimary.id}.drawio`;
  const xmlPrimary = fs.readFileSync(path.join(FDE_BLOGS_ROOT, relDrawioPrimary), 'utf8');
  const pngPathPrimary = path.join(FDE_BLOGS_ROOT, mPrimary.central_drawio_png || `diagrams/${mPrimary.id}.drawio.png`);
  const masterImagePrimary = fs.existsSync(pngPathPrimary) ? fileToDataUri(pngPathPrimary) : undefined;
  const talkingPrimary = djPrimary?.talkingPoints?.length ? djPrimary.talkingPoints : [mPrimary.subtitle];

  const rDiag = await appendGoogleBrandedDiagramSlides(
    pptx,
    xmlPrimary,
    spec.key,
    'Figure 1',
    djPrimary?.title || mPrimary.title,
    `VIS-${mPrimary.id.toUpperCase()}`,
    masterImagePrimary,
    talkingPrimary,
    relDrawioPrimary,
    true // singleSlideOnly = true (Zero repetitive 8-box/8-row loop!)
  );
  totalVertices += rDiag.vertexCount;
  totalEdges += rDiag.edgeCount;
  slideCount += rDiag.slides;

  // Slide 3 (`quad-metrics`): Executive Impact & Verification Scorecard
  addQuadMetricsSlide(pptx, spec);
  totalVertices += 12;
  slideCount++;

  // Slide 4 (`three-pillar`): Google Cloud Product Stack & Competing Tenant Use Cases
  const cardSections = deck.sections.filter((s) => !s.layout || s.layout === 'cards');
  const tableSections = deck.sections.filter((s) => s.layout === 'table' && s.tableRows && s.tableRows.length > 0);
  const stackAndUseCasesSection: DeckSection = cardSections[0] || deck.sections[0];
  if (stackAndUseCasesSection) {
    addSectionSlideDispatch(pptx, spec.key, stackAndUseCasesSection, {
      footer: `${spec.label}  •  Google Cloud Product Stack & Enterprise Tenant Use Cases`,
    });
    slideCount++;
  }

  // =========================================================================
  // ACT II: DEEP-DIVE RUNTIME MECHANICS — BOUNDARIES, PAYLOADS, SEQUENCES & STATE LOOPS (Slides 5–8)
  // =========================================================================

  // Slide 5 (`architecture-zone-topology`): 3-Zone Physical & Logical Boundary Topology
  const rZone = addArchitectureZoneTopologySlide(pptx, spec);
  totalVertices += rZone.shapes;
  totalEdges += rZone.connectors;
  slideCount++;

  // Slide 6 (`payload-transformation-triptych`): 3-Stage Wire Payload & Context Transformation
  const rPayload = addPayloadTransformationTriptychSlide(pptx, spec);
  totalVertices += rPayload.shapes;
  totalEdges += rPayload.connectors;
  slideCount++;

  // Slide 7 (`uml-sequence-swimlane`): 5-Actor Chronological UML Sequence Lifeline (Steps 1–6)
  const rUml = addUmlSequenceSwimlaneSlide(pptx, spec);
  totalVertices += rUml.shapes;
  totalEdges += rUml.connectors;
  slideCount++;

  // Slide 8 (`async-state-flow-pipeline`): 4-Node State & Closed-Loop Governance Pipeline (Steps 1–5)
  const rPipe = addAsyncStateFlowPipelineSlide(pptx, spec);
  totalVertices += rPipe.shapes;
  totalEdges += rPipe.connectors;
  slideCount++;

  // =========================================================================
  // ACT III: TRADE-OFF MATRICES, LIVE CLOUD PROOF, ROLLOUT ROADMAP & GOVERNANCE (Slides 9–14)
  // =========================================================================

  // Slide 9 (`comparison-grid`): Primary Architectural Trade-Off & Security Verification Matrix
  const primaryMatrixSection = tableSections[0] || deck.sections.find((s) => s !== stackAndUseCasesSection);
  if (primaryMatrixSection) {
    addSectionSlideDispatch(pptx, spec.key, primaryMatrixSection, {
      footer: `${spec.label}  •  Side-by-Side Architectural Trade-Off & Security Verification Matrix`,
    });
    slideCount++;
  }

  // Slide 10 (`comparison-grid` / `three-pillar`): Secondary Deep-Dive (GAP-01..05 / Terraform / FinOps)
  const secondaryDeepDiveSection =
    tableSections[1] || cardSections[2] || cardSections[1];
  if (secondaryDeepDiveSection && secondaryDeepDiveSection !== primaryMatrixSection && secondaryDeepDiveSection !== stackAndUseCasesSection) {
    addSectionSlideDispatch(pptx, spec.key, secondaryDeepDiveSection, {
      footer: `${spec.label}  •  Compensating Controls, Terraform Blueprint & FinOps Economics`,
    });
    slideCount++;
  }

  // Slide 11 (`live-screenshot-callout`): Grounded Google Cloud Console & Live Runtime Proof
  const rShots = addLiveScreenshotCalloutSlide(pptx, spec);
  totalVertices += rShots.shapes;
  slideCount++;

  // Slide 12 (`phased-roadmap-timeline`): 3-Phase Connected Implementation & Rollout Timeline
  const rRoadmap = addPhasedRoadmapTimelineSlide(pptx, spec);
  totalVertices += rRoadmap.shapes;
  totalEdges += rRoadmap.connectors;
  slideCount++;

  // Slide 13 (`strategic-operating-model-pillars`): 3-Pillar Strategic Operating Model & SLA Governance
  const rOpModel = addStrategicOperatingModelPillarsSlide(pptx, spec);
  totalVertices += rOpModel.shapes;
  slideCount++;

  // Slide 14 (`next-steps`): What's Next — Sequenced Engineering Action Plan & Owners
  if (deck.takeaways.length) {
    addBulletSlide(pptx, spec.key, "What's next — Series Navigation & Engineering Deliverables", deck.takeaways, {
      footer: deck.callToAction,
      accent: G_BLUE_DARK,
      isTakeaways: true,
      specs: deck.takeawaySpecs,
    });
    slideCount++;
  }

  const outPath = path.join(SLIDES_DIR, spec.fileName);
  await pptx.writeFile({ fileName: outPath });
  const bytes = fs.statSync(outPath).size;
  console.log(
    `   ✅ ${spec.key} → slides/${spec.fileName}  (${slideCount} slides [3-Act Cohesive Story Arc], ${totalVertices} editable shapes, ${totalEdges} connectors, ${Math.round(bytes / 1024)} KB)`
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
    narrative: '3-Act Cohesive Executive Story Arc (slide-design v3.0)',
  };
}

async function buildCombinedDeck(manifest: ManifestItem[]) {
  const deck: DeckJson = {
    workstream: 'ALL',
    deckTitle: 'Google Cloud Multi-Tenant Agentic AI: Pooled, Sovereign Silos & Hybrid — Complete Program Deck',
    deckSubtitle:
      'Cohesive 5-Workstream Executive Program Deck: Reference Taxonomy (WS1), Pooled Pattern A (WS2), Sovereign Silos Pattern B (WS3), Hybrid PSC Pattern C (WS4) & Decision Guide (WS5)',
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
      'Complete 5-Workstream Google Cloud Architecture Center Program Deck — 100% Native Editable Shapes & Verified Live Telemetry.',
  };
  const pptx = newDeck(deck.deckTitle);
  let slideCount = 0;

  // Slide 1 (`title-cover`): Program Executive Cover
  addTitleSlide(pptx, deck, null);
  slideCount++;

  // Slide 2 (`quad-metrics`): Program-Wide Executive KPI Scorecard
  addQuadMetricsSlide(pptx, DECKS[0]);
  slideCount++;

  // Slide 3 (`three-pillar`): Program Map across Workstreams 1–5
  addBulletSlide(pptx, 'PROGRAM', 'Program Map • Workstreams 1–5 Cohesive Architecture Progression', deck.tldr, {
    footer: deck.callToAction,
  });
  slideCount++;

  const allIds: string[] = [];
  for (let wIdx = 0; wIdx < DECKS.length; wIdx++) {
    const spec = DECKS[wIdx];
    const deckJsonPath = path.join(FDE_BLOGS_ROOT, spec.deckJsonFile);
    const wsDeck: DeckJson = fs.existsSync(deckJsonPath) ? readJson<DeckJson>(deckJsonPath) : fallbackDeckJson(spec, manifest);

    // 1. Workstream Section Divider
    addSectionDivider(pptx, spec.key, wsDeck.deckTitle, wsDeck.deckSubtitle);
    slideCount++;

    // 2. Workstream Authoritative Figure 1 Blueprint (Single Editable Slide + 4-Zone Sidebar)
    const primaryId = spec.diagramIds[0];
    const m = manifest.find((x) => x.id === primaryId)!;
    const dj = wsDeck.diagrams.find((d) => d.id === primaryId);
    const relDrawio = m.central_drawio_file || m.central_drawio || `diagrams/${m.id}.drawio`;
    const xml = fs.readFileSync(path.join(FDE_BLOGS_ROOT, relDrawio), 'utf8');
    const pngPath = path.join(FDE_BLOGS_ROOT, m.central_drawio_png || `diagrams/${m.id}.drawio.png`);
    const masterImageSrc = fs.existsSync(pngPath) ? fileToDataUri(pngPath) : undefined;
    const talking = dj?.talkingPoints?.length ? dj.talkingPoints : [m.subtitle];

    const r = await appendGoogleBrandedDiagramSlides(
      pptx,
      xml,
      spec.key,
      'Figure 1',
      dj?.title || m.title,
      `VIS-${m.id.toUpperCase()}`,
      masterImageSrc,
      talking,
      relDrawio,
      true // singleSlideOnly = true
    );
    slideCount += r.slides;
    for (const id of spec.diagramIds) allIds.push(id);

    // 3. Workstream Signature Visual Archetype Slide (weaving all visual skills across WS1..WS5!)
    if (spec.key === 'WS1') {
      addArchitectureZoneTopologySlide(pptx, spec);
      slideCount++;
    } else if (spec.key === 'WS2') {
      addPayloadTransformationTriptychSlide(pptx, spec);
      slideCount++;
    } else if (spec.key === 'WS3') {
      addUmlSequenceSwimlaneSlide(pptx, spec);
      slideCount++;
    } else if (spec.key === 'WS4') {
      addAsyncStateFlowPipelineSlide(pptx, spec);
      slideCount++;
    } else if (spec.key === 'WS5') {
      addPhasedRoadmapTimelineSlide(pptx, spec);
      slideCount++;
    }

    // 4. Workstream Primary Verification / Comparison Matrix Slide
    const wsTable = wsDeck.sections.find((s) => s.layout === 'table' && s.tableRows && s.tableRows.length > 0);
    if (wsTable) {
      addSectionSlideDispatch(pptx, spec.key, wsTable, {
        footer: `${spec.label}  •  Verification & Trade-Off Matrix`,
      });
      slideCount++;
    }
  }

  // Capstone Program Slides: Strategic Operating Model + Live Cloud Console Proof + Blueprint Lineage Index
  addStrategicOperatingModelPillarsSlide(pptx, DECKS[4]);
  slideCount++;
  addLiveScreenshotCalloutSlide(pptx, DECKS[0]);
  slideCount++;
  addAssetsSlide(pptx, null, deck, manifest, allIds);
  slideCount++;

  const outPath = path.join(SLIDES_DIR, COMBINED_FILE);
  await pptx.writeFile({ fileName: outPath });
  const bytes = fs.statSync(outPath).size;
  console.log(`   ✅ ALL → slides/${COMBINED_FILE}  (${slideCount} slides [Cohesive Master Program Deck], ${allIds.length} diagrams indexed, ${Math.round(bytes / 1024)} KB)`);
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
      'PromptCanvas Vision Decompiler • Google Cloud Architecture Center 3-Act Cohesive Story Arc • pptxgenjs LAYOUT_WIDE 16:9',
    decks: results,
  };
  fs.writeFileSync(path.join(SLIDES_DIR, 'slides_manifest.json'), JSON.stringify(slidesManifest, null, 2), 'utf8');
  console.log(`\n🎉 ${results.length} Google Cloud Architecture Center decks written to slides/ (manifest: slides/slides_manifest.json)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
