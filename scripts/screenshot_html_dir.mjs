/**
 * Screenshots every *.html in a directory to PNG using puppeteer-core + Google Chrome (--headless=new,
 * isolated /tmp/chrome_headless_* profile). Used by render_pptx_preview.py.
 * Usage: node scripts/screenshot_html_dir.mjs <htmlDir> <outDir> [width] [height]
 */
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptCanvasPkg = fs.existsSync(path.resolve(__dirname, '../../PromptCanvas/package.json'))
  ? path.resolve(__dirname, '../../PromptCanvas/package.json')
  : '/Users/nitinagga/Documents/PromptCanvas/package.json';
const require = createRequire(promptCanvasPkg);
const puppeteer = require('puppeteer-core');

const chromeCandidates = [
  process.env.CHROME_BIN,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const executablePath = chromeCandidates.find((p) => fs.existsSync(p)) || chromeCandidates[chromeCandidates.length - 1];

const [htmlDir, outDir, w = '1280', h = '720'] = process.argv.slice(2);
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome_headless_pptx_'));
const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  userDataDir,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--no-first-run', '--hide-scrollbars', `--window-size=${w},${h}`],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: Number(w), height: Number(h), deviceScaleFactor: 1.5 });
  const files = fs.readdirSync(htmlDir).filter((f) => f.endsWith('.html')).sort();
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of files) {
    await page.goto(`file://${path.join(htmlDir, f)}`, { waitUntil: 'load', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 150));
    const out = path.join(outDir, f.replace(/\.html$/, '.png'));
    await page.screenshot({ path: out });
    console.log(`   🖼️  ${out}`);
  }
} finally {
  await browser.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
}
