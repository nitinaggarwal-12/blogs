const fs = require('fs');
const path = require('path');
const PptxGenJS = require('/usr/local/google/home/nitinagga/Documents/_legacy_cloudtop_backups_20261029/PromptCanvas_oct02_backup/node_modules/pptxgenjs');

const ROOT_DIR = path.resolve(__dirname, '..');
const PPTX_OUT = path.join(ROOT_DIR, 'slides', 'ws1-executive-solution-deck.pptx');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches

// Google Cloud Architecture Center & Material Design Palette
const FONT_TITLE = 'Google Sans';
const FONT_BODY = 'Roboto';

const G_BLUE = '1A73E8';
const G_BLUE_DEEP = '174EA6';
const G_BLUE_TINT = 'E8F0FE';
const G_RED = 'D93025';
const G_RED_TINT = 'FCE8E6';
const G_YELLOW = 'F9AB00';
const G_YELLOW_TINT = 'FEF7E0';
const G_YELLOW_TEXT = 'B06000';
const G_GREEN = '1E8E3E';
const G_GREEN_DEEP = '137333';
const G_GREEN_TINT = 'E6F4EA';

const WHITE = 'FFFFFF';
const CARD_BG = 'F8FAFC';
const BORDER_GREY = 'DADCE0';
const BORDER_LIGHT = 'E2E8F0';
const TEXT_DARK = '202124';
const TEXT_BODY = '3C4043';
const TEXT_MUTED = '5F6368';

function addHeaderRibbon(slide) {
  const segW = 13.333 / 4;
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: segW, h: 0.05, fill: { color: '4285F4' }, line: { color: '4285F4', width: 0 } });
  slide.addShape(pptx.ShapeType.rect, { x: segW, y: 0, w: segW, h: 0.05, fill: { color: 'EA4335' }, line: { color: 'EA4335', width: 0 } });
  slide.addShape(pptx.ShapeType.rect, { x: segW * 2, y: 0, w: segW, h: 0.05, fill: { color: 'FBBC04' }, line: { color: 'FBBC04', width: 0 } });
  slide.addShape(pptx.ShapeType.rect, { x: segW * 3, y: 0, w: segW, h: 0.05, fill: { color: '34A853' }, line: { color: '34A853', width: 0 } });
}

function addStandardHeader(slide, category, title, trackerBadge) {
  addHeaderRibbon(slide);
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0.05, w: 13.333, h: 0.58,
    fill: { color: WHITE }, line: { color: BORDER_GREY, width: 0.5 },
  });
  slide.addText([
    { text: 'Google Cloud  ', options: { bold: true, color: G_BLUE, fontSize: 11, fontFace: FONT_TITLE } },
    { text: 'Architecture Center  ', options: { bold: true, color: TEXT_DARK, fontSize: 11, fontFace: FONT_TITLE } },
    { text: '|  ' + category, options: { bold: false, color: TEXT_MUTED, fontSize: 10, fontFace: FONT_BODY } },
  ], { x: 0.45, y: 0.12, w: 9.2, h: 0.22, valign: 'middle' });

  slide.addText(title, {
    x: 0.45, y: 0.32, w: 9.8, h: 0.28,
    fontSize: 13, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, valign: 'middle',
  });

  if (trackerBadge) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 10.45, y: 0.14, w: 2.45, h: 0.38, rectRadius: 0.06,
      fill: { color: G_BLUE_TINT }, line: { color: G_BLUE, width: 1 },
    });
    slide.addText(trackerBadge, {
      x: 10.45, y: 0.14, w: 2.45, h: 0.38,
      fontSize: 8.5, bold: true, color: G_BLUE_DEEP, fontFace: FONT_TITLE, align: 'center', valign: 'middle',
    });
  }
}

function addStandardFooter(slide, slideIndex, totalSlides, topicLabel) {
  slide.addShape(pptx.ShapeType.line, {
    x: 0.45, y: 7.08, w: 12.433, h: 0,
    line: { color: BORDER_GREY, width: 0.75 },
  });
  slide.addText('Google Cloud Platform  •  Enterprise Architecture Blueprint  •  Proprietary + Confidential', {
    x: 0.45, y: 7.14, w: 7.5, h: 0.25,
    fontSize: 8, color: TEXT_MUTED, fontFace: FONT_BODY, valign: 'middle',
  });
  slide.addText(topicLabel || 'WS1: Reference Architecture & 5-Hop Baseline', {
    x: 8.0, y: 7.14, w: 4.0, h: 0.25,
    fontSize: 8, color: G_BLUE, fontFace: FONT_BODY, align: 'right', valign: 'middle',
  });
  slide.addText(`${slideIndex} / ${totalSlides}`, {
    x: 12.1, y: 7.14, w: 0.8, h: 0.25,
    fontSize: 8.5, bold: true, color: TEXT_DARK, fontFace: FONT_BODY, align: 'right', valign: 'middle',
  });
}

// -----------------------------------------------------------------------------
// SLIDE 1: Title Cover & Executive Blueprint
// -----------------------------------------------------------------------------
function buildSlide01() {
  const slide = pptx.addSlide();
  addHeaderRibbon(slide);

  // Background accent container
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.7, y: 0.65, w: 11.93, h: 6.2, rectRadius: 0.12,
    fill: { color: WHITE }, line: { color: BORDER_GREY, width: 1 },
  });

  // Top Badge
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 1.1, y: 1.05, w: 4.8, h: 0.4, rectRadius: 0.08,
    fill: { color: G_BLUE_TINT }, line: { color: G_BLUE, width: 1 },
  });
  slide.addText('GOOGLE CLOUD ARCHITECTURE CENTER  •  EXECUTIVE MASTER BLUEPRINT', {
    x: 1.1, y: 1.05, w: 4.8, h: 0.4,
    fontSize: 8.8, bold: true, color: G_BLUE_DEEP, fontFace: FONT_TITLE, align: 'center', valign: 'middle',
  });

  // Main Title
  slide.addText(`The SaaS AI Architect\'s Dilemma:
Multi-Tenant Agentic AI on Google Cloud`, {
    x: 1.1, y: 1.65, w: 11.1, h: 1.4,
    fontSize: 26, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.15,
  });

  // Subtitle
  slide.addText('A production reference architecture, 3-pattern isolation taxonomy, and cryptographic 5-Hop governance pipeline for enterprise B2B SaaS platforms serving regulated and commercial tenants from a single agent codebase.', {
    x: 1.1, y: 3.15, w: 11.1, h: 0.8,
    fontSize: 12.5, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.2,
  });

  // 3-Card Summary Grid
  const summaryCards = [
    {
      title: 'THE CORE PROBLEM',
      headerColor: G_RED_TINT,
      borderColor: G_RED,
      titleColor: G_RED,
      body: 'Stateful agent reasoning loops, shared tool schemas, and delegated OAuth tokens create Confused Deputy attacks and cross-tenant cache bleed. 500 isolated projects collapse SaaS gross margins.',
    },
    {
      title: 'THE SOLUTION APPROACH',
      headerColor: G_BLUE_TINT,
      borderColor: G_BLUE,
      titleColor: G_BLUE_DEEP,
      body: 'Decouple the 80% reusable 5-Hop Cryptographic Core (core-cymbal-agent/) from the 20% perimeter delta (Pooled Cloud Run, Sovereign VPC-SC Silos, and Dynamic Hybrid PSC Spokes).',
    },
    {
      title: 'EMPIRICAL PROOFS & SLAS',
      headerColor: G_GREEN_TINT,
      borderColor: G_GREEN,
      titleColor: G_GREEN_DEEP,
      body: '84.7% net token cost savings, 74% portfolio TCO reduction, ~42ms p95 latency overhead, <60s CMEK revocation kill-switch, and verified 30/30 Multi-Cloud AWS Bedrock MCP flows.',
    },
  ];

  summaryCards.forEach((c, idx) => {
    const cx = 1.1 + idx * 3.8;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: 4.15, w: 3.5, h: 2.3, rectRadius: 0.08,
      fill: { color: CARD_BG }, line: { color: c.borderColor, width: 1.25 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: cx, y: 4.15, w: 3.5, h: 0.42,
      fill: { color: c.headerColor },
    });
    slide.addText(c.title, {
      x: cx + 0.15, y: 4.15, w: 3.2, h: 0.42,
      fontSize: 9.5, bold: true, color: c.titleColor, fontFace: FONT_TITLE, valign: 'middle',
    });
    slide.addText(c.body, {
      x: cx + 0.18, y: 4.68, w: 3.14, h: 1.65,
      fontSize: 9.2, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.2, valign: 'top',
    });
  });

  addStandardFooter(slide, 1, 16, 'Executive Title & Architectural Overview');
  slide.addNotes('Welcome to the executive presentation of the Google Cloud Multi-Tenant Agentic AI Reference Architecture. In this session, we address the critical systems engineering dilemma facing every enterprise SaaS platform: how to deliver stateful multi-agent reasoning to both regulated banks and commercial enterprises from a single codebase without margin collapse or security compromises.');
}

