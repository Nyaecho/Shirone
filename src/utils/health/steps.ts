/**
 * 步数图几何（纯函数）：动态整刻度网格 + 0 基线比例尺。
 */

import type { HealthStepDay } from "@/types/healthConfig";

export interface StepsGridLine {
	/** 刻度值（整千/两千/五千的倍数） */
	value: number;
	/** 相对图高的底部偏移百分比 */
	pct: number;
}

export interface StepsBar {
	label: string;
	value: number;
	/** 柱高（占图高百分比，柱底落在 0 基线） */
	pct: number;
	isToday: boolean;
}

/** 上限取整到易读刻度：>2万→5千，>8千→2千，其余→1千 */
function niceMax(raw: number): number {
	const unit = raw > 20000 ? 5000 : raw > 8000 ? 2000 : 1000;
	return Math.max(unit, Math.ceil(raw / unit) * unit);
}

/**
 * 构建步数图刻度与数据柱（共用同一比例尺：value / niceMax）。
 * 网格线画在整刻度值上，柱高按同比例换算，柱底永远贴 0 基线。
 */
export function buildStepsChart(daily: HealthStepDay[]): {
	grid: StepsGridLine[];
	bars: StepsBar[];
} {
	if (!daily.length) return { grid: [], bars: [] };
	const max = niceMax(Math.max(1, ...daily.map((d) => d.value)));
	const unit = max > 20000 ? 5000 : max > 8000 ? 2000 : 1000;
	const grid: StepsGridLine[] = [];
	for (let v = unit; v <= max + 1; v += unit) {
		grid.push({ value: v, pct: (v / max) * 100 });
	}
	const bars: StepsBar[] = daily.map((d, i) => ({
		label: `${Number(d.date.slice(5, 7))}/${Number(d.date.slice(8, 10))}`,
		value: d.value,
		pct: Math.max(0, (d.value / max) * 100),
		isToday: i === daily.length - 1,
	}));
	return { grid, bars };
}
