<script lang="ts">
/**
 * 健康数据页主体（有机体）：静态模板 + 运行时取数，纯编排层。
 *
 * 分层（遵循原子结构规范，同 SkillSection → SkillCard 模式）：
 * - utils/health/*：全部数据变换（曲线几何/步数网格/睡眠泳道/格式化）；
 * - molecules/health/*：四张卡片的呈现（HealthTiles/StepsCard/CurveCard/SleepCard）；
 * - 本组件：取数（加载/离线/重试）、tiles 派生、卡片开关与编排。
 */
import Skeleton from "@components/atoms/display/Skeleton.svelte";
import CurveCard from "@components/molecules/health/CurveCard.svelte";
import type { HealthTile } from "@components/molecules/health/HealthTiles.svelte";
import HealthTiles from "@components/molecules/health/HealthTiles.svelte";
import SleepCard from "@components/molecules/health/SleepCard.svelte";
import StepsCard from "@components/molecules/health/StepsCard.svelte";
import PageHeader from "@components/molecules/PageHeader.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import {
	buildLaneTicks,
	buildLaneWindow,
	buildSleepLanes,
	buildStageBars,
	buildStepsChart,
	fmtHM,
	fmtInt,
	fmtMinutes,
	fmtMinutesLong,
} from "@utils/health";
import { onMount } from "svelte";
import type { HealthSnapshot } from "@/types/healthConfig";

let {
	apiBase = "/api/health",
	cards = { steps: true, heartRate: true, stress: true, sleep: true },
	fetchTimeoutMs = 8000,
	title = i18n(I18nKey.health),
	subtitle = i18n(I18nKey.healthBanner),
}: {
	/** 数据接口地址（生产同域 /api/health，本地 dev 直连写作工具） */
	apiBase?: string;
	/** 各卡片开关 */
	cards?: {
		steps: boolean;
		heartRate: boolean;
		stress: boolean;
		sleep: boolean;
	};
	/** 请求超时毫秒 */
	fetchTimeoutMs?: number;
	title?: string;
	subtitle?: string;
} = $props();

// ---------- 取数（加载与重试共用） ----------

type LoadState = "loading" | "ready" | "offline";
let state = $state<LoadState>("loading");
let snapshot = $state<HealthSnapshot | null>(null);

function load() {
	// 生产：apiBase（/health-data）由 nginx 同域反代到 admin 的 /api/health，
	// 不跨域、不暴露管理平台地址。本地 dev：页面跑在 :4321 而写作工具在 :3777，
	// 根相对地址按运行时主机改写为直连。island props 在 SSR 期序列化，
	// 因此这个判定只能放在客户端运行时做。天数由服务端配置决定，前端零可变参数。
	let base = apiBase;
	if (
		typeof window !== "undefined" &&
		base.startsWith("/") &&
		(window.location.hostname === "localhost" ||
			window.location.hostname === "127.0.0.1")
	) {
		base = "http://127.0.0.1:3777/api/health";
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), fetchTimeoutMs);
	fetch(`${base}/snapshot`, {
		signal: controller.signal,
		headers: { Accept: "application/json" },
	})
		.then((r) =>
			r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
		)
		.then((data: HealthSnapshot) => {
			if (data?.ok) {
				snapshot = data;
				state = "ready";
			} else {
				state = "offline";
			}
		})
		.catch(() => {
			state = "offline";
		})
		.finally(() => clearTimeout(timer));
	return () => {
		clearTimeout(timer);
		controller.abort();
	};
}

onMount(() => load());

function retry() {
	state = "loading";
	load();
}

// ---------- 派生：今日速览 tiles ----------

const tiles = $derived.by(() => {
	if (!snapshot) return [];
	const out: HealthTile[] = [];
	if (cards.steps) {
		const d = snapshot.steps.deltaPct;
		out.push({
			key: "steps",
			icon: "material-symbols:directions-walk-outline-rounded",
			label: i18n(I18nKey.healthSteps),
			value: fmtInt(snapshot.steps.today),
			unit: "",
			hint:
				d == null
					? ""
					: `${d >= 0 ? "▲" : "▼"} ${Math.abs(d)}% ${i18n(I18nKey.healthVsYesterday)}`,
		});
	}
	if (cards.heartRate) {
		const hr = snapshot.heartRate;
		out.push({
			key: "hr",
			icon: "material-symbols:ecg-heart-outline-rounded",
			label: i18n(I18nKey.healthHeartRate),
			value: fmtInt(hr.last),
			unit: "bpm",
			hint: `${i18n(I18nKey.healthAvg)} ${fmtInt(hr.avg)}`,
		});
	}
	if (cards.stress) {
		const st = snapshot.stress;
		out.push({
			key: "stress",
			icon: "material-symbols:sentiment-calm-outline-rounded",
			label: i18n(I18nKey.healthStress),
			value: fmtInt(st.last),
			unit: "",
			hint: `${i18n(I18nKey.healthAvg)} ${fmtInt(st.avg)}`,
		});
	}
	if (cards.sleep) {
		const night = snapshot.sleep.nights.at(-1);
		out.push({
			key: "sleep",
			icon: "material-symbols:bedtime-outline-rounded",
			label: i18n(I18nKey.healthSleep),
			value: night ? fmtMinutesLong(night.totalMin) : "—",
			unit: "",
			hint: "",
		});
	}
	return out;
});

// ---------- 派生：卡片数据（几何全部在 utils 层完成） ----------

