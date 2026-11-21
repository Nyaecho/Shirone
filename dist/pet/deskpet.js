// deskpet.js — 桌宠共享核心（/games/pet 全量版 + 首页轻量版共用）
// 动作注册表收录开源项目 dsh-pet（作者 PC2005-cloud，https://github.com/PC2005-cloud/dsh-pet）
// 全部 100 个 VP9-alpha 透明 webm，非商用展示。实现参考其浏览器 overlay：
// 双 <video> 交叉淡化切动作、独立命中框接交互（渲染层 pointer-events:none）、
// 待机加权随机调度 + 漫游 rAF 插值 + 甩抛物理（重力/弹地/撞墙）。
// 渲染层样式由本模块一次性注入 <style>（dsh-pet 同款做法）；页面级样式（点播面板、署名等）在各页自己的 CSS。
// 用法：new DeskPet({ allow: ["idle",...], width: {min,max,ratio}, roam, posKey, defaultFx, ariaLabel })

// [shirone 集成补丁] 原始值 "/public/pet/webm/"；改为相对本模块定位，
// 使 deskpet.js 放在任意站点 /pet/ 目录下都能找到同目录的 webm/ 素材。
export const ASSET_BASE = new URL("./webm/", import.meta.url).pathname;

/* ---------------- 动作注册表（dsh-pet 全量 100 个） ---------------- */
// kind: idle=长待机（loop，靠定时器打断）/ act=一次性表演（weight 参与自动调度）/ click=点击反应池
//       move=漫游驱动 / drag=被拖拽 / squash=落地挤压
// cat:  eat 吃 / festival 节日 / perform 表演 / music 歌舞 / muse 碎碎念 / fx 特效
//       daily 日常 / balance 余额（dsh-pet 原味彩蛋）/ idle 待机系
// pick:true 进「动作点播」招牌 chips（pickKey 为 i18n games 节词条）
export const ACTIONS = {
  /* --- 待机系 --- */
  idle:       { file: "idle",       kind: "idle", cat: "idle", loop: true, weight: 14 },
  sleep:      { file: "sleep",      kind: "idle", cat: "idle", loop: true, weight: 3,   pick: true, pickKey: "petActSleep" },
  lookAround: { file: "look-around", kind: "act", cat: "daily", weight: 4 },
  yawn:       { file: "yawn",       kind: "act",  cat: "daily", weight: 3 },
  stretch:    { file: "stretch",    kind: "act",  cat: "daily", weight: 3,   pick: true, pickKey: "petActStretch" },
  wakeUp:     { file: "wake-up",    kind: "act",  cat: "daily", weight: 1 },
  startled:   { file: "startled",   kind: "act",  cat: "daily", weight: 0.6, pick: true, pickKey: "petActStartled" },
  /* --- 碎碎念（配气泡台词） --- */
  muse:       { file: "muse",       kind: "act",  cat: "muse", weight: 2.5, quote: true },
  museThink:  { file: "muse-think", kind: "act",  cat: "muse", weight: 2,   quote: true },
  museWipe:   { file: "muse-wipe",  kind: "act",  cat: "muse", weight: 1.5, quote: true },
  museScreen: { file: "muse-screen", kind: "act", cat: "muse", weight: 1.5, quote: true },
  /* --- 吃货系（20） --- */
  eatToken:   { file: "eat-token",     kind: "act", cat: "eat", weight: 1.5, pick: true, pickKey: "petActEatToken" },
  hotpot:     { file: "hotpot",        kind: "act", cat: "eat", weight: 1.2, pick: true, pickKey: "petActHotpot" },
  iceCream:   { file: "ice-cream",     kind: "act", cat: "eat", weight: 1.2, pick: true, pickKey: "petActIcecream" },
  snack:      { file: "snack",         kind: "act", cat: "eat", weight: 1.2, pick: true, pickKey: "petActSnack" },
  whatToEat:  { file: "what-to-eat",   kind: "act", cat: "eat", weight: 1 },
  eatBreakfast: { file: "eat-breakfast", kind: "act", cat: "eat", weight: 0.8 },
  eatLunch:   { file: "eat-lunch",     kind: "act", cat: "eat", weight: 0.8 },
  eatDinner:  { file: "eat-dinner",    kind: "act", cat: "eat", weight: 0.8 },
  eatRice:    { file: "eat-rice",      kind: "act", cat: "eat", weight: 0.7 },
  eatCrab:    { file: "eat-crab",      kind: "act", cat: "eat", weight: 0.7 },
  eatDumpling: { file: "eat-dumpling", kind: "act", cat: "eat", weight: 0.7 },
  eatLaba:    { file: "eat-laba",      kind: "act", cat: "eat", weight: 0.6 },
  eatRicecake: { file: "eat-ricecake", kind: "act", cat: "eat", weight: 0.6 },
  eatQingtuan: { file: "eat-qingtuan", kind: "act", cat: "eat", weight: 0.6 },
  eatTangyuan: { file: "eat-tangyuan", kind: "act", cat: "eat", weight: 0.6 },
  eatTanghulu: { file: "eat-tanghulu", kind: "act", cat: "eat", weight: 0.6 },
  eatWatermelon: { file: "eat-watermelon", kind: "act", cat: "eat", weight: 0.6 },
  eatNoodles: { file: "eat-noodles",   kind: "act", cat: "eat", weight: 0.6 },
  eatChongyangCake: { file: "eat-chongyang-cake", kind: "act", cat: "eat", weight: 0.5 },
  eatZongzi:  { file: "eat-zongzi",    kind: "act", cat: "eat", weight: 0.6 },
  /* --- 节日限定（14） --- */
  fireworks:     { file: "fireworks",     kind: "act", cat: "festival", weight: 0.5, pick: true, pickKey: "petActFireworks" },
  redEnvelope:   { file: "red-envelope",  kind: "act", cat: "festival", weight: 0.7, pick: true, pickKey: "petActRedEnvelope" },
  mooncake:      { file: "mooncake",      kind: "act", cat: "festival", weight: 0.6, pick: true, pickKey: "petActMooncake" },
  lionDance:     { file: "lion-dance",    kind: "act", cat: "festival", weight: 0.6 },
  writeFu:       { file: "write-fu",      kind: "act", cat: "festival", weight: 0.6 },
  buildSnowman:  { file: "build-snowman", kind: "act", cat: "festival", weight: 0.6 },
  christmasTree: { file: "christmas-tree", kind: "act", cat: "festival", weight: 0.5 },
  halloweenPumpkin: { file: "halloween-pumpkin", kind: "act", cat: "festival", weight: 0.5 },
  skyLantern:    { file: "sky-lantern",   kind: "act", cat: "festival", weight: 0.5 },
  riverLantern:  { file: "river-lantern", kind: "act", cat: "festival", weight: 0.5 },
  qixiNeedle:    { file: "qixi-needle",   kind: "act", cat: "festival", weight: 0.5 },
  chongyangFlower: { file: "chongyang-flower", kind: "act", cat: "festival", weight: 0.5 },
  summerFan:     { file: "summer-fan",    kind: "act", cat: "festival", weight: 0.5 },
  unwrapGift:    { file: "unwrap-gift",   kind: "act", cat: "festival", weight: 0.5 },
  /* --- 表演技能（14） --- */
  cardMagic:    { file: "card-magic",    kind: "act", cat: "perform", weight: 1 },
  magicDove:    { file: "magic-dove",    kind: "act", cat: "perform", weight: 0.9 },
  conjureFlowers: { file: "conjure-flowers", kind: "act", cat: "perform", weight: 0.9 },
  blowBalloon:  { file: "blow-balloon",  kind: "act", cat: "perform", weight: 0.9 },
  juggleBalls:  { file: "juggle-balls",  kind: "act", cat: "perform", weight: 1 },
  spinTop:      { file: "spin-top",      kind: "act", cat: "perform", weight: 0.9 },
  swing:        { file: "swing",         kind: "act", cat: "perform", weight: 0.9 },
  flyKite:      { file: "fly-kite",      kind: "act", cat: "perform", weight: 0.9 },
  shuttlecock:  { file: "shuttlecock",   kind: "act", cat: "perform", weight: 0.9 },
  waterGun:     { file: "water-gun",     kind: "act", cat: "perform", weight: 0.9 },
  gomoku:       { file: "gomoku",        kind: "act", cat: "perform", weight: 0.9 },
  rubikCube:    { file: "rubik-cube",    kind: "act", cat: "perform", weight: 0.9 },
  rockingHorse: { file: "rocking-horse", kind: "act", cat: "perform", weight: 0.8 },
  toyCar:       { file: "toy-car",       kind: "act", cat: "perform", weight: 0.8 },
  /* --- 歌舞（7） --- */
  maidDance:  { file: "maid-dance",  kind: "act", cat: "music", weight: 1.2, pick: true, pickKey: "petActMaidDance" },
  dance:      { file: "dance",       kind: "act", cat: "music", weight: 1.2, pick: true, pickKey: "petActDance" },
  humSong:    { file: "hum-song",    kind: "act", cat: "music", weight: 1.2, pick: true, pickKey: "petActHumSong" },
  swayDance:  { file: "sway-dance",  kind: "act", cat: "music", weight: 1 },
  maidCurtsy: { file: "maid-curtsy", kind: "act", cat: "music", weight: 0.9 },
  playFlute:  { file: "play-flute",  kind: "act", cat: "music", weight: 0.9 },
  violin:     { file: "violin",      kind: "act", cat: "music", weight: 0.9 },
  /* --- 特效（7，鲸鱼三连在此） --- */
  whaleAppear:  { file: "whale-appear",  kind: "act", cat: "fx", weight: 0.6, pick: true, pickKey: "petActWhaleAppear" },
  whaleBubbles: { file: "whale-bubbles", kind: "act", cat: "fx", weight: 1,   pick: true, pickKey: "petActWhaleBubbles" },
  whaleTail:    { file: "whale-tail",    kind: "act", cat: "fx", weight: 0.8, pick: true, pickKey: "petActWhaleTail" },
  littleGhost:  { file: "little-ghost",  kind: "act", cat: "fx", weight: 0.8, pick: true, pickKey: "petActLittleGhost" },
  animalHalo:   { file: "animal-halo",   kind: "act", cat: "fx", weight: 0.6 },
  butterflyHalo: { file: "butterfly-halo", kind: "act", cat: "fx", weight: 0.6 },
  leafPile:     { file: "leaf-pile",     kind: "act", cat: "fx", weight: 0.6 },
  /* --- 日常（16） --- */
  coding:       { file: "coding",       kind: "act", cat: "daily", weight: 2,   pick: true, pickKey: "petActCoding" },
  petCat:       { file: "pet-cat",      kind: "act", cat: "daily", weight: 1.5, pick: true, pickKey: "petActCat" },
  caughtSnacking: { file: "caught-snacking", kind: "act", cat: "daily", weight: 1.2, pick: true, pickKey: "petActCaughtSnacking" },
  rageQuit:     { file: "rage-quit",    kind: "act", cat: "daily", weight: 1,   pick: true, pickKey: "petActRageQuit" },
  mirror:       { file: "mirror",       kind: "act", cat: "daily", weight: 1 },
  deskTap:      { file: "desk-tap",     kind: "act", cat: "daily", weight: 1 },
  jotNotes:     { file: "jot-notes",    kind: "act", cat: "daily", weight: 1 },
  brushTeeth:   { file: "brush-teeth",  kind: "act", cat: "daily", weight: 0.8 },
  dressUp:      { file: "dress-up",     kind: "act", cat: "daily", weight: 0.8 },
  spinShow:     { file: "spin-show",    kind: "act", cat: "daily", weight: 0.8 },
  smashOverhead: { file: "smash-overhead", kind: "act", cat: "daily", weight: 0.8 },
  /* --- 余额彩蛋（dsh-pet 原味，无余额概念纯当小剧场） --- */
  balanceEmpty:    { file: "balance-empty",    kind: "act", cat: "balance", weight: 0.4 },
  balanceBroke:    { file: "balance-broke",    kind: "act", cat: "balance", weight: 0.4 },
  balanceJingle:   { file: "balance-jingle",   kind: "act", cat: "balance", weight: 0.4 },
  balanceOverflow: { file: "balance-overflow", kind: "act", cat: "balance", weight: 0.4 },
  balanceNormal:   { file: "balance-normal",   kind: "act", cat: "balance", weight: 0.4 },
  balanceCount:    { file: "balance-count",    kind: "act", cat: "balance", weight: 0.4 },
  /* --- 点击反应池 --- */
  clickWave:   { file: "click-wave",   kind: "click" },
  clickJoy:    { file: "click-joy",    kind: "click" },
  clickAngry:  { file: "click-angry",  kind: "click" },
  clickShy:    { file: "click-shy",    kind: "click" },
  clickGiggle: { file: "click-giggle", kind: "click" },
  /* --- 漫游 --- */
  run:       { file: "run",        kind: "move" },
  crabWalk:  { file: "crab-walk",  kind: "move", pick: true, pickKey: "petActCrab" },
  floatStep: { file: "float-step", kind: "move" },
  /* --- 特殊 --- */
  drag:   { file: "drag",   kind: "drag" },
  squash: { file: "squash", kind: "squash" },
};

