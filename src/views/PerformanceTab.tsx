// Inventory → Performance: Dutchie-style sales & performance reports for the demo retailer.
// White cards, a KPI strip (Gross Sales highlighted), a teal sales bar chart, a donut breakdown,
// a ranking table (Master Categories | Categories | Products | Brands | Tags) and monthly / by-location trends.
// Built from the same weekly sales as Inventory's sales velocity (see catalog/performance.ts). Sample data.
import { compareSort, useMemo, useState, useTableControls, type CSSProperties, type ReactNode, type SortValue } from "../kit";
import { useStyles } from "../ui";
import { ITEMS, LOCS, LOC_NAME, h, money, money0, type InvMap, type Item, type Order } from "../data";
import { MENU_BY_KEY, MENU_CATEGORIES, OPTION_OWNER, lastSoldAt, weeklyUnits } from "../catalog/menu";
import { DAY_MS, LAST, MONTHS, PERIODS, TODAY, dayMs, dayTotals, discRate, monthRange, periodRange, prevRange, rangeTotals, receipts, unitCostOf, unitsIn, type Period } from "../catalog/performance";
import type { DutchieInventoryItem } from "../integrations";
import { Dropdown, MenuItem } from "./InventoryTab";

const TEAL = "#2fb0d0";
const NAVY = "#14213d";
const BLUE = "#3b82f6";
const LOC_COLORS: Record<string, string> = { south: "#2563eb", east: "#f59e0b", river: "#10b981" };
const PALETTE = ["#2fb0d0", "#1e3a8a", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#ec4899", "#14b8a6", "#6366f1", "#84cc16"];
const OTHER = "#a3acb9";
const dFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
const dyFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" });
const wdFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "America/Los_Angeles" });
const k$ = (n: number) => (Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : `$${Math.round(n)}`);
const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;
const int = (n: number) => Math.round(n).toLocaleString();

type Dim = "master" | "category" | "product" | "brand" | "tag";
const DIM_LABEL: Record<Dim, string> = { master: "Master Categories", category: "Categories", product: "Products", brand: "Brands", tag: "Tags" };
type SortBy = "high" | "low" | "margin" | "discount";
const SORT_LABEL: Record<SortBy, string> = { high: "Highest Selling", low: "Lowest Selling", margin: "Highest Margin", discount: "Most Discounted" };

interface ProdRow {
  it: Item; sku: string; master: string; category: string; brand: string; tags: string[];
  sold: number; gross: number; disc: number; cost: number; remaining: number; units: number;
  received: number; lastReceived: number | null; velocity: number; lastSold: number | null;
}
interface GroupRow { key: string; name: string; units: number; sold: number; remaining: number; gross: number; disc: number; cost: number; products: number; prod?: ProdRow }

function buildProducts(locs: string[], from: number, to: number, items: Record<string, DutchieInventoryItem[]>, inv: InvMap, orders: Order[], now: number): ProdRow[] {
  const remainingBy: Record<string, number> = {};
  for (const l of locs) for (const x of items[l] ?? []) {
    const key = OPTION_OWNER[x.productId]?.product.key ?? x.productId;
    remainingBy[key] = (remainingBy[key] ?? 0) + x.quantityAvailable;
  }
  const fromMs = dayMs(from) - DAY_MS / 2, toMs = dayMs(to) + DAY_MS / 2;
  return ITEMS.map((it) => {
    const m = MENU_BY_KEY[it.key];
    let sold = 0, received = 0, velocity = 0;
    let lastReceived: number | null = null, lastSold: number | null = null;
    for (const l of locs) {
      sold += unitsIn(it.key, l, from, to);
      const wk = weeklyUnits(it.key, l);
      velocity += wk;
      for (const r of receipts(it.key, l)) {
        if (r.d >= from && r.d <= to) received += r.qty;
        lastReceived = Math.max(lastReceived ?? 0, dayMs(r.d) - 3 * 3600000);
      }
      if (it.vendorId) {
        const st = inv[`${l}|${it.key}`];
        if (st?.received) lastReceived = Math.max(lastReceived ?? 0, st.received);
        for (const o of orders) if (o.locId === l && o.receivedAt && o.receivedAt >= fromMs && o.receivedAt <= toMs)
          for (const ln of o.lines) if (ln.sku === it.key) received += Math.max(0, ln.received - ln.damaged);
      }
      for (const opt of m?.options ?? []) {
        const v = m.bulk ? wk * 3.5 : wk * opt.share;
        const ls = lastSoldAt(m.bulk ? `${it.key}-bulk-${l}` : opt.id, l, v, now);
        if (ls) lastSold = Math.max(lastSold ?? 0, ls);
      }
    }
    const gross = sold * it.price, dr = discRate(it.key);
    const tags: string[] = [];
    const perStore = velocity / Math.max(1, locs.length);
    if (it.vendorId) tags.push("Par-tracked vendor");
    if (perStore >= 6) tags.push("Top seller");
    if (perStore < 1) tags.push("Slow mover");
    if (m?.bulk) tags.push("Bulk");
    if (dr >= 0.11) tags.push("On promo");
    for (const g of m?.strainGroups ?? []) tags.push(g);
    return {
      it, sku: it.vendorId ? it.key : Math.floor(h(it.key + "sku") * 0xffffff).toString(16).toUpperCase().padStart(6, "0"),
      master: m?.category ?? it.category, category: m?.sub ?? it.category, brand: it.brand, tags,
      sold, gross, disc: gross * dr, cost: sold * unitCostOf(it), remaining: remainingBy[it.key] ?? 0, units: m?.options.length ?? 1,
      received, lastReceived, velocity, lastSold,
    };
  });
}

