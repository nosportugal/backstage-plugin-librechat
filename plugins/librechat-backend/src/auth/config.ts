import {Config} from "@backstage/config";

/** OIDC settings resolved from `librechat.auth.oidc`. @internal */
export interface OidcConfig {
  issuer: string;
  clientId: string;
  audience: string;
  scopes: string[];
}

/** Resolved auth configuration for the plugin. @internal */
export interface LibreChatAuthConfig {
  method: "apiKey" | "oidc";
  oidc?: OidcConfig;
}

const DEFAULT_SCOPES = ["openid", "profile", "email", "offline_access"];

/**
 * Reads and validates `librechat.auth` from config.
 *
 * Throws on misconfiguration so the plugin fails fast at startup rather
 * than mid-chat:
 * - method 'oidc' requires the oidc block (issuer, clientId, audience)
 * - method 'oidc' cannot be combined with librechat.allowUnauthenticated
 *   (refresh tokens are keyed by Backstage user identity, which does not
 *   exist on unauthenticated routes)
 *
 * @internal
 */
export function readAuthConfig(config: Config): LibreChatAuthConfig {
  const authConfig = config.getOptionalConfig("librechat.auth");
  const method =
    (authConfig?.getOptionalString("method") as
      | "apiKey"
      | "oidc"
      | undefined) ?? "apiKey";

  if (method !== "oidc") {
    return {method: "apiKey"};
  }

  const allowUnauthenticated =
    config.getOptionalBoolean("librechat.allowUnauthenticated") ?? false;
  if (allowUnauthenticated) {
    throw new Error(
      "librechat.auth.method 'oidc' cannot be combined with " +
        "librechat.allowUnauthenticated: true — OIDC tokens are bound to " +
        "Backstage user identities, which unauthenticated routes do not have.",
    );
  }

  const oidcConfig = authConfig?.getOptionalConfig("oidc");
  if (!oidcConfig) {
    throw new Error(
      "librechat.auth.method is 'oidc' but librechat.auth.oidc is not configured. " +
        "Set issuer, clientId and audience.",
    );
  }

  return {
    method: "oidc",
    oidc: {
      issuer: oidcConfig.getString("issuer").replace(/\/+$/, ""),
      clientId: oidcConfig.getString("clientId"),
      audience: oidcConfig.getString("audience"),
      scopes:
        oidcConfig.getOptionalStringArray("scopes") ?? DEFAULT_SCOPES.slice(),
    },
  };
}
