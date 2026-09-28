import {HttpAuthService, LoggerService} from "@backstage/backend-plugin-api";
import {Config} from "@backstage/config";
import express from "express";
import Router from "express-promise-router";
import fetch from "node-fetch";
import {LibreChatAuthConfig} from "./auth/config";
import {OidcTokenStore} from "./auth/tokenStore";
import {OidcClient, validateAccessTokenClaims} from "./auth/oidcClient";

/** @internal */
export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  authConfig: LibreChatAuthConfig;
  /** Required when authConfig.method is 'oidc'. */
  oidc?: {
    tokenStore: OidcTokenStore;
    oidcClient: OidcClient;
    httpAuth: HttpAuthService;
  };
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
  const {logger, config, authConfig, oidc} = options;
  const router = Router();

  router.use(express.json());

  /**
   * Resolves the credential to send upstream.
   *
   * - apiKey mode: per-request header override, else the configured default.
   * - oidc mode: the caller's backend-held session. The refresh token is
   *   rotated server-side when the access token is near expiry; the browser
   *   never handles token material.
   *
   * Returns undefined (and writes the response) when no credential exists.
   */
  async function resolveCredential(
    req: express.Request,
    res: express.Response,
  ): Promise<string | undefined> {
    if (authConfig.method === "apiKey") {
      const defaultApiKey = config.getOptionalString("librechat.apiKey");
      const apiKey =
        (req.headers["x-librechat-api-key"] as string) || defaultApiKey;
      if (!apiKey) {
        res.status(400).json({
          error:
            "No API key configured. Set librechat.apiKey in app-config.yaml or provide one in Settings.",
        });
        return undefined;
      }
      return apiKey;
    }

    // OIDC mode
    if (!oidc) {
      res.status(500).json({error: "OIDC mode is not initialised"});
      return undefined;
    }
    const credentials = await oidc.httpAuth.credentials(req, {allow: ["user"]});
    const userEntityRef = credentials.principal.userEntityRef as string;
    const session = await getFreshOidcSession(userEntityRef);
    if (!session) {
      res.status(401).json({
        error: "not_connected",
        details:
          "No LibreChat OIDC session for this user. Sign in from the chat Settings tab.",
      });
      return undefined;
    }
    const invalidReason = validateAccessTokenClaims(session, authConfig.oidc!);
    if (invalidReason) {
      logger.warn(
        `Stored OIDC token for ${userEntityRef} failed pre-flight validation: ${invalidReason}`,
      );
      res.status(401).json({
        error: "token_invalid",
        details: `Stored OIDC token is not accepted: ${invalidReason}. Sign in again from the chat Settings tab.`,
      });
      return undefined;
    }
    return session;
  }

  /** Mirrors authRouter.getFreshSession; kept local to keep the routers decoupled. */
  async function getFreshOidcSession(
    userEntityRef: string,
  ): Promise<string | undefined> {
    const session = await oidc!.tokenStore.get(userEntityRef);
    if (!session) return undefined;
    if (session.accessTokenExpiresAt - 60_000 > Date.now()) {
      return session.accessToken;
    }
    try {
      const tokens = await oidc!.oidcClient.refresh(session.refreshToken);
      await oidc!.tokenStore.updateAccessToken(
        userEntityRef,
        tokens.accessToken,
        tokens.expiresAt,
        tokens.refreshToken,
      );
      return tokens.accessToken;
    } catch (err) {
      logger.warn(
        `OIDC refresh failed for ${userEntityRef}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      await oidc!.tokenStore.delete(userEntityRef);
      return undefined;
    }
  }

  /**
   * POST /chat
   *
   * Proxies a chat completion request to LibreChat's Agents API.
   * Streams the SSE response back to the client.
   *
   * Body: { messages: Array<{ role: string, content: string }> }
   * Headers (apiKey mode only, optional):
   *   x-librechat-api-key — Override the default API key
   * In OIDC mode the credential header is ignored; the backend injects the
   * caller's stored token.
   */
  router.post("/chat", async (req, res) => {
    const baseUrl = config.getString("librechat.baseUrl");
    const agentId = config.getString("librechat.agentId");

    const credential = await resolveCredential(req, res);
    if (!credential) {
      return;
    }

    if (!sanitizeAgentId(agentId)) {
      res
        .status(400)
        .json({error: "Invalid agent ID format in configuration."});
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
          Authorization: `Bearer ${credential}`,
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
   * POST /check
   *
   * Validates that the caller's credential works by sending a short test
   * message to LibreChat. Returns the assistant reply as plain text.
   * In apiKey mode accepts the x-librechat-api-key header override;
   * in OIDC mode it exercises the caller's stored session.
   */
  router.post("/check", async (req, res) => {
    const baseUrl = config.getString("librechat.baseUrl");
    const agentId = config.getString("librechat.agentId");

    const credential = await resolveCredential(req, res);
    if (!credential) {
      return;
    }

    const targetUrl = `${baseUrl.replace(/\/+$/, "")}/api/agents/v1/chat/completions`;
    logger.debug(`Checking LibreChat credential via ${targetUrl}`);

    try {
      const upstream = await fetch(targetUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credential}`,
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
          res.status(401).json({error: "Invalid credential"});
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
      logger.error(`Failed to check LibreChat credential: ${message}`);
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