function group(rows: ProdRow[], dim: Dim): GroupRow[] {
  if (dim === "product") return rows.map((r) => ({ key: r.it.key, name: r.it.name, units: r.units, sold: r.sold, remaining: r.remaining, gross: r.gross, disc: r.disc, cost: r.cost, products: 1, prod: r }));
  const m = new Map<string, GroupRow>();
  for (const r of rows) {
    const keys = dim === "master" ? [r.master] : dim === "category" ? [`${r.category}`] : dim === "brand" ? [r.brand] : r.tags;
    for (const k of keys) {
      const g = m.get(k) ?? { key: k, name: k, units: 0, sold: 0, remaining: 0, gross: 0, disc: 0, cost: 0, products: 0 };
      g.units += r.units; g.sold += r.sold; g.remaining += r.remaining; g.gross += r.gross; g.disc += r.disc; g.cost += r.cost; g.products += 1;
      m.set(k, g);
    }
  }
  return Array.from(m.values());
}

// ─────────────────────────── shared card chrome
function useCard() {
  const { t } = useStyles();
  const light = t.kind === "light";
  const card: CSSProperties = { background: light ? "#ffffff" : t.bg.elevated, border: `1px solid ${light ? "#e6e8ec" : t.border.subtle}`, borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14, minWidth: 0, boxShadow: light ? "0 1px 2px rgba(16,24,40,0.04)" : undefined };
  const h3: CSSProperties = { margin: 0, fontSize: 16, lineHeight: "22px", fontWeight: 700, color: t.text.primary };
  const sub: CSSProperties = { fontSize: 12, lineHeight: "16px", color: t.text.secondary };
  const grid = light ? "#eef0f3" : t.border.subtle;
  const axis = t.text.tertiary;
  return { t, light, card, h3, sub, grid, axis };
}
function Card(props: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; testId?: string }) {
  const { card, h3, sub } = useCard();
  return (
    <section style={card} data-testid={props.testId}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", gap: 2 }}>
          <h3 style={h3}>{props.title}</h3>
          {props.subtitle ? <span style={sub}>{props.subtitle}</span> : null}
        </div>
        {props.actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{props.actions}</div> : null}
      </div>
      {props.children}
    </section>
  );
}
function Pick<T extends string>(props: { value: T; options: readonly T[]; onChange: (v: T) => void; label?: (v: T) => string; testId?: string }) {
  const lab = props.label ?? ((v: T) => v);
  return (
    <Dropdown label={lab(props.value)} testId={props.testId} align="right" width={190}>
      {(close) => props.options.map((o) => <MenuItem key={o} label={lab(o)} checked={o === props.value} onClick={() => { props.onChange(o); close(); }} />)}
    </Dropdown>
  );
}

