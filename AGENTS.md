# 故纸堆 · 古画里的故事

静态网页库：以古代绘本、风俗画为底本讲古代故事。一册一故事，图是旧图，事是旧事。

## 仓库结构

```
index.html                  目录页：Stripe Press 式滚动分屏，每屏一册；内嵌 #fallback 降级列表
book-stage.js              滚动转书场景（书模、纹理、滚动编排；书目在 STORIES 常量里）
shared/
  editorial.css             所有故事页共用的模板样式（唯一权威来源）
  magazine-bg-webgl.js      WebGL 水墨背景（所有故事页共用）
  flip-viewer.css           书本翻页阅读器样式（浏览模式）
  flip-viewer.js            书本翻页阅读器逻辑；URL 带 ?sheet=1 时退出，回到整页平铺
  vendor/three.module.js    three.js r164（本地打包，不走 CDN；书架唯一依赖）
stories/<系列>/<故事>/
  index.html                故事页：link 共享 CSS + 内联 task-scoped CSS + 各 poster
  assets/                   该故事的图片素材
  render.cjs                Playwright 渲染脚本（逐 poster 截图到 output/）
  package.json              依赖 playwright-core
```

现有故事：

- `stories/liaozhai/xiaoqian/` — 《倩女幽魂》之后（《聊斋全图》第十一册，清光绪绘本）
- `stories/liaozhai/cuzhi/` — 促织（《聊斋全图》第 41 册，清代彩绘原本）
- `stories/fengsu/wedding/` — 是谓新郎官（《北京风俗图谱》礼俗第二）
- `stories/fengsu/market/` — 一百年前的北京地摊（《北京风俗图谱》市井第六）
- `stories/xila/odyssey/` — 西方人的《西游记》（荷马史诗，Schmied 彩色木刻）
- `stories/haijiang/huanhai/` — 「1799年乾隆世界地图」原件找到了（《海疆洋界形势全图》卷首《环海全图》，美国国会图书馆藏）
- `stories/fengsu/chunxi/` — 古人怎么过年（《京辇春熙图》册，清嘉庆黄钺恭绘，台北故宫博物院藏）

## 新增一个故事

1. 在 `stories/<系列>/<故事>/` 下建目录，复制一个现有故事页的 `index.html` 骨架、`render.cjs`、`package.json`。
2. 故事页 `<head>` 里必须 `<link>` 两个共享样式（`editorial.css` + `flip-viewer.css`），末尾 `<script>` 两个共享脚本（`magazine-bg-webgl.js` + 挂载脚本 + `flip-viewer.js`），路径都是 `../../../shared/…`，照抄现有页面。
3. 故事自己的样式只写进内联 `<style>` 的 task-scoped 区块；**不要改 `shared/editorial.css` 来满足单个故事**——改它等于改所有故事。
4. 素材放 `assets/`，按用途命名（`miao-hui.jpg`），不要带 hash。
5. `render.cjs` 里按 poster 的 `id` 配置输出文件名；`npm i` 后 `node render.cjs` 渲染到 `output/`（已 gitignore）。渲染走 `index.html?sheet=1`（整页平铺），不要被翻页器影响。
6. 浏览模式默认是书本翻页阅读器（`shared/flip-viewer.*`）：双页对开全屏，右页绕书脊 3D 翻到左边。←/→ 键、点击 hover 书的左/右半时浮现的 `.flip-edge` 纸色圆片箭头、移动端滑动可以翻页；书本身不响应点击，选文字不会误翻页。`#p=N` 直达含第 N 页的对开。`.flip-edge` 由 JS 用 `hov-l`/`hov-r` 按鼠标所在半边切换，首/末对开加 `.off` 隐藏对应侧；半透明灰字直接压在古画上会看不清，要用纸色底圆片；隐藏时必须同时 `visibility:hidden`——只 `opacity:0` 的话透明圆片仍会在页面上截获点击。退出阅读：桌面端 hover 书页右上角浮现纸色 ×（`.flip-close` 在书内，JS 按鼠标位置加 `.hov-c`，与翻页箭头同款圆片），移动端无 hover 用固定屏幕右上角的 `.flip-close-m` 小 × 兜底，Esc 全平台可退出（同源来源 history.back，否则回根目录）。缩放定位在 body 末尾脚本执行时立即完成（不等 load），避免未缩放闪帧；`.flip-book` 首次定位前 `visibility:hidden`，定位后加 `.ready` 亮出。**不要给 `.leaf` 加 filter/opacity 等分组属性**——会强制 transform-style:flat 杀掉 preserve-3d，翻转时正面镜像一直显示、落定时才闪成背面（已踩过：曾用 drop-shadow 投影增强体积感）。翻页器的类名统一带 `flip-` 前缀（`.flip-book` / `.flip-edge` / `.flip-close` / `.flip-counter`），避免与故事页 task-scoped CSS 撞名（教训：曾用 `.book` 撞了小倩封面的线装书组件）。页数尽量凑偶数，奇数页最后一个对开右页为空白页。
7. 上架到首页：在 `book-stage.js` 的 `STORIES` 数组里加一条（书脊短名、封面题名、链接、封面图），并在根目录 `index.html` 里加一屏 `<section class="panel story">`（注意 data-i 连续）和一条 `#fallback` 的 `.fb-story` 条目、一个 `#bookNav` 按钮。首页视觉随整站 muniao 风格：纸色底、线装书版框书脊 + 品牌蓝印章、古画封面，不要改成别的配色。首页落定某册时地址栏带 `#<故事目录名>`（slug 从该屏 CTA 的 href 推导，无需另配），刷新或退出阅读回首页都能复位到该册；`book-stage.js` 的 `targetT/smoothT` 必须从当前 `scrollY` 初始化——history.back 回来时浏览器恢复滚动位置但可能不发 scroll 事件，否则会出现"文字在、书没了"的空台。首页所有滚动参数（`scrollY` 的除数、跳转目标）一律用从 `.panel` 量出的 `VH` 常量，不要用 `innerHeight`——iOS Safari 地址栏随滚动伸缩会改变 `innerHeight`，滚动中 t 跳变、书和文案一起抖动；书在屏幕上的适配缩放（layout）才用真实 `innerWidth/innerHeight`。移动端拼格 `#collage` 必须 `align-content:start`（Safari 会把被 flex 拉高的 grid 容器的自动行高撑开、行间出大缝）。

