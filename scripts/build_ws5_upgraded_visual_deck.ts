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
const OUTPUT_PPTX = path.join(ROOT_DIR, 'slides', 'ws5-12slide-visual-deck.pptx');

const pptx = newDeck('Multi-Tenant Agentic AI on Google Cloud: Executive Decision Guide & Agentic Triad');

// Reusable Executive Palette
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

const FULL_34_MODE = process.argv.includes('--full-34');
const TOTAL_SLIDES = FULL_34_MODE ? 34 : 24;
let _slideCounter = 1;
function nextSlideNum(): number {
  return ++_slideCounter;
}

function addHeader(slide: any, category: string, title: string, slideNum: number, totalSlides: number = TOTAL_SLIDES) {
  // Category Pill
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 0.35, w: 2.5, h: 0.3, rectRadius: 0.05,
    fill: { color: G_BLUE_LIGHT }, line: { color: G_BLUE, width: 1 }
  });
  slide.addText(category, {
    x: 0.6, y: 0.35, w: 2.5, h: 0.3,
    fontSize: 9, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
  });

  // Slide Title
  slide.addText(title, {
    x: 3.3, y: 0.22, w: 9.3, h: 0.51,
    fontSize: 15.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, valign: 'middle'
  });

  // Top Accent Line
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 0.75, w: 12.133, h: 0.02, fill: { color: G_GREY_BORDER }
  });

  // Footer
  slide.addText('Google Cloud Architecture Center  •  Workstream 5 of 5  •  Executive Decision Guide & Agentic Triad (100% Native DrawingML)', {
    x: 0.6, y: 7.1, w: 10.5, h: 0.3, fontSize: 8.5, color: TEXT_MUTED, fontFace: FONT_BODY
  });
  slide.addText(`${slideNum} / ${totalSlides}`, {
    x: 11.5, y: 7.1, w: 1.233, h: 0.3, fontSize: 8.5, bold: true, color: G_BLUE, fontFace: FONT_TITLE, align: 'right'
  });
}

// Reusable Act Breaker Slide Builder
interface ActBreakerConfig {
  slideNum?: number;
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

  // Light Theme Left Anchor Card (Rule 54 Compliant)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 0.6, w: 4.8, h: 6.3, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: cfg.actColor, width: 2 }
  });

  // Light Tinted Top Banner
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 0.6, w: 4.8, h: 2.00, fill: { color: cfg.actTint }
  });

  // Category Tag Pill
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.95, y: 0.78, w: 4.1, h: 0.30, rectRadius: 0.06,
    fill: { color: WHITE }, line: { color: cfg.actColor, width: 1 }
  });
  slide.addText(cfg.actTag, {
    x: 0.95, y: 0.78, w: 4.1, h: 0.30,
    fontSize: 8.5, bold: true, color: cfg.actColor, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
  });

  // Act Number & Title
  slide.addText(cfg.actNumber, {
    x: 0.95, y: 1.16, w: 4.1, h: 0.44,
    fontSize: 24, bold: true, color: cfg.actColor, fontFace: FONT_TITLE
  });
  slide.addText(cfg.actTitle, {
    x: 0.95, y: 1.64, w: 4.1, h: 0.88,
    fontSize: 13.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.12, valign: 'top'
  });

  // Core Question Callout Box
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.95, y: 2.75, w: 4.1, h: 1.95, rectRadius: 0.06,
    fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.75 }
  });
  slide.addText('CORE ARCHITECTURAL QUESTION', {
    x: 1.1, y: 2.86, w: 3.8, h: 0.22,
    fontSize: 8.0, bold: true, color: cfg.actColor, fontFace: FONT_TITLE
  });
  slide.addText(`"${cfg.coreQuestion}"`, {
    x: 1.1, y: 3.12, w: 3.8, h: 1.48,
    fontSize: 10.2, italic: true, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2, valign: 'top'
  });

  // Thesis Box
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.95, y: 4.85, w: 4.1, h: 1.85, rectRadius: 0.06,
    fill: { color: WHITE }, line: { color: G_GREY_BORDER, width: 0.75 }
  });
  slide.addText('ARCHITECTURAL THESIS', {
    x: 1.1, y: 4.96, w: 3.8, h: 0.22,
    fontSize: 8.0, bold: true, color: cfg.actColor, fontFace: FONT_TITLE
  });
  slide.addText(cfg.thesis, {
    x: 1.1, y: 5.22, w: 3.8, h: 1.38,
    fontSize: 9.0, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.18, valign: 'top'
  });

  // Right Side: Milestones & Agenda Cards
  slide.addText('ACT ROADMAP & DELIVERABLES', {
    x: 5.7, y: 0.65, w: 7.0, h: 0.3,
    fontSize: 10, bold: true, color: TEXT_MUTED, fontFace: FONT_TITLE
  });
  slide.addText(cfg.actSubtitle, {
    x: 5.7, y: 0.96, w: 7.0, h: 0.54,
    fontSize: 13.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, valign: 'top'
  });

  cfg.milestones.forEach((m, idx) => {
    const cardY = 1.6 + idx * 1.25;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.7, y: cardY, w: 7.0, h: 1.12, rectRadius: 0.06,
      fill: { color: WHITE }, line: { color: G_GREY_BORDER, width: 1 }
    });

    // Milestone Number Badge
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.85, y: cardY + 0.16, w: 0.8, h: 0.8, rectRadius: 0.05,
      fill: { color: cfg.actTint }, line: { color: cfg.actColor, width: 1 }
    });
    slide.addText(m.num, {
      x: 5.85, y: cardY + 0.16, w: 0.8, h: 0.8,
      fontSize: 14, bold: true, color: cfg.actColor, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
    });

    // Milestone Details
    slide.addText(m.title, {
      x: 6.8, y: cardY + 0.14, w: 5.7, h: 0.3,
      fontSize: 11.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
    });
    slide.addText(m.desc, {
      x: 6.8, y: cardY + 0.44, w: 5.7, h: 0.42,
      fontSize: 9, color: TEXT_MUTED, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
    });

    // Deliverable Tag
    slide.addText(`Deliverable: ${m.deliverable}`, {
      x: 6.8, y: cardY + 0.84, w: 5.7, h: 0.22,
      fontSize: 8, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE
    });
  });

  // Footer
  slide.addText(`Google Cloud Architecture Center  •  Workstream 5 of 5  •  Executive Decision Guide & Agentic Triad`, {
    x: 0.6, y: 7.1, w: 10.5, h: 0.3, fontSize: 8.5, color: TEXT_MUTED, fontFace: FONT_BODY
  });
  slide.addText(`${nextSlideNum()} / ${TOTAL_SLIDES}`, {
    x: 11.5, y: 7.1, w: 1.233, h: 0.3, fontSize: 8.5, bold: true, color: G_BLUE, fontFace: FONT_TITLE, align: 'right'
  });
}

// Reusable Before / After SaaS Proof Slide Builder
interface SaasProofConfig {
  slideNum?: number;
  proofNum: number;
  saasName: string;
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
  categoryTag?: string;
}

function buildBeforeAfterSaasSlide(cfg: SaasProofConfig) {
  const slide = pptx.addSlide();
  addHeader(slide, cfg.categoryTag || `ACT IV • PROOF ${cfg.proofNum}`, cfg.title, nextSlideNum());

  slide.addText(cfg.subtitle, {
    x: 0.6, y: 0.82, w: 12.133, h: 0.36, fontSize: 10.2, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const beforeImgPath = path.join(ROOT_DIR, 'screenshots', 'verified-cloud-console', cfg.beforeImg);
  const afterImgPath = path.join(ROOT_DIR, 'screenshots', 'verified-cloud-console', cfg.afterImg);

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

  // Image (Exact 1.600 aspect ratio)
  if (cfg.beforeImg && fs.existsSync(beforeImgPath)) {
    slide.addImage({
      path: beforeImgPath,
      x: 0.735, y: 1.66, w: 5.68, h: 3.195
    });
  }

  // Under-image Analysis Box
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.735, y: 5.27, w: 5.68, h: 1.60, rectRadius: 0.05,
    fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.75 }
  });
  slide.addText('CRITICAL REGULATORY FLAW (POOLED / SHARED COMPUTE VIOLATION)', {
    x: 0.85, y: 5.33, w: 5.45, h: 0.22, fontSize: 7.8, bold: true, color: G_RED_DEEP, fontFace: FONT_TITLE
  });
  slide.addText(cfg.beforeVulnerability, {
    x: 0.85, y: 5.56, w: 5.45, h: 0.64, fontSize: 8.2, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
  });
  slide.addText(`Adversarial Threat: ${cfg.beforeThreat}`, {
    x: 0.85, y: 6.22, w: 5.45, h: 0.58, fontSize: 8.0, color: G_RED_DEEP, fontFace: FONT_BODY, lineSpacingMultiple: 1.12
  });

  // Right Card: AFTER (Green Boundary)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.78, y: 1.22, w: 5.95, h: 5.75, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_GREEN_DEEP, width: 1.5 }
  });
  // Top Banner
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.78, y: 1.22, w: 5.95, h: 0.38, fill: { color: G_GREEN_LIGHT }
  });
  slide.addText(cfg.afterHeader, {
    x: 6.93, y: 1.22, w: 5.65, h: 0.38, fontSize: 8.8, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE, valign: 'middle'
  });

  // Image
  if (cfg.afterImg && fs.existsSync(afterImgPath)) {
    slide.addImage({
      path: afterImgPath,
      x: 6.915, y: 1.66, w: 5.68, h: 3.195
    });
  }

  // Under-image Analysis Box
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.915, y: 5.27, w: 5.68, h: 1.60, rectRadius: 0.05,
    fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.75 }
  });
  slide.addText('AGENTIC TRIAD MULTI-CLOUD ISOLATION GUARANTEE (PATTERNS A/B/C)', {
    x: 7.03, y: 5.33, w: 5.45, h: 0.22, fontSize: 7.8, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE
  });
  slide.addText(cfg.afterEnforcement, {
    x: 7.03, y: 5.56, w: 5.45, h: 0.64, fontSize: 8.2, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
  });
  slide.addText(`Engine Verification: ${cfg.afterVerification}`, {
    x: 7.03, y: 6.22, w: 5.45, h: 0.58, fontSize: 8.0, color: G_GREEN_DEEP, fontFace: FONT_BODY, lineSpacingMultiple: 1.12
  });
}

// ============================================================================
// SLIDE 01: Master Title Slide
// ============================================================================
function buildSlide01() {
  const slide = pptx.addSlide();

  // Dark Navy Left Panel
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 0.6, w: 5.0, h: 6.3, rectRadius: 0.08,
    fill: { color: G_NAVY }, line: { color: G_BLUE_DARK, width: 2 }
  });

  // Top Program Eyebrow Pill
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.95, y: 0.95, w: 3.4, h: 0.36, rectRadius: 0.06,
    fill: { color: G_BLUE_LIGHT }, line: { color: G_BLUE, width: 1 }
  });
  slide.addText('GOOGLE CLOUD ARCHITECTURE CENTER', {
    x: 0.95, y: 0.95, w: 3.4, h: 0.36,
    fontSize: 9, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
  });

  // Large Presentation Title
  slide.addText('Multi-Tenant Agentic AI\non Google Cloud', {
    x: 0.95, y: 1.5, w: 4.3, h: 1.1,
    fontSize: 26, bold: true, color: WHITE, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15
  });
  slide.addText('Agentic Triad: Executive Decision Guide & Multi-Tenant Agentic Triad', {
    x: 0.95, y: 2.7, w: 4.3, h: 0.8,
    fontSize: 18, bold: true, color: '93C5FD', fontFace: FONT_TITLE, lineSpacingMultiple: 1.15
  });

  // Subtitle
  slide.addText(
    'Two-question deterministic Pattern Selector (A Pool vs. C Hybrid vs. B Silo), 80/20 Triad ADK core with Shared+Private A2A & Dynamic GCS Skills, 32,768 prefix cache FinOps, and 30/30 AWS AgentCore Multi-Cloud parity.',
    {
      x: 0.95, y: 3.6, w: 4.3, h: 1.4,
      fontSize: 10.5, color: 'CBD5E1', fontFace: FONT_BODY, lineSpacingMultiple: 1.25
    }
  );

  // Metadata Card
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.95, y: 5.15, w: 4.3, h: 1.45, rectRadius: 0.06,
    fill: { color: '1E293B' }, line: { color: '475569', width: 0.75 }
  });
  slide.addText('DELIVERABLE METADATA & COMPLIANCE SCOPE', {
    x: 1.1, y: 5.25, w: 4.0, h: 0.22,
    fontSize: 8, bold: true, color: G_BLUE, fontFace: FONT_TITLE
  });
  slide.addText('• Workstream 5 of 5 • Agentic Triad: Dedicated Decision Guide & Agentic Triad\n• 100% Native DrawingML Vectors • Zero Flattened Images\n• Verified Standards: OCC Bulletin 2013-29, EU DORA, HIPAA, FedRAMP High\n• Author: Google Cloud FDE & AI Platform Architecture Team', {
    x: 1.1, y: 5.5, w: 4.0, h: 1.0,
    fontSize: 8.5, color: 'E2E8F0', fontFace: FONT_BODY, lineSpacingMultiple: 1.2
  });

  // Right Side: 3 Hero Architectural Pillar Cards
  const heroCards = [
    {
      title: 'Pillar 1: 2-Question Topology Selector (A / C / B)',
      subtitle: 'Deterministic routing via (q_spoke, q_silo) with zero guesswork',
      desc: 'Gate 1 routes commercial tenants to Pattern A Pool (1.0x COGS, 89.1% cache). Gate 2 routes CMEK/private-tool B2B accounts to Pattern C Hybrid (1.8x–2.8x COGS, 0ms CAS cutover). Gate 3 isolates regulated tenants in Pattern B Silos (~15x COGS, 41.2s CMEK halt).',
      tag: '3-GATE SELECTOR',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT
    },
    {
      title: 'Pillar 2: Agentic Triad + Dynamic GCS Skill Packs',
      subtitle: 'Shared Diagnostic → Private Tenant Agent over A2A with 0 image rebuilds',
      desc: 'Shared ADK agents delegate scoped STS tokens over A2A to tenant-private agents, hydrating SHA-256 pinned GCS skill YAMLs dynamically under ARD enforcement while hitting the immutable 32,768 prefix cache (89.1% input savings) and emitting Zero-PII OTel.',
      tag: 'SHARED + PRIVATE A2A',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT
    },
    {
      title: 'Pillar 3: 30/30 AWS AgentCore Multi-Cloud GA',
      subtitle: 'Keyless OIDC federation across GCP & AWS with 0 static IAM keys',
      desc: 'One 80% reusable core-cymbal-agent/ codebase operates seamlessly across GCP and AWS Bedrock AgentCore MCP Gateway (us-east-1, 10 SaaS targets), backed by feature-flagged GAP-01..05 sunset controls and a 10-week GA rollout roadmap.',
      tag: 'MULTI-CLOUD GA',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT
    }
  ];

  heroCards.forEach((c, idx) => {
    const cy = 0.6 + idx * 2.15;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.9, y: cy, w: 6.8, h: 2.0, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: c.color, width: 1.5 }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 5.9, y: cy, w: 6.8, h: 0.42, fill: { color: c.tint }
    });
    slide.addText(c.tag, {
      x: 6.1, y: cy, w: 2.8, h: 0.42,
      fontSize: 8.5, bold: true, color: c.color, fontFace: FONT_TITLE, valign: 'middle'
    });
    slide.addText(c.title, {
      x: 6.1, y: cy + 0.48, w: 6.4, h: 0.35,
      fontSize: 13, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
    });
    slide.addText(c.subtitle, {
      x: 6.1, y: cy + 0.85, w: 6.4, h: 0.28,
      fontSize: 9.5, italic: true, color: TEXT_MUTED, fontFace: FONT_BODY
    });
    slide.addText(c.desc, {
      x: 6.1, y: cy + 1.15, w: 6.4, h: 0.75,
      fontSize: 8.8, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
    });
  });

  // Footer
  slide.addText('Google Cloud Architecture Center  •  Workstream 5 of 5  •  Executive Decision Guide & Agentic Triad (100% Native DrawingML)', {
    x: 0.6, y: 7.1, w: 10.5, h: 0.3, fontSize: 8.5, color: TEXT_MUTED, fontFace: FONT_BODY
  });
  slide.addText(`1 / ${TOTAL_SLIDES}`, {
    x: 11.5, y: 7.1, w: 1.233, h: 0.3, fontSize: 8.5, bold: true, color: G_BLUE, fontFace: FONT_TITLE, align: 'right'
  });
}