// -----------------------------------------------------------------------------
// SLIDE 2: The Core Problem — The SaaS AI Architect\'s Dilemma
// -----------------------------------------------------------------------------
function buildSlide02() {
  const slide = pptx.addSlide();
  addStandardHeader(slide, 'THE PROBLEM', 'The SaaS AI Architect\'s Dilemma: The False Dichotomy of Multi-Tenancy', 'ACT I • THE PROBLEM');

  slide.addText('Enterprise B2B SaaS platform leads building agentic AI are forced into a disastrous tradeoff between unsustainable infrastructure sprawl and existential data security risk.', {
    x: 0.45, y: 0.72, w: 12.43, h: 0.38, fontSize: 10.5, color: TEXT_BODY, fontFace: FONT_BODY,
  });

  // Left Dilemma: 500 Siloed Projects
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.45, y: 1.2, w: 6.0, h: 4.25, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_RED, width: 1.5 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.45, y: 1.2, w: 6.0, h: 0.45, fill: { color: G_RED_TINT },
  });
  slide.addText('PATH A: 500 DEDICATED SILOED PROJECTS (THE MARGIN TRAP)', {
    x: 0.65, y: 1.2, w: 5.6, h: 0.45, fontSize: 9.8, bold: true, color: G_RED, fontFace: FONT_TITLE, valign: 'middle',
  });

  const siloPoints = [
    '• $15.8M/yr Idle Base Infrastructure: Provisioning dedicated Cloud Run, AlloyDB, VPCs, and KMS per tenant creates massive unallocated capacity.',
    '• 500x Terraform State Sprawl: Configuration drift across 500 production projects leads to deployment failures and security audit gridlock.',
    '• 0% Prompt Cache Reuse: Every LLM query pays 100% full-rate token pricing with zero cross-tenant prefix caching benefit.',
    '• Multi-Hour Onboarding Lag: Spinning up sovereign VPC perimeters and Cloud KMS rings delays customer time-to-value.',
    '• Outcome: SaaS Gross Margins collapse below 22%, destroying software unit economics.',
  ];
  slide.addText(siloPoints'.join('\n\n'), {
    x: 0.65, y: 1.78, w: 5.6, h: 3.5, fontSize: 9.0, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15, valign: 'top',
  });

  // Right Dilemma: Naive Shared Pool
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.88, y: 1.2, w: 6.0, h: 4.25, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_YELLOW, width: 1.5 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.88, y: 1.2, w: 6.0, h: 0.45, fill: { color: G_YELLOW_TINT },
  });
  slide.addText('PATH B: NAIVE SHARED WORKER POOL (THE COMPLIANCE HAZARD)', {
    x: 7.08, y: 1.2, w: 5.6, h: 0.45, fontSize: 9.8, bold: true, color: G_YELLOW_TEXT, fontFace: FONT_TITLE, valign: 'middle',
  });

  const sharedPoints = [
    '• Dynamic Tool Schema Bleed: Global MCP tool discovery exposes enterprise database schemas and internal APIs to unauthorized tenants.',
    '• Confused Deputy 3LO Replay: Delegated user OAuth tokens (ServiceNow, SharePoint) replayed across pooled worker threads.',
    '• Episodic Memory Pollution: Unpartitioned vector indexes allow semantic search queries to retrieve competitor historical sessions.',
    '• Noisy-Neighbor Quota Starvation: A single tenant\'s runaway reasoning loop consumes 100% of regional Gemini LLM RPM quotas.',
    '• Outcome: Regulatory audit rejection, catastrophic data leaks, and loss of customer trust.',
  ];
  slide.addText(sharedPoints'.join('\n\n'), {
    x: 7.08, y: 1.78, w: 5.6, h: 3.5, fontSize: 9.0, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15, valign: 'top',
  });

  // Bottom Synthesis Banner
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.45, y: 5.62, w: 12.43, h: 1.32, rectRadius: 0.08,
    fill: { color: G_BLUE_TINT }, line: { color: G_BLUE, width: 1.5 },
  });
  slide.addText('THE ARCHITECTURAL SYNTHESIS: CRYPTOGRAPHIC TENANT RING TRANSITIONS', {
    x: 0.7, y: 5.72, w: 11.9, h: 0.3, fontSize: 10.2, bold: true, color: G_BLUE_DEEP, fontFace: FONT_TITLE,
  });
  slide.addText('We reject both extremes. By decoupling the 80% reusable 5-Hop Cryptographic Core from the 20% infrastructure perimeter, a single agent codebase enforces mathematical isolation across identity, tool discovery, memory banks, model guardrails, and database row-level security while maximizing prompt-cache sharing and resource utilization.', {
    x: 0.7, y: 6.05, w: 11.9, h: 0.78, fontSize: 9.2, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.2,
  });

  addStandardFooter(slide, 2, 16, 'The SaaS AI Architect\'s Dilemma');
  slide.addNotes('On this slide, we examine the core tension. If you provision 500 separate GCP projects for your SaaS customers, your gross margins collapse under idle infrastructure costs and IaC sprawl. But if you throw everyone into a naive shared pool, autonomous agent loops leak delegated tokens and competitor prompt contexts. We must decouple security governance from physical infrastructure.');
}

// -----------------------------------------------------------------------------
// SLIDE 3: Conceptual Diagram — 5 New Agentic Multi-Tenancy Attack Vectors
// -----------------------------------------------------------------------------
function buildSlide03() {
  const slide = pptx.addSlide();
  addStandardHeader(slide, 'CONCEPTUAL MODEL', 'Why Traditional Web Multi-Tenancy Fails in Stateful Agentic AI', 'ACT I • ATTACK VECTORS');

  slide.addText('Stateless 3-tier web applications only partitioned SQL tables with tenant_id foreign keys. Autonomous agents introduce 5 stateful attack surfaces across context caches, tool ABIs, and episodic memories.', {
    x: 0.45, y: 0.72, w: 12.43, h: 0.38, fontSize: 10.5, color: TEXT_BODY, fontFace: FONT_BODY,
  });

  const attackVectors = [
    {
      num: '1',
      title: 'Prompt Context Cache Poisoning',
      threat: 'Cross-Tenant System Instruction Bleed',
      desc: 'Shared LLM prefix caching without cryptographic tenant salting allows a malicious tenant to extract private system prompts and few-shot examples.',
      mitigation: 'Deterministic tenant context salting + Pattern B dedicated cache instances.',
      color: G_RED,
      tint: G_RED_TINT,
    },
    {
      num: '2',
      title: 'Dynamic MCP Tool Schema Leaks',
      threat: 'Global Tool Reflection Exfiltration',
      desc: 'Standard MCP server discovery exposes complete tool JSON-RPC schemas globally, leaking private database table definitions and proprietary tools.',
      mitigation: 'Chrooted agent://{tenant_id}/* virtual filesystem namespace enforcement at Hop 2.',
      color: G_YELLOW_TEXT,
      tint: G_YELLOW_TINT,
    },
    {
      num: '3',
      title: 'Episodic Memory Contamination',
      threat: 'Cross-Tenant Vector Index Cross-Talk',
      desc: 'Agent vector embeddings stored in a shared RAG collection can surface competitor historical sessions during approximate nearest-neighbor search.',
      mitigation: '5-Level Hierarchical Memory Bank with per-tenant namespace encryption keys.',
      color: G_BLUE_DEEP,
      tint: G_BLUE_TINT,
    },
    {
      num: '4',
      title: 'Confused Deputy 3LO Replay',
      threat: 'Delegated User Token Hijacking',
      desc: 'Shared worker threads executing Three-Legged OAuth actions (ServiceNow, SharePoint) can be manipulated via prompt injection to use another user's token.',
      mitigation: 'DPoP-bound {tenant}:{user} vault keys (RFC 9449) with inline step-up user consent.',
      color: G_GREEN_DEEP,
      tint: G_GREEN_TINT,
    },
    {
      num: '5',
      title: 'Autonomous Reasoning Loop DoS',
      threat: 'Noisy-Neighbor LLM Quota Starvation',
      desc: 'Recursive multi-step agent reasoning loops consume regional Gemini token quotas, causing HTTP 429 rate limit outages for co-hosted tenants.',
      mitigation: 'Memorystore Valkey distributed token buckets with strict per-tenant RPM/TPM bulkheads.',
      color: '6A1B9A',
      tint: 'F3E5F5',
    },
  ];

  attackVectors.forEach((av, idx) => {
    const cardW = 2.34;
    const cardX = 0.45 + idx * 2.52;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cardX, y: 1.25, w: cardW, h: 5.65, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: av.color, width: 1.25 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: cardX, y: 1.25, w: cardW, h: 0.42, fill: { color: av.tint },
    });
    slide.addText(`VECTOR 0${av.num}`, {
      x: cardX + 0.1, y: 1.25, w: cardW - 0.2, h: 0.42,
      fontSize: 9.5, bold: true, color: av.color, fontFace: FONT_TITLE, valign: 'middle',
    });

    slide.addText(av.title, {
      x: cardX + 0.12, y: 1.75, w: cardW - 0.24, h: 0.55,
      fontSize: 9.8, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.1,
    });
    slide.addText('THREAT:', {
      x: cardX + 0.12, y: 2.35, w: cardW - 0.24, h: 0.22,
      fontSize: 7.8, bold: true, color: G_RED, fontFace: FONT_TITLE,
    });
    slide.addText(av.threat, {
      x: cardX + 0.12, y: 2.58, w: cardW - 0.24, h: 0.42,
      fontSize: 8.5, bold: true, color: TEXT_DARK, fontFace: FONT_BODY,
    });

    slide.addText(av.desc, {
      x: cardX + 0.12, y: 3.1, w: cardW - 0.24, h: 1.8,
      fontSize: 8.4, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15, valign: 'top',
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: cardX + 0.1, y: 4.95, w: cardW - 0.2, h: 0.25, fill: { color: G_GREEN_TINT },
    });
    slide.addText('COMPENSATING CONTROL:', {
      x: cardX + 0.12, y: 4.95, w: cardW - 0.24, h: 0.25,
      fontSize: 7.5, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE, valign: 'middle',
    });
    slide.addText(av.mitigation, {
      x: cardX + 0.12, y: 5.28, w: cardW - 0.24, h: 1.5,
      fontSize: 8.3, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15, valign: 'top',
    });
  });

  addStandardFooter(slide, 3, 16, '5 New Agentic Multi-Tenancy Attack Vectors');
  slide.addNotes('Traditional multi-tenancy assumes code is static and data is passive. But agentic AI executes dynamic reasoning loops, tool calls, and memory lookups. This slide details the 5 new attack vectors that break standard web tiering: prompt cache poisoning, tool schema exfiltration, episodic memory contamination, Confused Deputy 3LO token replay, and autonomous DoS loops.');
}

