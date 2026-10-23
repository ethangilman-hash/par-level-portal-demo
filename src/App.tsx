import {
  Page, Section, Text, Callout, Table, Grid, Metrics, Segmented, Select, Button, Input, Toggle, Status, Steps,
  LineChart, Heatmap, Bars, Scatter, Properties, Rows, useGrokTheme, useState, useEffect, useMemo,
} from "./kit";
import type { ReactNode, CSSProperties, TableCell } from "./kit";

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE DATA. Product names, categories, sizes, THC and shelf prices are adapted
// from a public dispensary menu with every brand renamed to a parody name.
// Quantities, pars, sales, costs, orders and invoices are invented for the demo.
// ─────────────────────────────────────────────────────────────────────────────
// Catalog: product names, categories, sizes, THC and shelf (out-the-door) prices adapted from a real dispensary menu (2026-10-22);
// every brand is renamed to a parody name. The Ironic line is invented using real menu sizes and price ranges.
// Tuple: sku, vendorId, name, brand, category, subcategory, strain, size, shelfPrice, thc
const MENU_SKUS: readonly (readonly [string, string, string, string, string, string, string, string, number, string])[] = [
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
const COMPETITOR_SKUS: readonly (readonly [string, string, string, string, number])[] = [
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

type StatusToneT = "success" | "warning" | "danger" | "accent" | "neutral";

interface Vendor { id: string; name: string; leadDays: number; minOrder: number; terms: string; emails: string[] }
const VENDORS: Vendor[] = [
  { id: "hmz", name: "Hellamidz", leadDays: 3, minOrder: 250, terms: "Net 14", emails: ["orders@hellamidz.example", "ar@hellamidz.example"] },
  { id: "myld", name: "Myld", leadDays: 5, minOrder: 350, terms: "Net 14", emails: ["wholesale@myld.example"] },
  { id: "poor", name: "PoorGrown", leadDays: 2, minOrder: 300, terms: "Net 7", emails: ["sales@poorgrown.example", "finance@poorgrown.example"] },
  { id: "rbd", name: "Red Beard", leadDays: 3, minOrder: 200, terms: "Net 14", emails: ["crew@redbeard.example"] },
  { id: "iron", name: "Ironic", leadDays: 4, minOrder: 300, terms: "Net 14", emails: ["orders@ironic.example", "reports@ironic.example"] },
];
const VENDOR_BY_ID: Record<string, Vendor> = Object.fromEntries(VENDORS.map((v) => [v.id, v]));
const RETAILER = "Demo Dispensary Co.";
interface Loc { id: string; name: string }
const LOCS: Loc[] = [
  { id: "south", name: "South Main" },
  { id: "east", name: "Eastgate" },
  { id: "river", name: "Riverside" },
];
const LOC_NAME: Record<string, string> = Object.fromEntries(LOCS.map((l) => [l.id, l.name]));
const LOC_FACTOR: Record<string, number> = { south: 1, east: 0.78, river: 0.6 };
const WEEKS = ["Aug 30", "Sep 6", "Sep 13", "Sep 20", "Sep 27", "Oct 4", "Oct 11", "Oct 18"];
const CAT_BASE: Record<string, number> = { Flower: 9, "Pre-Rolls": 8, Vaporizers: 9, Edible: 11, Concentrate: 4, Topicals: 2, Tincture: 2, Accessories: 3 };
const CASE_PACK: Record<string, number> = { Flower: 6, "Pre-Rolls": 10, Vaporizers: 10, Edible: 12, Concentrate: 5 };
const CARRIERS = ["Licensed courier (route van)", "Vendor fleet", "Third-party cannabis transport"];
const SLA_HOURS = 24;

const MIN = 60000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const BASE = Date.UTC(2026, 9, 22, 17, 0); // Oct 22, 2026, 10:00 AM PT (demo clock start)

function h(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return ((x >>> 0) % 10000) / 10000;
}
const money = (n: number): string => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const money0 = (n: number): string => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const dFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
const dtFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
const fd = (ms: number): string => dFmt.format(ms);
const fdt = (ms: number): string => dtFmt.format(ms) + " PT";
const toInt = (s: string): number => {
  const n = Math.floor(Number(s));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
function ageLabel(ms: number): string {
  const hrs = ms / HOUR;
  if (hrs < 1) return `${Math.max(1, Math.round(ms / MIN))}m`;
  if (hrs < 48) return `${Math.round(hrs)}h`;
  return `${Math.round(hrs / 24)}d`;
}

interface Product {
  sku: string; vendorId: string; name: string; brand: string; category: string; sub: string; strain: string;
  size: string; price: number; thc: string; cost: number; casePack: number; group: string;
}
const PRODUCTS: Product[] = MENU_SKUS.map((r) => {
  const [sku, vendorId, name, brand, category, sub, strain, size, price, thc] = r;
  const cost = Math.round(price * (0.45 + 0.1 * h(sku + "c")) * 100) / 100;
  return {
    sku, vendorId, name, brand, category, sub, strain, size, price, thc, cost,
    casePack: CASE_PACK[category] ?? 6,
    group: `${category}${sub ? " · " + sub : ""} · ${size}`,
  };
});
const PRODUCT: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.sku, p]));

