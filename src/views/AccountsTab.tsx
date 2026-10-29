// Account management for both roles (retailer → Vendors, vendor → Retailers). Information architecture follows
// common wholesale-CRM conventions: an accounts list with search, filters and status, and an account page with
// key stats up top (incl. next delivery) and sub-tabs for Overview, Orders, Contacts, Notes and Preferences.
import { Section, Metrics, Table, Select, Segmented, Input, Toggle, Button, Status, Callout, Rows, Properties, Bars, Text, Grid, useState } from "../kit";
import { useStyles } from "../ui";
import { DAY, STATUS_TONE, fd, fdt, money, money0, orderValue, balOf, PRODUCT, type Invoice, type Order } from "../data";
import { ACCOUNT_STATUSES, FREQUENCIES, WEEKDAYS, WINDOWS, schedule, type AccountNote, type AccountPrefs, type Contact, type Schedule } from "../accounts";

export interface AccountSpec { id: string; name: string; subtitle: string; license: string; address: string; terms: string; leadDays: number }
export interface ScheduleRow { label: string; last?: number; eta?: number }

const wdFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
export const fdw = (ms: number) => wdFmt.format(ms);
type Sub = "overview" | "orders" | "contacts" | "notes" | "preferences";

export function AccountsTab(props: {
  role: "retailer" | "vendor";
  noun: string; // "vendor" | "location"
  me: string; // author name for notes
  accounts: AccountSpec[];
  prefs: Record<string, AccountPrefs>;
  savePrefs: (id: string, p: AccountPrefs) => void;
  notes: Record<string, AccountNote[]>;
  addNote: (id: string, text: string) => void;
  contacts: Record<string, Contact[]>;
  addContact: (id: string, c: Contact) => void;
  ordersOf: (id: string) => Order[];
  invoicesOf: (id: string) => Invoice[];
  scheduleRows: (id: string) => ScheduleRow[];
  sharedPrefs?: (id: string) => string;
  now: number;
}) {
  const { small, strong, row, card, t } = useStyles();
  const [sel, setSel] = useState<string>("");
  const [sub, setSub] = useState<Sub>("overview");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "Active" | "Paused" | "due">("all");
  const [freq, setFreq] = useState<string>("all");

  const schedOf = (a: AccountSpec, p: AccountPrefs = props.prefs[a.id]): { label: string; s: Schedule }[] =>
    props.scheduleRows(a.id).map((r) => ({ label: r.label, s: schedule(p, a.leadDays, props.now, r.last, r.eta) }));
  const nextOf = (a: AccountSpec, p?: AccountPrefs) => schedOf(a, p).sort((x, y) => x.s.nextDelivery - y.s.nextDelivery)[0];
  const recent = (a: AccountSpec) => props.ordersOf(a.id).filter((o) => o.submittedAt > props.now - 90 * DAY);

  const account = props.accounts.find((a) => a.id === sel);
  if (!account) {
    const needle = q.trim().toLowerCase();
    const list = props.accounts.filter((a) => !needle || `${a.name} ${a.subtitle} ${a.license}`.toLowerCase().includes(needle))
      .filter((a) => status === "all" || (status === "due" ? nextOf(a).s.orderBy - props.now < 3 * DAY : props.prefs[a.id].status === status))
      .filter((a) => freq === "all" || props.prefs[a.id].frequency === freq);
    return (
      <Section heading={props.role === "retailer" ? "Vendor accounts" : "Retailer accounts"}
        caption={`${props.accounts.length} accounts · click an account to open it. Delivery frequency drives the next expected order and delivery date.`}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 2fr) auto minmax(150px, 1fr)", gap: 10, alignItems: "end" }}>
          <Input label="Search accounts" value={q} onChange={setQ} placeholder={`Name or license number`} />
          <Segmented<"all" | "Active" | "Paused" | "due"> value={status} onChange={setStatus} options={[
            { value: "all", label: "All" }, { value: "Active", label: "Active" }, { value: "Paused", label: "Paused" },
            { value: "due", label: "Order due soon", count: props.accounts.filter((a) => nextOf(a).s.orderBy - props.now < 3 * DAY).length || undefined },
          ]} />
          <Select label="Delivery frequency" options={[{ value: "all", label: "Any frequency" }, ...FREQUENCIES.map((f) => ({ value: f, label: f }))]} value={freq} onChange={setFreq} />
        </div>
        {list.length ? (
          <Table id={`accounts-${props.role}`} columns={["Account", "License", "Status", "Frequency", "Next delivery", "Order by", "Orders (90d)", "Open balance", ""]}
            rows={list.map((a) => {
              const p = props.prefs[a.id];
              const n = nextOf(a);
              const os = recent(a);
              const bal = props.invoicesOf(a.id).reduce((s, i) => s + balOf(i), 0);
              const due = n.s.orderBy - props.now < 3 * DAY;
              return [
                <span key="n" style={{ display: "flex", flexDirection: "column" }}><button type="button" onClick={() => { setSel(a.id); setSub("overview"); }} style={{ all: "unset", cursor: "pointer", ...strong, color: t.text.accent }}>{a.name}</button><span style={small}>{a.subtitle}</span></span>,
                a.license, <Status key="s" tone={p.status === "Active" ? "success" : "neutral"}>{p.status}</Status>, `${p.frequency} · ${p.deliveryDay}`,
                `${fdw(n.s.nextDelivery)}${n.label ? ` · ${n.label}` : ""}`, { text: fdw(n.s.orderBy), tone: due ? "warning" : undefined },
                `${os.length} · ${money0(os.reduce((s, o) => s + orderValue(o), 0))}`, bal ? money(bal) : "—",
                <Button key="b" label="Open account" onClick={() => { setSel(a.id); setSub("overview"); }} />,
              ];
            })} />
        ) : <Text>No accounts match.</Text>}
      </Section>
    );
  }

  const a = account;
  const p = props.prefs[a.id];
  const sched = schedOf(a);
  const next = nextOf(a);
  const os = props.ordersOf(a.id).slice().sort((x, y) => y.submittedAt - x.submittedAt);
  const os90 = recent(a);
  const invs = props.invoicesOf(a.id);
  const bal = invs.reduce((s, i) => s + balOf(i), 0);
  const notes = (props.notes[a.id] ?? []).slice().sort((x, y) => y.at - x.at);
  const contacts = props.contacts[a.id] ?? [];
  const paused = p.status === "Paused";
  const toggleStatus = () => props.savePrefs(a.id, { ...p, status: paused ? "Active" : "Paused" });
  const top = new Map<string, number>();
  for (const o of os90) for (const l of o.lines) top.set(l.sku, (top.get(l.sku) ?? 0) + (l.received || l.approved));

  return (
    <>
      <div style={{ ...card, gap: 10 }}>
        <div style={{ ...row, justifyContent: "space-between" }}>
          <Button variant="quiet" label={`← All ${props.noun === "vendor" ? "vendors" : "retailers"}`} onClick={() => setSel("")} />
          <span style={small}>Account page · {props.role === "retailer" ? "notes and preferences are private to your store" : "notes are private to your company"}</span>
        </div>
        <div style={{ ...row, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ ...t.font.heading2, fontWeight: t.weight.semibold, color: t.text.primary }}>{a.name}</span>
            <span style={small}>{a.subtitle} · License {a.license} · {a.address}</span>
          </div>
          <div style={row}>
            <button type="button" data-testid="account-status-toggle" onClick={toggleStatus}
              title={paused ? "Paused: click to set Active" : "Active: click to pause"} aria-pressed={paused}
              style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: t.radius.full,
                fontSize: t.font.label.fontSize, lineHeight: t.font.label.lineHeight, fontWeight: t.weight.semibold,
                background: paused ? t.fill.secondary : t.fill.successSubtle, color: paused ? t.text.secondary : t.text.success,
                border: `1px solid ${paused ? t.border.default : t.text.success}` }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: paused ? t.text.tertiary : t.text.success }} />
              {p.status} <span style={{ fontWeight: t.weight.regular, opacity: 0.8 }}>⇄ {paused ? "Set Active" : "Pause"}</span>
            </button>
            <Status tone="accent">{p.frequency} · {p.deliveryDay} {p.window}</Status>
            <Button variant={paused ? "primary" : undefined} label={paused ? "Resume account" : "Pause account"} onClick={toggleStatus} />
          </div>
        </div>
        {paused ? (
          <Callout tone="warning" lead="Paused.">
            {props.role === "retailer" ? `Orders from ${a.name} are not auto-approved and the account shows as Paused in your vendor list until you set it back to Active.` : `No new orders go to ${a.name} until you set the account back to Active.`}
          </Callout>
        ) : null}
      </div>
      <Metrics metrics={[
        { value: fdw(next.s.nextDelivery), label: "Next delivery", detail: `${next.label ? next.label + " · " : ""}${next.s.basis}` },
        { value: fdw(next.s.orderBy), label: "Next order by", detail: `${a.leadDays}-day lead time`, tone: next.s.orderBy - props.now < 3 * DAY ? "warning" : undefined },
        { value: String(os90.length), label: "Orders, last 90 days", detail: `${money0(os90.reduce((s, o) => s + orderValue(o), 0))} total · avg ${money0(os90.length ? os90.reduce((s, o) => s + orderValue(o), 0) / os90.length : 0)}` },
        { value: bal ? money(bal) : "$0.00", label: "Open balance", detail: a.terms, tone: bal ? "warning" : "success" },
      ]} />
      <Segmented<Sub> value={sub} onChange={setSub} options={[
        { value: "overview", label: "Overview" }, { value: "orders", label: "Orders", count: os.length || undefined }, { value: "contacts", label: "Contacts", count: contacts.length || undefined },
        { value: "notes", label: "Notes", count: notes.length || undefined }, { value: "preferences", label: "Preferences" },
      ]} />
      {sub === "overview" ? (
        <Grid columns={2}>
          <Section heading="Account details">
            <Properties items={[
              { label: "License", value: a.license }, { label: "Address", value: a.address }, { label: "Payment terms", value: `${a.terms} · ${p.paymentMethod}` },
              { label: "Primary contact", value: contacts.find((c) => c.primary)?.name ?? "—" },
              { label: props.role === "retailer" ? "Receiving" : "Route / zone", value: p.receiving },
              { label: "Delivery preference", value: `${p.frequency}, ${p.deliveryDay} ${p.window}${p.appointmentRequired ? ", appointment required" : ""}` },
              ...(props.role === "retailer" ? [{ label: "Auto-approve", value: p.autoApproveUnder ? `Orders under ${money0(p.autoApproveUnder)}` : "Off" }] : [{ label: "Minimum order", value: money0(p.minOrder) }]),
              ...(props.sharedPrefs ? [{ label: props.role === "vendor" ? "Store's stated preference" : "Vendor's schedule", value: props.sharedPrefs(a.id) }] : []),
            ]} />
          </Section>
          <Section heading="Delivery schedule" caption="From delivery frequency, preferred day and the last delivery">
            <Table columns={["", "Last delivery", "Next delivery", "Order by"]} rows={sched.map((r) => [r.label || a.name, r.s.last ? fd(r.s.last) : "—", fdw(r.s.nextDelivery), fdw(r.s.orderBy)])} />
            {top.size ? <Bars bars={Array.from(top.entries()).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([sku, u]) => ({ label: PRODUCT[sku].name, value: u, display: `${u} units` }))} /> : <span style={small}>No orders in the last 90 days.</span>}
          </Section>
        </Grid>
      ) : null}
      {sub === "overview" ? (
        <>
          <span data-testid="overview-preferences" style={{ ...strong, marginTop: 4 }}>Preferences · delivery frequency, day, window, status and approvals</span>
          <PrefsPanel key={`${a.id}|${JSON.stringify(p)}`} role={props.role} prefs={p} preview={(d) => nextOf(a, d)} save={(d) => props.savePrefs(a.id, d)} />
        </>
      ) : null}
      {sub === "orders" ? (
        <Section heading="Orders">
          {os.length ? <Table columns={["Order", "Location", "Submitted", "Status", "Value", "Invoice", "Balance"]}
            rows={os.map((o) => { const inv = invs.find((i) => i.id === o.invoiceId); return [o.id, o.locId === "south" ? "South Main" : o.locId === "east" ? "Eastgate" : "Riverside", fdt(o.submittedAt),
              <Status key="s" tone={STATUS_TONE[o.status]}>{o.status}</Status>, money(orderValue(o)), o.invoiceId ?? "—", inv ? money(balOf(inv)) : "—"]; })} /> : <Text>No orders yet.</Text>}
        </Section>
      ) : null}
      {sub === "contacts" ? <ContactsPanel contacts={contacts} add={(c) => props.addContact(a.id, c)} /> : null}
      {sub === "notes" ? <NotesPanel notes={notes} me={props.me} add={(text) => props.addNote(a.id, text)} role={props.role} /> : null}
      {sub === "preferences" ? <PrefsPanel key={a.id} role={props.role} prefs={p} preview={(d) => nextOf(a, d)} save={(d) => props.savePrefs(a.id, d)} /> : null}
    </>
  );
}

