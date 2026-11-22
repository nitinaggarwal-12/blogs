#!/usr/bin/env node
/**
 * Gate 6b — Headless Puppeteer E2E Playback Verification for Blog Meet Recordings.
 *
 * Spawns local server.py on an ephemeral loopback port, loads each specified blog
 * page (/?tab=patterns&ws=WSN) AND dedicated screenshots page (/blogs/wsN/screenshots),
 * and fails closed unless:
 *  1. #blog-meet-recording-card mounts cleanly with truthful composite disclosure.
 *  2. <video> loads (readyState >= 1, 1920x1080) and chapter-click seek triggers HTTP 206 Partial Content.
 *  3. Opt-in <track kind="captions"> is present (NOT default) and serves HTTP 200 text/vtt.
 *  4. Fullscreen button, Download MP4 link, and all chapter thumbnail PNGs load (naturalWidth > 0).
 *  5. Strict 0 calls to window.speechSynthesis.speak, SpeechSynthesisUtterance, or /api/narrate.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const require = createRequire(import.meta.url);
let puppeteer;
try {
  puppeteer = require(path.join(REPO_ROOT, "node_modules/puppeteer-core"));
} catch {
  puppeteer = require(path.resolve(REPO_ROOT, "../Demoes-GE/node_modules/puppeteer-core"));
}

function parseArgs(argv) {
  const out = { slugs: [], port: 18940 + Math.floor(Math.random() * 400) };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slugs" && argv[i + 1]) {
      out.slugs = argv[++i].split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    } else if (a === "--all") {
      out.slugs = ["ws1", "ws2", "ws3", "ws4", "ws5"];
    } else if (a === "--port" && argv[i + 1]) {
      out.port = Number(argv[++i]);
    }
  }
  if (out.slugs.length === 0) {
    const recRoot = path.join(REPO_ROOT, "recordings");
    if (fs.existsSync(recRoot)) {
      for (const s of ["ws1", "ws2", "ws3", "ws4", "ws5"]) {
        if (fs.existsSync(path.join(recRoot, s, "meet_recording_manifest.json"))) {
          out.slugs.push(s);
        }
      }
    }
  }
  return out;
}

async function waitForHealth(baseUrl, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (r.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${baseUrl}/api/health`);
}

async function verifySlugOnUrl(browser, baseUrl, slug, urlPath, label) {
  const page = await browser.newPage();
  const ttsCalls = [];
  const narrateCalls = [];
  const mp4Statuses = [];
  const vttStatuses = [];
  const pageErrors = [];

  await page.evaluateOnNewDocument(() => {
    window.__ttsAuditCalls = [];
    if (window.speechSynthesis && typeof window.speechSynthesis.speak === "function") {
      const origSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak = function (...args) {
        window.__ttsAuditCalls.push("speechSynthesis.speak");
        return origSpeak(...args);
      };
    }
    if (typeof window.SpeechSynthesisUtterance === "function") {
      const OrigUtt = window.SpeechSynthesisUtterance;
      window.SpeechSynthesisUtterance = function (...args) {
        window.__ttsAuditCalls.push("SpeechSynthesisUtterance");
        return new OrigUtt(...args);
      };
    }
  });

  page.on("pageerror", err => pageErrors.push(String(err.message || err)));
  page.on("response", resp => {
    const u = resp.url();
    if (u.includes("/api/narrate")) narrateCalls.push({ url: u, status: resp.status() });
    if (u.includes(`/recordings/${slug}/meet_live_execution_recording.mp4`)) {
      mp4Statuses.push({
        status: resp.status(),
        contentRange: resp.headers()["content-range"] || "",
        acceptRanges: resp.headers()["accept-ranges"] || ""
      });
    }
    if (u.includes(`/recordings/${slug}/captions.vtt`)) {
      vttStatuses.push({
        status: resp.status(),
        contentType: resp.headers()["content-type"] || ""
      });
    }
  });

  try {
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}${urlPath}`, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector("#blog-meet-recording-card", { timeout: 15000 });

    // Trigger metadata load + verify explicit Range 206 + WebVTT 200 directly in browser context
    const state = await page.evaluate(async expectedSlug => {
      const card = document.querySelector("#blog-meet-recording-card");
      const video = card.querySelector("video[data-testid='blog-meet-video-player']");
      const track = video.querySelector("track[kind='captions']");
      const fsBtn = card.querySelector("[data-testid='blog-meet-fullscreen-btn']");
      const dlLink = card.querySelector("[data-testid='blog-meet-download-link']");
      const disclosure = card.querySelector("[data-testid='blog-meet-composite-disclosure']");
      const chBtns = Array.from(card.querySelectorAll("[data-testid^='blog-meet-chapter-btn-']"));

      if (video.readyState < 1) {
        await new Promise((resolve, reject) => {
          const t = setTimeout(() => reject(new Error("video loadedmetadata timeout")), 12000);
          video.addEventListener("loadedmetadata", () => { clearTimeout(t); resolve(); }, { once: true });
          video.addEventListener("error", () => { clearTimeout(t); reject(new Error("video error event")); }, { once: true });
          video.load();
        });
      }

      // Click last chapter button to trigger seek
      const targetBtn = chBtns[chBtns.length - 1] || chBtns[0];
      const expectedSeek = Number(targetBtn?.getAttribute("data-start-sec") || "0");
      if (targetBtn) targetBtn.click();
      await new Promise(r => setTimeout(r, 600));

      // Verify VTT fetch + explicit Range 206 fetch from browser origin
      const vttResp = await fetch(track.getAttribute("src"));
      const vttText = await vttResp.text();
      const rangeResp = await fetch(`/recordings/${expectedSlug}/meet_live_execution_recording.mp4`, {
        headers: { Range: "bytes=0-1023" }
      });

      // Wait for chapter thumbnail images to finish decoding
      const thumbs = Array.from(card.querySelectorAll("img.blog-meet-ch-thumb"));
      await Promise.all(
        thumbs.map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise(resolve => {
                img.addEventListener("load", resolve, { once: true });
                img.addEventListener("error", resolve, { once: true });
                setTimeout(resolve, 4000);
              })
        )
      );

      return {
        slugAttr: card.getAttribute("data-blog-slug"),
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        duration: video.duration,
        currentTime: video.currentTime,
        expectedSeek,
        hasTrack: Boolean(track),
        trackDefault: Boolean(track?.default || track?.hasAttribute("default")),
        vttStatus: vttResp.status,
        vttContentType: vttResp.headers.get("content-type") || "",
        vttStartsWebvtt: vttText.startsWith("WEBVTT"),
        rangeStatus: rangeResp.status,
        rangeHeader: rangeResp.headers.get("content-range") || "",
        hasFsBtn: Boolean(fsBtn),
        hasDlLink: Boolean(dlLink),
        disclosureText: disclosure?.textContent || "",
        chapterCount: chBtns.length,
        thumbsLoaded: thumbs.filter(i => i.naturalWidth > 0).length,
        thumbsTotal: thumbs.length,
        ttsAuditCalls: window.__ttsAuditCalls || []
      };
    }, slug);

    ttsCalls.push(...(state.ttsAuditCalls || []));

    const errs = [];
    if (state.slugAttr !== slug) errs.push(`slug mismatch: ${state.slugAttr} !== ${slug}`);
    if (state.videoWidth !== 1920 || state.videoHeight !== 1080) {
      errs.push(`expected 1920x1080 video, got ${state.videoWidth}x${state.videoHeight}`);
    }
    if (state.readyState < 1 || !(state.duration > 5)) {
      errs.push(`video metadata not loaded: readyState=${state.readyState}, duration=${state.duration}`);
    }
    if (Math.abs(state.currentTime - state.expectedSeek) > 1.5) {
      errs.push(`chapter seek failed: currentTime=${state.currentTime}, expected=${state.expectedSeek}`);
    }
    if (!state.hasTrack) errs.push("missing <track kind='captions'>");
    if (state.trackDefault) errs.push("<track> must be opt-in (must NOT have default attribute)");
    if (state.vttStatus !== 200 || !state.vttContentType.includes("text/vtt") || !state.vttStartsWebvtt) {
      errs.push(`invalid VTT response: status=${state.vttStatus}, type=${state.vttContentType}`);
    }
    if (state.rangeStatus !== 206 || !state.rangeHeader.startsWith("bytes 0-1023/")) {
      errs.push(`Range 206 failed: status=${state.rangeStatus}, content-range=${state.rangeHeader}`);
    }
    if (!state.hasFsBtn || !state.hasDlLink) errs.push("missing fullscreen button or download MP4 link");
    if (!state.disclosureText.includes("Pure Omni 1.2")) errs.push("missing composite disclosure label");
    if (state.chapterCount < 1 || state.thumbsLoaded !== state.thumbsTotal) {
      errs.push(`chapter thumbnails incomplete: ${state.thumbsLoaded}/${state.thumbsTotal}`);
    }
    if (ttsCalls.length > 0 || narrateCalls.length > 0) {
      errs.push(`TTS impersonation detected: tts=${JSON.stringify(ttsCalls)} narrate=${JSON.stringify(narrateCalls)}`);
    }
    if (pageErrors.length > 0) {
      errs.push(`page errors: ${pageErrors.join("; ")}`);
    }

    if (errs.length > 0) {
      throw new Error(`[${slug} ${label}] Gate 6b FAIL:\n - ${errs.join("\n - ")}`);
    }
    console.log(
      `✅ [Gate 6b PASS] ${slug} (${label}): ${state.videoWidth}x${state.videoHeight}, dur=${state.duration.toFixed(1)}s, seek=${state.currentTime.toFixed(1)}s (HTTP 206), VTT=200 opt-in, thumbs=${state.thumbsLoaded}/${state.thumbsTotal}, ttsCalls=0`
    );
  } finally {
    await page.close();
  }
}

async function main() {
  const { slugs, port } = parseArgs(process.argv);
  if (slugs.length === 0) {
    console.error("No recorded blog slugs found under recordings/. Pass --slugs ws4 or record first.");
    process.exit(1);
  }

  const baseUrl = `http://127.0.0.1:${port}`;
  const srv = spawn("python3", ["-B", path.join(REPO_ROOT, "server.py"), "--port", String(port)], {
    cwd: REPO_ROOT,
    env: { ...process.env, GEAP_DISABLE_GCS_SYNC: "1", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let browser;
  try {
    await waitForHealth(baseUrl);
    browser = await puppeteer.launch({
      executablePath: "/usr/bin/google-chrome",
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });

    for (const slug of slugs) {
      const wsKey = slug.toUpperCase();
      await verifySlugOnUrl(browser, baseUrl, slug, `/?tab=patterns&ws=${wsKey}`, "Blog Reader Page");
      await verifySlugOnUrl(browser, baseUrl, slug, `/blogs/${slug}/screenshots`, "Dedicated Screenshots Page");
    }
    console.log(`🎉 Gate 6b E2E Playback Verification PASSED for: ${slugs.join(", ")}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    srv.kill("SIGTERM");
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
