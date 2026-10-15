/**
 * Workstream 2.6 — 1-Click Terraform Starter Resource Graph (Pattern A — Pooled)
 * Source of truth: workstream-2-pattern-a-pooled/2.6-terraform-starter/{main.tf,variables.tf,README.md,terraform.tfvars.example}
 *
 * Hub-and-spoke reading:
 *   Top user box ....... Operator running terraform init/plan/apply with terraform.tfvars
 *   Routing hub ........ Provider/project/APIs → networking & ingress (Cloud Armor WAF + LB front door)
 *   Gov hub ............ IAM/service accounts, Cloud KMS CMEK & observability (BigQuery OTel)
 *   Left spoke ......... Runtime/services graph (Cloud Run v2 Agent Gateway + env wiring)
 *   Right spoke ........ Data graph (AlloyDB/BQ RLS, Memorystore Valkey, Firestore) + outputs
 */
export default {
  id: 'ws2-terraform-starter-resource-graph',
  badge: 'WORKSTREAM 2.6 • TERRAFORM STARTER RESOURCE GRAPH',
  title: 'Pattern A 1-Click Terraform Starter: Provider → Cloud Armor WAF → Cloud Run v2 Agent Gateway → Valkey / KMS CMEK → BigQuery OTel Resource Graph',
  subtitle: 'hashicorp/google >= 5.30.0 on Terraform >= 1.5.0 • Verified in nitina-ggarwal-sandbox-647724 (cymbal-pooled-saas-prod) • Hop 1, Hop 3 & Hop 5 Resources',
  workstreamDir: 'workstream-2-pattern-a-pooled/diagrams',
  topUserTitle: 'Platform Operator (IaC)',
  topUserSub: 'terraform init • plan • apply',
  step1LeftLabel: 'tfvars',
  step7RightLabel: 'Outputs',
  outerWrapperLabel: 'Terraform Root Module (main.tf + variables.tf) • provider "google" { project = var.project_id (nitina-ggarwal-sandbox-647724) }',
  innerWrapperLabel: 'Resource Dependency Graph • Hop 1 Edge → Hop 3 Runtime & Bulkhead → Hop 5 Audit (cymbal_agentic_finops_otel)',
  routingHubTitle: 'Provider, project & ingress hub',
  routingHubSub: 'required_providers + Hop 1 Cloud Armor WAF front door',
  routingCards: {
    topLeft: { icon: 'load_balancer_cloud_armor', title: 'Security Policy', sub: 'cymbal_pooled_waf' },
    midLeft: { icon: 'load_balancer_cloud_armor', title: 'Rule 1000 deny(403)', sub: 'sqli-v33 || xss-v33' },
    botLeft: { icon: 'iap_iam_shield', title: 'Default allow rule', sub: 'SRC_IPS_V1 to IAP & PEP' },
    topRight: { icon: 'load_balancer_cloud_armor', title: 'google provider', title2: '>= 5.30.0', sub: 'var.project_id / var.region' },
    botRight: { icon: 'cloud_run', title: 'Internal LB Ingress', sub: 'INGRESS_TRAFFIC_INTERNAL_LB' },
    edgeTopLeft: ['Hop 1 Edge', 'WAF policy'],
    edgeMidLeft: ['Preconfigured', 'WAF rules'],
    edgeBotLeft: ['Priority', '2147483647'],
    step2Left: 'Provider',
    step7Mid: 'Outputs',
  },
  govHubTitle: 'IAM, CMEK keys &',
  govHubTitle2: 'observability resources',
  govCards: {
    top: { icon: 'cloud_kms', title: 'KMS Key Ring', sub: 'cymbal-multi-tenant-kr' },
    mid: { icon: 'cloud_kms', title: 'FinVault CMEK Key', sub: 'finvault-silo-cmek (90d)' },
    bot: { icon: 'bigquery_analytics', title: 'BigQuery Dataset', sub: 'cymbal_agentic_finops_otel' },
  },
  midStep3Label: ['Apply Hop 3', 'runtime & data'],
  midStep7Label: ['pooled_gateway_uri', 'valkey_bulkhead'],
  midGovLabel: ['90-day rotation', '+ Hop 5 OTel audit'],
  leftBoundaryLabel: 'Runtime & Services Graph: google_cloud_run_v2_service.cymbal_pooled_gateway (cymbal-multi-tenant-patterns)',
  leftZoneTitle: 'Cloud Run v2 Agent Gateway',
  leftZoneSub: 'cymbal-multi-tenant-patterns • EXECUTION_ENVIRONMENT_GEN2',
  leftCards: {
    modelArmor: { icon: 'cloud_run', title: 'Cloud Run v2 Service', sub: 'cymbal-multi-tenant-patterns' },
    llm: { icon: 'cloud_run', title: 'Gateway Container', sub: 'Revision 00003-wfh' },
    runtime: { icon: 'gemini_agent_platform', title: 'CYMBAL_TOPOLOGY_MODE', sub: 'PATTERN_A_POOLED' },
    mcp: { icon: 'gemini_agent_platform', title: 'CONTEXT_CACHE_ID', sub: 'shared-diagnostic-prefix-v2' },
    datastore: { icon: 'valkey_cache', title: 'BULKHEAD_HOST', sub: 'valkey_instance.host ref' },
    step4Label: 'Build template',
    step6Label: 'Export URI',
    step5Label: ['Inject env', 'variables'],
    ragLabel: ['Gen2 gVisor', 'sandbox'],
    toolLabel: ['Implicit dep on', 'Valkey instance'],
  },
  rightBoundaryLabel: 'Data Graph: Memorystore Valkey + AlloyDB/BQ RLS (pattern_a_pooled_rls_entities) & Firestore',
  rightZoneTitle: 'Tenant Data & Bulkhead Stores',
  rightZoneSub: 'Memorystore Valkey STANDARD_HA 5GB (Hop 3 FinOps)',
  rightCards: {
    modelArmor: { icon: 'valkey_cache', title: 'Memorystore Valkey', sub: 'cymbal-tenant-bulkhead' },
    llm: { icon: 'valkey_cache', title: 'STANDARD_HA 5 GB', sub: 'Hop 3 Rate & Token Clamp' },
    runtime: { icon: 'datastore_alloydb_bq', title: 'AlloyDB & BQ RLS', sub: 'tenant_pooled_rls_policy' },
    mcp: { icon: 'firestore_db', title: 'Firestore Config', sub: 'Per-tenant runtime docs' },
    datastore: { icon: 'cloud_logging', title: 'Resource Labels', sub: 'hop-3-finops-bulkhead' },
    ragLabel: ['Token & rate', 'bulkhead'],
    toolLabel: ['pattern-a-pooled', 'label'],
  },
};