const urlOf = (a) => ASSET_BASE + ACTIONS[a].file + ".webm";
export { urlOf };

/** 按 cat 列出动作 id（分类随机按钮用） */
export function byCat(cat, allowSet) {
  return Object.keys(ACTIONS).filter((k) => ACTIONS[k].cat === cat && (!allowSet || allowSet.has(k)));
}

/* ---------------- 渲染层样式（一次性注入，双页共用） ---------------- */

const CORE_CSS = `
#pet-root{position:fixed;left:0;top:0;z-index:1200;pointer-events:none;will-change:transform}
#pet-stage{position:relative;width:100%;height:100%;transition:transform .18s ease}
.pet-video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity .18s ease}
.pet-video.is-front{opacity:1}
#pet-root .pet-hit{position:absolute;left:22%;right:22%;top:14%;bottom:2%;pointer-events:auto;cursor:grab;touch-action:none}
#pet-root.dragging .pet-hit{cursor:grabbing}
@keyframes petQ{0%{transform:scale(1,1)}35%{transform:scale(1.14,.84)}70%{transform:scale(.92,1.1)}100%{transform:scale(1,1)}}
#pet-root.q #pet-stage{animation:petQ .45s ease}
.pet-bubble{position:absolute;bottom:100%;left:50%;transform:translate(-50%,-6px) scale(.9);transform-origin:bottom center;min-width:60px;max-width:220px;padding:8px 12px;border-radius:12px;background:var(--primary-color,#4d6bfe);color:#fff;border:1px solid rgba(255,255,255,.28);box-shadow:0 4px 14px rgba(30,50,180,.28);font-size:13px;font-weight:500;line-height:1.5;text-align:center;opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease;white-space:normal;word-break:break-word}
.pet-bubble.visible{opacity:1;transform:translate(-50%,-10px) scale(1)}
.pet-bubble::after{content:"";position:absolute;left:50%;bottom:-5px;width:10px;height:10px;transform:translateX(-50%) rotate(45deg);background:var(--primary-color,#4d6bfe);border-right:1px solid rgba(255,255,255,.28);border-bottom:1px solid rgba(255,255,255,.28)}
`;
let cssInjected = false;
function injectCss() {
  if (cssInjected || document.getElementById("pet-core-css")) return;
  const style = document.createElement("style");
  style.id = "pet-core-css";
  style.textContent = CORE_CSS;
  document.head.appendChild(style);
  cssInjected = true;
}

