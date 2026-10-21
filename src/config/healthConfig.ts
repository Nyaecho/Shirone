import type { HealthConfig } from "@/types/healthConfig";
import { withUserConfig } from "../utils/config-overlay.ts";

/**
 * 健康数据页行为与展示配置。
 *
 * 「静态模板 + 运行时取数」：页面构建产物是纯模板，浏览器 hydrate 后向
 * apiBase（shirone-admin 的公开只读接口，经 nginx 同域反代）拉取快照渲染。
 * 数据新鲜度由服务端 cron（同步）与接口缓存决定，与站点构建解耦。
 *
 * 内容仓可用 `config/health.yaml` 最小化覆盖（enable / days / cards 等）。
 */
// 生产经 nginx 同域反代（博客域 /blog-admin/ → admin:3777，前缀剥离），
// 健康数据与管理平台共用同一入口；dev 下组件在浏览器端改写为本地直连。
export const healthConfig: HealthConfig = withUserConfig("health", {
	enable: true,
	title: "$t:health",
	description: "$t:healthBanner",
	apiBase: "/blog-admin/api/health",
	cards: {
		steps: true,
		heartRate: true,
		stress: true,
		sleep: true,
	},
	fetchTimeoutMs: 8000,
});
