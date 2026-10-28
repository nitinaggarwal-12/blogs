// Spoken Customer Talk-Track Catalog (Executive, Business & Technical Audience)
// Provides verbatim first-person spoken presenter talk tracks for every slide across:
//   - WS1..WS5 (12 slides each = 60 slides)
//   - ALL Master Program Deck (25 slides)
//   - DOC-REF-07..09 Reference Architecture Decks (6 slides each = 18 slides)
// Every slide's speaker note contains ONLY what the presenter speaks out loud to a
// mixed room of executive, business, and technical customer stakeholders—naturally
// connecting from the previous slide, explaining the current slide in plain English,
// and leading into the next slide with zero "Why / What" headings or stage directions.

export const WORKSTREAM_THEMES = {
  WS1: {
    name: 'Workstream 1 (Foundation & Reference Taxonomy)',
    slide1Spoken:
      'In this session, we are walking through our foundational reference architecture for running multi-tenant AI agents on Google Cloud. Right upfront, we define our three core building blocks using operating-system primitives—Google’s Agent Development Kit (ADK) as our OS syscall scheduler, the Model Context Protocol (MCP) as our POSIX tool driver ABI, and Agent Registry and Discovery (ARD) as our chrooted virtual filesystem catalog—and show how we solve the SaaS AI Architect’s Dilemma: avoiding the margin erosion of spinning up dedicated cloud projects for every small customer while preventing tool-schema data leaks and noisy-neighbor rate starvation in a shared pool.',
    slide2Spoken:
      'This Table of Contents maps our streamlined eleven-slide deck directly to the five-part engineering blog series and follows a strict macro-to-micro hierarchy. Part 1 covers the SaaS AI Architect’s Dilemma and isolation topologies across Slides 1 through 4. Part 2 establishes the five-hop cryptographic pipeline from L1 Logical Security Layers on Slide 5 to L2 Physical Network Perimeters on Slide 6 and L4 Wire Packet transformation on Slide 8. Part 3 on Slide 7 merges our L3 chronological UML sequence with fail-closed circuit breakers, sub-five-second Valkey L1 cache eviction, and single-flight recovery. Part 4 on Slide 9 documents our five EAP product gap controls, and Part 5 across Slides 10 and 11 pairs live Google Cloud Console proof with our merged Well-Architected SLA scorecard and runnable GitHub milestones.',
    slide3Spoken:
      'Here you can see that SaaS AI tension illustrated through two competing tenant personas on our Cymbal platform. On one side, FinVault Bank is a regulated financial institution at six hundred requests per minute that requires customer-controlled encryption keys and chooses between Managed Vertex AI Dedicated Provisioned Throughput for zero-ops Gemini 2.5 Pro capacity or self-managed, air-gapped Gemma 3 27B on Private GKE with zero internet egress. On the other side, RetailStream Corp runs on Microsoft Entra ID and ServiceNow at one hundred twenty requests per minute, where we isolate per-user Three-Legged OAuth tokens inside tenant-and-user DPoP-bound vaults to eliminate the Confused Deputy vulnerability across pooled workers.',
    slide4Spoken:
      'To serve both ends of that customer spectrum, this twelve-dimension matrix compares Pattern A, our High-Density Shared Pool; Pattern B, our Zero-Trust Sovereign Silos; and Pattern C, our Dynamic Hybrid Bridge. Notice the operational fleet-scale trade-off in the table: managing five hundred enterprise customers in Pattern B means maintaining five hundred separate VPC Service Controls perimeters, KMS keys, and AlloyDB instances—which is why Pattern C hosts nine hundred fifty standard tenants in the shared pool and reserves fifty Private Service Connect spokes for regulated contracts. Also note our kill-switch distinction: while Google Cloud KMS key state propagation can take up to sixty seconds across storage, Hop 3 runs a targeted Valkey SCAN and UNLINK of the tenant’s cache prefix in under five seconds to enforce our HTTP 423 lock SLA.',
    slide5Spoken:
      'Before we inspect individual cloud services, this Level 1 diagram organizes our entire architecture into three logical security layers from left to right—preventing any terminology clash with the four physical VPC-SC network perimeters on the next slide. Layer 1 on the left verifies federated identity and DPoP proofs at the Cloud Armor and IAP edge. Layer 2 in the center runs our Five-Hop ADK Control Plane, where regional gRPC callouts keep Hop 4 inline Model Armor and Cloud DLP inspection to roughly twenty-two milliseconds and total five-hop control-plane overhead to about forty-two milliseconds at p95. And to prevent security drift during a five-minute STS JWT window, every hop checks a three-millisecond Valkey JTI and CMEK revocation deny-list before routing into Layer 3 on the right.',
    slide6Spoken:
      'Zooming directly from those three logical security layers into the Level 2 physical topology, Figure 1 maps our fifty-six-shape Google Cloud blueprint across four physical VPC Service Controls network perimeters. Requests enter Blue Perimeter 1 (the Routing Hub for Steps 1 through 3 and Hop 1) at the top, traverse Green Perimeter 2 (the Five-Hop Governance Hub for Hops 2 and 5) in the center, and execute inside either Yellow Perimeter 3 (the Pattern A Shared Pool Spoke for Steps 4 through 7 and Hops 3 through 5) on the left or Red Perimeter 4 (the Pattern B Sovereign Silo and Pattern C PSC Spoke) on the right—with gVisor kernel sandboxing and composite tenant-user-session keys isolating every worker.',
    slide7Spoken:
      'Now that we have the L1 logical layers and L2 physical perimeters in place, this merged Level 3 process and operational resilience slide traces both the chronological happy path across five actors and every fail-closed circuit breaker in one unified view. Steps 1 through 6 trace a live customer turn in roughly forty-two milliseconds of control-plane overhead. And in the red fail-closed frame at the bottom, spoofed headers or ~3ms JTI revocations return HTTP 401 or 403, rate bursts over 120 or 600 RPM return HTTP 429 with Retry-After jitter, and a revoked Cloud KMS key triggers an HTTP 423 lock with a sub-five-second targeted Valkey SCAN and UNLINK of cache:{tenant}:*—followed by single-flight SET NX PX 5000 lazy re-hydration from AlloyDB RLS when the key is restored.',
    slide8Spoken:
      'Zooming all the way down to Level 4, here we open up the wire packet traveling across those hops. On the left, an untrusted client attempts to inject a spoofed X-Tenant-Id header claiming to be FinVault Bank. In the center, Cloud Armor and our Hop 1 Security Token Service strip that header, verify the caller’s OIDC and DPoP proof, and mint a KMS ECDSA P-256 signed STS JWT. On the right, downstream microservices verify that asymmetric signature locally in under 0.15 milliseconds using an in-memory cached JWKS public key—achieving mathematical non-repudiation with zero per-hop KMS network calls.',
    slide9Spoken:
      'This register maps our five compensating production controls—GAP-01 through GAP-05—to the early-access platform boundaries engineering teams face today. Every custom Python, Valkey, or SQL control in core-cymbal-agent is wrapped in a feature-flagged native adapter hook (CYMBAL_NATIVE_ARD_GA, CYMBAL_NATIVE_KMS_PROBE_GA, CYMBAL_NATIVE_MEM_TTL_GA, CYMBAL_NATIVE_PSC_CUTOVER_GA, and CYMBAL_NATIVE_OTEL_FINOPS_GA) so teams can switch cleanly to native GCP primitives via configuration as they reach general availability. And in row five, our OpenTelemetry FinOps exporter streams SHA-256 prompt hashes and token counters directly into BigQuery so finance teams can run exact SQL chargeback queries across cached and thinking tokens with zero raw PII.',
    slide10Spoken:
      'To prove this architecture is running live rather than just on slides, here are authentic captures from our deployed Cloud Run revisions, Cloud Logging Explorer, and our Dual-Plane verification harness. On the Intra-Cloud plane, our 20/20 Google Cloud runtime suites verify zero cross-tenant RLS rows across HTTP 200, 403, 423, and 429 responses; on the Inter-Cloud plane, our 30/30 AWS Bedrock AgentCore MCP and 10-SaaS cross-cloud target harness passes all sixty assertions and all twelve automated forensic gates.',
    slide11Spoken:
      'Finally, our closing slide consolidates the Google Cloud Well-Architected SLA scorecard directly into our five runnable GitHub milestones and five-part blog series launch plan. Every milestone card pairs its exact repository file path with its production SLA target: under 150-microsecond cached-JWKS verification and ~3ms JTI deny-lists in Part 1; ~42ms p95 five-hop overhead, ~420ms warm TTFT, and 84.7 percent token savings in Part 2; <60s CMEK revocation, <5s Valkey SCAN+UNLINK eviction, SET NX PX 5000 recovery, and <30s cross-region failover RTO in Part 3; 74 percent portfolio TCO reduction and 0ms PSC cutover in Part 4; and 12/12 forensic plus 107/107 runtime assertions in Part 5.',
  },
  WS2: {
    name: 'Workstream 2 (Pattern A — High-Density Shared Pool)',
    slide1Spoken:
      'In this session on Workstream 2, we are diving into Pattern A—our High-Density Shared Pool architecture—to show how a SaaS provider can host hundreds of commercial customers on a single shared Google Cloud stack while keeping every customer’s data, tools, and performance strictly isolated.',
    slide2Spoken:
      'Look at the business challenge on this slide: FinVault Bank and RetailStream Corp are both using our shared Incident Diagnostic Agent at the exact same time. From a financial perspective, running one shared agent runtime and sharing a single thirty-two-thousand-token system prompt cache reduces our inference cost of goods sold by up to ninety percent. At the same time, FinVault uses Google Workspace and Jira with an eight-thousand thinking-token budget, while RetailStream uses Microsoft Entra and ServiceNow with a four-thousand token cap—and neither company can ever discover or query the other’s private tools or incident history.',
    slide3Spoken:
      'Here we compare a properly governed Five-Hop Shared Pool against two common mistakes: naive single-database multi-tenancy on one extreme, and spinning up separate cloud projects for every small commercial customer on the other. As the table and the four decision rules at the bottom highlight, Pattern A gives us the unit economics and zero-friction onboarding of a shared SaaS platform while enforcing hardware-grade logical boundaries at every layer of the stack.',
    slide4Spoken:
      'To keep the shared pool simple to reason about, this diagram divides the architecture into three logical trust zones from left to right. Zone 1 on the left handles federated login across Google OIDC and Microsoft Entra ID. Zone 2 in the center runs our Five-Hop Pooled Guardrail Engine, which scopes agent catalogs, enforces per-tenant rate limits in Memorystore Valkey, and applies shared prompt caching. Zone 3 on the right enforces Row-Level Security inside AlloyDB and BigQuery so the database engine itself refuses to return rows belonging to another company.',
    slide5Spoken:
      'Zooming into the physical Google Cloud services inside those three zones, Figure 1 maps out the complete Pattern A blueprint. In the blue Routing Hub at the top, Cloud Armor and Identity-Aware Proxy route federated traffic into our shared Cloud Run gateway. In the green Governance Hub in the center, our five-hop pipeline binds the verified tenant ID, checks Valkey token buckets, and reuses the Vertex AI shared prefix cache. At the bottom, the yellow Shared Pool Spoke executes tool calls against tenant-scoped MCP connectors and queries AlloyDB under strict Row-Level Security policies.',
    slide6Spoken:
      'Tracing a single pooled request chronologically from left to right, watch how fast and disciplined the handoffs are across our five system actors. When a user sends a prompt, Hop 1 exchanges their login token for a DPoP-bound tenant context; Hop 2 filters the agent registry so private agents belonging to other customers remain invisible; Hop 3 checks the customer’s Valkey rate bucket and attaches their private memory namespace; Hop 4 screens the prompt through Model Armor while reusing the shared system prefix cache; and Hop 5 opens an AlloyDB transaction locked to that specific tenant ID.',
    slide7Spoken:
      'Here is what happens on the wire when a malicious or compromised client tries to break out of their lane in the shared pool. On the left, a caller logged in as RetailStream injects an HTTP header claiming to be FinVault. In the center, our Hop 1 gate strips that spoofed header and cryptographically binds the session to RetailStream’s verified identity. On the right, AlloyDB sets the session variable to RetailStream before running any query—so even if a developer forgot a WHERE clause in SQL, the database kernel returns zero rows from FinVault.',
    slide8Spoken:
      'Beyond blocking spoofing, a shared pool must protect customer experience when traffic spikes or when an agent needs third-party permissions. This flow shows our automatic pooled circuit breakers in action. If one tenant launches a burst of requests that exceeds their quota, our Valkey bulkhead immediately returns a polite HTTP 429 retry timer to that tenant alone while every other customer on the shared cluster continues with sub-second response times. And when a user asks the agent to touch a protected ServiceNow or Jira tool for the first time, the pipeline pauses cleanly to trigger inline user consent rather than failing or over-permissioning a shared service account.',
    slide9Spoken:
      'To give both executive risk officers and security architects complete confidence in a shared environment, we ran ten adversarial red-team attack scenarios against Pattern A—shown across this matrix. From header spoofing and prompt-cache poisoning to cross-tenant memory reads, vector similarity bleed, and noisy-neighbor floods, every single attack vector is paired with its specific five-hop control and verified as 100% blocked by our automated test suite.',
    slide10Spoken:
      'Here are the live Dual-Plane receipts backing up that ten-out-of-ten scorecard. On the left, you can see our deployed pooled Cloud Run service and BigQuery Row-Level Security policies in Google Cloud Console; on the right, the verification cards confirm ninety percent shared prompt cache efficiency, 10/10 Intra-Cloud breach simulations blocked, and 10/10 Inter-Cloud Pattern A 10-SaaS MCP RLS assertions passed.',
    slide11Spoken:
      'Bringing Pattern A together for business and technical leaders, this shared-pool design delivers three core outcomes. Under Security, five layers of defense—ending at database kernel Row-Level Security—prevent cross-tenant leaks. Under Reliability, per-tenant Valkey bulkheads guarantee that a noisy neighbor never impacts another customer’s SLA. And under Financial Efficiency, shared prompt prefix caching and pooled compute maximize SaaS gross margins for our commercial customer base.',
    slide12Spoken:
      'You can deploy this entire Pattern A shared pool today using our six-resource Terraform starter and run all ten breach simulations in under a minute. While Pattern A is ideal for commercial SaaS tiers, what happens when a regulated bank or government agency legally requires their own dedicated cloud project and customer-held encryption kill-switch? That brings us directly to Workstream 3 and Pattern B.',
  },
  WS3: {
    name: 'Workstream 3 (Pattern B — Zero-Trust Sovereign Silos)',
    slide1Spoken:
      'In this session on Workstream 3, we move to Pattern B—our Zero-Trust Sovereign Silo architecture—designed for regulated banking, healthcare, and public-sector customers whose compliance mandates forbid sharing compute, storage, or encryption keys with any other organization.',
    slide2Spoken:
      'Here we see why regulated enterprise buyers like FinVault Bank’s Chief Information Security Officer require a sovereign deployment tier. From a business and regulatory standpoint, they need provable zero blast radius, a dedicated audit trail, and an encryption kill-switch they control directly so they can revoke our platform’s access to their data at any moment. From a technical standpoint, they also want the flexibility to run either dedicated Vertex AI Gemini endpoints or self-hosted, open-weights Gemma 3 models on private Kubernetes nodes with zero public internet egress.',
    slide3Spoken:
      'This comparison matrix evaluates our sovereign hosting options inside Pattern B—contrasting dedicated managed Vertex AI endpoints against air-gapped Gemma 3 clusters on Google Kubernetes Engine, alongside our VPC Service Controls perimeter and Cloud KMS key management choices. The four selection rules at the bottom give sales engineering and architecture teams a clear guide for matching each customer’s regulatory regime to the right sovereign blueprint.',
    slide4Spoken:
      'Look at the three concentric security rings on this slide, moving from left to right. Zone 1 at the outer edge verifies hardware-bound client certificates and Principal Access Boundary rules before a request can even approach the project. Zone 2 in the middle is a dedicated, single-tenant Google Cloud project surrounded by a VPC Service Controls digital moat that blocks unauthorized data movement. Zone 3 on the right is the encrypted data and GPU inference vault, where every byte in memory and on disk is locked by the customer’s own Cloud KMS key.',
    slide5Spoken:
      'Zooming into the physical Google Cloud blueprint in Figure 1, we see how those three rings are built in production. Requests pass through the blue Routing Hub with mutual TLS device verification, enter the green Governance Hub where Principal Access Boundaries and live Cloud KMS key-health checks are enforced, and execute inside the red Sovereign Silo Spoke at the bottom—housing dedicated AlloyDB and BigQuery instances alongside an air-gapped GKE Gemma 3 GPU pool inside a locked VPC Service Controls perimeter.',
    slide6Spoken:
      'This timeline walks through the single most important compliance test for any regulated customer: what happens chronologically across our five system actors the moment a customer security officer revokes or disables their Cloud KMS encryption key. Watch Steps 1 through 6: within seconds of the customer flipping their key switch, our background health probe detects the revocation, immediately flushes the customer’s active L1 memory cache in Valkey, terminates in-flight agent reasoning, and returns a deterministic HTTP 423 Locked status on every subsequent call.',
    slide7Spoken:
      'Looking inside the data packet on the wire during a sovereign transaction, you can see how hardware identity and encryption enforcement travel together. On the left, the incoming request must present a valid client certificate fingerprint matching its token. In the center, our gateway performs a live cryptographic ping against the customer’s Cloud KMS key before allowing any memory or database read. On the right, if that key has been revoked by the customer, the payload is rejected with an audited lock receipt and zero plaintext remains in cache.',
    slide8Spoken:
      'Here is the complete closed-loop circuit breaker and Day-2 recovery flow for Pattern B. When a customer triggers their Cloud KMS kill-switch—or when VPC Service Controls detects an anomalous egress attempt—the circuit breaker trips closed in under sixty seconds, purging volatile Valkey caches and locking AlloyDB and BigQuery reads. Just as importantly for operations teams, look at the green recovery path at the bottom: once the customer’s security team re-enables their KMS key, our SRE health probe verifies key availability and lazily re-hydrates the cache from encrypted storage with zero manual intervention.',
    slide9Spoken:
      'This six-point verification matrix summarizes every sovereign security and isolation test we run against Pattern B. Each row pairs a high-severity regulatory threat—such as cross-project credential replay, VPC Service Controls data exfiltration, or post-revocation cache lingering—with its exact perimeter control and passing automated test result.',
    slide10Spoken:
      'Here is the live Dual-Plane verification proof from our sovereign sandbox environment. On the left, you can see the active Cloud KMS customer-managed keyring, CryptoKeyVersion state toggles, and sovereign BigQuery CMEK datasets; on the right, the telemetry cards confirm that all 6/6 Intra-Cloud sovereign perimeter tests and all 10/10 Inter-Cloud Pattern B 10-SaaS MCP CMEK kill-switch assertions pass with 100% compliance.',
    slide11Spoken:
      'For our executive, business, and technical stakeholders, Pattern B delivers three uncompromising guarantees. Under Security, VPC Service Controls, Principal Access Boundaries, and customer-held KMS kill-switches provide mathematically provable sovereignty. Under Reliability, dedicated per-project quotas and optional private Gemma 3 GPU nodes eliminate external dependency risk. And under Operational Efficiency, our modular Terraform blueprint provisions an entire compliant customer silo repeatably through infrastructure as code.',
    slide12Spoken:
      'With Pattern A serving our commercial pool in Workstream 2 and Pattern B serving our regulated silos here in Workstream 3, a critical business question emerges: how do we operate both tiers behind a single product front door, and how do we upgrade a fast-growing customer from the Shared Pool into a Sovereign Silo without taking them offline? That is exactly what we solve next in Workstream 4 with Pattern C.',
  },
  WS4: {
    name: 'Workstream 4 (Pattern C — Dynamic Hybrid & Zero-Downtime Tier Upgrade)',
    slide1Spoken:
      'In this session on Workstream 4, we explore Pattern C—our Dynamic Hybrid Hub-and-Spoke architecture—which combines the cost-efficiency of Pattern A’s shared pool with the regulatory isolation of Pattern B’s sovereign silos behind one unified SaaS front door, complete with zero-downtime live tier upgrades.',
    slide2Spoken:
      'Think about the customer lifecycle every successful SaaS business experiences, shown here on this slide. A company like RetailStream signs up on Monday as a standard commercial customer in our Shared Pool because they want instant onboarding and low cost. Six months later, they expand their contract to an enterprise regulated tier and need their own dedicated sovereign spoke. Business leaders cannot ask that customer to change their URL, re-authenticate their users, or accept a weekend maintenance outage—and technical leaders need a way to route both pooled and siloed tenants seamlessly from a single control plane.',
    slide3Spoken:
      'To connect a central SaaS routing hub to dozens of dedicated customer spokes without network headaches, this matrix compares Private Service Connect against legacy VPC peering, VPNs, and manual export-import migrations. As the table and our four selection rules at the bottom illustrate, Private Service Connect gives us a one-way, private network bridge that uses a tiny `/28` NAT subnet, eliminates IP address overlap across customers, and prevents any spoke from ever initiating a connection back into our central hub.',
    slide4Spoken:
      'Looking at the three logical zones from left to right, you can see how Pattern C unifies the platform. Zone 1 on the left is our single SaaS Front Door and Tier-Aware Routing Hub, where every customer logs in through the exact same URL. Zone 2 in the center is our one-way Private Service Connect network bridge and Live Tier Migration Engine. Zone 3 on the right holds both destinations side-by-side: the shared Pattern A pool for standard tenants and dedicated Pattern B sovereign spokes for enterprise tenants.',
    slide5Spoken:
      'Zooming into Figure 1, here is the full Google Cloud physical blueprint for Pattern C. When a request enters the blue Routing Hub at the top and passes through the green Five-Hop Governance Hub in the center, our router checks the tenant’s live tier pointer. Standard tenants are dispatched locally to the yellow Shared Pool Spoke on the bottom left, while Enterprise tenants—or newly upgraded tenants—are routed across a Private Service Connect service attachment directly into their red Dedicated Sovereign Spoke on the bottom right.',
    slide6Spoken:
      'How do we move a live customer from the yellow Shared Pool to a red Sovereign Spoke while their employees are actively chatting with the AI agent? This chronological timeline shows our four-stage zero-downtime upgrade choreography across five actors. First, during Shadow Sync, we copy their historical AlloyDB rows and memory namespaces into the new spoke in the background while live traffic keeps running in the pool. Second, our verifier checks 100% row-count and cryptographic hash parity. Third, we execute an Atomic Cutover that flips their routing pointer in zero milliseconds between turns. Fourth, we drain in-flight requests and retire the old pooled rows.',
    slide7Spoken:
      'Here you can see that zero-millisecond atomic cutover happening inside the actual routing packet on the wire. On the left, Turn N of a customer’s conversation arrives while they are still on the Standard tier, routing to the shared pool. In the center, the background parity check completes and atomically updates the tenant’s routing metadata to Enterprise. On the right, Turn N+1 of the very same conversation arrives two seconds later and transparently routes across the Private Service Connect endpoint into their new CMEK-encrypted sovereign spoke—without dropping a single word of context.',
    slide8Spoken:
      'Because enterprise data migrations must never put customer availability at risk, this diagram shows the automatic safety circuit breakers governing the upgrade state machine. If the background Shadow Sync detects even a single mismatched record hash, if the target spoke’s Cloud KMS key is unhealthy, or if Private Service Connect latency exceeds our threshold before cutover, the circuit breaker automatically aborts the promotion and keeps the customer running safely in the shared pool with zero downtime and zero data loss.',
    slide9Spoken:
      'This four-point verification matrix summarizes our automated tests for Pattern C—proving that Private Service Connect blocks reverse spoke-to-hub network probing, that `/28` NAT subnets prevent IP exhaustion across tenants, that atomic pointer cutover drops zero active sessions, and that upgrading one tenant never mutates or disturbs any other tenant’s profile.',
    slide10Spoken:
      'Here are the live Dual-Plane receipts from our hybrid environment. On the left, you can see our provisioned Private Service Connect NAT subnet and Vertex AI Agent Engine endpoints in Google Cloud Console; on the right, the runtime telemetry cards verify 4/4 Intra-Cloud zero-downtime tier upgrades plus 10/10 Inter-Cloud Pattern C Hybrid PSC 10-SaaS MCP cutovers with 100% memory parity and zero dropped requests.',
    slide11Spoken:
      'Summarizing Pattern C for our executive, business, and engineering leaders, this hybrid architecture delivers three powerful advantages. Under Security, one-way Private Service Connect tunnels guarantee that a compromised spoke can never traverse backward into the central hub. Under Reliability, our shadow-sync state machine with instant rollback makes customer tier upgrades completely risk-free. And under Business Agility, customers can start small in the shared pool and expand into a dedicated enterprise vault whenever their business is ready.',
    slide12Spoken:
      'Everything needed to deploy this dual-project Hub-and-Spoke topology is included in our Pattern C Terraform blueprint and four-test simulation suite. Now that we have seen Pattern A (Shared Pool), Pattern B (Sovereign Silos), and Pattern C (Hybrid Bridge) in action, our final session—Workstream 5—brings the entire series together into an executive decision guide and shows how we maintain eighty percent shared application code across all three patterns.',
  },
  WS5: {
    name: 'Workstream 5 (Capstone — Executive Decision Guide & Multi-Tenant Agentic Triad)',
    slide1Spoken:
      'Welcome to Workstream 5, the capstone session of our multi-tenant agentic AI series. Here we bring Patterns A, B, and C together into a practical executive decision framework and show how your engineering team can support all three deployment models while maintaining a single, unified codebase.',
    slide2Spoken:
      'Look at the portfolio view on this slide: as an enterprise AI platform scales, you are no longer choosing just one pattern—you are running a portfolio. You have hundreds of commercial accounts running profitably in Pattern A’s shared pool, regulated financial and healthcare accounts isolated in Pattern B’s sovereign vaults, and growing mid-market accounts graduating through Pattern C’s hybrid bridge. The business imperative is serving all of them without tripling your engineering headcount or splitting your product into incompatible forks.',
    slide3Spoken:
      'This master decision matrix is the single reference chart for your leadership, sales engineering, and architecture teams. Across twelve critical dimensions—from blast radius, encryption control, and regulatory posture to unit economics, onboarding speed, and live tier mobility—it compares Pattern A, Pattern B, and Pattern C side-by-side, paired with the four deterministic rules at the bottom for picking the right topology for every customer contract.',
    slide4Spoken:
      'How do we support three distinct infrastructure topologies without maintaining three separate software products? This diagram illustrates our 80/20 code-reuse architecture across three logical zones. Eighty percent of our platform—shown across Zone 1 and Zone 2, including the entire five-hop identity, registry, memory, guardrail, and ADK agent reasoning engine—is 100% identical Python code. Only the bottom twenty percent infrastructure adapter in Zone 3 swaps between shared AlloyDB Row-Level Security, dedicated sovereign CMEK silos, or Private Service Connect endpoints via environment configuration.',
    slide5Spoken:
      'Zooming into Figure 1, our capstone Google Cloud physical blueprint unites two core innovations in one view. On the left and center, you see our two-question topology decision router and five-hop governance hub. On the right, inside the execution spokes, you see what we call the Multi-Tenant Agentic Triad: combining Shared Platform Agents built by your core team, Private Tenant-Only Agents provisioned by enterprise customers like FinVault, and Dynamic Cloud Storage Skills that inject custom domain runbooks at runtime without redeploying containers.',
    slide6Spoken:
      'Following a customer request chronologically across this five-actor sequence shows how the Agentic Triad and our five-hop guardrails work in harmony. At Hop 1 and Hop 2, the platform verifies the caller’s identity and dynamically filters the agent catalog so FinVault sees both the shared diagnostic agent and its private regulatory agent, while RetailStream sees only the shared agent. At Hop 3, the runtime loads tenant-specific skills from Cloud Storage and locks into the five-level memory hierarchy. At Hop 4, active natural-language compliance rules block any prompt that violates company policy before the model or Hop 5 data tools ever execute.',
    slide7Spoken:
      'Opening up the wire-level governance payload here shows how all of those capstone controls travel inside a single immutable context object. From left to right, the untrusted caller payload is transformed into a sealed passport carrying the tenant’s tier, their visible agent catalog, their dynamic skill URIs, their five-level memory namespace lock, and a zero-PII SHA-256 audit hash—ensuring that every log line streamed to BigQuery is 100% traceable without ever leaking sensitive customer text.',
    slide8Spoken:
      'In Day-2 production operations, this closed-loop circuit breaker protects all three patterns continuously. Whether a user attempts to invoke a private agent belonging to another company, submits a prompt that violates a regulated customer’s natural-language compliance rule, exceeds their thinking-token budget, or revokes a sovereign encryption key, the pipeline fails closed with a specific HTTP status code and streams a redacted OpenTelemetry alert to BigQuery in real time.',
    slide9Spoken:
      'This master verification ledger consolidates all twenty automated simulation tests across the entire program—combining the ten Shared Pool breach tests from Workstream 2, the six Sovereign Silo and kill-switch tests from Workstream 3, and the four Hybrid Private Service Connect and live tier migration tests from Workstream 4 into one continuous integration gate.',
    slide10Spoken:
      'Here are the capstone Dual-Plane receipts from our live Google Cloud and AWS environments confirming that the entire 24-file codebase, all fourteen official architecture blueprints, all 20/20 Intra-Cloud GCP runtime simulations, all 30/30 Inter-Cloud 10-SaaS AWS AgentCore MCP flows (60/60 assertions), and all 12/12 forensic gates pass at 100%.',
    slide11Spoken:
      'As we wrap up the series for our executive, business, and technical leaders, remember these three foundational takeaways. First, you never have to choose between SaaS gross margins and enterprise compliance—Patterns A, B, and C let you offer both from one platform. Second, the Agentic Triad lets every customer customize their AI agents and skills safely without forking your codebase. And third, our 80/20 architecture and automated twenty-test harness keep engineering velocity high and operational risk near zero.',
    slide12Spoken:
      'To put this architecture to work immediately, your team has full access to our 24-file production codebase, the three Terraform infrastructure starters for Patterns A, B, and C, and the eight-stage Google Cloud Shell runbook. Thank you all—let’s open the floor for executive and technical questions or jump directly into a live run of the simulation workbench.',
  },
};

