// Entry point: builds the adapter set from config (mock or live per provider) and seeds mock stores from the demo data.
import { PROVIDERS } from "./config";
import { liveStub } from "./live";
import { createMockDutchie } from "./mock/dutchie";
import { createMockLeafLink, leaflinkNumberFor, leaflinkShortId } from "./mock/leaflink";
import { createMockMetrc, packageTagFor } from "./mock/metrc";
import { createMockQuickBooks } from "./mock/quickbooks";
import type { DutchieAdapter, Integrations, LeafLinkAdapter, LeafLinkOrderStatus, MetrcAdapter, QuickBooksAdapter } from "./types";
import { PRODUCT, RETAILER, VENDOR_BY_ID, seedInventory, seedInvoices, seedOrders, lineSum, type InvMap, type Invoice, type Order, type OrderStatus } from "../data";

export * from "./types";
export { PROVIDERS, PROVIDER_ORDER, PROXY_URL_ENV } from "./config";
export { useSyncLog, getSyncLog } from "./syncLog";
export { VENDOR_LICENSE, LOC_LICENSE, isoDate } from "./mock/common";
export { STATE_TAX, LOCAL_TAX } from "./mock/dutchie";

export const LL_STATUS: Record<OrderStatus, LeafLinkOrderStatus> = {
  Pending: "Submitted", Countered: "Submitted", Approved: "Accepted", Shipped: "Shipped", Received: "Complete", Rejected: "Rejected",
} as Record<OrderStatus, LeafLinkOrderStatus>;

/** QuickBooks company ids used by the mock (one per vendor plus the retailer). */
export const QBO_COMPANY = { retailer: "retailer", vendor: (vendorId: string) => `vendor-${vendorId}` };

const isMock = (p: keyof typeof PROVIDERS) => PROVIDERS[p].mode === "mock";

/** Adds the sample external ids that the mock stores know about to the seeded orders and invoices. */
export function withExternalIds(orders: Order[], invoices: Invoice[]): { orders: Order[]; invoices: Invoice[] } {
  return {
    orders: orders.map((o) => ({
      ...o,
      leaflinkNumber: isMock("leaflink") ? leaflinkNumberFor(o.id) : undefined,
      metrcTransferId: isMock("metrc") && o.manifest ? 91000 + Number(o.id.slice(3)) : undefined,
      lines: o.lines.map((l) => ({ ...l, packageLabel: isMock("metrc") && o.manifest ? packageTagFor(`${o.manifest}-${l.sku}`) : undefined })),
    })),
    invoices: invoices.map((i) => ({
      ...i,
      qboInvoiceId: isMock("quickbooks") ? String(1500 + Number(i.id.slice(4)) % 300) : undefined,
      qboBillId: isMock("quickbooks") ? String(1200 + Number(i.id.slice(4)) % 300) : undefined,
    })),
  };
}

function build(seeded: { orders: Order[]; invoices: Invoice[] }, inv: InvMap): Integrations {
  const dutchie: DutchieAdapter = isMock("dutchie") ? createMockDutchie(inv) : liveStub<DutchieAdapter>("dutchie");
  const leaflink: LeafLinkAdapter = isMock("leaflink")
    ? createMockLeafLink(seeded.orders.map((o) => ({
      number: leaflinkNumberFor(o.id), short_id: leaflinkShortId(o.id), status: LL_STATUS[o.status], external_id_buyer: o.id, seller: VENDOR_BY_ID[o.vendorId].name,
      total: { amount: Math.round(lineSum(o.lines, (l) => l.approved) * 100) / 100, currency: "USD" as const }, comments: o.notes.map((n) => n.text),
      line_items: o.lines.map((l) => ({ product: PRODUCT[l.sku].name, sku: l.sku, quantity: l.approved, ordered_unit_price: { amount: l.unitCost, currency: "USD" as const } })),
    })))
    : liveStub<LeafLinkAdapter>("leaflink");
  const metrc: MetrcAdapter = isMock("metrc")
    ? createMockMetrc(seeded.orders.filter((o) => o.manifest).map((o) => ({
      id: o.metrcTransferId ?? 0, manifestNumber: o.manifest ?? "", status: o.status === "Received" ? "Received" as const : "In transit" as const,
      packages: o.lines.map((l) => ({ sku: l.sku, label: l.packageLabel ?? "", quantity: l.approved })),
    })))
    : liveStub<MetrcAdapter>("metrc");
  const quickbooks: QuickBooksAdapter = isMock("quickbooks")
    ? createMockQuickBooks(seeded.invoices.flatMap((i) => {
      const bal = Math.round((i.amount - i.payments.reduce((s, p) => s + p.amount, 0)) * 100) / 100;
      return [
        { companyId: QBO_COMPANY.vendor(i.vendorId), doc: { Id: i.qboInvoiceId ?? "", DocNumber: i.id, TotalAmt: i.amount, Balance: bal, type: "Invoice" as const } },
        { companyId: QBO_COMPANY.retailer, doc: { Id: i.qboBillId ?? "", DocNumber: i.id, TotalAmt: i.amount, Balance: bal, type: "Bill" as const } },
      ];
    }))
    : liveStub<QuickBooksAdapter>("quickbooks");
  return {
    mode: { dutchie: PROVIDERS.dutchie.mode, leaflink: PROVIDERS.leaflink.mode, metrc: PROVIDERS.metrc.mode, quickbooks: PROVIDERS.quickbooks.mode },
    dutchie, leaflink, metrc, quickbooks,
  };
}

const initialOrders = seedOrders();
/** The app-wide adapter set. Rebuilt on every sign-in so the mock stores match that session's sample data. */
export let integrations: Integrations = build(withExternalIds(initialOrders, seedInvoices(initialOrders)), seedInventory());
/** Re-seed every mock store (Dutchie stock, LeafLink orders, Metrc transfers, QuickBooks docs) for a new session. */
export function reseedIntegrations(orders: Order[], invoices: Invoice[], inv: InvMap): void {
  integrations = build({ orders, invoices }, inv);
}
export const RETAILER_NAME = RETAILER;

export { leaflinkNumberFor };
