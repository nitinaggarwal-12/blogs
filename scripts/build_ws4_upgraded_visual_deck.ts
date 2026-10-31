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
const OUTPUT_PPTX = path.join(ROOT_DIR, 'slides', 'ws4-12slide-visual-deck.pptx');

const pptx = newDeck('Multi-Tenant Agentic AI on Google Cloud: Pattern C Dynamic Hybrid & Live Tier Upgrades');

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

const TOTAL_SLIDES = 34;

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
    x: 3.3, y: 0.28, w: 9.3, h: 0.45,
    fontSize: 17, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, valign: 'middle'
  });

  // Top Accent Line
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 0.75, w: 12.133, h: 0.02, fill: { color: G_GREY_BORDER }
  });

  // Footer
  slide.addText('Google Cloud Architecture Center  •  Workstream 4 of 5  •  Pattern C Dynamic Hybrid (100% Native DrawingML)', {
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

  // Dark Navy Left Anchor Panel (Hero Strip)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 0.6, w: 4.8, h: 6.3, rectRadius: 0.08,
    fill: { color: G_NAVY }, line: { color: cfg.actColor, width: 2 }
  });

  // Category Tag Pill
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.95, y: 0.95, w: 2.4, h: 0.34, rectRadius: 0.06,
    fill: { color: cfg.actTint }, line: { color: cfg.actColor, width: 1 }
  });
  slide.addText(cfg.actTag, {
    x: 0.95, y: 0.95, w: 2.4, h: 0.34,
    fontSize: 9.5, bold: true, color: cfg.actColor, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
  });

  // Act Number & Title
  slide.addText(cfg.actNumber, {
    x: 0.95, y: 1.5, w: 4.1, h: 0.7,
    fontSize: 32, bold: true, color: WHITE, fontFace: FONT_TITLE
  });
  slide.addText(cfg.actTitle, {
    x: 0.95, y: 2.25, w: 4.1, h: 0.95,
    fontSize: 20, bold: true, color: WHITE, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15
  });

  // Divider Line
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.95, y: 3.3, w: 4.1, h: 0.02, fill: { color: '334155' }
  });

  // Core Question Callout
  slide.addText('CORE ARCHITECTURAL QUESTION', {
    x: 0.95, y: 3.5, w: 4.1, h: 0.25,
    fontSize: 8.5, bold: true, color: cfg.actColor, fontFace: FONT_TITLE
  });
  slide.addText(`"${cfg.coreQuestion}"`, {
    x: 0.95, y: 3.8, w: 4.1, h: 1.1,
    fontSize: 12, italic: true, color: WHITE, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
  });

  // Thesis Box
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.95, y: 5.05, w: 4.1, h: 1.55, rectRadius: 0.06,
    fill: { color: '1E293B' }, line: { color: '475569', width: 0.75 }
  });
  slide.addText('ARCHITECTURAL THESIS', {
    x: 1.1, y: 5.15, w: 3.8, h: 0.22,
    fontSize: 8, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE
  });
  slide.addText(cfg.thesis, {
    x: 1.1, y: 5.4, w: 3.8, h: 1.1,
    fontSize: 9.2, color: 'E2E8F0', fontFace: FONT_BODY, lineSpacingMultiple: 1.2
  });

  // Right Side: Milestones & Agenda Cards
  slide.addText('ACT ROADMAP & DELIVERABLES', {
    x: 5.7, y: 0.65, w: 7.0, h: 0.3,
    fontSize: 10, bold: true, color: TEXT_MUTED, fontFace: FONT_TITLE
  });
  slide.addText(cfg.actSubtitle, {
    x: 5.7, y: 0.95, w: 7.0, h: 0.45,
    fontSize: 16, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
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
  slide.addText(`Google Cloud Architecture Center  •  Workstream 3 of 5  •  Pattern C Dynamic Hybrid`, {
    x: 0.6, y: 7.1, w: 10.5, h: 0.3, fontSize: 8.5, color: TEXT_MUTED, fontFace: FONT_BODY
  });
  slide.addText(`${cfg.slideNum} / ${TOTAL_SLIDES}`, {
    x: 11.5, y: 7.1, w: 1.233, h: 0.3, fontSize: 8.5, bold: true, color: G_BLUE, fontFace: FONT_TITLE, align: 'right'
  });
}

// Reusable Before / After SaaS Proof Slide Builder
interface SaasProofConfig {
  slideNum: number;
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

  // Image (Exact 1.600 aspect ratio)
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
  slide.addText('PATTERN B SOVEREIGN SILO & VPC-SC PERIMETER GUARANTEE', {
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
  slide.addText('Pattern C: Dynamic Hybrid for Regulated Workloads', {
    x: 0.95, y: 2.7, w: 4.3, h: 0.8,
    fontSize: 18, bold: true, color: '93C5FD', fontFace: FONT_TITLE, lineSpacingMultiple: 1.15
  });

  // Subtitle
  slide.addText(
    'Zero-trust physical project isolation, VPC Service Controls perimeters, customer-managed Cloud KMS CMEK crypto-shredding, and air-gapped Gemma 3 on GKE for banking, healthcare, and public sector compliance.',
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
  slide.addText('• Workstream 3 of 5 • Pattern C: Dedicated Dynamic Hybrid\n• 100% Native DrawingML Vectors • Zero Flattened Images\n• Verified Standards: OCC Bulletin 2013-29, EU DORA, HIPAA, FedRAMP High\n• Author: Google Cloud FDE & AI Platform Architecture Team', {
    x: 1.1, y: 5.5, w: 4.0, h: 1.0,
    fontSize: 8.5, color: 'E2E8F0', fontFace: FONT_BODY, lineSpacingMultiple: 1.2
  });

  // Right Side: 3 Hero Architectural Pillar Cards
  const heroCards = [
    {
      title: 'Pillar 1: Dedicated Per-Tenant Projects & VPC-SC',
      subtitle: 'Physical compute & storage boundaries eliminating co-tenancy risk',
      desc: 'Each regulated customer operates inside an isolated Google Cloud project (cymbal-finvault-silo-prod) wrapped in a dedicated VPC Service Controls perimeter and IAM Principal Access Boundary (PAB) that prevents cross-tenant data exfiltration.',
      tag: 'PHYSICAL ISOLATION',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT
    },
    {
      title: 'Pillar 2: Customer-Held CMEK & Crypto-Shredding',
      subtitle: 'Instant HTTP 423 Locked kill-switch controlled by tenant KMS key',
      desc: 'All tenant data at rest and in memory is encrypted using customer-managed encryption keys (Cloud KMS CMEK / Cloud EKM). Revoking or disabling the key immediately renders all agent state, vector indexes, and databases inaccessible in <3 seconds.',
      tag: 'INSTANT KILL-SWITCH',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT
    },
    {
      title: 'Pillar 3: Air-Gapped Gemma 3 on Private GKE',
      subtitle: 'Confidential Computing VMs with zero external egress',
      desc: 'For defense and strict sovereignty workloads, open-weight Gemma 3 (27B) serves reasoning turns from a private, air-gapped GKE cluster using AMD SEV-SNP Confidential VMs, ensuring neither cloud operators nor third parties can inspect memory.',
      tag: 'AIR-GAPPED SOVEREIGNTY',
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
  slide.addText('Google Cloud Architecture Center  •  Workstream 4 of 5  •  Pattern C Dynamic Hybrid (100% Native DrawingML)', {
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
  addHeader(slide, 'AGENDA & ROADMAP', 'Executive 5-Act Architecture Roadmap: Dynamic Hybrid Routing & Zero-Downtime Migration', 2);

  slide.addText('Structured 5-Act architectural roadmap taking dynamic hybrid multi-tenant agent systems from shared pool to dedicated PSC spokes.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const acts = [
    {
      act: 'ACT I',
      title: 'The Regulatory Imperative & Dilemma',
      slides: 'Slides 03–04',
      c4: 'L1 Context',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      desc: 'Why OCC banking, EU DORA, and HIPAA legally prohibit shared compute pools, shared databases, and shared prompt caches.'
    },
    {
      act: 'ACT II',
      title: 'Dynamic Hybrid Topologies & Blueprints',
      slides: 'Slides 05–11',
      c4: 'L2 Containers',
      color: G_BLUE,
      tint: G_BLUE_LIGHT,
      desc: 'Dual-tenant reference blueprints, multi-project VPC-SC perimeters, customer CMEK key federation, and 1-click Terraform graphs.'
    },
    {
      act: 'ACT III',
      title: '5-Hop Control Plane & Crypto-Shredding',
      slides: 'Slides 12–20',
      c4: 'L3/L4 Logic & Wire',
      color: G_AMBER_DEEP,
      tint: G_YELLOW_LIGHT,
      desc: '5-Hop pipeline adapted for physical silos, customer CMEK revocation kill-switches (<3s SLA), and air-gapped Gemma 3 on GKE.'
    },
    {
      act: 'ACT IV',
      title: 'Empirical Multi-Cloud SaaS Verification',
      slides: 'Slides 21–31',
      c4: 'L5 Runtime Proofs',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      desc: '10 live Before-vs-After Retina UI screenshot pairs verifying that sovereign VPC-SC perimeters isolate all 3LO SaaS actions.'
    },
    {
      act: 'ACT V',
      title: 'Implementation Roadmap & CISO Guide',
      slides: 'Slides 32–34',
      c4: 'Governance & GA',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      desc: '10-week phased migration roadmap, multi-cloud isolation scorecard, and direct answers to four core CISO review board questions.'
    }
  ];

  acts.forEach((a, idx) => {
    const ax = 0.6 + idx * 2.45;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: ax, y: 1.35, w: 2.32, h: 5.5, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: a.color, width: 1.5 }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: ax, y: 1.35, w: 2.32, h: 0.85, fill: { color: a.tint }
    });
    slide.addText(a.act, {
      x: ax + 0.12, y: 1.42, w: 2.08, h: 0.25, fontSize: 8.5, bold: true, color: a.color, fontFace: FONT_TITLE
    });
    slide.addText(a.title, {
      x: ax + 0.12, y: 1.68, w: 2.08, h: 0.45, fontSize: 10.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: ax + 0.12, y: 2.35, w: 2.08, h: 0.4, rectRadius: 0.04,
      fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
    });
    slide.addText(`${a.slides}  •  ${a.c4}`, {
      x: ax + 0.12, y: 2.35, w: 2.08, h: 0.4,
      fontSize: 8.5, bold: true, color: TEXT_MUTED, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
    });

    slide.addText(a.desc, {
      x: ax + 0.12, y: 2.9, w: 2.08, h: 3.7,
      fontSize: 9.2, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.25
    });
  });
}

// ============================================================================
// SLIDE 03: The Regulated SaaS Dilemma (Why Pooled / Shared Compute is Prohibited)
// ============================================================================
function buildSlide03_Dilemma() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT I • THE HYBRID DILEMMA', 'The Dynamic Hybrid SaaS Dilemma: Why Static Multi-Tenancy Fails Growth-Stage SaaS', 3);

  slide.addText('B2B SaaS architectures face an impossible choice: lock tenants into high-density shared pools or incur high per-tenant dedicated infrastructure overhead.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const cards = [
    {
      title: '1. Strict Legal & Regulatory Directives',
      subtitle: 'OCC Bulletin 2013-29, EU DORA, HIPAA Security Rule',
      tag: 'LEGAL MANDATE',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      items: [
        'OCC Bulletin 2013-29 mandates that financial institutions ensure strict physical separation of core banking records and processing logic.',
        'EU DORA (Digital Operational Resilience Act) requires continuous operational control, local data residency, and audited exit strategies.',
        'HIPAA § 164.312 requires covered entities to implement hardware/logical access controls that prevent ePHI commingling across customers.',
        'FedRAMP High / DoD IL5 require dedicated physical environments with customer-controlled cryptographic hardware root-of-trust.'
      ]
    },
    {
      title: '2. The Shared Co-Tenancy Threat Model',
      subtitle: 'Microarchitectural side-channels & connection pool leakage',
      tag: 'SHARED RISK VECTOR',
      color: G_AMBER_DEEP,
      tint: G_YELLOW_LIGHT,
      items: [
        'Row-Level Security (RLS) relies on software application predicates; a single SQL injection or missing filter exposes all tenants.',
        'Hypervisor & microarchitectural side-channels (Meltdown/Spectre/Downfall) create theoretical cross-tenant memory snooping risks on shared CPUs.',
        'Shared LLM prompt prefix caches (ContextCacheConfig) can leak proprietary schema descriptors or system instructions across tenants.',
        'Shared database connection pools risk session variable contamination (SET LOCAL tenant_id bleed) under high concurrency.'
      ]
    },
    {
      title: '3. The Pattern C Dynamic Hybrid Solution',
      subtitle: 'Dedicated Google Cloud projects & customer CMEK HSM keys',
      tag: 'SOVEREIGN ARCHITECTURE',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      items: [
        'Physical multi-project architecture: Each corporate customer (FinVault) receives an independent Google Cloud project.',
        'Zero shared compute: Dedicated Cloud Run instances, dedicated AlloyDB clusters, and dedicated VPC subnets.',
        'Customer-controlled Cloud KMS CMEK: The tenant controls the master encryption key; revoking the key disables all access in <3s.',
        'VPC Service Controls (VPC-SC): Hardware-enforced perimeters prevent data exfiltration even if service account credentials leak.'
      ]
    },
    {
      title: '4. The Architectural Trade-Off',
      subtitle: 'Higher unit cost in exchange for absolute compliance & zero co-tenancy',
      tag: 'FINOPS & TRADE-OFF',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      items: [
        'Cost Profile: High baseline cost per tenant (~$1,200/mo minimum for dedicated AlloyDB, Cloud Run, and KMS) vs. $12/mo pooled.',
        'Zero Cache Sharing: Each tenant pays 100% uncached input token costs because prompt caches cannot cross project boundaries.',
        'Operational Surface: Managing 100+ separate Google Cloud projects requires mature Terraform / IaC automation and centralized logging.',
        'Unmatched Trust: Unlocks Tier-1 enterprise banks and government agencies that legally cannot adopt shared pooled SaaS.'
      ]
    }
  ];

  cards.forEach((c, idx) => {
    const cx = 0.6 + idx * 3.08;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: 1.35, w: 2.92, h: 5.5, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: c.color, width: 1.5 }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: cx, y: 1.35, w: 2.92, h: 0.6, fill: { color: c.tint }
    });
    slide.addText(c.tag, {
      x: cx + 0.15, y: 1.38, w: 2.62, h: 0.22, fontSize: 8, bold: true, color: c.color, fontFace: FONT_TITLE
    });
    slide.addText(c.title, {
      x: cx + 0.15, y: 2.05, w: 2.62, h: 0.5, fontSize: 11, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15
    });
    slide.addText(c.subtitle, {
      x: cx + 0.15, y: 2.58, w: 2.62, h: 0.35, fontSize: 8.8, italic: true, color: TEXT_MUTED, fontFace: FONT_BODY
    });

    c.items.forEach((item, iidx) => {
      const iy = 3.05 + iidx * 0.95;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: cx + 0.12, y: iy, w: 2.68, h: 0.88, rectRadius: 0.04,
        fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
      });
      slide.addText(`• ${item}`, {
        x: cx + 0.18, y: iy + 0.06, w: 2.56, h: 0.76,
        fontSize: 8.0, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
      });
    });
  });
}

