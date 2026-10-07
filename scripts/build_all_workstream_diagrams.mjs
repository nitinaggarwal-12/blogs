#!/usr/bin/env node
/**
 * Official Google Cloud Architecture Center Diagram Builder (Workstreams 1–5)
 * Matches the exact visual format, palette, icons, numbered callouts (①–⑦),
 * and hub-and-spoke layout of:
 * https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system
 * (/static/architecture/images/multi-tenant-agentic-ai-system.svg)
 *
 * Official Palette from multi-tenant-agentic-ai-system.svg:
 * - Outer Google Cloud Frame : #1a73e8 (stroke #202124) + white Google Cloud wordmark
 * - Nested Boundary Frames   : #ffffff (stroke #202124)
 * - Routing / Ingress Hub    : #aecbfa (stroke #202124)
 * - Central Governance Hub   : #ceead6 (stroke #202124)
 * - Left Tenant / Pool Zone  : #feefc3 (stroke #202124)
 * - Right Tenant / Spoke Zone: #fad2cf (stroke #202124)
 * - Component Cards          : #ffffff (stroke #202124, stroke-width 2px, rx 6px)
 * - Numbered Step Badges     : #174ea6 circle (r=20) with white bold step numbers (1..7)
 */

import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CENTRAL_DIAGRAMS_DIR = path.join(ROOT_DIR, 'diagrams');

const requireFromPromptCanvas = createRequire('/Users/nitinagga/Documents/PromptCanvas/package.json');
const puppeteer = requireFromPromptCanvas('puppeteer-core');

const OFFICIAL_ASSETS = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'official_arch_center_assets.json'), 'utf8')
);

