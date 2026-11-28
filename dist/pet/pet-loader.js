/**
 * pet-loader.js — Shirone 全站桌宠加载器
 * 注入方式：内容仓 config/footer.html 里的一行
 *   <script type="module" src="/pet/pet-loader.js"></script>
 *
 * 设计约束（详见 pet-lab/README.md）：
 * - 零主题仓改动：本文件与 deskpet.js / webm / 台词池同住内容仓 public/pet/；
 * - 幂等：ES 模块同 URL 每文档只执行一次，双份 footer 标签天然去重，守卫仅为保险；
 * - 移动端（<768px）不启动；后续视口放大到桌面尺寸时可补启动一次；
 * - Safari 等 VP9-alpha 不支持的环境：probeAlphaSupport 不通过则静默退出；
 * - 气泡颜色把 deskpet 的 --primary-color 映射到博客主题的 --primary；
 * - 宠物 DOM 挂 document.body，在 Swup 容器（main / #toc）之外，站内导航不重建。
 */

import { DeskPet, probeAlphaSupport } from "./deskpet.js";
import { ACT_QUOTES, ACT_DEFAULT, POKE_QUOTES, pickQuote } from "./pet-quotes.js";

/** 全站漫游的轻量动作集（/pet/ 玩耍页用全集，见 index.html）。 */
const SITE_ALLOW = [
	// 强制核心（idle/drag/squash 会被 DeskPet 自动补入，显式写出便于阅读）
	"idle", "drag", "squash",
	// 待机与起居
	"sleep", "wakeUp", "lookAround", "yawn", "stretch", "startled",
	// 碎碎念
	"muse", "museThink",
	// 漫游步法
	"run", "crabWalk", "floatStep",
	// 点击反应池
	"clickWave", "clickJoy", "clickAngry", "clickShy", "clickGiggle",
	// 表演子集
	"eatToken", "hotpot", "iceCream", "coding", "petCat", "whaleBubbles",
];

const BOOT_FLAG = "__shironePet";

async function bootPet() {
	if (window[BOOT_FLAG]) return;
	if (!(await probeAlphaSupport())) {
		console.info("[pet] browser lacks VP9 alpha support, desk pet disabled");
		return;
	}
	// 主题色适配：deskpet 气泡读 --primary-color，博客主题定义的是 --primary
	const themeStyle = document.createElement("style");
	themeStyle.textContent = "#pet-root{--primary-color:var(--primary,#4d6bfe)}";
	document.head.appendChild(themeStyle);

	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const pet = new DeskPet({
		allow: SITE_ALLOW,
		roam: !reducedMotion,
		posKey: "shirone-pet-pos",
		defaultFx: 0.15, // 左下角站定（首次访问/无位置记忆时）
		ariaLabel: "桌宠小鲸娘：点击互动，可以拖拽",
	});
	pet.onActBubble = (action) => pet.bubble(pickQuote(ACT_QUOTES[action] || ACT_DEFAULT));
	pet.onPokeBubble = () => pet.bubble(pickQuote(POKE_QUOTES));
	pet.start();
	window[BOOT_FLAG] = pet;
}

const desktopView = window.matchMedia("(min-width: 768px)");
if (desktopView.matches) {
	bootPet().catch((error) => console.warn("[pet] boot skipped:", error));
} else {
	// 移动端首载不启动；同页内视口放大到桌面尺寸时补启动一次
	const onGrow = (event) => {
		if (!event.matches) return;
		desktopView.removeEventListener("change", onGrow);
		bootPet().catch((error) => console.warn("[pet] boot skipped:", error));
	};
	desktopView.addEventListener("change", onGrow);
}
