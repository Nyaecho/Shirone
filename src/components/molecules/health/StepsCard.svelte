<script lang="ts">
/**
 * 步数胶囊柱卡（分子）：动态整刻度网格 + 0 基线数据柱 + Tooltip。
 * 几何由 utils/health/steps 算好传入，本组件只负责呈现。
 */
import Tooltip from "@components/atoms/overlay/Tooltip.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type { StepsBar, StepsGridLine } from "@utils/health";
import { fmtInt } from "@utils/health";
import { reveal } from "@utils/motion";

let {
	grid = [] as StepsGridLine[],
	bars = [] as StepsBar[],
	today,
	delay = 0,
}: {
	grid?: StepsGridLine[];
	bars?: StepsBar[];
	today: number;
	delay?: number;
} = $props();
</script>

<article class="steps-card" use:reveal={{ delay }}>
	<header class="steps-card__head">
		<h2>{i18n(I18nKey.healthSteps)}</h2>
		<span class="steps-card__meta">{i18n(I18nKey.healthToday)} {fmtInt(today)}</span>
	</header>
	<div class="steps-card__chart">
		<!-- 辅助网格：整刻度横虚线 + 0 基线，柱底永远落在 0 基线上 -->
		<div class="steps-card__gridlines" aria-hidden="true">
			{#each grid as line (line.value)}
				<span class="steps-card__gridline" style="--line-top:{100 - line.pct}%"></span>
			{/each}
		</div>
		<div class="steps-card__gridlabels" aria-hidden="true">
			{#each [...grid].reverse() as line (line.value)}
				<span>{fmtInt(line.value)}</span>
			{/each}
		</div>
		<div class="steps-card__bars" role="img" aria-label={i18n(I18nKey.healthSteps)}>
			{#each bars as bar (bar.label)}
				<div class="steps-card__bar-col" class:is-today={bar.isToday}>
					<Tooltip label="{bar.label} · {fmtInt(bar.value)}" placement="top" class="steps-card__bar-tip">
						<span class="steps-card__bar" style="--bar-h:{bar.pct}%"></span>
					</Tooltip>
					<span class="steps-card__bar-label">{bar.label}</span>
				</div>
			{/each}
		</div>
	</div>
</article>

<style lang="stylus">
.steps-card
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

	&__chart
		position: relative
		display: grid
		grid-template-columns: auto 1fr
		gap: var(--m3e-space-2)

	&__gridlines
		position: absolute
		top: var(--m3e-space-2)
		right: 0
		bottom: 1.5rem
		left: 0
		pointer-events: none
		z-index: 0
		// 0 基线：柱底对齐处画实线（最下沿）
		border-bottom: 1px solid var(--outline-variant)

	&__gridline
		position: absolute
		left: 0
		right: 0
		top: var(--line-top)
		border-bottom: 1px dashed var(--outline-variant)
		opacity: 0.7

	&__gridlabels
		display: flex
		flex-direction: column
		justify-content: space-between
		align-items: flex-end
		height: 7.5rem
		padding-top: var(--m3e-space-2)
		padding-bottom: calc(1.5rem + 0.375rem)
		pointer-events: none

		span
			color: var(--on-surface-variant)
			font: var(--m3e-type-label-small)
			font-variant-numeric: tabular-nums
			opacity: 0.8
			line-height: 1
			transform: translateY(0.25rem)

	&__bars
		position: relative
		z-index: 1
		display: flex
		align-items: flex-end
		gap: var(--m3e-space-2)
		height: 7.5rem
		padding-top: var(--m3e-space-2)

	&__bar-col
		display: flex
		flex-direction: column
		align-items: center
		justify-content: flex-end
		gap: 0.375rem
		flex: 1
		min-width: 0
		height: 100%

	// Tooltip wrapper（inline-flex 不占列宽）：占据 label 之外的全部列高；
	// 柱子成为 wrapper 的直接 flex 子项，百分比高度参照确定高度，柱底贴 0 基线
	:global(.steps-card__bar-tip)
		display: flex
		flex: 1 1 auto
		width: 100%
		min-width: 2rem
		min-height: 0
		align-self: stretch
		align-items: flex-end
		justify-content: center

	&__bar
		display: block
		width: 2rem
		max-width: 2rem
		height: var(--bar-h, 4%)
		border-radius: var(--shape-corner-full)
		background: unquote("color-mix(in oklab, var(--secondary) 55%, var(--surface-container-high))")
		cursor: default
		transition:
			height var(--m3e-duration-long) var(--m3e-easing-emphasized-decelerate),
			transform var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate),
			background-color var(--m3e-duration-medium) var(--m3e-easing-standard),
			opacity var(--m3e-duration-medium) var(--m3e-easing-standard)

		&:hover
			transform: scaleY(1.04) translateY(-1px)
			opacity: 0.9

		.is-today &
			background: var(--primary)

	&__bar-label
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-small)
		font-variant-numeric: tabular-nums
		white-space: nowrap

		.is-today &
			color: var(--on-surface)
			font-weight: 600
</style>