// ============================================================================
// SLIDE 04: Regulatory Compliance Matrix & Threat Landscape
// ============================================================================
function buildSlide04_ComplianceMatrix() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT I • HYBRID INVARIANTS', '4-Point Dynamic Routing & Live Migration Invariants: Zero-Turn-Loss Guarantees', 4);

  slide.addText('The mathematical and architectural invariants required to migrate a live enterprise tenant from pooled to dedicated spoke without session loss.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const frameworks = [
    {
      reg: 'OCC / FDIC / GLBA',
      sector: 'Financial Services & Banking',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      mandate: 'Mandates strict physical separation of accounting ledgers, transaction records, and autonomous transaction execution engines.',
      patternBProof: 'FinVault project (cymbal-finvault-silo-prod) runs isolated AlloyDB cluster with 0 shared compute and hardware-bound CMEK keys.',
      auditArtifact: 'OCC Third-Party Risk Management Audit Report + Automated Cloud Logging VPC-SC Ingress Receipts.'
    },
    {
      reg: 'EU DORA & GDPR',
      sector: 'European Digital Resilience',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      mandate: 'Requires sovereign cloud residency, zero extraterritorial data transfers, and instantaneous customer-controlled data shredding.',
      patternBProof: 'All services pinned to europe-west3 (Frankfurt); Cloud KMS CMEK key hosted on customer-owned HSM with instant revocation.',
      auditArtifact: 'DORA Article 28 Compliance Attestation + Instant Crypto-Shredding Verification Log (<3s).'
    },
    {
      reg: 'HIPAA & HITECH',
      sector: 'Healthcare & Life Sciences',
      color: G_AMBER_DEEP,
      tint: G_YELLOW_LIGHT,
      mandate: 'Prohibits commingling Protected Health Information (ePHI) in shared database tables or multi-tenant cache partitions.',
      patternBProof: 'Dedicated healthcare silo with Cloud SDP pre-inference redaction, BAA execution, and dedicated Vertex AI endpoint.',
      auditArtifact: 'HIPAA Security Rule Audit Log showing 0 unencrypted ePHI transmissions and isolated patient databases.'
    },
    {
      reg: 'FedRAMP High / IL5',
      sector: 'Public Sector & Defense',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      mandate: 'Demands air-gapped model execution, hardware root-of-trust, zero internet egress, and strict FIPS 140-3 cryptography.',
      patternBProof: 'Air-gapped Gemma 3 (27B) running on private GKE with AMD SEV-SNP Confidential VMs inside a closed VPC-SC perimeter.',
      auditArtifact: 'FedRAMP High Continuous Monitoring Plan + Air-Gapped Network Flow Receipt (0 egress packets).'
    }
  ];

  frameworks.forEach((f, idx) => {
    const fx = 0.6 + idx * 3.08;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: fx, y: 1.35, w: 2.92, h: 5.5, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: f.color, width: 1.5 }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: fx, y: 1.35, w: 2.92, h: 0.75, fill: { color: f.tint }
    });
    slide.addText(f.reg, {
      x: fx + 0.15, y: 1.42, w: 2.62, h: 0.3, fontSize: 13, bold: true, color: f.color, fontFace: FONT_TITLE
    });
    slide.addText(f.sector, {
      x: fx + 0.15, y: 1.74, w: 2.62, h: 0.25, fontSize: 8.5, italic: true, color: TEXT_MUTED, fontFace: FONT_BODY
    });

    // Mandate Box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: fx + 0.15, y: 2.25, w: 2.62, h: 1.4, rectRadius: 0.05,
      fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
    });
    slide.addText('STATUTORY ISOLATION MANDATE', {
      x: fx + 0.22, y: 2.32, w: 2.48, h: 0.2, fontSize: 7.8, bold: true, color: G_RED_DEEP, fontFace: FONT_TITLE
    });
    slide.addText(f.mandate, {
      x: fx + 0.22, y: 2.55, w: 2.48, h: 1.0, fontSize: 8.2, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
    });

    // Pattern C Proof Box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: fx + 0.15, y: 3.8, w: 2.62, h: 1.4, rectRadius: 0.05,
      fill: { color: 'F0FDF4' }, line: { color: G_GREEN_DEEP, width: 0.75 }
    });
    slide.addText('PATTERN B ARCHITECTURAL ENFORCEMENT', {
      x: fx + 0.22, y: 3.87, w: 2.48, h: 0.2, fontSize: 7.8, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE
    });
    slide.addText(f.patternBProof, {
      x: fx + 0.22, y: 4.1, w: 2.48, h: 1.0, fontSize: 8.2, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
    });

    // Audit Artifact Box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: fx + 0.15, y: 5.35, w: 2.62, h: 1.35, rectRadius: 0.05,
      fill: { color: G_BLUE_LIGHT }, line: { color: G_BLUE_DARK, width: 0.75 }
    });
    slide.addText('AUDIT ARTIFACT & VERIFICATION PROOF', {
      x: fx + 0.22, y: 5.42, w: 2.48, h: 0.2, fontSize: 7.8, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE
    });
    slide.addText(f.auditArtifact, {
      x: fx + 0.22, y: 5.65, w: 2.48, h: 0.95, fontSize: 8.2, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
    });
  });
}

// ============================================================================
// SLIDE 05: Transition Breaker — Act II: Dynamic Hybrid Topologies & Blueprints
// ============================================================================
function buildSlide05_Act2Breaker() {
  buildActBreakerSlide({
    slideNum: 5,
    actTag: 'ACT II • SOVEREIGN BLUEPRINTS',
    actNumber: 'ACT II',
    actTitle: 'Dynamic Hybrid Topologies & CMEK Blueprints',
    actSubtitle: 'Physical Multi-Project Architecture, VPC-SC Perimeters, and Automated Terraform Resource Graphs',
    actColor: G_BLUE_DARK,
    actTint: G_BLUE_LIGHT,
    coreQuestion: 'How do we construct physical project perimeters and customer cryptographic kill-switches without rewriting the agentic core?',
    thesis: 'Pattern C encapsulates the 80% reusable 5-Hop agent core inside dedicated Google Cloud projects protected by VPC Service Controls perimeters, IAM Principal Access Boundaries, and customer-held Cloud KMS CMEK keys.',
    milestones: [
      {
        num: '01',
        title: 'C4 L1 System Context & Ingress Routing',
        desc: 'Global SaaS ingress directing regulated tenants into dedicated project perimeters via IAM STS token exchange.',
        deliverable: 'L1 System Context Diagram'
      },
      {
        num: '02',
        title: 'Figure 1: Dynamic Hybrid Reference Architecture',
        desc: 'Official Architecture Center reference blueprint with dual isolated tenant silos (FinVault and RetailStream).',
        deliverable: 'Editable DrawingML Blueprint'
      },
      {
        num: '03',
        title: 'Figure 2: Multi-Project & Customer CMEK Topology',
        desc: 'Customer Key Custodian architecture binding Cloud KMS HSM keys to Vertex AI and AlloyDB instances.',
        deliverable: 'CMEK Key Ring Topology'
      },
      {
        num: '04',
        title: 'Figure 3: 1-Click Terraform Silo Automation',
        desc: 'Complete modular IaC blueprint standing up dedicated projects, VPC-SC perimeters, and IAM bindings in <15m.',
        deliverable: 'Terraform Resource Graph'
      }
    ]
  });
}

