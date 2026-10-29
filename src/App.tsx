import {
  Page, Section, Text, Callout, Table, Grid, Metrics, Segmented, Select, Button, Input, Toggle, Status, Steps,
  LineChart, Heatmap, Bars, Scatter, Properties, Rows, useGrokTheme, useState, useEffect, useMemo, useRef,
} from "./kit";
import type { ReactNode, CSSProperties, TableCell } from "./kit";

import {
  MENU_SKUS, COMPETITOR_SKUS, StatusToneT, Vendor, VENDORS, ALL_VENDORS, VENDOR_BY_ID, RETAILER, Loc, LOCS, LOC_NAME, LOC_FACTOR, WEEKS, CAT_BASE, CASE_PACK, CARRIERS, SLA_HOURS, MIN, HOUR, DAY, BASE, h, money, money0, dFmt, dtFmt, fd, fdt, toInt, ageLabel, Product, PRODUCTS, PRODUCT, Item, ITEMS, ITEM, buildSales, SALES, salesAt, last4, perDay, ParLevel, PARS, parOf, Stock, InvMap, seedInventory, OrderStatus, OrderLine, Note, Order, Invoice, LogEntry, STATUS_TONE, OPEN, ln, lineSum, orderValue, seedOrders, seedInvoices, paidOf, balOf, seedLog, onOrderQty, stockStatus, catRanks, rank4, Suggestion, SuggestOpts, suggest,
} from "./data";
import { useStyles, Card, Bar, SyncLine } from "./ui";
import { integrations, withExternalIds, leaflinkNumberFor, LL_STATUS, VENDOR_LICENSE, LOC_LICENSE, QBO_COMPANY, isoDate, type DutchieInventoryItem } from "./integrations";
import { InventoryTab } from "./views/InventoryTab";
import { PerformanceTab } from "./views/PerformanceTab";
import { InvoicesView } from "./views/InvoicesView";
import { FinanceTab } from "./views/FinanceTab";
import { IntegrationsTab } from "./views/IntegrationsTab";
import { AccountsTab, fdw, type AccountSpec } from "./views/AccountsTab";
import { UpdatesSection } from "./views/UpdatesSection";
import { UPDATES } from "./updates";
import { OPTION_OWNER, lastSoldAt, weeklyUnits } from "./catalog/menu";
import { Landing } from "./views/Landing";
import { newSeed, startSession } from "./session";
import { RoleBanner, TabHelp, rolePalette, type TabInfo } from "./views/Guide";
import {
  FREQ_DAYS, accKey, lastDelivery, openEta, schedule, seedLocationContacts, seedRetailerNotes, seedRetailerPrefs, seedVendorContacts, seedVendorNotes, seedVendorPrefs,
  type AccountNote, type AccountPrefs, type Contact,
} from "./accounts";

