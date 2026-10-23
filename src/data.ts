// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE DATA. Product names, categories, sizes, THC and shelf prices are adapted
// from a public dispensary menu with every brand renamed to a parody name.
// Quantities, pars, sales, costs, orders and invoices are invented for the demo.
// ─────────────────────────────────────────────────────────────────────────────
// Catalog: product names, categories, sizes, THC and shelf (out-the-door) prices adapted from a real dispensary menu (2026-10-22);
// every brand is renamed to a parody name. The Ironic line is invented using real menu sizes and price ranges.
// Tuple: sku, vendorId, name, brand, category, subcategory, strain, size, shelfPrice, thc
export const MENU_SKUS: readonly (readonly [string, string, string, string, string, string, string, string, number, string])[] = [
  ["PGR-101", "poor", "Mid-Town Haze", "PoorGrown", "Flower", "bulk-flower", "Sativa", "1/8oz", 17, "27.78%"],
  ["RBD-101", "rbd", "Azul Bluntz", "Red Beard", "Flower", "", "Indica-Hybrid", "1/8oz", 17, "22.42%"],
  ["RBD-102", "rbd", "Candy Fumez", "Red Beard", "Flower", "", "Indica-Hybrid", "1/8oz", 17, "25.19%"],
  ["RBD-103", "rbd", "Sade", "Red Beard", "Flower", "", "Indica", "1/8oz", 17, "24.91%"],
  ["HMZ-101", "hmz", "Peach Cobbler Infused + Flavored Blunt - 2.68g", "Hellamidz", "Pre-Rolls", "blunts", "Hybrid", "2.68g", 14, "33.9%"],
  ["HMZ-102", "hmz", "Variety Infused + Flavored Pre-Roll 5pk - 2.67g", "Hellamidz", "Pre-Rolls", "infused-pre-roll-packs", "N/A", "2.67g", 15, ""],
  ["HMZ-103", "hmz", "Maui Sunrise Cloud Bar Rechargeable Disposable 2g", "Hellamidz", "Vaporizers", "disposables", "Sativa", "2g", 34, "86.8%"],
  ["HMZ-104", "hmz", "Cherry Pie Cloud Bar Rechargeable Disposable 1g", "Hellamidz", "Vaporizers", "disposables", "Indica-Hybrid", "1g", 20, "84.8%"],
  ["HMZ-105", "hmz", "OG Hybrid Terpz Cartridge 1g", "Hellamidz", "Vaporizers", "cartridges", "Hybrid", "1g", 15, "85.6%"],
  ["HMZ-106", "hmz", "Haze Sativa Terpz Cartridge 1g", "Hellamidz", "Vaporizers", "cartridges", "Sativa", "1g", 15, "83.7%"],
  ["HMZ-107", "hmz", "Bomb Popz Cloud Bar Rechargeable Disposable 2g", "Hellamidz", "Vaporizers", "cartridges", "Sativa", "2g", 34, "81.3%"],
  ["HMZ-108", "hmz", "Bomb Pop Profilez Cartridge 1g", "Hellamidz", "Vaporizers", "cartridges", "Sativa", "1g", 18, "89.4%"],
  ["HMZ-109", "hmz", "Kush Indica Terpz Cartridge 1g", "Hellamidz", "Vaporizers", "cartridges", "Indica", "1g", 15, "79.8%"],
  ["HMZ-110", "hmz", "Mango Dragon Cloud Bar Disposable 1g", "Hellamidz", "Vaporizers", "cartridges", "Hybrid", "1g", 20, "83%"],
  ["PGR-102", "poor", "Stay Grounded - Lime Sorbet Botanical Flavored Cart - 2g", "PoorGrown", "Vaporizers", "cartridges", "N/A", "2g", 25, "89.6%"],
  ["HMZ-111", "hmz", "Water'Yer Melon Cloud Bar Disposable 2g", "Hellamidz", "Vaporizers", "disposables", "Indica", "2g", 34, "82.9%"],
  ["HMZ-112", "hmz", "Maui Sunrise Profilez Cartridge 1g", "Hellamidz", "Vaporizers", "cartridges", "Sativa", "1g", 18, "89.8%"],
  ["HMZ-113", "hmz", "OG Mint Cloud Bar Disposable 1g", "Hellamidz", "Vaporizers", "disposables", "Hybrid", "1g", 20, "87.7%"],
  ["HMZ-114", "hmz", "Water'Yer Melon Cloud Bar Disposable 1g", "Hellamidz", "Vaporizers", "disposables", "Indica", "1g", 20, "89.8%"],
  ["MYL-101", "myld", "Raspberry Sativa Gummies 100mg - 1.4oz", "Myld", "Edible", "gummies", "Sativa", "39.68g", 17, "100mg"],
  ["MYL-102", "myld", "Sour Cherry Gummies Indica Enhanced 100mg - 1.4oz", "Myld", "Edible", "gummies", "Indica", "39.68g", 17, "100mg"],
  ["MYL-103", "myld", "Elderberry 2:1 THC:CBN Gummies 100mg - 1.4oz", "Myld", "Edible", "gummies", "N/A", "39.68g", 20, "100mg"],
  ["MYL-104", "myld", "Boysenberry 1:1:1 THC:CBD:CBN 100mg Gummies - 1.4oz", "Myld", "Edible", "gummies", "N/A", "39.68g", 20, "100mg"],
  ["MYL-105", "myld", "Prickly Pear Gummies Sativa Enhanced 100mg - 1.4oz", "Myld", "Edible", "gummies", "Sativa", "39.68g", 17, "100mg"],
  ["MYL-106", "myld", "POG 1:1 THC:CBG Single Gummy - 0.71oz", "Myld", "Edible", "gummies", "N/A", "20g", 8, "100mg"],
  ["MYL-107", "myld", "Huckleberry Gummies 100mg - 1.4oz", "Myld", "Edible", "gummies", "N/A", "39.68g", 17, "100mg"],
  ["MYL-108", "myld", "Raspberry Lime 1:1 THC:CBD Single Gummy - 0.71oz", "Myld", "Edible", "gummies", "N/A", "20g", 8, "100mg"],
  ["HMZ-115", "hmz", "Clementine Single Gummy", "Hellamidz", "Edible", "gummies", "Sativa", "10g", 5, "100mg"],
  ["MYL-109", "myld", "Sour Tangerine Gummies Hybrid Enhanced 100mg - 1.4oz", "Myld", "Edible", "gummies", "Hybrid", "39.68g", 17, "100mg"],
  ["MYL-110", "myld", "Sour Apple Gummies Sativa Enhanced 100mg - 1.4oz", "Myld", "Edible", "gummies", "Sativa-Hybrid", "39.68g", 17, "100mg"],
  ["PGR-103", "poor", "Papaya Nectar Rosin - 2g", "PoorGrown", "Concentrate", "rosin", "Hybrid", "2g", 60, "72.1%"],
  ["PGR-104", "poor", "Rubberband Mimosa Live Rosin 2g", "PoorGrown", "Concentrate", "rosin", "Hybrid", "2g", 60, "70.5%"],
  ["PGR-105", "poor", "Grape Barrier Reefer Live Rosin - 2g", "PoorGrown", "Concentrate", "rosin", "N/A", "2g", 60, "65.1mg"],
  ["RBD-104", "rbd", "Supreme Lee Hi Cured Resin Budder - 2g", "Red Beard", "Concentrate", "budder", "Indica-Hybrid", "2g", 22, "77.72%"],
  ["RBD-105", "rbd", "Candied Oranges Cured Resin Budder - 2g", "Red Beard", "Concentrate", "badder", "Hybrid", "2g", 22, "75.4%"],
  ["RBD-106", "rbd", "Honey Banana Cured Resin Budder - 2g", "Red Beard", "Concentrate", "badder", "Hybrid", "2g", 22, "77.76%"],
  ["RBD-107", "rbd", "Grape Gasoline Cured Resin Badder - 2g", "Red Beard", "Concentrate", "badder", "Indica", "2g", 22, "75.13%"],
  ["IRN-101", "iron", "Strawberry Banana Flavored Cart 1g", "Ironic", "Vaporizers", "cartridges", "Indica", "1g", 15, "84.1%"],
  ["IRN-102", "iron", "Strawberry Lime Flavored Cart 1g", "Ironic", "Vaporizers", "cartridges", "Hybrid", "1g", 15, "85.3%"],
  ["IRN-103", "iron", "Blue Dream Flavored Cart 1g", "Ironic", "Vaporizers", "cartridges", "Sativa", "1g", 15, "83.9%"],
  ["IRN-104", "iron", "Grape Ape Flavored Cart 1g", "Ironic", "Vaporizers", "cartridges", "Indica", "1g", 15, "82.6%"],
  ["IRN-105", "iron", "Twisted Maui Wowie Infused Glass Tip Blunt 2.3g", "Ironic", "Pre-Rolls", "blunts", "Sativa", "2.3g", 14, "34.2%"],
  ["IRN-106", "iron", "Mango Haze Infused Glass Tip Blunt 2.3g", "Ironic", "Pre-Rolls", "blunts", "Sativa-Hybrid", "2.3g", 14, "33.1%"],
  ["IRN-107", "iron", "Purple Punch Infused Glass Tip Blunt 2.3g", "Ironic", "Pre-Rolls", "blunts", "Indica", "2.3g", 14, "35.0%"],
];
// Competitor SKUs on the same menu (parody brands), used in Category Insights. Tuple: name, brand, category, size, shelfPrice
export const COMPETITOR_SKUS: readonly (readonly [string, string, string, string, number])[] = [
  ["Fresh Squeezed OG", "Hula Farms", "Flower", "1/8oz", 10],
  ["Triangle Kush Cookies", "Raisin Ranchers", "Flower", "1/8oz", 17],
  ["Mt. Hood Magic Durban", "Raisin Ranchers", "Flower", "1/8oz", 28],
  ["Moonbow 112", "Arcade", "Flower", "1/8oz", 49],
  ["Triple Burger", "Nelly & Co", "Flower", "1/8oz", 42],
  ["Blueberry Muffin", "Willy Wander Farms", "Flower", "1/8oz", 10],
  ["Tallyman", "Bonzai Farms", "Flower", "1/8oz", 28],
  ["Zsunami", "Fright Co", "Flower", "1/8oz", 17],
  ["Cherry Punch #14", "Bunsen Harbor", "Flower", "1/8oz", 10],
  ["Lemon Roll", "Arcade", "Flower", "1/8oz", 49],
  ["Peach Flambe", "Early Baker", "Flower", "1/8oz", 42],
  ["Alpine OG", "Bunsen Harbor", "Flower", "1/8oz", 10],
  ["Chem XL", "Early Baker", "Flower", "1/8oz", 42],
  ["SDOT", "NW Toiltech", "Flower", "1/8oz", 49],
  ["Fire Bellied Toad", "Heaven's Creek Farms", "Flower", "1/8oz", 49],
  ["Leftovers #11", "LUVLEE", "Flower", "1/8oz", 42],
  ["Pineapple", "Willy Wander Farms", "Flower", "1/8oz", 10],
  ["Red Mandarine", "Cellar Farms", "Flower", "1/8oz", 10],
  ["Limonada/Gas Smack Pre Roll 10PK - 5g", "Avocadas", "Pre-Rolls", "5g", 19],
  ["Candy Apple Kush Pre-Roll 10pk - 5g", "Herby's Farms", "Pre-Rolls", "5g", 20],
  ["Berry Bounty/Jammin Jack/Jungle Jelly/Golden Glaze/Funk Budder Pre-Roll 40pks - 28g", "Rebel Spliff", "Pre-Rolls", "1oz", 52],
  ["Mimosa #98 Live Rosin Snake Oil Infused Pre Roll - 1.5g", "Bunsen Harbor", "Pre-Rolls", "1.5g", 16],
  ["Piff Pastille/Gumbo Limbo Pre-Roll 10pk - 5g", "Avocadas", "Pre-Rolls", "5g", 20],
  ["Colorado Nightshifter/Garry's Pineapple/Jealous Toad/Lavender Lemonade Variety Pre-Roll 40pk - 20g", "Vybez", "Pre-Rolls", "20g", 65],
  ["Fruitopia Pre-Roll 10pk - 5g", "Herby's Farms", "Pre-Rolls", "5g", 20],
  ["Budder Browniez/Phantom Orbit Pre-Roll 12pk - 8.4g", "Rebel Spliff", "Pre-Rolls", "8.4g", 24],
  ["Jack Berry/Safari Jam/Garlic Budder Pre-Roll 12pk - 8.4g", "Rebel Spliff", "Pre-Rolls", "8.4g", 24],
  ["Maple Nectar Pre-Roll 10pk - 5g", "Bonafried Cannabis", "Pre-Rolls", "5g", 19],
  ["Mimosa Infused Pre-Roll 2pk - 1.5g", "Faltered Alchemy", "Pre-Rolls", "1.5g", 14],
  ["Sour Fifty Pre Roll 6PK - 3.6g", "Bunsen Harbor", "Pre-Rolls", "3.6g", 17],
  ["Cherry Glue Infused Pre-Roll 2pk - 1.5g", "Faltered Alchemy", "Pre-Rolls", "1.5g", 15],
  ["Whistlin' Pixie Pre-Roll 8pk - 4g", "Hocus North Gardens", "Pre-Rolls", "4g", 15],
  ["Jungle Cake/London Jelly Pre-Roll 10pk - 5g", "Funny Jays", "Pre-Rolls", "5g", 15],
  ["Natural Disaster Pre-Roll 10pk - 5g", "Herby's Farms", "Pre-Rolls", "5g", 20],
  ["91 Angel OG/ Motorboat Pre-Roll 10pk - 5g", "Iron Lunge", "Pre-Rolls", "5g", 15],
  ["Gaszilla Pre-Roll 8pk - 4g", "Hocus North Gardens", "Pre-Rolls", "4g", 15],
  ["Watermelon Flavored Liquid Diamonds Cart - 1g", "Bougie Bendz", "Vaporizers", "1g", 15],
  ["Tangie Flavored Disposable Pod - 2.5g", "Hire Cultures Extracts", "Vaporizers", "2.5g", 34],
  ["Wedding Cake Flavored Disposable Pod - 2.5g", "Hire Cultures Extracts", "Vaporizers", "2.5g", 34],
  ["Pink Rozay Distillate Cart - 1g", "Bitter", "Vaporizers", "1g", 16],
  ["Key Lime Z Cart - 1g", "Bitter", "Vaporizers", "1g", 16],
  ["Durban Poison Flavored Disposable Pod - 2.5g", "Hire Cultures Extracts", "Vaporizers", "2.5g", 34],
  ["Banana Flavored Liquid Diamond Cart - 1g", "Bougie Bendz", "Vaporizers", "1g", 15],
  ["THC Raspberry Lemonade Pearls - Sativa", "Grump", "Edible", "35.0g", 8],
  ["Blackberry 20-Piece [Soothing Relaxation] (1:2)", "Flops", "Edible", "44.0g", 16],
  ["4:1 Pomegranate Pearls - CBD/THC - Hybrid", "Grump", "Edible", "34.0194g", 16],
  ["THC Passion Orange Guava Mega - Hybrid", "Grump", "Edible", "20g", 5],
  ["THC Cherry Limeade Mega - Indica", "Grump", "Edible", "19.8447g", 5],
  ["Black Currant 2-Piece [Deep Relaxation] (1:1:1)", "Flops", "Edible", "12.0g", 8],
  ["Midnight Melon - (Indica) 100mg THC Single Rosin Gummy", "Happy Cribbage", "Edible", "12.0g", 8],
  ["Watermelon Pearls - THC - Indica", "Grump", "Edible", "34.0194g", 8],
  ["Milk Chocolate Mini Bar - THC - Hybrid", "Grump", "Edible", "1/4oz", 7],
  ["Black Currant 20-Piece [Deep Relaxation] (1:1:1)", "Flops", "Edible", "44.0g", 16],
  ["1:1 CBD Transdermal Patch -1.2g", "Sinergy Skin Werx", "Topicals", "1.2g", 29],
  ["THC Transdermal Patch - 0.5g", "Sinergy Skin Werx", "Topicals", ".5g", 20],
  ["Entourage Transdermal Full Spectrum Patch - 0.5g", "Sinergy Skin Werx", "Topicals", ".5g", 22],
  ["Dragon's Blend Balm - 2oz", "Meditation Farm", "Topicals", "56.7g", 48],
  ["Cascadia Blend 1:1 Balm 250mg - 2oz", "Meditation Farm", "Topicals", "56.7g", 48],
  ["White Lavender Soak & Fizz 1:1:1 THC:CBD:CBG - 4oz", "High Dessert Pure", "Topicals", "113.0g", 20],
  ["Vanilla Almond Biscotti Lip Balm - 0.16oz", "High Dessert Pure", "Topicals", "4.5359g", 6],
  ["Transdermal Roller Ball 1:1:1 - 0.6oz", "High Dessert Pure", "Topicals", "17.0g", 36],
  ["Baked Battery (Mint)", "Nearly", "Accessories", "each", 10],
  ["Stick 510 Battery", "Eko Electuary", "Accessories", "each", 20],
  ["Baked Battery (Gold)", "Nearly", "Accessories", "each", 10],
  ["510 Dual Cart Tandem Battery (Blue)", "Pulser", "Accessories", "each", 33],
  ["Purple Rain FECO - 1g", "Faltered Alchemy", "Concentrate", "1g", 19],
  ["Burger Drip THCa - 1g", "Light Label Extracts", "Concentrate", "1g", 15],
  ["Cherry Cruz Cured Resin Dab - 2g", "Sifted Northwest", "Concentrate", "2g", 19],
  ["Pineapple Mojito Shatter - 1g", "Afterthought", "Concentrate", "1g", 11],
  ["White Truffle Live Rosin - 1g", "Hocus North Gardens", "Concentrate", "1g", 58],
  ["Papaya Melonz Rosin - 2g", "SUNFLOUR", "Concentrate", "2g", 53],
  ["Pug's Breath Cured Resin Sugar Wax - 2g", "Legume", "Concentrate", "2g", 20],
  ["Tribute Cured Resin - 1g", "Alto Gardens", "Concentrate", "1g", 10],
  ["Headband Shatter - 1g", "Light Label Extracts", "Concentrate", "1g", 15],
  ["Zambino Liquid Diamonds - 2g", "Westwood Gardens", "Concentrate", "2g", 19],
  ["Grape Mountain Live Diamonds & Sauce -2g", "Bodies", "Concentrate", "2g", 26],
  ["Indica THC Tincture - 1oz", "Farmer's Fiend", "Tincture", "28.35g", 35],
  ["1:1 CBG:CBD Tincture - 1oz", "Farmer's Fiend", "Tincture", "28.35g", 27],
  ["Mango Passion Adabinol - 4oz", "Dirty Farm Arm", "Tincture", "109.4g", 48],
  ["Wedding Pie Live Resin Tincture - 1oz", "Bobslid Extracts", "Tincture", "30g", 36],
  ["Headband Live Resin Tincture - 1oz", "Bobslid Extracts", "Tincture", "30g", 36],
  ["Durban Poison Live Resin Tincture - 1oz", "Bobslid Extracts", "Tincture", "30g", 36],
];

