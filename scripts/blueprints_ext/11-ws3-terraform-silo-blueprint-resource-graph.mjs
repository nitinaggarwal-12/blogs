/**
 * Workstream 3.6 — Terraform Silo Blueprint Resource Graph (Pattern B)
 * Source: workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/
 *         (main.tf, variables.tf, README.md, terraform.tfvars.example)
 *
 * Resource-graph view: provider/project vars → KMS key ring & CMEK crypto key →
 * VPC-SC service perimeter → sovereign VPC/subnet → private GKE Autopilot
 * (Gemma 3 27B IT) with database_encryption bound to the CMEK key → outputs.
 * Every card title is a real resource/variable name from the blueprint.
 */
export default {
  id: 'ws3-terraform-silo-blueprint-resource-graph',
  badge: 'WORKSTREAM 3.6 • TERRAFORM SILO BLUEPRINT RESOURCE GRAPH',
  title: 'Terraform Blueprint Resource Graph: Provider → Cloud KMS CMEK → VPC-SC Perimeter → Sovereign VPC → Private Air-Gapped GKE (Gemma 3)',
  subtitle: 'main.tf / variables.tf / terraform.tfvars.example • hashicorp/google >= 5.30.0 • terraform init → plan → apply',
  workstreamDir: 'workstream-3-pattern-b-siloed/diagrams',
  topUserTitle: 'Terraform Operator',
  topUserSub: 'init → plan → apply (>= 1.5.0)',
  step1LeftLabel: 'terraform apply',
  step7RightLabel: 'Outputs emitted',
  outerWrapperLabel: 'Terraform Root Module • Pattern B Sovereign Silo (One Workspace per Tenant: tenant_id, tenant_silo_project_id, access_context_policy_id)',
  innerWrapperLabel: 'provider "google" • project = var.tenant_silo_project_id • region = var.region',
  routingHubTitle: 'Provider & Input Variables',
  routingHubSub: 'terraform.tfvars.example → variables.tf → provider "google"',
  routingCards: {
    topLeft: { icon: 'iap_iam_shield', title: 'var.tenant_id', sub: 'default "finvault"' },
    midLeft: { icon: 'cloud_run', title: 'tenant_silo_project', sub: 'cymbal-finvault-silo-prod' },
    botLeft: { icon: 'security_command_center', title: 'access_context_policy', sub: 'ACM policy 998877665544' },
    topRight: { icon: 'load_balancer_cloud_armor', title: 'provider "google"', title2: '>= 5.30.0', sub: 'region us-central1' },
    botRight: { icon: 'cloud_logging', title: 'Outputs', sub: 'cmek_key_id • perimeter' },
    edgeTopLeft: ['Name prefix', 'for resources'],
    edgeMidLeft: ['Project ID &', 'number'],
    edgeBotLeft: ['Perimeter', 'parent policy'],
    step2Left: 'Vars resolved',
    step7Mid: 'State written',
  },
  govHubTitle: 'google_kms_key_ring &',
  govHubTitle2: 'google_kms_crypto_key',
  govCards: {
    top: { icon: 'iap_iam_shield', title: 'tenant_silo_keyring', sub: '${tenant_id}-sovereign-kr' },
    mid: { icon: 'model_armor', title: 'tenant_agent_cmek', sub: 'agent-memory-cmek 90d' },
    bot: { icon: 'cloud_logging', title: 'ENCRYPT_DECRYPT', sub: 'rotation_period 7776000s' },
  },
  midStep3Label: ['Build dependency', 'graph (KMS first)'],
  midStep7Label: ['Outputs: CMEK key', 'ID & perimeter'],
  midGovLabel: ['key_name feeds GKE', 'etcd encryption'],
  leftBoundaryLabel: 'google_access_context_manager_service_perimeter.tenant_sovereign_perimeter',
  leftZoneTitle: 'VPC-SC Perimeter Resources',
  leftZoneSub: 'perimeter_${tenant_id}_sovereign',
  leftCards: {
    modelArmor: { icon: 'security_command_center', title: 'Service Perimeter', sub: 'accessPolicies/${policy}' },
    llm: { icon: 'gemini_agent_platform', title: 'aiplatform & GEAP', sub: 'discoveryengine restricted' },
    runtime: { icon: 'model_armor', title: 'modelarmor & kms', sub: 'restricted_services' },
    mcp: { icon: 'cloud_run', title: 'storage & container', sub: 'restricted_services' },
    datastore: { icon: 'datastore_alloydb_bq', title: 'alloydb & bigquery', sub: 'restricted_services' },
    step4Label: 'Bind project num',
    step6Label: 'Restrict 8 APIs',
    step5Label: ['status.resources', 'projects/${number}'],
    ragLabel: ['Perimeter parent', 'ACM policy ID'],
    toolLabel: ['No egress for', '8 restricted APIs'],
  },
  rightBoundaryLabel: 'google_compute_network / subnetwork / google_container_cluster',
  rightZoneTitle: 'Sovereign VPC & Private GKE',
  rightZoneSub: '${tenant_id}-airgapped-gemma3-gke',
  rightCards: {
    modelArmor: { icon: 'load_balancer_cloud_armor', title: 'tenant_silo_vpc', sub: 'auto_create_subnets=false' },
    llm: { icon: 'gemini_agent_platform', title: 'Gemma 3 (27B IT)', sub: 'Local air-gapped serving' },
    runtime: { icon: 'cloud_run', title: 'GKE Autopilot', sub: 'private nodes + endpoint' },
    mcp: { icon: 'iap_iam_shield', title: 'tenant_silo_subnet', sub: '10.40.0.0/20 PGA on' },
    datastore: { icon: 'datastore_alloydb_bq', title: 'database_encryption', sub: 'key_name = CMEK id' },
    ragLabel: ['master CIDR', '172.16.0.0/28'],
    toolLabel: ['etcd ENCRYPTED', 'with CMEK key'],
  },
};
