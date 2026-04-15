import React from 'react';
import { TextField, MenuItem, Box, Typography } from '@material-ui/core';
import type { BubblePosition } from '@internal/plugin-librechat-common';

interface AppearanceConfigFormProps {
  bubblePosition: BubblePosition;
  onPositionChange: (value: BubblePosition) => void;
}

const POSITION_OPTIONS: { value: BubblePosition; label: string }[] = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
];

export const AppearanceConfigForm: React.FC<AppearanceConfigFormProps> = ({
  bubblePosition,
  onPositionChange,
}) => {
  return (
    <Box mb={3}>
      <Typography variant="h6" gutterBottom>
        Appearance
      </Typography>
      <TextField
        select
        fullWidth
        label="Bubble Position"
        value={bubblePosition}
        onChange={e => onPositionChange(e.target.value as BubblePosition)}
        variant="outlined"
        margin="normal"
      >
        {POSITION_OPTIONS.map(opt => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
};
