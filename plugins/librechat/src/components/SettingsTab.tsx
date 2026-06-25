import {useState, useEffect} from "react";
import {makeStyles, Theme} from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import SaveIcon from "@material-ui/icons/Save";
import DeleteIcon from "@material-ui/icons/Delete";
import {useLibreChatSettings, ChatSize} from "../hooks/useLibreChatSettings";

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
  const {settings, saveSettings, clearSettings} = useLibreChatSettings();

  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [chatSize, setChatSize] = useState<ChatSize>(settings.chatSize);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKey(settings.apiKey);
    setChatSize(settings.chatSize);
  }, [settings]);

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
        <Typography className={classes.description}>
          Enter your Librechat key.
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
        </div>

        {saved && (
          <Typography className={classes.success}>Settings saved!</Typography>
        )}
      </div>
    </div>
  );
}
