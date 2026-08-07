/* 木鸟故事库 · 书本翻页阅读器
   双页对开全屏，右页绕书脊 rotateY 翻到左边，背面即下一页的左页。
   默认启用；URL 带 ?sheet=1 时退出（渲染导出用的整页平铺模式）。 */
(function () {
  /* 渲染导出用的整页平铺模式：亮出 .sheet 后退出 */
  if (/[?&]sheet=1\b/.test(location.search)) {
    document.body.classList.add('sheet-mode');
    return;
  }

  var sheet = document.querySelector('.sheet');
  if (!sheet) return;
  var posters = Array.prototype.slice.call(sheet.querySelectorAll('.poster'));
  if (posters.length < 2) return;

  document.body.classList.add('viewer');

  var N = posters.length;                 /* 页数（1-based 页码 1..N） */
  var leafCount = Math.floor((N - 1) / 2);/* 叶子数：叶 j 正面 p(2j)，背面 p(2j+1) */
  var s = 0;                              /* 已翻过的叶子数 = 当前对开序号 */

  function el(tag, cls) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    return d;
  }

  /* 组装书本：左底页 p1，右底页 pN（偶数页）或空白页（奇数页），中间全进叶子 */
  var book = el('div', 'flip-book');
  var baseL = el('div', 'base base-left');
  var baseR = el('div', 'base base-right');
  baseL.appendChild(posters[0]);
  if (N % 2 === 0) baseR.appendChild(posters[N - 1]);
  else baseR.appendChild(el('div', 'blank'));
  book.appendChild(baseL);
  book.appendChild(baseR);

  var leaves = [];
  for (var j = 1; j <= leafCount; j++) {
    var leaf = el('div', 'leaf');
    var front = posters[2 * j - 1];       /* p(2j) */
    var back  = posters[2 * j];           /* p(2j+1) */
    back.classList.add('face-back');
    leaf.appendChild(front);
    leaf.appendChild(back);
    book.appendChild(leaf);
    leaves.push(leaf);
  }
  document.body.appendChild(book);

  /* 叶子层级：右叠在上的是下一张要翻的；翻到左边后按翻页顺序叠 */
  function restack(turning) {
    leaves.forEach(function (leaf, k) {
      var j = k + 1;
      if (leaf === turning) { leaf.style.zIndex = 100; return; }
      leaf.style.zIndex = j <= s ? j : leafCount - j + 10;
    });
  }

  function layout() {
    var f = Math.min((innerWidth - 48) / 2160, (innerHeight - 48) / 1440);
    book.style.transform = 'scale(' + f + ')';
  }

  function label() {
    var left  = s === 0 ? 1 : 2 * s + 1;
    var right = s === leafCount ? (N % 2 === 0 ? N : null) : 2 * s + 2;
    var cur = right ? pad(left) + '–' + pad(right) : pad(left);
    counter.firstChild.nodeValue = cur + ' / ' + pad(N);
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function updateUI() {
    label();
    edgeL.classList.toggle('off', s === 0);
    edgeR.classList.toggle('off', s === leafCount);
    var rightPage = s === leafCount ? N : 2 * s + 2;
    history.replaceState(null, '', '#p=' + rightPage);
  }

  function flip(leaf, forward, instant) {
    if (instant) {
      leaf.classList.add('no-anim');
      leaf.classList.toggle('flipped', forward);
      void leaf.offsetWidth;              /* 强制 reflow 后再恢复过渡 */
      leaf.classList.remove('no-anim');
      restack(null);
      return;
    }
    restack(leaf);
    leaf.classList.toggle('flipped', forward);
    leaf.addEventListener('transitionend', function done() {
      leaf.removeEventListener('transitionend', done);
      restack(null);
    });
  }

  function next() {
    if (s >= leafCount) return;
    flip(leaves[s], true);
    s++;
    updateUI();
  }
  function prev() {
    if (s <= 0) return;
    s--;
    flip(leaves[s], false);
    updateUI();
  }

  /* 控件 */
  var counter = el('div', 'flip-counter');
  counter.appendChild(document.createTextNode(''));
  var hint = el('span', 'flip-hint');
  hint.textContent = '← → 翻页';
  counter.appendChild(hint);
  document.body.appendChild(counter);

  /* 翻页箭头：hover 书的左/右半时浮现，点击翻页（唯一的点击翻页入口，
     书本身不响应点击，选文字不会误翻页）；首/末对开隐藏对应侧 */
  var edgeL = el('div', 'flip-edge flip-edge-l');
  edgeL.textContent = '‹';
  var edgeR = el('div', 'flip-edge flip-edge-r');
  edgeR.textContent = '›';
  book.appendChild(edgeL);
  book.appendChild(edgeR);
  edgeL.addEventListener('click', prev);
  edgeR.addEventListener('click', next);

  /* 关闭：桌面端 × 放进书里，hover 书页右上角浮现（与翻页箭头同款纸色圆片）；
     移动端没有 hover，另用一个固定在屏幕右上角的小 × 兜底。
     退出返回来源页（同源）否则回目录页 */
  var closeBtn = el('button', 'flip-close');
  closeBtn.setAttribute('aria-label', '退出阅读');
  closeBtn.textContent = '×';
  book.appendChild(closeBtn);
  var closeBtnM = el('button', 'flip-close-m');
  closeBtnM.setAttribute('aria-label', '退出阅读');
  closeBtnM.textContent = '×';
  document.body.appendChild(closeBtnM);
  function exitBook() {
    var ref = document.referrer;
    if (ref && new URL(ref).origin === location.origin && history.length > 1) history.back();
    else location.href = '../../../';   /* 故事页在 stories/<系列>/<故事>/ 下，回根目录 */
  }
  closeBtn.addEventListener('click', function (e) { e.stopPropagation(); exitBook(); });
  closeBtnM.addEventListener('click', function (e) { e.stopPropagation(); exitBook(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'ArrowRight' || e.key === ' ' || e.code === 'Space') { e.preventDefault(); next(); }
    else if (e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); exitBook(); }  /* 删除键退出 */
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); exitBook(); }
  });

  /* 鼠标所在半边决定显示哪侧箭头；书页右上角（右 15% × 上 18%）浮现关闭 × */
  book.addEventListener('mousemove', function (e) {
    var left = e.clientX <= innerWidth / 2;
    book.classList.toggle('hov-l', left);
    book.classList.toggle('hov-r', !left);
    var r = book.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width;
    var y = (e.clientY - r.top) / r.height;
    book.classList.toggle('hov-c', x > 0.85 && y < 0.18);
  });
  book.addEventListener('mouseleave', function () {
    book.classList.remove('hov-l', 'hov-r', 'hov-c');
  });

  /* 触摸滑动 */
  var touchX = null;
  document.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) { if (dx < 0) next(); else prev(); }
    touchX = null;
  }, { passive: true });

  addEventListener('resize', layout);

  /* #p=N 直达含第 N 页的对开 */
  var m = /#p=(\d+)/.exec(location.hash);
  if (m) {
    var target = Math.max(1, Math.min(N, parseInt(m[1], 10)));
    s = Math.min(Math.floor((target - 1) / 2), leafCount);
    for (var k = 0; k < s; k++) flip(leaves[k], true, true);
  }

  /* 缩放只依赖视口尺寸，脚本在 body 末尾执行时 DOM 已就绪，
     立即定位并亮出书本，避免等 load 造成的未缩放闪帧 */
  function start() {
    layout();
    restack(null);
    updateUI();
    book.classList.add('ready');
  }
  start();
})();
