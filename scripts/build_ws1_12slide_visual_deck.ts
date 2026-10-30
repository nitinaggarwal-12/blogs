import * as fs from 'fs';
import * as path from 'path';
import {
  newDeck,
  appendGoogleBrandedDiagramSlides,
  addArchitectureZoneTopologySlide,
  addUmlSequenceSwimlaneSlide,
  addPayloadTransformationTriptychSlide,
  DECKS,
  addHeaderBar,
  addFooter,
  PptxGenJS,
  SLIDE_W,
  SLIDE_H,
  HEADER_H,
  RIBBON_H,
  G_BLUE,
  G_BLUE_DEEP,
  G_BLUE_TINT,
  G_RED,
  G_RED_TINT,
  G_YELLOW,
  G_YELLOW_TINT,
  G_GREEN,
  G_GREEN_TINT,
  WHITE,
  CARD_BG,
  BORDER_GREY,
  BORDER_LIGHT,
  TEXT_DARK,
  TEXT_BODY,
  TEXT_MUTED,
  FONT_TITLE,
  FONT_BODY,
  FONT_DISPLAY,
  postProcessPptxArrowheadsForGoogleSlides,
} from './build_editable_slide_decks';

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_PPTX = path.join(ROOT_DIR, 'slides', 'ws1-12slide-visual-deck.pptx');

const pptx = newDeck('Multi-Tenant Agentic AI on Google Cloud: 100% Editable Visual Architecture');

// Reusable Palette for Deck
const G_NAVY = '0F172A';
const G_GREY_BG = 'F8F9FA';
const G_GREY_BORDER = 'DADCE0';
const G_BLUE_LIGHT = 'E8F0FE';
const G_BLUE_DARK = '0D47A1';
const G_RED_LIGHT = 'FCE8E6';
const G_RED_DEEP = 'C5221F';
const G_YELLOW_LIGHT = 'FEF7E0';
const G_GREEN_LIGHT = 'E6F4EA';
const G_GREEN_DEEP = '137333';
const G_AMBER_DEEP = 'B45309';

const TOTAL_SLIDES = 31;

function addHeader(slide: any, category: string, title: string, slideNum: number, totalSlides: number = TOTAL_SLIDES) {
  // Category Pill
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 0.35, w: 2.3, h: 0.3, rectRadius: 0.05,
    fill: { color: G_BLUE_LIGHT }, line: { color: G_BLUE, width: 1 }
  });
  slide.addText(category, {
    x: 0.6, y: 0.35, w: 2.3, h: 0.3,
    fontSize: 9, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
  });

  // Slide Title
  slide.addText(title, {
    x: 3.1, y: 0.28, w: 9.5, h: 0.45,
    fontSize: 17, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, valign: 'middle'
  });

  // Top Accent Line
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 0.75, w: 12.133, h: 0.02, fill: { color: G_GREY_BORDER }
  });

  // Footer
  slide.addText('Google Cloud Architecture Center  •  Workstream 1 of 5  •  Multi-Tenant Agentic AI System (100% Editable DrawingML)', {
    x: 0.6, y: 7.1, w: 10.5, h: 0.3, fontSize: 8.5, color: TEXT_MUTED, fontFace: FONT_BODY
  });
  slide.addText(`${slideNum} / ${totalSlides}`, {
    x: 11.5, y: 7.1, w: 1.233, h: 0.3, fontSize: 8.5, bold: true, color: G_BLUE, fontFace: FONT_TITLE, align: 'right'
  });
}

// Reusable Act Breaker Slide Builder
interface ActBreakerConfig {
  slideNum: number;
  actTag: string;
  actNumber: string;
  actTitle: string;
  actSubtitle: string;
  actColor: string;
  actTint: string;
  coreQuestion: string;
  thesis: string;
  milestones: Array<{
    num: string;
    title: string;
    desc: string;
    deliverable: string;
  }>;
}

function buildActBreakerSlide(cfg: ActBreakerConfig) {
  const slide = pptx.addSlide();
  addHeader(slide, cfg.actTag, `${cfg.actNumber}: ${cfg.actTitle}`, cfg.slideNum);

  slide.addText(cfg.actSubtitle, {
    x: 0.6, y: 0.85, w: 12.133, h: 0.38, fontSize: 10.5, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  // Left Hero Card
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 1.35, w: 4.3, h: 5.5, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: cfg.actColor, width: 2 }
  });

  // Hero Card Top Banner
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 1.35, w: 4.3, h: 1.3, fill: { color: cfg.actTint }
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.85, y: 1.55, w: 1.8, h: 0.32, rectRadius: 0.05,
    fill: { color: WHITE }, line: { color: cfg.actColor, width: 1 }
  });
  slide.addText(cfg.actNumber, {
    x: 0.85, y: 1.55, w: 1.8, h: 0.32,
    fontSize: 10, bold: true, color: cfg.actColor, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
  });

  slide.addText(cfg.actTitle, {
    x: 0.85, y: 1.95, w: 3.8, h: 0.6,
    fontSize: 15, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
  });

  // Core Question Box
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.85, y: 2.8, w: 3.8, h: 1.95, rectRadius: 0.06,
    fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.75 }
  });
  slide.addText('CORE STRATEGIC MANDATE & KEY QUESTION', {
    x: 1.0, y: 2.92, w: 3.5, h: 0.25, fontSize: 8.0, bold: true, color: cfg.actColor, fontFace: FONT_TITLE
  });
  slide.addText(cfg.coreQuestion, {
    x: 1.0, y: 3.22, w: 3.5, h: 1.4, fontSize: 9.2, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.25
  });

  // Strategic Thesis Box
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.85, y: 4.9, w: 3.8, h: 1.75, rectRadius: 0.06,
    fill: { color: WHITE }, line: { color: G_GREY_BORDER, width: 0.75 }
  });
  slide.addText('ARCHITECTURAL THESIS', {
    x: 1.0, y: 5.02, w: 3.5, h: 0.22, fontSize: 8.0, bold: true, color: TEXT_MUTED, fontFace: FONT_TITLE
  });
  slide.addText(cfg.thesis, {
    x: 1.0, y: 5.28, w: 3.5, h: 1.25, fontSize: 8.8, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
  });

  // Right Milestone Cards (4 Stacked Rows)
  cfg.milestones.forEach((m, idx) => {
    const my = 1.35 + idx * 1.4;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.15, y: my, w: 7.58, h: 1.25, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: G_GREY_BORDER, width: 1 }
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.35, y: my + 0.18, w: 0.65, h: 0.88, rectRadius: 0.06,
      fill: { color: cfg.actTint }, line: { color: cfg.actColor, width: 1 }
    });
    slide.addText(m.num, {
      x: 5.35, y: my + 0.18, w: 0.65, h: 0.88,
      fontSize: 14, bold: true, color: cfg.actColor, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
    });

    slide.addText(m.title, {
      x: 6.2, y: my + 0.18, w: 4.5, h: 0.32,
      fontSize: 11, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
    });
    slide.addText(m.desc, {
      x: 6.2, y: my + 0.52, w: 4.8, h: 0.58,
      fontSize: 8.5, color: TEXT_MUTED, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
    });

    // Deliverable Tag on Right
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 11.1, y: my + 0.35, w: 1.45, h: 0.55, rectRadius: 0.05,
      fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
    });
    slide.addText(m.deliverable, {
      x: 11.1, y: my + 0.35, w: 1.45, h: 0.55,
      fontSize: 7.5, bold: true, color: cfg.actColor, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
    });
  });
}

// ============================================================================
// SLIDE 01: Title & Strategic Vision
// ============================================================================
function buildSlide01() {
  const slide = pptx.addSlide();
  
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 4.8, h: 7.5, fill: { color: G_NAVY }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 4.8, y: 0, w: 0.12, h: 7.5, fill: { color: G_YELLOW }
  });

  slide.addText('GOOGLE CLOUD\nARCHITECTURE CENTER', {
    x: 0.6, y: 0.8, w: 3.8, h: 0.8,
    fontSize: 16, bold: true, color: WHITE, fontFace: FONT_TITLE, lineSpacingMultiple: 1.1
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 1.8, w: 1.8, h: 0.04, fill: { color: G_BLUE }
  });

  slide.addText('REFERENCE ARCHITECTURE & TAXONOMY', {
    x: 0.6, y: 2.2, w: 3.8, h: 0.4,
    fontSize: 10, bold: true, color: G_YELLOW, fontFace: FONT_TITLE
  });
  slide.addText('A production blueprint and cryptographic 5-Hop pipeline to govern multi-tenant agentic AI platforms serving enterprise B2B SaaS tenants from a unified codebase.', {
    x: 0.6, y: 2.7, w: 3.8, h: 2.0,
    fontSize: 11, color: 'CBD5E1', fontFace: FONT_BODY, lineSpacingMultiple: 1.3
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 5.6, w: 3.6, h: 0.45, rectRadius: 0.05,
    fill: { color: '1E293B' }, line: { color: '334155', width: 1 }
  });
  slide.addText('✔ 100% Native Editable DrawingML  •  PUBLISH READY', {
    x: 0.6, y: 5.6, w: 3.6, h: 0.45,
    fontSize: 9, bold: true, color: '38BDF8', fontFace: FONT_TITLE, align: 'center', valign: 'middle'
  });

  slide.addText('Google Cloud Field-Deployed Engineering (FDE)\nOctober 2026  •  v1.0 Production Release', {
    x: 0.6, y: 6.3, w: 3.6, h: 0.6,
    fontSize: 8.5, color: '94A3B8', fontFace: FONT_BODY, lineSpacingMultiple: 1.2
  });

  slide.addText('Multi-Tenant Agentic AI\non Google Cloud', {
    x: 5.4, y: 1.4, w: 7.3, h: 1.6,
    fontSize: 34, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.1
  });
  slide.addText('Reference Architecture Taxonomy & 5-Hop Governance Baseline', {
    x: 5.4, y: 3.1, w: 7.3, h: 0.5,
    fontSize: 16, bold: true, color: G_BLUE, fontFace: FONT_TITLE
  });
  slide.addText('Overcoming the SaaS AI Architect’s Dilemma: Deploying Pooled (Pattern A), Sovereign Silo (Pattern B), and Dynamic Hybrid (Pattern C) Topologies via Vertex AI Agent Engine and ADK.', {
    x: 5.4, y: 3.7, w: 7.3, h: 1.1,
    fontSize: 12, color: TEXT_MUTED, fontFace: FONT_BODY, lineSpacingMultiple: 1.3
  });

  const chips = [
    { title: '84.7% Cache Savings', desc: 'Shared Context Cache' },
    { title: '5-Hop Cryptography', desc: 'Zero-Trust Token Chain' },
    { title: 'Sub-60s CMEK Kill', desc: 'Regulatory Sovereignty' },
  ];
  chips.forEach((c, i) => {
    const cx = 5.4 + i * 2.45;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: 5.3, w: 2.3, h: 1.1, rectRadius: 0.08,
      fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 1 }
    });
    slide.addText(c.title, {
      x: cx, y: 5.45, w: 2.3, h: 0.35,
      fontSize: 11, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE, align: 'center'
    });
    slide.addText(c.desc, {
      x: cx, y: 5.85, w: 2.3, h: 0.4,
      fontSize: 9, color: TEXT_MUTED, fontFace: FONT_BODY, align: 'center'
    });
  });
}