// ─────────────────────────── charts (plain SVG)
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
function BarChart(props: { bars: { label: string; value: number; tip: string }[]; color: string; height?: number; labelEvery?: number; testId?: string }) {
  const { grid, axis, t } = useCard();
  const [hover, setHover] = useState(-1);
  const W = 760, H = props.height ?? 240, L = 52, B = 26, T = 10, R = 8;
  const max = niceMax(Math.max(...props.bars.map((b) => b.value), 1));
  const n = props.bars.length, slot = (W - L - R) / Math.max(1, n), bw = Math.max(2, Math.min(38, slot * 0.62));
  const every = props.labelEvery ?? Math.max(1, Math.ceil(n / 12));
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  return (
    <div style={{ position: "relative" }} data-testid={props.testId}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Bar chart" style={{ display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} stroke={grid} strokeDasharray={f ? "3 3" : undefined} />
            <text x={L - 8} y={y(max * f) + 4} fontSize={11} textAnchor="end" fill={axis}>{k$(max * f)}</text>
          </g>
        ))}
        {props.bars.map((b, i) => {
          const x = L + slot * i + (slot - bw) / 2;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)}>
              <rect x={L + slot * i} y={T} width={slot} height={H - T - B} fill="transparent" />
              <rect x={x} y={y(b.value)} width={bw} height={Math.max(0, H - B - y(b.value))} rx={Math.min(4, bw / 3)} fill={props.color} opacity={hover === -1 || hover === i ? 1 : 0.55}>
                <title>{b.tip}</title>
              </rect>
              {i % every === 0 || n <= 12 ? <text x={L + slot * i + slot / 2} y={H - 8} fontSize={11} textAnchor="middle" fill={axis}>{b.label}</text> : null}
            </g>
          );
        })}
      </svg>
      {hover >= 0 ? (
        <div style={{ position: "absolute", top: 0, right: 0, background: t.kind === "light" ? NAVY : "#0b1220", color: "#fff", borderRadius: 6, padding: "4px 8px", fontSize: 12, pointerEvents: "none" }}>
          {props.bars[hover].tip}
        </div>
      ) : null}
    </div>
  );
}
function LineChartSvg(props: { labels: string[]; series: { name: string; color: string; values: number[] }[]; height?: number; testId?: string }) {
  const { grid, axis, t } = useCard();
  const W = 760, H = props.height ?? 240, L = 52, B = 26, T = 10, R = 12;
  const max = niceMax(Math.max(1, ...props.series.flatMap((s) => s.values)));
  const n = props.labels.length;
  const x = (i: number) => L + ((W - L - R) * i) / Math.max(1, n - 1);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  return (
    <div data-testid={props.testId}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Line chart" style={{ display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} stroke={grid} strokeDasharray={f ? "3 3" : undefined} />
            <text x={L - 8} y={y(max * f) + 4} fontSize={11} textAnchor="end" fill={axis}>{k$(max * f)}</text>
          </g>
        ))}
        {props.labels.map((l, i) => <text key={l} x={x(i)} y={H - 8} fontSize={11} textAnchor="middle" fill={axis}>{l}</text>)}
        {props.series.map((s) => (
          <g key={s.name}>
            <polyline fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
            {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill={t.kind === "light" ? "#fff" : t.bg.elevated} stroke={s.color} strokeWidth={2}><title>{`${s.name} · ${props.labels[i]}: ${money0(v)}`}</title></circle>)}
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", fontSize: 12, color: t.text.secondary }}>
        {props.series.map((s) => <span key={s.name} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 3, borderRadius: 2, background: s.color }} />{s.name}</span>)}
      </div>
    </div>
  );
}
function Donut(props: { slices: { name: string; value: number; color: string }[]; center: string; total: number }) {
  const { t } = useCard();
  const R = 84, r = 58, C = 100;
  const sum = props.slices.reduce((s, x) => s + x.value, 0) || 1;
  let a0 = -Math.PI / 2;
  const arcs = props.slices.map((s) => {
    const a1 = a0 + (2 * Math.PI * s.value) / sum;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (a: number, rad: number) => `${C + rad * Math.cos(a)},${C + rad * Math.sin(a)}`;
    const d = props.slices.length === 1 ? `M${C - R},${C}a${R},${R} 0 1,0 ${2 * R},0a${R},${R} 0 1,0 ${-2 * R},0M${C - r},${C}a${r},${r} 0 1,1 ${2 * r},0a${r},${r} 0 1,1 ${-2 * r},0`
      : `M${p(a0, R)}A${R},${R} 0 ${large} 1 ${p(a1, R)}L${p(a1, r)}A${r},${r} 0 ${large} 0 ${p(a0, r)}Z`;
    a0 = a1;
    return { d, s };
  });
  return (
    <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: 230, display: "block", margin: "0 auto" }} role="img" aria-label={`${props.center} donut chart`}>
      {arcs.map(({ d, s }) => <path key={s.name} d={d} fill={s.color} stroke={t.kind === "light" ? "#fff" : t.bg.elevated} strokeWidth={1.5} fillRule="evenodd"><title>{`${s.name}: ${money0(s.value)} (${pct(s.value / sum)})`}</title></path>)}
      <text x={C} y={C - 6} textAnchor="middle" fontSize={10.5} fontWeight={600} letterSpacing={0.6} fill={t.text.secondary}>{props.center.toUpperCase()}</text>
      <text x={C} y={C + 16} textAnchor="middle" fontSize={19} fontWeight={700} fill={t.text.primary}>{money0(props.total)}</text>
    </svg>
  );
}

