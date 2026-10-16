/**
 * Workstream 3.2 — Multi-Project Silo & CMEK Setup Topology (Pattern B)
 * Source: workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md
 *
 * Provisioning view: org/billing bootstrap → shared hub project steps →
 * org-level PAB / KMS / SCC governance → dedicated tenant silo projects
 * (cymbal-finvault-silo-prod, cymbal-retailstream-silo-prod) verified live
 * in nitina-ggarwal-sandbox-647724 with cymbal-multi-tenant-kr and cymbal_silo_finvault_usw1.
 */
export default {
  id: 'ws3-multi-project-silo-and-cmek-setup-topology',
  badge: 'WORKSTREAM 3.2 • MULTI-PROJECT SILO & CMEK SETUP',
  title: 'Pattern B Provisioning Topology: Org → Per-Tenant Silo Projects, VPC-SC Perimeters, IAM PAB & Cloud KMS CMEK Keys',
  subtitle: 'Live Verified in nitina-ggarwal-sandbox-647724 (us-west1) • cymbal-multi-tenant-kr/{finvault-silo-cmek,medcore-revoked-cmek} & cymbal_silo_finvault_usw1',
  workstreamDir: 'workstream-3-pattern-b-siloed/diagrams',
  topUserTitle: 'Platform / FDE Operator',
  topUserSub: 'gcloud + ORG_ID + BILLING_ACCOUNT',
  step1LeftLabel: 'gcloud bootstrap',
  step7RightLabel: '6/6 Silo PASS',
  outerWrapperLabel: 'Multi-Project Sovereign Silo Topology (nitina-ggarwal-sandbox-647724 • One Perimeter, Key Ring & PAB Policy per Tenant)',
  innerWrapperLabel: 'Shared Hub Project Bootstrap & Org-Level Governance (cymbal-multi-tenant-patterns-00003-wfh)',
  routingHubTitle: 'Shared Hub Project Bootstrap',
  routingHubSub: 'projects create → billing link → services enable',
  routingCards: {
    topLeft: { icon: 'iap_iam_shield', title: 'gcloud projects create', sub: '--organization=ORG_ID' },
    midLeft: { icon: 'cloud_logging', title: 'Billing Link', sub: 'BILLING_ACCOUNT per silo' },
    botLeft: { icon: 'cloud_run', title: 'Enable 7 Silo APIs', sub: 'aiplatform…accesscontext' },
    topRight: { icon: 'terraform_iac', title: 'Region & Env', title2: 'Variables', sub: 'REGION=us-west1' },
    botRight: { icon: 'security_command_center', title: 'Silo Security Tests', sub: 'run_silo_security_tests.py' },
    edgeTopLeft: ['Create silo', 'projects'],
    edgeMidLeft: ['Link billing', 'account'],
    edgeBotLeft: ['Enable KMS,', 'GKE, AlloyDB'],
    step2Left: 'Projects ready',
    step7Mid: '6/6 Verified',
  },
  govHubTitle: 'Org-Level PAB, KMS &',
  govHubTitle2: 'Security Governance Hub',
  govCards: {
    top: { icon: 'iap_iam_shield', title: 'IAM PAB Policy', sub: 'finvault-sovereign-pab' },
    mid: { icon: 'vpc_sc', title: 'Access Context Mgr', sub: 'VPC-SC Perimeter Policy' },
    bot: { icon: 'cloud_kms', title: 'KMS Key IAM Binding', sub: 'cryptoKeyEncrypterDecrypter' },
  },
  midStep3Label: ['Provision tenant', 'silo project'],
  midStep7Label: ['Exfil & CMEK', 'revocation tests'],
  midGovLabel: ['PAB, perimeter &', 'KMS IAM bindings'],
  leftBoundaryLabel: 'VPC-SC Perimeter + PAB • Project: cymbal-finvault-silo-prod (cymbal_silo_finvault_usw1)',
  leftZoneTitle: 'FinVault Silo Setup',
  leftZoneSub: 'KeyRing cymbal-multi-tenant-kr • finvault-silo-cmek',
  leftCards: {
    modelArmor: { icon: 'vpc_sc', title: 'VPC-SC Perimeter', sub: 'Restricts 7 silo APIs' },
    llm: { icon: 'gke', title: 'Private GKE Gemma 3', sub: 'container.googleapis.com' },
    runtime: { icon: 'cloud_kms', title: 'KMS Ring finvault-kr', sub: 'cymbal-multi-tenant-kr' },
    mcp: { icon: 'cloud_kms', title: 'finvault-silo-cmek', sub: 'rotation 7776000s (90d)' },
    datastore: { icon: 'datastore_alloydb_bq', title: 'CMEK Silo Vault', sub: 'pattern_b_silo_finvault_cmek_vault' },
    step4Label: 'Create key ring',
    step6Label: 'Bind CMEK key',
    step5Label: ['Create CMEK', 'crypto key'],
    ragLabel: ['PAB scoped to', 'FinVault project'],
    toolLabel: ['Vertex AI SA', 'EncrypterDecrypter'],
  },
  rightBoundaryLabel: 'VPC-SC Perimeter + PAB • Project: cymbal-retailstream-silo-prod & medcore-revoked-cmek',
  rightZoneTitle: 'RetailStream & MedCore Silo Setup',
  rightZoneSub: 'retailstream-silo-cmek & medcore-revoked-cmek (HTTP 423)',
  rightCards: {
    modelArmor: { icon: 'vpc_sc', title: 'VPC-SC Perimeter', sub: 'Restricts 7 silo APIs' },
    llm: { icon: 'gke', title: 'Private GKE Gemma 3', sub: 'container.googleapis.com' },
    runtime: { icon: 'cloud_kms', title: 'retailstream-silo-cmek', sub: 'Active KMS CryptoKey' },
    mcp: { icon: 'cloud_kms', title: 'medcore-revoked-cmek', sub: 'DISABLED -> HTTP 423 Lock' },
    datastore: { icon: 'datastore_alloydb_bq', title: 'CMEK AlloyDB & Agent', sub: 'Instant Kill-Switch Verified' },
    ragLabel: ['PAB scoped to', 'RetailStream proj'],
    toolLabel: ['DISABLED -> 423', 'ENABLED -> 200'],
  },
};
