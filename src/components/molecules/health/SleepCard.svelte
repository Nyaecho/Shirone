<script lang="ts">
/**
 * 睡眠卡（分子）：最新一夜分期时间轴 + 近 N 天入睡/醒来泳道。
 * 几何由 utils/health/sleep 算好传入；分期语义色经 CSS 变量注入。
 */
import Tooltip from "@components/atoms/overlay/Tooltip.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type { LaneTick, SleepLane, StageBar } from "@utils/health";
import { fmtHM, fmtMD, fmtMinutes, STAGE_COLOR } from "@utils/health";
import { reveal } from "@utils/motion";
import type { HealthSleepNight } from "@/types/healthConfig";

let {
	night = null as HealthSleepNight | null,
	stageBars = [] as StageBar[],
	lanes = [] as SleepLane[],
	laneTicks = [] as LaneTick[],
	delay = 0,
}: {
	night?: HealthSleepNight | null;
	stageBars?: StageBar[];
	lanes?: SleepLane[];
	laneTicks?: LaneTick[];
	delay?: number;
} = $props();

/** 分期 i18n 键翻译表（STAGE_I18N_KEY 的值 → 词条） */
const stageText: Record<string, string> = {
	deep: i18n(I18nKey.healthDeepSleep),
	light: i18n(I18nKey.healthLightSleep),
	rem: i18n(I18nKey.healthRemSleep),
	awake: i18n(I18nKey.healthAwake),
};
</script>

