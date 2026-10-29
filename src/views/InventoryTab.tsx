// Retailer Inventory tab, laid out like Dutchie POS back-office Inventory: title + actions, search, filter dropdowns,
// dense checkbox table and a pagination footer. Quantities come from the Dutchie adapter; velocity is sample sales data.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "../kit";
import { useStyles, SyncLine } from "../ui";
import { ITEM, LOCS, LOC_NAME, VENDOR_BY_ID, VENDOR_BY_NAME, BASE, h, money } from "../data";
import { MENU_BY_KEY, MENU_CATEGORIES, OPTION_OWNER, STRAIN_FILTERS, bulkPar, lastSoldAt, optionPar, weeklyUnits, type MenuCategory, type MenuProduct } from "../catalog/menu";
import type { DutchieInventoryItem } from "../integrations";
import type { RefObject } from "react";

type StockStatus = "In stock" | "Low stock" | "Out of stock";
const STATUSES: StockStatus[] = ["In stock", "Low stock", "Out of stock"];
const ROOMS = ["Sales Floor", "Backstock", "Vault"] as const;
type Room = (typeof ROOMS)[number];
const TAGS = ["Par-tracked vendor", "Below par", "Top seller", "Bulk", "Slow mover"] as const;
type Tag = (typeof TAGS)[number];
/** Invented parody distributors, used only if a brand has no vendor account of its own. */
const DISTROS = ["Cascade Canna Supply", "Rogue Valley Distro", "Willamette Wholesale", "Self-distributed"];

interface InvRow {
  id: string; sku: string; product: string; size: string; p: MenuProduct; brand: string; vendor: string;
  loc: string; room: Room; available: number; grams: boolean; price: number; cost: number;
  velocity: number; pop: number; locIdx: number; lastSold: number | null; status: StockStatus; tags: Tag[]; catIdx: number;
}
type SortKey = "default" | "sku" | "product" | "brand" | "location" | "available" | "price" | "cost" | "velocity" | "lastSold";

/** Dutchie-style 6-character SKU for items without a vendor SKU. */
const hexSku = (id: string) => Math.floor(h(id + "sku") * 0xffffff).toString(16).toUpperCase().padStart(6, "0");
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" });
const fmtVel = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function buildRows(items: Record<string, DutchieInventoryItem[]>, now: number): InvRow[] {
  const out: InvRow[] = [];
  for (const l of LOCS) {
    for (const it of items[l.id] ?? []) {
      const own = OPTION_OWNER[it.productId];
      const p = own ? own.product : MENU_BY_KEY[it.productId];
      if (!p) continue;
      const grams = it.quantityUnits === "Grams";
      const weekly = weeklyUnits(p.key, l.id);
      const velocity = grams ? weekly * 3.5 : weekly * (own ? own.option.share : 1);
      const par = grams ? bulkPar(l.id, p.key) : optionPar(l.id, it.productId);
      const qty = it.quantityAvailable;
      const status: StockStatus = qty <= 0 ? "Out of stock" : qty < par.min ? "Low stock" : "In stock";
      const lastSold = lastSoldAt(it.productId, l.id, velocity, now);
      const tags: Tag[] = [];
      if (p.vendorId) tags.push("Par-tracked vendor");
      if (status !== "In stock") tags.push("Below par");
      if (grams) tags.push("Bulk");
      if (velocity >= 6) tags.push("Top seller");
      if (velocity < 1) tags.push("Slow mover");
      // Cost keeps the product's wholesale margin at every size (per gram for bulk flower).
      const costRatio = p.unitCost / (ITEM[p.key]?.price || it.unitPrice || 1);
      const cost = Math.round(it.unitPrice * costRatio * 100) / 100;
      const vendor = p.vendorId ? VENDOR_BY_ID[p.vendorId].name : VENDOR_BY_NAME[p.brand]?.name ?? DISTROS[Math.floor(h(p.brand + "distro") * DISTROS.length)];
      const base = {
        sku: p.vendorId ? it.sku : hexSku(it.productId), product: grams || !it.size || it.size === "Each" || p.name.toLowerCase().includes(it.size.toLowerCase()) ? p.name : `${p.name} ${it.size}`,
        size: it.size, p, brand: p.brand, vendor, loc: l.id, grams, price: it.unitPrice, cost,
        velocity, pop: LOCS.reduce((a, x) => a + weeklyUnits(p.key, x.id), 0), locIdx: LOCS.findIndex((x) => x.id === l.id), lastSold, status, tags, catIdx: MENU_CATEGORIES.indexOf(p.category),
      };
      if (grams) { out.push({ ...base, id: `${it.inventoryId}|Vault`, room: "Vault", available: qty }); continue; }
      // Larger counts are split between the sales floor and backstock, the way Dutchie tracks rooms.
      if (qty >= 8 && h(it.productId + l.id + "room") < 0.4) {
        const back = Math.round(qty * (0.3 + 0.3 * h(it.productId + l.id + "split")));
        out.push({ ...base, id: `${it.inventoryId}|Sales Floor`, room: "Sales Floor", available: qty - back });
        out.push({ ...base, id: `${it.inventoryId}|Backstock`, room: "Backstock", available: back });
      } else out.push({ ...base, id: `${it.inventoryId}|Sales Floor`, room: "Sales Floor", available: qty });
    }
  }
  return out;
}

