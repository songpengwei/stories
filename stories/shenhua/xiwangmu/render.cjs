const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1600 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + '?sheet=1');
  await page.waitForLoadState('networkidle');
  try { await page.evaluate(() => document.fonts.ready); } catch (e) {}
  await page.waitForTimeout(1200);

  const targets = [
    ['#p01', 'xhs-01-zuhe.png'],
    ['#p02', 'xhs-02-xiwangmu.png'],
    ['#p03', 'xhs-03-dongwanggong.png'],
    ['#p04', 'xhs-04-yutu.png'],
    ['#p05', 'xhs-05-chanchu.png'],
    ['#p06', 'xhs-06-sanzuwu.png'],
    ['#p07', 'xhs-07-jiuweihu.png'],
    ['#p08', 'xhs-08-yuren.png'],
    ['#p09', 'xhs-09-fengniao.png'],
    ['#p10', 'xhs-10-yuanliu.png'],
  ];
  for (const [sel, name] of targets) {
    const el = await page.$(sel);
    await el.screenshot({ path: path.join(__dirname, 'output', name) });
    console.log('rendered', name);
  }
  await browser.close();
})();