export type StatusToneT = "success" | "warning" | "danger" | "accent" | "neutral";

export interface Vendor { id: string; name: string; leadDays: number; minOrder: number; terms: string; emails: string[] }
export const VENDORS: Vendor[] = [
  { id: "hmz", name: "Hellamidz", leadDays: 3, minOrder: 250, terms: "Net 14", emails: ["orders@hellamidz.example", "ar@hellamidz.example"] },
  { id: "myld", name: "Myld", leadDays: 5, minOrder: 350, terms: "Net 14", emails: ["wholesale@myld.example"] },
  { id: "poor", name: "PoorGrown", leadDays: 2, minOrder: 300, terms: "Net 7", emails: ["sales@poorgrown.example", "finance@poorgrown.example"] },
  { id: "rbd", name: "Red Beard", leadDays: 3, minOrder: 200, terms: "Net 14", emails: ["crew@redbeard.example"] },
  { id: "iron", name: "Ironic", leadDays: 4, minOrder: 300, terms: "Net 14", emails: ["orders@ironic.example", "reports@ironic.example"] },
];
export const VENDOR_BY_ID: Record<string, Vendor> = Object.fromEntries(VENDORS.map((v) => [v.id, v]));
export const RETAILER = "Demo Dispensary Co.";
export interface Loc { id: string; name: string }
export const LOCS: Loc[] = [
  { id: "south", name: "South Main" },
  { id: "east", name: "Eastgate" },
  { id: "river", name: "Riverside" },
];
export const LOC_NAME: Record<string, string> = Object.fromEntries(LOCS.map((l) => [l.id, l.name]));
export const LOC_FACTOR: Record<string, number> = { south: 1, east: 0.78, river: 0.6 };
export const WEEKS = ["Aug 30", "Sep 6", "Sep 13", "Sep 20", "Sep 27", "Oct 4", "Oct 11", "Oct 18"];
export const CAT_BASE: Record<string, number> = { Flower: 9, "Pre-Rolls": 8, Vaporizers: 9, Edible: 11, Concentrate: 4, Topicals: 2, Tincture: 2, Accessories: 3 };
export const CASE_PACK: Record<string, number> = { Flower: 6, "Pre-Rolls": 10, Vaporizers: 10, Edible: 12, Concentrate: 5 };
export const CARRIERS = ["Licensed courier (route van)", "Vendor fleet", "Third-party cannabis transport"];
export const SLA_HOURS = 24;