// ============================================================================
// SLIDE 02: Executive Storyline & 4-Act Architecture Agenda
// ============================================================================
function buildSlide02_Agenda() {
  const slide = pptx.addSlide();
  addHeader(slide, 'EXECUTIVE STORYLINE', 'The 4-Act Architecture Journey: From Threat Model to Production GA', 2);

  slide.addText('Structured architectural roadmap taking enterprise platforms from threat modeling to verified 10-SaaS multi-cloud isolation.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.38, fontSize: 10.5, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const acts = [
    {
      act: 'ACT I',
      title: 'The Problem & Attack Surface',
      tag: 'THREAT LANDSCAPE',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      slides: 'Slides 03–04',
      bullets: [
        'The SaaS Architect\'s Dilemma: Margin destruction vs. catastrophic breach.',
        '5 Multi-Tenant Threat Vectors: Header spoofing, schema bleed, memory pollution, confused deputy, quota exhaustion.',
        'The Golden Path: Decoupling the 80% reusable pipeline from perimeters.'
      ],
      deliverable: 'Threat Surface Map'
    },
    {
      act: 'ACT II',
      title: 'Reference Topologies',
      tag: 'ARCHITECTURE & BLUEPRINTS',
      color: G_BLUE,
      tint: G_BLUE_LIGHT,
      slides: 'Slides 05–10',
      bullets: [
        'Pattern A High-Density Pooled (950 commercial tenants, $12/mo).',
        'Pattern B Sovereign Silos & Pattern C Dynamic Hybrid PSC spokes.',
        'L1 Logical Architecture: 3 security layers & signed STS JWT.',
        'Figures 1 & 2: Authoritative DrawingML reference topologies.'
      ],
      deliverable: 'Hub-and-Spoke Topologies'
    },
    {
      act: 'ACT III',
      title: '5-Hop Cryptographic Control',
      tag: 'DEEP TECHNICAL EXECUTION',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      slides: 'Slides 11–18',
      bullets: [
        'L3 5-Actor UML Sequence & ~42ms p95 control-plane lifecycle.',
        'L4 Wire Transformation: Ingress header stripping & STS JWT minting.',
        'Deterministic Fail-Closed Circuit Breakers (HTTP 401, 403, 429, 422, 423).',
        'AlloyDB RLS, Valkey FinOps & 4 Production Engineering Caveats.'
      ],
      deliverable: '5-Hop Pipeline & Guardrails'
    },
    {
      act: 'ACT IV',
      title: 'Empirical SaaS Proofs',
      tag: 'EVIDENCE & PRODUCTION GA',
      color: G_AMBER_DEEP,
      tint: G_YELLOW_LIGHT,
      slides: 'Slides 19–29',
      bullets: [
        '10 Evaluated Third-Party SaaS Stacks (BI, SQL, Telemetry, Logs, CMEK, Git).',
        '20 Authentic 2880x1800 Retina Before -> After UI Captures.',
        'Zero Cross-Tenant Leaks verified across Google Cloud Run and AWS EC2.',
        'Act V: 10-Week Implementation Roadmap & Quantified SLA Scorecard.'
      ],
      deliverable: '10/10 SaaS Isolation Matrix'
    }
  ];

  acts.forEach((a, i) => {
    const ax = 0.6 + i * 3.08;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: ax, y: 1.35, w: 2.88, h: 5.5, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: a.color, width: 1.5 }
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: ax, y: 1.35, w: 2.88, h: 1.1, fill: { color: a.tint }
    });

    slide.addText(`${a.act} • ${a.slides}`, {
      x: ax + 0.15, y: 1.48, w: 2.58, h: 0.28, fontSize: 8.5, bold: true, color: a.color, fontFace: FONT_TITLE
    });
    slide.addText(a.title, {
      x: ax + 0.15, y: 1.78, w: 2.58, h: 0.58, fontSize: 11.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: ax + 0.15, y: 2.6, w: 2.58, h: 3.5, rectRadius: 0.05,
      fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
    });

    slide.addText('CORE ARCHITECTURAL DELIVERABLES', {
      x: ax + 0.25, y: 2.75, w: 2.38, h: 0.25, fontSize: 7.5, bold: true, color: TEXT_MUTED, fontFace: FONT_TITLE
    });

    a.bullets.forEach((b, k) => {
      slide.addText(`• ${b}`, {
        x: ax + 0.22, y: 3.05 + k * 0.85, w: 2.44, h: 0.8,
        fontSize: 8.2, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
      });
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: ax + 0.15, y: 6.25, w: 2.58, h: 0.45, rectRadius: 0.04,
      fill: { color: a.tint }, line: { color: a.color, width: 0.75 }
    });
    slide.addText(`Output: ${a.deliverable}`, {
      x: ax + 0.15, y: 6.25, w: 2.58, h: 0.45,
      fontSize: 8.0, bold: true, color: a.color, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
    });
  });

  // Bottom Architecture Abstraction Bar
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 6.95, w: 12.133, h: 0.38, rectRadius: 0.05,
    fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
  });
  slide.addText('ARCHITECTURE ABSTRACTION HIERARCHY:  L1 Logical Security (Slide 8)  ➔  L2 Physical DrawingML (Slides 9–10)  ➔  L3 Process Swimlane (Slide 12)  ➔  L4 Wire Protocol (Slide 13)  ➔  L5 Database RLS (Slide 15)', {
    x: 0.8, y: 6.95, w: 11.7, h: 0.38,
    fontSize: 7.8, bold: true, color: TEXT_MUTED, fontFace: FONT_TITLE, valign: 'middle'
  });
}

// ============================================================================
// SLIDE 03: The SaaS AI Architect's Dilemma
// ============================================================================
function buildSlide03_Dilemma() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT I • THE PROBLEM', 'The SaaS AI Architect’s Dilemma: The False Dichotomy of Multi-Tenancy', 3);

  slide.addText('SaaS platforms face an extreme trade-off: provisioning isolated projects destroys margins, while naive sharing destroys security.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  // Left Card: The Cost Trap
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 1.35, w: 5.8, h: 4.2, rectRadius: 0.08,
    fill: { color: G_RED_LIGHT }, line: { color: G_RED, width: 1.5 }
  });
  slide.addText('TRAP A: 1 PROJECT PER TENANT', {
    x: 0.9, y: 1.55, w: 5.2, h: 0.35, fontSize: 12, bold: true, color: G_RED, fontFace: FONT_TITLE
  });
  slide.addText('$1,250 / mo', {
    x: 0.9, y: 1.95, w: 5.2, h: 0.6, fontSize: 26, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
  });
  slide.addText('Per-Tenant Baseline Infrastructure Burn Rate', {
    x: 0.9, y: 2.55, w: 5.2, h: 0.3, fontSize: 9.5, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const trapAStats = [
    { metric: '1,000 VPCs & IP Exhaustion', label: 'Quota limits reached within 90 days of commercial launch' },
    { metric: '0% Prompt Prefix Caching', label: 'Cannot share system prompt caches across IAM boundaries' },
    { metric: '$1.25M Monthly Infra Bill', label: 'Destroys SaaS gross margins on $99/mo commercial tiers' }
  ];
  trapAStats.forEach((s, i) => {
    const sy = 3.0 + i * 0.75;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.9, y: sy, w: 5.2, h: 0.65, rectRadius: 0.05, fill: { color: WHITE }, line: { color: G_RED, width: 0.5 }
    });
    slide.addText(s.metric, {
      x: 1.05, y: sy + 0.05, w: 2.3, h: 0.3, fontSize: 10.5, bold: true, color: G_RED, fontFace: FONT_TITLE
    });
    slide.addText(s.label, {
      x: 1.05, y: sy + 0.32, w: 4.9, h: 0.3, fontSize: 8.5, color: TEXT_DARK, fontFace: FONT_BODY
    });
  });

  // Right Card: The Security Hazard
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.9, y: 1.35, w: 5.8, h: 4.2, rectRadius: 0.08,
    fill: { color: G_YELLOW_LIGHT }, line: { color: G_YELLOW, width: 1.5 }
  });
  slide.addText('TRAP B: NAIVE SHARED WORKER POOL', {
    x: 7.2, y: 1.55, w: 5.2, h: 0.35, fontSize: 12, bold: true, color: 'B45309', fontFace: FONT_TITLE
  });
  slide.addText('5 Critical Breaches', {
    x: 7.2, y: 1.95, w: 5.2, h: 0.6, fontSize: 26, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
  });
  slide.addText('Catastrophic Cross-Tenant Data & Compliance Vulnerabilities', {
    x: 7.2, y: 2.55, w: 5.2, h: 0.3, fontSize: 9.5, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const trapBStats = [
    { metric: 'Confused Deputy 3LO Replay', label: 'Delegated user tokens hijacked across pooled worker threads' },
    { metric: 'Dynamic Schema Bleed', label: 'Global MCP tool catalogs exposing DB schemas to competitors' },
    { metric: 'Noisy Neighbor Starvation', label: 'Single tenant reasoning loop exhausts regional LLM quota' }
  ];
  trapBStats.forEach((s, i) => {
    const sy = 3.0 + i * 0.75;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 7.2, y: sy, w: 5.2, h: 0.65, rectRadius: 0.05, fill: { color: WHITE }, line: { color: G_YELLOW, width: 0.5 }
    });
    slide.addText(s.metric, {
      x: 7.35, y: sy + 0.05, w: 2.9, h: 0.3, fontSize: 10.5, bold: true, color: 'B45309', fontFace: FONT_TITLE
    });
    slide.addText(s.label, {
      x: 7.35, y: sy + 0.32, w: 4.9, h: 0.3, fontSize: 8.5, color: TEXT_DARK, fontFace: FONT_BODY
    });
  });

  // Golden Bridge at Bottom
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 5.75, w: 12.133, h: 1.15, rectRadius: 0.08,
    fill: { color: G_BLUE_LIGHT }, line: { color: G_BLUE, width: 2 }
  });
  slide.addText('THE GOLDEN PATH: DECOUPLE PIPELINE FROM PERIMETER', {
    x: 0.9, y: 5.9, w: 11.5, h: 0.3, fontSize: 11, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE
  });
  slide.addText('By decoupling the 80% reusable 5-Hop Cryptographic Pipeline from the underlying project perimeter, you recover 84.7% gross margins via high-density pooling while providing 100% mathematical zero-trust isolation for regulated enterprise silos.', {
    x: 0.9, y: 6.25, w: 11.5, h: 0.55, fontSize: 10, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
  });
}

// ============================================================================
// SLIDE 04: The 5 Multi-Tenant Attack Vectors
// ============================================================================
function buildSlide04_ThreatVectors() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT I • THREAT SURFACE', 'The 5 Multi-Tenant Attack Vectors: An Adversarial Flow Map', 4);

  slide.addText('Adversarial actors leverage agentic autonomy to traverse boundaries. Each vector requires a dedicated cryptographic defense.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const vectors = [
    { num: '01', title: 'Header Spoofing', threat: 'Attacker injects X-Tenant-ID: victim into HTTP headers', defense: 'Hop 1 Edge PEP', fix: 'Cloud Armor strips headers; STS mints ECDSA JWT' },
    { num: '02', title: 'Schema Bleed', threat: 'Global MCP tool catalogs leak private internal database APIs', defense: 'Hop 2 ARD Catalog', fix: 'Dynamic catalog filter hides unauthorized tool schemas' },
    { num: '03', title: 'Memory Pollution', threat: 'Semantic vector search retrieves competitor past conversations', defense: 'Hop 3 Sandbox', fix: 'Namespace-isolated Valkey/Vertex Vector memory' },
    { num: '04', title: 'Confused Deputy', threat: 'Agent hijacked via prompt injection to use user 3LO token', defense: 'Hop 4 Model Armor', fix: 'RFC 9449 DPoP key binding + step-up user consent' },
    { num: '05', title: 'Quota Exhaustion', threat: 'Recursive loop exhausts shared regional Gemini LLM quotas', defense: 'Hop 5 Token Bucket', fix: 'Per-tenant Valkey leaky bucket rate bulkheads' }
  ];

  vectors.forEach((v, i) => {
    const vx = 0.6 + i * 2.47;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: vx, y: 1.35, w: 2.25, h: 4.8, rectRadius: 0.08,
      fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 1 }
    });

    slide.addShape(pptx.ShapeType.ellipse, {
      x: vx + 0.825, y: 1.5, w: 0.55, h: 0.55, fill: { color: G_RED }, line: { color: WHITE, width: 1 }
    });
    slide.addText(v.num, {
      x: vx + 0.825, y: 1.5, w: 0.55, h: 0.55,
      fontSize: 11, bold: true, color: WHITE, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
    });

    slide.addText(v.title, {
      x: vx + 0.1, y: 2.15, w: 2.05, h: 0.35,
      fontSize: 10.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, align: 'center'
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: vx + 0.125, y: 2.55, w: 2.0, h: 1.3, rectRadius: 0.05,
      fill: { color: G_RED_LIGHT }, line: { color: G_RED, width: 0.5 }
    });
    slide.addText('ATTACK VECTOR', {
      x: vx + 0.175, y: 2.62, w: 1.9, h: 0.22, fontSize: 7.5, bold: true, color: G_RED, fontFace: FONT_TITLE
    });
    slide.addText(v.threat, {
      x: vx + 0.175, y: 2.86, w: 1.9, h: 0.9, fontSize: 8.0, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
    });

    slide.addShape(pptx.ShapeType.downArrow, {
      x: vx + 0.975, y: 3.92, w: 0.25, h: 0.25, fill: { color: G_GREEN }
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: vx + 0.125, y: 4.25, w: 2.0, h: 1.75, rectRadius: 0.05,
      fill: { color: G_GREEN_LIGHT }, line: { color: G_GREEN, width: 0.5 }
    });
    slide.addText(`SHIELD: ${v.defense}`, {
      x: vx + 0.175, y: 4.32, w: 1.9, h: 0.22, fontSize: 7.5, bold: true, color: G_GREEN, fontFace: FONT_TITLE
    });
    slide.addText(v.fix, {
      x: vx + 0.175, y: 4.56, w: 1.9, h: 1.35, fontSize: 8.0, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
    });
  });

  // Bottom Transition Bridge
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 6.35, w: 12.133, h: 0.55, rectRadius: 0.06,
    fill: { color: G_BLUE_LIGHT }, line: { color: G_BLUE, width: 1 }
  });
  slide.addText('TRANSITION TO ACT II ➔ Moving from the threat landscape to concrete architectural patterns and DrawingML topologies', {
    x: 0.8, y: 6.35, w: 11.7, h: 0.55, fontSize: 9.5, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE, valign: 'middle'
  });
}

