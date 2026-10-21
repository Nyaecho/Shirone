/**
 * 睡眠视图几何（纯函数）：分期合并、入睡/醒来泳道（动态窗口）、会话偏移。
 */

import type { HealthSleepNight, HealthSleepStage } from "@/types/healthConfig";
import { fmtHM, fmtMD, fmtMinutes } from "./format";

// ---------- 分期 ----------

/** 分期 → M3E 语义色角色（经 CSS 变量注入，同 ANIME_STATUS_META 模式） */
export const STAGE_COLOR: Record<string, string> = {
	deep: "var(--primary)",
	light: "var(--secondary)",
	rem: "var(--tertiary)",
	awake: "var(--outline-variant)",
};

const stageKeyOf = (state: number) =>
	({ 2: "deep", 3: "light", 4: "rem" })[state] ?? "awake";

/** 分期 state → i18n 键（组件侧翻译，保持本模块无 i18n 依赖） */
export const STAGE_I18N_KEY: Record<number, string> = {
	2: "healthDeepSleep",
	3: "healthLightSleep",
	4: "healthRemSleep",
	1: "healthAwake",
	5: "healthAwake",
};

export interface StageBar {
	key: string;
	left: number;
	width: number;
	color: string;
	labelKey: string;
	time: string;
}

/**
 * 分期段合并：把 <8 分钟的碎片段并入前段（一夜二十几段微段是常态，
 * 合并后时间轴才可读），并换算为时间轴百分比。
 */
export function buildStageBars(
	stages: HealthSleepStage[],
	labelOf: (key: string) => string,
): StageBar[] {
	if (!stages.length) return [];
	const MIN_MS = 8 * 60_000;
	const merged: HealthSleepStage[] = [];
	for (const s of stages) {
		const prev = merged[merged.length - 1];
		if (prev && s.end - s.start < MIN_MS) {
			prev.end = s.end;
		} else {
			merged.push({ ...s });
		}
	}
	const t0 = Math.min(...merged.map((s) => s.start));
	const t1 = Math.max(...merged.map((s) => s.end));
	const total = Math.max(1, t1 - t0);
	return merged.map((s) => {
		const key = stageKeyOf(s.state);
		return {
			key,
			left: ((s.start - t0) / total) * 100,
			width: ((s.end - s.start) / total) * 100,
			color: STAGE_COLOR[key],
			labelKey: labelOf(key),
			time: `${fmtHM(s.start)}–${fmtHM(s.end)}`,
		};
	});
}

// ---------- 入睡/醒来泳道 ----------

/** 时间基准：醒来日前一日正午（bed≈+11h、wake≈+19h 的常见作息） */
const NOON = 12;
const HOUR_MS = 3_600_000;

/** 某时刻相对「醒来日前一日正午」的小时偏移（夹紧到 [0, 36)） */
function hoursFromBaseNight(ms: number, wakeDayZero: number): number {
	const base = wakeDayZero - NOON * HOUR_MS;
	return Math.min(35.9, Math.max(0, (ms - base) / HOUR_MS));
}

export interface NightOffsets {
	bed: number;
	wake: number;
	bedMs: number;
	wakeMs: number;
}

/** 某晚全部会话的偏移区间（无 sessions 时回退主会话 bedtime/wake） */
export function nightOffsets(night: HealthSleepNight): NightOffsets[] {
	const wakeDayZero = new Date(night.wake);
	wakeDayZero.setHours(0, 0, 0, 0);
	const zero = wakeDayZero.getTime();
	const list = night.sessions?.length
		? night.sessions
		: [{ bedtime: night.bedtime, wake: night.wake }];
	return list
		.filter((s) => s.wake > s.bedtime)
		.map((s) => ({
			bed: hoursFromBaseNight(s.bedtime, zero),
			wake: hoursFromBaseNight(s.wake, zero),
			bedMs: s.bedtime,
			wakeMs: s.wake,
		}));
}

export interface LaneWindow {
	startH: number;
	endH: number;
	spanH: number;
}

/**
 * 泳道窗口：左缘 = 全部会话中最早入睡（贴合，不留白）；
 * 右缘 = 最晚醒来向上取整到整点；过窄（作息高度一致）时保证 ≥8h 可读跨度。
 */
export function buildLaneWindow(nights: HealthSleepNight[]): LaneWindow | null {
	const all = nights.filter((n) => n.bedtime && n.wake).flatMap(nightOffsets);
	if (!all.length) return null;
	const startH = Math.min(...all.map((o) => o.bed));
	let endH = Math.ceil(Math.max(...all.map((o) => o.wake)));
	if (endH - startH < 8) endH = startH + 8;
	return { startH, endH, spanH: endH - startH };
}

export interface SleepLane {
	date: string;
	segs: {
		left: number;
		width: number;
		bedLabel: string;
		wakeLabel: string;
		label: string;
	}[];
	/** 全天睡眠总量（夜睡 + 午睡合计） */
	total: string;
	bedLabel: string;
	wakeLabel: string;
	isLast: boolean;
}

/** 构建每晚泳道行（条带落在窗口内的百分比坐标 + 段自身时间标签） */
export function buildSleepLanes(
	nights: HealthSleepNight[],
	window: LaneWindow | null,
): SleepLane[] {
	if (!window) return [];
	const map = (h: number) => ((h - window.startH) / window.spanH) * 100;
	return nights
		.map((night) => {
			const segs = nightOffsets(night).map((o) => {
				const left = Math.min(100, Math.max(0, map(o.bed)));
				const right = Math.min(100, Math.max(0, map(o.wake)));
				return {
					left,
					width: Math.max(0, right - left),
					bedLabel: fmtHM(o.bedMs),
					wakeLabel: fmtHM(o.wakeMs),
					label: fmtMinutes(Math.round((o.wake - o.bed) * 60)),
				};
			});
			if (!segs.length) return null;
			return {
				date: fmtMD(night.bedtime),
				segs,
				total: fmtMinutes(
					night.sessions?.length
						? night.sessions.reduce(
								(acc, s) => acc + Math.max(0, (s.wake - s.bedtime) / 60_000),
								0,
							)
						: night.totalMin,
				),
				bedLabel: fmtHM(night.bedtime),
				wakeLabel: fmtHM(night.wake),
				isLast: false,
			};
		})
		.filter((x): x is SleepLane => x !== null)
		.map((lane, _i, arr) => ({
			...lane,
			// 列表按日期倒序渲染，最新一天置末位高亮由调用方标记
			isLast: lane === arr[arr.length - 1],
		}));
}

export interface LaneTick {
	pct: number;
	label: string;
}

/** 泳道刻度：从窗口内第一个整点起、按跨度选 1/2/3h 步长 */
export function buildLaneTicks(window: LaneWindow | null): LaneTick[] {
	if (!window) return [];
	const stepH = window.spanH > 14 ? 3 : window.spanH > 8 ? 2 : 1;
	const ticks: LaneTick[] = [];
	for (let h = Math.ceil(window.startH); h <= window.endH + 0.01; h += stepH) {
		ticks.push({
			pct: ((h - window.startH) / window.spanH) * 100,
			label: `${String((NOON + Math.floor(h)) % 24).padStart(2, "0")}:00`,
		});
	}
	return ticks;
}
