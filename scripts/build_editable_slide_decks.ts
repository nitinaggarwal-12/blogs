/**
 * 🎞️ PromptCanvas Vision Module — Editable Workstream Slide Deck Builder
 *
 * For every workstream (WS1..WS5) and for the combined program deck, compiles a 100% editable
 * PowerPoint / Google Slides (.pptx) deck:
 *   • Title + Executive TL;DR + narrative section slides (from blogs/<slug>.deck.json)
 *   • For EVERY architecture diagram of the workstream (PromptCanvas Vision Draw.io XML):
 *       1. 1:1 Master High-Resolution slide (Draw.io-rendered .drawio.png)
 *       2. 100% Decomposed Native Editable Vector Shapes, Icons & Connectors slide
 *          (every container, card, badge, icon, arrow is a native PowerPoint shape)
 *          + right-hand talking-points sidebar + speaker notes
 *       3. Architectural Component Specification Table slide
 *   • Key Takeaways + Assets slides
 *
 * Powered by PromptCanvas `appendEditableDrawioSlides` (src/lib/export/editablePptxCompiler.ts).
 *
 * Run:
 *   npx --prefix /Users/nitinagga/Documents/PromptCanvas tsx \
 *     --tsconfig /Users/nitinagga/Documents/PromptCanvas/tsconfig.json \
 *     scripts/build_editable_slide_decks.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

import { appendEditableDrawioSlides } from '../../PromptCanvas/src/lib/export/editablePptxCompiler';

const requireFromPromptCanvas = createRequire('/Users/nitinagga/Documents/PromptCanvas/package.json');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PptxGenJS: any = requireFromPromptCanvas('pptxgenjs');

const FDE_BLOGS_ROOT = path.resolve(__dirname, '..');
const DIAGRAMS_DIR = path.join(FDE_BLOGS_ROOT, 'diagrams');
const SLIDES_DIR = path.join(FDE_BLOGS_ROOT, 'slides');
const MANIFEST_PATH = path.join(DIAGRAMS_DIR, 'diagrams_manifest.json');

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const HEADER_H = 0.52;

const NAVY = '0F172A';
const SLATE = '1E293B';
const SKY = '38BDF8';
const GOOGLE_BLUE = '1A73E8';
const TEXT_DARK = '0F172A';
const TEXT_MUTED = '475569';
const PAPER = 'F8FAFC';
const WHITE = 'FFFFFF';
const SERIES_LINE = 'Multi-Tenant Agentic AI on Google Cloud • Gemini Enterprise Agent Platform (GEAP) & ADK 2.0';
const ARCH_CENTER = 'https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system';

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
    diagramIds: ['ws2-pattern-a-pooled-5hop-architecture', 'ws2-pattern-a-breach-defense-sequence'],
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
    diagramIds: ['ws3-pattern-b-sovereign-silos-architecture'],
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
    diagramIds: ['ws4-pattern-c-hybrid-psc-and-migration'],
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

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

function fileToDataUri(absPath: string): string {
  const buf = fs.readFileSync(absPath);
  return `data:image/png;base64,${buf.toString('base64')}`;
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
// Slide primitives
// ---------------------------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pptx = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Slide = any;

function addHeaderBar(pptx: Pptx, slide: Slide, kicker: string, title: string) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SLIDE_W, h: HEADER_H, fill: { color: NAVY } });
  slide.addText(
    [
      { text: `${kicker.toUpperCase()} `, options: { fontSize: 12, bold: true, color: SKY } },
      { text: `|  ${title}`, options: { fontSize: 9.5, color: 'E2E8F0' } },
    ],
    { x: 0.35, y: 0.08, w: SLIDE_W - 0.7, h: 0.36, valign: 'middle', fontFace: 'Arial' }
  );
}

function addFooter(slide: Slide, text: string) {
  slide.addText(text, {
    x: 0.35,
    y: SLIDE_H - 0.34,
    w: SLIDE_W - 0.7,
    h: 0.24,
    fontSize: 8,
    color: '94A3B8',
    fontFace: 'Arial',
    align: 'left',
    valign: 'middle',
  });
}

function addTitleSlide(pptx: Pptx, deck: DeckJson, spec: DeckSpec | null) {
  const slide = pptx.addSlide();
  slide.background = { color: NAVY };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.28, h: SLIDE_H, fill: { color: GOOGLE_BLUE } });
  slide.addText(spec ? spec.label.toUpperCase() : 'COMPLETE PROGRAM DECK • WORKSTREAMS 1–5', {
    x: 0.8,
    y: 0.9,
    w: SLIDE_W - 1.6,
    h: 0.4,
    fontSize: 12,
    bold: true,
    color: SKY,
    fontFace: 'Arial',
  });
  slide.addText(deck.deckTitle, {
    x: 0.8,
    y: 1.5,
    w: SLIDE_W - 1.6,
    h: 2.1,
    fontSize: 32,
    bold: true,
    color: WHITE,
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  });
  slide.addText(deck.deckSubtitle, {
    x: 0.8,
    y: 3.7,
    w: SLIDE_W - 1.6,
    h: 1.2,
    fontSize: 16,
    color: 'CBD5E1',
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  });
  slide.addText(
    [
      { text: SERIES_LINE, options: { fontSize: 11, color: '94A3B8', breakLine: true } },
      {
        text: 'Every diagram slide is 100% native editable (PromptCanvas Vision Decompiler → Draw.io → PowerPoint / Google Slides)',
        options: { fontSize: 11, color: '94A3B8', breakLine: true },
      },
      { text: `Anchor reference: ${ARCH_CENTER}`, options: { fontSize: 10, color: '64748B' } },
    ],
    { x: 0.8, y: 5.6, w: SLIDE_W - 1.6, h: 1.2, fontFace: 'Arial', valign: 'top' }
  );
  slide.addNotes(`${deck.deckTitle}\n\n${deck.deckSubtitle}\n\nSeries: ${SERIES_LINE}`);
  return slide;
}

function addBulletSlide(
  pptx: Pptx,
  kicker: string,
  heading: string,
  bullets: string[],
  opts: { notes?: string; footer?: string; accent?: string } = {}
) {
  const slide = pptx.addSlide();
  slide.background = { color: PAPER };
  addHeaderBar(pptx, slide, kicker, heading);
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.45,
    y: HEADER_H + 0.35,
    w: 0.08,
    h: 0.55,
    fill: { color: opts.accent || GOOGLE_BLUE },
  });
  slide.addText(heading, {
    x: 0.7,
    y: HEADER_H + 0.3,
    w: SLIDE_W - 1.4,
    h: 0.65,
    fontSize: 22,
    bold: true,
    color: TEXT_DARK,
    fontFace: 'Arial',
    valign: 'middle',
  });
  const runs = bullets.map((b) => ({
    text: b,
    options: {
      bullet: { code: '25A0' },
      fontSize: bullets.length > 4 ? 13 : 14,
      color: SLATE,
      paraSpaceAfter: 8,
      breakLine: true,
    },
  }));
  slide.addText(runs, {
    x: 0.7,
    y: HEADER_H + 1.1,
    w: SLIDE_W - 1.4,
    h: SLIDE_H - HEADER_H - 1.7,
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  });
  addFooter(slide, opts.footer || SERIES_LINE);
  slide.addNotes(opts.notes || `${heading}\n\n${bullets.map((b) => `• ${b}`).join('\n')}`);
  return slide;
}

function addSectionDivider(pptx: Pptx, kicker: string, heading: string, sub: string) {
  const slide = pptx.addSlide();
  slide.background = { color: SLATE };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.28, h: SLIDE_H, fill: { color: SKY } });
  slide.addText(kicker.toUpperCase(), {
    x: 0.8, y: 2.2, w: SLIDE_W - 1.6, h: 0.4, fontSize: 12, bold: true, color: SKY, fontFace: 'Arial',
  });
  slide.addText(heading, {
    x: 0.8, y: 2.7, w: SLIDE_W - 1.6, h: 1.4, fontSize: 30, bold: true, color: WHITE, fontFace: 'Arial', valign: 'top', wrap: true,
  });
  slide.addText(sub, {
    x: 0.8, y: 4.2, w: SLIDE_W - 1.6, h: 1.2, fontSize: 15, color: 'CBD5E1', fontFace: 'Arial', valign: 'top', wrap: true,
  });
  slide.addNotes(`${heading}\n${sub}`);
  return slide;
}

function addAssetsSlide(pptx: Pptx, spec: DeckSpec | null, deck: DeckJson, manifest: ManifestItem[], diagramIds: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[][] = [
    [
      { text: 'Diagram', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 9 } },
      { text: 'Editable Draw.io', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 9 } },
      { text: 'Draw.io Render', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 9 } },
      { text: 'Vision AST', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 9 } },
    ],
  ];
  for (const id of diagramIds) {
    const m = manifest.find((x) => x.id === id);
    if (!m) continue;
    rows.push([
      { text: `${m.badge}\n${m.title}`, options: { fontSize: 8, color: TEXT_DARK, bold: true } },
      { text: `diagrams/${id}.drawio`, options: { fontSize: 8, color: GOOGLE_BLUE } },
      { text: `diagrams/${id}.drawio.png`, options: { fontSize: 8, color: GOOGLE_BLUE } },
      { text: `diagrams/vision_metadata/${id}.vision.json`, options: { fontSize: 8, color: GOOGLE_BLUE } },
    ]);
  }
  const slide = pptx.addSlide();
  slide.background = { color: PAPER };
  addHeaderBar(pptx, slide, spec ? spec.key : 'PROGRAM', 'Assets, Editable Diagrams & Source Documents');
  slide.addText('Assets & Editable Diagrams', {
    x: 0.7, y: HEADER_H + 0.25, w: SLIDE_W - 1.4, h: 0.5, fontSize: 20, bold: true, color: TEXT_DARK, fontFace: 'Arial',
  });
  slide.addTable(rows, {
    x: 0.5,
    y: HEADER_H + 0.85,
    w: SLIDE_W - 1.0,
    colW: [4.0, 3.2, 3.2, 1.933],
    border: { type: 'solid', color: 'CBD5E1', pt: 0.5 },
    fill: { color: WHITE },
    fontFace: 'Arial',
  });
  const links: string[] = [];
  if (spec) {
    links.push(`Blog: ${spec.blogFile}`);
    spec.sourceDocs.forEach((d) => links.push(`Source: ${d}`));
  } else {
    DECKS.forEach((d) => links.push(`Blog: ${d.blogFile}  •  Deck: slides/${d.fileName}`));
  }
  links.push(`Anchor reference: ${ARCH_CENTER}`);
  links.push('GitHub: https://github.com/nitinaggarwal-12/blogs');
  slide.addText(
    links.map((l) => ({ text: l, options: { fontSize: 10, color: TEXT_MUTED, breakLine: true } })),
    { x: 0.7, y: SLIDE_H - 2.35, w: SLIDE_W - 1.4, h: 1.9, fontFace: 'Arial', valign: 'top' }
  );
  slide.addNotes(deck.callToAction);
  return slide;
}

// ---------------------------------------------------------------------------------------------
// Diagram slide set (PromptCanvas Vision editable compiler)
// ---------------------------------------------------------------------------------------------
async function addDiagramSlideSet(
  pptx: Pptx,
  m: ManifestItem,
  dj: DeckDiagram | undefined,
  figureLabel: string
): Promise<{ vertexCount: number; edgeCount: number; slides: number }> {
  const xmlPath = path.join(FDE_BLOGS_ROOT, m.central_drawio_file || m.central_drawio || `diagrams/${m.id}.drawio`);
  const pngPath = path.join(FDE_BLOGS_ROOT, m.central_drawio_png || `diagrams/${m.id}.drawio.png`);
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const masterImageSrc = fs.existsSync(pngPath) ? fileToDataUri(pngPath) : undefined;

  // Diagram occupies the left ~45% of the decomposed slide (uniform scale, portrait-safe);
  // the right side hosts the narrative talking points so the deck reads like the blog.
  const diagramRegion = { x: 0.25, y: HEADER_H + 0.14, w: 5.95, h: SLIDE_H - HEADER_H - 0.28 };
  const diagramName = `${figureLabel} — ${dj?.title || m.title}`;

  const result = await appendEditableDrawioSlides(pptx, xml, diagramName, `VIS-${m.id.toUpperCase()}`, {
    masterImageSrc,
    uniformScale: true,
    contentRect: diagramRegion,
    edgesBelowVertices: true,
    includeMasterSlide: true,
    includeSpecTableSlide: true,
  });

  const talking = dj?.talkingPoints?.length ? dj.talkingPoints : [m.subtitle];
  const sidebarX = diagramRegion.x + diagramRegion.w + 0.3;
  const sidebarW = SLIDE_W - sidebarX - 0.35;

  const es = result.editableSlide;
  es.addShape(pptx.ShapeType.roundRect, {
    x: sidebarX,
    y: HEADER_H + 0.25,
    w: sidebarW,
    h: SLIDE_H - HEADER_H - 0.75,
    rectRadius: 0.08,
    fill: { color: PAPER },
    line: { color: 'CBD5E1', width: 0.75 },
  });
  es.addText(figureLabel.toUpperCase(), {
    x: sidebarX + 0.25, y: HEADER_H + 0.4, w: sidebarW - 0.5, h: 0.3, fontSize: 10, bold: true, color: GOOGLE_BLUE, fontFace: 'Arial',
  });
  es.addText(dj?.title || m.title, {
    x: sidebarX + 0.25, y: HEADER_H + 0.7, w: sidebarW - 0.5, h: 0.95, fontSize: 15, bold: true, color: TEXT_DARK, fontFace: 'Arial', valign: 'top', wrap: true,
  });
  es.addText(
    talking.map((t) => ({
      text: t,
      options: { bullet: { code: '25A0' }, fontSize: 11, color: SLATE, paraSpaceAfter: 7, breakLine: true },
    })),
    { x: sidebarX + 0.25, y: HEADER_H + 1.7, w: sidebarW - 0.5, h: SLIDE_H - HEADER_H - 3.0, fontFace: 'Arial', valign: 'top', wrap: true }
  );
  es.addText(
    [
      { text: `${result.vertexCount} native shapes • ${result.edgeCount} connectors • `, options: { fontSize: 8.5, color: TEXT_MUTED } },
      { text: 'click any box, icon or arrow to edit', options: { fontSize: 8.5, color: TEXT_MUTED, italic: true } },
    ],
    { x: sidebarX + 0.25, y: SLIDE_H - 1.15, w: sidebarW - 0.5, h: 0.3, fontFace: 'Arial' }
  );
  es.addText(
    `Zones: Routing hub • Central governance & security hub • Left spoke • Right spoke  |  Source: diagrams/${m.id}.drawio`,
    { x: sidebarX + 0.25, y: SLIDE_H - 0.85, w: sidebarW - 0.5, h: 0.3, fontSize: 7.5, color: '94A3B8', fontFace: 'Arial' }
  );

  const notes = `${figureLabel} — ${dj?.title || m.title}\n${m.subtitle}\n\n${talking.map((t) => `• ${t}`).join('\n')}\n\nEditable source: diagrams/${m.id}.drawio (PromptCanvas Vision Decompiler)`;
  es.addNotes(notes);
  if (result.masterSlide) result.masterSlide.addNotes(notes);
  if (result.tableSlide) result.tableSlide.addNotes(`${figureLabel} component inventory for ${dj?.title || m.title}`);

  return {
    vertexCount: result.vertexCount,
    edgeCount: result.edgeCount,
    slides: 1 + (result.masterSlide ? 1 : 0) + (result.tableSlide ? 1 : 0),
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
  addTitleSlide(pptx, deck, spec);
  slideCount++;

  addBulletSlide(pptx, spec.key, 'Executive TL;DR', deck.tldr, { footer: `${spec.label} • ${SERIES_LINE}` });
  slideCount++;

  for (const section of deck.sections) {
    addBulletSlide(pptx, spec.key, section.heading, section.bullets, { footer: `${spec.label}` });
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
    const r = await addDiagramSlideSet(pptx, m, dj, figureLabel);
    totalVertices += r.vertexCount;
    totalEdges += r.edgeCount;
    slideCount += r.slides;
  }

  if (deck.takeaways.length) {
    addBulletSlide(pptx, spec.key, 'Key Takeaways', deck.takeaways, { footer: deck.callToAction, accent: '34A853' });
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
    deckSubtitle: 'All 7 Google Cloud Architecture Center blueprints across Workstreams 1–5 as 100% editable slides',
    tldr: DECKS.map((d) => d.label),
    sections: [],
    diagrams: [],
    takeaways: [],
    callToAction: 'See blogs/ for the full explanatory articles and slides/ for per-workstream decks.',
  };
  const pptx = newDeck(deck.deckTitle);
  let slideCount = 0;
  addTitleSlide(pptx, deck, null);
  slideCount++;
  addBulletSlide(pptx, 'PROGRAM', 'Program Map • Workstreams 1–5', deck.tldr);
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
      const r = await addDiagramSlideSet(pptx, m, dj, dj?.figure || `Figure ${i + 1}`);
      slideCount += r.slides;
      allIds.push(id);
    }
    if (wsDeck.takeaways.length) {
      addBulletSlide(pptx, spec.key, 'Key Takeaways', wsDeck.takeaways, { footer: wsDeck.callToAction, accent: '34A853' });
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

async function main() {
  console.log('🎞️  PromptCanvas Vision Module — Building 100% editable workstream slide decks...');
  fs.mkdirSync(SLIDES_DIR, { recursive: true });
  const manifest = readJson<ManifestItem[]>(MANIFEST_PATH);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];
  for (const spec of DECKS) {
    results.push(await buildWorkstreamDeck(spec, manifest));
  }
  results.push(await buildCombinedDeck(manifest));

  const slidesManifest = {
    generatedAt: new Date().toISOString(),
    engine:
      'PromptCanvas Vision Decompiler • appendEditableDrawioSlides (src/lib/export/editablePptxCompiler.ts) • pptxgenjs LAYOUT_WIDE 16:9',
    decks: results,
  };
  fs.writeFileSync(path.join(SLIDES_DIR, 'slides_manifest.json'), JSON.stringify(slidesManifest, null, 2), 'utf8');
  console.log(`\n🎉 ${results.length} decks written to slides/ (manifest: slides/slides_manifest.json)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
