import {useState, useRef, useEffect, useCallback, KeyboardEvent} from "react";
import {flushSync} from "react-dom";
import {makeStyles, Theme} from "@material-ui/core/styles";
import IconButton from "@material-ui/core/IconButton";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import SendIcon from "@material-ui/icons/Send";
import SettingsIcon from "@material-ui/icons/Settings";
import DeleteSweepIcon from "@material-ui/icons/DeleteSweep";
import LinkIcon from "@material-ui/icons/Link";
import {useApi, configApiRef} from "@backstage/frontend-plugin-api";
import {libreChatApiRef, ChatMessage as ChatMessageType} from "../api";
import {ChatMessage} from "./ChatMessage";
import {SettingsTab} from "./SettingsTab";
import {useLibreChatSettings} from "../hooks/useLibreChatSettings";
import {usePageContext} from "../hooks/usePageContext";

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: theme.palette.background.paper,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    minHeight: 48,
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  headerActions: {
    display: "flex",
    gap: theme.spacing(0.5),
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
  },
  emptyState: {
    display: "flex",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    color: theme.palette.text.secondary,
    textAlign: "center",
    padding: theme.spacing(3),
  },
  inputArea: {
    display: "flex",
    alignItems: "flex-end",
    padding: theme.spacing(1, 2, 2),
    gap: theme.spacing(1),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  textField: {
    flex: 1,
  },
  error: {
    margin: theme.spacing(1, 2),
    padding: theme.spacing(1),
    background: theme.palette.error.light,
    color: theme.palette.error.contrastText,
    borderRadius: 6,
    fontSize: "0.85rem",
  },
  contextBar: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.5, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    background: theme.palette.type === "dark" ? "#1a1a2e" : "#f5f7ff",
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
    overflow: "hidden",
    whiteSpace: "nowrap" as const,
    textOverflow: "ellipsis",
  },
  contextIcon: {
    fontSize: 14,
    opacity: 0.6,
  },
}));

export function ChatPanel() {
  const classes = useStyles();
  const libreChatApi = useApi(libreChatApiRef);
  const configApi = useApi(configApiRef);
  const {settings} = useLibreChatSettings();
  const pageContext = usePageContext();
  const agentName = configApi.getOptionalString("librechat.name") ?? "AI";

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setError(null);
    const userMessage: ChatMessageType = {role: "user", content: trimmed};
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);
    abortRef.current = false;

    // Add placeholder for assistant response
    const assistantMessage: ChatMessageType = {
      role: "assistant",
      content: "",
    };
    setMessages([...updatedMessages, assistantMessage]);

    try {
      // Inject page context into the latest user message
      const contextSuffix = [
        "",
        "[Page context]",
        `Title: ${pageContext.title}`,
        `Path: ${pageContext.path}`,
        `URL: ${pageContext.url}`,
      ].join("\n");

      const messagesWithContext = updatedMessages.map((msg, idx) =>
        idx === updatedMessages.length - 1 && msg.role === "user"
          ? {...msg, content: `${msg.content}\n${contextSuffix}`}
          : msg,
      );

      const stream = libreChatApi.sendMessage(messagesWithContext, {
        apiKey: settings.apiKey || undefined,
      });

      let accumulated = "";
      for await (const chunk of stream) {
        if (abortRef.current) break;
        accumulated += chunk;
        const content = accumulated;
        // Force synchronous render + wait for browser paint
        await new Promise<void>((resolve) => {
          flushSync(() => {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content,
              };
              return updated;
            });
          });
          requestAnimationFrame(() => resolve());
        });
      }

      // If accumulated is empty, remove the empty assistant message
      if (!accumulated) {
        setMessages(updatedMessages);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      // Remove the empty assistant placeholder on error
      setMessages(updatedMessages);
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, libreChatApi, settings, pageContext]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleClear = useCallback(() => {
    setMessages([]);
    setError(null);
    abortRef.current = true;
  }, []);

  if (showSettings) {
    return (
      <div className={classes.root}>
        <SettingsTab onBack={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <Typography className={classes.headerTitle}>
          {agentName} Chat
        </Typography>
        <div className={classes.headerActions}>
          <IconButton size="small" onClick={handleClear} title="Clear chat">
            <DeleteSweepIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </div>
      </div>

      <div className={classes.contextBar} title={pageContext.url}>
        <LinkIcon className={classes.contextIcon} />
        <span>{pageContext.title || pageContext.path}</span>
      </div>

      <div className={classes.messages}>
        {messages.length === 0 ? (
          <div className={classes.emptyState}>
            <Typography variant="body2" color="textSecondary">
              Send a message to start chatting with AI
            </Typography>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <ChatMessage
              key={idx}
              message={msg}
              agentName={agentName}
              loading={
                isStreaming &&
                idx === messages.length - 1 &&
                msg.role === "assistant"
              }
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className={classes.error}>{error}</div>}

      <div className={classes.inputArea}>
        <TextField
          className={classes.textField}
          variant="outlined"
          size="small"
          placeholder="Type a message..."
          multiline
          maxRows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          title="Send message"
        >
          {isStreaming ? <CircularProgress size={24} /> : <SendIcon />}
        </IconButton>
      </div>
    </div>
  );
}
