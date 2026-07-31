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
    img: 'stories/liaozhai/xiaoqian/assets/nie3_full.jpg',
  },
  {
    spine: '新郎官',
    cover: '一百年前的北京婚礼',
    url: 'stories/fengsu/wedding/',
    img: 'stories/fengsu/wedding/assets/p022.jpg',
  },
  {
    spine: '北京大集',
    cover: '北京大集上都有什么',
    url: 'stories/fengsu/market/',
    img: 'stories/fengsu/market/assets/miao-hui.jpg',
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

function makeSpineTexture(title) {
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
  x.fillStyle = PALETTE.accent;
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
  x.fillStyle = PALETTE.accent;
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
    const spineMat = new THREE.MeshStandardMaterial({ map: makeSpineTexture(story.spine), roughness: 0.9 });
    const coverMat = new THREE.MeshStandardMaterial({ map: makeCoverTexture(story, imgs[i]), roughness: 0.9 });
    /* 盒面顺序：[+x 封底, -x 封面, +y 天头, -y 地脚, +z 书脊, -z 书口] */
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(BOOK_T, BOOK_H, BOOK_D),
      [coverMat, coverMat, pagesMat, pagesMat, spineMat, pagesMat]
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

let targetT = 0;
let smoothT = 0;
addEventListener('scroll', () => { targetT = scrollY / innerHeight; }, { passive: true });

function stage() {
  const aspect = innerWidth / innerHeight;
  return aspect > 1
    ? { x: 1.55, y: 0.1, s: 1 }        /* 桌面：书在右，文左 */
    : { x: 0, y: 1.3, s: 0.62 };      /* 移动：书在上，文下 */
}

function placeBook(g, p, time) {
  const st = stage();
  const bob = Math.sin(time * 0.9 + g.userData.i * 1.7) * 0.05;
  if (p < -0.5 || p >= 1) { g.visible = false; return; }
  g.visible = true;
  let x = st.x, rotY = 0;
  if (p < 0) {                            /* 入场 */
    const u = easeOut(clamp01((p + 0.5) / 0.5));
    x = st.x + (1 - u) * 5.5;
    rotY = 0;
  } else if (p < 0.5) {                   /* 展示：转到封面 */
    rotY = easeOut(clamp01(p / 0.32)) * Math.PI / 2;
  } else {                                /* 离场：转向封底飞出 */
    const u = clamp01((p - 0.5) / 0.5);
    rotY = Math.PI / 2 + easeIn(u) * Math.PI / 2;
    x = st.x - easeIn(u) * 6.5;
  }
  g.position.set(x, st.y + bob, 0);
  g.rotation.set(0.06, rotY, -0.03);
  g.scale.setScalar(st.s);
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
  smoothT += (targetT - smoothT) * 0.09;
  books.forEach((g, i) => placeBook(g, smoothT - (i + 1), time / 1000));
  renderer.render(scene, camera);
}

build().then(() => tick(0)).catch(e => { console.error(e); fail(); });
