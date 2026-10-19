const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

/* 逐 poster 截图：1080×1800 画板 × deviceScaleFactor 2 = 2160×3600。
   走 ?sheet=1 平铺模式（flip-viewer.js 退出，不受翻页器影响）。 */
(async () => {
  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1224, height: 2000 }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + '?sheet=1');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500); // WebGL ink-flow settle

  for (let i = 1; i <= 8; i++) {
    const id = 'card-' + String(i).padStart(2, '0');
    const el = await page.$('#' + id);
    await el.screenshot({ path: path.join(outDir, id + '.png') });
    console.log('rendered', id + '.png');
  }
  await browser.close();
})();
