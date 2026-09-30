const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1600 }, deviceScaleFactor: 1.5 });
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + '?sheet=1');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);

  const targets = [];
  for (let i = 1; i <= 12; i++) {
    const id = 'xhs-' + String(i).padStart(2, '0');
    targets.push(['#' + id, id + '.png']);
  }
  for (const [sel, name] of targets) {
    const el = await page.$(sel);
    await el.screenshot({ path: path.join(__dirname, 'output', name) });
    console.log('rendered', name);
  }
  await browser.close();
})();
