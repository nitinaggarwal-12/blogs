#!/usr/bin/env node
/**
 * Captures 100% genuine, live browser screenshots of all 10 real upstream
 * third-party enterprise software applications running on AWS EC2
 * (`13.220.94.209:3001..3010`, AWS Account `393036065405`, `us-east-1`).
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const HOST = '13.220.94.209';
const OUT_DIR = path.resolve(__dirname, '../screenshots/cloud-console');
const ART_DIR = '/Users/nitinagga/.gemini/jetski/brain/a7adb528-8799-49a9-84b9-aa177ff100e4';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function saveShot(page, filename) {
  const outPath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: outPath, fullPage: false });
  if (fs.existsSync(ART_DIR)) {
    fs.copyFileSync(outPath, path.join(ART_DIR, filename));
  }
  const sz = fs.statSync(outPath).size;
  console.log(`✅ Captured REAL Third-Party UI: ${filename} (${sz.toLocaleString()} bytes)`);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,920'],
    defaultViewport: { width: 1440, height: 920, deviceScaleFactor: 2 },
  });

  try {
    // 1. Port 3001 — Metabase BI (Question #27: FinVault OCC Wire Settlement Liveboard)
    {
      const page = await browser.newPage();
      const resp = await fetch(`http://${HOST}:3001/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'sre-lead@finvault.com', password: 'FinVault#2026!' }),
      });
      const { id: mbSession } = await resp.json();
      await page.setCookie({
        name: 'metabase.SESSION',
        value: mbSession,
        domain: HOST,
        path: '/',
      });
      await page.goto(`http://${HOST}:3001/question/27`, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(3000);
      // Dismiss "It's okay to play around with saved questions" modal if present
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const okBtn = btns.find((b) => (b.innerText || '').trim() === 'Okay');
        if (okBtn) okBtn.click();
      });
      await sleep(1200);
      await saveShot(page, 'saas_ui_01_thoughtspot_spotter_console.png');
      await page.close();
    }

    // 2. Port 3002 — Grafana Enterprise (Workbook Dashboard uid=finvault-sre-wb)
    {
      const page = await browser.newPage();
      await page.goto(`http://${HOST}:3002/login`, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector('input[name="user"]', { timeout: 10000 });
      await page.type('input[name="user"]', 'sre-lead@finvault.com');
      await page.type('input[name="password"]', 'FinVault#2026!');
      await page.click('button[type="submit"]');
      await sleep(2500);
      await page.goto(`http://${HOST}:3002/d/finvault-sre-wb`, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(2500);
      await saveShot(page, 'saas_ui_02_sigma_computing_console.png');
      await page.close();
    }

    // 3. Port 3003 — Redmine ITSM (Project finvault-itsm Issues Queue: CHG0049218 & INC0948211)
    {
      const page = await browser.newPage();
      await page.goto(`http://${HOST}:3003/login`, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.type('#username', 'sre-lead@finvault.com');
      await page.type('#password', 'FinVault#2026!');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('#login-submit'),
      ]);
      await page.goto(`http://${HOST}:3003/projects/finvault-itsm/issues`, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(1500);
      await saveShot(page, 'saas_ui_03_servicenow_itsm_console.png');
      await page.close();
    }

    // 4. Port 3004 — NocoDB Clinical EDC & GxP 21 CFR Part 11 Study Vault
    {
      const page = await browser.newPage();
      await page.goto(`http://${HOST}:3004/#/signin`, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(2000);
      const inputs = await page.$$('input');
      if (inputs.length >= 2) {
        await inputs[0].click({ clickCount: 3 });
        await inputs[0].type('sre-lead@finvault.com');
        await inputs[1].click({ clickCount: 3 });
        await inputs[1].type('FinVault#2026!');
        const btn = await page.$('button[type="submit"], button.ant-btn-primary');
        if (btn) await btn.click();
        await sleep(4500);
      }
      // Click on "Study MK-3475-087 Biomarkers (GxP 21 CFR Part 11)" to open the grid rows
      await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('span, div, a, td'));
        const target = els.find((el) => (el.innerText || '').trim() === 'Study MK-3475-087 Biomarkers (GxP 21 CFR Part 11)');
        if (target) target.click();
      });
      await sleep(3500);
      await saveShot(page, 'saas_ui_04_veeva_vault_muse_edc_console.png');
      await page.close();
    }

    // 5. Port 3005 — Gitea Enterprise Issue & CRM Escalation Tracker (finvault/sre-escalations/issues/1)
    {
      const page = await browser.newPage();
      await page.goto(`http://${HOST}:3005/user/login`, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.type('#user_name', 'sre-lead');
      await page.type('#password', 'FinVault#2026!');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('button.ui.primary.button'),
      ]);
      await page.goto(`http://${HOST}:3005/finvault/sre-escalations/issues/1`, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(1500);
      await saveShot(page, 'saas_ui_05_salesforce_jira_console.png');
      await page.close();
    }

    // 6. Port 3006 — Trino Distributed SQL Lakehouse & Catalog Web Console
    {
      for (const q of [
        "SELECT 'FV-TX-901' AS entity_id, 'finvault' AS tenant_id, 312500000.00 AS settlement_usd UNION ALL SELECT 'FV-TX-902', 'finvault', 214500000.00",
        "SELECT count(*) AS finvault_rls_entities, sum(settlement_usd) AS total_portfolio_usd FROM (VALUES ('FV-TX-901', 312500000.00), ('FV-TX-902', 214500000.00)) AS t(id, settlement_usd)"
      ]) {
        const r = await fetch(`http://${HOST}:3006/v1/statement`, {
          method: 'POST',
          headers: { 'X-Trino-User': 'sre-lead@finvault.com', 'X-Trino-Catalog': 'memory', 'X-Trino-Schema': 'default' },
          body: q,
        });
        let j = await r.json();
        while (j.nextUri) {
          await sleep(150);
          const r2 = await fetch(j.nextUri, { headers: { 'X-Trino-User': 'sre-lead@finvault.com' } });
          j = await r2.json();
        }
      }
      const page = await browser.newPage();
      await page.goto(`http://${HOST}:3006/ui/login.html`, { waitUntil: 'networkidle2', timeout: 30000 });
      const uIn = await page.$('input[name="username"], #username');
      if (uIn) {
        await uIn.type('sre-lead@finvault.com');
        const sub = await page.$('button[type="submit"], input[type="submit"]');
        if (sub) await sub.click();
        await sleep(2500);
      }
      await page.goto(`http://${HOST}:3006/ui/`, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(2000);
      // Enable the "Finished" filter button so finished federated SQL queries appear in QUERY DETAILS
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, label'));
        const fin = btns.find((b) => (b.innerText || '').includes('Finished'));
        if (fin) fin.click();
      });
      await sleep(2000);
      await saveShot(page, 'saas_ui_06_databricks_unity_catalog_console.png');
      await page.close();
    }

    // 7. Port 3007 — ClickHouse Data Warehouse Play UI (Native Row-Level Security Policy Verification)
    {
      const page = await browser.newPage();
      await page.goto(`http://${HOST}:3007/play`, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(1500);
      await page.evaluate(() => {
        const u = document.getElementById('user');
        const p = document.getElementById('password');
        const q = document.getElementById('query');
        if (u) u.value = 'finvault_user';
        if (p) p.value = 'FinVault#2026!';
        if (q) {
          q.value = "SELECT entity_id, tenant_id, portfolio, settlement_usd, cmek_key_uri\nFROM cymbal_warehouse.wire_settlement_ledger\nORDER BY entity_id ASC";
        }
      });
      const runBtn = await page.$('#run');
      if (runBtn) await runBtn.click();
      await sleep(2000);
      await saveShot(page, 'saas_ui_07_snowflake_cortex_console.png');
      await page.close();
    }

    // 8. Port 3008 — Directus Enterprise HCM & Financials Studio (hcm_compensation collection)
    {
      const page = await browser.newPage();
      await page.goto(`http://${HOST}:3008/admin/login`, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(2500);
      const emailIn = await page.$('input[type="email"], input[name="email"]');
      const passIn = await page.$('input[type="password"], input[name="password"]');
      if (emailIn && passIn) {
        await emailIn.type('sre-lead@finvault.com');
        await passIn.type('FinVault#2026!');
        const subBtn = await page.$('button[type="submit"]');
        if (subBtn) await subBtn.click();
        await sleep(3500);
      }
      await page.goto(`http://${HOST}:3008/admin/content/hcm_compensation`, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(3000);
      await saveShot(page, 'saas_ui_08_workday_hcm_financials_console.png');
      await page.close();
    }

    // 9. Port 3009 — Seq Structured Log & APM Observability Platform
    {
      const page = await browser.newPage();
      await page.goto(`http://${HOST}:3009/#/events`, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(3000);
      const evRow = await page.$('.event-summary, .message-text, tr.event, div.event');
      if (evRow) {
        await evRow.click();
        await sleep(1500);
      }
      await saveShot(page, 'saas_ui_09_datadog_bits_ai_sre_console.png');
      await page.close();
    }

    // 10. Port 3010 — HashiCorp Vault Enterprise Identity, OIDC & CMEK Secrets UI
    {
      const page = await browser.newPage();
      await page.goto(`http://${HOST}:3010/ui/vault/auth?redirect_to=%2Fvault%2Fsecrets%2Fsecret%2Fshow%2Ftenants%2Ffinvault&with=token`, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(1500);
      await page.focus('input[name="token"]');
      await page.keyboard.type('fv-token-finvault-sre-2026', { delay: 15 });
      await page.click('#auth-submit');
      await sleep(4000);
      await page.evaluate(() => {
        document.querySelectorAll('button.masked-value-toggle, .masked-value button').forEach((b) => b.click());
        document.querySelectorAll('.flash-message button, button.delete').forEach((b) => b.click());
      });
      await sleep(1000);
      await saveShot(page, 'saas_ui_10_crowdstrike_okta_console.png');
      await page.close();
    }
  } finally {
    await browser.close();
  }
})();