/* ---------------- 透明通道探测（Safari 降级闸门） ---------------- */
// 首帧画到 canvas 数透明像素占比：VP9-alpha 正常 ≥ 8%（角色居中、四周大量透明）；
// 解码失败（error/超时）或画面全不透明都判定不支持。
export function probeAlphaSupport() {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    const finish = (ok) => {
      clearTimeout(timer);
      v.removeAttribute("src");
      v.load();
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), 8000);
    v.addEventListener("error", () => finish(false), { once: true });
    v.addEventListener("loadeddata", () => {
      try {
        const c = document.createElement("canvas");
        c.width = 160;
        c.height = 90;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(v, 0, 0, 160, 90);
        const data = ctx.getImageData(0, 0, 160, 90).data;
        let transparent = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] < 200) transparent++;
        finish(transparent / (160 * 90) >= 0.08);
      } catch (_) {
        finish(false);
      }
    }, { once: true });
    v.src = urlOf("idle");
  });
}

/* ---------------- 桌宠本体 ---------------- */

export class DeskPet {
  /**
   * @param opts
   *   allow     允许的动作 id 集合（null=注册表全量）；首页传轻量子集
   *   width     {min, max, ratio} 舞台宽度约束（px / 视口宽比例）
   *   roam      是否参与漫游调度（首页 false=原地待机）
   *   posKey    localStorage 位置键
   *   defaultFx 初始 x 位置（0~1 视口宽比例，0.98≈右下角）
   *   ariaLabel 命中框无障碍标签
   */
  constructor(opts = {}) {
    this.opts = opts;
    this.allowSet = opts.allow ? new Set(opts.allow) : null;
    if (this.allowSet) {
      if (!this.allowSet.has("idle")) this.allowSet.add("idle");
      if (!this.allowSet.has("drag")) this.allowSet.add("drag");
      if (!this.allowSet.has("squash")) this.allowSet.add("squash");
    }
    this.clickPool = Object.keys(ACTIONS).filter((k) => ACTIONS[k].kind === "click" && this.allowed(k));
    this.movePool = Object.keys(ACTIONS).filter((k) => ACTIONS[k].kind === "move" && this.allowed(k));
    this.actIds = Object.keys(ACTIONS).filter((k) => ACTIONS[k].kind === "act" && this.allowed(k));

    this.raf = 0;
    this.gen = 0;            // 动画切换代数令牌，防旧回调掐断新动画
    this.state = "idle";     // idle | acting | moving | dragging | flying
    this.action = "idle";
    this.facing = 1;         // 1=朝右 -1=朝左
    this.idleTimer = 0;
    this.vx = 0;
    this.vy = 0;
    this.samples = [];       // 指针轨迹采样（算甩出初速）
    this._destroyed = false;

    this.measure();
    injectCss();
    this.buildDom();
    this.restorePos();
    this.render();
    this.bindPointer();
  }

