// Dutchie-style retail menu built from the demo's sample catalog (vendor SKUs + competitor parody brands).
// Category order, strain types and weight options follow how a typical Dutchie dispensary menu is organized.
import { ITEMS, PRODUCT, LOCS, SALES, last4, parOf, h, type InvMap, type ParLevel } from "../data";

export const MENU_CATEGORIES = ["Flower", "Pre-Rolls", "Vaporizers", "Concentrates", "Edibles", "Tinctures", "Topicals", "Accessories"] as const;
export type MenuCategory = (typeof MENU_CATEGORIES)[number];
const CAT_MAP: Record<string, MenuCategory> = {
  Flower: "Flower", "Pre-Rolls": "Pre-Rolls", Vaporizers: "Vaporizers", Concentrate: "Concentrates",
  Edible: "Edibles", Tincture: "Tinctures", Topicals: "Topicals", Accessories: "Accessories",
};
export const STRAIN_FILTERS = ["Indica", "Sativa", "Hybrid", "CBD"] as const;
export type StrainFilter = (typeof STRAIN_FILTERS)[number];

export interface MenuOption {
  /** Dutchie inventory id in the mock (vendor SKUs reuse their SKU). */
  id: string;
  label: string;
  price: number;
  grams?: number;
  /** Share of the product's unit sales that this option takes. */
  share: number;
}
export interface MenuProduct {
  key: string; vendorId: string | null; name: string; brand: string; category: MenuCategory; sub: string;
  strain: string; strainGroups: StrainFilter[]; thc: string; thcValue: number; thcUnit: "%" | "mg" | "";
  bulk: boolean; options: MenuOption[]; unitCost: number;
}

const FLOWER_SIZES: { label: string; grams: number; mult: number; share: number; gate: number }[] = [
  { label: "1g", grams: 1, mult: 0.36, share: 0.25, gate: 0.45 },
  { label: "1/8oz", grams: 3.5, mult: 1, share: 1, gate: 0 },
  { label: "1/4oz", grams: 7, mult: 1.85, share: 0.45, gate: 0.3 },
  { label: "1/2oz", grams: 14, mult: 3.4, share: 0.2, gate: 0.6 },
  { label: "1oz", grams: 28, mult: 6.2, share: 0.12, gate: 0.5 },
];

const title = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ") : s);
function subOf(name: string, cat: MenuCategory, given: string, bulk: boolean, price: number): string {
  const n = name.toLowerCase();
  if (cat === "Flower") return bulk ? "Bulk flower" : price >= 40 ? "Premium flower" : "Pre-packaged flower";
  if (given) return title(given);
  switch (cat) {
    case "Pre-Rolls": return n.includes("infused") ? (n.includes("pk") ? "Infused pre-roll packs" : "Infused pre-rolls") : n.includes("blunt") ? "Blunts" : n.includes("pk") ? "Pre-roll packs" : "Singles";
    case "Vaporizers": return n.includes("disposable") || n.includes("pod") ? "Disposables" : "Cartridges";
    case "Concentrates":
      if (n.includes("rosin")) return "Rosin";
      if (n.includes("diamond")) return "Diamonds & sauce";
      if (n.includes("shatter")) return "Shatter";
      if (n.includes("feco") || n.includes("rso")) return "RSO / FECO";
      if (n.includes("thca")) return "THCa";
      if (n.includes("budder") || n.includes("badder") || n.includes("sugar")) return "Badder & sugar";
      return "Cured resin";
    case "Edibles": return n.includes("soda") || n.includes("syrup") ? "Drinks & syrups" : n.includes("chocolate") ? "Chocolates" : n.includes("gumm") || n.includes("pearls") ? "Gummies" : "Chews";
    case "Tinctures": return n.includes("cbd") || n.includes("cbg") || n.includes(":") ? "Ratio tinctures" : "THC tinctures";
    case "Topicals": return n.includes("patch") ? "Patches" : n.includes("balm") ? "Balms" : n.includes("roller") ? "Rollers" : "Bath & body";
    default: return n.includes("chamber") ? "Hardware" : n.includes("deck") || n.includes("shirt") ? "Merch" : "Batteries";
  }
}
function strainGroupsOf(strain: string, name: string): StrainFilter[] {
  const n = name.toLowerCase();
  const g: StrainFilter[] = [];
  if (/cbd|cbg|cbn|1:1|2:1|4:1|1:2/.test(n) || strain === "CBD") g.push("CBD");
  if (strain.includes("Indica")) g.push("Indica");
  if (strain.includes("Sativa")) g.push("Sativa");
  if (strain.includes("Hybrid")) g.push("Hybrid");
  return g;
}