// ============================================================================
// SLIDE 05: ACT II TRANSITION BREAKER (TOPOLOGIES & ARCHITECTURE)
// ============================================================================
function buildSlide05_Act2Breaker() {
  buildActBreakerSlide({
    slideNum: 5,
    actTag: 'ACT II TRANSITION',
    actNumber: 'ACT II',
    actTitle: 'Reference Architecture & Multi-Tenant Topologies',
    actSubtitle: 'Decoupling the 80% Reusable 5-Hop Cryptographic Core from the 20% Per-Tenant Perimeter Delta.',
    actColor: G_BLUE,
    actTint: G_BLUE_LIGHT,
    coreQuestion: 'How do enterprise platforms serve 950 standard commercial tenants at $12/mo while simultaneously providing air-gapped sovereign isolation for 50 regulated banking & healthcare clients from a single unified codebase?',
    thesis: 'Decoupling the 5-hop identity, PDP, and database RLS pipeline from physical project boundaries eliminates the false choice between margin destruction and security compromise.',
    milestones: [
      { num: '01', title: 'Pattern A: High-Density Pooled Architecture', desc: 'Shared Cloud Run Gen2 + AlloyDB RLS hosting 950 commercial tenants with 84.7% prefix cache savings.', deliverable: 'Pooled Core' },
      { num: '02', title: 'Pattern B: Sovereign Dedicated Silos', desc: 'Isolated Google Cloud projects, VPC-SC perimeters, and customer-managed Cloud KMS CMEK key rings.', deliverable: 'Sovereign Silos' },
      { num: '03', title: 'Pattern C: Dynamic Hybrid PSC Spokes', desc: 'Pooled control plane orchestrating private tenant spoke datalakes via Private Service Connect without turn drop.', deliverable: 'Hybrid Spokes' },
      { num: '04', title: 'L1 Logical & L2 Network DrawingML Topologies', desc: '100% native vector diagrams: 3-layer security taxonomy and Figures 1 & 2 decomposed Draw.io blueprints.', deliverable: 'DrawingML Topos' }
    ]
  });
}

// ============================================================================
// SLIDE 06: Pattern A High-Density Pooled
// ============================================================================
function buildSlide06_PatternA() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT II • PATTERN A POOLED', 'Pattern A: High-Density Pooled Architecture (950 Commercial Tenants)', 6);

  slide.addText('Default topology for commercial B2B SaaS tenants. Shared Cloud Run + AlloyDB RLS with 84.7% prompt cache savings.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const cards = [
    { title: 'Ingress & Identity', color: G_BLUE, items: ['Cloud Armor strips caller headers', 'IAM STS mints 5-minute JWTs', 'RFC 9449 DPoP key binding'] },
    { title: 'Shared Execution Core', color: G_GREEN, items: ['Cloud Run Gen2 shared containers', 'Discovery Engine ARD tool filter', 'Memorystore Valkey rate limits'] },
    { title: 'Inference & Caching', color: G_YELLOW, items: ['Vertex AI Agent Engine', '84.7% prompt prefix cache hit', 'Model Armor inline DLP filters'] },
    { title: 'Data Isolation', color: G_RED, items: ['AlloyDB PostgreSQL engine RLS', 'SET LOCAL current_tenant_id', 'BigQuery OTel FinOps ledger'] }
  ];

  cards.forEach((c, i) => {
    const cx = 0.6 + i * 3.09;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: 1.35, w: 2.87, h: 5.5, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: c.color, width: 1.5 }
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx + 0.15, y: 1.55, w: 2.57, h: 0.45, rectRadius: 0.05,
      fill: { color: G_GREY_BG }, line: { color: c.color, width: 1 }
    });
    slide.addText(c.title, {
      x: cx + 0.15, y: 1.55, w: 2.57, h: 0.45,
      fontSize: 11, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
    });

    c.items.forEach((item, j) => {
      const iy = 2.25 + j * 1.55;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: cx + 0.15, y: iy, w: 2.57, h: 1.35, rectRadius: 0.05,
        fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
      });
      slide.addText(`0${j + 1}`, {
        x: cx + 0.25, y: iy + 0.1, w: 0.5, h: 0.3,
        fontSize: 12, bold: true, color: c.color, fontFace: FONT_TITLE
      });
      slide.addText(item, {
        x: cx + 0.25, y: iy + 0.4, w: 2.35, h: 0.85,
        fontSize: 9.5, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
      });
    });
  });
}

// ============================================================================
// SLIDE 07: Pattern B Sovereign Silos & Pattern C Dynamic Hybrid
// ============================================================================
function buildSlide07_PatternBC() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT II • SOVEREIGN SPOKES', 'Pattern B (Sovereign Silos) & Pattern C (Dynamic Hybrid PSC Spokes)', 7);

  slide.addText('Sovereignty topologies for regulated tenants requiring dedicated VPC-SC boundaries, CMEK kill-switches, and air-gapped models.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const patterns = [
    {
      name: 'PATTERN A: HIGH-DENSITY POOLED',
      target: 'Commercial SaaS & Standard Tier',
      color: G_BLUE, bg: G_BLUE_LIGHT,
      density: '950 Tenants / Project',
      cost: '$12 / tenant / mo',
      onboard: '0 ms (Instant Provisioning)',
      points: [
        'Shared Cloud Run + Vertex AI Agent Engine',
        'AlloyDB PostgreSQL Row-Level Security (RLS)',
        '84.7% Prompt Cache Cost Reduction',
        'Valkey Leaky-Bucket Rate Limiter'
      ]
    },
    {
      name: 'PATTERN B: SOVEREIGN SILOS',
      target: 'Regulated Banking & Healthcare',
      color: G_RED, bg: G_RED_LIGHT,
      density: '1 Tenant / Dedicated Project',
      cost: '$1,250 / tenant / mo',
      onboard: '15 min (Terraform Factory)',
      points: [
        'Dedicated VPC Service Controls Perimeter',
        'Customer-Managed Cloud KMS CMEK Keys',
        'Sub-60s Instant Revocation Kill-Switch',
        'Air-Gapped Private GKE Gemma 3 (27B)'
      ]
    },
    {
      name: 'PATTERN C: DYNAMIC HYBRID',
      target: 'Enterprise Tier Upgrades',
      color: G_GREEN, bg: G_GREEN_LIGHT,
      density: 'Pooled Control + 50 Dedicated Spokes',
      cost: '$320 / tenant / mo',
      onboard: 'Live Pointer Cutover (0ms lag)',
      points: [
        'Shared Orchestrator + Private Service Connect',
        'Zero Dropped Agent Turns During Upgrade',
        'Shadow Sync -> Cutover -> Drain Lifecycle',
        'Dedicated Spoke VPCs for Heavy Data Lakes'
      ]
    }
  ];

  patterns.forEach((p, i) => {
    const px = 0.6 + i * 4.16;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: px, y: 1.35, w: 3.8, h: 5.5, rectRadius: 0.08,
      fill: { color: p.bg }, line: { color: p.color, width: 1.5 }
    });

    slide.addText(p.name, {
      x: px + 0.2, y: 1.55, w: 3.4, h: 0.35, fontSize: 11.5, bold: true, color: p.color, fontFace: FONT_TITLE
    });
    slide.addText(p.target, {
      x: px + 0.2, y: 1.9, w: 3.4, h: 0.25, fontSize: 9.5, color: TEXT_MUTED, fontFace: FONT_BODY
    });

    const stats = [
      { label: 'TENANT DENSITY', val: p.density },
      { label: 'UNIT COST', val: p.cost },
      { label: 'ONBOARDING TIME', val: p.onboard }
    ];
    stats.forEach((s, j) => {
      const sy = 2.25 + j * 0.75;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: px + 0.2, y: sy, w: 3.4, h: 0.65, rectRadius: 0.05, fill: { color: WHITE }, line: { color: G_GREY_BORDER, width: 0.5 }
      });
      slide.addText(s.label, {
        x: px + 0.35, y: sy + 0.05, w: 3.1, h: 0.22, fontSize: 7.5, bold: true, color: TEXT_MUTED, fontFace: FONT_TITLE
      });
      slide.addText(s.val, {
        x: px + 0.35, y: sy + 0.28, w: 3.1, h: 0.32, fontSize: 11, bold: true, color: p.color, fontFace: FONT_TITLE
      });
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: px + 0.2, y: 4.6, w: 3.4, h: 2.05, rectRadius: 0.05, fill: { color: WHITE }, line: { color: G_GREY_BORDER, width: 0.5 }
    });
    slide.addText('CORE ARCHITECTURAL FEATURES', {
      x: px + 0.35, y: 4.7, w: 3.1, h: 0.25, fontSize: 8, bold: true, color: TEXT_MUTED, fontFace: FONT_TITLE
    });
    p.points.forEach((pt, k) => {
      slide.addText(`✔  ${pt}`, {
        x: px + 0.35, y: 5.0 + k * 0.38, w: 3.1, h: 0.35, fontSize: 8.5, color: TEXT_DARK, fontFace: FONT_BODY
      });
    });
  });
}

// ============================================================================
// SLIDE 08: L1 Logical Security Taxonomy
// ============================================================================
function buildSlide08_L1Logical() {
  addArchitectureZoneTopologySlide(pptx, DECKS[0]);
}

// ============================================================================
// SLIDE 09: Reference Blueprint 1 (Figure 1 DrawingML)
// ============================================================================
async function buildSlide09_Figure1() {
  const xmlPath = path.join(ROOT_DIR, 'diagrams', 'ws1-multi-tenant-taxonomy-overview.drawio');
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  await appendGoogleBrandedDiagramSlides(
    pptx,
    xmlContent,
    'WS1',
    'WS1 • ACT II: Figure 1',
    'Vertex AI Agent Engine Multi-Tenant Taxonomy: Pooled (A), Sovereign Silos (B) & Hybrid (C)',
    'ws1-multi-tenant-taxonomy-overview',
    undefined,
    [
      'Official Google Cloud Architecture Center 4-Zone Hub-and-Spoke reference topology.',
      'Routing Hub (Blue Zone) strips caller-forged X-Tenant-Id headers and terminates TLS.',
      'Central Governance Hub (Green Zone) mints KMS ECDSA P-256 tokens and brokers 2LO/3LO OAuth.',
      'Pattern A Shared Pool (Yellow Spoke) hosts 950 commercial tenants with 90% prefix cache savings.',
      'Pattern B Sovereign Silos (Red Spoke) isolates 50 regulated tenants with VPC-SC and CMEK kill-switches.'
    ],
    'diagrams/ws1-multi-tenant-taxonomy-overview.drawio',
    true
  );
}

// ============================================================================
// SLIDE 10: Reference Blueprint 2 (Figure 2 DrawingML)
// ============================================================================
async function buildSlide10_Figure2() {
  const xmlPath = path.join(ROOT_DIR, 'diagrams', 'ws1-cloud-arch-center-5hop-baseline.drawio');
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  await appendGoogleBrandedDiagramSlides(
    pptx,
    xmlContent,
    'WS1',
    'WS1 • ACT II: Figure 2',
    'Google Cloud Architecture Center (#78): Multi-Tenant Agentic AI with 5-Hop Governance',
    'ws1-cloud-arch-center-5hop-baseline',
    undefined,
    [
      'Invariant 5-Hop zero-trust defense-in-depth pipeline across all microservices.',
      'Hop 1 (Edge Identity): Header sanitization and OIDC/DPoP token exchange in <0.15ms.',
      'Hop 2 (Registry PDP): Dynamic catalog filtering prunes unauthorized tools before execution.',
      'Hop 3 (Execution Bulkhead): gVisor container sandbox and Valkey namespace isolation.',
      'Hop 4 (Inference Guard): Inline Model Armor DLP and natural language constraint enforcement.',
      'Hop 5 (Data Partitioning): AlloyDB PostgreSQL Row-Level Security via SET LOCAL app.current_tenant_id.'
    ],
    'diagrams/ws1-cloud-arch-center-5hop-baseline.drawio',
    true
  );
}

// ============================================================================
// SLIDE 11: ACT III TRANSITION BREAKER (5-HOP CRYPTOGRAPHIC CONTROL PLANE)
// ============================================================================
function buildSlide11_Act3Breaker() {
  buildActBreakerSlide({
    slideNum: 11,
    actTag: 'ACT III TRANSITION',
    actNumber: 'ACT III',
    actTitle: '5-Hop Cryptographic Pipeline & Deep Execution',
    actSubtitle: 'From Ingress Header Stripping to Database RLS & Sub-60s CMEK Kill-Switches.',
    actColor: G_GREEN_DEEP,
    actTint: G_GREEN_LIGHT,
    coreQuestion: 'How does an untrusted caller request traverse edge gateways, dynamic tool resolution, sandboxed memory banks, and model armor without risk of header spoofing, cross-tenant memory bleed, or noisy-neighbor quota exhaustion?',
    thesis: 'Enforcing cryptographic token exchange at Hop 1 and passing an immutable, signed STS JWT enables every downstream microservice to verify tenant boundaries in sub-150 microseconds without remote RPC roundtrips.',
    milestones: [
      { num: '01', title: 'L3 Process 5-Actor UML Swimlane Sequence', desc: 'Step-by-step transaction flow across Caller, Edge, ARD, Model Armor, and AlloyDB with ~42ms p95 latency.', deliverable: 'UML Swimlane' },
      { num: '02', title: 'L4 Wire-Level Protocol Normalization', desc: 'Cloud Armor stripping forged headers and minting KMS ECDSA P-256 JWTs verified via local in-memory JWKS.', deliverable: 'Wire Gate' },
      { num: '03', title: 'Deterministic Fail-Closed Circuit Breakers', desc: 'Explicit HTTP 401, 403, 429, 422, and 423 error contracts blocking rogue workflows before downstream execution.', deliverable: 'Circuit Breakers' },
      { num: '04', title: 'Hop 5 AlloyDB RLS & Valkey FinOps Governance', desc: 'Engine-level SET LOCAL app.current_tenant_id isolation with 84.7% prompt prefix caching cost savings.', deliverable: 'RLS & FinOps' }
    ]
  });
}