function makeSpokenNote({ slideNum, totalSlides, slideTitle, whyHere, whatIsHappening, whatComesNext }) {
  const fullText = [whyHere, whatIsHappening, whatComesNext].join('\n\n');
  return {
    slide: slideNum,
    totalSlides,
    title: slideTitle,
    whyHere,
    whatIsHappening,
    whatComesNext,
    fullText,
  };
}

export function getWorkstream12SlideNotes(wsKey) {
  const t = WORKSTREAM_THEMES[wsKey] || WORKSTREAM_THEMES.WS1;
  const total = wsKey === 'WS1' ? 11 : 12;

  if (wsKey === 'WS1') {
    return [
      makeSpokenNote({
        slideNum: 1,
        totalSlides: total,
        slideTitle: 'Part 1 (Slide 1) — Executive Cover & 5-Part Deep-Dive Map',
        whyHere:
          `Welcome everyone. We have structured this streamlined eleven-slide reference architecture briefing into a cohesive five-part engineering series roadmap so you can trace the SaaS AI Dilemma from isolation topologies all the way to automated CI/CD forensic compliance.`,
        whatIsHappening: t.slide1Spoken,
        whatComesNext:
          `With our thesis defined on Slide 1, let's turn to Slide 2 for our Agenda and 5-Part Series Navigation table so you can see the exact macro-to-micro flow of the deck.`,
      }),
      makeSpokenNote({
        slideNum: 2,
        totalSlides: total,
        slideTitle: 'Part 1 (Slide 2) — Agenda & 5-Part Series Navigation (Table of Contents)',
        whyHere:
          `Following our executive cover on Slide 1, Slide 2 provides an explicit Table of Contents mapping all eleven slides across the five-part blog series and our L1-to-L4 architectural hierarchy.`,
        whatIsHappening: t.slide2Spoken,
        whatComesNext:
          `Now that we have the full eleven-slide roadmap in front of us, let's turn to Slide 3 to meet the competing customer personas whose business and regulatory constraints drive this architecture.`,
      }),
      makeSpokenNote({
        slideNum: 3,
        totalSlides: total,
        slideTitle: 'Part 1 (Slide 3) — Competing Enterprise Tenants & Workload Personas',
        whyHere:
          `Stepping into Part 1 from our Agenda on Slide 2, we start with the customer personas first—contrasting regulated banking workloads against high-density commercial SaaS workloads.`,
        whatIsHappening: t.slide3Spoken,
        whatComesNext:
          `Now that we see what FinVault Bank and RetailStream Corp require on Slide 3, let's turn to Slide 4 to compare our three isolation topologies across twelve architectural and operational dimensions.`,
      }),
      makeSpokenNote({
        slideNum: 4,
        totalSlides: total,
        slideTitle: 'Part 1 (Slide 4) — 12-Dimension Multi-Tenant Isolation Decision Matrix',
        whyHere:
          `Building directly on the customer personas from Slide 3, this matrix closes Part 1 by comparing Pooled (Pattern A), Sovereign Silos (Pattern B), and Dynamic Hybrid (Pattern C).`,
        whatIsHappening: t.slide4Spoken,
        whatComesNext:
          `With our three isolation topologies defined in Part 1, let's enter Part 2 on Slide 5 at Level 1 Logical—examining our three logical security layers before zooming into the four physical VPC-SC network perimeters on Slide 6.`,
      }),
      makeSpokenNote({
        slideNum: 5,
        totalSlides: total,
        slideTitle: 'Part 2 (Slide 5) — L1 Logical: Reference Taxonomy — 3 Logical Security Layers & Signed STS JWT',
        whyHere:
          `Opening Part 2 on securing the agent loop, Slide 5 establishes the Level 1 Logical view—organizing our architecture into three logical security layers so it maps cleanly onto the four physical VPC-SC perimeters on Slide 6.`,
        whatIsHappening: t.slide5Spoken,
        whatComesNext:
          `Now that we have the three logical security layers in mind, let's zoom directly into Level 2 Physical on Slide 6 to see how those layers map onto our fifty-six-shape Google Cloud blueprint across four physical VPC-SC network perimeters.`,
      }),
      makeSpokenNote({
        slideNum: 6,
        totalSlides: total,
        slideTitle: 'Part 2 (Slide 6) — L2 Physical: 4 Physical Network Perimeters (VPC-SC Boundaries) — Figure 1 Blueprint',
        whyHere:
          `Following our strict macro-to-micro L1-to-L2 progression from Slide 5, Slide 6 maps the three logical security layers onto concrete Google Cloud services across four color-coded physical VPC Service Controls perimeters.`,
        whatIsHappening: t.slide6Spoken,
        whatComesNext:
          `With both the L1 logical layers and L2 physical perimeters established, let's step into Level 3 Process on Slide 7 to trace a live request chronologically across all five actors alongside our merged fail-closed circuit breakers and Valkey L1 cache recovery.`,
      }),
      makeSpokenNote({
        slideNum: 7,
        totalSlides: total,
        slideTitle: 'Part 3 (Slide 7) — L3 Process: 5-Actor UML Sequence, Fail-Closed Circuit Breakers & Stampede Recovery',
        whyHere:
          `Moving from L2 Physical on Slide 6 to L3 Process on Slide 7, this unified diagram combines our chronological five-actor request sequence with our fail-closed circuit breakers, sub-five-second Valkey SCAN+UNLINK eviction, and SET NX PX 5000 single-flight recovery.`,
        whatIsHappening: t.slide7Spoken,
        whatComesNext:
          `Having watched the request and its circuit breakers execute across Hops 1 through 5 on Slide 7, let's zoom all the way down to Level 4 Wire on Slide 8 to inspect the exact JSON packet and KMS-signed STS JWT on the wire.`,
      }),
      makeSpokenNote({
        slideNum: 8,
        totalSlides: total,
        slideTitle: 'Part 2 (Slide 8) — L4 Wire: Spoofed Header Stripping & <0.15ms Cached-JWKS STS JWT',
        whyHere:
          `Completing our L1 → L2 → L3 → L4 macro-to-micro hierarchy, Slide 8 inspects the raw JSON payload on the wire before and after Hop 1 token exchange.`,
        whatIsHappening: t.slide8Spoken,
        whatComesNext:
          `With the five-hop architecture proven from logical layers down to the wire packet, let's move into Part 4 on Slide 9 to inspect the five EAP product gaps we encountered and the feature-flagged compensating controls we built to close them.`,
      }),
      makeSpokenNote({
        slideNum: 9,
        totalSlides: total,
        slideTitle: 'Part 4 (Slide 9) — Mind the Gap: GAP-01..05 Compensating Controls & BigQuery OTel SQL',
        whyHere:
          `Part 4 on Slide 9 provides our transparent engineering ledger of five current platform gaps, our codebase compensating controls, and our feature-flagged native adapter sunset hooks.`,
        whatIsHappening: t.slide9Spoken,
        whatComesNext:
          `With our compensating controls documented on Slide 9, let's enter Part 5 on Slide 10 to inspect the live Google Cloud Console and Cloud Logging Explorer proof from our deployed projects.`,
      }),
      makeSpokenNote({
        slideNum: 10,
        totalSlides: total,
        slideTitle: 'Part 5 (Slide 10) — Automating Compliance: Live GCP Console & Cloud Logging Audit Proof',
        whyHere:
          `Opening Part 5 on automated compliance, Slide 10 presents live evidence captured from our running Google Cloud projects along with the exact Cloud Logging Explorer queries used by SRE and CISO auditors.`,
        whatIsHappening: t.slide10Spoken,
        whatComesNext:
          `With the live cloud verification complete, let's move to our final slide—Slide 11—where we merge our Google Cloud Well-Architected SLA scorecard directly into the five runnable engineering milestones and five-part blog series roadmap.`,
      }),
      makeSpokenNote({
        slideNum: 11,
        totalSlides: total,
        slideTitle: 'Part 5 (Slide 11) — Well-Architected SLA Scorecard & 5-Part Engineering Roadmap',
        whyHere:
          `Rounding out Part 5, our final slide consolidates our Well-Architected SLA scorecard directly into the five executable GitHub milestones and five-part blog series roadmap.`,
        whatIsHappening: t.slide11Spoken,
        whatComesNext:
          `That completes our streamlined eleven-slide walkthrough—I would love to open the floor for your questions, or we can jump straight into the live codebase and Terraform modules.`,
      }),
    ];
  }

  return [
    makeSpokenNote({
      slideNum: 1,
      totalSlides: total,
      slideTitle: 'Act I — Executive Title Cover & 3-Act Briefing Map',
      whyHere:
        `Welcome everyone. Whether you are looking at this platform from an executive business perspective, a product strategy lens, or hands-on cloud architecture, we have structured this twelve-slide briefing into three clear acts so you always know where we are in the story.`,
      whatIsHappening: t.slide1Spoken,
      whatComesNext:
        `With that three-act roadmap in mind, let's turn to Slide 2 to meet the actual customer profiles whose business and regulatory requirements drive every design decision in this architecture.`,
    }),
    makeSpokenNote({
      slideNum: 2,
      totalSlides: total,
      slideTitle: 'Act I — Customer Use Cases, Competing Tenant Profiles & Cloud Stack',
      whyHere:
        `Following our opening roadmap on Slide 1, we always start with the customer first—because an architecture only creates business value when it solves real customer constraints.`,
      whatIsHappening: t.slide2Spoken,
      whatComesNext:
        `Now that we see what our customers require on Slide 2, the natural question for both business and technical leaders is: what are our architectural options to deliver this, and how do we choose the right one? Let's look at Slide 3.`,
    }),
    makeSpokenNote({
      slideNum: 3,
      totalSlides: total,
      slideTitle: 'Act I — Architectural Options & Decision Matrix',
      whyHere:
        `Building directly on the customer requirements we just reviewed on Slide 2, this slide closes Act I by evaluating our architectural choices before we dive into the technical blueprints.`,
      whatIsHappening: t.slide3Spoken,
      whatComesNext:
        `With our strategic direction clear at the end of Act I, let's move into Act II on Slide 4—starting with a clean, 30,000-foot view of our three security zones before we zoom into the detailed fifty-six-component Google Cloud blueprint.`,
    }),
    makeSpokenNote({
      slideNum: 4,
      totalSlides: total,
      slideTitle: 'Act II (Level 1 Zoom) — 3-Zone Logical Security & Trust Boundary',
      whyHere:
        `Now that we have chosen our architectural approach on Slide 3, Slide 4 opens Act II at Level 1 of our top-down zoom—giving everyone a simple three-zone mental map before we look at the full physical schematic.`,
      whatIsHappening: t.slide4Spoken,
      whatComesNext:
        `Now that we have these three logical zones in mind, let's zoom one level deeper on Slide 5 to see the exact Google Cloud services that live inside each zone.`,
    }),
    makeSpokenNote({
      slideNum: 5,
      totalSlides: total,
      slideTitle: 'Act II (Level 2 Zoom) — Figure 1 Official Google Cloud Physical Blueprint',
      whyHere:
        `Because we just established the three high-level trust zones on Slide 4, this full fifty-six-component Google Cloud blueprint on Slide 5 becomes intuitive to read for both business and technical stakeholders.`,
      whatIsHappening: t.slide5Spoken,
      whatComesNext:
        `While this physical blueprint shows where every service lives, it is a static map. Next, let's turn to Slide 6 to watch how a live customer request actually travels across these components step by step over time.`,
    }),
    makeSpokenNote({
      slideNum: 6,
      totalSlides: total,
      slideTitle: 'Act II (Level 3 Zoom) — 5-Actor Chronological Request Lifeline',
      whyHere:
        `Taking the physical components we just saw on Slide 5, this slide brings the architecture to life by tracing a single customer turn in chronological order.`,
      whatIsHappening: t.slide6Spoken,
      whatComesNext:
        `Having watched the request move from hop to hop on Slide 6, a technical architect or security officer will naturally ask: what actually changes inside the data packet on the wire so a caller can never fake their company ID? Let's zoom all the way in on Slide 7.`,
    }),
    makeSpokenNote({
      slideNum: 7,
      totalSlides: total,
      slideTitle: 'Act II (Level 4 Zoom) — Wire-Level Payload & Cryptographic Context Transformation',
      whyHere:
        `This slide completes our four-level architectural zoom in Act II—taking us from the step-by-step timeline on Slide 6 right inside the JSON message envelope traveling across the wire.`,
      whatIsHappening: t.slide7Spoken,
      whatComesNext:
        `On Slides 4 through 7, we saw how the platform handles a normal request. As we enter Act III on Slide 8, let's answer the question every executive, risk officer, and SRE cares about most: what happens when things go wrong?`,
    }),
    makeSpokenNote({
      slideNum: 8,
      totalSlides: total,
      slideTitle: 'Act III — Deterministic Fail-Closed Circuit Breakers & Recovery Loop',
      whyHere:
        `On the previous slide, we saw how a normal customer request is verified and sealed at the wire level. As we move into Act III, the natural question from any executive, risk officer, or architect is: what happens during an emergency—whether that is a sudden traffic spike from a noisy neighbor, a policy violation, or a customer revoking their encryption key?`,
      whatIsHappening: t.slide8Spoken,
      whatComesNext:
        `Now that we have seen how these automatic circuit breakers protect availability and tenant isolation in real time, let's turn to Slide 9 to see the complete scorecard of attack vectors and edge cases we tested against them.`,
    }),
    makeSpokenNote({
      slideNum: 9,
      totalSlides: total,
      slideTitle: 'Act III — Adversarial Breach Matrix & Compensating Controls',
      whyHere:
        `Building directly on the circuit-breaker mechanics we just walked through on Slide 8, this slide gives leadership and engineering our complete verification ledger.`,
      whatIsHappening: t.slide9Spoken,
      whatComesNext:
        `A verification matrix on Slide 9 is a strong commitment, but customers and auditors want to see live evidence from a real cloud environment. Let's look at Slide 10 to inspect the actual receipts from our Google Cloud Console.`,
    }),
    makeSpokenNote({
      slideNum: 10,
      totalSlides: total,
      slideTitle: 'Act III — Live Google Cloud Console & Runtime Verification Proof',
      whyHere:
        `Following the test matrix on Slide 9, this slide turns those architectural claims into concrete visual proof captured from our running Google Cloud projects.`,
      whatIsHappening: t.slide10Spoken,
      whatComesNext:
        `With the architecture explained in Act II and proven live in Google Cloud here in Act III, let's turn to Slide 11 to distill everything we have covered into three executive takeaways.`,
    }),
    makeSpokenNote({
      slideNum: 11,
      totalSlides: total,
      slideTitle: 'Act III — 3-Pillar Well-Architected Solution Summary',
      whyHere:
        `After reviewing the deep technical and console proof on Slides 8 through 10, we step back here on Slide 11 to connect our design directly back to the business outcomes we started with in Act I.`,
      whatIsHappening: t.slide11Spoken,
      whatComesNext:
        `With those three business and architectural guarantees clear, let's move to our final slide—Slide 12—to look at the concrete engineering deliverables and what comes next.`,
    }),
    makeSpokenNote({
      slideNum: 12,
      totalSlides: total,
      slideTitle: "Act III — What's Next: Series Roadmap & Engineering Deliverables",
      whyHere:
        `Rounding out the three-pillar executive summary from Slide 11, our final slide gives your business and engineering teams an immediate, practical path forward.`,
      whatIsHappening: t.slide12Spoken,
      whatComesNext:
        `That completes our twelve-slide walkthrough—I would love to open the floor for your questions, or we can jump straight into the live simulation workbench.`,
    }),
  ];
}

