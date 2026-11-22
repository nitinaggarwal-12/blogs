#!/usr/bin/env node
/**
 * Grounded, Non-PII Commercial SaaS Seeding & Preflight Verification Helper
 * for Blogs 2, 3, and 5 Meet Recordings:
 *   --saas snowflake  (Blog 2 / SAAS-07: ROLE_TENANT_MAP + TENANT_ISOLATION_RAP)
 *   --saas okta       (Blog 3 / SAAS-10a: DPoP OIDC app + live invalid_dpop_proof event)
 *   --saas datadog    (Blog 5 / SAAS-09: Verbatim BigQuery otel_finops_chargeback export)
 *   --print-snowflake-sql  (prints exact non-PII Snowflake SQL for Snowsight execution)
 *   --revoke-env      (securely deletes temporary /tmp/blogs_saas_seed.env after teardown)
 *
 * Security:
 * - Reads API credentials ONLY from out-of-repo chmod 0600 scratch file
 *   (process.env.BLOGS_SAAS_SEED_ENV || "/tmp/blogs_saas_seed.env").
 * - Never prints, logs, or commits tokens/keys.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_ENV_FILE = process.env.BLOGS_SAAS_SEED_ENV || "/tmp/blogs_saas_seed.env";
const GCP_HUB_PROJECT = "cymbal-ge-hub-2026";
const GCP_DEMO_ACCOUNT = "admin@nitinagga.altostrat.com";

function loadScratchEnv(envPath = DEFAULT_ENV_FILE) {
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  const st = fs.statSync(envPath);
  if ((st.mode & 0o077) !== 0) {
    fs.chmodSync(envPath, 0o600);
  }
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endswith?.('"')) || (v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

export const SNOWFLAKE_SEED_SQL = `
CREATE DATABASE IF NOT EXISTS CYMBAL_POOLED_DEMO;
USE DATABASE CYMBAL_POOLED_DEMO;
USE SCHEMA PUBLIC;

CREATE OR REPLACE TABLE POOLED_AGENT_ENTITIES (
  tenant_id STRING,
  entity_id STRING,
  classification STRING,
  summary STRING
);

INSERT INTO POOLED_AGENT_ENTITIES VALUES
  ('finvault', 'ENT-FV-1001', 'REGULATED_WIRE', 'FinVault FedWire settlement latency runbook'),
  ('finvault', 'ENT-FV-1003', 'OCC_AUDIT', 'FinVault OCC quarterly ledger reconciliation'),
  ('retailstream', 'ENT-RS-2001', 'COMMERCE_OPS', 'RetailStream checkout API spike diagnostics'),
  ('retailstream', 'ENT-RS-2002', 'INVENTORY_SYNC', 'RetailStream regional warehouse sync alert'),
  ('globex', 'ENT-GX-3001', 'SUPPLY_CHAIN', 'Globex logistics customs delay triage'),
  ('globex', 'ENT-GX-3002', 'FLEET_ROUTING', 'Globex telemetry route optimization'),
  ('medcore', 'ENT-MC-4001', 'CLINICAL_OPS', 'MedCore batch validation schedule');

CREATE ROLE IF NOT EXISTS ROLE_CYMBAL_ADMIN;
CREATE ROLE IF NOT EXISTS ROLE_CYMBAL_FINVAULT;
CREATE ROLE IF NOT EXISTS ROLE_CYMBAL_RETAILSTREAM;

SET MY_USER = CURRENT_USER();
GRANT ROLE ROLE_CYMBAL_ADMIN TO USER IDENTIFIER($MY_USER);
GRANT ROLE ROLE_CYMBAL_FINVAULT TO USER IDENTIFIER($MY_USER);
GRANT ROLE ROLE_CYMBAL_RETAILSTREAM TO USER IDENTIFIER($MY_USER);

GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE ROLE_CYMBAL_ADMIN;
GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE ROLE_CYMBAL_FINVAULT;
GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE ROLE_CYMBAL_RETAILSTREAM;
GRANT USAGE ON DATABASE CYMBAL_POOLED_DEMO TO ROLE ROLE_CYMBAL_ADMIN;
GRANT USAGE ON DATABASE CYMBAL_POOLED_DEMO TO ROLE ROLE_CYMBAL_FINVAULT;
GRANT USAGE ON DATABASE CYMBAL_POOLED_DEMO TO ROLE ROLE_CYMBAL_RETAILSTREAM;
GRANT USAGE ON SCHEMA CYMBAL_POOLED_DEMO.PUBLIC TO ROLE ROLE_CYMBAL_ADMIN;
GRANT USAGE ON SCHEMA CYMBAL_POOLED_DEMO.PUBLIC TO ROLE ROLE_CYMBAL_FINVAULT;
GRANT USAGE ON SCHEMA CYMBAL_POOLED_DEMO.PUBLIC TO ROLE ROLE_CYMBAL_RETAILSTREAM;
GRANT SELECT ON TABLE CYMBAL_POOLED_DEMO.PUBLIC.POOLED_AGENT_ENTITIES TO ROLE ROLE_CYMBAL_ADMIN;
GRANT SELECT ON TABLE CYMBAL_POOLED_DEMO.PUBLIC.POOLED_AGENT_ENTITIES TO ROLE ROLE_CYMBAL_FINVAULT;
GRANT SELECT ON TABLE CYMBAL_POOLED_DEMO.PUBLIC.POOLED_AGENT_ENTITIES TO ROLE ROLE_CYMBAL_RETAILSTREAM;

CREATE OR REPLACE TABLE ROLE_TENANT_MAP (
  role_name STRING,
  tenant_id STRING
);

INSERT INTO ROLE_TENANT_MAP VALUES
  ('ROLE_CYMBAL_FINVAULT', 'finvault'),
  ('ROLE_CYMBAL_RETAILSTREAM', 'retailstream');

GRANT SELECT ON TABLE CYMBAL_POOLED_DEMO.PUBLIC.ROLE_TENANT_MAP TO ROLE ROLE_CYMBAL_ADMIN;
GRANT SELECT ON TABLE CYMBAL_POOLED_DEMO.PUBLIC.ROLE_TENANT_MAP TO ROLE ROLE_CYMBAL_FINVAULT;
GRANT SELECT ON TABLE CYMBAL_POOLED_DEMO.PUBLIC.ROLE_TENANT_MAP TO ROLE ROLE_CYMBAL_RETAILSTREAM;

CREATE OR REPLACE ROW ACCESS POLICY TENANT_ISOLATION_RAP
AS (tenant_col STRING) RETURNS BOOLEAN ->
  CURRENT_ROLE() IN ('ACCOUNTADMIN', 'ROLE_CYMBAL_ADMIN')
  OR EXISTS (
    SELECT 1
    FROM CYMBAL_POOLED_DEMO.PUBLIC.ROLE_TENANT_MAP m
    WHERE m.role_name = CURRENT_ROLE()
      AND m.tenant_id = tenant_col
  );

ALTER TABLE CYMBAL_POOLED_DEMO.PUBLIC.POOLED_AGENT_ENTITIES
  ADD ROW ACCESS POLICY TENANT_ISOLATION_RAP ON (tenant_id);
`.trim();

async function seedSnowflake(env) {
  const accountUrl = (env.SNOWFLAKE_ACCOUNT_URL || process.env.SNOWFLAKE_ACCOUNT_URL || "").replace(/\/$/, "");
  const pat = env.SNOWFLAKE_PAT || process.env.SNOWFLAKE_PAT || "";
  if (!accountUrl || !pat) {
    throw new Error("Missing SNOWFLAKE_ACCOUNT_URL or SNOWFLAKE_PAT in scratch env.");
  }
  const statements = SNOWFLAKE_SEED_SQL.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    const resp = await fetch(`${accountUrl}/api/v2/statements`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Snowflake-Authorization-Token-Type": "PROGRAMMATIC_ACCESS_TOKEN"
      },
      body: JSON.stringify({
        statement: `${stmt};`,
        warehouse: env.SNOWFLAKE_WAREHOUSE || "COMPUTE_WH",
        role: env.SNOWFLAKE_ADMIN_ROLE || "ACCOUNTADMIN"
      })
    });
    if (!resp.ok) {
      const errTxt = await resp.text();
      throw new Error(`Snowflake SQL statement failed (${resp.status}): ${errTxt.slice(0, 300)}`);
    }
  }

  // Fail-closed preflight verification: ADMIN=7, RETAILSTREAM=2
  const runCount = async role => {
    const r = await fetch(`${accountUrl}/api/v2/statements`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Snowflake-Authorization-Token-Type": "PROGRAMMATIC_ACCESS_TOKEN"
      },
      body: JSON.stringify({
        statement: "SELECT COUNT(*) FROM CYMBAL_POOLED_DEMO.PUBLIC.POOLED_AGENT_ENTITIES;",
        warehouse: env.SNOWFLAKE_WAREHOUSE || "COMPUTE_WH",
        role
      })
    });
    const j = await r.json();
    return Number(j?.data?.[0]?.[0] ?? -1);
  };
  const adminCount = await runCount("ROLE_CYMBAL_ADMIN");
  const rsCount = await runCount("ROLE_CYMBAL_RETAILSTREAM");
  if (adminCount !== 7 || rsCount !== 2) {
    throw new Error(`Snowflake preflight mismatch: ROLE_CYMBAL_ADMIN=${adminCount} (expect 7), ROLE_CYMBAL_RETAILSTREAM=${rsCount} (expect 2)`);
  }
  console.log(`✅ [Snowflake] Seeded & verified: ROLE_CYMBAL_ADMIN=${adminCount} rows, ROLE_CYMBAL_RETAILSTREAM=${rsCount} rows (TENANT_ISOLATION_RAP active).`);
  return { ok: true, adminCount, rsCount };
}

async function seedOkta(env) {
  const orgUrl = (env.OKTA_ORG_URL || process.env.OKTA_ORG_URL || "").replace(/\/$/, "");
  const token = env.OKTA_API_TOKEN || process.env.OKTA_API_TOKEN || "";
  if (!orgUrl || !token) {
    throw new Error("Missing OKTA_ORG_URL or OKTA_API_TOKEN in scratch env.");
  }
  const oktaFetch = async (urlPath, opts = {}) => {
    const r = await fetch(`${orgUrl}${urlPath}`, {
      ...opts,
      headers: {
        Authorization: `SSWS ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(opts.headers || {})
      }
    });
    const txt = await r.text();
    let json = null;
    try { json = JSON.parse(txt); } catch {}
    return { status: r.status, ok: r.ok, json, txt };
  };

  // 1. Idempotent groups
  for (const [name, desc] of [
    ["Cymbal-Sovereign-FinVault", "Pattern B Sovereign Silo tenant group (FinVault)"],
    ["Cymbal-Commercial-RetailStream", "Pattern A/C Commercial tenant group (RetailStream)"]
  ]) {
    const existing = await oktaFetch(`/api/v1/groups?q=${encodeURIComponent(name)}`);
    const found = Array.isArray(existing.json) && existing.json.find(g => g?.profile?.name === name);
    if (!found) {
      const cr = await oktaFetch("/api/v1/groups", {
        method: "POST",
        body: JSON.stringify({ profile: { name, description: desc } })
      });
      if (!cr.ok) throw new Error(`Okta group create failed (${name}): ${cr.status} ${cr.txt.slice(0, 200)}`);
    }
  }

  // 2. Idempotent OIDC app with dpop_bound_access_tokens: true
  const appLabel = "Cymbal Sovereign Agent Vault";
  const appsRes = await oktaFetch(`/api/v1/apps?q=${encodeURIComponent(appLabel)}`);
  let app = Array.isArray(appsRes.json) && appsRes.json.find(a => a?.label === appLabel);
  if (!app) {
    const cr = await oktaFetch("/api/v1/apps", {
      method: "POST",
      body: JSON.stringify({
        name: "oidc_client",
        label: appLabel,
        signOnMode: "OPENID_CONNECT",
        credentials: {
          oauthClient: { token_endpoint_auth_method: "client_secret_basic", autoKeyRotation: true }
        },
        settings: {
          oauthClient: {
            client_uri: "https://cloud.google.com",
            response_types: ["code"],
            grant_types: ["authorization_code", "refresh_token"],
            application_type: "web",
            redirect_uris: ["https://localhost.invalid/oauth2/callback"],
            dpop_bound_access_tokens: true
          }
        }
      })
    });
    if (!cr.ok) throw new Error(`Okta OIDC app create failed: ${cr.status} ${cr.txt.slice(0, 300)}`);
    app = cr.json;
  }

  const clientId = app?.credentials?.oauthClient?.client_id || app?.id;
  const clientSecret = app?.credentials?.oauthClient?.client_secret || "";

  // 3. Trigger real live /token request WITHOUT DPoP proof -> produces real invalid_dpop_proof System Log event
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokResp = await fetch(`${orgUrl}/oauth2/default/v1/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: "grant_type=authorization_code&code=invalid_probe_no_dpop&redirect_uri=https%3A%2F%2Flocalhost.invalid%2Foauth2%2Fcallback"
  });
  const tokBody = await tokResp.text();

  // Wait briefly for Okta System Log ingestion and verify
  await new Promise(r => setTimeout(r, 3500));
  const logsRes = await oktaFetch(
    `/api/v1/logs?filter=${encodeURIComponent('eventType eq "app.oauth2.as.token.grant"')}&limit=10`
  );
  const events = Array.isArray(logsRes.json) ? logsRes.json : [];
  const dpopFailures = events.filter(
    e => e?.outcome?.result === "FAILURE" && /dpop/i.test(String(e?.outcome?.reason || JSON.stringify(e)))
  );
  console.log(
    `✅ [Okta] App '${appLabel}' (id=${app.id}, dpop=${Boolean(app?.settings?.oauthClient?.dpop_bound_access_tokens)}), token probe HTTP ${tokResp.status} (${tokBody.slice(0, 120)}), System Log DPoP failures=${dpopFailures.length}`
  );
  if (dpopFailures.length === 0) {
    throw new Error("Okta preflight failed: no live invalid_dpop_proof failure event found in System Log yet.");
  }
  return { ok: true, appId: app.id, dpopFailureCount: dpopFailures.length };
}

function queryLiveBigQueryFinopsRows() {
  const sql =
    "SELECT recorded_at, tenant_id, mcp_tool, http_status, prompt_sha256, cached_tokens, dynamic_tokens, estimated_usd " +
    "FROM `cymbal-ge-hub-2026.cymbal_triad_finops_2590db.otel_finops_chargeback` " +
    "ORDER BY recorded_at DESC LIMIT 20";
  const out = execFileSync(
    "bq",
    ["query", "--project_id", GCP_HUB_PROJECT, "--use_legacy_sql=false", "--format=json", sql],
    {
      encoding: "utf8",
      env: { ...process.env, CLOUDSDK_CORE_ACCOUNT: GCP_DEMO_ACCOUNT },
      timeout: 30000
    }
  );
  const rows = JSON.parse(out.trim() || "[]");
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error(`Expected >= 2 live BigQuery FinOps ledger rows, got ${rows?.length || 0}`);
  }
  return rows;
}

async function seedDatadog(env) {
  const apiKey = env.DD_API_KEY || process.env.DD_API_KEY || "";
  const site = (env.DD_SITE || process.env.DD_SITE || "us5.datadoghq.com").replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!apiKey) {
    throw new Error("Missing DD_API_KEY in scratch env.");
  }
  const bqRows = queryLiveBigQueryFinopsRows();
  // Export VERBATIM BigQuery rows ONLY — ZERO invented fields (no model_armor:BLOCKED!).
  // Add tenant_id both as top-level JSON attribute AND in ddtags per R3 P2-2 so search works immediately.
  const payload = bqRows.map(row => ({
    ddsource: "bigquery_finops_export",
    service: "cymbal-finops-ledger",
    hostname: "cymbal-ge-hub-2026",
    ddtags: `tenant_id:${row.tenant_id},http_status:${row.http_status},env:cymbal-demo,source:bigquery_finops_export`,
    status: Number(row.http_status) >= 400 ? "warn" : "info",
    message: `BigQuery FinOps ledger export: tenant=${row.tenant_id} mcp_tool=${row.mcp_tool} http_status=${row.http_status} estimated_usd=${row.estimated_usd}`,
    recorded_at: row.recorded_at,
    tenant_id: row.tenant_id,
    mcp_tool: row.mcp_tool,
    http_status: Number(row.http_status),
    prompt_sha256: row.prompt_sha256,
    cached_tokens: Number(row.cached_tokens),
    dynamic_tokens: Number(row.dynamic_tokens),
    estimated_usd: Number(row.estimated_usd)
  }));

  const intakeResp = await fetch(`https://http-intake.logs.${site}/api/v2/logs`, {
    method: "POST",
    headers: {
      "DD-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!intakeResp.ok) {
    const errTxt = await intakeResp.text();
    throw new Error(`Datadog Logs Intake failed (${intakeResp.status}): ${errTxt.slice(0, 300)}`);
  }
  const tenants = [...new Set(bqRows.map(r => r.tenant_id))];
  console.log(
    `✅ [Datadog] Exported ${payload.length} verbatim BigQuery otel_finops_chargeback rows to https://http-intake.logs.${site}/api/v2/logs (tenants=${tenants.join(", ")}, 0 invented fields).`
  );
  return { ok: true, exportedCount: payload.length, tenants, site };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--print-snowflake-sql")) {
    console.log(SNOWFLAKE_SEED_SQL);
    return;
  }
  if (args.includes("--revoke-env")) {
    if (fs.existsSync(DEFAULT_ENV_FILE)) {
      fs.unlinkSync(DEFAULT_ENV_FILE);
      console.log(`✅ Removed temporary scratch env file: ${DEFAULT_ENV_FILE}`);
    } else {
      console.log(`ℹ️ No scratch env file found at: ${DEFAULT_ENV_FILE}`);
    }
    return;
  }

  const saasIdx = args.indexOf("--saas");
  const target = saasIdx >= 0 ? String(args[saasIdx + 1] || "").toLowerCase() : "";
  const env = loadScratchEnv(DEFAULT_ENV_FILE);

  if (target === "snowflake") {
    await seedSnowflake(env);
  } else if (target === "okta") {
    await seedOkta(env);
  } else if (target === "datadog") {
    await seedDatadog(env);
  } else if (target === "all") {
    for (const fn of [seedSnowflake, seedOkta, seedDatadog]) {
      try {
        await fn(env);
      } catch (e) {
        console.error(`⚠️ ${e.message}`);
      }
    }
  } else {
    console.log("Usage: node scripts/seed_saas_demo_tenants.mjs --saas snowflake|okta|datadog|all | --print-snowflake-sql | --revoke-env");
    process.exit(2);
  }
}

main().catch(err => {
  console.error(`❌ ${err.message || err}`);
  process.exit(1);
});
