import {useCallback, useEffect, useRef, useState} from "react";
import {
  configApiRef,
  fetchApiRef,
  useApi,
} from "@backstage/frontend-plugin-api";

/** Auth lifecycle of the LibreChat OIDC session. @public */
export type LibreChatAuthStatus =
  | "loading"
  | "disconnected"
  | "connecting"
  | "connected";

/** @public */
export interface LibreChatAuthState {
  /** Configured auth method; 'apiKey' when unset (default, pre-OIDC behaviour). */
  method: "apiKey" | "oidc";
  status: LibreChatAuthStatus;
  /** Display label from the IdP (email / username), when connected. */
  userLabel?: string;
  /** Error message from the last failed connect attempt. */
  error?: string;
  /** Opens the sign-in popup and resolves when the flow completes. */
  connect(): Promise<void>;
  /** Deletes the backend-held session. */
  disconnect(): Promise<void>;
}

interface StatusResponse {
  connected: boolean;
  userLabel?: string;
  accessTokenExpiresAt?: number;
}

interface CallbackMessage {
  type?: string;
  connected?: boolean;
  userLabel?: string;
  error?: string;
}

const POPUP_FEATURES = "width=600,height=700,menubar=no,toolbar=no";

/**
 * Auth state for the LibreChat plugin.
 *
 * In apiKey mode this hook is inert (status stays 'disconnected'; the
 * existing per-user API key settings flow applies). In oidc mode it tracks
 * the backend-held session and drives the popup sign-in flow.
 *
 * Token material never reaches the browser: the backend holds the refresh
 * token and injects access tokens into upstream calls itself. The hook only
 * ever receives display metadata (user label, expiry).
 *
 * @public
 */
export function useLibreChatAuth(): LibreChatAuthState {
  const configApi = useApi(configApiRef);
  const fetchApi = useApi(fetchApiRef);

  const method =
    (configApi.getOptionalString("librechat.auth.method") as
      | "apiKey"
      | "oidc"
      | undefined) ?? "apiKey";

  const [status, setStatus] = useState<LibreChatAuthStatus>(
    method === "oidc" ? "loading" : "disconnected",
  );
  const [userLabel, setUserLabel] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const popupRef = useRef<Window | null>(null);
  const expiresAtRef = useRef<number | undefined>(undefined);

  const backendBaseUrl = configApi
    .getString("backend.baseUrl")
    .replace(/\/+$/, "");

  const applyStatus = useCallback((s: StatusResponse) => {
    if (s.connected) {
      setStatus("connected");
      setUserLabel(s.userLabel);
      setError(undefined);
      expiresAtRef.current = s.accessTokenExpiresAt;
    } else {
      setStatus("disconnected");
      setUserLabel(undefined);
      expiresAtRef.current = undefined;
    }
  }, []);

  // Initial status load (OIDC mode only).
  useEffect(() => {
    if (method !== "oidc") return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchApi.fetch(
          `${backendBaseUrl}/api/librechat/auth/status`,
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as StatusResponse;
        if (!cancelled) applyStatus(data);
      } catch {
        if (!cancelled) setStatus("disconnected");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [method, backendBaseUrl, fetchApi, applyStatus]);

  // Silent re-check shortly before the access token would expire, so the
  // UI reflects a server-side refresh without user action.
  useEffect(() => {
    const expiresAt = expiresAtRef.current;
    if (method !== "oidc" || status !== "connected" || !expiresAt) {
      return undefined;
    }
    const delay = Math.max(expiresAt - Date.now() - 60_000, 5_000);
    const timer = setTimeout(async () => {
      try {
        const res = await fetchApi.fetch(
          `${backendBaseUrl}/api/librechat/auth/refresh`,
          {method: "POST"},
        );
        if (res.ok) {
          applyStatus((await res.json()) as StatusResponse);
        } else {
          setStatus("disconnected");
        }
      } catch {
        setStatus("disconnected");
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [method, status, backendBaseUrl, fetchApi, applyStatus]);

  const connect = useCallback(async () => {
    if (method !== "oidc") return;
    setStatus("connecting");
    setError(undefined);

    const result = await new Promise<CallbackMessage>((resolve) => {
      const popup = window.open(
        `${backendBaseUrl}/api/librechat/auth/start`,
        "librechat-oidc",
        POPUP_FEATURES,
      );
      if (!popup) {
        resolve({error: "Popup blocked — allow popups for this site and retry."});
        return;
      }
      popupRef.current = popup;

      const expectedOrigin = new URL(backendBaseUrl).origin;
      // eslint-disable-next-line prefer-const -- assigned after onMessage exists
      let closeWatcher: ReturnType<typeof setInterval> | undefined;
      const cleanup = () => {
        window.removeEventListener("message", onMessage);
        if (closeWatcher !== undefined) clearInterval(closeWatcher);
        popupRef.current = null;
      };
      function onMessage(event: MessageEvent) {
        if (event.origin !== expectedOrigin) return;
        const data = event.data as CallbackMessage;
        if (data?.type !== "librechat-oidc-callback") return;
        cleanup();
        resolve(data);
      }
      window.addEventListener("message", onMessage);

      // The user closed the popup without completing the flow.
      closeWatcher = setInterval(() => {
        if (popup.closed) {
          cleanup();
          resolve({error: undefined, connected: false});
        }
      }, 500);
    });

    if (result.connected) {
      setStatus("connected");
      setUserLabel(result.userLabel);
      // Refresh status from the backend to learn the token expiry.
      try {
        const res = await fetchApi.fetch(
          `${backendBaseUrl}/api/librechat/auth/status`,
        );
        if (res.ok) applyStatus((await res.json()) as StatusResponse);
      } catch {
        // Connected regardless; expiry check happens on next load.
      }
    } else {
      setStatus("disconnected");
      if (result.error) setError(result.error);
    }
  }, [method, backendBaseUrl, fetchApi, applyStatus]);

  const disconnect = useCallback(async () => {
    if (method !== "oidc") return;
    try {
      await fetchApi.fetch(`${backendBaseUrl}/api/librechat/auth/logout`, {
        method: "POST",
      });
    } finally {
      setStatus("disconnected");
      setUserLabel(undefined);
      expiresAtRef.current = undefined;
    }
  }, [method, backendBaseUrl, fetchApi]);

  return {method, status, userLabel, error, connect, disconnect};
}