// ============================================================================
// SLIDE 12: L3 Process Swimlane (ACT III)
// ============================================================================
function buildSlide12_L3Process() {
  addUmlSequenceSwimlaneSlide(
    pptx,
    DECKS[0],
    'WS1 • ACT III (L3 PROCESS): 5-Actor UML Sequence, Fail-Closed Circuit Breakers & Stampede Recovery'
  );
}

// ============================================================================
// SLIDE 13: L4 Wire Payload Transformation (ACT III)
// ============================================================================
function buildSlide13_L4Wire() {
  addPayloadTransformationTriptychSlide(
    pptx,
    DECKS[0],
    'WS1 • ACT III (L4 WIRE): Hop 1 Spoofed Header Stripping & Signed STS JWT Context'
  );
}

// ============================================================================
// SLIDE 14: L3 Process Circuit Breakers Deep-Dive
// ============================================================================
function buildSlide14_CircuitBreakers() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • CIRCUIT BREAKERS', 'L3 Process Architecture: Explicit Fail-Closed Security Circuit Breakers', 14);

  slide.addText('Zero-trust systems must fail closed. Five distinct HTTP circuit breakers guarantee deterministic rejection without data leaks.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const breakers = [
    { code: 'HTTP 401', name: 'UNAUTHORIZED IDENTITY', trigger: 'Caller provides invalid OIDC/SAML token or forged X-Tenant-ID header', action: 'Cloud Armor immediately drops TCP session at Edge PEP (Hop 1)' },
    { code: 'HTTP 403', name: 'FORBIDDEN TOOL RESOLUTION', trigger: 'Agent attempts to invoke an unauthorized MCP tool or cross-tenant private agent', action: 'Discovery Engine PDP aborts tool execution via before_tool_callback (Hop 2)' },
    { code: 'HTTP 429', name: 'RATE LIMIT BULKHEAD BREACH', trigger: 'Runaway reasoning loop or noisy neighbor exceeds per-tenant RPM/TPM quota', action: 'Valkey leaky-bucket rate limiter rejects request to preserve platform stability (Hop 3)' },
    { code: 'HTTP 422', name: 'PROMPT INJECTION DETECTED', trigger: 'Model Armor detects jailbreak, semantic NLC violation, or PII exfiltration attempt', action: 'Inference gateway blocks LLM call and logs incident to Cloud Audit Logs (Hop 4)' },
    { code: 'HTTP 423', name: 'CMEK REVOCATION (LOCKED)', trigger: 'Regulated enterprise revokes Cloud KMS key ring during security incident', action: 'AlloyDB and Cloud Run instantly lock tenant database within <60 seconds (Hop 5)' }
  ];

  breakers.forEach((b, i) => {
    const by = 1.35 + i * 1.1;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.6, y: by, w: 12.133, h: 0.95, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: G_RED, width: 1 }
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: by + 0.15, w: 1.8, h: 0.65, rectRadius: 0.05,
      fill: { color: G_RED_LIGHT }, line: { color: G_RED, width: 1 }
    });
    slide.addText(b.code, {
      x: 0.8, y: by + 0.25, w: 1.8, h: 0.45,
      fontSize: 13, bold: true, color: G_RED, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
    });

    slide.addText(b.name, {
      x: 2.8, y: by + 0.15, w: 3.2, h: 0.28, fontSize: 10.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
    });
    slide.addText(`Trigger: ${b.trigger}`, {
      x: 2.8, y: by + 0.45, w: 4.8, h: 0.4, fontSize: 8.5, color: TEXT_MUTED, fontFace: FONT_BODY
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 7.8, y: by + 0.15, w: 4.7, h: 0.65, rectRadius: 0.05,
      fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
    });
    slide.addText(`Fail-Closed Action: ${b.action}`, {
      x: 7.95, y: by + 0.2, w: 4.4, h: 0.55, fontSize: 8.5, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
    });
  });
}

// ============================================================================
// SLIDE 15: AlloyDB Row-Level Security Table
// ============================================================================
function buildSlide15_AlloyDbRls() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • ALLOYDB RLS', 'Hop 5 Data Partitioning: AlloyDB Row-Level Security DrawingML Architecture', 15);

  slide.addText('How Row-Level Security mathematically prevents cross-tenant data leaks at the database engine layer.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const headers = [
    { text: 'Row ID', options: { bold: true, color: WHITE, fill: { color: G_NAVY }, fontSize: 8.5, align: 'center' } },
    { text: 'Tenant ID', options: { bold: true, color: WHITE, fill: { color: G_NAVY }, fontSize: 8.5, align: 'center' } },
    { text: 'Account Owner', options: { bold: true, color: WHITE, fill: { color: G_NAVY }, fontSize: 8.5, align: 'left' } },
    { text: 'Ledger Balance', options: { bold: true, color: WHITE, fill: { color: G_NAVY }, fontSize: 8.5, align: 'right' } },
    { text: 'RLS Evaluation Rule', options: { bold: true, color: WHITE, fill: { color: G_NAVY }, fontSize: 8.5, align: 'left' } },
    { text: 'FinVault Visibility', options: { bold: true, color: WHITE, fill: { color: G_NAVY }, fontSize: 8.5, align: 'center' } },
    { text: 'RetailStream Visibility', options: { bold: true, color: WHITE, fill: { color: G_NAVY }, fontSize: 8.5, align: 'center' } }
  ];

  const tableRows = [
    [
      { text: '101', options: { fontSize: 8, align: 'center', fill: { color: WHITE } } },
      { text: 'finvault', options: { bold: true, color: G_BLUE_DARK, fontSize: 8, align: 'center', fill: { color: WHITE } } },
      { text: 'FinVault Treasury Ops', options: { fontSize: 8, fill: { color: WHITE } } },
      { text: '$14,250,000', options: { fontSize: 8, align: 'right', fill: { color: WHITE } } },
      { text: 'current_setting(\'app.current_tenant_id\') = \'finvault\'', options: { fontSize: 7.5, fontFace: 'Courier New', fill: { color: WHITE } } },
      { text: '✔ VISIBLE (PERMITTED)', options: { bold: true, color: G_GREEN_DEEP, fontSize: 7.5, align: 'center', fill: { color: G_GREEN_LIGHT } } },
      { text: '✖ HIDDEN (RLS FILTERED)', options: { bold: true, color: G_RED_DEEP, fontSize: 7.5, align: 'center', fill: { color: G_RED_LIGHT } } }
    ],
    [
      { text: '102', options: { fontSize: 8, align: 'center', fill: { color: G_GREY_BG } } },
      { text: 'finvault', options: { bold: true, color: G_BLUE_DARK, fontSize: 8, align: 'center', fill: { color: G_GREY_BG } } },
      { text: 'FinVault Wire Clearing', options: { fontSize: 8, fill: { color: G_GREY_BG } } },
      { text: '$312,500,000', options: { fontSize: 8, align: 'right', fill: { color: G_GREY_BG } } },
      { text: 'current_setting(\'app.current_tenant_id\') = \'finvault\'', options: { fontSize: 7.5, fontFace: 'Courier New', fill: { color: G_GREY_BG } } },
      { text: '✔ VISIBLE (PERMITTED)', options: { bold: true, color: G_GREEN_DEEP, fontSize: 7.5, align: 'center', fill: { color: G_GREEN_LIGHT } } },
      { text: '✖ HIDDEN (RLS FILTERED)', options: { bold: true, color: G_RED_DEEP, fontSize: 7.5, align: 'center', fill: { color: G_RED_LIGHT } } }
    ],
    [
      { text: '103', options: { fontSize: 8, align: 'center', fill: { color: WHITE } } },
      { text: 'retailstream', options: { bold: true, color: 'B45309', fontSize: 8, align: 'center', fill: { color: WHITE } } },
      { text: 'RetailStream Merchant Ops', options: { fontSize: 8, fill: { color: WHITE } } },
      { text: '$1,850,200', options: { fontSize: 8, align: 'right', fill: { color: WHITE } } },
      { text: 'current_setting(\'app.current_tenant_id\') = \'retailstream\'', options: { fontSize: 7.5, fontFace: 'Courier New', fill: { color: WHITE } } },
      { text: '✖ HIDDEN (RLS FILTERED)', options: { bold: true, color: G_RED_DEEP, fontSize: 7.5, align: 'center', fill: { color: G_RED_LIGHT } } },
      { text: '✔ VISIBLE (PERMITTED)', options: { bold: true, color: G_GREEN_DEEP, fontSize: 7.5, align: 'center', fill: { color: G_GREEN_LIGHT } } }
    ],
    [
      { text: '104', options: { fontSize: 8, align: 'center', fill: { color: G_GREY_BG } } },
      { text: 'retailstream', options: { bold: true, color: 'B45309', fontSize: 8, align: 'center', fill: { color: G_GREY_BG } } },
      { text: 'RetailStream Escrow', options: { fontSize: 8, fill: { color: G_GREY_BG } } },
      { text: '$4,320,000', options: { fontSize: 8, align: 'right', fill: { color: G_GREY_BG } } },
      { text: 'current_setting(\'app.current_tenant_id\') = \'retailstream\'', options: { fontSize: 7.5, fontFace: 'Courier New', fill: { color: G_GREY_BG } } },
      { text: '✖ HIDDEN (RLS FILTERED)', options: { bold: true, color: G_RED_DEEP, fontSize: 7.5, align: 'center', fill: { color: G_RED_LIGHT } } },
      { text: '✔ VISIBLE (PERMITTED)', options: { bold: true, color: G_GREEN_DEEP, fontSize: 7.5, align: 'center', fill: { color: G_GREEN_LIGHT } } }
    ]
  ];

  slide.addTable([headers, ...tableRows], {
    x: 0.6, y: 1.35, w: 12.133, h: 2.2,
    colW: [0.8, 1.2, 2.2, 1.5, 3.433, 1.5, 1.5],
    border: { pt: 0.5, color: G_GREY_BORDER }
  });

  // Technical Callout Card at Bottom
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 3.85, w: 12.133, h: 2.95, rectRadius: 0.08,
    fill: { color: G_GREY_BG }, line: { color: G_BLUE, width: 1.5 }
  });
  slide.addText('HOW ALLOYDB POSTGRESQL ROW-LEVEL SECURITY ENFORCES ZERO-TRUST PRIVACY', {
    x: 0.9, y: 4.05, w: 11.5, h: 0.35, fontSize: 11, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE
  });

  const rlsSteps = [
    { step: 'STEP 1: CONNECTION CHECKOUT', desc: 'When the agent checks out a connection from the pool, the session state is pristine. No tenant context exists.' },
    { step: 'STEP 2: SET LOCAL APP.CURRENT_TENANT_ID', desc: 'Middleware extracts verified tenant_id from JWT and issues SET LOCAL. Caveat: Auto-resets on COMMIT; with PgBouncer session mode, pool hooks must issue DISCARD ALL.' },
    { step: 'STEP 3: AUTOMATIC PREDICATE ENFORCEMENT', desc: 'AlloyDB rewrites all queries internally: SELECT * FROM ledger WHERE tenant_id = current_setting(\'app.current_tenant_id\').' },
    { step: 'STEP 4: SUB-15MS ENGINE FILTERING', desc: 'Competitor records are filtered by the PostgreSQL engine before disk pages enter memory. 0 leaked rows guaranteed.' }
  ];

  rlsSteps.forEach((s, k) => {
    const sx = 0.9 + k * 2.88;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sx, y: 4.45, w: 2.65, h: 2.1, rectRadius: 0.05,
      fill: { color: WHITE }, line: { color: G_GREY_BORDER, width: 0.5 }
    });
    slide.addText(s.step, {
      x: sx + 0.1, y: 4.6, w: 2.45, h: 0.45, fontSize: 8.5, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE
    });
    slide.addText(s.desc, {
      x: sx + 0.1, y: 5.15, w: 2.45, h: 1.25, fontSize: 8.0, color: TEXT_MUTED, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
    });
  });
}

