#!/usr/bin/env node
/**
 * scripts/generate_new_topic_blog.mjs
 *
 * First-class CLI & programmatic generator for creating a new F-01..F-12 compliant
 * Google Cloud Architecture Center technical blog + Official #78 Hub-and-Spoke
 * SVG & Draw.io XML (56 vertices, 23 edges, 18 distinct cards, >= 14 distinct icons)
 * for any new enterprise topic (FM-08).
 *
 * Usage:
 *   node scripts/generate_new_topic_blog.mjs \
 *     --title="Autonomous Grid & Substation Agentic AI on Google Cloud" \
 *     --prompt="Multi-agent SCADA telemetry ingestion, Cloud Spanner Graph topology reasoning, and Cloud KMS HSM-governed breaker actuation" \
 *     --domain="energy" \
 *     [--write-files]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compileOfficialArchCenterSvg,
  compileOfficialDrawioXml,
} from './build_all_workstream_diagrams.mjs';
import { synthesizeDynamicFlowSpecForBlueprint } from './build_diagram_e2e_flows.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function extractTopicPrefix(title) {
  const cleaned = String(title || 'Enterprise')
    .replace(/^(building|designing|architecting|implementing|scaling|securing)\s+/i, '')
    .replace(/\s+(on|with|using|in)\s+google\s+cloud.*$/i, '')
    .split(/[:—–-]/)[0]
    .trim();
  const words = cleaned.split(/\s+/).filter((w) => w.length > 2).slice(0, 3);
  if (words.length === 0) return 'Enterprise';
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('').slice(0, 16);
}

export function buildCustomTopicBlueprintConfig({
  id,
  title,
  prompt,
  domain = 'enterprise',
}) {
  const cleanTitle = String(title || 'Enterprise Multi-Agent Architecture on Google Cloud').trim();
  const cleanPrompt = String(
    prompt ||
      `Production reference architecture for ${cleanTitle} built with Google Cloud Agent Development Kit (ADK), Vertex AI Agent Engine, and Cloud Spanner Graph.`
  ).trim();
  const prefix = extractTopicPrefix(cleanTitle);
  const slug =
    id ||
    `custom-${cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 36)}`;

  const combinedLower = `${cleanTitle} ${cleanPrompt}`.toLowerCase();
  const store1Title = /alloydb|postgres/i.test(combinedLower) && !/spanner/i.test(combinedLower)
    ? 'AlloyDB pgvector'
    : 'Cloud Spanner Graph';
  const store2Title = /pubsub|dataflow|stream/i.test(combinedLower)
    ? 'Pub/Sub & Dataflow'
    : 'AlloyDB & BigQuery';

  return {
    id: slug,
    badge: `GOOGLE CLOUD ARCHITECTURE CENTER • ${String(domain).toUpperCase()} (#78)`,
    title: cleanTitle,
    subtitle: cleanPrompt.slice(0, 125),
    layout: 'hub-2-spoke',
    topUserTitle: `${prefix} Operators`,
    topUserSub: 'OIDC / BeyondCorp Access',
    step1LeftLabel: 'Request',
    step7RightLabel: 'Response',
    outerWrapperLabel: `${prefix} Governance Perimeter (VPC Service Controls + Cloud KMS CMEK)`,
    innerWrapperLabel: `VPC • ${prefix}CoordinatorAgent & 5-Hop Context Chain`,
    routingHubTitle: 'Routing & Policy Enforcement Hub (PEP/PDP)',
    routingHubSub: 'Central ingress, Model Armor screening & ADK orchestration',
    routingCards: {
      topLeft: { icon: 'cloud_armor', title: 'Google Cloud Armor', sub: 'WAF & Zero-Trust IAP Access' },
      midLeft: { icon: 'model_armor', title: 'Model Armor Shield', sub: 'Prompt Injection & DLP Filter' },
      botLeft: { icon: 'apigee_gateway', title: 'Apigee X & IAM', sub: 'OAuth 2.0 & Token Exchange' },
      topRight: { icon: 'load_balancer_cloud_armor', title: 'External Application', title2: 'Load Balancer', sub: 'Cloud Load Balancing' },
      botRight: { icon: 'cloud_run', title: 'Cloud Run Coordinator', sub: `${prefix}CoordinatorAgent`.slice(0, 28) },
      edgeTopLeft: ['WAF & IAP', 'policies'],
      edgeMidLeft: ['Sanitize', 'prompt'],
      edgeBotLeft: ['Verify IAM', '& OBO token'],
      step2Left: 'Request',
      step7Mid: 'Response',
    },
    govHubTitle: 'Central governance and',
    govHubTitle2: 'FinOps observability hub',
    govCards: {
      top: { icon: 'security_command_center', title: 'Security Command', title2: 'Center', sub: 'Continuous Threat & Drift Detection' },
      mid: { icon: 'cloud_kms', title: 'Cloud KMS & IAM', sub: 'CMEK & Least-Privilege IAM' },
      bot: { icon: 'bigquery_analytics', title: 'Cloud Logging & BQ', sub: 'OpenTelemetry & Token FinOps' },
    },
    midStep3Label: ['Route to specialist', 'ADK agent spokes'],
    midStep7Label: ['Sanitized response', 'with grounded citations'],
    midGovLabel: ['Security, OTel & FinOps', 'telemetry spans'],
    leftBoundaryLabel: `Spoke A: ${prefix}IngestAgent & ${prefix}ReasonerAgent (Knowledge Plane)`,
    leftZoneTitle: `${prefix} Reasoning & RAG Pool`,
    leftZoneSub: `${prefix}IngestAgent + ${prefix}ReasonerAgent`,
    leftCards: {
      modelArmor: { icon: 'cloud_sdp_dlp', title: 'Cloud DLP & Guardrails', sub: 'Domain Guardrails & PII Redaction' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini 2.5 Pro', sub: '90% Context Prefix Caching' },
      runtime: { icon: 'vertex_agent_engine', title: `${prefix}Reasoner`.slice(0, 22), sub: 'Hybrid Knowledge Retrieval' },
      mcp: { icon: 'mcp_servers', title: 'MCP Retrieval Tools', sub: 'hybrid_graphrag_search' },
      datastore: { icon: 'cloud_spanner', title: store1Title, sub: 'Vector Search + Graph Index' },
      step4Label: 'Sanitize request',
      step6Label: 'Sanitize response',
      step5Label: ['Generates', 'response'],
      ragLabel: ['Grounded', 'MCP & RAG'],
      toolLabel: ['Low-Latency', 'Index Query'],
    },
    rightBoundaryLabel: `Spoke B: ${prefix}ActionAgent & Sovereign Transaction Enclave`,
    rightZoneTitle: 'Governed Action & Transaction Spoke',
    rightZoneSub: `VPC-SC + Cloud KMS CMEK + ${prefix}ActionAgent`,
    rightCards: {
      modelArmor: { icon: 'vpc_sc', title: 'VPC-SC & Action Gate', sub: 'Pre-Commit Policy Verification' },
      llm: { icon: 'cloud_trace', title: 'Gemini 2.5 Flash', sub: 'Deterministic Schema Validator' },
      runtime: { icon: 'gke', title: `${prefix}ActionAgent`.slice(0, 22), sub: 'Governed Tool Execution' },
      mcp: { icon: 'discovery_engine', title: 'MCP Action Connectors', sub: 'execute_transactional_tool' },
      datastore: { icon: 'alloydb', title: store2Title, sub: 'ACID Ledger & Audit Trail' },
      ragLabel: ['Governed', 'Tool Call'],
      toolLabel: ['CMEK-Encrypted', 'State Commit'],
    },
  };
}

export function generateNewTopicBlogBundle({ title, prompt, domain = 'enterprise', id }) {
  const bp = buildCustomTopicBlueprintConfig({ id, title, prompt, domain });
  const svg = compileOfficialArchCenterSvg(bp);
  const drawioXml = compileOfficialDrawioXml(bp);
  const flowSpec = synthesizeDynamicFlowSpecForBlueprint(bp);

  const rc = bp.routingCards;
  const gc = bp.govCards;
  const lc = bp.leftCards;
  const sc = bp.rightCards;

  const all18Cards = [
    ['Routing Hub (#aecbfa)', `${rc.topLeft.title}`, rc.topLeft.sub],
    ['Routing Hub (#aecbfa)', `${rc.midLeft.title}`, rc.midLeft.sub],
    ['Routing Hub (#aecbfa)', `${rc.botLeft.title}`, rc.botLeft.sub],
    ['Routing Hub (#aecbfa)', `${rc.topRight.title} ${rc.topRight.title2 || ''}`.trim(), rc.topRight.sub],
    ['Routing Hub (#aecbfa)', `${rc.botRight.title}`, rc.botRight.sub],
    ['Governance Hub (#ceead6)', `${gc.top.title} ${gc.top.title2 || ''}`.trim(), gc.top.sub],
    ['Governance Hub (#ceead6)', `${gc.mid.title}`, gc.mid.sub],
    ['Governance Hub (#ceead6)', `${gc.bot.title}`, gc.bot.sub],
    ['Left Spoke (#feefc3)', `${lc.modelArmor.title}`, lc.modelArmor.sub],
    ['Left Spoke (#feefc3)', `${lc.llm.title}`, lc.llm.sub],
    ['Left Spoke (#feefc3)', `${lc.runtime.title}`, lc.runtime.sub],
    ['Left Spoke (#feefc3)', `${lc.mcp.title}`, lc.mcp.sub],
    ['Left Spoke (#feefc3)', `${lc.datastore.title}`, lc.datastore.sub],
    ['Right Spoke (#fad2cf)', `${sc.modelArmor.title}`, sc.modelArmor.sub],
    ['Right Spoke (#fad2cf)', `${sc.llm.title}`, sc.llm.sub],
    ['Right Spoke (#fad2cf)', `${sc.runtime.title}`, sc.runtime.sub],
    ['Right Spoke (#fad2cf)', `${sc.mcp.title}`, sc.mcp.sub],
    ['Right Spoke (#fad2cf)', `${sc.datastore.title}`, sc.datastore.sub],
  ];

  const markdown = [
    '---',
    `title: "${bp.title.replace(/"/g, '\\"')}"`,
    `subtitle: "${bp.subtitle.replace(/"/g, '\\"')}"`,
    `series: "Google Cloud Enterprise Agentic AI & Multi-Tenant Architecture Series"`,
    `canonical_blueprint: "Blueprint #78 (${bp.id})"`,
    `status: "PUBLISH_READY"`,
    `date: "2026-10-27"`,
    '---',
    '',
    `# ${bp.title}`,
    '',
    `> **Subtitle:** ${bp.subtitle}  `,
    `> **Contributors:** Principal AI Architect & Field Deployment Engineering | Cross-Product Solution Architecture | Google Cloud Architecture Center Engineering Team`,
    '',
    'This document describes a production-grade Google Cloud reference architecture for **' + bp.title + '**. It is intended for cloud architects, platform engineers, security leads, and AI engineers building governed multi-agent systems with the Google Agent Development Kit (ADK), Vertex AI Agent Engine, Model Armor, and Model Context Protocol (MCP).',
    '',
    '## Architecture',
    '',
    `![Figure 1 — ${bp.title}](../diagrams/${bp.id}.svg)`,
    '',
    `*Figure 1. ${bp.title} (${bp.subtitle}). Editable assets: [Draw.io source](../diagrams/${bp.id}.drawio) | [Architecture Center SVG](../diagrams/${bp.id}.svg).*`,
    '',
    '### 4-Zone Hub-and-Spoke Topology',
    '',
    ...flowSpec.plainZones.map((z) => `- **${z.zoneId} — ${z.name}:** ${z.role}`),
    '',
    '### End-to-End 7-Step Agentic Flow',
    '',
    ...flowSpec.plainSteps.map((s, idx) => `${idx + 1}. **${s.title} (${s.zone}):** ${s.logicalNarrative}`),
    '',
    '### 18-Card Component Groups Inventory (1:1 Diagram Parity)',
    '',
    '| Zone | Diagram Card Title | Architectural Role |',
    '| :--- | :--- | :--- |',
    ...all18Cards.map(([zone, cardTitle, role]) => `| ${zone} | **${cardTitle}** | ${role} |`),
    '',
    '## Products used',
    '',
    '- **Agentic runtime & models:** Vertex AI Agent Engine, Google Agent Development Kit (ADK), Gemini 2.5 Pro, and Gemini 2.5 Flash.',
    '- **Edge ingress & security:** External Application Load Balancer, Google Cloud Armor, Model Armor, Apigee X, Cloud DLP, Cloud KMS (CMEK/HSM), VPC Service Controls, and Security Command Center.',
    `- **Data & knowledge plane:** ${lc.datastore.title} and ${sc.datastore.title}.`,
    '- **Observability & FinOps:** Cloud Logging, Cloud Trace, and BigQuery Ops Ledger.',
    '',
    '## Design considerations',
    '',
    '### Security, privacy, and compliance',
    `Enforces defense-in-depth across ${rc.topLeft.title}, ${rc.midLeft.title}, ${lc.modelArmor.title}, and ${sc.modelArmor.title}, ensuring zero unredacted PII enters foundation model context windows or leaves the VPC Service Controls perimeter.`,
    '',
    '### Reliability',
    `Isolates read-heavy reasoning (${lc.runtime.title}) from state-changing execution (${sc.runtime.title}) with deterministic schema validation via ${sc.llm.title}.`,
    '',
    '### Cost optimization',
    `Applies Vertex AI Context Caching (90% prefix discount) on ${lc.llm.title} and routes deterministic schema validation to ${sc.llm.title}.`,
    '',
    "## What's next",
    '',
    '- Explore the [Multi-Tenant Agentic AI Reference Series](../README.md).',
    '- Review the [End-to-End Workstream and Diagram Guide](../docs/END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md).',
    '',
  ].join('\n');

  return { bp, svg, drawioXml, flowSpec, markdown };
}

function parseCliArgs(argv) {
  const out = {};
  for (const arg of argv.slice(2)) {
    if (arg === '--write-files') {
      out.writeFiles = true;
    } else if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        out[arg.slice(2, eq)] = arg.slice(eq + 1);
      }
    }
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = parseCliArgs(process.argv);
  const bundle = generateNewTopicBlogBundle({
    id: args.id,
    title: args.title || 'Autonomous Energy Grid & Substation Multi-Agent AI on Google Cloud',
    prompt:
      args.prompt ||
      'Real-time SCADA telemetry ingestion, Cloud Spanner Graph grid topology reasoning, and Cloud KMS HSM-governed substation breaker actuation.',
    domain: args.domain || 'energy',
  });

  if (args.writeFiles) {
    const diagDir = path.join(ROOT_DIR, 'diagrams');
    const blogsDir = path.join(ROOT_DIR, 'blogs');
    fs.writeFileSync(path.join(diagDir, `${bundle.bp.id}.svg`), bundle.svg, 'utf8');
    fs.writeFileSync(path.join(diagDir, `${bundle.bp.id}.drawio`), bundle.drawioXml, 'utf8');
    fs.writeFileSync(path.join(blogsDir, `${bundle.bp.id}.md`), bundle.markdown, 'utf8');
    console.log(`✅ Wrote blogs/${bundle.bp.id}.md, diagrams/${bundle.bp.id}.svg, and diagrams/${bundle.bp.id}.drawio`);
  } else {
    console.log(
      JSON.stringify(
        {
          id: bundle.bp.id,
          title: bundle.bp.title,
          svgBytes: Buffer.byteLength(bundle.svg, 'utf8'),
          drawioBytes: Buffer.byteLength(bundle.drawioXml, 'utf8'),
          markdownBytes: Buffer.byteLength(bundle.markdown, 'utf8'),
          zones: bundle.flowSpec.plainZones.length,
          steps: bundle.flowSpec.plainSteps.length,
        },
        null,
        2
      )
    );
  }
}
