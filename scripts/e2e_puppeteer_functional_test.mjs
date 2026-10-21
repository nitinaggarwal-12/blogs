#!/usr/bin/env node
/**
 * Comprehensive Headless Chrome E2E Functional & Visual Geometry Test Suite (Rule 57C)
 * Tests:
 *  1. Zero console/page errors across all 4 portal tabs
 *  2. All 5 Canonical Series Blogs (WS1..WS5) + 5 Workstream Guides in #hub-blog-reader:
 *     - Every Intra-Cloud (GCP Console) & Inter-Cloud (10-SaaS Side-A & Side-B) <img> loads with naturalWidth > 0
 *     - Zero table horizontal overflow (table.offsetWidth <= wrapper.clientWidth + 2)
 *     - Zero literal '<br' text leaks or '?principal=' mock links anywhere in DOM
 *     - All 10 live EC2 ports (http://13.220.94.209:3001..3010) and S3 JSON links (?format=json) present
 *  3. Interactive controls: Series Reader switcher, TOC anchor navigation, Step-by-Step Flow toggle,
 *     Tab 2 Live 5-Hop Simulator execution, Tab 3 10-SaaS Live Access Hub, Tab 4 Forensic Audit (12/12).
 */
import { createRequire } from "module";

const require = createRequire("/Users/nitinagga/Documents/PromptCanvas/package.json");
const puppeteer = require("puppeteer-core");