// ============================================================================
// SLIDE 02: 5-Act Visual Agenda & C4 Abstraction Hierarchy (L1-L5)
// ============================================================================
function buildSlide02_Agenda() {
  const slide = pptx.addSlide();
  addHeader(slide, 'AGENDA & ROADMAP', 'Executive 5-Act Architecture Roadmap: Strategic Decision Framework & Enterprise GA', nextSlideNum());

  slide.addText('Structured 5-Act decision and governance roadmap guiding C-suite and principal architects from pattern evaluation to fleet-wide enterprise rollout.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const acts = [
    {
      act: 'ACT I',
      title: 'Triad Dilemma & 2-Question Selector',
      slides: 'Slides 03–04',
      c4: 'L1 Context',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      desc: 'Balancing Isolation, Security/FinOps (89.1%), and Velocity; plus deterministic (q_spoke, q_silo) Pattern A/C/B gating.'
    },
    {
      act: 'ACT II',
      title: 'Pattern A / B / C Side-by-Side',
      slides: FULL_34_MODE ? 'Slides 05–11' : 'Slides 05–09',
      c4: 'L2 Containers',
      color: G_BLUE,
      tint: G_BLUE_LIGHT,
      desc: 'Unified 80/20 Triad architecture comparing Pattern A Pool, Pattern B Silo, and Pattern C /28 PSC topologies.'
    },
    {
      act: 'ACT III',
      title: 'A2A Delegation, GCS Skills & FinOps OTel',
      slides: FULL_34_MODE ? 'Slides 12–20' : 'Slides 10–18',
      c4: 'L3/L4 Logic & Wire',
      color: G_AMBER_DEEP,
      tint: G_YELLOW_LIGHT,
      desc: 'Shared+Private A2A, zero-rebuild GCS skills, 32,768 prefix cache, Zero-PII SHA-256 BigQuery OTel, & GAP-01..05 retirement.'
    },
    {
      act: 'ACT IV',
      title: 'Multi-Cloud 30/30 Verification',
      slides: FULL_34_MODE ? 'Slides 21–31' : 'Slides 19–21',
      c4: 'L5 Runtime Proofs',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      desc: FULL_34_MODE
        ? '10 live Verified Commercial SaaS live UI proof pairs spanning Pattern A, B & C plus keyless GCP↔AWS Bedrock AgentCore federation.'
        : '2 Signature Triad Proofs (Datadog Observability Logs & Workday HCM HR CRAC) + Companion 10-SaaS Atlas & 30/30 S3 Ledgers.'
    },
    {
      act: 'ACT V',
      title: 'GA Roadmap, Scorecard & CISO FAQ',
      slides: FULL_34_MODE ? 'Slides 32–34' : 'Slides 22–24',
      c4: 'Governance & GA',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      desc: '10-week phased GA roadmap, unified Pattern A vs. C vs. B scorecard matrix, and executive CISO decision FAQ.'
    }
  ];

  acts.forEach((a, idx) => {
    const ax = 0.6 + idx * 2.45;
    slide.addShape(pptx.ShapeType.roundRect, { x: ax, y: 1.35, w: 2.32, h: 5.5, rectRadius: 0.08, fill: { color: WHITE }, line: { color: a.color, width: 1.5 } });
    slide.addShape(pptx.ShapeType.rect, { x: ax, y: 1.35, w: 2.32, h: 0.85, fill: { color: a.tint } });
    slide.addText(a.act, { x: ax + 0.12, y: 1.42, w: 2.08, h: 0.25, fontSize: 8.5, bold: true, color: a.color, fontFace: FONT_TITLE });
    slide.addText(a.title, { x: ax + 0.12, y: 1.68, w: 2.08, h: 0.45, fontSize: 10.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15 });
    slide.addShape(pptx.ShapeType.roundRect, { x: ax + 0.12, y: 2.35, w: 2.08, h: 0.4, rectRadius: 0.04, fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 } });
    slide.addText(`${a.slides}  •  ${a.c4}`, { x: ax + 0.12, y: 2.35, w: 2.08, h: 0.4, fontSize: 8.5, bold: true, color: TEXT_MUTED, fontFace: FONT_TITLE, align: 'center', valign: 'middle' });
    slide.addText(a.desc, { x: ax + 0.12, y: 2.9, w: 2.08, h: 3.7, fontSize: 9.2, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.25 });
  });
}

// ============================================================================
// SLIDE 03: The Regulated SaaS Dilemma (Why Pooled / Shared Compute is Prohibited)
// ============================================================================
function buildSlide03_Dilemma() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT I • THE STRATEGIC DILEMMA', 'The Multi-Tenant Agentic Triad Dilemma: Balancing Isolation, Velocity, and Unit Economics', nextSlideNum());

  slide.addText('Enterprise AI platforms must navigate three competing forces: statutory isolation (sovereignty), developer velocity (80% core reuse), and FinOps economics.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const cards = [
    {
      title: '1. Isolation Force (CISO)',
      subtitle: 'Preventing cross-tenant data, tool, & cache bleed',
      tag: 'TRUST & ISOLATION',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      items: [
        'Enterprise buyers mandate cryptographic proof that Tenant A prompts, vectors, and OAuth tokens never leak to Tenant B.',
        'ARD catalog filters (-94% tokens) and Hop 4 Model Armor (<8ms) / Cloud SDP block toxic payloads and IBAN leaks.',
        'Sensitive sectors (Banking OCC, HIPAA, EU DORA) require CMEK key revocation and regional isolation.',
        'Cross-cloud AWS Bedrock AgentCore integrations must operate with 0 long-lived static AWS IAM credentials.'
      ]
    },
    {
      title: '2. Unit Economics Force (CFO)',
      subtitle: 'Reclaiming 89.1% input cost via shared prefix caches',
      tag: 'FINOPS MARGIN',
      color: G_AMBER_DEEP,
      tint: G_YELLOW_LIGHT,
      items: [
        'Blindly defaulting to dedicated per-tenant Pattern B Silos multiplies infrastructure COGS by ~15x vs. pooled execution.',
        'Separate per-tenant Vertex AI clusters fragment context caches, forfeiting the 89.1% shared 32,768-token cache discount.',
        'Unbounded reasoning loops and unthrottled callers wipe out SaaS gross margin unless enforced per tenant at ingress.',
        'BigQuery FinOps OTel attribution requires sub-agent token spans with raw_pii_logged = FALSE.'
      ]
    },
    {
      title: '3. Engineering Velocity Force (CTO)',
      subtitle: 'Zero per-customer code forks & zero-rebuild skill updates',
      tag: '80/20 VELOCITY',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      items: [
        'One single 80% reusable ADK codebase (core-cymbal-agent/) spans Pattern A, Pattern C, and Pattern B via config only.',
        'Shared Diagnostic agents delegate over A2A to Private Tenant agents without re-architecting agent graphs.',
        'Dynamic GCS Skill Packs (SHA-256 verified) hot-swap customer prompts and playbooks with 0 container rebuilds.',
        'GAP-01..05 middleware shims include feature flags for zero-rewrite sunset as native Agent Engine GA lands.'
      ]
    },
    {
      title: '4. The Agentic Triad Synthesis',
      subtitle: 'Unified 5-Hop Core + Deterministic Pattern Selector',
      tag: 'UNIFIED SYNTHESIS',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      items: [
        'Gate 1 (Pool A): 1.0x COGS, 1,000+ tenants, 120 RPM, AlloyDB FORCE RLS + 89.1% prefix cache.',
        'Gate 2 (Hybrid C): 1.8x–2.8x COGS, /28 PSC CMEK spokes (600 RPM), 0ms live CAS graduation.',
        'Gate 3 (Silo B): ~15x COGS, dedicated project, VPC-SC, AMD SEV-SNP, 41.2s verified CMEK HTTP 423 halt.',
        'Empirically verified across 30/30 AWS AgentCore Multi-Cloud gates & all 5 reference test suites.'
      ]
    }
  ];

  cards.forEach((c, idx) => {
    const cx = 0.6 + idx * 3.08;
    slide.addShape(pptx.ShapeType.roundRect, { x: cx, y: 1.35, w: 2.92, h: 5.5, rectRadius: 0.08, fill: { color: WHITE }, line: { color: c.color, width: 1.5 } });
    slide.addShape(pptx.ShapeType.rect, { x: cx, y: 1.35, w: 2.92, h: 0.6, fill: { color: c.tint } });
    slide.addText(c.tag, { x: cx + 0.15, y: 1.38, w: 2.62, h: 0.22, fontSize: 8, bold: true, color: c.color, fontFace: FONT_TITLE });
    slide.addText(c.title, { x: cx + 0.15, y: 2.05, w: 2.62, h: 0.5, fontSize: 11, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15 });
    slide.addText(c.subtitle, { x: cx + 0.15, y: 2.58, w: 2.62, h: 0.35, fontSize: 8.8, italic: true, color: TEXT_MUTED, fontFace: FONT_BODY });
    c.items.forEach((item, iidx) => {
      const iy = 3.05 + iidx * 0.95;
      slide.addShape(pptx.ShapeType.roundRect, { x: cx + 0.12, y: iy, w: 2.68, h: 0.88, rectRadius: 0.04, fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 } });
      slide.addText(`• ${item}`, { x: cx + 0.18, y: iy + 0.06, w: 2.56, h: 0.76, fontSize: 8.0, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15 });
    });
  });
}

