# 健康数据页（/health/）

穿戴设备健康数据的展示页：**静态模板 + 浏览器运行时取数**。构建产物不含任何健康数据，页面 hydrate 后向管理平台（shirone-admin）的公开只读接口拉取快照渲染，数据更新不触发站点构建。

## 数据链路

```text
浏览器 /health/ 页（Svelte 岛 hydrate）
  │ fetch apiBase/snapshot（默认 /blog-admin/api/health，经 nginx 同域反代）
  ▼
shirone-admin :3777（仅回环监听）routes/health.js
  │ node:sqlite 只读直查 mihealth.db（dedup 表）
  ▼
mihealth-api sync.py incremental --prune-days 7（服务器 cron 每小时）
  ▼
小米云端
```

- 快照契约见 shirone-admin `lib/mihealth.js` 头注：近 N 天步数（站点时区日历日聚合）、24h 心率/压力序列（降采样+统计）、近 N 晚睡眠（主会话摘要 + 全部会话 + 最近一夜分期）；
- 统计天数由服务端 `MIHEALTH_DAYS` 决定，前端零可变参数；
- 接口缓存 60s + stale-while-revalidate，库不可用时降级返回旧快照。

## 分层（原子结构规范）

| 层 | 位置 | 职责 |
| --- | --- | --- |
| 纯函数 | `src/utils/health/` | 曲线几何（降采样/Catmull-Rom/scrubber 命中）、步数动态网格、睡眠泳道窗口、格式化；零 Svelte/i18n 依赖 |
| 分子 | `src/components/molecules/health/` | `HealthTiles`（速览）、`StepsCard`（0 基线胶囊柱）、`CurveCard`（心率/压力共用骨架）、`SleepCard`（分期+泳道） |
| 有机体 | `src/components/organisms/HealthSection.svelte` | 取数（加载/离线/重试）、tiles 派生、卡片编排 |
| 路由 | `src/pages/health.astro` | enable→404、MainGridLayout、标量 props 传岛 |

## 呈现要点

- **今日速览**：tonal metric tiles（primary/tertiary/secondary 角色色轮换 + Iconify 图标芯片），stagger reveal；
- **步数**：动态整刻度网格（千/两千/五千按量级升档），柱底贴 0 基线，今日柱 primary 高亮，hover 弹主题 Tooltip；
- **心率**：tertiary 平滑曲线 + 面积渐隐（窗口 min–max 趋势视图），scrubber 指示点精确贴合曲线；
- **压力**：绝对 0–100 坐标 + 绿→黄→红无极渐变描边（`userSpaceOnUse` 对齐 viewBox，低值在底=绿），色阶图例同色标；
- **睡眠**：分期时间轴（<8min 微段合并、1.5px 表面色缝隙分界）+ 近 N 天入睡/醒来泳道（窗口随真实数据动态推导、含午睡段、每段 Tooltip 显示自身起止）；
- 全部颜色走语义令牌与 color-mix（压力绿黄红为内容色例外，语义色无可映射令牌）；间距/字型/圆角/动效走 `--m3e-*` 令牌。

## 已知陷阱（改动前必读）

- **island props 在 SSR 期序列化**：不能在配置里按 `window` 求值；dev 直连改写放在组件 `onMount` 里做；
- **对象 props 会阻断 island 序列化**：向岛组件传**标量 props**，不要传整个 config 对象；
- **CSS `stroke` 声明会覆盖 SVG 内联 `stroke="url(#...)"`**：渐变描边的元素不要在 CSS 里声明 stroke（见 CurveCard 注释）；
- **Svelte scoped CSS 无法匹配动态拼接类名**：分期色/压力档位用「内联 CSS 变量注入 + 静态修饰类」组合（同 ANIME_STATUS_META 模式）；
- **Tooltip 包装 span 是 inline-flex**：绝对定位元素不能直接当锚点，用外层承接定位 + wrapper 撑满（见 StepsCard/SleepCard）；
- **泳道刻度键**：跨天窗口下 `label` 可能重名，each key 用索引。

## 配置与开关

内容仓 `config/health.yaml` 最小化覆盖：`enable`（false 时 /health/ → 404、导航与 sitemap 同步裁剪）、`apiBase`、`cards.*`。导航入口：`nav-bar.yaml` 中 `- preset: Health`（i18n 词条「运动健康」，10 语言）。

## 测试

- `tests/site/health.spec.ts`：壳层标识 + 就绪/离线互斥断言（不依赖运行时 API）；
- 数据链路联调：shirone-admin `scripts/test-mihealth.mjs`（mock 库全链路 27 项断言）。
