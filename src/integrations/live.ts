// Live adapters are intentionally stubs. A production build would call a server-side proxy (VITE_INTEGRATIONS_PROXY_URL)
// that holds the provider credentials; browsers must never hold Dutchie/LeafLink/Metrc keys or QuickBooks OAuth secrets.
// These stubs make NO network calls: every method rejects and records a failed entry in the sync log.
import { logSync } from "./syncLog";
import { PROVIDERS, PROXY_URL_ENV } from "./config";
import type { ProviderId } from "./types";

export class LiveNotConfiguredError extends Error {
  constructor(provider: ProviderId, method: string) {
    super(`${PROVIDERS[provider].name} live adapter is not connected (${method}). Configure the server-side proxy (${PROXY_URL_ENV}) and keys: ${PROVIDERS[provider].envVars.join(", ")}.`);
  }
}

export function liveStub<T extends object>(provider: ProviderId): T {
  return new Proxy({} as T, {
    get: (_t, prop) => (..._args: unknown[]) => {
      void _args;
      const err = new LiveNotConfiguredError(provider, String(prop));
      logSync({ provider, mode: "live", direction: "push", operation: String(prop), endpoint: "server proxy (not configured)", ref: "", summary: err.message, ok: false });
      return Promise.reject(err);
    },
  });
}