// ============================================================================
// SLIDE 16: FinOps & Valkey Prefix Caching
// ============================================================================
function buildSlide16_FinOpsValkey() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • GOVERNANCE & FINOPS', 'Hop 3 Sandbox & Valkey Rate Limiter: FinOps Bulkhead & Prefix Caching', 16);

  slide.addText('How shared memory bulkheads and prefix prompt caching deliver 84.7% net token cost reduction across 950 tenants.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  // Left Card: Token Bulkhead
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 1.35, w: 5.8, h: 5.5, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_BLUE, width: 1.5 }
  });
  slide.addText('VALKEY LEAKY-BUCKET TOKEN BULKHEAD', {
    x: 0.9, y: 1.55, w: 5.2, h: 0.35, fontSize: 12, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE
  });
  slide.addText('Guaranteed Per-Tenant RPM & TPM Capacity Allocation', {
    x: 0.9, y: 1.95, w: 5.2, h: 0.3, fontSize: 9.5, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const bulkheadStats = [
    { title: 'Standard Commercial Tier', limit: '120 RPM  •  40,000 TPM', desc: 'Enforces hard limits via Redis atomic scripts to prevent noisy-neighbor quota exhaustion.' },
    { title: 'Enterprise Sovereign Tier', limit: '600 RPM  •  200,000 TPM', desc: 'Dedicated token bucket allocation with priority queueing and automatic burst capacity.' },
    { title: 'Deterministic Rejection', limit: 'HTTP 429 Retry-After', desc: 'Clients receive HTTP 429 backoff hints. Single-flight SET NX PX 5000 and <5s SCAN+UNLINK prevent cache stampedes.' }
  ];
  bulkheadStats.forEach((s, i) => {
    const sy = 2.4 + i * 1.35;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.9, y: sy, w: 5.2, h: 1.15, rectRadius: 0.05, fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
    });
    slide.addText(s.title, {
      x: 1.1, y: sy + 0.1, w: 3.0, h: 0.3, fontSize: 10, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
    });
    slide.addText(s.limit, {
      x: 3.5, y: sy + 0.1, w: 2.4, h: 0.3, fontSize: 9, bold: true, color: G_BLUE, fontFace: FONT_TITLE, align: 'right'
    });
    slide.addText(s.desc, {
      x: 1.1, y: sy + 0.45, w: 4.8, h: 0.6, fontSize: 8.5, color: TEXT_MUTED, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
    });
  });

  // Right Card: Prefix Caching
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.9, y: 1.35, w: 5.8, h: 5.5, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_GREEN, width: 1.5 }
  });
  slide.addText('VERTEX AI PREFIX PROMPT CACHING', {
    x: 7.2, y: 1.55, w: 5.2, h: 0.35, fontSize: 12, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE
  });
  slide.addText('84.7% Net Token Cost Reduction Across 950 Tenants', {
    x: 7.2, y: 1.95, w: 5.2, h: 0.3, fontSize: 9.5, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const cacheStats = [
    { title: 'Deterministic System Prefix', metric: '32,000 Shared Tokens', desc: 'Core agent system instructions, tool definitions, and schemas cached globally (Vertex AI requires >=32,768 token floor).' },
    { title: 'Per-Tenant Dynamic Suffix', metric: '4,000 Unique Tokens', desc: 'Tenant-specific memories and user context appended to cached prefix at inference time.' },
    { title: 'Cached Token Pricing', metric: '0.1x Base Rate ($0.03/M)', desc: 'Dramatic inference cost reduction enables profitable $12/tenant/mo SaaS pricing.' }
  ];
  cacheStats.forEach((s, i) => {
    const sy = 2.4 + i * 1.35;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 7.2, y: sy, w: 5.2, h: 1.15, rectRadius: 0.05, fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
    });
    slide.addText(s.title, {
      x: 7.4, y: sy + 0.1, w: 3.0, h: 0.3, fontSize: 10, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
    });
    slide.addText(s.metric, {
      x: 9.8, y: sy + 0.1, w: 2.4, h: 0.3, fontSize: 9, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE, align: 'right'
    });
    slide.addText(s.desc, {
      x: 7.4, y: sy + 0.45, w: 4.8, h: 0.6, fontSize: 8.5, color: TEXT_MUTED, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
    });
  });
}

// ============================================================================
// SLIDE 17: Production Simulation Benchmarks + Transition Bridge
// ============================================================================
function buildSlide17_Simulation() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • BENCHMARKS', 'Production Simulation: 10/10 Zero-Breach Multi-Tenant Architecture Verification', 17);

  slide.addText('Empirical results from our 1,000-tenant automated simulation test harness (scripts/run_deep_forensic_audit.py).', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const kpis = [
    { num: '1,000', label: 'Simulated Tenants', desc: '950 Pattern A pooled + 50 Pattern B/C sovereign silos executing concurrently.', color: G_BLUE },
    { num: '0', label: 'Cross-Tenant Leaks', desc: '10/10 red-team breach attempts blocked across header, schema, memory, and database layers.', color: G_GREEN_DEEP },
    { num: '< 42 ms', label: 'p95 Latency Overhead', desc: 'Total end-to-end 5-Hop control plane overhead for token minting, validation, and session injection.', color: G_AMBER_DEEP },
    { num: '< 60 s', label: 'CMEK Kill-Switch', desc: 'Instant regulatory revocation: Cloud KMS key disable instantly blocks database access.', color: G_RED_DEEP }
  ];

  kpis.forEach((k, i) => {
    const kx = 0.6 + i * 3.09;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: kx, y: 1.35, w: 2.87, h: 4.75, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: k.color, width: 1.5 }
    });

    slide.addShape(pptx.ShapeType.ellipse, {
      x: kx + 0.835, y: 1.6, w: 1.2, h: 1.2, fill: { color: G_GREY_BG }, line: { color: k.color, width: 2 }
    });
    slide.addText(k.num, {
      x: kx + 0.3, y: 1.95, w: 2.27, h: 0.5,
      fontSize: 16, bold: true, color: k.color, fontFace: FONT_TITLE, align: 'center'
    });

    slide.addText(k.label, {
      x: kx + 0.1, y: 3.1, w: 2.67, h: 0.4,
      fontSize: 11, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, align: 'center'
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: kx + 0.585, y: 3.65, w: 1.7, h: 0.03, fill: { color: k.color }
    });

    slide.addText(k.desc, {
      x: kx + 0.15, y: 3.85, w: 2.57, h: 1.9,
      fontSize: 9.5, color: TEXT_MUTED, fontFace: FONT_BODY, align: 'center', lineSpacingMultiple: 1.3
    });
  });

  // Bottom Transition Bridge to Guardrails
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 6.3, w: 12.133, h: 0.6, rectRadius: 0.06,
    fill: { color: G_BLUE_LIGHT }, line: { color: G_BLUE, width: 1 }
  });
  slide.addText('TRANSITION TO PRODUCTION GUARDRAILS ➔ Moving from simulation benchmarks to non-negotiable architectural caveats & operational nuances', {
    x: 0.8, y: 6.3, w: 11.7, h: 0.6, fontSize: 9.5, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE, valign: 'middle'
  });
}

// ============================================================================
// SLIDE 18: Architectural Caveats & Operational Nuances
// ============================================================================
function buildSlide18_ArchitecturalCaveats() {
  const slide = pptx.addSlide();
  addHeader(
    slide,
    'ACT III • ARCHITECTURAL CAVEATS',
    'Architectural Caveats & Operational Nuances: 4 Non-Negotiable Production Guardrails',
    18
  );

  slide.addText(
    'Crucial runtime trade-offs and edge-case invariants that principal systems architects and security engineers must enforce in production.',
    {
      x: 0.6,
      y: 0.85,
      w: 12.133,
      h: 0.4,
      fontSize: 11,
      color: TEXT_MUTED,
      fontFace: FONT_BODY,
    }
  );

  const caveats = [
    {
      badge: 'HOP 1 SIGNING VS HOPS 2–5 JWKS',
      badgeColor: G_BLUE,
      badgeBg: G_BLUE_LIGHT,
      title: 'Token Signing vs Local Verify',
      stat: '~8–14ms Mint  •  <0.15ms Verify',
      subtitle: 'Asymmetric Signature vs. In-Memory Validation',
      points: [
        'Initial Hop 1 token exchange invokes Cloud KMS asymmetricSign (ECDSA P-256), adding ~8–14ms latency on ingress.',
        'Downstream Hops 2–5 verify the signed STS JWT in <0.15ms purely via in-memory cached JWKS (/.well-known/jwks.json).',
        'Zero remote network RPCs to Cloud KMS across internal microservices, preventing API quota exhaustion at scale.'
      ],
      rule: 'RULE: Cache JWKS in process memory with 60-min TTL & background refresh.'
    },
    {
      badge: 'ALLOYDB / PGBOUNCER RLS',
      badgeColor: '00897B',
      badgeBg: 'E0F2F1',
      title: 'Connection Pool Scoping & Bleed',
      stat: 'SET LOCAL  •  DISCARD ALL',
      subtitle: 'Transaction Scoping vs. Session State Leaks',
      points: [
        'SET LOCAL app.current_tenant_id is strictly transaction-scoped and automatically cleared on COMMIT or ROLLBACK.',
        'If non-transactional pooling (e.g. PgBouncer in session mode) is used, connection reuse can leak tenant context across turns.',
        'Connection checkout/checkin middleware MUST execute DISCARD ALL or RESET ALL upon returning connections to the pool.'
      ],
      rule: 'RULE: Enforce transaction-mode pooling or mandate DISCARD ALL on pool return.'
    },
    {
      badge: 'VERTEX AI PROMPT CACHE',
      badgeColor: G_GREEN_DEEP,
      badgeBg: G_GREEN_LIGHT,
      title: 'Context Cache 32k Floor & TTL',
      stat: '>= 32,768 Tokens  •  84.7% Net TCO',
      subtitle: 'Prefix Minimum Window & Dynamic Suffixes',
      points: [
        'Vertex AI Context Caching requires a minimum threshold of 32,768 tokens (combined system prompt, tools, and schemas).',
        'The 84.7% prompt cost reduction materializes only when shared static instructions meet or exceed this 32k token floor.',
        'Tenant-specific memories and user inputs must be appended strictly as the dynamic suffix at inference time.'
      ],
      rule: 'RULE: Bundle global OpenAPI schemas into >=32k static prefix; append tenant data.'
    },
    {
      badge: 'VALKEY / REDIS BULKHEAD',
      badgeColor: G_AMBER_DEEP,
      badgeBg: G_YELLOW_LIGHT,
      title: 'Stampede Lock & Targeted Unlink',
      stat: 'SET NX PX 5000  •  <5s UNLINK',
      subtitle: 'Thundering Herd & Targeted Eviction',
      points: [
        'Emergency CMEK key revocation or cache invalidation must not trigger a database thundering herd across 1,000 tenants.',
        'Single-flight leader election (SET lock:{tenant} leader NX PX 5000) coordinates DB re-hydration while followers wait on Pub/Sub.',
        'Emergency tenant eviction uses targeted SCAN + UNLINK (cache:{tenant}:*) in <5s, leaving peer tenant caches intact (no FLUSHALL).'
      ],
      rule: 'RULE: Elect single-flight leaders for warm-up; never execute blocking FLUSHALL.'
    }
  ];

  caveats.forEach((c, i) => {
    const cx = 0.6 + i * 3.09;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: 1.35, w: 2.87, h: 4.8, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: c.badgeColor, width: 1.5 }
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx + 0.15, y: 1.5, w: 2.57, h: 0.32, rectRadius: 0.04,
      fill: { color: c.badgeBg }, line: { color: c.badgeColor, width: 0.75 }
    });
    slide.addText(c.badge, {
      x: cx + 0.15, y: 1.5, w: 2.57, h: 0.32,
      fontSize: 7.2, bold: true, color: c.badgeColor, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
    });

    slide.addText(c.title, {
      x: cx + 0.15, y: 1.9, w: 2.57, h: 0.35,
      fontSize: 11, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
    });
    slide.addText(c.stat, {
      x: cx + 0.15, y: 2.22, w: 2.57, h: 0.28,
      fontSize: 9.5, bold: true, color: c.badgeColor, fontFace: FONT_TITLE
    });
    slide.addText(c.subtitle, {
      x: cx + 0.15, y: 2.5, w: 2.57, h: 0.25,
      fontSize: 7.8, color: TEXT_MUTED, fontFace: FONT_BODY
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx + 0.12, y: 2.82, w: 2.63, h: 2.45, rectRadius: 0.05,
      fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
    });

    c.points.forEach((pt, k) => {
      slide.addText(`•  ${pt}`, {
        x: cx + 0.2, y: 2.92 + k * 0.72, w: 2.47, h: 0.68,
        fontSize: 7.6, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
      });
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx + 0.12, y: 5.38, w: 2.63, h: 0.65, rectRadius: 0.05,
      fill: { color: c.badgeBg }, line: { color: c.badgeColor, width: 0.5 }
    });
    slide.addText(c.rule, {
      x: cx + 0.2, y: 5.42, w: 2.47, h: 0.58,
      fontSize: 7.4, bold: true, color: c.badgeColor, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15
    });
  });

  // Bottom Transition Bridge to Act IV
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 6.3, w: 12.133, h: 0.6, rectRadius: 0.06,
    fill: { color: G_YELLOW_LIGHT }, line: { color: G_AMBER_DEEP, width: 1 }
  });
  slide.addText('TRANSITION TO ACT IV ➔ Moving from architectural guardrails to 10 live empirical SaaS Before -> After proof captures', {
    x: 0.8, y: 6.3, w: 11.7, h: 0.6, fontSize: 9.5, bold: true, color: G_AMBER_DEEP, fontFace: FONT_TITLE, valign: 'middle'
  });
}

