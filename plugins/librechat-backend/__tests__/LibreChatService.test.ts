import { LibreChatService } from '../src/service/LibreChatService';

// Mock the openai module
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: { role: 'assistant', content: 'Hello! I can help with that.' },
                finish_reason: 'stop',
              },
            ],
            usage: { total_tokens: 42 },
          }),
        },
      },
    })),
  };
});

describe('LibreChatService', () => {
  let service: LibreChatService;

  beforeEach(() => {
    service = new LibreChatService({
      baseUrl: 'http://localhost:3080',
      apiKey: 'test-api-key',
      agentId: 'agent_test123',
    });
  });

  describe('sendMessage', () => {
    it('should send a message and return the assistant response', async () => {
      const result = await service.sendMessage(
        [{ role: 'user', content: 'Hello' }],
        'agent_test123',
      );

      expect(result).toHaveProperty('role', 'assistant');
      expect(result).toHaveProperty('content');
      expect(typeof result.content).toBe('string');
    });

    it('should pass message history to the API', async () => {
      const messages = [
        { role: 'user' as const, content: 'First message' },
        { role: 'assistant' as const, content: 'First response' },
        { role: 'user' as const, content: 'Second message' },
      ];

      const result = await service.sendMessage(messages, 'agent_test123');

      expect(result).toHaveProperty('content');
    });
  });
});
