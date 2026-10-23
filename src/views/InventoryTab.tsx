// Retailer Inventory tab, laid out like a Dutchie dispensary menu. Quantities come from the Dutchie adapter.
import { Section, Metrics, Select, Input, Status, Text, useMemo, useState } from "../kit";
import type { StatusTone } from "../kit";
import { useStyles, Chip, SyncLine } from "../ui";
import { LOCS, LOC_NAME, VENDOR_BY_ID, money } from "../data";
import { MENU_BY_KEY, MENU_CATEGORIES, OPTION_OWNER, STRAIN_FILTERS, bulkPar, optionPar, weeklyUnits, type MenuCategory, type MenuProduct, type StrainFilter } from "../catalog/menu";
import type { DutchieInventoryItem } from "../integrations";

type SortKey = "popular" | "priceAsc" | "priceDesc" | "thc" | "name";
const SORTS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Popular" }, { value: "priceAsc", label: "Price: low to high" }, { value: "priceDesc", label: "Price: high to low" },
  { value: "thc", label: "THC: high to low" }, { value: "name", label: "Name" },
];

interface OptRow { id: string; label: string; price: number; qty: number; grams?: number; min: number; max: number }
interface ProdRow { p: MenuProduct; opts: OptRow[]; bulkGrams?: number; bulkMin?: number; bulkMax?: number; popular: number; minPrice: number; vendorTracked: boolean }

const statusOf = (qty: number, min: number): { label: string; tone: StatusTone } =>
  qty <= 0 ? { label: "Out of stock", tone: "danger" } : qty < min ? { label: "Low stock", tone: "warning" } : { label: "In stock", tone: "success" };
const fmtG = (g: number) => `${g.toLocaleString(undefined, { maximumFractionDigits: 1 })}g`;