export function getMaster25SlideNotes() {
  const total = 25;
  const chapters = [
    {
      ws: 'WS1',
      name: 'Workstream 1 (Foundation & Reference Taxonomy)',
      startSlide: 3,
      openerSpoken:
        'In this first chapter on Workstream 1, we establish the foundational five-hop security architecture and the three multi-tenant deployment patterns—Shared Pool, Sovereign Silos, and Hybrid Bridge—that anchor the entire program.',
      archetypeSpoken:
        'Look at the three logical security zones from left to right: customer requests enter through our Front Door in Zone 1, receive an unforgeable cryptographic tenant passport inside our Five-Hop Control Plane in Zone 2, and execute inside isolated data and model lanes in Zone 3. For both business and technical leaders, this means every tenant is governed by the exact same security discipline regardless of tier.',
      fig1Spoken:
        'Zooming into Figure 1, here is our master Google Cloud physical blueprint. Requests enter the blue Routing Hub at the top, pass through the green Five-Hop Governance Hub in the center, and branch into either the yellow Shared Pool Spoke on the left for high-density commercial accounts or the red Sovereign Silo Spoke on the right for regulated enterprise accounts.',
      tableSpoken:
        'This comparison table gives executives and architects the four simple rules at the bottom for matching any customer contract to the right pattern—balancing SaaS gross margins in Pattern A against dedicated regulatory isolation in Pattern B and seamless live tier upgrades in Pattern C.',
      nextChapterName: 'Workstream 2, where we dive deep into Pattern A—our High-Density Shared Pool',
    },
    {
      ws: 'WS2',
      name: 'Workstream 2 (Pattern A — High-Density Shared Pool)',
      startSlide: 7,
      openerSpoken:
        'Here in Chapter 2, we focus on Pattern A—answering how a SaaS business can host hundreds of commercial customers on a single shared Google Cloud environment to achieve up to ninety percent prompt-caching cost savings without ever risking cross-tenant data bleed.',
      fig1Spoken:
        'Figure 1 shows the complete Pattern A shared-pool physical blueprint on Google Cloud. Federated users from Google OIDC and Microsoft Entra arrive through the blue Routing Hub, get rate-limited by per-tenant Valkey bulkheads and served from a shared thirty-two-thousand-token Vertex AI prefix cache in the green Governance Hub, and query tenant-locked rows inside the yellow Shared Pool Spoke.',
      archetypeSpoken:
        'Zooming in from Figure 1 to the wire packet level, these three stages show how we stop cross-tenant spoofing before it ever touches our shared pool. Even if a caller from RetailStream injects a fake header claiming to be FinVault on the left, our Hop 1 gate in the center strips it out and binds their verified login identity directly into the AlloyDB Row-Level Security session on the right.',
      tableSpoken:
        'Our ten-point red-team verification matrix confirms that every common multi-tenant failure mode—from header spoofing and prompt-cache poisoning to noisy-neighbor traffic floods—is 100% blocked while preserving shared-pool unit economics.',
      nextChapterName: 'Workstream 3, where we examine Pattern B for regulated customers who legally require their own dedicated cloud project',
    },
    {
      ws: 'WS3',
      name: 'Workstream 3 (Pattern B — Zero-Trust Sovereign Silos)',
      startSlide: 11,
      openerSpoken:
        'In Chapter 3, we move to Pattern B—our Zero-Trust Sovereign Silo architecture—built for regulated banking, healthcare, and public-sector customers whose compliance officers mandate zero physical blast radius and customer-controlled encryption kill-switches.',
      fig1Spoken:
        'In Figure 1, you can see how the Pattern B sovereign vault is physically isolated on Google Cloud. A dedicated single-tenant project is wrapped inside a VPC Service Controls perimeter and Principal Access Boundary, with every database table, memory bank, and optional air-gapped GKE Gemma 3 GPU node encrypted by the customer’s own Cloud KMS key.',
      archetypeSpoken:
        'Zooming in from Figure 1 to the runtime timeline, this sequence illustrates our sub-sixty-second Cloud KMS kill-switch guarantee. The moment a bank security officer revokes their encryption key, our health probe detects the change, immediately flushes the customer’s volatile memory cache in Valkey, blocks all active sessions with HTTP 423 Locked, and cleanly recovers from AlloyDB once the customer restores their key.',
      tableSpoken:
        'This sovereign hosting matrix compares dedicated Vertex AI endpoints against air-gapped Gemma 3 on GKE and summarizes our six passing perimeter and encryption kill-switch verification tests.',
      nextChapterName: 'Workstream 4, where we show how Pattern C bridges our Shared Pool and Sovereign Silos behind one unified front door',
    },
    {
      ws: 'WS4',
      name: 'Workstream 4 (Pattern C — Dynamic Hybrid & Zero-Downtime Upgrade)',
      startSlide: 15,
      openerSpoken:
        'Chapter 4 introduces Pattern C—our Dynamic Hybrid Hub-and-Spoke architecture—designed so customers can start in our cost-effective Shared Pool and graduate into a dedicated Sovereign Silo mid-contract with zero downtime and zero URL or login changes.',
      fig1Spoken:
        'Figure 1 maps out the Pattern C hybrid physical blueprint. A single shared Routing and Governance Hub inspects each tenant’s live tier and routes standard tenants locally to the yellow Shared Pool Spoke while dispatching enterprise tenants across a one-way Private Service Connect `/28` NAT tunnel into their red Dedicated Sovereign Spoke.',
      archetypeSpoken:
        'Zooming in from Figure 1 to our live migration engine, this four-stage state machine shows how we upgrade a customer from the Shared Pool into their Sovereign Spoke without dropping a single active conversation. We replicate their historical data in the background during Shadow Sync, verify 100% cryptographic hash parity, flip their routing pointer in zero milliseconds during Atomic Cutover, and automatically roll back to the shared pool if any pre-cutover health check fails.',
      tableSpoken:
        'This comparison and four-point verification matrix shows why one-way Private Service Connect outperforms legacy VPC peering—eliminating IP address conflicts and preventing any spoke from initiating reverse connections back into the central hub.',
      nextChapterName: 'Workstream 5, our capstone chapter on the Executive Decision Guide and the 80/20 shared codebase',
    },
    {
      ws: 'WS5',
      name: 'Workstream 5 (Capstone Decision Guide & Agentic Triad)',
      startSlide: 19,
      openerSpoken:
        'Our fifth and final chapter, Workstream 5, brings the entire program together—showing how executive and engineering teams govern all three patterns simultaneously while reusing eighty percent of the same core Python application code.',
      fig1Spoken:
        'Our capstone Figure 1 blueprint unites the two-question topology decision tree with the Multi-Tenant Agentic Triad—allowing every enterprise customer to combine Shared Platform Agents, Private Tenant-Only Agents, and dynamically loaded Cloud Storage Skills without ever forking our core container image.',
      archetypeSpoken:
        'Zooming in from Figure 1 to our software architecture, look at the 80/20 split across these three zones: eighty percent of our codebase—the entire five-hop security pipeline, ADK reasoning engine, and Model Context Protocol hub in Zones 1 and 2—stays 100% identical across every customer tier, while only the twenty percent infrastructure adapter in Zone 3 swaps between Pool, Silo, and Hybrid.',
      tableSpoken:
        'This master twelve-dimension decision matrix serves as your single executive scorecard across Patterns A, B, and C, backed by all twenty passing automated breach, kill-switch, and zero-downtime migration tests.',
      nextChapterName: 'our three closing program capstone slides covering live Google Cloud Console proof, our three Well-Architected executive guarantees, and the complete deliverables index',
    },
  ];

  const notes = [];

  // Slide 1
  notes.push(
    makeSpokenNote({
      slideNum: 1,
      totalSlides: total,
      slideTitle: 'Program Executive Cover — Multi-Tenant Agentic AI on Google Cloud (Workstreams 1–5)',
      whyHere:
        `Welcome everyone to our complete executive and technical briefing on the Gemini Enterprise Agent Platform Multi-Tenancy Program.`,
      whatIsHappening:
        `Over the next twenty-five slides, we will show how software providers and enterprise platform teams build, secure, and scale multi-tenant AI agents on Google Cloud—protecting SaaS gross margins for commercial accounts while delivering uncompromising sovereignty for regulated enterprises.`,
      whatComesNext:
        `Let's move to Slide 2 to look at our five-workstream program map so everyone can see how the five chapters of this briefing connect end to end.`,
    })
  );

  // Slide 2
  notes.push(
    makeSpokenNote({
      slideNum: 2,
      totalSlides: total,
      slideTitle: 'Program Map — Workstreams 1–5 Cohesive Architecture Progression',
      whyHere:
        `Building on our opening thesis from Slide 1, this program map acts as our executive roadmap for the entire twenty-five-slide deck.`,
      whatIsHappening:
        `Notice how the five chapters progress logically: Workstream 1 establishes our five-hop security baseline and three-pattern taxonomy; Workstream 2 builds Pattern A, our High-Density Shared Pool; Workstream 3 builds Pattern B, our Zero-Trust Sovereign Silos; Workstream 4 connects them via Pattern C with zero-downtime live customer upgrades; and Workstream 5 gives leadership our twelve-dimension decision matrix and eighty-percent shared codebase.`,
      whatComesNext:
        `With that five-part roadmap in place, let's turn to Slide 3 to open our first chapter: Workstream 1.`,
    })
  );

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const sDiv = ch.startSlide;
    const sFig = ch.startSlide + 1;
    const sArch = ch.startSlide + 2;
    const sTab = ch.startSlide + 3;
    const prevBridge =
      i === 0
        ? `Stepping directly out of the five-workstream program map on Slide 2, we now begin ${ch.name}.`
        : `Having just completed our verification table for ${chapters[i - 1].name} on Slide ${sDiv - 1}, we now transition into ${ch.name}.`;

    // 1. Chapter Divider (Slides 3, 7, 11, 15, 19)
    notes.push(
      makeSpokenNote({
        slideNum: sDiv,
        totalSlides: total,
        slideTitle: `${ch.ws} Chapter Opener — ${ch.name}`,
        whyHere: prevBridge,
        whatIsHappening: ch.openerSpoken,
        whatComesNext:
          `Let's advance to Slide ${sFig} to examine the authoritative Figure 1 Google Cloud architecture blueprint for ${ch.ws} before we zoom into its core runtime mechanism on Slide ${sArch}.`,
      })
    );

    // 2. Chapter Authoritative Figure 1 Blueprint (Slides 4, 8, 12, 16, 20)
    notes.push(
      makeSpokenNote({
        slideNum: sFig,
        totalSlides: total,
        slideTitle: `${ch.ws} Authoritative Figure 1 Google Cloud Physical Blueprint`,
        whyHere:
          `Right after our chapter introduction on Slide ${sDiv}, we start at the top with the complete Figure 1 Google Cloud architecture blueprint so everyone sees the end-to-end system map first.`,
        whatIsHappening: ch.fig1Spoken,
        whatComesNext:
          `Now that we have the end-to-end Figure 1 architecture map here on Slide ${sFig}, let's zoom in on Slide ${sArch} to examine the core security and runtime mechanism that powers ${ch.ws}.`,
      })
    );

    // 3. Chapter Deep-Dive Architectural Mechanism (Slides 5, 9, 13, 17, 21)
    notes.push(
      makeSpokenNote({
        slideNum: sArch,
        totalSlides: total,
        slideTitle: `${ch.ws} Deep-Dive Architectural & Runtime Mechanism`,
        whyHere:
          `Zooming in directly from the Figure 1 physical blueprint on Slide ${sFig}, this diagram shows how ${ch.ws} enforces isolation and reliability in action.`,
        whatIsHappening: ch.archetypeSpoken,
        whatComesNext:
          `With both the physical blueprint and runtime mechanism clear, let's turn to Slide ${sTab} to review the architectural trade-offs, selection rules, and verification results for ${ch.ws}.`,
      })
    );

    // 4. Chapter Comparison / Verification Table (Slides 6, 10, 14, 18, 22)
    notes.push(
      makeSpokenNote({
        slideNum: sTab,
        totalSlides: total,
        slideTitle: `${ch.ws} Architectural Trade-Off & Verification Matrix`,
        whyHere:
          `Following our deep-dive workflow on Slide ${sArch}, this slide closes our four-slide chapter on ${ch.ws} by summarizing the business decision rules and automated test outcomes.`,
        whatIsHappening: ch.tableSpoken,
        whatComesNext:
          `That completes our chapter on ${ch.name}. Next, on Slide ${sTab + 1}, we move directly into ${ch.nextChapterName}.`,
      })
    );
  }

  // Slide 23: Capstone Live Cloud Console Proof
  notes.push(
    makeSpokenNote({
      slideNum: 23,
      totalSlides: total,
      slideTitle: 'Program Capstone — Live Dual-Plane GCP (20/20) & Inter-Cloud 10-SaaS MCP (30/30) Verification Proof',
      whyHere:
        `Having completed all five workstream chapters on Slide 22, we move to Slide 23 to show the live Dual-Plane visual evidence captured directly from our Google Cloud and AWS environments—proving that every pattern we just reviewed is running and verified in production.`,
      whatIsHappening:
        `On the left, you can see our active Cloud Run revisions, enabled Google Cloud security APIs, and Cloud Logging traces; on the right, the summary cards confirm that all 20/20 Intra-Cloud Google Cloud breach, sovereign kill-switch, and zero-downtime tier migration tests plus all 30/30 Inter-Cloud 10-SaaS AWS Bedrock AgentCore MCP target flows (60/60 assertions) pass with zero cross-tenant data leakage.`,
      whatComesNext:
        `With live Dual-Plane verification confirmed here on Slide 23, let's turn to Slide 24 to synthesize the entire program into our three executive Well-Architected guarantees.`,
    })
  );

  // Slide 24: Capstone Well-Architected Operating Model
  notes.push(
    makeSpokenNote({
      slideNum: 24,
      totalSlides: total,
      slideTitle: 'Program Capstone — 3-Pillar Well-Architected Solution & 80/20 Code Reuse Guarantees',
      whyHere:
        `Backed by the live Google Cloud verification proof from Slide 23, this slide distills our entire five-workstream architecture into three executive guarantees aligned with the Google Cloud Well-Architected Framework.`,
      whatIsHappening:
        `For our leadership and engineering teams, these three pillars summarize what we have built: first, eighty percent shared Python application code across Pooled, Sovereign Silo, and Hybrid deployments; second, safe per-customer customization through the Agentic Triad of shared agents, private agents, and dynamic Cloud Storage skills; and third, up to ninety percent prompt-cache efficiency paired with deterministic five-hop security.`,
      whatComesNext:
        `Finally, let's move to our closing slide—Slide 25—for the complete index of all fourteen editable architecture blueprints and runnable engineering deliverables.`,
    })
  );

  // Slide 25: Capstone Blueprint Lineage & Deliverables Index
  notes.push(
    makeSpokenNote({
      slideNum: 25,
      totalSlides: total,
      slideTitle: 'Program Capstone — Complete 14-Blueprint Lineage Index & Engineering Deliverables',
      whyHere:
        `Rounding out our three Well-Architected executive guarantees from Slide 24, our closing slide serves as your single reference directory for every engineering asset produced across the five workstreams.`,
      whatIsHappening:
        `Here you can see how all fourteen editable Draw.io and Google Slides blueprints, our twenty-four-file Python runtime, our three Terraform infrastructure starters, and our twenty-test simulation suite map across Workstreams 1 through 5 so your team can adopt them immediately.`,
      whatComesNext:
        `Thank you all for your time—let's open the floor for executive, business, and technical questions, or dive into any individual workstream or live simulation in the workbench.`,
    })
  );

  return notes;
}

