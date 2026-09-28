import {
  DatabaseService,
  LoggerService,
  resolvePackagePath,
} from "@backstage/backend-plugin-api";

/** A stored OIDC session for one Backstage user. @internal */
export interface StoredOidcSession {
  userEntityRef: string;
  refreshToken: string;
  accessToken: string;
  /** Unix epoch milliseconds at which the access token expires. */
  accessTokenExpiresAt: number;
  /** Claim value from the ID token, for display in the Settings UI. */
  userLabel?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Persists OIDC refresh tokens in the plugin database, keyed by Backstage
 * user entity ref. The browser never sees the refresh token.
 *
 * Uses better-sqlite3 via the Backstage database service; migrations live
 * in the `migrations/` directory next to this file.
 *
 * @internal
 */
export class OidcTokenStore {
  private constructor(
    private readonly db: Awaited<ReturnType<DatabaseService["getClient"]>>,
  ) {}

  static async create(options: {
    database: DatabaseService;
    logger: LoggerService;
  }): Promise<OidcTokenStore> {
    const client = await options.database.getClient();
    const migrationsDir = resolvePackagePath(
      "@nospt/backstage-plugin-librechat-backend",
      "migrations",
    );
    await client.migrate.latest({directory: migrationsDir});
    options.logger.info("LibreChat OIDC token store migrated");
    return new OidcTokenStore(client);
  }

  async get(userEntityRef: string): Promise<StoredOidcSession | undefined> {
    const row = await this.db("librechat_oidc_sessions")
      .where({user_entity_ref: userEntityRef})
      .first();
    return row ? this.toSession(row) : undefined;
  }

  async save(session: StoredOidcSession): Promise<void> {
    const now = Date.now();
    await this.db("librechat_oidc_sessions")
      .insert({
        user_entity_ref: session.userEntityRef,
        refresh_token: session.refreshToken,
        access_token: session.accessToken,
        access_token_expires_at: session.accessTokenExpiresAt,
        user_label: session.userLabel ?? null,
        created_at: session.createdAt || now,
        updated_at: now,
      })
      .onConflict("user_entity_ref")
      .merge(["refresh_token", "access_token", "access_token_expires_at", "user_label", "updated_at"]);
  }

  /** Updates only the access token after a successful refresh. */
  async updateAccessToken(
    userEntityRef: string,
    accessToken: string,
    expiresAt: number,
    rotatedRefreshToken?: string,
  ): Promise<void> {
    const patch: Record<string, unknown> = {
      access_token: accessToken,
      access_token_expires_at: expiresAt,
      updated_at: Date.now(),
    };
    if (rotatedRefreshToken) {
      patch.refresh_token = rotatedRefreshToken;
    }
    await this.db("librechat_oidc_sessions")
      .where({user_entity_ref: userEntityRef})
      .update(patch);
  }

  async delete(userEntityRef: string): Promise<void> {
    await this.db("librechat_oidc_sessions")
      .where({user_entity_ref: userEntityRef})
      .delete();
  }

  private toSession(row: Record<string, unknown>): StoredOidcSession {
    return {
      userEntityRef: row.user_entity_ref as string,
      refreshToken: row.refresh_token as string,
      accessToken: row.access_token as string,
      accessTokenExpiresAt: Number(row.access_token_expires_at),
      userLabel: (row.user_label as string) ?? undefined,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    };
  }
}
