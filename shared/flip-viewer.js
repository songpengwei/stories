/* 木鸟故事库 · 书本翻页阅读器
   双页对开全屏，右页绕书脊 rotateY 翻到左边，背面即下一页的左页。
   默认启用；URL 带 ?sheet=1 时退出（渲染导出用的整页平铺模式）。 */
(function () {
  if (/[?&]sheet=1\b/.test(location.search)) return;

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
    prevBtn.disabled = s === 0;
    nextBtn.disabled = s === leafCount;
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
  var prevBtn = el('button', 'flip-btn flip-prev');
  prevBtn.setAttribute('aria-label', '上一页');
  prevBtn.textContent = '←';
  var nextBtn = el('button', 'flip-btn flip-next');
  nextBtn.setAttribute('aria-label', '下一页');
  nextBtn.textContent = '→';
  var counter = el('div', 'flip-counter');
  counter.appendChild(document.createTextNode(''));
  var hint = el('span', 'flip-hint');
  hint.textContent = '← → 翻页';
  counter.appendChild(hint);
  document.body.appendChild(prevBtn);
  document.body.appendChild(nextBtn);
  document.body.appendChild(counter);

  prevBtn.addEventListener('click', function (e) { e.stopPropagation(); prev(); });
  nextBtn.addEventListener('click', function (e) { e.stopPropagation(); next(); });

  /* 关闭：右上角 × 或 Esc，返回来源页（同源）否则回目录页 */
  var closeBtn = el('button', 'flip-close');
  closeBtn.setAttribute('aria-label', '退出阅读');
  closeBtn.textContent = '×';
  document.body.appendChild(closeBtn);
  function exitBook() {
    var ref = document.referrer;
    if (ref && new URL(ref).origin === location.origin && history.length > 1) history.back();
    else location.href = '../../../';   /* 故事页在 stories/<系列>/<故事>/ 下，回根目录 */
  }
  closeBtn.addEventListener('click', function (e) { e.stopPropagation(); exitBook(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'Escape') exitBook();
  });

  /* 点书的左半/右半翻页 */
  book.addEventListener('click', function (e) {
    if (e.clientX > innerWidth / 2) next(); else prev();
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