export const DOC_REF_THEMES = {
  'DOC-REF-07': {
    label: 'DOC-REF-07 (Multimodal GraphRAG with Spanner Graph)',
    title: 'Multimodal GraphRAG Resource Orchestration with Spanner Graph & Vertex AI',
    s1Spoken:
      'In this briefing, we are looking at how to combine knowledge graphs and vector search inside a single Google Cloud Spanner Graph database—allowing AI agents to reason accurately across complex multi-hop relationships like supply chains, financial networks, and clinical pathways alongside documents, images, and audio.',
    s2Spoken:
      'Here in Figure 1 is our complete Google Cloud physical blueprint. User queries enter through the blue Routing Hub via Cloud Armor and Identity-Aware Proxy, get orchestrated by our ADK Reasoning Agent in the green Governance Hub, and execute combined graph-traversal and vector-similarity queries inside Spanner Graph and Vertex AI across the bottom execution spokes.',
    s3Spoken:
      'Walking through the six steps on this slide shows why combining graph and vector retrieval is so powerful in practice. Unstructured files arriving in Cloud Storage are parsed into multimodal embeddings by Vertex AI and linked as typed nodes and edges inside Spanner Graph—so when a user asks a complex question, the agent retrieves both semantic matches and exact multi-hop relationship chains in one transaction.',
    s4Spoken:
      'This slide connects that technical workflow to a concrete business outcome. Standard vector-only RAG often fails when an answer depends on connecting three or four indirect entities across different documents; by unifying GQL graph traversal and cosine vector search inside Spanner Graph, enterprise teams eliminate hallucinations while avoiding the operational cost of syncing separate graph and vector databases.',
    s5Spoken:
      'Here we compare our unified Spanner Graph architecture against stitching together standalone graph and vector databases across latency, consistency, and operational overhead. The takeaway for decision-makers is simple: running graph and vector search inside one transactional engine removes dual-write drift and cuts multi-hop query latency significantly.',
    s6Spoken:
      'Finally, here is the practical deployment checklist and runnable schema setup so your engineering team can provision Spanner Graph and Vertex AI embeddings today.',
  },
  'DOC-REF-08': {
    label: 'DOC-REF-08 (Zero-Trust ADK Agents with Cloud KMS HSM & gVisor)',
    title: 'Build Zero-Trust AI Agents with Google Agent Development Kit (ADK), Cloud KMS HSM & gVisor',
    s1Spoken:
      'In this session, we walk through our zero-trust reference architecture for autonomous AI agents—showing how we combine Google’s Agent Development Kit with hardware-backed Cloud KMS keys and gVisor kernel sandboxes to protect enterprises against prompt injection, unauthorized tool calls, and container escape.',
    s2Spoken:
      'Figure 1 maps out the complete zero-trust physical blueprint on Google Cloud. Incoming prompts are screened at the blue Routing Hub by Cloud Armor, validated and cryptographically signed inside the green Governance Hub using Cloud KMS Hardware Security Modules and Model Armor, and executed inside isolated gVisor sandboxes across the bottom spokes with VPC Service Controls blocking any unauthorized egress.',
    s3Spoken:
      'Following the six-step execution flow on this slide shows how zero trust is enforced on every single turn. Instead of trusting an AI agent with broad network or service-account permissions, every tool invocation requires a short-lived, hardware-signed capability token and runs inside an unprivileged gVisor user-space kernel that intercepts raw Linux system calls.',
    s4Spoken:
      'For our business and security leaders, this slide grounds the architecture in a high-stakes enterprise scenario: allowing an AI agent to analyze untrusted external attachments and execute dynamic code or data queries while guaranteeing that even a sophisticated prompt-injection payload cannot access internal corporate networks or exfiltrate secrets.',
    s5Spoken:
      'This trade-off matrix compares our gVisor and Cloud KMS HSM design against standard container runtimes and software-signed tokens across security isolation, compliance posture, and latency overhead—giving security architects clear rules for when to enforce hardware-backed sandboxing.',
    s6Spoken:
      'To help your team put this into production immediately, here are the step-by-step Terraform, Cloud KMS, and ADK deployment actions along with our automated verification checks.',
  },
  'DOC-REF-09': {
    label: 'DOC-REF-09 (Scalable Multi-Agent Ecosystems: Agent Engine, MCP & A2A)',
    title: 'Design Patterns for Scalable Multi-Agent Ecosystems: Vertex AI Agent Engine, MCP & A2A',
    s1Spoken:
      'In this session, we look at how enterprise teams scale from a single AI chatbot to a coordinated ecosystem of specialized agents—using Vertex AI Agent Engine for managed runtime orchestration, the Model Context Protocol (MCP) for standardized enterprise tool access, and the Agent-to-Agent (A2A) protocol for governed delegation.',
    s2Spoken:
      'Figure 1 shows our complete Google Cloud physical blueprint for multi-agent orchestration. Requests enter the blue Routing Hub, get routed to a Supervisor Agent inside the green Governance Hub on Vertex AI Agent Engine, and delegate specialized tasks across the bottom spokes using signed A2A agent cards and governed MCP tool servers connected to BigQuery, AlloyDB, and third-party SaaS.',
    s3Spoken:
      'Walking through the six-step choreography on this slide illustrates how context and security travel across multiple agents. When the Supervisor Agent delegates a sub-task over A2A or calls an MCP tool, it passes a scoped identity token, a shared distributed trace ID, and a strict token budget—ensuring specialist agents collaborate cleanly without losing user permissions or entering infinite loops.',
    s4Spoken:
      'This slide connects our multi-agent architecture to a real enterprise operations workflow—showing how a Supervisor Agent coordinates an Incident Diagnostic Agent, a Database Analytics Agent, and a Ticketing Agent in parallel to resolve complex cross-department workflows in seconds rather than hours.',
    s5Spoken:
      'Here we compare the three primary multi-agent orchestration topologies—Hierarchical Supervisor, Sequential Pipeline, and Peer-to-Peer Mesh—so your architects know exactly which pattern to choose based on workflow determinism, latency budgets, and governance requirements.',
    s6Spoken:
      'Finally, here is the deployment runbook for registering A2A agent cards, exposing governed MCP tool endpoints, and launching your multi-agent ecosystem on Vertex AI Agent Engine.',
  },
};