interface Item { key: string; name: string; brand: string; category: string; size: string; price: number; vendorId: string | null }
const ITEMS: Item[] = [
  ...PRODUCTS.map((p): Item => ({ key: p.sku, name: p.name, brand: p.brand, category: p.category, size: p.size, price: p.price, vendorId: p.vendorId })),
  ...COMPETITOR_SKUS.map((r, i): Item => ({ key: `C-${i + 1}`, name: r[0], brand: r[1], category: r[2], size: r[3], price: r[4], vendorId: null })),
];
const ITEM: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.key, i]));

// Weekly unit sales per item, per location, for the last 8 weeks (sample).
// Ironic is, by design, the best seller in every one of its categories at every
// location and week — by units and by revenue — at ordinary shelf prices.
function buildSales(): Record<string, Record<string, number[]>> {
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
const SALES = buildSales();
const salesAt = (key: string, loc: string): number[] =>
  loc === "all" ? WEEKS.map((_, w) => LOCS.reduce((s, l) => s + SALES[key][l.id][w], 0)) : SALES[key][loc];
const last4 = (arr: number[]): number => (arr[4] + arr[5] + arr[6] + arr[7]) / 4;
const perDay = (sku: string, loc: string): number => last4(SALES[sku][loc]) / 7;

interface ParLevel { min: number; max: number; maxStrains: number }
const PARS: Record<string, ParLevel> = {};
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
const parOf = (loc: string, sku: string): ParLevel => {
  const p = PRODUCT[sku];
  return PARS[`${loc}|${p.vendorId}|${p.group}`];
};

interface Stock { qoh: number; received: number }
type InvMap = Record<string, Stock>;
function seedInventory(): InvMap {
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

type OrderStatus = "Pending" | "Countered" | "Approved" | "Rejected" | "Shipped" | "Received";
interface OrderLine { sku: string; requested: number; approved: number; received: number; damaged: number; unitCost: number; basis: string }
interface Note { by: string; text: string; at: number }
interface Order {
  id: string; vendorId: string; locId: string; status: OrderStatus; lines: OrderLine[]; mode: string;
  submittedAt: number; counteredAt?: number; approvedAt?: number; rejectedAt?: number; shippedAt?: number; receivedAt?: number;
  carrier?: string; manifest?: string; etaAt?: number; notes: Note[]; invoiceId?: string; discrepancy?: string;
}
interface Invoice { id: string; vendorId: string; locId: string; orderId: string; date: number; amount: number; payments: { at: number; amount: number }[] }
interface LogEntry { at: number; actor: string; vendorId: string | null; text: string }

const STATUS_TONE: Record<OrderStatus, StatusToneT> = {
  Pending: "warning", Countered: "warning", Approved: "accent", Rejected: "danger", Shipped: "accent", Received: "success",
};
const OPEN: OrderStatus[] = ["Pending", "Countered", "Approved", "Shipped"];

function ln(sku: string, requested: number, approved?: number, received?: number, damaged?: number): OrderLine {
  const a = approved ?? requested;
  return { sku, requested, approved: a, received: received ?? 0, damaged: damaged ?? 0, unitCost: PRODUCT[sku].cost, basis: "Order to Max" };
}
const lineSum = (lines: OrderLine[], f: (l: OrderLine) => number): number => lines.reduce((s, l) => s + f(l) * l.unitCost, 0);
const orderValue = (o: Order): number =>
  o.status === "Received" ? lineSum(o.lines, (l) => Math.max(0, l.received - l.damaged))
    : o.status === "Pending" ? lineSum(o.lines, (l) => l.requested) : lineSum(o.lines, (l) => l.approved);

function seedOrders(): Order[] {
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
      shippedAt: BASE - 22 * HOUR, carrier: CARRIERS[0], manifest: "MNF-2610-48217", etaAt: BASE + 4 * HOUR, notes: [],
    },
    {
      id: "PO-1041", vendorId: "rbd", locId: "south", status: "Received", mode: "Order to Max",
      lines: [ln("RBD-101", 12, 12, 12), ln("RBD-104", 10, 10, 10, 1), ln("RBD-106", 10, 10, 9)], submittedAt: BASE - 9 * DAY,
      approvedAt: BASE - 8.8 * DAY, shippedAt: BASE - 8 * DAY, receivedAt: BASE - 6 * DAY, carrier: CARRIERS[1], manifest: "MNF-2610-41090",
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
      shippedAt: BASE - 16 * DAY, receivedAt: BASE - 15 * DAY, carrier: CARRIERS[2], manifest: "MNF-2610-29004", etaAt: BASE - 15 * DAY,
      invoiceId: "INV-28660", notes: [],
    },
  ];
}
function seedInvoices(orders: Order[]): Invoice[] {
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
  ];
}
const paidOf = (i: Invoice): number => i.payments.reduce((s, p) => s + p.amount, 0);
const balOf = (i: Invoice): number => Math.max(0, Math.round((i.amount - paidOf(i)) * 100) / 100);

