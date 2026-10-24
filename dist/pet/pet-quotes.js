/**
 * pet-quotes.js — 桌宠气泡台词池（全站加载器与 /pet/ 玩耍页共用）
 * 原站台词是其 i18n 词条；这里换成博客口吻重写，不搬运原文案。
 */

/** 特定动作的专属台词（按动作 id 取；没有专属词的动作用 ACT_DEFAULT）。 */
export const ACT_QUOTES = {
	muse: ["今天写点什么好呢…", "让我想想下一篇的选题…", "灵感这东西，摸着摸着就来了"],
	museThink: ["嗯…这段代码昨天还能跑来着？", "在想了在想了，别催", "思路卡住了，先吃点东西"],
	coding: ["while (true) { 摸鱼(); }", "别催，在编译了", "这行谁写的……哦，是我"],
	petCat: ["猫猫真是太可爱了", "咕噜咕噜咕噜…"],
	eatToken: ["吃掉你的 token～", "算力就是力量！"],
	hotpot: ["毛肚七上八下，涮它！", "微辣，谢谢"],
	iceCream: ["天热和冰激凌更配哦"],
	snack: ["就吃一口，不会被发现的"],
	whaleBubbles: ["blub blub…"],
	whaleAppear: ["我回来啦！"],
	dance: ["跟着节奏摇起来～"],
	fireworks: ["祝你天天开心呀"],
	redEnvelope: ["恭喜发财，红包拿来"],
	buildSnowman: ["堆个雪人陪你写文"],
	cardMagic: ["见证奇迹的时刻！"],
	juggleBalls: ["接住！接住！"],
	startled: ["哇！吓我一跳"],
	sleep: ["Zzz…"],
};

/** 无专属台词的表演动作从这里抽。 */
export const ACT_DEFAULT = [
	"在博客里溜达～",
	"今天也在努力营业呢",
	"要常来看我哦",
	"这篇文章写得真不错（小声）",
	"溜了溜了～",
];

/** 点击 / 落地时的反应台词。 */
export const POKE_QUOTES = [
	"干嘛戳我！",
	"再戳要生气了哦",
	"嘿嘿，好痒",
	"摸鱼被抓到了！",
	"有什么事嘛？",
];

export function pickQuote(pool) {
	return pool[Math.floor(Math.random() * pool.length)];
}
