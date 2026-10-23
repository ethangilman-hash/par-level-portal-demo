// Single switch between mock (sample data, no network) and live adapters.
// Set VITE_INTEGRATIONS_MODE=live to opt into live adapters; per-provider overrides use VITE_<PROVIDER>_MODE.
// Secrets must NOT ship in a browser bundle: in live mode the browser should call a server-side proxy that holds
// the keys below. The env var names here are placeholders for that proxy; this demo never reads or sends them.
import type { IntegrationMode, ProviderId } from "./types";

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const pick = (v: string | undefined, fallback: IntegrationMode): IntegrationMode => (v === "live" ? "live" : v === "mock" ? "mock" : fallback);
const GLOBAL_MODE: IntegrationMode = pick(env.VITE_INTEGRATIONS_MODE, "mock");

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  role: string;
  mode: IntegrationMode;
  docs: string;
  baseUrl: string;
  auth: string;
  /** Placeholder env var names (server-side proxy). Values are never read by this app. */
  envVars: string[];
}

export const PROXY_URL_ENV = "VITE_INTEGRATIONS_PROXY_URL";

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  dutchie: {
    id: "dutchie", name: "Dutchie POS", role: "Retail POS & e-commerce: inventory, menu, sales, discounts, loyalty, customers",
    mode: pick(env.VITE_DUTCHIE_MODE, GLOBAL_MODE), docs: "https://api.pos.dutchie.com/swagger/index.html",
    baseUrl: "https://api.pos.dutchie.com", auth: "HTTP Basic: location API key as username, blank password",
    envVars: ["DUTCHIE_API_KEY_SOUTH_MAIN", "DUTCHIE_API_KEY_EASTGATE", "DUTCHIE_API_KEY_RIVERSIDE"],
  },
  leaflink: {
    id: "leaflink", name: "LeafLink", role: "Wholesale B2B orders between vendors and the retailer",
    mode: pick(env.VITE_LEAFLINK_MODE, GLOBAL_MODE), docs: "https://developer.leaflink.com/legacy/v2/",
    baseUrl: "https://app.leaflink.com/api/v2/", auth: "Header Authorization: App {API_KEY}",
    envVars: ["LEAFLINK_API_KEY", "LEAFLINK_COMPANY_ID", "LEAFLINK_BASE_URL"],
  },
  metrc: {
    id: "metrc", name: "Metrc", role: "State track-and-trace: packages, tags, transfer manifests, receiving, adjustments, lab results",
    mode: pick(env.VITE_METRC_MODE, GLOBAL_MODE), docs: "https://api-or.metrc.com/Documentation",
    baseUrl: "https://api-or.metrc.com (Oregon, to confirm)", auth: "HTTP Basic: vendor (integrator) key + user key",
    envVars: ["METRC_VENDOR_API_KEY", "METRC_USER_API_KEY", "METRC_LICENSE_NUMBER", "METRC_BASE_URL"],
  },
  quickbooks: {
    id: "quickbooks", name: "QuickBooks Online", role: "Accounting: invoices, bills, payments, vendors/customers, chart of accounts",
    mode: pick(env.VITE_QUICKBOOKS_MODE, GLOBAL_MODE), docs: "https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice",
    baseUrl: "https://quickbooks.api.intuit.com/v3/company/{realmId}", auth: "OAuth 2.0 (scope com.intuit.quickbooks.accounting)",
    envVars: ["QBO_CLIENT_ID", "QBO_CLIENT_SECRET", "QBO_REDIRECT_URI", "QBO_REALM_ID_RETAILER", "QBO_REALM_ID_<VENDOR>", "QBO_ENVIRONMENT"],
  },
};
export const PROVIDER_ORDER: ProviderId[] = ["dutchie", "leaflink", "metrc", "quickbooks"];

/** Simulated network latency for the mock adapters (ms). */
export const MOCK_LATENCY_MS = 120;