// ─────────────────────────── tab
export function PerformanceTab(props: { items: Record<string, DutchieInventoryItem[]>; inv: InvMap; orders: Order[]; initialLoc: string; now: number }) {
  const { t, light, sub } = useCard();
  const [store, setStore] = useState(props.initialLoc);
  const [period, setPeriod] = useState<Period>("Last 30 days");
  const [donutDim, setDonutDim] = useState<"master" | "product" | "brand">("master");
  const [donutMetric, setDonutMetric] = useState<"Gross sales" | "Total net sales">("Gross sales");
  const [donutTop, setDonutTop] = useState<"Top 5" | "Top 10">("Top 10");
  const [drill, setDrill] = useState<{ dim: "master" | "brand"; key: string } | null>(null);
  const [dim, setDim] = useState<Dim>("master");
  const [rankPeriod, setRankPeriod] = useState<Period>("Last 30 days");
  const [sortBy, setSortBy] = useState<SortBy>("high");
  const [topN, setTopN] = useState<"Top 10" | "Top 25" | "All">("Top 10");
  const [q, setQ] = useState("");
  const locs = store === "all" ? LOCS.map((l) => l.id) : [store];
  const range = periodRange(period);
  const rRange = periodRange(rankPeriod);

  // KPI strip
  const cur = rangeTotals(locs, range.from, range.to);
  const prev = rangeTotals(locs, prevRange(range).from, prevRange(range).to);
  const net = (x: { gross: number; disc: number }) => x.gross - x.disc;
  const kpis = [
    { label: "Gross Sales", value: cur.gross, prev: prev.gross, hl: true },
    { label: "Discounted Amount", value: cur.disc, prev: prev.disc },
    { label: "Inventory Cost", value: cur.cost, prev: prev.cost },
    { label: "Inventory Profit", value: net(cur) - cur.cost, prev: net(prev) - prev.cost },
  ];

  // main bar chart: hourly (yesterday), daily (≤ 31 days) or weekly (YTD)
  const span = range.to - range.from + 1;
  const bars = useMemo(() => {
    if (span === 1) {
      const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
      const W = [0.35, 0.55, 0.75, 0.9, 0.85, 0.8, 0.95, 1.15, 1.35, 1.3, 1.05, 0.75, 0.4];
      const sw = W.reduce((a, b) => a + b, 0);
      const g = dayTotals(locs, range.from).gross;
      return HOURS.map((hr, i) => ({ label: `${hr > 12 ? hr - 12 : hr}${hr >= 12 ? "p" : "a"}`, value: (g * W[i]) / sw, tip: `${hr > 12 ? hr - 12 : hr}${hr >= 12 ? " PM" : " AM"}: ${money0((g * W[i]) / sw)}` }));
    }
    if (span <= 31) {
      return Array.from({ length: span }, (_, i) => {
        const d = range.from + i, v = dayTotals(locs, d).gross;
        return { label: span <= 7 ? wdFmt.format(dayMs(d)) : dFmt.format(dayMs(d)).replace(/^[A-Za-z]+ /, ""), value: v, tip: `${wdFmt.format(dayMs(d))} ${dFmt.format(dayMs(d))}: ${money0(v)}` };
      });
    }
    const out: { label: string; value: number; tip: string }[] = [];
    for (let s = range.from; s <= range.to; s += 7) {
      const v = rangeTotals(locs, s, Math.min(range.to, s + 6)).gross;
      out.push({ label: dFmt.format(dayMs(s)), value: v, tip: `Week of ${dFmt.format(dayMs(s))}: ${money0(v)}` });
    }
    return out;
  }, [store, period]); // eslint-disable-line react-hooks/exhaustive-deps

  // product rows for the donut (overview period) and the ranking (its own period)
  const prodOv = useMemo(() => buildProducts(locs, range.from, range.to, props.items, props.inv, props.orders, props.now), [store, period, props.items, props.inv, props.orders]); // eslint-disable-line react-hooks/exhaustive-deps
  const prodRank = useMemo(() => (rankPeriod === period ? prodOv : buildProducts(locs, rRange.from, rRange.to, props.items, props.inv, props.orders, props.now)), [store, rankPeriod, period, prodOv]); // eslint-disable-line react-hooks/exhaustive-deps

  // donut
  const donutRows = (() => {
    const base = drill ? prodOv.filter((r) => (drill.dim === "master" ? r.master === drill.key : r.brand === drill.key)) : prodOv;
    const g = group(base, drill ? "product" : donutDim).map((x) => ({ ...x, v: donutMetric === "Gross sales" ? x.gross : x.gross - x.disc })).sort((a, b) => b.v - a.v);
    const n = donutTop === "Top 5" ? 5 : 10;
    const top = g.slice(0, n);
    const rest = g.slice(n).reduce((s, x) => s + x.v, 0);
    const slices = top.map((x, i) => ({ key: x.key, name: x.name, value: x.v, color: PALETTE[i % PALETTE.length], drillable: !drill && donutDim !== "product" }));
    if (rest > 0.5) slices.push({ key: "__other", name: `Other (${g.length - n})`, value: rest, color: OTHER, drillable: false });
    return { slices, total: g.reduce((s, x) => s + x.v, 0) };
  })();

  // ranking table
  const ranked = (() => {
    const needle = q.trim().toLowerCase();
    const g = group(prodRank, dim).filter((x) => !needle || `${x.name} ${x.prod?.brand ?? ""} ${x.prod?.sku ?? ""}`.toLowerCase().includes(needle));
    const total = group(prodRank, dim === "tag" ? "master" : dim).reduce((s, x) => s + x.gross, 0) || 1;
    const margin = (x: GroupRow) => (x.gross - x.disc > 0 ? (x.gross - x.disc - x.cost) / (x.gross - x.disc) : 0);
    const cmp: Record<SortBy, (a: GroupRow, b: GroupRow) => number> = {
      high: (a, b) => b.gross - a.gross, low: (a, b) => a.gross - b.gross, margin: (a, b) => margin(b) - margin(a), discount: (a, b) => b.disc - a.disc,
    };
    const sorted = g.sort(cmp[sortBy]);
    return { rows: topN === "All" ? sorted : sorted.slice(0, topN === "Top 10" ? 10 : 25), count: sorted.length, total, margin };
  })();

  // monthly + by-location trends (Jan – Oct 2026)
  const monthly = MONTHS.map((m, i) => { const r = monthRange(i); return { m, v: rangeTotals(locs, r.from, r.to).gross }; });
  const byLoc = LOCS.map((l) => ({ name: l.name, color: LOC_COLORS[l.id], values: MONTHS.map((_, i) => { const r = monthRange(i); return rangeTotals([l.id], r.from, r.to).gross; }) }));

  const rangeLabel = (r: { from: number; to: number }) => (r.from === r.to ? dyFmt.format(dayMs(r.from)) : `${dFmt.format(dayMs(r.from))} – ${dyFmt.format(dayMs(r.to))}`);
  const storeLabel = store === "all" ? "All stores" : LOC_NAME[store];
  const rowBorder = light ? "#eef0f3" : t.border.subtle;
  const th: CSSProperties = { textAlign: "left", padding: "10px 10px", fontSize: 11, lineHeight: "14px", fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", color: t.text.secondary, borderBottom: `1px solid ${rowBorder}`, whiteSpace: "nowrap", background: light ? "#f8f9fb" : t.bg.elevated, position: "sticky", top: 0 };
  const td: CSSProperties = { padding: "9px 10px", fontSize: 12.5, lineHeight: "18px", color: t.text.primary, borderBottom: `1px solid ${rowBorder}`, whiteSpace: "nowrap" };
  const num: CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };
  const isProd = dim === "product";
  type ColDef = { k: string; label: string; left?: boolean; prodOnly?: boolean; title?: string; val: (x: GroupRow, rank: number) => SortValue; cell: (x: GroupRow, rank: number) => ReactNode };
  const COLS: ColDef[] = [
    { k: "rank", label: "#", left: true, title: "Rank by the metric picked above", val: (_, r) => r,
      cell: (_, r) => <td key="rank" style={{ ...td, fontWeight: 700, color: r < 3 && sortBy === "high" ? TEAL : t.text.secondary }}>#{r + 1}</td> },
    { k: "sku", label: "SKU", left: true, prodOnly: true, val: (x) => x.prod?.sku ?? null,
      cell: (x) => <td key="sku" style={{ ...td, color: light ? "#1f6fd1" : t.text.accent, fontWeight: 600 }}>{x.prod?.sku}</td> },
    { k: "name", label: isProd ? "Product" : DIM_LABEL[dim].replace(/ies$/, "y").replace(/s$/, ""), left: true, val: (x) => x.name.toLowerCase(),
      cell: (x) => <td key="name" style={{ ...td, fontWeight: 600, whiteSpace: "normal", minWidth: 200 }}>{x.name}{x.prod ? <div style={{ fontSize: 11, color: t.text.secondary, fontWeight: 400 }}>{x.prod.master} · {x.prod.category}</div> : <div style={{ fontSize: 11, color: t.text.secondary, fontWeight: 400 }}>{x.products} product{x.products === 1 ? "" : "s"}</div>}</td> },
    { k: "brand", label: "Brand", left: true, prodOnly: true, val: (x) => x.prod?.brand.toLowerCase() ?? null, cell: (x) => <td key="brand" style={td}>{x.prod?.brand}</td> },
    { k: "units", label: "Qty units", val: (x) => x.units, cell: (x) => <td key="units" style={num} title="SKUs (size options) on the menu">{int(x.units)}</td> },
    { k: "sold", label: "Qty sold", val: (x) => x.sold, cell: (x) => <td key="sold" style={num}>{int(x.sold)}</td> },
    { k: "remaining", label: "Qty remaining", val: (x) => x.remaining, cell: (x) => <td key="remaining" style={{ ...num, color: x.remaining <= 0 ? t.text.danger : t.text.primary }}>{int(x.remaining)}</td> },
    { k: "received", label: "Qty received", prodOnly: true, val: (x) => x.prod?.received ?? null,
      cell: (x) => { const p = x.prod!; return <td key="received" style={num} title={p.lastReceived ? `Last received ${dyFmt.format(p.lastReceived)}` : undefined}>{int(p.received)}{p.lastReceived ? <div style={{ fontSize: 11, color: t.text.secondary }}>last {dFmt.format(p.lastReceived)}</div> : null}</td>; } },
    { k: "gross", label: "Gross sales", val: (x) => x.gross, cell: (x) => <td key="gross" style={{ ...num, fontWeight: 600 }}>{money(x.gross)}</td> },
    { k: "share", label: "% of sales", val: (x) => x.gross, cell: (x) => <td key="share" style={num}>{pct(x.gross / ranked.total)}</td> },
    { k: "cost", label: "Inventory cost", val: (x) => x.cost, cell: (x) => <td key="cost" style={num}>{money(x.cost)}</td> },
    { k: "margin", label: "Profit margin", val: (x) => ranked.margin(x), cell: (x) => { const m = ranked.margin(x); return <td key="margin" style={{ ...num, color: m < 0.3 ? t.text.warning : t.text.primary }}>{pct(m)}</td>; } },
    { k: "disc", label: "Discounted amount", val: (x) => x.disc, cell: (x) => <td key="disc" style={num}>{money(x.disc)}</td> },
    { k: "discPct", label: "Average discount %", val: (x) => (x.gross ? x.disc / x.gross : 0), cell: (x) => <td key="discPct" style={num}>{pct(x.gross ? x.disc / x.gross : 0)}</td> },
    { k: "velocity", label: "Sales velocity (units/wk)", prodOnly: true, val: (x) => x.prod?.velocity ?? null, cell: (x) => <td key="velocity" style={num}>{x.prod!.velocity.toFixed(1)}</td> },
    { k: "lastSold", label: "Last sold", prodOnly: true, val: (x) => x.prod?.lastSold ?? null,
      cell: (x) => <td key="lastSold" style={{ ...num, color: x.prod!.lastSold ? t.text.primary : t.text.tertiary }}>{x.prod!.lastSold ? dyFmt.format(x.prod!.lastSold) : "Never"}</td> },
  ];
  const colDefs = COLS.filter((c) => isProd || !c.prodOnly);
  const colByKey = Object.fromEntries(colDefs.map((c) => [c.k, c])) as Record<string, ColDef>;
  const rankCtl = useTableControls(isProd ? "retail-perf-ranking-products" : "retail-perf-ranking-groups", colDefs.map((c) => c.k),
    { defaultDir: (k) => (["rank", "sku", "name", "brand"].includes(k) ? 1 : -1), accent: TEAL });
  const rankedRows = (() => {
    const withRank = ranked.rows.map((x, i) => ({ x, rank: i }));
    const s = rankCtl.sort;
    const def = s ? colByKey[s.col] : undefined;
    if (s && def) withRank.sort((a, b) => compareSort(def.val(a.x, a.rank), def.val(b.x, b.rank), s.dir) || a.rank - b.rank);
    return withRank;
  })();

  return (
    <div data-testid="performance-page" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", gap: 2 }}>
          <h2 style={{ margin: 0, fontSize: 22, lineHeight: "30px", fontWeight: 700, color: t.text.primary }}>Performance</h2>
          <span style={sub}>Sales, discounts, cost and profit from Dutchie POS sales · {storeLabel} · through {dyFmt.format(dayMs(LAST))} · sample data</span>
        </div>
        <Dropdown label={store === "all" ? "Store: All" : `Store: ${LOC_NAME[store]}`} active={store !== "all"} testId="perf-store" align="right">
          {(close) => [{ id: "all", name: "All stores" }, ...LOCS].map((l) => <MenuItem key={l.id} label={l.name} checked={store === l.id} onClick={() => { setStore(l.id); setDrill(null); close(); }} />)}
        </Dropdown>
      </div>

      {/* (a) Performance overview */}
      <Card title="Performance overview" subtitle={`${rangeLabel(range)} · vs previous ${span === 1 ? "day" : `${span} days`}`} testId="perf-overview"
        actions={<Pick value={period} options={PERIODS} onChange={(v) => { setPeriod(v); }} testId="perf-period" />}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
          {kpis.map((k) => {
            const d = k.prev ? (k.value - k.prev) / Math.abs(k.prev) : 0;
            const up = d >= 0;
            const good = k.label === "Discounted Amount" || k.label === "Inventory Cost" ? !up : up;
            return (
              <div key={k.label} data-testid="perf-kpi" style={{ borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6,
                background: k.hl ? NAVY : light ? "#f6f8fa" : t.fill.secondary, border: k.hl ? `1px solid ${NAVY}` : `1px solid ${light ? "#eceff3" : t.border.subtle}` }}>
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, color: k.hl ? "rgba(255,255,255,0.78)" : t.text.secondary }}>{k.label}</span>
                <span style={{ fontSize: 24, lineHeight: "30px", fontWeight: 700, color: k.hl ? "#fff" : t.text.primary, fontVariantNumeric: "tabular-nums" }}>{money(k.value)}</span>
                <span style={{ fontSize: 12, color: k.hl ? (up ? "#7ee2c4" : "#ffb4a8") : good ? t.text.success : t.text.danger }}>{up ? "▲" : "▼"} {pct(Math.abs(d))} vs previous period</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: t.text.primary }}>{span === 1 ? "Hourly sales" : span <= 31 ? "Daily sales" : "Weekly sales"}</span>
          <span style={sub}>Gross sales · {storeLabel}</span>
        </div>
        <BarChart bars={bars} color={TEAL} testId="perf-daily-bars" />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        {/* (b) Top sales breakdown */}
        <Card title={drill ? `Top sales breakdown · ${drill.key}` : "Top sales breakdown"} subtitle={`${rangeLabel(range)} · ${storeLabel}`} testId="perf-donut"
          actions={<>
            {drill ? null : <Pick value={donutDim} options={["master", "product", "brand"] as const} onChange={(v) => setDonutDim(v)} label={(v) => ({ master: "Master categories", product: "Products", brand: "Brands" })[v]} testId="donut-dim" />}
            <Pick value={donutMetric} options={["Gross sales", "Total net sales"] as const} onChange={setDonutMetric} />
            <Pick value={donutTop} options={["Top 5", "Top 10"] as const} onChange={setDonutTop} />
          </>}>
          {drill ? <button type="button" onClick={() => setDrill(null)} style={{ all: "unset", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: light ? "#1f6fd1" : t.text.accent }}>← Back to all {drill.dim === "master" ? "master categories" : "brands"}</button> : null}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, 230px) 1fr", gap: 18, alignItems: "center" }}>
            <Donut slices={donutRows.slices} center={donutMetric === "Gross sales" ? "Gross sales" : "Total net sales"} total={donutRows.total} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              {donutRows.slices.map((s) => (
                <button key={s.key} type="button" disabled={!s.drillable} data-testid="donut-row"
                  onClick={() => { if (s.drillable) setDrill({ dim: donutDim === "brand" ? "brand" : "master", key: s.key }); }}
                  style={{ all: "unset", cursor: s.drillable ? "pointer" : "default", display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", borderBottom: `1px solid ${rowBorder}` }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: s.color, flex: "none" }} />
                  <span style={{ flex: 1, fontSize: 12.5, color: t.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.name}>{s.name}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: t.text.primary, fontVariantNumeric: "tabular-nums" }}>{money0(s.value)}</span>
                  <span aria-hidden style={{ width: 12, color: s.drillable ? t.text.secondary : "transparent", fontSize: 14 }}>›</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* (d) monthly sales */}
        <Card title="Monthly sales" subtitle={`Gross sales · Jan – Oct 2026 · ${storeLabel} · October is month to date`} testId="perf-monthly">
          <BarChart bars={monthly.map((x) => ({ label: x.m, value: x.v, tip: `${x.m} 2026: ${money0(x.v)}` }))} color={BLUE} height={260} testId="perf-monthly-bars" />
        </Card>
      </div>

      {/* (d) sales by location */}
      <Card title="Sales by location" subtitle="Gross sales per month · Jan – Oct 2026 (October month to date)" testId="perf-by-location">
        <LineChartSvg labels={[...MONTHS]} series={byLoc} testId="perf-location-lines" />
      </Card>

      {/* (c) Performance ranking */}
      <Card title="Performance ranking" subtitle={`${rangeLabel(rRange)} · ${storeLabel} · ${ranked.count} ${DIM_LABEL[dim].toLowerCase()}${dim === "tag" ? " (tags overlap, so % of sales can add up to more than 100%)" : ""}`} testId="perf-ranking"
        actions={<>
          <Pick value={rankPeriod} options={PERIODS} onChange={setRankPeriod} testId="rank-period" />
          <Pick value={sortBy} options={["high", "low", "margin", "discount"] as const} onChange={(v) => { setSortBy(v); rankCtl.clearSort(); }} label={(v) => SORT_LABEL[v]} testId="rank-sort" />
          <Pick value={topN} options={["Top 10", "Top 25", "All"] as const} onChange={setTopN} testId="rank-top" />
        </>}>
        <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${rowBorder}`, flexWrap: "wrap" }} role="tablist">
          {(Object.keys(DIM_LABEL) as Dim[]).map((d) => (
            <button key={d} type="button" role="tab" aria-selected={dim === d} data-testid={`rank-tab-${d}`} onClick={() => setDim(d)}
              style={{ all: "unset", cursor: "pointer", padding: "8px 12px", fontSize: 13, fontWeight: dim === d ? 700 : 500, color: dim === d ? t.text.primary : t.text.secondary,
                borderBottom: `2px solid ${dim === d ? TEAL : "transparent"}`, marginBottom: -1 }}>{DIM_LABEL[d]}</button>
          ))}
          <span style={{ flex: 1 }} />
          <span style={{ ...sub, alignSelf: "center" }}>Click a header to sort · drag to rearrange</span>
          {rankCtl.sort ? <button type="button" onClick={rankCtl.clearSort} style={{ all: "unset", cursor: "pointer", alignSelf: "center", fontSize: 12, fontWeight: 600, color: light ? "#1f6fd1" : t.text.accent }}>Rank order</button> : null}
          {rankCtl.customized ? <button type="button" data-testid="rank-reset-cols" onClick={rankCtl.reset} style={{ all: "unset", cursor: "pointer", alignSelf: "center", fontSize: 12, fontWeight: 600, color: light ? "#1f6fd1" : t.text.accent }}>Reset columns</button> : null}
          <input aria-label="Search ranking" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${DIM_LABEL[dim].toLowerCase()}…`}
            style={{ height: 30, margin: "2px 0 6px", boxSizing: "border-box", padding: "0 10px", borderRadius: 6, border: `1px solid ${light ? "#e3e6ea" : t.border.default}`, background: light ? "#f6f7f9" : t.fill.secondary, color: t.text.primary, fontSize: 12.5, outline: "none", minWidth: 180 }} />
        </div>
        <div style={{ overflow: "auto", maxHeight: "65vh" }}>
          <table data-testid="ranking-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: isProd ? 1500 : 1000 }}>
            <thead><tr>{rankCtl.order.map((k) => {
              const c = colByKey[k];
              if (!c) return null;
              const hp = rankCtl.headerProps(k, { label: c.label });
              return <th key={k} {...hp} title={`${c.title ? c.title + " · " : ""}${hp.title}`} style={{ ...th, textAlign: c.left ? "left" : "right", color: rankCtl.sort?.col === k ? t.text.primary : th.color, ...hp.style }}>{c.label}{rankCtl.indicator(k, TEAL)}</th>;
            })}</tr></thead>
            <tbody>
              {rankedRows.length === 0 ? <tr><td colSpan={colDefs.length} style={{ ...td, textAlign: "center", color: t.text.secondary, padding: 24 }}>Nothing matches.</td></tr> : rankedRows.map(({ x, rank }) => (
                <tr key={x.key} data-testid="ranking-row">{rankCtl.order.map((k) => colByKey[k]?.cell(x, rank))}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <span style={sub}>
          Qty units = size options on the menu · Qty remaining = on hand now (Dutchie) · Profit margin = (gross − discounts − inventory cost) ÷ net sales
          {isProd ? " · Qty received = units checked in during the period · Sales velocity = last 4-week average units/week (same as All inventory)" : ""}. Sample data.
        </span>
      </Card>
      <span style={{ ...sub, textAlign: "right" }}>Categories follow the menu's master categories ({MENU_CATEGORIES.join(", ")}). Report day ends {dFmt.format(dayMs(TODAY))} 12:00 AM PT.</span>
    </div>
  );
}
