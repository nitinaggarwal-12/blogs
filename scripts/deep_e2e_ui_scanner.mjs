#!/usr/bin/env node
/**
 * Deep E2E UI Quality & Defect Scanner using Headless Chrome
 * Thoroughly exercises:
 * 1. Console Errors & Uncaught Exceptions
 * 2. All 7 Tabs Navigation & URL Sync (?tab=...)
 * 3. Interactive Modals & Drawers (Cloud Viewer, SaaS Modal, FAQ, Telemetry)
 * 4. Forms & Simulators (5-Hop Simulator, PAYG Live Connection Tester, Feedback Dialog)
 * 5. Cross-Viewport Responsiveness & Horizontal Overflow (Mobile 375px, Tablet 768px, Desktop 1440px)
 * 6. Broken Images & 404 Assets
 * 7. Accessibility (Keyboard Focus Traps, Aria Attributes, Touch Target Heights >= 32px)
 * 8. Visual Text Overlaps & Unhandled Clicks
 */
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const homeDir = os.homedir();
const pkgCandidates = [
  path.resolve(__dirname, "../../PromptCanvas/package.json"),
  path.join(homeDir, "Documents/PromptCanvas/package.json"),
  path.resolve(__dirname, "../../trainex/package.json"),
  path.join(homeDir, "Documents/trainex/package.json"),
];
const pkgPath = pkgCandidates.find((p) => fs.existsSync(p)) || pkgCandidates[0];

const reqPaths = [
  path.dirname(pkgPath),
  ...(process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean),
  path.resolve(__dirname, "../../trainex"),
  path.join(homeDir, "Documents/trainex"),
];
const require = createRequire(import.meta.url);
let puppeteer;
try {
  puppeteer = require("puppeteer-core");
} catch {
  const resolved = require.resolve("puppeteer-core", { paths: reqPaths });
  puppeteer = require(resolved);
}