  allowed(id) {
    return !this.allowSet || this.allowSet.has(id);
  }

  measure() {
    const w = this.opts.width || { min: 220, max: 380, ratio: 0.32 };
    this.w = Math.round(Math.min(w.max, Math.max(w.min, window.innerWidth * w.ratio)));
    this.h = Math.round((this.w * 9) / 16);
  }

  buildDom() {
    const root = document.createElement("div");
    root.id = "pet-root";
    root.innerHTML =
      '<div id="pet-stage">' +
      '<video class="pet-video" muted playsinline preload="auto"></video>' +
      '<video class="pet-video" muted playsinline preload="auto"></video>' +
      '<div class="pet-hit" role="button" aria-label="' + String(this.opts.ariaLabel || "pet") + '"></div>' +
      "</div>" +
      '<div class="pet-bubble"></div>';
    document.body.appendChild(root);
    this.root = root;
    this.stage = root.querySelector("#pet-stage");
    this.hit = root.querySelector(".pet-hit");
    this.bubbleEl = root.querySelector(".pet-bubble");
    this.videos = [...root.querySelectorAll(".pet-video")];
    this.front = 0;
    this.videos.forEach((v) => {
      v.muted = true; // iOS 上 muted 属性单独设置有时不生效，双保险
      v.addEventListener("ended", () => { if (v === this.videos[this.front]) this.onEnded(); });
    });
    this.videos[0].classList.add("is-front");
  }