// ============================================================================
// SLIDE 06: Pattern C Architectural Principles & 80/20 Sovereign Rule
// ============================================================================
function buildSlide06_PatternBPrinciples() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT II • ARCHITECTURAL PRINCIPLES', 'Pattern C Core Principles: Dynamic Routing & The 80% Reusable Context Chain', 6);

  slide.addText('How dynamic hybrid architectures preserve the 80% reusable cryptographic context chain across both shared pools and PSC spokes.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  // Top Card: The 80/20 Sovereign Law
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 1.35, w: 12.133, h: 1.6, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_BLUE_DARK, width: 1.5 }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 1.35, w: 12.133, h: 0.38, fill: { color: G_BLUE_LIGHT }
  });
  slide.addText('THE 80/20 SOVEREIGN REUSABILITY LAW', {
    x: 0.8, y: 1.35, w: 6.0, h: 0.38, fontSize: 8.8, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE, valign: 'middle'
  });
  slide.addText('You do NOT write a separate AI agent for sovereign tenants. 80% of the codebase remains identical to Pattern A:', {
    x: 0.8, y: 1.8, w: 11.7, h: 0.3, fontSize: 9.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
  });
  slide.addText('• 80% REUSABLE CORE: The 5-Hop cryptographic pipeline, Model Armor guardrails, tool dispatch interceptors, and conversational memory schemas.\n• 20% SILO DELTA: Dedicated GCP project perimeter, VPC-SC ingress/egress rules, customer-held Cloud KMS CMEK key rings, and dedicated AlloyDB/GKE clusters.', {
    x: 0.8, y: 2.12, w: 11.7, h: 0.7, fontSize: 8.8, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.25
  });

  // Bottom 3 Cards: The 3 Sovereign Guarantees
  const pillars = [
    {
      title: '1. Physical Project Boundary',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      points: [
        'Dedicated Google Cloud Project: Every regulated customer operates within a dedicated project boundary.',
        'Dedicated VPC & Subnets: Private IP space with zero cross-tenant peering or shared routing tables.',
        'Zero Co-Tenancy: Cloud Run v2 and AlloyDB instances run exclusively for the tenant service account.',
        'IAM Principal Access Boundary (PAB): Enforces strict organization-level blast radius containment.'
      ]
    },
    {
      title: '2. Customer-Held CMEK Kill-Switch',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      points: [
        'Cloud KMS / Cloud EKM: Encryption keys reside in customer HSM or on-premises key manager.',
        'Cryptographic Erasure (Crypto-Shredding): Disabling the key revokes all access to databases and indexes.',
        '<3s Revocation SLA: Next agent turn throws HTTP 423 Locked immediately upon key disablement.',
        'Zero Data in Plaintext: Backups, WAL logs, and vector embeddings are encrypted at rest with tenant CMEK.'
      ]
    },
    {
      title: '3. Air-Gapped Gemma 3 on GKE',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      points: [
        'Private GKE Cluster: Autonomous agent reasoning served locally without external internet connectivity.',
        'Confidential VMs (SEV-SNP): Memory encryption prevents cloud hypervisor or host-level snooping.',
        'Open-Weight Gemma 3 (27B): Enterprise customer retains complete control over model weights and updates.',
        'Zero Telemetry Egress: Logging stays inside tenant project; 0 telemetry sent to public SaaS endpoints.'
      ]
    }
  ];

  pillars.forEach((p, idx) => {
    const px = 0.6 + idx * 4.12;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: px, y: 3.15, w: 3.9, h: 3.7, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: p.color, width: 1.5 }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: px, y: 3.15, w: 3.9, h: 0.5, fill: { color: p.tint }
    });
    slide.addText(p.title, {
      x: px + 0.15, y: 3.15, w: 3.6, h: 0.5, fontSize: 11, bold: true, color: p.color, fontFace: FONT_TITLE, valign: 'middle'
    });

    p.points.forEach((point, pidx) => {
      const pty = 3.8 + pidx * 0.72;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: px + 0.12, y: pty, w: 3.66, h: 0.65, rectRadius: 0.04,
        fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
      });
      slide.addText(`• ${point}`, {
        x: px + 0.18, y: pty + 0.04, w: 3.54, h: 0.57,
        fontSize: 8.0, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
      });
    });
  });
}

// ============================================================================
// SLIDE 07: L1 Logical Security Taxonomy for Pattern C
// ============================================================================
function buildSlide07_L1Logical() {
  addArchitectureZoneTopologySlide(pptx, DECKS[3]);
}

// ============================================================================
// SLIDE 08: Figure 1 Decompiled DrawingML (Dynamic Hybrid Architecture)
// ============================================================================
async function buildSlide08_Figure1() {
  const xmlPath = path.join(ROOT_DIR, 'diagrams', 'ws4-pattern-c-hybrid-psc-and-migration.drawio');
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  await appendGoogleBrandedDiagramSlides(
    pptx,
    xmlContent,
    'WS4',
    'WS4 • ACT II: Figure 1',
    'Pattern C: Dynamic Hybrid Hub-and-Spoke Reference Architecture & Live Tier Migration',
    'ws4-pattern-c-hybrid-psc-and-migration',
    undefined,
    [
      'Official Google Cloud Architecture Center Pattern C dynamic hybrid reference blueprint.',
      'Dual dedicated projects (cymbal-finvault-silo-prod and cymbal-retailstream-silo-prod) with 0 shared compute.',
      'Ingress through dedicated Cloud Armor security policies and IAM STS federated tokens.',
      'Customer-held Cloud KMS CMEK key encrypts all Vertex AI agent state, AlloyDB databases, and GCS buckets.',
      'Optional air-gapped Gemma 3 (27B) inference running on private GKE with Confidential Computing.'
    ],
    'diagrams/ws4-pattern-c-hybrid-psc-and-migration.drawio',
    true
  );
}

// ============================================================================
// SLIDE 09: Figure 2 Decompiled DrawingML (Multi-Project Silo & CMEK Setup)
// ============================================================================
async function buildSlide09_Figure2() {
  const xmlPath = path.join(ROOT_DIR, 'diagrams', 'ws4-hub-and-spoke-demo-env-setup-topology.drawio');
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  await appendGoogleBrandedDiagramSlides(
    pptx,
    xmlContent,
    'WS4',
    'WS4 • ACT II: Figure 2',
    'Pattern C Cross-Project Private Service Connect (PSC) Network Topology & Service Attachments',
    'ws4-hub-and-spoke-demo-env-setup-topology',
    undefined,
    [
      'End-to-end multi-project provisioning and customer KMS key-ring federation.',
      'Tenant Key Custodian manages the HSM Cloud KMS key in an independent billing project or on-prem HSM via Cloud EKM.',
      'Service agents granted roles/cloudkms.cryptoKeyEncrypterDecrypter for automated transparent decryption.',
      'Instant revocation simulation proves that disabling key version terminates active agent execution in <3s.',
      'Secret Manager stores tenant credentials with per-tenant CMEK wrapping and zero cross-project leakage.'
    ],
    'diagrams/ws4-hub-and-spoke-demo-env-setup-topology.drawio',
    true
  );
}

// ============================================================================
// SLIDE 10: Figure 3 Decompiled DrawingML (1-Click Terraform Silo Blueprint)
// ============================================================================
async function buildSlide10_Figure3() {
  const xmlPath = path.join(ROOT_DIR, 'diagrams', 'ws4-zero-downtime-tier-upgrade-sequence.drawio');
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  await appendGoogleBrandedDiagramSlides(
    pptx,
    xmlContent,
    'WS4',
    'WS4 • ACT II: Figure 3',
    'Pattern C 3-Phase Zero-Downtime Live Tier Upgrade Sequence & State Catch-Up Pipeline',
    'ws4-zero-downtime-tier-upgrade-sequence',
    undefined,
    [
      'Modular Terraform blueprint provisioning a complete dynamic hybrid in <15 minutes.',
      'Automatically creates project, enables required APIs, and provisions VPC Service Controls perimeters.',
      'Provisions dedicated Cloud Run v2 services, dedicated AlloyDB cluster, and customer KMS key ring.',
      'Binds IAM Principal Access Boundary (PAB) policies to prevent cross-silo identity escalation.'
    ],
    'diagrams/ws4-zero-downtime-tier-upgrade-sequence.drawio',
    true
  );
}

// ============================================================================
// SLIDE 11: Physical Perimeter Topology: VPC-SC & Principal Access Boundaries (PAB)
// ============================================================================
async function buildSlide11_Figure4() {
  const xmlPath = path.join(ROOT_DIR, 'diagrams', 'ws4-terraform-hybrid-psc-blueprint-resource-graph.drawio');
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  await appendGoogleBrandedDiagramSlides(
    pptx,
    xmlContent,
    'WS4',
    'WS4 • ACT II: Figure 4',
    'Pattern C Dual-Provider Terraform Hybrid PSC Resource Graph & Automated Spoke Provisioner',
    'ws4-terraform-hybrid-psc-blueprint-resource-graph',
    undefined,
    [
      'Modular Terraform configuration provisioning central hub and dynamic enterprise spokes.',
      'Configures Google Cloud provider for PSC forwarding rules, service attachments, and IAM bindings.',
      'Provisions dedicated AlloyDB instance, Cloud KMS CMEK key ring, and VPC Service Controls perimeter.',
      'Automates zero-downtime cutover triggers and canary rollback thresholds upon SLA degradation.'
    ],
    'diagrams/ws4-terraform-hybrid-psc-blueprint-resource-graph.drawio',
    true
  );
}

function buildSlide12_Act3Breaker() {
  buildActBreakerSlide({
    slideNum: 12,
    actTag: 'ACT III • ZERO-TRUST CONTROL PLANE',
    actNumber: 'ACT III',
    actTitle: '5-Hop Control Plane, KMS CMEK & Air-Gapped GKE',
    actSubtitle: 'Cryptographic Invariant Verification, Instant Crypto-Shredding, and Confidential LLM Serving',
    actColor: G_AMBER_DEEP,
    actTint: G_YELLOW_LIGHT,
    coreQuestion: 'How does the 5-Hop pipeline enforce cryptographic guarantees across sovereign project perimeters?',
    thesis: 'Every Hop re-authenticates the signed TenantContext JWT, verifies VPC-SC perimeter boundaries, and validates CMEK key availability before executing any step.',
    milestones: [
      {
        num: '01',
        title: 'C4 L3 Sequence & L4 Wire Triptych',
        desc: 'UML process swimlane and byte-level payload transformations across dedicated perimeters.',
        deliverable: 'L3 Sequence & L4 Wire Slides'
      },
      {
        num: '02',
        title: 'Cloud KMS CMEK Crypto-Shredding Engine',
        desc: 'Instant kill-switch mechanics returning HTTP 423 Locked in <3s when customer key version is revoked.',
        deliverable: 'Kill-Switch Architecture'
      },
      {
        num: '03',
        title: 'Air-Gapped Gemma 3 on Private GKE',
        desc: 'Confidential Computing VMs (AMD SEV-SNP) providing hardware memory encryption for private reasoning.',
        deliverable: 'Air-Gapped GKE Serving Blueprint'
      },
      {
        num: '04',
        title: 'Architectural Caveats & Nuances',
        desc: 'Quota limits, cold-start latency, zero prompt cache sharing, and VPC-SC egress governance.',
        deliverable: 'Kernel-Level Invariants'
      }
    ]
  });
}

