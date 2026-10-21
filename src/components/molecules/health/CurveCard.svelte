<script lang="ts">
/**
 * 平滑曲线卡（分子）：心率（tertiary 趋势面积图）与压力（绿→黄→红
 * 绝对 0–100 无极渐变）两种模式共用一副骨架，scrubber 逻辑内聚于此。
 */
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type { Curve, ScrubState, SeriesPoint } from "@utils/health";
import { buildCurve, fmtHM, fmtInt, scrubFrom } from "@utils/health";
import { reveal } from "@utils/motion";

const VIEW_W = 600;
const VIEW_H = 110;

let {
	kind = "heartRate" as "heartRate" | "stress",
	points = [] as SeriesPoint[],
	/** 卡头摘要（min/avg/max 一行文字） */
	meta = "",
	/** 数值单位（bpm 或空） */
	unit = "",
	delay = 0,
}: {
	kind?: "heartRate" | "stress";
	points?: SeriesPoint[];
	meta?: string;
	unit?: string;
	delay?: number;
} = $props();

// 压力：绝对 0–100 值域 + 绿→黄→红渐变（userSpaceOnUse 对齐 viewBox 坐标，
// 低值在底=绿、高值在顶=红；健康数据通行语义色，内容色例外）
const STRESS_DOMAIN: [number, number] = [0, 100];
const STRESS_STOPS = [
	{ at: "0%", color: "#09f60d" },
	{ at: "45%", color: "#f6c70a" },
	{ at: "100%", color: "#fa0520" },
] as const;

const titleKey = $derived(
	kind === "heartRate" ? I18nKey.healthHeartRate : I18nKey.healthStress,
);

const curve: Curve | null = $derived(
	buildCurve(
		points,
		VIEW_W,
		VIEW_H,
		kind === "heartRate" ? 40 : 36,
		kind === "stress" ? STRESS_DOMAIN : undefined,
	),
);

let scrub = $state<ScrubState>(null);
</script>