function ContactsPanel(props: { contacts: Contact[]; add: (c: Contact) => void }) {
  const { row } = useStyles();
  const [d, setD] = useState<Contact>({ name: "", role: "", email: "", phone: "", primary: false });
  return (
    <Grid columns={2}>
      <Section heading="Contacts">
        {props.contacts.length ? <Rows rows={props.contacts.map((c) => ({ title: c.name, detail: `${c.role} · ${c.email} · ${c.phone}`, status: c.primary ? { label: "Primary", tone: "accent" as const } : undefined }))} /> : <Text>No contacts yet.</Text>}
      </Section>
      <Section heading="Add contact">
        <Input label="Name" value={d.name} onChange={(v) => setD({ ...d, name: v })} />
        <Input label="Role" value={d.role} onChange={(v) => setD({ ...d, role: v })} placeholder="e.g. Receiving lead" />
        <Input label="Email" value={d.email} onChange={(v) => setD({ ...d, email: v })} />
        <Input label="Phone" value={d.phone} onChange={(v) => setD({ ...d, phone: v })} />
        <Toggle label="Primary contact" value={d.primary} onChange={(v) => setD({ ...d, primary: v })} />
        <div style={row}><Button variant="primary" label="Add contact" disabled={!d.name.trim()} onClick={() => { props.add(d); setD({ name: "", role: "", email: "", phone: "", primary: false }); }} /></div>
      </Section>
    </Grid>
  );
}