{#if night && night.totalMin > 0}
	<article class="sleep-card" use:reveal={{ delay }}>
		<header class="sleep-card__head">
			<h2>{i18n(I18nKey.healthSleep)}</h2>
			<span class="sleep-card__meta">
				{fmtMD(night.bedtime)} {fmtHM(night.bedtime)} → {fmtHM(night.wake)} · {fmtMinutes(night.totalMin)}
			</span>
		</header>

		{#if stageBars.length}
			<div class="sleep-card__stagebar" role="img" aria-label={i18n(I18nKey.healthSleep)}>
				{#each stageBars as seg (seg.time)}
					<span
						class="sleep-card__stage"
						style="left:{seg.left}%;width:{seg.width}%;--stage-color:{seg.color}"
						title="{stageText[seg.key]} {seg.time}"
					></span>
				{/each}
			</div>
			<div class="sleep-card__legend">
				<span class="sleep-card__legend-item"><i style="--stage-color:{STAGE_COLOR.deep}"></i>{i18n(I18nKey.healthDeepSleep)} {fmtMinutes(night.deep)}</span>
				<span class="sleep-card__legend-item"><i style="--stage-color:{STAGE_COLOR.light}"></i>{i18n(I18nKey.healthLightSleep)} {fmtMinutes(night.light)}</span>
				<span class="sleep-card__legend-item"><i style="--stage-color:{STAGE_COLOR.rem}"></i>{i18n(I18nKey.healthRemSleep)} {fmtMinutes(night.rem)}</span>
			</div>
		{/if}

		{#if lanes.length > 1}
			<!-- 近 N 天入睡/醒来时间泳道：每晚一根条（含午睡段），背景整点刻度线 -->
			<div class="sleep-card__lanes">
				<div class="sleep-card__lanes-head" aria-hidden="true">
					<span class="sleep-card__lanes-title">{i18n(I18nKey.healthBedWake)}</span>
					<span class="sleep-card__lanes-ticks">
						{#each laneTicks as tick, ti (ti)}
							<span style="left:{tick.pct}%">{tick.label}</span>
						{/each}
					</span>
					<span class="sleep-card__lanes-corner"></span>
				</div>
				<ul class="sleep-card__lanes-body">
					{#each lanes as lane (lane.bedLabel + lane.wakeLabel)}
						<li class="sleep-card__lane" class:is-last={lane.isLast}>
							<span class="sleep-card__lane-date">{lane.date}</span>
							<span class="sleep-card__lane-track">
								{#each laneTicks as tick, ti (ti)}
									<span class="sleep-card__lane-grid" style="left:{tick.pct}%" aria-hidden="true"></span>
								{/each}
								{#each lane.segs as seg, si (si)}
									<span
										class="sleep-card__lane-seg"
										style="left:{seg.left}%;width:{seg.width}%"
									>
										<Tooltip label="{lane.date} · {seg.bedLabel} → {seg.wakeLabel} · {seg.label}" placement="top" class="sleep-card__lane-tip">
											<span class="sleep-card__lane-bar"></span>
										</Tooltip>
									</span>
								{/each}
							</span>
							<span class="sleep-card__lane-total">{lane.total}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</article>
{/if}

<style lang="stylus">
.sleep-card
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

	// ---------- 分期时间轴 ----------
	&__stagebar
		position: relative
		display: flex
		height: 2rem
		border-radius: var(--shape-corner-m)
		background: var(--surface-container-high)

	// 分期间留 1.5px 表面色缝隙：相邻色块界限清晰
	&__stage
		position: absolute
		top: 0
		bottom: 0
		background: var(--stage-color, var(--on-surface-variant))
		border-radius: var(--shape-corner-xs)
		box-shadow: 0 0 0 1.5px var(--card-bg)
		cursor: default
		transition: opacity var(--m3e-duration-medium) var(--m3e-easing-standard)

		&:hover
			opacity: 0.8
			transform: scaleY(1.08)

	&__legend
		display: flex
		flex-wrap: wrap
		gap: var(--m3e-space-2) var(--m3e-space-4)

	&__legend-item
		display: inline-flex
		align-items: center
		gap: 0.375rem
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-medium)
		font-variant-numeric: tabular-nums

		i
			width: 0.5rem
			height: 0.5rem
			border-radius: var(--shape-corner-full)
			background: var(--stage-color, var(--on-surface-variant))

	// ---------- 入睡/醒来时间泳道 ----------
	&__lanes
		display: flex
		flex-direction: column
		gap: var(--m3e-space-1)

	// 刻度头与泳道行同款三列网格，保证时刻刻度精确对齐每晚轨道
	&__lanes-head
		display: grid
		grid-template-columns: 3rem 1fr 3.25rem
		align-items: end
		gap: var(--m3e-space-2)
		padding-bottom: 0.25rem

	&__lanes-title
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-small)
		line-height: 1.1

	&__lanes-ticks
		position: relative
		display: block
		height: 1rem

		span
			position: absolute
			top: 0
			transform: translateX(-50%)
			color: var(--on-surface-variant)
			font: var(--m3e-type-label-small)
			font-variant-numeric: tabular-nums
			opacity: 0.75
			white-space: nowrap

			&:first-child
				transform: none

			&:last-child
				transform: translateX(-100%)

	&__lanes-corner
		display: block

	&__lanes-body
		display: flex
		flex-direction: column
		gap: 0.375rem
		margin: 0
		padding: 0
		list-style: none

	&__lane
		display: grid
		grid-template-columns: 3rem 1fr 3.25rem
		align-items: center
		gap: var(--m3e-space-2)

	&__lane-date
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-small)
		font-variant-numeric: tabular-nums

	&__lane-track
		position: relative
		display: block
		height: 0.875rem
		border-radius: var(--shape-corner-xs)
		background: var(--surface-container-high)
		overflow: hidden

	&__lane-grid
		position: absolute
		top: 0
		bottom: 0
		width: 1px
		background: var(--outline-variant)
		opacity: 0.6

	// 会话段：绝对定位外层承接 left/width，内部 Tooltip 撑满，hover 弹主题气泡
	&__lane-seg
		position: absolute
		top: 0.125rem
		bottom: 0.125rem

	:global(.sleep-card__lane-tip)
		display: block
		width: 100%
		height: 100%
		min-width: 0

	&__lane-bar
		display: block
		width: 100%
		height: 100%
		border-radius: var(--shape-corner-full)
		background: unquote("color-mix(in oklab, var(--primary) 72%, var(--surface-container-high))")
		cursor: default
		transition:
			transform var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate),
			opacity var(--m3e-duration-medium) var(--m3e-easing-standard)

		&:hover
			transform: scaleY(1.18)

		.is-last &
			background: var(--primary)

	&__lane-total
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-small)
		text-align: right
		font-variant-numeric: tabular-nums

	.is-last &__lane-date,
	.is-last &__lane-total
		color: var(--on-surface)
		font-weight: 600
</style>
