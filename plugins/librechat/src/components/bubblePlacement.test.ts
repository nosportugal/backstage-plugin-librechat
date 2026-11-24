import {describe, expect, it} from "@jest/globals";
import {ConfigReader as BackstageConfigReader} from "@backstage/config";
import {
  DEFAULT_PLACEMENT,
  computePanelRect,
  matchesPath,
  placementToCoords,
  readBubblePlacementConfig,
  resolvePlacement,
  stripBasePath,
} from "./bubblePlacement";

const viewport = {width: 1280, height: 800};

function bubbleConfig(data: object | undefined) {
  return data
    ? new BackstageConfigReader({librechat: {bubble: data}}).getOptionalConfig(
        "librechat.bubble",
      )
    : undefined;
}

describe("bubblePlacement", () => {
  it("defaults to the bottom-right corner", () => {
    const config = readBubblePlacementConfig(undefined);
    expect(resolvePlacement(config, "/catalog")).toEqual(DEFAULT_PLACEMENT);
    expect(placementToCoords(DEFAULT_PLACEMENT, viewport)).toEqual({
      x: 1280 - 24 - 56,
      y: 800 - 24 - 56,
    });
  });

  it("raises the bubble on /search by default", () => {
    const config = readBubblePlacementConfig(undefined);
    for (const path of ["/search", "/search/", "/search/results"]) {
      const coords = placementToCoords(resolvePlacement(config, path), viewport);
      expect(coords).toEqual({x: 1280 - 24 - 56, y: 800 - 120 - 56});
    }
    expect(resolvePlacement(config, "/searchable")).toEqual(DEFAULT_PLACEMENT);
  });

  it("reads global and per-route placement from config", () => {
    const config = readBubblePlacementConfig(
      bubbleConfig({
        position: {anchor: "bottom-left", offsetX: 300},
        routes: [
          {path: "/docs", position: {offsetY: 80}},
          {path: "/docs/api", position: {anchor: "top-right"}},
        ],
      }),
    );
    expect(resolvePlacement(config, "/catalog")).toEqual({
      anchor: "bottom-left",
      offsetX: 300,
      offsetY: 24,
    });
    expect(resolvePlacement(config, "/docs/x")).toEqual({
      anchor: "bottom-left",
      offsetX: 300,
      offsetY: 80,
    });
    // Longest prefix wins.
    expect(resolvePlacement(config, "/docs/api/y").anchor).toBe("top-right");
    // Configured routes replace the built-in /search override.
    expect(resolvePlacement(config, "/search").offsetY).toBe(24);
  });

  it("allows disabling route overrides with an empty list", () => {
    const config = readBubblePlacementConfig(bubbleConfig({routes: []}));
    expect(resolvePlacement(config, "/search")).toEqual(DEFAULT_PLACEMENT);
  });

  it("keeps the default on screen on tiny viewports", () => {
    expect(
      placementToCoords(
        {anchor: "bottom-right", offsetX: 24, offsetY: 500},
        {width: 300, height: 400},
      ),
    ).toEqual({x: 300 - 24 - 56, y: 0});
  });

  it("matches path prefixes on segment boundaries", () => {
    expect(matchesPath("/search", "/search/")).toBe(true);
    expect(matchesPath("/search-x", "/search")).toBe(false);
    expect(matchesPath("/anything", "/")).toBe(true);
  });

  it("matches routes relative to the app base path", () => {
    const config = readBubblePlacementConfig(undefined);
    const baseUrl = "https://host.example/backstage/";
    expect(stripBasePath("/backstage/search", baseUrl)).toBe("/search");
    expect(stripBasePath("/backstage/search/x", baseUrl)).toBe("/search/x");
    expect(stripBasePath("/backstage", baseUrl)).toBe("/");
    // Not under the base path, or no base path at all: left untouched.
    expect(stripBasePath("/backstage-2/search", baseUrl)).toBe(
      "/backstage-2/search",
    );
    expect(stripBasePath("/search", "https://host.example")).toBe("/search");
    expect(stripBasePath("/search", undefined)).toBe("/search");

    expect(
      resolvePlacement(config, stripBasePath("/backstage/search", baseUrl)),
    ).toEqual({anchor: "bottom-right", offsetX: 24, offsetY: 120});
    expect(
      resolvePlacement(config, stripBasePath("/backstage/catalog", baseUrl)),
    ).toEqual(DEFAULT_PLACEMENT);
  });

  describe("computePanelRect", () => {
    const sizes = {
      small: {width: 340, height: 480},
      medium: {width: 400, height: 560},
      large: {width: 460, height: 680},
    };

    it("places the panel above the bubble when it fits", () => {
      const bubble = placementToCoords(DEFAULT_PLACEMENT, viewport);
      expect(computePanelRect(bubble, sizes.medium, viewport)).toEqual({
        left: bubble.x + 56 - 400,
        top: bubble.y - 12 - 560,
        height: 560,
      });
    });

    it("places the panel below a bubble near the top", () => {
      const rect = computePanelRect({x: 1200, y: 24}, sizes.medium, viewport);
      expect(rect.top).toBe(24 + 56 + 12);
    });

    it("keeps the panel on screen for every size and default placement", () => {
      const config = readBubblePlacementConfig(undefined);
      for (const path of ["/catalog", "/search"]) {
        for (const height of [600, 720, 800, 1080]) {
          for (const dimensions of Object.values(sizes)) {
            const vp = {width: 1280, height};
            const bubble = placementToCoords(resolvePlacement(config, path), vp);
            const rect = computePanelRect(bubble, dimensions, vp);
            expect(rect.top).toBeGreaterThanOrEqual(24);
            expect(rect.top + rect.height).toBeLessThanOrEqual(height - 24);
            expect(rect.left).toBeGreaterThanOrEqual(24);
            expect(rect.left + dimensions.width).toBeLessThanOrEqual(1280 - 24);
          }
        }
      }
    });

    it("moves the panel beside the bubble when it fits neither above nor below", () => {
      // Medium panel on /search at 720px: the raised bubble leaves no room
      // above or below, which used to push the panel off the bottom edge.
      const vp = {width: 1280, height: 720};
      const bubble = {x: 1280 - 24 - 56, y: 720 - 120 - 56};
      const rect = computePanelRect(bubble, sizes.medium, vp);
      expect(rect).toEqual({left: bubble.x - 12 - 400, top: 24, height: 560});
    });

    it("falls back to the right of the bubble near the left edge", () => {
      const vp = {width: 1280, height: 720};
      const rect = computePanelRect({x: 24, y: 544}, sizes.medium, vp);
      expect(rect.left).toBe(24 + 56 + 12);
    });

    it("shortens the panel instead of covering the bubble on narrow viewports", () => {
      // 500px wide: no room beside the bubble, so the panel used to be
      // clamped on top of it.
      const vp = {width: 500, height: 720};
      const bubble = {x: 500 - 24 - 56, y: 720 - 120 - 56};
      const rect = computePanelRect(bubble, sizes.medium, vp);
      expect(rect).toEqual({left: 76, top: 24, height: 544 - 12 - 24});
      expect(rect.top + rect.height).toBeLessThanOrEqual(bubble.y - 12);
    });

    it("uses the room below when the bubble sits in the upper half", () => {
      const vp = {width: 500, height: 720};
      const rect = computePanelRect({x: 420, y: 200}, sizes.medium, vp);
      expect(rect).toEqual({left: 76, top: 200 + 56 + 12, height: 428});
    });

    it("never overlaps the default bubble at any common viewport size", () => {
      const config = readBubblePlacementConfig(undefined);
      for (const path of ["/catalog", "/search"]) {
        for (const width of [360, 500, 768, 1280]) {
          for (const height of [600, 720, 800, 1080]) {
            for (const dimensions of Object.values(sizes)) {
              const vp = {width, height};
              const b = placementToCoords(resolvePlacement(config, path), vp);
              const r = computePanelRect(b, dimensions, vp);
              const overlaps =
                b.x < r.left + dimensions.width &&
                r.left < b.x + 56 &&
                b.y < r.top + r.height &&
                r.top < b.y + 56;
              expect({path, width, height, overlaps}).toEqual({
                path,
                width,
                height,
                overlaps: false,
              });
              expect(r.top + r.height).toBeLessThanOrEqual(height - 24);
            }
          }
        }
      }
    });
  });
});
