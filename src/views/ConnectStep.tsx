// Step 1 of each role's guide: connect your system. Demo only: Connect simulates a short handshake, then marks the
// platform connected for this browser session (sessionStorage). There are no credential fields and no network calls.
import { useGrokTheme, Button, Status, Callout, useState, useEffect } from "../kit";
import type { ReactNode } from "../kit";
import { rolePalette, type Role } from "./Guide";

export type PlatformId = "dutchie" | "leaflink" | "apex" | "marjin" | "distru";
export type Scope = "read" | "readwrite";
export interface ConnState { status: "idle" | "connecting" | "connected"; scope: Scope; at?: number }
type ConnMap = Partial<Record<PlatformId, ConnState>>;

export const RETAIL_PLATFORMS: PlatformId[] = ["dutchie"];
export const VENDOR_PLATFORMS: PlatformId[] = ["leaflink", "apex", "marjin", "distru"];
export const PLATFORM_NAME: Record<PlatformId, string> = { dutchie: "Dutchie", leaflink: "LeafLink", apex: "Apex", marjin: "Marjin", distru: "Distru" };
const PLATFORM_ROLE: Record<PlatformId, string> = {
  dutchie: "Point of sale + menu",
  leaflink: "Wholesale marketplace / orders",
  apex: "Wholesale ordering",
  marjin: "Wholesale ordering / CRM",
  distru: "ERP + inventory / orders",
};