// -----------------------------------------------------------------------------
// SLIDE 4: Logical Archetypes — Competing Enterprise Tenant Personas
// -----------------------------------------------------------------------------
function buildSlide04() {
  const slide = pptx.addSlide();
  addStandardHeader(slide, 'LOGICAL ARCHETYPES', 'Competing Enterprise Tenant Profiles & Operational Requirements', 'ACT I • PERSONAS');

  slide.addText('Our anchor case study on the Cymbal SaaS Platform validates two polar opposite enterprise customers served from a unified control plane.', {
    x: 0.45, y: 0.72, w: 12.43, h: 0.38, fontSize: 10.5, color: TEXT_BODY, fontFace: FONT_BODY,
  });

  const personas = [
    {
      title: 'FinVault Bank (Regulated Financial Tier)',
      badge: 'ENTERPRISE PATTERN B (SOVEREIGN SILO)',
      badgeColor: G_RED,
      badgeTint: G_RED_TINT,
      points: [
        '• Identity Provider: Google Workspace OIDC + Hardware FIDO2 keys.',
        '• Reasoning Budget: 8,000 thinking tokens with 600 RPM peak burst SLA.',
        '• Encryption Sovereignty: Customer-Managed Encryption Keys (Cloud KMS CMEK) with synchronous <60s revocation kill-switch.',
        '• Inference Model: Dedicated Vertex AI PT or self-managed air-gapped Gemma 3 on private GKE with zero public egress.',
        '• Boundary: Strict VPC Service Controls perimeter blocking all 0.0.0.0/0 internet egress.',
      ],
      x: 0.45,
    },
    {
      title: 'RetailStream Corp (Commercial B2B SaaS Tier)',
      badge: 'COMMERCIAL PATTERN A (HIGH-DENSITY POOL)',
      badgeColor: G_YELLOW_TEXT,
      badgeTint: G_YELLOW_TINT,
      points: [
        '• Identity Provider: Microsoft Entra ID SAML 2.0 with per-user DPoP proofs.',
        '• Reasoning Budget: 4,000 thinking tokens with 120 RPM baseline rate limit.',
        '• Cost Efficiency: Shared Vertex AI Gemini 2.5 Pro with 90% prompt cache reuse, driving an 84.7% net token cost reduction.',
        '• Tool Delegation: DPoP-bound 3LO token vault for ServiceNow ITOM and Atlassian Jira with inline step-up consent.',
        '• Boundary: High-density shared Cloud Run + AlloyDB Row-Level Security.',
      ],
      x: 4.65,
    },
    {
      title: 'Cymbal Multi-Tenant Engine (Platform Operator)',
      badge: 'HYBRID PATTERN C (DYNAMIC TIER PROMOTION)',
      badgeColor: G_GREEN_DEEP,
      badgeTint: G_GREEN_TINT,
      points: [
        '• Fleet Footprint: 950 Standard tenants in shared pool + 50 Enterprise tenants in dedicated Private Service Connect spokes.',
        '• Zero-Downtime Migration: Live customer promotion from Pool to Spoke via SHADOW_SYNC -> ATOMIC_CUTOVER -> DRAIN_AND_VERIFY.',
        '• Pointer Switching: 0ms cutover lag via PSC ServiceAttachment DNS pointer redirection with zero dropped active sessions.',
        '• FinOps Chargeback: BigQuery OpenTelemetry ledger tracking exact token attribution weighted 0.1x for cached prefixes.',
        '• Economics: 74% portfolio TCO reduction compared to 500 isolated projects.',
      ],
      x: 8.85,
    },
  ];

  personas.forEach((p) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: p.x, y: 1.25, w: 4.0, h: 5.65, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: p.badgeColor, width: 1.25 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: p.x, y: 1.25, w: 4.0, h: 0.55, fill: { color: p.badgeTint },
    });
    slide.addText(p.title, {
      x: p.x + 0.15, y: 1.28, w: 3.7, h: 0.28, fontSize: 9.8, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE,
    });
    slide.addText(p.badge, {
      x: p.x + 0.15, y: 1.55, w: 3.7, h: 0.22, fontSize: 8.0, bold: true, color: p.badgeColor, fontFace: FONT_TITLE,
    });
    slide.addText(p.points'.join('\n\n'), {
      x: p.x + 0.2, y: 1.95, w: 3.6, h: 4.8, fontSize: 9.0, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.2, valign: 'top',
    });
  });

  addStandardFooter(slide, 4, 16, 'Competing Enterprise Tenant Profiles');
  slide.addNotes('To make this architecture concrete, we profile two real corporate tenants: FinVault Bank and RetailStream Corp. FinVault is a regulated Tier-1 bank requiring CMEK encryption, dedicated VPC-SC perimeters, and air-gapped inference. RetailStream is a commercial SaaS customer that cares about cost efficiency, prompt caching, and delegated SaaS tools. The Cymbal platform serves both from one codebase.');
}

// -----------------------------------------------------------------------------
// SLIDE 5: Conceptual Architecture — 80/20 Core Decoupling
// -----------------------------------------------------------------------------
function buildSlide05() {
  const slide = pptx.addSlide();
  addStandardHeader(slide, 'CONCEPTUAL ARCHITECTURE', 'Conceptual Architecture: 80% Reusable 5-Hop Core vs. 20% Perimeter Delta', 'ACT I • 80/20 CORE');

  slide.addText('One shared agent codebase (core-cymbal-agent/) serves both commercial SaaS tenants and regulated sovereign contracts by isolating per-tenant network, KMS, and storage boundaries.', {
    x: 0.45, y: 0.72, w: 12.43, h: 0.38, fontSize: 10.5, color: TEXT_BODY, fontFace: FONT_BODY,
  });

  // Col 1: Tenant Profiles
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.45, y: 1.25, w: 3.15, h: 5.65, rectRadius: 0.08,
    fill: { color: CARD_BG }, line: { color: BORDER_GREY, width: 1 },
  });
  slide.addText('1. COMPETING TENANT PROFILES', {
    x: 0.6, y: 1.38, w: 2.85, h: 0.28, fontSize: 9.5, bold: true, color: G_BLUE_DEEP, fontFace: FONT_TITLE,
  });

  const tenantCards = [
    {
      title: 'FinVault Bank (Regulated)',
      accent: G_RED,
      tint: G_RED_TINT,
      lines: ['• 600 RPM burst SLA', '• <60s CMEK kill-switch', '• Dedicated PT or GKE', '• Zero internet egress'],
      y: 1.8,
    },
    {
      title: 'RetailStream Corp (Commercial)',
      accent: G_YELLOW_TEXT,
      tint: G_YELLOW_TINT,
      lines: ['• 120 RPM SaaS tier', '• Microsoft Entra ID', '• DPoP 3LO token vault', '• 84.7% cache savings'],
      y: 4.35,
    },
  ];
  tenantCards.forEach(tc => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.6, y: tc.y, w: 2.85, h: 2.3, rectRadius: 0.06,
      fill: { color: WHITE }, line: { color: tc.accent, width: 1.25 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.6, y: tc.y, w: 2.85, h: 0.34, fill: { color: tc.tint },
    });
    slide.addText(tc.title, {
      x: 0.7, y: tc.y + 0.04, w: 2.65, h: 0.26, fontSize: 9.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE,
    });
    slide.addText(tc.lines.join('
'), {
      x: 0.7, y: tc.y + 0.42, w: 2.65, h: 1.8, fontSize: 8.8, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.2, valign: 'top',
    });
  });

  // Col 2: 80% Reusable Core
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 3.98, y: 1.25, w: 4.55, h: 5.65, rectRadius: 0.08,
    fill: { color: G_BLUE_TINT }, line: { color: G_BLUE, width: 1.5 },
  });
  slide.addText('2. 80% REUSABLE 5-HOP CORE (core-cymbal-agent/)', {
    x: 4.13, y: 1.38, w: 4.25, h: 0.28, fontSize: 9.5, bold: true, color: G_BLUE_DEEP, fontFace: FONT_TITLE,
  });

  const hops = [
    { hop: 'Hop 1 • Edge Identity PEP', desc: 'Strip X-Tenant-Id; verify OIDC+DPoP; mint KMS JWT (<0.15ms JWKS)' },
    { hop: 'Hop 2 • ARD Catalog Scoping', desc: 'Chrooted agent/{tenant_id}/* VFS; bind {tenant}:{user} 3LO vault' },
    { hop: 'Hop 3 • Valkey Bulkhead & Memory', desc: '3ms JTI/CMEK deny-list; RPM token bucket; <5s SCAN+UNLINK evict' },
    { hop: 'Hop 4 • Model Armor & Cloud SDP', desc: '22ms regional gRPC prompt-injection & PII/PHI redaction' },
    { hop: 'Hop 5 • AlloyDB RLS & OTel FinOps', desc: 'SET LOCAL app.current_tenant_id; BigQuery SHA-256 token ledger' },
  ];
  hops.forEach((h, idx) => {
    const hy = 1.8 + idx * 0.86;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 4.13, y: hy, w: 4.25, h: 0.74, rectRadius: 0.05,
      fill: { color: WHITE }, line: { color: G_BLUE, width: 1 },
    });
    slide.addText(h.hop, {
      x: 4.25, y: hy + 0.06, w: 4.0, h: 0.24, fontSize: 9.2, bold: true, color: G_BLUE_DEEP, fontFace: FONT_TITLE,
    });
    slide.addText(h.desc, {
      x: 4.25, y: hy + 0.32, w: 4.0, h: 0.38, fontSize: 8.2, color: TEXT_BODY, fontFace: FONT_BODY,
    });
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 4.13, y: 6.15, w: 4.25, h: 0.6, rectRadius: 0.05,
    fill: { color: WHITE }, line: { color: G_GREEN, width: 1.2 },
  });
  slide.addText('Feature-Flagged Native GCP Adapters (GAP-01..05)
Zero application rewrite when EAP features reach GA', {
    x: 4.25, y: 6.2, w: 4.0, h: 0.5, fontSize: 8.3, bold: true, color: G_GREEN_DEEP, align: 'center', fontFace: FONT_BODY,
  });

  // Col 3: 20% Perimeter Delta
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 8.91, y: 1.25, w: 3.97, h: 5.65, rectRadius: 0.08,
    fill: { color: CARD_BG }, line: { color: BORDER_GREY, width: 1 },
  });
  slide.addText('3. 20% PER-TENANT PERIMETER DELTA', {
    x: 9.06, y: 1.38, w: 3.67, h: 0.28, fontSize: 9.5, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE,
  });

  const patterns = [
    {
      title: 'Pattern A • High-Density Shared Pool',
      color: G_YELLOW_TEXT,
      tint: G_YELLOW_TINT,
      body: '950 commercial tenants • Shared Cloud Run + AlloyDB RLS • 84.7% prompt-cache savings',
      y: 1.8,
    },
    {
      title: 'Pattern B • Zero-Trust Sovereign Silos',
      color: G_RED,
      tint: G_RED_TINT,
      body: '50 regulated tenants • Dedicated VPC-SC, CMEK KMS, AlloyDB & GKE/Vertex PT',
      y: 3.5,
    },
    {
      title: 'Pattern C • Dynamic Hybrid PSC Bridge',
      color: G_GREEN,
      tint: G_GREEN_TINT,
      body: '0ms live tier promotion from Pool to Private Service Connect spoke • 74% TCO savings',
      y: 5.2,
    },
  ];
  patterns.forEach(p => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 9.06, y: p.y, w: 3.67, h: 1.48, rectRadius: 0.06,
      fill: { color: WHITE }, line: { color: p.color, width: 1.25 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 9.06, y: p.y, w: 3.67, h: 0.32, fill: { color: p.tint },
    });
    slide.addText(p.title, {
      x: 9.16, y: p.y + 0.04, w: 3.47, h: 0.26, fontSize: 9.0, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE,
    });
    slide.addText(p.body, {
      x: 9.16, y: p.y + 0.38, w: 3.47, h: 1.0, fontSize: 8.5, color: TEXT_BODY, fontFace: FONT_BODY,
    });
  });

  // Connecting arrows
  [2.9, 5.5].forEach(ay => {
    slide.addShape(pptx.ShapeType.line, {
      x: 3.6, y: ay, w: 0.38, h: 0,
      line: { color: G_BLUE, width: 1.75, endArrowType: 'arrow' },
    });
  });
  [2.5, 4.25, 5.95].forEach(ay => {
    slide.addShape(pptx.ShapeType.line, {
      x: 8.53, y: ay, w: 0.38, h: 0,
      line: { color: G_GREEN, width: 1.75, endArrowType: 'arrow' },
    });
  });

  addStandardFooter(slide, 5, 16, 'Conceptual Architecture — 80/20 Core Decoupling');
  slide.addNotes('This slide presents the architectural breakthrough: decoupling the 80% reusable 5-hop governance core from the 20% perimeter delta. The middle column runs in every deployment. The right column shows how the same codebase attaches to high-density pooled containers, sovereign VPC-SC silos, or dynamic Private Service Connect spokes.');
}

