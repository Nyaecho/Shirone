/**
 * 健康数据页配置类型定义。
 * 遵循 Shirone 配置契约：配置放在 src/config/healthConfig.ts，类型放在本文件；
 * 页面总开关关闭时 /health/ 重定向 404 且导航隐藏。
 *
 * 本页为「静态模板 + 运行时取数」模式：构建期不接触健康数据，页面在浏览器
 * hydrate 后请求 apiBase（由写作工具 shirone-admin 提供的公开只读接口）。
 */

import type { PageMeta } from "./pageMeta.ts";

/** 快照契约中的单日步数 */
export interface HealthStepDay {
	date: string;
	value: number;
}

/** 快照契约中的序列点（心率/压力共用；t 毫秒，v 数值） */
export interface HealthSeriesPoint {
	t: number;
	v: number;
}

/** 24h 序列统计 */
export interface HealthSeriesSummary {
	windowHours: number;
	last: number | null;
	min: number | null;
	max: number | null;
	avg: number | null;
	points: HealthSeriesPoint[];
}

/** 单晚睡眠摘要（时长字段单位为分钟；sessions 含夜睡与午睡全部会话） */
export interface HealthSleepNight {
	date: string;
	bedtime: number;
	wake: number;
	totalMin: number;
	deep: number | null;
	light: number | null;
	rem: number | null;
	awake: number | null;
	/** 当天全部睡眠会话（泳道图逐段渲染；首尾为主会话） */
	sessions?: { bedtime: number; wake: number }[];
}

/** 最近一夜分期段（state 2=深睡 3=浅睡 4=REM 1/5=清醒；t 毫秒） */
export interface HealthSleepStage {
	start: number;
	end: number;
	state: number;
}

/** 快照契约（与 shirone-admin routes/health.js 输出一一对应） */
export interface HealthSnapshot {
	ok: boolean;
	generatedAt: number;
	timezone: string;
	days: number;
	dataThrough: number | null;
	steps: {
		today: number;
		yesterday: number | null;
		deltaPct: number | null;
		daily: HealthStepDay[];
	};
	heartRate: HealthSeriesSummary;
	stress: HealthSeriesSummary;
	sleep: {
		nights: HealthSleepNight[];
		stages: HealthSleepStage[];
	};
}

/** 健康页全局配置（行为层） */
export interface HealthConfig extends PageMeta {
	/** 页面总开关；关闭后隐藏导航入口并将 /health/ 重定向到 404（零负担规则） */
	enable: boolean;
	/** 运行时数据接口地址（生产经 nginx 同域反代，如 /health-data） */
	apiBase: string;
	/** 各卡片开关（关闭的卡片零渲染开销） */
	cards: {
		steps: boolean;
		heartRate: boolean;
		stress: boolean;
		sleep: boolean;
	};
	/** 请求超时毫秒；超时或失败显示离线提示（数据不落 SSR） */
	fetchTimeoutMs: number;
}