  /* ----- 位置：x/y 为舞台左上角；贴地时 y = floorY，拖拽/飞行自由 ----- */

  get floorY() {
    return window.innerHeight - this.h - 4;
  }

  clampX(x) {
    // 角色居中占画面约 60%：让身体（20%~80% 区间）始终留在视口内
    return Math.max(-this.w * 0.2, Math.min(x, window.innerWidth - this.w * 0.8));
  }

  savePos() {
    try {
      localStorage.setItem(this.opts.posKey || "gj-pet-pos", JSON.stringify({
        fx: (this.x + this.w / 2) / window.innerWidth,
        facing: this.facing,
      }));
    } catch (_) {}
  }

  restorePos() {
    let fx = this.opts.defaultFx ?? 0.5;
    try {
      const saved = JSON.parse(localStorage.getItem(this.opts.posKey || "gj-pet-pos") || "null");
      if (saved && typeof saved.fx === "number") {
        fx = saved.fx;
        this.facing = saved.facing === -1 ? -1 : 1;
      }
    } catch (_) {}
    this.x = this.clampX(fx * window.innerWidth - this.w / 2);
    this.y = this.floorY;
  }

  render() {
    this.root.style.width = this.w + "px";
    this.root.style.height = this.h + "px";
    this.root.style.transform = "translate(" + Math.round(this.x) + "px," + Math.round(this.y) + "px)";
    this.stage.style.transform = "scaleX(" + this.facing + ")";
  }