const stepsChart = $derived(buildStepsChart(snapshot?.steps.daily ?? []));
const stageBars = $derived(
	buildStageBars(snapshot?.sleep.stages ?? [], () => ""),
);
const laneWindow = $derived(buildLaneWindow(snapshot?.sleep.nights ?? []));
const lanes = $derived(
	buildSleepLanes(snapshot?.sleep.nights ?? [], laneWindow),
);
const laneTicks = $derived(buildLaneTicks(laneWindow));
const lastNight = $derived(snapshot?.sleep.nights?.at(-1) ?? null);

const updatedThrough = $derived(
	snapshot?.dataThrough
		? i18n(I18nKey.healthUpdatedThrough).replace(
				"{time}",
				fmtHM(snapshot.dataThrough),
			)
		: "",
);

const hrMeta = $derived(
	snapshot
		? `${i18n(I18nKey.healthMin)} ${fmtInt(snapshot.heartRate.min)} · ${i18n(I18nKey.healthMax)} ${fmtInt(snapshot.heartRate.max)} bpm`
		: "",
);
const stressMeta = $derived(
	snapshot
		? `${i18n(I18nKey.healthAvg)} ${fmtInt(snapshot.stress.avg)} · ${i18n(I18nKey.healthMax)} ${fmtInt(snapshot.stress.max)}`
		: "",
);
</script>

<div class="health-section">
	<PageHeader icon="material-symbols:monitor-heart-outline-rounded" {title} {subtitle} />

	{#if state === "loading"}
		<!-- 加载骨架：速览 tile 行 + 趋势卡 -->
		<div class="health-section__tiles-skeleton" aria-busy="true">
			{#each Array(4) as _, i (i)}
				<div class="health-section__tile-skeleton">
					<Skeleton variant="circle" width="2.25rem" height="2.25rem" />
					<Skeleton variant="text" width="60%" />
					<Skeleton variant="text" width="40%" />
				</div>
			{/each}
		</div>
		<div class="health-section__grid">
			{#each Array(2) as _, i (i)}
				<div class="health-section__card-skeleton">
					<Skeleton variant="text" width="30%" />
					<Skeleton variant="rect" width="100%" height="8.5rem" radius="var(--shape-corner-m)" />
				</div>
			{/each}
		</div>
	{:else if state === "offline"}
		<div class="health-section__offline" role="alert">
			<Icon icon="material-symbols:cloud-off-outline-rounded" />
			<p>{i18n(I18nKey.healthOffline)}</p>
			<button type="button" class="health-section__retry" onclick={retry}>
				{i18n(I18nKey.healthRetry)}
			</button>
		</div>
	{:else if snapshot}
		<HealthTiles {tiles} />

		<div class="health-section__grid">
			{#if cards.steps && stepsChart.bars.length}
				<StepsCard
					grid={stepsChart.grid}
					bars={stepsChart.bars}
					today={snapshot.steps.today}
					delay={120}
				/>
			{/if}

			{#if cards.heartRate}
				<CurveCard
					kind="heartRate"
					points={snapshot.heartRate.points}
					meta={hrMeta}
					unit="bpm"
					delay={190}
				/>
			{/if}

			{#if cards.sleep && lastNight}
				<SleepCard
					night={lastNight}
					{stageBars}
					{lanes}
					laneTicks={laneTicks}
					delay={260}
				/>
			{/if}

			{#if cards.stress}
				<CurveCard
					kind="stress"
					points={snapshot.stress.points}
					meta={stressMeta}
					delay={330}
				/>
			{/if}
		</div>

		{#if updatedThrough}
			<p class="health-section__updated">{updatedThrough}</p>
		{/if}
	{/if}
</div>

<style lang="stylus">
.health-section
	display: flex
	flex-direction: column
	gap: var(--m3e-space-6)

	// ---------- 加载骨架 ----------
	&__tiles-skeleton
		display: grid
		grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr))
		gap: var(--m3e-space-3)

	&__tile-skeleton
		display: flex
		flex-direction: column
		gap: var(--m3e-space-2)
		padding: var(--m3e-space-4)
		border-radius: var(--shape-corner-l)
		border: 1px dashed var(--outline-variant)

	// ---------- 卡组：单列纵排（睡眠/步数信息密度高，不与其它卡挤一行） ----------
	&__grid
		display: flex
		flex-direction: column
		gap: var(--m3e-space-4)

	&__card-skeleton
		display: flex
		flex-direction: column
		gap: var(--m3e-space-4)
		padding: var(--m3e-space-5)
		border-radius: var(--shape-corner-l)
		border: 1px dashed var(--outline-variant)

	// ---------- 离线 ----------
	&__offline
		display: flex
		flex-direction: column
		align-items: center
		gap: var(--m3e-space-3)
		padding: var(--m3e-space-10) var(--m3e-space-4)
		text-align: center
		border: 1px dashed var(--outline-variant)
		border-radius: var(--shape-corner-l)
		color: var(--on-surface-variant)

		> :global(svg)
			width: 2.5rem
			height: 2.5rem
			opacity: 0.7

		p
			margin: 0
			font: var(--m3e-type-body-large)

	&__retry
		padding: var(--m3e-space-2) var(--m3e-space-4)
		border: 1px solid var(--outline)
		border-radius: var(--shape-corner-full)
		background: transparent
		color: var(--primary)
		font: var(--m3e-type-label-large)
		cursor: pointer
		transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard)

		&:hover
			background: unquote("color-mix(in oklab, var(--primary) 8%, transparent)")

		&:focus-visible
			outline: 2px solid var(--primary)
			outline-offset: 2px

	&__updated
		margin: 0
		text-align: right
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-small)
</style>
