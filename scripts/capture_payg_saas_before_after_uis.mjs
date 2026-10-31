import crypto from "crypto";
import fs from "fs";
import path from "path";

const ROOT_DIR = "/usr/local/google/home/nitinagga/Documents/blogs";
const OUT_DIR = path.join(ROOT_DIR, "screenshots/payg-saas-uis/before-after");
const RECEIPT_PATH = path.join(ROOT_DIR, "docs/payg_saas_before_after_provenance_receipt.json");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Dynamically import puppeteer
const puppeteer = (await import("/usr/local/google/home/nitinagga/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js")).default;

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readPngDims(filePath) {
  const buf = fs.readFileSync(filePath);
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bytes: buf.length
  };
}

// 8 PAYG SaaS Product UI Definitions
const PAYG_PAIRS = [
  {
    key: "snowflake",
    name: "Snowflake AI Data Cloud",
    vendor: "Snowflake Inc. (Google Cloud Marketplace)",
    category: "Data Warehouse & Cortex AI",
    beforeFile: "before_01_snowflake_payg.png",
    afterFile: "after_01_snowflake_payg.png",
    beforeTitle: "BEFORE: Un-Governed Snowflake (Public Schema, Unmasked PII & Continuous Compute Burn)",
    afterTitle: "AFTER: Cymbal 5-Hop Snowflake (Cortex NL2SQL, Dynamic Column Masking & Auto-Suspend 60s)",
    getBeforeHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #0f172a; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
        .logo-area { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 15px; color: #38bdf8; }
        .snow-badge { background: #0284c7; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
        .context-bar { display: flex; gap: 12px; align-items: center; font-size: 12px; color: #94a3b8; }
        .ctx-item { background: #334155; padding: 4px 10px; border-radius: 6px; color: #f8fafc; display: flex; gap: 6px; }
        .main-layout { display: flex; flex: 1; height: calc(100vh - 48px); }
        .sidebar { width: 220px; background: #1e293b; border-right: 1px solid #334155; padding: 12px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #cbd5e1; }
        .side-item { padding: 6px 10px; border-radius: 6px; display: flex; gap: 8px; cursor: pointer; }
        .side-item.active { background: #0284c7; color: white; font-weight: 600; }
        .editor-pane { flex: 1; display: flex; flex-direction: column; background: #0b1120; }
        .tab-bar { height: 36px; background: #131d31; border-bottom: 1px solid #334155; display: flex; align-items: center; padding: 0 12px; font-size: 12px; color: #94a3b8; }
        .sql-box { padding: 16px; background: #0f172a; border-bottom: 1px solid #334155; font-family: monospace; font-size: 13px; line-height: 1.6; color: #e2e8f0; }
        .keyword { color: #38bdf8; font-weight: 600; }
        .results-box { flex: 1; padding: 14px; background: #0b1120; display: flex; flex-direction: column; }
        .res-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; color: #94a3b8; }
        .res-table { width: 100%; border-collapse: collapse; font-size: 12px; font-family: monospace; }
        .res-table th { background: #1e293b; color: #94a3b8; text-align: left; padding: 8px 10px; border: 1px solid #334155; }
        .res-table td { padding: 8px 10px; border: 1px solid #1e293b; color: #e2e8f0; }
        .pii-exposed { color: #f87171; font-weight: bold; background: rgba(239, 68, 68, 0.15); padding: 1px 4px; border-radius: 3px; }
        .warn-strip { background: #7f1d1d; border: 1px solid #ef4444; color: #fecaca; padding: 8px 12px; border-radius: 6px; margin-bottom: 10px; font-size: 12px; display: flex; align-items: center; gap: 8px; }
      </style></head><body>
        <div class="top-nav">
          <div class="logo-area">
            <span style="font-size:20px;">❄️</span> Snowflake Snowsight &bull; FinVault Un-Governed Prototype
            <span class="snow-badge">GCP us-central1</span>
          </div>
          <div class="context-bar">
            <div class="ctx-item"><span>Role:</span> <strong>ACCOUNTADMIN</strong></div>
            <div class="ctx-item"><span>Warehouse:</span> <strong style="color:#f87171;">COMPUTE_WH (AUTO_SUSPEND = NULL &bull; 24/7 BURN)</strong></div>
            <div class="ctx-item"><span>Database:</span> <strong>DEMO_DB.PUBLIC</strong></div>
          </div>
        </div>
        <div class="main-layout">
          <div class="sidebar">
            <div class="side-item active">📄 Worksheets</div>
            <div class="side-item">🗄️ Databases (PUBLIC)</div>
            <div class="side-item">📊 Shared Dashboards</div>
            <div class="side-item">⚙️ Admin (Warehouses)</div>
          </div>
          <div class="editor-pane">
            <div class="tab-bar">Worksheet: raw_customer_transactions.sql</div>
            <div class="sql-box">
              <span class="keyword">SELECT</span> tx_id, customer_name, ssn, iban, amount, status <br/>
              <span class="keyword">FROM</span> DEMO_DB.PUBLIC.RAW_BANKING_TRANSACTIONS <br/>
              <span class="keyword">ORDER BY</span> tx_id <span class="keyword">DESC</span> <span class="keyword">LIMIT</span> 5;
            </div>
            <div class="results-box">
              <div class="warn-strip">
                ⚠️ <strong>CRITICAL SECURITY RISK:</strong> Zero Dynamic Data Masking policy detected. Plaintext IBANs and SSNs exposed to all querying roles. Compute warehouse running continuously without scale-to-zero.
              </div>
              <div class="res-header">
                <span>Query executed in 32ms &bull; 5 rows returned</span>
                <span style="color:#f87171;">⚠️ Warehouse Running: $3.00/hr continuous idle charge</span>
              </div>
              <table class="res-table">
                <tr><th>TX_ID</th><th>CUSTOMER_NAME</th><th>SSN</th><th>IBAN</th><th>AMOUNT</th><th>STATUS</th></tr>
                <tr><td>TX-99014</td><td>Alexander Hamilton</td><td class="pii-exposed">450-22-9811</td><td class="pii-exposed">NL91ABNA0417164300</td><td>$250,000.00</td><td>COMPLETED</td></tr>
                <tr><td>TX-99015</td><td>Eleanor Vance</td><td class="pii-exposed">312-88-4490</td><td class="pii-exposed">GB29NWBK60161331926819</td><td>$14,200.50</td><td>PENDING</td></tr>
                <tr><td>TX-99016</td><td>Marcus Sterling</td><td class="pii-exposed">540-11-7732</td><td class="pii-exposed">DE89370400440532013000</td><td>$89,450.00</td><td>SETTLED</td></tr>
                <tr><td>TX-99017</td><td>Sophia Chen</td><td class="pii-exposed">219-44-6601</td><td class="pii-exposed">FR1420041010050500013M02606</td><td>$1,200,000.00</td><td>AUTHORIZED</td></tr>
                <tr><td>TX-99018</td><td>Julian Blackwood</td><td class="pii-exposed">882-90-1244</td><td class="pii-exposed">US64CHAS12345678901234</td><td>$45,000.00</td><td>CLEARING</td></tr>
              </table>
            </div>
          </div>
        </div>
      </body></html>
    `,
    getAfterHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #0f172a; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #0f172a; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
        .logo-area { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 15px; color: #38bdf8; }
        .snow-badge { background: #059669; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
        .context-bar { display: flex; gap: 12px; align-items: center; font-size: 12px; color: #94a3b8; }
        .ctx-item { background: #1e293b; padding: 4px 10px; border-radius: 6px; color: #f8fafc; display: flex; gap: 6px; border: 1px solid #334155; }
        .main-layout { display: flex; flex: 1; height: calc(100vh - 48px); }
        .sidebar { width: 230px; background: #111827; border-right: 1px solid #1e293b; padding: 12px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #cbd5e1; }
        .side-item { padding: 6px 10px; border-radius: 6px; display: flex; gap: 8px; cursor: pointer; }
        .side-item.active { background: #0284c7; color: white; font-weight: 600; }
        .editor-pane { flex: 1; display: flex; flex-direction: column; background: #0b1120; }
        .tab-bar { height: 36px; background: #131d31; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; font-size: 12px; color: #94a3b8; }
        .sql-box { padding: 16px; background: #0b1120; border-bottom: 1px solid #1e293b; font-family: monospace; font-size: 13px; line-height: 1.6; color: #e2e8f0; }
        .keyword { color: #38bdf8; font-weight: 600; }
        .results-box { flex: 1; padding: 14px; background: #0b1120; display: flex; flex-direction: column; }
        .res-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; color: #94a3b8; }
        .res-table { width: 100%; border-collapse: collapse; font-size: 12px; font-family: monospace; }
        .res-table th { background: #1e293b; color: #94a3b8; text-align: left; padding: 8px 10px; border: 1px solid #334155; }
        .res-table td { padding: 8px 10px; border: 1px solid #1e293b; color: #e2e8f0; }
        .masked-safe { color: #34d399; font-weight: bold; background: rgba(16, 185, 129, 0.15); padding: 1px 6px; border-radius: 3px; }
        .gov-strip { background: #064e3b; border: 1px solid #10b981; color: #a7f3d0; padding: 8px 12px; border-radius: 6px; margin-bottom: 10px; font-size: 12px; display: flex; align-items: center; justify-content: space-between; }
      </style></head><body>
        <div class="top-nav">
          <div class="logo-area">
            <span style="font-size:20px;">❄️</span> Snowflake Snowsight &bull; Cymbal 5-Hop Governed FinVault
            <span class="snow-badge">&#10003; 5-HOP CRYPTO SECURED</span>
          </div>
          <div class="context-bar">
            <div class="ctx-item"><span>Role:</span> <strong style="color:#a7f3d0;">CORTEX_FINVAULT_ANALYST</strong></div>
            <div class="ctx-item"><span>Warehouse:</span> <strong style="color:#38bdf8;">FINVAULT_WH (AUTO_SUSPEND = 60s &bull; SCALE-TO-ZERO)</strong></div>
            <div class="ctx-item"><span>Database:</span> <strong>FINVAULT_DB.PUBLIC</strong></div>
          </div>
        </div>
        <div class="main-layout">
          <div class="sidebar">
            <div class="side-item active">📄 FinVault Worksheets</div>
            <div class="side-item">🗄️ Databases (FINVAULT_DB)</div>
            <div class="side-item">🛡️ Dynamic Data Masking</div>
            <div class="side-item">🤖 Cortex Analyst NL2SQL</div>
            <div class="side-item">⚡ Scale-to-Zero Auto-Suspend</div>
          </div>
          <div class="editor-pane">
            <div class="tab-bar">
              <span>Worksheet: finvault_cortex_settlements.sql</span>
              <span style="color:#34d399; font-weight:700;">DPoP Token Cryptographically Bound (Hop 5)</span>
            </div>
            <div class="sql-box">
              <span class="keyword">SELECT</span> tx_id, customer_name, <br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;SNOWFLAKE.CORTEX.CLASSIFY_TRANSACTION(tx_id) <span class="keyword">AS</span> occ_classification, <br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ssn, iban, amount, status <br/>
              <span class="keyword">FROM</span> FINVAULT_DB.PUBLIC.WIRE_SETTLEMENTS <br/>
              <span class="keyword">WHERE</span> tenant = <span class="keyword">CURRENT_SESSION_TENANT()</span> <br/>
              <span class="keyword">ORDER BY</span> tx_id <span class="keyword">DESC</span> <span class="keyword">LIMIT</span> 5;
            </div>
            <div class="results-box">
              <div class="gov-strip">
                <div>
                  🛡️ <strong>OCC/FDIC TIER-1 GOVERNANCE ACTIVE:</strong> Dynamic Column Masking enforced on SSN and IBAN. Cross-tenant leakage blocked by 5-Hop token.
                </div>
                <div style="font-weight:700; color:#38bdf8;">
                  ⚡ Auto-Suspend 60s Active (&lt; $2.00/mo idle)
                </div>
              </div>
              <div class="res-header">
                <span>Query executed in 28ms &bull; 5 rows returned &bull; 100% PII Masked</span>
                <span style="color:#34d399;">✓ Scale-to-Zero Enforced: Warehouse will suspend after 60s idle</span>
              </div>
              <table class="res-table">
                <tr><th>TX_ID</th><th>CUSTOMER_NAME</th><th>OCC_CLASSIFICATION</th><th>SSN</th><th>IBAN</th><th>AMOUNT</th><th>STATUS</th></tr>
                <tr><td>TX-99014</td><td>Alexander Hamilton</td><td>HIGH_VALUE_WIRE_SETTLEMENT</td><td class="masked-safe">***-**-9811</td><td class="masked-safe">NL91ABNA0417******</td><td>$250,000.00</td><td>COMPLETED</td></tr>
                <tr><td>TX-99015</td><td>Eleanor Vance</td><td>DOMESTIC_ACH_TRANSFER</td><td class="masked-safe">***-**-4490</td><td class="masked-safe">GB29NWBK6016******</td><td>$14,200.50</td><td>PENDING</td></tr>
                <tr><td>TX-99016</td><td>Marcus Sterling</td><td>CROSS_BORDER_SOVEREIGN_SWIFT</td><td class="masked-safe">***-**-7732</td><td class="masked-safe">DE8937040044******</td><td>$89,450.00</td><td>SETTLED</td></tr>
                <tr><td>TX-99017</td><td>Sophia Chen</td><td>INSTITUTIONAL_LIQUIDITY_SWAP</td><td class="masked-safe">***-**-6601</td><td class="masked-safe">FR1420041010******</td><td>$1,200,000.00</td><td>AUTHORIZED</td></tr>
                <tr><td>TX-99018</td><td>Julian Blackwood</td><td>ESCROW_DISBURSEMENT</td><td class="masked-safe">***-**-1244</td><td class="masked-safe">US64CHAS1234******</td><td>$45,000.00</td><td>CLEARING</td></tr>
              </table>
            </div>
          </div>
        </div>
      </body></html>
    `
  },
  {
    key: "datadog",
    name: "Datadog Observability",
    vendor: "Datadog Inc. (Google Cloud Marketplace)",
    category: "APM & Distributed Tracing",
    beforeFile: "before_02_datadog_payg.png",
    afterFile: "after_02_datadog_payg.png",
    beforeTitle: "BEFORE: Un-Governed Datadog APM (Customer PII Leaking into Trace Tags, No Tenant Guardrails)",
    afterTitle: "AFTER: Cymbal 5-Hop Datadog APM (Zero-PII Trace Waterfall & P1 Prompt Injection Alert Triggered)",
    getBeforeHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #111424; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #1a1e36; border-bottom: 1px solid #2d3359; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
        .logo-area { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #7c3aed; font-size: 15px; }
        .search-bar { background: #0c0e1a; border: 1px solid #2d3359; border-radius: 6px; padding: 6px 12px; width: 440px; font-family: monospace; font-size: 12px; color: #e2e8f0; }
        .main-pane { padding: 18px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
        .card { background: #1a1e36; border: 1px solid #2d3359; border-radius: 8px; padding: 16px; }
        .wf-row { display: flex; align-items: center; height: 32px; border-bottom: 1px solid #24294b; font-size: 12px; }
        .wf-label { width: 220px; font-weight: 600; color: #cbd5e1; }
        .wf-bar-wrap { flex: 1; position: relative; height: 16px; background: #0c0e1a; border-radius: 4px; overflow: hidden; }
        .wf-bar { height: 100%; border-radius: 4px; }
        .tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .tag-pill { background: #24294b; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-family: monospace; }
        .tag-leak { background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444; font-weight: bold; }
      </style></head><body>
        <div class="top-nav">
          <div class="logo-area"><span style="font-size:22px;">🐶</span> Datadog APM &bull; Un-Governed Tracing Stream</div>
          <input class="search-bar" value="env:prod service:legacy-agent-service operation:http.request" readonly />
          <div style="font-size:12px; color:#94a3b8;">FinVault Shared Ingestion</div>
        </div>
        <div class="main-pane">
          <div class="card" style="border-left: 4px solid #ef4444;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <h2 style="font-size:16px; color:#f87171;">⚠️ Trace: trace-990141b (Unbounded Ingestion with Sensitive Data Leaks)</h2>
              <span style="font-size:12px; color:#94a3b8;">Duration: 142ms &bull; 4 Spans</span>
            </div>
            <p style="font-size:12.5px; color:#cbd5e1; line-height:1.4;">
              Standard distributed trace without 5-Hop token isolation. Sensitive banking credentials and customer SSNs leak directly into APM span metadata tags.
            </p>
          </div>
          <div class="card">
            <h3 style="font-size:13px; color:#94a3b8; text-transform:uppercase; margin-bottom:12px;">Trace Waterfall</h3>
            <div class="wf-row"><div class="wf-label">legacy-gateway.http</div><div class="wf-bar-wrap"><div class="wf-bar" style="width:100%; background:#7c3aed;"></div></div><span style="margin-left:10px; font-size:11px;">142ms</span></div>
            <div class="wf-row"><div class="wf-label">&boxur;&nbsp;unfiltered.prompt.eval</div><div class="wf-bar-wrap"><div class="wf-bar" style="margin-left:15%; width:50%; background:#6366f1;"></div></div><span style="margin-left:10px; font-size:11px;">71ms</span></div>
            <div class="wf-row"><div class="wf-label">&boxur;&nbsp;raw.database.query</div><div class="wf-bar-wrap"><div class="wf-bar" style="margin-left:65%; width:30%; background:#38bdf8;"></div></div><span style="margin-left:10px; font-size:11px;">42ms</span></div>
          </div>
          <div class="card">
            <h3 style="font-size:13px; color:#f87171; text-transform:uppercase; margin-bottom:8px;">❌ Leaked Span Tags (Security Vulnerability)</h3>
            <div class="tag-list">
              <div class="tag-pill">env: prod</div>
              <div class="tag-pill tag-leak">user.email: cfo@finvault.com</div>
              <div class="tag-pill tag-leak">user.ssn: 450-22-9811</div>
              <div class="tag-pill tag-leak">iban: NL91ABNA0417164300</div>
              <div class="tag-pill tag-leak">tenant: null (shared)</div>
              <div class="tag-pill">http.status_code: 200</div>
            </div>
          </div>
        </div>
      </body></html>
    `,
    getAfterHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #111424; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #1a1e36; border-bottom: 1px solid #2d3359; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
        .logo-area { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #7c3aed; font-size: 15px; }
        .search-bar { background: #0c0e1a; border: 1px solid #2d3359; border-radius: 6px; padding: 6px 12px; width: 440px; font-family: monospace; font-size: 12px; color: #e2e8f0; }
        .main-pane { padding: 18px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
        .card { background: #1a1e36; border: 1px solid #2d3359; border-radius: 8px; padding: 16px; }
        .wf-row { display: flex; align-items: center; height: 30px; border-bottom: 1px solid #24294b; font-size: 12px; }
        .wf-label { width: 260px; font-weight: 600; color: #cbd5e1; }
        .wf-bar-wrap { flex: 1; position: relative; height: 14px; background: #0c0e1a; border-radius: 4px; overflow: hidden; }
        .wf-bar { height: 100%; border-radius: 4px; }
        .tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .tag-pill { background: #24294b; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-family: monospace; }
        .tag-safe { background: #064e3b; color: #6ee7b7; border: 1px solid #10b981; font-weight: bold; }
        .alert-strip { background: #7f1d1d; border: 1px solid #ef4444; color: #fecaca; padding: 10px 14px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; }
      </style></head><body>
        <div class="top-nav">
          <div class="logo-area"><span style="font-size:22px;">🐶</span> Datadog APM &bull; Cymbal 5-Hop Distributed Telemetry</div>
          <input class="search-bar" value="env:prod service:geap-5hop tenant:finvault decision:HTTP_422" readonly />
          <div style="font-size:12px; color:#10b981; font-weight:700;">✓ 5-Hop Cryptographically Scrubbed</div>
        </div>
        <div class="main-pane">
          <div class="alert-strip">
            <div>
              🚨 <strong>P1 SECURITY ALERT TRIGGERED:</strong> <code>SEMANTIC_NLC_VIOLATION</code> &bull; Prompt violated tenant 'finvault' regulatory constraint <code>suppress occ escalation</code>.
            </div>
            <div style="background:#dc2626; color:white; padding:2px 8px; border-radius:4px; font-weight:800; font-size:11px;">
              HALTED: HTTP 422
            </div>
          </div>
          <div class="card">
            <h3 style="font-size:13px; color:#94a3b8; text-transform:uppercase; margin-bottom:10px;">5-Hop Cryptographic Trace Waterfall (18.4ms Total)</h3>
            <div class="wf-row"><div class="wf-label">hop1.ingress.dpop_mint</div><div class="wf-bar-wrap"><div class="wf-bar" style="width:12%; background:#3b82f6;"></div></div><span style="margin-left:10px; font-size:11px;">2.1ms</span></div>
            <div class="wf-row"><div class="wf-label">hop2.ard.catalog_pdp_filter</div><div class="wf-bar-wrap"><div class="wf-bar" style="margin-left:12%; width:18%; background:#8b5cf6;"></div></div><span style="margin-left:10px; font-size:11px;">3.4ms</span></div>
            <div class="wf-row"><div class="wf-label">hop3.memory_bank.namespace_read</div><div class="wf-bar-wrap"><div class="wf-bar" style="margin-left:30%; width:26%; background:#ec4899;"></div></div><span style="margin-left:10px; font-size:11px;">4.8ms</span></div>
            <div class="wf-row"><div class="wf-label" style="color:#f87171;">hop4.model_armor.guardrail [VIOLATION]</div><div class="wf-bar-wrap"><div class="wf-bar" style="margin-left:56%; width:34%; background:#ef4444;"></div></div><span style="margin-left:10px; font-size:11px;">6.2ms</span></div>
            <div class="wf-row"><div class="wf-label" style="color:#94a3b8;">hop5.saas_mcp.dispatch [SUPPRESSED]</div><div class="wf-bar-wrap"><div class="wf-bar" style="margin-left:90%; width:5%; background:#475569;"></div></div><span style="margin-left:10px; font-size:11px;">1.9ms</span></div>
          </div>
          <div class="card">
            <h3 style="font-size:13px; color:#34d399; text-transform:uppercase; margin-bottom:8px;">✓ Governed Span Tags (Zero PII Leaked &bull; 100% Redacted)</h3>
            <div class="tag-list">
              <div class="tag-pill tag-safe">tenant: finvault</div>
              <div class="tag-pill tag-safe">tier: ENTERPRISE</div>
              <div class="tag-pill tag-safe">decision: HTTP_422</div>
              <div class="tag-pill tag-safe">user.email: [REDACTED_FINVAULT_USER]</div>
              <div class="tag-pill tag-safe">user.ssn: [REDACTED_SSN]</div>
              <div class="tag-pill tag-safe">iban: [REDACTED_IBAN]</div>
              <div class="tag-pill tag-safe">cmek: finvault-kr/agent-memory-cmek</div>
              <div class="tag-pill">runtime: Cloud Run Gen2</div>
            </div>
          </div>
        </div>
      </body></html>
    `
  },
  {
    key: "databricks",
    name: "Databricks Intelligence",
    vendor: "Databricks Inc. (Google Cloud Marketplace)",
    category: "Unity Catalog & Lakehouse",
    beforeFile: "before_03_databricks_payg.png",
    afterFile: "after_03_databricks_payg.png",
    beforeTitle: "BEFORE: Un-Governed Databricks (Legacy Hive Metastore, Shared Default Namespace & 24/7 Compute)",
    afterTitle: "AFTER: Cymbal 5-Hop Databricks (Unity Catalog 3-Level Namespace & Serverless Auto-Stop 5m)",
    getBeforeHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #f8fafc; color: #0f172a; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
        .brand { font-weight: 800; font-size: 16px; color: #ff3621; display: flex; align-items: center; gap: 8px; }
        .main-box { display: flex; flex: 1; height: calc(100vh - 48px); }
        .sidebar { width: 220px; background: #f1f5f9; border-right: 1px solid #e2e8f0; padding: 12px; font-size: 13px; color: #475569; display: flex; flex-direction: column; gap: 6px; }
        .side-btn { padding: 6px 10px; border-radius: 6px; cursor: pointer; }
        .side-btn.active { background: #e2e8f0; color: #0f172a; font-weight: 700; }
        .content { flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
        .warn-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; color: #991b1b; font-size: 12.5px; }
        .data-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; font-family: monospace; }
        th { background: #f8fafc; text-align: left; padding: 8px; border: 1px solid #e2e8f0; color: #64748b; }
        td { padding: 8px; border: 1px solid #e2e8f0; }
      </style></head><body>
        <div class="top-nav">
          <div class="brand"><span>🧱</span> Databricks Data Intelligence &bull; Legacy Metastore</div>
          <div style="font-size:12px; color:#64748b;">Workspace: <code>dbc-legacy-shared.cloud.databricks.com</code></div>
        </div>
        <div class="main-box">
          <div class="sidebar">
            <div class="side-btn">📁 Workspace</div>
            <div class="side-btn active">🗄️ Data (hive_metastore)</div>
            <div class="side-btn">⚙️ Compute (All-Purpose 8-Node)</div>
          </div>
          <div class="content">
            <div class="warn-card">
              ⚠️ <strong>SECURITY ALERT:</strong> Flat Hive Metastore (<code>hive_metastore.default.*</code>) lacks Unity Catalog 3-level namespace isolation. Shared All-Purpose Cluster running continuously with zero auto-stop.
            </div>
            <div class="data-card">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="font-size:15px; font-weight:700;">hive_metastore.default.unsegregated_orders</h3>
                <span style="color:#ef4444; font-size:12px; font-weight:700;">⚠️ Compute: 8x i3.xlarge (Running 24/7 &bull; $180/mo)</span>
              </div>
              <table>
                <tr><th>ORDER_ID</th><th>TENANT</th><th>CUSTOMER_EMAIL</th><th>ORDER_AMOUNT</th><th>PAYMENT_TOKEN</th></tr>
                <tr><td>ORD-101</td><td>finvault</td><td style="color:#ef4444;">admin@finvault.com</td><td>$84,000.00</td><td>tok_visa_4242_leak</td></tr>
                <tr><td>ORD-102</td><td>retailstream</td><td style="color:#ef4444;">buyer@retail.com</td><td>$149.99</td><td>tok_mc_5555_leak</td></tr>
                <tr><td>ORD-103</td><td>finvault</td><td style="color:#ef4444;">cfo@finvault.com</td><td>$1,500,000.00</td><td>tok_wire_clearing</td></tr>
              </table>
            </div>
          </div>
        </div>
      </body></html>
    `,
    getAfterHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #f8fafc; color: #0f172a; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
        .brand { font-weight: 800; font-size: 16px; color: #ff3621; display: flex; align-items: center; gap: 8px; }
        .main-box { display: flex; flex: 1; height: calc(100vh - 48px); }
        .sidebar { width: 240px; background: #ffffff; border-right: 1px solid #e2e8f0; padding: 12px; font-size: 13px; color: #475569; display: flex; flex-direction: column; gap: 6px; }
        .side-btn { padding: 6px 10px; border-radius: 6px; cursor: pointer; }
        .side-btn.active { background: #fee2e2; color: #b91c1c; font-weight: 700; }
        .content { flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
        .gov-card { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; color: #065f46; font-size: 12.5px; display: flex; justify-content: space-between; align-items: center; }
        .data-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; font-family: monospace; }
        th { background: #f8fafc; text-align: left; padding: 8px; border: 1px solid #e2e8f0; color: #64748b; }
        td { padding: 8px; border: 1px solid #e2e8f0; }
        .masked { color: #059669; font-weight: bold; background: #d1fae5; padding: 1px 4px; border-radius: 3px; }
      </style></head><body>
        <div class="top-nav">
          <div class="brand"><span>🧱</span> Databricks &bull; Unity Catalog 3-Level Governance</div>
          <div style="font-size:12px; color:#059669; font-weight:700;">✓ Serverless SQL Auto-Stop: 5m idle (&lt; $5/mo)</div>
        </div>
        <div class="main-box">
          <div class="sidebar">
            <div class="side-btn">📁 Workspace</div>
            <div class="side-btn active">🛡️ Catalog: <strong>finvault_cat</strong></div>
            <div style="padding-left:14px; font-size:12px; color:#64748b;">└ 📁 regulatory</div>
            <div style="padding-left:28px; font-size:12px; color:#0284c7; font-weight:600;">└ 📄 settlement_ledger</div>
            <div class="side-btn" style="margin-top:10px;">⚡ Compute: Serverless SQL</div>
          </div>
          <div class="content">
            <div class="gov-card">
              <div>
                🛡️ <strong>UNITY CATALOG ISOLATION:</strong> 3-Level Namespace <code>finvault_cat.regulatory.settlement_ledger</code> strictly segregated from <code>retailstream_cat</code>.
              </div>
              <div style="font-weight:700; color:#0284c7;">
                ⚡ Scale-to-Zero: Auto-Stop in 5 mins
              </div>
            </div>
            <div class="data-card">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="font-size:15px; font-weight:700; color:#0f172a;">finvault_cat.regulatory.settlement_ledger (Delta Lake)</h3>
                <span style="color:#059669; font-size:12px; font-weight:700;">✓ RLS Policy: WHERE tenant = 'finvault'</span>
              </div>
              <table>
                <tr><th>TX_ID</th><th>TENANT</th><th>CUSTOMER_EMAIL</th><th>SETTLEMENT_AMOUNT</th><th>DPOP_THUMBPRINT</th></tr>
                <tr><td>TX-99014</td><td>finvault</td><td class="masked">[REDACTED_FINVAULT_USER]</td><td>$250,000.00</td><td class="masked">dpop_sha256_7a9f</td></tr>
                <tr><td>TX-99015</td><td>finvault</td><td class="masked">[REDACTED_FINVAULT_USER]</td><td>$14,200.50</td><td class="masked">dpop_sha256_3b81</td></tr>
                <tr><td>TX-99016</td><td>finvault</td><td class="masked">[REDACTED_FINVAULT_USER]</td><td>$89,450.00</td><td class="masked">dpop_sha256_0c4e</td></tr>
              </table>
            </div>
          </div>
        </div>
      </body></html>
    `
  },
  {
    key: "clickhouse",
    name: "ClickHouse Cloud",
    vendor: "ClickHouse Inc. (Google Cloud Marketplace)",
    category: "Real-Time Columnar Analytics",
    beforeFile: "before_04_clickhouse_payg.png",
    afterFile: "after_04_clickhouse_payg.png",
    beforeTitle: "BEFORE: Un-Governed ClickHouse (Open Multi-Tenant Table with Cross-Tenant Telemetry Leak)",
    afterTitle: "AFTER: Cymbal 5-Hop ClickHouse (Row-Level Security Policy & Automatic Idle Suspend)",
    getBeforeHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #18181b; color: #fafafa; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #27272a; border-bottom: 1px solid #3f3f46; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
        .brand { font-weight: 800; font-size: 15px; color: #facc15; display: flex; align-items: center; gap: 8px; }
        .main { display: flex; flex-direction: column; padding: 18px; gap: 14px; flex: 1; }
        .card { background: #27272a; border: 1px solid #3f3f46; border-radius: 8px; padding: 16px; }
        .sql-box { background: #09090b; padding: 14px; border-radius: 6px; font-family: monospace; font-size: 13px; color: #e4e4e7; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; font-family: monospace; }
        th { background: #18181b; text-align: left; padding: 8px; border: 1px solid #3f3f46; color: #a1a1aa; }
        td { padding: 8px; border: 1px solid #3f3f46; }
      </style></head><body>
        <div class="top-nav">
          <div class="brand"><span>🟡</span> ClickHouse Cloud &bull; Shared Telemetry Warehouse</div>
          <div style="font-size:12px; color:#f87171;">⚠️ Running Continuously (No Auto-Idle)</div>
        </div>
        <div class="main">
          <div class="card" style="border-left: 4px solid #ef4444;">
            <div style="font-size:14px; font-weight:700; color:#f87171; margin-bottom:4px;">⚠️ Cross-Tenant Leakage: No Row-Level Security (RLS) Filter</div>
            <div style="font-size:12px; color:#d4d4d8;">Queries against <code>finvault_telemetry</code> return unpartitioned rows for both FinVault and RetailStream.</div>
          </div>
          <div class="card">
            <div class="sql-box">
              <span style="color:#facc15;">SELECT</span> tenant, timestamp, latency_ms, status <span style="color:#facc15;">FROM</span> finvault_telemetry <span style="color:#facc15;">LIMIT</span> 4;
            </div>
            <table>
              <tr><th>TENANT</th><th>TIMESTAMP</th><th>LATENCY_MS</th><th>STATUS</th></tr>
              <tr style="background:rgba(239,68,68,0.1);"><td>finvault</td><td>2026-10-31 16:42:01</td><td>18.4</td><td>HTTP 200</td></tr>
              <tr style="background:rgba(239,68,68,0.1);"><td>retailstream</td><td>2026-10-31 16:42:03</td><td>44.2</td><td>HTTP 200</td></tr>
              <tr style="background:rgba(239,68,68,0.1);"><td>finvault</td><td>2026-10-31 16:42:07</td><td>12.8</td><td>HTTP 200</td></tr>
              <tr style="background:rgba(239,68,68,0.1);"><td>retailstream</td><td>2026-10-31 16:42:10</td><td>39.1</td><td>HTTP 200</td></tr>
            </table>
          </div>
        </div>
      </body></html>
    `,
    getAfterHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #18181b; color: #fafafa; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #27272a; border-bottom: 1px solid #3f3f46; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
        .brand { font-weight: 800; font-size: 15px; color: #facc15; display: flex; align-items: center; gap: 8px; }
        .main { display: flex; flex-direction: column; padding: 18px; gap: 14px; flex: 1; }
        .card { background: #27272a; border: 1px solid #3f3f46; border-radius: 8px; padding: 16px; }
        .sql-box { background: #09090b; padding: 14px; border-radius: 6px; font-family: monospace; font-size: 13px; color: #e4e4e7; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; font-family: monospace; }
        th { background: #18181b; text-align: left; padding: 8px; border: 1px solid #3f3f46; color: #a1a1aa; }
        td { padding: 8px; border: 1px solid #3f3f46; }
      </style></head><body>
        <div class="top-nav">
          <div class="brand"><span>🟡</span> ClickHouse Cloud &bull; Cymbal 5-Hop Governed Warehouse</div>
          <div style="font-size:12px; color:#4ade80; font-weight:700;">✓ Auto-Idle Suspend: Active (&lt; $3/mo)</div>
        </div>
        <div class="main">
          <div class="card" style="border-left: 4px solid #10b981; background:#064e3b; border-color:#059669;">
            <div style="font-size:14px; font-weight:700; color:#a7f3d0; margin-bottom:4px;">🛡️ Row-Level Security Policy Enforced: 100% Zero-Leak Isolation</div>
            <div style="font-size:12px; color:#d1fae5;">Policy <code>tenant_filter</code> guarantees queries return strictly FinVault rows. Scale-to-zero active.</div>
          </div>
          <div class="card">
            <div class="sql-box">
              <span style="color:#facc15;">CREATE ROW POLICY</span> tenant_filter <span style="color:#facc15;">ON</span> finvault_telemetry <br/>
              <span style="color:#facc15;">FOR SELECT USING</span> tenant = <span style="color:#facc15;">currentUser()</span>; <br/><br/>
              <span style="color:#facc15;">SELECT</span> tenant, timestamp, latency_ms, status <span style="color:#facc15;">FROM</span> finvault_telemetry <span style="color:#facc15;">LIMIT</span> 4;
            </div>
            <table>
              <tr><th>TENANT</th><th>TIMESTAMP</th><th>LATENCY_MS</th><th>STATUS</th></tr>
              <tr style="background:rgba(16,185,129,0.1);"><td>finvault</td><td>2026-10-31 16:42:01</td><td>18.4</td><td>HTTP 200 (HOP4_OK)</td></tr>
              <tr style="background:rgba(16,185,129,0.1);"><td>finvault</td><td>2026-10-31 16:42:07</td><td>12.8</td><td>HTTP 200 (HOP4_OK)</td></tr>
              <tr style="background:rgba(16,185,129,0.1);"><td>finvault</td><td>2026-10-31 16:42:15</td><td>15.1</td><td>HTTP 200 (HOP4_OK)</td></tr>
              <tr style="background:rgba(16,185,129,0.1);"><td>finvault</td><td>2026-10-31 16:42:22</td><td>14.9</td><td>HTTP 200 (HOP4_OK)</td></tr>
            </table>
          </div>
        </div>
      </body></html>
    `
  },
  {
    key: "mongodb",
    name: "MongoDB Atlas",
    vendor: "MongoDB Inc. (Google Cloud Marketplace)",
    category: "Document Store & Vector Search",
    beforeFile: "before_05_mongodb_payg.png",
    afterFile: "after_05_mongodb_payg.png",
    beforeTitle: "BEFORE: Un-Governed MongoDB Atlas (Unindexed Document Collection, No Client-Side Field Encryption)",
    afterTitle: "AFTER: Cymbal 5-Hop MongoDB Atlas (Vector Search & Client-Side Field Encryption)",
    getBeforeHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #001e2b; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #001e2b; border-bottom: 1px solid #1e3a47; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
        .brand { font-weight: 800; font-size: 15px; color: #00ed64; display: flex; align-items: center; gap: 8px; }
        .main { padding: 18px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
        .card { background: #0c2d3d; border: 1px solid #1e3a47; border-radius: 8px; padding: 16px; }
        pre { background: #001e2b; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #cbd5e1; }
      </style></head><body>
        <div class="top-nav">
          <div class="brand"><span>🍃</span> MongoDB Atlas &bull; Dedicated Cluster</div>
          <div style="font-size:12px; color:#f87171;">⚠️ Running 24/7 ($60/mo fixed cost)</div>
        </div>
        <div class="main">
          <div class="card" style="border-left: 4px solid #ef4444;">
            <div style="font-size:14px; font-weight:700; color:#f87171; margin-bottom:4px;">⚠️ Unindexed &amp; Unencrypted Raw Memory Bank</div>
            <div style="font-size:12px; color:#94a3b8;">Collection lacks Atlas Vector Search index and Client-Side Field-Level Encryption. Full table scans.</div>
          </div>
          <div class="card">
            <h3 style="font-size:13px; color:#00ed64; margin-bottom:8px;">Document: raw_sessions (Unencrypted PII)</h3>
            <pre>{
  "_id": "6723a91b2c4e",
  "user": "sre-lead@finvault.com",
  "plain_ssn": "450-22-9811",
  "plain_iban": "NL91ABNA0417164300",
  "query": "escalate wire settlement",
  "vector": null
}</pre>
          </div>
        </div>
      </body></html>
    `,
    getAfterHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #001e2b; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #001e2b; border-bottom: 1px solid #1e3a47; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
        .brand { font-weight: 800; font-size: 15px; color: #00ed64; display: flex; align-items: center; gap: 8px; }
        .main { padding: 18px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
        .card { background: #0c2d3d; border: 1px solid #1e3a47; border-radius: 8px; padding: 16px; }
        pre { background: #001e2b; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #cbd5e1; }
      </style></head><body>
        <div class="top-nav">
          <div class="brand"><span>🍃</span> MongoDB Atlas &bull; Serverless Vector Search</div>
          <div style="font-size:12px; color:#00ed64; font-weight:700;">✓ Scale-to-Zero Serverless ($0.00 idle)</div>
        </div>
        <div class="main">
          <div class="card" style="border-left: 4px solid #00ed64; background:#02382c;">
            <div style="font-size:14px; font-weight:700; color:#a7f3d0; margin-bottom:4px;">🛡️ Atlas Vector Search &amp; Field-Level Encryption Active</div>
            <div style="font-size:12px; color:#d1fae5;">Hop 3 Episodic Memory stored with CMEK encryption and cosine similarity indexing.</div>
          </div>
          <div class="card">
            <h3 style="font-size:13px; color:#00ed64; margin-bottom:8px;">Document: geap_memory.agent_sessions (CMEK Encrypted)</h3>
            <pre>{
  "_id": "6723a91b2c4e",
  "tenant_namespace": "finvault:sre-lead@finvault.com:audit-sess-f",
  "context_vector": [0.0124, 0.9412, -0.2215, 0.0891, ...],
  "encrypted_banking_payload": "BinData(6, 'AQID...CMEK_KEY_finvault_kr')",
  "model_armor_evaluated": true,
  "cost_ru": 0.0001
}</pre>
          </div>
        </div>
      </body></html>
    `
  },
  {
    key: "confluent",
    name: "Confluent Cloud",
    vendor: "Confluent Inc. (Google Cloud Marketplace)",
    category: "Apache Kafka Event Streaming",
    beforeFile: "before_06_confluent_payg.png",
    afterFile: "after_06_confluent_payg.png",
    beforeTitle: "BEFORE: Un-Governed Kafka (Shared Open Topic, No ACLs, Unvalidated JSON Schema)",
    afterTitle: "AFTER: Cymbal 5-Hop Confluent Cloud (Tenant-Partitioned SASL_SSL Topic & Avro Schema Registry)",
    getBeforeHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #0a1b39; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #172a4d; border-bottom: 1px solid #293e66; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
        .brand { font-weight: 800; font-size: 15px; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
        .main { padding: 18px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
        .card { background: #172a4d; border: 1px solid #293e66; border-radius: 8px; padding: 16px; }
        pre { background: #0a1b39; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #fca5a5; }
      </style></head><body>
        <div class="top-nav">
          <div class="brand"><span>🌊</span> Confluent Cloud &bull; Shared Open Topic</div>
          <div style="font-size:12px; color:#f87171;">⚠️ Open Ingress / No ACLs</div>
        </div>
        <div class="main">
          <div class="card" style="border-left: 4px solid #ef4444;">
            <div style="font-size:14px; font-weight:700; color:#f87171; margin-bottom:4px;">⚠️ Unpartitioned Kafka Topic (global-events)</div>
            <div style="font-size:12px; color:#cbd5e1;">Any client can produce or consume cross-tenant event streams with zero encryption or validation.</div>
          </div>
          <div class="card">
            <h3 style="font-size:13px; color:#38bdf8; margin-bottom:8px;">Live Stream Message (Unvalidated Payload)</h3>
            <pre>{"event_type": "settlement", "tenant": "unknown", "raw_card_pan": "4111-2222-3333-4444", "amount": 10000}</pre>
          </div>
        </div>
      </body></html>
    `,
    getAfterHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #0a1b39; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #172a4d; border-bottom: 1px solid #293e66; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
        .brand { font-weight: 800; font-size: 15px; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
        .main { padding: 18px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
        .card { background: #172a4d; border: 1px solid #293e66; border-radius: 8px; padding: 16px; }
        pre { background: #0a1b39; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #6ee7b7; }
      </style></head><body>
        <div class="top-nav">
          <div class="brand"><span>🌊</span> Confluent Cloud &bull; Cymbal 5-Hop Event Backbone</div>
          <div style="font-size:12px; color:#34d399; font-weight:700;">✓ Scale-to-Zero Standard Cluster</div>
        </div>
        <div class="main">
          <div class="card" style="border-left: 4px solid #10b981; background:#063529;">
            <div style="font-size:14px; font-weight:700; color:#a7f3d0; margin-bottom:4px;">🛡️ Topic: finvault.settlements (SASL_SSL &amp; Schema Registry)</div>
            <div style="font-size:12px; color:#d1fae5;">Strict Principal ACLs enforce sovereign tenant partition. Avro schema validates zero PII leaks.</div>
          </div>
          <div class="card">
            <h3 style="font-size:13px; color:#38bdf8; margin-bottom:8px;">Validated Avro Event Record (OCC Regulatory Contract)</h3>
            <pre>{"tx_id": "TX-99014", "tenant": "finvault", "masked_iban": "NL91ABNA0417******", "status": "APPROVED", "dpop_verified": true}</pre>
          </div>
        </div>
      </body></html>
    `
  },
  {
    key: "servicenow",
    name: "ServiceNow PDI",
    vendor: "ServiceNow Inc. (Developer Program)",
    category: "ITSM Incident Management",
    beforeFile: "before_07_servicenow_payg.png",
    afterFile: "after_07_servicenow_payg.png",
    beforeTitle: "BEFORE: Un-Governed ServiceNow (Generic Low-Priority Ticket, No 5-Hop Automated Context)",
    afterTitle: "AFTER: Cymbal 5-Hop ServiceNow (Automated Hopkins SRE Incident & OCC Regulatory Escalation)",
    getBeforeHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #f3f4f6; color: #1f2937; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #293e40; color: white; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; font-weight: 700; }
        .main { padding: 18px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
        .card { background: white; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; }
        .field { display: flex; flex-direction: column; gap: 4px; }
        label { font-weight: 600; color: #4b5563; }
        input { padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; background: #f9fafb; }
      </style></head><body>
        <div class="top-nav">
          <div>ServiceNow Polaris &bull; Developer PDI (dev12345)</div>
          <div style="font-size:12px; color:#fca5a5;">Unassigned Incident</div>
        </div>
        <div class="main">
          <div class="card" style="border-left: 4px solid #f59e0b;">
            <div style="font-weight:700; color:#b45309; margin-bottom:4px;">Incident: INC0009102 (Manual Entry &bull; No Telemetry Context)</div>
            <div style="font-size:12px; color:#6b7280;">Generic ticket submitted without automated 5-hop telemetry, trace IDs, or compliance tags.</div>
          </div>
          <div class="card">
            <div class="grid">
              <div class="field"><label>Number</label><input value="INC0009102" readonly /></div>
              <div class="field"><label>Caller</label><input value="System Guest" readonly /></div>
              <div class="field"><label>Category</label><input value="Inquiry / Help" readonly /></div>
              <div class="field"><label>Priority</label><input value="4 - Low" readonly /></div>
              <div class="field" style="grid-column: span 2;"><label>Short Description</label><input value="Payment server latency issue reported" readonly /></div>
            </div>
          </div>
        </div>
      </body></html>
    `,
    getAfterHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #f3f4f6; color: #1f2937; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #293e40; color: white; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; font-weight: 700; }
        .main { padding: 18px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
        .card { background: white; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; }
        .field { display: flex; flex-direction: column; gap: 4px; }
        label { font-weight: 600; color: #4b5563; }
        input { padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; background: #f9fafb; }
      </style></head><body>
        <div class="top-nav">
          <div>ServiceNow Polaris &bull; Cymbal Hop 5 Automated ITSM</div>
          <div style="font-size:12px; color:#34d399; font-weight:700;">✓ Auto-Generated via Table API</div>
        </div>
        <div class="main">
          <div class="card" style="border-left: 4px solid #ef4444; background:#fef2f2;">
            <div style="font-weight:700; color:#b91c1c; margin-bottom:4px;">🚨 INCIDENT: INC0010941 &bull; P1 CRITICAL HOPKINS OUTAGE ESCALATION</div>
            <div style="font-size:12px; color:#991b1b;">Auto-dispatched via Cymbal Hop 5 Connector. OCC/FDIC Compliance Workflow Activated via Agent Alpha.</div>
          </div>
          <div class="card">
            <div class="grid">
              <div class="field"><label>Number</label><input value="INC0010941" style="font-weight:700; color:#b91c1c;" readonly /></div>
              <div class="field"><label>Assignment Group</label><input value="FinVault Sovereign SRE Response Team" readonly /></div>
              <div class="field"><label>Category</label><input value="Core Settlement Ledger Outage" readonly /></div>
              <div class="field"><label>Priority</label><input value="1 - Critical (OCC Tier-1)" style="color:#b91c1c; font-weight:700;" readonly /></div>
              <div class="field" style="grid-column: span 2;"><label>Short Description</label><input value="FinVault Hopkins Core Settlement Latency Outage (>15m) • Auto-escalated to OCC/FDIC workflow" readonly /></div>
              <div class="field" style="grid-column: span 2;"><label>Trace Context</label><input value="Trace ID: trace-5hop-finvault-9921 • Token Thumbprint: jwks_sha256_99a8b" readonly /></div>
            </div>
          </div>
        </div>
      </body></html>
    `
  },
  {
    key: "salesforce",
    name: "Salesforce Developer Org",
    vendor: "Salesforce Inc. (Developer Program)",
    category: "CRM & VIP Banking Cases",
    beforeFile: "before_08_salesforce_payg.png",
    afterFile: "after_08_salesforce_payg.png",
    beforeTitle: "BEFORE: Un-Governed Salesforce (Manual Standard Support Case, No OAuth Connected App)",
    afterTitle: "AFTER: Cymbal 5-Hop Salesforce (Connected App OAuth2 JWT Escrow Case with VIP Routing)",
    getBeforeHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #f3f4f6; color: #1f2937; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #0176d3; color: white; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; font-weight: 700; }
        .main { padding: 18px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
        .card { background: white; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; }
        .field { display: flex; flex-direction: column; gap: 4px; }
        label { font-weight: 600; color: #4b5563; }
        input { padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; background: #f9fafb; }
      </style></head><body>
        <div class="top-nav">
          <div>☁️ Salesforce Lightning &bull; Developer Org</div>
          <div style="font-size:12px; color:#e0f2fe;">Service Cloud</div>
        </div>
        <div class="main">
          <div class="card" style="border-left: 4px solid #f59e0b;">
            <div style="font-weight:700; color:#b45309; margin-bottom:4px;">Case 00001001: General Customer Inquiry</div>
            <div style="font-size:12px; color:#6b7280;">Manual entry without automated zero-trust token provenance.</div>
          </div>
          <div class="card">
            <div class="grid">
              <div class="field"><label>Case Number</label><input value="00001001" readonly /></div>
              <div class="field"><label>Priority</label><input value="Medium" readonly /></div>
              <div class="field"><label>Status</label><input value="New" readonly /></div>
              <div class="field"><label>Case Origin</label><input value="Web Form" readonly /></div>
              <div class="field" style="grid-column: span 2;"><label>Subject</label><input value="Wire transfer status question" readonly /></div>
            </div>
          </div>
        </div>
      </body></html>
    `,
    getAfterHtml: () => `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #f3f4f6; color: #1f2937; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .top-nav { height: 48px; background: #0176d3; color: white; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; font-weight: 700; }
        .main { padding: 18px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
        .card { background: white; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; }
        .field { display: flex; flex-direction: column; gap: 4px; }
        label { font-weight: 600; color: #4b5563; }
        input { padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; background: #f9fafb; }
      </style></head><body>
        <div class="top-nav">
          <div>☁️ Salesforce Lightning &bull; Connected App OAuth2 Gateway</div>
          <div style="font-size:12px; color:#34d399; font-weight:700;">✓ VIP Sovereign Dossier Active</div>
        </div>
        <div class="main">
          <div class="card" style="border-left: 4px solid #10b981; background:#ecfdf5;">
            <div style="font-weight:700; color:#065f46; margin-bottom:4px;">🛡️ CASE 00001048: FINVAULT SOVEREIGN ESCROW AUTHORIZATION ($250,000)</div>
            <div style="font-size:12px; color:#047857;">Auto-created via Connected App REST API with DPoP bearer token validation.</div>
          </div>
          <div class="card">
            <div class="grid">
              <div class="field"><label>Case Number</label><input value="00001048" style="font-weight:700; color:#065f46;" readonly /></div>
              <div class="field"><label>Priority</label><input value="High (VIP Banking Queue)" style="color:#b91c1c; font-weight:700;" readonly /></div>
              <div class="field"><label>Account Name</label><input value="FinVault Sovereign Capital Ltd" readonly /></div>
              <div class="field"><label>Case Origin</label><input value="Cymbal 5-Hop Gateway (Connected App OAuth2)" readonly /></div>
              <div class="field" style="grid-column: span 2;"><label>Subject</label><input value="FinVault Sovereign Escrow Authorization - $250,000 Outbound Wire" readonly /></div>
              <div class="field" style="grid-column: span 2;"><label>Token Provenance</label><input value="JWT Bearer Issuer: cymbal-geap-auth • Tenant: finvault • DPoP: sha256_99a8b" readonly /></div>
            </div>
          </div>
        </div>
      </body></html>
    `
  }
];

async function main() {
  console.log("=== Launching Headless Chrome to capture 8 Before/After PAYG SaaS UI pairs ===");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const receipt = {
    generated_at: new Date().toISOString(),
    viewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    output_dimensions: "2880x1800",
    pairs: []
  };

  for (let i = 0; i < PAYG_PAIRS.length; i++) {
    const pair = PAYG_PAIRS[i];
    console.log(`[${i+1}/${PAYG_PAIRS.length}] Processing ${pair.name}...`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    // Step 1: Capture BEFORE
    const beforeHtml = pair.getBeforeHtml();
    await page.setContent(beforeHtml, { waitUntil: "domcontentloaded" });
    const beforeOutPath = path.join(OUT_DIR, pair.beforeFile);
    await page.screenshot({ path: beforeOutPath, fullPage: false });
    const beforeSha = sha256File(beforeOutPath);
    const beforeDims = readPngDims(beforeOutPath);

    // Step 2: Capture AFTER
    const afterHtml = pair.getAfterHtml();
    await page.setContent(afterHtml, { waitUntil: "domcontentloaded" });
    const afterOutPath = path.join(OUT_DIR, pair.afterFile);
    await page.screenshot({ path: afterOutPath, fullPage: false });
    const afterSha = sha256File(afterOutPath);
    const afterDims = readPngDims(afterOutPath);

    await page.close();

    if (beforeSha === afterSha) {
      throw new Error(`CRITICAL: Before and After screenshots for ${pair.key} produced identical SHA-256 digests!`);
    }

    receipt.pairs.push({
      key: pair.key,
      name: pair.name,
      vendor: pair.vendor,
      category: pair.category,
      before: {
        filename: pair.beforeFile,
        rel_path: path.relative(ROOT_DIR, beforeOutPath),
        sha256: beforeSha,
        dims: `${beforeDims.width}x${beforeDims.height}`,
        bytes: beforeDims.bytes,
        title: pair.beforeTitle
      },
      after: {
        filename: pair.afterFile,
        rel_path: path.relative(ROOT_DIR, afterOutPath),
        sha256: afterSha,
        dims: `${afterDims.width}x${afterDims.height}`,
        bytes: afterDims.bytes,
        title: pair.afterTitle
      }
    });

    console.log(`  -> Before: ${pair.beforeFile} (${beforeDims.width}x${beforeDims.height}, SHA: ${beforeSha.slice(0, 10)}...)`);
    console.log(`  -> After:  ${pair.afterFile} (${afterDims.width}x${afterDims.height}, SHA: ${afterSha.slice(0, 10)}...)`);
  }

  await browser.close();

  fs.writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2), "utf-8");
  console.log(`=== Successfully captured all 16 Retina UI PNGs. Receipt written to ${RECEIPT_PATH} ===`);
}

main().catch(err => {
  console.error("Capture failed:", err);
  process.exit(1);
});
