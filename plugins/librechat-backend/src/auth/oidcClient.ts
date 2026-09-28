import fetch from "node-fetch";
import {LoggerService} from "@backstage/backend-plugin-api";
import {OidcConfig} from "./config";

interface DiscoveryDocument {
  authorization_endpoint: string;
  token_endpoint: string;
}

/** Token endpoint response shape (RFC 6749 §5.1). */
export interface TokenResponse {
  accessToken: string;
  /** Epoch milliseconds when the access token expires. */
  expiresAt: number;
  refreshToken?: string;
  /** Decoded ID token claims (unverified beyond the IdP TLS channel). */
  idTokenClaims?: {email?: string; preferred_username?: string; sub?: string};
}

/**
 * Minimal OIDC relying party for the plugin's PKCE flow.
 *
 * Deliberately does NOT verify ID token signatures: the tokens are fetched
 * over TLS directly from the discovered token endpoint, and the access
 * token's signature is verified again by LibreChat (the resource server).
 * The plugin only needs claims for display and pre-flight validation.
 *
 * @internal
 */
export class OidcClient {
  private discovery?: DiscoveryDocument;
  private discoveryFetchedAt = 0;
  private static DISCOVERY_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly config: OidcConfig,
    private readonly logger: LoggerService,
  ) {}

  private async getDiscovery(): Promise<DiscoveryDocument> {
    const now = Date.now();
    if (
      this.discovery &&
      now - this.discoveryFetchedAt < OidcClient.DISCOVERY_TTL_MS
    ) {
      return this.discovery;
    }
    const url = `${this.config.issuer}/.well-known/openid-configuration`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `OIDC discovery failed for ${this.config.issuer}: HTTP ${res.status}`,
      );
    }
    const doc = (await res.json()) as DiscoveryDocument;
    if (!doc.authorization_endpoint || !doc.token_endpoint) {
      throw new Error(
        `OIDC discovery document at ${url} is missing required endpoints`,
      );
    }
    this.discovery = doc;
    this.discoveryFetchedAt = now;
    return doc;
  }

  /** Builds the IdP authorization URL for the PKCE flow. */
  async buildAuthorizationUrl(options: {
    redirectUri: string;
    state: string;
    codeChallenge: string;
  }): Promise<string> {
    const discovery = await this.getDiscovery();
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: options.redirectUri,
      scope: this.config.scopes.join(" "),
      state: options.state,
      code_challenge: options.codeChallenge,
      code_challenge_method: "S256",
    });
    return `${discovery.authorization_endpoint}?${params.toString()}`;
  }

  /** Exchanges an authorization code for tokens. */
  async exchangeCode(options: {
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }): Promise<TokenResponse> {
    const discovery = await this.getDiscovery();
    return this.tokenRequest(discovery.token_endpoint, {
      grant_type: "authorization_code",
      code: options.code,
      redirect_uri: options.redirectUri,
      client_id: this.config.clientId,
      code_verifier: options.codeVerifier,
    });
  }

  /** Uses a refresh token to mint a new access token. */
  async refresh(refreshToken: string): Promise<TokenResponse> {
    const discovery = await this.getDiscovery();
    return this.tokenRequest(discovery.token_endpoint, {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      scope: this.config.scopes.join(" "),
    });
  }

  private async tokenRequest(
    endpoint: string,
    params: Record<string, string>,
  ): Promise<TokenResponse> {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      body: new URLSearchParams(params).toString(),
    });
    const body = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      id_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !body.access_token) {
      this.logger.warn(
        `OIDC token request failed: ${body.error ?? res.status} ${
          body.error_description ?? ""
        }`,
      );
      const err = new Error(
        body.error_description ??
          body.error ??
          `Token endpoint returned ${res.status}`,
      );
      (err as {code?: string}).code = body.error ?? "token_request_failed";
      throw err;
    }
    return {
      accessToken: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
      refreshToken: body.refresh_token,
      idTokenClaims: body.id_token ? decodeIdToken(body.id_token) : undefined,
    };
  }
}

/** Decodes the payload of a JWT without verifying the signature. */
function decodeIdToken(
  token: string,
): {email?: string; preferred_username?: string; sub?: string} | undefined {
  try {
    const [, payload] = token.split(".");
    if (!payload) return undefined;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: string;
      preferred_username?: string;
      sub?: string;
    };
  } catch {
    return undefined;
  }
}

/**
 * Light, pre-flight validation of an access token before proxying to
 * LibreChat (decision Q3): issuer, audience and expiry only. Signature
 * verification stays with LibreChat, the resource server.
 *
 * Returns a human-readable reason when invalid, or undefined when OK.
 *
 * @internal
 */
export function validateAccessTokenClaims(
  token: string,
  oidc: OidcConfig,
): string | undefined {
  try {
    const [, payload] = token.split(".");
    if (!payload) return "not a JWT";
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as {iss?: string; aud?: string | string[]; exp?: number};

    if (claims.exp && claims.exp * 1000 < Date.now()) {
      return "token expired";
    }
    if (claims.iss && claims.iss.replace(/\/+$/, "") !== oidc.issuer) {
      return `unexpected issuer '${claims.iss}'`;
    }
    if (claims.aud) {
      const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (!audiences.includes(oidc.audience)) {
        return `unexpected audience '${claims.aud}'`;
      }
    }
    return undefined;
  } catch {
    return "unparseable token";
  }
}
