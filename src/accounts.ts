// Account management (retailer → vendor accounts, vendor → retailer location accounts):
// preferences, contacts and private internal notes, plus the delivery schedule they drive.
import { DAY, HOUR, LOCS, PRODUCTS, VENDORS, VENDOR_BY_ID, BASE, h, type InvMap, type Order } from "./data";

export const FREQUENCIES = ["Weekly", "Bi-weekly", "Monthly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const FREQ_DAYS: Record<Frequency, number> = { Weekly: 7, "Bi-weekly": 14, Monthly: 28 };
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const WINDOWS = ["8–11 AM", "11 AM–2 PM", "2–5 PM"] as const;
export const ACCOUNT_STATUSES = ["Active", "Paused"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export interface AccountPrefs {
  status: AccountStatus;
  frequency: Frequency;
  deliveryDay: Weekday;
  window: string;
  /** Retailer side: where deliveries are received. Vendor side: route / service zone. */
  receiving: string;
  contactName: string;
  contactPhone: string;
  instructions: string;
  /** Retailer side: orders under this value are approved automatically (0 = off). */
  autoApproveUnder: number;
  /** Vendor side: minimum order for this account. */
  minOrder: number;
  appointmentRequired: boolean;
  paymentMethod: "ACH" | "Check" | "Cash on delivery";
}
export interface AccountNote { id: string; at: number; author: string; text: string }
export interface Contact { name: string; role: string; email: string; phone: string; primary: boolean }

// Pacific time weekday for a demo timestamp (demo runs within PDT).
const PT_OFFSET = 7 * HOUR;
const weekdayOf = (ms: number) => new Date(ms - PT_OFFSET).getUTCDay(); // 0 Sun … 6 Sat
const WD_INDEX: Record<Weekday, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };
export const dayStart = (ms: number) => { const d = new Date(ms - PT_OFFSET); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + PT_OFFSET; };

export interface Schedule { nextDelivery: number; orderBy: number; last?: number; basis: string }

/**
 * Next expected delivery: one interval after the last delivery, no earlier than lead time from now,
 * rolled forward to the preferred delivery day. An open shipment's ETA wins if it is sooner.
 */
export function schedule(p: AccountPrefs, leadDays: number, now: number, last?: number, openEta?: number): Schedule {
  const interval = FREQ_DAYS[p.frequency];
  const earliest = Math.max((last ?? now - interval * DAY) + (interval - 2) * DAY, now + leadDays * DAY);
  let d = dayStart(earliest) + 10 * HOUR;
  while (weekdayOf(d) !== WD_INDEX[p.deliveryDay]) d += DAY;
  if (openEta && openEta > now && openEta < d) return { nextDelivery: openEta, orderBy: now, last, basis: "Open shipment ETA" };
  return { nextDelivery: d, orderBy: d - leadDays * DAY, last, basis: `${p.frequency} · ${p.deliveryDay} ${p.window}` };
}

/** Last delivery of a vendor to a location: latest received order, else latest stock receipt. */
export function lastDelivery(vendorId: string, locId: string, orders: Order[], inv: InvMap): number | undefined {
  const rec = orders.filter((o) => o.vendorId === vendorId && o.locId === locId && o.receivedAt).map((o) => o.receivedAt ?? 0);
  const stock = PRODUCTS.filter((p) => p.vendorId === vendorId).map((p) => inv[`${locId}|${p.sku}`]?.received ?? 0);
  const m = Math.max(0, ...rec, ...stock);
  return m || undefined;
}
export const openEta = (vendorId: string, locId: string, orders: Order[]) =>
  orders.filter((o) => o.vendorId === vendorId && o.locId === locId && o.status === "Shipped" && o.etaAt).map((o) => o.etaAt ?? 0).sort((a, b) => a - b)[0];

const FIRST = ["Alex", "Jordan", "Sam", "Riley", "Casey", "Morgan", "Taylor", "Jamie", "Avery", "Quinn", "Drew", "Reese"];
const LAST = ["Park", "Nguyen", "Ortiz", "Haddad", "Bell", "Kowalski", "Reyes", "Lund", "Tran", "Fischer", "Okafor", "Moreau"];
const person = (seed: string) => `${FIRST[Math.floor(h(seed + "f") * FIRST.length)]} ${LAST[Math.floor(h(seed + "l") * LAST.length)]}`;
const phone = (seed: string) => `(503) 555-0${String(100 + Math.floor(h(seed + "p") * 899)).padStart(3, "0")}`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, "");

