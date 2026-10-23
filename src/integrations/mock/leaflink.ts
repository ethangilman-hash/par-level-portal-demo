import type { LeafLinkAdapter, LeafLinkOrder, LeafLinkOrderStatus, LeafLinkTransition } from "../types";
import { fakeUuid, isoDate, mockCall } from "./common";
import { h } from "../../data";

const NEXT: Record<LeafLinkTransition, LeafLinkOrderStatus> = {
  accept: "Accepted", reject: "Rejected", fulfill: "Fulfilled", ship: "Shipped", complete: "Complete", cancel: "Cancelled",
};
export const leaflinkNumberFor = (po: string) => fakeUuid(`ll-${po}`);
export const leaflinkShortId = (po: string) => Array.from({ length: 6 }, (_, i) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(h(po + "sid" + i) * 32)]).join("");

export function createMockLeafLink(seed: LeafLinkOrder[]): LeafLinkAdapter {
  const orders = new Map<string, LeafLinkOrder>(seed.map((o) => [o.number, o]));
  const payments: { id: string; number: string; amount: number; date: string }[] = [];
  const need = (n: string) => {
    const o = orders.get(n);
    if (!o) throw new Error(`LeafLink order ${n} not found`);
    return o;
  };
  let entrySeq = 30400, contactSeq = 7700;
  return {
    updateCustomer: (input) => mockCall(
      { provider: "leaflink", direction: "push", operation: "updateCustomer", endpoint: "PATCH /customers/{id}/", ref: input.customer },
      () => ({ id: input.customer }),
      () => `Customer ${input.customer} updated: ${Object.keys(input).filter((k) => k !== "customer").join(", ")}`,
    ),
    createActivityEntry: (input) => mockCall(
      { provider: "leaflink", direction: "push", operation: "createActivityEntry", endpoint: "POST /activity-entries/ (type value to confirm)", ref: input.customer },
      () => ({ id: entrySeq++ }),
      (r) => `Private CRM note #${r.id} by ${input.author}`,
    ),
    createContact: (input) => mockCall(
      { provider: "leaflink", direction: "push", operation: "createContact", endpoint: "POST /contacts/", ref: input.customer },
      () => ({ id: contactSeq++ }),
      (r) => `Contact #${r.id} ${input.first_name} ${input.last_name} (${input.role})`,
    ),
    saveBuyerPreferences: (input) => mockCall(
      { provider: "leaflink", direction: "push", operation: "saveBuyerPreferences", endpoint: "Buyer-side vendor prefs: no confirmed endpoint (to confirm); kept in app", ref: input.seller },
      () => ({ stored: "app" as const }),
      () => `Preferences for ${input.seller} saved (${input.delivery_preferences})`,
    ),
    createOrder: (input) => mockCall(
      { provider: "leaflink", direction: "push", operation: "createOrder", endpoint: "POST /orders-received/", ref: input.external_id_buyer },
      () => {
        const number = leaflinkNumberFor(input.external_id_buyer);
        const total = input.line_items.reduce((s, l) => s + l.quantity * l.ordered_unit_price.amount, 0);
        const o: LeafLinkOrder = { number, short_id: leaflinkShortId(input.external_id_buyer), status: "Submitted", total: { amount: Math.round(total * 100) / 100, currency: "USD" },
          external_id_buyer: input.external_id_buyer, seller: input.seller, line_items: input.line_items, comments: input.notes ? [input.notes] : [] };
        orders.set(number, o);
        return o;
      },
      (o) => `Order ${o.short_id} created (Submitted, ${o.line_items.length} lines, $${o.total.amount.toFixed(2)})`,
    ),
    syncOrder: (input) => mockCall(
      { provider: "leaflink", direction: "push", operation: input.transition ? `syncOrder:${input.transition}` : "syncOrder:lines",
        endpoint: input.transition ? `POST /orders-received/{number}/transition/${input.transition}/` : "PATCH /orders-received/{number}/line-items/ (to confirm) + comment",
        ref: input.number.slice(0, 8) },
      () => {
        const o = need(input.number);
        const lines = input.line_items
          ? o.line_items.map((l) => ({ ...l, quantity: input.line_items?.find((x) => x.sku === l.sku)?.quantity ?? l.quantity }))
          : o.line_items;
        const next: LeafLinkOrder = {
          ...o, line_items: lines, status: input.transition ? NEXT[input.transition] : o.status,
          total: { amount: Math.round(lines.reduce((s, l) => s + l.quantity * l.ordered_unit_price.amount, 0) * 100) / 100, currency: "USD" },
          comments: input.comment ? [...o.comments, input.comment] : o.comments,
        };
        orders.set(o.number, next);
        return next;
      },
      (o) => `Order ${o.short_id} → ${o.status}${input.line_items ? ` · ${input.line_items.length} line qty updates` : ""}${input.comment ? " · comment added" : ""}`,
    ),
    getOrder: (number) => mockCall(
      { provider: "leaflink", direction: "pull", operation: "getOrder", endpoint: "GET /orders-received/{number}/", ref: number.slice(0, 8) },
      () => orders.get(number) ?? null,
      (o) => (o ? `Order ${o.short_id} is ${o.status}` : "Not found"),
    ),
    recordOrderPayment: (number, amount, date) => mockCall(
      { provider: "leaflink", direction: "push", operation: "recordOrderPayment", endpoint: "POST /order-payments/ (to confirm)", ref: number.slice(0, 8) },
      () => {
        const p = { id: fakeUuid(`pay-${number}-${payments.length}`), number, amount, date: date || isoDate(Date.now()) };
        payments.push(p);
        return { id: p.id };
      },
      () => `Payment of $${amount.toFixed(2)} recorded on the order`,
    ),
  };
}