  /* ----- 动画切换：后台 video 就绪后交叉淡入上台（dsh-pet 双缓冲思路） ----- */
  // 返回即将上台的 video 元素，供漫游驱动读进度。
  play(action, playOpts = {}) {
    if (!this.allowed(action)) return null;
    const a = ACTIONS[action];
    if (!a) return null;
    this.gen++;
    const myGen = this.gen;
    this.action = action;
    if (playOpts.facing) this.facing = playOpts.facing;

    const next = this.front === 0 ? 1 : 0;
    const nv = this.videos[next];
    const ov = this.videos[this.front];
    const url = urlOf(action);
    nv.loop = !!a.loop || !!playOpts.loop;
    let swapped = false;
    const swap = () => {
      if (myGen !== this.gen || swapped) return;
      swapped = true;
      nv.onloadeddata = null;
      nv.classList.add("is-front");
      ov.classList.remove("is-front");
      ov.pause();
      this.front = next;
      nv.play().catch(() => {});
    };
    if (nv.src !== new URL(url, location.href).href) {
      nv.onloadeddata = swap;
      nv.src = url;
      nv.load();
      setTimeout(swap, 3500); // 弱网兜底：还没就绪也硬切，宁可黑一瞬不卡死
    } else {
      nv.currentTime = 0;
      swap();
    }
    this.render();
    return nv;
  }

  setState(s) {
    this.state = s;
    clearTimeout(this.idleTimer);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  scheduleIdle(maxSec) {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.decide(), (6 + Math.random() * (maxSec || 8)) * 1000);
  }

  /* ----- 调度：待机 → 表演 / 漫游 / 继续待机的加权随机 ----- */

  decide() {
    if (this.state !== "idle" && this.state !== "acting") return;
    const roll = Math.random();
    const idleIds = ["idle", ...(this.allowed("sleep") ? ["sleep"] : [])];
    if (roll < 0.52) {
      this.setState("idle");
      this.play(pickWeighted(idleIds, idleIds.map((k) => ACTIONS[k].weight)));
      this.scheduleIdle(this.action === "sleep" ? 18 : 8); // 打盹睡更久
      if (this.action === "sleep" && Math.random() < 0.4) this.bubble("Zzz…");
    } else if (roll < 0.85 || !this.opts.roam) {
      this.setState("acting");
      this.play(pickWeighted(this.actIds, this.actIds.map((k) => ACTIONS[k].weight)));
      if (ACTIONS[this.action].quote || Math.random() < 0.3) this.onActBubble(this.action);
    } else {
      this.startMove();
    }
  }

  /** 表演时的气泡文案钩子：默认无，页面可覆写（桌宠页=摸鱼语录，首页=轮播文案） */
  onActBubble() {}

