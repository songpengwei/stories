const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1600 }, deviceScaleFactor: 1.5 });
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + '?sheet=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 30000 }); } catch (e) { console.log('networkidle timeout, continue'); }
  try { await page.evaluateHandle('document.fonts.ready'); } catch (e) {}
  await page.waitForTimeout(2000);

  // WebGL 画布在元素截图合成时偶发错位（把带背景元素的底色错投到别的位置），
  // 位图本是静态的（frozenTime），先把每页 canvas 烘焙成 <img> 再截图
  await page.evaluate(() => {
    document.querySelectorAll('canvas.mag-bg').forEach(c => {
      const img = document.createElement('img');
      img.className = 'mag-bg';
      img.src = c.toDataURL();
      c.replaceWith(img);
    });
  });
  await page.waitForTimeout(300);

  const targets = [
    ['#xhs-01', 'xhs-01-cover.png'],
    ['#xhs-02', 'xhs-02-background.png'],
    ['#xhs-03', 'xhs-03-chunfan.png'],
    ['#xhs-04', 'xhs-04-shangdeng.png'],
    ['#xhs-05', 'xhs-05-baozhu.png'],
    ['#xhs-06', 'xhs-06-tiandeng.png'],
    ['#xhs-07', 'xhs-07-moxia.png'],
    ['#xhs-08', 'xhs-08-dengpeng.png'],
    ['#xhs-09', 'xhs-09-huolang.png'],
    ['#xhs-10', 'xhs-10-jirang.png'],
    ['#xhs-11', 'xhs-11-zhuazi.png'],
    ['#xhs-12', 'xhs-12-zouqiao.png'],
    ['#xhs-13', 'xhs-13-yanjiu.png'],
    ['#xhs-14', 'xhs-14-taiping.png'],
    ['#xhs-15', 'xhs-15-colophon.png'],
  ];
  for (const [sel, name] of targets) {
    const el = await page.$(sel);
    await el.screenshot({ path: path.join(__dirname, 'output', name) });
    console.log('rendered', name);
  }
  await browser.close();
})();