// ============================================================================
// SLIDE 04: Regulatory Compliance Matrix & Threat Landscape
// ============================================================================
function buildSlide04_ComplianceMatrix() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT I • THE DECISION FRAMEWORK', 'The Two-Question Executive Decision Framework: Compliance Mandate vs. Tenant Velocity', nextSlideNum());

  slide.addText('How two binary architectural questions (q_spoke, q_silo) route every workload deterministically across Pattern A, Pattern C, and Pattern B.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const frameworks = [
    {
      reg: 'Gate 1: Pattern A',
      sector: 'q_spoke = 0, q_silo = 0 (Pool)',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      mandate: 'Commercial / PLG / Mid-market SaaS tenants accepting logical PostgreSQL FORCE RLS and platform-managed KMS encryption.',
      patternBProof: 'Shared Hub Gen2 gVisor CoW runtime (--max-requests=1), 120 RPM Valkey quota, AlloyDB FORCE RLS, 32,768 prefix cache.',
      auditArtifact: '1.0x baseline COGS • 1,000+ tenants • 89.1% input savings • <5s Valkey SCAN+UNLINK eviction.'
    },
    {
      reg: 'Gate 2: Pattern C',
      sector: 'q_spoke = 1, q_silo = 0 (Hybrid PSC)',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      mandate: 'Enterprise B2B tenants requiring dedicated CMEK AlloyDB, regional residency, or private tools—without ~15x silo overhead.',
      patternBProof: 'Shared Hub Compute + unidirectional /28 PSC Spoke (10.10.0.50:443), 600 RPM quota, SHADOW_SYNC → 0ms CAS upgrade.',
      auditArtifact: '1.8x–2.8x blended COGS (81%–88% cheaper vs. silos) • 0 dropped turns • HTTP 403 cross-spoke guard.'
    },
    {
      reg: 'Gate 3: Pattern B',
      sector: 'q_silo = 1 (Sovereign Silo)',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      mandate: 'Regulated Banking (OCC), Healthcare GxP, EU DORA, & Defense needing dedicated projects, VPC-SC, or air-gapped compute.',
      patternBProof: 'Dedicated GCP project, VPC-SC (0.0.0.0/0 denied), IAM PAB, Confidential GKE SEV-SNP (Gemma 3 27B), FIPS HSM CMEK.',
      auditArtifact: '~15x baseline COGS • 41.2s verified CMEK full enclave halt (HTTP 423) • 0 egress packets.'
    },
    {
      reg: '3 Universal Invariants',
      sector: 'Locked Across Patterns A, C & B',
      color: G_AMBER_DEEP,
      tint: G_YELLOW_LIGHT,
      mandate: 'Regardless of gate result, core identity, runtime code, and safety/FinOps guardrails must remain uniform across tiers.',
      patternBProof: 'Dual Gateways (OBO + RFC 9449 DPoP), 80% single core-cymbal-agent/ ADK package, Model Armor (<8ms) + Zero-PII OTel.',
      auditArtifact: '30/30 Multi-Cloud AgentCore MCP gates PASS • Zero-branch drift across all 5 enterprise workstreams.'
    }
  ];

  frameworks.forEach((f, idx) => {
    const fx = 0.6 + idx * 3.08;
    slide.addShape(pptx.ShapeType.roundRect, { x: fx, y: 1.35, w: 2.92, h: 5.5, rectRadius: 0.08, fill: { color: WHITE }, line: { color: f.color, width: 1.5 } });
    slide.addShape(pptx.ShapeType.rect, { x: fx, y: 1.35, w: 2.92, h: 0.75, fill: { color: f.tint } });
    slide.addText(f.reg, { x: fx + 0.15, y: 1.40, w: 2.62, h: 0.34, fontSize: 11.2, bold: true, color: f.color, fontFace: FONT_TITLE });
    slide.addText(f.sector, { x: fx + 0.15, y: 1.74, w: 2.62, h: 0.25, fontSize: 7.5, italic: true, color: TEXT_MUTED, fontFace: FONT_BODY });

    slide.addShape(pptx.ShapeType.roundRect, { x: fx + 0.15, y: 2.25, w: 2.62, h: 1.4, rectRadius: 0.05, fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 } });
    slide.addText('SELECTION CONDITION', { x: fx + 0.22, y: 2.32, w: 2.48, h: 0.2, fontSize: 7.8, bold: true, color: G_RED_DEEP, fontFace: FONT_TITLE });
    slide.addText(f.mandate, { x: fx + 0.22, y: 2.55, w: 2.48, h: 1.0, fontSize: 8.2, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2 });

    slide.addShape(pptx.ShapeType.roundRect, { x: fx + 0.15, y: 3.8, w: 2.62, h: 1.4, rectRadius: 0.05, fill: { color: 'F0FDF4' }, line: { color: G_GREEN_DEEP, width: 0.75 } });
    slide.addText('ARCHITECTURAL CONFIGURATION', { x: fx + 0.22, y: 3.87, w: 2.48, h: 0.2, fontSize: 7.8, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE });
    slide.addText(f.patternBProof, { x: fx + 0.22, y: 4.1, w: 2.48, h: 1.0, fontSize: 8.2, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2 });

    slide.addShape(pptx.ShapeType.roundRect, { x: fx + 0.15, y: 5.35, w: 2.62, h: 1.35, rectRadius: 0.05, fill: { color: G_BLUE_LIGHT }, line: { color: G_BLUE_DARK, width: 0.75 } });
    slide.addText('VERIFIED ECONOMICS & SLA', { x: fx + 0.22, y: 5.42, w: 2.48, h: 0.2, fontSize: 7.8, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE });
    slide.addText(f.auditArtifact, { x: fx + 0.22, y: 5.65, w: 2.48, h: 0.95, fontSize: 8.2, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2 });
  });
}

// ============================================================================
// SLIDE 05: Transition Breaker — Act II: Agentic Triad Topologies & Blueprints
// ============================================================================
function buildSlide05_Act2Breaker() {
  buildActBreakerSlide({
    actTag: 'ACT II • UNIFIED TOPOLOGY BLUEPRINTS',
    actNumber: 'ACT II',
    actTitle: 'Agentic Triad: Comparing Pattern A, B & C Side-by-Side',
    actSubtitle: 'Selector Decision Graph, Pooled Control Plane, Sovereign Silos, and Dynamic Hybrid PSC',
    actColor: G_BLUE_DARK,
    actTint: G_BLUE_LIGHT,
    coreQuestion: 'How do the three isolation topologies share one 80% ADK core while diverging cleanly along storage, network, and key custody lines?',
    thesis: 'TENANT_ISOLATION_MODE (POOLED | HYBRID_PSC | SOVEREIGN_SILO) toggles declarative infrastructure envelopes without altering 5-Hop business logic.',
    milestones: [
      {
        num: '01',
        title: 'L1 Selector Zone Matrix & Figure 1',
        desc: 'Interactive topology matrix classifying enterprise buyers via Compliance and Spoke gates.',
        deliverable: 'L1 Selector & Decision Blueprint'
      },
      {
        num: '02',
        title: 'Pattern A: Pooled High-Density Blueprint',
        desc: 'Cloud Run Gen2 gVisor CoW, 120/600 RPM Valkey quotas, and AlloyDB FORCE RLS (1.0x COGS).',
        deliverable: 'Pattern A L2 DrawingML'
      },
      {
        num: '03',
        title: 'Pattern B: Dedicated Sovereign Silos Blueprint',
        desc: 'Dedicated GCP projects, VPC-SC, IAM PAB, Air-Gapped Gemma 3, and 41.2s CMEK halt (~15x COGS).',
        deliverable: 'Pattern B L2 DrawingML'
      },
      {
        num: '04',
        title: 'Pattern C: Dynamic Hybrid Hub & /28 PSC Blueprint',
        desc: 'Shared Hub compute + unidirectional /28 PSC spokes with 0ms CAS graduation (1.8x–2.8x COGS).',
        deliverable: 'Pattern C L2 DrawingML'
      }
    ]
  });
}

// ============================================================================
// SLIDE 06: Agentic Triad Architectural Principles & 80/20 Sovereign Rule
// ============================================================================
function buildSlide06_PatternBPrinciples() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT II • ARCHITECTURAL PRINCIPLES', 'The Multi-Tenant Agentic Triad: Mathematical Proof of Trade-Offs', nextSlideNum());

  slide.addText('How the 80/20 Reusability Law aligns Security, FinOps (89.1% input savings), and Velocity across every enterprise deployment tier.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  slide.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 1.35, w: 12.133, h: 1.6, rectRadius: 0.08, fill: { color: WHITE }, line: { color: G_BLUE_DARK, width: 1.5 } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.6, y: 1.35, w: 12.133, h: 0.38, fill: { color: G_BLUE_LIGHT } });
  slide.addText('THE 80/20 AGENTIC TRIAD REUSABILITY LAW', { x: 0.8, y: 1.35, w: 6.0, h: 0.38, fontSize: 8.8, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE, valign: 'middle' });
  slide.addText('One shared ADK core package (core-cymbal-agent/) powers Pool, Hybrid, and Sovereign deployments:', { x: 0.8, y: 1.8, w: 11.7, h: 0.3, fontSize: 9.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE });
  slide.addText('• 80% SHARED 5-HOP CORE: Ingress WAF, STS OBO+DPoP, ARD catalog filter (-94%), Model Armor (<8ms), NLC guard, Valkey rate limits, & Zero-PII OTel.\n• 20% TOPOLOGY CONFIG (TENANT_ISOLATION_MODE): Declarative Terraform toggles between POOLED, HYBRID_PSC (/28 NAT), and SOVEREIGN_SILO (VPC-SC).', {
    x: 0.8, y: 2.12, w: 11.7, h: 0.7, fontSize: 8.8, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.25
  });

  const pillars = [
    {
      title: '1. Isolation Triad Pillar',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      points: [
        'Pattern A: Force RLS + gVisor CoW heap wipes (--max-requests=1) on every turn.',
        'Pattern C: Unidirectional /28 PSC ServiceAttachments (10.10.0.50:443) + spoke CMEK.',
        'Pattern B: Dedicated project, VPC-SC (0.0.0.0/0 deny), & SEV-SNP (Gemma 3 27B).',
        '100% deterministic cross-tenant refusal across all tiers (HTTP 403 / 423).'
      ]
    },
    {
      title: '2. FinOps Triad Pillar (89.1%)',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      points: [
        '32,768 Shared Prefix Cache slashes net input token cost by 89.1% on shared pools.',
        'Per-tier thinkingLevel / maxOutputTokens clamps (MEDIUM/4k Std vs HIGH/8k VIP) bound runaway.',
        'Model Tiering: Gemini 2.5 Flash (default), Dedicated PT, or Gemma 3 air-gapped.',
        'BigQuery OTel links cached_input_tokens & reasoning output counters (raw_pii_logged=FALSE).'
      ]
    },
    {
      title: '3. Velocity Triad Pillar',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      points: [
        'Shared Diagnostic → Private Tenant Agent A2A delegation preserves OBO STS identity.',
        'Dynamic GCS Skill Packs hot-swap tenant prompts/rubrics with 0 image rebuilds.',
        'Keyless WIF+OIDC bridges to AWS Bedrock AgentCore (30/30 gates, 0 static IAM keys).',
        'GAP-01..05 sunset feature flags allow effortless handover as Agent Engine GA matures.'
      ]
    }
  ];

  pillars.forEach((p, idx) => {
    const px = 0.6 + idx * 4.12;
    slide.addShape(pptx.ShapeType.roundRect, { x: px, y: 3.15, w: 3.9, h: 3.7, rectRadius: 0.08, fill: { color: WHITE }, line: { color: p.color, width: 1.5 } });
    slide.addShape(pptx.ShapeType.rect, { x: px, y: 3.15, w: 3.9, h: 0.5, fill: { color: p.tint } });
    slide.addText(p.title, { x: px + 0.15, y: 3.15, w: 3.6, h: 0.5, fontSize: 11, bold: true, color: p.color, fontFace: FONT_TITLE, valign: 'middle' });
    p.points.forEach((point, pidx) => {
      const pty = 3.8 + pidx * 0.72;
      slide.addShape(pptx.ShapeType.roundRect, { x: px + 0.12, y: pty, w: 3.66, h: 0.65, rectRadius: 0.04, fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 } });
      slide.addText(`• ${point}`, { x: px + 0.18, y: pty + 0.04, w: 3.54, h: 0.57, fontSize: 8.0, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15 });
    });
  });
}

// ============================================================================
// SLIDE 07: L1 Logical Security Taxonomy for Agentic Triad
// ============================================================================
function buildSlide07_L1Logical() {
  addArchitectureZoneTopologySlide(pptx, DECKS[4]);
  nextSlideNum();
}

// ============================================================================
// SLIDE 08: Figure 1 Decompiled DrawingML (Executive Decision Guide & Agentic Triad Architecture)
// ============================================================================
async function buildSlide08_Figure1() {
  const xmlPath = path.join(ROOT_DIR, 'diagrams', 'ws5-decision-tree-and-agentic-triad.drawio');
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  await appendGoogleBrandedDiagramSlides(
    pptx,
    xmlContent,
    'WS5',
    'WS5 • ACT II: Figure 1',
    'Multi-Tenant Agentic Triad & Two-Question Executive Decision Tree Architecture',
    'ws5-decision-tree-and-agentic-triad',
    undefined,
    [
      'Official Google Cloud Architecture Center executive decision tree blueprint.',
      'Synthesizes compliance, isolation, and economic trade-offs into a binary routing model.',
      'Directs non-regulated high-concurrency workloads to Pattern A pooled architecture.',
      'Directs regulated statutory workloads (ITAR, FedRAMP, GxP) to Pattern B Sovereign Silos.',
      'Directs high-growth enterprise tiers to Pattern C dynamic hybrid with live migration.'
    ],
    'diagrams/ws5-decision-tree-and-agentic-triad.drawio',
    true
  );
  nextSlideNum();
}

// ============================================================================
// SLIDE 09: Pattern A Pooled Reference Architecture
// ============================================================================
async function buildSlide09_PatternAPooled() {
  const xmlPath = path.join(ROOT_DIR, 'diagrams', 'ws2-pattern-a-pooled-5hop-architecture.drawio');
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  await appendGoogleBrandedDiagramSlides(
    pptx,
    xmlContent,
    'WS5',
    'WS5 • ACT II: Pattern A',
    'Pattern A: High-Density Pooled Architecture Reference Blueprint & 5-Hop Control Plane',
    'ws2-pattern-a-pooled-5hop-architecture',
    undefined,
    [
      'Pattern A reference architecture for standard multi-tenant SaaS workloads.',
      'Shares project runtime, Vertex AI prompt cache, and AlloyDB database across tenants.',
      'Enforces cryptographic tenant isolation via IAM STS token claims and PostgreSQL RLS.',
      'Maximizes cost efficiency with 120 RPM pooled baseline and shared memory tier.'
    ],
    'diagrams/ws2-pattern-a-pooled-5hop-architecture.drawio',
    true
  );
  nextSlideNum();
}

