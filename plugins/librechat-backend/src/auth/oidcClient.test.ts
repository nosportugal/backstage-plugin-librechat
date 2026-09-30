import {validateAccessTokenClaims} from "./oidcClient";

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({alg: "RS256"})).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fakesig`;
}

const oidc = {
  issuer: "https://login.example.com/tenant/v2.0",
  clientId: "client-1",
  audience: "api://librechat",
  scopes: ["openid"],
};

describe("validateAccessTokenClaims", () => {
  it("accepts a token with matching iss/aud and future exp", () => {
    const token = makeJwt({
      iss: "https://login.example.com/tenant/v2.0",
      aud: "api://librechat",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(validateAccessTokenClaims(token, oidc)).toBeUndefined();
  });

  it("accepts aud as an array containing the configured audience", () => {
    const token = makeJwt({
      iss: oidc.issuer,
      aud: ["other", "api://librechat"],
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(validateAccessTokenClaims(token, oidc)).toBeUndefined();
  });

  it("rejects an expired token", () => {
    const token = makeJwt({
      iss: oidc.issuer,
      aud: oidc.audience,
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    expect(validateAccessTokenClaims(token, oidc)).toBe("token expired");
  });

  it("rejects a wrong issuer", () => {
    const token = makeJwt({
      iss: "https://evil.example.com",
      aud: oidc.audience,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(validateAccessTokenClaims(token, oidc)).toMatch(/unexpected issuer/);
  });

  it("rejects a wrong audience", () => {
    const token = makeJwt({
      iss: oidc.issuer,
      aud: "api://something-else",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(validateAccessTokenClaims(token, oidc)).toMatch(
      /unexpected audience/,
    );
  });

  it("rejects an unparseable token", () => {
    expect(validateAccessTokenClaims("not-a-jwt", oidc)).toBe("not a JWT");
    expect(validateAccessTokenClaims("a.%%%.c", oidc)).toBe(
      "unparseable token",
    );
  });
});
