import {
  AuthService,
  HttpAuthService,
  LoggerService,
} from "@backstage/backend-plugin-api";
import express from "express";
import Router from "express-promise-router";
import {OidcClient, validateAccessTokenClaims} from "./oidcClient";
import {OidcConfig} from "./config";
import {OidcTokenStore} from "./tokenStore";
import {codeChallengeFor, generateCodeVerifier, generateState} from "./pkce";

/** How long a pending authorization request stays valid. */
const PENDING_TTL_MS = 10 * 60 * 1000;
/** Refresh the stored access token when it expires within this window. */
const REFRESH_LEEWAY_MS = 60 * 1000;

interface PendingAuth {
  userEntityRef: string;
  codeVerifier: string;
  createdAt: number;
}

/** @internal */
export interface AuthRouterOptions {
  logger: LoggerService;
  oidc: OidcConfig;
  oidcClient: OidcClient;
  tokenStore: OidcTokenStore;
  auth: AuthService;
  httpAuth: HttpAuthService;
  /** Absolute base URL of this plugin's router, e.g. https://backstage.example.com/api/librechat */
  pluginBaseUrl: string;
}

/**
 * Routes implementing the backend-assisted PKCE popup flow:
 *
 *   GET  /auth/start    — requires Backstage auth; 302s the popup to the IdP
 *   GET  /auth/callback — IdP redirect target; posts the result to the opener
 *   GET  /auth/status   — whether the caller has a live OIDC session
 *   POST /auth/refresh  — mint a new access token from the stored refresh token
 *   POST /auth/logout   — delete the stored session
 *
 * Refresh tokens never leave this router. The browser receives only display
 * metadata (user label, expiry) — the backend injects the access token into
 * upstream LibreChat calls itself (see router.ts).
 *
 * @internal
 */