// ============================================================================
// SLIDE 13: L3 UML Process & Sequence Swimlane for Pattern C
// ============================================================================
function buildSlide13_L3Process() {
  addUmlSequenceSwimlaneSlide(
    pptx,
    DECKS[3],
    'WS4 • ACT III (L3 PROCESS): 5-Actor UML Sequence — Pattern C Dynamic Hybrid CMEK Revocation & Air-Gapped GKE'
  );
}

// ============================================================================
// SLIDE 14: L4 Wire-Level Payload Transformation Triptych
// ============================================================================
function buildSlide14_L4Wire() {
  addPayloadTransformationTriptychSlide(
    pptx,
    DECKS[3],
    'WS4 • ACT III (L4 WIRE): Pattern C Dynamic Hybrid Signed Context & KMS CMEK Payload Triptych'
  );
}

// ============================================================================
// SLIDE 15: Deep-Dive: Dedicated Hop 1 Cloud Armor & Hop 2 Sovereign Catalog Filtering
// ============================================================================
function buildSlide15_Hops1And2() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • HOPS 1 & 2', 'Hop 1 Dedicated Edge PEP & Hop 2 Sovereign Catalog Filtering', 15);

  slide.addText('How ingress requests are cryptographically authenticated and scoped to authorized agent tools before any LLM inference occurs.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  // Left Column: Hop 1
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 1.35, w: 5.95, h: 5.5, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_BLUE_DARK, width: 1.5 }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 1.35, w: 5.95, h: 0.5, fill: { color: G_BLUE_LIGHT }
  });
  slide.addText('HOP 1: DEDICATED INGRESS PEP & CLOUD ARMOR', {
    x: 0.8, y: 1.35, w: 5.5, h: 0.5, fontSize: 10, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE, valign: 'middle'
  });

  const hop1Cards = [
    {
      title: 'Dedicated Cloud Armor Policy',
      desc: 'Each sovereign project deploys a dedicated Cloud Armor security policy enforcing corporate IP allowlisting, WAF inspection, and custom header sanitization.'
    },
    {
      title: 'Anti-Spoofing Header Stripping',
      desc: 'Custom request rule strips unauthenticated X-Tenant-Id or Authorization headers from client requests before forwarding to the Cloud Run ingress gateway.'
    },
    {
      title: 'IAM STS Token Exchange',
      desc: 'The gateway exchanges tenant corporate IdP tokens (Okta/Entra ID) via GCP Security Token Service (STS) for a short-lived (5-minute) signed TenantContext JWT.'
    },
    {
      title: 'Cloud KMS ECDSA P-256 Signing',
      desc: 'The minted JWT is signed using Cloud KMS asymmetric key (projects/cymbal-finvault-silo-prod/locations/us-central1/keyRings/finvault-kr/cryptoKeys/jwt-signer).'
    }
  ];

  hop1Cards.forEach((c, idx) => {
    const cy = 2.0 + idx * 1.15;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: cy, w: 5.55, h: 1.02, rectRadius: 0.04,
      fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
    });
    slide.addText(c.title, {
      x: 0.95, y: cy + 0.08, w: 5.25, h: 0.25, fontSize: 9.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
    });
    slide.addText(c.desc, {
      x: 0.95, y: cy + 0.35, w: 5.25, h: 0.6, fontSize: 8.5, color: TEXT_MUTED, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
    });
  });

  // Right Column: Hop 2
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.78, y: 1.35, w: 5.95, h: 5.5, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_BLUE, width: 1.5 }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.78, y: 1.35, w: 5.95, h: 0.5, fill: { color: G_BLUE_LIGHT }
  });
  slide.addText('HOP 2: AGENT REGISTRY & DISCOVERY (ARD) SCOPING', {
    x: 6.98, y: 1.35, w: 5.5, h: 0.5, fontSize: 10, bold: true, color: G_BLUE, fontFace: FONT_TITLE, valign: 'middle'
  });

  const hop2Cards = [
    {
      title: 'Dedicated Catalog PDP',
      desc: 'The Agent Registry & Discovery (ARD) catalog engine resides inside the sovereign project, evaluating tools strictly for the verified tenant identity.'
    },
    {
      title: 'Zero Competitor Tool Visibility',
      desc: 'Agents in RetailStream silo cannot query or resolve tools from FinVault silo; catalog queries enforce strict project-level tenancy filters.'
    },
    {
      title: 'Private Agent Alpha Execution',
      desc: 'FinVault private agents (e.g. Agent Alpha for OCC regulatory reporting) are discoverable only within FinVault project with zero external disclosure.'
    },
    {
      title: 'Dynamic Skills Injection (GCS)',
      desc: 'Skills and prompt templates load from tenant-owned CMEK-encrypted GCS buckets (gs://cymbal-skills-finvault/), preventing prompt poisoning.'
    }
  ];

  hop2Cards.forEach((c, idx) => {
    const cy = 2.0 + idx * 1.15;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.98, y: cy, w: 5.55, h: 1.02, rectRadius: 0.04,
      fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
    });
    slide.addText(c.title, {
      x: 7.13, y: cy + 0.08, w: 5.25, h: 0.25, fontSize: 9.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
    });
    slide.addText(c.desc, {
      x: 7.13, y: cy + 0.35, w: 5.25, h: 0.6, fontSize: 8.5, color: TEXT_MUTED, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
    });
  });
}

// ============================================================================
// SLIDE 16: Deep-Dive: Hop 3 Dedicated Cloud Run & Isolated Memory Bank Namespaces
// ============================================================================
function buildSlide16_Hop3Compute() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • HOP 3 COMPUTE & MEMORY', 'Hop 3 Dedicated Compute & 5-Level Memory Bank Isolation', 16);

  slide.addText('How dynamic hybrid eliminate microarchitectural co-tenancy and guarantee isolated conversational state.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  // Left Column: Dedicated Cloud Run Compute
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 1.35, w: 5.95, h: 5.5, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_BLUE_DARK, width: 1.5 }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 1.35, w: 5.95, h: 0.5, fill: { color: G_BLUE_LIGHT }
  });
  slide.addText('DEDICATED COMPUTE RUNTIME (CLOUD RUN V2 & GVISOR)', {
    x: 0.8, y: 1.35, w: 5.5, h: 0.5, fontSize: 10, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE, valign: 'middle'
  });

  const computeCards = [
    {
      title: 'Dedicated Cloud Run Services',
      desc: 'Each silo provisions dedicated Cloud Run v2 services with min-instances=1 to eliminate cold-starts during regulatory audits.'
    },
    {
      title: 'gVisor (runsc) Sandbox Boundary',
      desc: 'Guest application code runs inside a user-space kernel sandbox, preventing host system call snooping or container breakout attacks.'
    },
    {
      title: 'Zero Thread Co-Tenancy',
      desc: 'Worker threads and memory allocations serve strictly one tenant. No competitor processes ever execute on the same container instance.'
    },
    {
      title: 'Direct VPC Ingress Connector',
      desc: 'All outbound traffic routes through a Serverless VPC Access connector into the tenant private subnet with 0 public internet exposure.'
    }
  ];

  computeCards.forEach((c, idx) => {
    const cy = 2.0 + idx * 1.15;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: cy, w: 5.55, h: 1.02, rectRadius: 0.04,
      fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
    });
    slide.addText(c.title, {
      x: 0.95, y: cy + 0.08, w: 5.25, h: 0.25, fontSize: 9.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
    });
    slide.addText(c.desc, {
      x: 0.95, y: cy + 0.35, w: 5.25, h: 0.6, fontSize: 8.5, color: TEXT_MUTED, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
    });
  });

  // Right Column: 5-Level Memory Bank (L1..L5)
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.78, y: 1.35, w: 5.95, h: 5.5, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_GREEN_DEEP, width: 1.5 }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.78, y: 1.35, w: 5.95, h: 0.5, fill: { color: G_GREEN_LIGHT }
  });
  slide.addText('5-LEVEL MEMORY BANK (L1..L5) ISOLATION', {
    x: 6.98, y: 1.35, w: 5.5, h: 0.5, fontSize: 10, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE, valign: 'middle'
  });

  const memoryLevels = [
    { level: 'L1', name: 'Turn Working Memory', desc: 'Ephemeral context window scoped to active turn. Flushed immediately upon turn completion.' },
    { level: 'L2', name: 'Session Memory', desc: 'Active multi-turn conversation thread. Stored in dedicated Memorystore Valkey instance.' },
    { level: 'L3', name: 'User Profile Memory', desc: 'Per-user preferences and authorized role bindings. Encrypted under tenant CMEK in AlloyDB.' },
    { level: 'L4', name: 'Tenant Episodic Memory', desc: 'Historical incident post-mortems and runbook executions. Strictly partitioned in tenant AlloyDB.' },
    { level: 'L5', name: 'System Semantic Memory', desc: 'Pre-indexed enterprise knowledge base and compliance rules. Vector search in tenant Vertex Search.' }
  ];

  memoryLevels.forEach((m, idx) => {
    const my = 2.0 + idx * 0.94;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.98, y: my, w: 5.55, h: 0.82, rectRadius: 0.04,
      fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 7.1, y: my + 0.14, w: 0.55, h: 0.54, rectRadius: 0.04,
      fill: { color: G_GREEN_LIGHT }, line: { color: G_GREEN_DEEP, width: 1 }
    });
    slide.addText(m.level, {
      x: 7.1, y: my + 0.14, w: 0.55, h: 0.54, fontSize: 11, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
    });
    slide.addText(m.name, {
      x: 7.8, y: my + 0.08, w: 4.5, h: 0.25, fontSize: 9.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE
    });
    slide.addText(m.desc, {
      x: 7.8, y: my + 0.35, w: 4.5, h: 0.42, fontSize: 8.0, color: TEXT_MUTED, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
    });
  });
}

