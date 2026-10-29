// Sample daily sales history for Inventory → Performance (Jan 1 – Oct 21, 2026).
// The last 8 weeks come straight from the weekly SALES table (the same numbers behind sales velocity);
// earlier weeks extrapolate each item's early-September rate with a gentle growth curve and a 4/20 spike.
// Days are split by weekday shape and a per-store daily wobble. All sample data.
import { ITEMS, LOCS, SALES, sh, type Item } from "../data";
import { MENU_BY_KEY } from "./menu";

const D0 = Date.UTC(2026, 0, 1, 19); // Jan 1, 2026, noon PT
export const DAY_MS = 86400000;
export const dayMs = (d: number) => D0 + d * DAY_MS;
const idx = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m, d, 19) - D0) / DAY_MS);
/** Demo "today" (Oct 22); data runs through yesterday. */
export const TODAY = idx(2026, 9, 22);
export const LAST = TODAY - 1;
const WEEK0 = idx(2026, 7, 30); // Aug 30 = first week in SALES
const APR20 = idx(2026, 3, 20);
const DOW = [0.92, 0.8, 0.84, 0.93, 1.04, 1.32, 1.25]; // Sun … Sat
const DOW_SUM = DOW.reduce((a, b) => a + b, 0);

export const discRate = (key: string) => 0.04 + 0.11 * sh(key + "disc");
export const unitCostOf = (it: Item) => MENU_BY_KEY[it.key]?.unitCost ?? it.price * 0.5;

function growth(d: number): number {
  if (d >= WEEK0) return 1;
  const base = 0.64 + 0.36 * Math.pow(d / WEEK0, 1.15);
  const spike = 0.42 * Math.exp(-((d - APR20) ** 2) / 4.5);
  return base + spike;
}

const N = LAST + 1;
/** Per-store daily multiplier (weekday shape × wobble × growth), shared across items so totals stay coherent. */
const DAY_F: Record<string, Float64Array> = {};
function buildDayFactors(): void {
for (const l of LOCS) {
  const a = new Float64Array(N);
  for (let d = 0; d < N; d++) {
    const dow = new Date(dayMs(d) - 7 * 3600000).getUTCDay();
    a[d] = (DOW[dow] / DOW_SUM) * (0.86 + 0.28 * sh(`day${l.id}${d}`)) * growth(d);
  }
  DAY_F[l.id] = a;
}
}
const weeklyAt = (key: string, loc: string, d: number) => {
  const s = SALES[key][loc];
  if (d >= WEEK0) return s[Math.min(7, Math.floor((d - WEEK0) / 7))];
  return (s[0] + s[1] + s[2]) / 3;
};

/** Prefix sums of units per item per store: PREFIX[key][loc][d] = units sold on days < d. */
const PREFIX: Record<string, Record<string, Float64Array>> = {};
function buildPrefix(): void {
for (const it of ITEMS) {
  PREFIX[it.key] = {};
  for (const l of LOCS) {
    const p = new Float64Array(N + 1);
    const f = DAY_F[l.id];
    for (let d = 0; d < N; d++) p[d + 1] = p[d] + weeklyAt(it.key, l.id, d) * f[d];
    PREFIX[it.key][l.id] = p;
  }
}
}
export const unitsIn = (key: string, loc: string, from: number, to: number) => {
  const p = PREFIX[key][loc];
  return p[Math.min(N, to + 1)] - p[Math.max(0, from)];
};

export interface DayTotals { gross: number; disc: number; cost: number; units: number }
/** Store totals per day (all items). */
const DAILY: Record<string, DayTotals[]> = {};
function buildDaily(): void {
for (const l of LOCS) {
  DAILY[l.id] = Array.from({ length: N }, () => ({ gross: 0, disc: 0, cost: 0, units: 0 }));
  for (const it of ITEMS) {
    const p = PREFIX[it.key][l.id], dr = discRate(it.key), c = unitCostOf(it);
    for (let d = 0; d < N; d++) {
      const u = p[d + 1] - p[d];
      const g = u * it.price, x = DAILY[l.id][d];
      x.gross += g; x.disc += g * dr; x.cost += u * c; x.units += u;
    }
  }
}
}
/** Rebuild the daily history from the current SALES table and session salt (called on every sign-in). */
export function rebuildPerformance(): void {
  buildDayFactors();
  buildPrefix();
  buildDaily();
}
rebuildPerformance();
export function dayTotals(locs: string[], d: number): DayTotals {
  const o = { gross: 0, disc: 0, cost: 0, units: 0 };
  for (const l of locs) { const x = DAILY[l][d]; o.gross += x.gross; o.disc += x.disc; o.cost += x.cost; o.units += x.units; }
  return o;
}
export function rangeTotals(locs: string[], from: number, to: number): DayTotals {
  const o = { gross: 0, disc: 0, cost: 0, units: 0 };
  for (let d = Math.max(0, from); d <= Math.min(LAST, to); d++) { const x = dayTotals(locs, d); o.gross += x.gross; o.disc += x.disc; o.cost += x.cost; o.units += x.units; }
  return o;
}

// ── periods (Dutchie-style report ranges, through yesterday)
export const PERIODS = ["Yesterday", "This week", "This month", "Last 7 days", "Last 30 days", "Year to date"] as const;
export type Period = (typeof PERIODS)[number];
export function periodRange(p: Period): { from: number; to: number } {
  const to = LAST;
  switch (p) {
    case "Yesterday": return { from: to, to };
    case "This week": { const dow = new Date(dayMs(TODAY) - 7 * 3600000).getUTCDay(); return { from: TODAY - dow, to }; }
    case "This month": return { from: idx(2026, 9, 1), to };
    case "Last 7 days": return { from: to - 6, to };
    case "Last 30 days": return { from: to - 29, to };
    default: return { from: 0, to };
  }
}
/** The equal-length range right before, for "vs previous period". */
export const prevRange = (r: { from: number; to: number }) => ({ from: r.from - (r.to - r.from + 1), to: r.from - 1 });

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"] as const;
export const monthRange = (m: number) => ({ from: idx(2026, m, 1), to: Math.min(LAST, idx(2026, m + 1, 1) - 1) });

// ── receipts: sample restock cadence per item and store (vendor SKUs also count real receipts from orders)
export function receipts(key: string, loc: string): { d: number; qty: number }[] {
  const every = 7 + Math.floor(sh(key + loc + "cad") * 3) * 7; // weekly, bi-weekly or every 3 weeks
  const off = Math.floor(sh(key + loc + "off") * every);
  const out: { d: number; qty: number }[] = [];
  for (let d = LAST - off; d >= 0; d -= every) {
    const qty = Math.max(1, Math.round(unitsIn(key, loc, d - every + 1, d) * (0.9 + 0.35 * sh(key + loc + d))));
    out.push({ d, qty });
  }
  return out;
}
