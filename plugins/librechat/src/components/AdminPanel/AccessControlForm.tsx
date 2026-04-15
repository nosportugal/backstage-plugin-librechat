import React from 'react';
import { TextField, Box, Typography } from '@material-ui/core';

interface AccessControlFormProps {
  allowedGroups: string[];
  onGroupsChange: (groups: string[]) => void;
}

export const AccessControlForm: React.FC<AccessControlFormProps> = ({
  allowedGroups,
  onGroupsChange,
}) => {
  const handleChange = (value: string) => {
    const groups = value
      .split(',')
      .map(g => g.trim())
      .filter(Boolean);
    onGroupsChange(groups);
  };

  return (
    <Box mb={3}>
      <Typography variant="h6" gutterBottom>
        Access Control
      </Typography>
      <TextField
        fullWidth
        label="Allowed Groups"
        value={allowedGroups.join(', ')}
        onChange={e => handleChange(e.target.value)}
        variant="outlined"
        margin="normal"
        helperText="Comma-separated list of Backstage group entity refs (e.g., group:default/engineering). Leave empty to allow all."
      />
    </Box>
  );
};