// ============================================================================
// SLIDE 19: ACT IV TRANSITION BREAKER (EMPIRICAL SAAS EVIDENCE)
// ============================================================================
function buildSlide19_Act4Breaker() {
  buildActBreakerSlide({
    slideNum: 19,
    actTag: 'ACT IV TRANSITION',
    actNumber: 'ACT IV',
    actTitle: 'Empirical Evidence: 10 Genuine SaaS Proofs',
    actSubtitle: 'Authentic 2880×1800 Retina UI Captures Verifying Zero Cross-Tenant Leakage Across Live Commercial Software.',
    actColor: G_AMBER_DEEP,
    actTint: G_YELLOW_LIGHT,
    coreQuestion: 'Does the 5-Hop Cryptographic Architecture genuinely eliminate cross-tenant data exposure when evaluated against real-world, commercial third-party SaaS stacks on Google Cloud Run Gen2 and AWS EC2?',
    thesis: 'Evaluating 10 real enterprise SaaS targets before and after 5-hop enforcement proves that engine-level RLS, ARD scoping, and CMEK namespaces prevent 100% of data leaks across BI, SQL, telemetry, logs, and Git.',
    milestones: [
      { num: '01', title: 'Enterprise BI & Distributed SQL (Proofs 1–2)', desc: 'Metabase BI v0.50 (AlloyDB RLS isolates FinVault balances) & Trino SQL v440 (ARD blocks catalog reflection).', deliverable: 'BI & SQL' },
      { num: '02', title: 'Observability & Structured Logs (Proofs 3–4)', desc: 'Grafana Enterprise v11 (OTel namespace span injection) & Datalust Seq v2024 (Token-filtered audit signals).', deliverable: 'Telemetry' },
      { num: '03', title: 'CMEK Secrets & Columnar Analytics (Proofs 5–6)', desc: 'HashiCorp Vault v1.13 (<60s emergency transit key revocation) & ClickHouse v24.8 (SIMD block vector pruning).', deliverable: 'CMEK & SIMD' },
      { num: '04', title: 'ITSM, GxP Grids, Git SRE & HCM (Proofs 7–10)', desc: 'Redmine v5.1, NocoDB v0.255 (21 CFR Part 11 audit trails), Gitea v1.22 Git repos, and Directus v11.1 HR CRAC.', deliverable: 'Core SaaS' }
    ]
  });
}

// Reusable Helper for Before/After SaaS Proof Slides
interface SaasProofConfig {
  slideNum: number;
  proofNum: number;
  saasName: string;
  categoryTag?: string;
  title: string;
  subtitle: string;
  beforeImg: string;
  afterImg: string;
  beforeHeader: string;
  beforeVulnerability: string;
  beforeThreat: string;
  afterHeader: string;
  afterEnforcement: string;
  afterVerification: string;
}

function buildBeforeAfterSaasSlide(cfg: SaasProofConfig) {
  const slide = pptx.addSlide();
  addHeader(slide, cfg.categoryTag || `ACT IV • PROOF ${cfg.proofNum}`, cfg.title, cfg.slideNum);

  slide.addText(cfg.subtitle, {
    x: 0.6, y: 0.82, w: 12.133, h: 0.36, fontSize: 10.2, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const beforeImgPath = path.join(ROOT_DIR, 'screenshots', 'genuine-multicloud-3p-uis', 'before-after', cfg.beforeImg);
  const afterImgPath = path.join(ROOT_DIR, 'screenshots', 'genuine-multicloud-3p-uis', 'before-after', cfg.afterImg);

  // Left Card: BEFORE (Red Boundary)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 1.22, w: 5.95, h: 5.75, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_RED, width: 1.5 }
  });
  // Top Banner
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 1.22, w: 5.95, h: 0.38, fill: { color: G_RED_LIGHT }
  });
  slide.addText(cfg.beforeHeader, {
    x: 0.75, y: 1.22, w: 5.65, h: 0.38, fontSize: 8.8, bold: true, color: G_RED_DEEP, fontFace: FONT_TITLE, valign: 'middle'
  });

  // Image (Exact 1.600 aspect ratio: 5.68 / 3.55 = 1.600 - 0% distortion)
  if (fs.existsSync(beforeImgPath)) {
    slide.addImage({
      path: beforeImgPath,
      x: 0.735, y: 1.66, w: 5.68, h: 3.55
    });
  }

  // Under-image Analysis Box
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.735, y: 5.27, w: 5.68, h: 1.60, rectRadius: 0.05,
    fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.75 }
  });
  slide.addText('CRITICAL ATTACK VECTOR & ROOT CAUSE ANALYSIS', {
    x: 0.88, y: 5.35, w: 5.4, h: 0.22, fontSize: 8.0, bold: true, color: G_RED_DEEP, fontFace: FONT_TITLE
  });
  slide.addText([
    { text: '• Vulnerability: ', options: { bold: true, color: TEXT_DARK, fontSize: 8.0 } },
    { text: cfg.beforeVulnerability + '\n', options: { color: TEXT_DARK, fontSize: 8.0 } },
    { text: '• Adversarial Risk: ', options: { bold: true, color: G_RED_DEEP, fontSize: 8.0 } },
    { text: cfg.beforeThreat, options: { color: TEXT_DARK, fontSize: 8.0 } }
  ], {
    x: 0.88, y: 5.58, w: 5.4, h: 1.22, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
  });

  // Right Card: AFTER (Green Boundary)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.78, y: 1.22, w: 5.95, h: 5.75, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_GREEN, width: 1.5 }
  });
  // Top Banner
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.78, y: 1.22, w: 5.95, h: 0.38, fill: { color: G_GREEN_LIGHT }
  });
  slide.addText(cfg.afterHeader, {
    x: 6.93, y: 1.22, w: 5.65, h: 0.38, fontSize: 8.8, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE, valign: 'middle'
  });

  // Image (Exact 1.600 aspect ratio: 5.68 / 3.55 = 1.600 - 0% distortion)
  if (fs.existsSync(afterImgPath)) {
    slide.addImage({
      path: afterImgPath,
      x: 6.915, y: 1.66, w: 5.68, h: 3.55
    });
  }

  // Under-image Analysis Box
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.915, y: 5.27, w: 5.68, h: 1.60, rectRadius: 0.05,
    fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.75 }
  });
  slide.addText('VERIFIED CRYPTOGRAPHIC ENFORCEMENT & ENGINE BOUNDARY', {
    x: 7.06, y: 5.35, w: 5.4, h: 0.22, fontSize: 8.0, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE
  });
  slide.addText([
    { text: '• Engine Boundary: ', options: { bold: true, color: TEXT_DARK, fontSize: 8.0 } },
    { text: cfg.afterEnforcement + '\n', options: { color: TEXT_DARK, fontSize: 8.0 } },
    { text: '• Verified Privacy: ', options: { bold: true, color: G_GREEN_DEEP, fontSize: 8.0 } },
    { text: cfg.afterVerification, options: { color: TEXT_DARK, fontSize: 8.0 } }
  ], {
    x: 7.06, y: 5.58, w: 5.4, h: 1.22, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
  });
}

// SLIDE 19: Proof 1 — Metabase Enterprise BI
function buildSlide20_Metabase() {
  buildBeforeAfterSaasSlide({
    slideNum: 20,
    proofNum: 1,
    saasName: 'Metabase Enterprise BI',
    title: 'Proof 1: Metabase Enterprise BI v0.50.26 — Tenant Analytics & Dashboard Isolation',
    subtitle: 'Authentic 2880x1800 Retina UI captures verifying that Hop 5 AlloyDB RLS strictly isolates tenant analytics and prevents cross-tenant data leakage.',
    beforeImg: 'before_01_metabase_bi.png',
    afterImg: 'after_01_metabase_bi.png',
    beforeHeader: 'BEFORE: GLOBAL UNFILTERED BI (CROSS-TENANT LEAKAGE)',
    beforeVulnerability: 'Shared PostgreSQL/AlloyDB connection pool lacks tenant predicates. Orders, GMV, and account balances from FinVault Bank, RetailStream Corp, and commercial tenants are merged into a single dashboard.',
    beforeThreat: 'Business users or rogue agent workflows can inspect competitor order volumes and transaction totals across all 1,000 tenants with zero engine-level boundary.',
    afterHeader: 'AFTER: GOVERNED HOP 5 ALLOYDB RLS (STRICT TENANT ISOLATION)',
    afterEnforcement: 'When connecting, the proxy/agent presents a signed TenantContext JWT. AlloyDB executes SET LOCAL app.current_tenant_id = \'retailstream\' on session checkout.',
    afterVerification: 'The dashboard displays exclusively RetailStream Corp transactions. Competitor records are cryptographically invisible at the engine level (0 leaked rows).'
  });
}

// SLIDE 20: Proof 2 — Trino Distributed SQL
function buildSlide21_Trino() {
  buildBeforeAfterSaasSlide({
    slideNum: 21,
    proofNum: 2,
    saasName: 'Trino Distributed SQL',
    title: 'Proof 2: Trino Distributed SQL v440 — Federated Catalog & Query Scoping',
    subtitle: 'Authentic 2880x1800 Retina UI captures demonstrating that distributed SQL query federation in Trino v440 enforces strict catalog boundaries and blocks unauthorized schema reflection.',
    beforeImg: 'before_06_trino_sql.png',
    afterImg: 'after_06_trino_sql.png',
    beforeHeader: 'BEFORE: UNRESTRICTED SQL CATALOG (CROSS-TENANT SCHEMA EXPOSURE)',
    beforeVulnerability: 'Standard Trino query federation allows any connected client or agent to execute SHOW CATALOGS and SHOW SCHEMAS, reflecting all internal database metadata.',
    beforeThreat: 'Exposed schemas allow enumeration of private customer data lakes across BigQuery, AlloyDB, and external cloud datalakes without access controls.',
    afterHeader: 'AFTER: ARD CATALOG SCOPING & SYSTEM ACCESS CONTROL',
    afterEnforcement: 'Hop 2 Agent Registry Discovery (ARD) catalog scoping combined with Trino System Access Control restricts visibility strictly to authorized tenant schemas.',
    afterVerification: 'Inquiries into competitor catalogs throw access denied (SQL_ANALYSIS_ERROR). Cross-tenant schema enumeration and data exfiltration are completely blocked.'
  });
}

// SLIDE 21: Proof 3 — Grafana Enterprise
function buildSlide22_Grafana() {
  buildBeforeAfterSaasSlide({
    slideNum: 22,
    proofNum: 3,
    saasName: 'Grafana Enterprise',
    title: 'Proof 3: Grafana Enterprise v11.1 — Multi-Tenant Telemetry & Metrics Isolation',
    subtitle: 'Authentic 2880x1800 Retina UI captures proving that OpenTelemetry collector namespace injection eliminates noisy-neighbor metric pollution in enterprise dashboards.',
    beforeImg: 'before_02_grafana_enterprise.png',
    afterImg: 'after_02_grafana_enterprise.png',
    beforeHeader: 'BEFORE: UNPARTITIONED TELEMETRY (NOISY NEIGHBOR SPAN POLLUTION)',
    beforeVulnerability: 'Prometheus and Cloud Monitoring metric streams are ingested into a shared workspace without tenant scoping, mixing high-frequency traffic across tenants.',
    beforeThreat: 'High-traffic tenant spikes degrade dashboard rendering, and tenant service names, latency profiles, and operational error counts are mutually visible.',
    afterHeader: 'AFTER: OTEL TENANT NAMESPACE INJECTION + ORG SCOPING',
    afterEnforcement: 'OpenTelemetry collector automatically injects immutable tenant_id resource attributes into all spans and metrics at ingress. Grafana org-scoped data sources restrict queries.',
    afterVerification: 'Telemetry queries strictly filter on the caller\'s namespace. Cross-tenant metrics are completely isolated; noisy neighbor spikes cannot pollute partner graphs.'
  });
}