export const MIN = 60000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
export const BASE = Date.UTC(2026, 9, 22, 17, 0); // Oct 22, 2026, 10:00 AM PT (demo clock start)

export function h(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return ((x >>> 0) % 10000) / 10000;
}
export const money = (n: number): string => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
export const money0 = (n: number): string => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const dFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
export const dtFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
export const fd = (ms: number): string => dFmt.format(ms);
export const fdt = (ms: number): string => dtFmt.format(ms) + " PT";
export const toInt = (s: string): number => {
  const n = Math.floor(Number(s));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
export function ageLabel(ms: number): string {
  const hrs = ms / HOUR;
  if (hrs < 1) return `${Math.max(1, Math.round(ms / MIN))}m`;
  if (hrs < 48) return `${Math.round(hrs)}h`;
  return `${Math.round(hrs / 24)}d`;
}

export interface Product {
  sku: string; vendorId: string; name: string; brand: string; category: string; sub: string; strain: string;
  size: string; price: number; thc: string; cost: number; casePack: number; group: string;
}
export const PRODUCTS: Product[] = MENU_SKUS.map((r) => {
  const [sku, vendorId, name, brand, category, sub, strain, size, price, thc] = r;
  const cost = Math.round(price * (0.45 + 0.1 * h(sku + "c")) * 100) / 100;
  return {
    sku, vendorId, name, brand, category, sub, strain, size, price, thc, cost,
    casePack: CASE_PACK[category] ?? 6,
    group: `${category}${sub ? " · " + sub : ""} · ${size}`,
  };
});
export const PRODUCT: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.sku, p]));

