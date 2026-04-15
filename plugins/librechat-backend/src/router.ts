import { Router, Request, Response } from 'express';
import type { LoggerService, RootConfigService } from '@backstage/backend-plugin-api';
import type { Knex } from 'knex';
import { ConversationService } from './service/ConversationService';
import { LibreChatService } from './service/LibreChatService';
import { ConfigService } from './service/ConfigService';

export interface RouterOptions {
  logger: LoggerService;
  config: RootConfigService;
  database: Knex;
  identity: {
    getIdentity: (options: { request: Request }) => Promise<
      | {
          identity: { userEntityRef: string };
        }
      | undefined
    >;
  };
  permissions: unknown;
}

function sanitizeInput(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

async function getUserRef(identity: RouterOptions['identity'], req: Request): Promise<string> {
  const result = await identity.getIdentity({ request: req });
  if (!result) throw new Error('Identity not found');
  return result.identity.userEntityRef;
}

export async function createRouter(options: RouterOptions): Promise<Router> {
  const { logger, config, database, identity } = options;
  const router = Router();

  const conversationService = new ConversationService(database);

  const baseUrl = config.getString('librechat.baseUrl');
  const apiKey = config.getString('librechat.apiKey');
  const agentId = config.getString('librechat.agentId');
  const libreChatService = new LibreChatService({ baseUrl, apiKey, agentId });
  const configService = new ConfigService(database);

  // --- Health ---
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // --- Conversations ---
  router.post('/conversations', async (req: Request, res: Response) => {
    try {
      const userRef = await getUserRef(identity, req);
      const title = req.body.title ? sanitizeInput(req.body.title) : undefined;
      const conversation = await conversationService.create(userRef, agentId, title);
      res.status(201).json(conversation);
    } catch (error) {
      logger.error('Failed to create conversation', error as Error);
      res
        .status(500)
        .json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create conversation' } });
    }
  });

  router.get('/conversations', async (req: Request, res: Response) => {
    try {
      const userRef = await getUserRef(identity, req);
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const result = await conversationService.list(userRef, limit, offset);
      res.json(result);
    } catch (error) {
      logger.error('Failed to list conversations', error as Error);
      res
        .status(500)
        .json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list conversations' } });
    }
  });

  router.delete('/conversations/:id', async (req: Request, res: Response) => {
    try {
      const userRef = await getUserRef(identity, req);
      const deleted = await conversationService.delete(req.params.id, userRef);
      if (!deleted) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
        return;
      }
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete conversation', error as Error);
      res
        .status(500)
        .json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete conversation' } });
    }
  });

  // --- Messages ---
  router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      const userRef = await getUserRef(identity, req);
      const rawContent = req.body.content;

      if (!rawContent || typeof rawContent !== 'string') {
        res
          .status(400)
          .json({ error: { code: 'VALIDATION_ERROR', message: 'Content is required' } });
        return;
      }

      const content = sanitizeInput(rawContent);

      if (content.length === 0) {
        res
          .status(400)
          .json({ error: { code: 'VALIDATION_ERROR', message: 'Content cannot be empty' } });
        return;
      }

      if (content.length > 10000) {
        res
          .status(400)
          .json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Content exceeds maximum length of 10,000 characters',
            },
          });
        return;
      }

      const conversation = await conversationService.getById(req.params.id, userRef);
      if (!conversation) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
        return;
      }

      const userMessage = await conversationService.addMessage(req.params.id, 'user', content);

      // Return immediately with a stream URL for real-time AI streaming
      res.status(201).json({
        userMessage,
        streamUrl: `/conversations/${req.params.id}/stream`,
      });
    } catch (error) {
      logger.error('Failed to send message', error as Error);
      res
        .status(500)
        .json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to send message' } });
    }
  });

  router.get('/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      const userRef = await getUserRef(identity, req);
      const conversation = await conversationService.getById(req.params.id, userRef);
      if (!conversation) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
        return;
      }

      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const before = req.query.before as string | undefined;
      const result = await conversationService.listMessages(req.params.id, limit, before);
      res.json(result);
    } catch (error) {
      logger.error('Failed to list messages', error as Error);
      res
        .status(500)
        .json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list messages' } });
    }
  });

  // --- Admin Config ---
  router.get('/admin/config', async (_req: Request, res: Response) => {
    try {
      const config = await configService.getConfig();
      res.json(config);
    } catch (error) {
      logger.error('Failed to get config', error as Error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get config' } });
    }
  });

  router.put('/admin/config', async (req: Request, res: Response) => {
    try {
      const userRef = await getUserRef(identity, req);
      const config = await configService.updateConfig(req.body, userRef);
      res.json(config);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid bubble position')) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
        return;
      }
      logger.error('Failed to update config', error as Error);
      res
        .status(500)
        .json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update config' } });
    }
  });

  router.get('/admin/agents', async (_req: Request, res: Response) => {
    try {
      // Return the configured agent; in future, query LibreChat /models endpoint
      res.json([{ id: agentId, name: agentId }]);
    } catch (error) {
      logger.error('Failed to list agents', error as Error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list agents' } });
    }
  });

  // --- SSE Streaming ---
  router.get('/conversations/:id/stream', async (req: Request, res: Response) => {
    try {
      const userRef = await getUserRef(identity, req);
      const conversation = await conversationService.getById(req.params.id, userRef);
      if (!conversation) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
        return;
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Stream from LibreChat in real time
      try {
        const history = await conversationService.listMessages(req.params.id, 50);
        const messages = history.items.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        let fullContent = '';
        for await (const event of libreChatService.streamMessage(messages, conversation.agentId)) {
          if (event.type === 'token') {
            fullContent += event.content;
            res.write(`data: ${JSON.stringify({ content: event.content })}\n\n`);
          } else if (event.type === 'done') {
            // Save the full assistant message
            await conversationService.addMessage(req.params.id, 'assistant', fullContent);
            res.write('data: [DONE]\n\n');
          }
        }
      } catch (streamError) {
        logger.error('Stream error', streamError as Error);
        res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      }

      res.end();
    } catch (error) {
      logger.error('Failed to start stream', error as Error);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to start stream' } });
      }
    }
  });

  logger.info('LibreChat backend plugin initialized');
  return router;
}
