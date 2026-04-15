import React, {useState, useEffect} from "react";
import {makeStyles, Theme} from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import CheckIcon from "@material-ui/icons/Check";
import {useApi} from "@backstage/frontend-plugin-api";
import {libreChatApiRef} from "../api";
import {useLibreChatSettings} from "../hooks/useLibreChatSettings";

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
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
  testButton: {
    marginTop: 2,
    minWidth: 40,
    width: 40,
    height: 40,
    padding: 0,
  },
  actions: {
    display: "flex",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  success: {
    color: theme.palette.success?.main ?? "#4caf50",
    fontSize: "0.85rem",
    marginTop: theme.spacing(1),
  },
}));

interface SettingsTabProps {
  onBack: () => void;
  onCheckResult?: (reply: string, error?: string) => void;
}

export function SettingsTab({onBack, onCheckResult}: SettingsTabProps) {
  const classes = useStyles();
  const libreChatApi = useApi(libreChatApiRef);
  const {settings, saveSettings, clearSettings} = useLibreChatSettings();

  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setApiKey(settings.apiKey);
  }, [settings]);

  const handleTest = async () => {
    if (!apiKey.trim()) return;

    setTesting(true);
    try {
      const reply = await libreChatApi.checkApiKey(apiKey.trim());
      onCheckResult?.(reply);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection failed";
      onCheckResult?.("", message);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    await saveSettings({apiKey});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
        <Typography className={classes.description}>
          Enter your LibreChat API key. Leave blank to use the default key set
          by your Backstage administrator.
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
          <Button
            className={classes.testButton}
            variant="outlined"
            color="primary"
            size="small"
            disabled={!apiKey.trim() || testing}
            onClick={handleTest}
            title="Check API key — sends a test message"
          >
            {testing ? <CircularProgress size={20} /> : <CheckIcon />}
          </Button>
        </div>

        <div className={classes.actions}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleSave}
          >
            Save
          </Button>
          <Button variant="outlined" size="small" onClick={handleClear}>
            Clear
          </Button>
        </div>

        {saved && (
          <Typography className={classes.success}>Settings saved!</Typography>
        )}
      </div>
    </div>
  );
}