// ============================================================================
// SLIDE 10: Pattern B Sovereign Silos Reference Architecture
// ============================================================================
async function buildSlide10_PatternBSilos() {
  const xmlPath = path.join(ROOT_DIR, 'diagrams', 'ws3-pattern-b-sovereign-silos-architecture.drawio');
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  await appendGoogleBrandedDiagramSlides(
    pptx,
    xmlContent,
    'WS5',
    'WS5 • ACT II: Pattern B',
    'Pattern B: Dedicated Sovereign Silos Reference Blueprint & Per-Tenant VPC-SC Perimeters',
    'ws3-pattern-b-sovereign-silos-architecture',
    undefined,
    [
      'Pattern B sovereign silo reference architecture for banking, healthcare, and public sector workloads.',
      'Physically isolated dedicated projects (ramp-portal-dev ↔ AWS AgentCore) per tenant.',
      'VPC Service Controls perimeters block all unauthorized API ingress and data exfiltration.',
      'Customer-Managed Encryption Keys (CMEK) provide instant mathematical crypto-shredding.'
    ],
    'diagrams/ws3-pattern-b-sovereign-silos-architecture.drawio',
    true
  );
  nextSlideNum();
}

// ============================================================================
// SLIDE 11: Pattern C Dynamic Hybrid Reference Architecture
// ============================================================================
async function buildSlide11_PatternCHybrid() {
  const xmlPath = path.join(ROOT_DIR, 'diagrams', 'ws4-pattern-c-hybrid-psc-and-migration.drawio');
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  await appendGoogleBrandedDiagramSlides(
    pptx,
    xmlContent,
    'WS5',
    'WS5 • ACT II: Pattern C',
    'Pattern C: Dynamic Hybrid Hub-and-Spoke Blueprint & Zero-Downtime Tier Upgrades',
    'ws4-pattern-c-hybrid-psc-and-migration',
    undefined,
    [
      'Pattern C reference architecture for dynamic growth-stage B2B enterprise SaaS.',
      'Dynamically routes between shared pool (standard) and dedicated PSC spokes (enterprise).',
      'Private Service Connect (PSC) endpoints decouple VPCs without IP address exhaustion.',
      '3-phase zero-downtime live tier migration engine promotes live tenants with 0 dropped turns.'
    ],
    'diagrams/ws4-pattern-c-hybrid-psc-and-migration.drawio',
    true
  );
  nextSlideNum();
}

function buildSlide12_Act3Breaker() {
  buildActBreakerSlide({
    actTag: 'ACT III • AGENTIC TRIAD EXECUTION & FINOPS',
    actNumber: 'ACT III',
    actTitle: 'Shared + Private A2A, GCS Skills & Zero-PII FinOps OTel',
    actSubtitle: 'Scoped A2A Delegation, Dynamic Skill Hot-Swap, 32,768 Prefix Cache & AWS Federation',
    actColor: G_AMBER_DEEP,
    actTint: G_YELLOW_LIGHT,
    coreQuestion: 'How do Shared platform agents collaborate with Private Tenant agents and dynamic skills without sacrificing 89.1% FinOps savings or leaking PII?',
    thesis: 'Shared Diagnostic agents pass scoped STS JWTs over A2A to Private agents that load pinned GCS YAML skills and emit SHA-256 hashed FinOps OTel spans.',
    milestones: [
      {
        num: '01',
        title: 'L3 Agentic Triad Sequence & L4 FinOps Triptych',
        desc: '5-actor Shared → Private A2A swimlane and 32,768 prefix cache + Zero-PII OTel span wire proof.',
        deliverable: 'L3 Sequence & L4 Wire Slides'
      },
      {
        num: '02',
        title: 'Dynamic GCS Skill Packs (0 Image Rebuilds)',
        desc: 'Runtime loading of SHA-256 verified tenant skills cached safely under cache:{tenant}:skill:*.',
        deliverable: 'Zero-Rebuild Skill Engine'
      },
      {
        num: '03',
        title: '32,768 Prefix Cache, NLC & AWS AgentCore Federation',
        desc: '89.1% input reduction, MEDIUM/4k & HIGH/8k output clamps, and keyless OIDC federation across 10 SaaS stacks.',
        deliverable: 'Multi-Cloud Control Plane'
      },
      {
        num: '04',
        title: 'Capstone Backlog & GAP-01..05 Sunset Flags',
        desc: 'Feature-flagged middleware hooks engineered for frictionless transition to Agent Engine GA.',
        deliverable: 'GA Sunset Architecture'
      }
    ]
  });
}

// ============================================================================
// SLIDE 13: L3 UML Process & Sequence Swimlane for Agentic Triad
// ============================================================================
function buildSlide13_L3Process() {
  addUmlSequenceSwimlaneSlide(
    pptx,
    DECKS[4],
    'WS5 • ACT III (L3 PROCESS): 5-Actor UML Sequence — Shared + Private Agents, Dynamic GCS Skills & FinOps OTel'
  );
  nextSlideNum();
}

// ============================================================================
// SLIDE 14: L4 Wire-Level Payload Transformation Triptych
// ============================================================================
function buildSlide14_L4Wire() {
  addPayloadTransformationTriptychSlide(
    pptx,
    DECKS[4],
    'WS5 • ACT III (L4 WIRE): Prefix Cache (32,768 / 89.1%) & Zero-PII BigQuery OTel Payload Triptych'
  );
  nextSlideNum();
}

// ============================================================================
// SLIDE 15: Deep-Dive: Dedicated Hop 1 Cloud Armor & Hop 2 Sovereign Catalog Filtering
// ============================================================================
function buildSlide15_Hops1And2() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • HOPS 1 & 2', 'Hop 1 Cryptographic Identity & Hop 2 ARD Scoped A2A Delegation', nextSlideNum());

  slide.addText('How the Shared Diagnostic Agent delegates safely over A2A to Tenant-Private agents without privilege downgrade or cross-tenant discovery.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  slide.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 1.35, w: 5.9, h: 5.5, rectRadius: 0.08, fill: { color: WHITE }, line: { color: G_BLUE_DARK, width: 1.5 } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.6, y: 1.35, w: 5.9, h: 0.5, fill: { color: G_BLUE_LIGHT } });
  slide.addText('HOP 1: SHARED INGRESS PEP & STS PRESERVATION', { x: 0.78, y: 1.35, w: 5.5, h: 0.5, fontSize: 9.5, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE, valign: 'middle' });

  const h1 = [
    { title: 'Zero-Trust Edge Header Stripping', desc: 'Cloud Armor strips external tenant/user headers before forwarding verified OIDC + RFC 9449 DPoP identity claims.' },
    { title: '5-Min ECDSA P-256 STS Propagation', desc: 'HOP 1 mints a signed TenantContext JWT verified locally at every downstream A2A & MCP boundary (<0.15ms JWKS check).' },
    { title: 'Shared Diagnostic Agent Entrypoint', desc: 'Unified shared_diagnostic_agent.py triages incoming requests using invariant core tooling before private escalation.' },
    { title: 'Zero Identity Downgrade on A2A', desc: 'Shared agents never unwrap into broad admin service accounts; sub-agent calls pass the caller signed STS assertion.' }
  ];
  h1.forEach((c, i) => {
    const cy = 2.0 + i * 1.15;
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.78, y: cy, w: 5.54, h: 1.02, rectRadius: 0.05, fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 } });
    slide.addText(c.title, { x: 0.92, y: cy + 0.08, w: 5.25, h: 0.25, fontSize: 9.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE });
    slide.addText(c.desc, { x: 0.92, y: cy + 0.34, w: 5.25, h: 0.62, fontSize: 8.2, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15 });
  });

  slide.addShape(pptx.ShapeType.roundRect, { x: 6.833, y: 1.35, w: 5.9, h: 5.5, rectRadius: 0.08, fill: { color: WHITE }, line: { color: G_GREEN_DEEP, width: 1.5 } });
  slide.addShape(pptx.ShapeType.rect, { x: 6.833, y: 1.35, w: 5.9, h: 0.5, fill: { color: G_GREEN_LIGHT } });
  slide.addText('HOP 2: ARD VISIBILITY & PRIVATE A2A TARGETING', { x: 7.01, y: 1.35, w: 5.5, h: 0.5, fontSize: 9.5, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE, valign: 'middle' });

  const h2 = [
    { title: 'Entitled Private Agent Discovery', desc: 'ARD confirms FinVault callers can resolve finvault_agent_alpha while rejecting RetailStream discovery with HTTP 403.' },
    { title: 'Dynamic Schema Pruning (-94% Tokens)', desc: 'Both Shared and Private agents inject strictly permitted 2LO/3LO MCP tool schemas, curbing context bloat and hallucinations.' },
    { title: 'Agent-to-Agent Card Enforcement', desc: 'Private Agent cards mandate OBO STS claim validation + DPoP thumbprint matching before loading tenant context.' },
    { title: 'Unified Registry Across Patterns A/B/C', desc: 'One ARD PDP governs pooled SaaS tools, hybrid /28 PSC endpoints, and sovereign VPC-SC enclaves without branching.' }
  ];
  h2.forEach((c, i) => {
    const cy = 2.0 + i * 1.15;
    slide.addShape(pptx.ShapeType.roundRect, { x: 7.01, y: cy, w: 5.54, h: 1.02, rectRadius: 0.05, fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 } });
    slide.addText(c.title, { x: 7.15, y: cy + 0.08, w: 5.25, h: 0.25, fontSize: 9.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE });
    slide.addText(c.desc, { x: 7.15, y: cy + 0.34, w: 5.25, h: 0.62, fontSize: 8.2, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15 });
  });
}

// ============================================================================
// SLIDE 16: Deep-Dive: Hop 3 Dedicated Cloud Run & Isolated Memory Bank Namespaces
// ============================================================================
function buildSlide16_Hop3Compute() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • HOP 3 SKILLS & MEMORY', 'Hop 3 Dynamic GCS Skill Packs (0 Image Rebuilds) & L1–L5 Memory Triad', nextSlideNum());

  slide.addText('How Private Tenant Agents hot-swap domain playbooks dynamically from pinned GCS YAML objects while keeping 5-level memory isolation.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  slide.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 1.35, w: 5.9, h: 5.5, rectRadius: 0.08, fill: { color: WHITE }, line: { color: G_BLUE_DARK, width: 1.5 } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.6, y: 1.35, w: 5.9, h: 0.5, fill: { color: G_BLUE_LIGHT } });
  slide.addText('DYNAMIC GCS SKILL PACK HYDRATION (ZERO REBUILDS)', { x: 0.78, y: 1.35, w: 5.5, h: 0.5, fontSize: 9.5, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE, valign: 'middle' });

  const sCards = [
    { title: 'Pinned SHA-256 Digest Gate', desc: 'Private agents fetch gs://<tenant-skills-bucket>/v2/skill.yaml only after matching the SHA-256 digest registered at Hop 2 ARD.' },
    { title: 'Zero Container Image Rebuilds', desc: 'Customer domain rubrics, escalation workflows, and prompt addenda roll out in seconds without CI/CD container redeploys.' },
    { title: 'Tenant-Isolated Skill Cache Keys', desc: 'Hydrated skills cache in Valkey strictly under cache:{tenant}:skill:* (0.4ms) with zero cross-tenant prompt pollution.' },
    { title: 'Attested Span Metadata', desc: 'Every skill load emits skill_sha256 in the BigQuery OTel trace so audits tie AI behavior cleanly to exact playbook hashes.' }
  ];
  sCards.forEach((c, i) => {
    const cy = 2.0 + i * 1.15;
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.78, y: cy, w: 5.54, h: 1.02, rectRadius: 0.05, fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 } });
    slide.addText(c.title, { x: 0.92, y: cy + 0.08, w: 5.25, h: 0.25, fontSize: 9.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE });
    slide.addText(c.desc, { x: 0.92, y: cy + 0.34, w: 5.25, h: 0.62, fontSize: 8.2, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15 });
  });

  slide.addShape(pptx.ShapeType.roundRect, { x: 6.833, y: 1.35, w: 5.9, h: 5.5, rectRadius: 0.08, fill: { color: WHITE }, line: { color: G_AMBER_DEEP, width: 1.5 } });
  slide.addShape(pptx.ShapeType.rect, { x: 6.833, y: 1.35, w: 5.9, h: 0.5, fill: { color: G_YELLOW_LIGHT } });
  slide.addText('5-LEVEL MEMORY BANK (L1..L5) ACROSS PATTERNS A/B/C', { x: 7.01, y: 1.35, w: 5.5, h: 0.5, fontSize: 9.5, bold: true, color: G_AMBER_DEEP, fontFace: FONT_TITLE, valign: 'middle' });

  const mems = [
    { level: 'L1', name: 'Turn Working Memory', desc: 'CoW (--max-requests=1) wipe or WarmPool purge ensures 0 cross-turn heap residue.' },
    { level: 'L2', name: 'Session State (Valkey)', desc: 'Scoped {tenant}:{user} namespace with <5s SCAN+UNLINK eviction on tenant offboard.' },
    { level: 'L3', name: 'User Profile & 3LO Vault', desc: 'Encrypted OAuth tokens & preferences (AlloyDB FORCE RLS vs. CMEK Spoke/Silo).' },
    { level: 'L4', name: 'Episodic Audit Trails', desc: 'Cross-pattern SHA-256 parity migration preserves conversation logs across CAS cutover.' },
    { level: 'L5', name: 'Semantic Vector Store', desc: 'Partitioned pgvector knowledge stores enforcing CMEK eviction where mandated.' }
  ];
  mems.forEach((m, i) => {
    const my = 2.0 + i * 0.94;
    slide.addShape(pptx.ShapeType.roundRect, { x: 7.01, y: my, w: 5.54, h: 0.84, rectRadius: 0.04, fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 } });
    slide.addShape(pptx.ShapeType.roundRect, { x: 7.12, y: my + 0.14, w: 0.48, h: 0.54, rectRadius: 0.04, fill: { color: G_NAVY } });
    slide.addText(m.level, { x: 7.12, y: my + 0.14, w: 0.48, h: 0.54, fontSize: 9.5, bold: true, color: WHITE, fontFace: FONT_TITLE, align: 'center', valign: 'middle' });
    slide.addText(m.name, { x: 7.72, y: my + 0.08, w: 4.7, h: 0.24, fontSize: 9.2, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE });
    slide.addText(m.desc, { x: 7.72, y: my + 0.34, w: 4.7, h: 0.44, fontSize: 8.0, color: TEXT_BODY, fontFace: FONT_BODY });
  });
}

