// Orders → Invoice: one list of vendor invoices (received orders) plus pro-forma invoices for orders that are
// approved or in transit, with a detail view (bill-to, terms, line items from the linked order, payments).
// Archived invoices whose order predates the demo get sample line detail rebuilt from the vendor's catalog.
import { Section, Segmented, Table, Button, Status, Properties, Callout, Text, useState } from "../kit";
import { useStyles } from "../ui";
import { DAY, LOC_NAME, PRODUCT, PRODUCTS, RETAILER, STATUS_TONE, VENDOR_BY_ID, balOf, fd, fdt, h, money, orderValue, paidOf, type Invoice, type Order } from "../data";
import { VENDOR_LICENSE, LOC_LICENSE } from "../integrations";

const termDays = (vendorId: string) => Number(VENDOR_BY_ID[vendorId].terms.replace(/\D/g, "")) || 14;
type Kind = "Open" | "Partially paid" | "Paid" | "Overdue" | "Pro forma";
interface Doc { id: string; kind: Kind; vendorId: string; locId: string; orderId: string; date: number; due: number; amount: number; balance: number; inv?: Invoice; order?: Order }
interface Line { sku: string; name: string; ordered: number; received: number; damaged: number; billed: number; unitCost: number }

function linesFor(d: Doc): { lines: Line[]; archived: boolean } {
  const o = d.order;
  if (o) {
    const shipped = o.status === "Received";
    return { archived: false, lines: o.lines.map((l) => ({ sku: l.sku, name: PRODUCT[l.sku]?.name ?? l.sku, ordered: l.approved || l.requested, received: shipped ? l.received : 0, damaged: shipped ? l.damaged : 0,
      billed: shipped ? Math.max(0, l.received - l.damaged) : l.approved || l.requested, unitCost: l.unitCost })) };
  }
  // Older invoice: rebuild a plausible line split from the vendor's catalog that adds up to the invoice amount.
  const cat = PRODUCTS.filter((p) => p.vendorId === d.vendorId);
  const n = Math.min(cat.length, 2 + Math.floor(h(d.id + "n") * 3));
  const picks = [...cat].sort((a, b) => h(d.id + a.sku) - h(d.id + b.sku)).slice(0, n);
  let left = d.amount;
  const lines: Line[] = [];
  picks.forEach((p, i) => {
    const share = i === picks.length - 1 ? 1 : 1 / (picks.length - i);
    const qty = Math.max(1, Math.floor((left * share) / p.cost));
    if (qty * p.cost > left) return;
    left -= qty * p.cost;
    lines.push({ sku: p.sku, name: p.name, ordered: qty, received: qty, damaged: 0, billed: qty, unitCost: p.cost });
  });
  if (left > 0.004) lines.push({ sku: "—", name: "Freight / rounding adjustment", ordered: 1, received: 1, damaged: 0, billed: 1, unitCost: Math.round(left * 100) / 100 });
  return { lines, archived: true };
}