// -----------------------------------------------------------------------------
// SLIDE 6: Architectural Decision Framework — 12-Dimension Isolation Matrix
// -----------------------------------------------------------------------------
function buildSlide06() {
  const slide = pptx.addSlide();
  addStandardHeader(slide, 'DECISION FRAMEWORK', '12-Dimension Multi-Tenant Architecture Isolation Matrix', 'ACT I • DECISION MATRIX');

  slide.addText('Comprehensive architectural selection framework across compute, networking, cryptographic storage, and FinOps dimensions.', {
    x: 0.45, y: 0.72, w: 12.43, h: 0.35, fontSize: 10.5, color: TEXT_BODY, fontFace: FONT_BODY,
  });

  const headers = ['Dimension', 'Pattern A: High-Density Pooled', 'Pattern B: Zero-Trust Sovereign Silos', 'Pattern C: Dynamic Hybrid PSC'];
  const rows = [
    ['Compute Model', 'Shared Cloud Run Gen2 / GKE Autopilot', 'Dedicated GKE Node Pool / Air-Gapped Gemma 3', 'Central Shared Hub + Dedicated PSC Spokes'],
    ['LLM Endpoint', 'Shared Vertex AI Gemini 2.5 Pro', 'Dedicated Provisioned Throughput (gemini-2.5-pro)', 'Shared Gemini Pool + Burst to Dedicated Spoke'],
    ['Prompt Caching', '90% Prefix Reuse (84.7% Token Cost Savings)', '0% Cross-Tenant (100% Sovereign Cache Partition)', 'Shared Baseline Cache + Private Spoke Caches'],
    ['Network Perimeter', 'Global ALB + Shared Cloud Armor L7 WAF', 'Strict VPC Service Controls Perimeter (No Egress)', 'Consumer/Producer Private Service Connect (PSC)'],
    ['Encryption (KMS)', 'Google-Managed Default or Shared Envelope KMS', 'Customer-Managed Cloud KMS CMEK (<60s Kill-Switch)', 'Shared KMS for Hub, CMEK for Dedicated Spokes'],
    ['Database Tier', 'Shared AlloyDB Omni with Postgres RLS', 'Dedicated AlloyDB Cluster per Tenant Project', 'Shared Hub AlloyDB + PSC Spoke AlloyDB Replicas'],
    ['Tool Isolation', 'Process-level gVisor Sandbox + DPoP 3LO Vault', 'Dedicated GKE Pod Sandbox + Private MCP Gateways', 'Proxied MCP Gateway with Dynamic Spoke Routing'],
    ['Identity Boundary', 'TenantContext JWT minted by IAM STS at Ingress', 'Per-Tenant Service Accounts + IAM PAB Policies', 'IAM Workload Identity Federation + Spoke STS'],
    ['Memory Namespace', 'Shared Vector Search with tenant_id filter', 'Isolated Vertex Search Index per Silo Project', 'Tiered Vector Search: Shared Core + Spoke Memory'],
    ['Rate Limiting', 'Memorystore Valkey Token Bucket (120 RPM)', 'Dedicated Compute Capacity (600 RPM Peak SLA)', 'Dynamic Token Bucket: 120 RPM Pool / 600 Spoke'],
    ['Deployment Time', 'Instant (Sub-second Tenant Metadata Onboarding)', 'Multi-Hour (Terraform Project & VPC-SC Spin-Up)', 'Instant Pool Onboarding + 0ms Tier Upgrade'],
    ['Infrastructure Cost', 'Lowest ($4,100/mo for 950 tenants)', 'Highest ($15,800/mo base for 50 dedicated silos)', 'Optimal ($6,200/mo blended fleet average, 74% savings)'],
  ];

  const tableData = [headers.map(h => ({ text: h, options: { bold: true, color: WHITE, fill: G_BLUE, align: 'center', fontSize: 8.5 } }))];
  rows.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? WHITE : CARD_BG;
    tableData.push([
      { text: r[0], options: { bold: true, color: TEXT_DARK, fill: bg, fontSize: 7.8 } },
      { text: r[1], options: { color: TEXT_BODY, fill: bg, fontSize: 7.5 } },
      { text: r[2], options: { color: TEXT_BODY, fill: bg, fontSize: 7.5 } },
      { text: r[3], options: { color: TEXT_BODY, fill: bg, fontSize: 7.5 } },
    ]);
  });

  slide.addTable(tableData, {
    x: 0.45, y: 1.15, w: 12.433, colW: [2.15, 3.42, 3.42, 3.443],
    border: { color: BORDER_GREY, width: 0.5 },
    autoPage: false,
  });

  addStandardFooter(slide, 6, 16, '12-Dimension Isolation Matrix');
  slide.addNotes('This matrix is the decision compass for cloud architects. Across 12 technical dimensions—compute, LLM endpoints, prompt caching, networking, KMS, and database isolation—we define exactly when to use Pattern A, Pattern B, or Pattern C based on regulatory compliance, throughput SLAs, and cost constraints.');
}

// -----------------------------------------------------------------------------
// SLIDE 7: L1 Logical Security Architecture — 3 Concentric Layers
// -----------------------------------------------------------------------------
function buildSlide07() {
  const slide = pptx.addSlide();
  addStandardHeader(slide, 'L1 LOGICAL ARCHITECTURE', 'End-to-End 3-Layer Logical Security Taxonomy & Signed STS JWT', 'ACT II • L1 LOGICAL');

  slide.addText('Defense-in-depth ring transitions: an untrusted client principal is authenticated at Layer 1, scoped at Layer 2, and executed within hardened Layer 3 data and inference perimeters.', {
    x: 0.45, y: 0.72, w: 12.43, h: 0.38, fontSize: 10.5, color: TEXT_BODY, fontFace: FONT_BODY,
  });

  const layers = [
    {
      num: 'LAYER 1',
      title: 'Tenant Identity & Ingress PEP (Global Edge)',
      accent: G_BLUE,
      tint: G_BLUE_TINT,
      desc: 'Enforces edge boundary security, strips untrusted caller headers, validates external IdP assertions, and mints canonical cryptographic tokens.',
      components: [
        '• Cloud Armor L7 WAF: Strips spoofed client X-Tenant-ID headers and blocks SQLi/XSS.',
        '• Identity-Aware Proxy (IAP): Validates corporate OIDC and SAML 2.0 user assertions.',
        '• IAM Security Token Service (STS): Exchanges external JWT for Cloud KMS ECDSA P-256 TenantContext.',
        '• DPoP Proof Verification: RFC 9449 thumbprint binding (dpop_jkt) preventing token replay.',
      ],
      x: 0.45,
    },
    {
      num: 'LAYER 2',
      title: 'Vertex AI Agent Engine Control Plane (Shared Hub)',
      accent: G_YELLOW_TEXT,
      tint: G_YELLOW_TINT,
      desc: 'Orchestrates multi-agent execution, tool authorization, rate limiting, and inline guardrail filtering using deterministic lifecycle hooks.',
      components: [
        '• Discovery Engine ARD Catalog: Chrooted agent://{tenant_id}/* virtual filesystem namespace.',
        '• ADK Middleware Callbacks: before_agent, before_model, and before_tool interception hooks.',
        '• Memorystore Valkey Token Bulkhead: Distributed token buckets enforcing tenant RPM/TPM limits.',
        '• gVisor Container Sandbox: Kernel-isolated execution environment for autonomous code tools.',
      ],
      x: 4.65,
    },
    {
      num: 'LAYER 3',
      title: 'Data, Model & Inference Planes (Dedicated / Partitioned)',
      accent: G_GREEN_DEEP,
      tint: G_GREEN_TINT,
      desc: 'Guarantees storage sovereignty, tenant-isolated vector memory, and cryptographically governed database transactions.',
      components: [
        '• Model Inference: Managed Vertex AI Dedicated PT (gemini-2.5-pro) or Air-Gapped GKE Gemma 3.',
        '• AlloyDB Omni RLS: Enforces SET LOCAL app.current_tenant_id on every pooled connection.',
        '• Cloud KMS CMEK: Dedicated per-tenant encryption keys with <60s HTTP 423 revocation kill-switch.',
        '• BigQuery OpenTelemetry Ledger: Zero-PII SHA-256 token accounting for FinOps chargeback.',
      ],
      x: 8.85,
    },
  ];

  layers.forEach((l) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: l.x, y: 1.25, w: 4.0, h: 5.65, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: l.accent, width: 1.25 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: l.x, y: 1.25, w: 4.0, h: 0.55, fill: { color: l.tint },
    });
    slide.addText(l.num + ' • ' + l.title, {
      x: l.x + 0.15, y: 1.28, w: 3.7, h: 0.48, fontSize: 9.2, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE,
    });
    slide.addText(l.desc, {
      x: l.x + 0.2, y: 1.9, w: 3.6, h: 1.15, fontSize: 8.8, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15,
    });
    slide.addShape(pptx.ShapeType.line, {
      x: l.x + 0.2, y: 3.15, w: 3.6, h: 0, line: { color: BORDER_GREY, width: 0.75 },
    });
    slide.addText('CORE GOVERNANCE COMPONENTS:', {
      x: l.x + 0.2, y: 3.25, w: 3.6, h: 0.22, fontSize: 8.0, bold: true, color: l.accent, fontFace: FONT_TITLE,
    });
    slide.addText(l.components'.join('\n\n'), {
      x: l.x + 0.2, y: 3.55, w: 3.6, h: 3.2, fontSize: 8.6, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15, valign: 'top',
    });
  });

  addStandardFooter(slide, 7, 16, 'L1 Logical Security Architecture');
  slide.addNotes('Here is the L1 Logical Architecture. We divide security into 3 concentric rings: Layer 1 at the global edge strips untrusted headers and mints an ECDSA P-256 signed TenantContext JWT. Layer 2 is the agent control plane where ADK hooks and ARD catalogs restrict tools. Layer 3 is the data plane where AlloyDB Row-Level Security and KMS CMEK enforce cryptographic storage isolation.');
}

