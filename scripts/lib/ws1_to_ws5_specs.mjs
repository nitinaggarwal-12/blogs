/**
 * Ground-Truth Parametric Architecture Specs for WS1–WS5 (1600x900 @ 7620 EMU/px).
 *
 * Every single metric, label, COGS tier order, and runtime assignment is verified directly
 * against `blogs/ws1..ws5-*.md` and `AGENTS.md`:
 *   - WS1: Ascending COGS ladder Tier 1 Pool (5A · 1.0x) -> Tier 2 Hybrid (5C · 1.8x–2.8x) -> Tier 3 Silo (5B · ~15x);
 *          Front End shows official GCP SVGs (Gemini, ADK, GKE, Cloud Run) per WS1 blog L45.
 *   - WS2: `Gemini 2.5 & 3P LLMs` (0 Gemini 3.8); 0 GKE on Front End (Gemini, ADK, Cloud Run, API);
 *          Pooled Agent Runtime explicitly shows Mode A (Cloud Run gVisor CoW) + Mode B (GKE WarmPool 403 Latch) per WS2 blog L24/35/79.
 *   - WS3: Confidential GKE (AMD SEV-SNP) + Gemma 3 (27B) on Dedicated Silo Runtime per WS3 blog L35/54/69/83;
 *          41.2s CMEK Halt, HTTP 423 Locked (CMEK), FIPS 140-3 Level 3 Cloud HSM.
 *   - WS4: `Gemini 2.5 & 3P LLMs` (0 Gemini 3.8); 0 GKE anywhere in WS4 (Cloud Run Gen2 gVisor hub only);
 *          950 Standard / 50 Enterprise, 1.8x–2.8x blended COGS, 0ms Atomic CAS Cutover.
 *   - WS5: Exact verbatim WS5 blog L38–40 3-Gate Selector (`~85% Prefix Cache`, `1.8x–2.8x COGS · 0ms Cutover`, `~15x COGS · 41.2s CMEK Halt`).
 */

import { PLANE_PALETTE } from './diagram_spec_compiler.mjs';

function makeStdLeftFanInEdges(idpId) {
  // Sophisticated converging #595959 orthogonal elbows (mid-gutter x = 184, entryY = 0.42 / 0.50 / 0.58)
  return [
    {
      id: 'e1', source: 'u_a', target: idpId,
      exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.42,
      points: [{ x: 184, y: 293 }, { x: 184, y: 363 }],
    },
    {
      id: 'e2', source: 'u_b', target: idpId,
      exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5,
    },
    {
      id: 'e3', source: 'u_c', target: idpId,
      exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.58,
      points: [{ x: 184, y: 473 }, { x: 184, y: 403 }],
    },
  ];
}

