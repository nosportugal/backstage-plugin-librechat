import React, { useState, useEffect } from 'react';
import { makeStyles, Theme } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CircularProgress from '@material-ui/core/CircularProgress';
import MenuItem from '@material-ui/core/MenuItem';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import CheckIcon from '@material-ui/icons/Check';
import { useApi } from '@backstage/frontend-plugin-api';
import { libreChatApiRef, Agent } from '../api';
import { useLibreChatSettings } from '../hooks/useLibreChatSettings';

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    gap: theme.spacing(1),
    minHeight: 48,
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  content: {
    flex: 1,
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    overflow: 'auto',
  },
  description: {
    fontSize: '0.85rem',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
  },
  apiKeyRow: {
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'flex-start',
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
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    fontSize: '0.85rem',
  },
  successText: {
    color: theme.palette.success?.main ?? '#4caf50',
    fontSize: '0.85rem',
  },
  errorText: {
    color: theme.palette.error.main,
    fontSize: '0.85rem',
  },
  actions: {
    display: 'flex',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  success: {
    color: theme.palette.success?.main ?? '#4caf50',
    fontSize: '0.85rem',
    marginTop: theme.spacing(1),
  },
}));

interface SettingsTabProps {
  onBack: () => void;
}

export function SettingsTab({ onBack }: SettingsTabProps) {
  const classes = useStyles();
  const libreChatApi = useApi(libreChatApiRef);
  const { settings, saveSettings, clearSettings } = useLibreChatSettings();

  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [agentId, setAgentId] = useState(settings.agentId);
  const [agentName, setAgentName] = useState(settings.agentName);
  const [saved, setSaved] = useState(false);

  // Agent listing state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  useEffect(() => {
    setApiKey(settings.apiKey);
    setAgentId(settings.agentId);
    setAgentName(settings.agentName);
  }, [settings]);

  const handleTest = async () => {
    if (!apiKey.trim()) return;

    setTesting(true);
    setTestStatus('idle');
    setTestError('');
    setAgents([]);

    try {
      const result = await libreChatApi.listAgents(apiKey.trim());
      setAgents(result);
      setTestStatus('success');

      // If we have agents and no agent is selected, pick the first one
      if (result.length > 0 && !agentId) {
        setAgentId(result[0].id);
        setAgentName(result[0].name);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setTestStatus('error');
      setTestError(message);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    await saveSettings({ apiKey, agentId, agentName });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = async () => {
    await clearSettings();
    setApiKey('');
    setAgentId('');
    setAgentName('');
    setAgents([]);
    setTestStatus('idle');
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
          Override the default LibreChat configuration. Leave blank to use the
          defaults set by your Backstage administrator.
        </Typography>

        <div className={classes.apiKeyRow}>
          <TextField
            className={classes.apiKeyField}
            label="API Key"
            variant="outlined"
            size="small"
            type="password"
            value={apiKey}
            onChange={e => {
              setApiKey(e.target.value);
              // Reset test state when key changes
              if (testStatus !== 'idle') {
                setTestStatus('idle');
                setAgents([]);
              }
            }}
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
          >
            {testing ? <CircularProgress size={20} /> : <CheckIcon />}
          </Button>
        </div>

        {testStatus === 'success' && (
          <div className={classes.statusRow}>
            <CheckCircleIcon style={{ fontSize: 16, color: '#4caf50' }} />
            <Typography className={classes.successText}>
              Connected — {agents.length} agent{agents.length !== 1 ? 's' : ''} found
            </Typography>
          </div>
        )}

        {testStatus === 'error' && (
          <div className={classes.statusRow}>
            <ErrorIcon style={{ fontSize: 16 }} color="error" />
            <Typography className={classes.errorText}>
              {testError}
            </Typography>
          </div>
        )}

        {agents.length > 0 ? (
          <TextField
            label="Agent"
            variant="outlined"
            size="small"
            select
            fullWidth
            value={agentId}
            onChange={e => {
              const id = e.target.value;
              setAgentId(id);
              const match = agents.find(a => a.id === id);
              setAgentName(match?.name ?? id);
            }}
            helperText="Select the agent to use for conversations"
          >
            {agents.map(agent => (
              <MenuItem key={agent.id} value={agent.id}>
                {agent.name}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <TextField
            label="Agent ID"
            variant="outlined"
            size="small"
            fullWidth
            value={agentId}
            onChange={e => setAgentId(e.target.value)}
            placeholder="e.g. agent_abc123"
            helperText="Enter your API key and click Test to load agents, or type an ID manually"
          />
        )}

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