function seedLog(): LogEntry[] {
  return [
    { at: BASE - 2 * HOUR, actor: RETAILER, vendorId: "poor", text: "Counter-proposal sent on PO-1058 (Papaya Nectar 10 → 5)" },
    { at: BASE - 5 * HOUR, actor: "Ironic", vendorId: "iron", text: "PO-1057 submitted for approval (South Main)" },
    { at: BASE - 6 * HOUR, actor: RETAILER, vendorId: "myld", text: "PO-1052 approved with changes (Eastgate)" },
    { at: BASE - 22 * HOUR, actor: "Hellamidz", vendorId: "hmz", text: "PO-1048 shipped via licensed courier, manifest MNF-2610-48217" },
    { at: BASE - 28 * HOUR, actor: "Hellamidz", vendorId: "hmz", text: "PO-1055 submitted for approval (Eastgate)" },
    { at: BASE - 1 * DAY, actor: RETAILER, vendorId: "rbd", text: "Payment of $150.00 recorded on INV-29102" },
    { at: BASE - 6 * DAY, actor: RETAILER, vendorId: "rbd", text: "PO-1041 received at South Main with discrepancies; INV-29102 generated" },
    { at: BASE - 12 * DAY, actor: RETAILER, vendorId: "rbd", text: "PO-1036 rejected (over Max on budder)" },
  ];
}

// ─────────────────────────── derived helpers ───────────────────────────
function onOrderQty(orders: Order[], loc: string, sku: string): number {
  let n = 0;
  for (const o of orders) {
    if (o.locId !== loc || !OPEN.includes(o.status)) continue;
    for (const l of o.lines) if (l.sku === sku) n += o.status === "Pending" ? l.requested : l.approved;
  }
  return n;
}
function stockStatus(qoh: number, par: ParLevel): { label: string; tone: StatusToneT } {
  if (qoh === 0) return { label: "Out of stock", tone: "danger" };
  if (qoh < par.min) return { label: "Below Min", tone: "danger" };
  if (qoh > par.max) return { label: "Over Max", tone: "accent" };
  return { label: "In range", tone: "success" };
}
function catRanks(category: string, loc: string, week: number, by: "units" | "revenue"): string[] {
  return ITEMS.filter((i) => i.category === category)
    .map((i) => ({ k: i.key, v: salesAt(i.key, loc)[week] * (by === "revenue" ? i.price : 1) }))
    .sort((a, b) => b.v - a.v || a.k.localeCompare(b.k))
    .map((x) => x.k);
}
function rank4(category: string, loc: string, by: "units" | "revenue"): { key: string; units: number; revenue: number }[] {
  return ITEMS.filter((i) => i.category === category)
    .map((i) => {
      const u = last4(salesAt(i.key, loc));
      return { key: i.key, units: u, revenue: u * i.price };
    })
    .sort((a, b) => (by === "units" ? b.units - a.units : b.revenue - a.revenue) || a.key.localeCompare(b.key));
}