## 风格设定（源自 guizang-social-card-skill）

风格模式：**Editorial Magazine × E-ink**（杂志编辑风 + 电子墨水质纸感）。不用 Swiss 模式，两者不混用。

### 主题：muniao（本站默认品牌色）

`<html data-theme="muniao">`，令牌定义在 `shared/editorial.css`：

| 令牌 | 值 | 用途 |
|---|---|---|
| `--paper` | `#EFF1F3` | 纸面底色 |
| `--paper-2` | `#DFE4E9` | 图槽/次级底色 |
| `--ink` | `#696773` | 主墨色 |
| `--muted` | `#8E8C98` | 次要文字 |
| `--line` | `rgba(105,103,115,.24)` | 细线 |
| `--accent` | `#77AAC2` | 品牌蓝（kicker、issue-row、强调） |
| `--accent-soft` | `#C6DAE6` | 蓝的浅色底 |
| `--c-blue/green/yellow/red` | `#77AAC2 / #79D9CE / #FCD765 / #F19A97` | 品牌辅助色 |

品牌四色分工：每册故事一个主色（聂小倩蓝、婚礼红、大集绿），用在 kicker、册目高亮、CTA hover、书脊印章、封面题名带；黄色 `#FCD765` 只做非文字点缀（小色块、hover 底色），纸色上不可做文字色。新增故事时在四色里挑一个未被近邻故事使用的。

备用主题（同在 editorial.css）：`ink-classic | indigo-porcelain | forest-ink | kraft-paper | dune | midnight-ink`（唯一暗色）。不要自造色板。

### 字体

- 中文标题/正文：`Noto Serif SC`（思源宋），标题 weight 500——** Editorial 的标题要轻，不用 900**
- 英文花体副题：`Playfair Display` italic
- 无衬线：`Noto Sans SC` / `Inter`
-  mono 标签：`IBM Plex Mono`，大写 + 宽字距（.20–.22em）

### 字阶（1080px 画板基准）

`.h-display` 124px / `.h-xl` 88px / `.h-md` 56px / `.h-sub` 36px italic / `.lead` 28px / `.body` 24px / `.kicker` 21px / `.meta`、`.label` 18px。具体卡片可按 recipe 微调，但保持层级。

### 画板

- `.poster.xhs` 1080×1440（3:4 小红书，本站主用）
- `.poster.square` 1080×1080（1:1 微信方封面）
- `.poster.wide` 2100×900（21:9 微信主封面）
- 内边距：xhs `96px 88px`；页脚 `.issue-strip` 用细线 + mono，钉在底部

### 背景三层（Editorial 身份的底线）

每个 poster 都是：`canvas.mag-bg`（WebGL 水墨，z0）→ `.grain`（纸纹颗粒 multiply，z1）→ `.paper-wash`（墨色渐变，z1）→ `.content`（z2）。**禁止平涂米色背景、禁止整页网格/圆点底纹**。**移动端（≤760px）不挂载 WebGL 背景**（每页一个上下文 × 2xDPR ≈ 50MB 显存，十几页会爆掉手机浏览器，已踩过 crash）——挂载脚本里有 matchMedia 守卫，页面在无水墨 canvas 时也必须成立（纸色 + 颗粒 + 渐变兜底）。

### 组件

`.frame-img` 图槽（比例类 `r-3x4 / r-1x1 / r-4x3 / r-16x9 / r-16x10 / r-21x9 / r-3x2`）+ `.img-cap` 图注；ledger 行、pullquote、`.rule` 细线、`.rule-accent` 短粗线、四角 `.corner-*` 等，全部定义在 `shared/editorial.css`。

## 硬性规则

- **3:4 卡必须吃满画布**：内容覆盖 ≥75% 高度；>15% 的纯空白带需要留白理由。禁止用上下 `flex:1` 把内容挤到中段。
- 文字不溢出、不贴边、不撞页脚；`.foot`/`.issue-strip` 用 `margin-top:auto` 钉底，不用 absolute 压内容。
- 标题与下一内容块之间 ≥28px（局部小标题 ≥16px）。
- 手机上不可读的小字不行；mono 标签最小 18px。
- 每张 `<img>` 必须按主体位置内联 `object-position`（如 `center 55%`），不接受默认居中碰运气。
- 古画素材不裁脸、不裁关键细节；图注用 `.img-cap` 注明出处（册次、馆藏）。
- 溢出修正在量级上匹配：1–40px 微调，40–90px 局部压缩，90–160px 压标题/段落，160px+ 才换 recipe 或删内容。
- 渲染后必须目检 PNG（`node render.cjs` 出图），确认与预期一致再交付。

## 文案气质

- 面向读者的文案讲场景本身，不出现「3:4」「poster」「recipe」这类制作术语。
- 叙事节奏慢、克制、有依据：册次、馆藏、编绘者写清楚，不编造史实与数据。
