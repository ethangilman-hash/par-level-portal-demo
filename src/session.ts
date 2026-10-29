// Per-sign-in sample data. Every Retail or Vendor log in rolls a fresh session seed: the weekly sales table,
// daily performance history, stock snapshot, last-sold / receipt cadence and the incoming order book are all
// regenerated from it, then stay fixed until the user switches account. Orders the user created or acted on in an
// earlier session carry over, so the approve → ship → receive loop works across role switches.
import {
  BASE, CARRIERS, DAY, HOUR, LOCS, LOC_NAME, PRODUCTS, PRODUCT, RETAILER, VENDORS, VENDOR_BY_ID,
  ln, mulberry32, orderValue, rebuildSales, seedInventory, setSessionSalt,
  type InvMap, type Invoice, type LogEntry, type Order, type OrderStatus, type Payment,
} from "./data";
import { rebuildPerformance } from "./catalog/performance";
import { reseedIntegrations, withExternalIds } from "./integrations";

export interface SessionData { seed: number; orders: Order[]; invoices: Invoice[]; log: LogEntry[]; inv: InvMap }

/** A fresh 32-bit seed (crypto when available). */
export function newSeed(): number {
  const c = globalThis.crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0];
  return Math.floor(Math.random() * 2 ** 32) >>> 0;
}

type Rng = () => number;
const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T,>(r: Rng, a: readonly T[]): T => a[Math.floor(r() * a.length)];
function shuffle<T>(r: Rng, a: T[]): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}
const round2 = (n: number) => Math.round(n * 100) / 100;