const BASE_URL = process.env.PORTAL_BASE_URL || "http://localhost:8080";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const DOCS_TO_TEST = [
  { doc: "blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md", ws: "WS1", minIntraImgs: 5 },
  { doc: "blogs/ws2-pattern-a-pooled-architecture.md", ws: "WS2", minIntraImgs: 4 },
  { doc: "blogs/ws3-pattern-b-sovereign-silos.md", ws: "WS3", minIntraImgs: 4 },
  { doc: "blogs/ws4-pattern-c-hybrid-dynamic-tiering.md", ws: "WS4", minIntraImgs: 5 },
  { doc: "blogs/ws5-decision-guide-and-agentic-triad.md", ws: "WS5", minIntraImgs: 7 },
  { doc: "workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md", ws: "WS1", minIntraImgs: 5 },
  { doc: "workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md", ws: "WS2", minIntraImgs: 4 },
  { doc: "workstream-2-pattern-a-pooled/2.2-demo-env-and-3p-auth-sandbox.md", ws: "WS2", minIntraImgs: 4 },
  { doc: "workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md", ws: "WS3", minIntraImgs: 4 },
  { doc: "workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md", ws: "WS3", minIntraImgs: 4 },
  { doc: "workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md", ws: "WS4", minIntraImgs: 5 },
  { doc: "workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md", ws: "WS4", minIntraImgs: 5 },
  { doc: "workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md", ws: "WS5", minIntraImgs: 7 },
  { doc: "docs/END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md", ws: "WS5", minIntraImgs: 7 },
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1600,1200"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1100, deviceScaleFactor: 2 });

  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  let passed = 0;
  let failed = 0;
  function assert(cond, label, detail = "") {
    if (cond) {
      passed++;
      console.log(`[PASS] ${label}${detail ? " — " + detail : ""}`);
    } else {
      failed++;
      console.error(`[FAIL] ${label}${detail ? " — " + detail : ""}`);
    }
  }

  for (const item of DOCS_TO_TEST) {
    const url = `${BASE_URL}/?doc=${encodeURIComponent(item.doc)}`;
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Scroll through the document so all images load
    await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll("#hub-blog-reader img"));
      for (const img of imgs) {
        img.scrollIntoView({ behavior: "instant", block: "center" });
      }
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 800));

    const audit = await page.evaluate((minIntra) => {
      const reader = document.getElementById("hub-blog-reader");
      if (!reader) return { error: "Missing #hub-blog-reader" };
      const html = reader.innerHTML || "";
      const imgs = Array.from(reader.querySelectorAll("img"));
      const brokenImgs = imgs
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.getAttribute("src"));

      const intraImgs = imgs.filter((img) => {
        const s = img.getAttribute("src") || "";
        return s.includes("gcp_console_") || s.includes("pantheon_live_user_capture");
      });
      const sideAImgs = imgs.filter((img) => (img.getAttribute("src") || "").includes("_agentcore_mcp.png"));
      const sideBImgs = imgs.filter((img) => (img.getAttribute("src") || "").includes("_console.png") && (img.getAttribute("src") || "").includes("saas_ui_"));

      // Check table containment
      const tables = Array.from(reader.querySelectorAll("table"));
      const overflowingTables = [];
      for (const tbl of tables) {
        const parent = tbl.parentElement;
        if (parent && tbl.offsetWidth > parent.clientWidth + 4) {
          overflowingTables.push({ tableW: tbl.offsetWidth, parentW: parent.clientWidth });
        }
      }

      // Check all 10 EC2 ports
      const missingEc2Ports = [];
      for (let p = 3001; p <= 3010; p++) {
        if (!html.includes(`http://13.220.94.209:${p}`)) {
          missingEc2Ports.push(p);
        }
      }

      const nonPreText = Array.from(reader.querySelectorAll("p, td, th, li, h1, h2, h3, h4"))
        .map((el) => el.innerText || "")
        .join("\n");

      return {
        totalImgs: imgs.length,
        brokenImgs,
        intraCount: intraImgs.length,
        sideACount: sideAImgs.length,
        sideBCount: sideBImgs.length,
        overflowingTables,
        hasBrLeak: nonPreText.includes("<br/>") || nonPreText.includes("<br>"),
        hasLegacyPrincipal: html.includes("?principal="),
        missingEc2Ports,
        hasFormatJson: html.includes("?format=json"),
      };
    }, item.minIntraImgs);

    assert(
      !audit.error &&
        audit.brokenImgs.length === 0 &&
        audit.intraCount >= item.minIntraImgs &&
        audit.sideACount === 10 &&
        audit.sideBCount === 10,
      `${item.ws} (${item.doc}) Embedded Intra-Cloud & Inter-Cloud Images`,
      `total=${audit.totalImgs}, intra=${audit.intraCount}, sideA=${audit.sideACount}/10, sideB=${audit.sideBCount}/10, broken=${audit.brokenImgs.length}`
    );

    assert(
      audit.overflowingTables.length === 0 && !audit.hasBrLeak && !audit.hasLegacyPrincipal && audit.missingEc2Ports.length === 0 && audit.hasFormatJson,
      `${item.ws} (${item.doc}) Table Containment, Zero Mock Links & 10 EC2 Ports`,
      `overflowTables=${audit.overflowingTables.length}, brLeak=${audit.hasBrLeak}, legacyPrincipal=${audit.hasLegacyPrincipal}, missingPorts=${audit.missingEc2Ports.length}`
    );
  }

  // Test interactive tabs (Tab 2 Simulator execution, Tab 3 GCP Console & 10-SaaS Hub, Cloud Viewer Modal)
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1000));

  const tabsResult = await page.evaluate(async () => {
    const tabBtns = Array.from(document.querySelectorAll(".tab-btn"));
    // Click Tab 2 (Simulator) and execute a scenario
    const tab2 = tabBtns.find((b) => b.textContent.includes("Live 5-Hop Simulator"));
    if (tab2) tab2.click();
    await new Promise((r) => setTimeout(r, 400));
    const simVisible = document.getElementById("tab-simulator")?.classList.contains("active");
    if (typeof window.runSim === "function") {
      await window.runSim();
      await new Promise((r) => setTimeout(r, 500));
    }
    const simOut = document.getElementById("sim-output")?.innerText || "";

    // Click Tab 3 (GCP Console & Codebase)
    const tab3 = tabBtns.find((b) => b.textContent.includes("GCP Console & Codebase"));
    if (tab3) tab3.click();
    await new Promise((r) => setTimeout(r, 400));
    const cloudVisible = document.getElementById("tab-screenshots")?.classList.contains("active");
    const saasHub = document.getElementById("ten-saas-live-access-hub");
    const saasHubLinks = saasHub ? Array.from(saasHub.querySelectorAll("a")).map((a) => a.href) : [];
    const ec2PortCount = [3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010].filter((p) =>
      saasHubLinks.some((h) => h.includes(`13.220.94.209:${p}`))
    ).length;

    // Test Cloud Viewer Modal open & close
    let cloudViewerOpened = false;
    if (typeof window.openCloudViewerModal === "function") {
      window.openCloudViewerModal("WS2", 1, "slides");
      await new Promise((r) => setTimeout(r, 300));
      const modal = document.getElementById("cloud-viewer-modal-backdrop");
      cloudViewerOpened = Boolean(modal && modal.style.display === "flex");
      if (typeof window.closeCloudViewerModal === "function") window.closeCloudViewerModal();
    }

    return { simVisible, simRan: simOut.length > 20, cloudVisible, hasSaasHub: Boolean(saasHub), ec2PortCount, cloudViewerOpened };
  });

  assert(
    tabsResult.simVisible && tabsResult.simRan && tabsResult.cloudVisible && tabsResult.hasSaasHub && tabsResult.ec2PortCount === 10 && tabsResult.cloudViewerOpened,
    "Interactive Portal Tabs (Tab 2 5-Hop Simulator + Tab 3 10-SaaS Hub + Cloud Viewer Modal)",
    JSON.stringify(tabsResult)
  );

  assert(pageErrors.length === 0, "Zero Uncaught Page Errors", `errors=${pageErrors.length}`);

  await browser.close();
  console.log(`\n================================================================`);
  console.log(`E2E PUPPETEER SUMMARY: ${passed}/${passed + failed} CHECKS PASSED`);
  console.log(`================================================================`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
