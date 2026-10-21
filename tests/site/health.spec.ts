import { expect, test } from "@playwright/test";

/**
 * 健康数据页冒烟：页面壳层与加载/离线态。
 * 数据卡片依赖运行时 API（shirone-admin），测试环境不可达时走离线分支；
 * 因此卡片内容仅在就绪时断言，离线时只断言兜底 UI 存在。
 */
test.describe("健康数据页", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/health/");
	});

	test("页面壳层与标识", async ({ page }) => {
		await expect(page.locator("#swup-container")).toHaveAttribute(
			"data-current-page",
			"health",
		);
		await expect(page.locator(".page-header__title")).toBeVisible();
	});

	test("加载后进入就绪或离线态（二者必居其一）", async ({ page }) => {
		const ready = page.locator(".health-tiles__tile").first();
		const offline = page.locator(".health-section__offline");
		await expect
			.poll(
				async () => (await ready.count()) > 0 || (await offline.count()) > 0,
				{
					timeout: 15_000,
				},
			)
			.toBeTruthy();
	});

	test("离线态提供重试入口", async ({ page }) => {
		const offline = page.locator(".health-section__offline");
		if (await offline.count()) {
			await expect(offline.getByRole("button")).toBeVisible();
		}
	});
});
