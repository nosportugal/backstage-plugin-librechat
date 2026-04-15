import { LibreChatClient } from './LibreChatClient';

describe('LibreChatClient', () => {
  let client: LibreChatClient;

  const mockFetchApi = {
    fetch: jest.fn(),
  };

  const mockDiscoveryApi = {
    getBaseUrl: jest.fn().mockResolvedValue('http://localhost:7007/api/librechat'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    client = new LibreChatClient({
      discoveryApi: mockDiscoveryApi,
      fetchApi: mockFetchApi,
    });
  });

  describe('streamResponse', () => {
    it('should call onToken for each SSE data chunk', async () => {
      const onToken = jest.fn();
      const onDone = jest.fn();
      const onError = jest.fn();

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"content":"Hello"}\n\n'));
          controller.enqueue(encoder.encode('data: {"content":" World"}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      mockFetchApi.fetch.mockResolvedValue({
        ok: true,
        body: stream,
        statusText: 'OK',
      });

      const cancel = client.streamResponse('/stream-url', {
        onToken,
        onDone,
        onError,
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(onToken).toHaveBeenCalledWith('Hello');
      expect(onToken).toHaveBeenCalledWith(' World');
      expect(onDone).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('should call onError on failed fetch', async () => {
      const onToken = jest.fn();
      const onDone = jest.fn();
      const onError = jest.fn();

      mockFetchApi.fetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        body: null,
      });

      client.streamResponse('/stream-url', {
        onToken,
        onDone,
        onError,
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(onError).toHaveBeenCalled();
    });

    it('should return a cancel function', () => {
      mockFetchApi.fetch.mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
        statusText: 'OK',
      });

      const cancel = client.streamResponse('/stream-url', {});
      expect(typeof cancel).toBe('function');
    });
  });
});