export function InvoicesView(props: { invoices: Invoice[]; orders: Order[]; now: number; pay: (id: string) => void; openOrder: (id: string) => void }) {
  const { small, strong, row, t } = useStyles();
  const [filter, setFilter] = useState<"all" | "open" | "paid" | "proforma">("all");
  const [sel, setSel] = useState("");

  const docs: Doc[] = [
    ...props.invoices.map((i): Doc => {
      const bal = balOf(i), due = i.date + termDays(i.vendorId) * DAY;
      const kind: Kind = bal <= 0 ? "Paid" : props.now > due ? "Overdue" : paidOf(i) > 0 ? "Partially paid" : "Open";
      return { id: i.id, kind, vendorId: i.vendorId, locId: i.locId, orderId: i.orderId, date: i.date, due, amount: i.amount, balance: bal, inv: i, order: props.orders.find((o) => o.id === i.orderId) };
    }),
    ...props.orders.filter((o) => (o.status === "Approved" || o.status === "Shipped") && !o.invoiceId).map((o): Doc => {
      const date = o.approvedAt ?? o.submittedAt;
      return { id: `PF-${o.id.slice(3)}`, kind: "Pro forma", vendorId: o.vendorId, locId: o.locId, orderId: o.id, date, due: (o.etaAt ?? date + 3 * DAY) + termDays(o.vendorId) * DAY, amount: Math.round(orderValue(o) * 100) / 100, balance: 0, order: o };
    }),
  ].sort((a, b) => b.date - a.date);
  const tone = (k: Kind) => (k === "Paid" ? "success" : k === "Overdue" ? "danger" : k === "Pro forma" ? "accent" : "warning") as "success" | "danger" | "accent" | "warning";
  const shown = docs.filter((d) => filter === "all" || (filter === "open" ? d.balance > 0 : filter === "paid" ? d.kind === "Paid" : d.kind === "Pro forma"));
  const doc = docs.find((d) => d.id === sel);
  const openBal = docs.reduce((s, d) => s + d.balance, 0);

  return (
    <>
      <Section heading="Invoices" caption={`Created automatically when you receive an order; approved and in-transit orders show a pro-forma invoice until they arrive. ${money(openBal)} open across ${docs.filter((d) => d.balance > 0).length} invoices. Demo only; no money moves.`}>
        <Segmented<"all" | "open" | "paid" | "proforma"> value={filter} onChange={setFilter} options={[
          { value: "all", label: "All", count: docs.length }, { value: "open", label: "Open balance", count: docs.filter((d) => d.balance > 0).length || undefined },
          { value: "paid", label: "Paid" }, { value: "proforma", label: "Pro forma (approved / shipped)", count: docs.filter((d) => d.kind === "Pro forma").length || undefined },
        ]} />
        {shown.length ? (
          <Table id="retail-invoices" columns={["Invoice", "Order", "Vendor", "Location", "Order status", "Invoice date", "Due", "Amount", "Balance", "Status", ""]}
            align={["start", "start", "start", "start", "start", "start", "start", "end", "end", "start", "end"]}
            rows={shown.map((d) => [d.id, d.orderId, VENDOR_BY_ID[d.vendorId].name, LOC_NAME[d.locId],
              d.order ? <Status key="o" tone={STATUS_TONE[d.order.status]}>{d.order.status}</Status> : "Received (archived)",
              fd(d.date), d.kind === "Pro forma" ? `on receipt + ${termDays(d.vendorId)}d` : fd(d.due), money(d.amount), d.kind === "Pro forma" ? "—" : d.balance > 0 ? money(d.balance) : "Paid",
              <Status key="s" tone={tone(d.kind)}>{d.kind}</Status>,
              <Button key="v" variant={sel === d.id ? "primary" : "quiet"} label={sel === d.id ? "Close" : "View"} onClick={() => setSel(sel === d.id ? "" : d.id)} />])} />
        ) : <Text>No invoices match.</Text>}
      </Section>
      {doc ? (() => {
        const { lines, archived } = linesFor(doc);
        const v = VENDOR_BY_ID[doc.vendorId];
        const sub = lines.reduce((s, l) => s + l.billed * l.unitCost, 0);
        return (
          <Section heading={`${doc.kind === "Pro forma" ? "Pro-forma invoice" : "Invoice"} ${doc.id}`} caption={`${v.name} → ${RETAILER} · ${LOC_NAME[doc.locId]}`}
            actions={<div style={row}>
              <Button variant="quiet" label={`Open order ${doc.orderId}`} disabled={!doc.order} onClick={() => props.openOrder(doc.orderId)} />
              {doc.inv && doc.balance > 0 ? <Button variant="primary" label={`Record payment (${money(doc.balance)})`} onClick={() => props.pay(doc.id)} /> : null}
            </div>}>
            {doc.kind === "Pro forma" ? <Callout tone="info" lead="Not billed yet">Quantities are the approved quantities. The final invoice is created from the counted quantities when you receive the order in Orders → Receiving.</Callout> : null}
            {archived ? <Callout tone="info" lead="Archived order">This order predates the demo's order history; line detail is sample data rebuilt to match the invoice total.</Callout> : null}
            <Properties items={[
              { label: "Vendor (seller)", value: `${v.name} · license ${VENDOR_LICENSE[v.id] ?? "—"}` },
              { label: "Bill to", value: `${RETAILER} · ${LOC_NAME[doc.locId]} · license ${LOC_LICENSE[doc.locId] ?? "—"}` },
              { label: "Invoice date", value: fd(doc.date) },
              { label: "Terms / due", value: `${v.terms} · ${doc.kind === "Pro forma" ? "due after receipt" : fd(doc.due)}` },
              { label: "Order", value: `${doc.orderId}${doc.order ? ` · ${doc.order.status}${doc.order.receivedAt ? ` ${fdt(doc.order.receivedAt)}` : doc.order.shippedAt ? ` ${fdt(doc.order.shippedAt)}` : ""}` : ""}` },
              ...(doc.order?.manifest ? [{ label: "Metrc manifest", value: doc.order.manifest }] : []),
              ...(doc.inv?.qboBillId ? [{ label: "QuickBooks bill", value: doc.inv.qboBillId }] : []),
            ]} />
            <Table columns={["SKU", "Product", "Ordered", "Received", "Damaged", "Billed qty", "Unit cost", "Line total"]} align={["start", "start", "end", "end", "end", "end", "end", "end"]}
              rows={[...lines.map((l) => [l.sku, l.name, String(l.ordered), doc.kind === "Pro forma" ? "—" : String(l.received), doc.kind === "Pro forma" ? "—" : l.damaged ? { text: String(l.damaged), tone: "danger" as const } : "0", String(l.billed), money(l.unitCost), money(l.billed * l.unitCost)]),
                ["", <span key="t" style={strong}>Total</span>, "", "", "", "", "", <span key="v" style={strong}>{money(doc.kind === "Pro forma" ? sub : doc.amount)}</span>]]} />
            {doc.inv ? (
              <>
                <span style={{ ...small, color: t.text.secondary }}>Payments</span>
                {doc.inv.payments.length ? <Table columns={["Date", "Amount", "QuickBooks"]} align={["start", "end", "start"]} rows={doc.inv.payments.map((p) => [fd(p.at), money(p.amount), p.qboBillPaymentId ?? "—"])} /> : <Text>No payments yet.</Text>}
                <div style={{ ...row, justifyContent: "flex-end" }}><span style={strong}>Balance due: {doc.balance > 0 ? money(doc.balance) : "Paid in full"}</span></div>
              </>
            ) : null}
          </Section>
        );
      })() : null}
    </>
  );
}