const KEY = "plp-connections-v1";
function load(): ConnMap {
  try {
    const raw = sessionStorage.getItem(KEY);
    const m = raw ? (JSON.parse(raw) as ConnMap) : {};
    // A handshake interrupted by a reload never finished.
    for (const k of Object.keys(m) as PlatformId[]) if (m[k]?.status === "connecting") delete m[k];
    return m;
  } catch { return {}; }
}
let store: ConnMap = load();
const listeners = new Set<() => void>();
function save(next: ConnMap) {
  store = next;
  try { sessionStorage.setItem(KEY, JSON.stringify(store)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

export function useConnections(): ConnMap {
  const [, bump] = useState(0);
  useEffect(() => { const l = () => bump((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return store;
}
export const isConnected = (m: ConnMap, ids: PlatformId[]) => ids.some((id) => m[id]?.status === "connected");
export function connectedSummary(m: ConnMap, ids: PlatformId[]): string {
  const on = ids.filter((id) => m[id]?.status === "connected");
  return on.length ? on.map((id) => `${PLATFORM_NAME[id]} (${m[id]!.scope === "read" ? "read-only" : "read/write"})`).join(", ") : "";
}

function connect(id: PlatformId, scope: Scope) {
  save({ ...store, [id]: { status: "connecting", scope } });
  window.setTimeout(() => save({ ...store, [id]: { status: "connected", scope, at: Date.now() } }), 1400);
}
function disconnect(id: PlatformId) { const n = { ...store }; delete n[id]; save(n); }

const ACCESS: Record<Role, Record<Scope, { title: string; items: string[] }>> = {
  retailer: {
    read: { title: "Read-only", items: ["Reads inventory on hand by location", "Reads sales history (velocity, last date sold)", "Reads the menu: products, brands, categories, prices", "Never writes to your POS: no price, stock or menu changes"] },
    readwrite: { title: "Read-only", items: [] },
  },
  vendor: {
    read: { title: "Read-only", items: ["See each store's current inventory vs par", "Build and send order requests to the store from that inventory", "Read your catalog, case packs and pricing", "Does not create or change orders on the platform"] },
    readwrite: { title: "Read/write", items: ["Everything in read-only, plus:", "Push the store-approved order through on the platform", "Update order status when you ship (carrier, ETA)", "Only acts on orders the retailer approved"] },
  },
};

function Chip(props: { c?: ConnState }) {
  const c = props.c;
  if (!c) return <Status tone="neutral">Not connected</Status>;
  if (c.status === "connecting") return <Status tone="warning">Connecting…</Status>;
  return <Status tone="success">{c.scope === "read" ? "Connected · read-only" : "Connected · read/write"}</Status>;
}

function AccessList(props: { title: string; items: string[]; active: boolean; color: string }) {
  const t = useGrokTheme();
  return (
    <div style={{ border: `1px solid ${props.active ? props.color : t.border.subtle}`, borderRadius: t.radius.md, padding: "8px 10px", background: props.active ? t.bg.base : "transparent", flex: 1, minWidth: 180 }}>
      <div style={{ ...t.font.caption, fontWeight: t.weight.semibold, color: props.active ? props.color : t.text.secondary, textTransform: "uppercase", letterSpacing: 0.4 }}>What we access · {props.title}</div>
      <ul style={{ margin: "4px 0 0", paddingLeft: 18, ...t.font.caption, color: t.text.secondary, display: "flex", flexDirection: "column", gap: 2 }}>
        {props.items.map((s) => <li key={s}>{s}</li>)}
      </ul>
    </div>
  );
}

function ScopePick(props: { value: Scope; onChange: (s: Scope) => void; disabled: boolean; color: string }) {
  const t = useGrokTheme();
  const opt = (s: Scope, label: string) => {
    const on = props.value === s;
    return (
      <button type="button" disabled={props.disabled} onClick={() => props.onChange(s)} aria-pressed={on}
        style={{ all: "unset", cursor: props.disabled ? "default" : "pointer", padding: "5px 10px", borderRadius: t.radius.sm + 2, ...t.font.label, fontWeight: on ? t.weight.semibold : t.weight.medium,
          background: on ? props.color : "transparent", color: on ? "#fff" : t.text.primary, opacity: props.disabled && !on ? 0.5 : 1 }}>{label}</button>
    );
  };
  return <div role="group" aria-label="Access level" style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: t.radius.md, background: t.fill.secondary, border: `1px solid ${t.border.default}` }}>{opt("read", "Read-only")}{opt("readwrite", "Read/write")}</div>;
}

function Tile(props: { id: PlatformId; role: Role; conn?: ConnState }) {
  const t = useGrokTheme();
  const c = rolePalette(t, props.role);
  const [pick, setPick] = useState<Scope>(props.conn?.scope ?? "read");
  const scope: Scope = props.role === "retailer" ? "read" : pick;
  const st = props.conn?.status;
  const busy = st === "connecting";
  const on = st === "connected";
  return (
    <div data-testid={`connect-${props.id}`} style={{ border: `1px solid ${on ? c.border : t.border.default}`, borderTop: `4px solid ${on ? c.solid : t.border.default}`, borderRadius: t.radius.lg, background: t.bg.elevated, padding: 14, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden style={{ width: 34, height: 34, borderRadius: 8, background: c.head, color: c.strong, display: "grid", placeItems: "center", ...t.font.label, fontWeight: t.weight.semibold }}>{PLATFORM_NAME[props.id].slice(0, 2)}</span>
          <span style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ ...t.font.body2, fontWeight: t.weight.semibold, color: t.text.primary }}>{PLATFORM_NAME[props.id]}</span>
            <span style={{ ...t.font.caption, color: t.text.secondary }}>{PLATFORM_ROLE[props.id]}</span>
          </span>
        </div>
        <Chip c={props.conn} />
      </div>
      {props.role === "vendor" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ ...t.font.caption, color: t.text.secondary }}>Access level:</span>
          <ScopePick value={on || busy ? props.conn!.scope : pick} onChange={setPick} disabled={on || busy} color={c.solid} />
        </div>
      ) : <div style={{ ...t.font.caption, color: c.strong, fontWeight: t.weight.semibold }}>Access level: read-only (that's all we need)</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {props.role === "vendor" ? (
          <>
            <AccessList {...ACCESS.vendor.read} active={(on || busy ? props.conn!.scope : pick) === "read" || (on || busy ? props.conn!.scope : pick) === "readwrite"} color={c.solid} />
            <AccessList {...ACCESS.vendor.readwrite} active={(on || busy ? props.conn!.scope : pick) === "readwrite"} color={c.solid} />
          </>
        ) : <AccessList {...ACCESS.retailer.read} active color={c.solid} />}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {on ? (
          <>
            <Button label="Disconnect" onClick={() => disconnect(props.id)} />
            <span style={{ ...t.font.caption, color: t.text.tertiary }}>Connected {props.conn?.at ? new Date(props.conn.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""} (demo)</span>
          </>
        ) : (
          <Button variant="primary" disabled={busy} label={busy ? `Connecting to ${PLATFORM_NAME[props.id]}…` : `Connect ${PLATFORM_NAME[props.id]}${props.role === "vendor" ? (scope === "read" ? " (read-only)" : " (read/write)") : " (read-only)"}`}
            onClick={() => connect(props.id, scope)} />
        )}
      </div>
    </div>
  );
}

/** The Step 1 panel: platform tiles with Connect, a status chip and a per-scope "what we access" list. */
export function ConnectPanel(props: { role: Role; onClose?: () => void; extra?: ReactNode }) {
  const t = useGrokTheme();
  const c = rolePalette(t, props.role);
  const m = useConnections();
  const ids = props.role === "retailer" ? RETAIL_PLATFORMS : VENDOR_PLATFORMS;
  const done = isConnected(m, ids);
  return (
    <section data-testid={`${props.role}-connect`} style={{ border: `2px solid ${c.border}`, borderRadius: t.radius.lg, background: c.bg, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 760 }}>
          <span style={{ ...t.font.heading3, fontWeight: t.weight.semibold, color: c.text }}>
            Step 1 · {props.role === "retailer" ? "Connect Dutchie API" : "Connect your wholesale platform"} {done ? "✓" : ""}
          </span>
          <span style={{ ...t.font.body2, color: c.text }}>
            {props.role === "retailer"
              ? <>Connect your Dutchie POS so par levels run on your real inventory, sales and menu. <strong>Only read-only access is needed</strong>; the portal never writes to your POS.</>
              : <>Connect <strong>LeafLink, Apex, Marjin and/or Distru</strong> (any one or several). Choose the access level per platform: <strong>read-only</strong> to see a store's current inventory and send order requests from it, or <strong>read/write</strong> to also push the approved order through on that platform.</>}
          </span>
        </div>
        {props.onClose ? <Button variant="quiet" label={done ? "Done · hide" : "Skip for now"} onClick={props.onClose} /> : null}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${props.role === "retailer" ? 320 : 300}px, 1fr))`, gap: 12 }}>
        {ids.map((id) => <Tile key={id} id={id} role={props.role} conn={m[id]} />)}
      </div>
      <Callout tone="info" lead="Demo:">no real connection is made and nothing is sent anywhere. There are no logins or API keys here; in production you'd authorize access on the platform's own sign-in page. The rest of the demo works whether or not you connect, and the connection lasts for this browser session.</Callout>
      {props.extra}
    </section>
  );
}
