import React from 'react';
import { TextField, MenuItem, Box, Typography } from '@material-ui/core';
import type { AgentInfo } from '@internal/plugin-librechat-common';

interface AgentConfigFormProps {
  agentId: string;
  greetingMessage: string;
  agents: AgentInfo[];
  onAgentIdChange: (value: string) => void;
  onGreetingChange: (value: string) => void;
}

export const AgentConfigForm: React.FC<AgentConfigFormProps> = ({
  agentId,
  greetingMessage,
  agents,
  onAgentIdChange,
  onGreetingChange,
}) => {
  return (
    <Box mb={3}>
      <Typography variant="h6" gutterBottom>
        Agent Configuration
      </Typography>
      <TextField
        select
        fullWidth
        label="Agent"
        value={agentId}
        onChange={e => onAgentIdChange(e.target.value)}
        variant="outlined"
        margin="normal"
      >
        {agents.map(agent => (
          <MenuItem key={agent.id} value={agent.id}>
            {agent.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        fullWidth
        label="Greeting Message"
        value={greetingMessage}
        onChange={e => onGreetingChange(e.target.value)}
        variant="outlined"
        margin="normal"
        multiline
        rows={3}
      />
    </Box>
  );
};
