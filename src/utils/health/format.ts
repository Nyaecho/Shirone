/**
 * 健康数据页格式化工具（纯函数，无 Svelte / i18n 依赖）。
 */

/** 千分位整数；空值显示占位符 */
export const fmtInt = (n: number | null | undefined): string =>
	n == null ? "—" : new Intl.NumberFormat().format(Math.round(n));

/** 时:分（跟随浏览器 locale） */
export const fmtHM = (ms: number): string =>
	new Intl.DateTimeFormat(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(ms));

/** 月/日（跟随浏览器 locale） */
export const fmtMD = (ms: number): string =>
	new Intl.DateTimeFormat(undefined, {
		month: "numeric",
		day: "numeric",
	}).format(new Date(ms));

/** 分钟数 → "5h24" 形式时长；空值显示占位符 */
export const fmtMinutes = (min: number | null | undefined): string =>
	min == null
		? "—"
		: `${Math.floor(min / 60)}h${String(Math.round(min % 60)).padStart(2, "0")}`;

/** 分钟数 → "5h24m" 形式时长（速览 tile 用，带分单位） */
export const fmtMinutesLong = (min: number | null | undefined): string =>
	min == null ? "—" : `${fmtMinutes(min)}m`;
