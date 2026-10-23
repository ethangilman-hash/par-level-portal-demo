import { useSyncExternalStore } from "react";
import type { SyncEvent } from "./types";

let events: SyncEvent[] = [];
let seq = 1;
const listeners = new Set<() => void>();

export function logSync(e: Omit<SyncEvent, "id" | "at"> & { at?: number }): SyncEvent {
  const ev: SyncEvent = { ...e, id: seq++, at: e.at ?? Date.now() };
  events = [ev, ...events].slice(0, 250);
  listeners.forEach((l) => l());
  return ev;
}
export const getSyncLog = (): SyncEvent[] => events;
export function subscribeSyncLog(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
export const useSyncLog = (): SyncEvent[] => useSyncExternalStore(subscribeSyncLog, getSyncLog, getSyncLog);