// ============================================================================
// SLIDE 17: Deep-Dive: Hop 4 Cloud KMS CMEK Crypto-Shredding & Instant Kill-Switch
// ============================================================================
function buildSlide17_Hop4CryptoShredding() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • HOP 4 FINOPS & SAFETY GUARDS', 'Hop 4 32,768 Cache (89.1%), NLC HTTP 422 & Sub-60s (41.2s) CMEK Guard', nextSlideNum());

  slide.addText('Uniform deterministic cost-control and security enforcement across every inference and outbound 2LO/3LO MCP invocation.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const steps = [
    {
      num: 'GUARD 1',
      title: '32,768 Prefix Cache (89.1%)',
      desc: 'Shared invariant context stays cached across turns while private skills append dynamically after block boundary.',
      code: 'cached_input_tokens: 32768\nuncached_tokens: 692\nnet_input_savings: "89.1%"',
      color: G_BLUE_DARK
    },
    {
      num: 'GUARD 2',
      title: 'Model Armor & Output Clamps',
      desc: 'Inline <8ms prompt injection screening plus MEDIUM/4k (Std) vs HIGH/8k (VIP) caps.',
      code: 'model_armor.screen(<8ms)\nthinking_limit = 8000 if vip else 4000\n# Prevents runaway FinOps spend',
      color: G_AMBER_DEEP
    },
    {
      num: 'GUARD 3',
      title: 'NLC Anti-Fraud Check (HTTP 422)',
      desc: 'Zero-PII natural-language constraint checker blocks unauthorized mass refunds or policy bypasses.',
      code: 'HTTP/1.1 422 Unprocessable\n{\n  "error": "NLC_POLICY_BLOCK",\n  "rule": "MAX_REFUND_EXCEEDED"\n}',
      color: G_GREEN_DEEP
    },
    {
      num: 'GUARD 4',
      title: '<60s (41.2s) CMEK Kill-Switch',
      desc: 'Pattern B/C key revocation aborts execution deterministically with HTTP 423 and 0 residual tokens.',
      code: 'HTTP/1.1 423 Locked\n{\n  "error": "CRYPTO_SHREDDED",\n  "halt_sla_sec": 41.2\n}',
      color: G_RED_DEEP
    }
  ];

  steps.forEach((s, idx) => {
    const sx = 0.6 + idx * 3.08;
    slide.addShape(pptx.ShapeType.roundRect, { x: sx, y: 1.35, w: 2.92, h: 5.5, rectRadius: 0.08, fill: { color: WHITE }, line: { color: s.color, width: 1.5 } });
    slide.addShape(pptx.ShapeType.rect, { x: sx, y: 1.35, w: 2.92, h: 0.45, fill: { color: G_GREY_BG } });
    slide.addText(s.num, { x: sx + 0.15, y: 1.35, w: 2.62, h: 0.45, fontSize: 8.5, bold: true, color: s.color, fontFace: FONT_TITLE, valign: 'middle' });
    slide.addText(s.title, { x: sx + 0.15, y: 1.9, w: 2.62, h: 0.5, fontSize: 11, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15 });
    slide.addText(s.desc, { x: sx + 0.15, y: 2.45, w: 2.62, h: 0.65, fontSize: 8.8, color: TEXT_MUTED, fontFace: FONT_BODY, lineSpacingMultiple: 1.2 });
    slide.addShape(pptx.ShapeType.roundRect, { x: sx + 0.12, y: 3.2, w: 2.68, h: 3.45, rectRadius: 0.05, fill: { color: G_NAVY }, line: { color: '334155', width: 0.75 } });
    slide.addText(s.code, { x: sx + 0.2, y: 3.35, w: 2.52, h: 3.15, fontSize: 8.2, color: 'E2E8F0', fontFace: 'Consolas', lineSpacingMultiple: 1.25 });
  });
}

// ============================================================================
// SLIDE 18: Deep-Dive: Hop 5 Dedicated AlloyDB Clusters & Physical Storage Isolation
// ============================================================================
function buildSlide18_Hop5AlloyDb() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • HOP 5 ZERO-PII OTEL', 'Hop 5 Zero-PII SHA-256 BigQuery FinOps OTel & Chargeback Ledger', nextSlideNum());

  slide.addText('How every Shared Diagnostic, Private A2A, and 3P SaaS MCP call rolls up into exact per-tenant margin accounting with zero PII leakage.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const cards = [
    {
      title: 'Linked Distributed Trace Spans',
      tag: 'END-TO-END TRACE',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      desc: 'W3C traceparent spans unify Hop 1 ingress, Shared Diagnostic triage, Private A2A delegation, and Hop 5 2LO/3LO MCP tool calls.'
    },
    {
      title: 'Zero-PII SHA-256 Prompt Digest',
      tag: 'PRIVACY INVARIANT',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      desc: 'Prompts and Cloud SDP redacted payloads emit SHA-256 digests with raw_pii_logged = FALSE enforced cleanly in telemetry sinks.'
    },
    {
      title: 'Granular Token Chargeback',
      tag: 'FINOPS METERING',
      color: G_AMBER_DEEP,
      tint: G_YELLOW_LIGHT,
      desc: 'Each span exports tenant_id, agent_id, skill_sha256, cached_input_tokens (32,768), and reasoning output counters straight to BigQuery.'
    },
    {
      title: 'Datadog Observability & S3 Attestation',
      tag: 'AUDIT LEDGER',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      desc: 'Live verification captures APM spans inside Datadog Cloud Observability and immutable JSON proofs in Amazon S3 compliance ledgers.'
    }
  ];

  cards.forEach((c, idx) => {
    const cx = 0.6 + idx * 3.08;
    slide.addShape(pptx.ShapeType.roundRect, { x: cx, y: 1.35, w: 2.92, h: 5.5, rectRadius: 0.08, fill: { color: WHITE }, line: { color: c.color, width: 1.5 } });
    slide.addShape(pptx.ShapeType.rect, { x: cx, y: 1.35, w: 2.92, h: 0.5, fill: { color: c.tint } });
    slide.addText(c.tag, { x: cx + 0.15, y: 1.35, w: 2.62, h: 0.5, fontSize: 8.2, bold: true, color: c.color, fontFace: FONT_TITLE, valign: 'middle' });
    slide.addText(c.title, { x: cx + 0.15, y: 2.0, w: 2.62, h: 0.55, fontSize: 11, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15 });
    slide.addText(c.desc, { x: cx + 0.15, y: 2.65, w: 2.62, h: 4.0, fontSize: 8.8, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.25 });
  });
}

// ============================================================================
// SLIDE 19: Air-Gapped Gemma 3 (27B) Inference on Private GKE with Confidential Computing
// ============================================================================
function buildSlide19_AirGappedGemma() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • MODEL TIERING & AWS FEDERATION', 'Model Selection Strategy & Keyless GCP ↔ AWS AgentCore Federation', nextSlideNum());

  slide.addText('Matching Gemini 2.5 Flash, Dedicated PT, and Gemma 3 to isolation tiers alongside 30/30 verified AWS Bedrock AgentCore federation.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const cards = [
    {
      title: '1. Gemini 2.5 Flash + 32k Cache',
      subtitle: 'Pattern A & Pattern C default FinOps powerhouse',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      items: [
        'Serves high-density Pool & Hybrid tiers via locations/global or regional endpoints.',
        'Delivers 89.1% net input token savings across 32,768-token invariant prompts.',
        'Dynamic MEDIUM/4k & HIGH/8k output clamps curb reasoning output spend under load.',
        'Pairs with inline Model Armor (<8ms) and Cloud SDP inspection.'
      ]
    },
    {
      title: '2. Dedicated Provisioned & Gemma 3',
      subtitle: 'Pattern B Sovereign Silo & DoD/DORA models',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      items: [
        'Dedicated Vertex PT provides unshared throughput SLAs inside single-tenant VPCs.',
        'Open-weight Gemma 3 (27B) serves air-gapped turns on private GKE Confidential VMs.',
        'AMD SEV-SNP hardware memory encryption keeps RAM hidden from cloud hypervisors.',
        'Zero external telemetry or internet egress packets leave regulated enclaves.'
      ]
    },
    {
      title: '3. Keyless OIDC ↔ AWS AgentCore',
      subtitle: '0 static AWS IAM keys across cross-cloud flows',
      color: G_AMBER_DEEP,
      tint: G_YELLOW_LIGHT,
      items: [
        'GCP Auth Manager exchanges workload OIDC assertions via AWS STS AssumeRoleWithWebIdentity.',
        'Cognito RS256 OAuth2 secures AWS Bedrock AgentCore MCP Gateway (us-east-1).',
        'Bridges Lakehouse BI (ThoughtSpot, Sigma, Databricks, Snowflake) & ITSM/HCM tools.',
        'All 10 live SaaS targets report READY across Pattern A, B, and C assertions.'
      ]
    },
    {
      title: '4. 30/30 Multi-Cloud Test Parity',
      subtitle: '60/60 positive & adversarial assertions + S3 ledgers',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      items: [
        'Every SaaS target executes live Pattern A (403 RLS), B (423 KMS), and C (PSC) proofs.',
        'Immutable execution receipts persist to Amazon S3 compliance audit buckets.',
        'Zero synthetic EC2 stand-ins or static credentials exist anywhere in runtime.',
        'Verified cleanly via automated E2E harness across ramp-portal-dev & us-east-1.'
      ]
    }
  ];

  cards.forEach((c, idx) => {
    const cx = 0.6 + idx * 3.08;
    slide.addShape(pptx.ShapeType.roundRect, { x: cx, y: 1.35, w: 2.92, h: 5.5, rectRadius: 0.08, fill: { color: WHITE }, line: { color: c.color, width: 1.5 } });
    slide.addShape(pptx.ShapeType.rect, { x: cx, y: 1.35, w: 2.92, h: 0.6, fill: { color: c.tint } });
    slide.addText(c.title, { x: cx + 0.15, y: 1.42, w: 2.62, h: 0.45, fontSize: 10.5, bold: true, color: c.color, fontFace: FONT_TITLE });
    slide.addText(c.subtitle, { x: cx + 0.15, y: 2.05, w: 2.62, h: 0.35, fontSize: 8.5, italic: true, color: TEXT_MUTED, fontFace: FONT_BODY });
    c.items.forEach((item, iidx) => {
      const iy = 2.5 + iidx * 1.05;
      slide.addShape(pptx.ShapeType.roundRect, { x: cx + 0.12, y: iy, w: 2.68, h: 0.98, rectRadius: 0.04, fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 } });
      slide.addText(`• ${item}`, { x: cx + 0.18, y: iy + 0.06, w: 2.56, h: 0.86, fontSize: 8.0, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15 });
    });
  });
}

