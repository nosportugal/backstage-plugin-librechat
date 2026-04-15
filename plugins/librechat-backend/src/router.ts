import {LoggerService} from "@backstage/backend-plugin-api";
import {Config} from "@backstage/config";
import express from "express";
import Router from "express-promise-router";
import fetch from "node-fetch";

/** @internal */
export interface RouterOptions {
  logger: LoggerService;
  config: Config;
}

/** Maximum allowed message content length (characters). */
const MAX_MESSAGE_LENGTH = 32_000;

/** Allowed roles for chat messages. */
const ALLOWED_ROLES = new Set(["user", "assistant", "system"]);

interface ChatMessage {
  role: string;
  content: string;
}

function validateMessages(messages: unknown): messages is ChatMessage[] {
  if (!Array.isArray(messages)) return false;
  return messages.every(
    (m) =>
      typeof m === "object" &&
      m !== null &&
      typeof m.role === "string" &&
      ALLOWED_ROLES.has(m.role) &&
      typeof m.content === "string" &&
      m.content.length > 0 &&
      m.content.length <= MAX_MESSAGE_LENGTH,
  );
}

function sanitizeAgentId(agentId: string): boolean {
  // Agent IDs should be alphanumeric with underscores/hyphens
  return /^[a-zA-Z0-9_-]+$/.test(agentId);
}

/** @internal */
export function createRouter(options: RouterOptions): express.Router {
  const {logger, config} = options;
  const router = Router();

  router.use(express.json());

  /**
   * POST /chat
   *
   * Proxies a chat completion request to LibreChat's Agents API.
   * Streams the SSE response back to the client.
   *
   * Body: { messages: Array<{ role: string, content: string }> }
   * Headers (optional overrides):
   *   x-librechat-api-key — Override the default API key
   *   x-librechat-agent-id — Override the default agent ID
   */
  router.post("/chat", async (req, res) => {
    const baseUrl = config.getString("librechat.baseUrl");
    const defaultApiKey = config.getOptionalString("librechat.apiKey");
    const agentId = config.getString("librechat.agentId");

    // Resolve API key: header override > config default
    const apiKey =
      (req.headers["x-librechat-api-key"] as string) || defaultApiKey;
    if (!apiKey) {
      res.status(400).json({
        error:
          "No API key configured. Set librechat.apiKey in app-config.yaml or provide one in Settings.",
      });
      return;
    }

    if (!sanitizeAgentId(agentId)) {
      res.status(400).json({error: "Invalid agent ID format in configuration."});
      return;
    }

    // Validate messages
    const {messages} = req.body;
    if (!validateMessages(messages)) {
      res.status(400).json({
        error:
          "Invalid messages format. Expected array of {role, content} objects.",
      });
      return;
    }

    const targetUrl = `${baseUrl.replace(/\/+$/, "")}/api/agents/v1/chat/completions`;

    logger.debug(`Proxying chat to ${targetUrl} with agent ${agentId}`);

    try {
      const upstream = await fetch(targetUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: agentId,
          messages,
          stream: true,
        }),
      });

      if (!upstream.ok) {
        const errorText = await upstream.text();
        logger.error(
          `LibreChat upstream error ${upstream.status}: ${errorText}`,
        );
        res.status(upstream.status).json({
          error: `LibreChat returned ${upstream.status}`,
          details: errorText,
        });
        return;
      }

      // Stream the SSE response back to the client
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      if (upstream.body) {
        upstream.body.on("data", (chunk: Buffer) => {
          res.write(chunk);
        });

        upstream.body.on("end", () => {
          res.end();
        });

        upstream.body.on("error", (err: Error) => {
          logger.error(`Stream error: ${err.message}`);
          res.end();
        });
      } else {
        res.status(502).json({error: "No response body from LibreChat"});
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error(`Failed to proxy to LibreChat: ${message}`);
      res
        .status(502)
        .json({error: "Failed to connect to LibreChat", details: message});
    }
  });

  /**
   * GET /agents
   *
   * POST /check
   *
   * Validates that the provided API key works by sending a short test
   * message to LibreChat. Returns the assistant reply as plain text.
   * Headers (optional overrides):
   *   x-librechat-api-key — Override the default API key
   */
  router.post("/check", async (req, res) => {
    const baseUrl = config.getString("librechat.baseUrl");
    const agentId = config.getString("librechat.agentId");
    const defaultApiKey = config.getOptionalString("librechat.apiKey");

    const apiKey =
      (req.headers["x-librechat-api-key"] as string) || defaultApiKey;
    if (!apiKey) {
      res.status(400).json({
        error: "No API key provided. Enter your API key and try again.",
      });
      return;
    }

    const targetUrl = `${baseUrl.replace(/\/+$/, "")}/api/agents/v1/chat/completions`;
    logger.debug(`Checking API key via ${targetUrl}`);

    try {
      const upstream = await fetch(targetUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: agentId,
          messages: [
            {role: "user", content: "Say hello in one short sentence."},
          ],
          stream: false,
        }),
      });

      if (!upstream.ok) {
        const errorText = await upstream.text();
        logger.error(`LibreChat check error ${upstream.status}: ${errorText}`);
        if (upstream.status === 401 || upstream.status === 403) {
          res.status(401).json({error: "Invalid API key"});
        } else {
          res.status(upstream.status).json({
            error: `LibreChat returned ${upstream.status}`,
            details: errorText,
          });
        }
        return;
      }

      const data = (await upstream.json()) as {
        choices?: Array<{message?: {content?: string}}>;
      };
      const reply = data?.choices?.[0]?.message?.content ?? "";
      res.json({ok: true, reply});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error(`Failed to check API key: ${message}`);
      res
        .status(502)
        .json({error: "Failed to connect to LibreChat", details: message});
    }
  });

  /**
   * GET /health
   * Simple health check endpoint.
   */
  router.get("/health", (_req, res) => {
    res.json({status: "ok"});
  });

  return router;
}
