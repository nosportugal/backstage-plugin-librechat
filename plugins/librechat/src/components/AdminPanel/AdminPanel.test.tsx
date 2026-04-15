import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminPanel } from './AdminPanel';

const mockGetConfig = jest.fn();
const mockUpdateConfig = jest.fn();
const mockListAgents = jest.fn();

jest.mock('../../hooks/useAdminConfig', () => ({
  useAdminConfig: jest.fn().mockReturnValue({
    config: {
      agentId: 'agent_test',
      greetingMessage: 'Hello!',
      bubblePosition: 'bottom-right',
      enabled: true,
      allowedGroups: [],
      updatedAt: new Date().toISOString(),
      updatedBy: 'user:default/admin',
    },
    agents: [
      { id: 'agent_test', name: 'Test Agent' },
      { id: 'agent_other', name: 'Other Agent' },
    ],
    isLoading: false,
    isSaving: false,
    error: null,
    updateConfig: mockUpdateConfig,
  }),
}));

describe('AdminPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render config form with current values', () => {
    render(<AdminPanel />);

    expect(screen.getByText(/agent configuration/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hello!')).toBeInTheDocument();
  });

  it('should show save button', () => {
    render(<AdminPanel />);

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('should show loading state', () => {
    const useAdminConfig = require('../../hooks/useAdminConfig').useAdminConfig;
    useAdminConfig.mockReturnValue({
      config: null,
      agents: [],
      isLoading: true,
      isSaving: false,
      error: null,
      updateConfig: jest.fn(),
    });

    render(<AdminPanel />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should call updateConfig on save', async () => {
    render(<AdminPanel />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalled();
    });
  });
});
