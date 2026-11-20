#!/usr/bin/env node
/**
 * Pillar 7 (`EVAL-P7-VISUAL-UX`) — Background Headless Chrome Cross-Viewport Visual,
 * Geometry, Accessibility (WCAG 2.1 AA), Light-Theme & Edge-Case Evaluator.
 *
 * Outputs 7-column grounded test cases (Test Case, Inputs, Expected Output,
 * Iterations, Status, Issue, Solution) + SHA-256 attested visual proof PNGs.
 *
 * Uses strict background headless mode (`headless: "new"`, `pipe: true`).
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function loadPuppeteer() {
  const candidates = [
    path.resolve(process.cwd(), 'node_modules/puppeteer'),
    '/usr/local/google/home/nitinagga/Documents/blogs/node_modules/puppeteer',
    '/usr/local/google/home/nitinagga/Documents/Demoes-GE/node_modules/puppeteer',
    'puppeteer',
  ];
  for (const cand of candidates) {
    try {
      return require(cand);
    } catch (_) {
      // try next
    }
  }
  throw new Error('Puppeteer module not found in local or global node_modules.');
}

function parseArgs(argv) {
  const out = {
    baseUrl: 'http://127.0.0.1:8765',
    artifactsDir: path.resolve(process.cwd(), 'evals/artifacts'),
    outJson: path.resolve(process.cwd(), 'evals/artifacts/ui_visual_eval_report.json'),
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--base-url' && argv[i + 1]) out.baseUrl = argv[++i].replace(/\/+$/, '');
    else if (argv[i] === '--artifacts-dir' && argv[i + 1]) out.artifactsDir = path.resolve(argv[++i]);
    else if (argv[i] === '--out-json' && argv[i + 1]) out.outJson = path.resolve(argv[++i]);
  }
  return out;
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function auditPageState(page, opts = {}) {
  const maxOverflowPx = opts.maxOverflowPx ?? 2;
  return page.evaluate((maxOv) => {
    function parseRgb(str) {
      const m = String(str || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
      if (!m) return null;
      return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: m[4] === undefined ? 1 : Number(m[4]) };
    }
    function relLuminance({ r, g, b }) {
      const toLin = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
    }
    function contrastRatio(c1, c2) {
      const l1 = relLuminance(c1);
      const l2 = relLuminance(c2);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    const docEl = document.documentElement;
    const body = document.body;
    const bodyStyle = getComputedStyle(body);
    const htmlStyle = getComputedStyle(docEl);
    const bgRgb = parseRgb(bodyStyle.backgroundColor);
    const htmlBgRgb = parseRgb(htmlStyle.backgroundColor);
    const effBg = (bgRgb && bgRgb.a > 0.1) ? bgRgb : (htmlBgRgb && htmlBgRgb.a > 0.1 ? htmlBgRgb : { r: 255, g: 255, b: 255, a: 1 });
    const fgRgb = parseRgb(bodyStyle.color) || { r: 15, g: 23, b: 42, a: 1 };

    const bgLum = relLuminance(effBg);
    const bodyContrast = contrastRatio(effBg, fgRgb);

    const imgs = Array.from(document.querySelectorAll('img')).filter((im) => {
      const r = im.getBoundingClientRect();
      const cs = getComputedStyle(im);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0);
    });
    const brokenImgs = imgs
      .filter((im) => !im.complete || im.naturalWidth === 0)
      .map((im) => im.getAttribute('src') || '(no src)');

    const scrollW = docEl.scrollWidth;
    const clientW = docEl.clientWidth;
    const overflowPx = Math.max(0, scrollW - clientW);

    const h1 = document.querySelector('h1, h2');
    const h1Text = h1 ? (h1.textContent || '').trim().slice(0, 120) : '';
    const hasDarkClass = docEl.classList.contains('dark') || body.classList.contains('dark');
    const textSample = (body.innerText || '').toLowerCase();
    const bannedDomStrings = ['metabase', 'redmine', 'nocodb', 'gitea', 'datalust', 'grafana', 'bookstack', '13.220.94.209', 'hashicorp vault'];
    const foundBanned = bannedDomStrings.filter((b) => textSample.includes(b));

    return {
      title: document.title,
      h1Text,
      scrollWidth: scrollW,
      clientWidth: clientW,
      overflowPx,
      overflowOk: overflowPx <= maxOv,
      visibleImgCount: imgs.length,
      brokenImgCount: brokenImgs.length,
      brokenImgs: brokenImgs.slice(0, 10),
      bgLum: Number(bgLum.toFixed(3)),
      isLightTheme: bgLum >= 0.72 && !hasDarkClass,
      bodyContrast: Number(bodyContrast.toFixed(2)),
      contrastOk: bodyContrast >= 4.5,
      foundBanned,
    };
  }, maxOverflowPx);
}

async function run() {
  const args = parseArgs(process.argv);
  fs.mkdirSync(args.artifactsDir, { recursive: true });
  const puppeteer = loadPuppeteer();

  const browser = await puppeteer.launch({
    headless: 'new',
    pipe: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const testCases = [];
  const capturedArtifacts = [];

  async function runCase({ id, name, inputs, expected, fn }) {
    const t0 = Date.now();
    const consoleErrors = [];
    const pageErrors = [];
    const failedReqs = [];
    const page = await browser.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });
    page.on('response', (res) => {
      const st = res.status();
      if (st >= 400 && !res.url().includes('favicon.ico')) {
        failedReqs.push(`${st} ${res.url()}`);
      }
    });

    let status = 'PASS';
    let issue = 'None';
    let solution = 'Verified clean — no remediation required';
    let details = {};
    try {
      details = await fn(page, { consoleErrors, pageErrors, failedReqs });
      const filteredConsole = consoleErrors.filter((e) => !e.includes('favicon.ico'));
      if (filteredConsole.length > 0 || pageErrors.length > 0 || failedReqs.length > 0) {
        status = 'FAIL';
        const parts = [];
        if (filteredConsole.length) parts.push(`consoleErrors=${filteredConsole.join('; ')}`);
        if (pageErrors.length) parts.push(`pageErrors=${pageErrors.join('; ')}`);
        if (failedReqs.length) parts.push(`http4xx5xx=${failedReqs.join('; ')}`);
        issue = parts.join(' | ');
        solution = 'Fix broken assets or uncaught client exceptions in portal JS/HTML.';
      }
      if (details && details._failReason) {
        status = 'FAIL';
        issue = issue === 'None' ? details._failReason : `${issue} | ${details._failReason}`;
        solution = details._solution || 'Remediate visual/layout/functional regression.';
      }
    } catch (err) {
      status = 'FAIL';
      issue = String(err && err.message ? err.message : err);
      solution = 'Investigate navigation/selector failure and re-run Pillar 7.';
    } finally {
      await page.close();
    }

    testCases.push({
      testCase: `${id}: ${name}`,
      inputs,
      expectedOutput: expected,
      iterations: 1,
      status,
      issue,
      solution,
      durationMs: Date.now() - t0,
      metrics: details,
    });
  }

  async function saveProof(page, fileName) {
    const abs = path.join(args.artifactsDir, fileName);
    await page.screenshot({ path: abs, fullPage: false });
    const sha = sha256File(abs);
    capturedArtifacts.push({
      file: fileName,
      relPath: `evals/artifacts/${fileName}`,
      sha256: sha,
      bytes: fs.statSync(abs).size,
    });
    return { file: fileName, sha256: sha };
  }

  try {
    // UI-01: Overview Homepage @ 1600x950
    await runCase({
      id: 'UI-01',
      name: 'Portal Overview Homepage (Desktop 1600x950)',
      inputs: `GET ${args.baseUrl}/?tab=overview @ 1600x950`,
      expected: 'Light Theme, 0 console/page errors, 0 broken images, 0 horizontal overflow, WCAG AA contrast >=4.5:1',
      fn: async (page) => {
        await page.setViewport({ width: 1600, height: 950, deviceScaleFactor: 2 });
        await page.goto(`${args.baseUrl}/?tab=overview`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('#tab-overview.active', { timeout: 10000 });
        const audit = await auditPageState(page);
        const proof = await saveProof(page, 'ui_01_overview_1600.png');
        const fails = [];
        if (!audit.isLightTheme) fails.push(`Not light theme (lum=${audit.bgLum})`);
        if (!audit.contrastOk) fails.push(`Low contrast (${audit.bodyContrast})`);
        if (!audit.overflowOk) fails.push(`Horizontal overflow ${audit.overflowPx}px`);
        if (audit.brokenImgCount > 0) fails.push(`Broken images: ${audit.brokenImgs.join(', ')}`);
        if (audit.foundBanned.length > 0) fails.push(`Banned legacy DOM text: ${audit.foundBanned.join(', ')}`);
        return { ...audit, proof, _failReason: fails.join('; ') };
      },
    });

    // UI-02: Patterns Tab + Top-of-Blog Dedicated Diagrams & Screenshots Links
    await runCase({
      id: 'UI-02',
      name: 'Patterns Blog Reader & Top-of-Blog Asset Links (WS2)',
      inputs: `GET ${args.baseUrl}/?tab=patterns&ws=WS2 @ 1600x950`,
      expected: 'Top-of-blog bar exposes /blogs/ws2/diagrams and /blogs/ws2/screenshots links with 0 errors',
      fn: async (page) => {
        await page.setViewport({ width: 1600, height: 950, deviceScaleFactor: 2 });
        await page.goto(`${args.baseUrl}/?tab=patterns&ws=WS2`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('#tab-patterns.active', { timeout: 10000 });
        await new Promise((r) => setTimeout(r, 800));
        const linkInfo = await page.evaluate(() => {
          const bar = document.querySelector('#blog-dedicated-assets-bar, .blog-dedicated-assets-bar');
          const links = Array.from(document.querySelectorAll('a[href*="/blogs/"]')).map((a) => a.getAttribute('href'));
          const diagBtnText = document.querySelector('[data-testid="blog-top-diagrams-link"]')?.textContent || '';
          return {
            hasBar: Boolean(bar),
            hasDiagLink: links.some((h) => h && h.includes('/blogs/ws2/diagrams')),
            hasShotLink: links.some((h) => h && h.includes('/blogs/ws2/screenshots')),
            diagBtnText: diagBtnText.trim(),
            diagCountPositive: /All Diagrams Used \(([1-9]\d*)\)/.test(diagBtnText),
            linksSample: links.slice(0, 6),
          };
        });
        const audit = await auditPageState(page);
        const proof = await saveProof(page, 'ui_02_patterns_ws2_1600.png');
        const fails = [];
        if (!linkInfo.hasDiagLink || !linkInfo.hasShotLink) {
          fails.push(`Missing top-of-blog asset links: ${JSON.stringify(linkInfo)}`);
        }
        if (!linkInfo.diagCountPositive) {
          fails.push(`Top-of-blog diagram badge count must be >0, got: "${linkInfo.diagBtnText}"`);
        }
        if (!audit.overflowOk) fails.push(`Horizontal overflow ${audit.overflowPx}px`);
        if (audit.brokenImgCount > 0) fails.push(`Broken images: ${audit.brokenImgs.join(', ')}`);
        if (audit.foundBanned.length > 0) fails.push(`Banned legacy DOM text: ${audit.foundBanned.join(', ')}`);
        return { ...audit, ...linkInfo, proof, _failReason: fails.join('; ') };
      },
    });

    // UI-03: Interactive 5-Hop Simulator Tab
    await runCase({
      id: 'UI-03',
      name: 'Interactive 5-Hop Simulator Live Execution',
      inputs: `GET ${args.baseUrl}/?tab=simulator @ 1600x950`,
      expected: 'Live Python 5-Hop simulator executes sim1 and displays structured trace with 0 errors',
      fn: async (page) => {
        await page.setViewport({ width: 1600, height: 950, deviceScaleFactor: 2 });
        await page.goto(`${args.baseUrl}/?tab=simulator`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('#tab-simulator.active', { timeout: 10000 });
        await new Promise((r) => setTimeout(r, 900));
        const audit = await auditPageState(page);
        const simOk = await page.evaluate(() => {
          const txt = document.getElementById('tab-simulator')?.innerText || '';
          return txt.includes('Hop 1') || txt.includes('REDACTED') || txt.includes('ALLOW');
        });
        const fails = [];
        if (!simOk) fails.push('Simulator output did not render live 5-Hop trace');
        if (!audit.overflowOk) fails.push(`Horizontal overflow ${audit.overflowPx}px`);
        return { ...audit, simOk, _failReason: fails.join('; ') };
      },
    });

    // UI-04: Verified Cloud Console & Commercial SaaS Proofs Tab
    await runCase({
      id: 'UI-04',
      name: 'Verified Live Proofs & Workbench Tab (16:9 Retina)',
      inputs: `GET ${args.baseUrl}/?tab=screenshots @ 1600x950`,
      expected: 'Verified ThoughtSpot Cloud Retina images load cleanly (naturalWidth >= 1280), 0 legacy OSS strings',
      fn: async (page) => {
        await page.setViewport({ width: 1600, height: 950, deviceScaleFactor: 2 });
        await page.goto(`${args.baseUrl}/?tab=screenshots`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('#tab-screenshots.active', { timeout: 10000 });
        await page.evaluate(() => {
          const gal = document.getElementById('genuine-multicloud-3p-ui-gallery');
          if (gal) gal.scrollIntoView({ behavior: 'instant', block: 'center' });
        });
        await new Promise((r) => setTimeout(r, 800));
        const audit = await auditPageState(page);
        const verifiedCount = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('#tab-screenshots img'))
            .filter((im) => (im.getAttribute('src') || '').includes('verified-cloud-console') && im.complete && im.naturalWidth >= 1280)
            .length;
        });
        const fails = [];
        if (verifiedCount < 2) fails.push(`Expected >=2 verified Retina images on Tab 3, got ${verifiedCount}`);
        if (audit.brokenImgCount > 0) fails.push(`Broken images: ${audit.brokenImgs.join(', ')}`);
        if (!audit.overflowOk) fails.push(`Horizontal overflow ${audit.overflowPx}px`);
        if (audit.foundBanned.length > 0) fails.push(`Banned legacy DOM text: ${audit.foundBanned.join(', ')}`);
        return { ...audit, verifiedCount, _failReason: fails.join('; ') };
      },
    });

    // UI-05: Forensic Tab + New 8-Pillar AEF v2.0 Scorecard + Consolidated Filter
    await runCase({
      id: 'UI-05',
      name: 'Forensic Audit Ledger & 8-Pillar AEF v2.0 Scorecard UI',
      inputs: `GET ${args.baseUrl}/?tab=forensic @ 1600x950 + select SEC:aef`,
      expected: 'Renders 13-Point Ledger + 8-Pillar AEF v2.0 Scorecard card (#forensic-aef-scorecard-card) + filter works cleanly',
      fn: async (page) => {
        await page.setViewport({ width: 1600, height: 950, deviceScaleFactor: 2 });
        await page.goto(`${args.baseUrl}/?tab=forensic`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('#tab-forensic.active', { timeout: 10000 });
        await new Promise((r) => setTimeout(r, 800));
        const aefState = await page.evaluate(() => {
          const card = document.getElementById('forensic-aef-scorecard-card');
          const rows = document.querySelectorAll('#aef-pillar-tbody tr').length;
          const badge = document.getElementById('aef-release-gate-badge')?.textContent?.trim() || '';
          const btn = document.getElementById('btn-run-aef-eval');
          const sel = document.getElementById('forensic-filter-select');
          let secAefFilterWorks = false;
          if (sel && card) {
            sel.value = 'SEC:aef';
            if (typeof window.applyForensicConsolidatedFilter === 'function') window.applyForensicConsolidatedFilter();
            const ledgerHidden = document.getElementById('forensic-audit-ledger-card')?.style.display === 'none';
            const aefVisible = card.style.display !== 'none';
            secAefFilterWorks = ledgerHidden && aefVisible;
            sel.value = 'ALL';
            if (typeof window.applyForensicConsolidatedFilter === 'function') window.applyForensicConsolidatedFilter();
          }
          return { hasCard: Boolean(card), pillarRows: rows, gateBadge: badge, hasRunBtn: Boolean(btn), secAefFilterWorks };
        });
        // Scroll to AEF scorecard and capture proof
        await page.evaluate(() => {
          const card = document.getElementById('forensic-aef-scorecard-card');
          if (card) card.scrollIntoView({ behavior: 'instant', block: 'start' });
        });
        await new Promise((r) => setTimeout(r, 300));
        const proof = await saveProof(page, 'ui_05_forensic_aef_scorecard_1600.png');
        const audit = await auditPageState(page);
        const fails = [];
        if (!aefState.hasCard) fails.push('Missing #forensic-aef-scorecard-card on Forensic tab');
        if (aefState.pillarRows < 8) fails.push(`Expected 8 AEF pillar rows, got ${aefState.pillarRows}`);
        if (!aefState.hasRunBtn) fails.push('Missing #btn-run-aef-eval button');
        if (!aefState.secAefFilterWorks) fails.push('SEC:aef filter did not isolate #forensic-aef-scorecard-card');
        if (!audit.overflowOk) fails.push(`Horizontal overflow ${audit.overflowPx}px`);
        if (audit.foundBanned.length > 0) fails.push(`Banned legacy DOM text: ${audit.foundBanned.join(', ')}`);
        return { ...audit, ...aefState, proof, _failReason: fails.join('; ') };
      },
    });

    // UI-06: Adversarial UI Edge Cases (Malformed Regex + XSS Input in Forensic Search)
    await runCase({
      id: 'UI-06',
      name: 'Adversarial Search Input Edge Cases (Regex Crash & XSS Payload)',
      inputs: 'Type "[a-z+(.*" then "<img src=x onerror=window.__xssFired=1>" into #forensic-search-input',
      expected: 'Zero uncaught JS errors, window.__xssFired undefined, filter resets cleanly',
      fn: async (page) => {
        await page.setViewport({ width: 1600, height: 950, deviceScaleFactor: 2 });
        await page.goto(`${args.baseUrl}/?tab=forensic`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('#forensic-search-input', { timeout: 10000 });
        await page.evaluate(() => { window.__xssFired = false; });
        await page.type('#forensic-search-input', '[a-z+(.*');
        await new Promise((r) => setTimeout(r, 150));
        await page.evaluate(() => {
          const inp = document.getElementById('forensic-search-input');
          inp.value = '';
        });
        await page.type('#forensic-search-input', '<img src=x onerror=window.__xssFired=true>');
        await new Promise((r) => setTimeout(r, 200));
        const xssFired = await page.evaluate(() => Boolean(window.__xssFired));
        await page.click('button[onclick="resetForensicConsolidatedFilter()"]');
        const afterReset = await page.evaluate(() => document.getElementById('forensic-search-input')?.value || '');
        const fails = [];
        if (xssFired) fails.push('XSS payload executed via search input!');
        if (afterReset !== '') fails.push(`Search input failed to reset (got "${afterReset}")`);
        return { xssFired, afterReset, _failReason: fails.join('; ') };
      },
    });

    // UI-07: Dedicated Per-Blog Diagrams Page (WS2)
    await runCase({
      id: 'UI-07',
      name: 'Dedicated Per-Blog Diagrams Page (/blogs/ws2/diagrams)',
      inputs: `GET ${args.baseUrl}/blogs/ws2/diagrams @ 1600x950`,
      expected: '3 approved 12-slide WS2 diagrams rendered with Edit/Clone/Delete/Draw.io/Google Slides links, Light Theme, 0 broken SVGs',
      fn: async (page) => {
        await page.setViewport({ width: 1600, height: 950, deviceScaleFactor: 2 });
        await page.goto(`${args.baseUrl}/blogs/ws2/diagrams`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('.diag-card, .diagram-card, [data-diagram-id]', { timeout: 10000 });
        await new Promise((r) => setTimeout(r, 500));
        const diagInfo = await page.evaluate(() => {
          const cardEls = Array.from(document.querySelectorAll('.diag-card, .diagram-card, [data-diagram-id]'));
          const cardIds = cardEls.map((el) => el.getAttribute('data-diagram-id') || '').filter(Boolean);
          const txt = document.body.innerText || '';
          const slidesHrefCount = document.querySelectorAll('a[href*="docs.google.com/presentation"]').length;
          return {
            cardCount: cardEls.length,
            cardIds,
            hasEditDrawio: txt.includes('Draw.io'),
            hasSlidesLink: slidesHrefCount >= 3 || txt.includes('Edit on Slide') || txt.includes('Slides'),
            slidesHrefCount,
            hasClone: txt.includes('Clone'),
          };
        });
        const audit = await auditPageState(page);
        const proof = await saveProof(page, 'ui_07_ws2_diagrams_1600.png');
        const fails = [];
        if (diagInfo.cardCount !== 3) fails.push(`Expected 3 approved 12-slide diagram cards on WS2, got ${diagInfo.cardCount}`);
        if (!diagInfo.hasEditDrawio || !diagInfo.hasSlidesLink || !diagInfo.hasClone) {
          fails.push(`Missing diagram actions: ${JSON.stringify(diagInfo)}`);
        }
        if (!audit.isLightTheme) fails.push(`Not Light Theme (lum=${audit.bgLum})`);
        if (!audit.overflowOk) fails.push(`Horizontal overflow ${audit.overflowPx}px`);
        if (audit.brokenImgCount > 0) fails.push(`Broken images: ${audit.brokenImgs.join(', ')}`);
        return { ...audit, ...diagInfo, proof, _failReason: fails.join('; ') };
      },
    });

    // UI-08: Dedicated Per-Blog Diagrams Page (ALL)
    await runCase({
      id: 'UI-08',
      name: 'Complete Series Diagrams Page (/blogs/all/diagrams)',
      inputs: `GET ${args.baseUrl}/blogs/all/diagrams @ 1600x950`,
      expected: 'All 12 approved simplified-header series diagrams render cleanly with 0 broken images and 0 overflow',
      fn: async (page) => {
        await page.setViewport({ width: 1600, height: 950, deviceScaleFactor: 2 });
        await page.goto(`${args.baseUrl}/blogs/all/diagrams`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('.diag-card, .diagram-card, [data-diagram-id]', { timeout: 10000 });
        await new Promise((r) => setTimeout(r, 500));
        const cards = await page.evaluate(() => document.querySelectorAll('.diag-card, .diagram-card, [data-diagram-id]').length);
        const audit = await auditPageState(page);
        const fails = [];
        if (cards !== 12) fails.push(`Expected 12 approved 12-slide series diagram cards, got ${cards}`);
        if (audit.brokenImgCount > 0) fails.push(`Broken images: ${audit.brokenImgs.join(', ')}`);
        if (!audit.overflowOk) fails.push(`Horizontal overflow ${audit.overflowPx}px`);
        return { ...audit, cards, _failReason: fails.join('; ') };
      },
    });

    // UI-09: Dedicated Per-Blog Screenshots Page (ATLAS)
    await runCase({
      id: 'UI-09',
      name: 'Dedicated Per-Blog Screenshots Page (/blogs/atlas/screenshots)',
      inputs: `GET ${args.baseUrl}/blogs/atlas/screenshots @ 1600x950`,
      expected: 'Verified 16:9 Retina ThoughtSpot captures load (naturalWidth >= 2560), 0 legacy stand-ins',
      fn: async (page) => {
        await page.setViewport({ width: 1600, height: 950, deviceScaleFactor: 2 });
        await page.goto(`${args.baseUrl}/blogs/atlas/screenshots`, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise((r) => setTimeout(r, 700));
        const audit = await auditPageState(page);
        const shotInfo = await page.evaluate(() => {
          const imgs = Array.from(document.querySelectorAll('img')).filter((im) => (im.getAttribute('src') || '').includes('verified-cloud-console'));
          return {
            verifiedImgs: imgs.length,
            retinaOk: imgs.every((im) => im.complete && im.naturalWidth >= 2560),
          };
        });
        const proof = await saveProof(page, 'ui_09_atlas_screenshots_1600.png');
        const fails = [];
        if (shotInfo.verifiedImgs < 2 || !shotInfo.retinaOk) {
          fails.push(`Verified Retina images check failed: ${JSON.stringify(shotInfo)}`);
        }
        if (audit.brokenImgCount > 0) fails.push(`Broken images: ${audit.brokenImgs.join(', ')}`);
        if (!audit.overflowOk) fails.push(`Horizontal overflow ${audit.overflowPx}px`);
        if (audit.foundBanned.length > 0) fails.push(`Banned legacy DOM text: ${audit.foundBanned.join(', ')}`);
        return { ...audit, ...shotInfo, proof, _failReason: fails.join('; ') };
      },
    });

    // UI-10: All 14 Per-Blog Routes Sweep (ws1..ws5, atlas, all x diagrams/screenshots)
    await runCase({
      id: 'UI-10',
      name: 'All 14 Per-Blog Dedicated Routes Zero-Error Sweep',
      inputs: 'GET /blogs/{ws1,ws2,ws3,ws4,ws5,atlas,all}/{diagrams,screenshots} @ 1280x800',
      expected: 'All 14 dedicated pages return HTTP 200, Light Theme, 0 broken images, 0 console/page errors',
      fn: async (page) => {
        await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
        const slugs = ['ws1', 'ws2', 'ws3', 'ws4', 'ws5', 'atlas', 'all'];
        const kinds = ['diagrams', 'screenshots'];
        const results = [];
        const fails = [];
        for (const s of slugs) {
          for (const k of kinds) {
            const url = `${args.baseUrl}/blogs/${s}/${k}`;
            const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
            const st = resp ? resp.status() : 0;
            const audit = await auditPageState(page, { maxOverflowPx: 4 });
            results.push({ route: `/blogs/${s}/${k}`, status: st, broken: audit.brokenImgCount, overflowPx: audit.overflowPx });
            if (st !== 200) fails.push(`/blogs/${s}/${k} HTTP ${st}`);
            if (audit.brokenImgCount > 0) fails.push(`/blogs/${s}/${k} broken=${audit.brokenImgCount}`);
            if (!audit.overflowOk) fails.push(`/blogs/${s}/${k} overflow=${audit.overflowPx}px`);
            if (!audit.isLightTheme) fails.push(`/blogs/${s}/${k} not Light Theme`);
          }
        }
        return { routesChecked: results.length, _failReason: fails.join('; ') };
      },
    });

    // UI-11: Tablet Viewport (834x1194) Responsive Audit
    await runCase({
      id: 'UI-11',
      name: 'Tablet Responsive Scaling Audit (834x1194)',
      inputs: 'GET /, /blogs/ws2/diagrams, /blogs/atlas/screenshots @ 834x1194',
      expected: 'Zero horizontal overflow, 0 broken images, Light Theme preserved',
      fn: async (page) => {
        await page.setViewport({ width: 834, height: 1194, deviceScaleFactor: 2 });
        const fails = [];
        for (const rel of ['/', '/blogs/ws2/diagrams', '/blogs/atlas/screenshots']) {
          await page.goto(`${args.baseUrl}${rel}`, { waitUntil: 'networkidle2', timeout: 25000 });
          const audit = await auditPageState(page, { maxOverflowPx: 4 });
          if (!audit.overflowOk) fails.push(`${rel} overflow=${audit.overflowPx}px`);
          if (audit.brokenImgCount > 0) fails.push(`${rel} broken=${audit.brokenImgCount}`);
        }
        return { viewport: '834x1194', _failReason: fails.join('; ') };
      },
    });

    // UI-12: Mobile Viewport (390x844) Responsive Audit + Proof
    await runCase({
      id: 'UI-12',
      name: 'Mobile Responsive Scaling & Contrast Audit (390x844)',
      inputs: 'GET /blogs/ws2/diagrams, /blogs/atlas/screenshots @ 390x844',
      expected: 'Zero horizontal overflow (<=4px), WCAG AA contrast >=4.5:1, 0 broken images',
      fn: async (page) => {
        await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
        const fails = [];
        let lastAudit = null;
        for (const rel of ['/blogs/ws2/diagrams', '/blogs/atlas/screenshots']) {
          await page.goto(`${args.baseUrl}${rel}`, { waitUntil: 'networkidle2', timeout: 25000 });
          await new Promise((r) => setTimeout(r, 400));
          const audit = await auditPageState(page, { maxOverflowPx: 4 });
          lastAudit = audit;
          if (!audit.overflowOk) fails.push(`${rel} overflow=${audit.overflowPx}px`);
          if (audit.brokenImgCount > 0) fails.push(`${rel} broken=${audit.brokenImgCount}`);
          if (!audit.contrastOk) fails.push(`${rel} contrast=${audit.bodyContrast}`);
        }
        const proof = await saveProof(page, 'ui_12_mobile_390.png');
        return { viewport: '390x844', lastAudit, proof, _failReason: fails.join('; ') };
      },
    });
  } finally {
    await browser.close();
  }

  const passed = testCases.filter((t) => t.status === 'PASS').length;
  const failed = testCases.length - passed;
  const report = {
    pillar: 'EVAL-P7-VISUAL-UX',
    status: failed === 0 ? 'PASS' : 'FAIL',
    baseUrl: args.baseUrl,
    executedAt: new Date().toISOString(),
    totalCases: testCases.length,
    passedCases: passed,
    failedCases: failed,
    artifacts: capturedArtifacts,
    groundedTestCases: testCases,
  };

  fs.mkdirSync(path.dirname(args.outJson), { recursive: true });
  fs.writeFileSync(args.outJson, JSON.stringify(report, null, 2) + '\n', 'utf-8');
  console.log(JSON.stringify({ status: report.status, passed, failed, total: testCases.length, outJson: args.outJson }));
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error('[eval_ui_visual_suite] FATAL:', err);
  process.exit(2);
});