// ============================================================================
// SLIDE 20: Architectural Caveats & Nuances for Decision Guide & Agentic Triad
// ============================================================================
function buildSlide20_ArchitecturalCaveats() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • ARCHITECTURAL CAVEATS', 'Architectural Caveats & GAP-01..05 Native Agent Engine Sunset Plan', nextSlideNum());

  slide.addText('Critical enterprise production caveats paired with explicit GAP-01..05 feature flags ready for frictionless Agent Engine GA cutover.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const caveats = [
    {
      title: '1. GAP-01 & GAP-02: ARD RBAC & 3LO Vaults',
      tag: 'PHASE 2 SUNSET',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      impact: 'Native multi-tenant agent catalogs & managed per-user 3LO token vaults currently require Hop 2/Hop 5 middleware shims.',
      mitigation: 'Wrap custom ARD ACL & KMS Vault logic behind CYMBAL_NATIVE_ARD_ACL_ENABLED and CYMBAL_NATIVE_AUTH_MGR_3LO feature flags.'
    },
    {
      title: '2. GAP-03..05: CMEK Cache, Quota & Billing',
      tag: 'PHASE 3 SUNSET',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      impact: 'CMEK memory eviction events, sub-tenant RPM throttling, and per-tenant Vertex token exports require platform glue today.',
      mitigation: 'Gate behind CYMBAL_NATIVE_CMEK_CACHE_SYNC, CYMBAL_NATIVE_SUBTENANT_QUOTA & CYMBAL_NATIVE_VERTEX_TENANT_BILLING flags.'
    },
    {
      title: '3. Prefix Cache Fragmentation Across Silos',
      tag: 'FINOPS NUANCE',
      color: G_AMBER_DEEP,
      tint: G_YELLOW_LIGHT,
      impact: 'Pattern B single-tenant clusters cannot share ContextCacheConfig across projects, losing the 89.1% cached-input discount.',
      mitigation: 'Default non-sovereign accounts to Pattern A/C shared 32,768 caches and reserve Pattern B strictly for Gate 3 (q_silo=1).'
    },
    {
      title: '4. CoW Concurrency vs. WarmPool Latch Trade-Off',
      tag: 'RUNTIME NUANCE',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      impact: 'Mode A CoW (--max-requests=1) sacrifices warm container reuse for zero heap bleed; Mode B adds cross-tenant latch complexity.',
      mitigation: 'Enforce Mode A CoW for high-isolation hybrid/pool workloads and gate Mode B behind verified HTTP 403 tenant latch assertions.'
    }
  ];

  caveats.forEach((c, idx) => {
    const cx = 0.6 + idx * 3.08;
    slide.addShape(pptx.ShapeType.roundRect, { x: cx, y: 1.35, w: 2.92, h: 5.5, rectRadius: 0.08, fill: { color: WHITE }, line: { color: c.color, width: 1.5 } });
    slide.addShape(pptx.ShapeType.rect, { x: cx, y: 1.35, w: 2.92, h: 0.5, fill: { color: c.tint } });
    slide.addText(c.tag, { x: cx + 0.15, y: 1.35, w: 2.62, h: 0.5, fontSize: 8.2, bold: true, color: c.color, fontFace: FONT_TITLE, valign: 'middle' });
    slide.addText(c.title, { x: cx + 0.15, y: 1.95, w: 2.62, h: 0.55, fontSize: 10.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15 });
    slide.addShape(pptx.ShapeType.roundRect, { x: cx + 0.12, y: 2.6, w: 2.68, h: 1.9, rectRadius: 0.04, fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 } });
    slide.addText('ARCHITECTURAL IMPACT & CONSTRAINT', { x: cx + 0.18, y: 2.68, w: 2.56, h: 0.2, fontSize: 7.5, bold: true, color: G_RED_DEEP, fontFace: FONT_TITLE });
    slide.addText(c.impact, { x: cx + 0.18, y: 2.92, w: 2.56, h: 1.5, fontSize: 8.0, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2 });
    slide.addShape(pptx.ShapeType.roundRect, { x: cx + 0.12, y: 4.6, w: 2.68, h: 2.1, rectRadius: 0.04, fill: { color: 'F0FDF4' }, line: { color: G_GREEN_DEEP, width: 0.75 } });
    slide.addText('SUNSET FLAG & COMPENSATING CONTROL', { x: cx + 0.18, y: 4.68, w: 2.56, h: 0.2, fontSize: 7.5, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE });
    slide.addText(c.mitigation, { x: cx + 0.18, y: 4.92, w: 2.56, h: 1.7, fontSize: 8.0, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2 });
  });
}

// ============================================================================
// SLIDE 21: Transition Breaker — Act IV: Empirical Multi-Cloud Verification
// ============================================================================
function buildSlide21_Act4Breaker() {
  buildActBreakerSlide({
    actTag: 'ACT IV • EMPIRICAL PROOFS',
    actNumber: 'ACT IV',
    actTitle: FULL_34_MODE
      ? 'Empirical Multi-Cloud Verification & 30/30 Multi-Cloud Proofs'
      : 'Triad Governance Proofs & 10-SaaS Atlas',
    actSubtitle: FULL_34_MODE
      ? 'Authentic live console UI Captures Across 10 Live Enterprise SaaS Stacks'
      : 'Commercial SaaS Verification Slots for Datadog Observability (SAAS-09) & Workday HCM (SAAS-08) + Companion 10-SaaS Atlas.',
    actColor: G_RED_DEEP,
    actTint: G_RED_LIGHT,
    coreQuestion: 'Can the Multi-Tenant Agentic Triad interact cleanly across Pattern A, B & C SaaS tools while maintaining zero-trust perimeters and regulatory compliance?',
    thesis: FULL_34_MODE
      ? 'Live verification across 10 third-party enterprise SaaS stacks proves that dedicated per-tenant perimeters and DPoP-bound credentials isolate all tool actions.'
      : 'Two signature Triad proofs (SAAS-09 Datadog Observability & SAAS-08 Workday HCM) validate Shared+Private A2A & CRAC governance across A/C/B, backed by the Companion 10-SaaS Atlas and 30/30 S3 Ledgers.',
    milestones: FULL_34_MODE ? [
      {
        num: '01',
        title: 'Proofs 1–3: Analytics & Observability (ThoughtSpot Cloud, Databricks Unity Catalog, Sigma Computing)',
        desc: 'Verifying that BI dashboards, distributed SQL engines, and APM metrics are strictly isolated within tenant VPCs.',
        deliverable: '3 Multi-Cloud BI & Telemetry Proofs'
      },
      {
        num: '02',
        title: 'Proofs 4–6: Logs, Secrets & Warehouses (Datadog SRE, Okta/CrowdStrike XDR, Snowflake AI Data Cloud)',
        desc: 'Verifying CMEK-encrypted audit logging, per-tenant Vault namespaces, and HSM-encrypted database tables.',
        deliverable: '3 Cross-Pattern OTel & Vault Stores'
      },
      {
        num: '03',
        title: 'Proofs 7–8: Workspaces & Operations (ServiceNow ITSM, Veeva Vault RIM)',
        desc: 'Proving agent project tracking tools and CRM spreadsheets cannot cross enterprise organizational boundaries.',
        deliverable: '2 Multi-Cloud ITSM & Relational Proofs'
      },
      {
        num: '04',
        title: 'Proofs 9–10: CRM, Work Tracking & HCM (Atlassian Jira & Salesforce, Workday HCM)',
        desc: 'Verifying that proprietary agent skill code and customer knowledge items are completely invisible to external tenants.',
        deliverable: '2 Multi-Cloud GitOps & HCM Proofs'
      }
    ] : [
      {
        num: '01',
        title: 'Signature Proof 1: Datadog Cloud Observability (SAAS-09)',
        desc: 'Slide 20 proves structured OTel audit log filtering and zero-PII redaction across Pattern A Pooled, Pattern C Hybrid, and Pattern B Silos.',
        deliverable: 'Slide 20 • SAAS-09'
      },
      {
        num: '02',
        title: 'Signature Proof 2: Workday Enterprise HCM HR CRAC (SAAS-08)',
        desc: 'Slide 21 proves fine-grained cell-level Row Access Control and A2A private agent delegation prevent cross-tenant HCM disclosure.',
        deliverable: 'Slide 21 • SAAS-08'
      },
      {
        num: '03',
        title: 'Companion 10-SaaS Multi-Cloud Visual Atlas',
        desc: 'Companion 10-SaaS Commercial Verification Atlas & 30/30 AgentCore MCP Ledger covering ThoughtSpot Cloud, Databricks Unity Catalog, Sigma Computing, Okta/CrowdStrike XDR, Snowflake AI Data Cloud, ServiceNow ITSM, Veeva Vault RIM, and Atlassian Jira & Salesforce.',
        deliverable: 'Companion Atlas'
      },
      {
        num: '04',
        title: '30/30 AWS AgentCore & S3 Audit Ledgers',
        desc: 'Cross-cloud parity receipts proving zero branch drift across core-cymbal-agent/ and 30/30 passing assertions in S3.',
        deliverable: '30/30 Ledgers'
      }
    ]
  });
}

// ============================================================================
// SLIDE 22: Proof 1 — ThoughtSpot Cloud Spotter BI (ThoughtSpot)
// ============================================================================
function buildSlide22_ThoughtSpot() {
  buildBeforeAfterSaasSlide({
    proofNum: 1,
    saasName: 'ThoughtSpot Cloud Spotter BI',
    title: 'Proof 1: ThoughtSpot Cloud Spotter BI — Commercial Liveboard & Hop 5 RLS Design',
    subtitle: 'Authentic live console UI captures from live ThoughtSpot Cloud (team2.thoughtspot.cloud) paired with Hop 5 AlloyDB RLS tenant-isolation architecture.',
    beforeImg: 'saas_01_thoughtspot_liveboard.png',
    afterImg: 'saas_02_thoughtspot_saved_answer.png',
    beforeHeader: 'LIVE VIEW 1: THOUGHTSPOT CLOUD EXECUTIVE LIVEBOARD',
    beforeVulnerability: 'Live View 1 captures the commercial ThoughtSpot Cloud Executive Retail Sales Liveboard ($735.3K KPIs) on team2.thoughtspot.cloud; unscoped multi-tenant queries risk cross-tenant leakage without Hop 5 RLS.',
    beforeThreat: 'Without Hop 5 AlloyDB RLS enforcement, cross-tenant RetailStream order metadata leaks alongside FinVault institutional wire settlements.',
    afterHeader: 'LIVE VIEW 2: THOUGHTSPOT CLOUD GOVERNED SAVED ANSWER',
    afterEnforcement: 'Hop 5 AlloyDB FORCE RLS enforces SET LOCAL app.current_tenant_id on governed ThoughtSpot Cloud views (zero cross-tenant rows in production).',
    afterVerification: 'Live View 2 captures the ThoughtSpot Cloud Pharma Supply Saved Answer (100 rows) on team2.thoughtspot.cloud; Hop 5 AlloyDB RLS enforces tenant_id = finvault in production.'
  });
}

// ============================================================================
// SLIDE 23: Proof 2 — Databricks Unity Catalog SQL (Databricks)
// ============================================================================
function buildSlide23_Databricks() {
  buildBeforeAfterSaasSlide({
    proofNum: 2,
    saasName: 'Databricks Unity Catalog Federated SQL',
    title: 'Proof 2: Databricks Unity Catalog Federated SQL — AgentCore Target Attribution & RLS Execution',
    subtitle: 'Commercial SaaS verification slot (pending Marketplace trial / SSO — live commercial SaaS) comparing ad-hoc manual SRE queries against Hop 5 geap-hop5-agent@finvault.com (TERCK8SLBP) Unity Catalog RLS execution.',
    beforeImg: '',
    afterImg: '',
    beforeHeader: 'BEFORE: Databricks Unity Catalog SQL Warehouse — Ad-Hoc Queries (sre-lead@finvault.com)',
    beforeVulnerability: 'SQL Warehouse query history displays manual sre-lead@finvault.com SQL queries (20261029_133921_00004, 00003) executed outside Hop 5 AgentCore governance.',
    beforeThreat: 'Ad-hoc manual Databricks Unity Catalog sessions lack AgentCore target attribution (TERCK8SLBP) and federated tenant_id RLS attestation across catalogs.',
    afterHeader: 'AFTER: Hop 5 FINISHED Query (55.95ms • geap-agentcore-TERCK8SLBP)',
    afterEnforcement: 'Top FINISHED query (55.95ms) by geap-hop5-agent@finvault.com (geap-agentcore-TERCK8SLBP) runs TERCK8SLBP_UNITY_RLS_VERIFIED ($527.0M).',
    afterVerification: 'Federated Databricks Unity Catalog execution returns FV-TX-901 strictly for tenant_id = finvault with verified AgentCore source tag and 0 cross-tenant rows.'
  });
}

// ============================================================================
// SLIDE 24: Proof 3 — Sigma Computing Cloud BI Observability (Sigma Computing)
// ============================================================================
function buildSlide24_Sigma() {
  buildBeforeAfterSaasSlide({
    proofNum: 3,
    saasName: 'Sigma Computing Cloud BI',
    title: 'Proof 3: Sigma Computing Cloud BI / Sigma Workbook — Cross-Org Spoof 403 & Attestation',
    subtitle: 'Commercial SaaS verification slot (pending Marketplace trial / SSO — live commercial SaaS) proving Target IZVODT083Q enforces eval_sigma_workbook_rls (HTTP 200) and blocks ops-eng@retailstream.com (HTTP 403).',
    beforeImg: '',
    afterImg: '',
    beforeHeader: 'BEFORE: FinVault OCC Workbook — Baseline 3-Row Panel (Pre-Attestation)',
    beforeVulnerability: 'Baseline FinVault OCC workbook renders the 3-row summary panel (FV-TX-901, FV-TX-902, RS-ORD-401 $0.00 Filtered / 403) without Hop 5 telemetry.',
    beforeThreat: 'Absent an attached Hop 5 Agentic Attestation panel and S3 receipt, cross-org impersonation blocks lack live verifiable forensic proof.',
    afterHeader: 'AFTER: Hop 5 Attestation (IZVODT083Q) + Cross-Org Spoof BLOCKED HTTP 403',
    afterEnforcement: 'Appends Target IZVODT083Q panel: eval_sigma_workbook_rls returns HTTP 200 ALLOW while ops-eng@retailstream.com spoof hits BLOCKED HTTP 403.',
    afterVerification: 'Attestation anchored in cymbal-10saas-ledger/sigma-computing/finvault.json confirming strict tenant_id = finvault isolation.'
  });
}

// ============================================================================
// SLIDE 25: Proof 4 — Datadog Observability Centralized Logging (Datadog)
// ============================================================================
function buildSlide25_Datadog() {
  buildBeforeAfterSaasSlide({
    proofNum: 4,
    saasName: 'Datadog Observability',
    title: 'Proof 4: Datadog Observability APM — Model Armor Defense & Hop 5 Live Telemetry Trace',
    subtitle: 'Commercial SaaS verification slot (pending Marketplace trial / SSO — live commercial SaaS) contrasting excluded baseline queries against expanded Target G767QR3TQZ Hop 5 structured APM verification.',
    beforeImg: '',
    afterImg: '',
    beforeHeader: 'BEFORE: Not(AgentCoreTarget = G767QR3TQZ) — 5 Historical & Intercepted Events',
    beforeVulnerability: 'Baseline query excludes G767QR3TQZ and shows 5 historical events, including Hop 4 Model Armor blocking indirect prompt injection in stack trace.',
    beforeThreat: 'Without Hop 4 Model Armor inspection prior to log indexing, adversarial stack traces could poison downstream autonomous triage agents.',
    afterHeader: 'AFTER: Live Expanded Trace [G767QR3TQZ] — PASS_ZERO_PROMPT_INJECTION',
    afterEnforcement: 'Expanded trace [LIVE-MCP geap-hop5-mvv1tg35] verifies TenantId: finvault, Hop4ModelArmor: PASS_ZERO_PROMPT_INJECTION, ZeroPiiAttested: true.',
    afterVerification: 'Verification binds S3AuditObject cymbal-10saas-ledger/datadog-sre/finvault.json with zero raw customer PII emitted to Datadog Logs telemetry.'
  });
}