// ─────────────────────────── small Dutchie-like controls
function useOutside(ref: RefObject<HTMLElement>, on: boolean, close: () => void) {
  useEffect(() => {
    if (!on) return;
    const f = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, [on, close, ref]);
}

export function Chevron() {
  return <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" style={{ marginLeft: 6 }}><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function Dropdown(props: { label: ReactNode; active?: boolean; variant?: "pill" | "button"; children: (close: () => void) => ReactNode; align?: "left" | "right"; width?: number; testId?: string }) {
  const { t } = useStyles();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useMemo(() => () => setOpen(false), []);
  useOutside(ref, open, close);
  const pill = props.variant !== "button";
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" data-testid={props.testId} onClick={() => setOpen(!open)} aria-expanded={open}
        style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", height: 34, padding: "0 12px", borderRadius: t.radius.sm, boxSizing: "border-box",
          ...t.font.label, fontWeight: t.weight.medium, whiteSpace: "nowrap",
          color: props.active ? t.text.accent : t.text.primary,
          background: pill ? (props.active ? t.fill.accentSubtle : t.bg.elevated) : t.fill.secondary,
          border: pill ? `1px solid ${props.active ? t.border.focus : t.border.default}` : "1px solid transparent" }}>
        {props.label}<Chevron />
      </button>
      {open ? (
        <div role="menu" style={{ position: "absolute", top: 38, [props.align === "right" ? "right" : "left"]: 0, zIndex: 20, minWidth: props.width ?? 200, maxHeight: 320, overflowY: "auto",
          background: t.bg.elevated, border: `1px solid ${t.border.default}`, borderRadius: t.radius.md, boxShadow: "0 8px 24px rgba(15,17,21,0.14)", padding: 6 }}>
          {props.children(close)}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem(props: { label: string; onClick: () => void; checked?: boolean; disabled?: boolean; hint?: string }) {
  const { t } = useStyles();
  return (
    <button type="button" role={props.checked === undefined ? "menuitem" : "menuitemcheckbox"} aria-checked={props.checked} disabled={props.disabled} onClick={props.onClick}
      style={{ all: "unset", boxSizing: "border-box", width: "100%", cursor: props.disabled ? "default" : "pointer", display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: t.radius.sm,
        ...t.font.label, color: props.disabled ? t.text.tertiary : t.text.primary }}
      onMouseEnter={(e) => { if (!props.disabled) e.currentTarget.style.background = t.fill.hover; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
      {props.checked !== undefined ? <input type="checkbox" readOnly checked={props.checked} tabIndex={-1} style={{ margin: 0, accentColor: t.fill.accent }} /> : null}
      <span style={{ flex: 1 }}>{props.label}</span>
      {props.hint ? <span style={{ color: t.text.tertiary }}>{props.hint}</span> : null}
    </button>
  );
}

function MultiFilter<T extends string>(props: { label: string; options: readonly T[]; value: T[]; onChange: (v: T[]) => void; counts?: Record<string, number>; testId?: string }) {
  const n = props.value.length;
  return (
    <Dropdown label={n ? `${props.label} (${n})` : props.label} active={n > 0} testId={props.testId} width={220}>
      {() => (
        <>
          {props.options.map((o) => (
            <MenuItem key={o} label={o} checked={props.value.includes(o)} hint={props.counts ? String(props.counts[o] ?? 0) : undefined}
              onClick={() => props.onChange(props.value.includes(o) ? props.value.filter((x) => x !== o) : [...props.value, o])} />
          ))}
          {n ? <MenuItem label="Clear" onClick={() => props.onChange([])} /> : null}
        </>
      )}
    </Dropdown>
  );
}

// ─────────────────────────── tab
export function InventoryTab(props: {
  items: Record<string, DutchieInventoryItem[]>; lastSync?: number; syncing: boolean; onSync: () => void; initialLoc: string;
  now?: number; onReceive?: () => void; onReceiveHistory?: () => void;
}) {
  const { t, small } = useStyles();
  const now = props.now ?? BASE;
  const [store, setStore] = useState<string>(props.initialLoc);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<StockStatus[]>([]);
  const [vendorF, setVendorF] = useState<string[]>([]);
  const [roomF, setRoomF] = useState<Room[]>([]);
  const [catF, setCatF] = useState<MenuCategory[]>([]);
  const [tagF, setTagF] = useState<Tag[]>([]);
  const [strainF, setStrainF] = useState<string[]>([]);
  const [hideZero, setHideZero] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "default", dir: 1 });
  const [perPage, setPerPage] = useState(50);
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");

  const all = useMemo(() => buildRows(props.items, now), [props.items, now]);
  const scoped = useMemo(() => all.filter((r) => store === "all" || r.loc === store), [all, store]);
  const vendors = useMemo(() => Array.from(new Set(scoped.map((r) => r.vendor))).sort((a, b) => a.localeCompare(b)), [scoped]);
  const countBy = (f: (r: InvRow) => string | string[]) => {
    const c: Record<string, number> = {};
    for (const r of scoped) for (const k of ([] as string[]).concat(f(r))) c[k] = (c[k] ?? 0) + 1;
    return c;
  };

  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => {
    const cmp = (a: InvRow, b: InvRow): number => {
      const d = sort.dir;
      switch (sort.key) {
        case "sku": return d * a.sku.localeCompare(b.sku);
        case "product": return d * a.product.localeCompare(b.product);
        case "brand": return d * (a.brand.localeCompare(b.brand) || a.product.localeCompare(b.product));
        case "location": return d * (`${LOC_NAME[a.loc]}${a.room}`.localeCompare(`${LOC_NAME[b.loc]}${b.room}`));
        case "available": return d * (a.available - b.available);
        case "price": return d * (a.price - b.price);
        case "cost": return d * (a.cost - b.cost);
        case "velocity": return d * (a.velocity - b.velocity);
        case "lastSold": return d * ((a.lastSold ?? 0) - (b.lastSold ?? 0));
        // Dutchie menu order: category, then best-selling products within each category (all sizes and rooms kept together).
        default: return a.catIdx - b.catIdx || b.pop - a.pop || a.brand.localeCompare(b.brand) || a.p.name.localeCompare(b.p.name) || a.price - b.price || a.locIdx - b.locIdx || a.room.localeCompare(b.room);
      }
    };
    return scoped
      .filter((r) => !statusF.length || statusF.includes(r.status))
      .filter((r) => !vendorF.length || vendorF.includes(r.vendor))
      .filter((r) => !roomF.length || roomF.includes(r.room))
      .filter((r) => !catF.length || catF.includes(r.p.category))
      .filter((r) => !tagF.length || tagF.some((x) => r.tags.includes(x)))
      .filter((r) => !strainF.length || strainF.some((s) => r.p.strainGroups.includes(s as never)))
      .filter((r) => !hideZero || r.available > 0)
      .filter((r) => !needle || `${r.sku} ${r.product} ${r.brand} ${r.vendor} ${r.p.category} ${r.p.sub} ${r.p.strain} ${r.room} ${LOC_NAME[r.loc]}`.toLowerCase().includes(needle))
      .sort(cmp);
  }, [scoped, statusF, vendorF, roomF, catF, tagF, strainF, hideZero, needle, sort]);

  useEffect(() => { setPage(0); }, [store, q, statusF, vendorF, roomF, catF, tagF, strainF, hideZero, perPage, sort]);
  const pages = Math.max(1, Math.ceil(shown.length / perPage));
  const pg = Math.min(page, pages - 1);
  const slice = shown.slice(pg * perPage, pg * perPage + perPage);
  const allOnPage = slice.length > 0 && slice.every((r) => sel.has(r.id));
  const low = scoped.filter((r) => r.status === "Low stock").length;
  const out = scoped.filter((r) => r.status === "Out of stock").length;
  const filtersOn = statusF.length + vendorF.length + roomF.length + catF.length + tagF.length + strainF.length + (hideZero ? 1 : 0) + (needle ? 1 : 0);

  const exportCsv = (rows: InvRow[]) => {
    const head = ["SKU", "Product", "Brand", "Vendor", "Store", "Location", "Available", "Unit", "Price", "Cost", "Sales velocity (units/wk)", "Last date sold"];
    const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const body = rows.map((r) => [r.sku, r.product, r.brand, r.vendor, LOC_NAME[r.loc], r.room, String(r.available), r.grams ? "g" : "units", r.price.toFixed(2), r.cost.toFixed(2),
      fmtVel(r.velocity) + (r.grams ? " g" : ""), r.lastSold ? dateFmt.format(r.lastSold) : "Never"].map(esc).join(","));
    const blob = new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `inventory-${store}-${new Date(now).toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setNotice(`Exported ${rows.length} rows to CSV.`);
  };

  // Dutchie-like palette for this tab (follows the theme so dark mode stays readable).
  const light = t.kind === "light";
  const headBg = light ? "#ffffff" : t.bg.elevated;
  const rowBorder = light ? "#e9ebef" : t.border.subtle;
  const link = light ? "#1f6fd1" : t.text.accent;
  const th: CSSProperties = { position: "sticky", top: 0, background: headBg, textAlign: "left", padding: "10px 10px", fontSize: 11, lineHeight: "14px", fontWeight: t.weight.semibold,
    letterSpacing: 0.4, textTransform: "uppercase", color: t.text.secondary, borderBottom: `1px solid ${rowBorder}`, whiteSpace: "nowrap", userSelect: "none" };
  const td: CSSProperties = { padding: "8px 10px", fontSize: 12.5, lineHeight: "18px", color: t.text.primary, borderBottom: `1px solid ${rowBorder}`, verticalAlign: "middle" };
  const num: CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
  const SortTh = (p: { k: SortKey; label: string; right?: boolean; title?: string }) => {
    const on = sort.key === p.k;
    return (
      <th style={{ ...th, textAlign: p.right ? "right" : "left", cursor: "pointer", color: on ? t.text.primary : th.color }} title={p.title ?? `Sort by ${p.label.toLowerCase()}`}
        aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
        onClick={() => setSort(on ? (sort.dir === 1 ? { key: p.k, dir: -1 } : { key: "default", dir: 1 }) : { key: p.k, dir: ["velocity", "lastSold", "available", "price", "cost"].includes(p.k) ? -1 : 1 })}>
        {p.label}{on ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
      </th>
    );
  };
  const statusColor = (s: StockStatus) => (s === "Out of stock" ? t.text.danger : s === "Low stock" ? t.text.warning : t.text.primary);
  const btn = (primary: boolean): CSSProperties => ({ all: "unset", cursor: "pointer", height: 34, padding: "0 14px", display: "inline-flex", alignItems: "center", borderRadius: t.radius.sm, boxSizing: "border-box",
    ...t.font.label, fontWeight: t.weight.semibold, color: primary ? "#fff" : t.text.primary, background: primary ? (light ? "#0b6bdc" : t.fill.accent) : t.fill.secondary, whiteSpace: "nowrap" });

  return (
    <>
      <SyncLine provider="Dutchie POS" at={props.lastSync} syncing={props.syncing} onSync={props.onSync} />
      <div data-testid="inventory-page" style={{ background: headBg, border: `1px solid ${t.border.subtle}`, borderRadius: t.radius.lg, padding: "18px 20px 12px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 22, lineHeight: "30px", fontWeight: 700, color: t.text.primary, flex: "1 1 auto" }}>Inventory</h2>
          <Dropdown variant="button" label="Actions" align="right" width={230} testId="inv-actions">
            {(close) => (
              <>
                <MenuItem label={sel.size ? `Export ${sel.size} selected (CSV)` : "Export selected (CSV)"} disabled={!sel.size} onClick={() => { exportCsv(shown.filter((r) => sel.has(r.id))); close(); }} />
                <MenuItem label={`Export all ${shown.length} filtered rows (CSV)`} onClick={() => { exportCsv(shown); close(); }} />
                <MenuItem label="Sync with Dutchie POS now" disabled={props.syncing} onClick={() => { props.onSync(); close(); }} />
                <MenuItem label="Clear selection" disabled={!sel.size} onClick={() => { setSel(new Set()); close(); }} />
                <MenuItem label="Move to room…" hint="demo" disabled onClick={() => undefined} />
                <MenuItem label="Print labels" hint="demo" disabled onClick={() => undefined} />
              </>
            )}
          </Dropdown>
          <button type="button" style={btn(false)} onClick={() => props.onReceiveHistory?.()} title="Open Order history (received vendor orders)">Receive history</button>
          <button type="button" style={btn(true)} onClick={() => props.onReceive?.()} title="Open Receiving to check in shipments">Receive inventory</button>
        </div>
        {/* search + filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ flex: "1 1 260px", minWidth: 220, position: "relative", display: "flex" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{ position: "absolute", left: 11, top: 9, color: t.text.tertiary }}>
              <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input aria-label="Search inventory" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search inventory…"
              style={{ width: "100%", height: 34, boxSizing: "border-box", padding: "0 12px 0 34px", borderRadius: t.radius.sm, border: `1px solid ${light ? "#eceef1" : t.border.default}`,
                background: light ? "#f1f2f4" : t.fill.secondary, color: t.text.primary, ...t.font.label, outline: "none" }} />
          </label>
          <Dropdown label={store === "all" ? "Store: All" : `Store: ${LOC_NAME[store]}`} active={store !== "all"} testId="filter-store">
            {(close) => [{ id: "all", name: "All stores" }, ...LOCS].map((l) => <MenuItem key={l.id} label={l.name} checked={store === l.id} onClick={() => { setStore(l.id); close(); }} />)}
          </Dropdown>
          <MultiFilter label="Status" options={STATUSES} value={statusF} onChange={setStatusF} counts={countBy((r) => r.status)} testId="filter-status" />
          <MultiFilter label="Vendor" options={vendors} value={vendorF} onChange={setVendorF} counts={countBy((r) => r.vendor)} testId="filter-vendor" />
          <MultiFilter label="Location" options={ROOMS} value={roomF} onChange={setRoomF} counts={countBy((r) => r.room)} testId="filter-room" />
          <MultiFilter label="Category" options={MENU_CATEGORIES} value={catF} onChange={setCatF} counts={countBy((r) => r.p.category)} testId="filter-category" />
          <MultiFilter label="Tags" options={TAGS} value={tagF} onChange={setTagF} counts={countBy((r) => r.tags)} testId="filter-tags" />
          <Dropdown label={strainF.length || hideZero ? `More (${strainF.length + (hideZero ? 1 : 0)})` : "More"} active={strainF.length > 0 || hideZero} align="right" width={220} testId="filter-more">
            {() => (
              <>
                <div style={{ ...small, padding: "4px 8px" }}>Strain type</div>
                {STRAIN_FILTERS.map((s) => <MenuItem key={s} label={s} checked={strainF.includes(s)} onClick={() => setStrainF(strainF.includes(s) ? strainF.filter((x) => x !== s) : [...strainF, s])} />)}
                <div style={{ ...small, padding: "8px 8px 4px" }}>Quantity</div>
                <MenuItem label="Hide zero quantity" checked={hideZero} onClick={() => setHideZero(!hideZero)} />
              </>
            )}
          </Dropdown>
          <button type="button" title="Sync with Dutchie POS" aria-label="Refresh from Dutchie POS" onClick={props.onSync} disabled={props.syncing}
            style={{ ...btn(false), width: 34, padding: 0, justifyContent: "center", opacity: props.syncing ? 0.6 : 1 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8a5 5 0 1 1-1.5-3.5M13 2.5v3h-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", ...small }}>
          <span>{shown.length.toLocaleString()} of {scoped.length.toLocaleString()} rows · {store === "all" ? "all stores" : LOC_NAME[store]}</span>
          <span style={{ color: t.text.warning }}>{low} low stock</span>
          <span style={{ color: t.text.danger }}>{out} out of stock</span>
          <span>Status is against par · Sales velocity = last 4-week average · Sample data</span>
          {filtersOn ? <button type="button" onClick={() => { setQ(""); setStatusF([]); setVendorF([]); setRoomF([]); setCatF([]); setTagF([]); setStrainF([]); setHideZero(false); }}
            style={{ all: "unset", cursor: "pointer", color: link, fontWeight: t.weight.semibold }}>Clear filters</button> : null}
          {sel.size ? <span style={{ color: t.text.primary, fontWeight: t.weight.semibold }}>{sel.size} selected</span> : null}
          {notice ? <span style={{ color: t.text.success }}>{notice}</span> : null}
        </div>
        {/* table */}
        <div style={{ overflow: "auto", maxHeight: "70vh", border: `1px solid ${rowBorder}`, borderRadius: t.radius.sm }}>
          <table data-testid="inventory-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 1020 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 34, paddingRight: 0 }}>
                  <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} style={{ accentColor: t.fill.accent }}
                    onChange={() => { const n = new Set(sel); slice.forEach((r) => (allOnPage ? n.delete(r.id) : n.add(r.id))); setSel(n); }} />
                </th>
                <SortTh k="sku" label="SKU" />
                <SortTh k="product" label="Product" />
                <SortTh k="brand" label="Brand / Vendor" />
                <SortTh k="location" label="Location" />
                <SortTh k="available" label="Available" right title="On hand in this room (units, or grams for bulk flower)" />
                <SortTh k="price" label="Price" right />
                <SortTh k="cost" label="Cost" right />
                <SortTh k="velocity" label="Sales velocity (units/wk)" right title="Average units sold per week over the last 4 weeks at this store (grams/week for bulk flower)" />
                <SortTh k="lastSold" label="Last date sold" right />
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr><td colSpan={10} style={{ ...td, textAlign: "center", color: t.text.secondary, padding: 24 }}>No inventory matches these filters.</td></tr>
              ) : slice.map((r) => {
                const on = sel.has(r.id);
                return (
                  <tr key={r.id} data-testid="inventory-row" style={{ background: on ? t.fill.accentSubtle : undefined }}
                    onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = light ? "#f7f8fa" : t.fill.hover; }} onMouseLeave={(e) => { e.currentTarget.style.background = on ? t.fill.accentSubtle : ""; }}>
                    <td style={{ ...td, paddingRight: 0 }}>
                      <input type="checkbox" aria-label={`Select ${r.sku}`} checked={on} style={{ accentColor: t.fill.accent }}
                        onChange={() => { const n = new Set(sel); if (on) n.delete(r.id); else n.add(r.id); setSel(n); }} />
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <a href="#" onClick={(e) => { e.preventDefault(); setQ(r.sku); }} title="Show every room for this SKU" style={{ color: link, fontWeight: t.weight.semibold, textDecoration: "none" }}>{r.sku}</a>
                    </td>
                    <td style={{ ...td, fontWeight: t.weight.semibold, minWidth: 240 }}>
                      {r.product}
                      <div style={{ fontSize: 11, lineHeight: "15px", color: t.text.secondary, fontWeight: t.weight.regular }}>{r.p.category} · {r.p.sub}{r.p.strain !== "N/A" ? ` · ${r.p.strain}` : ""}</div>
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <span style={{ fontWeight: t.weight.medium }}>{r.brand}</span>
                      <div style={{ fontSize: 11, lineHeight: "15px", color: r.p.vendorId ? t.text.accent : t.text.secondary }}>{r.p.vendorId ? "Vendor (par-tracked)" : r.vendor === r.brand ? "Vendor account · no par" : r.vendor}</div>
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {r.room}
                      {store === "all" ? <div style={{ fontSize: 11, lineHeight: "15px", color: t.text.secondary }}>{LOC_NAME[r.loc]}</div> : null}
                    </td>
                    <td style={{ ...num, color: statusColor(r.status), fontWeight: r.status === "In stock" ? t.weight.regular : t.weight.semibold }} title={r.status}>
                      {r.grams ? `${r.available.toLocaleString(undefined, { maximumFractionDigits: 1 })} g` : r.available.toLocaleString()}
                    </td>
                    <td style={num}>{money(r.price)}{r.grams ? <span style={{ color: t.text.secondary }}> /g</span> : null}</td>
                    <td style={num}>{money(r.cost)}{r.grams ? <span style={{ color: t.text.secondary }}> /g</span> : null}</td>
                    <td style={num}>{fmtVel(r.velocity)}{r.grams ? <span style={{ color: t.text.secondary }}> g</span> : null}</td>
                    <td style={{ ...num, color: r.lastSold ? t.text.primary : t.text.tertiary }}>{r.lastSold ? dateFmt.format(r.lastSold) : "Never"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* pagination footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, ...t.font.label, color: t.text.secondary }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <PageBtn label="‹" aria="Previous page" disabled={pg === 0} onClick={() => setPage(pg - 1)} />
            {pageList(pg, pages).map((p, i) => p < 0 ? <span key={`e${i}`} style={{ padding: "0 4px" }}>…</span>
              : <PageBtn key={p} label={String(p + 1)} aria={`Page ${p + 1}`} on={p === pg} onClick={() => setPage(p)} />)}
            <PageBtn label="›" aria="Next page" disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span data-testid="inventory-displaying">Displaying <strong style={{ color: t.text.primary }}>{shown.length ? pg * perPage + 1 : 0} - {Math.min(shown.length, (pg + 1) * perPage)}</strong> of {shown.length.toLocaleString()}</span>
            <select aria-label="Rows per page" value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}
              style={{ height: 28, borderRadius: t.radius.sm, border: `1px solid ${t.border.default}`, background: t.bg.elevated, color: t.text.primary, ...t.font.label, padding: "0 6px" }}>
              {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>Per page</span>
          </div>
        </div>
      </div>
    </>
  );
}

function pageList(cur: number, n: number): number[] {
  if (n <= 7) return Array.from({ length: n }, (_, i) => i);
  const s = new Set([0, n - 1, cur - 1, cur, cur + 1].filter((x) => x >= 0 && x < n));
  const arr = Array.from(s).sort((a, b) => a - b);
  const out: number[] = [];
  arr.forEach((x, i) => { if (i && x - arr[i - 1] > 1) out.push(-1); out.push(x); });
  return out;
}

function PageBtn(props: { label: string; aria: string; on?: boolean; disabled?: boolean; onClick: () => void }) {
  const { t } = useStyles();
  return (
    <button type="button" aria-label={props.aria} aria-current={props.on ? "page" : undefined} disabled={props.disabled} onClick={props.onClick}
      style={{ all: "unset", cursor: props.disabled ? "default" : "pointer", minWidth: 28, height: 28, borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center",
        ...t.font.label, fontWeight: props.on ? t.weight.semibold : t.weight.medium, color: props.disabled ? t.text.tertiary : t.text.primary,
        background: props.on ? t.fill.secondary : "transparent", border: props.label.length === 1 && !/\d/.test(props.label) ? `1px solid ${t.border.default}` : "1px solid transparent" }}>
      {props.label}
    </button>
  );
}