const PENDING_NOTES = [
  "{p} keeps selling out by Saturday; sized to cover lead time plus {n} days of safety stock.",
  "Topping {loc} back up to Max ahead of the weekend.",
  "New batch of {p} just cleared testing; sending enough to close the gap.",
  "Velocity on {p} is up week over week; added a case.",
  "",
];
const COUNTER_NOTES = ["{p} moves slower at {loc}. Proposing {a} instead of {r}; the rest is fine.", "Shelf space is tight at {loc}; can we do {a} of {p} instead of {r}?"];
const TRIM_NOTES = ["Approved. Trimmed {p} from {r} to {a} while we clear a display.", "Approved with one change: {p} {r} → {a}."];
const REJECT_NOTES = ["We're over Max on {cat} at {loc}. Please resubmit after the next count.", "Budget for {loc} is spoken for this week; please resubmit Monday.", "Duplicate of an order already in transit; rejecting this one."];
const RECEIVE_NOTES = ["Received. One unit arrived damaged; credited on the invoice.", "Received short; vendor confirmed a backorder.", "Received in full, thanks."];
const fill = (t: string, v: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

function makeOrder(r: Rng, vendorId: string, status: OrderStatus, used: Set<number>): Order {
  const v = VENDOR_BY_ID[vendorId];
  const skus = shuffle(r, PRODUCTS.filter((p) => p.vendorId === vendorId)).slice(0, int(r, 2, 4));
  const locId = vendorId === "iron" && r() < 0.45 ? "south" : pick(r, LOCS).id;
  const lines = skus.map((p) => ln(p.sku, p.casePack * int(r, 1, p.category === "Concentrate" ? 3 : 4)));
  const mode = r() < 0.5 ? "Velocity-based" : "Order to Max";
  const loc = LOC_NAME[locId];
  const o: Order = { id: "", vendorId, locId, status, lines, mode, submittedAt: 0, notes: [] };
  const first = PRODUCT[lines[0].sku];
  const trim = (i: number) => {
    const l = lines[i];
    const a = Math.max(PRODUCT[l.sku].casePack, l.requested - PRODUCT[l.sku].casePack * int(r, 1, 2));
    l.approved = Math.min(a, l.requested - 1);
    return { p: PRODUCT[l.sku].name, r: l.requested, a: l.approved, loc };
  };
  switch (status) {
    case "Pending": {
      o.submittedAt = BASE - Math.round((1 + r() * 34) * HOUR);
      const t = pick(r, PENDING_NOTES);
      if (t) o.notes.push({ by: v.name, text: fill(t, { p: first.name, loc, n: int(r, 2, 4) }), at: o.submittedAt });
      break;
    }
    case "Countered": {
      o.submittedAt = BASE - Math.round((6 + r() * 20) * HOUR);
      o.counteredAt = BASE - Math.round((1 + r() * 4) * HOUR);
      o.notes.push({ by: RETAILER, text: fill(pick(r, COUNTER_NOTES), trim(0)), at: o.counteredAt });
      break;
    }
    case "Approved": {
      o.submittedAt = BASE - Math.round((18 + r() * 26) * HOUR);
      o.approvedAt = BASE - Math.round((2 + r() * 10) * HOUR);
      if (r() < 0.55) o.notes.push({ by: RETAILER, text: fill(pick(r, TRIM_NOTES), trim(int(r, 0, lines.length - 1))), at: o.approvedAt });
      break;
    }
    case "Shipped": {
      o.submittedAt = BASE - Math.round((2 + r() * 2) * DAY);
      o.approvedAt = o.submittedAt + Math.round((4 + r() * 18) * HOUR);
      o.shippedAt = BASE - Math.round((6 + r() * 24) * HOUR);
      o.carrier = pick(r, CARRIERS);
      o.manifest = `00048${String(int(r, 10000, 99999))}`;
      o.etaAt = BASE + Math.round((2 + r() * 20) * HOUR);
      break;
    }
    case "Received": {
      const recv = BASE - Math.round((4 + r() * 18) * DAY);
      o.submittedAt = recv - Math.round((2 + r() * 2) * DAY);
      o.approvedAt = o.submittedAt + Math.round((3 + r() * 10) * HOUR);
      o.shippedAt = recv - Math.round((12 + r() * 30) * HOUR);
      o.receivedAt = recv; o.etaAt = recv;
      o.carrier = pick(r, CARRIERS);
      o.manifest = `00048${String(int(r, 10000, 99999))}`;
      const issues: string[] = [];
      for (const l of lines) {
        l.received = l.approved; l.damaged = 0;
        const roll = r();
        if (roll < 0.12) { l.received = l.approved - 1; issues.push(`Short 1 × ${PRODUCT[l.sku].name}`); }
        else if (roll < 0.22) { l.damaged = 1; issues.push(`1 × ${PRODUCT[l.sku].name} damaged`); }
      }
      if (issues.length) {
        o.discrepancy = issues.join("; ");
        o.notes.push({ by: RETAILER, text: pick(r, RECEIVE_NOTES.slice(0, 2)), at: recv });
      } else if (r() < 0.3) o.notes.push({ by: RETAILER, text: RECEIVE_NOTES[2], at: recv });
      break;
    }
    case "Rejected": {
      o.submittedAt = BASE - Math.round((7 + r() * 9) * DAY);
      o.rejectedAt = o.submittedAt + Math.round((5 + r() * 20) * HOUR);
      o.notes.push({ by: RETAILER, text: fill(pick(r, REJECT_NOTES), { cat: first.category.toLowerCase(), loc }), at: o.rejectedAt });
      break;
    }
  }
  void used;
  return o;
}

/** Build a coherent order book: Ironic always has something to approve and something to ship; the rest is a random mix. */
function generateOrders(r: Rng, reserved: Set<number>): Order[] {
  const plan: [string, OrderStatus][] = [
    ["iron", "Pending"],
    ["iron", r() < 0.5 ? "Approved" : "Countered"],
    ["iron", "Received"],
  ];
  if (r() < 0.6) plan.push(["iron", "Shipped"]);
  if (r() < 0.35) plan.push(["iron", pick(r, ["Pending", "Approved", "Rejected", "Received"] as OrderStatus[])]);
  const others = VENDORS.filter((v) => v.id !== "iron").map((v) => v.id);
  const must: OrderStatus[] = ["Pending", "Shipped", "Received"];
  const extra = int(r, 3, 6);
  const pool: OrderStatus[] = ["Pending", "Pending", "Countered", "Approved", "Shipped", "Received", "Received", "Rejected"];
  for (const s of [...must, ...Array.from({ length: extra }, () => pick(r, pool))]) plan.push([pick(r, others), s]);
  const used = new Set<number>(reserved);
  const orders = plan.map(([v, s]) => makeOrder(r, v, s, used));
  // PO numbers follow submission order, with gaps (other stores' and cancelled orders).
  orders.sort((a, b) => a.submittedAt - b.submittedAt);
  let n = int(r, 1004, 1014);
  for (const o of orders) {
    while (used.has(n)) n++;
    used.add(n);
    o.id = `PO-${n}`;
    n += int(r, 1, 3);
  }
  // Keep IDs below 1059 (new orders from the vendor portal start at PO-1059).
  if (n > 1058) {
    let k = 1058;
    for (const o of [...orders].reverse()) {
      while (reserved.has(k)) k--;
      o.id = `PO-${k}`; k -= 1;
    }
  }
  return orders.sort((a, b) => b.submittedAt - a.submittedAt);
}

function generateInvoices(r: Rng, orders: Order[]): Invoice[] {
  type Draft = Omit<Invoice, "id"> & { order?: Order };
  const drafts: Draft[] = [];
  const payFor = (amount: number, date: number): Payment[] => {
    const age = (BASE - date) / DAY;
    const roll = r();
    if (age > 9 && roll < 0.55) return [{ at: date + Math.round((7 + r() * Math.min(14, age - 2)) * DAY), amount }];
    if (roll < 0.8) return [{ at: Math.min(BASE - DAY, date + Math.round((2 + r() * 6) * DAY)), amount: round2(Math.max(50, Math.round(amount * (0.2 + r() * 0.5) / 25) * 25)) }];
    return [];
  };
  for (const o of orders.filter((x) => x.status === "Received" && x.receivedAt)) {
    const amount = round2(orderValue(o));
    drafts.push({ vendorId: o.vendorId, locId: o.locId, orderId: o.id, date: o.receivedAt ?? BASE, amount, payments: payFor(amount, o.receivedAt ?? BASE), order: o });
  }
  const hist = int(r, 3, 5);
  for (let i = 0; i < hist; i++) {
    const date = BASE - Math.round((22 + r() * 38) * DAY);
    const amount = round2(Math.round((350 + r() * 1300) * 10) / 10);
    drafts.push({ vendorId: pick(r, VENDORS).id, locId: pick(r, LOCS).id, orderId: `PO-0${int(r, 930, 999)}`, date, amount, payments: payFor(amount, date) });
  }
  drafts.sort((a, b) => a.date - b.date);
  let n = int(r, 27400, 27600);
  return drafts.map(({ order, ...d }) => {
    const id = `INV-${n}`;
    n += int(r, 50, 140);
    if (order) order.invoiceId = id;
    return { id, ...d };
  });
}

function generateLog(orders: Order[], invoices: Invoice[]): LogEntry[] {
  const out: LogEntry[] = [];
  for (const o of orders) {
    const v = VENDOR_BY_ID[o.vendorId], loc = LOC_NAME[o.locId];
    out.push({ at: o.submittedAt, actor: v.name, vendorId: v.id, text: `${o.id} submitted for approval (${loc})` });
    if (o.counteredAt) out.push({ at: o.counteredAt, actor: RETAILER, vendorId: v.id, text: `Counter-proposal sent on ${o.id}` });
    if (o.approvedAt) out.push({ at: o.approvedAt, actor: RETAILER, vendorId: v.id, text: `${o.id} approved${o.lines.some((l) => l.approved !== l.requested) ? " with changes" : ""} (${loc})` });
    if (o.rejectedAt) out.push({ at: o.rejectedAt, actor: RETAILER, vendorId: v.id, text: `${o.id} rejected` });
    if (o.shippedAt) out.push({ at: o.shippedAt, actor: v.name, vendorId: v.id, text: `${o.id} shipped via ${(o.carrier ?? "courier").toLowerCase()}, manifest ${o.manifest}` });
    if (o.receivedAt) out.push({ at: o.receivedAt, actor: RETAILER, vendorId: v.id, text: `${o.id} received at ${loc}${o.discrepancy ? " with discrepancies" : ""}; ${o.invoiceId} generated` });
  }
  for (const i of invoices) for (const p of i.payments) out.push({ at: p.at, actor: RETAILER, vendorId: i.vendorId, text: `Payment of ${p.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })} recorded on ${i.id}` });
  return out.filter((e) => e.at <= BASE).sort((a, b) => b.at - a.at).slice(0, 14);
}

/**
 * Start a sign-in session: salt every sample generator with `seed`, rebuild sales / performance history,
 * roll a new order book, stock snapshot and invoices, and re-seed the mock integrations.
 * `carry` = state from the previous session that the user touched (kept as-is).
 */
export function startSession(seed: number, carry?: { orders: Order[]; invoices: Invoice[]; log: LogEntry[] }): SessionData {
  setSessionSalt(seed.toString(36));
  rebuildSales();
  rebuildPerformance();
  const r = mulberry32(seed);
  const keptOrders = carry?.orders ?? [];
  const reserved = new Set(keptOrders.map((o) => Number(o.id.slice(3))).filter((n) => Number.isFinite(n)));
  const fresh = generateOrders(r, reserved);
  const freshInv = generateInvoices(r, fresh);
  const ext = withExternalIds(fresh, freshInv);
  const keptIds = new Set(keptOrders.map((o) => o.id));
  const keptInvoices = (carry?.invoices ?? []).filter((i) => keptIds.has(i.orderId));
  const orders = [...keptOrders, ...ext.orders].sort((a, b) => b.submittedAt - a.submittedAt);
  const invoices = [...ext.invoices, ...keptInvoices];
  const inv = seedInventory();
  // Stock received in an earlier session stays on the shelf.
  for (const o of keptOrders) {
    if (o.status !== "Received" || !o.receivedAt) continue;
    for (const l of o.lines) {
      const k = `${o.locId}|${l.sku}`;
      if (inv[k]) inv[k] = { qoh: inv[k].qoh + Math.max(0, l.received - l.damaged), received: Math.max(inv[k].received, o.receivedAt) };
    }
  }
  const log = [...(carry?.log ?? []), ...generateLog(ext.orders, ext.invoices)].sort((a, b) => b.at - a.at);
  reseedIntegrations(orders, invoices, inv);
  return { seed, orders, invoices, log, inv };
}
