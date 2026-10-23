import { MOCK_LATENCY_MS } from "../config";
import { logSync } from "../syncLog";
import type { ProviderId } from "../types";
import { h } from "../../data";

export interface CallMeta { provider: ProviderId; direction: "pull" | "push"; operation: string; endpoint: string; ref: string }

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Runs a mock operation with simulated latency and records it in the sync log. No network access. */
export async function mockCall<T>(meta: CallMeta, fn: () => T, summary: (r: T) => string): Promise<T> {
  await delay(MOCK_LATENCY_MS);
  try {
    const r = fn();
    logSync({ ...meta, mode: "mock", summary: summary(r), ok: true });
    return r;
  } catch (e) {
    logSync({ ...meta, mode: "mock", summary: e instanceof Error ? e.message : String(e), ok: false });
    throw e;
  }
}

/** Sample license numbers (clearly fake). */
export const VENDOR_LICENSE: Record<string, string> = { hmz: "DEMO-PROC-0101", myld: "DEMO-PROC-0102", poor: "DEMO-PROD-0103", rbd: "DEMO-PROD-0104", iron: "DEMO-PROC-0105" };
export const LOC_LICENSE: Record<string, string> = { south: "DEMO-RET-0201", east: "DEMO-RET-0202", river: "DEMO-RET-0203" };

const hex = (s: string, n: number) => Array.from({ length: n }, (_, i) => Math.floor(h(s + i) * 16).toString(16)).join("");
/** Deterministic, UUID-shaped sample id. */
export const fakeUuid = (seed: string) => `${hex(seed, 8)}-${hex(seed + "b", 4)}-4${hex(seed + "c", 3)}-a${hex(seed + "d", 3)}-${hex(seed + "e", 12)}`;
export const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