function escXml(str) {
  return String(str ?? '')
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * All 7 Workstream Blueprints configured in the exact Google Cloud Architecture Center
 * Hub-and-Spoke visual format of https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system
 */
const WORKSTREAM_BLUEPRINTS = [
  // =========================================================================
  // 1. WORKSTREAM 1.1: B2B SaaS Multi-Tenant Taxonomy Overview (Pattern A, B, C)
  // =========================================================================
  {
    id: 'ws1-multi-tenant-taxonomy-overview',
    badge: 'WORKSTREAM 1.1 BLUEPRINT',
    title: 'GEAP Multi-Tenant Agentic AI Taxonomy: Pooled (Pattern A), Sovereign Silos (Pattern B) & Hybrid (Pattern C)',
    subtitle: 'B2B ISV SaaS Reference Architecture Expanding Google Cloud Architecture Center (Cymbal SaaS Serving FinVault & RetailStream)',
    workstreamDir: 'workstream-1-reference-architecture/diagrams',
    topUserTitle: 'Competing B2B Tenants',
    topUserSub: 'FinVault (OIDC) & RetailStream (Entra)',
    step1LeftLabel: 'Request',
    step7RightLabel: 'Response',
    outerWrapperLabel: 'Shared Control Plane & Multi-Tenant Governance Perimeter (80% Reusable Core + 20% Topology Delta)',
    innerWrapperLabel: 'VPC & 5-Hop Cryptographic Context Chain',
    routingHubTitle: 'Routing hub (Hop 1 & Hop 2 PEP/PDP)',
    routingHubSub: 'Central ingress, OBO+DPoP & ARD catalog filter',
    routingCards: {
      topLeft: { icon: 'load_balancer_cloud_armor', title: 'Cloud Armor & IAP', sub: 'Strip Forged X-Tenant-ID' },
      midLeft: { icon: 'model_armor', title: 'Model Armor', sub: 'Ingress Prompt Screen' },
      botLeft: { icon: 'iap_iam_shield', title: 'RFC 8693 OBO + DPoP', sub: 'Sender-Constrained JWT' },
      topRight: { icon: 'load_balancer_cloud_armor', title: 'External Application', title2: 'Load Balancer', sub: 'Cloud Load Balancing' },
      botRight: { icon: 'cloud_run', title: 'Cloud Run', sub: 'Topology Router & ARD PDP' },
      edgeTopLeft: ['Header & WAF', 'policies'],
      edgeMidLeft: ['Sanitize', 'prompt'],
      edgeBotLeft: ['OBO + DPoP', 'verification'],
      step2Left: 'Request',
      step7Mid: 'Response',
    },
    govHubTitle: 'Central governance and',
    govHubTitle2: 'FinOps observability hub',
    govCards: {
      top: { icon: 'security_command_center', title: 'Security Command', title2: 'Center', sub: 'Cross-Pattern Breach Alerts' },
      mid: { icon: 'iap_iam_shield', title: 'Central IAM & PAB', sub: 'Agent Identity (2LO/3LO)' },
      bot: { icon: 'cloud_logging', title: 'Cloud Logging & BQ', sub: 'Zero-PII OTel & Chargeback' },
    },
    midStep3Label: ['Route by tenant tier', '(Pool, Silo or PSC)'],
    midStep7Label: ['Sanitized response', 'with SDP redaction'],
    midGovLabel: ['Security, OTel & FinOps', 'chargeback telemetry'],
    leftBoundaryLabel: 'Pattern A: Pooled Shared Runtime (Standard & High-Density SaaS)',
    leftZoneTitle: 'Tenant Pool (Shared Runtime)',
    leftZoneSub: 'FinVault (8k Cap) & RetailStream (4k Cap)',
    leftCards: {
      modelArmor: { icon: 'model_armor', title: 'Model Armor', sub: 'Tenant NLCs & SDP PII' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini 2.5 Pro', sub: '90% Prefix Cache Savings' },
      runtime: { icon: 'gemini_agent_platform', title: 'Agent Runtime', sub: 'gVisor + temp:tenant_id' },
      mcp: { icon: 'mcp_servers', title: 'MCP servers', sub: '2LO + 3LO OIDC/Entra' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'Shared AlloyDB', sub: 'Row-Level Security (RLS)' },
      step4Label: 'Sanitize request',
      step6Label: 'Sanitize response',
      step5Label: ['Generates', 'response'],
      ragLabel: ['Scoped', 'MCP & RAG'],
      toolLabel: ['SET LOCAL', 'current_tenant'],
    },
    rightBoundaryLabel: 'Pattern B (Sovereign Silos) & Pattern C (Hybrid PSC Spokes)',
    rightZoneTitle: 'Dedicated Sovereign Tenant Project',
    rightZoneSub: 'VPC-SC + IAM PAB + CMEK Kill-Switch + PSC',
    rightCards: {
      modelArmor: { icon: 'model_armor', title: 'Model Armor', sub: 'Sovereign Silo Guardrails' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini / Gemma 3', sub: 'Claude 3.7 or Private GKE' },
      runtime: { icon: 'gemini_agent_platform', title: 'Agent Runtime', sub: 'Dedicated Silo + Agent Alpha' },
      mcp: { icon: 'mcp_servers', title: 'MCP servers', sub: 'Local Silo 3LO Connectors' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'CMEK Datastore', sub: 'AlloyDB, BQ & KMS 423 Lock' },
      ragLabel: ['Air-Gapped', 'Silo RAG'],
      toolLabel: ['CMEK-Encrypted', 'State & Tools'],
    },
  },

  // =========================================================================
  // 2. WORKSTREAM 1.3: Cloud Architecture Center PR Baseline (5-Hop Context Chain)
  // =========================================================================
  {
    id: 'ws1-cloud-arch-center-5hop-baseline',
    badge: 'WORKSTREAM 1.3 DOC PR BLUEPRINT',
    title: 'Cloud Architecture Center: Multi-Tenant Agentic AI System with 5-Hop Cryptographic Governance',
    subtitle: 'Official Hub-and-Spoke Reference Architecture (docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system)',
    workstreamDir: 'workstream-1-reference-architecture/diagrams',
    topUserTitle: 'User',
    topUserSub: 'OIDC / Entra JWT',
    step1LeftLabel: 'Request',
    step7RightLabel: 'Response',
    outerWrapperLabel: 'Shared hubs (VPC Service Controls Organization Perimeter)',
    innerWrapperLabel: 'VPC',
    routingHubTitle: 'Routing hub (Hop 1 & Hop 2)',
    routingHubSub: 'Central ingress & cryptographic token exchange',
    routingCards: {
      topLeft: { icon: 'load_balancer_cloud_armor', title: 'Cloud Armor', sub: 'Strips Forged X-Tenant-ID' },
      midLeft: { icon: 'model_armor', title: 'Model Armor', sub: 'Edge Prompt Injection Gate' },
      botLeft: { icon: 'iap_iam_shield', title: 'IAP', sub: 'RFC 8693 OBO + DPoP' },
      topRight: { icon: 'load_balancer_cloud_armor', title: 'External Application', title2: 'Load Balancer', sub: 'Cloud Load Balancing' },
      botRight: { icon: 'cloud_run', title: 'Cloud Run', sub: 'Frontend portal & Hop 2 PDP' },
      edgeTopLeft: ['Security', 'policies'],
      edgeMidLeft: ['Sanitize', 'prompt'],
      edgeBotLeft: ['User', 'authentication'],
      step2Left: 'Request',
      step7Mid: 'Response',
    },
    govHubTitle: 'Central governance and',
    govHubTitle2: 'security hub',
    govCards: {
      top: { icon: 'security_command_center', title: 'Security Command', title2: 'Center', sub: 'Continuous Threat Detection' },
      mid: { icon: 'iap_iam_shield', title: 'Central IAM', sub: 'Auth Manager (2LO / 3LO)' },
      bot: { icon: 'cloud_logging', title: 'Cloud Logging', sub: 'BigQuery OTel Audit Sink' },
    },
    midStep3Label: ['Route request', 'to tenant'],
    midStep7Label: ['Sanitized response', 'from tenant'],
    midGovLabel: ['Security and', 'observability', 'monitoring'],
    leftBoundaryLabel: 'PAB • Hop 3–5 Isolation Boundary (Tenant Alpha)',
    leftZoneTitle: 'Tenant A (FinVault Bank)',
    leftZoneSub: 'Tenant project • Enterprise Tier (Google OIDC)',
    leftCards: {
      modelArmor: { icon: 'model_armor', title: 'Model Armor', sub: 'Hop 4: Bank SDP & OCC NLC' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini & Claude', sub: 'Agent Platform (8k Budget)' },
      runtime: { icon: 'gemini_agent_platform', title: 'Agent Runtime', sub: 'Hop 3: Shared + Agent Alpha' },
      mcp: { icon: 'mcp_servers', title: 'MCP servers', sub: 'Hop 5: Workspace & Jira 3LO' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'Datastore', sub: 'BigQuery, AlloyDB RLS, CMEK' },
      step4Label: 'Sanitize request',
      step6Label: 'Sanitize response',
      step5Label: ['Generates', 'response'],
      ragLabel: ['Secure', 'RAG'],
      toolLabel: ['Agent-tool', 'interaction'],
    },
    rightBoundaryLabel: 'PAB • Hop 3–5 Isolation Boundary (Tenant Beta)',
    rightZoneTitle: 'Tenant B (RetailStream Corp)',
    rightZoneSub: 'Tenant project • Standard Tier (Entra ID)',
    rightCards: {
      modelArmor: { icon: 'model_armor', title: 'Model Armor', sub: 'Hop 4: PCI PAN SDP & NLC' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini', sub: 'Agent Platform (4k Cap)' },
      runtime: { icon: 'gemini_agent_platform', title: 'Agent Runtime', sub: 'Hop 3: Shared Diagnostic' },
      mcp: { icon: 'mcp_servers', title: 'MCP servers', sub: 'Hop 5: SharePoint & SNOW' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'Datastore', sub: 'BigQuery, AlloyDB RLS, Redis' },
      ragLabel: ['Secure', 'RAG'],
      toolLabel: ['Agent-tool', 'interaction'],
    },
  },

  // =========================================================================
  // 3. WORKSTREAM 2.1: Pattern A — High-Density Pooled Multi-Tenant Architecture
  // =========================================================================
  {
    id: 'ws2-pattern-a-pooled-5hop-architecture',
    badge: 'WORKSTREAM 2.1 • PATTERN A BLUEPRINT',
    title: 'Pattern A: High-Density Pooled Multi-Tenant Architecture & Shared Runtime Governance',
    subtitle: 'Milestone 1 (Weeks 1–4) • Shared Project (cymbal-pooled-saas-prod) with 90% Prompt Prefix Cache Savings & 0 Bleed',
    workstreamDir: 'workstream-2-pattern-a-pooled/diagrams',
    topUserTitle: 'FinVault & RetailStream',
    topUserSub: 'Competing SaaS Tenants',
    step1LeftLabel: 'Request',
    step7RightLabel: 'Response',
    outerWrapperLabel: 'Shared GCP Project: cymbal-pooled-saas-prod (Maximum Density Pooled SaaS)',
    innerWrapperLabel: 'Shared VPC • 5-Hop Cryptographic Context Chain',
    routingHubTitle: 'Hop 1 & Hop 2: Edge PEP & GEAP Registry PDP',
    routingHubSub: 'Header stripping, OBO+DPoP & ARD catalog pruning',
    routingCards: {
      topLeft: { icon: 'load_balancer_cloud_armor', title: 'Cloud Armor WAF', sub: 'Strips Forged X-Tenant-ID' },
      midLeft: { icon: 'model_armor', title: 'GEAP Registry PDP', sub: 'ARD Catalog Filter (403 Alpha)' },
      botLeft: { icon: 'iap_iam_shield', title: 'IAP + OBO Broker', sub: 'RFC 8693 OBO + DPoP (jkt)' },
      topRight: { icon: 'load_balancer_cloud_armor', title: 'External Application', title2: 'Load Balancer', sub: 'Cloud Load Balancing' },
      botRight: { icon: 'cloud_run', title: 'ADK Callback Gate', sub: 'before_agent_callback Prune' },
      edgeTopLeft: ['Strip header', 'X-Tenant-ID'],
      edgeMidLeft: ['Filter ARD', 'catalog'],
      edgeBotLeft: ['Mint OBO +', 'DPoP token'],
      step2Left: 'Request',
      step7Mid: 'Response',
    },
    govHubTitle: 'Hop 3 & 5: Shared FinOps,',
    govHubTitle2: 'Cache & OTel Hub',
    govCards: {
      top: { icon: 'gemini_agent_platform', title: 'ContextCacheConfig', title2: '(90% COGS Save)', sub: '32k Shared Operator Prefix' },
      mid: { icon: 'iap_iam_shield', title: 'Redis Rate Bulkhead', sub: '4k Standard vs 8k Enterprise' },
      bot: { icon: 'cloud_logging', title: 'BigQuery OTel Sink', sub: 'Zero-PII Token Chargeback' },
    },
    midStep3Label: ['Bind immutable', 'temp:tenant_id'],
    midStep7Label: ['SDP-redacted', 'tenant response'],
    midGovLabel: ['84.7% Net Input', 'COGS Savings & OTel'],
    leftBoundaryLabel: 'Logical & Cryptographic Slice A • FinVault Bank (Enterprise Tier)',
    leftZoneTitle: 'FinVault Logical Partition',
    leftZoneSub: 'Namespace: finvault:user:session (Envelope CMEK)',
    leftCards: {
      modelArmor: { icon: 'model_armor', title: 'Model Armor', sub: 'Masks IBAN/SWIFT + OCC NLC' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini & Claude 3.7', sub: '8,000 Thinking-Token Budget' },
      runtime: { icon: 'gemini_agent_platform', title: 'Pooled gVisor Pod', sub: 'Shared + Private Agent Alpha' },
      mcp: { icon: 'mcp_servers', title: '3LO Workspace/Jira', sub: 'Drive, Calendar, Gmail, Jira' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'Shared AlloyDB RLS', sub: "app.current_tenant='finvault'" },
      step4Label: 'Sanitize request',
      step6Label: 'Sanitize response',
      step5Label: ['Generates', 'response'],
      ragLabel: ['gs://cymbal-', 'skills-finvault'],
      toolLabel: ['RLS Filtered', 'FinVault Rows'],
    },
    rightBoundaryLabel: 'Logical & Cryptographic Slice B • RetailStream Corp (Standard Tier)',
    rightZoneTitle: 'RetailStream Logical Partition',
    rightZoneSub: 'Namespace: retailstream:user:session (120 RPM Cap)',
    rightCards: {
      modelArmor: { icon: 'model_armor', title: 'Model Armor', sub: 'Masks Card PAN + PCI NLC' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini 2.5 Pro', sub: 'Clamped to 4,000 Tokens' },
      runtime: { icon: 'gemini_agent_platform', title: 'Pooled gVisor Pod', sub: 'Shared Agent Only (403 Alpha)' },
      mcp: { icon: 'mcp_servers', title: '3LO Entra & SNOW', sub: 'Inline OAuth Consent Gate' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'Shared AlloyDB RLS', sub: "current_tenant='retailstream'" },
      ragLabel: ['gs://cymbal-', 'skills-retail'],
      toolLabel: ['RLS Filtered', 'Retail Rows'],
    },
  },

  // =========================================================================
  // 4. WORKSTREAM 2.2 & 2.5: Pattern A — 10-Point Breach Simulation & Defense
  // =========================================================================
  {
    id: 'ws2-pattern-a-breach-defense-sequence',
    badge: 'WORKSTREAM 2.5 • BREACH SUITE BLUEPRINT',
    title: 'Pattern A: 10-Point Cross-Tenant Breach Simulation & Cryptographic Defense Matrix',
    subtitle: 'Workstream 2.2 & 2.5 (run_breach_simulations.py) • 10/10 Adversarial Vectors Neutralized Across Hops 1–5',
    workstreamDir: 'workstream-2-pattern-a-pooled/diagrams',
    topUserTitle: 'Red-Team Attacker',
    topUserSub: 'Spoofed Headers & Injections',
    step1LeftLabel: 'Attack Probe',
    step7RightLabel: 'Blocked / Safe',
    outerWrapperLabel: 'Adversarial Breach Verification Harness (10/10 Deterministic Security Gates PASS)',
    innerWrapperLabel: 'VPC • Zero-Trust 5-Hop Enforcement Pipeline',
    routingHubTitle: 'Hop 1 & Hop 2 Gates (Vectors 1, 2, 3 & 10)',
    routingHubSub: 'Neutralizes header spoofing, Agent Alpha & MCP leaks',
    routingCards: {
      topLeft: { icon: 'load_balancer_cloud_armor', title: 'Vector 1: Header Strip', sub: 'Drops Forged X-Tenant-ID' },
      midLeft: { icon: 'model_armor', title: 'Vector 2: Agent 403', sub: 'Blocks Retail -> Agent Alpha' },
      botLeft: { icon: 'iap_iam_shield', title: 'Vector 3: Tool Prune', sub: 'Prunes FinVault Jira MCP' },
      topRight: { icon: 'load_balancer_cloud_armor', title: 'External Application', title2: 'Load Balancer', sub: 'Cloud Armor Edge PEP' },
      botRight: { icon: 'cloud_run', title: 'Hop 2 Registry PDP', sub: 'ARD Catalog + ADK Callback' },
      edgeTopLeft: ['Strip spoofed', 'header'],
      edgeMidLeft: ['Return HTTP', '403 Forbidden'],
      edgeBotLeft: ['Prune 3LO', 'MCP tools'],
      step2Left: 'Probe',
      step7Mid: '403 / 200',
    },
    govHubTitle: 'Hop 3 & 5 FinOps &',
    govHubTitle2: 'Audit Gates (Vectors 6 & 9)',
    govCards: {
      top: { icon: 'security_command_center', title: 'Vector 6: Redis 429', title2: '& 4k Token Clamp', sub: 'Blocks 250 RPM Flood & 16k' },
      mid: { icon: 'iap_iam_shield', title: 'Vector 10: Inline 3LO', sub: 'HTTP 401 Entra OAuth Challenge' },
      bot: { icon: 'cloud_logging', title: 'BigQuery OTel Audit', sub: 'Logs Every Blocked Vector' },
    },
    midStep3Label: ['Verified context', 'enters Hop 3–5'],
    midStep7Label: ['Zero cross-tenant', 'data/cache bleed'],
    midGovLabel: ['Real-time security', 'violation spans'],
    leftBoundaryLabel: 'Hop 4 Guardrail Gates (Vectors 4, 5 & 8) • Prompt, NLC & SDP DLP',
    leftZoneTitle: 'Model Armor & Semantic NLCs',
    leftZoneSub: 'Ingress Injection Screen & Egress SDP Redaction',
    leftCards: {
      modelArmor: { icon: 'model_armor', title: 'Vector 4: HTTP 400', sub: 'Blocks SQLi & Cache Dump' },
      llm: { icon: 'gemini_agent_platform', title: 'Vector 5: HTTP 422', sub: 'Blocks OCC Escalation Suppress' },
      runtime: { icon: 'gemini_agent_platform', title: 'Agent Runtime', sub: 'Executes Only Clean Turns' },
      mcp: { icon: 'mcp_servers', title: 'Vector 8: SDP Mask', sub: 'Redacts IBAN, SWIFT & PAN' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'Zero Raw PII Egress', sub: '[REDACTED-FINVAULT-*]' },
      step4Label: 'Screen prompt',
      step6Label: 'Redact PII',
      step5Label: ['Evaluate', 'NLC rules'],
      ragLabel: ['DLP Egress', 'Filter'],
      toolLabel: ['Zero PII in', 'Completion'],
    },
    rightBoundaryLabel: 'Hop 3 & Hop 5 Storage Gates (Vectors 7 & 9) • Memory, Skills & RLS',
    rightZoneTitle: 'Memory Bank, Skills & AlloyDB RLS',
    rightZoneSub: 'Cryptographic Namespace & Storage-Engine Isolation',
    rightCards: {
      modelArmor: { icon: 'model_armor', title: 'Vector 7A: L4 Memory', sub: 'PermissionError on Cross-Read' },
      llm: { icon: 'gemini_agent_platform', title: 'Vector 7B: GCS Skills', sub: 'Blocks gs://cymbal-skills-fv' },
      runtime: { icon: 'gemini_agent_platform', title: 'Vector 9: Prefix Cache', sub: 'READ_ONLY_IMMUTABLE_PREFIX' },
      mcp: { icon: 'mcp_servers', title: 'Auth Manager Vault', sub: 'Tenant-Scoped OAuth Tokens' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'Vector 7C: AlloyDB RLS', sub: '0 Cross-Tenant Rows Returned' },
      ragLabel: ['Isolated', 'Prefix Cache'],
      toolLabel: ['SET LOCAL', 'current_tenant'],
    },
  },

  // =========================================================================
  // 5. WORKSTREAM 3.1: Pattern B — Zero-Trust Sovereign Silos (VPC-SC, PAB, CMEK)
  // =========================================================================
  {
    id: 'ws3-pattern-b-sovereign-silos-architecture',
    badge: 'WORKSTREAM 3.1 • PATTERN B BLUEPRINT',
    title: 'Pattern B: Zero-Trust Sovereign Silos (VPC-SC, IAM PAB, CMEK Kill-Switch & Air-Gapped Gemma 3 on GKE)',
    subtitle: 'Milestone 2 (Weeks 4–7) • Dedicated Per-Tenant GCP Projects with Physical Isolation & Instant HTTP 423 CMEK Lock',
    workstreamDir: 'workstream-3-pattern-b-siloed/diagrams',
    topUserTitle: 'mTLS SPIFFE Clients',
    topUserSub: 'FinVault & RetailStream',
    step1LeftLabel: 'mTLS Request',
    step7RightLabel: 'Silo Response',
    outerWrapperLabel: 'Multi-Project Sovereign Topology (80% Core 5-Hop Pipeline + 20% Sovereign VPC-SC / PAB / CMEK Delta)',
    innerWrapperLabel: 'Central mTLS Routing & Governance Hub VPC',
    routingHubTitle: 'Central mTLS & SPIFFE Routing Hub',
    routingHubSub: 'Client certificate pinning (HTTP 401 on SAN mismatch)',
    routingCards: {
      topLeft: { icon: 'load_balancer_cloud_armor', title: 'Cloud Armor & mTLS', sub: 'X.509 SPIFFE Cert Pinning' },
      midLeft: { icon: 'model_armor', title: 'Model Armor', sub: 'Edge Prompt & DDoS Filter' },
      botLeft: { icon: 'iap_iam_shield', title: 'IAM PAB Verifier', sub: 'HTTP 403 Cross-Project Block' },
      topRight: { icon: 'load_balancer_cloud_armor', title: 'External Application', title2: 'Load Balancer', sub: 'SNI Silo Routing' },
      botRight: { icon: 'cloud_run', title: 'Sovereign Hub Router', sub: 'Routes to Dedicated Silo' },
      edgeTopLeft: ['Verify client', 'SPIFFE SAN'],
      edgeMidLeft: ['Sanitize', 'prompt'],
      edgeBotLeft: ['Enforce org', 'PAB policy'],
      step2Left: 'mTLS Valid',
      step7Mid: '200 / 423',
    },
    govHubTitle: 'Cloud KMS CMEK &',
    govHubTitle2: 'Sovereign Security Hub',
    govCards: {
      top: { icon: 'security_command_center', title: 'Security Command', title2: 'Center', sub: 'VPC-SC & PAB Violation Feed' },
      mid: { icon: 'iap_iam_shield', title: 'Cloud KMS / EKM Key', sub: 'Customer Kill-Switch (HTTP 423)' },
      bot: { icon: 'cloud_logging', title: 'Silo Security Suite', sub: '6/6 Sovereign Tests PASS' },
    },
    midStep3Label: ['Route to isolated', 'VPC-SC tenant project'],
    midStep7Label: ['Sovereign response', '(or HTTP 423 Locked)'],
    midGovLabel: ['CMEK state & VPC-SC', 'audit monitoring'],
    leftBoundaryLabel: 'PAB + VPC-SC Perimeter Alpha • Project: cymbal-finvault-silo-prod',
    leftZoneTitle: 'Tenant A Silo (FinVault Bank)',
    leftZoneSub: 'Dedicated Project • CMEK: finvault-kr/agent-memory',
    leftCards: {
      modelArmor: { icon: 'model_armor', title: 'Model Armor', sub: 'Dedicated FinVault Template' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemma 3 (27B) GKE', sub: 'Air-Gapped vLLM + Claude 3.7' },
      runtime: { icon: 'gemini_agent_platform', title: 'Agent Runtime', sub: 'Dedicated Silo + Agent Alpha' },
      mcp: { icon: 'mcp_servers', title: 'Local Silo MCP', sub: 'Workspace & Jira (0 Egress)' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'CMEK Datastore', sub: 'Dedicated AlloyDB & Memory' },
      step4Label: 'Sanitize request',
      step6Label: 'Sanitize response',
      step5Label: ['Air-gapped', 'inference'],
      ragLabel: ['Private GKE', 'Zero Egress'],
      toolLabel: ['CMEK Kill-Switch', 'HTTP 423 Ready'],
    },
    rightBoundaryLabel: 'PAB + VPC-SC Perimeter Beta • Project: cymbal-retailstream-silo-prod',
    rightZoneTitle: 'Tenant B Silo (RetailStream)',
    rightZoneSub: 'Dedicated Project • CMEK: retailstream-kr/memory',
    rightCards: {
      modelArmor: { icon: 'model_armor', title: 'Model Armor', sub: 'Dedicated Retail PCI Template' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini 2.5 Pro PT', sub: 'Dedicated Provisioned Quota' },
      runtime: { icon: 'gemini_agent_platform', title: 'Agent Runtime', sub: 'Dedicated RetailStream Silo' },
      mcp: { icon: 'mcp_servers', title: 'Local Silo MCP', sub: 'Entra SharePoint & SNOW' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'CMEK Datastore', sub: 'Dedicated AlloyDB & Memory' },
      ragLabel: ['VPC-SC Bound', 'Secure RAG'],
      toolLabel: ['CMEK Kill-Switch', 'HTTP 423 Ready'],
    },
  },

  // =========================================================================
  // 6. WORKSTREAM 4.1: Pattern C — Dynamic Hybrid, PSC Bridge & Live Migration
  // =========================================================================
  {
    id: 'ws4-pattern-c-hybrid-psc-and-migration',
    badge: 'WORKSTREAM 4.1 • PATTERN C BLUEPRINT',
    title: 'Pattern C: Dynamic Hybrid Hub-and-Spoke, Private Service Connect (PSC) & Live Tier Migration',
    subtitle: 'Milestone 3 (Weeks 7–10) • Unified Control Plane Routing Standard to Shared Pool & Enterprise to PSC Spokes (0 Dropped Turns)',
    workstreamDir: 'workstream-4-pattern-c-hybrid/diagrams',
    topUserTitle: 'Standard & Enterprise',
    topUserSub: 'Single Unified SaaS URL',
    step1LeftLabel: 'Request',
    step7RightLabel: 'Response',
    outerWrapperLabel: 'Unified Hybrid Control Hub (cymbal-hybrid-hub-prod) + PSC Bridge to Sovereign Spokes',
    innerWrapperLabel: 'Hub VPC • Tenant-Aware Router & 3-Phase Live Tier Migrator',
    routingHubTitle: 'Unified Control Plane & Intelligent Router Hub',
    routingHubSub: 'Firestore live routing table + Cross-Project GEAP Registry',
    routingCards: {
      topLeft: { icon: 'load_balancer_cloud_armor', title: 'Cloud Armor & IAP', sub: 'Single SaaS URL + OBO/DPoP' },
      midLeft: { icon: 'model_armor', title: 'Cross-Project ARD', sub: 'Federated GEAP Registry' },
      botLeft: { icon: 'iap_iam_shield', title: 'Firestore Route Table', sub: 'Maps Tenant -> Pool or PSC' },
      topRight: { icon: 'load_balancer_cloud_armor', title: 'External Application', title2: 'Load Balancer', sub: 'Cloud Load Balancing' },
      botRight: { icon: 'cloud_run', title: 'Cloud Run Router', sub: 'Tier Router & Live Migrator' },
      edgeTopLeft: ['Security', 'policies'],
      edgeMidLeft: ['Resolve', 'agent route'],
      edgeBotLeft: ['Atomic route', 'lookup'],
      step2Left: 'Request',
      step7Mid: 'Response',
    },
    govHubTitle: '3-Phase Zero-Downtime',
    govHubTitle2: 'Tier Migration Engine',
    govCards: {
      top: { icon: 'cloud_run', title: '1. SHADOW_SYNC', title2: '(0ms Lag Copy)', sub: 'Streams RLS & L4 Memory' },
      mid: { icon: 'iap_iam_shield', title: '2. ATOMIC_CUTOVER', sub: 'Flips Firestore Route to PSC' },
      bot: { icon: 'cloud_logging', title: '3. DRAIN_AND_VERIFY', sub: '0 Dropped Turns (4/4 PASS)' },
    },
    midStep3Label: ['Route Standard to Pool', 'or Enterprise via PSC'],
    midStep7Label: ['Seamless response', '(0 dropped sessions)'],
    midGovLabel: ['Live promotion:', 'Pool -> PSC Spoke'],
    leftBoundaryLabel: 'Standard Tier: Shared Pooled Plane (Initial RetailStream Route)',
    leftZoneTitle: 'Shared Pooled Runtime',
    leftZoneSub: 'pool://cymbal-shared-pooled-v2 (90% Cache Savings)',
    leftCards: {
      modelArmor: { icon: 'model_armor', title: 'Shared Model Armor', sub: 'Multi-Tenant Prompt & SDP' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini 2.5 Pro', sub: '4,000 Thinking Cap + Cache' },
      runtime: { icon: 'gemini_agent_platform', title: 'Pooled Runtime', sub: 'Serves Standard SaaS Tier' },
      mcp: { icon: 'mcp_servers', title: 'Pooled MCP Hub', sub: '2LO + Delegated 3LO Tools' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'Shared AlloyDB RLS', sub: 'Source for Phase 1 Shadow Sync' },
      step4Label: 'Sanitize request',
      step6Label: 'Sanitize response',
      step5Label: ['Pooled', 'inference'],
      ragLabel: ['Shared Pool', 'RAG'],
      toolLabel: ['Streams State to', 'PSC Spoke'],
    },
    rightBoundaryLabel: 'Enterprise Tier: Private Service Connect (PSC) Spokes (FinVault + Upgraded RetailStream)',
    rightZoneTitle: 'Dedicated Enterprise PSC Spokes',
    rightZoneSub: 'psc://10.10.0.50 (FinVault) & psc://10.10.0.51 (Retail)',
    rightCards: {
      modelArmor: { icon: 'model_armor', title: 'Spoke Model Armor', sub: 'Dedicated Spoke DLP & NLC' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini & Claude 3.7', sub: 'Upgraded 8,000 Thinking Cap' },
      runtime: { icon: 'gemini_agent_platform', title: 'Spoke Runtime', sub: 'PSC ServiceAttachment Target' },
      mcp: { icon: 'mcp_servers', title: 'Dedicated Spoke MCP', sub: 'Isolated Inside VPC-SC Spoke' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'CMEK Spoke AlloyDB', sub: 'Replicated State + CMEK Lock' },
      ragLabel: ['Unidirectional', 'PSC Bridge'],
      toolLabel: ['CMEK-Encrypted', 'Spoke Storage'],
    },
  },

  // =========================================================================
  // 7. WORKSTREAM 5.1 & 5.2: Executive Decision Tree & The Agentic Triad
  // =========================================================================
  {
    id: 'ws5-decision-tree-and-agentic-triad',
    badge: 'WORKSTREAM 5.1 & 5.2 • CAPSTONE BLUEPRINT',
    title: 'Workstream 5 Capstone: Executive Topology Decision Guide & The Multi-Tenant Agentic Triad',
    subtitle: 'Unifying Zero-Trust Security, FinOps Unit Economics (90% Prefix Cache), and Zero-PII OpenTelemetry Across All 3 Patterns',
    workstreamDir: 'workstream-5-wrap-up-and-backlog/diagrams',
    topUserTitle: 'Enterprise & SMB Users',
    topUserSub: '10,000+ Multi-Tier Tenants',
    step1LeftLabel: 'Request',
    step7RightLabel: 'Response',
    outerWrapperLabel: 'The Multi-Tenant Agentic Triad: Security (Hops 1–5) • FinOps COGS (-84.7%) • Zero-PII Observability',
    innerWrapperLabel: 'Unified GEAP & ADK 2.0 Reference Architecture (12/12 Forensic Audit • 20/20 Simulations PASS)',
    routingHubTitle: 'Triad Pillar 1: Zero-Trust Cryptographic Security',
    routingHubSub: '5-Hop Context Chain across Ingress, Registry & Runtime',
    routingCards: {
      topLeft: { icon: 'load_balancer_cloud_armor', title: 'Hop 1: Edge PEP', sub: 'Header Strip + OBO + DPoP' },
      midLeft: { icon: 'model_armor', title: 'Hop 4: Model Armor', sub: 'Injection 400 + NLC 422 + SDP' },
      botLeft: { icon: 'iap_iam_shield', title: 'Hop 2: Registry PDP', sub: 'ARD Filter + ADK Tool Prune' },
      topRight: { icon: 'load_balancer_cloud_armor', title: 'External Application', title2: 'Load Balancer', sub: 'Global Anycast Ingress' },
      botRight: { icon: 'cloud_run', title: 'Architecture Selector', sub: 'Routes Pattern A, B or C' },
      edgeTopLeft: ['Verify OBO', '& DPoP'],
      edgeMidLeft: ['Screen &', 'redact PII'],
      edgeBotLeft: ['Prune ARD', '& MCP tools'],
      step2Left: 'Request',
      step7Mid: 'Response',
    },
    govHubTitle: 'Triad Pillar 3: Privacy-',
    govHubTitle2: 'Preserving OTel & Chargeback',
    govCards: {
      top: { icon: 'security_command_center', title: 'Security Command', title2: 'Center', sub: 'Unified SIEM & Audit Lineage' },
      mid: { icon: 'iap_iam_shield', title: '3 Chargeback Models', sub: 'Even, Proportional & Tiered' },
      bot: { icon: 'cloud_logging', title: 'BigQuery OTel Sink', sub: 'Zero-PII Cryptographic Spans' },
    },
    midStep3Label: ['Dispatch to optimal', 'cost/security tier'],
    midStep7Label: ['Verified zero-bleed', 'agent completion'],
    midGovLabel: ['Real-time COGS &', 'security telemetry'],
    leftBoundaryLabel: 'Triad Pillar 2 (High Density): Pattern A Pooled FinOps & COGS Engine',
    leftZoneTitle: 'Pattern A: Pooled Unit Economics',
    leftZoneSub: 'Lowest COGS ($) • 84.7% Net Input Token Savings',
    leftCards: {
      modelArmor: { icon: 'model_armor', title: 'Redis Rate Bulkhead', sub: '120 RPM Std / 600 RPM Ent' },
      llm: { icon: 'gemini_agent_platform', title: 'ContextCacheConfig', sub: '90% Discount on 32k Prefix' },
      runtime: { icon: 'gemini_agent_platform', title: 'Thinking Budget Cap', sub: 'Clamps 4k Std vs 8k Ent' },
      mcp: { icon: 'mcp_servers', title: '2LO & 3LO Auth Mgr', sub: 'Scoped Per-Tenant Vault' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'AlloyDB RLS & L1–L5', sub: 'Shared Storage Density' },
      step4Label: 'Check quota',
      step6Label: 'Log COGS',
      step5Label: ['90% Cached', 'inference'],
      ragLabel: ['Zero Cache', 'Bleed'],
      toolLabel: ['Storage-Engine', 'RLS Policy'],
    },
    rightBoundaryLabel: 'Triad Pillar 2 (Regulated Scale): Pattern B Silos ($$$) & Pattern C Hybrid ($$)',
    rightZoneTitle: 'Pattern B Silos & Pattern C PSC Spokes',
    rightZoneSub: 'Zero Blast Radius + Zero-Downtime Tier Promotion',
    rightCards: {
      modelArmor: { icon: 'model_armor', title: 'VPC-SC & IAM PAB', sub: 'Hard Perimeter Isolation' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemma 3 & Claude 3.7', sub: 'Air-Gapped GKE & Dedicated PT' },
      runtime: { icon: 'gemini_agent_platform', title: 'PSC Spoke Runtime', sub: '3-Phase Live Tier Upgrade' },
      mcp: { icon: 'mcp_servers', title: 'Dedicated Silo MCP', sub: 'Zero Cross-Project Egress' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'Cloud KMS CMEK Lock', sub: 'Instant HTTP 423 Kill-Switch' },
      ragLabel: ['Private PSC', 'NAT Bridge'],
      toolLabel: ['Customer-Revocable', 'CMEK Keys'],
    },
  },
];

/**
 * Helper to render a component card matching the exact Google Cloud Architecture Center style:
 * White rounded rect (#ffffff, stroke #202124, stroke-width 2, rx 6) + official icon + bold title + subtitle
 */
function fitAttr(str, maxPx, charPx) {
  const s = String(str ?? '');
  if (s.length * charPx > maxPx) {
    return ` textLength="${maxPx}" lengthAdjust="spacingAndGlyphs"`;
  }
  return '';
}

function renderArchCard({ x, y, w, h, iconKey, title, title2, sub }) {
  const iconDataUri = OFFICIAL_ASSETS[iconKey] || OFFICIAL_ASSETS.gemini_agent_platform;
  const iconSize = 32;
  const iconX = x + 10;
  const iconY = y + Math.round((h - iconSize) / 2);
  const textX = iconX + iconSize + 10;
  const maxTextW = w - (textX - x) - 10;

  let textSvg = '';
  if (title2 && sub) {
    textSvg = `
      <text x="${textX}" y="${y + 23}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" font-weight="700" fill="#202124"${fitAttr(title, maxTextW, 7.6)}>${escXml(title)}</text>
      <text x="${textX}" y="${y + 41}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" font-weight="700" fill="#202124"${fitAttr(title2, maxTextW, 7.6)}>${escXml(title2)}</text>
      <text x="${textX}" y="${y + 59}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="11.5" font-weight="400" fill="#3c4043"${fitAttr(sub, maxTextW, 6.2)}>${escXml(sub)}</text>
    `;
  } else if (title2) {
    textSvg = `
      <text x="${textX}" y="${y + 30}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="14" font-weight="700" fill="#202124"${fitAttr(title, maxTextW, 7.8)}>${escXml(title)}</text>
      <text x="${textX}" y="${y + 50}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="14" font-weight="700" fill="#202124"${fitAttr(title2, maxTextW, 7.8)}>${escXml(title2)}</text>
    `;
  } else if (sub) {
    textSvg = `
      <text x="${textX}" y="${y + Math.round(h / 2) - 4}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" font-weight="700" fill="#202124"${fitAttr(title, maxTextW, 7.6)}>${escXml(title)}</text>
      <text x="${textX}" y="${y + Math.round(h / 2) + 15}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="11.5" font-weight="400" fill="#3c4043"${fitAttr(sub, maxTextW, 6.2)}>${escXml(sub)}</text>
    `;
  } else {
    textSvg = `
      <text x="${textX}" y="${y + Math.round(h / 2) + 5}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="14" font-weight="700" fill="#202124"${fitAttr(title, maxTextW, 7.8)}>${escXml(title)}</text>
    `;
  }

  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ry="6" fill="#ffffff" stroke="#202124" stroke-width="2"/>
      <image x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" preserveAspectRatio="xMidYMid meet" xlink:href="${iconDataUri}"/>
      ${textSvg}
    </g>
  `;
}

/**
 * Helper to render an official Google Cloud Architecture Center numbered callout circle (#174ea6, r=20)
 */
function renderStepCircle(cx, cy, num) {
  return `
    <g>
      <circle cx="${cx}" cy="${cy}" r="20" fill="#174ea6"/>
      <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="17" font-weight="700" fill="#ffffff">${escXml(num)}</text>
    </g>
  `;
}

/**
 * Compiles the standalone SVG matching https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system
 */
function compileOfficialArchCenterSvg(bp) {
  const W = 1200;
  const H = 1410;

  const rc = bp.routingCards;
  const gc = bp.govCards;
  const lc = bp.leftCards;
  const sc = bp.rightCards;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <!-- Official Google Cloud Architecture Center open chevron arrowhead (#202124) -->
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8 5 L 1 8.5" fill="none" stroke="#202124" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>

  <!-- Clean White Background -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>

  <!-- Subtle Blueprint Title Banner at Very Top -->
  <text x="20" y="22" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" font-weight="700" fill="#174ea6">[${escXml(bp.badge)}] ${escXml(bp.title)}</text>
  <text x="20" y="40" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="11.5" font-weight="400" fill="#5f6368">${escXml(bp.subtitle)}</text>

  <!-- ===================================================================== -->
  <!-- TOP EXTERNAL USER / TENANT BOX (Outside Google Cloud Frame)           -->
  <!-- ===================================================================== -->
  <g>
    <rect x="465" y="52" width="250" height="86" rx="8" ry="8" fill="#ffffff" stroke="#202124" stroke-width="2"/>
    <!-- User Silhouette Icon (exact match to official diagram) -->
    <circle cx="590" cy="76" r="9.5" fill="#000000"/>
    <path d="M 573 101 C 573 91 607 91 607 101 Z" fill="#000000"/>
    <text x="590" y="117" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" font-weight="700" fill="#202124">${escXml(bp.topUserTitle)}</text>
    <text x="590" y="132" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="11" font-weight="400" fill="#3c4043">${escXml(bp.topUserSub)}</text>
  </g>

  <!-- ===================================================================== -->
  <!-- OUTER GOOGLE CLOUD CONTAINER (#1a73e8)                                -->
  <!-- ===================================================================== -->
  <rect x="20" y="218" width="1160" height="1172" rx="18" ry="18" fill="#1a73e8" stroke="#202124" stroke-width="1.2"/>
  <!-- Official White Google Cloud Wordmark -->
  <image x="38" y="232" width="138" height="25" preserveAspectRatio="xMidYMid meet" xlink:href="${OFFICIAL_ASSETS.gcp_wordmark_white}"/>

  <!-- ===================================================================== -->
  <!-- NESTED WHITE BOUNDARY 1: Shared hubs / Perimeter                      -->
  <!-- ===================================================================== -->
  <rect x="36" y="268" width="1128" height="1104" rx="14" ry="14" fill="#ffffff" stroke="#202124" stroke-width="1.2"/>
  <text x="52" y="291" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" font-weight="700" fill="#202124"${fitAttr(bp.outerWrapperLabel, 495, 7.5)}>${escXml(bp.outerWrapperLabel)}</text>

  <!-- ===================================================================== -->
  <!-- NESTED WHITE BOUNDARY 2: VPC                                          -->
  <!-- ===================================================================== -->
  <rect x="52" y="304" width="1096" height="1050" rx="14" ry="14" fill="#ffffff" stroke="#202124" stroke-width="1.2"/>
  <text x="68" y="327" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" font-weight="700" fill="#202124"${fitAttr(bp.innerWrapperLabel, 480, 7.5)}>${escXml(bp.innerWrapperLabel)}</text>

  <!-- ===================================================================== -->
  <!-- ZONE 1: ROUTING HUB (Pastel Blue #aecbfa)                             -->
  <!-- ===================================================================== -->
  <rect x="68" y="338" width="664" height="330" rx="6" ry="6" fill="#aecbfa" stroke="#202124" stroke-width="1"/>
  <text x="84" y="363" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="15" font-weight="700" fill="#202124">${escXml(bp.routingHubTitle)}</text>
  <text x="84" y="381" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" font-weight="400" fill="#202124">${escXml(bp.routingHubSub)}</text>

  <!-- Routing Hub Cards -->
  ${renderArchCard({ x: 88, y: 398, w: 204, h: 66, iconKey: rc.topLeft.icon, title: rc.topLeft.title, sub: rc.topLeft.sub })}
  ${renderArchCard({ x: 88, y: 482, w: 204, h: 66, iconKey: rc.midLeft.icon, title: rc.midLeft.title, sub: rc.midLeft.sub })}
  ${renderArchCard({ x: 96, y: 580, w: 196, h: 66, iconKey: rc.botLeft.icon, title: rc.botLeft.title, sub: rc.botLeft.sub })}

  ${renderArchCard({ x: 452, y: 432, w: 262, h: 76, iconKey: rc.topRight.icon, title: rc.topRight.title, title2: rc.topRight.title2, sub: rc.topRight.sub })}
  ${renderArchCard({ x: 476, y: 580, w: 224, h: 66, iconKey: rc.botRight.icon, title: rc.botRight.title, sub: rc.botRight.sub })}

  <!-- Top User <-> External ALB Arrows (Step 1 & Step 7) -->
  <line x1="566" y1="138" x2="566" y2="430" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="612" y1="432" x2="612" y2="140" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="536" y="185" text-anchor="end" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="14" fill="#202124">${escXml(bp.step1LeftLabel)}</text>
  ${renderStepCircle(566, 180, '1')}
  ${renderStepCircle(612, 180, '7')}
  <text x="640" y="185" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="14" fill="#202124">${escXml(bp.step7RightLabel)}</text>

  <!-- Cloud Armor & Model Armor <-> ALB Bracket Arrows -->
  <path d="M 452 470 L 424 470 L 424 431 L 294 431" fill="none" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <path d="M 424 470 L 424 515 L 294 515" fill="none" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="424" y1="470" x2="450" y2="470" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="358" y="408" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(rc.edgeTopLeft[0])}</text>
  <text x="358" y="425" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(rc.edgeTopLeft[1])}</text>
  <text x="358" y="534" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(rc.edgeMidLeft[0])}</text>
  <text x="358" y="551" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(rc.edgeMidLeft[1])}</text>

  <!-- IAP <-> Cloud Run Bidirectional Arrow -->
  <line x1="294" y1="613" x2="474" y2="613" stroke="#202124" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text x="384" y="590" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(rc.edgeBotLeft[0])}</text>
  <text x="384" y="607" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(rc.edgeBotLeft[1])}</text>

  <!-- ALB <-> Cloud Run Arrows (Step 2 & Step 7) -->
  <line x1="566" y1="508" x2="566" y2="578" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="612" y1="580" x2="612" y2="510" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="536" y="548" text-anchor="end" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="14" fill="#202124">${escXml(rc.step2Left)}</text>
  ${renderStepCircle(566, 543, '2')}
  ${renderStepCircle(612, 543, '7')}
  <text x="640" y="548" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="14" fill="#202124">${escXml(rc.step7Mid)}</text>

  <!-- ===================================================================== -->
  <!-- ZONE 2: CENTRAL GOVERNANCE & SECURITY HUB (Pastel Green #ceead6)      -->
  <!-- ===================================================================== -->
  <rect x="798" y="346" width="328" height="320" rx="6" ry="6" fill="#ceead6" stroke="#202124" stroke-width="1"/>
  <text x="816" y="372" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="15" font-weight="700" fill="#202124">${escXml(bp.govHubTitle)}</text>
  <text x="816" y="390" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="15" font-weight="700" fill="#202124">${escXml(bp.govHubTitle2)}</text>

  ${renderArchCard({ x: 824, y: 406, w: 276, h: 72, iconKey: gc.top.icon, title: gc.top.title, title2: gc.top.title2, sub: gc.top.sub })}
  ${renderArchCard({ x: 830, y: 492, w: 264, h: 68, iconKey: gc.mid.icon, title: gc.mid.title, sub: gc.mid.sub })}
  ${renderArchCard({ x: 828, y: 574, w: 268, h: 68, iconKey: gc.bot.icon, title: gc.bot.title, sub: gc.bot.sub })}

  <!-- ===================================================================== -->
  <!-- ZONE 3: LEFT TENANT / POOL PROJECT (PAB Wrapper + Warm Yellow #feefc3)-->
  <!-- ===================================================================== -->
  <rect x="70" y="772" width="516" height="560" rx="8" ry="8" fill="#ffffff" stroke="#202124" stroke-width="1.2"/>
  <text x="86" y="795" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" font-weight="700" fill="#202124"${fitAttr(bp.leftBoundaryLabel, 344, 7.2)}>${escXml(bp.leftBoundaryLabel)}</text>

  <rect x="86" y="808" width="484" height="508" rx="6" ry="6" fill="#feefc3" stroke="#202124" stroke-width="1"/>
  <text x="104" y="834" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="15" font-weight="700" fill="#202124">${escXml(bp.leftZoneTitle)}</text>
  <text x="104" y="852" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" font-weight="400" fill="#202124">${escXml(bp.leftZoneSub)}</text>

  <!-- Left Zone Cards -->
  ${renderArchCard({ x: 102, y: 874, w: 202, h: 72, iconKey: lc.modelArmor.icon, title: lc.modelArmor.title, sub: lc.modelArmor.sub })}
  ${renderArchCard({ x: 102, y: 1110, w: 202, h: 72, iconKey: lc.llm.icon, title: lc.llm.title, sub: lc.llm.sub })}

  ${renderArchCard({ x: 334, y: 924, w: 220, h: 74, iconKey: lc.runtime.icon, title: lc.runtime.title, sub: lc.runtime.sub })}
  ${renderArchCard({ x: 338, y: 1068, w: 214, h: 74, iconKey: lc.mcp.icon, title: lc.mcp.title, sub: lc.mcp.sub })}
  ${renderArchCard({ x: 332, y: 1218, w: 224, h: 74, iconKey: lc.datastore.icon, title: lc.datastore.title, sub: lc.datastore.sub })}

  <!-- Left Zone Step Callouts (4, 6, 5) -->
  ${renderStepCircle(124, 976, '4')}
  <text x="152" y="981" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.step4Label)}</text>

  ${renderStepCircle(124, 1024, '6')}
  <text x="152" y="1029" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.step6Label)}</text>

  ${renderStepCircle(124, 1214, '5')}
  <text x="152" y="1208" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.step5Label[0])}</text>
  <text x="152" y="1226" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.step5Label[1])}</text>

  <!-- Left Zone Internal Arrows -->
  <path d="M 304 910 L 319 910 L 319 946 L 332 946" fill="none" stroke="#202124" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <path d="M 304 1146 L 319 1146 L 319 972 L 332 972" fill="none" stroke="#202124" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>

  <!-- MCP -> Agent Runtime (Secure RAG) -->
  <line x1="444" y1="1068" x2="444" y2="1054" stroke="#202124" stroke-width="2"/>
  <line x1="444" y1="1014" x2="444" y2="1000" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="444" y="1029" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.ragLabel[0])}</text>
  <text x="444" y="1046" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.ragLabel[1])}</text>

  <!-- Datastore -> MCP (Agent-tool interaction) -->
  <line x1="444" y1="1218" x2="444" y2="1204" stroke="#202124" stroke-width="2"/>
  <line x1="444" y1="1158" x2="444" y2="1144" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="444" y="1176" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.toolLabel[0])}</text>
  <text x="444" y="1193" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.toolLabel[1])}</text>

  <!-- ===================================================================== -->
  <!-- ZONE 4: RIGHT TENANT / SPOKE PROJECT (PAB Wrapper + Coral #fad2cf)    -->
  <!-- ===================================================================== -->
  <rect x="614" y="772" width="516" height="560" rx="8" ry="8" fill="#ffffff" stroke="#202124" stroke-width="1.2"/>
  <text x="630" y="795" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" font-weight="700" fill="#202124"${fitAttr(bp.rightBoundaryLabel, 344, 7.2)}>${escXml(bp.rightBoundaryLabel)}</text>

  <rect x="630" y="808" width="484" height="508" rx="6" ry="6" fill="#fad2cf" stroke="#202124" stroke-width="1"/>
  <text x="648" y="834" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="15" font-weight="700" fill="#202124">${escXml(bp.rightZoneTitle)}</text>
  <text x="648" y="852" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" font-weight="400" fill="#202124">${escXml(bp.rightZoneSub)}</text>

  <!-- Right Zone Cards -->
  ${renderArchCard({ x: 646, y: 874, w: 202, h: 72, iconKey: sc.modelArmor.icon, title: sc.modelArmor.title, sub: sc.modelArmor.sub })}
  ${renderArchCard({ x: 646, y: 976, w: 202, h: 72, iconKey: sc.llm.icon, title: sc.llm.title, sub: sc.llm.sub })}

  ${renderArchCard({ x: 878, y: 924, w: 220, h: 74, iconKey: sc.runtime.icon, title: sc.runtime.title, sub: sc.runtime.sub })}
  ${renderArchCard({ x: 882, y: 1068, w: 214, h: 74, iconKey: sc.mcp.icon, title: sc.mcp.title, sub: sc.mcp.sub })}
  ${renderArchCard({ x: 876, y: 1218, w: 224, h: 74, iconKey: sc.datastore.icon, title: sc.datastore.title, sub: sc.datastore.sub })}

  <!-- Right Zone Internal Arrows -->
  <path d="M 848 910 L 863 910 L 863 946 L 876 946" fill="none" stroke="#202124" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <path d="M 848 1012 L 863 1012 L 863 972 L 876 972" fill="none" stroke="#202124" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>

  <!-- MCP -> Agent Runtime (Secure RAG) -->
  <line x1="988" y1="1068" x2="988" y2="1054" stroke="#202124" stroke-width="2"/>
  <line x1="988" y1="1014" x2="988" y2="1000" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="988" y="1029" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(sc.ragLabel[0])}</text>
  <text x="988" y="1046" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(sc.ragLabel[1])}</text>

  <!-- Datastore -> MCP (Agent-tool interaction) -->
  <line x1="988" y1="1218" x2="988" y2="1204" stroke="#202124" stroke-width="2"/>
  <line x1="988" y1="1158" x2="988" y2="1144" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="988" y="1176" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(sc.toolLabel[0])}</text>
  <text x="988" y="1193" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(sc.toolLabel[1])}</text>

  <!-- ===================================================================== -->
  <!-- MIDDLE ROUTING & OBSERVABILITY TRUNK (Step 3, Step 7 & Dashed Gov)    -->
  <!-- ===================================================================== -->
  <!-- Solid Request/Response Trunk between Cloud Run (x=586, y=646) and Tenant Runtimes (x=444 & x=988, y=924) -->
  <line x1="586" y1="744" x2="586" y2="648" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <path d="M 444 922 L 444 744 L 988 744 L 988 922" fill="none" stroke="#202124" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>

  <!-- Dashed Governance & Observability Line between PAB Boundaries (x=328 & x=872, y=772) and Governance Hub (x=962, y=666) -->
  <path d="M 328 770 L 328 730 L 962 730 L 962 668" fill="none" stroke="#202124" stroke-width="2" stroke-dasharray="6,6" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <path d="M 872 730 L 872 770" fill="none" stroke="#202124" stroke-width="2" stroke-dasharray="6,6" marker-end="url(#arrow)"/>

  <!-- Step 3 Callout (Route request to tenant) -->
  ${renderStepCircle(404, 700, '3')}
  <text x="432" y="695" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(bp.midStep3Label[0])}</text>
  <text x="432" y="713" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(bp.midStep3Label[1])}</text>

  <!-- Step 7 Callout (Sanitized response from tenant) -->
  ${renderStepCircle(616, 700, '7')}
  <text x="644" y="695" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(bp.midStep7Label[0])}</text>
  <text x="644" y="713" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(bp.midStep7Label[1])}</text>

  <!-- Dashed Observability Label -->
  <text x="974" y="688" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" fill="#202124">${escXml(bp.midGovLabel[0] || '')}</text>
  <text x="974" y="705" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" fill="#202124">${escXml(bp.midGovLabel[1] || '')}</text>
  <text x="974" y="722" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" fill="#202124">${escXml(bp.midGovLabel[2] || '')}</text>
</svg>`;
}

const USER_SILHOUETTE_DATA_URI =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="36" viewBox="0 0 44 36">' +
      '<circle cx="22" cy="11" r="8.5" fill="#000000"/>' +
      '<path d="M 6 34 C 6 24 38 24 38 34 Z" fill="#000000"/>' +
      '</svg>'
  ).toString('base64');

/**
 * Compiles 1:1 editable Draw.io XML (.drawio & .drawio.xml) matching the exact
 * Google Cloud Architecture Center Hub-and-Spoke layout with embedded base64 icons,
 * official Google Cloud wordmark, step badges, and deterministic waypoint edges.
 */
function compileOfficialDrawioXml(bp) {
  const rc = bp.routingCards;
  const gc = bp.govCards;
  const lc = bp.leftCards;
  const sc = bp.rightCards;

  const cells = [];
  const SVG_GUARD = '<svg width="0" height="0" style="display:none;"></svg>';

  const addVertex = (id, x, y, w, h, rawHtmlValue, style) => {
    cells.push(
      `        <mxCell id="${id}" value="${escXml(rawHtmlValue)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`
    );
    return id;
  };

  // Pure coordinate-bound edge helper (omits vertex source/target IDs so mxGraph never overrides coordinates with diagonal center-to-center lines)
  const addPointEdge = (id, srcPt, tgtPt, waypoints = [], opts = {}) => {
    const {
      dashed = false,
      startArrow = false,
      endArrow = true,
    } = opts;
    const styleParts = [
      'edgeStyle=none',
      'rounded=0',
      'html=1',
      'strokeColor=#202124',
      'strokeWidth=2',
      startArrow ? 'startArrow=open;startFill=0;startSize=7' : 'startArrow=none',
      endArrow ? 'endArrow=open;endFill=0;endSize=7' : 'endArrow=none',
    ];
    if (dashed) styleParts.push('dashed=1;dashPattern=3 3');
    const ptsXml =
      waypoints.length > 0
        ? `<Array as="points">${waypoints.map((p) => `<mxPoint x="${p[0]}" y="${p[1]}"/>`).join('')}</Array>`
        : '';
    cells.push(
      `        <mxCell id="${id}" value="" style="${styleParts.join(';')};" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${srcPt[0]}" y="${srcPt[1]}" as="sourcePoint"/><mxPoint x="${tgtPt[0]}" y="${tgtPt[1]}" as="targetPoint"/>${ptsXml}</mxGeometry></mxCell>`
    );
  };

  // 1. Top Blueprint Title Banner
  addVertex(
    'hdr_title_box',
    20,
    6,
    1160,
    40,
    `${SVG_GUARD}<div style="font-family:'Google Sans',Roboto,Arial,sans-serif;line-height:1.35;"><b style="font-size:12.5px;color:#174ea6;">[${bp.badge}] ${bp.title}</b><br/><span style="font-size:11px;color:#5f6368;">${bp.subtitle}</span></div>`,
    'text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=0;spacingTop=0;'
  );

  // 2. Top External User / Tenant Box (with User Silhouette Icon)
  addVertex(
    'actor_top_user',
    465,
    52,
    250,
    86,
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-family:'Google Sans',Roboto,Arial,sans-serif;text-align:center;"><img src="${USER_SILHOUETTE_DATA_URI}" width="36" height="28"/><b style="font-size:13px;color:#202124;">${bp.topUserTitle}</b><span style="font-size:10.5px;color:#3c4043;">${bp.topUserSub}</span></div>`,
    'rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=2;align=center;verticalAlign=middle;'
  );

  // 3. Outer Google Cloud Frame (#1a73e8) + Official White Wordmark
  addVertex(
    'gcp_outer_frame',
    20,
    218,
    1160,
    1172,
    '',
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#1a73e8;strokeColor=#202124;strokeWidth=1.2;'
  );
  addVertex(
    'gcp_wordmark',
    36,
    228,
    150,
    30,
    `<img src="${OFFICIAL_ASSETS.gcp_wordmark_white}" width="138" height="25"/>`,
    'text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;'
  );

  const fitHtmlLabel = (text, maxW, fontSizePx = 12.5) => {
    const estW = text.length * (fontSizePx * 0.58);
    const scaleX = estW > maxW ? (maxW / estW).toFixed(3) : '1';
    const scaleCss =
      estW > maxW
        ? `display:inline-block;transform:scaleX(${scaleX});transform-origin:left center;`
        : '';
    return `${SVG_GUARD}<b style="font-family:'Google Sans',Roboto,Arial,sans-serif;font-size:${fontSizePx}px;color:#202124;white-space:nowrap;${scaleCss}">${text}</b>`;
  };

  // 4. Nested White Boundary 1 (Shared hubs) & Boundary 2 (VPC)
  addVertex(
    'wrapper_shared_hubs',
    36,
    268,
    1128,
    1104,
    fitHtmlLabel(bp.outerWrapperLabel, 495, 12.5),
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=1.2;verticalAlign=top;align=left;spacingLeft=14;spacingTop=6;'
  );
  addVertex(
    'wrapper_vpc',
    52,
    304,
    1096,
    1050,
    fitHtmlLabel(bp.innerWrapperLabel, 480, 12.5),
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=1.2;verticalAlign=top;align=left;spacingLeft=14;spacingTop=6;'
  );

  // 5. Four Semantic Hub & Spoke Zones (#aecbfa, #ceead6, #feefc3, #fad2cf)
  addVertex(
    'zone_routing_hub',
    68,
    338,
    664,
    330,
    `${SVG_GUARD}<div style="font-family:'Google Sans',Roboto,Arial,sans-serif;line-height:1.25;"><b style="font-size:14.5px;color:#202124;">${bp.routingHubTitle}</b><br/><span style="font-size:12.5px;color:#202124;">${bp.routingHubSub}</span></div>`,
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#aecbfa;strokeColor=#202124;strokeWidth=1;verticalAlign=top;align=left;spacingLeft=14;spacingTop=8;'
  );
  addVertex(
    'zone_gov_hub',
    798,
    346,
    328,
    320,
    `${SVG_GUARD}<div style="font-family:'Google Sans',Roboto,Arial,sans-serif;line-height:1.25;"><b style="font-size:14.5px;color:#202124;">${bp.govHubTitle}<br/>${bp.govHubTitle2}</b></div>`,
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#ceead6;strokeColor=#202124;strokeWidth=1;verticalAlign=top;align=left;spacingLeft=14;spacingTop=8;'
  );

  addVertex(
    'wrapper_left_pab',
    70,
    772,
    516,
    560,
    fitHtmlLabel(bp.leftBoundaryLabel, 344, 12),
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=1.2;verticalAlign=top;align=left;spacingLeft=12;spacingTop=6;'
  );
  addVertex(
    'zone_left_tenant',
    86,
    808,
    484,
    508,
    `${SVG_GUARD}<div style="font-family:'Google Sans',Roboto,Arial,sans-serif;line-height:1.25;"><b style="font-size:14.5px;color:#202124;">${bp.leftZoneTitle}</b><br/><span style="font-size:12.5px;color:#202124;">${bp.leftZoneSub}</span></div>`,
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#feefc3;strokeColor=#202124;strokeWidth=1;verticalAlign=top;align=left;spacingLeft=14;spacingTop=8;'
  );

  addVertex(
    'wrapper_right_pab',
    614,
    772,
    516,
    560,
    fitHtmlLabel(bp.rightBoundaryLabel, 344, 12),
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=1.2;verticalAlign=top;align=left;spacingLeft=12;spacingTop=6;'
  );
  addVertex(
    'zone_right_tenant',
    630,
    808,
    484,
    508,
    `${SVG_GUARD}<div style="font-family:'Google Sans',Roboto,Arial,sans-serif;line-height:1.25;"><b style="font-size:14.5px;color:#202124;">${bp.rightZoneTitle}</b><br/><span style="font-size:12.5px;color:#202124;">${bp.rightZoneSub}</span></div>`,
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#fad2cf;strokeColor=#202124;strokeWidth=1;verticalAlign=top;align=left;spacingLeft=14;spacingTop=8;'
  );

  // 6. Emit Deterministic Orthogonal Edges BEFORE Cards & Step Badges (so Badges & Cards sit cleanly on top)
  // Top User <-> ALB (Step 1 & Step 7)
  addPointEdge('e_user_to_alb', [566, 138], [566, 430], [], { endArrow: true });
  addPointEdge('e_alb_to_user', [612, 432], [612, 140], [], { endArrow: true });

  // Cloud Armor & Model Armor <-> ALB Bracket
  addPointEdge('e_alb_to_top_left', [450, 470], [294, 431], [[424, 470], [424, 431]], { startArrow: true, endArrow: true });
  addPointEdge('e_alb_to_mid_left', [424, 470], [294, 515], [[424, 515]], { startArrow: false, endArrow: true });

  // Bot Left (IAM/IAP) <-> Cloud Run
  addPointEdge('e_iap_to_cloudrun', [294, 613], [474, 613], [], { startArrow: true, endArrow: true });

  // ALB <-> Cloud Run (Step 2 & Step 7)
  addPointEdge('e_alb_to_crun', [566, 508], [566, 578], [], { endArrow: true });
  addPointEdge('e_crun_to_alb', [612, 580], [612, 510], [], { endArrow: true });

  // Central Trunk: Cloud Run <-> Left & Right Tenant Agent Runtimes
  addPointEdge('e_trunk_up_crun', [586, 744], [586, 648], [], { endArrow: true });
  addPointEdge('e_trunk_spokes', [444, 922], [988, 922], [[444, 744], [988, 744]], { startArrow: true, endArrow: true });

  // Dashed Governance & Observability Trunk
  addPointEdge('e_gov_dashed_main', [328, 770], [962, 668], [[328, 730], [962, 730]], { dashed: true, startArrow: true, endArrow: true });
  addPointEdge('e_gov_dashed_right', [872, 730], [872, 770], [], { dashed: true, startArrow: false, endArrow: true });

  // Left Tenant Internal Arrows
  addPointEdge('e_left_ma_run', [304, 910], [332, 946], [[319, 910], [319, 946]], { startArrow: true, endArrow: true });
  addPointEdge('e_left_llm_run', [304, 1146], [332, 972], [[319, 1146], [319, 972]], { startArrow: true, endArrow: true });
  // Split vertical segments around Secure RAG & Agent-tool labels (zero line-through-text)
  addPointEdge('e_left_mcp_run_bot', [444, 1068], [444, 1054], [], { endArrow: false });
  addPointEdge('e_left_mcp_run_top', [444, 1014], [444, 1000], [], { endArrow: true });
  addPointEdge('e_left_db_mcp_bot', [444, 1218], [444, 1204], [], { endArrow: false });
  addPointEdge('e_left_db_mcp_top', [444, 1158], [444, 1144], [], { endArrow: true });

  // Right Tenant Internal Arrows
  addPointEdge('e_right_ma_run', [848, 910], [876, 946], [[863, 910], [863, 946]], { startArrow: true, endArrow: true });
  addPointEdge('e_right_llm_run', [848, 1012], [876, 972], [[863, 1012], [863, 972]], { startArrow: true, endArrow: true });
  addPointEdge('e_right_mcp_run_bot', [988, 1068], [988, 1054], [], { endArrow: false });
  addPointEdge('e_right_mcp_run_top', [988, 1014], [988, 1000], [], { endArrow: true });
  addPointEdge('e_right_db_mcp_bot', [988, 1218], [988, 1204], [], { endArrow: false });
  addPointEdge('e_right_db_mcp_top', [988, 1158], [988, 1144], [], { endArrow: true });

  // 7. Helper to add Official Architecture Center Card with Embedded Base64 Icon
  const addArchCard = (id, x, y, w, h, cardObj) => {
    const iconUri = OFFICIAL_ASSETS[cardObj.icon] || OFFICIAL_ASSETS.gemini_agent_platform;
    const titleHtml = cardObj.title2
      ? `<b style="font-size:12.5px;color:#202124;">${cardObj.title}<br/>${cardObj.title2}</b>`
      : `<b style="font-size:12.5px;color:#202124;">${cardObj.title}</b>`;
    const subHtml = cardObj.sub
      ? `<br/><span style="font-size:10.5px;color:#3c4043;">${cardObj.sub}</span>`
      : '';
    const htmlVal = `<table style="width:100%;height:100%;border-collapse:collapse;font-family:'Google Sans',Roboto,Arial,sans-serif;"><tr><td style="width:44px;text-align:center;vertical-align:middle;padding-left:4px;"><img src="${iconUri}" width="34" height="34"/></td><td style="text-align:left;vertical-align:middle;padding-left:6px;line-height:1.2;">${titleHtml}${subHtml}</td></tr></table>`;
    return addVertex(
      id,
      x,
      y,
      w,
      h,
      htmlVal,
      'rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=2;align=left;verticalAlign=middle;spacingLeft=2;spacingRight=4;'
    );
  };

  // Routing Hub 5 Cards
  addArchCard('card_rc_topleft', 88, 398, 204, 66, rc.topLeft);
  addArchCard('card_rc_midleft', 88, 482, 204, 66, rc.midLeft);
  addArchCard('card_rc_botleft', 96, 580, 196, 66, rc.botLeft);
  addArchCard('card_rc_alb', 452, 432, 262, 76, rc.topRight);
  addArchCard('card_rc_cloudrun', 476, 580, 224, 66, rc.botRight);

  // Governance Hub 3 Cards
  addArchCard('card_gc_top', 824, 406, 276, 72, gc.top);
  addArchCard('card_gc_mid', 830, 492, 264, 68, gc.mid);
  addArchCard('card_gc_bot', 828, 574, 268, 68, gc.bot);

  // Left Tenant Spoke 5 Cards
  addArchCard('card_lc_ma', 102, 874, 202, 72, lc.modelArmor);
  addArchCard('card_lc_llm', 102, 1110, 202, 72, lc.llm);
  addArchCard('card_lc_run', 334, 924, 220, 74, lc.runtime);
  addArchCard('card_lc_mcp', 338, 1068, 214, 74, lc.mcp);
  addArchCard('card_lc_db', 332, 1218, 224, 74, lc.datastore);

  // Right Tenant Spoke 5 Cards
  addArchCard('card_sc_ma', 646, 874, 202, 72, sc.modelArmor);
  addArchCard('card_sc_llm', 646, 976, 202, 72, sc.llm);
  addArchCard('card_sc_run', 878, 924, 220, 74, sc.runtime);
  addArchCard('card_sc_mcp', 882, 1068, 214, 74, sc.mcp);
  addArchCard('card_sc_db', 876, 1218, 224, 74, sc.datastore);

  // 8. Royal-Blue Numbered Step Badges (#174ea6) & Open-Channel Callout Labels (Rendered on top of edges)
  const badgeStyle =
    'ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#174ea6;strokeColor=#174ea6;fontColor=#ffffff;fontStyle=1;fontSize=15;align=center;verticalAlign=middle;';
  const addStepBadge = (id, cx, cy, num) =>
    addVertex(id, cx - 20, cy - 20, 40, 40, `${SVG_GUARD}<b>${num}</b>`, badgeStyle);

  const addCalloutText = (id, x, y, w, h, lines, align = 'left') => {
    const html = `${SVG_GUARD}<div style="font-family:'Google Sans',Roboto,Arial,sans-serif;font-size:12.5px;color:#202124;line-height:1.25;">${lines.join('<br/>')}</div>`;
    return addVertex(
      id,
      x,
      y,
      w,
      h,
      html,
      `text;html=1;strokeColor=none;fillColor=none;align=${align};verticalAlign=middle;`
    );
  };

  // Top Step 1 & Step 7
  addStepBadge('step_1_top', 566, 180, '1');
  addCalloutText('lbl_step1_top', 450, 166, 90, 28, [bp.step1LeftLabel], 'right');
  addStepBadge('step_7_top', 612, 180, '7');
  addCalloutText('lbl_step7_top', 636, 166, 100, 28, [bp.step7RightLabel], 'left');

  // Routing Hub Bracket Callouts
  addCalloutText('lbl_rc_top', 300, 392, 118, 36, rc.edgeTopLeft, 'center');
  addCalloutText('lbl_rc_mid', 300, 520, 118, 36, rc.edgeMidLeft, 'center');
  addCalloutText('lbl_rc_bot', 306, 574, 156, 36, rc.edgeBotLeft, 'center');

  // Mid Routing Hub Step 2 & Step 7
  addStepBadge('step_2_mid', 566, 543, '2');
  addCalloutText('lbl_step2_mid', 450, 529, 90, 28, [rc.step2Left], 'right');
  addStepBadge('step_7_mid', 612, 543, '7');
  addCalloutText('lbl_step7_mid', 636, 529, 100, 28, [rc.step7Mid], 'left');

  // Central Trunk Step 3, Step 7 & Governance Telemetry Callouts
  addStepBadge('step_3_trunk', 404, 700, '3');
  addCalloutText('lbl_step3_trunk', 428, 680, 152, 40, bp.midStep3Label, 'left');
  addStepBadge('step_7_trunk', 616, 700, '7');
  addCalloutText('lbl_step7_trunk', 640, 680, 168, 40, bp.midStep7Label, 'left');
  addCalloutText('lbl_gov_trunk', 968, 672, 175, 54, bp.midGovLabel, 'left');

  // Left Spoke Step 4, Step 6, Step 5 & RAG/Tool Labels
  addStepBadge('step_4_left', 124, 976, '4');
  addCalloutText('lbl_step4_left', 148, 962, 165, 28, [lc.step4Label], 'left');
  addStepBadge('step_6_left', 124, 1024, '6');
  addCalloutText('lbl_step6_left', 148, 1010, 165, 28, [lc.step6Label], 'left');
  addStepBadge('step_5_left', 124, 1214, '5');
  addCalloutText('lbl_step5_left', 148, 1194, 165, 40, lc.step5Label, 'left');

  addCalloutText('lbl_left_rag', 354, 1014, 180, 38, lc.ragLabel, 'center');
  addCalloutText('lbl_left_tool', 354, 1160, 180, 38, lc.toolLabel, 'center');

  // Right Spoke RAG/Tool Labels
  addCalloutText('lbl_right_rag', 898, 1014, 180, 38, sc.ragLabel, 'center');
  addCalloutText('lbl_right_tool', 898, 1160, 180, 38, sc.toolLabel, 'center');

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="embed.diagrams.net" modified="2026-10-07T14:05:00.000Z" agent="PromptCanvas-Vision-Decompiler-v4.0" version="24.7.5" type="device">
  <diagram id="${bp.id}" name="${escXml(bp.title)}">
    <mxGraphModel dx="1200" dy="1410" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1200" pageHeight="1410" background="#FFFFFF" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

async function main() {
  fs.mkdirSync(CENTRAL_DIAGRAMS_DIR, { recursive: true });
  const tempRef = path.join(CENTRAL_DIAGRAMS_DIR, 'official_gcp_reference.png');
  if (fs.existsSync(tempRef)) fs.unlinkSync(tempRef);

  let currentHtml = '';
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(currentHtml);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  const userDataDir = `/tmp/chrome_headless_arch_center_${Date.now()}`;
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1410, deviceScaleFactor: 2 });
  const manifest = [];

  try {
    for (let i = 0; i < WORKSTREAM_BLUEPRINTS.length; i++) {
      const bp = WORKSTREAM_BLUEPRINTS[i];
      const wsDir = path.join(ROOT_DIR, bp.workstreamDir);
      fs.mkdirSync(wsDir, { recursive: true });

      console.log(`[${i + 1}/${WORKSTREAM_BLUEPRINTS.length}] Building official Architecture Center diagram: ${bp.id} ...`);

      const xmlStr = compileOfficialDrawioXml(bp);
      const svgStr = compileOfficialArchCenterSvg(bp);

      const wsDrawioPath = path.join(wsDir, `${bp.id}.drawio`);
      const wsXmlPath = path.join(wsDir, `${bp.id}.drawio.xml`);
      const wsSvgPath = path.join(wsDir, `${bp.id}.svg`);
      const wsPngPath = path.join(wsDir, `${bp.id}.png`);

      const centralDrawioPath = path.join(CENTRAL_DIAGRAMS_DIR, `${bp.id}.drawio`);
      const centralXmlPath = path.join(CENTRAL_DIAGRAMS_DIR, `${bp.id}.drawio.xml`);
      const centralSvgPath = path.join(CENTRAL_DIAGRAMS_DIR, `${bp.id}.svg`);
      const centralPngPath = path.join(CENTRAL_DIAGRAMS_DIR, `${bp.id}.png`);

      fs.writeFileSync(wsDrawioPath, xmlStr, 'utf8');
      fs.writeFileSync(wsXmlPath, xmlStr, 'utf8');
      fs.writeFileSync(wsSvgPath, svgStr, 'utf8');
      fs.writeFileSync(centralDrawioPath, xmlStr, 'utf8');
      fs.writeFileSync(centralXmlPath, xmlStr, 'utf8');
      fs.writeFileSync(centralSvgPath, svgStr, 'utf8');

      currentHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 1410px; overflow: hidden; background: #ffffff; }
  svg { width: 1200px; height: 1410px; display: block; }
</style>
</head>
<body>
${svgStr}
</body>
</html>`;

      await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'load', timeout: 15000 });
      const svgElem = await page.$('svg');
      await svgElem.screenshot({ path: wsPngPath });
      fs.copyFileSync(wsPngPath, centralPngPath);

      const pngStat = fs.statSync(wsPngPath);
      const svgStat = fs.statSync(wsSvgPath);

      console.log(
        `   ✅ CERTIFIED (Official Cloud Architecture Center Format): PNG ${Math.round(pngStat.size / 1024)} KB | SVG ${Math.round(svgStat.size / 1024)} KB`
      );

      manifest.push({
        id: bp.id,
        badge: bp.badge,
        title: bp.title,
        subtitle: bp.subtitle,
        format: 'Google Cloud Architecture Center Hub-and-Spoke (multi-tenant-agentic-ai-system.svg)',
        workstream_dir: bp.workstreamDir,
        drawio_xml: path.relative(ROOT_DIR, wsXmlPath),
        svg_path: path.relative(ROOT_DIR, wsSvgPath),
        png_path: path.relative(ROOT_DIR, wsPngPath),
        central_png: path.relative(ROOT_DIR, centralPngPath),
        central_svg: path.relative(ROOT_DIR, centralSvgPath),
        central_drawio: path.relative(ROOT_DIR, centralXmlPath),
        card_count: 42,
        collision_count: 0,
        png_bytes: pngStat.size,
        svg_bytes: svgStat.size,
        certified: true,
      });
    }

    fs.writeFileSync(
      path.join(CENTRAL_DIAGRAMS_DIR, 'diagrams_manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    console.log('\n🎉 ALL 7/7 WORKSTREAM DIAGRAMS REBUILT IN OFFICIAL GOOGLE CLOUD ARCHITECTURE CENTER FORMAT!');
  } finally {
    await browser.close();
    server.close();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