function makeStdPipelineEdges(idpId, ingressId, feId, gwInId, rtId, gwOutId, cpAuthId, cpRegId, cpSecId, sessId, memId, finId, obsId) {
  return [
    { id: 'e4', source: idpId, target: ingressId, exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
    { id: 'e5', source: ingressId, target: feId, exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
    { id: 'e6', source: feId, target: gwInId, exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
    { id: 'e7', source: gwInId, target: rtId, exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
    { id: 'e8', source: rtId, target: gwOutId, exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
    // Governance Control Plane drops (strictly orthogonal, clearing EVERY top-border plane pill!)
    // cp_auth x=518..852, gw_in x=716..894 -> enter gw_in at x=752 (entryX=0.20), pill sits right (x=772..896)
    {
      id: 'e9', source: cpAuthId, target: gwInId, dashed: true, stroke: '#1A73E8',
      exitX: 0.70, exitY: 1, entryX: 0.20, entryY: 0,
    },
    // cp_auth -> runtime at x=972 (entryX=0.22), clearing COMPUTE pill at x=1064..1132
    {
      id: 'e9b', source: cpAuthId, target: rtId, stroke: '#5F6368',
      exitX: 0.88, exitY: 1, entryX: 0.22, entryY: 0,
      points: [{ x: 812, y: 214 }, { x: 972, y: 214 }],
    },
    // cp_reg x=868..1202 (center 1035) -> runtime x=926..1134 (entryX=0.524 => x=1035 exact vertical!)
    {
      id: 'e10', source: cpRegId, target: rtId, stroke: '#5F6368',
      exitX: 0.50, exitY: 1, entryX: 0.524, entryY: 0,
    },
    // cp_sec x=1218..1556 -> gw_out x=1166..1344 -> enter gw_out at x=1202 (entryX=0.20), pill sits right (x=1222..1346)
    {
      id: 'e11', source: cpSecId, target: gwOutId, dashed: true, stroke: '#1A73E8',
      exitX: 0.14, exitY: 1, entryX: 0.20, entryY: 0,
      points: [{ x: 1265, y: 212 }, { x: 1202, y: 212 }],
    },
    // Bottom data & observability flows (razor-straight verticals & clean 90-deg elbows, ZERO pill overlap!)
    // app_layer x=564..684 -> sessions x=558..726 -> straight down at x=608 (exitX=0.367, entryX=0.298), pill sits right (x=626..728)
    {
      id: 'e12', source: feId, target: sessId,
      exitX: 0.367, exitY: 1, entryX: 0.298, entryY: 0,
    },
    { id: 'e13', source: sessId, target: memId, exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
    // runtime x=926..1134 -> mem_bank x=760..1134 -> straight vertical double-arrow at x=1052 (exitX=0.606, entryX=0.781), pills sit left (x=760..1016)!
    {
      id: 'e14', source: rtId, target: memId, bidirectional: true,
      exitX: 0.606, exitY: 1, entryX: 0.781, entryY: 0,
    },
    // runtime -> finops/cutover x=1168..1338 -> enters cleanly at x=1192 (entryX=0.141), pills sit right (x=1210..1342)!
    {
      id: 'e15', source: rtId, target: finId,
      exitX: 0.80, exitY: 1, entryX: 0.141, entryY: 0,
      points: [{ x: 1092, y: 528 }, { x: 1192, y: 528 }],
    },
    // Observability drops cleanly down vertical gutters (x=743, x=1151, x=1356) with explicit orthogonal first corners!
    {
      id: 'e16a', source: gwInId, target: obsId, dashed: true, stroke: '#595959',
      exitX: 0.15, exitY: 1, entryX: 0.237, entryY: 0,
      points: [{ x: 743, y: 524 }, { x: 743, y: 768 }],
    },
    {
      id: 'e16', source: rtId, target: obsId, dashed: true, stroke: '#595959',
      exitX: 0.96, exitY: 1, entryX: 0.76, entryY: 0,
      points: [{ x: 1126, y: 522 }, { x: 1151, y: 522 }, { x: 1151, y: 768 }],
    },
    {
      id: 'e16b', source: gwOutId, target: obsId, dashed: true, stroke: '#595959',
      exitX: 0.94, exitY: 1, entryX: 1, entryY: 0.5,
      points: [{ x: 1333, y: 522 }, { x: 1356, y: 522 }, { x: 1356, y: 809 }],
    },
  ];
}

function makeTargetEcoTiles(baseY) {
  return [
    { id: 'badge_tg_c1', x: 1400, y: baseY, w: 46, h: 46, icon: 'google_g', iconSize: 28, fill: '#FFFFFF', stroke: '#CBD5E1' },
    { id: 'badge_tg_c2', x: 1456, y: baseY, w: 46, h: 46, icon: 'gcp_cloud', iconSize: 28, fill: '#FFFFFF', stroke: '#CBD5E1' },
    { id: 'badge_tg_c3', x: 1512, y: baseY, w: 46, h: 46, icon: 'saas_globe', iconSize: 28, fill: '#FFFFFF', stroke: '#CBD5E1' },
  ];
}

/* ============================================================================
 * WS1 — Shared 5-Hop Multi-Tenant Agent Platform Architecture
 * ============================================================================ */
export function buildWs1Spec() {
  return {
    id: 'ws1-5hop-governance-baseline',
    diagramName: 'WS1 - 5-Hop Governance Baseline',
    title: 'WS1 - PART 1 - Shared 5-Hop Multi-Tenant Agent Platform Architecture',
    zones: [
      {
        id: 'zone_cp', x: 504, y: 74, w: 1066, h: 126, rx: 16,
        fill: '#F8F9FA', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true,
        title: 'Google Cloud — Shared 80% 5-Hop Governance & Control Plane (< 42ms p95 Overhead)',
        titleColor: '#1967D2', titleSize: 12,
      },
      { id: 'zone_hop1', x: 194, y: 236, w: 350, h: 282, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      { id: 'zone_fe', x: 556, y: 236, w: 136, h: 282, rx: 14, fill: 'none', stroke: PLANE_PALETTE.COMPUTE.zoneStroke, dashed: true },
      { id: 'zone_gw_in', x: 708, y: 236, w: 194, h: 282, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      { id: 'zone_rt', x: 918, y: 236, w: 224, h: 282, rx: 14, fill: 'none', stroke: PLANE_PALETTE.COMPUTE.zoneStroke, dashed: true },
      { id: 'zone_gw_out', x: 1158, y: 236, w: 194, h: 282, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      {
        id: 'zone_tgts', x: 1384, y: 236, w: 190, h: 516, rx: 16,
        fill: '#F8F9FA', stroke: '#DADCE0', dashed: false,
        title: 'Hop 5 Targets', titleColor: '#202124', titleSize: 12.5, titleAlign: 'center',
      },
      { id: 'zone_sess', x: 550, y: 548, w: 184, h: 204, rx: 14, fill: 'none', stroke: PLANE_PALETTE.DATA.zoneStroke, dashed: true },
      { id: 'zone_mem', x: 752, y: 548, w: 390, h: 204, rx: 14, fill: 'none', stroke: PLANE_PALETTE.DATA.zoneStroke, dashed: true },
      { id: 'zone_finops', x: 1160, y: 548, w: 186, h: 204, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      { id: 'zone_obs', x: 550, y: 772, w: 796, h: 74, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
    ],
    labels: [
      { id: 'lbl_users', x: 24, y: 228, w: 142, h: 20, text: 'Caller Tiers', size: 13, align: 'center' },
      { id: 'lbl_tgts_sub', x: 1390, y: 716, w: 178, h: 16, text: 'Google • Google Cloud • SaaS', size: 9.5, bold: false, color: '#5F6368', align: 'center' },
    ],
    cards: [
      // Top Control Plane cards
      {
        id: 'cp_auth', x: 518, y: 108, w: 334, h: 80, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'cloud_iam', iconPos: 'left', iconSize: 22,
        lines: [
          { text: 'Hop 1–2 · Auth Manager & STS', bold: true, size: 11.5, color: '#202124' },
          { text: 'RFC 8693 OBO + RFC 9449 DPoP (<0.15ms JWKS)', size: 10, color: '#5F6368', gapTop: 3 },
          { text: 'Mints ECDSA P-256 STS JWT & 2LO/3LO CAB', size: 10, color: '#5F6368', gapTop: 2 },
        ],
      },
      {
        id: 'cp_reg', x: 868, y: 108, w: 334, h: 80, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'agent_registry', iconPos: 'left', iconSize: 22,
        lines: [
          { text: 'Hop 2 · Agent Registry (ARD)', bold: true, size: 11.5, color: '#202124' },
          { text: 'Tenant-scoped catalog • Approved destinations', size: 10, color: '#5F6368', gapTop: 3 },
          { text: 'Dynamic MCP schema pruning (-94% tokens)', size: 10, color: '#5F6368', gapTop: 2 },
        ],
      },
      {
        id: 'cp_sec', x: 1218, y: 108, w: 338, h: 80, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'model_armor', iconPos: 'left', iconSize: 22,
        lines: [
          { text: 'Hop 4 · Model Armor & DLP', bold: true, size: 11.5, color: '#202124' },
          { text: 'Inline Model Armor & Cloud DLP screen (<8ms)', size: 10, color: '#5F6368', gapTop: 3 },
          { text: 'Blocks indirect RAG injection & PII/PHI egress', size: 10, color: '#5F6368', gapTop: 2 },
        ],
      },
      // Left Caller Tiers (strictly ascending COGS ladder: Pool 1.0x -> Hybrid 1.8x-2.8x -> Silo ~15x)
      {
        id: 'u_a', x: 24, y: 256, w: 142, h: 74, fill: '#E8F0FE', stroke: '#93C5FD', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Tier 1: Pool', bold: true, size: 13, color: '#1E3A8A' },
          { text: '950+ SaaS Tenants (1.0x)', size: 10, color: '#1D4ED8', gapTop: 3 },
        ],
      },
      {
        id: 'u_b', x: 24, y: 346, w: 142, h: 74, fill: '#FEF7E0', stroke: '#FCD34D', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Tier 2: Hybrid', bold: true, size: 13, color: '#78350F' },
          { text: '/28 PSC Spokes (1.8–2.8x)', size: 10, color: '#B45309', gapTop: 3 },
        ],
      },
      {
        id: 'u_c', x: 24, y: 436, w: 142, h: 74, fill: '#F3E8FD', stroke: '#C4B5FD', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Tier 3: Silo', bold: true, size: 13, color: '#4C1D95' },
          { text: 'Dedicated Project (~15x)', size: 10, color: '#6D28D9', gapTop: 3 },
        ],
      },
      // Hop 1A & Hop 1B (vertically centered with top official GCP icon)
      {
        id: 'idp', x: 202, y: 256, w: 156, h: 254, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'cloud_iam', iconPos: 'top', iconSize: 24,
        lines: [
          { text: 'Hop 1A · Identity', bold: true, size: 11.5, color: '#202124' },
          { text: '& Workforce WIF', bold: true, size: 11.5, color: '#202124' },
          { text: '• Short-lived OIDC', size: 10, color: '#5F6368', gapTop: 6 },
          { text: '• Verified tenant_id', size: 10, color: '#5F6368', gapTop: 3 },
          { text: '• OIDC / SAML Fed.', size: 10, color: '#5F6368', gapTop: 3 },
          { text: '• Zero directory sync', size: 10, color: '#5F6368', gapTop: 3 },
        ],
      },
      {
        id: 'ingress', x: 378, y: 256, w: 158, h: 254, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'cloud_load_balancing', iconPos: 'top', iconSize: 24,
        lines: [
          { text: 'Hop 1B · Edge PEP', bold: true, size: 11.5, color: '#202124' },
          { text: '& External ALB', bold: true, size: 11.5, color: '#202124' },
          { text: '• Strips X-Tenant-ID', size: 10, color: '#5F6368', gapTop: 6 },
          { text: '• Cloud Armor WAF', size: 10, color: '#5F6368', gapTop: 3 },
          { text: '• JWKS (<0.15ms) + JTI', size: 10, color: '#5F6368', gapTop: 3 },
          { text: '• Mints P-256 STS JWT', size: 10, color: '#5F6368', gapTop: 3 },
        ],
      },
      // Front End (matches blogs/ws1-*.md L45: Gemini / ADK / GKE / Run with official GCP SVGs)
      {
        id: 'app_layer', x: 564, y: 256, w: 120, h: 254, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, align: 'center', padT: 14,
        lines: [
          { text: 'Front End', bold: true, size: 12.5, color: '#202124' },
          { text: '80% Shared App', size: 10, color: '#5F6368', gapTop: 2 },
        ],
        tiles: [
          { id: 'badge_fe_c1', x: 574, y: 326, w: 46, h: 52, icon: 'gemini', iconSize: 24, label: 'Gemini', fill: '#EFF6FF', stroke: '#93C5FD' },
          { id: 'badge_fe_c2', x: 628, y: 326, w: 46, h: 52, icon: 'adk', iconSize: 24, label: 'ADK', fill: '#EFF6FF', stroke: '#93C5FD' },
          { id: 'badge_fe_c3', x: 574, y: 392, w: 46, h: 52, icon: 'gke', iconSize: 24, label: 'GKE', fill: '#ECFDF5', stroke: '#86EFAC' },
          { id: 'badge_fe_c4', x: 628, y: 392, w: 46, h: 52, icon: 'cloud_run', iconSize: 24, label: 'Run', fill: '#EFF6FF', stroke: '#93C5FD' },
        ],
      },
      // Inbound Agent Gateway (Hop 2)
      { id: 'gw_in_box', x: 716, y: 256, w: 178, h: 254, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, rx: 14, lines: [] },
      {
        id: 'gw_in_hdr', x: 716, y: 256, w: 178, h: 42, fill: '#1A73E8', stroke: 'none', rx: 12,
        icon: 'agent_gateway', iconPos: 'header-left', iconSize: 24, align: 'left', padL: 44,
        lines: [{ text: 'Agent Gateway', bold: true, size: 12.5, color: '#FFFFFF' }],
      },
      {
        id: 'gw_in_body', x: 724, y: 306, w: 162, h: 196, fill: '#F8FAFC', stroke: '#BFDBFE', rx: 10,
        lines: [
          { text: 'Hop 2 · Client-to-Agent', bold: true, size: 11, color: '#1E3A8A' },
          { text: '• Verifies STS JWT &', size: 10, color: '#334155', gapTop: 7 },
          { text: '  DPoP (<0.15ms JWKS)', size: 10, color: '#334155' },
          { text: '• ARD Catalog PDP', size: 10, color: '#334155', gapTop: 5 },
          { text: '  (-94% tool tokens)', size: 10, color: '#334155' },
          { text: '• Model Armor Input', size: 10, color: '#334155', gapTop: 5 },
          { text: '  Screen (<8ms)', size: 10, color: '#334155' },
        ],
      },
      // Hop 3 ADK Runtime
      {
        id: 'runtime', x: 926, y: 256, w: 208, h: 254, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, rx: 14,
        icon: 'cloud_run', iconPos: 'top-left', iconSize: 22, padL: 42, padT: 12,
        lines: [
          { text: 'Hop 3 · ADK Runtime', bold: true, size: 12, color: '#202124' },
          { text: 'Cloud Run Gen2 gVisor', size: 10, color: '#5F6368', gapTop: 1 },
        ],
      },
      {
        id: 'adk_orch', x: 936, y: 318, w: 188, h: 182, fill: '#F8F9FA', stroke: '#DADCE0', rx: 10,
        lines: [
          { text: 'ADK Agent Orchestrator', bold: true, size: 11, color: '#202124' },
          { text: '• Warm gVisor (concurrency=1)', size: 9.8, color: '#5F6368', gapTop: 6 },
          { text: '• CoW --max-requests=1', size: 9.8, color: '#5F6368', gapTop: 4 },
          { text: '  (1-Turn Heap Wipe)', size: 9.8, color: '#5F6368' },
          { text: '• Immutable 32k prefix', size: 9.8, color: '#5F6368', gapTop: 4 },
          { text: '  (89.1% net input savings)', size: 9.8, color: '#5F6368' },
          { text: '• Locks (tenant_id, sub)', size: 9.8, color: '#5F6368', gapTop: 4 },
        ],
      },
      // Outbound Agent Gateway (Hop 4)
      { id: 'gw_out_box', x: 1166, y: 256, w: 178, h: 254, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, rx: 14, lines: [] },
      {
        id: 'gw_out_hdr', x: 1166, y: 256, w: 178, h: 42, fill: '#1A73E8', stroke: 'none', rx: 12,
        icon: 'agent_gateway', iconPos: 'header-left', iconSize: 24, align: 'left', padL: 44,
        lines: [{ text: 'Agent Gateway', bold: true, size: 12.5, color: '#FFFFFF' }],
      },
      {
        id: 'gw_out_body', x: 1174, y: 306, w: 162, h: 196, fill: '#F8FAFC', stroke: '#BFDBFE', rx: 10,
        lines: [
          { text: 'Hop 4 · Agent-to-Target', bold: true, size: 11, color: '#1E3A8A' },
          { text: '• Outbound Agent', size: 10, color: '#334155', gapTop: 7 },
          { text: '  Gateway & DLP', size: 10, color: '#334155' },
          { text: '• User-Scoped 2LO/3LO', size: 10, color: '#334155', gapTop: 5 },
          { text: '  OBO Token Binding', size: 10, color: '#334155' },
          { text: '• Tier Router: Pool /', size: 10, color: '#334155', gapTop: 5 },
          { text: '  /28 PSC / Silo', size: 10, color: '#334155' },
        ],
      },
      // Right Hop 5 Targets (ascending COGS: 5A Pool -> 5C Hybrid -> 5B Silo -> HSM CMEK & APIs)
      {
        id: 'mcp_srv', x: 1396, y: 288, w: 166, h: 78, fill: '#ECFDF5', stroke: '#34D399', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Hop 5A · Shared Pool', bold: true, size: 11.8, color: '#065F46' },
          { text: 'AlloyDB FORCE RLS', size: 10, color: '#047857', gapTop: 3 },
        ],
      },
      {
        id: 'a2a_srv', x: 1396, y: 378, w: 166, h: 78, fill: '#EFF6FF', stroke: '#60A5FA', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Hop 5C · Hybrid PSC', bold: true, size: 11.8, color: '#1E3A8A' },
          { text: '/28 PSC Spoke VPCs', size: 10, color: '#1D4ED8', gapTop: 3 },
        ],
      },
      {
        id: 'llm_srv', x: 1396, y: 468, w: 166, h: 78, fill: '#F3E8FD', stroke: '#C4B5FD', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Hop 5B · Sovereign Silo', bold: true, size: 11.5, color: '#6B21A8' },
          { text: 'Dedicated GCP Project', size: 10, color: '#7E22CE', gapTop: 3 },
        ],
      },
      {
        id: 'ent_api', x: 1396, y: 558, w: 166, h: 78, fill: '#FFFBEB', stroke: '#FBBF24', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'HSM CMEK & APIs', bold: true, size: 11.8, color: '#78350F' },
          { text: 'VPC-SC & <60s Halt', size: 10, color: '#B45309', gapTop: 3 },
        ],
        tiles: makeTargetEcoTiles(660),
      },
      // Bottom row cards
      {
        id: 'sessions', x: 558, y: 562, w: 168, h: 182, fill: '#FFFFFF', stroke: '#DADCE0', rx: 14,
        icon: 'memorystore', iconPos: 'top', iconSize: 24,
        lines: [
          { text: 'Sessions', bold: true, size: 12, color: '#202124' },
          { text: '(Hop 3 Valkey)', bold: true, size: 11.5, color: '#202124' },
          { text: '• Valkey 0.4ms state', size: 10, color: '#5F6368', gapTop: 6 },
          { text: '• Key: {tenant}:{user}', size: 10, color: '#5F6368', gapTop: 3 },
          { text: '• Singleflight lock', size: 10, color: '#5F6368', gapTop: 3 },
          { text: '• Scoped UNLINK <5s', size: 10, color: '#5F6368', gapTop: 3 },
        ],
      },
      {
        id: 'mem_bank', x: 760, y: 562, w: 374, h: 182, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, rx: 14, padT: 10,
        lines: [{ text: 'Hop 5 Memory Bank & Data (Pool / PSC / Silo)', bold: true, size: 11.5, color: '#202124' }],
      },
      {
        id: 'mb_1', x: 774, y: 596, w: 346, h: 40, fill: '#E8F0FE', stroke: '#93C5FD', strokeWidth: 1.4, shadow: true, align: 'center', rx: 10,
        lines: [{ text: 'Hop 5A (Pool): FORCE ROW LEVEL SECURITY', bold: true, size: 11.5, color: '#1E3A8A' }],
      },
      {
        id: 'mb_2', x: 774, y: 644, w: 346, h: 40, fill: '#FEF7E0', stroke: '#FCD34D', strokeWidth: 1.4, shadow: true, align: 'center', rx: 10,
        lines: [{ text: 'Hop 5C (Hybrid): /28 PSC Spoke VPCs (0ms)', bold: true, size: 11.5, color: '#78350F' }],
      },
      {
        id: 'mb_3', x: 774, y: 692, w: 346, h: 40, fill: '#F3E8FD', stroke: '#C4B5FD', strokeWidth: 1.4, shadow: true, align: 'center', rx: 10,
        lines: [{ text: 'Hop 5B (Silo): Dedicated GCP Project + HSM CMEK', bold: true, size: 11.5, color: '#4C1D95' }],
      },
      {
        id: 'finops_bulkhead', x: 1168, y: 562, w: 170, h: 182, fill: '#E6F4EA', stroke: '#81C995', rx: 14,
        icon: 'finops', iconPos: 'top', iconSize: 24,
        lines: [
          { text: 'Hop 3 FinOps &', bold: true, size: 11.8, color: '#137333' },
          { text: 'Rate Bulkhead', bold: true, size: 11.8, color: '#137333' },
          { text: '• 120/600 RPM Cap', size: 10, color: '#3C4043', gapTop: 6 },
          { text: '• 32k Prefix Cache', size: 10, color: '#3C4043', gapTop: 3 },
          { text: '• 0.10x Cached Rate', size: 10, color: '#3C4043', gapTop: 3 },
          { text: '• 89.1% Input Savings', size: 10, color: '#3C4043', gapTop: 3 },
        ],
      },
      {
        id: 'obs_bar', x: 558, y: 780, w: 780, h: 58, fill: '#FFFFFF', stroke: '#DADCE0', rx: 12,
        icon: 'cloud_monitoring', iconPos: 'left', iconSize: 22,
        lines: [
          { text: 'AI Observability & Fail-Closed Circuit Breakers — HTTP 401 / 403 / 429 / 422', bold: true, size: 12, color: '#202124' },
          { text: 'Zero-PII SHA-256 prompt hashing • BigQuery FinOps chargeback • <60s (41.2s) HSM CMEK kill-switch audit', size: 10, color: '#5F6368', gapTop: 3 },
        ],
      },
    ],
    planeGuide: {
      id: 'plane_guide', x: 24, y: 548, w: 510, h: 298,
      title: 'WHO RUNS WHAT IN WS1 (5-HOP CONTROL PLANE)',
      rows: [
        { plane: 'CONTROL', headline: 'Hops 1, 2 & 4 + Hop 3 rate cap + Hop 5 perimeters & audit', detail: '80% shared across all tiers: Edge PEP, STS DPoP broker, both Gateways, ARD PDP, Model Armor DLP, Valkey cap & OTel.' },
        { plane: 'COMPUTE', headline: 'Front end, Hop 3 ADK runtime (Cloud Run Gen2 gVisor) & 32k prefix', detail: 'Runs identical core ADK Python code across every tier; pooled in Patterns A/C or dedicated per project in Pattern B.' },
        { plane: 'DATA', headline: 'Hop 3 Valkey sessions + Hop 5 20% per-pattern tenant stores', detail: 'Only the 20% Hop 5 perimeter changes by tier: FORCE ROW LEVEL SECURITY pool (A), /28 PSC spoke (C), or HSM CMEK silo (B).' },
      ],
      footnote: 'Caller tiers (left) are not a plane. The 80% 5-Hop pipeline stays identical while Hop 5 routes each turn to Pool, PSC Spoke, or Silo.',
    },
    pills: [
      { id: 'plane_pill_cp', plane: 'CONTROL', text: 'CONTROL · governance', x: 1412, y: 65, w: 146, h: 18 },
      { id: 'plane_pill_hop1', plane: 'CONTROL', text: 'CONTROL · Hop 1 identity + ingress', x: 204, y: 227, w: 194, h: 18 },
      { id: 'plane_pill_fe', plane: 'COMPUTE', text: 'COMPUTE', x: 590, y: 227, w: 68, h: 18 },
      { id: 'plane_pill_gwin', plane: 'CONTROL', text: 'CONTROL · Hop 2 PEP', x: 772, y: 227, w: 124, h: 18 },
      { id: 'plane_pill_rt', plane: 'COMPUTE', text: 'COMPUTE', x: 1064, y: 227, w: 68, h: 18 },
      { id: 'plane_pill_gwout', plane: 'CONTROL', text: 'CONTROL · Hop 4 PEP', x: 1222, y: 227, w: 124, h: 18 },
      { id: 'plane_pill_tgts_data', plane: 'DATA', text: 'DATA · Hop 5', x: 1396, y: 266, w: 76, h: 16 },
      { id: 'plane_pill_tgts_ctl', plane: 'CONTROL', text: 'CONTROL', x: 1478, y: 266, w: 84, h: 16 },
      { id: 'plane_pill_tgts_cmek', plane: 'CONTROL', text: 'CONTROL · CMEK', x: 1390, y: 742, w: 98, h: 18 },
      { id: 'plane_pill_tgts_api', plane: 'DATA', text: 'DATA · APIs', x: 1494, y: 742, w: 74, h: 18 },
      { id: 'plane_pill_sess', plane: 'DATA', text: 'DATA · sessions', x: 632, y: 539, w: 96, h: 18 },
      { id: 'plane_pill_mem_d', plane: 'DATA', text: 'DATA · Hop 5 stores', x: 760, y: 539, w: 118, h: 18 },
      { id: 'plane_pill_mem_c', plane: 'CONTROL', text: 'CONTROL · perimeters', x: 884, y: 539, w: 126, h: 18 },
      { id: 'plane_pill_fin_c', plane: 'CONTROL', text: 'CONTROL', x: 1212, y: 539, w: 62, h: 18 },
      { id: 'plane_pill_fin_m', plane: 'COMPUTE', text: 'COMPUTE', x: 1278, y: 539, w: 64, h: 18 },
      { id: 'plane_pill_obs', plane: 'CONTROL', text: 'CONTROL · audit + breakers', x: 1184, y: 763, w: 152, h: 18 },
    ],
    edges: [
      ...makeStdLeftFanInEdges('idp'),
      ...makeStdPipelineEdges('idp', 'ingress', 'app_layer', 'gw_in_box', 'runtime', 'gw_out_box', 'cp_auth', 'cp_reg', 'cp_sec', 'sessions', 'mem_bank', 'finops_bulkhead', 'obs_bar'),
      // Right Fan-Out (clean diverging #595959 orthogonal elbows across x=1370 gutter, ZERO pill clipping!)
      { id: 'e17', source: 'gw_out_box', target: 'mcp_srv', exitX: 1, exitY: 0.28, entryX: 0, entryY: 0.5 },
      { id: 'e18', source: 'gw_out_box', target: 'a2a_srv', exitX: 1, exitY: 0.56, entryX: 0, entryY: 0.5, points: [{ x: 1370, y: 398 }, { x: 1370, y: 417 }] },
      { id: 'e19', source: 'gw_out_box', target: 'llm_srv', exitX: 1, exitY: 0.72, entryX: 0, entryY: 0.5, points: [{ x: 1370, y: 439 }, { x: 1370, y: 507 }] },
      { id: 'e20', source: 'gw_out_box', target: 'ent_api', exitX: 1, exitY: 0.86, entryX: 0, entryY: 0.5, points: [{ x: 1370, y: 474 }, { x: 1370, y: 597 }] },
    ],
  };
}

/* ============================================================================
 * WS2 — Pattern A: Pooled Multi-Tenant Agent Platform Architecture
 * ============================================================================ */
export function buildWs2Spec() {
  return {
    id: 'ws2-pattern-a-pooled',
    diagramName: 'WS2 - Pattern A Pooled',
    title: 'WS2 - PART 2 - Pooled Multi-Tenant Agent Platform Architecture (Pattern A: Pool)',
    zones: [
      {
        id: 'zone_cp', x: 504, y: 74, w: 1066, h: 126, rx: 16,
        fill: '#F8F9FA', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true,
        title: 'Google Cloud — Centralized Multi-Tenant Governance & Control Plane',
        titleColor: '#1967D2', titleSize: 12,
      },
      { id: 'zone_hop1', x: 194, y: 236, w: 350, h: 282, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      { id: 'zone_fe', x: 556, y: 236, w: 136, h: 282, rx: 14, fill: 'none', stroke: PLANE_PALETTE.COMPUTE.zoneStroke, dashed: true },
      { id: 'zone_gw_in', x: 708, y: 236, w: 194, h: 282, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      { id: 'zone_rt', x: 918, y: 236, w: 224, h: 282, rx: 14, fill: 'none', stroke: PLANE_PALETTE.COMPUTE.zoneStroke, dashed: true },
      { id: 'zone_gw_out', x: 1158, y: 236, w: 194, h: 282, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      {
        id: 'zone_tgts', x: 1384, y: 236, w: 190, h: 516, rx: 16,
        fill: '#F8F9FA', stroke: '#DADCE0', dashed: false,
        title: 'Targets', titleColor: '#202124', titleSize: 12.5, titleAlign: 'center',
      },
      { id: 'zone_tgts_compute', x: 1390, y: 274, w: 178, h: 278, rx: 12, fill: 'none', stroke: PLANE_PALETTE.COMPUTE.zoneStroke, dashed: true },
      { id: 'zone_sess', x: 550, y: 548, w: 184, h: 204, rx: 14, fill: 'none', stroke: PLANE_PALETTE.DATA.zoneStroke, dashed: true },
      { id: 'zone_mem', x: 752, y: 548, w: 390, h: 204, rx: 14, fill: 'none', stroke: PLANE_PALETTE.DATA.zoneStroke, dashed: true },
      { id: 'zone_finops', x: 1160, y: 548, w: 186, h: 204, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      { id: 'zone_obs', x: 550, y: 772, w: 796, h: 74, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
    ],
    labels: [
      { id: 'lbl_users', x: 24, y: 228, w: 142, h: 20, text: 'Users', size: 13, align: 'center' },
      { id: 'lbl_tgts_sub', x: 1390, y: 716, w: 178, h: 16, text: 'Google • Google Cloud • SaaS', size: 9.5, bold: false, color: '#5F6368', align: 'center' },
    ],
    cards: [
      {
        id: 'cp_auth', x: 518, y: 108, w: 334, h: 80, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'cloud_iam', iconPos: 'left', iconSize: 22,
        lines: [
          { text: 'Auth Manager & Identity', bold: true, size: 11.5, color: '#202124' },
          { text: 'Access authorization • IAM default-deny & IAP', size: 10, color: '#5F6368', gapTop: 3 },
          { text: 'Delegated OBO & 3LO exchange + RFC 9449 DPoP', size: 10, color: '#5F6368', gapTop: 2 },
        ],
      },
      {
        id: 'cp_reg', x: 868, y: 108, w: 334, h: 80, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'agent_registry', iconPos: 'left', iconSize: 22,
        lines: [
          { text: 'Agent Registry', bold: true, size: 11.5, color: '#202124' },
          { text: 'Tenant-scoped catalog • Approved destinations', size: 10, color: '#5F6368', gapTop: 3 },
          { text: 'Dynamic MCP schema pruning (-94% tokens)', size: 10, color: '#5F6368', gapTop: 2 },
        ],
      },
      {
        id: 'cp_sec', x: 1218, y: 108, w: 338, h: 80, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'model_armor', iconPos: 'left', iconSize: 22,
        lines: [
          { text: 'AI Security & Semantic Governance', bold: true, size: 11.5, color: '#202124' },
          { text: 'Inline Model Armor & Cloud DLP inspection', size: 10, color: '#5F6368', gapTop: 3 },
          { text: 'Shared 32k prefix cache & Valkey token budgets', size: 10, color: '#5F6368', gapTop: 2 },
        ],
      },
      {
        id: 'u_a', x: 24, y: 256, w: 142, h: 74, fill: '#E8F0FE', stroke: '#93C5FD', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Tenant A', bold: true, size: 13.5, color: '#1E3A8A' },
          { text: 'IdP: non-google', size: 10.5, color: '#1D4ED8', gapTop: 3 },
        ],
      },
      {
        id: 'u_b', x: 24, y: 346, w: 142, h: 74, fill: '#FEF7E0', stroke: '#FCD34D', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Tenant B', bold: true, size: 13.5, color: '#78350F' },
          { text: 'IdP: Google', size: 10.5, color: '#B45309', gapTop: 3 },
        ],
      },
      {
        id: 'u_c', x: 24, y: 436, w: 142, h: 74, fill: '#F3E8FD', stroke: '#C4B5FD', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Tenant C', bold: true, size: 13.5, color: '#4C1D95' },
          { text: 'IdP: non-google', size: 10.5, color: '#6D28D9', gapTop: 3 },
        ],
      },
      {
        id: 'idp', x: 202, y: 256, w: 156, h: 254, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'cloud_iam', iconPos: 'top', iconSize: 24,
        lines: [
          { text: 'Google Identity', bold: true, size: 11.8, color: '#202124' },
          { text: 'Platform', bold: true, size: 11.8, color: '#202124' },
          { text: '• Short-lived OIDC', size: 10, color: '#5F6368', gapTop: 6 },
          { text: '• Verified tenant_id', size: 10, color: '#5F6368', gapTop: 3 },
          { text: '• OIDC / SAML Fed.', size: 10, color: '#5F6368', gapTop: 3 },
          { text: '• Zero directory sync', size: 10, color: '#5F6368', gapTop: 3 },
        ],
      },
      {
        id: 'ingress', x: 378, y: 256, w: 158, h: 254, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'cloud_load_balancing', iconPos: 'top', iconSize: 24,
        lines: [
          { text: 'Pooled SaaS Ingress', bold: true, size: 11.5, color: '#202124' },
          { text: 'API Gateway', bold: true, size: 11.5, color: '#202124' },
          { text: '• Tenant Onboarding', size: 10, color: '#5F6368', gapTop: 6 },
          { text: '  & Routing', size: 10, color: '#5F6368' },
          { text: '• Per-Tenant Rate', size: 10, color: '#5F6368', gapTop: 4 },
          { text: '  Limiting (120/600)', size: 10, color: '#5F6368' },
          { text: '• Metering & Cost', size: 10, color: '#5F6368', gapTop: 4 },
        ],
      },
      // Front End: ZERO GKE on WS2 Front End! (GKE WarmPool belongs inside Pooled Agent Runtime Mode B)
      {
        id: 'app_layer', x: 564, y: 256, w: 120, h: 254, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, align: 'center', padT: 14,
        lines: [
          { text: 'Front End', bold: true, size: 12.5, color: '#202124' },
          { text: 'Pooled App Layer', size: 9.8, color: '#5F6368', gapTop: 2 },
        ],
        tiles: [
          { id: 'badge_fe_c1', x: 574, y: 326, w: 46, h: 52, icon: 'gemini', iconSize: 24, label: 'Gemini', fill: '#EFF6FF', stroke: '#93C5FD' },
          { id: 'badge_fe_c2', x: 628, y: 326, w: 46, h: 52, icon: 'adk', iconSize: 24, label: 'ADK', fill: '#EFF6FF', stroke: '#93C5FD' },
          { id: 'badge_fe_c3', x: 574, y: 392, w: 46, h: 52, icon: 'cloud_run', iconSize: 24, label: 'Run', fill: '#EFF6FF', stroke: '#93C5FD' },
          { id: 'badge_fe_c4', x: 628, y: 392, w: 46, h: 52, icon: 'api_gateway', iconSize: 24, label: 'API', fill: '#F8FAFC', stroke: '#CBD5E1' },
        ],
      },
      { id: 'gw_in_box', x: 716, y: 256, w: 178, h: 254, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, rx: 14, lines: [] },
      {
        id: 'gw_in_hdr', x: 716, y: 256, w: 178, h: 42, fill: '#1A73E8', stroke: 'none', rx: 12,
        icon: 'agent_gateway', iconPos: 'header-left', iconSize: 24, align: 'left', padL: 44,
        lines: [{ text: 'Agent Gateway', bold: true, size: 12.5, color: '#FFFFFF' }],
      },
      {
        id: 'gw_in_body', x: 724, y: 306, w: 162, h: 196, fill: '#F8FAFC', stroke: '#BFDBFE', rx: 10,
        lines: [
          { text: 'Client-to-Agent', bold: true, size: 11.5, color: '#1E3A8A' },
          { text: '• Verifies JWT & Tenant', size: 10, color: '#334155', gapTop: 7 },
          { text: '  Claim (<0.15ms JWKS)', size: 10, color: '#334155' },
          { text: '• End-to-End Context', size: 10, color: '#334155', gapTop: 5 },
          { text: '  Propagation', size: 10, color: '#334155' },
          { text: '• Model Armor Input', size: 10, color: '#334155', gapTop: 5 },
          { text: '  Screening (<8ms)', size: 10, color: '#334155' },
        ],
      },
      // Pooled Agent Runtime: Mode A (Cloud Run gVisor CoW) + Mode B (GKE WarmPool 403 Latch) per WS2 blog L24/35/79
      {
        id: 'runtime', x: 926, y: 256, w: 208, h: 254, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, rx: 14,
        icon: 'cloud_run', iconPos: 'top-left', iconSize: 22, padL: 42, padT: 12,
        lines: [
          { text: 'Pooled Agent Runtime', bold: true, size: 12, color: '#202124' },
          { text: 'Agent Identity (SPIFFE)', size: 10, color: '#5F6368', gapTop: 1 },
        ],
      },
      {
        id: 'adk_orch', x: 936, y: 318, w: 188, h: 182, fill: '#F8F9FA', stroke: '#DADCE0', rx: 10,
        lines: [
          { text: 'ADK Agent Orchestrator', bold: true, size: 11, color: '#202124' },
          { text: '• Mode A: Cloud Run gVisor', size: 9.7, color: '#5F6368', gapTop: 6 },
          { text: '  CoW --max-requests=1', size: 9.7, color: '#5F6368' },
          { text: '• Mode B: GKE WarmPool', size: 9.7, color: '#5F6368', gapTop: 4 },
          { text: '  (403 Sticky Latch)', size: 9.7, color: '#5F6368' },
          { text: '• 32k Shared Prefix Cache', size: 9.7, color: '#5F6368', gapTop: 4 },
          { text: '• Dynamic Tool Routing', size: 9.7, color: '#5F6368', gapTop: 4 },
        ],
      },
      { id: 'gw_out_box', x: 1166, y: 256, w: 178, h: 254, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, rx: 14, lines: [] },
      {
        id: 'gw_out_hdr', x: 1166, y: 256, w: 178, h: 42, fill: '#1A73E8', stroke: 'none', rx: 12,
        icon: 'agent_gateway', iconPos: 'header-left', iconSize: 24, align: 'left', padL: 44,
        lines: [{ text: 'Agent Gateway', bold: true, size: 12.5, color: '#FFFFFF' }],
      },
      {
        id: 'gw_out_body', x: 1174, y: 306, w: 162, h: 196, fill: '#F8FAFC', stroke: '#BFDBFE', rx: 10,
        lines: [
          { text: 'Agent-to-Anywhere', bold: true, size: 11.2, color: '#1E3A8A' },
          { text: '• Tenant-Scoped Tool', size: 10, color: '#334155', gapTop: 7 },
          { text: '  & MCP Access', size: 10, color: '#334155' },
          { text: '• User-Scoped OBO', size: 10, color: '#334155', gapTop: 5 },
          { text: '  Token Binding', size: 10, color: '#334155' },
          { text: '• Output DLP & Token', size: 10, color: '#334155', gapTop: 5 },
          { text: '  Metering', size: 10, color: '#334155' },
        ],
      },
      // Right Targets (clean COMPUTE sub-box + Gemini 2.5 & 3P LLMs, ZERO Gemini 3.8!)
      {
        id: 'mcp_srv', x: 1398, y: 294, w: 162, h: 74, fill: '#ECFDF5', stroke: '#34D399', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Pooled MCP Servers', bold: true, size: 11.8, color: '#065F46' },
          { text: 'Tools (JSON-RPC)', size: 10, color: '#047857', gapTop: 3 },
        ],
      },
      {
        id: 'a2a_srv', x: 1398, y: 378, w: 162, h: 74, fill: '#EFF6FF', stroke: '#60A5FA', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Pooled A2A Agents', bold: true, size: 11.8, color: '#1E3A8A' },
          { text: 'Domain peer agents', size: 10, color: '#1D4ED8', gapTop: 3 },
        ],
      },
      {
        id: 'llm_srv', x: 1398, y: 462, w: 162, h: 74, fill: '#F3E8FD', stroke: '#C4B5FD', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Pooled Models', bold: true, size: 11.8, color: '#6B21A8' },
          { text: 'Gemini 2.5 & 3P LLMs', size: 10, color: '#4C1D95', gapTop: 3 },
        ],
      },
      {
        id: 'ent_api', x: 1398, y: 564, w: 162, h: 76, fill: '#FFFBEB', stroke: '#FBBF24', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Enterprise APIs', bold: true, size: 11.8, color: '#78350F' },
          { text: 'SaaS & Internal APIs', size: 10, color: '#B45309', gapTop: 3 },
        ],
        tiles: makeTargetEcoTiles(660),
      },
      // Bottom row cards
      {
        id: 'sessions', x: 558, y: 562, w: 168, h: 182, fill: '#FFFFFF', stroke: '#DADCE0', rx: 14,
        icon: 'memorystore', iconPos: 'top', iconSize: 24,
        lines: [
          { text: 'Sessions', bold: true, size: 12, color: '#202124' },
          { text: '(Agent Runtime)', bold: true, size: 11.5, color: '#202124' },
          { text: '• Valkey 0.4ms state', size: 10, color: '#5F6368', gapTop: 6 },
          { text: '• Key: {tenant}:{user}', size: 10, color: '#5F6368', gapTop: 3 },
          { text: '• Auto-TTL eviction', size: 10, color: '#5F6368', gapTop: 3 },
          { text: '• Scoped UNLINK <5s', size: 10, color: '#5F6368', gapTop: 3 },
        ],
      },
      {
        id: 'mem_bank', x: 760, y: 562, w: 374, h: 182, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, rx: 14, padT: 10,
        lines: [{ text: 'Pooled Memory Bank & Data (AlloyDB FORCE RLS)', bold: true, size: 11.5, color: '#202124' }],
      },
      {
        id: 'mb_1', x: 774, y: 596, w: 346, h: 40, fill: '#E8F0FE', stroke: '#93C5FD', strokeWidth: 1.4, shadow: true, align: 'center', rx: 10,
        lines: [{ text: "Tenant A (WHERE tenant_id = 'tenant-a')", bold: true, size: 11.5, color: '#1E3A8A' }],
      },
      {
        id: 'mb_2', x: 774, y: 644, w: 346, h: 40, fill: '#FEF7E0', stroke: '#FCD34D', strokeWidth: 1.4, shadow: true, align: 'center', rx: 10,
        lines: [{ text: "Tenant B (WHERE tenant_id = 'tenant-b')", bold: true, size: 11.5, color: '#78350F' }],
      },
      {
        id: 'mb_3', x: 774, y: 692, w: 346, h: 40, fill: '#F3E8FD', stroke: '#C4B5FD', strokeWidth: 1.4, shadow: true, align: 'center', rx: 10,
        lines: [{ text: "Tenant C (WHERE tenant_id = 'tenant-c')", bold: true, size: 11.5, color: '#4C1D95' }],
      },
      {
        id: 'finops_bulkhead', x: 1168, y: 562, w: 170, h: 182, fill: '#E6F4EA', stroke: '#81C995', rx: 14,
        icon: 'finops', iconPos: 'top', iconSize: 24,
        lines: [
          { text: 'FinOps & Rate', bold: true, size: 11.8, color: '#137333' },
          { text: 'Bulkhead', bold: true, size: 11.8, color: '#137333' },
          { text: '• Valkey 120/600 RPM', size: 10, color: '#3C4043', gapTop: 6 },
          { text: '• 32k Prefix Cache', size: 10, color: '#3C4043', gapTop: 3 },
          { text: '• 0.10x Cached Rate', size: 10, color: '#3C4043', gapTop: 3 },
          { text: '• 89.1% Token Savings', size: 10, color: '#3C4043', gapTop: 3 },
        ],
      },
      {
        id: 'obs_bar', x: 558, y: 780, w: 780, h: 58, fill: '#FFFFFF', stroke: '#DADCE0', rx: 12,
        icon: 'cloud_monitoring', iconPos: 'left', iconSize: 22,
        lines: [
          { text: 'AI Observability — Cloud Logging, Cloud Trace, OpenTelemetry & Per-Tenant Token Metering', bold: true, size: 11.8, color: '#202124' },
          { text: 'Zero-PII SHA-256 prompt hashing • BigQuery FinOps chargeback • Deterministic 401/403/429/422 circuit-breaker alerts', size: 10, color: '#5F6368', gapTop: 3 },
        ],
      },
    ],
    planeGuide: {
      id: 'plane_guide', x: 24, y: 548, w: 510, h: 298,
      title: 'WHO RUNS WHAT IN PATTERN A (POOL • 1.0x BASELINE COGS)',
      rows: [
        { plane: 'CONTROL', headline: 'Identity, ingress, 2 gateways, registry, rate limits & audit', detail: 'ISV-operated: one shared stack for every tenant. Both gateways, ARD PDP, and Valkey rate limiter sit on the shared path.' },
        { plane: 'COMPUTE', headline: 'Front end, pooled ADK runtime (Cloud Run / GKE WarmPool), MCP & models', detail: 'Mode A wipes worker RAM after 1 turn (CoW); Mode B latches GKE WarmPool pods (403); models consumed via 32k prefix cache.' },
        { plane: 'DATA', headline: 'Sessions (Valkey) + Memory Bank & Data (AlloyDB FORCE RLS)', detail: 'Two shared stores: Valkey {tenant}:{user} keys (<5s UNLINK) and AlloyDB kernel FORCE ROW LEVEL SECURITY (0 foreign rows).' },
      ],
      footnote: 'Tenant users and IdPs (left) are not a plane. Enterprise APIs (right) lead to systems outside the platform; the ISV does not run them.',
    },
    pills: [
      { id: 'plane_pill_cp', plane: 'CONTROL', text: 'CONTROL · governance', x: 1412, y: 65, w: 146, h: 18 },
      { id: 'plane_pill_hop1', plane: 'CONTROL', text: 'CONTROL · identity + ingress', x: 204, y: 227, w: 170, h: 18 },
      { id: 'plane_pill_fe', plane: 'COMPUTE', text: 'COMPUTE', x: 590, y: 227, w: 68, h: 18 },
      { id: 'plane_pill_gwin', plane: 'CONTROL', text: 'CONTROL · PEP', x: 794, y: 227, w: 98, h: 18 },
      { id: 'plane_pill_rt', plane: 'COMPUTE', text: 'COMPUTE', x: 1064, y: 227, w: 68, h: 18 },
      { id: 'plane_pill_gwout', plane: 'CONTROL', text: 'CONTROL · PEP', x: 1244, y: 227, w: 98, h: 18 },
      { id: 'plane_pill_tgts_c', plane: 'COMPUTE', text: 'COMPUTE · tools + models', x: 1404, y: 266, w: 150, h: 16 },
      { id: 'plane_pill_tgts_d', plane: 'DATA', text: 'DATA · external systems', x: 1408, y: 742, w: 142, h: 18 },
      { id: 'plane_pill_sess', plane: 'DATA', text: 'DATA · sessions', x: 632, y: 539, w: 96, h: 18 },
      { id: 'plane_pill_mem', plane: 'DATA', text: 'DATA · memory (FORCE RLS)', x: 760, y: 539, w: 156, h: 18 },
      { id: 'plane_pill_fin_c', plane: 'CONTROL', text: 'CONTROL', x: 1212, y: 539, w: 62, h: 18 },
      { id: 'plane_pill_fin_m', plane: 'COMPUTE', text: 'COMPUTE', x: 1278, y: 539, w: 64, h: 18 },
      { id: 'plane_pill_obs', plane: 'CONTROL', text: 'CONTROL · audit + metering', x: 1184, y: 763, w: 152, h: 18 },
    ],
    edges: [
      ...makeStdLeftFanInEdges('idp'),
      ...makeStdPipelineEdges('idp', 'ingress', 'app_layer', 'gw_in_box', 'runtime', 'gw_out_box', 'cp_auth', 'cp_reg', 'cp_sec', 'sessions', 'mem_bank', 'finops_bulkhead', 'obs_bar'),
      { id: 'e17', source: 'gw_out_box', target: 'mcp_srv', exitX: 1, exitY: 0.30, entryX: 0, entryY: 0.5 },
      { id: 'e18', source: 'gw_out_box', target: 'a2a_srv', exitX: 1, exitY: 0.54, entryX: 0, entryY: 0.5, points: [{ x: 1370, y: 393 }, { x: 1370, y: 415 }] },
      { id: 'e19', source: 'gw_out_box', target: 'llm_srv', exitX: 1, exitY: 0.72, entryX: 0, entryY: 0.5, points: [{ x: 1370, y: 439 }, { x: 1370, y: 499 }] },
      { id: 'e20', source: 'gw_out_box', target: 'ent_api', exitX: 1, exitY: 0.86, entryX: 0, entryY: 0.5, points: [{ x: 1370, y: 474 }, { x: 1370, y: 602 }] },
    ],
  };
}

/* ============================================================================
 * WS3 — Pattern B: Dedicated Sovereign Silo Architecture (Zero Shared Infra)
 * ============================================================================ */
export function buildWs3Spec() {
  return {
    id: 'ws3-pattern-b-silo',
    diagramName: 'WS3 - Pattern B Sovereign Silo',
    title: 'WS3 - PART 3 - Dedicated Silo Agent Platform Architecture (Pattern B: Silo)',
    zones: [
      {
        id: 'zone_enclave_a', x: 196, y: 74, w: 1378, h: 610, rx: 18,
        fill: '#F8FAFC', stroke: '#7C3AED', strokeWidth: 1.6, dashed: true,
        title: 'Tenant A Dedicated GCP Project, VPC Service Controls (VPC-SC) & IAM PAB Sovereign Enclave (project-silo-tenant-a)',
        titleColor: '#5B21B6', titleSize: 12,
      },
      {
        id: 'zone_cp_b', x: 496, y: 106, w: 1062, h: 98, rx: 14,
        fill: '#FFFFFF', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true,
        title: 'Dedicated Tenant A Project Governance & Control Plane (Inside VPC-SC)',
        titleColor: '#1967D2', titleSize: 11.2,
      },
      { id: 'zone_hop1_a', x: 210, y: 230, w: 326, h: 248, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      { id: 'zone_fe_a', x: 548, y: 230, w: 134, h: 248, rx: 14, fill: 'none', stroke: PLANE_PALETTE.COMPUTE.zoneStroke, dashed: true },
      { id: 'zone_gwin_a', x: 694, y: 230, w: 190, h: 248, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      { id: 'zone_rt_a', x: 896, y: 230, w: 232, h: 248, rx: 14, fill: 'none', stroke: PLANE_PALETTE.COMPUTE.zoneStroke, dashed: true },
      { id: 'zone_gwout_a', x: 1140, y: 230, w: 190, h: 248, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      {
        id: 'zone_tgts_b', x: 1370, y: 230, w: 190, h: 440, rx: 14,
        fill: '#FFFFFF', stroke: '#CBD5E1', dashed: false,
        title: 'Dedicated Targets (VPC-SC)', titleColor: '#202124', titleSize: 11.2, titleAlign: 'center',
      },
      { id: 'zone_tgts_b_comp', x: 1376, y: 266, w: 178, h: 226, rx: 10, fill: 'none', stroke: PLANE_PALETTE.COMPUTE.zoneStroke, dashed: true },
      { id: 'zone_sess_a', x: 210, y: 504, w: 222, h: 166, rx: 14, fill: 'none', stroke: PLANE_PALETTE.DATA.zoneStroke, dashed: true },
      { id: 'zone_obs_a', x: 448, y: 504, w: 280, h: 166, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      {
        id: 'zone_store_a', x: 744, y: 504, w: 604, h: 166, rx: 14,
        fill: '#FFFFFF', stroke: PLANE_PALETTE.DATA.zoneStroke, dashed: true,
        title: 'Dedicated Tenant A Datastore, Vector Index & HSM CMEK',
        titleColor: '#202124', titleSize: 11.5,
      },
    ],
    labels: [
      { id: 'lbl_users_b1', x: 20, y: 200, w: 162, h: 18, text: 'Enterprise Tenant Users', size: 12, align: 'center' },
      { id: 'lbl_users_b2', x: 20, y: 218, w: 162, h: 16, text: '(Physically Isolated)', size: 10.5, bold: false, color: '#5F6368', align: 'center' },
      { id: 'lbl_tgts_b_sub', x: 1376, y: 636, w: 178, h: 14, text: 'Google • Google Cloud • SaaS', size: 9, bold: false, color: '#5F6368', align: 'center' },
    ],
    cards: [
      // Top Dedicated Control Plane
      {
        id: 'cp_b_auth', x: 510, y: 134, w: 334, h: 60, fill: '#F8FAFC', stroke: '#DADCE0',
        icon: 'cloud_iam', iconPos: 'left', iconSize: 20,
        lines: [
          { text: 'Auth Manager & Identity', bold: true, size: 11.2, color: '#202124' },
          { text: 'Dedicated tenant IdP • Principal Access Boundary (PAB)', size: 9.6, color: '#5F6368', gapTop: 3 },
        ],
      },
      {
        id: 'cp_b_reg', x: 860, y: 134, w: 334, h: 60, fill: '#F8FAFC', stroke: '#DADCE0',
        icon: 'agent_registry', iconPos: 'left', iconSize: 20,
        lines: [
          { text: 'Agent Registry', bold: true, size: 11.2, color: '#202124' },
          { text: 'Dedicated tenant catalog • Isolated tool & endpoint list', size: 9.6, color: '#5F6368', gapTop: 3 },
        ],
      },
      {
        id: 'cp_b_sec', x: 1210, y: 134, w: 334, h: 60, fill: '#F8FAFC', stroke: '#DADCE0',
        icon: 'model_armor', iconPos: 'left', iconSize: 20,
        lines: [
          { text: 'AI Security & Semantic Governance', bold: true, size: 11.2, color: '#202124' },
          { text: 'Dedicated Model Armor & DLP • Provisioned throughput', size: 9.6, color: '#5F6368', gapTop: 3 },
        ],
      },
      // Left Tenant A Users
      {
        id: 'u_a', x: 24, y: 298, w: 150, h: 112, fill: '#E8F0FE', stroke: '#93C5FD', strokeWidth: 1.6, shadow: true, align: 'center',
        lines: [
          { text: 'Tenant A Users', bold: true, size: 13.5, color: '#1E3A8A' },
          { text: 'Dedicated Silo', size: 10.5, color: '#1D4ED8', gapTop: 5 },
          { text: 'Project A (~15x)', size: 10, color: '#1D4ED8', gapTop: 2 },
        ],
      },
      // Middle Enclave Pipeline
      {
        id: 'idp_a', x: 218, y: 246, w: 148, h: 224, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'cloud_iam', iconPos: 'top', iconSize: 22,
        lines: [
          { text: 'Dedicated Tenant', bold: true, size: 11, color: '#202124' },
          { text: 'IdP (OIDC / WIF)', bold: true, size: 11, color: '#202124' },
          { text: '• Dedicated WIF pool', size: 9.8, color: '#5F6368', gapTop: 5 },
          { text: '• SPIFFE mTLS pin', size: 9.8, color: '#5F6368', gapTop: 3 },
          { text: '• KMS-signed JWT', size: 9.8, color: '#5F6368', gapTop: 3 },
          { text: '• 0 peer tenants', size: 9.8, color: '#5F6368', gapTop: 3 },
        ],
      },
      {
        id: 'ingress_a', x: 380, y: 246, w: 148, h: 224, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'cloud_load_balancing', iconPos: 'top', iconSize: 22,
        lines: [
          { text: 'Dedicated Silo', bold: true, size: 11, color: '#202124' },
          { text: 'Ingress Gateway', bold: true, size: 11, color: '#202124' },
          { text: '• Dedicated ALB/WAF', size: 9.8, color: '#5F6368', gapTop: 5 },
          { text: '• Per-silo VPC-SC', size: 9.8, color: '#5F6368', gapTop: 3 },
          { text: '• Dedicated quota', size: 9.8, color: '#5F6368', gapTop: 3 },
          { text: '• Project billing', size: 9.8, color: '#5F6368', gapTop: 3 },
        ],
      },
      {
        id: 'fe_a', x: 556, y: 246, w: 118, h: 224, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, align: 'center', padT: 12,
        lines: [
          { text: 'Front End', bold: true, size: 12, color: '#202124' },
          { text: 'Dedicated App', size: 9.8, color: '#5F6368', gapTop: 2 },
        ],
        tiles: [
          { id: 'badge_fe_a1', x: 566, y: 312, w: 45, h: 48, icon: 'gemini', iconSize: 22, label: 'Gemini', fill: '#EFF6FF', stroke: '#93C5FD' },
          { id: 'badge_fe_a2', x: 619, y: 312, w: 45, h: 48, icon: 'adk', iconSize: 22, label: 'ADK', fill: '#EFF6FF', stroke: '#93C5FD' },
          { id: 'badge_fe_a3', x: 566, y: 372, w: 45, h: 48, icon: 'gke', iconSize: 22, label: 'GKE', fill: '#ECFDF5', stroke: '#86EFAC' },
          { id: 'badge_fe_a4', x: 619, y: 372, w: 45, h: 48, icon: 'cloud_run', iconSize: 22, label: 'Run', fill: '#EFF6FF', stroke: '#93C5FD' },
        ],
      },
      { id: 'gw_in_a_box', x: 702, y: 246, w: 174, h: 224, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, rx: 14, lines: [] },
      {
        id: 'gw_in_a_hdr', x: 702, y: 246, w: 174, h: 40, fill: '#1A73E8', stroke: 'none', rx: 12,
        icon: 'agent_gateway', iconPos: 'header-left', iconSize: 22, align: 'left', padL: 42,
        lines: [{ text: 'Agent Gateway', bold: true, size: 12, color: '#FFFFFF' }],
      },
      {
        id: 'gw_in_a_body', x: 710, y: 292, w: 158, h: 170, fill: '#F8FAFC', stroke: '#BFDBFE', rx: 10,
        lines: [
          { text: 'Client-to-Agent', bold: true, size: 11, color: '#1E3A8A' },
          { text: '• Verified Tenant A Claim', size: 9.8, color: '#334155', gapTop: 6 },
          { text: '• Project-Scoped IAM &', size: 9.8, color: '#334155', gapTop: 4 },
          { text: '  PAB Enforcement', size: 9.8, color: '#334155' },
          { text: '• Model Armor Input', size: 9.8, color: '#334155', gapTop: 4 },
          { text: '  Screening', size: 9.8, color: '#334155' },
        ],
      },
      // Dedicated Silo Runtime: Confidential GKE (AMD SEV-SNP) per WS3 blog L35/54/69/83!
      {
        id: 'rt_a', x: 904, y: 246, w: 216, h: 224, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, rx: 14,
        icon: 'gke', iconPos: 'top-left', iconSize: 24, padL: 44, padT: 10,
        lines: [
          { text: 'Dedicated Silo Runtime', bold: true, size: 11.8, color: '#202124' },
          { text: 'Confidential GKE · SEV-SNP', size: 9.8, color: '#137333', gapTop: 1 },
        ],
      },
      {
        id: 'adk_orch_a', x: 914, y: 304, w: 196, h: 158, fill: '#F8F9FA', stroke: '#DADCE0', rx: 10,
        lines: [
          { text: 'ADK Agent Orchestrator', bold: true, size: 11, color: '#202124' },
          { text: '• Confidential GKE (AMD SEV-SNP)', size: 9.6, color: '#5F6368', gapTop: 6 },
          { text: '• Isolated Identity (SPIFFE)', size: 9.6, color: '#5F6368', gapTop: 4 },
          { text: '• Zero Cross-Tenant Blast Radius', size: 9.6, color: '#5F6368', gapTop: 4 },
          { text: '• Isolated Tool Execution', size: 9.6, color: '#5F6368', gapTop: 4 },
        ],
      },
      { id: 'gw_out_a_box', x: 1148, y: 246, w: 174, h: 224, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, rx: 14, lines: [] },
      {
        id: 'gw_out_a_hdr', x: 1148, y: 246, w: 174, h: 40, fill: '#1A73E8', stroke: 'none', rx: 12,
        icon: 'agent_gateway', iconPos: 'header-left', iconSize: 22, align: 'left', padL: 42,
        lines: [{ text: 'Agent Gateway', bold: true, size: 12, color: '#FFFFFF' }],
      },
      {
        id: 'gw_out_a_body', x: 1156, y: 292, w: 158, h: 170, fill: '#F8FAFC', stroke: '#BFDBFE', rx: 10,
        lines: [
          { text: 'Agent-to-Target (VPC-SC)', bold: true, size: 10.6, color: '#1E3A8A' },
          { text: '• VPC Service Controls', size: 9.8, color: '#334155', gapTop: 6 },
          { text: '  Perimeter Check', size: 9.8, color: '#334155' },
          { text: '• User-Scoped OBO', size: 9.8, color: '#334155', gapTop: 4 },
          { text: '  Token Binding', size: 9.8, color: '#334155' },
          { text: '• Output DLP & Audit', size: 9.8, color: '#334155', gapTop: 4 },
        ],
      },
      // Dedicated Targets (Inside VPC-SC)
      {
        id: 'mcp_b_srv', x: 1384, y: 286, w: 162, h: 60, fill: '#ECFDF5', stroke: '#34D399', strokeWidth: 1.4, shadow: true, align: 'center',
        lines: [
          { text: 'Dedicated MCP Server', bold: true, size: 11.2, color: '#065F46' },
          { text: 'Private Tenant A Tools', size: 9.6, color: '#047857', gapTop: 2 },
        ],
      },
      {
        id: 'a2a_b_srv', x: 1384, y: 354, w: 162, h: 60, fill: '#EFF6FF', stroke: '#60A5FA', strokeWidth: 1.4, shadow: true, align: 'center',
        lines: [
          { text: 'Dedicated A2A Agents', bold: true, size: 11.2, color: '#1E3A8A' },
          { text: 'Internal Domain Agents', size: 9.6, color: '#1D4ED8', gapTop: 2 },
        ],
      },
      {
        id: 'llm_b_srv', x: 1384, y: 422, w: 162, h: 60, fill: '#F3E8FD', stroke: '#C4B5FD', strokeWidth: 1.4, shadow: true, align: 'center',
        lines: [
          { text: 'Dedicated Models', bold: true, size: 11.2, color: '#6B21A8' },
          { text: 'Gemini 2.5 / Gemma 3 27B', size: 9.4, color: '#4C1D95', gapTop: 2 },
        ],
      },
      {
        id: 'api_b_srv', x: 1384, y: 504, w: 162, h: 64, fill: '#FFFBEB', stroke: '#FBBF24', strokeWidth: 1.4, shadow: true, align: 'center',
        lines: [
          { text: 'Tenant Enterprise APIs', bold: true, size: 11.2, color: '#78350F' },
          { text: 'Private PSC / VPN Egress', size: 9.6, color: '#B45309', gapTop: 2 },
        ],
        tiles: [
          { id: 'badge_tgb_c1', x: 1390, y: 582, w: 44, h: 44, icon: 'google_g', iconSize: 26, fill: '#FFFFFF', stroke: '#CBD5E1' },
          { id: 'badge_tgb_c2', x: 1443, y: 582, w: 44, h: 44, icon: 'gcp_cloud', iconSize: 26, fill: '#FFFFFF', stroke: '#CBD5E1' },
          { id: 'badge_tgb_c3', x: 1496, y: 582, w: 44, h: 44, icon: 'saas_globe', iconSize: 26, fill: '#FFFFFF', stroke: '#CBD5E1' },
        ],
      },
      // Lower Inside Enclave
      {
        id: 'sess_a', x: 218, y: 518, w: 206, h: 142, fill: '#FFFFFF', stroke: '#DADCE0', rx: 12,
        icon: 'memorystore', iconPos: 'top', iconSize: 22,
        lines: [
          { text: 'Dedicated Sessions', bold: true, size: 11.5, color: '#202124' },
          { text: '• Dedicated Memorystore', size: 9.8, color: '#5F6368', gapTop: 5 },
          { text: '• Customer HSM CMEK', size: 9.8, color: '#5F6368', gapTop: 3 },
          { text: '• 0 shared cache keys', size: 9.8, color: '#5F6368', gapTop: 3 },
        ],
      },
      {
        id: 'obs_a', x: 456, y: 518, w: 264, h: 142, fill: '#FFFFFF', stroke: '#DADCE0', rx: 12,
        icon: 'scc', iconPos: 'top', iconSize: 22,
        lines: [
          { text: 'Dedicated AI Observability & <60s Halt', bold: true, size: 11, color: '#202124' },
          { text: '• Dedicated Project Logging & OTel', size: 9.8, color: '#5F6368', gapTop: 5 },
          { text: '• 41.2s Verified CMEK Revocation', size: 9.8, color: '#5F6368', gapTop: 3 },
          { text: '• Returns HTTP 423 Locked (CMEK)', size: 9.8, color: '#5F6368', gapTop: 3 },
        ],
      },
      // 3 Datastore cards cleanly inside zone_store_a (with top-border pills — ZERO clipping!)
      {
        id: 'enclave_store_1', x: 756, y: 540, w: 186, h: 118, fill: '#ECFDF5', stroke: '#86EFAC', rx: 10, align: 'center',
        icon: 'alloydb', iconPos: 'top', iconSize: 22,
        lines: [
          { text: 'Dedicated AlloyDB', bold: true, size: 11, color: '#065F46' },
          { text: '& BigQuery', bold: true, size: 11, color: '#065F46' },
          { text: 'Single-tenant cluster', size: 9.5, color: '#047857', gapTop: 3 },
          { text: '0 peer tenant rows', size: 9.5, color: '#047857' },
        ],
      },
      {
        id: 'enclave_store_2', x: 954, y: 540, w: 186, h: 118, fill: '#EFF6FF', stroke: '#93C5FD', rx: 10, align: 'center',
        icon: 'vertex_ai', iconPos: 'top', iconSize: 22,
        lines: [
          { text: 'Dedicated HNSW', bold: true, size: 11, color: '#1E3A8A' },
          { text: 'Vector Index', bold: true, size: 11, color: '#1E3A8A' },
          { text: 'Physical index isolation', size: 9.5, color: '#1D4ED8', gapTop: 3 },
          { text: '100% in-enclave recall', size: 9.5, color: '#1D4ED8' },
        ],
      },
      {
        id: 'enclave_store_3', x: 1152, y: 540, w: 186, h: 118, fill: '#FFFBEB', stroke: '#FCD34D', rx: 10, align: 'center',
        icon: 'cloud_kms', iconPos: 'top', iconSize: 22,
        lines: [
          { text: 'Customer-Held', bold: true, size: 11, color: '#78350F' },
          { text: 'Cloud HSM CMEK', bold: true, size: 11, color: '#78350F' },
          { text: 'FIPS 140-3 Level 3 HSM', size: 9.5, color: '#B45309', gapTop: 3 },
          { text: 'Access Approval (CAA)', size: 9.5, color: '#B45309' },
        ],
      },
      // Sibling Sovereign Projects (Tenant B & Tenant C)
      {
        id: 'u_b', x: 24, y: 706, w: 150, h: 62, fill: '#FEF7E0', stroke: '#FCD34D', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Tenant B Users', bold: true, size: 12, color: '#78350F' },
          { text: 'Silo Project B', size: 10, color: '#B45309', gapTop: 2 },
        ],
      },
      {
        id: 'silo_b_pod', x: 204, y: 706, w: 662, h: 62, fill: '#FFFDF7', stroke: '#F59E0B', strokeWidth: 1.4, rx: 12,
        icon: 'vpc_sc', iconPos: 'left', iconSize: 22,
        lines: [
          { text: 'Tenant B Dedicated Sovereign Silo Project (project-silo-tenant-b)', bold: true, size: 11.8, color: '#78350F' },
          { text: 'Isolated VPC-SC • Dedicated Confidential GKE ADK Runtime • AlloyDB & Customer HSM CMEK', size: 10, color: '#92400E', gapTop: 3 },
        ],
      },
      {
        id: 'u_c', x: 24, y: 780, w: 150, h: 62, fill: '#F3E8FD', stroke: '#C4B5FD', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Tenant C Users', bold: true, size: 12, color: '#4C1D95' },
          { text: 'Silo Project C', size: 10, color: '#6D28D9', gapTop: 2 },
        ],
      },
      {
        id: 'silo_c_pod', x: 204, y: 780, w: 662, h: 62, fill: '#FAF5FF', stroke: '#A855F7', strokeWidth: 1.4, rx: 12,
        icon: 'vpc_sc', iconPos: 'left', iconSize: 22,
        lines: [
          { text: 'Tenant C Dedicated Sovereign Silo Project (project-silo-tenant-c)', bold: true, size: 11.8, color: '#4C1D95' },
          { text: 'Isolated VPC-SC • Dedicated Confidential GKE ADK Runtime • AlloyDB & Customer HSM CMEK', size: 10, color: '#6B21A8', gapTop: 3 },
        ],
      },
    ],
    planeGuide: {
      id: 'plane_guide', x: 886, y: 696, w: 688, h: 152,
      title: 'WHO RUNS WHAT IN PATTERN B (SOVEREIGN SILO) — ZERO SHARED INFRASTRUCTURE',
      rows: [
        { plane: 'CONTROL', headline: 'Per-tenant GCP project, VPC-SC, PAB, 2 gateways & HSM CMEK', detail: 'Dedicated stack per tenant; customer holds Cloud HSM key (<60s / 41.2s verified cryptographic halt).' },
        { plane: 'COMPUTE', headline: 'Dedicated front end, Confidential GKE (AMD SEV-SNP), MCP & PT models', detail: 'Zero shared compute pods or KV caches; hardware-encrypted RAM scales strictly per tenant silo.' },
        { plane: 'DATA', headline: 'Dedicated Valkey sessions + AlloyDB, BigQuery & HNSW vector index', detail: 'Physical DB & HNSW index encrypted under customer CMEK with 0 shared tables or cache keys.' },
      ],
    },
    pills: [
      { id: 'plane_pill_cp_b', plane: 'CONTROL', text: 'CONTROL · per-silo governance', x: 1384, y: 65, w: 174, h: 18 },
      { id: 'plane_pill_hop1_a', plane: 'CONTROL', text: 'CONTROL · dedicated IdP + ingress', x: 220, y: 221, w: 186, h: 18 },
      { id: 'plane_pill_fe_a', plane: 'COMPUTE', text: 'COMPUTE', x: 582, y: 221, w: 66, h: 18 },
      { id: 'plane_pill_gwin_a', plane: 'CONTROL', text: 'CONTROL · PEP', x: 780, y: 221, w: 96, h: 18 },
      { id: 'plane_pill_rt_a', plane: 'COMPUTE', text: 'COMPUTE', x: 1052, y: 221, w: 66, h: 18 },
      { id: 'plane_pill_gwout_a', plane: 'CONTROL', text: 'CONTROL · PEP', x: 1226, y: 221, w: 96, h: 18 },
      { id: 'plane_pill_tgts_comp', plane: 'COMPUTE', text: 'COMPUTE · dedicated', x: 1402, y: 258, w: 126, h: 16 },
      { id: 'plane_pill_tgts_data', plane: 'DATA', text: 'DATA · tenant systems', x: 1398, y: 658, w: 134, h: 18 },
      { id: 'plane_pill_sess_a', plane: 'DATA', text: 'DATA · dedicated sessions', x: 218, y: 495, w: 144, h: 18 },
      { id: 'plane_pill_obs_a', plane: 'CONTROL', text: 'CONTROL · audit + kill-switch', x: 456, y: 495, w: 164, h: 18 },
      { id: 'plane_pill_store_d', plane: 'DATA', text: 'DATA · dedicated DB + index', x: 1034, y: 495, w: 156, h: 18 },
      { id: 'plane_pill_store_c', plane: 'CONTROL', text: 'CONTROL · customer key', x: 1196, y: 495, w: 146, h: 18 },
    ],
    edges: [
      { id: 'e1', source: 'u_a', target: 'idp_a', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      { id: 'e2', source: 'idp_a', target: 'ingress_a', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      { id: 'e3', source: 'ingress_a', target: 'fe_a', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      { id: 'e4', source: 'fe_a', target: 'gw_in_a_box', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      { id: 'e5', source: 'gw_in_a_box', target: 'rt_a', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      { id: 'e6', source: 'rt_a', target: 'gw_out_a_box', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      // Governance drops (strictly clearing top-border CONTROL · PEP pills!)
      { id: 'e7', source: 'cp_b_auth', target: 'gw_in_a_box', dashed: true, stroke: '#1A73E8', exitX: 0.69, exitY: 1, entryX: 0.22, entryY: 0 },
      { id: 'e7b', source: 'cp_b_auth', target: 'rt_a', stroke: '#5F6368', exitX: 0.90, exitY: 1, entryX: 0.25, entryY: 0, points: [{ x: 810, y: 212 }, { x: 958, y: 212 }] },
      { id: 'e8', source: 'cp_b_reg', target: 'rt_a', stroke: '#5F6368', exitX: 0.50, exitY: 1, entryX: 0.569, entryY: 0 },
      { id: 'e9', source: 'cp_b_sec', target: 'gw_out_a_box', dashed: true, stroke: '#1A73E8', exitX: 0.14, exitY: 1, entryX: 0.22, entryY: 0, points: [{ x: 1256, y: 210 }, { x: 1186, y: 210 }] },
      // Lower enclave connections (razor-straight vertical e12 at x=1016, clearing pills!)
      { id: 'e10', source: 'fe_a', target: 'sess_a', exitX: 0.35, exitY: 1, entryX: 0.80, entryY: 0, points: [{ x: 597, y: 484 }, { x: 383, y: 484 }] },
      { id: 'e11', source: 'rt_a', target: 'obs_a', dashed: true, stroke: '#595959', exitX: 0.25, exitY: 1, entryX: 0.78, entryY: 0, points: [{ x: 958, y: 486 }, { x: 662, y: 486 }] },
      { id: 'e12', source: 'rt_a', target: 'zone_store_a', bidirectional: true, exitX: 0.519, exitY: 1, entryX: 0.450, entryY: 0 },
      // Right Fan-Out into Dedicated Targets (clean diverging #595959 elbows across x=1346 gutter!)
      { id: 'e13', source: 'gw_out_a_box', target: 'mcp_b_srv', exitX: 1, exitY: 0.30, entryX: 0, entryY: 0.5 },
      { id: 'e14', source: 'gw_out_a_box', target: 'a2a_b_srv', exitX: 1, exitY: 0.54, entryX: 0, entryY: 0.5, points: [{ x: 1348, y: 367 }, { x: 1348, y: 384 }] },
      { id: 'e15', source: 'gw_out_a_box', target: 'llm_b_srv', exitX: 1, exitY: 0.72, entryX: 0, entryY: 0.5, points: [{ x: 1348, y: 407 }, { x: 1348, y: 452 }] },
      { id: 'e16', source: 'gw_out_a_box', target: 'api_b_srv', exitX: 1, exitY: 0.88, entryX: 0, entryY: 0.5, points: [{ x: 1348, y: 443 }, { x: 1348, y: 536 }] },
      // Sibling silos
      { id: 'e17', source: 'u_b', target: 'silo_b_pod', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      { id: 'e18', source: 'u_c', target: 'silo_c_pod', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
    ],
  };
}

/* ============================================================================
 * WS4 — Pattern C: Governed Hub-and-Spoke Architecture (Hybrid /28 PSC)
 * ============================================================================ */
export function buildWs4Spec() {
  return {
    id: 'ws4-pattern-c-hybrid',
    diagramName: 'WS4 - Pattern C Hybrid PSC',
    title: 'WS4 - PART 4 - Governed Hub-and-Spoke Architecture (Pattern C: Hybrid PSC)',
    zones: [
      {
        id: 'zone_cp', x: 504, y: 74, w: 1066, h: 126, rx: 16,
        fill: '#F8F9FA', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true,
        title: 'Google Cloud — Centralized Multi-Tenant Governance & Control Hub (Shared Hub VPC)',
        titleColor: '#1967D2', titleSize: 12,
      },
      { id: 'zone_hop1', x: 194, y: 236, w: 350, h: 282, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      { id: 'zone_fe', x: 556, y: 236, w: 136, h: 282, rx: 14, fill: 'none', stroke: PLANE_PALETTE.COMPUTE.zoneStroke, dashed: true },
      { id: 'zone_gw_in', x: 708, y: 236, w: 194, h: 282, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      { id: 'zone_rt', x: 918, y: 236, w: 224, h: 282, rx: 14, fill: 'none', stroke: PLANE_PALETTE.COMPUTE.zoneStroke, dashed: true },
      { id: 'zone_gw_out', x: 1158, y: 236, w: 194, h: 282, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      {
        id: 'zone_tgts', x: 1384, y: 236, w: 190, h: 552, rx: 16,
        fill: '#F8F9FA', stroke: '#DADCE0', dashed: false,
        title: 'Isolated Spokes (/28 PSC)', titleColor: '#202124', titleSize: 11.8, titleAlign: 'center',
      },
      { id: 'zone_spokes_box', x: 1390, y: 274, w: 178, h: 222, rx: 12, fill: 'none', stroke: PLANE_PALETTE.COMPUTE.zoneStroke, dashed: true },
      { id: 'zone_sess', x: 550, y: 548, w: 184, h: 204, rx: 14, fill: 'none', stroke: PLANE_PALETTE.DATA.zoneStroke, dashed: true },
      { id: 'zone_mem', x: 752, y: 548, w: 390, h: 204, rx: 14, fill: 'none', stroke: PLANE_PALETTE.DATA.zoneStroke, dashed: true },
      { id: 'zone_cutover', x: 1160, y: 548, w: 186, h: 204, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      { id: 'zone_obs', x: 550, y: 772, w: 796, h: 74, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
    ],
    labels: [
      { id: 'lbl_users', x: 24, y: 228, w: 142, h: 20, text: 'Users', size: 13, align: 'center' },
      { id: 'lbl_tgts_sub', x: 1390, y: 754, w: 178, h: 14, text: 'Google • Google Cloud • SaaS', size: 9, bold: false, color: '#5F6368', align: 'center' },
    ],
    cards: [
      {
        id: 'cp_c_auth', x: 518, y: 108, w: 334, h: 80, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'cloud_iam', iconPos: 'left', iconSize: 22,
        lines: [
          { text: 'Auth Manager & Identity', bold: true, size: 11.5, color: '#202124' },
          { text: 'Access auth • IAM default-deny & IAP', size: 10, color: '#5F6368', gapTop: 3 },
          { text: 'Per-tenant OBO & DPoP token exchange', size: 10, color: '#5F6368', gapTop: 2 },
        ],
      },
      {
        id: 'cp_c_reg', x: 868, y: 108, w: 334, h: 80, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'agent_registry', iconPos: 'left', iconSize: 22,
        lines: [
          { text: 'Agent Registry', bold: true, size: 11.5, color: '#202124' },
          { text: 'Tenant-scoped catalog • Approved /28 PSC', size: 10, color: '#5F6368', gapTop: 3 },
          { text: 'destination check & 0ms CAS pointer swap', size: 10, color: '#5F6368', gapTop: 2 },
        ],
      },
      {
        id: 'cp_c_sec', x: 1218, y: 108, w: 338, h: 80, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'model_armor', iconPos: 'left', iconSize: 22,
        lines: [
          { text: 'AI Security & Governance', bold: true, size: 11.5, color: '#202124' },
          { text: 'Inline Model Armor & DLP inspection', size: 10, color: '#5F6368', gapTop: 3 },
          { text: 'Per-spoke LLM & PSC token quotas', size: 10, color: '#5F6368', gapTop: 2 },
        ],
      },
      {
        id: 'u_a', x: 24, y: 256, w: 142, h: 74, fill: '#E8F0FE', stroke: '#93C5FD', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Tenant A', bold: true, size: 13.5, color: '#1E3A8A' },
          { text: 'IdP: non-google', size: 10.5, color: '#1D4ED8', gapTop: 3 },
        ],
      },
      {
        id: 'u_b', x: 24, y: 346, w: 142, h: 74, fill: '#FEF7E0', stroke: '#FCD34D', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Tenant B', bold: true, size: 13.5, color: '#78350F' },
          { text: 'IdP: Google', size: 10.5, color: '#B45309', gapTop: 3 },
        ],
      },
      {
        id: 'u_c', x: 24, y: 436, w: 142, h: 74, fill: '#F3E8FD', stroke: '#C4B5FD', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: 'Tenant C', bold: true, size: 13.5, color: '#4C1D95' },
          { text: 'IdP: non-google', size: 10.5, color: '#6D28D9', gapTop: 3 },
        ],
      },
      {
        id: 'idp_c', x: 202, y: 256, w: 156, h: 254, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'cloud_iam', iconPos: 'top', iconSize: 24,
        lines: [
          { text: 'Google Identity', bold: true, size: 11.8, color: '#202124' },
          { text: 'Platform', bold: true, size: 11.8, color: '#202124' },
          { text: '• Multi-tenant OIDC', size: 10, color: '#5F6368', gapTop: 6 },
          { text: '• Verified tenant_id', size: 10, color: '#5F6368', gapTop: 3 },
          { text: '• OIDC / SAML Fed.', size: 10, color: '#5F6368', gapTop: 3 },
          { text: '• Tier claim routing', size: 10, color: '#5F6368', gapTop: 3 },
        ],
      },
      {
        id: 'ingress_c', x: 378, y: 256, w: 158, h: 254, fill: '#FFFFFF', stroke: '#DADCE0',
        icon: 'cloud_load_balancing', iconPos: 'top', iconSize: 24,
        lines: [
          { text: 'Shared Hub Ingress', bold: true, size: 11.5, color: '#202124' },
          { text: 'API Gateway', bold: true, size: 11.5, color: '#202124' },
          { text: '• Strips X-Tenant-ID', size: 10, color: '#5F6368', gapTop: 6 },
          { text: '• Hub rate limiting', size: 10, color: '#5F6368', gapTop: 3 },
          { text: '• Per-spoke metering', size: 10, color: '#5F6368', gapTop: 3 },
          { text: '• Dynamic tier router', size: 10, color: '#5F6368', gapTop: 3 },
        ],
      },
      // Front End: STRICTLY ZERO GKE in WS4 (Shared Hub Cloud Run Gen2 gVisor only!)
      {
        id: 'fe_c', x: 564, y: 256, w: 120, h: 254, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, align: 'center', padT: 14,
        lines: [
          { text: 'Front End', bold: true, size: 12.5, color: '#202124' },
          { text: 'Shared Hub Layer', size: 9.8, color: '#5F6368', gapTop: 2 },
        ],
        tiles: [
          { id: 'badge_fec_1', x: 574, y: 326, w: 46, h: 52, icon: 'gemini', iconSize: 24, label: 'Gemini', fill: '#EFF6FF', stroke: '#93C5FD' },
          { id: 'badge_fec_2', x: 628, y: 326, w: 46, h: 52, icon: 'adk', iconSize: 24, label: 'ADK', fill: '#EFF6FF', stroke: '#93C5FD' },
          { id: 'badge_fec_3', x: 574, y: 392, w: 100, h: 52, icon: 'cloud_run', iconSize: 24, label: 'Cloud Run Gen2', fill: '#EFF6FF', stroke: '#93C5FD' },
        ],
      },
      { id: 'gw_in_c_box', x: 716, y: 256, w: 178, h: 254, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, rx: 14, lines: [] },
      {
        id: 'gw_in_c_hdr', x: 716, y: 256, w: 178, h: 42, fill: '#1A73E8', stroke: 'none', rx: 12,
        icon: 'agent_gateway', iconPos: 'header-left', iconSize: 24, align: 'left', padL: 44,
        lines: [{ text: 'Agent Gateway', bold: true, size: 12.5, color: '#FFFFFF' }],
      },
      {
        id: 'gw_in_c_body', x: 724, y: 306, w: 162, h: 196, fill: '#F8FAFC', stroke: '#BFDBFE', rx: 10,
        lines: [
          { text: 'Client-to-Agent', bold: true, size: 11.5, color: '#1E3A8A' },
          { text: '• Verifies JWT & Tenant', size: 10, color: '#334155', gapTop: 7 },
          { text: '  Claim (<0.15ms JWKS)', size: 10, color: '#334155' },
          { text: '• End-to-End Context', size: 10, color: '#334155', gapTop: 5 },
          { text: '  Propagation', size: 10, color: '#334155' },
          { text: '• Model Armor Input', size: 10, color: '#334155', gapTop: 5 },
          { text: '  Screening (<8ms)', size: 10, color: '#334155' },
        ],
      },
      {
        id: 'rt_c', x: 926, y: 256, w: 208, h: 254, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, rx: 14,
        icon: 'cloud_run', iconPos: 'top-left', iconSize: 22, padL: 42, padT: 12,
        lines: [
          { text: 'Shared Hub Runtime', bold: true, size: 12, color: '#202124' },
          { text: 'Cloud Run Gen2 · SPIFFE', size: 9.8, color: '#5F6368', gapTop: 1 },
        ],
      },
      {
        id: 'adk_orch_c', x: 936, y: 318, w: 188, h: 182, fill: '#F8F9FA', stroke: '#DADCE0', rx: 10,
        lines: [
          { text: 'ADK Agent Orchestrator', bold: true, size: 11, color: '#202124' },
          { text: '• Warm gVisor (concurrency=1)', size: 9.8, color: '#5F6368', gapTop: 6 },
          { text: '• CoW --max-requests=1', size: 9.8, color: '#5F6368', gapTop: 4 },
          { text: '• Tenant Context Binding', size: 9.8, color: '#5F6368', gapTop: 4 },
          { text: '  (verified tenant_id)', size: 9.8, color: '#5F6368' },
          { text: '• Dynamic Spoke / Pool', size: 9.8, color: '#5F6368', gapTop: 4 },
          { text: '  Tool & Model Routing', size: 9.8, color: '#5F6368' },
        ],
      },
      { id: 'gw_out_c_box', x: 1166, y: 256, w: 178, h: 254, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, rx: 14, lines: [] },
      {
        id: 'gw_out_c_hdr', x: 1166, y: 256, w: 178, h: 42, fill: '#1A73E8', stroke: 'none', rx: 12,
        icon: 'agent_gateway', iconPos: 'header-left', iconSize: 24, align: 'left', padL: 44,
        lines: [{ text: 'Agent Gateway', bold: true, size: 12.5, color: '#FFFFFF' }],
      },
      {
        id: 'gw_out_c_body', x: 1174, y: 306, w: 162, h: 196, fill: '#F8FAFC', stroke: '#BFDBFE', rx: 10,
        lines: [
          { text: 'Agent-to-Spoke / PSC', bold: true, size: 11, color: '#1E3A8A' },
          { text: '• Approved /28 PSC', size: 10, color: '#334155', gapTop: 7 },
          { text: '  Spoke Routing', size: 10, color: '#334155' },
          { text: '• User-Scoped OBO', size: 10, color: '#334155', gapTop: 5 },
          { text: '  Token Binding', size: 10, color: '#334155' },
          { text: '• Output DLP & Token', size: 10, color: '#334155', gapTop: 5 },
          { text: '  Metering', size: 10, color: '#334155' },
        ],
      },
      // Right Isolated Spokes (/28 PSC) — ZERO pill overlap, ZERO Gemini 3.8!
      {
        id: 'sp_a', x: 1398, y: 294, w: 162, h: 60, fill: '#ECFDF5', stroke: '#34D399', strokeWidth: 1.4, shadow: true, align: 'center',
        lines: [
          { text: 'Tenant A Spoke', bold: true, size: 11.4, color: '#065F46' },
          { text: '(MCP Tools, CMEK)', size: 9.8, color: '#047857', gapTop: 2 },
        ],
      },
      {
        id: 'sp_b', x: 1398, y: 362, w: 162, h: 60, fill: '#EFF6FF', stroke: '#60A5FA', strokeWidth: 1.4, shadow: true, align: 'center',
        lines: [
          { text: 'Tenant B Spoke', bold: true, size: 11.4, color: '#1E3A8A' },
          { text: '(MCP Tools, CMEK)', size: 9.8, color: '#1D4ED8', gapTop: 2 },
        ],
      },
      {
        id: 'sp_c', x: 1398, y: 430, w: 162, h: 60, fill: '#F3E8FD', stroke: '#C4B5FD', strokeWidth: 1.4, shadow: true, align: 'center',
        lines: [
          { text: 'Tenant C Spoke', bold: true, size: 11.4, color: '#6B21A8' },
          { text: '(MCP Tools, CMEK)', size: 9.8, color: '#7E22CE', gapTop: 2 },
        ],
      },
      {
        id: 'sp_llm', x: 1398, y: 516, w: 162, h: 62, fill: '#F3E8FD', stroke: '#A855F7', strokeWidth: 1.4, shadow: true, align: 'center',
        lines: [
          { text: 'Shared & Spoke Models', bold: true, size: 11, color: '#6B21A8' },
          { text: 'Gemini 2.5 & 3P LLMs', size: 9.8, color: '#4C1D95', gapTop: 2 },
        ],
      },
      {
        id: 'sp_api', x: 1398, y: 590, w: 162, h: 62, fill: '#FFFBEB', stroke: '#FBBF24', strokeWidth: 1.4, shadow: true, align: 'center',
        lines: [
          { text: 'Shared & Spoke APIs', bold: true, size: 11.2, color: '#78350F' },
          { text: 'Enterprise APIs', size: 9.8, color: '#B45309', gapTop: 2 },
        ],
        tiles: [
          { id: 'badge_tgc_1', x: 1404, y: 696, w: 44, h: 44, icon: 'google_g', iconSize: 26, fill: '#FFFFFF', stroke: '#CBD5E1' },
          { id: 'badge_tgc_2', x: 1457, y: 696, w: 44, h: 44, icon: 'gcp_cloud', iconSize: 26, fill: '#FFFFFF', stroke: '#CBD5E1' },
          { id: 'badge_tgc_3', x: 1510, y: 696, w: 44, h: 44, icon: 'saas_globe', iconSize: 26, fill: '#FFFFFF', stroke: '#CBD5E1' },
        ],
      },
      // Bottom row cards
      {
        id: 'sess_c', x: 558, y: 562, w: 168, h: 182, fill: '#FFFFFF', stroke: '#DADCE0', rx: 14,
        icon: 'memorystore', iconPos: 'top', iconSize: 24,
        lines: [
          { text: 'Sessions', bold: true, size: 12, color: '#202124' },
          { text: '(Tenant-Scoped)', bold: true, size: 11.5, color: '#202124' },
          { text: '• Ephemeral turn state', size: 9.8, color: '#5F6368', gapTop: 6 },
          { text: '• Scoped {tenant}:{user}', size: 9.8, color: '#5F6368', gapTop: 3 },
          { text: '• Connects to Hub', size: 9.8, color: '#5F6368', gapTop: 3 },
          { text: '  Runtime (0 DB bypass)', size: 9.8, color: '#5F6368' },
        ],
      },
      {
        id: 'spoke_store_zone', x: 760, y: 562, w: 374, h: 182, fill: '#FFFFFF', stroke: '#DADCE0', isContainer: true, rx: 14, padT: 10,
        lines: [{ text: 'Isolated Spoke Memory, Vector Indexes & Data (/28 PSC)', bold: true, size: 11, color: '#202124' }],
      },
      {
        id: 'mem_spoke_a', x: 774, y: 596, w: 346, h: 40, fill: '#E8F0FE', stroke: '#93C5FD', strokeWidth: 1.4, shadow: true, align: 'center', rx: 10,
        lines: [{ text: 'Tenant A Spoke DB (/28 PSC + CMEK)', bold: true, size: 11.5, color: '#1E3A8A' }],
      },
      {
        id: 'mem_spoke_b', x: 774, y: 644, w: 346, h: 40, fill: '#FEF7E0', stroke: '#FCD34D', strokeWidth: 1.4, shadow: true, align: 'center', rx: 10,
        lines: [{ text: 'Tenant B Spoke DB (/28 PSC + CMEK)', bold: true, size: 11.5, color: '#78350F' }],
      },
      {
        id: 'mem_spoke_c', x: 774, y: 692, w: 346, h: 40, fill: '#F3E8FD', stroke: '#C4B5FD', strokeWidth: 1.4, shadow: true, align: 'center', rx: 10,
        lines: [{ text: 'Tenant C Spoke DB (/28 PSC + CMEK)', bold: true, size: 11.5, color: '#4C1D95' }],
      },
      {
        id: 'psc_cutover_card', x: 1168, y: 562, w: 170, h: 182, fill: '#E6F4EA', stroke: '#81C995', rx: 14,
        icon: 'psc', iconPos: 'top', iconSize: 24,
        lines: [
          { text: '0ms Live Tier', bold: true, size: 11.8, color: '#137333' },
          { text: 'Graduation', bold: true, size: 11.8, color: '#137333' },
          { text: '• 1. Dual-Write Sync', size: 10, color: '#3C4043', gapTop: 6 },
          { text: '• 2. Atomic CAS Swap', size: 10, color: '#3C4043', gapTop: 3 },
          { text: '• 3. 30s Drain', size: 10, color: '#3C4043', gapTop: 3 },
          { text: '• 0 Dropped Turns', size: 10, color: '#3C4043', gapTop: 3 },
        ],
      },
      {
        id: 'obs_c_bar', x: 558, y: 780, w: 780, h: 58, fill: '#FFFFFF', stroke: '#DADCE0', rx: 12,
        icon: 'cloud_monitoring', iconPos: 'left', iconSize: 22,
        lines: [
          { text: 'AI Observability — Cloud Logging, Cloud Trace, OpenTelemetry & Per-Spoke Token Metering', bold: true, size: 11.8, color: '#202124' },
          { text: 'Tracks Hub-to-Spoke /28 PSC latency • Per-spoke CMEK audit logs • Zero-downtime CAS promotion events', size: 10, color: '#5F6368', gapTop: 3 },
        ],
      },
    ],
    planeGuide: {
      id: 'plane_guide', x: 24, y: 548, w: 510, h: 298,
      title: 'WHO RUNS WHAT IN PATTERN C (HUB + /28 PSC • 1.8–2.8x COGS)',
      rows: [
        { plane: 'CONTROL', headline: 'Shared hub identity, ingress, 2 gateways, ARD & CAS graduation', detail: '950 Standard / 50 Enterprise split: one hub routes every tenant by STS tier claim with 0 cross-spoke dialing (HTTP 403).' },
        { plane: 'COMPUTE', headline: 'Shared hub Cloud Run Gen2 gVisor runtime + per-spoke MCP tools', detail: 'One shared CoW 1-turn wipe hub runtime serves every tenant while enterprise MCP tools sit behind private /28 PSC spokes.' },
        { plane: 'DATA', headline: 'Shared hub Valkey sessions + one CMEK Spoke DB per enterprise tenant', detail: 'Unidirectional /28 PSC NAT eliminates CIDR overlap (10.40.0.0/20 reused) with 0ms atomic CAS live tier promotion.' },
      ],
      footnote: 'Tenant users and IdPs (left) are not a plane. Enterprise APIs (right) lead to systems outside the platform.',
    },
    pills: [
      { id: 'plane_pill_cp_c', plane: 'CONTROL', text: 'CONTROL · hub governance', x: 1396, y: 65, w: 162, h: 18 },
      { id: 'plane_pill_hop1_c', plane: 'CONTROL', text: 'CONTROL · identity + ingress', x: 204, y: 227, w: 170, h: 18 },
      { id: 'plane_pill_fe_c', plane: 'COMPUTE', text: 'COMPUTE', x: 590, y: 227, w: 68, h: 18 },
      { id: 'plane_pill_gwin_c', plane: 'CONTROL', text: 'CONTROL · PEP', x: 794, y: 227, w: 98, h: 18 },
      { id: 'plane_pill_rt_c', plane: 'COMPUTE', text: 'COMPUTE', x: 1064, y: 227, w: 68, h: 18 },
      { id: 'plane_pill_gwout_c', plane: 'CONTROL', text: 'CONTROL · PEP', x: 1244, y: 227, w: 98, h: 18 },
      { id: 'plane_pill_sp_c', plane: 'COMPUTE', text: 'COMPUTE', x: 1412, y: 266, w: 66, h: 16 },
      { id: 'plane_pill_sp_d', plane: 'DATA', text: 'DATA · CMEK', x: 1482, y: 266, w: 76, h: 16 },
      { id: 'plane_pill_llm_c', plane: 'COMPUTE', text: 'COMPUTE · models', x: 1424, y: 498, w: 110, h: 16 },
      { id: 'plane_pill_api_d', plane: 'DATA', text: 'DATA · external systems', x: 1408, y: 778, w: 142, h: 18 },
      { id: 'plane_pill_sess_c', plane: 'DATA', text: 'DATA · hub sessions', x: 618, y: 539, w: 114, h: 18 },
      { id: 'plane_pill_db_c', plane: 'DATA', text: 'DATA · per-tenant spoke DB', x: 760, y: 539, w: 158, h: 18 },
      { id: 'plane_pill_grad_c', plane: 'CONTROL', text: 'CONTROL · graduation', x: 1212, y: 539, w: 130, h: 18 },
      { id: 'plane_pill_obs_c', plane: 'CONTROL', text: 'CONTROL · audit + metering', x: 1184, y: 763, w: 152, h: 18 },
    ],
    edges: [
      ...makeStdLeftFanInEdges('idp_c'),
      ...makeStdPipelineEdges('idp_c', 'ingress_c', 'fe_c', 'gw_in_c_box', 'rt_c', 'gw_out_c_box', 'cp_c_auth', 'cp_c_reg', 'cp_c_sec', 'sess_c', 'spoke_store_zone', 'psc_cutover_card', 'obs_c_bar'),
      // Right Fan-Out into 3 PSC Spokes + Models + APIs (clean diverging #595959 elbows across x=1370 gutter!)
      { id: 'e17', source: 'gw_out_c_box', target: 'sp_a', exitX: 1, exitY: 0.27, entryX: 0, entryY: 0.5 },
      { id: 'e18', source: 'gw_out_c_box', target: 'sp_b', exitX: 1, exitY: 0.48, entryX: 0, entryY: 0.5, points: [{ x: 1370, y: 378 }, { x: 1370, y: 392 }] },
      { id: 'e19', source: 'gw_out_c_box', target: 'sp_c', exitX: 1, exitY: 0.64, entryX: 0, entryY: 0.5, points: [{ x: 1370, y: 419 }, { x: 1370, y: 460 }] },
      { id: 'e20', source: 'gw_out_c_box', target: 'sp_llm', exitX: 1, exitY: 0.78, entryX: 0, entryY: 0.5, points: [{ x: 1370, y: 454 }, { x: 1370, y: 547 }] },
      { id: 'e21', source: 'gw_out_c_box', target: 'sp_api', exitX: 1, exitY: 0.90, entryX: 0, entryY: 0.5, points: [{ x: 1370, y: 485 }, { x: 1370, y: 621 }] },
    ],
  };
}

/* ============================================================================
 * WS5 — Architecture Pattern Selector: Pool (A) vs. Hybrid (C) vs. Silo (B)
 * ============================================================================ */
export function buildWs5Spec() {
  return {
    id: 'ws5-decision-tree-and-triad',
    diagramName: 'WS5 - Architecture Pattern Selector',
    title: 'WS5 - PART 5 - Architecture Pattern Selector: Pool (A) vs. Hybrid (C) vs. Silo (B)',
    zones: [
      {
        id: 'zone_selector', x: 32, y: 74, w: 1536, h: 466, rx: 16,
        fill: '#F8FAFC', stroke: '#E2E8F0', dashed: false,
      },
      { id: 'zone_triad_1', x: 42, y: 568, w: 488, h: 196, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
      { id: 'zone_triad_2', x: 556, y: 568, w: 488, h: 196, rx: 14, fill: 'none', stroke: PLANE_PALETTE.COMPUTE.zoneStroke, dashed: true },
      { id: 'zone_triad_3', x: 1070, y: 568, w: 488, h: 196, rx: 14, fill: 'none', stroke: PLANE_PALETTE.CONTROL.zoneStroke, dashed: true },
    ],
    labels: [
      { id: 'lbl_col1', x: 52, y: 88, w: 268, h: 22, text: '1. Tenant Tiers & Compliance', size: 13.5, align: 'left' },
      { id: 'lbl_col2', x: 400, y: 88, w: 360, h: 22, text: '2. Binary Governance Gate (q_spoke, q_silo)', size: 13.5, align: 'left' },
      { id: 'lbl_col3', x: 850, y: 88, w: 360, h: 22, text: '3. Target Architecture Pattern', size: 13.5, align: 'left' },
      { id: 'lbl_col4', x: 1280, y: 88, w: 268, h: 22, text: '4. Grounded Outcome KPIs', size: 13.5, align: 'center' },
    ],
    cards: [
      // Row 1 — Standard Commercial -> Gate 1 -> Pattern A Pool
      {
        id: 'tier_c', x: 52, y: 122, w: 268, h: 112, fill: '#E8F0FE', stroke: '#93C5FD', strokeWidth: 1.5, shadow: true,
        lines: [
          { text: 'Standard Commercial SaaS', bold: true, size: 12.5, color: '#1E3A8A' },
          { text: '• SOC 2 Type II / ISO 27001', size: 10.5, color: '#1D4ED8', gapTop: 6 },
          { text: '• High-velocity PLG onboarding', size: 10.5, color: '#1D4ED8', gapTop: 3 },
        ],
      },
      {
        id: 'gate_pool', x: 400, y: 122, w: 360, h: 112, fill: '#FFFFFF', stroke: '#CBD5E1', strokeWidth: 1.4, shadow: true,
        lines: [
          { text: 'Gate 1 · Shared Pool Baseline', bold: true, size: 12.5, color: '#202124' },
          { text: '• q_spoke = 0, q_silo = 0 (no silo mandate)', size: 10.5, color: '#5F6368', gapTop: 6 },
          { text: '• AlloyDB FORCE RLS + Valkey 120 RPM', size: 10.5, color: '#5F6368', gapTop: 3 },
        ],
      },
      {
        id: 'pat_a', x: 850, y: 122, w: 356, h: 112, fill: '#ECFDF5', stroke: '#34D399', strokeWidth: 1.6, shadow: true,
        lines: [
          { text: 'Pattern A: Pool (WS2)', bold: true, size: 13, color: '#065F46' },
          { text: '• Shared Cloud Run / WarmPool, Gateways & RLS', size: 10.5, color: '#047857', gapTop: 6 },
          { text: '• 1,000+ tenants at 1.0x baseline COGS', size: 10.5, color: '#047857', gapTop: 3 },
        ],
      },
      {
        id: 'out_a', x: 1280, y: 128, w: 268, h: 100, fill: '#FFFFFF', stroke: '#34D399', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: '1,000+ Tenants', bold: true, size: 13.5, color: '#065F46' },
          { text: '1.0x Baseline COGS', bold: true, size: 12, color: '#047857', gapTop: 4 },
          { text: '~85% Prefix Cache', size: 10.8, color: '#334155', gapTop: 4 },
        ],
      },
      // Row 2 — Enterprise Hybrid -> Gate 2 -> Pattern C Hybrid
      {
        id: 'tier_a', x: 52, y: 264, w: 268, h: 112, fill: '#FEF7E0', stroke: '#FCD34D', strokeWidth: 1.5, shadow: true,
        lines: [
          { text: 'Enterprise Hybrid Tenants', bold: true, size: 12.5, color: '#78350F' },
          { text: '• Private spoke DB / MCP tools', size: 10.5, color: '#B45309', gapTop: 6 },
          { text: '• Unidirectional /28 PSC spokes', size: 10.5, color: '#B45309', gapTop: 3 },
        ],
      },
      {
        id: 'gate_hyb', x: 400, y: 264, w: 360, h: 112, fill: '#FFFFFF', stroke: '#CBD5E1', strokeWidth: 1.4, shadow: true,
        lines: [
          { text: 'Gate 2 · Shared Hub + Private Spoke?', bold: true, size: 12.5, color: '#202124' },
          { text: '• q_spoke = 1, q_silo = 0 (CMEK spoke VPC)', size: 10.5, color: '#5F6368', gapTop: 6 },
          { text: '• 0ms atomic CAS promotion from Pattern A', size: 10.5, color: '#5F6368', gapTop: 3 },
        ],
      },
      {
        id: 'pat_c', x: 850, y: 264, w: 356, h: 112, fill: '#EFF6FF', stroke: '#60A5FA', strokeWidth: 1.6, shadow: true,
        lines: [
          { text: 'Pattern C: Governed Hub & Spoke (WS4)', bold: true, size: 13, color: '#1E3A8A' },
          { text: '• Shared Hub + Isolated /28 PSC Spokes', size: 10.5, color: '#1D4ED8', gapTop: 6 },
          { text: '• 1.8x–2.8x COGS • 0 dropped turns on upgrade', size: 10.5, color: '#1D4ED8', gapTop: 3 },
        ],
      },
      {
        id: 'out_c', x: 1280, y: 270, w: 268, h: 100, fill: '#FFFFFF', stroke: '#60A5FA', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: '1.8x–2.8x COGS', bold: true, size: 13.5, color: '#1E3A8A' },
          { text: '0ms Live Cutover', bold: true, size: 12, color: '#1D4ED8', gapTop: 4 },
          { text: 'Unidirectional /28 PSC Spokes', size: 10.8, color: '#334155', gapTop: 4 },
        ],
      },
      // Row 3 — Regulated Sovereign -> Gate 3 -> Pattern B Silo
      {
        id: 'tier_b', x: 52, y: 406, w: 268, h: 112, fill: '#F3E8FD', stroke: '#C4B5FD', strokeWidth: 1.5, shadow: true,
        lines: [
          { text: 'Regulated Sovereign Tenants', bold: true, size: 12.5, color: '#4C1D95' },
          { text: '• OCC/FDIC, EU DORA, HIPAA GxP', size: 10.5, color: '#6D28D9', gapTop: 6 },
          { text: '• Dedicated project & HSM CMEK', size: 10.5, color: '#6D28D9', gapTop: 3 },
        ],
      },
      {
        id: 'gate_silo', x: 400, y: 406, w: 360, h: 112, fill: '#FFFFFF', stroke: '#CBD5E1', strokeWidth: 1.4, shadow: true,
        lines: [
          { text: 'Gate 3 · Dedicated GCP Project Silo?', bold: true, size: 12.5, color: '#202124' },
          { text: '• q_silo = 1 (physical project & VPC-SC)', size: 10.5, color: '#5F6368', gapTop: 6 },
          { text: '• Customer HSM CMEK (<60s kill-switch)', size: 10.5, color: '#5F6368', gapTop: 3 },
        ],
      },
      {
        id: 'pat_b', x: 850, y: 406, w: 356, h: 112, fill: '#FAF5FF', stroke: '#A855F7', strokeWidth: 1.6, shadow: true,
        lines: [
          { text: 'Pattern B: Sovereign Silo (WS3)', bold: true, size: 13, color: '#5B21B6' },
          { text: '• Dedicated GCP Project, VPC-SC & IAM PAB', size: 10.5, color: '#6D28D9', gapTop: 6 },
          { text: '• ~15x COGS • 0 cross-tenant blast radius', size: 10.5, color: '#6D28D9', gapTop: 3 },
        ],
      },
      {
        id: 'out_b', x: 1280, y: 412, w: 268, h: 100, fill: '#FFFFFF', stroke: '#A855F7', strokeWidth: 1.5, shadow: true, align: 'center',
        lines: [
          { text: '~15x COGS · Full Silo', bold: true, size: 13.5, color: '#5B21B6' },
          { text: '41.2s CMEK Halt', bold: true, size: 12, color: '#6D28D9', gapTop: 4 },
          { text: 'Confidential GKE SEV-SNP', size: 10.8, color: '#334155', gapTop: 4 },
        ],
      },
      // Universal Platform Invariants Triad (clean top clearance below top-border CONTROL/COMPUTE/CONTROL pills!)
      {
        id: 'triad_1', x: 54, y: 584, w: 464, h: 168, fill: '#FFFFFF', stroke: '#DADCE0', rx: 14, shadow: true,
        icon: 'cloud_iam', iconPos: 'left', iconSize: 26, padL: 50,
        lines: [
          { text: 'Invariant 1 · Dual Agent Gateways & Identity', bold: true, size: 12.2, color: '#174EA6' },
          { text: '• Inbound Client-to-Agent Gateway (OIDC/DPoP + Model Armor)', size: 10.2, color: '#3C4043', gapTop: 8 },
          { text: '• Outbound Agent-to-Target Gateway (2LO/3LO OBO + Output DLP)', size: 10.2, color: '#3C4043', gapTop: 5 },
          { text: '• Non-spoofable KMS P-256 STS JWT (<0.15ms JWKS verify)', size: 10.2, color: '#3C4043', gapTop: 5 },
        ],
      },
      {
        id: 'triad_2', x: 568, y: 584, w: 464, h: 168, fill: '#FFFFFF', stroke: '#DADCE0', rx: 14, shadow: true,
        icon: 'adk', iconPos: 'left', iconSize: 26, padL: 50,
        lines: [
          { text: 'Invariant 2 · 80% Reusable ADK Core Package', bold: true, size: 12.2, color: '#137333' },
          { text: '• Identical core-cymbal-agent/ Python code across Patterns A, B & C', size: 10.2, color: '#3C4043', gapTop: 8 },
          { text: '• Only 20% Terraform perimeter variables change per tenant tier', size: 10.2, color: '#3C4043', gapTop: 5 },
          { text: '• Eliminates multi-branch security, guardrail & prompt drift', size: 10.2, color: '#3C4043', gapTop: 5 },
        ],
      },
      {
        id: 'triad_3', x: 1082, y: 584, w: 464, h: 168, fill: '#FFFFFF', stroke: '#DADCE0', rx: 14, shadow: true,
        icon: 'cloud_monitoring', iconPos: 'left', iconSize: 26, padL: 50,
        lines: [
          { text: 'Invariant 3 · Deterministic Security & FinOps', bold: true, size: 12.2, color: '#174EA6' },
          { text: '• Zero-PII SHA-256 OpenTelemetry spans to BigQuery FinOps ledger', size: 10.2, color: '#3C4043', gapTop: 8 },
          { text: '• Fail-closed HTTP 401 / 403 / 429 / 422 circuit breakers', size: 10.2, color: '#3C4043', gapTop: 5 },
          { text: '• ARD -94% schema pruning & Valkey 120/600 RPM fairness', size: 10.2, color: '#3C4043', gapTop: 5 },
        ],
      },
    ],
    planeLegend: [
      { id: 'legend_key_CONTROL', plane: 'CONTROL', text: 'shared in A & C; dedicated project, VPC-SC & PAB per tenant in B', x: 32, y: 792, w: 500, h: 46 },
      { id: 'legend_key_COMPUTE', plane: 'COMPUTE', text: 'shared Cloud Run/WarmPool in A; shared hub in C; Conf. GKE in B', x: 550, y: 792, w: 500, h: 46 },
      { id: 'legend_key_DATA', plane: 'DATA', text: 'shared RLS in A; isolated /28 PSC spoke in C; dedicated + HSM CMEK in B', x: 1068, y: 792, w: 500, h: 46 },
    ],
    pills: [
      { id: 'plane_pill_t1', plane: 'CONTROL', text: 'CONTROL', x: 454, y: 559, w: 66, h: 18 },
      { id: 'plane_pill_t2', plane: 'COMPUTE', text: 'COMPUTE', x: 968, y: 559, w: 66, h: 18 },
      { id: 'plane_pill_t3', plane: 'CONTROL', text: 'CONTROL', x: 1482, y: 559, w: 66, h: 18 },
    ],
    edges: [
      { id: 'e1', source: 'tier_c', target: 'gate_pool', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      { id: 'e2', source: 'tier_a', target: 'gate_hyb', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      { id: 'e3', source: 'tier_b', target: 'gate_silo', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      { id: 'e4', source: 'gate_pool', target: 'pat_a', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      { id: 'e5', source: 'gate_hyb', target: 'pat_c', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      { id: 'e6', source: 'gate_silo', target: 'pat_b', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      { id: 'e7', source: 'pat_a', target: 'out_a', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      { id: 'e8', source: 'pat_c', target: 'out_c', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      { id: 'e9', source: 'pat_b', target: 'out_b', exitX: 1, exitY: 0.5, entryX: 0, entryY: 0.5 },
      // Tier graduation vertical links
      { id: 'e10', source: 'pat_a', target: 'pat_c', dashed: true, stroke: '#1A73E8', label: '0ms CAS', exitX: 0.5, exitY: 1, entryX: 0.5, entryY: 0 },
      { id: 'e11', source: 'pat_c', target: 'pat_b', dashed: true, stroke: '#7C3AED', label: 'Terraform', exitX: 0.5, exitY: 1, entryX: 0.5, entryY: 0 },
      // Razor-straight vertical downward links from selector tiers into the 3 invariant pillars
      { id: 'e12', source: 'tier_b', target: 'triad_1', dashed: true, stroke: '#94A3B8', exitX: 0.50, exitY: 1, entryX: 0.2845, entryY: 0 },
      { id: 'e13', source: 'gate_silo', target: 'triad_2', dashed: true, stroke: '#94A3B8', exitX: 0.7194, exitY: 1, entryX: 0.1961, entryY: 0 },
      { id: 'e14', source: 'pat_b', target: 'triad_3', dashed: true, stroke: '#94A3B8', exitX: 0.8539, exitY: 1, entryX: 0.1552, entryY: 0 },
    ],
  };
}

export const PRIMARY_WORKSTREAM_SPECS = [
  buildWs1Spec(),
  buildWs2Spec(),
  buildWs3Spec(),
  buildWs4Spec(),
  buildWs5Spec(),
];