export interface Item { key: string; name: string; brand: string; category: string; size: string; price: number; vendorId: string | null }
export const ITEMS: Item[] = [
  ...PRODUCTS.map((p): Item => ({ key: p.sku, name: p.name, brand: p.brand, category: p.category, size: p.size, price: p.price, vendorId: p.vendorId })),
  ...COMPETITOR_SKUS.map((r, i): Item => ({ key: `C-${i + 1}`, name: r[0], brand: r[1], category: r[2], size: r[3], price: r[4], vendorId: null })),
];
export const ITEM: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.key, i]));

// Weekly unit sales per item, per location, for the last 8 weeks (sample).
// Ironic is, by design, the best seller in every one of its categories at every
// location and week — by units and by revenue — at ordinary shelf prices.
export function buildSales(): Record<string, Record<string, number[]>> {
  const out: Record<string, Record<string, number[]>> = {};
  for (const it of ITEMS) {
    if (it.vendorId === "iron") continue;
    const base = (CAT_BASE[it.category] ?? 3) * (0.5 + 1.1 * h(it.key + "b"));
    const trend = (h(it.key + "t") - 0.5) * 0.9;
    const row: Record<string, number[]> = {};
    for (const l of LOCS) {
      row[l.id] = WEEKS.map((_, w) =>
        Math.max(0, Math.round(base * LOC_FACTOR[l.id] * (0.75 + 0.5 * h(it.key + l.id + w)) * (1 + (trend * (w - 3.5)) / 7))),
      );
    }
    out[it.key] = row;
  }
  const ironic = ITEMS.filter((i) => i.vendorId === "iron");
  const cats = Array.from(new Set(ironic.map((i) => i.category)));
  for (const c of cats) {
    const mine = ironic.filter((i) => i.category === c);
    const others = ITEMS.filter((i) => i.category === c && i.vendorId !== "iron");
    for (const it of mine) out[it.key] = {};
    for (const l of LOCS) {
      for (const it of mine) out[it.key][l.id] = [];
      for (let w = 0; w < WEEKS.length; w++) {
        let mu = 0;
        let mr = 0;
        for (const o of others) {
          const u = out[o.key][l.id][w];
          mu = Math.max(mu, u);
          mr = Math.max(mr, u * o.price);
        }
        mine.forEach((it, i) => {
          const floor = Math.max(mu, mr / it.price);
          out[it.key][l.id].push(Math.ceil(floor * 1.12) + (mine.length - i) * 2 + Math.round(h(it.key + l.id + w)));
        });
      }
    }
  }
  return out;
}
export const SALES = buildSales();
export const salesAt = (key: string, loc: string): number[] =>
  loc === "all" ? WEEKS.map((_, w) => LOCS.reduce((s, l) => s + SALES[key][l.id][w], 0)) : SALES[key][loc];