export function getDocRef6SlideNotes(docKey) {
  const t = DOC_REF_THEMES[docKey] || DOC_REF_THEMES['DOC-REF-07'];
  const total = 6;

  return [
    makeSpokenNote({
      slideNum: 1,
      totalSlides: total,
      slideTitle: `Executive Overview & Architecture Thesis — ${t.title}`,
      whyHere:
        `Welcome everyone. In this six-slide executive and technical briefing, we are walking through ${t.title}.`,
      whatIsHappening: t.s1Spoken,
      whatComesNext:
        `With our business goal and architectural thesis set, let's turn to Slide 2 to examine the complete Figure 1 Google Cloud Hub-and-Spoke blueprint.`,
    }),
    makeSpokenNote({
      slideNum: 2,
      totalSlides: total,
      slideTitle: `Figure 1 — Official Google Cloud Architecture Center Hub-and-Spoke Blueprint`,
      whyHere:
        `Building on the executive overview we just covered on Slide 1, this diagram gives us the complete end-to-end physical map of the system on Google Cloud.`,
      whatIsHappening: t.s2Spoken,
      whatComesNext:
        `Now that we see where each component sits in Figure 1, let's move to Slide 3 to walk through how a live request flows across these services step by step.`,
    }),
    makeSpokenNote({
      slideNum: 3,
      totalSlides: total,
      slideTitle: `Architecture Components & Step-by-Step Agentic Flow`,
      whyHere:
        `Taking the physical components from the Figure 1 blueprint on Slide 2, this slide unpacks the exact step-by-step runtime workflow.`,
      whatIsHappening: t.s3Spoken,
      whatComesNext:
        `Having seen how the components interact step by step on Slide 3, let's turn to Slide 4 to see how this architecture solves a concrete enterprise customer use case.`,
    }),
    makeSpokenNote({
      slideNum: 4,
      totalSlides: total,
      slideTitle: `Google Cloud Products Used & Real-World Enterprise Use Case`,
      whyHere:
        `Following our step-by-step technical workflow on Slide 3, this slide connects the architecture directly to tangible business value and the managed Google Cloud services that power it.`,
      whatIsHappening: t.s4Spoken,
      whatComesNext:
        `Once business and technical leaders see how the use case works on Slide 4, the natural next question is: how does this compare to alternative designs, and what are the trade-offs? Let's look at Slide 5.`,
    }),
    makeSpokenNote({
      slideNum: 5,
      totalSlides: total,
      slideTitle: `Design Alternatives, Trade-Offs & Well-Architected Considerations`,
      whyHere:
        `Building on the customer use case from Slide 4, this slide evaluates our architectural trade-offs so decision-makers have full confidence in why this design is recommended.`,
      whatIsHappening: t.s5Spoken,
      whatComesNext:
        `With the architectural trade-offs clear here on Slide 5, let's turn to our final slide—Slide 6—to walk through the deployment checklist and next steps.`,
    }),
    makeSpokenNote({
      slideNum: 6,
      totalSlides: total,
      slideTitle: `Deployment Runbook, What's Next & Architecture Center Contributors`,
      whyHere:
        `Rounding out the design trade-offs from Slide 5, our closing slide transitions from architecture into hands-on production deployment.`,
      whatIsHappening: t.s6Spoken,
      whatComesNext:
        `That concludes our six-slide briefing—let's open the floor for your questions or launch the interactive codebase workbench to inspect the implementation files directly.`,
    }),
  ];
}