// ============================================================================
// SLIDE 26: Proof 5 — Okta & CrowdStrike XDR Secrets Management (CrowdStrike / Okta)
// ============================================================================
function buildSlide26_CrowdStrikeOkta() {
  buildBeforeAfterSaasSlide({
    proofNum: 5,
    saasName: 'Okta & CrowdStrike XDR',
    title: 'Proof 5: Okta & CrowdStrike XDR — RFC 9449 DPoP Containment & HSM Attestation',
    subtitle: 'Commercial SaaS verification slot (pending Marketplace trial / SSO — live commercial SaaS) verifying tenant-scoped policy namespace finvault progression from v1 Pending Containment to v2 DPoP Verified 200.',
    beforeImg: '',
    afterImg: '',
    beforeHeader: 'BEFORE: tenant-scoped policy namespace finvault v1 — PENDING_HOP5_DPOP_CONTAINMENT',
    beforeVulnerability: 'Okta/CrowdStrike DPoP policy tenant-scoped policy namespace finvault Version 1 holds target C7EYM614F2 and cmek_key_state: ENABLED, but xdr_containment_status stays PENDING.',
    beforeThreat: 'Without SHA-256 dpop_jkt_thumbprint binding and HSM attestation in containment policy v2, cryptographic containment proof remains incomplete.',
    afterHeader: 'AFTER: Policy v2 — HOST_CONTAINED_DPOP_VERIFIED_200 & SHA-256 dpop_jkt',
    afterEnforcement: 'Version 2 sets ENABLED_HSM_ATTESTED, records SHA-256 dpop_jkt_thumbprint, and links cymbal-10saas-ledger/crowdstrike-okta/finvault.json.',
    afterVerification: 'State transitions to HOST_CONTAINED_DPOP_VERIFIED_200 with strict Okta/CrowdStrike DPoP policy path scoping isolating FinVault KMS/XDR metadata.'
  });
}

// ============================================================================
// SLIDE 27: Proof 6 — Snowflake AI Data Cloud Analytics Engine (Snowflake)
// ============================================================================
function buildSlide27_Snowflake() {
  buildBeforeAfterSaasSlide({
    proofNum: 6,
    saasName: 'Snowflake AI Data Cloud Analytics',
    title: 'Proof 6: Snowflake AI Data Cloud Analytics — Row-Level Policy Block vs. FinVault Scoped Query',
    subtitle: 'Commercial SaaS verification slot (pending Marketplace trial / SSO — live commercial SaaS) proving finvault_user receives 0 rows when probing retailstream vs. $527.0M under tenant_id = finvault.',
    beforeImg: '',
    afterImg: '',
    beforeHeader: 'BEFORE: Cross-Tenant Probe (WHERE tenant_id = retailstream → 0 Rows / 0 B)',
    beforeVulnerability: 'finvault_user executes WHERE tenant_id = retailstream on cymbal_warehouse.wire_settlement_ledger; Snowflake AI Data Cloud returns empty result (0 rows, 0.00 B).',
    beforeThreat: 'Cross-tenant WHERE clauses succeed silently if row policies are absent; native Snowflake Cortex RLS ensures zero cross-tenant rows ever return.',
    afterHeader: 'AFTER: Scoped FinVault Query (FV-TX-901 $312.5M & FV-TX-902 $214.5M • CMEK)',
    afterEnforcement: 'Scoped query WHERE tenant_id = finvault returns FV-TX-901 ($312.5M) and FV-TX-902 ($214.5M) tagged with gcp-kms://finvault-cmek-hsm.',
    afterVerification: 'Confirms Snowflake AI Data Cloud row policy enforcement blocks retailstream reads (0.00 B) while serving authorized $527.0M FinVault analytics.'
  });
}

// ============================================================================
// SLIDE 28: Proof 7 — ServiceNow ITSM Enterprise Project Tracker (ServiceNow)
// ============================================================================
function buildSlide28_ServiceNow() {
  buildBeforeAfterSaasSlide({
    proofNum: 7,
    saasName: 'ServiceNow ITSM',
    title: 'Proof 7: ServiceNow ITSM (ZS9VGYHBQL) — Automated Hop 5 Change Control & CMEK Proof',
    subtitle: 'Commercial SaaS verification slot (pending Marketplace trial / SSO — live commercial SaaS) verifying Target ZS9VGYHBQL filing CHG0049299 with Valkey Single-Flight & KMS CMEK attestation.',
    beforeImg: '',
    afterImg: '',
    beforeHeader: 'BEFORE: FinVault ITSM (ZS9VGYHBQL) — 2 Manual Issues (#2 INC0948211, #1 CHG)',
    beforeVulnerability: 'Baseline ServiceNow ITSM view lists 2 manual sre-lead@finvault.com issues (#2 INC0948211, #1 CHG0049218) prior to Hop 5 MCP automation.',
    beforeThreat: 'Manual ITSM tickets lack cryptographic correlation to [GEAP-MCP ZS9VGYHBQL] Valkey single-flight locks and KMS CMEK runtime proofs.',
    afterHeader: 'AFTER: Audited Change CHG0049299 [GEAP-MCP ZS9VGYHBQL] Verified',
    afterEnforcement: 'Hop 5 Target ZS9VGYHBQL appends #3 CHG0049299: Automated Hop 5 Valkey Single-Flight & KMS CMEK Attestation inside ZS9VGYHBQL.',
    afterVerification: 'Auditable ServiceNow ITSM change timeline ties ITSM change control directly to FinVault Core Banking Hop 5 runtime boundaries.'
  });
}

// ============================================================================
// SLIDE 29: Proof 8 — Veeva Vault RIM Relational Workspace (Muse)
// ============================================================================
function buildSlide29_VeevaVault() {
  buildBeforeAfterSaasSlide({
    proofNum: 8,
    saasName: 'Veeva Vault RIM',
    title: 'Proof 8: Veeva Vault RIM 21 CFR Part 11 Ledger — Sovereign Key Lineage & Append Proof',
    subtitle: 'Commercial SaaS verification slot (pending Marketplace trial / SSO — live commercial SaaS) proving Target TWQU0KSRVF (muse-poc) appends attested FinVault record AWS-GXP-104 (ECDSA P-256) to ledger.',
    beforeImg: '',
    afterImg: '',
    beforeHeader: 'BEFORE: FinVault KMS 21 CFR 11 View — 3 Baseline Rows (Incl. RS AWS-GXP-103)',
    beforeVulnerability: 'Veeva Vault RIM grid shows 3 baseline records (AWS-GXP-101/102 finvault Pattern B/C, AWS-GXP-103 retailstream Pattern A) before Hop 5 append.',
    beforeThreat: 'Shared registry views lacking tenant_id scoping display cross-tenant Pattern A rows (AWS-GXP-103 retailstream) beside FinVault CMEK spokes.',
    afterHeader: 'AFTER: 4 Records — Appended AWS-GXP-104 (TWQU0KSRVF • ECDSA_P256_LIVE_AGENT)',
    afterEnforcement: 'Hop 5 Target TWQU0KSRVF appends record 4 (AWS-GXP-104, finvault, Pattern C Hybrid PSC) with ECDSA_P256_LIVE_AGENT cryptographic proof.',
    afterVerification: 'Confirmed deterministic ledger transition (3 → 4 rows) with immutable Pattern C CMEK lineage and ECDSA P-256 agent verification.'
  });
}

// ============================================================================
// SLIDE 30: Proof 9 — Atlassian Jira Cloud & Salesforce CRM Service (Salesforce & Jira)
// ============================================================================
function buildSlide30_SalesforceJira() {
  buildBeforeAfterSaasSlide({
    proofNum: 9,
    saasName: 'Atlassian Jira & Salesforce Enterprise',
    title: 'Proof 9: Atlassian Jira & Salesforce CRM Escalations — Hop 4 SDP Redaction & Automated RCA Receipt',
    subtitle: 'Commercial SaaS verification slot (pending Marketplace trial / SSO — live commercial SaaS) showing Target K5JAEFCQ6E posting SDP-redacted RCA on Issue #1 and blocking retailstream-ops (HTTP 404).',
    beforeImg: '',
    afterImg: '',
    beforeHeader: 'BEFORE: finvault/sre-escalations Issue #1 — 0 Comments / Awaiting Hop 5 RCA',
    beforeVulnerability: 'Issue #1 ([SFDC-CASE-00984120 / FINVAULT-SRE-1402] P1 Wire Settlement Escalation) is open with 0 comments and an empty reply state.',
    beforeThreat: 'Manual incident triage risks pasting raw IBAN/SWIFT bank identifiers into Atlassian Jira & Salesforce issues or permitting cross-repo inspection.',
    afterHeader: 'AFTER: 1 Comment — SDP-Redacted RCA (K5JAEFCQ6E • retailstream-ops HTTP 404)',
    afterEnforcement: 'create_redacted_sfdc_jira_escalation (K5JAEFCQ6E) masks [REDACTED-FINVAULT-IBAN] & [REDACTED-SWIFT-BIC] (raw_pii_leaked = false).',
    afterVerification: 'Cross-tenant retailstream-ops probe fails closed with HTTP 404 Not Found while FinVault Issue #1 stores zero raw customer PII.'
  });
}

// ============================================================================
// SLIDE 31: Proof 10 — Workday Enterprise HCM (Workday)
// ============================================================================
function buildSlide31_Workday() {
  buildBeforeAfterSaasSlide({
    proofNum: 10,
    saasName: 'Workday HCM CMS',
    title: 'Proof 10: Workday HCM Compensation — Scoped HR Write & Collection Integrity',
    subtitle: 'Commercial SaaS verification slot (pending Marketplace trial / SSO — live commercial SaaS) verifying tenant-scoped HCM RaaS Compensation Report growth from 2 baseline FinVault rows to 3 records.',
    beforeImg: '',
    afterImg: '',
    beforeHeader: 'BEFORE: Hcm Compensation — 2 Baseline FinVault Records ($420K / $365K)',
    beforeVulnerability: 'Workday HCM RaaS Compensation Report holds 2 baseline finvault rows ($420,000 Clara Vance, $365,000 Marcus Thorne) pre-Hop 5.',
    beforeThreat: 'Unverified HCM collection writes risk committing unscoped compensation records or leaking cross-tenant executive pay across orgs.',
    afterHeader: 'AFTER: 3 FinVault Records — Added $395,000 FinVault-Risk-Analyst (E. Rostova)',
    afterEnforcement: 'Hop 5 HCM gate commits row #3 ($395,000 FinVault-Risk-Analyst, Elena Rostova) scoped strictly to tenant_id = finvault.',
    afterVerification: 'Collection cleanly transitions from 2 to 3 finvault compensation records with zero cross-tenant HR exposure.'
  });
}

// ============================================================================
// SLIDE 32: Transition Breaker — Act V: Implementation, Scorecard & CISO Guide
// ============================================================================
function buildSlide32_Act5Breaker() {
  buildActBreakerSlide({
    actTag: 'ACT V • ENTERPRISE GA & SCORECARD',
    actNumber: 'ACT V',
    actTitle: 'GA Roadmap, Pattern A/C/B Scorecard & CISO FAQ',
    actSubtitle: 'Phased GA Consolidation, Unified 3-Pattern Matrix, and Executive Decision Answers',
    actColor: G_GREEN_DEEP,
    actTint: G_GREEN_LIGHT,
    coreQuestion: 'How do platform teams ship the verified baseline today while cleanly retiring compensating GAP-01..05 shims over time?',
    thesis: 'A 10-week GA rollout delivers Pool/Hybrid/Silo parity + AWS 30/30 federation immediately, with feature-flagged Agent Engine native upgrades.',
    milestones: [
      {
        num: '01',
        title: '10-Week Enterprise GA Roadmap',
        desc: 'Phase 1 verified baseline today → Phase 2 native ARD/3LO → Phase 3 native CMEK FinOps bus.',
        deliverable: 'Gantt & Sunset Plan'
      },
      {
        num: '02',
        title: 'Unified Pattern A vs. C vs. B Scorecard',
        desc: 'Side-by-side matrix comparing COGS, isolation, KMS kill-switch SLA, and live migration across Patterns.',
        deliverable: 'Unified Pattern Matrix'
      },
      {
        num: '03',
        title: 'CISO & Board Decision FAQ',
        desc: 'Direct executive answers on Pattern selection, GAP-01..05 sunset, Zero-PII OTel, and AWS federation.',
        deliverable: 'Executive Decision Framework'
      }
    ]
  });
}