interface TLStep { label: string; at?: number; state: "done" | "current" | "todo" | "bad"; meta?: string }
function Timeline(props: { order: Order }) {
  const { t, small } = useStyles();
  const o = props.order;
  const steps: TLStep[] = [{ label: "Submitted", at: o.submittedAt, state: "done", meta: o.mode }];
  if (o.counteredAt) steps.push({ label: "Counter-proposed", at: o.counteredAt, state: "done" });
  if (o.status === "Rejected") steps.push({ label: "Rejected", at: o.rejectedAt, state: "bad" });
  else {
    steps.push({ label: "Approved", at: o.approvedAt, state: o.approvedAt ? "done" : "current" });
    steps.push({ label: "Shipped", at: o.shippedAt, state: o.shippedAt ? "done" : o.approvedAt ? "current" : "todo", meta: o.manifest });
    steps.push({
      label: "Received", at: o.receivedAt, state: o.receivedAt ? "done" : o.shippedAt ? "current" : "todo",
      meta: o.receivedAt ? o.invoiceId : o.etaAt ? `ETA ${fdt(o.etaAt)}` : undefined,
    });
  }
  const dot = (s: TLStep["state"]): CSSProperties => ({
    width: 14, height: 14, borderRadius: t.radius.full, flex: "none",
    background: s === "done" ? t.fill.accent : s === "bad" ? t.text.danger : t.bg.base,
    border: `2px solid ${s === "done" ? t.fill.accent : s === "bad" ? t.text.danger : s === "current" ? t.border.focus : t.border.default}`,
  });
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      {steps.map((s, i) => (
        <div key={s.label} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={dot(s.state)} />
            {i < steps.length - 1 ? (
              <div style={{ flex: 1, height: 2, background: steps[i + 1].state === "done" || steps[i + 1].state === "bad" ? t.fill.accent : t.border.subtle }} />
            ) : null}
          </div>
          <div style={{ paddingRight: 8 }}>
            <div style={{ fontSize: t.font.label.fontSize, lineHeight: t.font.label.lineHeight, fontWeight: t.weight.medium, color: s.state === "bad" ? t.text.danger : s.state === "todo" ? t.text.tertiary : t.text.primary }}>{s.label}</div>
            <div style={small}>{s.at ? fdt(s.at) : s.state === "current" ? "Waiting" : "—"}</div>
            {s.meta ? <div style={small}>{s.meta}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function Thread(props: { notes: Note[] }) {
  const { t, small } = useStyles();
  if (props.notes.length === 0) return <div style={small}>No notes yet.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {props.notes.map((n, i) => (
        <div key={i} style={{ background: n.by === RETAILER ? t.fill.accentSubtle : t.fill.secondary, borderRadius: t.radius.md, padding: "8px 12px" }}>
          <div style={small}>{n.by} · {fdt(n.at)}</div>
          <div style={{ fontSize: t.font.body2.fontSize, lineHeight: t.font.body2.lineHeight, color: t.text.primary }}>{n.text}</div>
        </div>
      ))}
    </div>
  );
}

interface Actions {
  approve: (id: string, qty: Record<string, number>, note: string) => void;
  counter: (id: string, qty: Record<string, number>, note: string) => void;
  reject: (id: string, note: string) => void;
  acceptCounter: (id: string) => void;
  ship: (id: string, carrier: string, etaDays: number) => void;
  receive: (id: string, rec: Record<string, { received: number; damaged: number }>, note: string) => void;
  note: (id: string, by: string, text: string) => void;
}

function OrderCard(props: { order: Order; role: "vendor" | "retailer"; now: number; inv: InvMap; act: Actions; collapsible?: boolean; defaultOpen?: boolean }) {
  const { order: o, role, now, inv, act } = props;
  const { t, small, strong, row } = useStyles();
  const [open, setOpen] = useState(props.defaultOpen ?? true);
  const big: CSSProperties = { ...strong, fontSize: t.font.heading3.fontSize, lineHeight: t.font.heading3.lineHeight };
  const v = VENDOR_BY_ID[o.vendorId];
  const [qty, setQty] = useState<Record<string, string>>(() => Object.fromEntries(o.lines.map((l) => [l.sku, String(l.approved)])));
  const [rec, setRec] = useState<Record<string, { r: string; d: string }>>(() =>
    Object.fromEntries(o.lines.map((l) => [l.sku, { r: String(l.approved), d: "0" }])),
  );
  const [note, setNote] = useState("");
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [eta, setEta] = useState(String(Math.max(1, v.leadDays - 2)));

  const retailerEditing = role === "retailer" && o.status === "Pending";
  const receiving = role === "retailer" && o.status === "Shipped";
  const qtyMap = Object.fromEntries(o.lines.map((l) => [l.sku, toInt(qty[l.sku] ?? "0")]));
  const changed = o.lines.some((l) => qtyMap[l.sku] !== l.requested);
  const editTotal = o.lines.reduce((s, l) => s + qtyMap[l.sku] * l.unitCost, 0);

  let columns: string[];
  let rows: TableCell[][];
  if (retailerEditing) {
    columns = ["SKU", "Product", "Q.O.H.", "Min / Max", "Units/day", "Requested", "Approve qty", "Line total"];
    rows = o.lines.map((l) => {
      const p = PRODUCT[l.sku];
      const par = parOf(o.locId, l.sku);
      const q = inv[`${o.locId}|${l.sku}`].qoh;
      return [
        l.sku, p.name, String(q), `${par.min} / ${par.max}`, perDay(l.sku, o.locId).toFixed(1), String(l.requested),
        <Input key="q" type="number" value={qty[l.sku] ?? ""} onChange={(val) => setQty({ ...qty, [l.sku]: val })} />,
        money(qtyMap[l.sku] * l.unitCost),
      ];
    });
  } else if (receiving) {
    columns = ["SKU", "Product", "Shipped", "Received", "Damaged", "Accepted", "Line total"];
    rows = o.lines.map((l) => {
      const e = rec[l.sku];
      const acc = Math.max(0, toInt(e.r) - toInt(e.d));
      return [
        l.sku, PRODUCT[l.sku].name, String(l.approved),
        <Input key="r" type="number" value={e.r} onChange={(val) => setRec({ ...rec, [l.sku]: { ...e, r: val } })} />,
        <Input key="d" type="number" value={e.d} onChange={(val) => setRec({ ...rec, [l.sku]: { ...e, d: val } })} />,
        acc === l.approved ? String(acc) : { text: String(acc), tone: "warning" },
        money(acc * l.unitCost),
      ];
    });
  } else {
    columns = ["SKU", "Product", "Requested", "Approved", "Received", "Damaged", "Unit cost", "Line total"];
    rows = o.lines.map((l) => {
      const accepted = Math.max(0, l.received - l.damaged);
      const base = o.status === "Received" ? accepted : o.status === "Pending" ? l.requested : l.approved;
      return [
        l.sku, PRODUCT[l.sku].name, String(l.requested),
        o.status === "Pending" || o.status === "Rejected" ? "—" : l.approved !== l.requested ? { text: String(l.approved), tone: "warning" } : String(l.approved),
        o.status === "Received" ? String(l.received) : "—",
        o.status === "Received" ? (l.damaged > 0 ? { text: String(l.damaged), tone: "danger" } : "0") : "—",
        money(l.unitCost), money(base * l.unitCost),
      ];
    });
  }

  const age = now - o.submittedAt;
  const sla = o.status === "Pending" || o.status === "Countered"
    ? age >= SLA_HOURS * HOUR ? <Status tone="danger">{`Waiting ${ageLabel(age)} · past ${SLA_HOURS}h SLA`}</Status>
      : age >= 12 * HOUR ? <Status tone="warning">{`Waiting ${ageLabel(age)}`}</Status>
        : <Status tone="neutral">{`Waiting ${ageLabel(age)}`}</Status>
    : null;
  const by = role === "retailer" ? RETAILER : v.name;
  const total = retailerEditing ? editTotal : orderValue(o);

  return (
    <Card>
      <div style={{ ...row, justifyContent: "space-between" }} data-testid={`order-card-${o.id}`}>
        <div style={row}>
          {props.collapsible ? (
            <button type="button" aria-expanded={open} aria-label={open ? `Collapse ${o.id}` : `Expand ${o.id}`} onClick={() => setOpen(!open)}
              style={{ all: "unset", cursor: "pointer", width: 22, textAlign: "center", color: t.text.secondary, fontSize: 14 }}>{open ? "▾" : "▸"}</button>
          ) : null}
          <span style={big}>{o.id}</span>
          <span style={{ ...big, color: t.text.accent }} data-testid="order-vendor">{v.name}</span>
          <Status tone={STATUS_TONE[o.status]}>{o.status === "Pending" ? "Pending approval" : o.status}</Status>
          {sla}
        </div>
        <div style={row}>
          <span style={small}>→ {LOC_NAME[o.locId]} · {o.lines.length} line{o.lines.length === 1 ? "" : "s"}</span>
          <span style={big}>{money(total)}</span>
        </div>
      </div>
      {props.collapsible && !open ? null : body()}
    </Card>
  );
  function body() { return (<>
      <Timeline order={o} />
      <Table columns={columns} rows={rows} align={columns.map((c, i) => (i >= 2 && c !== "Product" ? "end" : "start"))} />
      {o.discrepancy ? <Callout tone="warning" lead="Receiving discrepancy">{o.discrepancy}</Callout> : null}
      {o.status === "Shipped" ? (
        <div style={small}>Carrier: {o.carrier} · Manifest {o.manifest} · ETA {o.etaAt ? fdt(o.etaAt) : "—"}</div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ ...small, fontWeight: t.weight.medium }}>Notes</div>
        <Thread notes={o.notes} />
      </div>
      {o.status !== "Received" && o.status !== "Rejected" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
          <Input label={receiving ? "Receiving note (optional)" : "Add a note"} value={note} onChange={setNote} placeholder="Type a note for the other side" />
          {!retailerEditing && !receiving ? (
            <Button label="Post note" disabled={!note.trim()} onClick={() => { act.note(o.id, by, note.trim()); setNote(""); }} />
          ) : <span />}
        </div>
      ) : null}

      <div style={row}>
        {retailerEditing ? (
          <>
            <Button variant="primary" label={changed ? "Approve with changes" : "Approve"} disabled={editTotal <= 0}
              onClick={() => act.approve(o.id, qtyMap, note.trim())} />
            <Button label="Send counter-proposal" disabled={!changed}
              onClick={() => act.counter(o.id, qtyMap, note.trim())} />
            <Button label="Reject" onClick={() => act.reject(o.id, note.trim())} />
            <span style={small}>Edit quantities to approve with changes or counter; the note is attached to the order.</span>
          </>
        ) : null}
        {role === "vendor" && o.status === "Countered" ? (
          <>
            <Button variant="primary" label="Accept counter-proposal" onClick={() => act.acceptCounter(o.id)} />
            <span style={small}>Accepting approves the order at the retailer's quantities.</span>
          </>
        ) : null}
        {role === "vendor" && o.status === "Approved" ? (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 140px auto", gap: 10, alignItems: "end", width: "100%" }}>
            <Select label="Carrier" options={CARRIERS} value={carrier} onChange={setCarrier} />
            <Input label="ETA (days)" type="number" value={eta} onChange={setEta} />
            <Button variant="primary" label="Ship order" onClick={() => act.ship(o.id, carrier, Math.max(1, toInt(eta)))} />
          </div>
        ) : null}
        {receiving ? (
          <>
            <Button variant="primary" label="Mark received"
              onClick={() => act.receive(o.id, Object.fromEntries(o.lines.map((l) => [l.sku, { received: toInt(rec[l.sku].r), damaged: toInt(rec[l.sku].d) }])), note.trim())} />
            <span style={small}>Accepted units (received − damaged) are added to Q.O.H. and an invoice is generated.</span>
          </>
        ) : null}
        {role === "vendor" && o.status === "Pending" ? <span style={small}>Waiting for {RETAILER} to review.</span> : null}
        {role === "retailer" && o.status === "Countered" ? <span style={small}>Waiting for {v.name} to accept the counter-proposal.</span> : null}
        {role === "retailer" && o.status === "Approved" ? <span style={small}>Approved; waiting for {v.name} to ship.</span> : null}
        {role === "vendor" && o.status === "Shipped" ? <span style={small}>In transit; {RETAILER} will confirm receipt.</span> : null}
      </div>
  </>); }
}

// ─────────────────────────── vendor views ───────────────────────────
type VTab = "dash" | "qoh" | "par" | "insights" | "order" | "orders" | "invoices" | "retailers" | "alerts" | "settings" | "integrations";
type RTab = "overview" | "inventory" | "orders" | "finance" | "vendors" | "activity" | "integrations";
type InvSub = "all" | "belowpar" | "performance";
type OrdSub = "approvals" | "receiving" | "history" | "invoices";
/** A retailer destination: a top-level tab, or a hub tab plus its sub-view ("orders:approvals"). */
type RNav = "overview" | "finance" | "vendors" | "activity" | "integrations" | `inventory:${InvSub}` | `orders:${OrdSub}`;

interface Ctx { vendor: Vendor; loc: string; inv: InvMap; orders: Order[]; invoices: Invoice[]; now: number }

function VendorDashboard(props: Ctx & { goOrder: () => void }) {
  const { vendor, loc, inv, orders } = props;
  const { small, row } = useStyles();
  const skus = PRODUCTS.filter((p) => p.vendorId === vendor.id);
  const [pick, setPick] = useState(skus[0].sku);
  const stats = skus.map((p) => {
    const q = inv[`${loc}|${p.sku}`].qoh;
    const v = perDay(p.sku, loc);
    return { p, q, v, cover: v > 0 ? q / v : 99, par: parOf(loc, p.sku) };
  });
  const below = stats.filter((s) => s.q < s.par.min);
  const stockouts = stats.filter((s) => s.cover < vendor.leadDays);
  const openVal = orders.filter((o) => o.vendorId === vendor.id && OPEN.includes(o.status)).reduce((s, o) => s + orderValue(o), 0);
  const rec = orders.filter((o) => o.vendorId === vendor.id && o.status === "Received");
  const appr = rec.reduce((s, o) => s + o.lines.reduce((a, l) => a + l.approved, 0), 0);
  const acc = rec.reduce((s, o) => s + o.lines.reduce((a, l) => a + Math.max(0, l.received - l.damaged), 0), 0);
  const fill = appr > 0 ? (acc / appr) * 100 : 100;
  const sel = stats.find((s) => s.p.sku === pick) ?? stats[0];
  const hist = SALES[sel.p.sku];
  const ceiling = Math.max(...LOCS.flatMap((l) => hist[l.id])) * 1.15;
  const other = LOCS.filter((l) => l.id !== loc);
  const ranks = rank4(sel.p.category, loc, "units");
  const myRank = ranks.findIndex((r) => r.key === sel.p.sku) + 1;
  const coverBars = [...stats].sort((a, b) => a.cover - b.cover).slice(0, 8);
  const shortName = (s: string) => (s.length > 34 ? s.slice(0, 33) + "…" : s);

  return (
    <>
      <Metrics metrics={[
        { value: String(below.length), label: "SKUs below Min", detail: `of ${skus.length} at ${LOC_NAME[loc]}`, tone: below.length ? "danger" : "success" },
        { value: String(stockouts.length), label: "Projected stockouts", detail: `cover < ${vendor.leadDays}-day lead time`, tone: stockouts.length ? "warning" : "success" },
        { value: money0(openVal), label: "Open order value", detail: "pending, approved and in transit" },
        { value: `${fill.toFixed(1)}%`, label: "Fill rate", detail: "accepted ÷ approved units, received orders", tone: fill >= 97 ? "success" : "warning" },
      ]} />
      {below.length > 0 ? (
        <Callout tone="info" lead={`${below.length} SKU${below.length > 1 ? "s are" : " is"} below Min at ${LOC_NAME[loc]}.`}>
          The suggested order is ready to review.
        </Callout>
      ) : null}
      <div style={row}><Button variant="primary" label="Build suggested order" onClick={props.goOrder} /></div>
      <Grid columns={2}>
        <Section heading="Sell-through" caption={`Units per week at ${LOC_NAME[loc]} vs other locations · sample history`}
          actions={<Select options={skus.map((p) => ({ value: p.sku, label: shortName(p.name) }))} value={pick} onChange={setPick} />}>
          <LineChart points={WEEKS.map((w, i) => ({ label: w, value: hist[loc][i] }))} ceiling={Math.ceil(ceiling)}
            labels={[LOC_NAME[loc]]} lines={other.map((l) => ({ label: l.name, values: hist[l.id] }))} />
          <Properties items={[
            { label: "Velocity", value: `${sel.v.toFixed(1)} units/day (last 4 weeks)` },
            { label: "Q.O.H. / Min / Max", value: `${sel.q} / ${sel.par.min} / ${sel.par.max}` },
            { label: "Days of cover", value: <Status tone={sel.cover < vendor.leadDays ? "danger" : sel.cover < vendor.leadDays + 4 ? "warning" : "success"}>{sel.cover >= 99 ? "—" : `${sel.cover.toFixed(1)} days`}</Status> },
            { label: "Category rank", value: `#${myRank} of ${ranks.length} in ${sel.p.category} (units)` },
          ]} />
        </Section>
        <Section heading="Days of cover, lowest first" caption={`Q.O.H. ÷ units/day · lead time ${vendor.leadDays} days`}>
          <Bars bars={coverBars.map((s) => ({ label: shortName(s.p.name), value: Math.min(s.cover, 60), display: s.cover >= 99 ? "—" : `${s.cover.toFixed(1)}d`, meta: `${s.q} on hand` }))} emphasis="none" />
        </Section>
      </Grid>
      <Section heading="Stock vs Max across locations" caption="Each cell is Q.O.H. as % of Max; gray means out of stock. Sample data.">
        <Heatmap rows={skus.map((p) => shortName(p.name))} columns={LOCS.map((l) => l.name)}
          values={skus.map((p) => LOCS.map((l) => Math.round((inv[`${l.id}|${p.sku}`].qoh / parOf(l.id, p.sku).max) * 100)))} max={120} />
      </Section>
      <div style={small}>Velocity, par levels and on-hand counts are sample data generated for this demo.</div>
    </>
  );
}

function QohTab(props: Ctx) {
  const { vendor, loc, inv, invoices } = props;
  const skus = PRODUCTS.filter((p) => p.vendorId === vendor.id);
  const qohValue = skus.reduce((s, p) => s + inv[`${loc}|${p.sku}`].qoh * p.cost, 0);
  const shelf = skus.reduce((s, p) => s + inv[`${loc}|${p.sku}`].qoh * p.price, 0);
  const invs = invoices.filter((i) => i.vendorId === vendor.id && i.locId === loc);
  const invBal = invs.reduce((s, i) => s + balOf(i), 0);
  return (
    <>
      <Metrics metrics={[
        { value: money(invBal), label: "Total invoice balance", detail: `${invs.filter((i) => balOf(i) > 0).length} open invoice(s)` },
        { value: money(qohValue), label: "Total Q.O.H. value", detail: "at average cost" },
        { value: money(shelf), label: "Shelf value", detail: "at out-the-door price" },
        { value: money(invBal), label: "Balance due", detail: vendor.terms },
      ]} />
      <Section heading={`Quantity on hand · ${LOC_NAME[loc]}`} caption="Shelf prices adapted from a public menu; costs and quantities are sample data.">
        <Table
          columns={["Product Name", "Product Type", "Description", "Q.O.H.", "Avg Cost per Unit", "Out the Door", "Value", "Vendor", "Brand", "Received", "Status"]}
          align={["start", "start", "start", "end", "end", "end", "end", "start", "start", "start", "start"]}
          rows={skus.map((p) => {
            const s = inv[`${loc}|${p.sku}`];
            const st = stockStatus(s.qoh, parOf(loc, p.sku));
            return [
              `${p.name}${p.strain !== "N/A" ? ` (${p.strain})` : ""}`, p.category.toLowerCase(), p.group, String(s.qoh), money(p.cost), money(p.price),
              money(s.qoh * p.cost), vendor.name, p.brand, fd(s.received), <Status key="s" tone={st.tone}>{st.label}</Status>,
            ];
          })}
        />
      </Section>
    </>
  );
}

function ParTab(props: Ctx) {
  const { vendor, loc, inv } = props;
  const { row } = useStyles();
  const skus = PRODUCTS.filter((p) => p.vendorId === vendor.id);
  const groups = Array.from(new Set(skus.map((p) => p.group)));
  const [open, setOpen] = useState<string>("");
  const openSkus = skus.filter((p) => p.group === open);
  return (
    <>
      <Section heading={`Par levels · ${LOC_NAME[loc]}`} caption="Min and Max apply to each product in the description; Max Strains caps how many products of it the store carries. Set by the retailer; sample data.">
        <Table columns={["Description", "Min", "Max", "Max Strains", "Strains stocked", "Below Min", ""]}
          align={["start", "end", "end", "end", "end", "end", "end"]}
          rows={groups.map((g) => {
            const par = PARS[`${loc}|${vendor.id}|${g}`];
            const ps = skus.filter((p) => p.group === g);
            const stocked = ps.filter((p) => inv[`${loc}|${p.sku}`].qoh > 0).length;
            const below = ps.filter((p) => inv[`${loc}|${p.sku}`].qoh < par.min).length;
            return [`${vendor.name} ${g}`, String(par.min), String(par.max), String(par.maxStrains), String(stocked),
              below ? { text: String(below), tone: "danger" } : "0",
              <Button key="v" variant="quiet" label={open === g ? "Hide products" : "View Products"} onClick={() => setOpen(open === g ? "" : g)} />];
          })} />
      </Section>
      {open ? (
        <Section heading={`Products in ${vendor.name} ${open}`} actions={<div style={row}><Button label="Close" onClick={() => setOpen("")} /></div>}>
          <Table columns={["SKU", "Product", "Strain", "THC", "Q.O.H.", "Min / Max", "Status"]}
            align={["start", "start", "start", "end", "end", "end", "start"]}
            rows={openSkus.map((p) => {
              const par = parOf(loc, p.sku);
              const q = inv[`${loc}|${p.sku}`].qoh;
              const st = stockStatus(q, par);
              return [p.sku, p.name, p.strain, p.thc || "—", String(q), `${par.min} / ${par.max}`, <Status key="s" tone={st.tone}>{st.label}</Status>];
            })} />
        </Section>
      ) : null}
    </>
  );
}

function InsightsTab(props: Ctx) {
  const { vendor, loc } = props;
  const cats = Array.from(new Set(PRODUCTS.filter((p) => p.vendorId === vendor.id).map((p) => p.category)));
  const [cat, setCat] = useState(cats[0]);
  const [scope, setScope] = useState<string>(loc);
  const [by, setBy] = useState<"units" | "revenue">("units");
  const c = cats.includes(cat) ? cat : cats[0];
  const ranked = rank4(c, scope, by);
  const tot = ranked.reduce((s, r) => s + (by === "units" ? r.units : r.revenue), 0);
  const mine = PRODUCTS.filter((p) => p.vendorId === vendor.id && p.category === c);
  const brandTotals: Record<string, number> = {};
  for (const r of ranked) brandTotals[ITEM[r.key].brand] = (brandTotals[ITEM[r.key].brand] ?? 0) + (by === "units" ? r.units : r.revenue);
  const brands = Object.entries(brandTotals).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const shortName = (s: string) => (s.length > 30 ? s.slice(0, 29) + "…" : s);
  const rankSeries = mine.slice(0, 4).map((p) => ({
    label: shortName(p.name),
    values: WEEKS.map((_, w) => catRanks(c, scope, w, by).indexOf(p.sku) + 1),
  }));
  const worst = Math.max(3, ...rankSeries.flatMap((s) => s.values));
  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <Segmented options={cats} value={c} onChange={setCat} />
        <Segmented options={[{ value: "units", label: "Units" }, { value: "revenue", label: "Revenue" }]} value={by} onChange={(v) => setBy(v === "revenue" ? "revenue" : "units")} />
        <Select options={[{ value: "all", label: "All locations" }, ...LOCS.map((l) => ({ value: l.id, label: l.name }))]} value={scope} onChange={setScope} />
      </div>
      <Section heading={`${c} rankings · ${scope === "all" ? "all locations" : LOC_NAME[scope]}`} caption="Weekly average over the last 4 weeks. Your SKUs are marked. Brands are parody names; sales are sample data.">
        <Table columns={["Rank", "Product", "Brand", "Size", "Shelf price", "Units/wk", "Revenue/wk", "Share"]}
          align={["end", "start", "start", "start", "end", "end", "end", "end"]}
          emphasis={0}
          rows={ranked.slice(0, 12).map((r, i) => {
            const it = ITEM[r.key];
            const own = it.vendorId === vendor.id;
            return [
              `#${i + 1}`, own ? { text: `${it.name} · yours`, tone: "success" } : it.name, it.brand, it.size, money(it.price),
              r.units.toFixed(1), money0(r.revenue), `${(((by === "units" ? r.units : r.revenue) / tot) * 100).toFixed(1)}%`,
            ];
          })} />
      </Section>
      <Grid columns={2}>
        <Section heading={`Brand share of ${c} ${by}`} caption="Top 8 brands, last 4 weeks">
          <Bars bars={brands.map(([b, v]) => ({ label: b === vendor.name ? `${b} (you)` : b, value: v, display: by === "units" ? `${v.toFixed(0)}/wk` : money0(v) }))}
            emphasis={Math.max(0, brands.findIndex(([b]) => b === vendor.name))} />
        </Section>
        <Section heading="Price vs units sold" caption="Each dot is a SKU in the category">
          <Scatter
            points={ITEMS.filter((i) => i.category === c).map((i) => ({ x: i.price, y: Math.round(last4(salesAt(i.key, scope)) * 10) / 10, label: shortName(i.name), series: i.vendorId === vendor.id ? vendor.name : "Other brands" }))}
            x={{ name: "Shelf price", format: (n) => `$${n}` }} y={{ name: "Units/wk" }} />
        </Section>
      </Grid>
      <Grid columns={2}>
        <Section heading="Weekly category rank" caption={`Rank by ${by} each week (#1 at top)`}>
          {rankSeries.length > 0 ? (
            <LineChart points={WEEKS.map((w, i) => ({ label: w, value: worst + 1 - rankSeries[0].values[i] }))} ceiling={worst} floor={1}
              labels={[rankSeries[0].label]} lines={rankSeries.slice(1).map((s) => ({ label: s.label, values: s.values.map((v) => worst + 1 - v) }))}
              format={(n) => `#${worst + 1 - Math.round(n)}`} />
          ) : <Text>No SKUs in this category.</Text>}
        </Section>
        <Section heading="Rank by location" caption={`Last 4 weeks, by ${by}`}>
          <Table columns={["Product", ...LOCS.map((l) => l.name), "All"]} align={["start", "end", "end", "end", "end"]}
            rows={mine.map((p) => [shortName(p.name), ...[...LOCS.map((l) => l.id), "all"].map((lid) => {
              const rk = rank4(c, lid, by).findIndex((r) => r.key === p.sku) + 1;
              return rk === 1 ? { text: "#1", tone: "success" as const } : `#${rk}`;
            })])} />
        </Section>
      </Grid>
    </>
  );
}

function OrderBuilder(props: Ctx & { submit: (lines: OrderLine[], mode: string, note: string) => void; sched: { prefs: AccountPrefs; next: number; orderBy: number } }) {
  const { vendor, loc, inv, orders } = props;
  const { small, row } = useStyles();
  const [mode, setMode] = useState<"max" | "velocity">("max");
  const [safety, setSafety] = useState("3");
  const [review, setReview] = useState(String(FREQ_DAYS[props.sched.prefs.frequency]));
  const [roundCase, setRoundCase] = useState(true);
  const [capMax, setCapMax] = useState(true);
  const [hideZero, setHideZero] = useState(false);
  const [over, setOver] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const opts: SuggestOpts = { mode, safety: toInt(safety), review: toInt(review), roundCase, capMax };
  const sugg = PRODUCTS.filter((p) => p.vendorId === vendor.id).map((p) => suggest(p, loc, inv, orders, opts));
  const qtyOf = (s: Suggestion): number => (over[s.p.sku] !== undefined ? toInt(over[s.p.sku]) : s.suggested);
  const shown = hideZero ? sugg.filter((s) => qtyOf(s) > 0 || s.suggested > 0) : sugg;
  const lines = sugg.filter((s) => qtyOf(s) > 0);
  const total = lines.reduce((a, s) => a + qtyOf(s) * s.p.cost, 0);
  const units = lines.reduce((a, s) => a + qtyOf(s), 0);
  const caseIssues = lines.filter((s) => qtyOf(s) % s.p.casePack !== 0);
  const overMax = lines.filter((s) => s.qoh + s.onOrder + qtyOf(s) > s.par.max);
  const short = total < props.sched.prefs.minOrder;
  const modeLabel = mode === "max" ? "Order to Max" : "Velocity-based";

  return (
    <>
      <Section heading={`Suggested order · ${LOC_NAME[loc]}`} caption={mode === "max"
        ? "Order to Max: when Q.O.H. drops below Min, order back up to Max, net of anything already on order."
        : "Velocity-based: target = units/day × (lead time + review period) + safety stock, net of on hand and on order."}>
        <div style={{ ...row, alignItems: "end" }}>
          <Segmented options={[{ value: "max", label: "Order to Max" }, { value: "velocity", label: "Velocity-based" }]} value={mode}
            onChange={(v) => { setMode(v === "velocity" ? "velocity" : "max"); setOver({}); }} />
          {mode === "velocity" ? (
            <>
              <div style={{ width: 130 }}><Input label="Safety stock (days)" type="number" value={safety} onChange={setSafety} /></div>
              <div style={{ width: 130 }}><Input label="Review period (days)" type="number" value={review} onChange={setReview} /></div>
              <Toggle label="Cap at Max" value={capMax} onChange={setCapMax} />
            </>
          ) : null}
          <Toggle label="Round up to case pack" value={roundCase} onChange={setRoundCase} />
          <Toggle label="Hide zero lines" value={hideZero} onChange={setHideZero} />
          <Button variant="quiet" label="Reset to suggestions" onClick={() => setOver({})} />
        </div>
        <div style={small}>Lead time {vendor.leadDays} days · minimum order {money0(props.sched.prefs.minOrder)} · terms {vendor.terms}</div>
        <Callout tone="info" lead="Delivery schedule:">
          {props.sched.prefs.frequency} on {props.sched.prefs.deliveryDay} {props.sched.prefs.window} (Retailers tab). Next expected delivery {fdw(props.sched.next)}; order by {fdw(props.sched.orderBy)}.
          The velocity review period defaults to the delivery interval ({FREQ_DAYS[props.sched.prefs.frequency]} days).
        </Callout>
        <Table
          columns={["SKU", "Product", "Q.O.H.", "Min / Max", "On order", "Units/day", "Cover", "Suggested", "Order qty", "Line total", "How it's calculated"]}
          align={["start", "start", "end", "end", "end", "end", "end", "end", "end", "end", "start"]}
          rows={shown.map((s) => {
            const q = qtyOf(s);
            return [
              s.p.sku, s.p.name,
              s.qoh < s.par.min ? { text: String(s.qoh), tone: "danger" } : String(s.qoh),
              `${s.par.min} / ${s.par.max}`, String(s.onOrder), s.vday.toFixed(1),
              s.cover >= 99 ? "—" : s.cover < vendor.leadDays ? { text: `${s.cover.toFixed(1)}d`, tone: "danger" } : `${s.cover.toFixed(1)}d`,
              String(s.suggested),
              <Input key="q" type="number" value={over[s.p.sku] ?? String(s.suggested)} onChange={(v) => setOver({ ...over, [s.p.sku]: v })} />,
              q > 0 ? money(q * s.p.cost) : "—",
              <span key="m" style={small}>{s.math}</span>,
            ];
          })}
        />
      </Section>
      <Grid columns={2}>
        <Section heading="Order summary">
          <Properties items={[
            { label: "Lines / units", value: `${lines.length} lines · ${units} units` },
            { label: "Order total (cost)", value: money(total) },
            { label: "Minimum order", value: short ? <Status tone="warning">{`${money(props.sched.prefs.minOrder - total)} short of ${money0(props.sched.prefs.minOrder)}`}</Status> : <Status tone="success">Met</Status> },
            { label: "Case packs", value: caseIssues.length ? <Status tone="warning">{`${caseIssues.length} line(s) not in full cases`}</Status> : <Status tone="success">All full cases</Status> },
            { label: "Max check", value: overMax.length ? <Status tone="warning">{`${overMax.length} line(s) would exceed Max`}</Status> : <Status tone="success">Within Max</Status> },
            { label: "Method", value: modeLabel },
          ]} />
        </Section>
        <Section heading="Submit to retailer">
          <Input label="Note to buyer (optional)" value={note} onChange={setNote} placeholder="e.g. new flavor launching next week" />
          {short && lines.length > 0 ? <Callout tone="warning">Add {money(vendor.minOrder - total)} more to reach the {money0(vendor.minOrder)} minimum order.</Callout> : null}
          <div style={row}>
            <Button variant="primary" label="Submit for approval" disabled={lines.length === 0 || short}
              onClick={() => {
                props.submit(lines.map((s) => ({ sku: s.p.sku, requested: qtyOf(s), approved: qtyOf(s), received: 0, damaged: 0, unitCost: s.p.cost, basis: s.math })), modeLabel, note.trim());
                setOver({}); setNote("");
              }} />
            <span style={small}>Creates a Pending approval order for {RETAILER}, {LOC_NAME[loc]}.</span>
          </div>
        </Section>
      </Grid>
    </>
  );
}

function InvoiceTable(props: { invoices: Invoice[]; showVendor: boolean; pay?: (id: string) => void }) {
  const rows = [...props.invoices].sort((a, b) => b.date - a.date).map((i) => {
    const bal = balOf(i);
    const last = i.payments.length ? i.payments[i.payments.length - 1] : null;
    const base: TableCell[] = [fd(i.date), `${fd(i.date)} Invoice #${i.id.slice(4)}`, i.orderId];
    if (props.showVendor) base.push(VENDOR_BY_ID[i.vendorId].name, LOC_NAME[i.locId]);
    base.push(money(i.amount), last ? `${money(paidOf(i))} (last ${fd(last.at)})` : "—",
      bal > 0 ? { text: money(bal), tone: "warning" } : { text: "Paid", tone: "success" });
    if (props.pay) base.push(bal > 0 ? <Button key="p" variant="quiet" label="Record payment" onClick={() => props.pay?.(i.id)} /> : "");
    return base;
  });
  const cols = ["Date", "Invoice", "Order", ...(props.showVendor ? ["Vendor", "Location"] : []), "Invoice Amt", "Payment Amt", "Balance", ...(props.pay ? [""] : [])];
  return <Table columns={cols} rows={rows} align={cols.map((c) => (["Invoice Amt", "Payment Amt", "Balance"].includes(c) ? "end" : "start"))} />;
}

function EmailSettings(props: { vendor: Vendor; lists: { report: string[]; alert: string[] }; setLists: (l: { report: string[]; alert: string[] }) => void }) {
  const { small, row } = useStyles();
  const [r, setR] = useState("");
  const [a, setA] = useState("");
  const { lists, setLists } = props;
  const valid = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
  const block = (key: "report" | "alert", title: string, help: string, val: string, setVal: (s: string) => void) => (
    <Section heading={title} caption={help}>
      <Table columns={["Address", ""]} align={["start", "end"]}
        rows={lists[key].length ? lists[key].map((e) => [e, <Button key="x" variant="quiet" label="Remove" onClick={() => setLists({ ...lists, [key]: lists[key].filter((x) => x !== e) })} />]) : [["No addresses yet", ""]]} />
      <div style={{ ...row, alignItems: "end" }}>
        <div style={{ flex: 1, minWidth: 220 }}><Input label="Add email" value={val} onChange={setVal} placeholder="name@vendor.example" /></div>
        <Button label="Add" disabled={!valid(val) || lists[key].includes(val.trim())} onClick={() => { setLists({ ...lists, [key]: [...lists[key], val.trim()] }); setVal(""); }} />
      </div>
    </Section>
  );
  return (
    <>
      <div style={small}>These addresses receive emails from {RETAILER} for all locations. Demo only: nothing is sent.</div>
      <Grid columns={2}>
        {block("report", "Report emails", "Receive Q.O.H. reports for all locations", r, setR)}
        {block("alert", "Low stock alert emails", "Notified when a SKU drops below Min or under lead-time cover", a, setA)}
      </Grid>
    </>
  );
}

function LogTable(props: { log: LogEntry[]; vendorId?: string }) {
  const items = props.log.filter((l) => !props.vendorId || l.vendorId === props.vendorId).sort((a, b) => b.at - a.at);
  return <Table columns={["When", "Who", "What"]} rows={items.map((l) => [fdt(l.at), l.actor, l.text])} />;
}

// ─────────────────────────── retailer views ───────────────────────────
/** Same formatting as Inventory → All inventory "Last date sold". */
const lastSoldFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" });
function BelowParTable(props: { inv: InvMap; orders: Order[]; locFilter: string; now: number }) {
  const rows: TableCell[][] = [];
  const keys: (string | number | null)[][] = [];
  for (const l of LOCS) {
    if (props.locFilter !== "all" && props.locFilter !== l.id) continue;
    for (const p of PRODUCTS) {
      const q = props.inv[`${l.id}|${p.sku}`].qoh;
      const par = parOf(l.id, p.sku);
      if (q >= par.min) continue;
      const v = perDay(p.sku, l.id);
      const oo = onOrderQty(props.orders, l.id, p.sku);
      // Same calculation as All inventory: last sale of this menu option at this store.
      const own = OPTION_OWNER[p.sku];
      const sold = own ? lastSoldAt(p.sku, l.id, weeklyUnits(own.product.key, l.id) * own.option.share, props.now) : null;
      const cover = v > 0 ? q / v : null;
      rows.push([l.name, VENDOR_BY_ID[p.vendorId].name, p.sku, p.name, q === 0 ? { text: "0", tone: "danger" } : String(q),
        `${par.min} / ${par.max}`, String(par.max - q), cover !== null ? `${cover.toFixed(1)}d` : "—",
        sold ? lastSoldFmt.format(sold) : { text: "Never", tone: undefined },
        oo > 0 ? { text: `${oo} on order`, tone: "success" } : { text: "None", tone: "warning" }]);
      keys.push([l.name, VENDOR_BY_ID[p.vendorId].name, p.sku, p.name.toLowerCase(), q, par.min, par.max - q, cover, sold, oo]);
    }
  }
  if (rows.length === 0) return <Callout tone="success">Every SKU is at or above Min.</Callout>;
  return <Table id="retail-below-par" columns={["Location", "Vendor", "SKU", "Product", "Q.O.H.", "Min / Max", "Gap to Max", "Cover", "Date Last Sold", "Open order"]}
    align={["start", "start", "start", "start", "end", "end", "end", "end", "end", "start"]} rows={rows} sortKeys={keys} />;
}

/** The single vendor demo account behind "Vendor log in". */
const DEMO_VENDOR_ID = "iron";
const DEMO_VENDOR_LOC = "south";

const HOW_STEPS = [
  { title: "Pick a role on the start page", detail: "Retail log in opens the store manager console; Vendor log in opens the Ironic vendor portal. No passwords; it's sample data." },
  { title: "Vendor: choose a store location and review reports", detail: "Q.O.H., Par Levels (Min / Max / Max Strains), Category Insights, Invoice Logs and Email Settings, modeled on a typical vendor portal." },
  { title: "Vendor: build and submit an order", detail: "Suggested quantities come from Order to Max or velocity + lead time + safety stock, rounded to case packs and checked against the minimum order." },
  { title: "Retailer: approve, adjust, counter or reject", detail: "Switch account → Retail log in → Orders → Approvals. Edit line quantities, add notes, and watch the approval SLA age on each order." },
  { title: "Vendor: ship", detail: "Switch back to Vendor log in → Orders. Pick a carrier and ETA; a Metrc transfer manifest with package tags is created through the integrations layer (mock)." },
  { title: "Retailer: receive", detail: "Orders → Receiving: record received and damaged units. Metrc receives the transfer, Dutchie inventory increases, and QuickBooks gets an invoice (vendor) and a bill (retailer)." },
  { title: "Explore", detail: "Retailer: Inventory (All inventory, Below par and Performance charts), Orders (Approvals, Receiving, Order history, Invoice), Finance, Vendors (every menu brand as a vendor account) and Integrations. Vendor: Retailers accounts and Integrations. All provider calls are mocked; see the sync log." },
];

export default function ParLevelPortal() {
  const { t, small, strong, row, card } = useStyles();
  const [account, setAccount] = useState<string>("");
  const [stage, setStage] = useState<"signin" | "location" | "loading" | "portal">("signin");
  const [loc, setLoc] = useState<string>("");
  const [pickLoc, setPickLoc] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [vtab, setVtab] = useState<VTab>("dash");
  const [rtab, setRtab] = useState<RTab>("overview");
  const [invSub, setInvSub] = useState<InvSub>("all");
  const [ordSub, setOrdSub] = useState<OrdSub>("approvals");
  const rnav = (n: RNav) => {
    const [tab, sub] = n.split(":");
    setRtab(tab as RTab);
    if (tab === "inventory" && sub) setInvSub(sub as InvSub);
    if (tab === "orders" && sub) setOrdSub(sub as OrdSub);
  };
  const [rloc, setRloc] = useState<string>("all");
  const [orderFilter, setOrderFilter] = useState<"open" | "all" | "closed">("open");
  const [histSel, setHistSel] = useState<string>("");
  const [apprQ, setApprQ] = useState("");
  /** Default state of approval order rows; open (expanded) unless the retailer switches it. */
  const [apprView, setApprView] = useState<"expanded" | "collapsed">("expanded");
  const [clock, setClock] = useState(BASE);
  const [inv, setInv] = useState<InvMap>(() => seedInventory());
  const [seeded] = useState(() => { const o = seedOrders(); return withExternalIds(o, seedInvoices(o)); });
  const [orders, setOrders] = useState<Order[]>(seeded.orders);
  const [invoices, setInvoices] = useState<Invoice[]>(seeded.invoices);
  const [menu, setMenu] = useState<Record<string, DutchieInventoryItem[]>>({});
  const [dutchieAt, setDutchieAt] = useState<number>();
  const [dutchieSyncing, setDutchieSyncing] = useState(false);
  const [rPrefs, setRPrefs] = useState<Record<string, AccountPrefs>>(seedRetailerPrefs);
  const [rNotes, setRNotes] = useState<Record<string, AccountNote[]>>(seedRetailerNotes);
  const [vContacts, setVContacts] = useState<Record<string, Contact[]>>(seedVendorContacts);
  const [vPrefs, setVPrefs] = useState<Record<string, AccountPrefs>>(seedVendorPrefs);
  const [vNotes, setVNotes] = useState<Record<string, AccountNote[]>>(seedVendorNotes);
  const [lContacts, setLContacts] = useState<Record<string, Contact[]>>(seedLocationContacts);
  const [log, setLog] = useState<LogEntry[]>(() => seedLog());
  const [emails, setEmails] = useState<Record<string, { report: string[]; alert: string[] }>>(() =>
    Object.fromEntries(VENDORS.map((v) => [v.id, { report: v.emails, alert: v.emails.slice(0, 1) }])));

  useEffect(() => {
    if (stage !== "loading") return;
    const id = setInterval(() => setProgress((p) => p + 12), 110);
    return () => clearInterval(id);
  }, [stage]);
  useEffect(() => {
    if (stage === "loading" && progress >= 100) setStage("portal");
  }, [progress, stage]);

  const tick = (): number => {
    const n = clock + 20 * MIN;
    setClock(n);
    return n;
  };
  /** Bumped on every sign-in so in-flight syncs from the previous session are ignored. */
  const sessionGen = useRef(0);
  /** Orders the user created or acted on; they survive "Switch account" so the approve → ship → receive loop works. */
  const touched = useRef(new Set<string>());
  const [sessionSeed, setSessionSeed] = useState<number | null>(null);
  /** New sign-in: roll a fresh seed and regenerate orders, invoices, stock, sales history and report numbers. */
  const enterSession = () => {
    sessionGen.current += 1;
    const s = startSession(newSeed(), {
      orders: orders.filter((o) => touched.current.has(o.id)),
      invoices,
      log: log.filter((e) => e.at > BASE),
    });
    setSessionSeed(s.seed);
    setOrders(s.orders); setInvoices(s.invoices); setLog(s.log); setInv(s.inv);
    setMenu({}); setDutchieAt(undefined); setHistSel(""); setOrderFilter("open");
    void syncDutchie();
  };
  const addLog = (at: number, actor: string, vendorId: string | null, text: string) => setLog((l) => [{ at, actor, vendorId, text }, ...l]);
  /** Q.O.H. and the retail menu come from Dutchie: pull every location and apply quantities to vendor SKUs. */
  const syncDutchie = async () => {
    setDutchieSyncing(true);
    const gen = sessionGen.current;
    try {
      const res = await Promise.all(LOCS.map((l) => integrations.dutchie.getInventory(l.id)));
      if (gen !== sessionGen.current) return; // a newer sign-in re-seeded the store meanwhile
      const byLoc = Object.fromEntries(LOCS.map((l, i) => [l.id, res[i]]));
      setMenu(byLoc);
      setInv((m) => {
        const n = { ...m };
        for (const l of LOCS) for (const it of byLoc[l.id]) {
          const k = `${l.id}|${it.productId}`;
          if (n[k] && PRODUCT[it.productId]) n[k] = { ...n[k], qoh: it.quantityAvailable };
        }
        return n;
      });
      setDutchieAt(Date.now());
    } catch { /* failure is recorded in the sync log */ } finally { setDutchieSyncing(false); }
  };
  useEffect(() => {
    void syncDutchie();
    const id = setInterval(() => void syncDutchie(), 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const llSync = (o: Order | undefined, input: Omit<Parameters<typeof integrations.leaflink.syncOrder>[0], "number">) => {
    if (o?.leaflinkNumber) integrations.leaflink.syncOrder({ number: o.leaflinkNumber, ...input }).catch(() => undefined);
  };
  const upd = (id: string, f: (o: Order) => Order) => { touched.current.add(id); setOrders((os) => os.map((o) => (o.id === id ? f(o) : o))); };
  const vname = (id: string) => VENDOR_BY_ID[orders.find((o) => o.id === id)?.vendorId ?? "hmz"].name;
  const vidOf = (id: string) => orders.find((o) => o.id === id)?.vendorId ?? null;

  const act: Actions = {
    approve: (id, qty, note) => {
      const at = tick();
      const o = orders.find((x) => x.id === id);
      const changed = o ? o.lines.some((l) => qty[l.sku] !== l.requested) : false;
      upd(id, (x) => ({
        ...x, status: "Approved", approvedAt: at, lines: x.lines.map((l) => ({ ...l, approved: qty[l.sku] ?? l.approved })),
        notes: note ? [...x.notes, { by: RETAILER, text: note, at }] : x.notes,
      }));
      addLog(at, RETAILER, vidOf(id), `${id} approved${changed ? " with changes" : ""}`);
      llSync(o, { transition: "accept", line_items: o?.lines.map((l) => ({ sku: l.sku, quantity: qty[l.sku] ?? l.approved })), comment: note || undefined });
    },
    counter: (id, qty, note) => {
      const at = tick();
      upd(id, (x) => ({
        ...x, status: "Countered", counteredAt: at, lines: x.lines.map((l) => ({ ...l, approved: qty[l.sku] ?? l.approved })),
        notes: [...x.notes, { by: RETAILER, text: note || "Counter-proposal: see adjusted quantities.", at }],
      }));
      addLog(at, RETAILER, vidOf(id), `Counter-proposal sent on ${id}`);
      const o = orders.find((x) => x.id === id);
      llSync(o, { line_items: o?.lines.map((l) => ({ sku: l.sku, quantity: qty[l.sku] ?? l.approved })), comment: note || "Counter-proposal: see adjusted quantities." });
    },
    reject: (id, note) => {
      const at = tick();
      upd(id, (x) => ({ ...x, status: "Rejected", rejectedAt: at, notes: note ? [...x.notes, { by: RETAILER, text: note, at }] : x.notes }));
      addLog(at, RETAILER, vidOf(id), `${id} rejected`);
      llSync(orders.find((x) => x.id === id), { transition: "reject", comment: note || undefined });
    },
    acceptCounter: (id) => {
      const at = tick();
      upd(id, (x) => ({ ...x, status: "Approved", approvedAt: at, notes: [...x.notes, { by: vname(id), text: "Accepted the counter-proposal.", at }] }));
      addLog(at, vname(id), vidOf(id), `Counter-proposal accepted on ${id}; order approved`);
      llSync(orders.find((x) => x.id === id), { transition: "accept", comment: "Accepted the counter-proposal." });
    },
    ship: (id, carrier, etaDays) => {
      const at = tick();
      const o = orders.find((x) => x.id === id);
      if (!o) return;
      upd(id, (x) => ({ ...x, status: "Shipped", shippedAt: at, carrier, manifest: "pending (Metrc)", etaAt: at + etaDays * DAY }));
      addLog(at, vname(id), vidOf(id), `${id} shipped via ${carrier.toLowerCase()}; creating Metrc transfer manifest`);
      integrations.metrc.createTransferManifest({
        shipperLicense: VENDOR_LICENSE[o.vendorId], recipientLicense: LOC_LICENSE[o.locId], recipientName: `${RETAILER} · ${LOC_NAME[o.locId]}`, invoiceNumber: id,
        estimatedDeparture: new Date(at).toISOString(), estimatedArrival: new Date(at + etaDays * DAY).toISOString(), transporter: carrier,
        packages: o.lines.filter((l) => l.approved > 0).map((l) => ({ sku: l.sku, itemName: PRODUCT[l.sku].name, quantity: l.approved, unitOfMeasure: "Each" as const, wholesalePrice: l.unitCost })),
      }).then((tr) => {
        upd(id, (x) => ({ ...x, manifest: tr.manifestNumber, metrcTransferId: tr.id, lines: x.lines.map((l) => ({ ...l, packageLabel: tr.packages.find((p) => p.sku === l.sku)?.label })) }));
        addLog(at, vname(id), vidOf(id), `Metrc manifest ${tr.manifestNumber} created for ${id} (${tr.packages.length} tagged packages)`);
        if (o.leaflinkNumber) integrations.leaflink.syncOrder({ number: o.leaflinkNumber, transition: "ship", comment: `Metrc manifest ${tr.manifestNumber}` }).catch(() => undefined);
      }).catch(() => upd(id, (x) => ({ ...x, manifest: "Metrc manifest failed (see Integrations)" })));
    },
    receive: (id, rec, note) => {
      const at = tick();
      const o = orders.find((x) => x.id === id);
      if (!o) return;
      const issues: string[] = [];
      for (const l of o.lines) {
        const r = rec[l.sku];
        if (r.received < l.approved) issues.push(`Short ${l.approved - r.received} × ${PRODUCT[l.sku].name}`);
        if (r.received > l.approved) issues.push(`Over ${r.received - l.approved} × ${PRODUCT[l.sku].name}`);
        if (r.damaged > 0) issues.push(`${r.damaged} × ${PRODUCT[l.sku].name} damaged`);
      }
      const lines = o.lines.map((l) => ({ ...l, received: rec[l.sku].received, damaged: Math.min(rec[l.sku].damaged, rec[l.sku].received) }));
      const amount = Math.round(lines.reduce((s, l) => s + Math.max(0, l.received - l.damaged) * l.unitCost, 0) * 100) / 100;
      const invId = `INV-${Math.max(29299, ...invoices.map((i) => Number(i.id.slice(4)) || 0)) + 1}`;
      setInv((m) => {
        const n = { ...m };
        for (const l of lines) {
          const k = `${o.locId}|${l.sku}`;
          n[k] = { qoh: n[k].qoh + Math.max(0, l.received - l.damaged), received: at };
        }
        return n;
      });
      setInvoices((is) => [...is, { id: invId, vendorId: o.vendorId, locId: o.locId, orderId: id, date: at, amount, payments: [] }]);
      upd(id, (x) => ({
        ...x, status: "Received", receivedAt: at, lines, invoiceId: invId, discrepancy: issues.length ? issues.join("; ") : undefined,
        notes: note ? [...x.notes, { by: RETAILER, text: note, at }] : x.notes,
      }));
      addLog(at, RETAILER, o.vendorId, `${id} received at ${LOC_NAME[o.locId]}${issues.length ? " with discrepancies" : ""}; ${invId} generated for ${money(amount)}`);
      void (async () => {
        try {
          const accepted = lines.map((l) => ({ l, n: Math.max(0, l.received - l.damaged) }));
          if (o.manifest && /^\d+$/.test(o.manifest)) {
            await integrations.metrc.receiveTransfer({ recipientLicense: LOC_LICENSE[o.locId], manifestNumber: o.manifest,
              packages: lines.filter((l) => l.packageLabel).map((l) => ({ label: l.packageLabel ?? "", accepted: Math.max(0, l.received - l.damaged), rejected: Math.max(0, l.approved - l.received) + l.damaged, reason: l.damaged ? "Damaged" : undefined })) });
            const dmg = lines.filter((l) => l.damaged > 0 && l.packageLabel);
            if (dmg.length) await integrations.metrc.adjustPackages(LOC_LICENSE[o.locId], dmg.map((l) => ({ label: l.packageLabel ?? "", quantity: -l.damaged, unitOfMeasure: "Each" as const, reason: "Damage (reason name to confirm)", date: isoDate(at) })));
          }
          const r = await integrations.dutchie.receiveInventory({ locationId: o.locId, vendorId: o.vendorId, vendorLicense: VENDOR_LICENSE[o.vendorId], deliveredBy: o.carrier ?? "", deliveredOn: new Date(at).toISOString(),
            transactionId: o.manifest ?? id, orderTitle: id, externalId: id, items: accepted.filter((x) => x.n > 0).map((x) => ({ productId: x.l.sku, quantity: x.n, unitType: "Each" as const, packageId: x.l.packageLabel, cost: x.l.unitCost })) });
          upd(id, (x) => ({ ...x, dutchieReceiveId: r.receiveId }));
          void syncDutchie();
          const qLines = accepted.filter((x) => x.n > 0).map((x) => ({ description: `${x.l.sku} ${PRODUCT[x.l.sku].name}`, qty: x.n, unitPrice: x.l.unitCost, amount: Math.round(x.n * x.l.unitCost * 100) / 100 }));
          const due = isoDate(at + (Number(VENDOR_BY_ID[o.vendorId].terms.replace(/\D/g, "")) || 14) * DAY);
          const [qi, qb] = await Promise.all([
            integrations.quickbooks.createInvoice({ companyId: QBO_COMPANY.vendor(o.vendorId), customerName: `${RETAILER} · ${LOC_NAME[o.locId]}`, docNumber: invId, txnDate: isoDate(at), dueDate: due, lines: qLines }),
            integrations.quickbooks.createBill({ companyId: QBO_COMPANY.retailer, vendorName: VENDOR_BY_ID[o.vendorId].name, docNumber: invId, txnDate: isoDate(at), dueDate: due, lines: qLines }),
          ]);
          setInvoices((is) => is.map((i) => (i.id === invId ? { ...i, qboInvoiceId: qi.Id, qboBillId: qb.Id } : i)));
          if (o.leaflinkNumber) await integrations.leaflink.syncOrder({ number: o.leaflinkNumber, transition: "complete" });
        } catch { /* recorded in the sync log */ }
      })();
    },
    note: (id, by, text) => {
      const at = tick();
      upd(id, (x) => ({ ...x, notes: [...x.notes, { by, text, at }] }));
      addLog(at, by, vidOf(id), `Note on ${id}: “${text.length > 60 ? text.slice(0, 59) + "…" : text}”`);
    },
  };
  const submitOrder = (vendor: Vendor, lines: OrderLine[], mode: string, note: string) => {
    const at = tick();
    const num = 1059 + orders.filter((o) => Number(o.id.slice(3)) >= 1059).length;
    const id = `PO-${num}`;
    touched.current.add(id);
    const value = lineSum(lines, (l) => l.approved);
    const auto = rPrefs[vendor.id].autoApproveUnder > 0 && value < rPrefs[vendor.id].autoApproveUnder && rPrefs[vendor.id].status === "Active";
    setOrders((os) => [{ id, vendorId: vendor.id, locId: loc, status: auto ? "Approved" : "Pending", approvedAt: auto ? at : undefined, lines, mode, submittedAt: at,
      notes: [...(note ? [{ by: vendor.name, text: note, at }] : []), ...(auto ? [{ by: RETAILER, text: `Auto-approved: under the ${money0(rPrefs[vendor.id].autoApproveUnder)} limit set in Vendors → ${vendor.name} → Preferences.`, at }] : [])] }, ...os]);
    addLog(at, vendor.name, vendor.id, `${id} submitted for approval (${LOC_NAME[loc]}, ${mode})`);
    if (auto) addLog(at, RETAILER, vendor.id, `${id} auto-approved (${money(value)} under ${money0(rPrefs[vendor.id].autoApproveUnder)})`);
    integrations.leaflink.createOrder({
      external_id_buyer: id, seller: vendor.name, customer: `${RETAILER} · ${LOC_NAME[loc]}`, locationId: loc, payment_term: vendor.terms, notes: note || undefined,
      line_items: lines.map((l) => ({ product: PRODUCT[l.sku].name, sku: l.sku, quantity: l.requested, ordered_unit_price: { amount: l.unitCost, currency: "USD" as const } })),
    }).then((ll) => {
      upd(id, (x) => ({ ...x, leaflinkNumber: ll.number }));
      if (auto) integrations.leaflink.syncOrder({ number: ll.number, transition: "accept", comment: "Auto-approved by store rule" }).catch(() => undefined);
    }).catch(() => undefined);
    setOrderFilter("open");
    setVtab("orders");
  };
  const pay = (id: string) => {
    const at = tick();
    const i = invoices.find((x) => x.id === id);
    if (!i) return;
    const amount = balOf(i);
    setInvoices((is) => is.map((x) => (x.id === id ? { ...x, payments: [...x.payments, { at, amount }] } : x)));
    addLog(at, RETAILER, i.vendorId, `Payment of ${money(amount)} recorded on ${id}`);
    integrations.quickbooks.recordPayment({ docNumber: id, amount, txnDate: isoDate(at), payType: "Check", vendorCompanyId: QBO_COMPANY.vendor(i.vendorId), retailerCompanyId: QBO_COMPANY.retailer })
      .then((r) => setInvoices((is) => is.map((x) => (x.id === id ? { ...x, payments: x.payments.map((p) => (p.at === at ? { ...p, qboPaymentId: r.paymentId, qboBillPaymentId: r.billPaymentId } : p)) } : x))))
      .catch(() => undefined);
    // Historical invoices may reference orders outside the loaded window; their LeafLink number is derived the same way.
    const llNumber = orders.find((x) => x.id === i.orderId)?.leaflinkNumber ?? leaflinkNumberFor(i.orderId);
    integrations.leaflink.recordOrderPayment(llNumber, amount, isoDate(at)).catch(() => undefined);
  };
  const noteFor = (author: string, text: string): AccountNote => ({ id: `n-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, at: tick(), author, text });
  const prefSummary = (p: AccountPrefs) => `${p.frequency}, ${p.deliveryDay} ${p.window}${p.appointmentRequired ? ", appointment required" : ""}`;

  const switchAccount = () => { setAccount(""); setLoc(""); setPickLoc(""); setStage("signin"); setVtab("dash"); setRtab("overview"); setInvSub("all"); setOrdSub("approvals"); };
  const isRetailer = account === "retailer";
  const vendor = !isRetailer && account ? VENDOR_BY_ID[account] : null;
  const ctx: Ctx | null = vendor && loc ? { vendor, loc, inv, orders, invoices, now: clock } : null;


  const rc = rolePalette(t, isRetailer ? "retailer" : "vendor");
  const header = (
    <div style={{ ...card, flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", borderLeft: `6px solid ${rc.solid}` }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ ...strong, color: rc.strong }}>{RETAILER} · {isRetailer ? "Retailer console" : "Vendor Portal"}</span>
        <span style={small}>
          {account ? `Signed in as ${isRetailer ? "Store manager" : vendor?.name ?? ""}` : "Not signed in"}
          {loc && !isRetailer ? ` · ${LOC_NAME[loc]}` : ""} · Demo clock {fdt(clock)} · Sample data{sessionSeed !== null ? ` (set #${sessionSeed.toString(36).toUpperCase().slice(-5)}, re-rolled each sign-in)` : ""}
        </span>
      </div>
      <div style={row}>
        {vendor && stage === "portal" ? <Button variant="quiet" label="Change location" onClick={() => { setStage("location"); setPickLoc(loc); }} /> : null}
        {account ? <Button label="Switch account (back to start)" onClick={switchAccount} /> : null}
      </div>
    </div>
  );

  // ── sign-in / location / loading ──
  let body: ReactNode = null;
  if (stage === "signin") {
    body = (
      <Landing retailer={RETAILER} vendor={VENDOR_BY_ID[DEMO_VENDOR_ID].name}
        onEnter={(role) => {
          enterSession();
          if (role === "retailer") { setAccount("retailer"); setProgress(0); setStage("loading"); }
          else { setAccount(DEMO_VENDOR_ID); setPickLoc(DEMO_VENDOR_LOC); setStage("location"); }
        }} />
    );
  } else if (stage === "location" && vendor) {
    body = (
      <Section heading={`Welcome, ${vendor.name}`} caption={`Pick which ${RETAILER} store to look at. Reports, par levels and the suggested order are per location; Orders and Retailers cover all of them. You can change it any time from the header.`}>
        <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 12 }}>
          <Select label="Location" options={LOCS.map((l) => ({ value: l.id, label: l.name }))} value={pickLoc} onChange={setPickLoc} placeholder="Choose a location" />
          <div style={row}>
            <Button variant="primary" label="Load reports" disabled={!pickLoc} onClick={() => { setLoc(pickLoc); setProgress(0); setStage("loading"); }} />
          </div>
        </div>
      </Section>
    );
  } else if (stage === "loading") {
    body = (
      <div style={{ ...card, alignItems: "center", padding: 40 }}>
        <span style={strong}>Generating Reports…</span>
        <div style={{ width: 320 }}><Bar pct={progress} /></div>
        <span style={small}>{isRetailer ? "Loading all locations" : `Preparing ${LOC_NAME[loc]} for ${vendor?.name ?? ""}`}</span>
      </div>
    );
  } else if (stage === "portal" && ctx && vendor) {
    const myOrders = orders.filter((o) => o.vendorId === vendor.id);
    const openCount = myOrders.filter((o) => OPEN.includes(o.status)).length;
    const actionable = myOrders.filter((o) => o.status === "Approved" || o.status === "Countered").length;
    const skus = PRODUCTS.filter((p) => p.vendorId === vendor.id);
    const alerts = skus.flatMap((p) => LOCS.map((l) => {
      const q = inv[`${l.id}|${p.sku}`].qoh;
      const par = parOf(l.id, p.sku);
      const v = perDay(p.sku, l.id);
      const cover = v > 0 ? q / v : 99;
      if (q < par.min) return { lead: l.name, title: p.name, detail: `Q.O.H. ${q} below Min ${par.min} · ${cover.toFixed(1)} days of cover · ${onOrderQty(orders, l.id, p.sku)} on order`, status: { label: q === 0 ? "Out of stock" : "Below Min", tone: "danger" as const }, c: cover };
      if (cover < vendor.leadDays) return { lead: l.name, title: p.name, detail: `${cover.toFixed(1)} days of cover vs ${vendor.leadDays}-day lead time`, status: { label: "Stockout risk", tone: "warning" as const }, c: cover };
      return null;
    })).filter((x): x is NonNullable<typeof x> => x !== null).sort((a, b) => a.c - b.c);
    const myInv = invoices.filter((i) => i.vendorId === vendor.id && i.locId === loc);
    const vp = vPrefs[accKey(vendor.id, loc)];
    const vs = schedule(vp, vendor.leadDays, clock, lastDelivery(vendor.id, loc, orders, inv), openEta(vendor.id, loc, orders));
    const locAccounts: AccountSpec[] = LOCS.map((l) => ({ id: l.id, name: `${RETAILER} · ${l.name}`, subtitle: "Retail store · adult use", license: LOC_LICENSE[l.id], address: `${l.name} district, Oregon (sample address)`, terms: vendor.terms, leadDays: vendor.leadDays }));
    const shownOrders = myOrders.filter((o) => orderFilter === "all" ? true : orderFilter === "open" ? OPEN.includes(o.status) : !OPEN.includes(o.status))
      .sort((a, b) => b.submittedAt - a.submittedAt);
    const vgo = (tab: VTab) => () => setVtab(tab);
    const vHelp: Record<VTab, TabInfo> = {
      dash: { what: `your at-a-glance health at ${LOC_NAME[loc]}: SKUs below Min, projected stockouts, open order value and fill rate.`, how: "check the red/amber numbers, then build the order.", next: { label: "Suggested Order", go: vgo("order") } },
      qoh: { what: `inventory: quantity on hand for your SKUs at ${LOC_NAME[loc]}, synced from the store's POS, with cost, shelf price and stock status.`, how: "use the Status column to spot low or out-of-stock products.", next: { label: "Par Levels", go: vgo("par") } },
      par: { what: "the Min / Max targets the retailer set for each product line. Anything below Min should be reordered.", how: "click View Products to see which SKUs in a line are short.", next: { label: "Suggested Order", go: vgo("order") } },
      insights: { what: "rank / transparency view: how your products rank against other brands in each category, by units or revenue, per store.", how: "switch category and Units/Revenue at the top; rows marked “yours” are your SKUs." },
      order: { what: "build an order for this store. Quantities are suggested from par (Order to Max) or sales velocity and lead time.", how: "adjust any Order qty, check the summary, then Submit for approval. It lands in the retailer's Approvals queue.", next: { label: "Orders", go: vgo("orders") } },
      orders: { what: "every order you've sent, across all stores, with its timeline.", how: "Approved orders show a Ship form (carrier + ETA). Countered orders need you to accept the retailer's quantities. Pending ones wait on the retailer." },
      invoices: { what: `invoices for ${LOC_NAME[loc]}, created automatically when the retailer receives an order, with payments and balance due.` },
      retailers: { what: "one account page per store (LeafLink-style): delivery schedule, contacts, private notes and preferences.", how: "click Open account, then use the Overview / Orders / Contacts / Notes / Preferences sub-tabs." },
      alerts: { what: "low-stock alerts across all stores plus a log of everything that happened on your orders." },
      settings: { what: "who on your team receives Q.O.H. reports and low-stock alert emails (demo only; nothing is sent)." },
      integrations: { what: "how each screen maps to Dutchie, LeafLink, Metrc and QuickBooks, with a log of mock API calls." },
    };
    const vLabels: Record<VTab, string> = { dash: "Dashboard", qoh: "Q.O.H.", par: "Par Levels", insights: "Category Insights", order: "Suggested Order", orders: "Orders", invoices: "Invoice Logs", retailers: "Retailers", alerts: "Alerts & Activity", settings: "Email Settings", integrations: "Integrations" };
    body = (
      <>
        <RoleBanner<VTab> role="vendor" title={`Vendor portal · ${vendor.name} at ${LOC_NAME[loc]}`} current={vtab} go={setVtab}
          intro={<>You're the brand. See how your products are stocking at each {RETAILER} store, build the restock order, and ship it once the store approves. <strong>Suggested path:</strong></>}
          path={[
            { tab: "qoh", label: "1. See inventory", hint: "Q.O.H. & par for your SKUs" },
            { tab: "order", label: "2. Build order", hint: "Suggested qty → submit" },
            { tab: "orders", label: "3. Ship", hint: "after the retailer approves" },
            { tab: "retailers", label: "4. Manage accounts", hint: "delivery prefs, contacts" },
          ]}
          tip={<>Approvals happen on the retailer side: after you submit, use Switch account → Retail log in → Orders → Approvals, then come back here to ship.</>} />
        <Segmented<VTab> value={vtab} onChange={setVtab} options={[
          { value: "dash", label: "Dashboard" }, { value: "qoh", label: "Q.O.H." }, { value: "par", label: "Par Levels" },
          { value: "insights", label: "Category Insights" }, { value: "order", label: "Suggested Order" },
          { value: "orders", label: "Orders", count: actionable || undefined }, { value: "invoices", label: "Invoice Logs" }, { value: "retailers", label: "Retailers" },
          { value: "alerts", label: "Alerts & Activity", count: alerts.length || undefined }, { value: "settings", label: "Email Settings" }, { value: "integrations", label: "Integrations" },
        ]} />
        <TabHelp role="vendor" tab={vLabels[vtab]} info={vHelp[vtab]} />
        {vtab === "dash" ? <VendorDashboard {...ctx} goOrder={() => setVtab("order")} /> : null}
        {vtab === "qoh" ? <><SyncLine provider="Dutchie POS" at={dutchieAt} syncing={dutchieSyncing} onSync={() => void syncDutchie()} /><QohTab {...ctx} /></> : null}
        {vtab === "par" ? <ParTab {...ctx} /> : null}
        {vtab === "insights" ? <InsightsTab {...ctx} /> : null}
        {vtab === "order" ? <OrderBuilder key={`${vendor.id}-${loc}`} {...ctx} submit={(l, m, n) => submitOrder(vendor, l, m, n)} sched={{ prefs: vp, next: vs.nextDelivery, orderBy: vs.orderBy }} /> : null}
        {vtab === "orders" ? (
          <Section heading={`Your orders · all locations`} caption={`${openCount} open`}
            actions={<Segmented value={orderFilter} onChange={(v) => setOrderFilter(v === "all" ? "all" : v === "closed" ? "closed" : "open")}
              options={[{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }, { value: "all", label: "All" }]} />}>
            {shownOrders.length === 0 ? <Text>No orders in this view.</Text> : shownOrders.map((o) => (
              <OrderCard key={`${o.id}-${o.status}`} order={o} role="vendor" now={clock} inv={inv} act={act} />
            ))}
          </Section>
        ) : null}
        {vtab === "invoices" ? (
          <>
            <Metrics metrics={[
              { value: money(myInv.reduce((s, i) => s + i.amount, 0)), label: "Invoiced", detail: `${myInv.length} invoices at ${LOC_NAME[loc]}` },
              { value: money(myInv.reduce((s, i) => s + paidOf(i), 0)), label: "Payments received" },
              { value: money(myInv.reduce((s, i) => s + balOf(i), 0)), label: "Amount due", detail: vendor.terms },
              { value: money(skus.reduce((s, p) => s + inv[`${loc}|${p.sku}`].qoh * p.cost, 0)), label: "Q.O.H. value", detail: "at cost" },
            ]} />
            <Section heading={`Invoice logs · ${LOC_NAME[loc]}`} caption="Invoices are generated automatically when the retailer receives an order.">
              {myInv.length ? <InvoiceTable invoices={myInv} showVendor={false} /> : <Text>No invoices at this location yet.</Text>}
            </Section>
          </>
        ) : null}
        {vtab === "alerts" ? (
          <Grid columns={2}>
            <Section heading="Low-stock alerts · all locations" caption={`Sent to ${emails[vendor.id].alert.join(", ") || "no one yet (see Email Settings)"} · demo only`}>
              {alerts.length ? <Rows rows={alerts.slice(0, 12).map(({ c, ...r }) => { void c; return r; })} /> : <Text>No alerts.</Text>}
            </Section>
            <Section heading="Activity">
              <LogTable log={log} vendorId={vendor.id} />
            </Section>
          </Grid>
        ) : null}
        {vtab === "retailers" ? (
          <AccountsTab role="vendor" noun="location" me={`${vendor.name} sales`} accounts={locAccounts} now={clock}
            prefs={Object.fromEntries(LOCS.map((l) => [l.id, vPrefs[accKey(vendor.id, l.id)]]))}
            savePrefs={(id, p) => {
              setVPrefs((m) => ({ ...m, [accKey(vendor.id, id)]: p }));
              const sc = schedule(p, vendor.leadDays, clock, lastDelivery(vendor.id, id, orders, inv), openEta(vendor.id, id, orders));
              addLog(tick(), vendor.name, vendor.id, `Account preferences updated for ${LOC_NAME[id]} (${prefSummary(p)})`);
              integrations.leaflink.updateCustomer({ customer: `${RETAILER} · ${LOC_NAME[id]}`, delivery_preferences: prefSummary(p), directions: p.instructions, next_contact_date: isoDate(sc.orderBy), status: p.status }).catch(() => undefined);
            }}
            notes={Object.fromEntries(LOCS.map((l) => [l.id, vNotes[accKey(vendor.id, l.id)] ?? []]))}
            addNote={(id, text) => {
              const n = noteFor(`${vendor.name} sales`, text);
              setVNotes((m) => ({ ...m, [accKey(vendor.id, id)]: [...(m[accKey(vendor.id, id)] ?? []), n] }));
              integrations.leaflink.createActivityEntry({ customer: `${RETAILER} · ${LOC_NAME[id]}`, entry: text, date: new Date(n.at).toISOString(), type: "Note", author: n.author }).catch(() => undefined);
            }}
            contacts={lContacts}
            addContact={(id, c) => {
              setLContacts((m) => ({ ...m, [id]: [...(c.primary ? (m[id] ?? []).map((x) => ({ ...x, primary: false })) : (m[id] ?? [])), c] }));
              const [first, ...rest] = c.name.trim().split(" ");
              integrations.leaflink.createContact({ customer: `${RETAILER} · ${LOC_NAME[id]}`, first_name: first, last_name: rest.join(" "), email: c.email, phone: c.phone, role: c.role, is_primary: c.primary }).catch(() => undefined);
            }}
            ordersOf={(id) => orders.filter((o) => o.vendorId === vendor.id && o.locId === id)}
            invoicesOf={(id) => invoices.filter((i) => i.vendorId === vendor.id && i.locId === id)}
            scheduleRows={(id) => [{ label: "", last: lastDelivery(vendor.id, id, orders, inv), eta: openEta(vendor.id, id, orders) }]}
            sharedPrefs={() => `${prefSummary(rPrefs[vendor.id])} · receiving: ${rPrefs[vendor.id].receiving}`} />
        ) : null}
        {vtab === "integrations" ? <IntegrationsTab role="vendor" /> : null}
        {vtab === "settings" ? <EmailSettings vendor={vendor} lists={emails[vendor.id]} setLists={(l) => setEmails({ ...emails, [vendor.id]: l })} /> : null}
      </>
    );
  } else if (stage === "portal" && isRetailer) {
    const inLoc = (o: { locId: string }) => rloc === "all" || o.locId === rloc;
    const pending = orders.filter((o) => (o.status === "Pending" || o.status === "Countered") && inLoc(o)).sort((a, b) => a.submittedAt - b.submittedAt);
    const shipped = orders.filter((o) => o.status === "Shipped" && inLoc(o));
    const approvedWaiting = orders.filter((o) => o.status === "Approved" && inLoc(o));
    const belowCount = (vid: string, lid: string) => PRODUCTS.filter((p) => p.vendorId === vid && inv[`${lid}|${p.sku}`].qoh < parOf(lid, p.sku).min).length;
    const totalBelow = LOCS.filter((l) => rloc === "all" || l.id === rloc).reduce((s, l) => s + VENDORS.reduce((a, v) => a + belowCount(v.id, l.id), 0), 0);
    const ap = invoices.filter(inLoc).reduce((s, i) => s + balOf(i), 0);
    const approvedTimes = orders.filter((o) => o.approvedAt).map((o) => ((o.approvedAt ?? 0) - o.submittedAt) / HOUR);
    const avgAppr = approvedTimes.length ? approvedTimes.reduce((a, b) => a + b, 0) / approvedTimes.length : 0;
    const breached = pending.filter((o) => clock - o.submittedAt >= SLA_HOURS * HOUR).length;
    const hist = orders.filter(inLoc).sort((a, b) => b.submittedAt - a.submittedAt);
    const selOrder = hist.find((o) => o.id === histSel);
    const rgo = (n: RNav) => () => rnav(n);
    const cur: RNav = rtab === "inventory" ? `inventory:${invSub}` : rtab === "orders" ? `orders:${ordSub}` : rtab;
    const rHelp: Record<RNav, TabInfo> = {
      overview: { what: "your morning check: orders waiting for approval, inbound shipments and SKUs below Min across stores.", how: "use the location picker on the right to focus on one store.", next: { label: "Orders → Approvals", go: rgo("orders:approvals") } },
      "inventory:all": { what: "live inventory from Dutchie POS, laid out like Dutchie's Inventory page: SKU, product, brand/vendor, location (room), available, price, cost, sales velocity and last date sold.", how: "search, then filter by Store, Status, Vendor, Location, Category, Tags or More; click a column header to sort. Low / out-of-stock quantities are colored against par. Receive inventory opens Orders → Receiving.", next: { label: "Below par", go: rgo("inventory:belowpar") } },
      "inventory:belowpar": { what: "every par-tracked SKU under its Min, across all vendors, with the gap to Max and whether it's already on order.", next: { label: "Performance", go: rgo("inventory:performance") } },
      "inventory:performance": { what: "Dutchie-style sales reports: KPIs (gross sales, discounts, inventory cost and profit), daily sales, top sales breakdown, a performance ranking with quantity received, sales velocity and last sold, plus monthly and by-location trends.", how: "pick a period on each card; click a donut row to drill into a category or brand; switch the ranking between Master Categories, Categories, Products, Brands and Tags.", next: { label: "Orders → Approvals", go: rgo("orders:approvals") } },
      "orders:approvals": { what: "vendor orders waiting on you, oldest first, with on-hand and par next to each line.", how: "edit quantities if needed, then Approve, Send counter-proposal or Reject. The vendor ships approved orders.", next: { label: "Receiving", go: rgo("orders:receiving") } },
      "orders:receiving": { what: "shipments in transit to your stores.", how: "count each line, enter shorts or damages, then Mark received. Stock goes up and an invoice is created.", next: { label: "Invoice", go: rgo("orders:invoices") } },
      "orders:history": { what: "every order with every vendor. Click Details to see its timeline and notes.", next: { label: "Invoice", go: rgo("orders:invoices") } },
      "orders:invoices": { what: "vendor invoices for received orders plus pro-forma invoices for approved and shipped orders. Click View for bill-to, terms, line items and payments.", how: "Record payment settles the balance (demo only; no money moves).", next: { label: "Finance", go: rgo("finance") } },
      finance: { what: "store finances: balance book, payables aging, sales and tax, discounts, margin by category/brand and the cash/safe log." },
      vendors: { what: `one account page per vendor (LeafLink-style) for every brand on the menu (${ALL_VENDORS.length} accounts): delivery preference (weekly / bi-weekly / monthly), auto-approve limit, contacts and private notes.`, how: "search or filter by frequency, click Open account, then use the Preferences sub-tab to set delivery day and auto-approve." },
      activity: { what: "a running log of every approval, shipment, receipt, payment and note." },
      integrations: { what: "how each screen maps to Dutchie, LeafLink, Metrc and QuickBooks, with a log of mock API calls." },
    };
    const rLabels: Record<RNav, string> = {
      overview: "Overview", "inventory:all": "Inventory → All inventory", "inventory:belowpar": "Inventory → Below par", "inventory:performance": "Inventory → Performance",
      "orders:approvals": "Orders → Approvals", "orders:receiving": "Orders → Receiving", "orders:history": "Orders → Order history", "orders:invoices": "Orders → Invoice",
      finance: "Finance", vendors: "Vendors", activity: "Activity", integrations: "Integrations",
    };
    const belowRows = LOCS.filter((l) => rloc === "all" || l.id === rloc).reduce((s, l) => s + PRODUCTS.filter((p) => inv[`${l.id}|${p.sku}`].qoh < parOf(l.id, p.sku).min).length, 0);
    const openInv = invoices.filter((i) => inLoc(i) && balOf(i) > 0).length;
    const pathCur: RNav | "inventory" = rtab === "inventory" ? "inventory" : cur;
    body = (
      <>
        <RoleBanner<RNav | "inventory"> role="retailer" title={`Retailer console · ${RETAILER}`} current={pathCur} go={(n) => rnav(n === "inventory" ? "inventory:all" : n)}
          intro={<>You're the store manager for {LOCS.map((l) => l.name).join(", ")}. Vendors propose restock orders; you approve them and check them in. <strong>Suggested path:</strong></>}
          path={[
            { tab: "inventory", label: "1. See inventory", hint: "stock vs par, below par, performance" },
            { tab: "orders:approvals", label: "2. Approve orders", hint: `Orders → Approvals${pending.length ? ` · ${pending.length} waiting` : ""}` },
            { tab: "orders:receiving", label: "3. Receive", hint: "Orders → Receiving, after the vendor ships" },
            { tab: "finance", label: "4. Finance", hint: "payables, sales, margin" },
            { tab: "vendors", label: "5. Vendors", hint: "preferences & auto-approve" },
          ]}
          tip={<>Shipping happens on the vendor side: after you approve an Ironic order, use Switch account → Vendor log in → Orders to ship it, then come back to Orders → Receiving.</>} />
        <div style={{ ...row, justifyContent: "space-between" }}>
          <Segmented<RTab> value={rtab} onChange={setRtab} options={[
            { value: "overview", label: "Overview" }, { value: "inventory", label: "Inventory" },
            { value: "orders", label: "Orders", count: pending.length + shipped.length || undefined }, { value: "finance", label: "Finance" }, { value: "vendors", label: "Vendors" },
            { value: "activity", label: "Activity" }, { value: "integrations", label: "Integrations" },
          ]} />
          <Select options={[{ value: "all", label: "All locations" }, ...LOCS.map((l) => ({ value: l.id, label: l.name }))]} value={rloc} onChange={setRloc} />
        </div>
        {rtab === "inventory" ? (
          <div data-testid="inventory-subnav"><Segmented<InvSub> value={invSub} onChange={setInvSub} options={[
            { value: "all", label: "All inventory" }, { value: "belowpar", label: "Below par", count: belowRows || undefined }, { value: "performance", label: "Performance" },
          ]} /></div>
        ) : null}
        {rtab === "orders" ? (
          <div data-testid="orders-subnav"><Segmented<OrdSub> value={ordSub} onChange={setOrdSub} options={[
            { value: "approvals", label: "Approvals", count: pending.length || undefined }, { value: "receiving", label: "Receiving", count: shipped.length || undefined },
            { value: "history", label: "Order history" }, { value: "invoices", label: "Invoice", count: openInv || undefined },
          ]} /></div>
        ) : null}
        <TabHelp role="retailer" tab={rLabels[cur]} info={rHelp[cur]} />
        {rtab === "overview" ? (
          <>
            <div data-testid="store-licenses" style={{ display: "grid", gridTemplateColumns: `repeat(${LOCS.length}, minmax(0, 1fr))`, gap: 12 }}>
              {LOCS.map((l) => {
                const below = VENDORS.reduce((s, v) => s + belowCount(v.id, l.id), 0);
                const waiting = pending.filter((o) => o.locId === l.id).length;
                return (
                  <div key={l.id} data-testid={`store-${l.id}`} style={{ ...card, gap: 2, padding: "12px 16px", borderLeft: `4px solid ${rc.solid}` }}>
                    <span style={{ ...strong, fontSize: t.font.heading3.fontSize }}>{l.name}</span>
                    <span style={{ ...small, fontFamily: t.font.mono, color: t.text.primary }}>License {LOC_LICENSE[l.id]}</span>
                    <span style={small}>Adult-use retail · {waiting} awaiting approval · {below} SKUs below Min</span>
                  </div>
                );
              })}
            </div>
            <Metrics metrics={[
              { value: String(pending.length), label: "Awaiting approval", detail: breached ? `${breached} past ${SLA_HOURS}h SLA` : "all within SLA", tone: breached ? "danger" : "success" },
              { value: `${avgAppr.toFixed(1)}h`, label: "Avg time to approve", detail: `target under ${SLA_HOURS}h` },
              { value: String(shipped.length + approvedWaiting.length), label: "Inbound orders", detail: `${shipped.length} in transit · ${approvedWaiting.length} awaiting ship` },
              { value: String(totalBelow), label: "SKUs below Min", detail: `${money0(ap)} open payables` },
            ]} />
            <Grid columns={2}>
              <Section heading="Below Min by vendor and location" caption="Count of SKUs under Min · sample data">
                <Heatmap rows={VENDORS.map((v) => v.name)} columns={LOCS.map((l) => `${l.name} · ${LOC_LICENSE[l.id]}`)} values={VENDORS.map((v) => LOCS.map((l) => belowCount(v.id, l.id)))} />
              </Section>
              <Section heading="Approval queue by age" caption={`SLA ${SLA_HOURS} hours from submission`}>
                {pending.length ? (
                  <Rows rows={pending.map((o) => {
                    const age = clock - o.submittedAt;
                    return {
                      lead: o.id, title: `${VENDOR_BY_ID[o.vendorId].name} → ${LOC_NAME[o.locId]}`,
                      detail: `${o.lines.length} lines · ${money(orderValue(o))} · ${o.status === "Countered" ? "counter sent" : o.mode}`,
                      status: { label: `${ageLabel(age)} old`, tone: age >= SLA_HOURS * HOUR ? "danger" as const : age >= 12 * HOUR ? "warning" as const : "success" as const },
                    };
                  })} />
                ) : <Text>Queue is clear.</Text>}
                <div style={row}><Button variant="primary" label="Open Orders → Approvals" onClick={() => rnav("orders:approvals")} /></div>
              </Section>
            </Grid>
            <Section heading="Inbound shipments">
              {shipped.length ? (
                <Table id="retail-inbound-shipments" columns={["Order", "Vendor", "Location", "Carrier", "Manifest", "Shipped", "ETA", "Value"]}
                  rows={shipped.map((o) => [o.id, VENDOR_BY_ID[o.vendorId].name, LOC_NAME[o.locId], o.carrier ?? "", o.manifest ?? "", o.shippedAt ? fdt(o.shippedAt) : "", o.etaAt ? fdt(o.etaAt) : "", money(orderValue(o))])} />
              ) : <Text>Nothing in transit.</Text>}
            </Section>
          </>
        ) : null}
        {rtab === "orders" && ordSub === "approvals" ? (
          <Section heading="Approval queue" caption="Oldest first. Lines show Q.O.H. and par at the receiving location.">
            <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) auto", gap: 12, alignItems: "end" }}>
              <Input label="Search approvals" value={apprQ} onChange={setApprQ} placeholder="Vendor, PO #, location, product or SKU" />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={small}>Order rows open by default</span>
                <Segmented<"expanded" | "collapsed"> value={apprView} onChange={setApprView} options={[{ value: "expanded", label: "Expanded" }, { value: "collapsed", label: "Collapsed" }]} />
              </div>
            </div>
            {(() => {
              const needle = apprQ.trim().toLowerCase();
              const shown = needle ? pending.filter((o) => [o.id, VENDOR_BY_ID[o.vendorId].name, LOC_NAME[o.locId], o.status, o.mode, ...o.lines.flatMap((l) => [l.sku, PRODUCT[l.sku].name])]
                .join(" ").toLowerCase().includes(needle)) : pending;
              if (!pending.length) return <Callout tone="success">No orders are waiting for approval.</Callout>;
              return (
                <>
                  {needle ? <span style={small} data-testid="approvals-count">{shown.length} of {pending.length} waiting orders match “{apprQ.trim()}”</span> : null}
                  {shown.length ? shown.map((o) => <OrderCard key={`${o.id}-${o.status}-${apprView}`} order={o} role="retailer" now={clock} inv={inv} act={act} collapsible defaultOpen={apprView === "expanded"} />)
                    : <Callout tone="info">No waiting order matches “{apprQ.trim()}”. Check Order history for orders that were already approved, shipped or received.</Callout>}
                </>
              );
            })()}
          </Section>
        ) : null}
        {rtab === "orders" && ordSub === "receiving" ? (
          <Section heading="Receiving" caption="Count each line; enter shorts and damages. Accepted units update Q.O.H. and generate the invoice.">
            {shipped.length ? shipped.map((o) => <OrderCard key={`${o.id}-${o.status}`} order={o} role="retailer" now={clock} inv={inv} act={act} />) : <Text>No shipments in transit. Approve an Ironic order, then Switch account → Vendor log in → Orders to ship it.</Text>}
          </Section>
        ) : null}
        {rtab === "inventory" && invSub === "belowpar" ? (
          <Section heading="Below par: inventory under Min, all par-tracked vendors" caption="Gap to Max = Max − Q.O.H. Only the par-tracked vendors have par plans; other menu brands show stock status in All inventory. Sample data.">
            <BelowParTable inv={inv} orders={orders} locFilter={rloc} now={clock} />
          </Section>
        ) : null}
        {rtab === "orders" && ordSub === "history" ? (
          <>
            <Section heading="Order history">
              <Table id="retail-order-history" columns={["Order", "Vendor", "Location", "Submitted", "Status", "Value", "Invoice", ""]}
                rows={hist.map((o) => [o.id, VENDOR_BY_ID[o.vendorId].name, LOC_NAME[o.locId], fdt(o.submittedAt),
                  <Status key="s" tone={STATUS_TONE[o.status]}>{o.status}</Status>, money(orderValue(o)), o.invoiceId ?? "—",
                  <Button key="b" variant="quiet" label={histSel === o.id ? "Hide" : "Details"} onClick={() => setHistSel(histSel === o.id ? "" : o.id)} />])} />
            </Section>
            {selOrder ? <OrderCard key={`${selOrder.id}-${selOrder.status}`} order={selOrder} role="retailer" now={clock} inv={inv} act={act} /> : null}
          </>
        ) : null}
        {rtab === "orders" && ordSub === "invoices" ? (
          <InvoicesView invoices={invoices.filter(inLoc)} orders={orders.filter(inLoc)} now={clock} pay={pay} openOrder={(id) => { setHistSel(id); rnav("orders:history"); }} />
        ) : null}
        {rtab === "activity" ? <Section heading="Activity log"><LogTable log={log} /></Section> : null}
        {rtab === "inventory" && invSub === "all" ? <InventoryTab items={menu} lastSync={dutchieAt} syncing={dutchieSyncing} onSync={() => void syncDutchie()} initialLoc={rloc} now={clock} onReceive={() => rnav("orders:receiving")} onReceiveHistory={() => rnav("orders:history")} /> : null}
        {rtab === "inventory" && invSub === "performance" ? (
          <>
            <SyncLine provider="Dutchie POS" at={dutchieAt} syncing={dutchieSyncing} onSync={() => void syncDutchie()} />
            <PerformanceTab key={`perf-${rloc}`} items={menu} inv={inv} orders={orders} initialLoc={rloc} now={clock} />
          </>
        ) : null}
        {rtab === "finance" ? <FinanceTab key={`fin-${rloc}`} invoices={invoices} now={clock} initialLoc={rloc} pay={pay} /> : null}
        {rtab === "vendors" ? (
          <AccountsTab role="retailer" noun="vendor" me="Store manager" now={clock}
            accounts={ALL_VENDORS.map((v) => {
              const skus = v.catalog ? COMPETITOR_SKUS.filter((r) => r[1] === v.name).length : 0;
              const cats = v.catalog ? (v.categories ?? []).join(", ") : Array.from(new Set(PRODUCTS.filter((p) => p.vendorId === v.id).map((p) => p.category))).join(", ");
              return { id: v.id, name: v.name, subtitle: `${cats || "Various"} · ${v.catalog ? (skus ? `${skus} sample SKU${skus === 1 ? "" : "s"} · no par plan` : "sample catalog pending") : "par-tracked vendor"}`,
                license: VENDOR_LICENSE[v.id], address: "Oregon (sample address)", terms: v.terms, leadDays: v.leadDays };
            })}
            prefs={rPrefs}
            savePrefs={(id, p) => {
              setRPrefs((m) => ({ ...m, [id]: p }));
              addLog(tick(), RETAILER, id, `Vendor preferences updated for ${VENDOR_BY_ID[id].name} (${p.status}, ${prefSummary(p)}${p.autoApproveUnder ? `, auto-approve under ${money0(p.autoApproveUnder)}` : ""})`);
              integrations.leaflink.saveBuyerPreferences({ seller: VENDOR_BY_ID[id].name, delivery_preferences: prefSummary(p), auto_approve_under: p.autoApproveUnder }).catch(() => undefined);
            }}
            notes={rNotes}
            addNote={(id, text) => { const n = noteFor("Store manager", text); setRNotes((m) => ({ ...m, [id]: [...(m[id] ?? []), n] })); }}
            contacts={vContacts}
            addContact={(id, c) => setVContacts((m) => ({ ...m, [id]: [...(c.primary ? (m[id] ?? []).map((x) => ({ ...x, primary: false })) : (m[id] ?? [])), c] }))}
            ordersOf={(id) => orders.filter((o) => o.vendorId === id && inLoc(o))}
            invoicesOf={(id) => invoices.filter((i) => i.vendorId === id && inLoc(i))}
            scheduleRows={(id) => LOCS.filter((l) => rloc === "all" || l.id === rloc).map((l) => ({ label: l.name, last: lastDelivery(id, l.id, orders, inv), eta: openEta(id, l.id, orders) }))}
            sharedPrefs={(id) => LOCS.map((l) => `${l.name}: ${prefSummary(vPrefs[accKey(id, l.id)])}`).join(" · ")} />
        ) : null}
        {rtab === "integrations" ? <IntegrationsTab role="retailer" /> : null}
      </>
    );
  }

  return (
    <Page title="Par Level Portal Demo" width="wide"
      summary="A vendor-managed inventory demo: vendors see stock vs par at each store, build suggested orders, and ship once the retailer approves. All quantities, sales and orders are sample data; brands are parody names.">
      {stage === "signin" ? null : header}
      {body}
      <Section heading="How the demo works" collapsible defaultOpen={stage === "signin"}>
        <Steps steps={HOW_STEPS} />
        <div style={{ ...small, color: t.text.tertiary }}>Everything lives in this page's memory and resets on reload. Try: Vendor log in (Ironic), submit the suggested order, Switch account → Retail log in → Orders → Approvals to approve it, switch back to ship, then receive it in Orders → Receiving. Inventory → Performance has the sales charts.</div>
      </Section>
      <UpdatesSection notes={UPDATES} />
    </Page>
  );
}
