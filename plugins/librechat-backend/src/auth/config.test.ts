import {readAuthConfig} from "./config";
import {ConfigReader} from "@backstage/config";

describe("readAuthConfig", () => {
  it("defaults to apiKey when no auth block exists", () => {
    const config = new ConfigReader({
      librechat: {baseUrl: "http://localhost", agentId: "agent_1"},
    });
    expect(readAuthConfig(config)).toEqual({method: "apiKey"});
  });

  it("returns apiKey when method is explicitly apiKey", () => {
    const config = new ConfigReader({
      librechat: {
        baseUrl: "http://localhost",
        agentId: "agent_1",
        auth: {method: "apiKey"},
      },
    });
    expect(readAuthConfig(config)).toEqual({method: "apiKey"});
  });

  it("resolves oidc config with default scopes", () => {
    const config = new ConfigReader({
      librechat: {
        baseUrl: "http://localhost",
        agentId: "agent_1",
        auth: {
          method: "oidc",
          oidc: {
            issuer: "https://login.example.com/tenant/v2.0/",
            clientId: "client-1",
            audience: "api://librechat",
          },
        },
      },
    });
    const result = readAuthConfig(config);
    expect(result.method).toBe("oidc");
    expect(result.oidc).toEqual({
      issuer: "https://login.example.com/tenant/v2.0", // trailing slash stripped
      clientId: "client-1",
      audience: "api://librechat",
      scopes: ["openid", "profile", "email", "offline_access"],
    });
  });

  it("honours explicit scopes", () => {
    const config = new ConfigReader({
      librechat: {
        baseUrl: "http://localhost",
        agentId: "agent_1",
        auth: {
          method: "oidc",
          oidc: {
            issuer: "https://issuer.example.com",
            clientId: "client-1",
            audience: "aud",
            scopes: ["openid", "api://librechat/.default"],
          },
        },
      },
    });
    expect(readAuthConfig(config).oidc?.scopes).toEqual([
      "openid",
      "api://librechat/.default",
    ]);
  });

  it("throws when method is oidc but the oidc block is missing", () => {
    const config = new ConfigReader({
      librechat: {
        baseUrl: "http://localhost",
        agentId: "agent_1",
        auth: {method: "oidc"},
      },
    });
    expect(() => readAuthConfig(config)).toThrow(/oidc is not configured/);
  });

  it("throws when oidc is combined with allowUnauthenticated", () => {
    const config = new ConfigReader({
      librechat: {
        baseUrl: "http://localhost",
        agentId: "agent_1",
        allowUnauthenticated: true,
        auth: {
          method: "oidc",
          oidc: {
            issuer: "https://issuer.example.com",
            clientId: "client-1",
            audience: "aud",
          },
        },
      },
    });
    expect(() => readAuthConfig(config)).toThrow(/allowUnauthenticated/);
  });
});