export const last4 = (arr: number[]): number => (arr[4] + arr[5] + arr[6] + arr[7]) / 4;
export const perDay = (sku: string, loc: string): number => last4(SALES[sku][loc]) / 7;

export interface ParLevel { min: number; max: number; maxStrains: number }
export const PARS: Record<string, ParLevel> = {};
for (const l of LOCS) {
  for (const v of VENDORS) {
    const groups = Array.from(new Set(PRODUCTS.filter((p) => p.vendorId === v.id).map((p) => p.group)));
    for (const g of groups) {
      const ps = PRODUCTS.filter((p) => p.vendorId === v.id && p.group === g);
      const avgWeekly = ps.reduce((s, p) => s + last4(SALES[p.sku][l.id]), 0) / ps.length;
      const max = Math.max(4, Math.ceil(avgWeekly * 2.2));
      PARS[`${l.id}|${v.id}|${g}`] = { min: Math.max(2, Math.round(max * 0.4)), max, maxStrains: ps.length + (h(g + l.id) > 0.6 ? 1 : 0) };
    }
  }
}
export const parOf = (loc: string, sku: string): ParLevel => {
  const p = PRODUCT[sku];
  return PARS[`${loc}|${p.vendorId}|${p.group}`];
};

export interface Stock { qoh: number; received: number }
export type InvMap = Record<string, Stock>;
export function seedInventory(): InvMap {
  const m: InvMap = {};
  for (const l of LOCS) {
    for (const p of PRODUCTS) {
      const par = parOf(l.id, p.sku);
      const f = h(p.sku + l.id + "q");
      const qoh = Math.round(par.max * (f < 0.42 ? f * 0.9 : 0.4 + f * 0.75));
      m[`${l.id}|${p.sku}`] = { qoh, received: BASE - Math.round((3 + h(p.sku + l.id + "r") * 20) * DAY) };
    }
  }
  return m;
}