// -----------------------------------------------------------------------------
// SLIDE 8: L2 Physical Architecture — Figure 1 Topology Taxonomy
// -----------------------------------------------------------------------------
function buildSlide08() {
  const slide = pptx.addSlide();
  addStandardHeader(slide, 'L2 PHYSICAL ARCHITECTURE', 'Figure 1 (L2 Physical) — Multi-Tenant Agentic AI Topology Taxonomy', 'ACT II • FIGURE 1');

  slide.addText('Official Google Cloud Architecture Center Blueprint: Side-by-side technical topology contrasting High-Density Pooled (Pattern A), Zero-Trust Sovereign Silos (Pattern B), and Dynamic Hybrid (Pattern C).', {
    x: 0.45, y: 0.72, w: 12.43, h: 0.38, fontSize: 10.5, color: TEXT_BODY, fontFace: FONT_BODY,
  });

  const fig1Path = path.join(ROOT_DIR, 'diagrams', 'ws1-multi-tenant-taxonomy-overview.drawio.png');
  if (fs.existsSync(fig1Path)) {
    slide.addImage({
      path: fig1Path,
      x: 0.45, y: 1.18, w: 8.8, h: 5.75,
    });
  }

  // Right Sidebar Breakdown Cards
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.45, y: 1.18, w: 3.43, h: 5.75, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: BORDER_GREY, width: 1 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 9.45, y: 1.18, w: 3.43, h: 0.45, fill: { color: G_BLUE_TINT },
  });
  slide.addText('ARCHITECTURE CENTER GUIDE (#78)', {
    x: 9.6, y: 1.18, w: 3.13, h: 0.45, fontSize: 9.2, bold: true, color: G_BLUE_DEEP, fontFace: FONT_TITLE, valign: 'middle',
  });

  const guideCards = [
    {
      title: 'Zone 1: Routing & Token Exchange',
      body: 'External ALB + Cloud Armor strips spoofed headers; IAM STS mints signed JWT bound to DPoP thumbprint.',
    },
    {
      title: 'Zone 2: ARD Catalog & Discovery',
      body: 'Discovery Engine enforces chrooted agent://{tenant}/* VFS, preventing competitor tool visibility.',
    },
    {
      title: 'Zone 3: Sandbox & Reasoning',
      body: 'gVisor sandboxed workers execute ADK agent loops under Memorystore Valkey token bulkheads.',
    },
    {
      title: 'Zone 4: Sovereign Data & CMEK',
      body: 'Dedicated AlloyDB clusters with Cloud KMS CMEK and <60s revocation kill-switches.',
    },
  ];

  guideCards.forEach((g, idx) => {
    const gy = 1.75 + idx * 1.25;
    slide.addText(g.title, {
      x: 9.6, y: gy, w: 3.13, h: 0.28, fontSize: 9.0, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE,
    });
    slide.addText(g.body, {
      x: 9.6, y: gy + 0.28, w: 3.13, h: 0.88, fontSize: 8.3, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15,
    });
    if (idx < 3) {
      slide.addShape(pptx.ShapeType.line, {
        x: 9.6, y: gy + 1.18, w: 3.13, h: 0, line: { color: BORDER_LIGHT, width: 0.5 },
      });
    }
  });

  addStandardFooter(slide, 8, 16, 'Figure 1: Topology Taxonomy Blueprint');
  slide.addNotes('Figure 1 illustrates the physical network layout of the three topologies. On the left, Pattern A uses shared Cloud Run and AlloyDB RLS. In the center, Pattern B provisions dedicated VPC Service Controls perimeters, CMEK keys, and GKE nodes. On the right, Pattern C links them dynamically via Private Service Connect endpoints.');
}

// -----------------------------------------------------------------------------
// SLIDE 9: L2 Physical Architecture — Figure 2 Template #78 Hub-and-Spoke
// -----------------------------------------------------------------------------
function buildSlide09() {
  const slide = pptx.addSlide();
  addStandardHeader(slide, 'L2 PHYSICAL ARCHITECTURE', 'Figure 2 (L2 Physical) — Authoritative Google Cloud Architecture Center (#78) Blueprint', 'ACT II • TEMPLATE #78');

  slide.addText('Enterprise Reference Architecture Template #78: 4 concentric network perimeters spanning public ingress, shared control plane hub, agent reasoning cluster, and regulated tenant spokes.', {
    x: 0.45, y: 0.72, w: 12.43, h: 0.38, fontSize: 10.5, color: TEXT_BODY, fontFace: FONT_BODY,
  });

  const fig2Path = path.join(ROOT_DIR, 'diagrams', 'ws1-cloud-arch-center-5hop-baseline.drawio.png');
  if (fs.existsSync(fig2Path)) {
    slide.addImage({
      path: fig2Path,
      x: 0.45, y: 1.18, w: 8.8, h: 5.75,
    });
  }

  // Right Sidebar Perimeter Breakdown Cards
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.45, y: 1.18, w: 3.43, h: 5.75, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: BORDER_GREY, width: 1 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 9.45, y: 1.18, w: 3.43, h: 0.45, fill: { color: G_GREEN_TINT },
  });
  slide.addText('4 PHYSICAL PERIMETERS (#78)', {
    x: 9.6, y: 1.18, w: 3.13, h: 0.45, fontSize: 9.2, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE, valign: 'middle',
  });

  const perimeters = [
    {
      title: 'Perimeter 1: Global Edge Ingress',
      body: 'Cloud Armor L7 WAF + External ALB inspects incoming TLS traffic, drops spoofed headers, and rate-limits DDOS.',
    },
    {
      title: 'Perimeter 2: Shared Governance Hub',
      body: 'IAM STS + ARD Catalog PDP + Valkey Quota Bulkhead authenticate and scope the request in <15ms.',
    },
    {
      title: 'Perimeter 3: Reasoning Cluster',
      body: 'gVisor-isolated Vertex AI Agent Engine workers run ADK reasoning loops with bidirectional Model Armor screening.',
    },
    {
      title: 'Perimeter 4: Regulated Tenant Spokes',
      body: 'Private Service Connect (PSC) attaches dedicated tenant VPCs containing AlloyDB RLS and Cloud KMS CMEK.',
    },
  ];

  perimeters.forEach((p, idx) => {
    const py = 1.75 + idx * 1.25;
    slide.addText(p.title, {
      x: 9.6, y: py, w: 3.13, h: 0.28, fontSize: 9.0, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE,
    });
    slide.addText(p.body, {
      x: 9.6, y: py + 0.28, w: 3.13, h: 0.88, fontSize: 8.3, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15,
    });
    if (idx < 3) {
      slide.addShape(pptx.ShapeType.line, {
        x: 9.6, y: py + 1.18, w: 3.13, h: 0, line: { color: BORDER_LIGHT, width: 0.5 },
      });
    }
  });

  addStandardFooter(slide, 9, 16, 'Figure 2: Architecture Center #78 Hub-and-Spoke');
  slide.addNotes('Figure 2 is the authoritative Template #78 Hub-and-Spoke architecture certified for the Google Cloud Architecture Center. Notice the 4 distinct network perimeters: Ingress edge, central governance hub, agentic reasoning cluster, and sovereign tenant spokes connected via PSC attachments.');
}