  onEnded() {
    const kind = ACTIONS[this.action]?.kind;
    if (this.state === "moving" || this.state === "dragging" || this.state === "flying") return;
    if (kind === "act" || kind === "click" || kind === "squash") {
      this.setState("idle");
      this.play("idle");
      this.scheduleIdle(8);
    }
  }

  /* ----- 漫游：rAF 读 video.currentTime，在起跑/收步垫之间线性插值 x ----- */

  startMove(forced) {
    if (!this.movePool.length) return;
    const moveId = forced || this.movePool[Math.floor(Math.random() * this.movePool.length)];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const dist = Math.min(window.innerWidth - this.w, this.w * (1.2 + Math.random() * 1.6));
    const x0 = this.clampX(this.x);
    const x1 = this.clampX(x0 + dir * dist);
    this.setState("moving");
    const target = this.play(moveId, { facing: x1 >= x0 ? 1 : -1, loop: true });
    this.driveMove(x0, x1, target);
  }

  driveMove(x0, x1, video) {
    const LEAD = 0.5, TAIL = 0.6; // 起跑垫/收步垫（秒）：动画头尾不是位移画面
    const step = () => {
      if (this.state !== "moving") return;
      const dur = video && isFinite(video.duration) && video.duration > LEAD + TAIL + 0.5 ? video.duration : 6;
      const cur = video ? video.currentTime : dur - TAIL;
      const p = Math.max(0, Math.min(1, (cur - LEAD) / (dur - LEAD - TAIL)));
      this.x = x0 + (x1 - x0) * p;
      this.render();
      if (p >= 1) {
        this.setState("idle");
        this.play("idle");
        this.scheduleIdle(8);
        this.savePos();
        return;
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  /* ----- 点击：Q 弹 + 反应动画；打盹中被点 = 惊醒 ----- */

  poke() {
    this.root.classList.remove("q");
    void this.root.offsetWidth; // 重启 keyframe 动画
    this.root.classList.add("q");
    this.setState("acting");
    if (this.action === "sleep" || this.action === "wakeUp") {
      this.play(this.allowed("wakeUp") ? "wakeUp" : this.clickPool[0]);
    } else {
      this.play(this.clickPool[Math.floor(Math.random() * this.clickPool.length)] || "idle");
    }
    if (Math.random() < 0.4) this.onPokeBubble();
  }

  /** 点击时的气泡钩子（页面覆写） */
  onPokeBubble() {}

  /* ----- 拖拽 + 甩抛物理 ----- */

  bindPointer() {
    let downAt = 0, downX = 0, downY = 0, dragging = false, pid = null;
    this.hit.addEventListener("pointerdown", (e) => {
      if (this.state === "flying") return;
      pid = e.pointerId;
      try { this.hit.setPointerCapture(pid); } catch (_) {}
      downAt = performance.now();
      downX = e.clientX;
      downY = e.clientY;
      dragging = false;
      this.samples = [{ t: downAt, x: e.clientX, y: e.clientY }];
    });
    this.hit.addEventListener("pointermove", (e) => {
      if (pid === null || e.pointerId !== pid) return;
      const now = performance.now();
      this.samples.push({ t: now, x: e.clientX, y: e.clientY });
      while (this.samples.length > 2 && now - this.samples[0].t > 110) this.samples.shift();
      if (!dragging) {
        if (Math.hypot(e.clientX - downX, e.clientY - downY) <= 10) return;
        dragging = true;
        this.setState("dragging");
        this.root.classList.add("dragging");
        this.play("drag", { loop: true });
      }
      this.x = e.clientX - this.w / 2;          // 宠物中心跟指针
      this.y = e.clientY - this.h * 0.62;       // 抓点略偏下，像拎着
      this.render();
    });
    const release = (e) => {
      if (pid === null || e.pointerId !== pid) return;
      pid = null;
      const quickTap = !dragging && performance.now() - downAt < 400;
      const wasDragging = dragging;
      dragging = false;
      this.root.classList.remove("dragging");
      if (quickTap) {
        this.poke();
        return;
      }
      if (!wasDragging) return;
      // 近 110ms 轨迹估初速，够快才进入飞行
      const s0 = this.samples[0];
      const dt = Math.max(16, performance.now() - s0.t) / 1000;
      const vx = (e.clientX - s0.x) / dt;
      const vy = (e.clientY - s0.y) / dt;
      if (Math.hypot(vx, vy) > 700) this.throw(vx, vy);
      else this.settle();
    };
    this.hit.addEventListener("pointerup", release);
    this.hit.addEventListener("pointercancel", () => {
      if (pid === null) return;
      pid = null;
      dragging = false;
      this.root.classList.remove("dragging");
      this.settle();
    });
  }

  throw(vx, vy) {
    this.setState("flying");
    this.vx = vx;
    this.vy = vy;
    this.play("drag", { loop: true });
    let last = performance.now();
    const G = 2800, FLOOR_BOUNCE = 0.42, WALL_BOUNCE = 0.55, FLOOR_FRICTION = 0.72;
    const step = (now) => {
      if (this.state !== "flying" || this._destroyed) return;
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      this.vy += G * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.y >= this.floorY) {
        this.y = this.floorY;
        if (Math.abs(this.vy) > 260) {
          this.vy = -this.vy * FLOOR_BOUNCE;
          this.vx *= FLOOR_FRICTION;
        } else {
          this.settle();
          return;
        }
      }
      if (this.y < -this.h * 0.4) { this.y = -this.h * 0.4; this.vy = Math.abs(this.vy) * WALL_BOUNCE; }
      const minX = -this.w * 0.2, maxX = window.innerWidth - this.w * 0.8;
      if (this.x < minX) { this.x = minX; this.vx = Math.abs(this.vx) * WALL_BOUNCE; }
      if (this.x > maxX) { this.x = maxX; this.vx = -Math.abs(this.vx) * WALL_BOUNCE; }
      if (Math.abs(this.vx) > 30) this.facing = this.vx > 0 ? 1 : -1;
      this.render();
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  settle() {
    this.setState("acting");
    this.x = this.clampX(this.x);
    this.y = this.floorY;
    this.render();
    this.savePos();
    this.play("squash");
    if (Math.random() < 0.5) this.onPokeBubble();
  }

  /* ----- 气泡 ----- */

  bubble(text) {
    if (!text || this._destroyed) return;
    this.bubbleEl.textContent = text;
    this.bubbleEl.classList.add("visible");
    this.root.classList.add("speaking"); // 页面可据此让工具条等元素避让气泡
    clearTimeout(this._bubbleTimer);
    this._bubbleTimer = setTimeout(() => {
      this.bubbleEl.classList.remove("visible");
      this.root.classList.remove("speaking");
    }, 7200); // 展示时长：短句之外还要装得下两三行文案，给足读完的时间
  }

  /* ----- 生命周期 ----- */

  start() {
    this.setState("idle");
    this.play("idle");
    this.scheduleIdle(8);
    this._onVis = () => { // 切走暂停解码，回来续播
      if (this._destroyed) return;
      const v = this.videos[this.front];
      if (document.hidden) v.pause();
      else v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", this._onVis);
    this._onResize = () => {
      if (this._destroyed) return;
      this.measure();
      if (this.state !== "dragging" && this.state !== "flying") this.y = this.floorY;
      this.x = this.clampX(this.x);
      this.render();
    };
    window.addEventListener("resize", this._onResize);
  }

  destroy() {
    this._destroyed = true;
    this.setState("idle"); // 清定时器与 rAF
    clearTimeout(this._bubbleTimer);
    document.removeEventListener("visibilitychange", this._onVis);
    window.removeEventListener("resize", this._onResize);
    this.videos.forEach((v) => { v.pause(); v.removeAttribute("src"); v.load(); });
    this.root.remove();
  }
}

function pickWeighted(ids, weights) {
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ids.length; i++) {
    r -= weights[i];
    if (r <= 0) return ids[i];
  }
  return ids[ids.length - 1];
}
