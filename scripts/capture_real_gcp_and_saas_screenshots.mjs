#!/usr/bin/env node
/**
 * Real Google Cloud Console, Gemini Enterprise & Live Commercial 3P SaaS Puppeteer Capture Runner
 * ===============================================================================================
 * 1) Auto-discovers & captures EVERY live, signed-in commercial 3P SaaS tab across remote-debugging
 *    Chrome (:9222) and/or tunneled Chrome (:9229) via `capture_verified_ui.mjs` (zero reload, 2880x1620
 *    Retina) across all 10 commercial SaaS platforms (ThoughtSpot, Sigma, ServiceNow, Veeva, Jira,
 *    Salesforce, Databricks, Snowflake, Workday, Datadog, Okta/CrowdStrike).
 * 2) Connects via Puppeteer (puppeteer-core) to `CDP_URL` (tunneled :9229 or local CDP :9222),
 *    waits cleanly for Google SSO sign-in if needed (NEVER bypasses auth), navigates through all
 *    15 real provisioned GCP Console / Gemini Enterprise / Integration Connectors / Marketplace
 *    resources across `ramp-portal-dev` (#248990048888) and `bbar-138hf0` (#48439189383), and
 *    delegates every PNG capture directly to `capture_verified_ui.mjs` into `OUT_DIR`.
 * 3) Runs fail-closed `verify_slide_screenshots.mjs --audience external` (`exit 0`).
 * 4) Supports `--open-marketplace-tabs` to open verified GCP Marketplace Free Trial / PAYG and
 *    official vendor Free Developer signup pages in visible remote-debugging Chrome (:9222) per
 *    `marketplace-saas-demo-provisioning/SKILL.md` Step 3 (zero auth/CAPTCHA/billing bypass).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const HOME_DIR = os.homedir();
const PUPPETEER_PATHS = [
  "puppeteer-core",
  path.join(HOME_DIR, "Documents/videos/node_modules/puppeteer-core"),
  path.join(HOME_DIR, "Documents/trainex/node_modules/puppeteer-core"),
  path.join(HOME_DIR, "Documents/zyvoriq/node_modules/puppeteer-core"),
  path.join(HOME_DIR, "demoes-ge-ci/node_modules/puppeteer-core"),
];

let puppeteer;
for (const p of PUPPETEER_PATHS) {
  try {
    puppeteer = require(p);
    break;
  } catch {}
}
if (!puppeteer) {
  throw new Error("puppeteer-core not found in any expected node_modules directory");
}

const CDP_URL = process.env.CDP_URL || "http://127.0.0.1:9222";
const THOUGHTSPOT_CDP_URL = process.env.THOUGHTSPOT_CDP_URL || "http://127.0.0.1:9222";
const CAPTURE_SCRIPT =
  process.env.CAPTURE_VERIFIED_UI_SCRIPT ||
  path.join(HOME_DIR, ".gemini/config/plugins/real-slide-screenshot-guard/scripts/capture_verified_ui.mjs");
const VERIFY_SCRIPT =
  process.env.VERIFY_SLIDE_SCREENSHOTS_SCRIPT ||
  path.join(HOME_DIR, ".gemini/config/plugins/real-slide-screenshot-guard/scripts/verify_slide_screenshots.mjs");

const args = process.argv.slice(2);
let waitAuthSec = 600;
let onlySlug = "";
let thoughtspotOnly = false;
let openMarketplaceTabs = false;
let outDir =
  process.env.OUT_DIR ||
  path.join(HOME_DIR, "Documents/blogs/screenshots/verified-cloud-console");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--wait-auth-sec" && args[i + 1]) waitAuthSec = Number(args[++i]);
  else if (args[i] === "--only" && args[i + 1]) onlySlug = args[++i].trim();
  else if (args[i] === "--out-dir" && args[i + 1]) outDir = path.resolve(args[++i].trim());
  else if (args[i] === "--thoughtspot-only" || args[i] === "--saas-only") thoughtspotOnly = true;
  else if (args[i] === "--open-marketplace-tabs") openMarketplaceTabs = true;
}

const MANIFEST_PATH = path.join(outDir, "screenshot_provenance.json");

// Official vendor Marketplace / Free Developer signup tabs (Step 3 HITL — zero bypass)
const MARKETPLACE_SIGNUP_TABS = [
  {
    name: "GCP Console — Gemini Enterprise (SSO)",
    match: "gen-app-builder/engines",
    url: "https://console.cloud.google.com/gen-app-builder/engines?project=ramp-portal-dev",
  },
  {
    name: "GCP Marketplace — Snowflake (30-Day Free Trial / PAYG)",
    match: "marketplace/browse?q=Snowflake",
    url: "https://console.cloud.google.com/marketplace/browse?q=Snowflake&project=ramp-portal-dev",
  },
  {
    name: "GCP Marketplace — Databricks (14-Day Free Trial / PAYG)",
    match: "marketplace/browse?q=Databricks",
    url: "https://console.cloud.google.com/marketplace/browse?q=Databricks&project=ramp-portal-dev",
  },
  {
    name: "GCP Marketplace — Datadog (14-Day Free Trial / PAYG)",
    match: "marketplace/browse?q=Datadog",
    url: "https://console.cloud.google.com/marketplace/browse?q=Datadog&project=ramp-portal-dev",
  },
  {
    name: "Sigma Computing — 14-Day Free Trial",
    match: "sigmacomputing.com/free-trial",
    url: "https://www.sigmacomputing.com/free-trial",
  },
  {
    name: "Atlassian Jira Cloud — Free Forever Plan",
    match: "atlassian.com/try/cloud",
    url: "https://www.atlassian.com/try/cloud/signup?bundle=jira-software",
  },
  {
    name: "ServiceNow — Free Personal Developer Instance (PDI)",
    match: "developer.servicenow.com",
    url: "https://developer.servicenow.com/dev.do",
  },
  {
    name: "Salesforce — Free Developer Edition",
    match: "developer.salesforce.com/signup",
    url: "https://developer.salesforce.com/signup",
  },
  {
    name: "Okta — Free Integrator / Developer Plan",
    match: "developer.okta.com/signup",
    url: "https://developer.okta.com/signup/",
  },
  {
    name: "CrowdStrike Falcon — 15-Day Free Trial",
    match: "crowdstrike.com/en-us/free-trial",
    url: "https://www.crowdstrike.com/en-us/free-trial/",
  },
];

// Commercial 3P SaaS live tab discovery rules (matches ONLY genuine authenticated tenant sessions)
const SAAS_LOGIN_PATH_RE =
  /(?:\/login|\/signin|\/sign-in|\/signup|\/sign-up|\/register|\/free-trial|\/try\/cloud|\/oauth2\/authorize|\/ServiceLogin|\/v3\/signin|\/dev\.do$)/i;

const EXTRA_VENDOR_ALLOW_HOST_RE = [
  /^[a-z0-9-]+\.gcp\.databricks\.com$/i,
  /^falcon(?:\.[a-z0-9-]+)?\.crowdstrike\.com$/i,
];

const COMMERCIAL_SAAS_TARGETS = [
  {
    id: "saas_01_thoughtspot_liveboard",
    provider: "ThoughtSpot Cloud SaaS",
    matchFn: (u) => u.includes("thoughtspot.cloud") && u.includes("insights/pinboard"),
    dismissModal: true,
    note: "Real ThoughtSpot Cloud Liveboard on team2.thoughtspot.cloud",
  },
  {
    id: "saas_02_thoughtspot_saved_answer",
    provider: "ThoughtSpot Cloud SaaS",
    matchFn: (u) => u.includes("thoughtspot.cloud") && u.includes("saved-answer"),
    dismissModal: false,
    note: "Real ThoughtSpot Cloud Saved Answer analytics query on team2.thoughtspot.cloud",
  },
  {
    id: "saas_03_sigma_workbook",
    provider: "Sigma Computing SaaS",
    matchFn: (u) => /^https:\/\/app\.sigmacomputing\.com\//i.test(u) && !SAAS_LOGIN_PATH_RE.test(u),
    note: "Real commercial Sigma Computing Cloud BI Workbook (app.sigmacomputing.com)",
  },
  {
    id: "saas_04_servicenow_itsm",
    provider: "ServiceNow ITSM SaaS",
    matchFn: (u) => /^https:\/\/[a-z0-9-]+\.service-now\.com\//i.test(u) && !SAAS_LOGIN_PATH_RE.test(u),
    note: "Real commercial ServiceNow ITSM live workspace (*.service-now.com)",
  },
  {
    id: "saas_05_veeva_vault",
    provider: "Veeva Vault RIM SaaS",
    matchFn: (u) => /^https:\/\/[a-z0-9-]+\.veevavault\.com\//i.test(u) && !SAAS_LOGIN_PATH_RE.test(u),
    note: "Real commercial Veeva Vault RIM live workspace (*.veevavault.com)",
  },
  {
    id: "saas_06_atlassian_jira_confluence",
    provider: "Atlassian Jira & Confluence Cloud",
    matchFn: (u) => /^https:\/\/[a-z0-9-]+\.(?:atlassian\.net|jira\.com)\//i.test(u) && !SAAS_LOGIN_PATH_RE.test(u),
    note: "Real commercial Atlassian Jira / Confluence Cloud workspace (*.atlassian.net)",
  },
  {
    id: "saas_07_salesforce_crm",
    provider: "Salesforce CRM Cloud",
    matchFn: (u) =>
      /^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)?\.(?:lightning\.force|my\.salesforce)\.com\//i.test(u) &&
      !SAAS_LOGIN_PATH_RE.test(u),
    note: "Real commercial Salesforce Lightning CRM workspace (*.lightning.force.com)",
  },
  {
    id: "saas_08_databricks_unity",
    provider: "Databricks Data Intelligence SaaS",
    matchFn: (u) =>
      /^https:\/\/[a-z0-9-]+\.(?:cloud|gcp)\.databricks\.com\//i.test(u) && !SAAS_LOGIN_PATH_RE.test(u),
    note: "Real commercial Databricks Unity Catalog workspace (*.databricks.com)",
  },
  {
    id: "saas_09_snowflake_cortex",
    provider: "Snowflake AI Data Cloud SaaS",
    matchFn: (u) =>
      /^https:\/\/(?:app\.snowflake\.com|[a-z0-9_.-]+\.snowflakecomputing\.com)\//i.test(u) &&
      !SAAS_LOGIN_PATH_RE.test(u),
    note: "Real commercial Snowflake Snowsight & Cortex workspace (app.snowflake.com)",
  },
  {
    id: "saas_10_workday_raas",
    provider: "Workday Enterprise Cloud",
    matchFn: (u) =>
      /^https:\/\/[a-z0-9-]+\.(?:myworkday|workday)\.com\//i.test(u) && !SAAS_LOGIN_PATH_RE.test(u),
    note: "Real commercial Workday Enterprise HCM & RaaS workspace (*.myworkday.com)",
  },
  {
    id: "saas_11_datadog_sre",
    provider: "Datadog Cloud Observability SaaS",
    matchFn: (u) =>
      /^https:\/\/(?:app|[a-z0-9-]+)\.datadoghq\.(?:com|eu)\//i.test(u) && !SAAS_LOGIN_PATH_RE.test(u),
    note: "Real commercial Datadog APM & Bits AI SRE workspace (app.datadoghq.com)",
  },
  {
    id: "saas_12_okta_crowdstrike",
    provider: "Okta / CrowdStrike Falcon SaaS",
    matchFn: (u) =>
      (/^https:\/\/[a-z0-9-]+\.(?:okta|oktapreview)\.com\/admin/i.test(u) ||
        /^https:\/\/falcon(?:\.[a-z0-9-]+)?\.crowdstrike\.com\//i.test(u)) &&
      !SAAS_LOGIN_PATH_RE.test(u),
    note: "Real commercial Okta Admin / CrowdStrike Falcon Console",
  },
];

const GCP_TARGETS = [
  {
    id: "gcp_ws1_01_gemini_enterprise_agent_hub",
    blog: "ws1",
    url: "https://console.cloud.google.com/gen-app-builder/engines?project=ramp-portal-dev",
    markers: ["Cymbal Multi-Tenant", "MCP OAuth 2.1", "Apps", "Engines"],
    note: "Real GCP Console Gemini Enterprise — Cymbal Multi-Tenant Enterprise Agent Hub (ramp-portal-dev)",
  },
  {
    id: "gcp_ws1_02_cloud_armor_waf_hop1",
    blog: "ws1",
    url: "https://console.cloud.google.com/net-security/securitypolicies/details/cymbal-pooled-edge-waf?project=bbar-138hf0",
    markers: ["cymbal-pooled-edge-waf", "Rules", "Cloud Armor"],
    note: "Real GCP Cloud Armor Hop 1 Edge WAF Policy cymbal-pooled-edge-waf (bbar-138hf0)",
  },
  {
    id: "gcp_ws1_03_model_armor_firewall_hop4",
    blog: "ws1",
    url: "https://console.cloud.google.com/security/model-armor/templates?project=ramp-portal-dev",
    markers: ["ge-zero-trust-ai-firewall", "Model Armor", "Templates"],
    note: "Real GCP Model Armor Hop 4 Prompt-Injection & Safety Firewall Templates (ramp-portal-dev)",
  },
  {
    id: "gcp_ws2_01_bigquery_pooled_rls_finops",
    blog: "ws2",
    url: "https://console.cloud.google.com/bigquery?project=bbar-138hf0&ws=!1m4!1m3!3m2!1sbbar-138hf0!2scymbal_agentic_finops_otel",
    markers: ["cymbal_agentic_finops_otel", "pattern_a_pooled_rls_entities", "BigQuery"],
    note: "Real GCP BigQuery Pattern A Pooled RLS & FinOps Telemetry Dataset cymbal_agentic_finops_otel (bbar-138hf0)",
  },
  {
    id: "gcp_ws2_02_cloud_run_pooled_services",
    blog: "ws2",
    url: "https://console.cloud.google.com/run?project=bbar-138hf0",
    markers: ["cymbal-multi-tenant-patterns", "mcp-oauth21-obo-gateway", "Cloud Run"],
    note: "Real GCP Cloud Run Multi-Tenant Runtime & MCP OAuth 2.1 OBO Gateway Services (bbar-138hf0)",
  },
  {
    id: "gcp_ws2_03_secret_manager_hop2",
    blog: "ws2",
    url: "https://console.cloud.google.com/security/secret-manager?project=bbar-138hf0",
    markers: ["aws-cognito-agentcore-config", "mcp-oauth21-rsa-private-pem", "Secret Manager"],
    note: "Real GCP Secret Manager Hop 2 OAuth2.1 & Cross-Cloud AgentCore Secrets (bbar-138hf0)",
  },
  {
    id: "gcp_ws3_01_cloud_kms_cmek_killswitch",
    blog: "ws3",
    url: "https://console.cloud.google.com/security/kms/keyring/manage/us-west1/cymbal-multi-tenant-kr/key?project=bbar-138hf0",
    markers: ["medcore-revoked-cmek", "finvault-silo-cmek", "adk-agent-signing-key"],
    note: "Real GCP Cloud KMS Pattern B CMEK Keyring cymbal-multi-tenant-kr with Live Disabled medcore-revoked-cmek Kill-Switch (bbar-138hf0)",
  },
  {
    id: "gcp_ws3_02_bigquery_sovereign_silo_vaults",
    blog: "ws3",
    url: "https://console.cloud.google.com/bigquery?project=bbar-138hf0&ws=!1m4!1m3!3m2!1sbbar-138hf0!2scymbal_silo_finvault_usw1",
    markers: ["cymbal_silo_finvault_usw1", "pattern_b_silo_finvault_cmek_vault", "BigQuery"],
    note: "Real GCP BigQuery Pattern B Sovereign Silo CMEK Vaults cymbal_silo_finvault_usw1 (bbar-138hf0)",
  },
  {
    id: "gcp_ws3_03_model_armor_silo_obo",
    blog: "ws3",
    url: "https://console.cloud.google.com/security/model-armor/templates?project=bbar-138hf0",
    markers: ["mcp-oauth21-obo-armor", "Model Armor", "Templates"],
    note: "Real GCP Model Armor Sovereign Silo Template mcp-oauth21-obo-armor (bbar-138hf0)",
  },
  {
    id: "gcp_ws4_01_vpc_hub_psc_nat",
    blog: "ws4",
    url: "https://console.cloud.google.com/networking/networks/details/cymbal-pattern-c-hub-vpc?project=ramp-portal-dev",
    markers: ["cymbal-psc-nat-us-west1", "cymbal-pattern-c-hub-vpc", "Subnets"],
    note: "Real GCP VPC Pattern C Hub Network cymbal-pattern-c-hub-vpc & Private Service Connect NAT Subnet (ramp-portal-dev)",
  },
  {
    id: "gcp_ws4_02_vpc_finvault_spoke",
    blog: "ws4",
    url: "https://console.cloud.google.com/networking/networks/details/cymbal-pattern-c-finvault-spoke-vpc?project=bbar-138hf0",
    markers: ["cymbal-finvault-spoke-us-west1", "cymbal-pattern-c-finvault-spoke-vpc", "Subnets"],
    note: "Real GCP VPC Pattern C Sovereign Spoke Network cymbal-pattern-c-finvault-spoke-vpc (bbar-138hf0)",
  },
  {
    id: "gcp_ws4_03_cloud_logging_audit_trail",
    blog: "ws4",
    url: "https://console.cloud.google.com/logs/query;query=resource.type%3D%22cloud_run_revision%22;duration=P7D?project=bbar-138hf0",
    markers: ["Logs Explorer", "Query", "cloud_run_revision"],
    note: "Real GCP Cloud Logging Multi-Tenant Audit Trail (bbar-138hf0)",
  },
  {
    id: "gcp_atlas_01_cloud_run_a2a_gateway_hub",
    blog: "ws5",
    url: "https://console.cloud.google.com/run?project=ramp-portal-dev",
    markers: ["a2a-gateway", "cymbal-multi-tenant-patterns", "Cloud Run"],
    note: "Real GCP Cloud Run Hub Services — a2a-gateway, a2a-ge-orchestrator & cymbal-multi-tenant-patterns (ramp-portal-dev)",
  },
  {
    id: "gcp_atlas_02_cloud_marketplace_thoughtspot",
    blog: "ws5",
    url: "https://console.cloud.google.com/marketplace/product/thoughtspot-public/thoughtspot-enterprise-saas-gcp?project=ramp-portal-dev",
    markers: ["ThoughtSpot", "Marketplace", "Cloud"],
    note: "Real Google Cloud Marketplace Listing — ThoughtSpot Enterprise SaaS (ramp-portal-dev)",
  },
  {
    id: "gcp_atlas_03_integration_connectors_catalog",
    blog: "ws5",
    url: "https://console.cloud.google.com/integration-connectors/connections?project=ramp-portal-dev",
    markers: ["Integration Connectors", "Connections", "Connector"],
    note: "Real Google Cloud Integration Connectors Console for Enterprise SaaS Connectors (Workday, ServiceNow, Salesforce, Snowflake, Veeva)",
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForCdpEndpoint(url, maxMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${url}/json/version`);
      if (res.ok) return await res.json();
    } catch {}
    await sleep(500);
  }
  throw new Error(`CDP endpoint ${url} did not become reachable within ${maxMs}ms`);
}

async function listCdpTargets(url) {
  const res = await fetch(`${url}/json/list`);
  if (!res.ok) throw new Error(`CDP /json/list HTTP ${res.status}`);
  return res.json();
}

function isAuthUrl(u) {
  return /(?:accounts\.google\.com|login\.corp\.google\.com|\/ServiceLogin|\/v3\/signin)/i.test(String(u || ""));
}

async function openMarketplaceAndSignupTabs() {
  const ver = await waitForCdpEndpoint(THOUGHTSPOT_CDP_URL, 15000);
  console.log(`🔌 Connected to visible Cloudtop Chrome at ${THOUGHTSPOT_CDP_URL} (${ver.Browser || "Chrome"})`);
  const browser = await puppeteer.connect({ browserURL: THOUGHTSPOT_CDP_URL, defaultViewport: null });
  try {
    const pages = await browser.pages();
    const existingUrls = pages.map((p) => p.url());
    let opened = 0;
    for (const tab of MARKETPLACE_SIGNUP_TABS) {
      const already = existingUrls.some((u) => u.includes(tab.match));
      if (already) {
        console.log(`  ✓ Already open: ${tab.name}`);
        continue;
      }
      const p = await browser.newPage();
      await p.goto(tab.url, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
      console.log(`  🌐 Opened tab: ${tab.name} -> ${tab.url}`);
      opened++;
    }
    // Focus the GCP Console SSO tab first so the user sees the 1-tap sign-in immediately
    const finalPages = await browser.pages();
    const gcpTab = finalPages.find(
      (p) => p.url().includes("gen-app-builder/engines") || isAuthUrl(p.url())
    );
    if (gcpTab) await gcpTab.bringToFront().catch(() => {});
    console.log(`\n✅ Marketplace & Free-Trial tabs ready in live browser (${opened} newly opened).`);
    const vncHost = process.env.CLOUDTOP_HOST || os.hostname();
    console.log(`   👉 Open http://${vncHost}:8080 to complete SSO & any Free Trial signups.`);
  } finally {
    await browser.disconnect();
  }
}

async function waitForPageReady(page, markers, maxMs = 35000) {
  const start = Date.now();
  let authSeenSince = 0;
  while (Date.now() - start < maxMs) {
    const curUrl = page.url();
    if (isAuthUrl(curUrl)) {
      if (!authSeenSince) authSeenSince = Date.now();
      if (Date.now() - authSeenSince > 9000) {
        throw new Error(`AUTH_WALL:${curUrl}`);
      }
      await sleep(1000);
      continue;
    }
    authSeenSince = 0;
    try {
      const state = await page.evaluate((expected) => {
        const text = (document.body && document.body.innerText) || "";
        const matched = expected.some((m) => text.toLowerCase().includes(m.toLowerCase()));
        const spinners = document.querySelectorAll(
          'mat-spinner, mat-progress-spinner, [role="progressbar"][aria-valuetext*="Loading" i], .cfc-progress-spinner'
        ).length;
        return { matched, len: text.trim().length, spinners };
      }, markers);
      if (state.matched && state.len > 200 && state.spinners === 0) {
        await sleep(1800);
        return true;
      }
    } catch {
      // Page may still be navigating
    }
    await sleep(1000);
  }
  await sleep(1800);
  return false;
}

async function dismissThoughtSpotOverlayModalIfOpen(cdpEndpoint, tabMatch) {
  let tsBrowser;
  try {
    tsBrowser = await puppeteer.connect({ browserURL: cdpEndpoint, defaultViewport: null });
    const pages = await tsBrowser.pages();
    const targetPage = pages.find(
      (p) => p.url().includes("thoughtspot.cloud") && p.url().includes(tabMatch)
    );
    if (!targetPage) return;
    await targetPage.bringToFront();
    const clicked = await targetPage.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"], .ant-modal, [class*="modal" i]');
      if (!dialog) return false;
      const btns = Array.from(dialog.querySelectorAll("button"));
      const doneBtn = btns.find((b) => /^(done|close|dismiss)$/i.test((b.textContent || "").trim()));
      if (doneBtn) {
        doneBtn.click();
        return true;
      }
      return false;
    });
    if (clicked) {
      console.log(`   🧹 Dismissed ThoughtSpot modal popup on "${tabMatch}" via native Done/Close button`);
      await sleep(1000);
    }
    const closedChecklist = await targetPage.evaluate(() => {
      const text = (document.body && document.body.innerText) || "";
      if (!text.includes("Make Better Decisions with Dashboards")) return false;
      const btns = Array.from(document.querySelectorAll("button, [role='button']"));
      const toggle = btns.find((b) => /explore more features/i.test((b.textContent || "").trim()));
      if (toggle) {
        toggle.click();
        return true;
      }
      return false;
    });
    if (closedChecklist) {
      console.log(`   🧹 Collapsed ThoughtSpot onboarding checklist popover on "${tabMatch}"`);
      await sleep(900);
    }
  } catch (err) {
    console.warn(`   ⚠️ Modal check skipped on "${tabMatch}": ${err.message}`);
  } finally {
    if (tsBrowser) {
      try {
        tsBrowser.disconnect();
      } catch {}
    }
  }
}

async function captureLiveCommercialSaaSTabs(extraAllowOrigins) {
  const endpoints = Array.from(new Set([THOUGHTSPOT_CDP_URL, CDP_URL]));
  const discovered = [];
  for (const ep of endpoints) {
    try {
      const tabs = await listCdpTargets(ep);
      for (const t of tabs) {
        if (t.type === "page" && t.url && t.url.startsWith("https://")) {
          discovered.push({ ep, tab: t });
        }
      }
    } catch (err) {
      console.warn(`⚠️ CDP (${ep}) unreachable while scanning live SaaS tabs: ${err.message}`);
    }
  }

  let captured = 0;
  for (const spec of COMMERCIAL_SAAS_TARGETS) {
    const hit = discovered.find(({ tab }) => spec.matchFn(String(tab.url || "")));
    if (!hit) continue;

    const tabUrl = String(hit.tab.url || "");
    const host = new URL(tabUrl).hostname.toLowerCase();
    const needsAllowOrigin = EXTRA_VENDOR_ALLOW_HOST_RE.some((re) => re.test(host));
    if (needsAllowOrigin) extraAllowOrigins.add(host);

    if (spec.dismissModal) {
      await dismissThoughtSpotOverlayModalIfOpen(hit.ep, "insights/pinboard");
    }

    const outPng = path.join(outDir, `${spec.id}.png`);
    console.log(`\n📸 [${spec.provider.toUpperCase()}] Capturing live tab ${hit.tab.id} -> ${spec.id}.png (${host})`);
    const cliArgs = [
      CAPTURE_SCRIPT,
      "--cdp",
      hit.ep,
      "--target-id",
      hit.tab.id,
      "--viewport",
      "1440x810",
      "--dpr",
      "2",
      "--wait-ms",
      "900",
      "--out",
      outPng,
      "--manifest",
      MANIFEST_PATH,
      "--audience",
      "external",
      "--note",
      spec.note,
    ];
    if (needsAllowOrigin) {
      cliArgs.push("--allow-origin", host);
    }
    try {
      const out = execFileSync(process.execPath, cliArgs, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
      const parsed = JSON.parse(out.trim());
      console.log(`   ✅ Captured ${spec.id}.png (${parsed.width}x${parsed.height}, sha256=${parsed.sha256.slice(0, 12)})`);
      captured++;
    } catch (err) {
      console.warn(`   ⚠️ Skipped ${spec.id} (${host}): ${String(err.stderr || err.message || err).trim().slice(0, 220)}`);
    }
  }
  return captured;
}

function runFailClosedVerify(extraAllowOrigins) {
  console.log(`\n🔐 Running fail-closed verify_slide_screenshots.mjs --audience external...`);
  const verifyArgs = [VERIFY_SCRIPT, "--manifest", MANIFEST_PATH, "--dir", outDir, "--audience", "external"];
  if (extraAllowOrigins.size > 0) {
    verifyArgs.push("--allow-origin", Array.from(extraAllowOrigins).join(","));
  }
  const verOut = execFileSync(process.execPath, verifyArgs, { encoding: "utf8" });
  console.log(verOut.trim());
}

async function main() {
  if (openMarketplaceTabs) {
    await openMarketplaceAndSignupTabs();
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  console.log(`📁 Output directory: ${outDir}`);
  const extraAllowOrigins = new Set();

  // Step 1: Auto-discover & capture ALL live authenticated commercial 3P SaaS tabs (zero reload)
  const saasCount = await captureLiveCommercialSaaSTabs(extraAllowOrigins);
  console.log(`✅ Live Commercial 3P SaaS captures complete: ${saasCount} tab(s) captured`);

  if (thoughtspotOnly) {
    runFailClosedVerify(extraAllowOrigins);
    return;
  }

  // Step 2: Capture all 15 live Google Cloud Console & Gemini Enterprise views
  const ver = await waitForCdpEndpoint(CDP_URL, 20000);
  console.log(`\n🔌 Connected to Chrome CDP at ${CDP_URL} (${ver.Browser || "Chrome"})`);

  const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });

  try {
    const pages = await browser.pages();
    let capturePage =
      pages.find((p) => {
        const u = p.url();
        return u.includes("console.cloud.google.com") && !u.includes("/marketplace/");
      }) ||
      pages.find((p) => isAuthUrl(p.url()) && (p.url().includes("cloudconsole") || p.url().includes("console.cloud.google.com"))) ||
      pages.find((p) => {
        const u = p.url();
        return u === "about:blank" || u.startsWith("chrome://newtab");
      });

    if (!capturePage) {
      capturePage = await browser.newPage();
    }
    await capturePage.bringToFront().catch(() => {});
    if (!isAuthUrl(capturePage.url()) && !capturePage.url().startsWith("https://console.cloud.google.com/")) {
      await capturePage.goto(GCP_TARGETS[0].url, { waitUntil: "domcontentloaded", timeout: 35000 }).catch(() => {});
      await sleep(3000);
    }

    // Wait cleanly if Google SSO sign-in is required (Interactive Setup Mode — never bypasses auth)
    const deadline = Date.now() + waitAuthSec * 1000;
    let announced = false;
    while (true) {
      const curUrl = capturePage.url();
      if (
        curUrl.startsWith("https://console.cloud.google.com/") &&
        !curUrl.includes("/marketplace/") &&
        !isAuthUrl(curUrl)
      ) {
        await sleep(2000);
        if (!isAuthUrl(capturePage.url()) && capturePage.url().startsWith("https://console.cloud.google.com/")) {
          console.log(`✅ Google Cloud Console authenticated: ${capturePage.url()}`);
          break;
        }
      }
      if (Date.now() >= deadline) {
        console.error(`❌ Timed out waiting ${waitAuthSec}s for Google Cloud Console sign-in (current URL: ${curUrl})`);
        process.exit(2);
      }
      if (!announced) {
        const isTunnel = CDP_URL.includes(":9229");
        console.log("========================================================================");
        console.log("🛑 PUPPETEER WAITING FOR GOOGLE CLOUD CONSOLE SIGN-IN");
        if (isTunnel) {
          console.log("   👉 Sign into Google Cloud Console in the Chrome window on your Mac");
          console.log("      (tap your security key when prompted). Puppeteer starts automatically!");
        } else {
          const vncHost = process.env.CLOUDTOP_HOST || os.hostname();
          console.log(`   👉 Open http://${vncHost}:8080 and complete Google SSO.`);
        }
        console.log(`   Polling every 2s (timeout: ${waitAuthSec}s)...`);
        console.log("========================================================================");
        announced = true;
      }
      await sleep(2000);
    }

    await capturePage.setViewport({ width: 1440, height: 810, deviceScaleFactor: 2 });

    const runList = onlySlug ? GCP_TARGETS.filter((t) => t.id.includes(onlySlug) || t.blog === onlySlug) : GCP_TARGETS;
    const results = [];
    const failed = [];

    for (const item of runList) {
      const outPng = path.join(outDir, `${item.id}.png`);
      let ok = false;
      let lastErr = "";

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(
            `\n📸 [${item.blog.toUpperCase()}] (${results.length + failed.length + 1}/${runList.length}, try ${attempt}) ${item.id}`
          );
          console.log(`   URL: ${item.url}`);
          await capturePage.goto(item.url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
          await sleep(2800);
          const ready = await waitForPageReady(capturePage, item.markers, 35000);
          console.log(`   DOM settled (markerMatched=${ready}), invoking capture_verified_ui.mjs...`);

          const cdpTargets = await listCdpTargets(CDP_URL);
          const curHref = capturePage.url();
          const targetId =
            capturePage.target()._targetId ||
            (cdpTargets.find((t) => t.url === curHref) ||
              cdpTargets.find((t) => String(t.url || "").startsWith("https://console.cloud.google.com/")) ||
              {}).id;
          if (!targetId) {
            throw new Error(`Could not resolve CDP targetId for ${item.id}`);
          }

          const out = execFileSync(
            process.execPath,
            [
              CAPTURE_SCRIPT,
              "--cdp",
              CDP_URL,
              "--target-id",
              targetId,
              "--viewport",
              "1440x810",
              "--dpr",
              "2",
              "--wait-ms",
              "1400",
              "--out",
              outPng,
              "--manifest",
              MANIFEST_PATH,
              "--audience",
              "external",
              "--note",
              item.note,
            ],
            { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
          );
          const parsed = JSON.parse(out.trim());
          console.log(
            `   ✅ Captured ${item.id}.png (${parsed.width}x${parsed.height}, sha256=${parsed.sha256.slice(0, 12)})`
          );
          results.push({ id: item.id, blog: item.blog, status: "OK", sha256: parsed.sha256, outPng });
          ok = true;
          break;
        } catch (err) {
          lastErr = String(err.stderr || err.message || err).trim();
          console.warn(`   ⚠️ Attempt ${attempt} failed for ${item.id}: ${lastErr.slice(0, 260)}`);
          if (attempt < 2) await sleep(3500);
        }
      }
      if (!ok) {
        failed.push({ id: item.id, error: lastErr });
      }
    }

    if (failed.length > 0) {
      console.error(`\n❌ ${failed.length}/${runList.length} target(s) failed capture:`);
      for (const f of failed) console.error(`  - ${f.id}: ${f.error.slice(0, 280)}`);
      process.exit(1);
    }

    runFailClosedVerify(extraAllowOrigins);
    console.log(
      `\n🎉 ALL ${results.length} LIVE GOOGLE CLOUD CONSOLE + ${saasCount} COMMERCIAL 3P SAAS SCREENSHOTS CAPTURED & VERIFIED!`
    );
  } finally {
    await browser.disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Puppeteer live capture failed:", err.message || err);
  process.exit(1);
});