function NotesPanel(props: { notes: AccountNote[]; me: string; add: (text: string) => void; role: "retailer" | "vendor" }) {
  const { row, small } = useStyles();
  const [text, setText] = useState("");
  return (
    <Section heading="Internal notes" caption={`Private to ${props.role === "retailer" ? "your store" : "your company"}; the other party never sees these.`}>
      <Input label={`New note as ${props.me}`} value={text} onChange={setText} placeholder="e.g. Asked for Thursday drops through December" />
      <div style={row}><Button variant="primary" label="Add note" disabled={!text.trim()} onClick={() => { props.add(text.trim()); setText(""); }} /><span style={small}>Notes are timestamped with the demo clock.</span></div>
      {props.notes.length ? <Rows rows={props.notes.map((n) => ({ lead: fdt(n.at), title: n.text, meta: n.author }))} /> : <Callout tone="info">No notes yet.</Callout>}
    </Section>
  );
}

function PrefsPanel(props: { role: "retailer" | "vendor"; prefs: AccountPrefs; preview: (p: AccountPrefs) => { label: string; s: Schedule }; save: (p: AccountPrefs) => void }) {
  const { row, small } = useStyles();
  const [d, setD] = useState<AccountPrefs>(props.prefs);
  const [saved, setSaved] = useState(false);
  const set = (x: Partial<AccountPrefs>) => { setD({ ...d, ...x }); setSaved(false); };
  const pv = props.preview(d);
  const dirty = JSON.stringify(d) !== JSON.stringify(props.prefs);
  return (
    <Grid columns={2}>
      <Section heading="Delivery" caption="Frequency and preferred day set the next expected order and delivery date.">
        <span style={small}>Delivery frequency</span>
        <Segmented value={d.frequency} onChange={(v) => set({ frequency: v })} options={FREQUENCIES.map((f) => ({ value: f, label: f }))} />
        <span style={small}>Preferred delivery day</span>
        <Segmented value={d.deliveryDay} onChange={(v) => set({ deliveryDay: v })} options={WEEKDAYS.map((w) => ({ value: w, label: w }))} />
        <Select label="Delivery window" options={WINDOWS.map((w) => ({ value: w, label: w }))} value={d.window} onChange={(v) => set({ window: v })} />
        <Toggle label="Appointment required" value={d.appointmentRequired} onChange={(v) => set({ appointmentRequired: v })} />
        <Callout tone="info" lead="Preview:">Next delivery {fdw(pv.s.nextDelivery)}{pv.label ? ` (${pv.label})` : ""}; order by {fdw(pv.s.orderBy)}.</Callout>
      </Section>
      <Section heading={props.role === "retailer" ? "Receiving and approvals" : "Account"}>
        <span style={small}>Account status</span>
        <Segmented value={d.status} onChange={(v) => set({ status: v })} options={ACCOUNT_STATUSES.map((s) => ({ value: s, label: s }))} />
        <Input label={props.role === "retailer" ? "Receiving location" : "Route / service zone"} value={d.receiving} onChange={(v) => set({ receiving: v })} />
        <Input label={props.role === "retailer" ? "Receiving contact" : "Store contact"} value={d.contactName} onChange={(v) => set({ contactName: v })} />
        <Input label="Contact phone" value={d.contactPhone} onChange={(v) => set({ contactPhone: v })} />
        <Input label="Delivery instructions" value={d.instructions} onChange={(v) => set({ instructions: v })} />
        {props.role === "retailer"
          ? <Input label="Auto-approve orders under ($, 0 = off)" type="number" value={String(d.autoApproveUnder)} onChange={(v) => set({ autoApproveUnder: Math.max(0, Number(v) || 0) })} />
          : <Input label="Minimum order ($)" type="number" value={String(d.minOrder)} onChange={(v) => set({ minOrder: Math.max(0, Number(v) || 0) })} />}
        <Select label="Payment method" options={["ACH", "Check", "Cash on delivery"]} value={d.paymentMethod} onChange={(v) => set({ paymentMethod: v })} />
        <div style={row}>
          <Button variant="primary" label="Save preferences" disabled={!dirty} onClick={() => { props.save(d); setSaved(true); }} />
          <Button variant="quiet" label="Reset" disabled={!dirty} onClick={() => setD(props.prefs)} />
          {saved && !dirty ? <span style={small}>Saved · synced through the LeafLink adapter (demo mode)</span> : null}
        </div>
      </Section>
    </Grid>
  );
}
