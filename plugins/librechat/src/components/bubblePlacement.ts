/** Corner of the viewport the bubble's default position is measured from. */
export type BubbleAnchor = "bottom-right" | "bottom-left" | "top-right" | "top-left";

/** Default (non-dragged) placement of the bubble. */
export interface BubblePlacement {
  anchor: BubbleAnchor;
  /** Horizontal distance (px) from the anchored left/right viewport edge. */
  offsetX: number;
  /** Vertical distance (px) from the anchored top/bottom viewport edge. */
  offsetY: number;
}

/** Per-route override of the default placement. */
export interface BubbleRoutePlacement {
  /** Path prefix, matched against `location.pathname` on segment boundaries. */
  path: string;
  placement: BubblePlacement;
}

export interface BubblePlacementConfig {
  placement: BubblePlacement;
  routes: BubbleRoutePlacement[];
}

export const FAB_SIZE = 56;
export const EDGE_MARGIN = 24;
/** Gap (px) between the bubble and the open chat panel. */
export const PANEL_GAP = 12;
/** Vertical space (px) the panel always leaves free: it is never taller than the viewport minus this. */
export const PANEL_VIEWPORT_RESERVE = 120;

const ANCHORS: readonly BubbleAnchor[] = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
];

export const DEFAULT_PLACEMENT: BubblePlacement = {
  anchor: "bottom-right",
  offsetX: EDGE_MARGIN,
  offsetY: EDGE_MARGIN,
};

/**
 * Built-in route overrides, used when `librechat.bubble.routes` is not set.
 *
 * On the search page the results pager ("Next") sits at the bottom-right of the
 * content once you scroll to the end, exactly where the bubble rests by
 * default. Raise the bubble clear of it there.
 */
export const DEFAULT_ROUTES: BubbleRoutePlacement[] = [
  {
    path: "/search",
    placement: {anchor: "bottom-right", offsetX: EDGE_MARGIN, offsetY: 120},
  },
];

/** Minimal read-only view of Backstage's Config used here. */
export interface ConfigReader {
  getOptionalConfig(key: string): ConfigReader | undefined;
  getOptionalConfigArray(key: string): ConfigReader[] | undefined;
  getOptionalString(key: string): string | undefined;
  getOptionalNumber(key: string): number | undefined;
}

function readPlacement(
  config: ConfigReader | undefined,
  fallback: BubblePlacement,
): BubblePlacement {
  if (!config) {
    return fallback;
  }
  const anchor = config.getOptionalString("anchor") as BubbleAnchor | undefined;
  return {
    anchor: anchor && ANCHORS.includes(anchor) ? anchor : fallback.anchor,
    offsetX: config.getOptionalNumber("offsetX") ?? fallback.offsetX,
    offsetY: config.getOptionalNumber("offsetY") ?? fallback.offsetY,
  };
}

/** Read `librechat.bubble` into a placement config, applying defaults. */
export function readBubblePlacementConfig(
  bubble: ConfigReader | undefined,
): BubblePlacementConfig {
  const placement = readPlacement(
    bubble?.getOptionalConfig("position"),
    DEFAULT_PLACEMENT,
  );
  const routeConfigs = bubble?.getOptionalConfigArray("routes");
  const routes = routeConfigs
    ? routeConfigs.flatMap((route) => {
        const path = route.getOptionalString("path");
        return path
          ? [
              {
                path,
                placement: readPlacement(
                  route.getOptionalConfig("position"),
                  placement,
                ),
              },
            ]
          : [];
      })
    : DEFAULT_ROUTES;
  return {placement, routes};
}

function normalizePath(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** True when `pathname` equals `prefix` or is nested under it. */
export function matchesPath(pathname: string, prefix: string): boolean {
  const p = normalizePath(prefix);
  const current = normalizePath(pathname);
  if (p === "/") {
    return true;
  }
  return current === p || current.startsWith(`${p}/`);
}

/** Pick the placement for the current path; the longest matching prefix wins. */
export function resolvePlacement(
  config: BubblePlacementConfig,
  pathname: string,
): BubblePlacement {
  let best: BubbleRoutePlacement | undefined;
  for (const route of config.routes) {
    if (
      matchesPath(pathname, route.path) &&
      (!best || normalizePath(route.path).length > normalizePath(best.path).length)
    ) {
      best = route;
    }
  }
  return best?.placement ?? config.placement;
}

/** Top-left coordinates of the bubble for a placement in a given viewport. */
export function placementToCoords(
  placement: BubblePlacement,
  viewport: {width: number; height: number},
): {x: number; y: number} {
  const right = placement.anchor.endsWith("right");
  const bottom = placement.anchor.startsWith("bottom");
  const x = right
    ? viewport.width - placement.offsetX - FAB_SIZE
    : placement.offsetX;
  const y = bottom
    ? viewport.height - placement.offsetY - FAB_SIZE
    : placement.offsetY;
  // Never place the default off screen, e.g. on very small viewports.
  return {
    x: Math.min(Math.max(x, 0), Math.max(viewport.width - FAB_SIZE, 0)),
    y: Math.min(Math.max(y, 0), Math.max(viewport.height - FAB_SIZE, 0)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(max, min));
}

/**
 * Position and height of the chat panel for a bubble at `bubble`, kept fully
 * inside the viewport.
 *
 * The panel sits above the bubble when it fits there, otherwise below. When it
 * fits on neither side (bubble mid-height on a short viewport) it is clamped
 * vertically and moved beside the bubble so the two don't overlap.
 */
export function computePanelRect(
  bubble: {x: number; y: number},
  dimensions: {width: number; height: number},
  viewport: {width: number; height: number},
): {left: number; top: number; height: number} {
  const height = Math.max(
    Math.min(dimensions.height, viewport.height - PANEL_VIEWPORT_RESERVE),
    0,
  );
  const maxLeft = viewport.width - dimensions.width - EDGE_MARGIN;
  const maxTop = viewport.height - height - EDGE_MARGIN;
  // Right-align the panel with the bubble, clamped within the viewport.
  const alignedLeft = clamp(
    bubble.x + FAB_SIZE - dimensions.width,
    EDGE_MARGIN,
    maxLeft,
  );

  const aboveTop = bubble.y - PANEL_GAP - height;
  if (aboveTop >= EDGE_MARGIN) {
    return {left: alignedLeft, top: aboveTop, height};
  }
  const belowTop = bubble.y + FAB_SIZE + PANEL_GAP;
  if (belowTop <= maxTop) {
    return {left: alignedLeft, top: belowTop, height};
  }

  // No room above or below: keep the panel on screen and put it beside the
  // bubble when there is room, so the bubble doesn't cover it.
  const top = clamp(aboveTop, EDGE_MARGIN, maxTop);
  const leftOfBubble = bubble.x - PANEL_GAP - dimensions.width;
  if (leftOfBubble >= EDGE_MARGIN) {
    return {left: leftOfBubble, top, height};
  }
  const rightOfBubble = bubble.x + FAB_SIZE + PANEL_GAP;
  if (rightOfBubble <= maxLeft) {
    return {left: rightOfBubble, top, height};
  }
  return {left: alignedLeft, top, height};
}