export type OrderStatus = "Pending" | "Countered" | "Approved" | "Rejected" | "Shipped" | "Received";
export interface OrderLine { sku: string; requested: number; approved: number; received: number; damaged: number; unitCost: number; basis: string; packageLabel?: string }
export interface Note { by: string; text: string; at: number }
export interface Order {
  id: string; vendorId: string; locId: string; status: OrderStatus; lines: OrderLine[]; mode: string;
  submittedAt: number; counteredAt?: number; approvedAt?: number; rejectedAt?: number; shippedAt?: number; receivedAt?: number;
  carrier?: string; manifest?: string; etaAt?: number; notes: Note[]; invoiceId?: string; discrepancy?: string;
  /** External ids returned by the integration adapters (mock ids in demo mode). */
  leaflinkNumber?: string; metrcTransferId?: number; dutchieReceiveId?: string;
}
export interface Payment { at: number; amount: number; qboPaymentId?: string; qboBillPaymentId?: string }
export interface Invoice { id: string; vendorId: string; locId: string; orderId: string; date: number; amount: number; payments: Payment[]; qboInvoiceId?: string; qboBillId?: string }
export interface LogEntry { at: number; actor: string; vendorId: string | null; text: string }

export const STATUS_TONE: Record<OrderStatus, StatusToneT> = {
  Pending: "warning", Countered: "warning", Approved: "accent", Rejected: "danger", Shipped: "accent", Received: "success",
};
export const OPEN: OrderStatus[] = ["Pending", "Countered", "Approved", "Shipped"];

export function ln(sku: string, requested: number, approved?: number, received?: number, damaged?: number): OrderLine {
  const a = approved ?? requested;
  return { sku, requested, approved: a, received: received ?? 0, damaged: damaged ?? 0, unitCost: PRODUCT[sku].cost, basis: "Order to Max" };
}
export const lineSum = (lines: OrderLine[], f: (l: OrderLine) => number): number => lines.reduce((s, l) => s + f(l) * l.unitCost, 0);
export const orderValue = (o: Order): number =>
  o.status === "Received" ? lineSum(o.lines, (l) => Math.max(0, l.received - l.damaged))
    : o.status === "Pending" ? lineSum(o.lines, (l) => l.requested) : lineSum(o.lines, (l) => l.approved);

