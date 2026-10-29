// Retailer Finance tab: ledger, payables aging, sales/tax/margin, promotions, loyalty, payment mix, cash/safe log.
// Sales-side numbers come from the Dutchie adapter; ledger balances and bills from the QuickBooks adapter.
// Payables are the demo's own invoices, so they always match Orders → Invoice.
import { Section, Metrics, Table, Select, Segmented, LineChart, Bars, Grid, Button, Callout, Text, Status, useEffect, useState, useRef } from "../kit";
import { useStyles, SyncLine } from "../ui";
import { DAY, ITEMS, LOCS, LOC_NAME, SALES, VENDOR_BY_ID, balOf, fd, money, money0, paidOf, type Invoice } from "../data";
import { MENU_BY_KEY } from "../catalog/menu";
import { integrations, LOCAL_TAX, QBO_COMPANY, STATE_TAX, type DutchieCashSummary, type DutchieDiscount, type DutchieLoyaltySummary, type DutchieSalesWeek, type QboAccount } from "../integrations";

interface FinData { sales: DutchieSalesWeek[]; discounts: DutchieDiscount[]; loyalty: DutchieLoyaltySummary; cash: DutchieCashSummary[]; accounts: QboAccount[] }
const BUCKETS = ["Current", "1–30", "31–60", "61–90", "90+"] as const;
const termDays = (vendorId: string) => Number(VENDOR_BY_ID[vendorId].terms.replace(/\D/g, "")) || 14;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function FinanceTab(props: { invoices: Invoice[]; now: number; initialLoc: string; pay: (id: string) => void }) {
  const { small, row } = useStyles();
  const [loc, setLoc] = useState(props.initialLoc);
  const [data, setData] = useState<FinData | null>(null);
  const [err, setErr] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [qboAt, setQboAt] = useState<number>();
  const [dutAt, setDutAt] = useState<number>();
  const [period, setPeriod] = useState<"4" | "8">("8");
  const req = useRef(0);

  const load = async (l: string) => {
    const my = ++req.current;
    const live = () => my === req.current;
    setSyncing(true);
    try {
      const [sales, discounts, loyalty, cash] = await Promise.all([
        integrations.dutchie.getSales(l, 8), integrations.dutchie.getDiscounts(l), integrations.dutchie.getLoyaltySummary(l), integrations.dutchie.getCashSummary(l),
      ]);
      if (!live()) return;
      setDutAt(Date.now());
      const accounts = await integrations.quickbooks.getAccounts(QBO_COMPANY.retailer);
      if (!live()) return;
      setQboAt(Date.now());
      setData({ sales, discounts, loyalty, cash, accounts });
      setErr("");
    } catch (e) {
      if (live()) setErr(e instanceof Error ? e.message : String(e));
    } finally {
      if (live()) setSyncing(false);
    }
  };
  useEffect(() => {
    void load(loc);
    const id = setInterval(() => void load(loc), 60_000);
    return () => { req.current++; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc]);

  const inLoc = (i: Invoice) => loc === "all" || i.locId === loc;
  const invs = props.invoices.filter(inLoc);
  const open = invs.filter((i) => balOf(i) > 0.004);
  const bucketOf = (i: Invoice) => {
    const past = Math.floor((props.now - (i.date + termDays(i.vendorId) * DAY)) / DAY);
    return past <= 0 ? 0 : past <= 30 ? 1 : past <= 60 ? 2 : past <= 90 ? 3 : 4;
  };
  const apTotal = open.reduce((s, i) => s + balOf(i), 0);
  const vendorsWithOpen = Array.from(new Set(open.map((i) => i.vendorId)));

  const header = (
    <>
      <div style={{ ...row, justifyContent: "space-between" }}>
        <span style={small}>Sample data. Figures tie to the demo's orders and invoices; sales come from the Dutchie adapter and balances from the QuickBooks adapter.</span>
        <Select options={[{ value: "all", label: "All locations" }, ...LOCS.map((l) => ({ value: l.id, label: l.name }))]} value={loc} onChange={setLoc} />
      </div>
      <SyncLine provider="QuickBooks" at={qboAt} syncing={syncing} onSync={() => void load(loc)} />
      <SyncLine provider="Dutchie POS" at={dutAt} syncing={syncing} onSync={() => void load(loc)} />
      {err ? <Callout tone="danger" lead="Sync failed.">{err}</Callout> : null}
    </>
  );
  if (!data) return <>{header}<Text>Loading finance data from the adapters…</Text></>;

  const weeks = period === "4" ? data.sales.slice(-4) : data.sales;
  const sum = (f: (w: DutchieSalesWeek) => number) => r2(weeks.reduce((s, w) => s + f(w), 0));
  const net = sum((w) => w.netSales), cogs = sum((w) => w.cogs), gross = sum((w) => w.grossSales);
  const lastDay = data.cash.filter((c) => c.date === data.cash[data.cash.length - 1].date);
  const drawer = r2(lastDay.reduce((s, c) => s + c.endingBalance, 0));
  const safe = r2(lastDay.reduce((s, c) => s + c.deposits, 0) + 2500 * (loc === "all" ? LOCS.length : 1));
  const bank = data.accounts.find((a) => a.AccountType === "Bank")?.CurrentBalance ?? 0;
  const last4 = data.sales.slice(-4);
  const cardInTransit = r2((last4[3]?.debitPaid ?? 0) * (2 / 7));
  const taxPayable = r2(last4.reduce((s, w) => s + w.stateTax + w.localTax, 0));
  const loyaltyLiab = r2(data.loyalty.outstandingPoints * data.loyalty.pointValue);
  const qboAp = data.accounts.find((a) => a.AccountType === "Accounts Payable")?.CurrentBalance ?? 0;

  // Running balance book for the operating account (company level), oldest → newest.
  type Entry = { at: number; text: string; amt: number };
  const entries: Entry[] = [];
  const dayMs = (iso: string) => Date.parse(iso + "T23:00:00Z");
  const depByDay = new Map<string, number>();
  for (const c of data.cash) depByDay.set(c.date, (depByDay.get(c.date) ?? 0) + c.deposits);
  for (const [d, amt] of depByDay) entries.push({ at: dayMs(d), text: `Armored cash deposit (${loc === "all" ? "all stores" : LOC_NAME[loc]})`, amt });
  last4.forEach((w, i) => entries.push({ at: props.now - (3 - i) * 7 * DAY - 2 * DAY, text: `Debit card settlement, week of ${w.weekStart}`, amt: r2(w.debitPaid) }));
  for (const i of invs) for (const p of i.payments) if (p.at > props.now - 30 * DAY) entries.push({ at: p.at, text: `Bill payment ${i.id} · ${VENDOR_BY_ID[i.vendorId].name}`, amt: -p.amount });
  entries.push({ at: props.now - 2 * DAY, text: "Oregon marijuana tax payment (September, state + local)", amt: -r2(taxPayable * 0.96) });
  entries.sort((a, b) => a.at - b.at);
  let bal = bank - entries.reduce((s, e) => s + e.amt, 0);
  const book = entries.map((e) => { bal += e.amt; return { ...e, bal }; }).reverse().slice(0, 14);

  // Category and brand margin from item-level sales (last 4 weeks).
  const catM = new Map<string, { rev: number; cost: number }>();
  const brandM = new Map<string, { rev: number; cost: number; vendor: boolean }>();
  for (const it of ITEMS) {
    const m = MENU_BY_KEY[it.key];
    const units = LOCS.filter((l) => loc === "all" || l.id === loc).reduce((s, l) => s + SALES[it.key][l.id].slice(-4).reduce((a, b) => a + b, 0), 0);
    const rev = units * it.price * 0.9, cost = units * m.unitCost;
    const c = catM.get(m.category) ?? { rev: 0, cost: 0 };
    catM.set(m.category, { rev: c.rev + rev, cost: c.cost + cost });
    const b = brandM.get(it.brand) ?? { rev: 0, cost: 0, vendor: !!it.vendorId };
    brandM.set(it.brand, { rev: b.rev + rev, cost: b.cost + cost, vendor: b.vendor });
  }
  const cats = Array.from(catM.entries()).sort((a, b) => b[1].rev - a[1].rev);
  const brands = Array.from(brandM.entries()).sort((a, b) => b[1].rev - a[1].rev).slice(0, 14);

  const cashTx = last4.reduce((s, w) => s + w.cashPaid, 0), debitTx = last4.reduce((s, w) => s + w.debitPaid, 0);
  const txCount = last4.reduce((s, w) => s + w.transactions, 0);
  const atmW = Math.round(txCount * 0.21);

  return (
    <>
      {header}
      <Metrics metrics={[
        { value: money0(net), label: `Net sales · ${weeks.length} weeks`, detail: `${money0(gross)} gross` },
        { value: pct((net - cogs) / Math.max(1, net)), label: "Gross margin", detail: `${money0(net - cogs)} after COGS` },
        { value: money0(apTotal), label: "Open vendor payables", detail: `${open.length} invoices · QuickBooks A/P ${money0(qboAp)} (all stores)`, tone: open.some((i) => bucketOf(i) >= 2) ? "warning" : undefined },
        { value: money0(drawer + safe + bank), label: "Cash position", detail: `drawers ${money0(drawer)} · safe ${money0(safe)} · bank ${money0(bank)}` },
      ]} />

      <Grid columns={2}>
        <Section heading="Balance book" caption="QuickBooks chart of accounts with POS-derived balances · sample data">
          <Table pinLast={1} columns={["Account", "Type", "Balance", "Source"]} align={["start", "start", "end", "start"]}
            rows={[
              ["Cash in drawers (last close)", "Bank", money(drawer), "Dutchie cash summary"],
              ["Cash in safe", "Bank", money(safe), "Safe log"],
              ["Operating checking (credit union)", "Bank", money(bank), "QuickBooks"],
              ["A/R: debit settlements in transit", "Accounts Receivable", money(cardInTransit), "Dutchie debit tenders"],
              ["A/P: vendor bills", "Accounts Payable", money(apTotal), "QuickBooks bills (demo invoices)"],
              ["Sales tax payable (OR state 17% + local)", "Other Current Liability", money(taxPayable), "Dutchie tax summary"],
              ["Loyalty points liability", "Other Current Liability", money(loyaltyLiab), "Dutchie loyalty"],
              [{ text: "Net cash after payables & liabilities", tone: "success" }, "", money(drawer + safe + bank + cardInTransit - apTotal - taxPayable - loyaltyLiab), ""],
            ]} />
        </Section>
        <Section heading="Operating account: running balance" caption="Newest first · company level">
          <Table columns={["Date", "Description", "Amount", "Balance"]} align={["start", "start", "end", "end"]}
            rows={book.map((e) => [fd(e.at), e.text, { text: `${e.amt >= 0 ? "+" : "−"}${money(Math.abs(e.amt))}`, tone: e.amt >= 0 ? "success" : "danger" }, money(e.bal)])} />
        </Section>
      </Grid>

      <Section heading="Vendor payables aging" caption={`Due date = invoice date + vendor terms. Demo clock ${fd(props.now)}. Payments post a QuickBooks BillPayment.`}>
        <Table pinLast={1} columns={["Vendor", ...BUCKETS, "Total"]} align={["start", "end", "end", "end", "end", "end", "end"]}
          rows={[
            ...vendorsWithOpen.map((v) => [VENDOR_BY_ID[v].name, ...BUCKETS.map((_, b) => { const x = open.filter((i) => i.vendorId === v && bucketOf(i) === b).reduce((s, i) => s + balOf(i), 0); return x ? money(x) : "—"; }),
              money(open.filter((i) => i.vendorId === v).reduce((s, i) => s + balOf(i), 0))]),
            [{ text: "Total", tone: "success" }, ...BUCKETS.map((_, b) => money(open.filter((i) => bucketOf(i) === b).reduce((s, i) => s + balOf(i), 0))), money(apTotal)],
          ]} />
        {open.length ? (
          <Table columns={["Invoice", "Vendor", "Location", "Invoiced", "Due", "Amount", "Paid", "Balance", "Aging", "QBO bill", ""]}
            rows={open.sort((a, b) => a.date - b.date).map((i) => {
              const b = bucketOf(i);
              return [i.id, VENDOR_BY_ID[i.vendorId].name, LOC_NAME[i.locId], fd(i.date), fd(i.date + termDays(i.vendorId) * DAY), money(i.amount), money(paidOf(i)), money(balOf(i)),
                <Status key="a" tone={b === 0 ? "success" : b === 1 ? "warning" : "danger"}>{BUCKETS[b]}</Status>, i.qboBillId ?? "pending",
                <Button key="p" variant="quiet" label="Pay balance" onClick={() => props.pay(i.id)} />];
            })} />
        ) : <Callout tone="success">No open payables.</Callout>}
      </Section>

      <Section heading="Sales summary" caption={`Oregon-style tax: ${pct(STATE_TAX)} state retail tax + local tax (${Object.entries(LOCAL_TAX).map(([l, r]) => `${LOC_NAME[l]} ${pct(r)}`).join(", ")}). Shelf prices are pre-tax in this sample.`}
        actions={<Segmented<"4" | "8"> value={period} onChange={setPeriod} options={[{ value: "4", label: "Last 4 weeks" }, { value: "8", label: "Last 8 weeks" }]} />}>
        <LineChart points={weeks.map((w) => ({ label: w.weekStart, value: w.grossSales }))} lines={[{ label: "Net sales", values: weeks.map((w) => w.netSales) }, { label: "Gross margin $", values: weeks.map((w) => w.netSales - w.cogs) }]}
          labels={["Gross sales"]} ceiling={Math.max(...weeks.map((w) => w.grossSales))} floor={0} format={(v) => money0(v)} />
        <Table pinLast={1} columns={["Week of", "Gross", "Discounts", "Returns", "Net sales", "State tax 17%", "Local tax", "COGS", "Gross margin", "GM %"]}
          align={["start", "end", "end", "end", "end", "end", "end", "end", "end", "end"]}
          rows={[...weeks.map((w) => [w.weekStart, money0(w.grossSales), `−${money0(w.discounts)}`, `−${money0(w.returns)}`, money0(w.netSales), money0(w.stateTax), money0(w.localTax), money0(w.cogs), money0(w.netSales - w.cogs), pct((w.netSales - w.cogs) / w.netSales)]),
            [{ text: "Total", tone: "success" }, money0(gross), `−${money0(sum((w) => w.discounts))}`, `−${money0(sum((w) => w.returns))}`, money0(net), money0(sum((w) => w.stateTax)), money0(sum((w) => w.localTax)), money0(cogs), money0(net - cogs), pct((net - cogs) / net)]]} />
      </Section>

      <Section heading="Discounts and promotions" caption="Last 4 weeks · margin impact = discount dollars as points of net sales (brand-funded promos count 40%)">
        <Table columns={["Promotion", "Type", "Code", "Status", "Redemptions", "Discounted", "Sales with promo", "Margin impact"]}
          align={["start", "start", "start", "start", "end", "end", "end", "end"]}
          rows={data.discounts.map((d) => [d.discountDescription, `${d.applicationMethod}${d.isLoyaltyMemberOnly ? " · members" : ""}${d.brandFunded ? " · brand-funded" : ""}`, d.discountCode ?? "—",
            <Status key="s" tone={d.isActive ? "success" : "neutral"}>{d.isActive ? "Active" : "Paused"}</Status>, d.redemptions.toLocaleString(), money0(d.amountDiscounted), money0(d.salesWithDiscount), `−${d.marginImpactPts.toFixed(2)} pts`])} />
      </Section>

      <Grid columns={2}>
        <Section heading="Loyalty" caption="Points issued at 1 per $1 net; 100 points = $5">
          <Metrics metrics={[
            { value: data.loyalty.members.toLocaleString(), label: "Members", detail: `${data.loyalty.activeMembers90d.toLocaleString()} active in 90 days` },
            { value: pct(data.loyalty.pointsRedeemed / Math.max(1, data.loyalty.pointsIssued)), label: "Redemption rate", detail: "8 weeks" },
            { value: money0(loyaltyLiab), label: "Points liability", detail: `${data.loyalty.outstandingPoints.toLocaleString()} points outstanding` },
          ]} />
          <Table columns={["", "8 weeks"]} align={["start", "end"]} rows={[["Points issued", data.loyalty.pointsIssued.toLocaleString()], ["Points redeemed", data.loyalty.pointsRedeemed.toLocaleString()]]} />
          <Table columns={["Tier", "Members", "Share of spend"]} align={["start", "end", "end"]} rows={data.loyalty.tiers.map((x) => [x.name, x.members.toLocaleString(), pct(x.spendShare)])} />
        </Section>
        <Section heading="Payment mix" caption="Last 4 weeks, tax included. Cannabis retail is cash and debit only.">
          <Bars bars={[{ label: "Cash", value: cashTx, display: `${money0(cashTx)} · ${pct(cashTx / (cashTx + debitTx))}` }, { label: "Debit (PIN)", value: debitTx, display: `${money0(debitTx)} · ${pct(debitTx / (cashTx + debitTx))}` }]} />
          <Table columns={["ATM (in-store)", "Last 4 weeks"]} align={["start", "end"]} rows={[
            ["Withdrawals", atmW.toLocaleString()], ["Customer surcharge ($3.50 each)", money(atmW * 3.5)], ["Store share of surcharge ($1.25 each)", money(atmW * 1.25)], ["Debit cashback fees ($0.50 per txn)", money(Math.round(txCount * 0.39) * 0.5)],
          ]} />
        </Section>
      </Grid>

      <Grid columns={2}>
        <Section heading="Margin by category" caption="Last 4 weeks · net of average discount">
          <Table columns={["Category", "Revenue", "COGS", "Margin", "GM %"]} align={["start", "end", "end", "end", "end"]}
            rows={cats.map(([c, v]) => [c, money0(v.rev), money0(v.cost), money0(v.rev - v.cost), pct((v.rev - v.cost) / Math.max(1, v.rev))])} />
        </Section>
        <Section heading="Margin by brand" caption="Top brands by revenue, last 4 weeks">
          <Table columns={["Brand", "Revenue", "Margin", "GM %"]} align={["start", "end", "end", "end"]}
            rows={brands.map(([b, v]) => [v.vendor ? { text: b, tone: "success" } : b, money0(v.rev), money0(v.rev - v.cost), pct((v.rev - v.cost) / Math.max(1, v.rev))])} />
        </Section>
      </Grid>

      <Section heading="Cash management and safe log" caption="Register closes from Dutchie; drops go to the safe and leave by armored pickup. Over/short within ±$10 is in tolerance.">
        <Table columns={["Date", "Register", "Opening", "Cash sales", "Returns", "Drop to safe", "Closing drawer", "Over / short"]}
          align={["start", "start", "end", "end", "end", "end", "end", "end"]}
          rows={data.cash.slice().reverse().slice(0, 18).map((c) => [c.date, c.terminalName, money(c.startingBalance), money(c.sales), money(c.returns), money(c.deposits), money(c.endingBalance),
            { text: `${c.overShort >= 0 ? "+" : "−"}${money(Math.abs(c.overShort))}`, tone: Math.abs(c.overShort) > 10 ? "danger" : Math.abs(c.overShort) > 5 ? "warning" : "success" }])} />
      </Section>
    </>
  );
}
