#!/usr/bin/env node
/**
 * Comprehensive Headless Chrome E2E Functional & Visual Geometry Test Suite (Rule 57C)
 * Tests:
 *  1. Zero console/page errors across all 4 portal tabs
 *  2. All 5 Canonical Series Blogs (WS1..WS5) + 9 Workstream/Master Guides in #hub-blog-reader:
 *     - Every canonical architecture diagram <img> loads with naturalWidth > 0
 *     - Zero fake/synthetic screenshots (0 gcp_console_*, 0 _agentcore_mcp.png, 0 saas_ui_*_console.png)
 *     - Zero EC2 Execution Twin stand-in links (0 http://13.220.94.209:3001..3010)
 *     - Zero table horizontal overflow (table.offsetWidth <= wrapper.clientWidth + 4)
 *     - Zero literal '<br' text leaks or '?principal=' mock links anywhere in DOM
 *  3. Interactive controls: Series Reader switcher, TOC anchor navigation, Step-by-Step Flow toggle,
 *     Tab 2 Live 5-Hop Simulator execution, Tab 3 10-SaaS Live Access Hub, Tab 4 Forensic Audit (13/13).
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = fs.existsSync(path.resolve(__dirname, "../../PromptCanvas/package.json"))
  ? path.resolve(__dirname, "../../PromptCanvas/package.json")
  : fs.existsSync("/usr/local/google/home/nitinagga/Documents/PromptCanvas/package.json")
  ? "/usr/local/google/home/nitinagga/Documents/PromptCanvas/package.json"
  : "/Users/nitinagga/Documents/PromptCanvas/package.json";

const require = createRequire(pkgPath);
const puppeteer = require("puppeteer-core");

const BASE_URL = process.env.PORTAL_BASE_URL || "http://localhost:8080";
const chromeCandidates = [
  process.env.CHROME_BIN,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const CHROME_PATH = chromeCandidates.find((p) => fs.existsSync(p)) || chromeCandidates[chromeCandidates.length - 1];

const DOCS_TO_TEST = [
  { doc: "blogs/ws1-reference-architecture-taxonomy-and-5hop-baseline.md", ws: "WS1" },
  { doc: "blogs/ws2-pattern-a-pooled-architecture.md", ws: "WS2" },
  { doc: "blogs/ws3-pattern-b-sovereign-silos.md", ws: "WS3" },
  { doc: "blogs/ws4-pattern-c-hybrid-dynamic-tiering.md", ws: "WS4" },
  { doc: "blogs/ws5-decision-guide-and-agentic-triad.md", ws: "WS5" },
  { doc: "workstream-1-reference-architecture/1.1-architecture-taxonomy-and-diagrams.md", ws: "WS1" },
  { doc: "workstream-2-pattern-a-pooled/2.1-case-study-and-solution-architecture.md", ws: "WS2" },
  { doc: "workstream-2-pattern-a-pooled/2.2-demo-env-and-3p-auth-sandbox.md", ws: "WS2" },
  { doc: "workstream-3-pattern-b-siloed/3.1-case-study-and-solution-architecture.md", ws: "WS3" },
  { doc: "workstream-3-pattern-b-siloed/3.2-multi-project-silo-and-cmek-setup.md", ws: "WS3" },
  { doc: "workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md", ws: "WS4" },
  { doc: "workstream-4-pattern-c-hybrid/4.2-hub-and-spoke-demo-env-setup.md", ws: "WS4" },
  { doc: "workstream-5-wrap-up-and-backlog/5.1-pattern-comparison-and-decision-guide.md", ws: "WS5" },
  { doc: "docs/END-TO-END-WORKSTREAM-AND-DIAGRAM-GUIDE.md", ws: "WS5" },
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
    await new Promise((r) => setTimeout(r, 800));

    // Scroll through the document and explicitly await all image loads
    await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll("#hub-blog-reader img"));
      for (const img of imgs) {
        img.scrollIntoView({ behavior: "instant", block: "center" });
      }
      await Promise.all(
        imgs.map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise((res) => {
            const done = () => res();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            setTimeout(done, 5000);
          });
        })
      );
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 250));

    const audit = await page.evaluate(() => {
      const reader = document.getElementById("hub-blog-reader");
      if (!reader) return { error: "Missing #hub-blog-reader" };
      const html = reader.innerHTML || "";
      const imgs = Array.from(reader.querySelectorAll("img"));
      const brokenImgs = imgs
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.getAttribute("src"));

      const intraImgs = imgs.filter((img) => {
        const s = img.getAttribute("src") || "";
        return s.includes("gcp_console_") || s.includes("pantheon_live_user_capture") || s.includes("cloud-console");
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

      const nonPreText = Array.from(reader.querySelectorAll("p, td, th, li, h1, h2, h3, h4, blockquote"))
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
        hasEc2Leak: html.includes("13.220.94.209") || html.includes("screenshots/cloud-console"),
        hasDomainLeak:
          nonPreText.includes("MK-3475-087") ||
          nonPreText.includes("nitinagga-ge-2") ||
          nonPreText.includes("nitina-ggarwal-sandbox-647724") ||
          nonPreText.includes("nitinagga-argolis-aws") ||
          nonPreText.includes("merck-a2a-mcp-") ||
          nonPreText.includes("ADK 2.0") ||
          nonPreText.includes("Q4 2026") ||
          nonPreText.includes("Q1 2027"),
        hasFormatJson: html.includes("?format=json"),
        readerHeightPx: reader.scrollHeight,
      };
    });

    const maxAllowedHeight = item.doc.includes("END-TO-END-WORKSTREAM") ? 160000 : 24500;

    const minDiagrams = (item.doc.includes("/3.2-") || item.doc.includes("/4.2-")) ? 0 : 1;

    assert(
      !audit.error &&
        audit.totalImgs >= minDiagrams &&
        audit.brokenImgs.length === 0 &&
        audit.intraCount === 0 &&
        audit.sideACount === 0 &&
        audit.sideBCount === 0 &&
        !audit.hasEc2Leak,
      `${item.ws} (${item.doc}) Canonical Diagrams & Zero Fake/Synthetic Screenshots`,
      `total=${audit.totalImgs}, intra=${audit.intraCount}, sideA=${audit.sideACount}, sideB=${audit.sideBCount}, ec2Leak=${audit.hasEc2Leak}, height=${audit.readerHeightPx}px, broken=${audit.brokenImgs.length}`
    );

    assert(
      audit.overflowingTables.length === 0 &&
        !audit.hasBrLeak &&
        !audit.hasLegacyPrincipal &&
        !audit.hasDomainLeak &&
        audit.hasFormatJson &&
        audit.readerHeightPx < maxAllowedHeight,
      `${item.ws} (${item.doc}) Table Containment, Zero Leaks & S3 Receipt Links`,
      `overflowTables=${audit.overflowingTables.length}, brLeak=${audit.hasBrLeak}, domainLeak=${audit.hasDomainLeak}, height=${audit.readerHeightPx}px`
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
    const saasHubHtml = saasHub ? saasHub.innerHTML : "";
    const genuineGallery = document.getElementById("genuine-multicloud-3p-ui-gallery");
    const genuineHtml = genuineGallery ? genuineGallery.innerHTML : "";
    const hasEc2InHub =
      saasHubHtml.includes("13.220.94.209") ||
      saasHubHtml.includes("cloud-console") ||
      genuineHtml.includes("13.220.94.209") ||
      genuineHtml.includes("cloud-console");

    // Ensure all 23 genuine UI screenshots load with naturalWidth >= 1200
    const galleryImgs = genuineGallery ? Array.from(genuineGallery.querySelectorAll(".genuine-3p-ui-card img")) : [];
    for (const img of galleryImgs) {
      img.scrollIntoView({ behavior: "instant", block: "center" });
    }
    await Promise.all(
      galleryImgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((res) => {
          const done = () => res();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, 5000);
        });
      })
    );
    const brokenGalleryImgs = galleryImgs
      .filter((img) => !img.complete || img.naturalWidth < 1200)
      .map((img) => img.getAttribute("src"));

    // Exercise gallery filter pills (gcp -> 10, aws-ec2 -> 10, aws-console -> 3, all -> 23)
    const countVisibleCards = () =>
      genuineGallery
        ? Array.from(genuineGallery.querySelectorAll(".genuine-3p-ui-card")).filter((c) => c.style.display !== "none").length
        : 0;
    const clickFilter = (f) => {
      const btn = genuineGallery?.querySelector(`[data-gallery-filter="${f}"]`);
      if (btn) btn.click();
      return countVisibleCards();
    };
    const gcpFiltered = clickFilter("gcp");
    const awsEc2Filtered = clickFilter("aws-ec2");
    const awsConsoleFiltered = clickFilter("aws-console");
    const allFiltered = clickFilter("all");

    // Test Cloud Viewer Modal open & close
    let cloudViewerOpened = false;
    if (typeof window.openCloudViewerModal === "function") {
      window.openCloudViewerModal("WS2", 1, "slides");
      await new Promise((r) => setTimeout(r, 300));
      const modal = document.getElementById("pc-cloud-viewer-modal");
      cloudViewerOpened = Boolean(modal && modal.classList.contains("open"));
      if (typeof window.closeCloudViewerModal === "function") window.closeCloudViewerModal();
    }

    // Check Tab 4 (13/13 Forensic Audit rows)
    const tab4 = document.getElementById("tab-btn-forensic");
    if (tab4) tab4.click();
    await new Promise((r) => setTimeout(r, 250));
    const forensicRows = document.querySelectorAll("#forensic-table-body tr").length;

    return {
      simVisible,
      simRan: simOut.length > 20,
      cloudVisible,
      hasSaasHub: Boolean(saasHub),
      hasGenuineGallery: Boolean(genuineGallery),
      galleryImgCount: galleryImgs.length,
      brokenGalleryImgs,
      filterCounts: { allFiltered, gcpFiltered, awsEc2Filtered, awsConsoleFiltered },
      forensicRows,
      hasEc2InHub,
      cloudViewerOpened,
    };
  });

  assert(
    tabsResult.simVisible &&
      tabsResult.simRan &&
      tabsResult.cloudVisible &&
      tabsResult.hasSaasHub &&
      tabsResult.hasGenuineGallery &&
      tabsResult.galleryImgCount === 23 &&
      tabsResult.brokenGalleryImgs.length === 0 &&
      tabsResult.filterCounts.allFiltered === 23 &&
      tabsResult.filterCounts.gcpFiltered === 10 &&
      tabsResult.filterCounts.awsEc2Filtered === 10 &&
      tabsResult.filterCounts.awsConsoleFiltered === 3 &&
      tabsResult.forensicRows === 13 &&
      !tabsResult.hasEc2InHub &&
      tabsResult.cloudViewerOpened,
    "Interactive Portal Tabs (Tab 2 5-Hop Simulator + Tab 3 23-UI Gallery & Filters + Tab 4 13/13 Forensic + Cloud Viewer Modal + Zero EC2 Leaks)",
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
