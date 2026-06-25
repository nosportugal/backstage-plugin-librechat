import React, {useState} from "react";
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
} from "../hooks/useLibreChatSettings";

const useStyles = makeStyles((theme: Theme) => ({
  container: {
    position: "fixed",
    bottom: theme.spacing(3),
    right: theme.spacing(3),
    zIndex: theme.zIndex.tooltip + 1,
  },
  fab: {
    boxShadow: theme.shadows[6],
  },
  panel: {
    position: "fixed",
    bottom: theme.spacing(3) + 56 + 12, // fab height + gap
    right: theme.spacing(3),
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

export function ChatBubble() {
  const classes = useStyles();
  const enabled = useIsEnabled();
  const signedIn = useIsSignedIn();
  const {settings} = useLibreChatSettings();
  const [open, setOpen] = useState(false);

  if (!enabled || !signedIn) {
    return null;
  }

  const dimensions = CHAT_SIZE_DIMENSIONS[settings.chatSize];

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <div>
        <Slide direction="up" in={open} mountOnEnter unmountOnExit>
          <Paper
            className={classes.panel}
            elevation={16}
            style={{width: dimensions.width, height: dimensions.height}}
          >
            <ChatPanel />
          </Paper>
        </Slide>

        <div className={classes.container}>
          <Fab
            color="primary"
            className={classes.fab}
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? "Close chat" : "Open chat"}
          >
            {open ? <CloseIcon /> : <ChatIcon />}
          </Fab>
        </div>
      </div>
    </ClickAwayListener>
  );
}
