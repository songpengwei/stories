/* 故纸堆 · 首页 3D 转书（three.js，参照 Stripe Press 的滚动翻书）
   纵向滚动，每屏一册：书从右侧携书脊入场，随滚动转到封面，
   再转向封底从左侧离场，下一册入场。配色保持 muniao 纸色系。
   WebGL 不可用时由 index.html 的 #fallback 列表兜底。 */
import * as THREE from 'three';

const STORIES = [
  {
    spine: '聂小倩',
    cover: '小倩与采臣的小日子',
    url: 'stories/liaozhai/xiaoqian/',
    accent: '#77AAC2',
    img: 'stories/liaozhai/xiaoqian/assets/nie3_full.jpg',
  },
  {
    spine: '新郎官',
    cover: '一百年前的北京婚礼',
    url: 'stories/fengsu/wedding/',
    accent: '#F19A97',
    img: 'stories/fengsu/wedding/assets/p022.jpg',
  },
  {
    spine: '北京大集',
    cover: '北京大集上都有什么',
    url: 'stories/fengsu/market/',
    accent: '#79D9CE',
    img: 'stories/fengsu/market/assets/miao-hui.jpg',
  },
  {
    spine: '促织',
    cover: '九岁的孩子，卷成了蛐蛐',
    url: 'stories/liaozhai/cuzhi/',
    accent: '#77AAC2',
    img: 'stories/liaozhai/cuzhi/assets/cuzhi_3_soul.jpg',
  },
  {
    spine: '澳門郵票',
    cover: '澳门最小的手信',
    url: 'stories/aomen/youpiao/',
    accent: '#77AAC2',
    img: 'stories/aomen/youpiao/assets/grid-12.jpg',
  },
  {
    spine: '奥德赛',
    cover: '西方人的《西游记》',
    url: 'stories/xila/odyssey/',
    accent: '#77AAC2',
    img: 'stories/xila/odyssey/assets/cover-sirens-waterhouse.jpg',
  },
];

const PALETTE = {
  paper: 0xEFF1F3,
  ink: '#3A3842',
  paperTex: '#F5F2E9',
  accent: '#77AAC2',
};

function fail() {
  const f = document.getElementById('fallback');
  if (f) f.style.display = 'block';
  const s = document.getElementById('stage3d');
  if (s) s.style.display = 'none';
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  fail();
  throw e;
}

/* ---------- 纹理（canvas 手绘：线装书书脊 / 古画封面 / 书口） ---------- */

function makeSpineTexture(title, accent) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 768;
  const x = c.getContext('2d');
  x.fillStyle = PALETTE.paperTex;
  x.fillRect(0, 0, 128, 768);
  x.strokeStyle = 'rgba(74,72,84,.55)';
  x.lineWidth = 3; x.strokeRect(10, 10, 108, 748);
  x.lineWidth = 1; x.strokeRect(18, 18, 92, 732);
  x.fillStyle = PALETTE.ink;
  x.font = '500 46px "Noto Serif SC", "Songti SC", serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const step = 60, y0 = 110;
  [...title].forEach((ch, i) => x.fillText(ch, 64, y0 + i * step));
  x.fillStyle = accent;
  x.fillRect(46, 700, 36, 36);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeCoverTexture(story, img) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 768;
  const x = c.getContext('2d');
  const s = Math.max(512 / img.width, 768 / img.height);
  const w = img.width * s, h = img.height * s;
  x.drawImage(img, (512 - w) / 2, (768 - h) / 2, w, h);
  x.fillStyle = '#F7F4EB';
  x.fillRect(0, 632, 512, 136);
  x.fillStyle = story.accent;
  x.fillRect(224, 648, 64, 3);
  x.fillStyle = '#4A4854';
  const size = story.cover.length > 9 ? 32 : 38;
  x.font = `500 ${size}px "Noto Serif SC", "Songti SC", serif`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(story.cover, 256, 706);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makePagesTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 768;
  const x = c.getContext('2d');
  x.fillStyle = '#F1EEE3';
  x.fillRect(0, 0, 128, 768);
  x.strokeStyle = 'rgba(105,103,115,.12)';
  x.lineWidth = 1;
  for (let y = 3; y < 768; y += 5) {
    x.beginPath(); x.moveTo(0, y); x.lineTo(128, y); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* 封底：素纸 + 双线框 + 主色印章（与封面古画区分，离场转向时不混淆） */
function makeBackTexture(accent) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 768;
  const x = c.getContext('2d');
  x.fillStyle = '#F5F2E9';
  x.fillRect(0, 0, 512, 768);
  x.strokeStyle = 'rgba(74,72,84,.45)';
  x.lineWidth = 3; x.strokeRect(24, 24, 464, 720);
  x.lineWidth = 1; x.strokeRect(36, 36, 440, 696);
  x.fillStyle = accent;
  x.fillRect(238, 636, 36, 36);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- 场景 ---------- */

const container = document.getElementById('stage3d');

renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.paper);