{#if curve}
	<article class="curve-card curve-card--{kind}" use:reveal={{ delay }}>
		<header class="curve-card__head">
			<h2>{i18n(titleKey)}</h2>
			<span class="curve-card__meta">{meta}</span>
		</header>
		<div
			class="curve-card__body"
			onmousemove={(e) => (scrub = scrubFrom(e, curve.nodes, VIEW_H))}
			onmouseleave={() => (scrub = null)}
		>
			<svg
				class="curve-card__svg"
				viewBox="0 0 {VIEW_W} {VIEW_H}"
				preserveAspectRatio="none"
				role="img"
				aria-label={i18n(titleKey)}
			>
				{#if kind === "heartRate"}
					<path class="curve-card__area" d={curve.area} />
					<path class="curve-card__stroke" d={curve.d} />
				{:else}
					<defs>
						<linearGradient
							id="health-stress-gradient"
							gradientUnits="userSpaceOnUse"
							x1="0"
							y1={VIEW_H - 10}
							x2="0"
							y2="10"
						>
							{#each STRESS_STOPS as stop, i (i)}
								<stop offset={stop.at} stop-color={stop.color} />
							{/each}
						</linearGradient>
					</defs>
					<path
						class="curve-card__stroke"
						d={curve.d}
						stroke="url(#health-stress-gradient)"
					/>
				{/if}
			</svg>
			{#if scrub}
				<span class="curve-card__scrub-line" style="left:{scrub.xPct}%"></span>
				<span
					class="curve-card__scrub-dot"
					style="left:{scrub.xPct}%;top:{scrub.yPct}%"
				></span>
				<span class="curve-card__scrub-tip">
					{fmtHM(scrub.node.t)} · {fmtInt(scrub.node.v)}{unit ? ` ${unit}` : ""}
				</span>
			{/if}
		</div>
		{#if kind === "stress"}
			<!-- 色阶图例：与曲线同色标的连续渐变条 -->
			<div class="curve-card__scale" aria-hidden="true">
				<span class="curve-card__scale-bar"></span>
				<span class="curve-card__scale-labels">
					<span>0</span>
					<span>50</span>
					<span>100</span>
				</span>
			</div>
		{/if}
	</article>
{/if}

<style lang="stylus">
.curve-card
	display: flex
	flex-direction: column
	gap: var(--m3e-space-3)
	min-width: 0
	padding: var(--m3e-space-5)
	background: var(--card-bg)
	border: 1px solid var(--outline-variant)
	border-radius: var(--shape-corner-l)
	transition:
		border-color var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate),
		box-shadow var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

	&:hover
		border-color: var(--outline)
		box-shadow: var(--m3e-elevation-1)

	&__head
		display: flex
		align-items: baseline
		justify-content: space-between
		gap: var(--m3e-space-2)
		flex-wrap: wrap

		h2
			margin: 0
			color: var(--on-surface)
			font: var(--m3e-type-title-medium)
			font-weight: 600

	&__meta
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-small)
		font-variant-numeric: tabular-nums

	&__body
		position: relative

	&__svg
		width: 100%
		height: 7rem

	&__stroke
		fill: none
		stroke-width: 2.25
		stroke-linejoin: round
		stroke-linecap: round
		vector-effect: non-scaling-stroke
		// 注意：不在此声明 stroke——压力模式用内联渐变（url(#...)），
		// CSS 声明会覆盖 SVG 呈现属性导致渐变失效

	&--heartRate &__stroke
		stroke: var(--tertiary)

	&__area
		fill: var(--tertiary)
		opacity: 0.14

	// 压力模式：无面积图，加粗描边承载颜色信息
	&--stress &__stroke
		stroke-width: 3

	&__scrub-line
		position: absolute
		top: 0
		bottom: 0
		width: 1px
		background: var(--outline-variant)
		pointer-events: none
		animation: curve-card-scrub-in var(--m3e-duration-short) var(--m3e-easing-standard)

	&__scrub-dot
		position: absolute
		top: 50%
		width: 0.625rem
		height: 0.625rem
		border: 2px solid var(--card-bg)
		border-radius: var(--shape-corner-full)
		transform: translate(-50%, -50%)
		pointer-events: none
		box-shadow: 0 0 0 1.5px currentColor
		// top 由内联 style 按 viewBox y 坐标注入（贴在曲线上）

	&--heartRate &__scrub-dot
		color: var(--tertiary)
		background: var(--tertiary)

	&--stress &__scrub-dot
		color: var(--on-surface-variant)
		background: var(--surface-container-lowest)

	&__scrub-tip
		position: absolute
		top: 0
		left: 50%
		transform: translateX(-50%)
		padding: 0.25rem 0.5rem
		border-radius: var(--shape-corner-xs)
		background: var(--inverse-surface)
		color: var(--inverse-on-surface)
		font: var(--m3e-type-body-small)
		font-variant-numeric: tabular-nums
		white-space: nowrap
		pointer-events: none
		animation: curve-card-scrub-in var(--m3e-duration-short) var(--m3e-easing-standard)

	@keyframes curve-card-scrub-in
		from
			opacity: 0
		to
			opacity: 1

	// 色阶图例
	&__scale
		display: flex
		flex-direction: column
		gap: 0.25rem
		margin-top: calc(-1 * var(--m3e-space-2))

	&__scale-bar
		display: block
		height: 0.5rem
		border-radius: var(--shape-corner-full)
		overflow: hidden
		// 与曲线渐变同色标：绿 → 黄 → 红（内容色例外，见 STRESS_STOPS 注释）
		background: linear-gradient(to right, #09f60d, #f6c70a, #fa0520)

	&__scale-labels
		display: flex
		justify-content: space-between
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-small)
		font-variant-numeric: tabular-nums
</style>
