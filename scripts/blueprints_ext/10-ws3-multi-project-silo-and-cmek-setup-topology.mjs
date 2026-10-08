/**
 * Workstream 3.2 — Multi-Project Silo & CMEK Setup Topology (Pattern B)
 * Source: workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md
 *
 * Provisioning view: org/billing bootstrap → shared hub project steps →
 * org-level PAB / KMS / SCC governance → two dedicated tenant silo projects
 * (cymbal-finvault-silo-prod, cymbal-retailstream-silo-prod) each with a
 * VPC-SC perimeter, Cloud KMS key ring, CMEK key and private GKE / Gemma 3.
 */
export default {
  id: 'ws3-multi-project-silo-and-cmek-setup-topology',
  badge: 'WORKSTREAM 3.2 • MULTI-PROJECT SILO & CMEK SETUP',
  title: 'Pattern B Provisioning Topology: Org → Per-Tenant Silo Projects, VPC-SC Perimeters, IAM PAB & Cloud KMS CMEK Keys',
  subtitle: 'Setup Multi-Project Silo Demo & Cloud KMS CMEK Keys • cymbal-finvault-silo-prod & cymbal-retailstream-silo-prod (us-central1)',
  workstreamDir: 'workstream-3-pattern-b-siloed/diagrams',
  topUserTitle: 'Platform / FDE Operator',
  topUserSub: 'gcloud + ORG_ID + BILLING_ACCOUNT',
  step1LeftLabel: 'gcloud bootstrap',
  step7RightLabel: 'Silo tests PASS',
  outerWrapperLabel: 'Google Cloud Organization 123456789012 • Multi-Project Sovereign Silo Topology (One Project, Perimeter, Key Ring & PAB Policy per Tenant)',
  innerWrapperLabel: 'Shared Hub Project Bootstrap & Org-Level Governance',
  routingHubTitle: 'Shared Hub Project Bootstrap',
  routingHubSub: 'projects create → billing link → services enable',
  routingCards: {
    topLeft: { icon: 'iap_iam_shield', title: 'gcloud projects create', sub: '--organization=ORG_ID' },
    midLeft: { icon: 'cloud_logging', title: 'Billing Link', sub: 'BILLING_ACCOUNT per silo' },
    botLeft: { icon: 'cloud_run', title: 'Enable 7 Silo APIs', sub: 'aiplatform…accesscontext' },
    topRight: { icon: 'load_balancer_cloud_armor', title: 'Region & Env', title2: 'Variables', sub: 'REGION=us-central1' },
    botRight: { icon: 'security_command_center', title: 'Silo Security Tests', sub: 'run_silo_security_tests.py' },
    edgeTopLeft: ['Create silo', 'projects'],
    edgeMidLeft: ['Link billing', 'account'],
    edgeBotLeft: ['Enable KMS,', 'GKE, AlloyDB'],
    step2Left: 'Projects ready',
    step7Mid: 'Verified',
  },
  govHubTitle: 'Org-Level PAB, KMS &',
  govHubTitle2: 'Security Governance Hub',
  govCards: {
    top: { icon: 'iap_iam_shield', title: 'IAM PAB Policy', sub: 'finvault-sovereign-pab' },
    mid: { icon: 'security_command_center', title: 'Access Context Mgr', sub: 'VPC-SC Perimeter Policy' },
    bot: { icon: 'cloud_logging', title: 'KMS Key IAM Binding', sub: 'cryptoKeyEncrypterDecrypter' },
  },
  midStep3Label: ['Provision tenant', 'silo project'],
  midStep7Label: ['Exfil & CMEK', 'revocation tests'],
  midGovLabel: ['PAB, perimeter &', 'KMS IAM bindings'],
  leftBoundaryLabel: 'VPC-SC Perimeter + PAB • Project: cymbal-finvault-silo-prod',
  leftZoneTitle: 'FinVault Silo Setup',
  leftZoneSub: 'Key Ring finvault-kr • agent-memory-cmek',
  leftCards: {
    modelArmor: { icon: 'security_command_center', title: 'VPC-SC Perimeter', sub: 'Restricts 7 silo APIs' },
    llm: { icon: 'gemini_agent_platform', title: 'Private GKE Gemma 3', sub: 'container.googleapis.com' },
    runtime: { icon: 'iap_iam_shield', title: 'KMS Ring finvault-kr', sub: 'location us-central1' },
    mcp: { icon: 'model_armor', title: 'agent-memory-cmek', sub: 'rotation 7776000s (90d)' },
    datastore: { icon: 'datastore_alloydb_bq', title: 'CMEK AlloyDB & GEAP', sub: 'Vertex SA key binding' },
    step4Label: 'Create key ring',
    step6Label: 'Bind CMEK key',
    step5Label: ['Create CMEK', 'crypto key'],
    ragLabel: ['PAB scoped to', 'FinVault project'],
    toolLabel: ['Vertex AI SA', 'EncrypterDecrypter'],
  },
  rightBoundaryLabel: 'VPC-SC Perimeter + PAB • Project: cymbal-retailstream-silo-prod',
  rightZoneTitle: 'RetailStream Silo Setup',
  rightZoneSub: 'Same loop • Dedicated key ring & CMEK',
  rightCards: {
    modelArmor: { icon: 'security_command_center', title: 'VPC-SC Perimeter', sub: 'Restricts 7 silo APIs' },
    llm: { icon: 'gemini_agent_platform', title: 'Private GKE Gemma 3', sub: 'container.googleapis.com' },
    runtime: { icon: 'iap_iam_shield', title: 'KMS Ring (Tenant B)', sub: 'location us-central1' },
    mcp: { icon: 'model_armor', title: 'agent-memory-cmek', sub: 'rotation 7776000s (90d)' },
    datastore: { icon: 'datastore_alloydb_bq', title: 'CMEK AlloyDB & GEAP', sub: 'Vertex SA key binding' },
    ragLabel: ['PAB scoped to', 'RetailStream proj'],
    toolLabel: ['Vertex AI SA', 'EncrypterDecrypter'],
  },
};
