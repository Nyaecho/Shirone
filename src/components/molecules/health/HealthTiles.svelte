<script lang="ts">
/**
 * 今日速览 tile 组（分子）：步数/心率/压力/睡眠四枚 tonal metric tiles。
 * 数据由父组件算好传入（tiles 为纯展示数据），角色色按序轮换。
 */
import Icon from "@iconify/svelte";
import { reveal } from "@utils/motion";

export interface HealthTile {
	key: string;
	icon: string;
	label: string;
	value: string;
	unit: string;
	hint: string;
}

let { tiles = [] as HealthTile[] }: { tiles?: HealthTile[] } = $props();

/** 角色色轮换：primary → tertiary → secondary → primary */
const TILE_ROLES = ["primary", "tertiary", "secondary", "primary"] as const;
</script>

<div class="health-tiles">
	{#each tiles as tile, i (tile.key)}
		<div
			class="health-tiles__tile health-tiles__tile--{TILE_ROLES[i % 4]}"
			use:reveal={{ delay: i * 70 }}
		>
			<span class="health-tiles__icon" aria-hidden="true">
				<Icon icon={tile.icon} />
			</span>
			<span class="health-tiles__label">{tile.label}</span>
			<span class="health-tiles__value">
				{tile.value}{#if tile.unit}<small>{tile.unit}</small>{/if}
			</span>
			{#if tile.hint}
				<span class="health-tiles__hint">{tile.hint}</span>
			{/if}
		</div>
	{/each}
</div>

<style lang="stylus">
.health-tiles
	display: grid
	grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr))
	gap: var(--m3e-space-3)

	&__tile
		display: flex
		flex-direction: column
		gap: var(--m3e-space-1)
		padding: var(--m3e-space-4)
		border-radius: var(--shape-corner-l)
		border: 1px solid var(--outline-variant)
		background: var(--card-bg)
		transition:
			border-color var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate),
			box-shadow var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

		&:hover
			border-color: var(--outline)
			box-shadow: var(--m3e-elevation-1)

	&__tile--primary &__icon
		color: var(--on-primary-container)
		background: var(--primary-container)

	&__tile--secondary &__icon
		color: var(--on-secondary-container)
		background: var(--secondary-container)

	&__tile--tertiary &__icon
		color: var(--on-tertiary-container)
		background: var(--tertiary-container)

	&__icon
		display: inline-flex
		align-items: center
		justify-content: center
		width: 2.5rem
		height: 2.5rem
		border-radius: var(--shape-corner-m)
		margin-bottom: var(--m3e-space-1)
		> :global(svg)
			width: 1.375rem
			height: 1.375rem

	&__label
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-medium)

	&__value
		color: var(--on-surface)
		font: var(--m3e-type-headline-medium)
		font-weight: 700
		font-variant-numeric: tabular-nums
		line-height: 1.15
		small
			margin-left: 0.25rem
			font: var(--m3e-type-label-medium)
			font-weight: 500
			color: var(--on-surface-variant)

	&__hint
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-small)
		font-variant-numeric: tabular-nums
</style>