function build(): MenuProduct[] {
  const out: MenuProduct[] = [];
  for (const it of ITEMS) {
    const cat = CAT_MAP[it.category] ?? "Accessories";
    const vp = it.vendorId ? PRODUCT[it.key] : undefined;
    const r = (s: string) => h(it.key + s);
    // strain + potency: vendor SKUs carry them from the menu; competitor SKUs get plausible sample values.
    let strain = vp ? vp.strain : "N/A";
    let thc = vp ? vp.thc : "";
    if (!vp) {
      const n = it.name.toLowerCase();
      const m = n.match(/\((indica|sativa|hybrid)\)|- (indica|sativa|hybrid)\b/);
      if (cat === "Accessories") strain = "N/A";
      else if (m) strain = title(m[1] ?? m[2]);
      else if (/cbd|cbg|1:1|4:1|1:2/.test(n)) strain = "CBD";
      else strain = ["Indica", "Sativa", "Hybrid", "Indica-Hybrid", "Sativa-Hybrid"][Math.floor(r("s") * 5)];
      const pct = (lo: number, hi: number) => `${(lo + r("p") * (hi - lo)).toFixed(1)}%`;
      thc = cat === "Flower" ? pct(17, 31) : cat === "Pre-Rolls" ? pct(n.includes("infused") ? 30 : 18, n.includes("infused") ? 42 : 28)
        : cat === "Vaporizers" ? pct(76, 92) : cat === "Concentrates" ? pct(64, 86)
          : cat === "Edibles" ? (n.match(/(\d+)mg/)?.[0] ?? (it.price <= 8 ? "50mg" : "100mg"))
            : cat === "Tinctures" ? (n.includes("cbg:cbd") ? "50mg" : n.includes("4oz") ? "500mg" : "1000mg")
              : cat === "Topicals" ? (n.match(/(\d+)mg/)?.[0] ?? "") : "";
    }
    const thcNum = parseFloat(thc) || 0;
    const thcUnit: MenuProduct["thcUnit"] = thc.endsWith("%") ? "%" : thc.endsWith("mg") ? "mg" : "";
    const bulk = cat === "Flower" && !vp && it.price <= 10;
    let options: MenuOption[];
    if (cat === "Flower" && !vp) {
      options = FLOWER_SIZES.filter((s) => bulk || s.gate === 0 || r(s.label) > s.gate)
        .map((s) => ({ id: `${it.key}@${s.label}`, label: s.label, grams: s.grams, price: Math.max(4, Math.round(it.price * s.mult)), share: s.share }));
    } else if (!vp && cat === "Vaporizers" && it.size === "1g" && r("half") > 0.55) {
      options = [{ id: `${it.key}@0.5g`, label: "0.5g", price: Math.round(it.price * 0.62), share: 0.4 }, { id: it.key, label: "1g", price: it.price, share: 1 }];
    } else if (!vp && cat === "Concentrates" && it.size === "2g" && r("one") > 0.5) {
      options = [{ id: `${it.key}@1g`, label: "1g", price: Math.round(it.price * 0.56), share: 0.5 }, { id: it.key, label: "2g", price: it.price, share: 1 }];
    } else {
      options = [{ id: it.key, label: it.size === "each" ? "Each" : it.size, price: it.price, share: 1, grams: cat === "Flower" ? 3.5 : undefined }];
    }
    out.push({
      key: it.key, vendorId: it.vendorId, name: it.name, brand: it.brand, category: cat,
      sub: subOf(it.name, cat, vp?.sub ?? "", bulk, it.price), strain, strainGroups: strainGroupsOf(strain, it.name),
      thc, thcValue: thcNum, thcUnit, bulk, options,
      unitCost: vp ? vp.cost : Math.round(it.price * (0.45 + 0.1 * r("c")) * 100) / 100,
    });
  }
  return out;
}
export const MENU: MenuProduct[] = build();
export const MENU_BY_KEY: Record<string, MenuProduct> = Object.fromEntries(MENU.map((m) => [m.key, m]));
export const OPTION_OWNER: Record<string, { product: MenuProduct; option: MenuOption }> = Object.fromEntries(
  MENU.flatMap((p) => p.options.map((o) => [o.id, { product: p, option: o }])),
);
export const menuBrands = (): string[] => Array.from(new Set(MENU.map((m) => m.brand))).sort((a, b) => a.localeCompare(b));

