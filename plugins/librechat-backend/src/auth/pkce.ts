import {createHash, randomBytes} from "crypto";

/**
 * Generates a PKCE code verifier (RFC 7636): 43–128 chars from the
 * unreserved set. 48 random bytes base64url-encoded gives 64 chars.
 *
 * @internal
 */
export function generateCodeVerifier(): string {
  return randomBytes(48).toString("base64url");
}

/**
 * Derives the S256 code challenge from a verifier.
 *
 * @internal
 */
export function codeChallengeFor(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/**
 * Generates the opaque `state` parameter correlating the callback with
 * the pending authorization request.
 *
 * @internal
 */
export function generateState(): string {
  return randomBytes(24).toString("base64url");
}
