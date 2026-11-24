import {test, expect} from "@playwright/test";

/**
 * End-to-end coverage for the global chat bubble rendered by the plugin.
 *
 * These specs run against the dev app (`yarn start`) in CI; the pass/fail
 * results are summarised back onto the pull request as a comment.
 */
test.describe("LibreChat chat bubble", () => {
  test.beforeEach(async ({page}) => {
    await page.goto("/");
  });

  test("renders the bubble in its resting state", async ({page}) => {
    const bubble = page.getByRole("button", {name: "Open chat"});
    await expect(bubble).toBeVisible();
  });

  test("opens the chat panel when clicked", async ({page}) => {
    const bubble = page.getByRole("button", {name: "Open chat"});
    await expect(bubble).toBeVisible();
    await bubble.click();

    // The bubble toggles its accessible name once the panel is open.
    const openBubble = page.getByRole("button", {name: "Close chat"});
    await expect(openBubble).toBeVisible();
  });

  test("can be dragged to a new position", async ({page}) => {
    const bubble = page.getByRole("button", {name: "Open chat"});
    await expect(bubble).toBeVisible();

    const start = await bubble.boundingBox();
    expect(start).not.toBeNull();
    const {x, y, width, height} = start!;

    // Drag the bubble up and to the left from its bottom-right resting spot.
    await page.mouse.move(x + width / 2, y + height / 2);
    await page.mouse.down();
    await page.mouse.move(x - 200, y - 150, {steps: 12});
    await page.mouse.up();

    const moved = await bubble.boundingBox();
    expect(moved).not.toBeNull();
    expect(moved!.x).toBeLessThan(x);
    expect(moved!.y).toBeLessThan(y);
  });

  test("does not cover the search pager's Next button", async ({page}) => {
    await page.goto("/search");
    const bubble = page.getByRole("button", {name: "Open chat"});
    const next = page.getByRole("button", {name: "Next"});
    await expect(bubble).toBeVisible();
    await next.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 10_000);

    const b = (await bubble.boundingBox())!;
    const n = (await next.boundingBox())!;
    const overlaps =
      b.x < n.x + n.width &&
      n.x < b.x + b.width &&
      b.y < n.y + n.height &&
      n.y < b.y + b.height;
    expect(overlaps).toBe(false);

    // A real click (no force) fails if anything sits on top of the button.
    await next.click();
    await expect(page.getByText("Page 2")).toBeVisible();
  });

  test("keeps a dragged position on the search page", async ({page}) => {
    await page.goto("/search");
    const bubble = page.getByRole("button", {name: "Open chat"});
    await expect(bubble).toBeVisible();
    const start = (await bubble.boundingBox())!;

    await page.mouse.move(start.x + 28, start.y + 28);
    await page.mouse.down();
    await page.mouse.move(start.x - 300, start.y - 200, {steps: 12});
    await page.mouse.up();
    const dragged = (await bubble.boundingBox())!;

    await page.reload();
    await expect(bubble).toBeVisible();
    await expect.poll(async () => (await bubble.boundingBox())!.x).toBeCloseTo(
      dragged.x,
      0,
    );
    expect((await bubble.boundingBox())!.y).toBeCloseTo(dragged.y, 0);
  });

  for (const viewport of [
    {width: 1280, height: 720},
    {width: 1280, height: 800},
    // Too narrow to fit the panel beside the bubble.
    {width: 500, height: 720},
  ]) {
    test(`keeps the open chat panel inside a ${viewport.width}x${viewport.height} viewport on the search page`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/search");
      await page.getByRole("button", {name: "Open chat"}).click();

      const bubble = page.getByRole("button", {name: "Close chat"});
      const input = page.getByPlaceholder("Type a message...");
      await expect(input).toBeVisible();
      await expect(input).toBeInViewport({ratio: 1});

      // The bubble must not sit on top of any part of the panel either.
      // Polled because the panel slides into place when it opens.
      const panel = page.getByTestId("librechat-panel");
      await expect
        .poll(async () => {
          const b = (await bubble.boundingBox())!;
          const p = (await panel.boundingBox())!;
          return (
            b.x < p.x + p.width &&
            p.x < b.x + b.width &&
            b.y < p.y + p.height &&
            p.y < b.y + b.height
          );
        })
        .toBe(false);
    });
  }
});
