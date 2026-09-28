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
import HistoryIcon from "@material-ui/icons/History";
import AddIcon from "@material-ui/icons/Add";
import {useApi, configApiRef} from "@backstage/frontend-plugin-api";
import {
  libreChatApiRef,
  ChatMessage as ChatMessageType,
  LibreChatAuthError,
} from "../api";
import {ChatMessage} from "./ChatMessage";
import {SettingsTab} from "./SettingsTab";
import {HistoryTab} from "./HistoryTab";
import {useLibreChatSettings} from "../hooks/useLibreChatSettings";
import {usePageContext} from "../hooks/usePageContext";
import {useLibreChatHistory} from "../hooks/useLibreChatHistory";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";

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
  notice: {
    margin: theme.spacing(1, 2, 0),
    padding: theme.spacing(1),
    background: theme.palette.info.light,
    color: theme.palette.info.contrastText,
    borderRadius: 6,
    fontSize: "0.75rem",
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
  const {
    conversations,
    activeConversationId: storedActiveConversationId,
    retentionNoticeShown,
    saveConversation,
    deleteConversation,
    clearAll,
    markRetentionNoticeShown,
    startNewConversation,
    selectConversation,
  } = useLibreChatHistory();

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [retentionNotice, setRetentionNotice] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    {type: "conversation"; id: string} | {type: "all"} | null
  >(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current || !storedActiveConversationId) return;
    const activeConversation = conversations.find(
      (conversation) => conversation.id === storedActiveConversationId,
    );
    if (activeConversation) {
      setMessages(activeConversation.messages);
      setConversationId(activeConversation.id);
    }
    restoredRef.current = true;
  }, [conversations, storedActiveConversationId]);

  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

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
      // Inject page context into the latest user message. The clean message
      // list remains in local history; context is request-only metadata.
      const contextSuffix = [
        "",
        "[Page context]",
        `Title: ${pageContext.title}`,
        `Path: ${pageContext.path}`,
        `URL: ${pageContext.url}`,
      ].join("\n");

      const messagesWithContext = updatedMessages.map((msg, idx) =>
        idx === updatedMessages.length - 1 && msg.role === "user"
          ? {...msg, content: `${msg.content}${contextSuffix}`}
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

      // Only completed exchanges enter local history. An interrupted or empty
      // response leaves the user question visible until the panel is closed.
      if (accumulated && !abortRef.current) {
        const completedMessages = [
          ...updatedMessages,
          {
            role: "assistant" as const,
            content: accumulated,
          },
        ];
        const result = await saveConversation(
          completedMessages,
          conversationId,
        );
        if (result?.evicted && !retentionNoticeShown) {
          setRetentionNotice(true);
          await markRetentionNoticeShown();
        }
        if (result) {
          setConversationId(result.id);
        }
      } else {
        setMessages(updatedMessages);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(
        err instanceof LibreChatAuthError
          ? `${msg} Open Settings to sign in again.`
          : msg,
      );
      // Remove the empty assistant placeholder on error
      setMessages(updatedMessages);
    } finally {
      setIsStreaming(false);
    }
  }, [
    conversationId,
    input,
    isStreaming,
    libreChatApi,
    markRetentionNoticeShown,
    messages,
    pageContext,
    retentionNoticeShown,
    saveConversation,
    settings,
  ]);

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
    if (isStreaming) return;
    setMessages([]);
    setConversationId(null);
    setError(null);
    setInput("");
    setRetentionNotice(false);
    void startNewConversation();
  }, [isStreaming, startNewConversation]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (isStreaming) return;
      const conversation = conversations.find((item) => item.id === id);
      if (!conversation) return;
      setMessages(conversation.messages);
      setConversationId(conversation.id);
      setError(null);
      setRetentionNotice(false);
      setShowHistory(false);
      void selectConversation(conversation.id);
    },
    [conversations, isStreaming, selectConversation],
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      if (isStreaming) return;
      setConfirmAction({type: "conversation", id});
    },
    [isStreaming],
  );

  const handleDeleteAll = useCallback(() => {
    if (isStreaming) return;
    setConfirmAction({type: "all"});
  }, [isStreaming]);

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmAction) return;
    if (confirmAction.type === "all") {
      await clearAll();
      handleClear();
    } else {
      await deleteConversation(confirmAction.id);
      if (conversationId === confirmAction.id) {
        handleClear();
      }
    }
    setConfirmAction(null);
  }, [
    clearAll,
    confirmAction,
    conversationId,
    deleteConversation,
    handleClear,
  ]);

  if (showSettings) {
    return (
      <div className={classes.root}>
        <SettingsTab onBack={() => setShowSettings(false)} />
      </div>
    );
  }

  if (showHistory) {
    return (
      <div className={classes.root}>
        <HistoryTab
          conversations={conversations}
          activeConversationId={conversationId}
          onBack={() => setShowHistory(false)}
          onSelect={handleSelectConversation}
          onDelete={(id) => void handleDeleteConversation(id)}
          onDeleteAll={handleDeleteAll}
        />
        <Dialog
          open={Boolean(confirmAction)}
          onClose={() => setConfirmAction(null)}
          aria-labelledby="librechat-confirm-title"
        >
          <DialogTitle id="librechat-confirm-title">
            {confirmAction?.type === "all"
              ? "Delete all local chat history?"
              : "Delete this conversation?"}
          </DialogTitle>
          <DialogContent>This action cannot be undone.</DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              color="secondary"
              onClick={() => void handleConfirmDelete()}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
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
          <IconButton
            size="small"
            onClick={handleClear}
            disabled={isStreaming || messages.length === 0}
            title="New chat"
            aria-label="New chat"
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setShowHistory(true)}
            disabled={isStreaming}
            title="Chat history"
            aria-label="Chat history"
          >
            <HistoryIcon fontSize="small" />
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

      {retentionNotice && (
        <div className={classes.notice} role="status">
          Only the five most recent conversations are saved locally.
        </div>
      )}
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

      <Dialog
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        aria-labelledby="librechat-confirm-title"
      >
        <DialogTitle id="librechat-confirm-title">
          {confirmAction?.type === "all"
            ? "Delete all local chat history?"
            : "Delete this conversation?"}
        </DialogTitle>
        <DialogContent>This action cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button color="secondary" onClick={() => void handleConfirmDelete()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