export function seedOrders(): Order[] {
  return [
    {
      id: "PO-1057", vendorId: "iron", locId: "south", status: "Pending", mode: "Velocity-based",
      lines: [ln("IRN-101", 30), ln("IRN-102", 20), ln("IRN-105", 20)], submittedAt: BASE - 5 * HOUR,
      notes: [{ by: "Ironic", text: "Strawberry Banana keeps selling out by Saturday; sized to cover lead time plus 3 days of safety stock.", at: BASE - 5 * HOUR }],
    },
    {
      id: "PO-1055", vendorId: "hmz", locId: "east", status: "Pending", mode: "Order to Max",
      lines: [ln("HMZ-103", 10), ln("HMZ-111", 10), ln("HMZ-113", 20)], submittedAt: BASE - 28 * HOUR, notes: [],
    },
    {
      id: "PO-1058", vendorId: "poor", locId: "river", status: "Countered", mode: "Order to Max",
      lines: [ln("PGR-103", 10, 5), ln("PGR-104", 10, 10)], submittedAt: BASE - 9 * HOUR, counteredAt: BASE - 2 * HOUR,
      notes: [{ by: RETAILER, text: "Rosin moves slower at Riverside. Proposing 5 Papaya Nectar instead of 10; the rest is fine.", at: BASE - 2 * HOUR }],
    },
    {
      id: "PO-1052", vendorId: "myld", locId: "east", status: "Approved", mode: "Velocity-based",
      lines: [ln("MYL-101", 24), ln("MYL-107", 36, 24), ln("MYL-103", 12)], submittedAt: BASE - 30 * HOUR, approvedAt: BASE - 6 * HOUR,
      notes: [{ by: RETAILER, text: "Approved. Trimmed Huckleberry from 36 to 24 while we clear a display.", at: BASE - 6 * HOUR }],
    },
    {
      id: "PO-1048", vendorId: "hmz", locId: "south", status: "Shipped", mode: "Order to Max",
      lines: [ln("HMZ-105", 20), ln("HMZ-109", 20), ln("HMZ-104", 10)], submittedAt: BASE - 3 * DAY, approvedAt: BASE - 62 * HOUR,
      shippedAt: BASE - 22 * HOUR, carrier: CARRIERS[0], manifest: "0004817201", etaAt: BASE + 4 * HOUR, notes: [],
    },
    {
      id: "PO-1041", vendorId: "rbd", locId: "south", status: "Received", mode: "Order to Max",
      lines: [ln("RBD-101", 12, 12, 12), ln("RBD-104", 10, 10, 10, 1), ln("RBD-106", 10, 10, 9)], submittedAt: BASE - 9 * DAY,
      approvedAt: BASE - 8.8 * DAY, shippedAt: BASE - 8 * DAY, receivedAt: BASE - 6 * DAY, carrier: CARRIERS[1], manifest: "0004810904",
      etaAt: BASE - 6 * DAY, invoiceId: "INV-29102", discrepancy: "Short 1 × Honey Banana Cured Resin Budder; 1 × Supreme Lee Hi Cured Resin Budder damaged",
      notes: [{ by: RETAILER, text: "Received. One budder jar arrived cracked; credited on the invoice.", at: BASE - 6 * DAY }],
    },
    {
      id: "PO-1036", vendorId: "rbd", locId: "east", status: "Rejected", mode: "Order to Max",
      lines: [ln("RBD-105", 15), ln("RBD-107", 15)], submittedAt: BASE - 13 * DAY, rejectedAt: BASE - 12 * DAY,
      notes: [{ by: RETAILER, text: "We're over Max on budder at Eastgate. Please resubmit after the next count.", at: BASE - 12 * DAY }],
    },
    {
      id: "PO-1029", vendorId: "iron", locId: "east", status: "Received", mode: "Velocity-based",
      lines: [ln("IRN-103", 40, 40, 40), ln("IRN-106", 30, 30, 30)], submittedAt: BASE - 17 * DAY, approvedAt: BASE - 16.8 * DAY,
      shippedAt: BASE - 16 * DAY, receivedAt: BASE - 15 * DAY, carrier: CARRIERS[2], manifest: "0004802900", etaAt: BASE - 15 * DAY,
      invoiceId: "INV-28660", notes: [],
    },
  ];
}
export function seedInvoices(orders: Order[]): Invoice[] {
  const amt = (id: string): number => {
    const o = orders.find((x) => x.id === id);
    return o ? Math.round(orderValue(o) * 100) / 100 : 0;
  };
  return [
    { id: "INV-28412", vendorId: "hmz", locId: "south", orderId: "PO-1012", date: BASE - 30 * DAY, amount: 1184.4, payments: [{ at: BASE - 17 * DAY, amount: 1184.4 }] },
    { id: "INV-28660", vendorId: "iron", locId: "east", orderId: "PO-1029", date: BASE - 15 * DAY, amount: amt("PO-1029"), payments: [{ at: BASE - 2 * DAY, amount: amt("PO-1029") }] },
    { id: "INV-28790", vendorId: "poor", locId: "south", orderId: "PO-1021", date: BASE - 18 * DAY, amount: 1350, payments: [{ at: BASE - 11 * DAY, amount: 675 }] },
    { id: "INV-28977", vendorId: "myld", locId: "east", orderId: "PO-1033", date: BASE - 10 * DAY, amount: 912.6, payments: [] },
    { id: "INV-29102", vendorId: "rbd", locId: "south", orderId: "PO-1041", date: BASE - 6 * DAY, amount: amt("PO-1041"), payments: [{ at: BASE - 1 * DAY, amount: 150 }] },
    { id: "INV-28155", vendorId: "rbd", locId: "east", orderId: "PO-1004", date: BASE - 40 * DAY, amount: 640.5, payments: [{ at: BASE - 27 * DAY, amount: 640.5 }] },
    { id: "INV-27904", vendorId: "hmz", locId: "river", orderId: "PO-0991", date: BASE - 47 * DAY, amount: 786, payments: [{ at: BASE - 30 * DAY, amount: 400 }] },
  ];
}
export const paidOf = (i: Invoice): number => i.payments.reduce((s, p) => s + p.amount, 0);
export const balOf = (i: Invoice): number => Math.max(0, Math.round((i.amount - paidOf(i)) * 100) / 100);