// ── retailer's view of each vendor account
export function seedRetailerPrefs(): Record<string, AccountPrefs> {
  return Object.fromEntries(VENDORS.map((v, i) => [v.id, {
    status: "Active", frequency: (["Weekly", "Weekly", "Bi-weekly", "Weekly", "Bi-weekly"] as Frequency[])[i], deliveryDay: WEEKDAYS[(i * 2 + 1) % 5],
    window: WINDOWS[i % 3], receiving: "Back-of-house receiving bay", contactName: person(`rx${v.id}`), contactPhone: phone(`rx${v.id}`),
    instructions: "Check in at the side door; manifest and invoice must travel with the delivery.", autoApproveUnder: i === 2 ? 400 : 0, minOrder: v.minOrder,
    appointmentRequired: i % 2 === 0, paymentMethod: "ACH",
  } satisfies AccountPrefs]));
}
export function seedVendorContacts(): Record<string, Contact[]> {
  return Object.fromEntries(VENDORS.map((v) => [v.id, [
    { name: person(`vc1${v.id}`), role: "Account manager", email: `${slug(person(`vc1${v.id}`))}@${v.id}.example`, phone: phone(`vc1${v.id}`), primary: true },
    { name: person(`vc2${v.id}`), role: "Accounts receivable", email: v.emails[v.emails.length - 1], phone: phone(`vc2${v.id}`), primary: false },
  ]]));
}
export function seedRetailerNotes(): Record<string, AccountNote[]> {
  const n = (vid: string, daysAgo: number, author: string, text: string): AccountNote => ({ id: `rn-${vid}-${daysAgo}`, at: BASE - daysAgo * DAY, author, text });
  return {
    hmz: [n("hmz", 12, "Store manager", "Gummy 10-packs sell out on Fridays; ask for Thursday drops when possible.")],
    myld: [n("myld", 9, "Store manager", "Rep offered a brand-funded promo for November. Revisit before the next order.")],
    poor: [n("poor", 4, "Store manager", "Short-shipped twice in September. Count the bulk jars at the dock before signing.")],
    rbd: [],
    iron: [n("iron", 2, "Store manager", "Top seller in Vaporizers at every store. Keep Max Strains at 6 for Riverside.")],
  };
}

// ── vendor's view of each retailer location account (keyed vendorId|locId)
export const accKey = (vendorId: string, locId: string) => `${vendorId}|${locId}`;
export function seedVendorPrefs(): Record<string, AccountPrefs> {
  const out: Record<string, AccountPrefs> = {};
  for (const v of VENDORS) LOCS.forEach((l, i) => {
    out[accKey(v.id, l.id)] = {
      status: "Active", frequency: i === 2 && v.id === "poor" ? "Bi-weekly" : "Weekly", deliveryDay: WEEKDAYS[(i + VENDORS.indexOf(v)) % 5], window: WINDOWS[(i + 1) % 3],
      receiving: ["Route A · Southside", "Route B · East", "Route C · River"][i], contactName: person(`lc${l.id}`), contactPhone: phone(`lc${l.id}`),
      instructions: "Deliver to receiving; store requires a printed manifest.", autoApproveUnder: 0, minOrder: v.minOrder, appointmentRequired: i === 1, paymentMethod: "ACH",
    };
  });
  return out;
}
export function seedLocationContacts(): Record<string, Contact[]> {
  return Object.fromEntries(LOCS.map((l) => [l.id, [
    { name: person(`lc${l.id}`), role: "Receiving lead", email: `receiving.${l.id}@demodispensary.example`, phone: phone(`lc${l.id}`), primary: true },
    { name: person(`lb${l.id}`), role: "Buyer / store manager", email: `buyer.${l.id}@demodispensary.example`, phone: phone(`lb${l.id}`), primary: false },
  ]]));
}
export function seedVendorNotes(): Record<string, AccountNote[]> {
  const out: Record<string, AccountNote[]> = {};
  for (const v of VENDORS) for (const l of LOCS) out[accKey(v.id, l.id)] = [];
  const add = (vid: string, lid: string, daysAgo: number, text: string) => out[accKey(vid, lid)].push({ id: `vn-${vid}-${lid}-${daysAgo}`, at: BASE - daysAgo * DAY, author: `${VENDOR_BY_ID[vid].name} sales`, text });
  add("iron", "river", 3, "Buyer wants more disposables on the shelf before the holidays; propose a bump to Max.");
  add("iron", "south", 8, "Receiving lead prefers morning drops; parking is tight after noon.");
  add("hmz", "east", 5, "Asked about a sampler for staff training.");
  add("poor", "river", 6, "Store flagged two short shipments; double-check bulk counts before loading.");
  add("myld", "south", 11, "New budtender lineup; schedule a product education session.");
  return out;
}
