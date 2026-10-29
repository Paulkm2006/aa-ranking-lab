import { test, expect } from "@playwright/test";
test("desktop drag, keyboard, reset, conflicts and import recovery", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".solve-status")).not.toContainText("正在解算");
  await page.screenshot({ path: "docs/desktop.png", fullPage: true });
  const rows = page.getByTestId("model-row");
  await expect(rows).toHaveCount(10);
  const from = await page
    .getByRole("button", { name: "拖动 Cedar Small", exact: true })
    .boundingBox();
  const to = await page
    .getByRole("button", { name: "拖动 Atlas Pro", exact: true })
    .boundingBox();
  await page.mouse.move(from!.x + 8, from!.y + 8);
  await page.mouse.down();
  await page.mouse.move(to!.x + 8, to!.y + 8, { steps: 30 });
  await page.mouse.up();
  await expect(rows.first()).toContainText("Cedar Small");
  await expect(page.locator(".solve-status")).toContainText("无法严格实现");
  await page.screenshot({ path: "docs/conflict.png", fullPage: true });
  await page.getByRole("button", { name: "重置排序" }).click();
  await expect(rows.first()).toContainText("Atlas Pro");
  const handle = page.getByRole("button", {
    name: "拖动 Atlas Pro",
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(handle).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("[id^=DndLiveRegion]")).toContainText(
    "over droppable area model-1",
  );
  await page.keyboard.press("Space");
  await expect(rows.nth(1)).toContainText("Atlas Pro");
  await page.getByLabel("导入评分文件").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{bad"),
  });
  await expect(page.getByRole("alert")).toContainText("导入失败");
  await expect(rows).toHaveCount(10);
  await page.getByRole("button", { name: "选择模型" }).click();
  await page.getByRole("textbox", { name: "搜索模型" }).fill("Cedar");
  await expect(page.locator(".choices label")).toHaveCount(2);
  await page.getByRole("button", { name: "恢复演示数据" }).click();
  await expect(rows.first()).toContainText("Atlas Pro");
  const dataset = {
    name: "Own scores",
    source: "Self measured",
    asOf: "2026-10-29",
    synthetic: false,
    dimensions: [{ id: "score", label: "Test", direction: "max" }],
    models: [
      { id: "a", name: "First", provider: "Lab", scores: { score: 100 } },
      { id: "b", name: "Second", provider: "Lab", scores: { score: 20 } },
    ],
  };
  await page.getByLabel("导入评分文件").setInputFiles({
    name: "own.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(dataset)),
  });
  await expect(rows).toHaveCount(2);
  await expect(page.locator(".solve-status")).toContainText("可严格实现");
  await expect(page.locator(".dataset-banner")).toContainText("IMPORTED DATA");
  await page.getByRole("button", { name: "移除 First", exact: true }).click();
  await expect(page.locator(".solve-status")).toContainText("至少需要两个");
  await page.getByRole("button", { name: "恢复演示数据" }).click();
  await expect(rows).toHaveCount(10);
  expect(errors).toEqual([]);
});
test("mobile viewport and touch dragging", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".solve-status")).not.toContainText("正在解算");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "docs/mobile.png", fullPage: true });
  const first = page.getByRole("button", {
    name: "拖动 Atlas Pro",
    exact: true,
  });
  const second = page.getByRole("button", {
    name: "拖动 Nova Code",
    exact: true,
  });
  await first.scrollIntoViewIfNeeded();
  const a = await first.boundingBox(),
    b = await second.boundingBox();
  const session = await context.newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: a!.x + 8, y: a!.y + 8 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: a!.x + 8, y: a!.y + 18 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: b!.x + 8, y: b!.y + 18 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.getByTestId("model-row").first()).toContainText(
    "Nova Code",
  );
  await context.close();
});
