/**
 * Screenshots every *.html in a directory to PNG using puppeteer-core + Google Chrome (--headless=new,
 * isolated /tmp/chrome_headless_* profile). Used by render_pptx_preview.py.
 * Usage: node scripts/screenshot_html_dir.mjs <htmlDir> <outDir> [width] [height]
 */
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire('/Users/nitinagga/Documents/PromptCanvas/package.json');
const puppeteer = require('puppeteer-core');

const [htmlDir, outDir, w = '1280', h = '720'] = process.argv.slice(2);
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome_headless_pptx_'));
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  userDataDir,
  args: ['--no-first-run', '--hide-scrollbars', `--window-size=${w},${h}`],
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