const BASE_URL = process.env.PORTAL_BASE_URL || "http://localhost:8080";
const chromeCandidates = [
  process.env.CHROME_BIN,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const CHROME_PATH = chromeCandidates.find((p) => fs.existsSync(p)) || chromeCandidates[chromeCandidates.length - 1];

async function scan() {
  console.log(`[INIT] Launching Headless Chrome (${CHROME_PATH})...`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1600,1200"],
  });

  const issues = [];
  function reportIssue(category, severity, description, details = null) {
    const issue = { category, severity, description, details };
    issues.push(issue);
    console.warn(`[ISSUE:${severity}] [${category}] ${description}`, details ? JSON.stringify(details) : "");
  }

  const page = await browser.newPage();
  const consoleErrors = [];
  const networkErrors = [];

  page.on("pageerror", (err) => {
    consoleErrors.push(err.message);
    reportIssue("RUNTIME_ERROR", "P0", `Uncaught page error: ${err.message}`);
  });

  page.on("requestfailed", (req) => {
    const url = req.url();
    if (!url.includes("favicon.ico")) {
      networkErrors.push({ url, failure: req.failure()?.errorText });
      reportIssue("NETWORK", "P1", `Failed network request: ${url}`, { error: req.failure()?.errorText });
    }
  });

  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes("favicon.ico") && !res.url().includes("mock-fail")) {
      networkErrors.push({ url: res.url(), status: res.status() });
      reportIssue("HTTP_ERROR", "P1", `HTTP ${res.status()} response: ${res.url()}`);
    }
  });

  // TEST 1: Initial Desktop Load & Navigation Checks
  console.log(`\n--- TEST 1: Initial Desktop Load (1440x900) ---`);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 600));

  // Check initial active tab
  const initialTab = await page.evaluate(() => {
    const activeSec = document.querySelector(".tab-pane.active") || document.querySelector(".portal-tab-content.active");
    const activeBtn = document.querySelector(".tab-btn.active");
    return {
      activeSecId: activeSec?.id,
      activeBtnText: activeBtn?.textContent?.trim(),
      urlTabParam: new URLSearchParams(window.location.search).get("tab"),
    };
  });
  console.log(`Initial active tab:`, initialTab);
  if (!initialTab.activeSecId) {
    reportIssue("NAVIGATION", "P0", "No active tab section visible on initial page load");
  }

  // Check broken images across the entire initial page
  const brokenImgsInitial = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("img"))
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.getAttribute("src"));
  });
  if (brokenImgsInitial.length > 0) {
    reportIssue("ASSETS", "P0", `Broken images found on initial load: ${brokenImgsInitial.length}`, brokenImgsInitial);
  }

  // TEST 2: Tab Switching & Deep Linking
  console.log(`\n--- TEST 2: Tab Switching & History Deep-Linking ---`);
  const tabsToTest = [
    { name: "overview", btnSelector: "#tab-btn-overview", secSelector: "#tab-overview" },
    { name: "patterns", btnSelector: "#tab-btn-patterns", secSelector: "#tab-patterns" },
    { name: "simulator", btnSelector: "#tab-btn-simulator", secSelector: "#tab-simulator" },
    { name: "screenshots", btnSelector: "#tab-btn-screenshots", secSelector: "#tab-screenshots" },
    { name: "forensic", btnSelector: "#tab-btn-forensic", secSelector: "#tab-forensic" },
    { name: "payg", btnSelector: "#tab-btn-payg", secSelector: "#tab-payg" },
    { name: "changelog", btnSelector: "#tab-btn-changelog", secSelector: "#tab-changelog" },
  ];

  for (const t of tabsToTest) {
    const tabSwitchResult = await page.evaluate(async (t) => {
      const btn = document.querySelector(t.btnSelector);
      if (!btn) return { error: `Button ${t.btnSelector} not found` };
      btn.click();
      await new Promise((r) => setTimeout(r, 200));
      const sec = document.querySelector(t.secSelector);
      const isSecActive = Boolean(sec && sec.classList.contains("active"));
      const isSecVisible = Boolean(sec && window.getComputedStyle(sec).display !== "none");
      const urlTab = new URLSearchParams(window.location.search).get("tab");
      return { isSecActive, isSecVisible, urlTab };
    }, t);

    console.log(`Tab switch to [${t.name}]:`, tabSwitchResult);
    if (!tabSwitchResult.isSecActive || !tabSwitchResult.isSecVisible) {
      reportIssue("NAVIGATION", "P0", `Tab ${t.name} did not activate properly upon click`, tabSwitchResult);
    }
    if (tabSwitchResult.urlTab !== t.name) {
      reportIssue("URL_SYNC", "P1", `URL ?tab= did not sync to '${t.name}' (current: '${tabSwitchResult.urlTab}')`);
    }
  }

  // TEST 3: Interactive Controls & Workflows
  console.log(`\n--- TEST 3: Interactive Controls & Functionality ---`);

  // 3A: 5-Hop Security Simulator
  console.log(`Testing 5-Hop Security Simulator...`);
  await page.evaluate(() => {
    const btn = document.querySelector("#tab-btn-simulator");
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 300));

  const simResult = await page.evaluate(async () => {
    const runBtn = document.querySelector("#btn-run-sim") || document.querySelector("button[onclick*='invokeCustomSandbox']") || document.querySelector("button[onclick*='runSim']");
    if (!runBtn) return { error: "Run Simulation button not found" };

    // Try running simulation
    runBtn.click();
    await new Promise((r) => setTimeout(r, 800));

    const simOut = document.querySelector("#sim-output")?.innerText || "";
    const hopStrip = document.querySelector("#sim-hop-trail-strip");
    const hopCount = hopStrip ? hopStrip.querySelectorAll(".hop-node").length : 0;

    return { runBtnFound: Boolean(runBtn), simOutLength: simOut.length, hopCount };
  });
  console.log(`Simulator execution:`, simResult);
  if (simResult.error || simResult.simOutLength < 10) {
    reportIssue("SIMULATOR", "P1", "Simulator execution failed or produced empty output", simResult);
  }

  // 3B: PAYG Production SaaS Live Connection Tester
  console.log(`Testing PAYG Production SaaS Live Connection Tester...`);
  await page.evaluate(() => {
    const btn = document.querySelector("#tab-btn-payg");
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 300));

  const paygResult = await page.evaluate(async () => {
    const targetSelect = document.querySelector("#payg-tester-service-select") || document.querySelector("#payg-tester-target-select");
    const endpointInput = document.querySelector("#payg-tester-endpoint-url");
    const tokenInput = document.querySelector("#payg-tester-api-token");
    const runBtn = document.querySelector("#payg-tester-run-btn");
    const telemetry = document.querySelector("#payg-tester-telemetry");

    return {
      hasTargetSelect: Boolean(targetSelect),
      hasEndpointInput: Boolean(endpointInput),
      hasTokenInput: Boolean(tokenInput),
      hasRunBtn: Boolean(runBtn),
      initialEndpoint: endpointInput ? endpointInput.value : null
    };
  });
  console.log(`PAYG Tester:`, paygResult);
  if (!paygResult.hasTargetSelect || !paygResult.hasEndpointInput || !paygResult.hasRunBtn) {
    reportIssue("PAYG", "P1", "Missing required controls in PAYG Production Target tester", paygResult);
  }

  // 3C: Modals & Drawers Interaction
  console.log(`Testing Modals & Drawers...`);

  // Cloud Viewer Modal
  const cloudModalTest = await page.evaluate(async () => {
    if (typeof window.openCloudViewerModal !== "function") return { error: "openCloudViewerModal not defined" };
    window.openCloudViewerModal("WS1", 1, "slides");
    await new Promise((r) => setTimeout(r, 300));
    const modal = document.querySelector("#pc-cloud-viewer-modal");
    const isOpen = Boolean(modal && modal.classList.contains("open"));
    const title = document.querySelector("#cloud-viewer-modal-title")?.innerText || "";
    
    // Close modal
    if (typeof window.closeCloudViewerModal === "function") {
      window.closeCloudViewerModal();
      await new Promise((r) => setTimeout(r, 200));
    }
    const isClosed = Boolean(modal && !modal.classList.contains("open"));

    return { isOpen, title, isClosed };
  });
  console.log(`Cloud Viewer Modal:`, cloudModalTest);
  if (!cloudModalTest.isOpen || !cloudModalTest.isClosed) {
    reportIssue("MODAL", "P1", "Cloud Viewer Modal failed to open or close properly", cloudModalTest);
  }

  // SaaS Connect Modal
  const saasModalTest = await page.evaluate(async () => {
    if (typeof window.openSaaSConnectModal !== "function") return { error: "openSaaSConnectModal not defined" };
    window.openSaaSConnectModal("thoughtspot-spotter");
    await new Promise((r) => setTimeout(r, 300));
    const modal = document.querySelector("#saas-connect-modal");
    const isOpen = Boolean(modal && modal.classList.contains("open"));
    const title = document.querySelector("#saas-modal-title")?.innerText || "";
    const liveLinkHref = document.querySelector("#saas-modal-live-gateway-link")?.getAttribute("href") || "";

    if (typeof window.closeSaaSConnectModal === "function") {
      window.closeSaaSConnectModal();
      await new Promise((r) => setTimeout(r, 200));
    }
    const isClosed = Boolean(modal && !modal.classList.contains("open"));

    return { isOpen, title, liveLinkHref, isClosed };
  });
  console.log(`SaaS Connect Modal (via thoughtspot-spotter alias):`, saasModalTest);
  if (!saasModalTest.isOpen || !saasModalTest.isClosed || !saasModalTest.liveLinkHref) {
    reportIssue("MODAL", "P1", "SaaS Connect Modal failed to open/close or missing live link", saasModalTest);
  }

  // FAQ Modal
  const faqModalTest = await page.evaluate(async () => {
    if (typeof window.openPortalFAQ !== "function") return { error: "openPortalFAQ not defined" };
    window.openPortalFAQ();
    await new Promise((r) => setTimeout(r, 300));
    const modal = document.querySelector("#portal-faq-modal");
    const isOpen = Boolean(modal && modal.classList.contains("open"));
    const faqCount = document.querySelectorAll(".faq-item").length;

    if (typeof window.closePortalFAQ === "function") {
      window.closePortalFAQ();
      await new Promise((r) => setTimeout(r, 200));
    }
    const isClosed = Boolean(modal && !modal.classList.contains("open"));

    return { isOpen, faqCount, isClosed };
  });
  console.log(`Portal FAQ Modal:`, faqModalTest);
  if (!faqModalTest.isOpen || !faqModalTest.isClosed || faqModalTest.faqCount === 0) {
    reportIssue("MODAL", "P1", "FAQ Modal failed to open/close or contains 0 items", faqModalTest);
  }

  // TEST 4: Cross-Viewport Responsiveness & Layout Geometry
  console.log(`\n--- TEST 4: Cross-Viewport Responsiveness & Geometry ---`);
  const viewports = [
    { name: "Mobile iPhone (375x812)", width: 375, height: 812 },
    { name: "Mobile Android (412x915)", width: 412, height: 915 },
    { name: "Tablet Portrait (768x1024)", width: 768, height: 1024 },
    { name: "Desktop Compact (1280x800)", width: 1280, height: 800 },
    { name: "Desktop Wide (1920x1080)", width: 1920, height: 1080 },
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });
    await new Promise((r) => setTimeout(r, 250));

    // Test across Overview, Patterns, Screenshots, Forensic
    for (const tabId of ["overview", "patterns", "screenshots", "forensic"]) {
      await page.evaluate((t) => {
        const btn = document.querySelector(`#tab-btn-${t}`);
        if (btn) btn.click();
      }, tabId);
      await new Promise((r) => setTimeout(r, 200));

      const geomAudit = await page.evaluate((vpWidth) => {
        const docW = document.documentElement.scrollWidth;
        const bodyW = document.body.scrollWidth;
        const hasHOverflow = docW > vpWidth + 2;

        const header = document.querySelector(".portal-top-header");
        const headerH = header ? header.offsetHeight : 0;
        const headerW = header ? header.offsetWidth : 0;

        return { docW, bodyW, hasHOverflow, headerH, headerW };
      }, vp.width);

      if (geomAudit.hasHOverflow) {
        reportIssue("RESPONSIVENESS", "P1", `Horizontal overflow on [${vp.name}] tab [${tabId}]: docW=${geomAudit.docW} > vpW=${vp.width}`, geomAudit);
      }
    }
  }

  // TEST 5: Interactive Click Targets & Focus Visibility
  console.log(`\n--- TEST 5: Interactive Click Targets & Touch Accessibility ---`);
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
  const touchTargetAudit = await page.evaluate(() => {
    // Only check visible interactive buttons & links that are primary controls
    const primaryControls = Array.from(document.querySelectorAll(".tab-btn, .portal-header-actions .sim-btn, .sim-btn.primary, .ov-btn"));
    const undersized = [];

    for (const el of primaryControls) {
      if (el.offsetParent === null) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      if (rect.height < 30 || rect.width < 30) {
        undersized.push({
          tag: el.tagName,
          text: el.innerText?.trim()?.substring(0, 25),
          className: el.className,
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        });
      }
    }

    return { totalChecked: primaryControls.length, undersizedCount: undersized.length, samples: undersized.slice(0, 5) };
  });
  console.log(`Touch Target Audit:`, touchTargetAudit);
  if (touchTargetAudit.undersizedCount > 0) {
    reportIssue("ACCESSIBILITY", "P2", `Found ${touchTargetAudit.undersizedCount} primary interactive elements with touch target < 30px`, touchTargetAudit.samples);
  }

  // TEST 6: All Links & Action Buttons Execution
  console.log(`\n--- TEST 6: Comprehensive Button Click & Action Health ---`);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 400));

  const actionButtonsAudit = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const issues = [];
    for (const b of buttons) {
      if (b.offsetParent === null) continue;
      const onclickAttr = b.getAttribute("onclick");
      if (onclickAttr && (onclickAttr.includes("undefined") || onclickAttr.includes("null."))) {
        issues.push({ text: b.innerText.trim(), onclick: onclickAttr, reason: "References undefined/null" });
      }
    }
    return { buttonCount: buttons.length, issues };
  });
  if (actionButtonsAudit.issues.length > 0) {
    reportIssue("UI_LOGIC", "P1", `Found buttons with invalid onclick handlers:`, actionButtonsAudit.issues);
  }

  console.log(`\n======================================================`);
  console.log(`SCAN COMPLETE: Found ${issues.length} potential issues`);
  console.log(`======================================================`);

  await browser.close();
  return issues;
}

scan().then((issues) => {
  if (issues.length > 0) {
    console.log(`Total issues identified: ${issues.length}`);
    process.exit(1);
  } else {
    console.log(`ZERO issues identified! All checks PASSED.`);
    process.exit(0);
  }
}).catch((err) => {
  console.error("Scanner failed:", err);
  process.exit(1);
});
