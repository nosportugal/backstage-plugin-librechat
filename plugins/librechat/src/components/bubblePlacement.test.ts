import {describe, expect, it} from "@jest/globals";
import {ConfigReader as BackstageConfigReader} from "@backstage/config";
import {
  DEFAULT_PLACEMENT,
  matchesPath,
  placementToCoords,
  readBubblePlacementConfig,
  resolvePlacement,
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
});
