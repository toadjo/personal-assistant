import { createServer, type Server } from "node:http";
import { URL } from "node:url";

export type OAuthCallbackResult = {
  code: string;
  state: string;
};

export type OAuthLoopbackServer = {
  redirectUri: string;
  waitForCallback: () => Promise<OAuthCallbackResult>;
  close: () => void;
};

export async function startOAuthLoopbackServer(path = "/callback"): Promise<OAuthLoopbackServer> {
  let resolveCallback: ((value: OAuthCallbackResult) => void) | null = null;
  let rejectCallback: ((error: Error) => void) | null = null;
  const callbackPromise = new Promise<OAuthCallbackResult>((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });

  let server: Server | null = null;
  let redirectUri = "";

  await new Promise<void>((resolve, reject) => {
    server = createServer((req, res) => {
      try {
        if (!req.url) {
          res.writeHead(400);
          res.end("Bad request");
          return;
        }
        const url = new URL(req.url, redirectUri);
        if (url.pathname !== path) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        const error = url.searchParams.get("error");
        if (error) {
          res.writeHead(400);
          res.end("Authorization was denied.");
          rejectCallback?.(new Error(`OAuth authorization denied: ${error}`));
          return;
        }
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!code || !state) {
          res.writeHead(400);
          res.end("Missing authorization response.");
          rejectCallback?.(new Error("OAuth callback did not include code and state."));
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<html><body><p>Authorization complete. You can close this window.</p></body></html>");
        resolveCallback?.({ code, state });
      } catch (error) {
        rejectCallback?.(error instanceof Error ? error : new Error(String(error)));
      }
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server?.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to bind OAuth loopback server."));
        return;
      }
      redirectUri = `http://127.0.0.1:${address.port}${path}`;
      resolve();
    });
  });

  return {
    get redirectUri() {
      return redirectUri;
    },
    waitForCallback: () => callbackPromise,
    close: () => {
      server?.close();
      server = null;
    }
  };
}
