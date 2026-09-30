import {codeChallengeFor, generateCodeVerifier, generateState} from "./pkce";

describe("pkce", () => {
  it("generates RFC 7636-compliant verifiers", () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it("produces unique verifiers and states", () => {
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier());
    expect(generateState()).not.toBe(generateState());
  });

  it("derives the S256 challenge (RFC 7636 appendix B vector)", () => {
    // Known test vector from RFC 7636 Appendix B.
    const challenge = codeChallengeFor(
      "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
    );
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});
