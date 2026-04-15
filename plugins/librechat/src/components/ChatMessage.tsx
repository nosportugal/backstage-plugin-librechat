import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {makeStyles, Theme} from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import type {ChatMessage as ChatMessageType} from "../api";

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    marginBottom: theme.spacing(1.5),
  },
  userRow: {
    alignItems: "flex-end",
  },
  assistantRow: {
    alignItems: "flex-start",
  },
  label: {
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase",
    color: theme.palette.text.secondary,
    marginBottom: 2,
    paddingLeft: theme.spacing(0.5),
    paddingRight: theme.spacing(0.5),
  },
  bubble: {
    maxWidth: "85%",
    padding: theme.spacing(1, 1.5),
    borderRadius: 12,
    wordBreak: "break-word",
    "& p": {
      margin: 0,
    },
    "& p + p": {
      marginTop: theme.spacing(1),
    },
    "& pre": {
      background: theme.palette.type === "dark" ? "#1e1e1e" : "#f5f5f5",
      borderRadius: 6,
      padding: theme.spacing(1),
      overflowX: "auto",
      fontSize: "0.85em",
    },
    "& code": {
      fontSize: "0.85em",
      fontFamily: '"Roboto Mono", monospace',
    },
    "& ul, & ol": {
      marginTop: theme.spacing(0.5),
      marginBottom: theme.spacing(0.5),
      paddingLeft: theme.spacing(2.5),
    },
    "& a": {
      color: theme.palette.primary.main,
    },
    "& table": {
      borderCollapse: "collapse",
      "& th, & td": {
        border: `1px solid ${theme.palette.divider}`,
        padding: theme.spacing(0.5, 1),
      },
    },
  },
  userBubble: {
    background: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    background: theme.palette.type === "dark" ? "#2d2d2d" : "#f0f0f0",
    color: theme.palette.text.primary,
    borderBottomLeftRadius: 4,
  },
}));

interface ChatMessageProps {
  message: ChatMessageType;
  agentName?: string;
}

export function ChatMessage({message, agentName}: ChatMessageProps) {
  const classes = useStyles();
  const isUser = message.role === "user";

  return (
    <div
      className={`${classes.root} ${
        isUser ? classes.userRow : classes.assistantRow
      }`}
    >
      <Typography className={classes.label}>
        {isUser ? "You" : agentName || "AI"}
      </Typography>
      <div
        className={`${classes.bubble} ${
          isUser ? classes.userBubble : classes.assistantBubble
        }`}
      >
        {isUser ? (
          <Typography variant="body2">{message.content}</Typography>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