// ============================================================================
// SLIDE 17: Deep-Dive: Hop 4 Cloud KMS CMEK Crypto-Shredding & Instant Kill-Switch
// ============================================================================
function buildSlide17_Hop4CryptoShredding() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • HOP 4 CRYPTO-SHREDDING', 'Hop 4 Cloud KMS CMEK Crypto-Shredding & The <3s Kill-Switch Engine', 17);

  slide.addText('How customer-controlled encryption keys provide instantaneous mathematical revocation of all tenant data and agent execution.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const steps = [
    {
      num: 'STEP 1',
      title: 'Tenant KMS Key Custody',
      desc: 'Customer Key Custodian holds master key in Cloud KMS HSM or on-premises via Cloud EKM.',
      code: 'gcloud kms keys versions disable 1 \\\n  --key=finvault-cmek-hsm \\\n  --keyring=finvault-kr',
      color: G_BLUE_DARK
    },
    {
      num: 'STEP 2',
      title: 'KMS Precondition Failure',
      desc: 'On the very next agent turn, Vertex AI attempts to decrypt the Data Encryption Key (DEK).',
      code: 'STATUS: FAILED_PRECONDITION\nERROR: Key version is disabled.\nCannot decrypt tenant state.',
      color: G_AMBER_DEEP
    },
    {
      num: 'STEP 3',
      title: 'Hop 4 Interceptor Traps',
      desc: 'The Hop 4 safety interceptor catches the crypto failure before LLM model dispatch.',
      code: 'try:\n  decrypt_with_cmek(context)\nexcept KmsKeyDisabledError:\n  raise CryptoShreddedError()',
      color: G_RED_DEEP
    },
    {
      num: 'STEP 4',
      title: 'HTTP 423 Locked Output',
      desc: 'Execution terminates immediately in <3s. Zero plaintext remains in RAM or disk.',
      code: 'HTTP/1.1 423 Locked\n{\n  "error": "CRYPTO_SHREDDED",\n  "tenant_id": "finvault"\n}',
      color: G_RED_DEEP
    }
  ];

  steps.forEach((s, idx) => {
    const sx = 0.6 + idx * 3.08;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sx, y: 1.35, w: 2.92, h: 5.5, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: s.color, width: 1.5 }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: sx, y: 1.35, w: 2.92, h: 0.45, fill: { color: G_GREY_BG }
    });
    slide.addText(s.num, {
      x: sx + 0.15, y: 1.35, w: 2.62, h: 0.45, fontSize: 8.5, bold: true, color: s.color, fontFace: FONT_TITLE, valign: 'middle'
    });
    slide.addText(s.title, {
      x: sx + 0.15, y: 1.9, w: 2.62, h: 0.5, fontSize: 11, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15
    });
    slide.addText(s.desc, {
      x: sx + 0.15, y: 2.45, w: 2.62, h: 0.6, fontSize: 8.8, color: TEXT_MUTED, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
    });

    // Code Snippet Box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sx + 0.12, y: 3.2, w: 2.68, h: 3.45, rectRadius: 0.05,
      fill: { color: G_NAVY }, line: { color: '334155', width: 0.75 }
    });
    slide.addText(s.code, {
      x: sx + 0.2, y: 3.35, w: 2.52, h: 3.15,
      fontSize: 8.2, color: 'E2E8F0', fontFace: 'Consolas', lineSpacingMultiple: 1.25
    });
  });
}

// ============================================================================
// SLIDE 18: Deep-Dive: Hop 5 Dedicated AlloyDB Clusters & Physical Storage Isolation
// ============================================================================
function buildSlide18_Hop5AlloyDb() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • HOP 5 STORAGE', 'Hop 5 Dedicated AlloyDB Clusters & Physical Database Isolation', 18);

  slide.addText('How dedicated database clusters provide hardware-level physical isolation for financial ledgers and sensitive records.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const cards = [
    {
      title: 'Dedicated AlloyDB Cluster',
      tag: 'HARDWARE ISOLATION',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      desc: 'Each silo provisions an independent AlloyDB cluster (cymbal-finvault-db) in a private VPC subnet. No competitor connections or shared buffer pools exist.'
    },
    {
      title: 'Cloud KMS CMEK at Rest',
      tag: 'ENCRYPTION AT REST',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      desc: 'Cluster storage, write-ahead logs (WAL), and automated backups are encrypted using the customer Cloud KMS key with automatic rotation.'
    },
    {
      title: 'PostgreSQL Role Hardening',
      tag: 'ROLE SECURITY',
      color: G_AMBER_DEEP,
      tint: G_YELLOW_LIGHT,
      desc: 'Application connects via dedicated least-privilege service account (finvault-app@) with REVOKE ALL ON SCHEMA public and explicit table grants.'
    },
    {
      title: 'Immutable Audit Logging',
      tag: 'REGULATORY AUDIT',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      desc: 'pgaudit extension captures all DDL and DML operations. Logs stream to a CMEK-encrypted Cloud Logging bucket with 7-year retention for OCC audits.'
    }
  ];

  cards.forEach((c, idx) => {
    const cx = 0.6 + idx * 3.08;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: 1.35, w: 2.92, h: 5.5, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: c.color, width: 1.5 }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: cx, y: 1.35, w: 2.92, h: 0.5, fill: { color: c.tint }
    });
    slide.addText(c.tag, {
      x: cx + 0.15, y: 1.35, w: 2.62, h: 0.5, fontSize: 8.2, bold: true, color: c.color, fontFace: FONT_TITLE, valign: 'middle'
    });
    slide.addText(c.title, {
      x: cx + 0.15, y: 2.0, w: 2.62, h: 0.55, fontSize: 11, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15
    });
    slide.addText(c.desc, {
      x: cx + 0.15, y: 2.65, w: 2.62, h: 4.0, fontSize: 8.8, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.25
    });
  });
}

// ============================================================================
// SLIDE 19: Air-Gapped Gemma 3 (27B) Inference on Private GKE with Confidential Computing
// ============================================================================
function buildSlide19_AirGappedGemma() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • AIR-GAPPED GEMMA 3', 'Air-Gapped Gemma 3 (27B) on Private GKE with Confidential VMs', 19);

  slide.addText('Autonomous reasoning architecture for defense and strict sovereign mandates requiring zero external model API egress.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const cards = [
    {
      title: '1. Private GKE Cluster Architecture',
      subtitle: 'Zero public IP & private control plane',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      items: [
        'Private GKE cluster with private endpoint control plane in tenant VPC subnet.',
        'Zero external public IP addresses on worker nodes; all ingress routes through internal load balancer.',
        'Node pools isolated within VPC Service Controls perimeter, blocking unauthorized outbound internet access.',
        'Binary Authorization enforces that only cryptographic Google-signed container images can boot.'
      ]
    },
    {
      title: '2. Confidential Computing (AMD SEV-SNP)',
      subtitle: 'Hardware-encrypted RAM preventing host snooping',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      items: [
        'Worker nodes run on AMD SEV-SNP Confidential VMs with inline hardware memory encryption.',
        'Neither cloud operators, host hypervisors, nor adjacent containers can inspect LLM memory in RAM.',
        'Hardware root-of-trust attestation verifies that the kernel and firmware are untampered before loading weights.',
        'Protects proprietary customer prompt data and confidential banking calculations during live inference.'
      ]
    },
    {
      title: '3. vLLM High-Throughput Serving Engine',
      subtitle: 'Optimized inference with sub-35ms TTFT',
      color: G_AMBER_DEEP,
      tint: G_YELLOW_LIGHT,
      items: [
        'Open-weight Gemma 3 (27B) served via vLLM with PagedAttention and dynamic continuous batching.',
        'Sub-35ms time-to-first-token (TTFT) and >85 tokens/second generation throughput on NVIDIA L4 GPUs.',
        'OpenAI-compatible /v1/chat/completions endpoint binds seamlessly into the standard 5-Hop agent core.',
        'Local tensor parallelism (TP=2) enables full-precision bfloat16 inference with zero accuracy loss.'
      ]
    },
    {
      title: '4. Zero-Egress Operational Model',
      subtitle: 'Self-contained air-gapped sovereign envelope',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      items: [
        'Zero model weight downloads at runtime: Container images pre-package Gemma 3 weights via Artifact Registry.',
        'Zero telemetry egress: Model logs and token metrics stay inside the tenant Cloud Logging project.',
        'No external API dependencies: Autonomous reasoning executes even during complete public cloud WAN outages.',
        'Fully compliant with US DoD IL5/IL6, NATO Secret, and German BSI IT-Grundschutz sovereignty standards.'
      ]
    }
  ];

  cards.forEach((c, idx) => {
    const cx = 0.6 + idx * 3.08;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: 1.35, w: 2.92, h: 5.5, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: c.color, width: 1.5 }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: cx, y: 1.35, w: 2.92, h: 0.6, fill: { color: c.tint }
    });
    slide.addText(c.title, {
      x: cx + 0.15, y: 1.42, w: 2.62, h: 0.45, fontSize: 10.5, bold: true, color: c.color, fontFace: FONT_TITLE
    });
    slide.addText(c.subtitle, {
      x: cx + 0.15, y: 2.05, w: 2.62, h: 0.35, fontSize: 8.5, italic: true, color: TEXT_MUTED, fontFace: FONT_BODY
    });

    c.items.forEach((item, iidx) => {
      const iy = 2.5 + iidx * 1.05;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: cx + 0.12, y: iy, w: 2.68, h: 0.98, rectRadius: 0.04,
        fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
      });
      slide.addText(`• ${item}`, {
        x: cx + 0.18, y: iy + 0.06, w: 2.56, h: 0.86,
        fontSize: 8.0, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
      });
    });
  });
}

// ============================================================================
// SLIDE 20: Architectural Caveats & Nuances for Dynamic Hybrid
// ============================================================================
function buildSlide20_ArchitecturalCaveats() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT III • ARCHITECTURAL CAVEATS', 'Architectural Caveats & Nuances: Production Realities of Pattern C', 20);

  slide.addText('Critical engineering trade-offs, quota ceilings, and operational constraints that platform teams must navigate in Pattern C.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const caveats = [
    {
      title: '1. Project Quota Limits & Provisioning Latency',
      tag: 'QUOTA CEILING',
      color: G_AMBER_DEEP,
      tint: G_YELLOW_LIGHT,
      impact: 'Google Cloud Organizations enforce a default quota of 1,000 projects. Scaling to 10,000+ tenants requires quota requests and organizational folder hierarchies.',
      mitigation: 'Pre-warm a pool of unallocated "warm standby" projects via automated Terraform runners to reduce tenant onboarding time from 15 minutes to <30 seconds.'
    },
    {
      title: '2. Zero Shared Prompt Cache Savings',
      tag: 'FINOPS IMPACT',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      impact: 'Vertex AI ContextCacheConfig cannot be shared across project perimeters. Sovereign tenants pay 100% uncached input token costs, eliminating the 90% discount.',
      mitigation: 'Accept higher COGS as a necessary compliance premium, and offset costs using smaller specialized models (Gemini Flash) or air-gapped Gemma 3 on GKE.'
    },
    {
      title: '3. Cross-Perimeter SaaS Tool Access',
      tag: 'VPC-SC EGRESS',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      impact: 'When agent tools connect to external SaaS APIs (Salesforce, Jira, ServiceNow), strict VPC-SC perimeters block outbound HTTPS traffic unless explicitly allowed.',
      mitigation: 'Configure scoped VPC-SC egress policies bound strictly to tenant service accounts with mTLS or OAuth DPoP sender-constrained token validation.'
    },
    {
      title: '4. Cloud KMS Key Revocation Cache TTL',
      tag: 'CACHE TTL NUANCE',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      impact: 'Vertex AI and Google Cloud managed services cache CMEK authorization grants in memory for up to 3 hours to optimize throughput under transient network partitions.',
      mitigation: 'Implement our active Hop 4 interceptor which validates key status directly against Cloud KMS on every turn, delivering hard <3s revocation enforcement.'
    }
  ];

  caveats.forEach((c, idx) => {
    const cx = 0.6 + idx * 3.08;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: 1.35, w: 2.92, h: 5.5, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: c.color, width: 1.5 }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: cx, y: 1.35, w: 2.92, h: 0.5, fill: { color: c.tint }
    });
    slide.addText(c.tag, {
      x: cx + 0.15, y: 1.35, w: 2.62, h: 0.5, fontSize: 8.2, bold: true, color: c.color, fontFace: FONT_TITLE, valign: 'middle'
    });
    slide.addText(c.title, {
      x: cx + 0.15, y: 1.95, w: 2.62, h: 0.55, fontSize: 10.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15
    });

    // Impact Box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx + 0.12, y: 2.6, w: 2.68, h: 1.9, rectRadius: 0.04,
      fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
    });
    slide.addText('ARCHITECTURAL IMPACT & CONSTRAINT', {
      x: cx + 0.18, y: 2.68, w: 2.56, h: 0.2, fontSize: 7.5, bold: true, color: G_RED_DEEP, fontFace: FONT_TITLE
    });
    slide.addText(c.impact, {
      x: cx + 0.18, y: 2.92, w: 2.56, h: 1.5, fontSize: 8.0, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
    });

    // Mitigation Box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx + 0.12, y: 4.6, w: 2.68, h: 2.1, rectRadius: 0.04,
      fill: { color: 'F0FDF4' }, line: { color: G_GREEN_DEEP, width: 0.75 }
    });
    slide.addText('PRODUCTION COMPENSATING CONTROL', {
      x: cx + 0.18, y: 4.68, w: 2.56, h: 0.2, fontSize: 7.5, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE
    });
    slide.addText(c.mitigation, {
      x: cx + 0.18, y: 4.92, w: 2.56, h: 1.7, fontSize: 8.0, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
    });
  });
}

