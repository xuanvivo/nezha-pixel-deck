import { test, expect } from "@playwright/test";
import { demoServers } from "../src/demo";
test("demo is self-contained, searchable, sortable and has working node details", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/?demo=1");
  await expect(page.locator(".node-card")).toHaveCount(6);
  await expect(page.locator("#connection-label")).toContainText("虚构数据");
  expect(
    requests.some((r) => r.includes("/api/") || r.includes("config.local")),
  ).toBe(false);
  await page.locator("#sort").selectOption("cpu");
  await expect(page.locator(".node-name").first()).toContainText("洛杉矶");
  await page.getByRole("searchbox").fill("东京");
  await expect(page.locator(".node-card")).toHaveCount(1);
  await page.locator(".node-name").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#detail-title")).toContainText("东京");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("manual order survives reload and deep theme preference persists", async ({
  page,
}) => {
  await page.goto("/?demo=1");
  await page.locator("#edit-order").click();
  await page
    .locator(".move-buttons")
    .first()
    .getByRole("button", { name: "后移" })
    .click();
  await expect(page.locator(".node-name").first()).toContainText("东京");
  await page.locator("#finish-order").click();
  await page.locator("#theme-button").click();
  await page.reload();
  await expect(page.locator(".node-name").first()).toContainText("东京");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("live mode reads same-origin v2 frames and escapes public notes", async ({
  page,
}) => {
  await page.route("**/api/v1/setting", (route) =>
    route.fulfill({ json: { data: { config: { site_name: "测试探针" } } } }),
  );
  await page.route("**/api/v1/server-group", (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.route("**/config.local.json", (route) =>
    route.fulfill({
      json: { aliases: { "101": "自定义别名" }, serverOrder: [102, 101] },
    }),
  );
  await page.routeWebSocket("**/api/v1/ws/server", (ws) => {
    ws.send(
      JSON.stringify({
        data: {
          servers: demoServers().map((s) => ({
            ...s,
            public_note: '<img src=x onerror="window.__injected=true">',
          })),
        },
      }),
    );
  });
  await page.goto("/");
  await expect(page.locator("#site-name")).toHaveText("测试探针");
  await expect(page.locator("#connection-label")).toHaveText("实时连接");
  await expect(page.locator(".node-card")).toHaveCount(6);
  await expect(page.locator(".node-name").first()).toContainText("东京");
  await expect(page.locator(".node-name").nth(1)).toHaveText("自定义别名");
  await expect(page.locator(".card-note").first()).toContainText("<img");
  expect(
    await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__injected,
    ),
  ).toBeUndefined();
});
test("phone layout does not overflow and all controls remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/?demo=1");
  await expect(page.locator(".node-card")).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator("#region").selectOption("JP");
  await expect(page.locator(".node-card")).toHaveCount(1);
  await page.locator("#list-view").click();
  await expect(page.locator("#node-grid")).toHaveClass(/compact/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("empty streams and disconnects clearly communicate absence of live data", async ({
  page,
}) => {
  await page.route("**/api/v1/setting", (r) =>
    r.fulfill({ json: { data: {} } }),
  );
  await page.route("**/api/v1/server-group", (r) =>
    r.fulfill({ json: { data: [] } }),
  );
  await page.route("**/config.local.json", (r) => r.fulfill({ json: {} }));
  await page.routeWebSocket("**/api/v1/ws/server", (ws) => {
    ws.send(JSON.stringify({ servers: [] }));
    setTimeout(() => ws.close(), 200);
  });
  await page.goto("/");
  await expect(page.locator(".empty-state")).toContainText("还没有可见节点");
  await expect(page.locator("#connection-label")).toContainText("重连");
  await expect(page.locator("#connection-notice")).toBeVisible();
});
