/**
 * Workstream 2.2 — Demo Environment & 3P Auth Sandbox Provisioning Topology (Pattern A — Pooled)
 * Source of truth: workstream-2-pattern-a-pooled/2.2-demo-env-and-3p-auth-sandbox.md
 *
 * Hub-and-spoke reading:
 *   Top user box ....... Platform operator bootstrapping the shared demo env
 *   Routing hub ........ Shared env ingress & bootstrap (project, APIs, Cloud Armor, LB, Edge PEP)
 *   Gov hub ............ Secrets / IdP issuer map / observability setup
 *   Left spoke ......... FinVault Bank sandbox wiring (Google Workspace OIDC + Jira 3LO)
 *   Right spoke ........ RetailStream Corp sandbox wiring (Microsoft Entra ID + SharePoint/ServiceNow 3LO)
 */
export default {
  id: 'ws2-demo-env-and-3p-auth-sandbox-topology',
  badge: 'WORKSTREAM 2.2 • DEMO ENV & 3P AUTH SANDBOX',
  title: 'Pattern A Demo Environment & 3P Auth Sandbox: Pooled Project, Federated IdPs, OAuth 2LO/3LO Apps, Redis & Firestore Tenant Config',
  subtitle: 'Provisioning Topology for cymbal-pooled-saas-prod (us-central1) Seeding FinVault Bank (Google OIDC + Jira) & RetailStream Corp (Entra ID + SharePoint/ServiceNow)',
  workstreamDir: 'workstream-2-pattern-a-pooled/diagrams',
  topUserTitle: 'Cymbal Platform Operator',
  topUserSub: 'gcloud bootstrap + IdP admin consoles',
  step1LeftLabel: 'Bootstrap',
  step7RightLabel: 'Verify',
  outerWrapperLabel: 'Shared Demo Project cymbal-pooled-saas-prod (us-central1) • 12 Enabled APIs (aiplatform, modelarmor, dlp, run, iap, alloydb, redis, firestore, cloudkms, bigquery)',
  innerWrapperLabel: 'Shared Pooled GEAP Runtime • Hop 1 Edge PEP + Hop 5 3P Auth Sandbox',
  routingHubTitle: 'Shared env ingress & bootstrap hub',
  routingHubSub: 'Project, APIs, Cloud Armor WAF, Global LB & Edge PEP',
  routingCards: {
    topLeft: { icon: 'load_balancer_cloud_armor', title: 'Cloud Armor WAF', sub: 'cymbal-pooled-edge-waf' },
    midLeft: { icon: 'iap_iam_shield', title: 'Header Sanitizer', sub: 'Strip X-Tenant-ID spoof' },
    botLeft: { icon: 'iap_iam_shield', title: 'Hop 1 Edge PEP', sub: 'IDP_ISSUER_MAP + OBO/DPoP' },
    topRight: { icon: 'load_balancer_cloud_armor', title: 'Global External', title2: 'App Load Balancer', sub: 'edge.cymbal-saas.example' },
    botRight: { icon: 'cloud_run', title: 'Cloud Run Edge PEP', sub: 'Envoy Service Extension' },
    edgeTopLeft: ['Rule 1000 SQLi', 'XSS deny-403'],
    edgeMidLeft: ['Drop forged', 'tenant headers'],
    edgeBotLeft: ['Resolve OIDC', 'issuer per tenant'],
    step2Left: 'Enable APIs',
    step7Mid: 'Verify',
  },
  govHubTitle: 'Secrets, IdP issuer map &',
  govHubTitle2: 'observability setup hub',
  govCards: {
    top: { icon: 'iap_iam_shield', title: 'Agent Identity', title2: '(Auth Manager)', sub: '3LO scope registry' },
    mid: { icon: 'security_command_center', title: 'Cloud KMS', sub: 'cloudkms.googleapis.com' },
    bot: { icon: 'cloud_logging', title: 'BigQuery OTel', sub: 'bigquery.googleapis.com' },
  },
  midStep3Label: ['Register IdPs', '(OIDC & Entra)'],
  midStep7Label: ['Run breach', 'simulation suite'],
  midGovLabel: ['Scopes, keys &', 'audit datasets'],
  leftBoundaryLabel: 'Tenant Alpha Sandbox: FinVault Bank (ENTERPRISE • Google Workspace OIDC + Jira 3LO)',
  leftZoneTitle: 'FinVault Sandbox Wiring',
  leftZoneSub: 'finvault.com OAuth 2.0 Client ID • 8,000 thinking budget',
  leftCards: {
    modelArmor: { icon: 'iap_iam_shield', title: 'Google OIDC Client', sub: 'OAuth 2.0 Client ID' },
    llm: { icon: 'mcp_servers', title: 'Workspace 3LO Scopes', sub: 'drive, calendar, gmail' },
    runtime: { icon: 'mcp_servers', title: 'Jira MCP Sandbox', sub: 'read/write:jira-work' },
    mcp: { icon: 'datastore_alloydb_bq', title: 'Firestore Tenant Doc', sub: 'tier ENTERPRISE • rpm 600' },
    datastore: { icon: 'gemini_agent_platform', title: 'Private Agent Alpha', sub: 'claude-3-7-sonnet allowed' },
    step4Label: 'Create client ID',
    step6Label: 'Seed tenant config',
    step5Label: ['Register 3LO', 'scopes'],
    ragLabel: ['Workspace +', 'Jira tools'],
    toolLabel: ['allowed_agents', 'shared + alpha'],
  },
  rightBoundaryLabel: 'Tenant Beta Sandbox: RetailStream Corp (STANDARD • Microsoft Entra ID, Zero Google Footprint)',
  rightZoneTitle: 'RetailStream Sandbox Wiring',
  rightZoneSub: 'retailstream.onmicrosoft.com • 4,000 thinking budget',
  rightCards: {
    modelArmor: { icon: 'iap_iam_shield', title: 'Entra App Reg', sub: 'Cymbal-RetailStream-Agent' },
    llm: { icon: 'mcp_servers', title: 'Graph Sites.Read.All', sub: 'SharePoint runbooks 3LO' },
    runtime: { icon: 'mcp_servers', title: 'ServiceNow MCP', sub: 'ITOM REST useraccount' },
    mcp: { icon: 'datastore_alloydb_bq', title: 'Firestore Tenant Doc', sub: 'tier STANDARD • rpm 120' },
    datastore: { icon: 'datastore_alloydb_bq', title: 'Memorystore Redis', sub: 'cymbal-tenant-bulkhead' },
    ragLabel: ['Entra OIDC', 'discovery URL'],
    toolLabel: ['Redis 7.0 5GB', 'rate bulkhead'],
  },
};