// SLIDE 22: Proof 4 — Datalust Seq OTel
function buildSlide23_DatalustSeq() {
  buildBeforeAfterSaasSlide({
    slideNum: 23,
    proofNum: 4,
    saasName: 'Datalust Seq OTel',
    title: 'Proof 4: Datalust Seq OTel v2024 — Structured Log Streams & Distributed Trace Isolation',
    subtitle: 'Authentic 2880x1800 Retina UI captures showing that Cloud Run token filtering and Seq Signal partitions prevent cross-tenant audit log and trace disclosure.',
    beforeImg: 'before_09_datalust_seq.png',
    afterImg: 'after_09_datalust_seq.png',
    beforeHeader: 'BEFORE: SHARED LOG STREAM (INTERLEAVED CROSS-TENANT AUDIT LOGS)',
    beforeVulnerability: 'Centralized structured log ingestion intermixes debug logs, exception stack traces, and operational metadata across tenants into a single searchable stream.',
    beforeThreat: 'Unfiltered full-text log searches inadvertently expose customer PII, internal account IDs, and sensitive payload fragments across organizational boundaries.',
    afterHeader: 'AFTER: CR-ENFORCED TENANT TOKEN FILTERS & SCOPED SIGNALS',
    afterEnforcement: 'Cloud Run middleware validates JWT claims and binds each log ingestion pipe to a tenant-specific API key and Seq Signal filter with automated PII masking.',
    afterVerification: 'Audit queries return strictly the caller\'s scoped audit events. Cross-tenant log streams are segregated with zero bleed into foreign searches.'
  });
}

// SLIDE 23: Proof 5 — HashiCorp Vault CMEK
function buildSlide24_HashiCorpVault() {
  buildBeforeAfterSaasSlide({
    slideNum: 24,
    proofNum: 5,
    saasName: 'HashiCorp Vault CMEK',
    title: 'Proof 5: HashiCorp Vault CMEK v1.13 — Tenant Key Namespace & Emergency Revocation',
    subtitle: 'Authentic 2880x1800 Retina UI captures demonstrating independent cryptographic key namespaces and sub-60-second emergency kill-switch revocation.',
    beforeImg: 'before_10_hashicorp_vault.png',
    afterImg: 'after_10_hashicorp_vault.png',
    beforeHeader: 'BEFORE: SHARED ENCRYPTION ROOTS (BLAST-RADIUS RISK)',
    beforeVulnerability: 'Multi-tenant database tables and secret stores rely on a shared platform master encryption key managed at the service level without per-tenant isolation.',
    beforeThreat: 'A single key compromise exposes all 1,000 tenants simultaneously. Regulated clients cannot exercise independent regulatory revocation without platform-wide downtime.',
    afterHeader: 'AFTER: PER-TENANT CMEK NAMESPACES & <60s EMERGENCY REVOCATION',
    afterEnforcement: 'Each enterprise tenant provisions a dedicated Cloud KMS / Vault transit key (projects/{tenant}/keyRings/{tenant}-ring) bound to the tenant\'s IAM perimeter.',
    afterVerification: 'Emergency key disabling instantly crypto-shreds tenant storage and triggers a synchronous Valkey cache purge in <60s with zero operational disruption to neighboring tenants.'
  });
}

// SLIDE 24: Proof 6 — ClickHouse Analytics
function buildSlide25_ClickHouse() {
  buildBeforeAfterSaasSlide({
    slideNum: 25,
    proofNum: 6,
    saasName: 'ClickHouse Analytics',
    title: 'Proof 6: ClickHouse Analytics v24.8 — Real-Time Columnar Engine Row-Level Security',
    subtitle: 'Authentic 2880x1800 Retina UI captures verifying that ClickHouse Row Policy enforces SIMD vector pruning to block cross-tenant columnar analytical record access.',
    beforeImg: 'before_07_clickhouse_rls.png',
    afterImg: 'after_07_clickhouse_rls.png',
    beforeHeader: 'BEFORE: UNGUARDED COLUMNAR SCANS (CROSS-TENANT RECORD ACCESS)',
    beforeVulnerability: 'High-performance columnar scans prioritize raw throughput, scanning all tenant rows in columnar blocks and returning raw multi-tenant data sets in aggregations.',
    beforeThreat: 'Analytical queries aggregate across all tenant records in memory, exposing high-frequency clickstream, transaction volumes, and financial telemetry.',
    afterHeader: 'AFTER: ENGINE-LEVEL ROW POLICIES (WHERE tenant_id = currentUser())',
    afterEnforcement: 'Native ClickHouse Row Policy defines deterministic access rules enforced directly in the SIMD vector engine during disk-to-memory block decoding.',
    afterVerification: 'Blocks belonging to foreign tenants are pruned before entering the vectorized query pipeline. Execution latency remains sub-15ms with 100% tenant isolation.'
  });
}

// SLIDE 25: Proof 7 — Redmine ITSM
function buildSlide26_Redmine() {
  buildBeforeAfterSaasSlide({
    slideNum: 26,
    proofNum: 7,
    saasName: 'Redmine ITSM',
    title: 'Proof 7: Redmine ITSM v5.1 — Multi-Tenant Support Case & Ticket Partitioning',
    subtitle: 'Authentic 2880x1800 Retina UI captures proving that TenantContext JWT project isolation conceals confidential support tickets, notes, and attachments.',
    beforeImg: 'before_03_redmine_itsm.png',
    afterImg: 'after_03_redmine_itsm.png',
    beforeHeader: 'BEFORE: GLOBAL PROJECT TICKETS (CROSS-ORGANIZATION CASE LEAK)',
    beforeVulnerability: 'IT service management portal displays support tickets, incident descriptions, and internal remediation comments in global issue lists without organizational boundaries.',
    beforeThreat: 'Enterprise support engineers or automated triage agents can view confidential vulnerability reports, vendor disclosures, and internal incidents from competing clients.',
    afterHeader: 'AFTER: TENANT-BOUND PROJECT ISOLATION & ROLE PERMISSIONS',
    afterEnforcement: 'TenantContext JWT dynamically scopes user and agent roles to explicit tenant project hierarchies and custom permission matrices.',
    afterVerification: 'Cross-organization tickets, private notes, and custom fields are completely invisible. Support workflows operate in airtight organizational silos.'
  });
}

// SLIDE 26: Proof 8 — NocoDB GxP Grid
function buildSlide27_NocoDB() {
  buildBeforeAfterSaasSlide({
    slideNum: 27,
    proofNum: 8,
    saasName: 'NocoDB GxP Grid',
    title: 'Proof 8: NocoDB GxP v0.255 — Regulated Database Grid & Field-Level Access Scoping',
    subtitle: 'Authentic 2880x1800 Retina UI captures verifying that dynamic role view filtering satisfies 21 CFR Part 11 electronic records isolation and audit trail requirements.',
    beforeImg: 'before_04_nocodb_gxp.png',
    afterImg: 'after_04_nocodb_gxp.png',
    beforeHeader: 'BEFORE: UNPROTECTED SPREADSHEET GRID (REGULATED DATA EXPOSURE)',
    beforeVulnerability: 'Low-code relational spreadsheet views display clinical trial records, manufacturing batches, and supply chain records without row-level or column-level tenant scoping.',
    beforeThreat: 'Violates FDA 21 CFR Part 11 and EU Annex 11 compliance by allowing unauthorized users to inspect and modify regulated records belonging to other pharmaceutical sponsors.',
    afterHeader: 'AFTER: ROLE-SCOPED VIEWS & TENANT AUDIT TRAIL LOGGING',
    afterEnforcement: 'Dynamic view filters enforce tenant role restrictions on every API request, while an immutable audit log records every cell read and modification with cryptographic timestamps.',
    afterVerification: 'Users only access validated rows within their organizational envelope, satisfying GxP regulatory compliance and multi-tenant audit requirements.'
  });
}

// SLIDE 27: Proof 9 — Gitea SRE
function buildSlide28_Gitea() {
  buildBeforeAfterSaasSlide({
    slideNum: 28,
    proofNum: 9,
    saasName: 'Gitea SRE',
    title: 'Proof 9: Gitea SRE v1.22 — Tenant Repository & Enterprise CI/CD Pipeline Isolation',
    subtitle: 'Authentic 2880x1800 Retina UI captures demonstrating zero-knowledge repository indexing and branch policy segregation across tenant organizations.',
    beforeImg: 'before_05_gitea_sre.png',
    afterImg: 'after_05_gitea_sre.png',
    beforeHeader: 'BEFORE: OPEN REPOSITORY DISCOVERY (PROPRIETARY SOURCE CODE VISIBILITY)',
    beforeVulnerability: 'Internal Git server allows cross-organization repository discovery, exposing private tenant microservice repositories, CI/CD workflow YAMLs, and infrastructure definitions.',
    beforeThreat: 'Proprietary algorithmic code, hardcoded configuration files, and internal deployment architectures are visible to developers and agents across all tenant organizations.',
    afterHeader: 'AFTER: STRICT ORG ISOLATION & PRIVATE REPOSITORY GUARDS',
    afterEnforcement: 'Organization boundaries strictly enforce zero-knowledge repository indexing. Tenant developers and CI bots only see authorized private repositories and pipeline secrets.',
    afterVerification: 'Repository access, branch policies, and webhooks are restricted strictly to authenticated tenant credentials with signed Git commit verification.'
  });
}

// SLIDE 28: Proof 10 — Directus HCM
function buildSlide29_Directus() {
  buildBeforeAfterSaasSlide({
    slideNum: 29,
    proofNum: 10,
    saasName: 'Directus HCM',
    title: 'Proof 10: Directus HCM v11.1 — Human Capital Data & Tenant Role Scoping',
    subtitle: 'Authentic 2880x1800 Retina UI captures confirming that Custom Role Access Control (CRAC) policies filter HR and executive compensation models down to tenant boundaries.',
    beforeImg: 'before_08_directus_hcm.png',
    afterImg: 'after_08_directus_hcm.png',
    beforeHeader: 'BEFORE: UNRESTRICTED COLLECTIONS (HR & COMPENSATION DATA LEAK)',
    beforeVulnerability: 'Headless CMS data models expose employee salaries, sensitive PII, and executive organizational structures across tenant accounts without granular policy constraints.',
    beforeThreat: 'HR data models are vulnerable to inadvertent data leaks where an employee or agent in Tenant A queries compensation bands or personal contacts of Tenant B.',
    afterHeader: 'AFTER: GRANULAR CRAC POLICIES & JWT TENANT CONTEXT',
    afterEnforcement: 'Directus Custom Role Access Control (CRAC) policies validate the signed JWT tenant_id claim, filtering collection views to authorized enterprise employees only.',
    afterVerification: 'Compensation records, performance reviews, and personal identifiers are strictly segregated at the data layer, ensuring GDPR and CCPA compliance.'
  });
}

// ============================================================================
// SLIDE 29: ACT V TRANSITION BREAKER (PRODUCTION ROADMAP & SYNTHESIS)
// ============================================================================
function buildSlide30_Act5Breaker() {
  buildActBreakerSlide({
    slideNum: 30,
    actTag: 'ACT V TRANSITION',
    actNumber: 'ACT V',
    actTitle: 'Production Rollout Roadmap & Multi-Cloud Synthesis',
    actSubtitle: 'Actionable 10-Week Engineering Implementation Plan & Multi-Cloud SLA Scorecard.',
    actColor: G_NAVY,
    actTint: 'E2E8F0',
    coreQuestion: 'How does an enterprise engineering organization operationalize this architecture over a 10-week implementation lifecycle with verified infrastructure SLAs and automated testing?',
    thesis: 'Combining phased engineering rollout gates with automated multi-cloud verification ensures seamless production cutovers with zero regressions, sub-42ms latency, and 84.7% cache cost savings.',
    milestones: [
      { num: '01', title: 'Phase 1–2: Ingress & Identity Foundation', desc: 'Deploying Cloud Armor L7 WAF rules, IAM STS minting, RFC 9449 DPoP, and Discovery Engine ARD tool catalogs.', deliverable: 'Weeks 1–4' },
      { num: '02', title: 'Phase 3–4: Bulkheads, Caching & Engine RLS', desc: 'Memorystore Valkey token bulkheads, prefix prompt caching, Model Armor, and AlloyDB PostgreSQL RLS.', deliverable: 'Weeks 5–8' },
      { num: '03', title: 'Phase 5: Terraform Factory & Penetration Testing', desc: '1-Click Terraform Blueprints, Pattern C PSC tier promotion, and automated red-team breach fuzzing.', deliverable: 'Weeks 9–10' },
      { num: '04', title: 'Quantified 10-SaaS Multi-Cloud Scorecard', desc: 'Verifying 30/30 test assertions across Google Cloud Run Gen2 and AWS EC2 with zero cross-tenant leakage.', deliverable: 'SLA Scorecard' }
    ]
  });
}