export function InventoryTab(props: { items: Record<string, DutchieInventoryItem[]>; lastSync?: number; syncing: boolean; onSync: () => void; initialLoc: string }) {
  const { t, small, strong, row } = useStyles();
  const [loc, setLoc] = useState(props.initialLoc === "all" ? "south" : props.initialLoc);
  const [cat, setCat] = useState<MenuCategory>("Flower");
  const [sub, setSub] = useState<string>("");
  const [strains, setStrains] = useState<StrainFilter[]>([]);
  const [brand, setBrand] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");

  const rows: ProdRow[] = useMemo(() => {
    const by = new Map<string, ProdRow>();
    for (const it of props.items[loc] ?? []) {
      const own = OPTION_OWNER[it.productId];
      const p = own ? own.product : MENU_BY_KEY[it.productId];
      if (!p) continue;
      let r = by.get(p.key);
      if (!r) {
        r = { p, opts: [], popular: weeklyUnits(p.key, loc), minPrice: Infinity, vendorTracked: !!p.vendorId };
        by.set(p.key, r);
      }
      if (it.quantityUnits === "Grams") {
        const par = bulkPar(loc, p.key);
        r.bulkGrams = it.quantityAvailable; r.bulkMin = par.min; r.bulkMax = par.max;
        for (const o of p.options) r.opts.push({ id: o.id, label: o.label, price: o.price, grams: o.grams, qty: Math.floor(it.quantityAvailable / (o.grams ?? 1)), min: 0, max: 0 });
      } else if (own) {
        const par = optionPar(loc, it.productId);
        r.opts.push({ id: it.productId, label: own.option.label, price: it.unitPrice, grams: own.option.grams, qty: it.quantityAvailable, min: par.min, max: par.max });
      }
      r.minPrice = Math.min(r.minPrice, ...r.opts.map((o) => o.price));
    }
    for (const r of by.values()) r.opts.sort((a, b) => (a.grams ?? 0) - (b.grams ?? 0) || a.price - b.price);
    return Array.from(by.values());
  }, [props.items, loc]);

  const inCat = rows.filter((r) => r.p.category === cat);
  const subs = Array.from(new Set(inCat.map((r) => r.p.sub))).sort();
  const brands = Array.from(new Set(rows.map((r) => r.p.brand))).sort((a, b) => a.localeCompare(b));
  const needle = q.trim().toLowerCase();
  const shown = inCat
    .filter((r) => !sub || r.p.sub === sub)
    .filter((r) => !strains.length || strains.some((s) => r.p.strainGroups.includes(s)))
    .filter((r) => brand === "all" || r.p.brand === brand)
    .filter((r) => !needle || `${r.p.name} ${r.p.brand} ${r.p.sub} ${r.p.strain}`.toLowerCase().includes(needle))
    .sort((a, b) => sort === "popular" ? b.popular - a.popular : sort === "priceAsc" ? a.minPrice - b.minPrice : sort === "priceDesc" ? b.minPrice - a.minPrice
      : sort === "thc" ? b.p.thcValue - a.p.thcValue : a.p.name.localeCompare(b.p.name));

  const allOpts = rows.flatMap((r) => (r.bulkGrams !== undefined ? [] : r.opts));
  const low = allOpts.filter((o) => o.qty > 0 && o.qty < o.min).length + rows.filter((r) => r.bulkGrams !== undefined && r.bulkGrams > 0 && r.bulkGrams < (r.bulkMin ?? 0)).length;
  const out = allOpts.filter((o) => o.qty <= 0).length + rows.filter((r) => r.bulkGrams === 0).length;
  const bulkTotal = rows.reduce((s, r) => s + (r.bulkGrams ?? 0), 0);

  return (
    <>
      <SyncLine provider="Dutchie POS" at={props.lastSync} syncing={props.syncing} onSync={props.onSync} />
      <Metrics metrics={[
        { value: String(rows.length), label: "Products on menu", detail: `${brands.length} brands · ${LOC_NAME[loc]}` },
        { value: allOpts.reduce((s, o) => s + o.qty, 0).toLocaleString(), label: "Packaged units on hand", detail: `${allOpts.length} sizes / SKUs` },
        { value: fmtG(bulkTotal), label: "Bulk flower on hand", detail: `${rows.filter((r) => r.bulkGrams !== undefined).length} bulk strains` },
        { value: `${low} / ${out}`, label: "Low stock / out of stock", detail: "against par", tone: out ? "danger" : low ? "warning" : "success" },
      ]} />
      <Section heading={`Menu inventory · ${LOC_NAME[loc]}`} caption="Modeled on a Dutchie dispensary menu. Exact quantities per size; status against par. Sample data."
        actions={<Select options={LOCS.map((l) => ({ value: l.id, label: l.name }))} value={loc} onChange={(v) => { setLoc(v); }} />}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <nav aria-label="Categories" style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 170, flex: "0 0 170px" }}>
            {MENU_CATEGORIES.map((c) => {
              const on = c === cat;
              const n = rows.filter((r) => r.p.category === c).length;
              return (
                <button key={c} type="button" onClick={() => { setCat(c); setSub(""); }}
                  style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: t.radius.md, ...t.font.label,
                    fontWeight: on ? t.weight.semibold : t.weight.medium, color: on ? t.text.primary : t.text.secondary, background: on ? t.fill.accentSubtle : "transparent" }}>
                  <span>{c}</span><span style={{ color: t.text.tertiary }}>{n}</span>
                </button>
              );
            })}
          </nav>
          <div style={{ flex: "1 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 2fr) minmax(150px, 1fr) minmax(150px, 1fr)", gap: 10 }}>
              <Input label="Search" value={q} onChange={setQ} placeholder={`Search ${cat.toLowerCase()} by name, brand or strain`} />
              <Select label="Brand" options={[{ value: "all", label: "All brands" }, ...brands.map((b) => ({ value: b, label: b }))]} value={brand} onChange={setBrand} />
              <Select<SortKey> label="Sort by" options={SORTS} value={sort} onChange={setSort} />
            </div>
            <div style={row}>
              <Chip label="All" on={!sub} onClick={() => setSub("")} />
              {subs.map((s) => <Chip key={s} label={s} on={sub === s} onClick={() => setSub(sub === s ? "" : s)} count={inCat.filter((r) => r.p.sub === s).length} />)}
            </div>
            <div style={row}>
              <span style={small}>Strain type</span>
              {STRAIN_FILTERS.map((s) => <Chip key={s} label={s} on={strains.includes(s)} onClick={() => setStrains(strains.includes(s) ? strains.filter((x) => x !== s) : [...strains, s])} />)}
              <span style={small}>{shown.length} of {inCat.length} {cat.toLowerCase()}</span>
            </div>
            {shown.length === 0 ? <Text>No products match these filters.</Text> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 12 }}>
                {shown.map((r) => (
                  <div key={r.p.key} data-testid="menu-card" style={{ border: `1px solid ${t.border.subtle}`, borderRadius: t.radius.lg, background: t.bg.elevated, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ ...small, color: r.vendorTracked ? t.text.accent : t.text.secondary, fontWeight: t.weight.semibold, textTransform: "uppercase", letterSpacing: 0.4 }}>{r.p.brand}</span>
                      <span style={small}>{r.vendorTracked ? `Vendor: ${VENDOR_BY_ID[r.p.vendorId ?? "hmz"].name}` : "Other brand"}</span>
                    </div>
                    <span style={strong}>{r.p.name}</span>
                    <div style={{ ...row, gap: 6 }}>
                      {r.p.strain !== "N/A" ? <Status tone="accent">{r.p.strain}</Status> : null}
                      {r.p.thc ? <Status tone="neutral">{r.p.thcUnit === "%" ? `THC ${r.p.thc}` : `${r.p.thc} THC`}</Status> : null}
                      <Status tone="neutral">{r.p.sub}</Status>
                    </div>
                    {r.bulkGrams !== undefined ? (
                      <div style={{ ...row, justifyContent: "space-between" }}>
                        <span style={{ ...t.font.label, color: t.text.primary }}>Bulk jar: <strong>{fmtG(r.bulkGrams)}</strong> on hand</span>
                        {(() => { const s = statusOf(r.bulkGrams, r.bulkMin ?? 0); return <Status tone={s.tone}>{s.label}</Status>; })()}
                      </div>
                    ) : null}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {r.opts.map((o) => {
                        const s = r.bulkGrams !== undefined ? null : statusOf(o.qty, o.min);
                        return (
                          <div key={o.id} style={{ display: "grid", gridTemplateColumns: "64px 64px 1fr auto", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: t.radius.sm, background: t.fill.secondary }}>
                            <span style={{ ...t.font.label, fontWeight: t.weight.semibold, color: t.text.primary }}>{o.label}</span>
                            <span style={{ ...t.font.label, color: t.text.primary }}>{money(o.price)}</span>
                            <span style={small}>{r.bulkGrams !== undefined ? `${o.qty} × ${o.label} from jar` : `${o.qty} units · par ${o.min}–${o.max}`}</span>
                            {s ? <Status tone={s.tone}>{s.label}</Status> : <span />}
                          </div>
                        );
                      })}
                    </div>
                    <span style={small}>{r.popular.toFixed(1)} units/week{r.bulkGrams !== undefined ? ` · par ${fmtG(r.bulkMin ?? 0)}–${fmtG(r.bulkMax ?? 0)}` : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
