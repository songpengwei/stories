const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1600 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + '?sheet=1');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200); // let WebGL bg + fonts settle

  const targets = [
    ['#xhs-01', 'xhs-01-cover.png'],
    ['#xhs-02', 'xhs-02-miaohui.png'],
    ['#xhs-03', 'xhs-03-huojie.png'],
    ['#xhs-04', 'xhs-04-xiaochi.png'],
    ['#xhs-05', 'xhs-05-jietou.png'],
    ['#xhs-06', 'xhs-06-tongnian.png'],
    ['#xhs-07', 'xhs-07-shouyi.png'],
    ['#xhs-08', 'xhs-08-timeline.png'],
  ];
  for (const [sel, name] of targets) {
    const el = await page.$(sel);
    await el.screenshot({ path: path.join(__dirname, 'output', name) });
    console.log('rendered', name);
  }
  await browser.close();
})();