/** Weekly unit sales (last 4-week average) for a product at a location. */
export const weeklyUnits = (key: string, loc: string): number => last4(SALES[key][loc]);

/** Last sale of a menu option at a store: roughly one sales interval back (7 / weekly units), never after `now`. Null = never sold. */
export function lastSoldAt(optionId: string, loc: string, velocity: number, now: number): number | null {
  const gapDays = velocity > 0 ? Math.min(21, (7 / velocity) * (0.2 + 1.6 * h(optionId + loc + "ls"))) : 30 + 30 * h(optionId + "old");
  return velocity <= 0.05 && h(optionId + loc + "never") < 0.3 ? null : now - gapDays * 86400000 - h(optionId + loc + "hr") * 6 * 3600000;
}

/** Par for a menu option: vendor SKUs use the vendor par plan; other options get a sample par from velocity. */
export function optionPar(loc: string, optionId: string): ParLevel {
  const own = OPTION_OWNER[optionId];
  if (own.product.vendorId && PRODUCT[optionId]) return parOf(loc, optionId);
  const weekly = weeklyUnits(own.product.key, loc) * own.option.share;
  const max = Math.max(4, Math.ceil(weekly * 2.2));
  return { min: Math.max(2, Math.round(weekly * 0.8)), max, maxStrains: 1 };
}
/** Bulk flower par, in grams. */
export function bulkPar(loc: string, key: string): { min: number; max: number } {
  const g = weeklyUnits(key, loc) * 3.5 * 1.6;
  return { min: Math.round(g * 0.8), max: Math.round(g * 2.5) };
}

/** Starting stock for the mock Dutchie store: units per option id, grams per bulk product. */
export function seedMenuStock(inv: InvMap): { units: Record<string, Record<string, number>>; grams: Record<string, Record<string, number>> } {
  const units: Record<string, Record<string, number>> = {};
  const grams: Record<string, Record<string, number>> = {};
  for (const l of LOCS) {
    units[l.id] = {};
    grams[l.id] = {};
    for (const p of MENU) {
      if (p.bulk) {
        const par = bulkPar(l.id, p.key);
        const f = h(p.key + l.id + "g");
        grams[l.id][p.key] = f < 0.06 ? 0 : Math.round(par.max * (0.2 + f * 1.1) * 2) / 2;
        continue;
      }
      for (const o of p.options) {
        if (p.vendorId && PRODUCT[o.id]) { units[l.id][o.id] = inv[`${l.id}|${o.id}`].qoh; continue; }
        const par = optionPar(l.id, o.id);
        const f = h(o.id + l.id + "q");
        units[l.id][o.id] = f < 0.05 ? 0 : Math.round(par.max * (0.2 + f * 1.0));
      }
    }
  }
  return { units, grams };
}
