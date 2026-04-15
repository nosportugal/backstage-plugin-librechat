import { renderHook, act } from '@testing-library/react';
import { useConversation } from './useConversation';

const mockCreateConversation = jest.fn();
const mockListConversations = jest.fn();
const mockDeleteConversation = jest.fn();

jest.mock('@backstage/core-plugin-api', () => ({
  useApi: jest.fn().mockReturnValue({
    createConversation: (...args: unknown[]) => mockCreateConversation(...args),
    listConversations: (...args: unknown[]) => mockListConversations(...args),
    deleteConversation: (...args: unknown[]) => mockDeleteConversation(...args),
  }),
}));

describe('useConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListConversations.mockResolvedValue({ items: [], totalCount: 0 });
    mockCreateConversation.mockResolvedValue({
      id: 'conv-new',
      userId: 'user:default/test',
      agentId: 'agent_test',
      title: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('should initialize with empty conversations', () => {
    const { result } = renderHook(() => useConversation());

    expect(result.current.conversations).toEqual([]);
    expect(result.current.activeConversation).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('should create a new conversation', async () => {
    const { result } = renderHook(() => useConversation());

    let created;
    await act(async () => {
      created = await result.current.createConversation();
    });

    expect(mockCreateConversation).toHaveBeenCalled();
    expect(created).toHaveProperty('id', 'conv-new');
  });

  it('should set active conversation', async () => {
    mockListConversations.mockResolvedValue({
      items: [
        {
          id: 'conv-1',
          userId: 'user:default/test',
          agentId: 'agent_test',
          title: 'First',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      totalCount: 1,
    });

    const { result } = renderHook(() => useConversation());

    // Wait for initial load
    await act(async () => {});

    act(() => {
      result.current.setActiveConversation('conv-1');
    });

    expect(result.current.activeConversation?.id).toBe('conv-1');
  });

  it('should delete a conversation', async () => {
    mockDeleteConversation.mockResolvedValue(undefined);

    const { result } = renderHook(() => useConversation());

    await act(async () => {
      await result.current.deleteConversation('conv-1');
    });

    expect(mockDeleteConversation).toHaveBeenCalledWith('conv-1');
  });
});