// ============================================================================
// SLIDE 21: Transition Breaker — Act IV: Empirical Multi-Cloud Verification
// ============================================================================
function buildSlide21_Act4Breaker() {
  buildActBreakerSlide({
    slideNum: 21,
    actTag: 'ACT IV • EMPIRICAL PROOFS',
    actNumber: 'ACT IV',
    actTitle: 'Empirical Multi-Cloud Verification & 10 Sovereign Receipts',
    actSubtitle: 'Authentic 2880x1800 Retina UI Captures Across 10 Live Enterprise SaaS Stacks',
    actColor: G_RED_DEEP,
    actTint: G_RED_LIGHT,
    coreQuestion: 'Can dynamic hybrid interact with external SaaS tools while maintaining zero-trust perimeters and regulatory compliance?',
    thesis: 'Live verification across 10 third-party enterprise SaaS stacks proves that dedicated per-tenant perimeters and DPoP-bound credentials isolate all tool actions.',
    milestones: [
      {
        num: '01',
        title: 'Proofs 1–3: Analytics & Observability (Metabase, Trino, Grafana)',
        desc: 'Verifying that BI dashboards, distributed SQL engines, and APM metrics are strictly isolated within tenant VPCs.',
        deliverable: '3 Dedicated Sovereign Dashboards'
      },
      {
        num: '02',
        title: 'Proofs 4–6: Logs, Secrets & Warehouses (Seq, Vault, ClickHouse)',
        desc: 'Verifying CMEK-encrypted audit logging, per-tenant Vault namespaces, and HSM-encrypted database tables.',
        deliverable: '3 Hardware-Encrypted Stores'
      },
      {
        num: '03',
        title: 'Proofs 7–8: Workspaces & Operations (Redmine, NocoDB)',
        desc: 'Proving agent project tracking tools and CRM spreadsheets cannot cross enterprise organizational boundaries.',
        deliverable: '2 Air-Gapped Tool Surfaces'
      },
      {
        num: '04',
        title: 'Proofs 9–10: GitOps & CMS (Gitea, Directus)',
        desc: 'Verifying that proprietary agent skill code and customer knowledge items are completely invisible to external tenants.',
        deliverable: '2 Isolated Repository Stores'
      }
    ]
  });
}

// ============================================================================
// SLIDE 22: Proof 1 — Metabase Enterprise BI (ThoughtSpot)
// ============================================================================
function buildSlide22_Metabase() {
  buildBeforeAfterSaasSlide({
    slideNum: 22,
    proofNum: 1,
    saasName: 'Metabase Enterprise BI',
    title: 'Proof 1: Metabase Enterprise BI v0.50.26 — Dynamic Hybrid Analytics Isolation',
    subtitle: 'Authentic 2880x1800 Retina UI captures verifying that sovereign VPC-SC perimeters isolate tenant analytics in Metabase.',
    beforeImg: 'before_01_metabase_bi.png',
    afterImg: 'after_01_metabase_bi.png',
    beforeHeader: 'BEFORE: UNFILTERED SHARED BI (CROSS-TENANT LEAKAGE RISK)',
    beforeVulnerability: 'Shared PostgreSQL connection pool lacks physical tenant perimeters. Financial analytics from FinVault Bank and commercial tenants merge in a single dashboard.',
    beforeThreat: 'Commercial tenants or rogue agent workflows can inspect competitor order volumes and transaction totals with zero physical perimeter boundary.',
    afterHeader: 'AFTER: DEDICATED SOVEREIGN SILO (STRICT VPC-SC ISOLATION)',
    afterEnforcement: 'Metabase runs inside the dedicated FinVault project (cymbal-finvault-silo-prod) connecting exclusively to the tenant AlloyDB cluster over private VPC.',
    afterVerification: 'The dashboard displays exclusively FinVault Bank transactions. Competitor records do not exist on the network or database level.'
  });
}

// ============================================================================
// SLIDE 23: Proof 2 — Trino Distributed SQL (Databricks)
// ============================================================================
function buildSlide23_Trino() {
  buildBeforeAfterSaasSlide({
    slideNum: 23,
    proofNum: 2,
    saasName: 'Trino Distributed SQL',
    title: 'Proof 2: Trino Distributed SQL v446 — CMEK-Encrypted Sovereign Data Lakehouse',
    subtitle: 'Authentic 2880x1800 Retina UI captures proving SQL execution operates within a dedicated tenant catalog backed by CMEK Cloud Storage.',
    beforeImg: 'before_06_trino_sql.png',
    afterImg: 'after_06_trino_sql.png',
    beforeHeader: 'BEFORE: GLOBAL CROSS-CATALOG TRINO QUERIES (NO PHYSICAL BOUNDARY)',
    beforeVulnerability: 'An autonomous agent executes queries across a shared Trino cluster where multiple tenant catalogs are accessible via a single coordinator token.',
    beforeThreat: 'Cross-tenant financial data across all participating SaaS tenants is returned in plaintext in the distributed query coordinator console.',
    afterHeader: 'AFTER: DEDICATED CATALOG & CUSTOMER CMEK HSM ENCRYPTION',
    afterEnforcement: 'Trino queries execute against a dedicated FinVault catalog backed by gs://cymbal-finvault-lakehouse/ encrypted with customer Cloud KMS key.',
    afterVerification: 'Query execution scans strictly FinVault CMEK-encrypted partitions. If customer revokes KMS key, queries abort with HTTP 423 Locked in <3s.'
  });
}

// ============================================================================
// SLIDE 24: Proof 3 — Grafana Enterprise Observability (Sigma Computing)
// ============================================================================
function buildSlide24_Grafana() {
  buildBeforeAfterSaasSlide({
    slideNum: 24,
    proofNum: 3,
    saasName: 'Grafana Enterprise',
    title: 'Proof 3: Grafana Observability v10.4.1 — Dedicated Sovereign APM & Telemetry',
    subtitle: 'Authentic 2880x1800 Retina UI captures verifying Prometheus and OpenTelemetry metric scoping prevents noisy-neighbor metric leakage.',
    beforeImg: 'before_02_grafana_enterprise.png',
    afterImg: 'after_02_grafana_enterprise.png',
    beforeHeader: 'BEFORE: UNFILTERED METRIC STREAMS (COMPETITOR TELEMETRY LEAK)',
    beforeVulnerability: 'Prometheus endpoint publishes container metrics without physical project scoping. Ingress RPS, error rates, and latency curves are globally visible.',
    beforeThreat: 'Competitor tenants can reverse-engineer transaction volumes, trade surges, and operational outages from co-hosted telemetry dashboards.',
    afterHeader: 'AFTER: DEDICATED SOVEREIGN TELEMETRY PERIMETER (PROJECT ISOLATION)',
    afterEnforcement: 'Grafana connects exclusively to the tenant Cloud Monitoring project via VPC Service Controls with private Google Access.',
    afterVerification: 'Dashboard charts render exclusively FinVault Bank service-level metrics. Competitor metrics are physically non-existent in the telemetry store.'
  });
}

// ============================================================================
// SLIDE 25: Proof 4 — Datalust Seq Centralized Logging (Datadog)
// ============================================================================
function buildSlide25_DatalustSeq() {
  buildBeforeAfterSaasSlide({
    slideNum: 25,
    proofNum: 4,
    saasName: 'Datalust Seq',
    title: 'Proof 4: Datalust Seq Logging v2024.1 — Sovereign CMEK-Encrypted Audit Stream',
    subtitle: 'Authentic 2880x1800 Retina UI captures showing structured audit logs strictly partitioned and encrypted with tenant KMS key.',
    beforeImg: 'before_09_datalust_seq.png',
    afterImg: 'after_09_datalust_seq.png',
    beforeHeader: 'BEFORE: INTERLEAVED APPLICATION LOG STREAM (PII EXPOSURE)',
    beforeVulnerability: 'Centralized logging cluster ingests agent execution traces from all tenants into a single Elasticsearch/Seq index without encryption boundaries.',
    beforeThreat: 'Support engineers with broad logging access can view unredacted customer PII, account numbers, and private conversation histories.',
    afterHeader: 'AFTER: DEDICATED SOVEREIGN AUDIT STREAM WITH CLOUD SDP REDACTION',
    afterEnforcement: 'Log events pass through Cloud SDP inline inspection in Hop 4, masking PII before persisting to a CMEK-encrypted Cloud Logging bucket.',
    afterVerification: 'Log stream contains 100% FinVault Bank events. Full cryptographic audit ownership remains in customer hands with 7-year OCC retention.'
  });
}

// ============================================================================
// SLIDE 26: Proof 5 — HashiCorp Vault Secrets Management (CrowdStrike / Okta)
// ============================================================================
function buildSlide26_HashiCorpVault() {
  buildBeforeAfterSaasSlide({
    slideNum: 26,
    proofNum: 5,
    saasName: 'HashiCorp Vault',
    title: 'Proof 5: HashiCorp Vault v1.16.0 — Dedicated Sovereign Namespaces & HSM Roots',
    subtitle: 'Authentic 2880x1800 Retina UI captures proving agent tool credentials are sequestered in dedicated per-tenant KV secret paths.',
    beforeImg: 'before_10_hashicorp_vault.png',
    afterImg: 'after_10_hashicorp_vault.png',
    beforeHeader: 'BEFORE: SHARED SECRET KV STORE (PRIVILEGE ESCALATION THREAT)',
    beforeVulnerability: 'API keys, database credentials, and OAuth secrets for all tenants reside in a shared secret/kv/ data path accessible via broad service tokens.',
    beforeThreat: 'A prompt injection attack forcing an agent to run vault kv get exposes master keys for all enterprise tenants.',
    afterHeader: 'AFTER: DEDICATED VAULT NAMESPACE BOUND TO TENANT HSM ROOT',
    afterEnforcement: 'Vault policies restrict agents to secret/tenants/finvault/* based on the verified JWT tenant claim minted at Hop 1.',
    afterVerification: 'Agent attempts to access external secret namespaces result in instant permission denied (403 Forbidden). Master secrets remain secure.'
  });
}

