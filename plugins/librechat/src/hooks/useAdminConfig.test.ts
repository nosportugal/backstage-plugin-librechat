import { renderHook, act } from '@testing-library/react';
import { useAdminConfig } from './useAdminConfig';

const mockGetConfig = jest.fn();
const mockUpdateConfig = jest.fn();
const mockListAgents = jest.fn();

jest.mock('@backstage/core-plugin-api', () => ({
  useApi: jest.fn().mockReturnValue({
    getConfig: (...args: unknown[]) => mockGetConfig(...args),
    updateConfig: (...args: unknown[]) => mockUpdateConfig(...args),
    listAgents: (...args: unknown[]) => mockListAgents(...args),
  }),
}));

describe('useAdminConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConfig.mockResolvedValue({
      agentId: 'agent_test',
      greetingMessage: 'Hello!',
      bubblePosition: 'bottom-right',
      enabled: true,
      allowedGroups: [],
      updatedAt: new Date().toISOString(),
      updatedBy: 'user:default/admin',
    });
    mockListAgents.mockResolvedValue([{ id: 'agent_test', name: 'Test Agent' }]);
    mockUpdateConfig.mockResolvedValue({
      agentId: 'agent_test',
      greetingMessage: 'Updated!',
      bubblePosition: 'bottom-right',
      enabled: true,
      allowedGroups: [],
      updatedAt: new Date().toISOString(),
      updatedBy: 'user:default/admin',
    });
  });

  it('should load config and agents on mount', async () => {
    const { result } = renderHook(() => useAdminConfig());

    await act(async () => {});

    expect(mockGetConfig).toHaveBeenCalled();
    expect(mockListAgents).toHaveBeenCalled();
    expect(result.current.config).not.toBeNull();
  });

  it('should update config', async () => {
    const { result } = renderHook(() => useAdminConfig());

    await act(async () => {});

    await act(async () => {
      await result.current.updateConfig({ greetingMessage: 'Updated!' });
    });

    expect(mockUpdateConfig).toHaveBeenCalledWith({ greetingMessage: 'Updated!' });
  });

  it('should handle errors', async () => {
    mockGetConfig.mockRejectedValue(new Error('Failed to load'));

    const { result } = renderHook(() => useAdminConfig());

    await act(async () => {});

    expect(result.current.error).toBe('Failed to load');
  });
});
