/**
 * 平滑曲线几何（纯函数）：降采样 + Catmull-Rom → 贝塞尔 + scrubber 命中。
 * 心率（趋势，窗口 min–max）与压力（绝对 0–100 渐变）共用。
 */

export interface SeriesPoint {
	t: number;
	v: number;
}

export interface CurveNode extends SeriesPoint {
	/** viewBox 坐标（供 scrubber 命中与指示点定位） */
	x: number;
	y: number;
}

export interface Curve {
	d: string;
	area: string;
	nodes: CurveNode[];
	min: number;
	max: number;
}

/** 等距抽样保留首尾，把点数压到 max 以内（体现走势而非逐点噪声） */
export function thinPoints(points: SeriesPoint[], max: number): SeriesPoint[] {
	if (points.length <= max) return points;
	const stride = Math.ceil(points.length / max);
	const out = points.filter((_, i) => i % stride === 0);
	const last = points[points.length - 1];
	if (out[out.length - 1] !== last) out.push(last);
	return out;
}

/** Catmull-Rom 控制点 → 三次贝塞尔平滑路径（张力 1 收敛自然） */
export function smoothPath(
	pts: { x: number; y: number }[],
	tension = 1,
): string {
	if (pts.length < 2) return "";
	let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[i - 1] ?? pts[i];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[i + 2] ?? p2;
		const c1x = p1.x + ((p2.x - p0.x) / 6) * tension;
		const c1y = p1.y + ((p2.y - p0.y) / 6) * tension;
		const c2x = p2.x - ((p3.x - p1.x) / 6) * tension;
		const c2y = p2.y - ((p3.y - p1.y) / 6) * tension;
		d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
	}
	return d;
}

/**
 * 构建平滑曲线。
 * @param domain y 轴值域；省略时按窗口内 min–max 自适应（趋势视图）
 */
export function buildCurve(
	points: SeriesPoint[],
	width: number,
	height: number,
	maxPoints = 48,
	domain?: [number, number],
): Curve | null {
	const thin = thinPoints(points, maxPoints);
	if (thin.length < 2) return null;
	const vs = thin.map((p) => p.v);
	const min = domain ? domain[0] : Math.min(...vs);
	const max = domain ? domain[1] : Math.max(...vs);
	const range = max - min || 1;
	const pad = 10;
	const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
	const xy = thin.map((p, i) => ({
		x: (i / (thin.length - 1)) * width,
		y: pad + clamp01(1 - (p.v - min) / range) * (height - 2 * pad),
	}));
	const d = smoothPath(xy);
	return {
		d,
		area: `${d} L${width},${height} L0,${height} Z`,
		nodes: thin.map((p, i) => ({ t: p.t, v: p.v, x: xy[i].x, y: xy[i].y })),
		min,
		max,
	};
}

export interface ScrubState {
	/** 命中点的横向位置（容器百分比） */
	xPct: number;
	/** 命中点的纵向位置（容器百分比，指示点贴曲线） */
	yPct: number;
	node: CurveNode;
}

/**
 * 从鼠标事件算出最近采样点（SVG viewBox 等距分布，按横向比例取最近索引）。
 * @param viewH 曲线 viewBox 高度（y → 百分比换算）
 */
export function scrubFrom(
	e: MouseEvent & { currentTarget: EventTarget & HTMLDivElement },
	nodes: CurveNode[],
	viewH: number,
): ScrubState | null {
	if (!nodes?.length) return null;
	const rect = e.currentTarget.getBoundingClientRect();
	const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
	const idx = Math.round(ratio * (nodes.length - 1));
	const hit = nodes[idx];
	return {
		xPct: (idx / (nodes.length - 1)) * 100,
		yPct: (hit.y / viewH) * 100,
		node: hit,
	};
}