export function seedLog(): LogEntry[] {
  return [
    { at: BASE - 2 * HOUR, actor: RETAILER, vendorId: "poor", text: "Counter-proposal sent on PO-1058 (Papaya Nectar 10 → 5)" },
    { at: BASE - 5 * HOUR, actor: "Ironic", vendorId: "iron", text: "PO-1057 submitted for approval (South Main)" },
    { at: BASE - 6 * HOUR, actor: RETAILER, vendorId: "myld", text: "PO-1052 approved with changes (Eastgate)" },
    { at: BASE - 22 * HOUR, actor: "Hellamidz", vendorId: "hmz", text: "PO-1048 shipped via licensed courier, manifest 0004817201" },
    { at: BASE - 28 * HOUR, actor: "Hellamidz", vendorId: "hmz", text: "PO-1055 submitted for approval (Eastgate)" },
    { at: BASE - 1 * DAY, actor: RETAILER, vendorId: "rbd", text: "Payment of $150.00 recorded on INV-29102" },
    { at: BASE - 6 * DAY, actor: RETAILER, vendorId: "rbd", text: "PO-1041 received at South Main with discrepancies; INV-29102 generated" },
    { at: BASE - 12 * DAY, actor: RETAILER, vendorId: "rbd", text: "PO-1036 rejected (over Max on budder)" },
  ];
}

// ─────────────────────────── derived helpers ───────────────────────────
export function onOrderQty(orders: Order[], loc: string, sku: string): number {
  let n = 0;
  for (const o of orders) {
    if (o.locId !== loc || !OPEN.includes(o.status)) continue;
    for (const l of o.lines) if (l.sku === sku) n += o.status === "Pending" ? l.requested : l.approved;
  }
  return n;
}
export function stockStatus(qoh: number, par: ParLevel): { label: string; tone: StatusToneT } {
  if (qoh === 0) return { label: "Out of stock", tone: "danger" };
  if (qoh < par.min) return { label: "Below Min", tone: "danger" };
  if (qoh > par.max) return { label: "Over Max", tone: "accent" };
  return { label: "In range", tone: "success" };
}
export function catRanks(category: string, loc: string, week: number, by: "units" | "revenue"): string[] {
  return ITEMS.filter((i) => i.category === category)
    .map((i) => ({ k: i.key, v: salesAt(i.key, loc)[week] * (by === "revenue" ? i.price : 1) }))
    .sort((a, b) => b.v - a.v || a.k.localeCompare(b.k))
    .map((x) => x.k);
}
export function rank4(category: string, loc: string, by: "units" | "revenue"): { key: string; units: number; revenue: number }[] {
  return ITEMS.filter((i) => i.category === category)
    .map((i) => {
      const u = last4(salesAt(i.key, loc));
      return { key: i.key, units: u, revenue: u * i.price };
    })
    .sort((a, b) => (by === "units" ? b.units - a.units : b.revenue - a.revenue) || a.key.localeCompare(b.key));
}

export interface Suggestion { p: Product; qoh: number; onOrder: number; vday: number; cover: number; par: ParLevel; suggested: number; math: string }
export interface SuggestOpts { mode: "max" | "velocity"; safety: number; review: number; roundCase: boolean; capMax: boolean }
export function suggest(p: Product, loc: string, inv: InvMap, orders: Order[], o: SuggestOpts): Suggestion {
  const qoh = inv[`${loc}|${p.sku}`].qoh;
  const onOrder = onOrderQty(orders, loc, p.sku);
  const par = parOf(loc, p.sku);
  const vday = perDay(p.sku, loc);
  const cover = vday > 0 ? qoh / vday : 99;
  const pos = qoh + onOrder;
  const lead = VENDOR_BY_ID[p.vendorId].leadDays;
  let raw = 0;
  let math = "";
  if (o.mode === "max") {
    if (qoh >= par.min) math = `Q.O.H. ${qoh} ≥ Min ${par.min} → no reorder`;
    else if (pos >= par.max) math = `Q.O.H. ${qoh} < Min ${par.min}, but ${onOrder} already on order reaches Max`;
    else {
      raw = par.max - pos;
      math = `Q.O.H. ${qoh} < Min ${par.min} → Max ${par.max} − ${qoh} on hand − ${onOrder} on order = ${raw}`;
    }
  } else {
    const demand = vday * (lead + o.review);
    const ss = vday * o.safety;
    let target = Math.ceil(demand + ss);
    const capped = o.capMax && target > par.max;
    if (capped) target = par.max;
    raw = Math.max(0, target - pos);
    math = `${vday.toFixed(1)}/day × (${lead}d lead + ${o.review}d review) = ${demand.toFixed(1)}, + safety ${vday.toFixed(1)} × ${o.safety}d = ${ss.toFixed(1)} → target ${target}${capped ? " (capped at Max)" : ""} − ${pos} position = ${raw}`;
  }
  let suggested = raw;
  if (o.roundCase && raw > 0) {
    const cases = Math.ceil(raw / p.casePack);
    suggested = cases * p.casePack;
    math += ` → ${cases} case${cases > 1 ? "s" : ""} of ${p.casePack} = ${suggested}`;
  }
  return { p, qoh, onOrder, vday, cover, par, suggested, math };
}
