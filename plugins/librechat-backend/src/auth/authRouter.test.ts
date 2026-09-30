import express from "express";
import {createServer, Server} from "node:http";
import {createAuthRouter} from "./authRouter";

function startServer(app: express.Express): Promise<{
  server: Server;
  url: string;
}> {
  return new Promise((resolve) => {
    const server = createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Test server did not expose an address");
      }
      resolve({server, url: `http://127.0.0.1:${address.port}`});
    });
  });
}

describe("createAuthRouter", () => {
  it("returns the authorization URL as JSON for authenticated fetch requests", async () => {
    const app = express();
    const httpAuth = {
      credentials: jest.fn(async (req) => {
        if (req.headers.authorization !== "Bearer backstage-token") {
          throw new Error("missing credentials");
        }
        return {principal: {userEntityRef: "user:default/alice"}};
      }),
    };
    const oidcClient = {
      buildAuthorizationUrl: jest
        .fn()
        .mockResolvedValue("https://login.example.com/authorize?state=test"),
    };

    app.use(
      createAuthRouter({
        logger: {debug: jest.fn(), info: jest.fn(), warn: jest.fn()} as never,
        oidc: {
          issuer: "https://login.example.com/tenant/v2.0",
          clientId: "client-1",
          audience: "api://librechat",
          scopes: ["openid"],
        },
        oidcClient: oidcClient as never,
        tokenStore: {} as never,
        auth: {} as never,
        httpAuth: httpAuth as never,
        pluginBaseUrl: "http://localhost:7007/api/librechat",
      }),
    );

    const {server, url}: {server: Server; url: string} = await startServer(app);
    try {
      const response = await fetch(`${url}/auth/start`, {
        redirect: "manual",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer backstage-token",
        },
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        authorizationUrl: "https://login.example.com/authorize?state=test",
      });
      expect(oidcClient.buildAuthorizationUrl).toHaveBeenCalledTimes(1);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error?: Error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
