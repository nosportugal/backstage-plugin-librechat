import {useState, useRef, useEffect, useCallback} from "react";
import type {PointerEvent as ReactPointerEvent} from "react";
import {makeStyles, Theme} from "@material-ui/core/styles";
import Fab from "@material-ui/core/Fab";
import Paper from "@material-ui/core/Paper";
import Slide from "@material-ui/core/Slide";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import ChatIcon from "@material-ui/icons/Chat";
import CloseIcon from "@material-ui/icons/Close";
import {useApi, configApiRef} from "@backstage/frontend-plugin-api";
import {ChatPanel} from "./ChatPanel";
import {useIsSignedIn} from "../hooks/useIsSignedIn";
import {
  useLibreChatSettings,
  CHAT_SIZE_DIMENSIONS,
  BubblePosition,
} from "../hooks/useLibreChatSettings";

const FAB_SIZE = 56;
const EDGE_MARGIN = 24;
const PANEL_GAP = 12;
/** Pointer travel (px) before a press is treated as a drag rather than a click. */
const DRAG_THRESHOLD = 4;

interface Coords {
  x: number;
  y: number;
}

const useStyles = makeStyles((theme: Theme) => ({
  container: {
    position: "fixed",
    zIndex: theme.zIndex.tooltip + 1,
  },
  fab: {
    boxShadow: theme.shadows[6],
    cursor: "grab",
    touchAction: "none",
    userSelect: "none",
    WebkitUserDrag: "none",
    "&:active": {
      cursor: "grabbing",
    },
  },
  panel: {
    position: "fixed",
    maxHeight: "calc(100vh - 120px)",
    borderRadius: 12,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    zIndex: theme.zIndex.tooltip + 1,
    boxShadow: theme.shadows[16],
  },
}));

function useIsEnabled(): boolean {
  const configApi = useApi(configApiRef);
  return configApi.getOptionalBoolean("librechat.enabled") ?? true;
}

/** Default resting position of the bubble: bottom-right corner. */
function defaultCoords(): Coords {
  return {
    x: window.innerWidth - EDGE_MARGIN - FAB_SIZE,
    y: window.innerHeight - EDGE_MARGIN - FAB_SIZE,
  };
}

/** Keep the bubble fully visible within the viewport. */
function clampCoords({x, y}: Coords): Coords {
  const maxX = window.innerWidth - FAB_SIZE - EDGE_MARGIN;
  const maxY = window.innerHeight - FAB_SIZE - EDGE_MARGIN;
  return {
    x: Math.min(Math.max(x, EDGE_MARGIN), Math.max(maxX, EDGE_MARGIN)),
    y: Math.min(Math.max(y, EDGE_MARGIN), Math.max(maxY, EDGE_MARGIN)),
  };
}

/** Position the panel near the bubble, flipping/clamping to stay on screen. */
function computePanelStyle(
  bubble: Coords,
  dimensions: {width: number; height: number},
): {left: number; top: number} {
  // Right-align the panel with the fab, then clamp within the viewport.
  const rawLeft = bubble.x + FAB_SIZE - dimensions.width;
  const left = Math.min(
    Math.max(rawLeft, EDGE_MARGIN),
    Math.max(window.innerWidth - dimensions.width - EDGE_MARGIN, EDGE_MARGIN),
  );

  // Prefer placing the panel above the fab; fall back to below if no room.
  const aboveTop = bubble.y - PANEL_GAP - dimensions.height;
  const top =
    aboveTop >= EDGE_MARGIN ? aboveTop : bubble.y + FAB_SIZE + PANEL_GAP;

  return {left, top};
}

export function ChatBubble() {
  const classes = useStyles();
  const enabled = useIsEnabled();
  const signedIn = useIsSignedIn();
  const {settings, saveBubblePosition} = useLibreChatSettings();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<BubblePosition>(null);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const justDraggedRef = useRef(false);
  const positionRef = useRef<BubblePosition>(null);
  const saveBubblePositionRef = useRef(saveBubblePosition);

  // Mirror the latest values into refs so the global listeners below can read
  // them without being re-created on every render.
  positionRef.current = position;
  saveBubblePositionRef.current = saveBubblePosition;

  // Adopt the persisted position once settings load (or when it changes).
  useEffect(() => {
    setPosition(settings.bubblePosition);
  }, [settings.bubblePosition]);

  // Keep the bubble on screen when the window is resized.
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => (prev ? clampCoords(prev) : prev));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Track the drag on the window so the bubble follows the pointer in real time,
  // even when the cursor moves faster than (or leaves) the button.
  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
        return;
      }
      drag.moved = true;
      // Prevent text selection / scrolling while dragging.
      event.preventDefault();
      setPosition(clampCoords({x: drag.originX + dx, y: drag.originY + dy}));
    };

    const handleUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      dragRef.current = null;
      if (drag.moved) {
        // Suppress the click that follows a drag-release on the button.
        justDraggedRef.current = true;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        const finalPos = clampCoords({
          x: drag.originX + dx,
          y: drag.originY + dy,
        });
        setPosition(finalPos);
        void saveBubblePositionRef.current(finalPos);
      }
    };

    window.addEventListener("pointermove", handleMove, {passive: false});
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      // Only start dragging with the primary button.
      if (event.button !== 0) {
        return;
      }
      justDraggedRef.current = false;
      const origin = positionRef.current ?? defaultCoords();
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: origin.x,
        originY: origin.y,
        moved: false,
      };
    },
    [],
  );

  const handleClick = useCallback(() => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    setOpen((prev) => !prev);
  }, []);

  if (!enabled || !signedIn) {
    return null;
  }

  const dimensions = CHAT_SIZE_DIMENSIONS[settings.chatSize];
  const bubbleCoords = position ?? defaultCoords();
  const panelStyle = computePanelStyle(bubbleCoords, dimensions);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <div>
        <Slide direction="up" in={open} mountOnEnter unmountOnExit>
          <Paper
            className={classes.panel}
            elevation={16}
            style={{
              left: panelStyle.left,
              top: panelStyle.top,
              width: dimensions.width,
              height: dimensions.height,
            }}
          >
            <ChatPanel />
          </Paper>
        </Slide>

        <div
          className={classes.container}
          style={{left: bubbleCoords.x, top: bubbleCoords.y}}
        >
          <Fab
            color="primary"
            className={classes.fab}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onDragStart={(event) => event.preventDefault()}
            draggable={false}
            aria-label={open ? "Close chat" : "Open chat"}
          >
            {open ? <CloseIcon /> : <ChatIcon />}
          </Fab>
        </div>
      </div>
    </ClickAwayListener>
  );
}
