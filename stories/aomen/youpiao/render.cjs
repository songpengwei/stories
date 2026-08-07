const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1600 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + '?sheet=1');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  const targets = [
    ['#xhs-01', 'xhs-01-导览.png'],
    ['#xhs-02', 'xhs-02-门神.png'],
    ['#xhs-03', 'xhs-03-阳台骑楼.png'],
    ['#xhs-04', 'xhs-04-妈祖.png'],
    ['#xhs-05', 'xhs-05-观音堂.png'],
    ['#xhs-06', 'xhs-06-三轮车夫.png'],
    ['#xhs-07', 'xhs-07-木兰辞.png'],
    ['#xhs-08', 'xhs-08-山水画.png'],
    ['#xhs-09', 'xhs-09-聊斋.png'],
    ['#xhs-10', 'xhs-10-镜海归帆图.png'],
    ['#xhs-11', 'xhs-11-莲花.png'],
    ['#xhs-12', 'xhs-12-泰山.png'],
    ['#xhs-13', 'xhs-13-马年.png'],
  ];
  for (const [sel, name] of targets) {
    const el = await page.$(sel);
    await el.screenshot({ path: path.join(__dirname, 'output', name) });
    console.log('rendered', name);
  }
  await browser.close();
})();
