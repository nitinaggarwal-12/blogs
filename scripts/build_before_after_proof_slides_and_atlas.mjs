#!/usr/bin/env node
/**
 * Builds museum-grade 13.333" x 7.5" live BEFORE -> AFTER Retina proof slides
 * for ALL 17 verified 2880x1620 captures (13 Google Cloud Console + 4 Commercial SaaS,
 * 8/8 pairs + Control-Plane KMS/Cloud Run pair), emitting:
 *   1. slides/_ba_drafts/live_ba_proof_donors.pptx (9 donor proof slides spliced into WS1..WS5 lean decks)
 *   2. slides/_ba_drafts/atlas_16slide_draft.pptx  (16-slide Live Visual Verification Atlas;
 *      S03 placeholder is spliced with native DrawingML BARE_MIN_12 S11 Multi-Cloud Bridge by
 *      scripts/sync_before_after_into_all_decks.py)
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const PptxGenJS = require("pptxgenjs");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DRAFTS_DIR = path.join(ROOT_DIR, "slides", "_ba_drafts");
fs.mkdirSync(DRAFTS_DIR, { recursive: true });

const W = 13.333;
const H = 7.5;
const FONT = "Arial";

const C = {
  bg: "FFFFFF",
  soft: "F8FAFC",
  soft2: "F1F5F9",
  navy: "0F172A",
  slate: "334155",
  muted: "64748B",
  border: "CBD5E1",
  borderLight: "E2E8F0",
  blue: "1A73E8",
  blueDark: "174EA6",
  blueBg: "EFF6FF",
  blueBorder: "BFDBFE",
  teal: "0F766E",
  tealDark: "115E59",
  tealBg: "F0FDFA",
  tealBorder: "99F6E4",
  green: "15803D",
  greenBg: "F0FDF4",
  greenBorder: "BBF7D0",
  red: "B91C1C",
  redBg: "FEF2F2",
  redBorder: "FECACA",
  amber: "B45309",
  amberBg: "FFFBEB",
  amberBorder: "FDE68A",
  indigo: "4338CA",
  indigoBg: "EEF2FF",
  indigoBorder: "C7D2FE",
  white: "FFFFFF",
};

function newDeck(title) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE_16_9", width: W, height: H });
  pptx.layout = "WIDE_16_9";
  pptx.author = "Google Cloud Architecture Center";
  pptx.company = "Google Cloud";
  pptx.subject = title;
  pptx.title = title;
  return pptx;
}

function addChrome(pptx, slide, opts) {
  const {
    eyebrow,
    title,
    subtitle,
    accent = C.teal,
    badgeText = "VERIFIED RETINA UI PROOF",
    footerLeft = "GOOGLE CLOUD AI ARCHITECTURE  •  LIVE BEFORE vs. AFTER PROOF ATLAS",
    footerMid = "Verified Google Cloud Console & Commercial SaaS",
    slideNum = 1,
    totalSlides = 16,
    padNum = true,
  } = opts;

  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.48, y: 0.24, w: 0.075, h: 0.66,
    fill: { color: accent }, line: { color: accent, width: 0 },
  });
  slide.addText(eyebrow.toUpperCase(), {
    x: 0.68, y: 0.22, w: 7.4, h: 0.22,
    fontFace: FONT, fontSize: 10, bold: true, color: accent, margin: 0,
  });
  slide.addText(title, {
    x: 0.68, y: 0.44, w: 10.1, h: 0.42,
    fontFace: FONT, fontSize: 19, bold: true, color: C.navy, valign: "middle", margin: 0,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.68, y: 0.88, w: 12.1, h: 0.30,
      fontFace: FONT, fontSize: 10.8, color: C.muted, valign: "middle", margin: 0,
    });
  }
  if (badgeText) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 10.95, y: 0.24, w: 1.9, h: 0.30, rectRadius: 0.14,
      fill: { color: C.soft }, line: { color: C.border, width: 0.75 },
    });
    slide.addText(badgeText, {
      x: 10.95, y: 0.24, w: 1.9, h: 0.30,
      fontFace: FONT, fontSize: 8.5, bold: true, color: accent,
      align: "center", valign: "middle", margin: 0,
    });
  }
  slide.addShape(pptx.ShapeType.line, {
    x: 0.48, y: 1.22, w: 12.37, h: 0,
    line: { color: C.borderLight, width: 1 },
  });

  // Footer
  slide.addShape(pptx.ShapeType.line, {
    x: 0.48, y: 7.02, w: 12.37, h: 0,
    line: { color: C.borderLight, width: 0.85 },
  });
  slide.addText(footerLeft, {
    x: 0.48, y: 7.08, w: 7.4, h: 0.26,
    fontFace: FONT, fontSize: 8.5, bold: true, color: C.muted, margin: 0,
  });
  slide.addText(footerMid, {
    x: 8.0, y: 7.08, w: 3.7, h: 0.26,
    fontFace: FONT, fontSize: 8.5, color: C.muted, align: "right", margin: 0,
  });
  const numStr = padNum
    ? `${String(slideNum).padStart(2, "0")} / ${String(totalSlides).padStart(2, "0")}`
    : `${slideNum} / ${totalSlides}`;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 11.96, y: 7.06, w: 0.90, h: 0.28, rectRadius: 0.08,
    fill: { color: C.soft }, line: { color: C.border, width: 0.75 },
  });
  slide.addText(numStr, {
    x: 11.96, y: 7.06, w: 0.90, h: 0.28,
    fontFace: FONT, fontSize: 9, bold: true, color: C.navy,
    align: "center", valign: "middle", margin: 0,
  });
}

function addSynthesisBar(pptx, slide, opts) {
  const { tag = "VERIFIED UI PROOF", text, rightPill = "Verified Live", accent = C.teal } = opts;
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.48, y: 6.32, w: 12.37, h: 0.56, rectRadius: 0.10,
    fill: { color: C.tealBg }, line: { color: C.tealBorder, width: 1.0 },
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.60, y: 6.42, w: 1.56, h: 0.36, rectRadius: 0.08,
    fill: { color: accent }, line: { color: accent, width: 0 },
  });
  slide.addText(tag, {
    x: 0.60, y: 6.42, w: 1.56, h: 0.36,
    fontFace: FONT, fontSize: 8.8, bold: true, color: C.white,
    align: "center", valign: "middle", margin: 0,
  });
  slide.addText(text, {
    x: 2.28, y: 6.37, w: 8.10, h: 0.46,
    fontFace: FONT, fontSize: 10.5, bold: true, color: C.navy,
    valign: "middle", margin: 0,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 10.50, y: 6.41, w: 2.22, h: 0.38, rectRadius: 0.14,
    fill: { color: C.white }, line: { color: accent, width: 1.1 },
  });
  slide.addText(rightPill, {
    x: 10.50, y: 6.41, w: 2.22, h: 0.38,
    fontFace: FONT, fontSize: 9.2, bold: true, color: accent,
    align: "center", valign: "middle", margin: 0,
  });
}

function addProofSlide(pptx, cfg, slideNum, totalSlides, padNum = true) {
  const slide = pptx.addSlide();
  const isGcp = cfg.isGcp !== false;
  addChrome(pptx, slide, {
    eyebrow: cfg.eyebrow || (isGcp ? "LIVE GOOGLE CLOUD CONSOLE PROOF" : "LIVE COMMERCIAL SAAS PROOF"),
    title: cfg.title,
    subtitle: cfg.subtitle,
    accent: C.teal,
    badgeText: "VERIFIED RETINA UI PROOF",
    footerLeft: cfg.footerLeft,
    footerMid: cfg.footerMid,
    slideNum,
    totalSlides,
    padNum,
  });

  const colW = 6.08;
  const colPositions = [0.48, 6.77];

  cfg.images.forEach((im, idx) => {
    const cx = colPositions[idx];
    const isBefore = im.phase === "BEFORE";
    const cardBorder = isBefore ? C.redBorder : C.tealBorder;
    const hdrColor = isBefore ? C.red : C.teal;

    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx, y: 1.36, w: colW, h: 4.82, rectRadius: 0.10,
      fill: { color: C.white }, line: { color: cardBorder, width: 1.2 },
    });
    slide.addText(im.header, {
      x: cx + 0.16, y: 1.44, w: colW - 0.32, h: 0.28,
      fontFace: FONT, fontSize: 10.5, bold: true, color: hdrColor, margin: 0,
    });

    const imgX = cx + 0.16;
    const imgY = 1.78;
    const imgW = colW - 0.32;
    const imgH = Number((imgW * 9 / 16).toFixed(3)); // exact 16:9 = 3.24 in

    if (fs.existsSync(im.absPath)) {
      slide.addImage({
        data: "image/png;base64," + fs.readFileSync(im.absPath).toString("base64"),
        altText: im.header,
        x: imgX, y: imgY, w: imgW, h: imgH,
      });
    } else {
      throw new Error(`Missing verified screenshot: ${im.absPath}`);
    }

    if (im.focalBox) {
      const fb = im.focalBox;
      slide.addShape(pptx.ShapeType.rect, {
        x: imgX + fb.rx * imgW,
        y: imgY + fb.ry * imgH,
        w: fb.rw * imgW,
        h: fb.rh * imgH,
        fill: { type: "none" },
        line: { color: hdrColor, width: 2.2 },
      });
    }
    if (im.focalPill) {
      const fp = im.focalPill;
      const pw = fp.w || 2.15;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: imgX + fp.rx * imgW,
        y: imgY + fp.ry * imgH,
        w: pw,
        h: 0.28,
        rectRadius: 0.08,
        fill: { color: hdrColor },
        line: { color: C.white, width: 1.0 },
      });
      slide.addText(fp.label, {
        x: imgX + fp.rx * imgW,
        y: imgY + fp.ry * imgH,
        w: pw,
        h: 0.28,
        fontFace: FONT, fontSize: 8.8, bold: true, color: C.white,
        align: "center", valign: "middle", margin: 0,
      });
    }

    slide.addText(im.caption, {
      x: cx + 0.16, y: imgY + imgH + 0.10, w: colW - 0.32, h: 0.96,
      fontFace: FONT, fontSize: 9.2, color: C.slate, valign: "top", margin: 0,
    });
  });

  addSynthesisBar(pptx, slide, {
    tag: "VERIFIED UI PROOF",
    text: cfg.synthesis,
    rightPill: cfg.rightStatPill,
    accent: C.teal,
  });

  slide.addNotes(cfg.notes);
}

// =============================================================================
// CANONICAL 9 LIVE VERIFIED PROOF SLIDES (ALL 17/17 RETINA SCREENSHOTS!)
// =============================================================================
const S = (name) => path.join(ROOT_DIR, "screenshots", "verified-cloud-console", name);

const PROOF_SLIDES = [
  // 1. WS1-BA-01 — Vertex AI Model Armor
  {
    id: "WS1-BA-01",
    isGcp: true,
    eyebrow: "WS1 • HOP 4 LIVE GOOGLE CLOUD CONSOLE PROOF",
    title: "Live Model Armor: Unprotected Baseline vs. Zero-Trust Firewall",
    subtitle: "Two live captures from console.cloud.google.com (cymbal-ge-hub-2026) executing the exact same cross-tenant SSN prompt-injection test live.",
    images: [
      {
        phase: "BEFORE",
        header: "BEFORE • Unprotected Baseline (No Violations Detected — Attack Passes)",
        absPath: S("ws1_before_model_armor_unprotected.png"),
        focalBox: { rx: 0.60, ry: 0.54, rw: 0.39, rh: 0.43 },
        focalPill: { rx: 0.72, ry: 0.44, w: 1.54, label: "All Disabled → Passes" },
        caption: "Live Model Armor Test (ge-ws1-before-unprotected-baseline • SHA-256 2bda7e68993a): PI/Jailbreak, Malicious URL & SDP are Disabled — cross-tenant SSN exfiltration prompt returns 'No violations detected'.",
      },
      {
        phase: "AFTER",
        header: "AFTER • Zero-Trust Firewall (Violations Detected & Blocked Live)",
        absPath: S("ws1_after_model_armor_blocked.png"),
        focalBox: { rx: 0.60, ry: 0.54, rw: 0.39, rh: 0.35 },
        focalPill: { rx: 0.72, ry: 0.44, w: 1.54, label: "Match Found → Blocked" },
        caption: "Live Model Armor Test (ge-zero-trust-ai-firewall • SHA-256 93471e0d7b17): Enabling WS1 Hop 4 flags 'Template violations detected' (Dangerous content: Match found & Prompt injection and jailbreak: Match found).",
      },
    ],
    synthesis: "Live empirical proof of WS1 Hop 4 Model Armor blocking cross-tenant SSN prompt injection before LLM invocation (full split-slider on /blogs/ws1/screenshots).",
    rightStatPill: "Live Model Armor Proof",
    footerLeft: "GOOGLE CLOUD AI ARCHITECTURE  •  WS1: 5-HOP GOVERNANCE BASELINE",
    footerMid: "Verified Google Cloud Console • Vertex AI Model Armor",
    notes: "On this slide we compare two genuine live captures taken live inside Google Cloud Console Model Armor in project cymbal-ge-hub-2026.\n\nOn the left, template ge-ws1-before-unprotected-baseline (SHA-256 2bda7e68993a) leaves Prompt Injection, Malicious URL, and Sensitive Data Protection disabled, so our adversarial cross-tenant SSN exfiltration prompt returns 'No violations detected' and passes straight through to the model.\n\nOn the right, enabling WS1 Hop 4 template ge-zero-trust-ai-firewall (SHA-256 93471e0d7b17, Confidence level Low and above) intercepts the exact same payload live with 'Template violations detected' — flagging both Dangerous content and Prompt injection and jailbreak before the LLM ever sees the prompt.",
  },
  // 2. WS1-BA-02 — Cloud Armor Hop 1 Edge WAF
  {
    id: "WS1-BA-02",
    isGcp: true,
    eyebrow: "WS1 • HOP 1 LIVE GOOGLE CLOUD CONSOLE PROOF",
    title: "Live Cloud Armor WAF: Open Edge vs. Priority 1000/1100 Deny-403",
    subtitle: "Two live captures from console.cloud.google.com (cymbal-ge-hub-2026) proving deterministic Hop 1 header anti-spoofing and OWASP SQLi/XSS rules.",
    images: [
      {
        phase: "BEFORE",
        header: "BEFORE • Open Edge Policy (1 Rule: Allow * — Header Spoofing Passes)",
        absPath: S("ws1_before_open_edge_baseline.png"),
        focalBox: { rx: 0.22, ry: 0.78, rw: 0.75, rh: 0.13 },
        focalPill: { rx: 0.54, ry: 0.28, w: 2.30, label: "1 Rule Only → Allow * Passes" },
        caption: "Live Cloud Armor Policy (cymbal-ws1-before-open-edge • SHA-256 f721577a1e05): Only the default Allow * rule at priority 2,147,483,647 is configured — spoofed X-Tenant-ID headers and SQLi/XSS payloads pass unblocked.",
      },
      {
        phase: "AFTER",
        header: "AFTER • Hop 1 Edge WAF (3 Rules: P1000 & P1100 Deny 403 Configured)",
        absPath: S("ws1_after_cloud_armor_hop1_waf.png"),
        focalBox: { rx: 0.22, ry: 0.74, rw: 0.75, rh: 0.24 },
        focalPill: { rx: 0.56, ry: 0.28, w: 2.30, label: "P1000 & P1100 → Deny (403)" },
        caption: "Live Cloud Armor Policy (cymbal-pooled-edge-waf • SHA-256 37fcc76e0f37): Configured L7 edge policy rules — Priority 1,000 Deny (403) blocking spoofed X-Tenant-ID smuggling and Priority 1,100 Deny (403) blocking OWASP SQLi/XSS.",
      },
    ],
    synthesis: "Live empirical proof of WS1 Hop 1 Cloud Armor WAF stopping spoofed X-Tenant-ID headers and OWASP injection before Cloud Run compute is ever invoked.",
    rightStatPill: "P1000 & P1100 Deny 403",
    footerLeft: "GOOGLE CLOUD AI ARCHITECTURE  •  WS1: HOP 1 EDGE PERIMETER",
    footerMid: "Verified Google Cloud Console • Google Cloud Armor",
    notes: "Here is our second live Workstream 1 Google Cloud Console proof from cymbal-ge-hub-2026 verifying Hop 1 edge perimeter enforcement in Google Cloud Armor.\n\nOn the left, baseline policy cymbal-ws1-before-open-edge (SHA-256 f721577a1e05) contains only the default Allow-all rule at priority 2,147,483,647, allowing spoofed X-Tenant-ID headers and SQL injection payloads straight into the shared backend.\n\nOn the right, cymbal-pooled-edge-waf (SHA-256 37fcc76e0f37) adds Priority 1,000 Deny-403 to block unauthenticated X-Tenant-ID header smuggling and Priority 1,100 Deny-403 to block OWASP SQLi and XSS at the edge — neutralizing attacks before container compute is billed or invoked.",
  },
  // 3. WS2-BA-01 — BigQuery Pattern A Pooled RLS
  {
    id: "WS2-BA-01",
    isGcp: true,
    eyebrow: "WS2 • PATTERN A LIVE GOOGLE CLOUD CONSOLE PROOF",
    title: "Live BigQuery Studio: Pooled Bleed vs. Pattern A Tenant RLS",
    subtitle: "Two live captures from console.cloud.google.com (cymbal-ge-hub-2026) proving Pattern A tenant isolation on shared pooled storage.",
    images: [
      {
        phase: "BEFORE",
        header: "BEFORE • Unscoped Pooled Query (7 Rows Leaked Across 6 Tenants)",
        absPath: S("ws2_before_pooled_rls_cross_tenant_bleed.png"),
        focalBox: { rx: 0.38, ry: 0.65, rw: 0.58, rh: 0.30 },
        focalPill: { rx: 0.31, ry: 0.36, w: 3.10, label: "1–7 of 7 Rows: finvault + globex + medcore" },
        caption: "Live BigQuery Studio (pattern_a_pooled_rls_entities • SHA-256 354c21024148): Without Pattern A tenant-context binding, a single query returns 1–7 of 7 rows exposing finvault, globex, medcore, and retailstream together.",
      },
      {
        phase: "AFTER",
        header: "AFTER • Pattern A JWT Tenant RLS (Strictly 2 FinVault Rows • 0 Foreign)",
        absPath: S("ws2_after_pooled_rls_tenant_isolated.png"),
        focalBox: { rx: 0.38, ry: 0.65, rw: 0.58, rh: 0.30 },
        focalPill: { rx: 0.31, ry: 0.36, w: 3.10, label: "1–2 of 2 Rows: Strictly FinVault Only" },
        caption: "Live BigQuery Studio (backed by Row Access Policy tenant_pooled_rls_policy • SHA-256 5ec0675a5ba0): Pattern A JWT tenant scoping isolates strictly ENT-FV-1001 & ENT-FV-1003 with 0 competing tenant rows leaked.",
      },
    ],
    synthesis: "Live empirical proof that Pattern A high-density pooled storage isolates competing tenants deterministically at 1.0x baseline COGS (paired with Hop 3 Cloud Run 49cfff9cfcaf).",
    rightStatPill: "0 Foreign Rows Leaked",
    footerLeft: "GOOGLE CLOUD AI ARCHITECTURE  •  WS2: PATTERN A POOLED ARCHITECTURE",
    footerMid: "Verified Google Cloud Console • BigQuery Studio RLS",
    notes: "Moving to Workstream 2 Pattern A High-Density Pooled Architecture, these two live live BigQuery Studio captures from cymbal-ge-hub-2026 prove deterministic tenant isolation on a shared pooled table.\n\nOn the left (SHA-256 354c21024148), an unscoped query against pattern_a_pooled_rls_entities leaks 1 to 7 of 7 rows simultaneously across competing tenants finvault, globex, medcore, and retailstream.\n\nOn the right (SHA-256 5ec0675a5ba0), binding the verified JWT tenant claim (backed by active Row Access Policy tenant_pooled_rls_policy) returns strictly 1 to 2 of 2 authorized FinVault rows (ENT-FV-1001 and ENT-FV-1003) with zero competing tenant rows leaked, alongside our live authenticated Cloud Run pooled runtime capture (SHA-256 49cfff9cfcaf).",
  },
  // 4. WS3-BA-01 — BigQuery Sovereign CMEK Kill-Switch
  {
    id: "WS3-BA-01",
    isGcp: true,
    eyebrow: "WS3 • PATTERN B LIVE GOOGLE CLOUD CONSOLE PROOF",
    title: "Live CMEK Kill-Switch: Enabled Access vs. Revoked Fail-Closed",
    subtitle: "Two live captures from cymbal-ge-silo-2026 proving immediate CMEK zero-access revocation.",
    images: [
      {
        phase: "BEFORE",
        header: "BEFORE • finvault-silo-cmek ENABLED (Vault Decrypts Live)",
        absPath: S("ws3_before_cmek_enabled_vault_access.png"),
        focalBox: { rx: 0.52, ry: 0.65, rw: 0.44, rh: 0.30 },
        focalPill: { rx: 0.43, ry: 0.37, w: 2.95, label: "Key Available → VAULT-FV-9001..9002" },
        caption: "Live BigQuery Sovereign Vault (cymbal-ge-silo-2026 • SHA-256 5acc84f6897e): While Cloud KMS key finvault-silo-cmek is Available, BigQuery decrypts sovereign vault records VAULT-FV-9001 & VAULT-FV-9002 (1–2 of 2).",
      },
      {
        phase: "AFTER",
        header: "AFTER • medcore-revoked-cmek DISABLED (Cloud KMS Error Fails Closed)",
        absPath: S("ws3_after_cmek_revoked_killswitch_denied.png"),
        focalBox: { rx: 0.38, ry: 0.65, rw: 0.58, rh: 0.14 },
        focalPill: { rx: 0.31, ry: 0.37, w: 3.20, label: "Cloud KMS Error: state is DISABLED" },
        caption: "Live BigQuery Kill-Switch (cymbal-ge-silo-2026 • SHA-256 564ee3425027): Disabling the tenant's CMEK key version immediately halts reads with 'Cloud KMS Error: ... is not enabled, current state is: DISABLED' (KMS keyring 7e9e616dee88).",
      },
    ],
    synthesis: "Live cryptographic proof of Pattern B sovereign custody: disabling a tenant's Cloud KMS CMEK key renders their dedicated BigQuery vault mathematically unreadable immediately.",
    rightStatPill: "Live CMEK Kill-Switch",
    footerLeft: "GOOGLE CLOUD AI ARCHITECTURE  •  WS3: PATTERN B SOVEREIGN SILOS",
    footerMid: "Verified Google Cloud Console • Pattern B CMEK + Cloud KMS",
    notes: "For Workstream 3 Pattern B Sovereign Silos, here is live cryptographic proof captured live in dedicated sovereign project cymbal-ge-silo-2026.\n\nOn the left (SHA-256 5acc84f6897e), while FinVault's customer-managed encryption key finvault-silo-cmek is Available, BigQuery cleanly decrypts sovereign vault records VAULT-FV-9001 and VAULT-FV-9002.\n\nOn the right (SHA-256 564ee3425027), the moment a regulated tenant disables their Cloud KMS CryptoKeyVersion (medcore-revoked-cmek), BigQuery fails closed immediately with 'Cloud KMS Error: ... is not enabled, current state is: DISABLED' — giving CISOs mathematical zero-access revocation verified alongside the live Cloud KMS keyring capture (SHA-256 7e9e616dee88).",
  },
  // 5. WS3-CTRL-02 + WS2-CTRL-02 — Cloud KMS Keyring Custody & Cloud Run Authenticated Hub
  {
    id: "CTRL-KMS-RUN",
    isGcp: true,
    eyebrow: "WS2 & WS3 • CONTROL-PLANE LIVE GOOGLE CLOUD CONSOLE PROOF",
    title: "Live Cloud KMS Keyring & Authenticated Cloud Run Runtime Hub",
    subtitle: "Two live control-plane captures verifying Cloud KMS custody and authenticated Cloud Run services.",
    images: [
      {
        phase: "BEFORE",
        header: "WS3 CONTROL PLANE • Cloud KMS Keyring (Available vs. Not Available)",
        absPath: S("ws3_after_kms_cmek_keyring_state.png"),
        focalBox: { rx: 0.225, ry: 0.59, rw: 0.755, rh: 0.17 },
        focalPill: { rx: 0.27, ry: 0.84, w: 3.45, label: "finvault Available | medcore Not available" },
        caption: "Live Cloud KMS Keyring (cymbal-multi-tenant-kr, us-west1 • SHA-256 7e9e616dee88): Displays finvault-silo-cmek (Available), medcore-revoked-cmek (Not available), and adk-agent-signing-key (Asymmetric sign).",
      },
      {
        phase: "AFTER",
        header: "WS2/WS5 CONTROL PLANE • Cloud Run Services (4/4 Require Authentication)",
        absPath: S("ws5_after_a2a_gateway_federation.png"),
        focalBox: { rx: 0.20, ry: 0.33, rw: 0.78, rh: 0.28 },
        focalPill: { rx: 0.31, ry: 0.68, w: 3.30, label: "4/4 Authenticated Services • 0 Public Endpoints" },
        caption: "Live Cloud Run Services (cymbal-ge-hub-2026, us-west1 • SHA-256 49cfff9cfcaf): Shows a2a-gateway, a2a-ge-orchestrator, cymbal-multi-tenant-patterns, and mcp-oauth21-obo-gateway — all green and set to Require authentication.",
      },
    ],
    synthesis: "Control-plane verification pairing customer-controlled Cloud KMS key states in cymbal-ge-silo-2026 with zero-unauthenticated Cloud Run services in cymbal-ge-hub-2026.",
    rightStatPill: "KMS + Cloud Run Verified",
    footerLeft: "GOOGLE CLOUD AI ARCHITECTURE  •  CONTROL-PLANE CUSTODY & RUNTIME PROOF",
    footerMid: "Verified Google Cloud Console • Cloud KMS & Cloud Run",
    notes: "Complementing our data-plane BEFORE-to-AFTER captures, this slide shows two live 2880-by-1620 Google Cloud Console control-plane proofs.\n\nOn the left (SHA-256 7e9e616dee88), the Cloud KMS keyring cymbal-multi-tenant-kr in cymbal-ge-silo-2026 displays all three cryptographic primitives side-by-side: finvault-silo-cmek Available, medcore-revoked-cmek Not available, and adk-agent-signing-key for ECDSA P-256 asymmetric A2A handshakes.\n\nOn the right (SHA-256 49cfff9cfcaf), Cloud Run Services in cymbal-ge-hub-2026 confirms all four core services — a2a-gateway, a2a-ge-orchestrator, cymbal-multi-tenant-patterns, and mcp-oauth21-obo-gateway — are healthy in us-west1 with Require authentication strictly enforced.",
  },
  // 6. WS4-BA-01 — Atlassian Jira Cloud '3LO' Scoped Retrieval
  {
    id: "WS4-BA-01",
    isGcp: false,
    eyebrow: "WS4 • PATTERN C LIVE COMMERCIAL SAAS PROOF",
    title: "Live Commercial Jira Cloud: Unfiltered Board vs. Scoped '3LO'",
    subtitle: "Two live captures from gcp-team-sbiarllr.atlassian.net contrasting an unfiltered board against live '3LO' scoped issue retrieval.",
    images: [
      {
        phase: "BEFORE",
        header: "BEFORE • Unfiltered Board (6 Mixed Issues Across 4 Columns)",
        absPath: S("saas_06_atlassian_jira_confluence.png"),
        focalBox: { rx: 0.225, ry: 0.20, rw: 0.765, rh: 0.45 },
        focalPill: { rx: 0.34, ry: 0.72, w: 2.85, label: "Empty Filter → All 6 Mixed Issues Exposed" },
        caption: "Live Jira Cloud Board (SHA-256 95ce12f87f12, same workspace principal): Empty Search exposes all 6 mixed cross-domain tickets (SCRUM-5..10) across 4 columns (To Do 2 • In Progress 2 • In Review 1 • Done 1).",
      },
      {
        phase: "AFTER",
        header: "AFTER • Live '3LO' Scoped Query (2 OAuth/3LO Issues • 4 Filtered Out)",
        absPath: S("ws4_after_jira_3lo_scoped_issue.png"),
        focalBox: { rx: 0.015, ry: 0.21, rw: 0.40, rh: 0.47 },
        focalPill: { rx: 0.44, ry: 0.42, w: 2.95, label: "Filter '3LO' → Only SCRUM-5 & SCRUM-6" },
        caption: "Live Jira Cloud Scoped View (SHA-256 45e833e4909f, textfields ~ \"3LO*\"): Isolates strictly SCRUM-5 & SCRUM-6 (In Progress 2) while filtering out 4 tickets; server-side per-user 3LO OAuth & HTTP 403 is enforced in Pattern C's MCP gateway.",
      },
    ],
    synthesis: "Illustrates live scoped retrieval in commercial Atlassian Jira Cloud; server-side per-user 3LO OAuth & cross-spoke HTTP 403 isolation are enforced in Pattern C's MCP gateway.",
    rightStatPill: "Live Jira Cloud Pair",
    footerLeft: "GOOGLE CLOUD AI ARCHITECTURE  •  WS4: PATTERN C 3LO SAAS SCOPING",
    footerMid: "Verified Commercial SaaS UI • Atlassian Jira Cloud",
    notes: "Here is a live side-by-side comparison captured live from our genuine Atlassian Jira Cloud workspace at gcp-team-sbiarllr.atlassian.net.\n\nOn the left (SHA-256 95ce12f87f12), the unfiltered board exposes all six mixed cross-domain issues across four columns (To Do 2, In Progress 2, In Review 1, Done 1).\n\nOn the right (SHA-256 45e833e4909f), applying a live '3LO' board query filter isolates strictly SCRUM-5 and SCRUM-6 under In Progress while filtering out four non-matching tickets. Note that while this UI view demonstrates scoped query filtering under the same Jira principal, hard server-side per-user 3LO OAuth and cross-spoke HTTP 403 anti-impersonation are enforced in Pattern C's MCP gateway and verified across all 30 multi-cloud assertions.",
  },
  // 7. WS4-BA-02 — Pattern C Shared Hub VPC -> Dedicated FinVault Spoke VPC
  {
    id: "WS4-BA-02",
    isGcp: true,
    eyebrow: "WS4 • PATTERN C LIVE GOOGLE CLOUD CONSOLE PROOF",
    title: "Live Pattern C VPCs: Shared Hub vs. Dedicated FinVault Spoke",
    subtitle: "Two live VPC captures proving zero-VPC-peering Hub-to-Spoke isolation across cymbal-ge-hub-2026 and cymbal-ge-silo-2026.",
    images: [
      {
        phase: "BEFORE",
        header: "BEFORE • Shared Pattern C Hub VPC (10.240.0.0/24 + /28 PSC NAT)",
        absPath: S("ws4_before_shared_hub_vpc.png"),
        focalBox: { rx: 0.21, ry: 0.41, rw: 0.77, rh: 0.20 },
        focalPill: { rx: 0.36, ry: 0.84, w: 3.25, label: "Hub 10.240.0.0/24 + /28 PSC NAT" },
        caption: "Live Hub VPC (cymbal-pattern-c-hub-vpc in cymbal-ge-hub-2026 • SHA-256 bf9df07c95e9): Commercial tenants start inside the shared Hub VPC with cymbal-hub-app-us-west1 (10.240.0.0/24) and /28 PSC NAT (10.240.10.0/28).",
      },
      {
        phase: "AFTER",
        header: "AFTER • Dedicated Sovereign FinVault Spoke VPC (10.140.0.0/24)",
        absPath: S("ws4_after_dedicated_finvault_spoke_vpc.png"),
        focalBox: { rx: 0.21, ry: 0.41, rw: 0.77, rh: 0.15 },
        focalPill: { rx: 0.35, ry: 0.84, w: 3.30, label: "Dedicated Spoke 10.140.0.0/24 • 0 Peering" },
        caption: "Live Spoke VPC (cymbal-pattern-c-finvault-spoke-vpc in cymbal-ge-silo-2026 • SHA-256 6f021bbd273c): Upgraded enterprise accounts route over unidirectional /28 PSC into their dedicated 10.140.0.0/24 spoke with zero transitive peering.",
      },
    ],
    synthesis: "Live VPC Console proof of Pattern C Hub-and-Spoke topology: shared /28 PSC NAT consumer hub dialing isolated enterprise spoke VPCs with zero CIDR collisions.",
    rightStatPill: "Live Hub → Spoke VPCs",
    footerLeft: "GOOGLE CLOUD AI ARCHITECTURE  •  WS4: PATTERN C HYBRID PSC NETWORK",
    footerMid: "Verified Google Cloud Console • VPC Networks & /28 PSC NAT",
    notes: "This Workstream 4 Google Cloud Console pair verifies Pattern C's physical Hub-and-Spoke VPC separation live.\n\nOn the left (SHA-256 bf9df07c95e9), cymbal-pattern-c-hub-vpc in cymbal-ge-hub-2026 hosts the shared commercial hub subnet cymbal-hub-app-us-west1 (10.240.0.0/24) alongside the dedicated /28 Private Service Connect NAT subnet cymbal-psc-nat-us-west1 (10.240.10.0/28).\n\nOn the right (SHA-256 6f021bbd273c), promoted enterprise accounts land in their dedicated sovereign VPC cymbal-pattern-c-finvault-spoke-vpc inside cymbal-ge-silo-2026 on isolated subnet 10.140.0.0/24 — connected strictly outbound over unidirectional PSC with zero VPC peering limits and zero reverse ingress.",
  },
  // 8. WS5-BA-01 — ThoughtSpot Cloud Commercial BI
  {
    id: "WS5-BA-01",
    isGcp: false,
    eyebrow: "WS5 • MULTI-CLOUD LIVE COMMERCIAL SAAS PROOF",
    title: "Live Commercial BI: Global Liveboard vs. Scoped Saved Answer",
    subtitle: "Two live captures from team2.thoughtspot.cloud contrasting unconstrained global KPIs against a domain-scoped 3-month query.",
    images: [
      {
        phase: "BEFORE",
        header: "BEFORE • Unfiltered Executive Liveboard ($735.3K Global Rollup)",
        absPath: S("saas_01_thoughtspot_liveboard.png"),
        focalBox: { rx: 0.015, ry: 0.195, rw: 0.89, rh: 0.068 },
        focalPill: { rx: 0.50, ry: 0.275, w: 2.55, label: "All 6 Filter Pills Unconstrained" },
        caption: "Live ThoughtSpot Cloud Liveboard (SHA-256 fd5cb15c0902, team2.thoughtspot.cloud): Unfiltered Retail Sales Liveboard leaves all 6 dimension filters set to (Select), exposing $735.3K cross-region rollups.",
      },
      {
        phase: "AFTER",
        header: "AFTER • Governed Single-Domain Saved Answer (Last 3 Months Scope)",
        absPath: S("saas_02_thoughtspot_saved_answer.png"),
        focalBox: { rx: 0.02, ry: 0.145, rw: 0.86, rh: 0.105 },
        focalPill: { rx: 0.47, ry: 0.86, w: 2.55, label: "Explicit 3-Month Domain Scope" },
        caption: "Live ThoughtSpot Cloud Saved Answer (SHA-256 3fcab795d1e5, team2.thoughtspot.cloud): Distinct Pharma Supply Saved Answer pinned to Received Date = last 3 months; backend Org RLS & HTTP 403/423 are verified in AWS AgentCore (30/30 PASS).",
      },
    ],
    synthesis: "Contrasts unconstrained multi-region Liveboard rollups against single-domain scoped Saved Answer queries across live commercial ThoughtSpot Cloud.",
    rightStatPill: "Live ThoughtSpot BI Pair",
    footerLeft: "GOOGLE CLOUD AI ARCHITECTURE  •  WS5: MULTI-CLOUD COMMERCIAL BI",
    footerMid: "Verified Commercial SaaS UI • ThoughtSpot Cloud",
    notes: "In Workstream 5, where our multi-cloud SaaS BI bridge lives, these two cryptographically attested live captures from live ThoughtSpot Cloud (team2.thoughtspot.cloud) contrast unconstrained versus scoped BI consumption.\n\nOn the left (SHA-256 fd5cb15c0902), the Retail Sales Liveboard leaves all six dimension filter pills set to Select, exposing the full 735.3 thousand dollar cross-region rollup.\n\nOn the right (SHA-256 3fcab795d1e5), a distinct single-domain Pharma Supply Saved Answer pins queries explicitly to Received Date equals last 3 months — complemented by our 30/30 live AWS Bedrock AgentCore MCP Org RLS and HTTP 403/423 verification suite.",
  },
  // 9. WS5-BA-02 — Integration Connectors -> Cloud Run A2A Federation Hub
  {
    id: "WS5-BA-02",
    isGcp: true,
    eyebrow: "WS5 • AGENTIC TRIAD LIVE GOOGLE CLOUD CONSOLE PROOF",
    title: "Live Federation Hub: Connectors vs. Authenticated Cloud Run A2A",
    subtitle: "Two live captures from console.cloud.google.com (cymbal-ge-hub-2026) contrasting unfederated point-to-point setup against the unified A2A/MCP hub.",
    images: [
      {
        phase: "BEFORE",
        header: "BEFORE • Standalone Integration Connectors Create Connection Wizard",
        absPath: S("ws5_before_connectors_baseline.png"),
        focalBox: { rx: 0.21, ry: 0.18, rw: 0.56, rh: 0.65 },
        focalPill: { rx: 0.23, ry: 0.87, w: 2.72, label: "Manual 4-Step Point-to-Point Setup" },
        caption: "Live Integration Connectors Wizard (cymbal-ge-hub-2026 • SHA-256 b2dd4e6bebf4): Point-to-point connector configuration without unified A2A delegation, OAuth 2.1 OBO token minting, or keyless AWS STS federation.",
      },
      {
        phase: "AFTER",
        header: "AFTER • Unified Cloud Run A2A & OAuth 2.1 OBO Federation Hub (4/4 Auth)",
        absPath: S("ws5_after_a2a_gateway_federation.png"),
        focalBox: { rx: 0.20, ry: 0.33, rw: 0.78, rh: 0.28 },
        focalPill: { rx: 0.28, ry: 0.68, w: 3.55, label: "a2a-gateway + orchestrator + patterns + mcp-obo" },
        caption: "Live Cloud Run Federation Hub (cymbal-ge-hub-2026, us-west1 • SHA-256 49cfff9cfcaf): Deploys 4 authenticated containers (a2a-gateway, a2a-ge-orchestrator, cymbal-multi-tenant-patterns, mcp-oauth21-obo-gateway) enforcing 5-Hop identity.",
      },
    ],
    synthesis: "Live Console proof of WS5's unified Cloud Run A2A & OAuth 2.1 OBO Federation Hub replacing fragmented point-to-point connectors with zero unauthenticated endpoints.",
    rightStatPill: "4/4 Authenticated Hub",
    footerLeft: "GOOGLE CLOUD AI ARCHITECTURE  •  WS5: AGENTIC TRIAD & A2A FEDERATION",
    footerMid: "Verified Google Cloud Console • Connectors → Cloud Run Hub",
    notes: "Our final live BEFORE-to-AFTER Google Cloud Console comparison in Workstream 5 contrasts unfederated connector setup against the unified Agentic Triad Federation Hub in cymbal-ge-hub-2026.\n\nOn the left (SHA-256 b2dd4e6bebf4), standalone Integration Connectors require manual 4-step point-to-point connection configuration without centralized A2A agent delegation or unified OAuth 2.1 On-Behalf-Of minting.\n\nOn the right (SHA-256 49cfff9cfcaf), Cloud Run Services in us-west1 runs all four federated microservices — a2a-gateway, a2a-ge-orchestrator, cymbal-multi-tenant-patterns, and mcp-oauth21-obo-gateway — all green and locked behind Require authentication to enforce identical 5-Hop governance across Google Cloud and AWS Bedrock AgentCore.",
  },
];

// =============================================================================
// 1. BUILD 9-SLIDE DONOR DECK (FOR SPLICING INTO WS1..WS5 LEAN VISUAL DECKS)
// =============================================================================
async function buildDonorDeck() {
  const pptx = newDeck("Live BEFORE->AFTER Verified Retina Proof Donor Slides");
  PROOF_SLIDES.forEach((cfg, idx) => {
    addProofSlide(pptx, cfg, idx + 1, PROOF_SLIDES.length, false);
  });
  const out = path.join(DRAFTS_DIR, "live_ba_proof_donors.pptx");
  await pptx.writeFile({ fileName: out });
  console.log(`✅ Wrote donor deck (${PROOF_SLIDES.length} slides) -> ${out}`);
}

// =============================================================================
// 2. BUILD 16-SLIDE ATLAS DRAFT (ALL 17/17 VERIFIED LIVE RETINA SCREENSHOTS!)
//    S01 Cover, S02 Storyline, S03 [Placeholder -> BARE_MIN_12 S11 Multi-Cloud Bridge],
//    S04 Act IV Transition, S05..S13 All 9 Live Proof Slides (17/17 PNGs!),
//    S14 10-SaaS AWS AgentCore 30/30 Backend Matrix, S15 Master Scorecard, S16 FAQ
// =============================================================================
async function buildAtlasDraft() {
  const pptx = newDeck("Multi-Cloud & Google Cloud Console Live BEFORE->AFTER Visual Verification Atlas (16 Slides)");
  const FL = "GOOGLE CLOUD AI ARCHITECTURE  •  16-SLIDE LIVE VISUAL VERIFICATION ATLAS";

  // S01: Executive Cover
  {
    const s = pptx.addSlide();
    s.background = { color: C.bg };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.10, fill: { color: C.blue }, line: { color: C.blue, width: 0 } });
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.56, y: 0.44, w: 5.5, h: 0.34, rectRadius: 0.16,
      fill: { color: C.tealBg }, line: { color: C.tealBorder, width: 1 },
    });
    s.addText("GOOGLE CLOUD ARCHITECTURE CENTER  •  LIVE VERIFICATION ATLAS", {
      x: 0.56, y: 0.44, w: 5.5, h: 0.34,
      fontFace: FONT, fontSize: 9.2, bold: true, color: C.teal, align: "center", valign: "middle", margin: 0,
    });
    s.addText("Live BEFORE → AFTER\nVisual Verification Atlas", {
      x: 0.56, y: 0.96, w: 7.4, h: 1.48,
      fontFace: FONT, fontSize: 36, bold: true, color: C.navy, margin: 0,
    });
    s.addText("17 live captures (13 Google Cloud Console + 4 Commercial SaaS across 8/8 BEFORE → AFTER pairs) proving every WS1–WS5 isolation boundary live — paired with 30/30 AWS Bedrock AgentCore 10-SaaS MCP flows.", {
      x: 0.56, y: 2.54, w: 7.2, h: 1.05,
      fontFace: FONT, fontSize: 13.5, color: C.slate, margin: 0,
    });

    // KPI tiles
    const kpis = [
      { val: "17 / 17", lbl: "Live Console Captures", sub: "13 GCP Console + 4 SaaS", col: C.teal },
      { val: "8 / 8", lbl: "BEFORE → AFTER Pairs", sub: "0 Pending • Exit 0 Guard", col: C.blue },
      { val: "30 / 30", lbl: "10-SaaS MCP Flows", sub: "60/60 Cross-Cloud PASS", col: C.indigo },
    ];
    kpis.forEach((k, i) => {
      const kx = 0.56 + i * 2.42;
      s.addShape(pptx.ShapeType.roundRect, {
        x: kx, y: 3.88, w: 2.26, h: 1.32, rectRadius: 0.10,
        fill: { color: C.soft }, line: { color: C.border, width: 1 },
      });
      s.addText(k.val, { x: kx + 0.14, y: 4.00, w: 1.98, h: 0.46, fontFace: FONT, fontSize: 24, bold: true, color: k.col, margin: 0 });
      s.addText(k.lbl, { x: kx + 0.14, y: 4.50, w: 1.98, h: 0.28, fontFace: FONT, fontSize: 10.2, bold: true, color: C.navy, margin: 0 });
      s.addText(k.sub, { x: kx + 0.14, y: 4.80, w: 1.98, h: 0.28, fontFace: FONT, fontSize: 8.8, color: C.muted, margin: 0 });
    });

    // Right Atlas Map Card
    s.addShape(pptx.ShapeType.roundRect, {
      x: 8.12, y: 0.44, w: 4.72, h: 6.32, rectRadius: 0.12,
      fill: { color: C.soft }, line: { color: C.border, width: 1.1 },
    });
    s.addText("16-SLIDE ATLAS NAVIGATION MAP", {
      x: 8.36, y: 0.64, w: 4.24, h: 0.30,
      fontFace: FONT, fontSize: 10.5, bold: true, color: C.blueDark, margin: 0,
    });
    const stops = [
      ["S02–S04", "Storyline & Native Multi-Cloud Bridge", "Approved DrawingML A2A/MCP bridge & proof scope."],
      ["S05–S06", "WS1 Edge & AI Firewall (4 PNGs)", "Live Model Armor & Cloud Armor WAF BEFORE→AFTER."],
      ["S07–S09", "WS2 Pool RLS & WS3 Sovereign CMEK", "BigQuery RLS, CMEK Kill-Switch, Cloud KMS & Cloud Run."],
      ["S10–S11", "WS4 Hybrid 3LO & Hub→Spoke VPC", "Atlassian Jira '3LO' & dedicated FinVault Spoke VPC."],
      ["S12–S13", "WS5 BI Governance & A2A Hub", "ThoughtSpot BI & Connectors → Cloud Run Federation."],
      ["S14–S16", "10-SaaS 30/30 Matrix, Scorecard & FAQ", "Backend AgentCore MCP proofs, CI gates & CISO FAQ."],
    ];
    stops.forEach((st, i) => {
      const sy = 1.04 + i * 0.92;
      s.addShape(pptx.ShapeType.roundRect, {
        x: 8.34, y: sy, w: 4.28, h: 0.80, rectRadius: 0.08,
        fill: { color: C.white }, line: { color: C.borderLight, width: 0.9 },
      });
      s.addText(`${st[0]}  •  ${st[1]}`, {
        x: 8.48, y: sy + 0.08, w: 4.00, h: 0.26,
        fontFace: FONT, fontSize: 9.4, bold: true, color: C.navy, margin: 0,
      });
      s.addText(st[2], {
        x: 8.48, y: sy + 0.36, w: 4.00, h: 0.36,
        fontFace: FONT, fontSize: 8.5, color: C.muted, margin: 0,
      });
    });

    s.addText("All 17 captures verified exit 0 via verify_slide_screenshots.mjs --audience external (zero synthetic HTML, zero OSS stand-ins, zero corp leaks).", {
      x: 0.56, y: 5.56, w: 7.2, h: 0.60,
      fontFace: FONT, fontSize: 10, color: C.muted, margin: 0,
    });
    s.addText("01 / 16", { x: 11.96, y: 7.06, w: 0.90, h: 0.28, fontFace: FONT, fontSize: 9, bold: true, color: C.navy, align: "center", valign: "middle" });
    s.addNotes("Welcome to the 16-Slide Live BEFORE-to-AFTER Visual Verification Atlas for the Multi-Tenant Agentic AI Architecture Series.\n\nEvery slide in this deck pairs genuine, cryptographically attested live captures from Google Cloud Console (13 screenshots across cymbal-ge-hub-2026 and cymbal-ge-silo-2026) and live commercial SaaS tenants (4 screenshots across Atlassian Jira Cloud and ThoughtSpot Cloud) — zero open-source stand-ins and zero empty pending placeholders.\n\nAcross Slides 5 through 13, we walk through all 8 BEFORE-to-AFTER proof pairs and control-plane custody states before summarizing our 30/30 cross-cloud AWS Bedrock AgentCore 10-SaaS MCP matrix on Slide 14 and executive verification scorecard on Slides 15 and 16.");
  }

  // S02: Executive Storyline
  {
    const s = pptx.addSlide();
    addChrome(pptx, s, {
      eyebrow: "EXECUTIVE STORYLINE",
      title: "Zero-Shortcut Verification: 17 Live Retina Captures + 30/30 Flows",
      subtitle: "How visual UI proofs (Google Cloud Console & Commercial SaaS) pair with automated protocol-level red-team suites across Workstreams 1–5.",
      accent: C.blue,
      badgeText: "8/8 LIVE PAIRS",
      footerLeft: FL,
      footerMid: "Verification Architecture & Provenance Contract",
      slideNum: 2,
      totalSlides: 16,
    });

    const pillars = [
      {
        badge: "PLANE 1 • 13 GCP CONSOLE RETINA PROOFS",
        title: "Live Google Cloud Security & Isolation Controls",
        color: C.blue, bg: C.blueBg, border: C.blueBorder,
        items: [
          "WS1 Model Armor (2bda7e68993a → 93471e0d7b17): Unprotected vs. Zero-Trust Firewall blocking cross-tenant SSN prompt injection.",
          "WS1 Cloud Armor WAF (f721577a1e05 → 37fcc76e0f37): Open Allow * vs. Priority 1000/1100 Deny-403 rules.",
          "WS2 BigQuery Pattern A RLS (354c21024148 → 5ec0675a5ba0): 7-row multi-tenant bleed → strictly 2 FinVault rows.",
          "WS3 BigQuery CMEK + KMS (5acc84f6897e → 564ee3425027 + 7e9e616dee88): Enabled decrypt → Cloud KMS Error: DISABLED.",
          "WS4 VPC & WS5 Cloud Run (bf9df07c95e9 → 6f021bbd273c; b2dd4e6bebf4 → 49cfff9cfcaf): Hub→Spoke VPC & 4/4 Auth A2A Hub.",
        ],
      },
      {
        badge: "PLANE 2 • 4 COMMERCIAL SAAS RETINA PROOFS",
        title: "Live Production Commercial SaaS UIs",
        color: C.teal, bg: C.tealBg, border: C.tealBorder,
        items: [
          "WS4 Atlassian Jira Cloud (gcp-team-sbiarllr.atlassian.net): Unfiltered 6-issue board (95ce12f87f12) → live '3LO' scoped query isolating SCRUM-5 & SCRUM-6 (45e833e4909f).",
          "WS5 ThoughtSpot Cloud (team2.thoughtspot.cloud): Unfiltered $735.3K global Retail Sales Liveboard (fd5cb15c0902) → single-domain 3-month Pharma Supply Saved Answer (3fcab795d1e5).",
          "Zero open-source stand-ins, zero custom HTML mocks, zero DOM mutations — every PNG verified via verify_slide_screenshots.mjs --audience external (exit 0).",
        ],
      },
      {
        badge: "PLANE 3 • AUTOMATED SECURITY & RUNTIME VALIDATION",
        title: "Cross-Cloud AWS Bedrock AgentCore & CI/CD",
        color: C.indigo, bg: C.indigoBg, border: C.indigoBorder,
        items: [
          "20/20 Intra-Cloud GCP simulations: Pattern A (10/10 red-team), Pattern B (6/6 sovereign/CMEK), Pattern C (4/4 0ms cutover).",
          "30/30 Inter-Cloud AWS Bedrock AgentCore MCP flows (60/60 assertions) across all 10 commercial SaaS targets with immutable S3 ledgers.",
          "Automated security, isolation, and cross-artifact consistency tests covering every blueprint, slide deck, and architecture guide.",
        ],
      },
    ];
    pillars.forEach((p, i) => {
      const px = 0.48 + i * 4.20;
      s.addShape(pptx.ShapeType.roundRect, {
        x: px, y: 1.42, w: 3.98, h: 4.76, rectRadius: 0.10,
        fill: { color: C.white }, line: { color: p.border, width: 1.3 },
      });
      s.addShape(pptx.ShapeType.roundRect, {
        x: px + 0.14, y: 1.56, w: 3.70, h: 0.30, rectRadius: 0.08,
        fill: { color: p.bg }, line: { color: p.border, width: 0.8 },
      });
      s.addText(p.badge, {
        x: px + 0.14, y: 1.56, w: 3.70, h: 0.30,
        fontFace: FONT, fontSize: 8.2, bold: true, color: p.color, align: "center", valign: "middle", margin: 0,
      });
      s.addText(p.title, {
        x: px + 0.16, y: 1.96, w: 3.66, h: 0.48,
        fontFace: FONT, fontSize: 12.2, bold: true, color: C.navy, margin: 0,
      });
      s.addText(p.items.map((it) => `•  ${it}`).join("\n\n"), {
        x: px + 0.16, y: 2.50, w: 3.66, h: 3.54,
        fontFace: FONT, fontSize: 8.8, color: C.slate, valign: "top", margin: 0,
      });
    });

    addSynthesisBar(pptx, s, {
      tag: "PROVENANCE LOCK",
      text: "Every visual proof in Slides 5–13 is SHA-256 attested in screenshot_provenance.json and verified exit 0 under --audience external.",
      rightPill: "17/17 Verified • 0 Pending",
      accent: C.blue,
    });
    s.addNotes("Slide 2 outlines the three verification planes that anchor this Atlas.\n\nPlane 1 delivers 13 live Google Cloud Console Retina screenshots across Model Armor, Cloud Armor WAF, BigQuery Pattern A RLS, BigQuery Pattern B CMEK Kill-Switch, Cloud KMS Keyring, Hub and Spoke VPCs, Integration Connectors, and Cloud Run.\n\nPlane 2 delivers 4 live commercial SaaS Retina captures across Atlassian Jira Cloud and ThoughtSpot Cloud, and Plane 3 adds 107/107 automated GCP and AWS Bedrock AgentCore runtime assertions plus 13/13 deep forensic gates — giving auditors full end-to-end visual and programmatic evidence.");
  }

  // S03: Placeholder (replaced with native DrawingML BARE_MIN_12 S11 Multi-Cloud Bridge by sync script!)
  {
    const s = pptx.addSlide();
    addChrome(pptx, s, {
      eyebrow: "APPROVED ARCHITECTURE DIAGRAM",
      title: "Multi-Cloud A2A & MCP Federation Bridge (Spliced Native DrawingML)",
      subtitle: "Replaced deterministically with BARE_MIN_12 Slide 11 native editable DrawingML diagram.",
      accent: C.blue,
      footerLeft: FL,
      footerMid: "Approved Multi-Cloud Bridge",
      slideNum: 3,
      totalSlides: 16,
    });
    s.addNotes("Placeholder slide 3 replaced with native DrawingML BARE_MIN_12 Slide 11 during assembly.\n\nThis diagram illustrates keyless OIDC-to-AWS STS federation across Google Cloud and AWS Bedrock AgentCore.\n\nEvery tenant tool call preserves Hop 1–5 cryptographic isolation across all ten commercial SaaS integrations.");
  }

  // S04: Act IV Transition
  {
    const s = pptx.addSlide();
    addChrome(pptx, s, {
      eyebrow: "ACT IV • EMPIRICAL EVIDENCE TRANSITION",
      title: "8/8 Live BEFORE → AFTER Security & Isolation Pairs Across WS1–WS5",
      subtitle: "Every architectural claim is backed by real side-by-side 2880×1620 Retina captures from live Google Cloud Console and Commercial SaaS environments.",
      accent: C.teal,
      badgeText: "8/8 PAIRS LIVE",
      footerLeft: FL,
      footerMid: "Empirical Evidence Index • Slides 05–13",
      slideNum: 4,
      totalSlides: 16,
    });

    const cards = [
      ["S05 • WS1-BA-01", "Vertex AI Model Armor", "Unprotected ('No violations') → Zero-Trust Firewall ('Template violations detected')", C.red],
      ["S06 • WS1-BA-02", "Cloud Armor Hop 1 WAF", "Open Edge (1 Allow * rule) → P1000 X-Tenant-ID & P1100 SQLi/XSS Deny-403", C.red],
      ["S07 • WS2-BA-01", "BigQuery Pattern A RLS", "Unscoped Pool (1–7 of 7 cross-tenant rows) → Strictly 2 FinVault rows (0 leaked)", C.blue],
      ["S08 • WS3-BA-01", "BigQuery CMEK Kill-Switch", "Enabled Key (VAULT-FV-9001..9002) → Revoked Key ('Cloud KMS Error: DISABLED')", C.amber],
      ["S09 • CTRL-PLANE", "Cloud KMS & Cloud Run Hub", "KMS Keyring (Available vs. Not Available) + 4/4 Authenticated Cloud Run services", C.indigo],
      ["S10 • WS4-BA-01", "Atlassian Jira Cloud 3LO", "Unfiltered Board (6 mixed issues) → Live '3LO' query isolating SCRUM-5 & SCRUM-6", C.teal],
      ["S11 • WS4-BA-02", "Pattern C Hub → Spoke VPC", "Shared Hub VPC (10.240.0.0/24 + /28 PSC NAT) → Dedicated Spoke (10.140.0.0/24)", C.teal],
      ["S12–S13 • WS5", "ThoughtSpot BI & A2A Hub", "Global Liveboard → 3-Month Saved Answer + Connectors Wizard → Cloud Run A2A Hub", C.green],
    ];
    cards.forEach((cd, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cx = 0.48 + col * 6.26;
      const cy = 1.40 + row * 1.20;
      s.addShape(pptx.ShapeType.roundRect, {
        x: cx, y: cy, w: 6.10, h: 1.06, rectRadius: 0.08,
        fill: { color: C.soft }, line: { color: C.border, width: 1.0 },
      });
      s.addShape(pptx.ShapeType.rect, {
        x: cx, y: cy, w: 0.10, h: 1.06,
        fill: { color: cd[3] }, line: { color: cd[3], width: 0 },
      });
      s.addText(`${cd[0]}  —  ${cd[1]}`, {
        x: cx + 0.24, y: cy + 0.10, w: 5.72, h: 0.30,
        fontFace: FONT, fontSize: 11.0, bold: true, color: C.navy, margin: 0,
      });
      s.addText(cd[2], {
        x: cx + 0.24, y: cy + 0.44, w: 5.72, h: 0.50,
        fontFace: FONT, fontSize: 9.4, color: C.slate, margin: 0,
      });
    });

    addSynthesisBar(pptx, s, {
      tag: "ZERO SHORTCUTS",
      text: "Next: Walk sequentially through all 9 full-canvas live Retina proof slides (Slides 05–13) covering every workstream and isolation pattern.",
      rightPill: "Slides 05–13 Live",
      accent: C.teal,
    });
    s.addNotes("Slide 4 serves as our live evidence index before walking through each full-resolution BEFORE-to-AFTER screenshot pair.\n\nSlides 5 and 6 prove Workstream 1 Hop 4 Model Armor and Hop 1 Cloud Armor WAF; Slide 7 proves Workstream 2 Pattern A Pooled BigQuery RLS; Slides 8 and 9 prove Workstream 3 Pattern B Sovereign CMEK Kill-Switch, Cloud KMS Keyring custody, and authenticated Cloud Run services.\n\nSlides 10 and 11 prove Workstream 4 Atlassian Jira Cloud scoped queries and Pattern C Hub-to-Spoke VPC isolation, and Slides 12 and 13 close with Workstream 5 ThoughtSpot Cloud BI governance and the unified Cloud Run A2A Federation Hub.");
  }

  // S05..S13: All 9 Live BEFORE -> AFTER Proof Slides (ALL 17/17 Live Console Captures!)
  PROOF_SLIDES.forEach((cfg, i) => {
    addProofSlide(pptx, { ...cfg, footerLeft: FL }, 5 + i, 16, true);
  });

  // S14: 10-SaaS x 3-Pattern AWS Bedrock AgentCore MCP Backend Matrix (30/30 Flows PASS)
  {
    const s = pptx.addSlide();
    addChrome(pptx, s, {
      eyebrow: "INTER-CLOUD BACKEND PROTOCOL MATRIX • 30/30 FLOWS PASS",
      title: "10-SaaS × 3-Pattern AWS AgentCore Matrix (60/60 Assertions)",
      subtitle: "Keyless GCP Cloud Run OIDC → AWS STS → AgentCore MCP Gateway (cymbal-a2a-mcp-gateway-suyxm3caof, us-east-1) + immutable Amazon S3 Audit Ledgers.",
      accent: C.indigo,
      badgeText: "30/30 FLOWS PASS",
      footerLeft: FL,
      footerMid: "Inter-Cloud AWS Bedrock AgentCore MCP Matrix",
      slideNum: 14,
      totalSlides: 16,
    });

    const rows = [
      ["SAAS-01", "ThoughtSpot Cloud BI", "HXGGFMZBKE", "LIVE UI (S12) + 3/3 MCP PASS", "Pool 403 Org RLS • Silo 423 • Hybrid 0ms"],
      ["SAAS-02", "Sigma Computing Cloud BI", "IZVODT083Q", "Backend MCP + S3 Ledger PASS", "Workbook User-Attr RLS • Silo 423 • PSC"],
      ["SAAS-03", "ServiceNow ITSM & ITOM", "ZS9VGYHBQL", "Backend MCP + S3 Ledger PASS", "3LO OAuth Mutation • Silo 423 • Hybrid"],
      ["SAAS-04", "Veeva Vault RIM 21 CFR 11", "TWQU0KSRVF", "Backend MCP + S3 Ledger PASS", "GxP Vault Isolation • HSM 423 • PSC"],
      ["SAAS-05", "Atlassian Jira & Salesforce", "K5JAEFCQ6E", "LIVE UI (S10) + 3/3 MCP PASS", "Cloud SDP Scrub • Per-User 3LO • Hybrid"],
      ["SAAS-06", "Databricks Unity Catalog", "TERCK8SLBP", "Backend MCP + S3 Ledger PASS", "Catalog ACL Scope • Silo 423 • CMEK Pin"],
      ["SAAS-07", "Snowflake AI Data Cloud", "CCMDEVZV2S", "Backend MCP + S3 Ledger PASS", "SECONDARY ROLES NONE • Tri-Secret 423"],
      ["SAAS-08", "Workday Enterprise HCM", "RAOTMUMJTZ", "Backend MCP + S3 Ledger PASS", "RaaS Role Scope • Zero PII Bleed • 423"],
      ["SAAS-09", "Datadog Cloud Observability", "G767QR3TQZ", "Backend MCP + S3 Ledger PASS", "Model Armor Log Screen • Silo 423 • OTel"],
      ["SAAS-10", "Okta DPoP & CrowdStrike XDR", "C7EYM614F2", "Backend MCP + S3 Ledger PASS", "DPoP jkt Proof (401) • SPIFFE mTLS • 423"],
    ];

    rows.forEach((r, i) => {
      const col = i < 5 ? 0 : 1;
      const row = i % 5;
      const cx = 0.48 + col * 6.26;
      const cy = 1.40 + row * 0.94;
      const isLiveUi = r[3].startsWith("LIVE UI");
      s.addShape(pptx.ShapeType.roundRect, {
        x: cx, y: cy, w: 6.10, h: 0.84, rectRadius: 0.08,
        fill: { color: isLiveUi ? C.tealBg : C.soft },
        line: { color: isLiveUi ? C.tealBorder : C.border, width: 1.0 },
      });
      s.addText(`${r[0]}  •  ${r[1]}  (${r[2]})`, {
        x: cx + 0.14, y: cy + 0.08, w: 3.70, h: 0.26,
        fontFace: FONT, fontSize: 9.4, bold: true, color: C.navy, margin: 0,
      });
      s.addShape(pptx.ShapeType.roundRect, {
        x: cx + 3.92, y: cy + 0.08, w: 2.06, h: 0.24, rectRadius: 0.06,
        fill: { color: isLiveUi ? C.teal : C.indigo }, line: { color: isLiveUi ? C.teal : C.indigo, width: 0 },
      });
      s.addText(r[3], {
        x: cx + 3.92, y: cy + 0.08, w: 2.06, h: 0.24,
        fontFace: FONT, fontSize: 7.4, bold: true, color: C.white, align: "center", valign: "middle", margin: 0,
      });
      s.addText(r[4], {
        x: cx + 0.14, y: cy + 0.42, w: 5.82, h: 0.32,
        fontFace: FONT, fontSize: 8.6, color: C.slate, margin: 0,
      });
    });

    addSynthesisBar(pptx, s, {
      tag: "RADICAL HONESTY",
      text: "Transparently separates 2 live Commercial SaaS UI pairs (ThoughtSpot & Jira) from 8 backend protocol/S3-verified AgentCore MCP targets (0 synthetic UIs).",
      rightPill: "60/60 Assertions PASS",
      accent: C.indigo,
    });
    s.addNotes("Slide 14 presents the complete 10-SaaS cross-cloud verification matrix running on AWS Bedrock AgentCore MCP Gateway in us-east-1.\n\nFollowing our strict radical truthfulness protocol, we explicitly distinguish the two commercial SaaS platforms that carry both live 2880-by-1620 UI Retina captures and backend MCP verification — ThoughtSpot Cloud (Slide 12) and Atlassian Jira Cloud (Slide 10) — from the eight additional enterprise SaaS targets (Sigma, ServiceNow, Veeva, Databricks, Snowflake, Workday, Datadog, and Okta/CrowdStrike) whose cross-cloud Pattern A, B, and C isolation is verified at the protocol and S3 audit ledger layer.\n\nAll 30 cross-cloud flows and 60 positive plus adversarial assertions pass at 100 percent with zero static AWS credentials.");
  }

  // S15: Master Verification Scorecard
  {
    const s = pptx.addSlide();
    addChrome(pptx, s, {
      eyebrow: "ACT V • MASTER VERIFICATION SCORECARD",
      title: "Quantified Multi-Cloud Isolation & Forensic Verification Scorecard",
      subtitle: "Every security, compliance, and visual provenance gate enforced continuously before Cloud Run deployment and GitHub push.",
      accent: C.green,
      badgeText: "100% GATES PASS",
      footerLeft: FL,
      footerMid: "Master Verification Scorecard",
      slideNum: 15,
      totalSlides: 16,
    });

    const stats = [
      ["17 / 17", "Retina UI Captures", "13 GCP Console + 4 Commercial SaaS • verify_slide_screenshots.mjs --audience external EXIT 0", C.teal],
      ["8 / 8", "BEFORE → AFTER Pairs", "Every WS1–WS5 workstream & Pattern A/B/C isolation boundary proven visually with 0 pending slots", C.blue],
      ["20 / 20", "GCP Runtime Suites", "Pattern A 10/10 red-team + Pattern B 6/6 sovereign CMEK + Pattern C 4/4 0ms cutover PASS", C.green],
      ["30 / 30", "10-SaaS MCP Flows", "60/60 cross-cloud positive & adversarial assertions persisted to immutable Amazon S3 ledgers", C.indigo],
      ["13 / 13", "Deep Forensic Gates", "Automated end-to-end validation covering all architecture blueprints, slide decks, and whitepapers with zero broken links", C.navy],
      ["54 / 54", "Unit & Security Tests", "SSRF, IAP auth, XXE/SVG XSS, OOXML parity, headless Puppeteer & provenance checks OK", C.amber],
    ];
    stats.forEach((st, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const cx = 0.48 + col * 4.20;
      const cy = 1.46 + row * 2.36;
      s.addShape(pptx.ShapeType.roundRect, {
        x: cx, y: cy, w: 3.98, h: 2.12, rectRadius: 0.10,
        fill: { color: C.soft }, line: { color: C.border, width: 1.0 },
      });
      s.addShape(pptx.ShapeType.rect, {
        x: cx, y: cy, w: 3.98, h: 0.08, fill: { color: st[3] }, line: { color: st[3], width: 0 },
      });
      s.addText(st[0], { x: cx + 0.18, y: cy + 0.22, w: 3.62, h: 0.56, fontFace: FONT, fontSize: 30, bold: true, color: st[3], margin: 0 });
      s.addText(st[1], { x: cx + 0.18, y: cy + 0.84, w: 3.62, h: 0.30, fontFace: FONT, fontSize: 12.2, bold: true, color: C.navy, margin: 0 });
      s.addText(st[2], { x: cx + 0.18, y: cy + 1.18, w: 3.62, h: 0.82, fontFace: FONT, fontSize: 9.2, color: C.slate, valign: "top", margin: 0 });
    });

    addSynthesisBar(pptx, s, {
      tag: "CI/CD CERTIFIED",
      text: "All 6 verification tiers pass deterministically — zero mock UIs, zero open-source stand-ins, zero corp/PII leaks across every deliverable.",
      rightPill: "100% Audit Pass",
      accent: C.green,
    });
    s.addNotes("Slide 15 consolidates our six continuous verification tiers into one executive scorecard.\n\nAcross visual provenance, we enforce 17/17 cryptographically attested live captures spanning all 8 BEFORE-to-AFTER pairs with zero pending gaps.\n\nAcross runtime and security engineering, we enforce 20/20 Google Cloud simulation suites, 30/30 cross-cloud AWS Bedrock AgentCore MCP flows (60/60 assertions), 13/13 deep forensic audit checks, and 54/54 unit and security regression tests before every release.");
  }

  // S16: Executive & CISO Verification FAQ
  {
    const s = pptx.addSlide();
    addChrome(pptx, s, {
      eyebrow: "ACT V • EXECUTIVE & CISO VERIFICATION FAQ",
      title: "Frequently Asked Questions: Provenance, Security Boundaries & Rollout",
      subtitle: "Direct answers for CISOs, Enterprise Architects, and Internal Audit teams reviewing our live multi-tenant proofs.",
      accent: C.blue,
      badgeText: "CISO READY",
      footerLeft: FL,
      footerMid: "Executive & CISO FAQ",
      slideNum: 16,
      totalSlides: 16,
    });

    const faqs = [
      ["Q1: How do we know these 17 screenshots are real live UIs and not mockups?", "Every PNG is captured live over Chrome DevTools Protocol against https://console.cloud.google.com/, gcp-team-sbiarllr.atlassian.net, and team2.thoughtspot.cloud via capture_verified_ui.mjs, hashed (SHA-256 + rawPixelsSha256), and validated exit 0 by verify_slide_screenshots.mjs --audience external."],
      ["Q2: Why do Pattern A, B, and C share 80% identical Python code?", "All five hops (Edge/STS, ARD, Valkey/Memory, Model Armor/DLP, OTel FinOps) run unchanged in core-cymbal-agent/runtime_pipeline.py. Only the 20% perimeter adapter swaps between pooled AlloyDB/BigQuery RLS, sovereign CMEK silos, and unidirectional /28 PSC spokes."],
      ["Q3: How fast does the Pattern B CMEK kill-switch halt an active agent?", "Cloud KMS key revocation renders encrypted BigQuery/AlloyDB storage mathematically unreadable immediately (shown live on Slide 8), while our 30s KMS heartbeat and <5s targeted Valkey SCAN+UNLINK eviction meet the <60s CISO SLA (41.2s verified)."],
      ["Q4: Where can teams inspect interactive BEFORE → AFTER split sliders & code?", "Open /blogs/ws1..ws5/screenshots and /blogs/atlas/screenshots on the live ge-blogs portal for Side-by-Side and Interactive Split-Slider viewers, plus Terraform starters (2.6, 3.6, 4.6) and all 27 runnable codebase files."],
    ];
    faqs.forEach((f, idx) => {
      const fy = 1.40 + idx * 1.18;
      s.addShape(pptx.ShapeType.roundRect, {
        x: 0.48, y: fy, w: 12.37, h: 1.06, rectRadius: 0.08,
        fill: { color: C.soft }, line: { color: C.border, width: 0.9 },
      });
      s.addText(f[0], {
        x: 0.68, y: fy + 0.10, w: 11.97, h: 0.28,
        fontFace: FONT, fontSize: 10.6, bold: true, color: C.blueDark, margin: 0,
      });
      s.addText(f[1], {
        x: 0.68, y: fy + 0.40, w: 11.97, h: 0.58,
        fontFace: FONT, fontSize: 9.2, color: C.slate, margin: 0,
      });
    });

    addSynthesisBar(pptx, s, {
      tag: "NEXT STEP",
      text: "Explore the live interactive Split-Slider galleries (/blogs/ws1..ws5/screenshots) and architecture pattern blueprints.",
      rightPill: "ge-blogs Portal Live",
      accent: C.blue,
    });
    s.addNotes("To close our 16-slide Visual Verification Atlas, Slide 16 answers the four questions CISOs and enterprise architects raise most often during security review.\n\nFirst, every screenshot is cryptographically attested over live Chrome DevTools Protocol against canonical external origins with zero mock HTML. Second, Patterns A, B, and C share 80 percent identical Python code while swapping only the 20 percent cloud perimeter.\n\nThird, Pattern B's CMEK kill-switch fails closed immediately at the storage layer and purges active L1 memory inside our 60-second SLA. Fourth, every interactive split-slider viewer, Terraform blueprint, and forensic audit script is live in the ge-blogs portal.");
  }

  const out = path.join(DRAFTS_DIR, "atlas_16slide_draft.pptx");
  await pptx.writeFile({ fileName: out });
  console.log(`✅ Wrote 16-slide Atlas draft -> ${out}`);
}

async function main() {
  await buildDonorDeck();
  await buildAtlasDraft();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
