# Workstream 2.8: Workshop Deck — High-Density Pooled Multi-Tenant Agentic AI (Pattern A)

> **Presentation Format**: 12-Slide Executive & Technical Workshop Deck (90-Min Session)  
> **Milestone**: Milestone 1 • Week 4 Release

---

## Slide 1: Title Slide
* **Title**: High-Density Pooled Multi-Tenant Agentic AI on Gemini Enterprise Agent Platform
* **Subtitle**: Serving Competing Enterprise Customers from a Shared Runtime with Zero Cross-Tenant Bleed & 90% COGS Savings
* **Speaker Notes**: Welcome to the Pattern A (Pooled Architecture) technical workshop. Today we'll examine how B2B SaaS providers can run shared and private autonomous AI agents at high tenant density without sacrificing security or gross margins.

## Slide 2: The B2B SaaS Agent Economics Problem
* **Key Visual**: Unit COGS vs. Tenant Isolation Trade-off Curve
* **Bullets**:
  * Provisioning 1 GCP Project per $500/mo SaaS customer breaks cloud quotas and engineering velocity.
  * Yet sharing a naive agent runtime risks cross-tenant tool discovery, prompt cache bleed, and noisy-neighbor outages.
  * **Goal**: Achieve physical-grade logical & cryptographic isolation inside a single pooled runtime.

## Slide 3: Anchor Case Study — The "Cymbal" SaaS Scenario
* **Columns**:
  * **Platform Operator (Cymbal)**: Publishes Shared Incident Diagnostic Agent (Gemini 2.5 Pro + `ContextCacheConfig` 90% COGS savings) + 2LO Core Telemetry API.
  * **Tenant Alpha (FinVault Bank • Enterprise)**: Google Workspace + Jira stack, 8,000 thinking budget, builds private `Agent Alpha` (Claude 3.7 Sonnet on Model Garden), CMEK memory.
  * **Tenant Beta (RetailStream Corp • Standard)**: 100% Microsoft Entra ID + SharePoint/ServiceNow stack, 4,000 thinking cap, Redis bulkhead, inline 3LO OAuth consent.

## Slide 4: Why Legacy Multi-Tenancy Breaks in Agentic AI
* **4 Failure Modes**:
  1. Dynamic MCP Tool Discovery Mid-Turn
  2. Confused Deputy Ambient Credentials
  3. Shared Context Cache Bleed
  4. Noisy Neighbor Runaway Loops

## Slide 5: Overview of the 5-Hop Cryptographic Context Chain
* **Diagram**: `Hop 1 (Edge PEP)` $\rightarrow$ `Hop 2 (Registry PDP)` $\rightarrow$ `Hop 3 (Compute & FinOps)` $\rightarrow$ `Hop 4 (Model Armor DLP)` $\rightarrow$ `Hop 5 (AlloyDB RLS & 2LO/3LO Auth Manager)`

## Slide 6: Deep Dive — Hop 1 (Cloud Armor, IAP, RFC 8693 OBO & DPoP)
* **Key Controls**:
  * Strip forged `X-Tenant-ID` headers at network ingress.
  * Validate Google OIDC (`finvault.com`) & Microsoft Entra ID (`retailstream`) JWTs.
  * Mint sender-constrained RFC 8693 OBO tokens bound to RFC 9449 DPoP thumbprints (`jkt`).

## Slide 7: Deep Dive — Hop 2 (GEAP Registry PDP & ADK `before_agent_callback`)
* **Key Controls**:
  * Catalog visibility labels hide FinVault's `Agent Alpha` from RetailStream (`403 Forbidden` on direct URI call).
  * ADK `before_agent_callback` deterministically prunes unauthorized MCP connectors before model invocation.

## Slide 8: Deep Dive — Hop 3 (Compute Sandbox, Memory Bank & FinOps Bulkheads)
* **Key Controls**:
  * gVisor sandbox + immutable `temp:tenant_id`.
  * `ContextCacheConfig` (`READ_ONLY_IMMUTABLE_PREFIX`) saves 90% on shared system prompt tokens.
  * Memorystore for Redis enforces `4,000` vs `8,000` thinking-token caps and RPM rate bulkheads.

## Slide 9: Deep Dive — Hop 4 (Vertex AI Model Armor & Semantic NLCs)
* **Key Controls**:
  * Ingress prompt-injection & cache-extraction screening.
  * Egress Sensitive Data Protection (SDP) with per-tenant detectors (`US_BANK_ACCOUNT_NUMBER`/`SWIFT` vs `CREDIT_CARD_NUMBER`).

## Slide 10: Deep Dive — Hop 5 (AlloyDB RLS, Inline 3LO Consent & BigQuery OTel)
* **Key Controls**:
  * `SET LOCAL app.current_tenant = '<tenant_id>'` enforces PostgreSQL Row-Level Security on every transaction.
  * Auth Manager brokers 2LO Implicit & 3LO OIDC/Entra ID with interactive mid-session consent challenges.
  * BigQuery OpenTelemetry sink tracks per-tenant token usage for FinOps chargeback.

## Slide 11: Live Red-Team Demo — 4 Breach Simulations in 5 Minutes
* **Demo Flow**: Run `run_breach_simulations.py` and verify all 8 security assertions pass.

## Slide 12: When to Graduate from Pattern A (Pooled) to Pattern B (Siloed) or Pattern C (Hybrid)
* **Decision Criteria**: When a regulated customer mandates dedicated VPC-SC perimeters, physical project separation, customer-revocable CMEK kill-switches, or air-gapped Gemma 3 on GKE.