// ============================================================================
// SLIDE 27: Proof 6 — ClickHouse Analytics Engine (Snowflake)
// ============================================================================
function buildSlide27_ClickHouse() {
  buildBeforeAfterSaasSlide({
    slideNum: 27,
    proofNum: 6,
    saasName: 'ClickHouse Analytics',
    title: 'Proof 6: ClickHouse Analytics v24.3 — Hardware-Encrypted Wire Settlement Analytics',
    subtitle: 'Authentic 2880x1800 Retina UI captures proving high-throughput analytical event queries are strictly bound to tenant boundaries.',
    beforeImg: 'before_07_clickhouse_rls.png',
    afterImg: 'after_07_clickhouse_rls.png',
    beforeHeader: 'BEFORE: UNRESTRICTED COLUMNAR TABLE SCANS (EVENT CROSS-TALK)',
    beforeVulnerability: 'Fast analytical table telemetry_events is queried without Row Policy definitions, scanning all tenants in unified columnar blocks.',
    beforeThreat: 'High-frequency trading and wire settlement telemetry can be harvested by competitor tenants running analytical aggregation queries.',
    afterHeader: 'AFTER: DEDICATED SOVEREIGN NODE ENCRYPTED UNDER TENANT HSM KEY',
    afterEnforcement: 'ClickHouse evaluates CREATE ROW POLICY ON telemetry_events FOR SELECT USING (tenant_id = current_user()) at query compile time.',
    afterVerification: 'Query execution strictly scans parts belonging to FinVault Bank. 0 competitor rows are read from NVMe disk.'
  });
}

// ============================================================================
// SLIDE 28: Proof 7 — Redmine Enterprise Project Tracker (ServiceNow)
// ============================================================================
function buildSlide28_Redmine() {
  buildBeforeAfterSaasSlide({
    slideNum: 28,
    proofNum: 7,
    saasName: 'Redmine Project Operations',
    title: 'Proof 7: Redmine Operations v5.1.2 — Air-Gapped Sovereign Issue Tracking',
    subtitle: 'Authentic 2880x1800 Retina UI captures proving agent project management tools cannot cross enterprise workspace boundaries.',
    beforeImg: 'before_03_redmine_itsm.png',
    afterImg: 'after_03_redmine_itsm.png',
    beforeHeader: 'BEFORE: GLOBAL TICKET CATALOG (INTER-TENANT VISIBILITY)',
    beforeVulnerability: 'Shared ticketing instance allows generic project list queries without tenant scoping headers, displaying internal issues from all organizations.',
    beforeThreat: 'Tenants can view confidential roadmap tickets, security incident post-mortems, and customer escalations of competing tenants.',
    afterHeader: 'AFTER: DEDICATED SOVEREIGN WORKSPACE ACCESSIBLE ONLY OVER VPC-SC',
    afterEnforcement: 'The Redmine MCP tool proxy injects tenant organization membership filters and validates incoming OIDC tokens before returning issue lists.',
    afterVerification: 'Only FinVault Bank projects and tickets appear in the UI and API responses. Other tenants\' workspaces return 404 Not Found.'
  });
}

// ============================================================================
// SLIDE 29: Proof 8 — NocoDB Relational Workspace (Muse)
// ============================================================================
function buildSlide29_NocoDB() {
  buildBeforeAfterSaasSlide({
    slideNum: 29,
    proofNum: 8,
    saasName: 'NocoDB Relational Workspace',
    title: 'Proof 8: NocoDB Relational Workspace v0.207.1 — GxP/Regulatory Relational Database',
    subtitle: 'Authentic 2880x1800 Retina UI captures showing no-code database grids partitioned strictly by tenant ID at the underlying database layer.',
    beforeImg: 'before_04_nocodb_gxp.png',
    afterImg: 'after_04_nocodb_gxp.png',
    beforeHeader: 'BEFORE: MIXED RELATIONAL CRM GRID (TENANT DATA CO-MINGLED)',
    beforeVulnerability: 'Shared NocoDB table view displays all customer leads, revenue numbers, and contract terms in a single shared spreadsheet grid.',
    beforeThreat: 'Commercial tenants can export the full database table, compromising sensitive client lists and sales pipelines of rival enterprises.',
    afterHeader: 'AFTER: DEDICATED SOVEREIGN ALLOYDB INSTANCE (PHYSICAL DATABASE SILO)',
    afterEnforcement: 'NocoDB queries execute against an isolated AlloyDB instance with active CMEK encryption. The database planner filters records before return.',
    afterVerification: 'The relational spreadsheet displays exclusively FinVault Bank accounts. Exporting CSV yields strictly tenant-owned data.'
  });
}

// ============================================================================
// SLIDE 30: Proof 9 — Gitea Enterprise Git Service (Salesforce & Jira)
// ============================================================================
function buildSlide30_Gitea() {
  buildBeforeAfterSaasSlide({
    slideNum: 30,
    proofNum: 9,
    saasName: 'Gitea Enterprise Git',
    title: 'Proof 9: Gitea Enterprise Git v1.21.11 — Dedicated Sovereign SRE Escalation Repo',
    subtitle: 'Authentic 2880x1800 Retina UI captures proving code repositories and CI/CD workflows are completely invisible across tenant organizations.',
    beforeImg: 'before_05_gitea_sre.png',
    afterImg: 'after_05_gitea_sre.png',
    beforeHeader: 'BEFORE: UNCONSTRAINED REPOSITORY DISCOVERY (SOURCE CODE LEAK)',
    beforeVulnerability: 'Gitea instance permits public organization exploration. Proprietary agent runbooks and custom skill repositories are visible across tenants.',
    beforeThreat: 'Adversary clones competitor agent workflow configurations, fine-tuning scripts, and proprietary prompt templates.',
    afterHeader: 'AFTER: DEDICATED SOVEREIGN GITEA INSTANCE IN TENANT PROJECT',
    afterEnforcement: 'Hop 1 gateway maps tenant claims to private Gitea organizations. All repository discovery queries enforce strict org-level privacy.',
    afterVerification: 'Competitor organizations and repositories do not exist in the catalog. Direct HTTP/SSH clones return 404 Repository Not Found.'
  });
}

// ============================================================================
// SLIDE 31: Proof 10 — Directus Headless CMS (Workday)
// ============================================================================
function buildSlide31_Directus() {
  buildBeforeAfterSaasSlide({
    slideNum: 31,
    proofNum: 10,
    saasName: 'Directus Headless CMS',
    title: 'Proof 10: Directus Headless CMS v10.10.4 — Dedicated Sovereign HCM Record Storage',
    subtitle: 'Authentic 2880x1800 Retina UI captures proving headless CMS collections and agent knowledge documents are strictly sequestered by tenant.',
    beforeImg: 'before_08_directus_hcm.png',
    afterImg: 'after_08_directus_hcm.png',
    beforeHeader: 'BEFORE: GLOBAL CMS COLLECTIONS (KNOWLEDGE BASE POLLUTION)',
    beforeVulnerability: 'Knowledge base items, agent personas, and company policies for all tenants are stored in an unpartitioned articles collection.',
    beforeThreat: 'RAG retrieval workflows inadvertently index competitor internal policies, leaking proprietary HR and strategic guidance.',
    afterHeader: 'AFTER: DEDICATED SOVEREIGN CMS WITH FIELD-LEVEL CMEK ENCRYPTION',
    afterEnforcement: 'Directus role permissions evaluate $CURRENT_USER.tenant_id = item.tenant_id on every REST and GraphQL query.',
    afterVerification: 'Articles and agent skills are 100% quarantined to FinVault Bank. No cross-tenant metadata exists in API responses.'
  });
}

// ============================================================================
// SLIDE 32: Transition Breaker — Act V: Implementation, Scorecard & CISO Guide
// ============================================================================
function buildSlide32_Act5Breaker() {
  buildActBreakerSlide({
    slideNum: 32,
    actTag: 'ACT V • ENTERPRISE GOVERNANCE',
    actNumber: 'ACT V',
    actTitle: 'Implementation, Scorecard & CISO Guide',
    actSubtitle: 'Phased Migration Sprints, Multi-Cloud Isolation Scorecards, and Executive CISO FAQ Guide',
    actColor: G_GREEN_DEEP,
    actTint: G_GREEN_LIGHT,
    coreQuestion: 'What is the production deployment lifecycle and regulatory readiness for Pattern C dynamic hybrid?',
    thesis: 'A 10-week 5-sprint roadmap takes enterprises from initial multi-project IaC to full regulatory compliance with sub-3s crypto-shredding.',
    milestones: [
      {
        num: '01',
        title: '10-Week Dynamic Hybrid Roadmap',
        desc: '5 structured two-week sprints taking infrastructure from multi-project inception to regulatory audit sign-off.',
        deliverable: 'Gantt & Governance Plan'
      },
      {
        num: '02',
        title: 'Multi-Cloud Sovereign Scorecard',
        desc: 'Objective comparison matrix benchmarking Google Cloud vs AWS vs Azure sovereign isolation primitives.',
        deliverable: 'Multi-Cloud Benchmarks'
      },
      {
        num: '03',
        title: 'CISO & Compliance FAQ Guide',
        desc: 'Direct architectural answers to the four core questions raised by regulatory review boards regarding Pattern C.',
        deliverable: 'Executive Decision Framework'
      }
    ]
  });
}