export function getDeckSlideNotesList(deckKey) {
  const cleanKey = String(deckKey || 'WS1').toUpperCase();
  if (cleanKey === 'ALL' || cleanKey === 'DOC-MT-06') {
    return getMaster25SlideNotes();
  }
  if (cleanKey === 'DOC-REF-07' || cleanKey === 'DOC-REF-08' || cleanKey === 'DOC-REF-09') {
    return getDocRef6SlideNotes(cleanKey);
  }
  const mapAlias = {
    'DOC-MT-01': 'WS1',
    'BP-78': 'WS1',
    'PLUGIN-GSLIDES-WS1': 'WS1',
    'DOC-MT-02': 'WS2',
    'DOC-MT-03': 'WS3',
    'DOC-MT-04': 'WS4',
    'DOC-MT-05': 'WS5',
  };
  const wsKey = mapAlias[cleanKey] || (WORKSTREAM_THEMES[cleanKey] ? cleanKey : 'WS1');
  return getWorkstream12SlideNotes(wsKey);
}

export function getSlideSpeakerNoteText(deckKey, slideNum1Based) {
  const list = getDeckSlideNotesList(deckKey);
  const idx = Math.max(0, Math.min(list.length - 1, Number(slideNum1Based) - 1));
  return list[idx].fullText;
}