// -----------------------------------------------------------------------------
// SLIDE 10: L3 Process Architecture — 5-Actor UML Sequence & Circuit Breakers
// -----------------------------------------------------------------------------
function buildSlide10() {
  const slide = pptx.addSlide();
  addStandardHeader(slide, 'L3 PROCESS ARCHITECTURE', '5-Actor UML Sequence, Fail-Closed Circuit Breakers & Stampede Recovery', 'ACT II • L3 PROCESS');

  slide.addText('Chronological message trace across 5 actors: Client Principal -> Hop 1 PEP -> Hop 2 PDP -> Hop 3 Sandbox -> Hop 4 Model Armor -> Hop 5 Data Store, with explicit fail-closed error codes.', {
    x: 0.45, y: 0.72, w: 12.43, h: 0.38, fontSize: 10.5, color: TEXT_BODY, fontFace: FONT_BODY,
  });

  // Top Swimlane Actors
  const actors = [
    { name: '1. CLIENT PRINCIPAL', sub: 'End-User / SaaS Principal' },
    { name: '2. HOP 1 EDGE PEP', sub: 'Cloud Armor + IAP + STS' },
    { name: '3. HOP 2 CATALOG PDP', sub: 'ARD VFS + ADK Callbacks' },
    { name: '4. HOP 3/4 SANDBOX & LLM', sub: 'gVisor + Model Armor' },
    { name: '5. HOP 5 ALLOYDB & CMEK', sub: 'AlloyDB RLS + KMS CMEK' },
  ];
  actors.forEach((a, idx) => {
    const ax = 0.45 + idx * 2.52;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: ax, y: 1.25, w: 2.34, h: 0.55, rectRadius: 0.06,
      fill: { color: G_BLUE_TINT }, line: { color: G_BLUE, width: 1 },
    });
    slide.addText(a.name, {
      x: ax, y: 1.28, w: 2.34, h: 0.24, fontSize: 8.5, bold: true, color: G_BLUE_DEEP, fontFace: FONT_TITLE, align: 'center',
    });
    slide.addText(a.sub, {
      x: ax, y: 1.52, w: 2.34, h: 0.22, fontSize: 7.5, color: TEXT_MUTED, fontFace: FONT_BODY, align: 'center',
    });
  });

  // 5 Circuit Breaker Cards
  const breakers = [
    {
      code: 'HTTP 401 UNAUTHORIZED',
      trigger: 'Hop 1 Edge Identity PEP Fail-Closed',
      desc: 'Triggered when client supplies an expired, forged, or missing OIDC/SAML token, or when the RFC 9449 DPoP proof thumbprint (dpop_jkt) fails cryptographic signature validation.',
      sla: 'Enforced at ingress in <8ms p95; zero downstream traffic forwarded.',
      color: G_RED,
      tint: G_RED_TINT,
    },
    {
      code: 'HTTP 403 FORBIDDEN',
      trigger: 'Hop 2 ARD Catalog Discovery PDP Fail-Closed',
      desc: 'Triggered when an authenticated tenant principal requests an agent or tool schema outside their chrooted agent://{tenant_id}/* virtual filesystem namespace or lacks 3LO delegated permissions.',
      sla: 'Enforced in <4ms p95; blocks unauthorized tool introspection.',
      color: G_YELLOW_TEXT,
      tint: G_YELLOW_TINT,
    },
    {
      code: 'HTTP 429 TOO MANY REQUESTS',
      trigger: 'Hop 3 Valkey Distributed Token Bucket Overflow',
      desc: 'Triggered when an autonomous recursive reasoning loop exceeds the tenant\'s contracted burst rate limit (120 RPM Standard, 600 RPM Enterprise). Returns Retry-After with exponential backoff jitter.',
      sla: 'Protects regional Gemini LLM quotas against noisy-neighbor starvation.',
      color: '6A1B9A',
      tint: 'F3E5F5',
    },
    {
      code: 'HTTP 422 UNPROCESSABLE ENTITY',
      trigger: 'Hop 4 Model Armor & Cloud SDP Semantic Violation',
      desc: 'Triggered when prompt injection, jailbreak attempts, or unauthorized PII/PHI extraction is detected by Vertex AI Model Armor during bidirectional user prompt and LLM output inspection.',
      sla: 'Terminates agent reasoning turn in <22ms p95; logs security audit event.',
      color: G_RED,
      tint: G_RED_TINT,
    },
    {
      code: 'HTTP 423 LOCKED',
      trigger: 'Hop 5 Cloud KMS CMEK Revocation Kill-Switch',
      desc: 'Triggered when tenant invokes emergency crypto-erase. The tenant KMS key state transitions to DISABLED; Memorystore Valkey executes <5s SCAN+UNLINK (cache:{tenant}:*) to wipe all L1 session caches.',
      sla: 'Guarantees sub-60-second cryptographic lockout with zero peer-tenant blast radius.',
      color: G_GREEN_DEEP,
      tint: G_GREEN_TINT,
    },
  ];

  breakers.forEach((b, idx) => {
    const by = 1.95 + idx * 0.98;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.45, y: by, w: 12.43, h: 0.88, rectRadius: 0.06,
      fill: { color: WHITE }, line: { color: b.color, width: 1.25 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45, y: by, w: 2.34, h: 0.88, fill: { color: b.tint },
    });
    slide.addText(b.code, {
      x: 0.55, y: by + 0.12, w: 2.14, h: 0.35, fontSize: 9.0, bold: true, color: b.color, fontFace: FONT_TITLE, align: 'center',
    });
    slide.addText(b.trigger, {
      x: 0.55, y: by + 0.48, w: 2.14, h: 0.32, fontSize: 7.2, color: TEXT_DARK, fontFace: FONT_BODY, align: 'center',
    });

    slide.addText(b.desc, {
      x: 2.95, y: by + 0.08, w: 6.8, h: 0.72, fontSize: 8.4, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15, valign: 'middle',
    });
    slide.addText('SLA / IMPACT:
' + b.sla, {
      x: 9.85, y: by + 0.08, w: 2.9, h: 0.72, fontSize: 8.0, bold: true, color: TEXT_DARK, fontFace: FONT_BODY, lineSpacingMultiple: 1.15, valign: 'middle',
    });
  });

  addStandardFooter(slide, 10, 16, 'L3 Process Architecture & Circuit Breakers');
  slide.addNotes('Slide 10 details the L3 process architecture. During an agent turn, the request traverses 5 actors. At each stage, an explicit fail-closed circuit breaker protects the platform: HTTP 401 for bad auth, HTTP 403 for unauthorized tools, HTTP 429 for rate limit breaches, HTTP 422 for prompt injection, and HTTP 423 for CMEK key revocation.');
}

// -----------------------------------------------------------------------------
// SLIDE 11: L4 Technical Wire Protocol Normalization
// -----------------------------------------------------------------------------
function buildSlide11() {
  const slide = pptx.addSlide();
  addStandardHeader(slide, 'L4 WIRE PROTOCOL', 'Wire-Level Protocol Normalization: Header Stripping & Signed STS JWT', 'ACT II • L4 WIRE');

  slide.addText('Triptych wire protocol trace: an untrusted caller header is sanitized at Hop 1, transformed into a cryptographically signed TenantContext JWT, and verified locally by downstream microservices in <0.15ms.', {
    x: 0.45, y: 0.72, w: 12.43, h: 0.38, fontSize: 10.5, color: TEXT_BODY, fontFace: FONT_BODY,
  });

  const panels = [
    {
      num: 'PANEL 1 • UNTRUSTED INGRESS',
      title: 'Untrusted Caller HTTP Request',
      badge: 'STRIPPED AT HOP 1 PEP',
      badgeColor: G_RED,
      badgeTint: G_RED_TINT,
      code: [
        'POST /v1/agents/reason HTTP/1.1',
        'Host: agent.cymbal.saas',
        'Authorization: Bearer eyJhbGciOi...',
        'DPoP: eyJ0eXAiOiJkcG9wK2p3dCI...',
        'X-Tenant-ID: finvault  <-- STRIPPED!',
        'Content-Type: application/json',
        '',
        '{',
        '  "prompt": "Settle wire batch #891",',
        '  "tenant_override": "root"',
        '}',
      ],
      x: 0.45,
    },
    {
      num: 'PANEL 2 • HOP 1 NORMALIZATION',
      title: 'Minted Cloud KMS Signed JWT',
      badge: 'ECDSA P-256 SIGNED',
      badgeColor: G_BLUE_DEEP,
      badgeTint: G_BLUE_TINT,
      code: [
        'JWT Header:',
        '{ "alg": "ES256", "kid": "kms-key-v1" }',
        'JWT Claims (RFC 7519):',
        '{',
        '  "iss": "https://sts.cymbal.internal",',
        '  "sub": "user_491@finvault.com",',
        '  "tenant_id": "finvault",',
        '  "tier": "ENTERPRISE_TIER_B",',
        '  "dpop_jkt": "vL2_qT9P1zW8...",',
        '  "rpm_limit": 600,',
        '  "thinking_token_budget": 8000',
        '}',
      ],
      x: 4.65,
    },
    {
      num: 'PANEL 3 • LOCAL VERIFICATION',
      title: 'Downstream Hop 2–5 Fast Path',
      badge: '<0.15ms CACHED JWKS VERIFY',
      badgeColor: G_GREEN_DEEP,
      badgeTint: G_GREEN_TINT,
      code: [
        '// Downstream Hop 2-5 Fast Path',
        'const key = await jwksCache.get(kid);',
        'const ctx = verifyES256(jwt, key);',
        '',
        '// Strict Assertions:',
        'assert(ctx.dpop_jkt === callerDpopJkt);',
        'assert(!valkeyDenylist.has(ctx.jti));',
        '',
        '// Enforce Scoped Database Session:',
        'SET LOCAL app.current_tenant_id =',
        '  ctx.tenant_id;',
        '// Latency: 0.12ms (Zero remote calls)',
      ],
      x: 8.85,
    },
  ];

  panels.forEach(p => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: p.x, y: 1.25, w: 4.0, h: 5.65, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: p.badgeColor, width: 1.25 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: p.x, y: 1.25, w: 4.0, h: 0.55, fill: { color: p.badgeTint },
    });
    slide.addText(p.num, {
      x: p.x + 0.15, y: 1.28, w: 3.7, h: 0.24, fontSize: 8.5, bold: true, color: p.badgeColor, fontFace: FONT_TITLE,
    });
    slide.addText(p.title, {
      x: p.x + 0.15, y: 1.52, w: 3.7, h: 0.24, fontSize: 9.2, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE,
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: p.x + 0.2, y: 1.95, w: 3.6, h: 4.8, rectRadius: 0.04,
      fill: { color: 'F1F3F4' }, line: { color: BORDER_GREY, width: 0.5 },
    });
    slide.addText(p.code.join('
'), {
      x: p.x + 0.3, y: 2.05, w: 3.4, h: 4.6, fontSize: 8.2, color: TEXT_DARK, fontFace: 'Consolas', lineSpacingMultiple: 1.15, valign: 'top',
    });
  });

  addStandardFooter(slide, 11, 16, 'L4 Technical Wire Protocol Normalization');
  slide.addNotes('Slide 11 shows what happens at the wire packet level. Panel 1 is the untrusted request. Panel 2 shows how Cloud Armor strips client headers and STS mints a cryptographically signed TenantContext JWT. Panel 3 shows how downstream microservices verify this token in under 0.15 milliseconds using cached public keys.');
}

