import {test, expect} from "@playwright/test";
import path from "node:path";

const screenshotsDir = path.join(__dirname, "screenshots");

/**
 * End-to-end coverage for the global chat bubble rendered by the plugin.
 *
 * Each spec also captures a screenshot that CI publishes as a comment on the
 * pull request, giving reviewers a quick visual diff of the bubble UI.
 */
test.describe("LibreChat chat bubble", () => {
  test.beforeEach(async ({page}) => {
    await page.goto("/");
  });

  test("renders the bubble in its resting state", async ({page}) => {
    const bubble = page.getByRole("button", {name: "Open chat"});
    await expect(bubble).toBeVisible();
    await page.screenshot({
      path: path.join(screenshotsDir, "01-bubble-closed.png"),
      fullPage: true,
    });
  });

  test("opens the chat panel when clicked", async ({page}) => {
    const bubble = page.getByRole("button", {name: "Open chat"});
    await expect(bubble).toBeVisible();
    await bubble.click();

    // The bubble toggles its accessible name once the panel is open.
    const openBubble = page.getByRole("button", {name: "Close chat"});
    await expect(openBubble).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotsDir, "02-bubble-open.png"),
      fullPage: true,
    });
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

    await page.screenshot({
      path: path.join(screenshotsDir, "03-bubble-dragged.png"),
      fullPage: true,
    });
  });
});
