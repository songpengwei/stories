// render.cjs — 逐页截图 .poster，deviceScaleFactor 1.5，输出 1620×2160 PNG
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

(async () => {
  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 1600 },
    deviceScaleFactor: 1.5,
  });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.waitForLoadState('networkidle');
  try { await page.evaluate(() => document.fonts.ready); } catch (e) {}
  await page.waitForTimeout(1200); // WebGL 背景稳定

  const ids = await page.$$eval('.poster', els => els.map(e => e.id));
  for (const id of ids) {
    const el = await page.$('#' + id);
    const n = String(parseInt(id.replace(/^p/, ''), 10) + 1).padStart(2, '0');
    // 01.png 预留给九宫格拼图封面（PIL 合成，非 HTML 渲染），poster 从 02 起编号
    await el.screenshot({ path: path.join(outDir, n + '.png') });
    console.log('rendered', id);
  }
  await browser.close();
})();
