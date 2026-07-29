const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1600 }, deviceScaleFactor: 1.5 });
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + '?sheet=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 30000 }); } catch (e) { console.log('networkidle timeout, continue'); }
  try { await page.evaluateHandle('document.fonts.ready'); } catch (e) {}
  await page.waitForTimeout(2000);

  const targets = [
    ['#xhs-01', 'xhs-01-cover.png'],
    ['#xhs-02', 'xhs-02-qianqing.png'],
    ['#xhs-03', 'xhs-03-bandu.png'],
    ['#xhs-04', 'xhs-04-huangmu.png'],
    ['#xhs-05', 'xhs-05-jianke.png'],
    ['#xhs-06', 'xhs-06-lanmei.png'],
    ['#xhs-07', 'xhs-07-genang.png'],
    ['#xhs-08', 'xhs-08-qingshui.png'],
    ['#xhs-09', 'xhs-09-zaoren.png'],
    ['#xhs-10', 'xhs-10-colophon.png'],
    ['#xhs-11', 'xhs-11-appendix-1.png'],
    ['#xhs-12', 'xhs-12-appendix-2.png'],
  ];
  for (const [sel, name] of targets) {
    const el = await page.$(sel);
    await el.screenshot({ path: path.join(__dirname, 'output', name) });
    console.log('rendered', name);
  }
  await browser.close();
})();