export function createAuthRouter(options: AuthRouterOptions): express.Router {
  const {logger, oidc, oidcClient, tokenStore, httpAuth, pluginBaseUrl} =
    options;
  const router = Router();
  router.use(express.json());

  const redirectUri = `${pluginBaseUrl.replace(/\/+$/, "")}/auth/callback`;

  // In-memory pending requests, keyed by `state`. Popups complete within
  // minutes; persistence across restarts is not required.
  const pending = new Map<string, PendingAuth>();

  function sweepPending() {
    const now = Date.now();
    for (const [state, p] of pending) {
      if (now - p.createdAt > PENDING_TTL_MS) pending.delete(state);
    }
  }

  async function requireUserEntityRef(req: express.Request): Promise<string> {
    const credentials = await httpAuth.credentials(req, {allow: ["user"]});
    const userEntityRef = credentials.principal.userEntityRef;
    return userEntityRef;
  }

  router.get("/auth/start", async (req, res) => {
    const userEntityRef = await requireUserEntityRef(req);
    sweepPending();

    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    pending.set(state, {userEntityRef, codeVerifier, createdAt: Date.now()});

    const url = await oidcClient.buildAuthorizationUrl({
      redirectUri,
      state,
      codeChallenge: codeChallengeFor(codeVerifier),
    });
    logger.debug(`OIDC start for ${userEntityRef}`);
    res.redirect(url);
  });

  router.get("/auth/callback", async (req, res) => {
    const {code, state, error, error_description: errorDescription} =
      req.query as Record<string, string | undefined>;

    if (error) {
      logger.warn(`OIDC callback error: ${error} ${errorDescription ?? ""}`);
      res
        .status(200)
        .send(renderCallbackPage({error: errorDescription ?? error}));
      return;
    }
    if (!code || !state) {
      res.status(400).send(renderCallbackPage({error: "Missing code or state"}));
      return;
    }

    const pendingAuth = pending.get(state);
    pending.delete(state);
    if (!pendingAuth || Date.now() - pendingAuth.createdAt > PENDING_TTL_MS) {
      res
        .status(400)
        .send(renderCallbackPage({error: "Authorization request expired"}));
      return;
    }

    try {
      const tokens = await oidcClient.exchangeCode({
        code,
        redirectUri,
        codeVerifier: pendingAuth.codeVerifier,
      });
      if (!tokens.refreshToken) {
        throw new Error(
          "Identity provider did not return a refresh token — is the offline_access scope granted?",
        );
      }

      const userLabel =
        tokens.idTokenClaims?.email ??
        tokens.idTokenClaims?.preferred_username ??
        tokens.idTokenClaims?.sub;

      await tokenStore.save({
        userEntityRef: pendingAuth.userEntityRef,
        refreshToken: tokens.refreshToken,
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.expiresAt,
        userLabel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      logger.info(`OIDC session established for ${pendingAuth.userEntityRef}`);
      res.status(200).send(renderCallbackPage({userLabel}));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Token exchange failed";
      logger.warn(`OIDC callback exchange failed: ${message}`);
      res.status(200).send(renderCallbackPage({error: message}));
    }
  });

  router.get("/auth/status", async (req, res) => {
    const userEntityRef = await requireUserEntityRef(req);
    const session = await getFreshSession(userEntityRef);
    if (!session) {
      res.json({connected: false});
      return;
    }
    res.json({
      connected: true,
      userLabel: session.userLabel,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
    });
  });

  router.post("/auth/refresh", async (req, res) => {
    const userEntityRef = await requireUserEntityRef(req);
    const session = await getFreshSession(userEntityRef, true);
    if (!session) {
      res.status(401).json({error: "not_connected"});
      return;
    }
    res.json({
      connected: true,
      userLabel: session.userLabel,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
    });
  });

  router.post("/auth/logout", async (req, res) => {
    const userEntityRef = await requireUserEntityRef(req);
    await tokenStore.delete(userEntityRef);
    logger.info(`OIDC session deleted for ${userEntityRef}`);
    res.status(204).end();
  });

  /**
   * Returns the stored session, refreshing the access token when it is
   * within the leeway window of expiry. Returns undefined when the user has
   * no session or the refresh grant has been revoked.
   */
  async function getFreshSession(
    userEntityRef: string,
    force = false,
  ): Promise<
    | {accessToken: string; accessTokenExpiresAt: number; userLabel?: string}
    | undefined
  > {
    const session = await tokenStore.get(userEntityRef);
    if (!session) return undefined;

    const needsRefresh =
      force || session.accessTokenExpiresAt - REFRESH_LEEWAY_MS < Date.now();
    if (!needsRefresh) {
      return session;
    }

    try {
      const tokens = await oidcClient.refresh(session.refreshToken);
      await tokenStore.updateAccessToken(
        userEntityRef,
        tokens.accessToken,
        tokens.expiresAt,
        tokens.refreshToken, // providers may rotate refresh tokens
      );
      return {
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.expiresAt,
        userLabel: session.userLabel,
      };
    } catch (err) {
      logger.warn(
        `OIDC refresh failed for ${userEntityRef}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      // A revoked refresh grant means the session is dead — clean it up so
      // /auth/status reports disconnected instead of failing forever.
      await tokenStore.delete(userEntityRef);
      return undefined;
    }
  }

  return router;
}

/**
 * The callback page delivered inside the popup. Posts the outcome to the
 * opener window and closes itself. The opener validates event.origin
 * against the Backstage backend origin, so no token material is embedded —
 * only a display label.
 */
function renderCallbackPage(result: {
  userLabel?: string;
  error?: string;
}): string {
  const payload = JSON.stringify({
    type: "librechat-oidc-callback",
    connected: !result.error,
    userLabel: result.userLabel,
    error: result.error,
  });
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>LibreChat sign-in</title></head>
  <body>
    <p>${
      result.error
        ? `Sign-in failed: ${escapeHtml(result.error)}. You can close this window.`
        : "Sign-in complete. This window will close automatically."
    }</p>
    <script>
      (function () {
        var payload = ${payload};
        if (window.opener) {
          window.opener.postMessage(payload, window.location.origin);
          window.close();
        }
      })();
    </script>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export {validateAccessTokenClaims};