// ============================================================================
// SLIDE 30: 10-Week Implementation Roadmap & Executive CTA
// ============================================================================
function buildSlide31_Roadmap() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT V • IMPLEMENTATION ROADMAP', '10-Week Enterprise Implementation Roadmap & Companion Resources', 30);

  slide.addText('Structured enterprise rollout plan to take multi-tenant agentic AI from architecture to production GA.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const phases = [
    { phase: 'PHASE 1', weeks: 'Weeks 1–2', title: 'Architecture & Threat Modeling', deliverables: 'Security boundary sign-off, ADR creation, DPoP key architecture' },
    { phase: 'PHASE 2', weeks: 'Weeks 3–4', title: '5-Hop Cryptographic Baseline', deliverables: 'Hop 1 PEP Cloud Armor ingress, STS KMS token minting, ARD catalog' },
    { phase: 'PHASE 3', weeks: 'Weeks 5–6', title: 'Pattern A High-Density Pooled', deliverables: 'Cloud Run deployment, AlloyDB RLS policies, Valkey bulkheads' },
    { phase: 'PHASE 4', weeks: 'Weeks 7–8', title: 'Pattern B & C Sovereign Spokes', deliverables: 'VPC-SC perimeter automation, CMEK kill-switches, PSC transit hub' },
    { phase: 'PHASE 5', weeks: 'Weeks 9–10', title: 'Penetration Testing & GA Launch', deliverables: '10/10 Red-team breach fuzzing, FinOps telemetry, production cutover' }
  ];

  phases.forEach((p, i) => {
    const px = 0.6 + i * 2.47;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: px, y: 1.35, w: 2.25, h: 4.0, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: G_BLUE, width: 1.2 }
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: px + 0.175, y: 1.55, w: 1.9, h: 0.35, rectRadius: 0.05,
      fill: { color: G_BLUE_LIGHT }, line: { color: G_BLUE, width: 0.5 }
    });
    slide.addText(`${p.phase} • ${p.weeks}`, {
      x: px + 0.175, y: 1.55, w: 1.9, h: 0.35,
      fontSize: 8, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
    });

    slide.addText(p.title, {
      x: px + 0.125, y: 2.05, w: 2.0, h: 0.6,
      fontSize: 10.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, align: 'center'
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: px + 0.275, y: 2.75, w: 1.7, h: 0.02, fill: { color: G_GREY_BORDER }
    });

    slide.addText(p.deliverables, {
      x: px + 0.125, y: 2.9, w: 2.0, h: 2.2,
      fontSize: 8.5, color: TEXT_MUTED, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
    });
  });

  // Bottom Executive Call to Action Strip
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 5.55, w: 12.133, h: 1.35, rectRadius: 0.08,
    fill: { color: G_NAVY }
  });
  slide.addText('EXECUTIVE CALL TO ACTION: ACCESS PRODUCTION RESOURCES', {
    x: 0.9, y: 5.7, w: 11.5, h: 0.3, fontSize: 11, bold: true, color: G_YELLOW, fontFace: FONT_TITLE
  });
  slide.addText('Explore live BeyondCorp prototypes, download production Terraform blueprints, or engage Google Cloud FDE for an enterprise architecture workshop.', {
    x: 0.9, y: 6.0, w: 11.5, h: 0.3, fontSize: 9.5, color: 'CBD5E1', fontFace: FONT_BODY
  });

  const links = [
    'Live Portal: https://ge-blogs-248990048888.cr.gclb.goog',
    'GitHub Source: https://github.com/cloud-ai-fde/ge-blogs',
    'Google Cloud Architecture Center Advisory: cfe-support@google.com'
  ];
  slide.addText(links.join('   •   '), {
    x: 0.9, y: 6.4, w: 11.5, h: 0.35, fontSize: 8.5, bold: true, color: '38BDF8', fontFace: FONT_BODY
  });
}

// ============================================================================
// SLIDE 31: Quantified Multi-Cloud SaaS Isolation Scorecard & 10/10 Verification Matrix
// ============================================================================
function buildSlide32_Scorecard() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT V • VERIFICATION MATRIX', 'Quantified Multi-Cloud SaaS Isolation Scorecard & 10/10 Verification Matrix', 31);

  slide.addText('Empirical production benchmarks verified across 10 third-party SaaS stacks on Google Cloud Run Gen2 and AWS EC2 (30/30 Test Assertions Passed).', {
    x: 0.6, y: 0.82, w: 12.133, h: 0.36, fontSize: 10.2, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  // 4 Top KPI Cards
  const kpis = [
    { num: '10 / 10', label: 'SaaS Platforms Verified', sub: 'Zero Cross-Tenant Leaks', color: G_BLUE, tint: G_BLUE_LIGHT },
    { num: '84.7%', label: 'Inference Cost Reduction', sub: 'Prefix Prompt Caching', color: G_GREEN_DEEP, tint: G_GREEN_LIGHT },
    { num: '< 42 ms', label: 'p95 Control-Plane Latency', sub: '5-Hop Token Mint & Check', color: 'B45309', tint: G_YELLOW_LIGHT },
    { num: '< 60 s', label: 'CMEK Kill-Switch', sub: 'Instant Sovereign Revocation', color: G_RED_DEEP, tint: G_RED_LIGHT }
  ];

  kpis.forEach((k, i) => {
    const kx = 0.6 + i * 3.09;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: kx, y: 1.25, w: 2.87, h: 1.1, rectRadius: 0.06,
      fill: { color: k.tint }, line: { color: k.color, width: 1.2 }
    });
    slide.addText(k.num, {
      x: kx, y: 1.32, w: 2.87, h: 0.42, fontSize: 20, bold: true, color: k.color, fontFace: FONT_TITLE, align: 'center'
    });
    slide.addText(k.label, {
      x: kx, y: 1.74, w: 2.87, h: 0.25, fontSize: 8.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, align: 'center'
    });
    slide.addText(k.sub, {
      x: kx, y: 1.98, w: 2.87, h: 0.22, fontSize: 7.5, color: TEXT_MUTED, fontFace: FONT_BODY, align: 'center'
    });
  });

  // Table with 10 SaaS targets
  const headers = [
    { text: 'TARGET PLATFORM', options: { bold: true, color: WHITE, fill: { color: G_NAVY }, fontSize: 8.0, align: 'left' } },
    { text: 'ARCHITECTURAL DOMAIN', options: { bold: true, color: WHITE, fill: { color: G_NAVY }, fontSize: 8.0, align: 'left' } },
    { text: 'UPSTREAM STACK', options: { bold: true, color: WHITE, fill: { color: G_NAVY }, fontSize: 8.0, align: 'center' } },
    { text: 'UNGUARDED VULNERABILITY (BEFORE)', options: { bold: true, color: WHITE, fill: { color: G_NAVY }, fontSize: 8.0, align: 'left' } },
    { text: '5-HOP CRYPTOGRAPHIC SHIELD (AFTER)', options: { bold: true, color: WHITE, fill: { color: G_NAVY }, fontSize: 8.0, align: 'left' } },
    { text: 'VERIFIED SLA', options: { bold: true, color: WHITE, fill: { color: G_NAVY }, fontSize: 8.0, align: 'center' } }
  ];

  const rows = [
    ['Metabase v0.50.26', 'Enterprise BI & Analytics', 'Cloud Run Gen2', 'Unscoped dashboards aggregate multi-tenant GMV/orders', 'Hop 5 AlloyDB RLS (SET LOCAL current_tenant_id)', '0 Leaked Rows'],
    ['Trino SQL v440', 'Distributed Query Federation', 'AWS EC2 (m6i)', 'SHOW CATALOGS exposes cross-tenant datalake tables', 'Hop 2 ARD Catalog Scoping + System Access Control', 'Catalog Denied'],
    ['Grafana v11.1', 'Observability & Metrics', 'Cloud Run Gen2', 'Interleaved Prometheus metrics & noisy neighbor spikes', 'Hop 3 OTel collector tenant namespace injection', 'Org Scoped'],
    ['Datalust Seq v2024', 'Structured Audit Logs', 'Cloud Run Gen2', 'Shared full-text log search leaks cross-tenant PII', 'Hop 1 Cloud Armor + CR Token Filters & Signal scopes', 'Strict Stream Segregation'],
    ['HashiCorp Vault v1.13', 'CMEK Key Management', 'AWS EC2 (m6i)', 'Single shared encryption root; no independent kill-switch', 'Hop 4 Dedicated Cloud KMS / Vault transit key per tenant', '<60s Kill-Switch'],
    ['ClickHouse v24.8', 'Columnar Vector Engine', 'AWS EC2 (m6i)', 'SIMD block scans return multi-tenant data in memory', 'Hop 5 Native Row Policy (WHERE tenant_id = currentUser())', 'Vector Pruned (<15ms)'],
    ['Redmine ITSM v5.1', 'ITSM & Case Management', 'Cloud Run Gen2', 'Public issue lists expose competitor tickets and notes', 'Hop 1-3 TenantContext JWT project & role scoping', 'Zero Case Leakage'],
    ['NocoDB v0.255', 'GxP Regulated Database', 'Cloud Run Gen2', 'Relational grid displays unmasked clinical trial data', 'Hop 2 Role-based views + 21 CFR Part 11 audit trails', 'GxP Compliant'],
    ['Gitea SRE v1.22', 'Source Code & CI/CD', 'AWS EC2 (m6i)', 'Open repository indexing exposes proprietary microservices', 'Hop 3 Organization isolation & private repository guards', 'Sealed Git Repo'],
    ['Directus HCM v11.1', 'HR & Human Capital Mgmt', 'Cloud Run Gen2', 'CMS data models leak salary bands & employee PII', 'Hop 5 Custom Role Access Control (CRAC) policies', 'GDPR/CCPA Bound']
  ];

  const tableData = [headers];
  rows.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? WHITE : G_GREY_BG;
    tableData.push([
      { text: r[0], options: { bold: true, color: TEXT_DARK, fill: { color: bg }, fontSize: 7.5, align: 'left' } },
      { text: r[1], options: { color: TEXT_MUTED, fill: { color: bg }, fontSize: 7.5, align: 'left' } },
      { text: r[2], options: { color: G_BLUE_DARK, bold: true, fill: { color: bg }, fontSize: 7.5, align: 'center' } },
      { text: r[3], options: { color: G_RED_DEEP, fill: { color: bg }, fontSize: 7.2, align: 'left' } },
      { text: r[4], options: { color: G_GREEN_DEEP, bold: true, fill: { color: bg }, fontSize: 7.2, align: 'left' } },
      { text: r[5], options: { color: G_BLUE, bold: true, fill: { color: bg }, fontSize: 7.2, align: 'center' } }
    ]);
  });

  slide.addTable(tableData, {
    x: 0.6, y: 2.50, w: 12.133, h: 4.45,
    colW: [1.7, 1.9, 1.3, 3.1, 3.1, 1.033],
    border: { pt: 0.5, color: G_GREY_BORDER }
  });
}

// Build all 31 slides
console.log('Compiling 100% native DrawingML editable 32-slide executive presentation with clear Act 1 -> Act 2 -> Act 3 -> Act 4 -> Act 5 transitions...');

async function main() {
  console.log('🎞️  Building WS1 32-Slide Visual Deck with Agenda, Act Breakers (Acts I-V), L1-L4 DrawingML Diagrams & 10 Genuine SaaS Proofs...');
  
  // Slide 01: Title
  buildSlide01();
  
  // Slide 02: Executive Storyline & 4-Act Agenda
  buildSlide02_Agenda();
  
  // ACT I: THE PROBLEM & ATTACK SURFACE (Slides 03-04)
  buildSlide03_Dilemma();
  buildSlide04_ThreatVectors();
  
  // ACT II: REFERENCE ARCHITECTURE & TOPOLOGIES (Slides 05-10)
  buildSlide05_Act2Breaker();
  buildSlide06_PatternA();
  buildSlide07_PatternBC();
  buildSlide08_L1Logical();
  await buildSlide09_Figure1();
  await buildSlide10_Figure2();
  
  // ACT III: 5-HOP CRYPTOGRAPHIC PIPELINE & DEEP EXECUTION (Slides 11-18)
  buildSlide11_Act3Breaker();
  buildSlide12_L3Process();
  buildSlide13_L4Wire();
  buildSlide14_CircuitBreakers();
  buildSlide15_AlloyDbRls();
  buildSlide16_FinOpsValkey();
  buildSlide17_Simulation();
  buildSlide18_ArchitecturalCaveats();
  
  // ACT IV: EMPIRICAL EVIDENCE & 10 GENUINE SAAS PROOFS (Slides 19-29)
  buildSlide19_Act4Breaker();
  buildSlide20_Metabase();
  buildSlide21_Trino();
  buildSlide22_Grafana();
  buildSlide23_DatalustSeq();
  buildSlide24_HashiCorpVault();
  buildSlide25_ClickHouse();
  buildSlide26_Redmine();
  buildSlide27_NocoDB();
  buildSlide28_Gitea();
  buildSlide29_Directus();
  
  // ACT V: PRODUCTION SYNTHESIS & 10-WEEK ROADMAP (Slides 29-31)
  buildSlide30_Act5Breaker();
  buildSlide31_Roadmap();
  buildSlide32_Scorecard();

  await pptx.writeFile({ fileName: OUTPUT_PPTX });
  console.log(`✅ Successfully compiled ${OUTPUT_PPTX} (32 slides [Full 5-Act Narrative with Storyline, Act Breakers, L1-L4 DrawingML, Architectural Caveats, 10 SaaS Proofs & Scorecard])`);

  postProcessPptxArrowheadsForGoogleSlides();
  console.log('✅ Post-processed arrowheads and connectors for Google Slides compatibility');
}

main().catch(err => {
  console.error('Error generating presentation:', err);
  process.exit(1);
});
