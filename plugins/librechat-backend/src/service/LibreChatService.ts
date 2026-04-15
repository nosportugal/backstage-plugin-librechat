import OpenAI from 'openai';

interface LibreChatServiceOptions {
  baseUrl: string;
  apiKey: string;
  agentId: string;
}

export class LibreChatService {
  private readonly client: OpenAI;
  private readonly defaultAgentId: string;

  constructor(options: LibreChatServiceOptions) {
    const baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.client = new OpenAI({
      baseURL: `${baseUrl}/api/agents/v1`,
      apiKey: options.apiKey,
    });
    this.defaultAgentId = options.agentId;
  }

  async sendMessage(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    agentId?: string,
  ): Promise<{ role: 'assistant'; content: string }> {
    const response = await this.client.chat.completions.create({
      model: agentId || this.defaultAgentId,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
    });

    const choice = response.choices[0];
    return {
      role: 'assistant',
      content: choice?.message?.content ?? '',
    };
  }

  async *streamMessage(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    agentId?: string,
  ): AsyncGenerator<{ type: 'token'; content: string } | { type: 'done'; totalTokens: number }> {
    const stream = await this.client.chat.completions.create({
      model: agentId || this.defaultAgentId,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
    });

    let totalTokens = 0;
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        totalTokens++;
        yield { type: 'token', content: delta.content };
      }
    }
    yield { type: 'done', totalTokens };
  }
}