// ============================================================================
// SLIDE 33: 10-Week Enterprise Dynamic Hybrid Implementation Roadmap
// ============================================================================
function buildSlide33_Roadmap() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT V • IMPLEMENTATION ROADMAP', '10-Week Enterprise Dynamic Hybrid Implementation Roadmap: Phased Sprints & Gates', 33);

  slide.addText('Structured enterprise rollout plan taking sovereign multi-tenant AI platforms from multi-project IaC to full regulatory compliance.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  const sprints = [
    {
      sprint: 'SPRINT 1',
      weeks: 'Weeks 1–2',
      title: 'Multi-Project Foundation & VPC-SC',
      color: G_BLUE_DARK,
      tint: G_BLUE_LIGHT,
      gate: 'GATE 1: Perimeter Baseline Pass',
      tasks: [
        'Deploy Terraform to provision cymbal-finvault-silo-prod.',
        'Establish VPC Service Controls perimeter around core APIs.',
        'Configure dedicated Serverless VPC Access connector.',
        'Bind IAM Principal Access Boundaries to prevent blast radius.'
      ]
    },
    {
      sprint: 'SPRINT 2',
      weeks: 'Weeks 3–4',
      title: 'Customer CMEK Key Rings & HSM',
      color: G_BLUE,
      tint: G_BLUE_LIGHT,
      gate: 'GATE 2: CMEK Federation Pass',
      tasks: [
        'Federate Cloud KMS key rings with customer Cloud EKM HSM.',
        'Grant service agents cryptoKeyEncrypterDecrypter roles.',
        'Configure Secret Manager with per-tenant CMEK wrapping.',
        'Verify zero plaintext keys exist in application configuration.'
      ]
    },
    {
      sprint: 'SPRINT 3',
      weeks: 'Weeks 5–6',
      title: 'Dedicated AlloyDB & GKE Serving',
      color: G_AMBER_DEEP,
      tint: G_YELLOW_LIGHT,
      gate: 'GATE 3: Sovereign Compute Pass',
      tasks: [
        'Provision dedicated AlloyDB cluster with CMEK encryption.',
        'Deploy air-gapped Gemma 3 (27B) on private GKE cluster.',
        'Enable AMD SEV-SNP Confidential VM hardware encryption.',
        'Validate sub-35ms TTFT on NVIDIA L4 GPU node pool.'
      ]
    },
    {
      sprint: 'SPRINT 4',
      weeks: 'Weeks 7–8',
      title: '10-Point Exfiltration & Kill-Switch Tests',
      color: G_RED_DEEP,
      tint: G_RED_LIGHT,
      gate: 'GATE 4: <3s Kill-Switch Pass',
      tasks: [
        'Simulate customer CMEK key revocation; verify HTTP 423 in <3s.',
        'Execute automated red-team data exfiltration test suite.',
        'Inject simulated cross-project IAM privilege escalation.',
        'Verify 0 cross-perimeter packets escape VPC-SC envelope.'
      ]
    },
    {
      sprint: 'SPRINT 5',
      weeks: 'Weeks 9–10',
      title: 'Regulatory Audit & Production GA',
      color: G_GREEN_DEEP,
      tint: G_GREEN_LIGHT,
      gate: 'GATE 5: Regulatory Audit Sign-Off',
      tasks: [
        'Complete OCC Bulletin 2013-29 & DORA audit attestation.',
        'Establish 24/7 Cloud Logging & Security Command Center alerts.',
        'Deliver customer key custodian onboarding & runbook training.',
        'Achieve formal CISO and Compliance Review Board sign-off.'
      ]
    }
  ];

  sprints.forEach((s, idx) => {
    const sx = 0.6 + idx * 2.45;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sx, y: 1.35, w: 2.32, h: 5.5, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: s.color, width: 1.5 }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: sx, y: 1.35, w: 2.32, h: 0.85, fill: { color: s.tint }
    });
    slide.addText(`${s.sprint} (${s.weeks})`, {
      x: sx + 0.12, y: 1.42, w: 2.08, h: 0.25, fontSize: 8.5, bold: true, color: s.color, fontFace: FONT_TITLE
    });
    slide.addText(s.title, {
      x: sx + 0.12, y: 1.68, w: 2.08, h: 0.45, fontSize: 10.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15
    });

    s.tasks.forEach((t, tidx) => {
      const ty = 2.35 + tidx * 0.92;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: sx + 0.12, y: ty, w: 2.08, h: 0.82, rectRadius: 0.04,
        fill: { color: G_GREY_BG }, line: { color: G_GREY_BORDER, width: 0.5 }
      });
      slide.addText(`• ${t}`, {
        x: sx + 0.18, y: ty + 0.06, w: 1.96, h: 0.7,
        fontSize: 7.8, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15
      });
    });

    // Governance Gate at Bottom
    slide.addShape(pptx.ShapeType.roundRect, {
      x: sx + 0.12, y: 6.15, w: 2.08, h: 0.55, rectRadius: 0.05,
      fill: { color: s.tint }, line: { color: s.color, width: 1 }
    });
    slide.addText(s.gate, {
      x: sx + 0.12, y: 6.15, w: 2.08, h: 0.55,
      fontSize: 8.2, bold: true, color: s.color, fontFace: FONT_TITLE, align: 'center', valign: 'middle'
    });
  });
}

// ============================================================================
// SLIDE 34: Dynamic Hybrid Scorecard & CISO FAQ Guide
// ============================================================================
function buildSlide34_ScorecardAndFaq() {
  const slide = pptx.addSlide();
  addHeader(slide, 'ACT V • SCORECARD & CISO FAQ', 'Pattern C Multi-Cloud Sovereign Scorecard & Executive CISO FAQ Guide', 34);

  slide.addText('Objective architectural comparison of sovereign cloud capabilities across providers alongside answers to core CISO questions.', {
    x: 0.6, y: 0.85, w: 12.133, h: 0.4, fontSize: 11, color: TEXT_MUTED, fontFace: FONT_BODY
  });

  // Top Table: Multi-Cloud Comparison
  const headers = [
    { text: 'Sovereign Dimension', options: { bold: true, color: WHITE, fill: { color: G_NAVY }, fontSize: 8.5 } },
    { text: 'Google Cloud (Pattern C Silos)', options: { bold: true, color: WHITE, fill: { color: G_BLUE_DARK }, fontSize: 8.5, align: 'center' } },
    { text: 'AWS Dedicated Accounts', options: { bold: true, color: WHITE, fill: { color: '232F3E' }, fontSize: 8.5, align: 'center' } },
    { text: 'Azure Isolated Subscriptions', options: { bold: true, color: WHITE, fill: { color: '0078D4' }, fontSize: 8.5, align: 'center' } }
  ];

  const rows = [
    [
      'Network Perimeter Enforcement',
      '✅ Hardware VPC Service Controls (VPC-SC) drops exfiltration at SDN layer',
      '⚠️ AWS VPC Endpoints + Service Control Policies (App-layer evaluation)',
      '⚠️ Azure Private Link + Resource Firewall (Complex route tables)'
    ],
    [
      'Customer-Held CMEK Kill-Switch',
      '✅ Cloud KMS / EKM with active Hop 4 interceptor (<3s revocation SLA)',
      '⚠️ AWS KMS key policy updates (Cache propagation delays up to 15m)',
      '⚠️ Azure Key Vault soft-delete and permission cache latency'
    ],
    [
      'Air-Gapped Confidential Inference',
      '✅ Private GKE + AMD SEV-SNP Confidential VMs (Zero telemetry egress)',
      '⚠️ AWS EKS + Nitro Enclaves (Complex attestation & enclave overhead)',
      '⚠️ Azure Confidential Containers on ACI (Limited regional GPU support)'
    ],
    [
      'Identity Blast Radius Control',
      '✅ IAM Principal Access Boundaries (PAB) enforce org-wide limits',
      '⚠️ AWS IAM Permissions Boundaries (Must be attached per-role manually)',
      '⚠️ Azure Management Groups / Azure Policy (Eventual consistency delays)'
    ]
  ];

  const tableData = [headers, ...rows.map((r, idx) => [
    { text: r[0], options: { fontSize: 8.0, bold: true, color: G_NAVY, fill: { color: idx % 2 === 0 ? G_GREY_BG : WHITE } } },
    { text: r[1], options: { fontSize: 7.8, bold: true, color: G_GREEN_DEEP, fill: { color: idx % 2 === 0 ? 'F0FDF4' : G_GREEN_LIGHT }, align: 'left' } },
    { text: r[2], options: { fontSize: 7.8, color: TEXT_DARK, fill: { color: idx % 2 === 0 ? G_GREY_BG : WHITE }, align: 'left' } },
    { text: r[3], options: { fontSize: 7.8, color: TEXT_DARK, fill: { color: idx % 2 === 0 ? G_GREY_BG : WHITE }, align: 'left' } }
  ])];

  slide.addTable(tableData, {
    x: 0.6, y: 1.35, w: 12.133, colW: [2.5, 3.5, 3.0, 3.133],
    border: { pt: 0.5, color: G_GREY_BORDER }, autoPage: false
  });

  // Bottom Half: 2-Column CISO FAQ Cards
  const faqs = [
    {
      q: 'Q1: How does customer CMEK guarantee immediate data access cut-off during an emergency?',
      a: 'The moment a customer disables their Cloud KMS key version or cuts their Cloud EKM link, all decryption requests return FAILED_PRECONDITION. Our Hop 4 interceptor traps this failure and aborts active execution in <3 seconds with HTTP 423 Locked. No residual plaintext remains in memory or disk.'
    },
    {
      q: 'Q2: Can Google Cloud internal operators access customer memory during Gemma 3 inference?',
      a: 'No. When deployed with AMD SEV-SNP Confidential Computing on private GKE, memory contents in RAM are encrypted using hardware keys generated by the secure processor that are inaccessible to hypervisors, host operating systems, or Google cloud operators.'
    },
    {
      q: 'Q3: How do IAM Principal Access Boundaries prevent cross-project blast radius?',
      a: 'PAB policies enforce an absolute ceiling on the permissions that any service account or principal can exercise inside a project folder. Even if an attacker gains project-owner credentials inside FinVault silo, PAB rules prevent them from assuming roles or querying resources in RetailStream silo.'
    },
    {
      q: 'Q4: What is the disaster recovery (DR) and business continuity model for dynamic hybrid?',
      a: 'Sovereign silos support multi-region secondary standby deployments (e.g. us-central1 primary and us-east4 standby). Cloud KMS keys are replicated across multi-regions, and AlloyDB cross-region replication streams WAL records continuously with sub-1s RPO and <60s automated failover RTO.'
    }
  ];

  faqs.forEach((f, idx) => {
    const fx = 0.6 + (idx % 2) * 6.18;
    const fy = 3.9 + Math.floor(idx / 2) * 1.5;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: fx, y: fy, w: 5.95, h: 1.38, rectRadius: 0.06,
      fill: { color: WHITE }, line: { color: G_BLUE_DARK, width: 1.2 }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: fx, y: fy, w: 5.95, h: 0.35, fill: { color: G_BLUE_LIGHT }
    });
    slide.addText(f.q, {
      x: fx + 0.15, y: fy, w: 5.65, h: 0.35, fontSize: 8.5, bold: true, color: G_BLUE_DARK, fontFace: FONT_TITLE, valign: 'middle'
    });
    slide.addText(f.a, {
      x: fx + 0.15, y: fy + 0.42, w: 5.65, h: 0.9, fontSize: 8.2, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.2
    });
  });
}

// ============================================================================
// MAIN COMPILATION ENTRYPOINT
// ============================================================================
async function compileDeck() {
  console.log('Compiling 100% native DrawingML editable 34-slide executive presentation for Pattern C (WS4)...');

  // ACT I: PROBLEM & COMPLIANCE
  buildSlide01();
  buildSlide02_Agenda();
  buildSlide03_Dilemma();
  buildSlide04_ComplianceMatrix();

  // ACT II: ARCHITECTURAL TOPOLOGIES & BLUEPRINTS
  buildSlide05_Act2Breaker();
  buildSlide06_PatternBPrinciples();
  buildSlide07_L1Logical();
  await buildSlide08_Figure1();
  await buildSlide09_Figure2();
  await buildSlide10_Figure3();
  await buildSlide11_Figure4();

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
  buildSlide22_Metabase();
  buildSlide23_Trino();
  buildSlide24_Grafana();
  buildSlide25_DatalustSeq();
  buildSlide26_HashiCorpVault();
  buildSlide27_ClickHouse();
  buildSlide28_Redmine();
  buildSlide29_NocoDB();
  buildSlide30_Gitea();
  buildSlide31_Directus();

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