// ============================================================================
// SLIDE 33: 10-Week Enterprise Agentic Triad Implementation Roadmap
// ============================================================================
function buildSlide33_Roadmap() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT V • IMPLEMENTATION ROADMAP', '10-Week Enterprise Agentic Triad Implementation Roadmap: Phased Sprints & Gates', nextSlideNum());

  slide.addText('Phased 10-week execution roadmap taking core-cymbal-agent/ from Pattern A baseline to 30/30 Multi-Cloud GA and native sunset readiness.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const sprints = [
    {
      sprint: 'SPRINT 1',
      weeks: 'Weeks 1–2',
      title: 'Shared 5-Hop Core & Mode A CoW',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      gate: 'GATE 1: Pattern A Baseline',
      tasks: [
        'Deploy shared 5-Hop ADK core with STS ECDSA P-256 & DPoP.',
        'Enable Mode A CoW (--max-requests=1) & AlloyDB FORCE RLS.',
        'Lock 32,768 shared prefix cache (89.1%) + MEDIUM/4k & HIGH/8k output clamps.',
        'Wire GAP-01..05 compensating hooks behind feature flags.'
      ]
    },
    {
      sprint: 'SPRINT 2',
      weeks: 'Weeks 3–4',
      title: 'Pattern C /28 PSC & 0ms Migration',
      color: G_BLUE,
      tint: G_BLUE_LIGHT,
      gate: 'GATE 2: 0ms CAS Cutover Pass',
      tasks: [
        'Provision Firestore CAS tier table & Hub rule 10.10.0.50:443.',
        'Launch unidirectional /28 PSC Spokes + PgBouncer pooling.',
        'Verify SHADOW_SYNC → SHA-256 Parity → CAS Flip (0 dropped turns).',
        'Bind regional Vertex endpoints when spoke_cmek_required=true.'
      ]
    },
    {
      sprint: 'SPRINT 3',
      weeks: 'Weeks 5–6',
      title: 'Pattern B Silo & 41.2s CMEK Guard',
      color: G_AMBER_DEEP,
      tint: G_YELLOW_LIGHT,
      gate: 'GATE 3: 41.2s Kill-Switch Pass',
      tasks: [
        'Configure Terraform sovereign projects + VPC-SC (0.0.0.0/0 deny).',
        'Bind IAM PAB boundaries & Customer FIPS HSM CMEK keys.',
        'Deploy Private GKE AMD SEV-SNP serving Gemma 3 (27B).',
        'Prove HTTP 423 enclave halt within <60s (41.2s verified).'
      ]
    },
    {
      sprint: 'SPRINT 4',
      weeks: 'Weeks 7–8',
      title: 'Dynamic GCS Skills & AWS 30/30',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      gate: 'GATE 4: 30/30 Multi-Cloud Pass',
      tasks: [
        'Activate Shared → Private A2A delegation + SHA-256 GCS skills.',
        'Configure keyless OIDC WIF → AWS Bedrock AgentCore Gateway.',
        'Verify all 10 SaaS targets across Pattern A/B/C + S3 ledgers.',
        'Audit Zero-PII SHA-256 BigQuery & Datadog OTel chargeback spans.'
      ]
    },
    {
      sprint: 'SPRINT 5',
      weeks: 'Weeks 9–10',
      title: 'Phase 2/3 GA Flag Consolidation',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      gate: 'GATE 5: Enterprise Triad GA',
      tasks: [
        'Validate GAP-01/02 sunset toggle onto native ARD & 3LO vaults.',
        'Validate GAP-03..05 native CMEK bus, quota & billing exports.',
        'Deliver executive 2-Question Selector & FinOps cost deck.',
        'Achieve formal CISO, FinOps CFO, and Platform CTO GA sign-off.'
      ]
    }
  ];

  sprints.forEach((s, idx) => {
    const sx = 0.6 + idx * 2.45;
    slide.addShape(pptx.ShapeType.roundRect, { x: sx, y: 1.35, w: 2.32, h: 5.5, rectRadius: 0.08, fill: { color: WHITE }, line: { color: s.color, width: 1.5 } });
    slide.addShape(pptx.ShapeType.rect, { x: sx, y: 1.35, w: 2.32, h: 0.85, fill: { color: s.tint } });
    slide.addText(`${s.sprint} (${s.weeks})`, { x: sx + 0.12, y: 1.42, w: 2.08, h: 0.25, fontSize: 8.5, bold: true, color: s.color, fontFace: FONT_TITLE });
    slide.addText(s.title, { x: sx + 0.12, y: 1.68, w: 2.08, h: 0.45, fontSize: 10.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15 });
    s.tasks.forEach((t, tidx) => {
      const ty = 2.35 + tidx * 0.92;
      slide.addShape(pptx.ShapeType.roundRect, { x: sx + 0.12, y: ty, w: 2.08, h: 0.82, rectRadius: 0.04, fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 } });
      slide.addText(`• ${t}`, { x: sx + 0.18, y: ty + 0.06, w: 1.96, h: 0.7, fontSize: 7.8, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15 });
    });
    slide.addShape(pptx.ShapeType.roundRect, { x: sx + 0.12, y: 6.15, w: 2.08, h: 0.55, rectRadius: 0.05, fill: { color: s.tint }, line: { color: s.color, width: 1 } });
    slide.addText(s.gate, { x: sx + 0.12, y: 6.15, w: 2.08, h: 0.55, fontSize: 8.2, bold: true, color: s.color, fontFace: FONT_TITLE, align: 'center', valign: 'middle' });
  });
}

// ============================================================================
// SLIDE 34: Agentic Triad Scorecard & CISO FAQ Guide
// ============================================================================
function buildSlide34_ScorecardAndFaq() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT V • SCORECARD & CISO FAQ', 'Unified Pattern A vs. C vs. B Scorecard & Executive CISO FAQ Guide', nextSlideNum());

  slide.addText('Executive side-by-side comparison of Pattern A, Pattern C, and Pattern B alongside strategic answers for CIO/CISO review boards.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const headers = [
    { text: 'Architectural Criterion', options: { bold: true, color: WHITE, fill: { color: G_NAVY }, fontSize: 8.5 } },
    { text: 'Pattern A: High-Density Pool', options: { bold: true, color: WHITE, fill: { color: G_BLUE_DARK }, fontSize: 8.5, align: 'center' } },
    { text: 'Pattern C: Dynamic Hybrid (/28 PSC)', options: { bold: true, color: WHITE, fill: { color: G_GREEN_DEEP }, fontSize: 8.5, align: 'center' } },
    { text: 'Pattern B: Sovereign Silos', options: { bold: true, color: WHITE, fill: { color: G_RED_DEEP }, fontSize: 8.5, align: 'center' } }
  ];

  const rows = [
    [
      'Relative Infrastructure COGS',
      '1.0x Baseline (1,000+ Tenants)',
      '1.8x (5% VIP) to ~2.8x (15% VIP)',
      '~15x Dedicated Per-Tenant Enclave'
    ],
    [
      'Data & Network Isolation',
      'AlloyDB FORCE RLS + Mode A CoW wipe',
      'Pool RLS + Unidirectional /28 PSC CMEK',
      'Dedicated Project + VPC-SC + SEV-SNP'
    ],
    [
      'Prefix Cache & FinOps',
      '✅ 89.1% (32,768 Cache) + 120 RPM',
      '✅ 89.1% Hub Cache + 600 RPM VIP',
      '⚠️ Per-Silo Vertex PT / Gemma 3 (27B)'
    ],
    [
      'CMEK Kill-Switch & Cutover',
      '<5s Valkey SCAN+UNLINK eviction',
      '0ms Atomic CAS Live Upgrade + Spoke CMEK',
      '41.2s Verified Full Enclave Halt (423)'
    ]
  ];

  const tableData = [headers, ...rows.map((r, idx) => [
    { text: r[0], options: { fontSize: 8.0, bold: true, color: G_NAVY, fill: { color: idx % 2 === 0 ? G_GREY_BG : WHITE } } },
    { text: r[1], options: { fontSize: 7.8, bold: true, color: G_BLUE_DARK, fill: { color: idx % 2 === 0 ? 'EFF6FF' : WHITE }, align: 'left' } },
    { text: r[2], options: { fontSize: 7.8, bold: true, color: G_GREEN_DEEP, fill: { color: idx % 2 === 0 ? 'F0FDF4' : G_GREEN_LIGHT }, align: 'left' } },
    { text: r[3], options: { fontSize: 7.8, color: TEXT_DARK, fill: { color: idx % 2 === 0 ? G_GREY_BG : WHITE }, align: 'left' } }
  ])];

  slide.addTable(tableData, {
    x: 0.6, y: 1.24, w: 12.133, colW: [2.5, 3.2, 3.3, 3.133],
    margin: [0.025, 0.055, 0.025, 0.055],
    border: { pt: 0.5, color: G_GREY_BORDER }, autoPage: false
  });

  const faqs = [
    {
      q: 'Q1: How should an enterprise decide between Pattern A, Pattern C, and Pattern B?',
      a: 'Apply our 2-Question Selector: start all commercial/PLG accounts on Pattern A (1.0x COGS, 89.1% cache); route Enterprise accounts needing CMEK/private tools via Pattern C (/28 PSC, 0ms CAS cutover); reserve Pattern B for strict statutory/defense silos (q_silo=1).'
    },
    {
      q: 'Q2: Does adopting Pattern C or B require maintaining multiple branches of agent code?',
      a: 'No. Every deployment runs the identical 80% 5-Hop ADK codebase (core-cymbal-agent/). Switching TENANT_ISOLATION_MODE between POOLED, HYBRID_PSC, and SOVEREIGN_SILO changes only Terraform isolation modules and runtime bindings.'
    },
    {
      q: 'Q3: How are dynamic tenant prompt customizations updated without redeploying containers?',
      a: 'Private Tenant Agents load SHA-256 attested playbooks directly from gs://<tenant-skills-bucket>/v2/skill.yaml, caching them under cache:{tenant}:skill:* in Valkey and recording the exact skill_sha256 in every BigQuery OTel trace.'
    },
    {
      q: 'Q4: How do compensating GAP-01..05 hooks retire cleanly as Vertex Agent Engine GA evolves?',
      a: 'Each gap shim (ARD ACLs, 3LO vaults, CMEK cache sync, sub-tenant quotas, Vertex tenant billing) is wrapped behind an explicit CYMBAL_NATIVE_* feature flag—enabling zero-rewrite phased cutover onto managed GCP platform primitives.'
    }
  ];

  faqs.forEach((f, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const fx = 0.6 + col * 6.2;
    const fy = 4.00 + row * 1.46;

    slide.addShape(pptx.ShapeType.roundRect, { x: fx, y: fy, w: 5.93, h: 1.34, rectRadius: 0.06, fill: { color: WHITE }, line: { color: G_BLUE_DARK, width: 1 } });
    slide.addShape(pptx.ShapeType.rect, { x: fx, y: fy, w: 5.93, h: 0.36, fill: { color: G_BLUE_LIGHT } });
    slide.addText(f.q, { x: fx + 0.12, y: fy, w: 5.69, h: 0.36, fontSize: 8.5, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE, valign: 'middle' });
    slide.addText(f.a, { x: fx + 0.12, y: fy + 0.42, w: 5.69, h: 0.92, fontSize: 8.0, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.18 });
  });
}

// ============================================================================
// MAIN COMPILATION ENTRYPOINT
// ============================================================================
async function compileDeck() {
  console.log(`Compiling 100% native DrawingML editable ${TOTAL_SLIDES}-slide executive presentation for Agentic Triad (WS5)...`);

  // ACT I: PROBLEM & COMPLIANCE
  _slideCounter = 1;
  buildSlide01();
  buildSlide02_Agenda();
  buildSlide03_Dilemma();
  buildSlide04_ComplianceMatrix();

  // ACT II: ARCHITECTURAL TOPOLOGIES & BLUEPRINTS
  buildSlide05_Act2Breaker();
  buildSlide06_PatternBPrinciples();
  buildSlide07_L1Logical();
  await buildSlide08_Figure1();
  if (FULL_34_MODE) await buildSlide09_PatternAPooled();
  await buildSlide10_PatternBSilos();
  if (FULL_34_MODE) await buildSlide11_PatternCHybrid();

  // ACT III: 5-HOP ZERO-TRUST CONTROL PLANE & CRYPTO-SHREDDING
  buildSlide12_Act3Breaker();
  buildSlide13_L3Process();
  buildSlide14_L4Wire();
  buildSlide15_Hops1And2();
  buildSlide16_Hop3Compute();
  buildSlide17_Hop4CryptoShredding();
  buildSlide18_Hop5AlloyDb();
  buildSlide19_AirGappedGemma();
  buildSlide20_ArchitecturalCaveats();

  // ACT IV: EMPIRICAL MULTI-CLOUD VERIFICATION (10 SAAS PROOFS)
  buildSlide21_Act4Breaker();
  if (FULL_34_MODE) buildSlide22_ThoughtSpot();
  if (FULL_34_MODE) buildSlide23_Databricks();
  if (FULL_34_MODE) buildSlide24_Sigma();
  buildSlide25_Datadog();
  if (FULL_34_MODE) buildSlide26_CrowdStrikeOkta();
  if (FULL_34_MODE) buildSlide27_Snowflake();
  if (FULL_34_MODE) buildSlide28_ServiceNow();
  if (FULL_34_MODE) buildSlide29_VeevaVault();
  if (FULL_34_MODE) buildSlide30_SalesforceJira();
  buildSlide31_Workday();

  // ACT V: ENTERPRISE GOVERNANCE & ROADMAP
  buildSlide32_Act5Breaker();
  buildSlide33_Roadmap();
  buildSlide34_ScorecardAndFaq();

  console.log(`Writing presentation to ${OUTPUT_PPTX}...`);
  await pptx.writeFile({ fileName: OUTPUT_PPTX });
  console.log(`✅ Successfully compiled ${OUTPUT_PPTX} (${TOTAL_SLIDES} slides [Full 5-Act Narrative with Storyline, Act Breakers, L1-L5 DrawingML, Architectural Caveats, 10 SaaS Proofs, Scorecard & CISO FAQ Guide])`);

  console.log('Post-processing arrowheads and connectors for Google Slides compatibility...');
  postProcessPptxArrowheadsForGoogleSlides(OUTPUT_PPTX);
  console.log('✅ Post-processed arrowheads and connectors for Google Slides compatibility');
}

compileDeck().catch((err) => {
  console.error('Fatal compilation error:', err);
  process.exit(1);
});