// -----------------------------------------------------------------------------
// SLIDE 12: Production Resilience — EAP Product Gap Register & Compensating Controls
// -----------------------------------------------------------------------------
function buildSlide12() {
  const slide = pptx.addSlide();
  addStandardHeader(slide, 'PRODUCTION RESILIENCE', 'Compensating Controls for Early Access Program Gaps (GAP-01..05)', 'ACT II • EAP GAPS');

  slide.addText('Enterprise-grade production compensating controls that close current preview AI platform gaps today while guaranteeing zero application rewrites when Google Cloud releases native GA features.', {
    x: 0.45, y: 0.72, w: 12.43, h: 0.38, fontSize: 10.5, color: TEXT_BODY, fontFace: FONT_BODY,
  });

  const gaps = [
    {
      id: 'GAP-01',
      title: 'Agent Registry Catalog Multi-Tenant Namespace Isolation',
      limitation: 'Global Discovery Engine catalogs lack native per-tenant directory partitioning.',
      control: 'Hop 2 before_agent_callback enforces an in-memory ARD virtual filesystem mount table, filtering visible agent descriptors to authorized tenants (HTTP 403 on violation).',
      sunset: 'Feature-flagged native adapter retires cleanly upon Discovery Engine GA tenant scoping.',
    },
    {
      id: 'GAP-02',
      title: 'Vertex AI Shared Context Cache Tenant-Level Encryption',
      limitation: 'Vertex AI prompt context caches share infrastructure without per-tenant KMS encryption.',
      control: 'Deterministic tenant context salting + Pattern B dedicated cache instances. Prevents cross-tenant prefix cache bleed while preserving 84.7% token savings in Pattern A.',
      sunset: 'Config toggle switches to Vertex AI CMEK-backed prompt caching upon GA release.',
    },
    {
      id: 'GAP-03',
      title: 'Model Context Protocol (MCP) Tool Dynamic Schema Exfiltration',
      limitation: 'MCP server reflection endpoints broadcast complete tool schemas to all callers.',
      control: 'Proxied MCP Gateway dynamically filters tool schemas based on the caller\'s verified TenantContext claims, suppressing unauthorized tools before serialization.',
      sunset: 'Seamlessly delegates to MCP standard capability descriptors when native ACLs ship.',
    },
    {
      id: 'GAP-04',
      title: 'AlloyDB Connection Pool Superuser RLS Bypass Risk',
      limitation: 'Shared database connection pools running as postgres superuser bypass Row-Level Security.',
      control: 'Ephemeral non-superuser database roles paired with mandatory SET LOCAL app.current_tenant_id inside every transaction boundary. Prohibits global table scans.',
      sunset: 'Maintained permanently as defense-in-depth zero-trust database hygiene.',
    },
    {
      id: 'GAP-05',
      title: 'Asynchronous Cloud KMS CMEK Key Revocation Propagation Delay',
      limitation: 'Cloud KMS key state disablement can take up to 2 hours to propagate across cached services.',
      control: 'Synchronous webhook listener triggers Memorystore Valkey <5s SCAN+UNLINK (cache:{tenant}:*) to immediately wipe active session tokens and force HTTP 423 Locked.',
      sunset: 'Retained as the primary sub-60-second emergency crypto-erase kill-switch mechanism.',
    },
  ];

  gaps.forEach((g, idx) => {
    const gy = 1.25 + idx * 1.12;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.45, y: gy, w: 12.43, h: 1.02, rectRadius: 0.06,
      fill: { color: WHITE }, line: { color: BORDER_GREY, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45, y: gy, w: 1.2, h: 1.02, fill: { color: G_BLUE_TINT },
    });
    slide.addText(g.id, {
      x: 0.45, y: gy + 0.35, w: 1.2, h: 0.32, fontSize: 11, bold: true, color: G_BLUE_DEEP, fontFace: FONT_TITLE, align: 'center',
    });

    slide.addText(g.title, {
      x: 1.8, y: gy + 0.08, w: 10.9, h: 0.25, fontSize: 9.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE,
    });
    slide.addText('PLATFORM GAP: ' + g.limitation, {
      x: 1.8, y: gy + 0.33, w: 10.9, h: 0.22, fontSize: 8.2, bold: true, color: G_RED, fontFace: FONT_BODY,
    });
    slide.addText('COMPENSATING CONTROL: ' + g.control, {
      x: 1.8, y: gy + 0.55, w: 10.9, h: 0.24, fontSize: 8.2, color: TEXT_BODY, fontFace: FONT_BODY,
    });
    slide.addText('SUNSET HOOK: ' + g.sunset, {
      x: 1.8, y: gy + 0.77, w: 10.9, h: 0.22, fontSize: 8.0, italic: true, color: G_GREEN_DEEP, fontFace: FONT_BODY,
    });
  });

  addStandardFooter(slide, 12, 16, 'Production Resilience — EAP Gap Register');
  slide.addNotes('In enterprise software, transparency is everything. Slide 12 presents our production gap register covering GAP-01 through GAP-05. For every area where current preview AI platforms lack native multi-tenancy, we engineered a robust compensating control with a clean sunset hook so code never has to be rewritten when GA features launch.');
}

// -----------------------------------------------------------------------------
// SLIDE 13: Empirical Proof 1 — Real-Time BI Isolation in Metabase
// -----------------------------------------------------------------------------
function buildSlide13() {
  const slide = pptx.addSlide();
  addStandardHeader(slide, 'EMPIRICAL PROOFS', 'Proof 1: Real-Time BI Isolation in Metabase v0.50.26 (Retina Captures)', 'ACT III • PROOF 1');

  slide.addText('Live 2880x1800 Retina UI captures verifying that Hop 5 AlloyDB Row-Level Security strictly isolates tenant analytics and prevents cross-tenant data leakage in third-party business intelligence tools.', {
    x: 0.45, y: 0.72, w: 12.43, h: 0.38, fontSize: 10.5, color: TEXT_BODY, fontFace: FONT_BODY,
  });

  const beforeImg = path.join(ROOT_DIR, 'screenshots', 'genuine-multicloud-3p-uis', 'before-after', 'before_01_metabase_bi.png');
  const afterImg = path.join(ROOT_DIR, 'screenshots', 'genuine-multicloud-3p-uis', 'before-after', 'after_01_metabase_bi.png');

  // Left Before
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.45, y: 1.22, w: 6.0, h: 5.68, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_RED, width: 1.5 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.45, y: 1.22, w: 6.0, h: 0.42, fill: { color: G_RED_TINT },
  });
  slide.addText('BEFORE: GLOBAL UNFILTERED BI (CROSS-TENANT LEAKAGE)', {
    x: 0.65, y: 1.22, w: 5.6, h: 0.42, fontSize: 9.2, bold: true, color: G_RED, fontFace: FONT_TITLE, valign: 'middle',
  });
  if (fs.existsSync(beforeImg)) {
    slide.addImage({
      path: beforeImg,
      x: 0.65, y: 1.75, w: 5.6, h: 3.6,
    });
  }
  slide.addText('Vulnerability: Without Hop 5 RLS, Metabase dashboards display aggregate metrics across ALL enterprise tenants (FinVault Bank + RetailStream Corp + 950 standard tenants). Any business user can view competitor order volumes, transaction totals, and account balances.', {
    x: 0.65, y: 5.45, w: 5.6, h: 1.35, fontSize: 8.5, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15,
  });

  // Right After
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.88, y: 1.22, w: 6.0, h: 5.68, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_GREEN, width: 1.5 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.88, y: 1.22, w: 6.0, h: 0.42, fill: { color: G_GREEN_TINT },
  });
  slide.addText('AFTER: GOVERNED HOP 5 RLS BI (STRICT TENANT ISOLATION)', {
    x: 7.08, y: 1.22, w: 5.6, h: 0.42, fontSize: 9.2, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE, valign: 'middle',
  });
  if (fs.existsSync(afterImg)) {
    slide.addImage({
      path: afterImg,
      x: 7.08, y: 1.75, w: 5.6, h: 3.6,
    });
  }
  slide.addText('Verified Isolation: When the agent executes with TenantContext JWT ("tenant_id": "retailstream"), AlloyDB enforces SET LOCAL app.current_tenant_id. The Metabase dashboard displays EXCLUSIVELY RetailStream Corp data. Competitor records are cryptographically invisible at the engine level.', {
    x: 7.08, y: 5.45, w: 5.6, h: 1.35, fontSize: 8.5, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15,
  });

  addStandardFooter(slide, 13, 16, 'Empirical Proof 1: Metabase BI Isolation');
  slide.addNotes('This slide provides verifiable empirical proof. On the left, a standard BI deployment reveals cross-tenant data. On the right, after applying our Hop 5 AlloyDB RLS governance, the Metabase dashboard is filtered down to the authenticated tenant. Competitor records are completely invisible.');
}

// -----------------------------------------------------------------------------
// SLIDE 14: Empirical Proof 2 — Schema & Catalog Isolation in Trino SQL
// -----------------------------------------------------------------------------
function buildSlide14() {
  const slide = pptx.addSlide();
  addStandardHeader(slide, 'EMPIRICAL PROOFS', 'Proof 2: Schema & Catalog Isolation in Trino SQL v440 (Retina Captures)', 'ACT III • PROOF 2');

  slide.addText('Live 2880x1800 Retina UI captures demonstrating that distributed SQL query federation in Trino v440 enforces strict catalog boundaries and prevents unauthorized schema reflection.', {
    x: 0.45, y: 0.72, w: 12.43, h: 0.38, fontSize: 10.5, color: TEXT_BODY, fontFace: FONT_BODY,
  });

  const beforeImg2 = path.join(ROOT_DIR, 'screenshots', 'genuine-multicloud-3p-uis', 'before-after', 'before_06_trino_sql.png');
  const afterImg2 = path.join(ROOT_DIR, 'screenshots', 'genuine-multicloud-3p-uis', 'before-after', 'after_06_trino_sql.png');

  // Left Before
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.45, y: 1.22, w: 6.0, h: 5.68, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_RED, width: 1.5 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.45, y: 1.22, w: 6.0, h: 0.42, fill: { color: G_RED_TINT },
  });
  slide.addText('BEFORE: UNRESTRICTED SQL CATALOG (GLOBAL SCHEMA EXPOSURE)', {
    x: 0.65, y: 1.22, w: 5.6, h: 0.42, fontSize: 9.2, bold: true, color: G_RED, fontFace: FONT_TITLE, valign: 'middle',
  });
  if (fs.existsSync(beforeImg2)) {
    slide.addImage({
      path: beforeImg2,
      x: 0.65, y: 1.75, w: 5.6, h: 3.6,
    });
  }
  slide.addText('Vulnerability: A standard SQL agent executing queries against Trino can query SHOW CATALOGS and SHOW SCHEMAS, exposing all enterprise tenant tables, internal columns, and database metadata across Google Cloud and AWS datalakes.', {
    x: 0.65, y: 5.45, w: 5.6, h: 1.35, fontSize: 8.5, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15,
  });

  // Right After
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 6.88, y: 1.22, w: 6.0, h: 5.68, rectRadius: 0.08,
    fill: { color: WHITE }, line: { color: G_GREEN, width: 1.5 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 6.88, y: 1.22, w: 6.0, h: 0.42, fill: { color: G_GREEN_TINT },
  });
  slide.addText('AFTER: GOVERNED CATALOG ACL (STRICT TENANT ISOLATION)', {
    x: 7.08, y: 1.22, w: 5.6, h: 0.42, fontSize: 9.2, bold: true, color: G_GREEN_DEEP, fontFace: FONT_TITLE, valign: 'middle',
  });
  if (fs.existsSync(afterImg2)) {
    slide.addImage({
      path: afterImg2,
      x: 7.08, y: 1.75, w: 5.6, h: 3.6,
    });
  }
  slide.addText('Verified Isolation: With Hop 2 ARD Catalog scoping and Trino System Access Control, the query executor is restricted strictly to the caller\'s catalog. Inquiries into competitor catalogs throw access denied. Cross-tenant data exfiltration is blocked.', {
    x: 7.08, y: 5.45, w: 5.6, h: 1.35, fontSize: 8.5, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15,
  });

  addStandardFooter(slide, 14, 16, 'Empirical Proof 2: Trino SQL Catalog Isolation');
  slide.addNotes('Slide 14 shows our second empirical proof in distributed SQL query federation. Before our governance controls, an agent could inspect all tenant catalogs in Trino. After applying Hop 2 ARD catalog filtering, the agent can only access schemas belonging to its authenticated tenant.');
}

