import type { DutchieAdapter, DutchieCashSummary, DutchieDiscount, DutchieInventoryItem, DutchieLoyaltySummary, DutchieSalesWeek } from "../types";
import { MENU, MENU_BY_KEY, seedMenuStock } from "../../catalog/menu";
import { ITEMS, LOCS, LOC_NAME, SALES, WEEKS, VENDOR_BY_ID, h, sh, type InvMap } from "../../data";
import { mockCall } from "./common";

/** Oregon-style retail cannabis tax: 17% state + up to 3% local (sample local rates). */
export const STATE_TAX = 0.17;
export const LOCAL_TAX: Record<string, number> = { south: 0.03, east: 0.03, river: 0.02 };

const locs = (l: string) => (l === "all" ? LOCS.map((x) => x.id) : [l]);
const r2 = (n: number) => Math.round(n * 100) / 100;

export function createMockDutchie(inv: InvMap): DutchieAdapter {
  const stock = seedMenuStock(inv);
  let receiveSeq = 7310;
  const modified: Record<string, number> = {};

  const salesWeeks = (loc: string, weeks: number): DutchieSalesWeek[] => {
    const out: DutchieSalesWeek[] = [];
    for (let w = Math.max(0, WEEKS.length - weeks); w < WEEKS.length; w++) {
      let gross = 0, cogs = 0, net = 0, disc = 0, ret = 0, st = 0, lt = 0;
      for (const l of locs(loc)) {
        let g = 0, c = 0;
        for (const it of ITEMS) {
          const u = SALES[it.key][l][w];
          const m = MENU_BY_KEY[it.key];
          g += u * it.price;
          c += u * (m ? m.unitCost : it.price * 0.5);
        }
        const dRate = 0.085 + 0.03 * sh(`disc${l}${w}`);
        const rRate = 0.003 + 0.004 * sh(`ret${l}${w}`);
        const d = g * dRate, rt = g * rRate, n = g - d - rt;
        gross += g; disc += d; ret += rt; net += n; cogs += c * (1 - rRate);
        st += n * STATE_TAX; lt += n * LOCAL_TAX[l];
      }
      const total = net + st + lt;
      const cashShare = 0.58 + 0.06 * sh(`cash${loc}${w}`);
      out.push({
        weekStart: WEEKS[w], transactions: Math.round(net / 41.5), grossSales: r2(gross), discounts: r2(disc), returns: r2(ret), netSales: r2(net),
        stateTax: r2(st), localTax: r2(lt), cogs: r2(cogs), cashPaid: r2(total * cashShare), debitPaid: r2(total * (1 - cashShare)), electronicPaid: 0,
        loyaltyEarned: Math.round(net * 0.56), loyaltySpent: Math.round(net * 0.56 * (0.55 + 0.1 * sh(`loy${loc}${w}`))),
      });
    }
    return out;
  };

  return {
    getInventory: (locationId) => mockCall(
      { provider: "dutchie", direction: "pull", operation: "getInventory", endpoint: "GET /reporting/inventory", ref: LOC_NAME[locationId] },
      () => {
        const items: DutchieInventoryItem[] = [];
        const ts = (k: string) => new Date(modified[k] ?? Date.UTC(2026, 9, 22, 15, 0)).toISOString();
        for (const p of MENU) {
          const vendor = p.vendorId ? VENDOR_BY_ID[p.vendorId].name : p.brand;
          if (p.bulk) {
            const k = `${locationId}|${p.key}`;
            items.push({ inventoryId: `${p.key}-bulk-${locationId}`, productId: p.key, sku: p.key, productName: p.name, brandName: p.brand, category: p.sub, masterCategory: p.category,
              strainType: p.strain, size: "bulk", quantityAvailable: stock.grams[locationId][p.key], quantityUnits: "Grams", unitPrice: p.options[0].price, unitCost: r2(p.unitCost / 3.5),
              vendorId: p.vendorId, vendor, packageId: null, lastModifiedDateUtc: ts(k) });
            continue;
          }
          for (const o of p.options) {
            const k = `${locationId}|${o.id}`;
            items.push({ inventoryId: `${o.id}-${locationId}`, productId: o.id, sku: o.id, productName: p.name, brandName: p.brand, category: p.sub, masterCategory: p.category,
              strainType: p.strain, size: o.label, quantityAvailable: stock.units[locationId][o.id] ?? 0, quantityUnits: "Each", unitPrice: o.price,
              unitCost: r2(p.unitCost * (o.price / p.options[p.options.length - 1].price)), vendorId: p.vendorId, vendor, packageId: null, lastModifiedDateUtc: ts(k) });
          }
        }
        return items;
      },
      (r) => `${r.length} inventory rows pulled for ${LOC_NAME[locationId]}`,
    ),
    receiveInventory: (req) => mockCall(
      { provider: "dutchie", direction: "push", operation: "receiveInventory", endpoint: "POST /inventory/receiveinventory", ref: req.orderTitle },
      () => {
        for (const it of req.items) {
          const u = stock.units[req.locationId];
          u[it.productId] = (u[it.productId] ?? 0) + it.quantity;
          modified[`${req.locationId}|${it.productId}`] = Date.now();
        }
        return { receiveId: `RCV-${receiveSeq++}`, itemsReceived: req.items.reduce((s, i) => s + i.quantity, 0) };
      },
      (r) => `${r.itemsReceived} units received into ${LOC_NAME[req.locationId]} (${r.receiveId})`,
    ),
    getSales: (locationId, weeks) => mockCall(
      { provider: "dutchie", direction: "pull", operation: "getSales", endpoint: "GET /reporting/transactions", ref: locationId === "all" ? "All locations" : LOC_NAME[locationId] },
      () => salesWeeks(locationId, weeks),
      (r) => `${r.reduce((s, w) => s + w.transactions, 0).toLocaleString()} transactions summarized into ${r.length} weeks`,
    ),
    getDiscounts: (locationId) => mockCall(
      { provider: "dutchie", direction: "pull", operation: "getDiscounts", endpoint: "GET /discounts/v2/list + GET /reporting/discounts", ref: locationId === "all" ? "All locations" : LOC_NAME[locationId] },
      () => {
        const wk = salesWeeks(locationId, 4);
        const totalDisc = wk.reduce((s, w) => s + w.discounts, 0);
        const tx = wk.reduce((s, w) => s + w.transactions, 0);
        const net = wk.reduce((s, w) => s + w.netSales, 0);
        const promos: [string, string | null, string, boolean, boolean, number][] = [
          ["Happy hour 10% off (4–6 PM)", null, "Automatic", false, false, 0.24],
          ["Loyalty Tuesday 15% off", null, "Automatic", true, false, 0.2],
          ["Ironic brand day: $5 off any Ironic item", "IRONIC5", "Code", false, true, 0.12],
          ["First visit 20% off", "WELCOME20", "Code", false, false, 0.14],
          ["Pre-roll pack bundle: 3 for $50", null, "Bundle", false, false, 0.11],
          ["Veterans & seniors 10% off", null, "Manual", false, false, 0.1],
          ["Points redemption ($5 per 100 pts)", null, "Loyalty", true, false, 0.09],
        ];
        return promos.map(([desc, code, method, member, brand, share], i): DutchieDiscount => {
          const amt = r2(totalDisc * share);
          const redemptions = Math.round(tx * share * 0.16 * (0.8 + 0.4 * sh(desc)));
          return { id: 400 + i, discountDescription: desc, discountCode: code, applicationMethod: method, isActive: i !== 5 || h(locationId) > 0.2,
            isLoyaltyMemberOnly: member, brandFunded: brand, redemptions, amountDiscounted: amt, salesWithDiscount: r2(redemptions * 46.5), marginImpactPts: r2((amt / Math.max(1, net)) * 100 * (brand ? 0.4 : 1)) };
        });
      },
      (r) => `${r.length} discounts with 4-week performance`,
    ),
    getLoyaltySummary: (locationId) => mockCall(
      { provider: "dutchie", direction: "pull", operation: "getLoyaltySummary", endpoint: "GET /reporting/loyalty-snapshot", ref: locationId === "all" ? "All locations" : LOC_NAME[locationId] },
      (): DutchieLoyaltySummary => {
        const wk = salesWeeks(locationId, 8);
        const issued = wk.reduce((s, w) => s + w.loyaltyEarned, 0);
        const redeemed = wk.reduce((s, w) => s + w.loyaltySpent, 0);
        const tx = wk.slice(-4).reduce((s, w) => s + w.transactions, 0);
        const members = Math.round(tx * 0.62);
        return { members, activeMembers90d: Math.round(members * 0.71), pointsIssued: issued, pointsRedeemed: redeemed, outstandingPoints: Math.round(issued * 0.9 - redeemed * 0.7 + members * 14),
          pointValue: 0.05, tiers: [
            { name: "Seedling (0–499 pts/yr)", members: Math.round(members * 0.58), spendShare: 0.31 },
            { name: "Bloom (500–1,499)", members: Math.round(members * 0.3), spendShare: 0.38 },
            { name: "Harvest (1,500+)", members: Math.round(members * 0.12), spendShare: 0.31 },
          ] };
      },
      (r) => `${r.members.toLocaleString()} members · ${r.outstandingPoints.toLocaleString()} points outstanding`,
    ),
    getCashSummary: (locationId) => mockCall(
      { provider: "dutchie", direction: "pull", operation: "getCashSummary", endpoint: "GET /reporting/cash-summary", ref: locationId === "all" ? "All locations" : LOC_NAME[locationId] },
      () => {
        const out: DutchieCashSummary[] = [];
        for (const l of locs(locationId)) {
          const wk = salesWeeks(l, 1)[0];
          for (let d = 6; d >= 0; d--) {
            for (const term of ["Register 1", "Register 2"]) {
              const share = term === "Register 1" ? 0.56 : 0.44;
              const sales = r2((wk.cashPaid / 7) * share * (0.8 + 0.4 * sh(l + d + term)));
              const returns = r2(sales * 0.004);
              const over = r2((sh(l + d + term + "os") - 0.5) * 12);
              const start = 300;
              const deposits = r2(Math.floor((sales - returns) / 100) * 100);
              out.push({ terminalName: `${LOC_NAME[l]} · ${term}`, date: new Date(Date.UTC(2026, 9, 22 - d)).toISOString().slice(0, 10), startingBalance: start, sales, returns,
                deposits, adjustments: 0, endingBalance: r2(start + sales - returns - deposits + over), overShort: over });
            }
          }
        }
        return out;
      },
      (r) => `${r.length} register closes`,
    ),
  };
}