interface Suggestion { p: Product; qoh: number; onOrder: number; vday: number; cover: number; par: ParLevel; suggested: number; math: string }
interface SuggestOpts { mode: "max" | "velocity"; safety: number; review: number; roundCase: boolean; capMax: boolean }
function suggest(p: Product, loc: string, inv: InvMap, orders: Order[], o: SuggestOpts): Suggestion {
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

// ─────────────────────────── visual building blocks ───────────────────────────
function useStyles() {
  const t = useGrokTheme();
  const card: CSSProperties = {
    border: `1px solid ${t.border.subtle}`, borderRadius: t.radius.lg, background: t.bg.elevated, padding: 16,
    display: "flex", flexDirection: "column", gap: 14,
  };
  const small: CSSProperties = { fontSize: t.font.caption.fontSize, lineHeight: t.font.caption.lineHeight, color: t.text.secondary };
  const strong: CSSProperties = { fontSize: t.font.body1.fontSize, lineHeight: t.font.body1.lineHeight, color: t.text.primary, fontWeight: t.weight.semibold };
  const row: CSSProperties = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
  return { t, card, small, strong, row };
}

function Card(props: { children?: ReactNode }) {
  const { card } = useStyles();
  return <div style={card}>{props.children}</div>;
}

function Bar(props: { pct: number }) {
  const { t } = useStyles();
  return (
    <div style={{ height: 6, borderRadius: t.radius.full, background: t.fill.secondary, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, props.pct)}%`, height: "100%", background: t.fill.accent, transition: `width ${t.motion.hover}` }} />
    </div>
  );
}

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

function OrderCard(props: { order: Order; role: "vendor" | "retailer"; now: number; inv: InvMap; act: Actions }) {
  const { order: o, role, now, inv, act } = props;
  const { t, small, strong, row } = useStyles();
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
      <div style={{ ...row, justifyContent: "space-between" }}>
        <div style={row}>
          <span style={strong}>{o.id}</span>
          <Status tone={STATUS_TONE[o.status]}>{o.status === "Pending" ? "Pending approval" : o.status}</Status>
          {sla}
        </div>
        <div style={row}>
          <span style={small}>{v.name} → {LOC_NAME[o.locId]}</span>
          <span style={strong}>{money(total)}</span>
        </div>
      </div>
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
    </Card>
  );
}

// ─────────────────────────── vendor views ───────────────────────────
type VTab = "dash" | "qoh" | "par" | "insights" | "order" | "orders" | "invoices" | "alerts" | "settings";
type RTab = "overview" | "approvals" | "receiving" | "belowpar" | "orders" | "invoices" | "activity";

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
        <Section heading="Weekly category rank" caption={`Rank by ${by} each week (1 is best)`}>
          {rankSeries.length > 0 ? (
            <LineChart points={WEEKS.map((w, i) => ({ label: w, value: rankSeries[0].values[i] }))} ceiling={worst} floor={1}
              labels={[rankSeries[0].label]} lines={rankSeries.slice(1)} format={(n) => `#${Math.round(n)}`} />
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

function OrderBuilder(props: Ctx & { submit: (lines: OrderLine[], mode: string, note: string) => void }) {
  const { vendor, loc, inv, orders } = props;
  const { small, row } = useStyles();
  const [mode, setMode] = useState<"max" | "velocity">("max");
  const [safety, setSafety] = useState("3");
  const [review, setReview] = useState("7");
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
  const short = total < vendor.minOrder;
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
        <div style={small}>Lead time {vendor.leadDays} days · minimum order {money0(vendor.minOrder)} · terms {vendor.terms}</div>
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
            { label: "Minimum order", value: short ? <Status tone="warning">{`${money(vendor.minOrder - total)} short of ${money0(vendor.minOrder)}`}</Status> : <Status tone="success">Met</Status> },
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
function BelowParTable(props: { inv: InvMap; orders: Order[]; locFilter: string }) {
  const rows: TableCell[][] = [];
  for (const l of LOCS) {
    if (props.locFilter !== "all" && props.locFilter !== l.id) continue;
    for (const p of PRODUCTS) {
      const q = props.inv[`${l.id}|${p.sku}`].qoh;
      const par = parOf(l.id, p.sku);
      if (q >= par.min) continue;
      const v = perDay(p.sku, l.id);
      const oo = onOrderQty(props.orders, l.id, p.sku);
      rows.push([l.name, VENDOR_BY_ID[p.vendorId].name, p.sku, p.name, q === 0 ? { text: "0", tone: "danger" } : String(q),
        `${par.min} / ${par.max}`, String(par.max - q), v > 0 ? `${(q / v).toFixed(1)}d` : "—",
        oo > 0 ? { text: `${oo} on order`, tone: "success" } : { text: "None", tone: "warning" }]);
    }
  }
  if (rows.length === 0) return <Callout tone="success">Every SKU is at or above Min.</Callout>;
  return <Table columns={["Location", "Vendor", "SKU", "Product", "Q.O.H.", "Min / Max", "Gap to Max", "Cover", "Open order"]}
    align={["start", "start", "start", "start", "end", "end", "end", "end", "start"]} rows={rows} />;
}

const HOW_STEPS = [
  { title: "Pick an account", detail: "Choose a vendor or the store manager from the dropdown and select Enter demo. No passwords; it's sample data." },
  { title: "Vendor: choose a location and review reports", detail: "Q.O.H., Par Levels (Min / Max / Max Strains), Category Insights, Invoice Logs and Email Settings, modeled on a typical vendor portal." },
  { title: "Vendor: build and submit an order", detail: "Suggested quantities come from Order to Max or velocity + lead time + safety stock, rounded to case packs and checked against the minimum order." },
  { title: "Retailer: approve, adjust, counter or reject", detail: "Edit line quantities, add notes, and watch the approval SLA age on each order." },
  { title: "Vendor: ship", detail: "Pick a carrier and ETA; a manifest number is generated." },
  { title: "Retailer: receive", detail: "Record received and damaged units. Accepted units update Q.O.H., an invoice is generated, and the vendor sees it in Invoice Logs." },
];

export default function ParLevelPortal() {
  const { t, small, strong, row, card } = useStyles();
  const [account, setAccount] = useState<string>("");
  const [pickAcct, setPickAcct] = useState<string>("");
  const [stage, setStage] = useState<"signin" | "location" | "loading" | "portal">("signin");
  const [loc, setLoc] = useState<string>("");
  const [pickLoc, setPickLoc] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [vtab, setVtab] = useState<VTab>("dash");
  const [rtab, setRtab] = useState<RTab>("overview");
  const [rloc, setRloc] = useState<string>("all");
  const [orderFilter, setOrderFilter] = useState<"open" | "all" | "closed">("open");
  const [histSel, setHistSel] = useState<string>("");
  const [clock, setClock] = useState(BASE);
  const [inv, setInv] = useState<InvMap>(() => seedInventory());
  const [orders, setOrders] = useState<Order[]>(() => seedOrders());
  const [invoices, setInvoices] = useState<Invoice[]>(() => seedInvoices(seedOrders()));
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
  const addLog = (at: number, actor: string, vendorId: string | null, text: string) => setLog((l) => [{ at, actor, vendorId, text }, ...l]);
  const upd = (id: string, f: (o: Order) => Order) => setOrders((os) => os.map((o) => (o.id === id ? f(o) : o)));
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
    },
    counter: (id, qty, note) => {
      const at = tick();
      upd(id, (x) => ({
        ...x, status: "Countered", counteredAt: at, lines: x.lines.map((l) => ({ ...l, approved: qty[l.sku] ?? l.approved })),
        notes: [...x.notes, { by: RETAILER, text: note || "Counter-proposal: see adjusted quantities.", at }],
      }));
      addLog(at, RETAILER, vidOf(id), `Counter-proposal sent on ${id}`);
    },
    reject: (id, note) => {
      const at = tick();
      upd(id, (x) => ({ ...x, status: "Rejected", rejectedAt: at, notes: note ? [...x.notes, { by: RETAILER, text: note, at }] : x.notes }));
      addLog(at, RETAILER, vidOf(id), `${id} rejected`);
    },
    acceptCounter: (id) => {
      const at = tick();
      upd(id, (x) => ({ ...x, status: "Approved", approvedAt: at, notes: [...x.notes, { by: vname(id), text: "Accepted the counter-proposal.", at }] }));
      addLog(at, vname(id), vidOf(id), `Counter-proposal accepted on ${id}; order approved`);
    },
    ship: (id, carrier, etaDays) => {
      const at = tick();
      const manifest = `MNF-2610-${id.slice(3)}${String(Math.floor(h(id + at) * 90 + 10))}`;
      upd(id, (x) => ({ ...x, status: "Shipped", shippedAt: at, carrier, manifest, etaAt: at + etaDays * DAY }));
      addLog(at, vname(id), vidOf(id), `${id} shipped via ${carrier.toLowerCase()}, manifest ${manifest}`);
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
      const invId = `INV-${29300 + invoices.length}`;
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
    setOrders((os) => [{ id, vendorId: vendor.id, locId: loc, status: "Pending", lines, mode, submittedAt: at, notes: note ? [{ by: vendor.name, text: note, at }] : [] }, ...os]);
    addLog(at, vendor.name, vendor.id, `${id} submitted for approval (${LOC_NAME[loc]}, ${mode})`);
    setOrderFilter("open");
    setVtab("orders");
  };
  const pay = (id: string) => {
    const at = tick();
    setInvoices((is) => is.map((i) => (i.id === id ? { ...i, payments: [...i.payments, { at, amount: balOf(i) }] } : i)));
    const i = invoices.find((x) => x.id === id);
    if (i) addLog(at, RETAILER, i.vendorId, `Payment of ${money(balOf(i))} recorded on ${id}`);
  };

  const switchAccount = () => { setAccount(""); setPickAcct(""); setLoc(""); setPickLoc(""); setStage("signin"); setVtab("dash"); setRtab("overview"); };
  const isRetailer = account === "retailer";
  const vendor = !isRetailer && account ? VENDOR_BY_ID[account] : null;
  const ctx: Ctx | null = vendor && loc ? { vendor, loc, inv, orders, invoices, now: clock } : null;

  const acctOptions = [...VENDORS.map((v) => ({ value: v.id, label: `${v.name.toUpperCase()} (vendor)` })), { value: "retailer", label: `${RETAILER} · store manager (retailer)` }];

  const header = (
    <div style={{ ...card, flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={strong}>{RETAILER} · {isRetailer ? "Retailer console" : "Vendor Portal"}</span>
        <span style={small}>
          {account ? `Signed in as ${isRetailer ? "Store manager" : vendor?.name ?? ""}` : "Not signed in"}
          {loc && !isRetailer ? ` · ${LOC_NAME[loc]}` : ""} · Demo clock {fdt(clock)} · Sample data
        </span>
      </div>
      <div style={row}>
        {vendor && stage === "portal" ? <Button variant="quiet" label="Change location" onClick={() => { setStage("location"); setPickLoc(loc); }} /> : null}
        {account ? <Button label="Switch account" onClick={switchAccount} /> : null}
      </div>
    </div>
  );

  // ── sign-in / location / loading ──
  let body: ReactNode = null;
  if (stage === "signin") {
    body = (
      <>
        <Grid columns={2}>
          <Section heading="Sign in to the demo">
            <Select label="Vendor" options={acctOptions} value={pickAcct} onChange={setPickAcct} placeholder="Choose an account" />
            <div style={row}>
              <Button variant="primary" disabled={!pickAcct}
                label={pickAcct ? `Enter demo as ${pickAcct === "retailer" ? "store manager" : VENDOR_BY_ID[pickAcct].name}` : "Enter demo"}
                onClick={() => {
                  setAccount(pickAcct);
                  if (pickAcct === "retailer") { setProgress(0); setStage("loading"); } else setStage("location");
                }} />
            </div>
            <div style={small}>Demo accounts with sample data. There are no passwords; pick an account and enter.</div>
          </Section>
          <Section heading="Sample accounts">
            <Rows rows={[
              ...VENDORS.map((v) => ({ title: v.name, detail: `${PRODUCTS.filter((p) => p.vendorId === v.id).length} SKUs · ${Array.from(new Set(PRODUCTS.filter((p) => p.vendorId === v.id).map((p) => p.category))).join(", ")}`, meta: `${v.leadDays}-day lead time` })),
              { title: `${RETAILER} (retailer)`, detail: `Store manager · ${LOCS.map((l) => l.name).join(", ")}`, meta: "Approves and receives" },
            ]} />
          </Section>
        </Grid>
      </>
    );
  } else if (stage === "location" && vendor) {
    body = (
      <Section heading={`Welcome, ${vendor.name}`} caption="Choose the retailer location you want to review.">
        <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 12 }}>
          <Select label="Vendor" options={[{ value: vendor.id, label: vendor.name.toUpperCase() }]} value={vendor.id} onChange={() => undefined} disabled />
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
    const shownOrders = myOrders.filter((o) => orderFilter === "all" ? true : orderFilter === "open" ? OPEN.includes(o.status) : !OPEN.includes(o.status))
      .sort((a, b) => b.submittedAt - a.submittedAt);
    body = (
      <>
        <Segmented<VTab> value={vtab} onChange={setVtab} options={[
          { value: "dash", label: "Dashboard" }, { value: "qoh", label: "Q.O.H." }, { value: "par", label: "Par Levels" },
          { value: "insights", label: "Category Insights" }, { value: "order", label: "Suggested Order" },
          { value: "orders", label: "Orders", count: actionable || undefined }, { value: "invoices", label: "Invoice Logs" },
          { value: "alerts", label: "Alerts & Activity", count: alerts.length || undefined }, { value: "settings", label: "Email Settings" },
        ]} />
        {vtab === "dash" ? <VendorDashboard {...ctx} goOrder={() => setVtab("order")} /> : null}
        {vtab === "qoh" ? <QohTab {...ctx} /> : null}
        {vtab === "par" ? <ParTab {...ctx} /> : null}
        {vtab === "insights" ? <InsightsTab {...ctx} /> : null}
        {vtab === "order" ? <OrderBuilder key={`${vendor.id}-${loc}`} {...ctx} submit={(l, m, n) => submitOrder(vendor, l, m, n)} /> : null}
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
    body = (
      <>
        <div style={{ ...row, justifyContent: "space-between" }}>
          <Segmented<RTab> value={rtab} onChange={setRtab} options={[
            { value: "overview", label: "Overview" }, { value: "approvals", label: "Approvals", count: pending.length || undefined },
            { value: "receiving", label: "Receiving", count: shipped.length || undefined }, { value: "belowpar", label: "Below par" },
            { value: "orders", label: "Order history" }, { value: "invoices", label: "Invoices" }, { value: "activity", label: "Activity" },
          ]} />
          <Select options={[{ value: "all", label: "All locations" }, ...LOCS.map((l) => ({ value: l.id, label: l.name }))]} value={rloc} onChange={setRloc} />
        </div>
        {rtab === "overview" ? (
          <>
            <Metrics metrics={[
              { value: String(pending.length), label: "Awaiting approval", detail: breached ? `${breached} past ${SLA_HOURS}h SLA` : "all within SLA", tone: breached ? "danger" : "success" },
              { value: `${avgAppr.toFixed(1)}h`, label: "Avg time to approve", detail: `target under ${SLA_HOURS}h` },
              { value: String(shipped.length + approvedWaiting.length), label: "Inbound orders", detail: `${shipped.length} in transit · ${approvedWaiting.length} awaiting ship` },
              { value: String(totalBelow), label: "SKUs below Min", detail: `${money0(ap)} open payables` },
            ]} />
            <Grid columns={2}>
              <Section heading="Below Min by vendor and location" caption="Count of SKUs under Min · sample data">
                <Heatmap rows={VENDORS.map((v) => v.name)} columns={LOCS.map((l) => l.name)} values={VENDORS.map((v) => LOCS.map((l) => belowCount(v.id, l.id)))} />
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
                <div style={row}><Button variant="primary" label="Open approvals" onClick={() => setRtab("approvals")} /></div>
              </Section>
            </Grid>
            <Section heading="Inbound shipments">
              {shipped.length ? (
                <Table columns={["Order", "Vendor", "Location", "Carrier", "Manifest", "Shipped", "ETA", "Value"]}
                  rows={shipped.map((o) => [o.id, VENDOR_BY_ID[o.vendorId].name, LOC_NAME[o.locId], o.carrier ?? "", o.manifest ?? "", o.shippedAt ? fdt(o.shippedAt) : "", o.etaAt ? fdt(o.etaAt) : "", money(orderValue(o))])} />
              ) : <Text>Nothing in transit.</Text>}
            </Section>
          </>
        ) : null}
        {rtab === "approvals" ? (
          <Section heading="Approval queue" caption="Oldest first. Lines show Q.O.H. and par at the receiving location.">
            {pending.length ? pending.map((o) => <OrderCard key={`${o.id}-${o.status}`} order={o} role="retailer" now={clock} inv={inv} act={act} />) : <Callout tone="success">No orders are waiting for approval.</Callout>}
          </Section>
        ) : null}
        {rtab === "receiving" ? (
          <Section heading="Receiving" caption="Count each line; enter shorts and damages. Accepted units update Q.O.H. and generate the invoice.">
            {shipped.length ? shipped.map((o) => <OrderCard key={`${o.id}-${o.status}`} order={o} role="retailer" now={clock} inv={inv} act={act} />) : <Text>No shipments in transit. Approve an order, then sign in as its vendor to ship it.</Text>}
          </Section>
        ) : null}
        {rtab === "belowpar" ? (
          <Section heading="Inventory below Min, all vendors" caption="Gap to Max = Max − Q.O.H. Sample data.">
            <BelowParTable inv={inv} orders={orders} locFilter={rloc} />
          </Section>
        ) : null}
        {rtab === "orders" ? (
          <>
            <Section heading="Order history">
              <Table columns={["Order", "Vendor", "Location", "Submitted", "Status", "Value", "Invoice", ""]}
                rows={hist.map((o) => [o.id, VENDOR_BY_ID[o.vendorId].name, LOC_NAME[o.locId], fdt(o.submittedAt),
                  <Status key="s" tone={STATUS_TONE[o.status]}>{o.status}</Status>, money(orderValue(o)), o.invoiceId ?? "—",
                  <Button key="b" variant="quiet" label={histSel === o.id ? "Hide" : "Details"} onClick={() => setHistSel(histSel === o.id ? "" : o.id)} />])} />
            </Section>
            {selOrder ? <OrderCard key={`${selOrder.id}-${selOrder.status}`} order={selOrder} role="retailer" now={clock} inv={inv} act={act} /> : null}
          </>
        ) : null}
        {rtab === "invoices" ? (
          <Section heading="Vendor invoices" caption="Record payment settles the remaining balance (demo only; no money moves).">
            <InvoiceTable invoices={invoices.filter(inLoc)} showVendor pay={pay} />
          </Section>
        ) : null}
        {rtab === "activity" ? <Section heading="Activity log"><LogTable log={log} /></Section> : null}
      </>
    );
  }

  return (
    <Page title="Par Level Portal Demo" width="wide"
      summary="A vendor-managed inventory demo: vendors see stock vs par at each store, build suggested orders, and ship once the retailer approves. All quantities, sales and orders are sample data; brands are parody names.">
      {header}
      {body}
      <Section heading="How the demo works" collapsible defaultOpen={stage === "signin"}>
        <Steps steps={HOW_STEPS} />
        <div style={{ ...small, color: t.text.tertiary }}>Everything lives in this page's memory and resets on reload. Try: sign in as Ironic, submit the suggested order, switch to the store manager to approve it, switch back to ship, then receive it.</div>
      </Section>
    </Page>
  );
}
