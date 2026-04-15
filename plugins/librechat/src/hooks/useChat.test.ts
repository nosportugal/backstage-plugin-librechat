import { renderHook, act } from '@testing-library/react';
import { useChat } from './useChat';

// Mock the API
const mockSendMessage = jest.fn();
const mockListMessages = jest.fn();
const mockStreamResponse = jest.fn();

jest.mock('@backstage/core-plugin-api', () => ({
  useApi: jest.fn().mockReturnValue({
    sendMessage: (...args: unknown[]) => mockSendMessage(...args),
    listMessages: (...args: unknown[]) => mockListMessages(...args),
    streamResponse: (...args: unknown[]) => mockStreamResponse(...args),
  }),
}));

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListMessages.mockResolvedValue({ items: [], hasMore: false });
    mockSendMessage.mockResolvedValue({
      userMessage: {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Hello',
        status: 'delivered',
        createdAt: new Date().toISOString(),
      },
      streamUrl: '/api/librechat/conversations/conv-1/stream?messageId=msg-2',
    });
    mockStreamResponse.mockReturnValue(() => {});
  });

  it('should initialize with empty messages', () => {
    const { result } = renderHook(() => useChat('conv-1'));

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should send a message and update state', async () => {
    const { result } = renderHook(() => useChat('conv-1'));

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(mockSendMessage).toHaveBeenCalledWith('conv-1', 'Hello');
  });

  it('should handle errors when sending fails', async () => {
    mockSendMessage.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useChat('conv-1'));

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.error).toBe('Network error');
  });

  it('should clear error', async () => {
    mockSendMessage.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useChat('conv-1'));

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should return null values when conversationId is null', () => {
    const { result } = renderHook(() => useChat(null));

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