const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0.2, 8);

scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe4e9, 1.5));
const sun = new THREE.DirectionalLight(0xfff6e8, 1.35);
sun.position.set(6, 10, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
scene.add(sun);

/* 地面：只接影子，颜色与背景一致，避免"地板"存在感 */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 30),
  new THREE.ShadowMaterial({ opacity: 0.12 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -2.15;
floor.receiveShadow = true;
scene.add(floor);

/* ---------- 书模 ---------- */

const pagesTex = makePagesTexture();
const pagesMat = new THREE.MeshStandardMaterial({ map: pagesTex, roughness: 1 });
const BOOK_T = 0.55, BOOK_H = 3.4, BOOK_D = 2.4;
const books = [];

const loader = new THREE.ImageLoader();
const loadImage = url => new Promise((res, rej) => loader.load(url, res, undefined, rej));

async function build() {
  await document.fonts.ready;
  const imgs = await Promise.all(STORIES.map(s => loadImage(s.img)));
  STORIES.forEach((story, i) => {
    const spineMat = new THREE.MeshStandardMaterial({ map: makeSpineTexture(story.spine, story.accent), roughness: 0.9 });
    const coverMat = new THREE.MeshStandardMaterial({ map: makeCoverTexture(story, imgs[i]), roughness: 0.9 });
    const backMat = new THREE.MeshStandardMaterial({ map: makeBackTexture(story.accent), roughness: 0.9 });
    /* 盒面顺序：[+x 封底, -x 封面, +y 天头, -y 地脚, +z 书脊, -z 书口] */
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(BOOK_T, BOOK_H, BOOK_D),
      [backMat, coverMat, pagesMat, pagesMat, spineMat, pagesMat]
    );
    mesh.castShadow = true;
    const g = new THREE.Group();
    g.add(mesh);
    g.visible = false;
    g.userData = { story, i };
    scene.add(g);
    books.push(g);
  });
}

/* ---------- 滚动编排 ----------
   t = scrollY / vh。第 0 屏是序，第 i+1 屏是第 i 册。
   书 i 的窗口 p = t - (i+1)：
     p∈[-0.5, 0)   从右侧携书脊入场（rotY=0，书脊朝前）
     p∈[0, 0.5]    展示：转到封面（rotY→π/2），随后定格
     p∈[0.5, 1)    离场：转向封底（→π），向左飞出           */

const easeOut = u => 1 - Math.pow(1 - u, 3);
const easeIn = u => u * u * u;
const clamp01 = u => Math.max(0, Math.min(1, u));

/* 从当前滚动位置初始化：history.back 回首页时浏览器恢复滚动位置，
   但可能不发 scroll 事件（或发在监听器挂上之前），
   不从 scrollY 起步会出现"文字在、书没了"的空台 */
let targetT = scrollY / innerHeight;
let smoothT = targetT;
addEventListener('scroll', () => { targetT = scrollY / innerHeight; }, { passive: true });

function stage() {
  const aspect = innerWidth / innerHeight;
  return aspect > 1
    ? { x: 1.55, y: 0.1, s: 1, travel: 4.3 }   /* 桌面：书在右，文左 */
    : { x: 0, y: 1.35, s: 0.5, travel: 3.7 };  /* 移动：书在上，文下 */
}

function placeBook(g, p, time) {
  const st = stage();
  const bob = Math.sin(time * 0.9 + g.userData.i * 1.7) * 0.05;
  if (p < -0.5 || p >= 1) { g.visible = false; return; }
  g.visible = true;
  let x = st.x, rotY = 0, yOff = 0;
  if (p < 0) {                            /* 入场：从下方升入，书脊朝前。
                                             easeIn：先慢后快，等旧书升走再进场 */
    const u = clamp01((p + 0.5) / 0.5);
    yOff = -(1 - easeIn(u)) * st.travel;
    rotY = 0;
  } else if (p < 0.5) {                   /* 展示：转到封面 */
    rotY = easeOut(clamp01(p / 0.32)) * Math.PI / 2;
  } else {                                /* 离场：转向书口，继续向上升出。
                                             easeOut：先快后慢，立刻给新书让位。
                                             一快一慢两书间距始终 > 书高，不相撞。 */
    const u = clamp01((p - 0.5) / 0.5);
    rotY = Math.PI / 2 + easeIn(u) * Math.PI / 2;
    yOff = easeOut(u) * st.travel;
  }
  /* 落位反馈：封面转定（p∈[0.30,0.5)）瞬间做一次小幅脉冲，
     时间驱动，与滚动解耦；回滚再到位会重播 */
  if (p >= 0.3 && p < 0.5) {
    if (!g.userData.settledAt) g.userData.settledAt = time;
  } else {
    g.userData.settledAt = 0;
  }
  let pulse = 0;
  if (g.userData.settledAt) {
    const u = Math.min((time - g.userData.settledAt) / 0.55, 1);
    pulse = Math.sin(u * Math.PI) * 0.045;
  }
  g.position.set(x, st.y + bob + yOff, 0);
  g.rotation.set(0.06, rotY, -0.03);
  g.scale.setScalar(st.s * (1 + pulse));
}

/* 点击画布：点中当前展示的书 → 进入故事 */
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let downPos = null;
container.addEventListener('pointerdown', e => { downPos = [e.clientX, e.clientY]; });
container.addEventListener('pointerup', e => {
  if (!downPos) return;
  const dx = e.clientX - downPos[0], dy = e.clientY - downPos[1];
  downPos = null;
  if (dx * dx + dy * dy > 36) return;
  ptr.x = (e.clientX / innerWidth) * 2 - 1;
  ptr.y = -(e.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(ptr, camera);
  const visible = books.filter(g => g.visible).map(g => g.children[0]);
  const hits = ray.intersectObjects(visible);
  if (hits.length) location.href = hits[0].object.parent.userData.story.url;
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* 悬停书时手型 */
container.addEventListener('pointermove', e => {
  ptr.x = (e.clientX / innerWidth) * 2 - 1;
  ptr.y = -(e.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(ptr, camera);
  const visible = books.filter(g => g.visible).map(g => g.children[0]);
  container.style.cursor = ray.intersectObjects(visible).length ? 'pointer' : '';
});


function tick(time) {
  requestAnimationFrame(tick);
  /* 大幅跳转（回到顶部/拖滚动条）时瞬移到位，不把每一册重演一遍；
     正常滚动仍用缓动跟随 */
  if (Math.abs(targetT - smoothT) > 1.2) smoothT = targetT;
  else smoothT += (targetT - smoothT) * 0.09;
  books.forEach((g, i) => placeBook(g, smoothT - (i + 1), time / 1000));
  renderer.render(scene, camera);
}

build().then(() => tick(0)).catch(e => { console.error(e); fail(); });
