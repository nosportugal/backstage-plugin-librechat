import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Paper,
  Snackbar,
  Switch,
  FormControlLabel,
} from '@material-ui/core';
import { useAdminConfig } from '../../hooks/useAdminConfig';
import { AgentConfigForm } from './AgentConfigForm';
import { AppearanceConfigForm } from './AppearanceConfigForm';
import { AccessControlForm } from './AccessControlForm';
import type { BubblePosition } from '@internal/plugin-librechat-common';

export const AdminPanel: React.FC = () => {
  const { config, agents, isLoading, isSaving, error, updateConfig } = useAdminConfig();

  const [agentId, setAgentId] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [bubblePosition, setBubblePosition] = useState<BubblePosition>('bottom-right');
  const [enabled, setEnabled] = useState(true);
  const [allowedGroups, setAllowedGroups] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config) {
      setAgentId(config.agentId ?? '');
      setGreetingMessage(config.greetingMessage ?? '');
      setBubblePosition(config.bubblePosition);
      setEnabled(config.enabled);
      setAllowedGroups(config.allowedGroups ?? []);
    }
  }, [config]);

  const handleSave = async () => {
    await updateConfig({
      agentId,
      greetingMessage,
      bubblePosition,
      enabled,
      allowedGroups,
    });
    setSaved(true);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress role="progressbar" />
      </Box>
    );
  }

  return (
    <Paper style={{ padding: 24, maxWidth: 600 }}>
      <Typography variant="h5" gutterBottom>
        LibreChat Configuration
      </Typography>

      <AgentConfigForm
        agentId={agentId}
        greetingMessage={greetingMessage}
        agents={agents}
        onAgentIdChange={setAgentId}
        onGreetingChange={setGreetingMessage}
      />

      <AppearanceConfigForm bubblePosition={bubblePosition} onPositionChange={setBubblePosition} />

      <FormControlLabel
        control={<Switch checked={enabled} onChange={e => setEnabled(e.target.checked)} />}
        label="Enable Chat Bubble"
      />

      <AccessControlForm allowedGroups={allowedGroups} onGroupsChange={setAllowedGroups} />

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={isSaving}
          aria-label="save"
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </Box>

      {error && <Snackbar open autoHideDuration={5000} message={error} />}

      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        message="Configuration saved successfully"
      />
    </Paper>
  );
};