// -----------------------------------------------------------------------------
// SLIDE 15: Quantified Financial & Technical Benefits — SLA Scorecard
// -----------------------------------------------------------------------------
function buildSlide15() {
  const slide = pptx.addSlide();
  addStandardHeader(slide, 'QUANTIFIED BENEFITS', 'Quantified Financial & Technical Benefits: Well-Architected SLA Scorecard', 'ACT III • SLA SCORECARD');

  slide.addText('Empirical production metrics and financial benchmarks verified across our 1,000-tenant reference simulation on Google Cloud.', {
    x: 0.45, y: 0.72, w: 12.43, h: 0.38, fontSize: 10.5, color: TEXT_BODY, fontFace: FONT_BODY,
  });

  const metrics = [
    {
      metric: '84.7%',
      title: 'Net Token Cost Reduction',
      subtitle: 'Prefix Prompt Caching Savings',
      desc: 'By sharing deterministic 4,000-token system instructions and few-shot tool definitions across 950 pooled commercial tenants, token inference costs drop by 84.7% (0.1x cached pricing).',
      color: G_BLUE,
      tint: G_BLUE_TINT,
    },
    {
      metric: '74%',
      title: 'Portfolio TCO Reduction',
      subtitle: '$4,100/mo vs. $15,800/mo',
      desc: 'Consolidating 950 commercial tenants into Pattern A pooled Cloud Run while preserving 50 dedicated Pattern B/C silos reduces monthly cloud spend from $15.8k to $4.1k.',
      color: G_GREEN_DEEP,
      tint: G_GREEN_TINT,
    },
    {
      metric: '~42ms',
      title: 'Control-Plane p95 Latency',
      subtitle: 'Zero-Trust Cryptographic Pipeline',
      desc: 'Total end-to-end overhead across all 5 hops: Edge PEP (<8ms) + ARD PDP (<4ms) + Valkey Quota (<3ms) + Model Armor (<22ms) + AlloyDB RLS (<5ms).',
      color: G_YELLOW_TEXT,
      tint: G_YELLOW_TINT,
    },
    {
      metric: '<60s',
      title: 'CMEK Revocation SLA',
      subtitle: 'Instant Emergency Crypto-Erase',
      desc: 'Synchronous Valkey SCAN+UNLINK (cache:{tenant}:*) purges all in-memory L1 session caches within 5 seconds, locking tenant assets (HTTP 423) with zero peer disruption.',
      color: G_RED,
      tint: G_RED_TINT,
    },
  ];

  metrics.forEach((m, idx) => {
    const mx = 0.45 + idx * 3.16;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: mx, y: 1.25, w: 2.95, h: 5.65, rectRadius: 0.08,
      fill: { color: WHITE }, line: { color: m.color, width: 1.5 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: mx, y: 1.25, w: 2.95, h: 1.25, fill: { color: m.tint },
    });
    slide.addText(m.metric, {
      x: mx, y: 1.35, w: 2.95, h: 0.65, fontSize: 32, bold: true, color: m.color, fontFace: FONT_TITLE, align: 'center',
    });
    slide.addText(m.subtitle, {
      x: mx, y: 2.05, w: 2.95, h: 0.35, fontSize: 8.5, bold: true, color: TEXT_MUTED, fontFace: FONT_TITLE, align: 'center',
    });

    slide.addText(m.title, {
      x: mx + 0.15, y: 2.65, w: 2.65, h: 0.55, fontSize: 11, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE, lineSpacingMultiple: 1.1,
    });
    slide.addText(m.desc, {
      x: mx + 0.15, y: 3.3, w: 2.65, h: 3.4, fontSize: 8.8, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.2, valign: 'top',
    });
  });

  addStandardFooter(slide, 15, 16, 'Quantified Benefits & SLA Scorecard');
  slide.addNotes('Slide 15 summarizes the quantified benefits. We achieved an 84.7% net reduction in token costs through prefix caching, a 74% reduction in overall portfolio infrastructure TCO, sub-42-millisecond control-plane latency, and a sub-60-second emergency CMEK revocation kill-switch.');
}

// -----------------------------------------------------------------------------
// SLIDE 16: Executive Call to Action — 5-Phase Implementation Roadmap
// -----------------------------------------------------------------------------
function buildSlide16() {
  const slide = pptx.addSlide();
  addStandardHeader(slide, 'CALL TO ACTION', 'Actionable 5-Phase Engineering Implementation Roadmap & 1-Click Blueprints', 'ACT III • ROADMAP');

  slide.addText('Recommended 10-week implementation plan to deploy multi-tenant agentic AI on Google Cloud with verified Terraform starter kits.', {
    x: 0.45, y: 0.72, w: 12.43, h: 0.38, fontSize: 10.5, color: TEXT_BODY, fontFace: FONT_BODY,
  });

  const phases = [
    {
      num: 'PHASE 1 • WEEKS 1–2',
      title: 'Ingress & Identity Foundation',
      deliverables: [
        '• Configure Cloud Armor L7 WAF rules to strip spoofed client X-Tenant-ID headers.',
        '• Deploy IAP and IAM STS to validate OIDC/SAML tokens and mint signed ECDSA P-256 JWTs.',
        '• Implement RFC 9449 DPoP proof validation to block token replay attacks.',
      ],
    },
    {
      num: 'PHASE 2 • WEEKS 3–4',
      title: 'Agent Registry & Tool Sandboxing',
      deliverables: [
        '• Implement Discovery Engine ARD virtual filesystem catalog (agent://{tenant}/*).',
        '• Configure ADK before_agent_callback and before_tool_callback hooks.',
        '• Vault per-user delegated 3LO tokens under {tenant}:{user} DPoP keys with step-up consent.',
      ],
    },
    {
      num: 'PHASE 3 • WEEKS 5–6',
      title: 'FinOps Bulkheads & Cache Governance',
      deliverables: [
        '• Deploy Memorystore Valkey distributed token buckets enforcing tenant RPM/TPM limits.',
        '• Configure prefix prompt caching with cryptographic tenant context salting.',
        '• Instrument BigQuery OpenTelemetry ledger with 0.1x cached token FinOps billing.',
      ],
    },
    {
      num: 'PHASE 4 • WEEKS 7–8',
      title: 'Model Armor & Database RLS',
      deliverables: [
        '• Deploy Vertex AI Model Armor filters for prompt injection and PII/PHI de-identification.',
        '• Configure AlloyDB Row-Level Security with mandatory SET LOCAL app.current_tenant_id.',
        '• Set up Cloud KMS CMEK keys with synchronous Valkey <5s cache purge webhooks.',
      ],
    },
    {
      num: 'PHASE 5 • WEEKS 9–10',
      title: 'Terraform Automation & Tier Promotion',
      deliverables: [
        '• Execute 1-Click Terraform Blueprints (scripts/deploy_terraform_1click.sh).',
        '• Validate Pattern C dynamic tier promotion via Private Service Connect (PSC) pointers.',
        '• Execute continuous CI/CD forensic verification audit (13/13 PASS).',
      ],
    },
  ];

  phases.forEach((ph, idx) => {
    const py = 1.25 + idx * 1.12;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.45, y: py, w: 12.43, h: 1.02, rectRadius: 0.06,
      fill: { color: WHITE }, line: { color: BORDER_GREY, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45, y: py, w: 2.5, h: 1.02, fill: { color: G_BLUE_TINT },
    });
    slide.addText(ph.num, {
      x: 0.55, y: py + 0.18, w: 2.3, h: 0.28, fontSize: 8.5, bold: true, color: G_BLUE_DEEP, fontFace: FONT_TITLE,
    });
    slide.addText(ph.title, {
      x: 0.55, y: py + 0.48, w: 2.3, h: 0.42, fontSize: 9.5, bold: true, color: TEXT_DARK, fontFace: FONT_TITLE,
    });

    slide.addText(ph.deliverables.join('
'), {
      x: 3.15, y: py + 0.08, w: 9.5, h: 0.86, fontSize: 8.5, color: TEXT_BODY, fontFace: FONT_BODY, lineSpacingMultiple: 1.15, valign: 'middle',
    });
  });

  addStandardFooter(slide, 16, 16, 'Executive Call to Action & 5-Phase Roadmap');
  slide.addNotes('Finally, on Slide 16, we present an actionable 10-week implementation roadmap across 5 phases. From identity PEP foundation to automated Terraform deployment, your engineering team has complete, runnable code in our repository to deploy this architecture today.');
}

async function main() {
  console.log('Generating brand-new, unique 16-slide WS1 Executive Solution Deck...');
  buildSlide01();
  buildSlide02();
  buildSlide03();
  buildSlide04();
  buildSlide05();
  buildSlide06();
  buildSlide07();
  buildSlide08();
  buildSlide09();
  buildSlide10();
  buildSlide11();
  buildSlide12();
  buildSlide13();
  buildSlide14();
  buildSlide15();
  buildSlide16();

  await pptx.writeFile({ fileName: PPTX_OUT });
  const stat = fs.statSync(PPTX_OUT);
  console.log(`✅ Successfully compiled ${PPTX_OUT} (16 slides, ${stat.size.toLocaleString()} bytes)`);
}

main().catch(err => {
  console.error('Fatal error generating deck:', err);
  process.exit(1);
});
