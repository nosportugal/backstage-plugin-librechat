import {useState, useEffect} from "react";
import type {ReactNode} from "react";
import {makeStyles, Theme} from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import Link from "@material-ui/core/Link";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import SaveIcon from "@material-ui/icons/Save";
import DeleteIcon from "@material-ui/icons/Delete";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import {useApi, configApiRef} from "@backstage/frontend-plugin-api";
import {useLibreChatSettings, ChatSize} from "../hooks/useLibreChatSettings";
import {useLibreChatAuth} from "../hooks/useLibreChatAuth";

const DEFAULT_API_KEY_DESCRIPTION = "Enter your Librechat key.";

/** Matches Markdown-style links: [label](url). */
const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

/** Only allow safe URL schemes to avoid e.g. javascript: injection. */
function isSafeUrl(url: string): boolean {
  return /^(https?:\/\/|mailto:)/i.test(url.trim());
}

/**
 * Render text that may contain Markdown-style links into React nodes.
 * Unsafe or malformed links fall back to plain text.
 */
function renderDescription(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  LINK_PATTERN.lastIndex = 0;
  let match = LINK_PATTERN.exec(text);
  while (match !== null) {
    const [full, label, url] = match;
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (isSafeUrl(url)) {
      nodes.push(
        <Link
          key={key++}
          href={url.trim()}
          target="_blank"
          rel="noopener noreferrer"
        >
          {label}
        </Link>,
      );
    } else {
      nodes.push(label);
    }
    lastIndex = match.index + full.length;
    match = LINK_PATTERN.exec(text);
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    position: "relative",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(1, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    gap: theme.spacing(1),
    minHeight: 48,
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  content: {
    flex: 1,
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    overflow: "auto",
  },
  description: {
    fontSize: "0.85rem",
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
  },
  apiKeyRow: {
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "flex-start",
  },
  apiKeyField: {
    flex: 1,
  },
  sizeGroup: {
    alignSelf: "flex-start",
  },
  fieldLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    marginBottom: theme.spacing(0.5),
  },
  actions: {
    position: "absolute",
    bottom: theme.spacing(2),
    right: theme.spacing(2),
    display: "flex",
    gap: theme.spacing(1),
    zIndex: 1,
  },
  actionButton: {
    background: theme.palette.background.paper,
    boxShadow: theme.shadows[3],
    "&:hover": {
      background: theme.palette.action.hover,
    },
  },
  saveButton: {
    color: theme.palette.primary.main,
  },
  clearButton: {
    color: theme.palette.error.main,
  },
  success: {
    position: "absolute",
    bottom: theme.spacing(3),
    left: theme.spacing(2),
    color: theme.palette.success?.main ?? "#4caf50",
    fontSize: "0.85rem",
    zIndex: 1,
  },
  connectionCard: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    padding: theme.spacing(1.5),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  },
  connectionStatus: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    fontSize: "0.9rem",
  },
  connectionActions: {
    display: "flex",
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5),
  },
  statusOk: {
    color: theme.palette.success?.main ?? "#4caf50",
  },
  statusError: {
    color: theme.palette.error.main,
  },
}));

interface SettingsTabProps {
  onBack: () => void;
}

const CHAT_SIZE_OPTIONS: {value: ChatSize; label: string}[] = [
  {value: "small", label: "Small"},
  {value: "medium", label: "Medium"},
  {value: "large", label: "Large"},
];

export function SettingsTab({onBack}: SettingsTabProps) {
  const classes = useStyles();
  const configApi = useApi(configApiRef);
  const {settings, saveSettings, clearSettings} = useLibreChatSettings();
  const auth = useLibreChatAuth();
  const isOidc = auth.method === "oidc";

  const apiKeyDescription =
    configApi.getOptionalString("librechat.apiKeyDescription") ??
    DEFAULT_API_KEY_DESCRIPTION;

  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [chatSize, setChatSize] = useState<ChatSize>(settings.chatSize);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKey(settings.apiKey);
    setChatSize(settings.chatSize);
  }, [settings]);

  // OIDC mode supersedes per-user keys: drop a previously stored key once,
  // matching the Excel add-in's legacy-key cleanup. Keys stored while in
  // apiKey mode are never touched.
  useEffect(() => {
    if (isOidc && settings.apiKey) {
      void clearSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOidc]);

  const handleSave = async () => {
    await saveSettings({apiKey, chatSize});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSizeChange = async (size: ChatSize) => {
    setChatSize(size);
    await saveSettings({apiKey, chatSize: size});
  };

  const handleClear = async () => {
    await clearSettings();
    setApiKey("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <IconButton size="small" onClick={onBack} title="Back to chat">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography className={classes.headerTitle}>Settings</Typography>
      </div>

      <div className={classes.content}>
        {!isOidc && (
          <>
            <Typography className={classes.description}>
              {renderDescription(apiKeyDescription)}
            </Typography>

            <div className={classes.apiKeyRow}>
              <TextField
                className={classes.apiKeyField}
                label="API Key"
                variant="outlined"
                size="small"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your LibreChat API key"
                helperText="Overrides the server-configured API key"
              />
            </div>
          </>
        )}

        {isOidc && (
          <div className={classes.connectionCard}>
            <Typography className={classes.fieldLabel}>Connection</Typography>
            <div className={classes.connectionStatus}>
              {auth.status === "connected" && (
                <>
                  <CheckCircleIcon
                    className={classes.statusOk}
                    fontSize="small"
                  />
                  <Typography component="span">
                    Connected{auth.userLabel ? ` as ${auth.userLabel}` : ""}
                  </Typography>
                </>
              )}
              {auth.status === "connecting" && (
                <Typography component="span">Waiting for sign-in…</Typography>
              )}
              {auth.status === "loading" && (
                <Typography component="span">Checking connection…</Typography>
              )}
              {auth.status === "disconnected" && (
                <>
                  <ErrorOutlineIcon
                    className={classes.statusError}
                    fontSize="small"
                  />
                  <Typography component="span">Not connected</Typography>
                </>
              )}
            </div>
            {auth.error && (
              <Typography className={classes.statusError} variant="body2">
                {auth.error}
              </Typography>
            )}
            <div className={classes.connectionActions}>
              {auth.status === "connected" ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void auth.disconnect()}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  disabled={
                    auth.status === "connecting" || auth.status === "loading"
                  }
                  onClick={() => void auth.connect()}
                >
                  Sign in
                </Button>
              )}
            </div>
          </div>
        )}

        <div>
          <Typography className={classes.fieldLabel}>Chat size</Typography>
          <ButtonGroup
            className={classes.sizeGroup}
            size="small"
            color="primary"
            aria-label="Chat window size"
          >
            {CHAT_SIZE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={chatSize === option.value ? "contained" : "outlined"}
                onClick={() => handleSizeChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </ButtonGroup>
        </div>

        <div className={classes.actions}>
          {!isOidc && (
            <>
              <IconButton
                className={`${classes.actionButton} ${classes.saveButton}`}
                size="small"
                onClick={handleSave}
                title="Save settings"
                aria-label="Save settings"
              >
                <SaveIcon fontSize="small" />
              </IconButton>
              <IconButton
                className={`${classes.actionButton} ${classes.clearButton}`}
                size="small"
                onClick={handleClear}
                title="Clear settings"
                aria-label="Clear settings"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </div>

        {saved && (
          <Typography className={classes.success}>Settings saved!</Typography>
        )}
      </div>
    </div>
  );
}
