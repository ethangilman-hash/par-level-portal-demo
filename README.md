# Par Level Portal Demo

**Live demo:** https://ethangilman-hash.github.io/par-level-portal-demo/

An interactive, front-end-only demo of a **par-level / vendor-managed inventory (VMI) portal** for a multi-location retailer. Vendors see on-hand stock against par levels at each store, build suggested orders, and ship them after the retailer approves. Everything runs in the browser from generated sample data. There is no backend, no network calls and no passwords.

> **All data is fictional.** Every brand name is a parody, the retailer ("Demo Dispensary Co.") is generic, and all quantities, prices, sales and orders are generated sample data. Nothing represents a real company, product or business relationship.

## Running it

Requires Node 18+ (20 recommended).

```bash
npm install
npm run dev        # dev server at http://localhost:5173/par-level-portal-demo/
npm run build      # type-check (tsc) + production build to dist/
npm run preview    # serve the production build
```

## How the flow works

### Sign in
The start page has two options: **Retail log in** (the retailer's store manager) and **Vendor log in** (the Ironic demo vendor account). Click a card to enter; there are no passwords. Each role opens with a guide banner showing the suggested click path, and every tab has a one-line "what this is for" strip.

### Vendor role
1. **Choose a location** (South Main, Eastgate or Riverside). A short "Generating Reports" step runs, then the vendor tabs appear.
2. **Dashboard**: KPIs (below-Min SKUs, stock-outs, days of cover, open orders), sales velocity, days of cover by SKU, and a Stock-vs-Max heatmap across locations.
3. **Q.O.H.**: quantity on hand per SKU at the selected location.
4. **Par Levels**: Min / Max / Max Strains per product, with View Products drill-down.
5. **Category Insights**: category rankings by units or revenue against competitor (parody) brands, brand share, price vs units, weekly rank trend, and rank by location.
6. **Suggested Order**: quantities computed from par and velocity. The math is shown per line: `target = velocity × (lead time + review period) + safety stock`, capped at Max, rounded up to case packs and checked against the vendor's minimum order value. Lines can be edited before you **Submit**.
7. **Orders**: each order has a status timeline (Suggested → Submitted → Approved / Countered / Rejected → Shipped → Received). On an approved order the vendor picks a carrier and ETA, and a (mock) Metrc transfer manifest with package tags is created.
8. **Invoice Logs**: an invoice is generated automatically when the retailer receives an order.
9. **Retailers**: one account per store (South Main, Eastgate, Riverside) with Overview / Orders / Contacts / Notes / Preferences. Delivery frequency, day and window drive the next delivery and order-by date, which also appear in Suggested Order. Notes are private to the vendor.
10. **Alerts & Activity** and **Email Settings**: an alert feed, an audit log, and sample notification preferences.
11. **Integrations**: provider status (Demo mode / sample data), which functions use each provider, field mapping, and the live sync log.

The Q.O.H. tab shows "Last synced with Dutchie POS at …" (simulated). It refreshes every 60 s and on **Sync now**.

### Retailer role
- **Overview**: approvals awaiting action with SLA aging (24 h target), inbound shipments, and a below-Min heatmap by vendor × location.
- **Inventory** (sub-views):
  - **All inventory**: a Dutchie-style inventory table per store (SKU, product, brand/vendor, room, available, price, cost, sales velocity, last date sold) with search, filters, sorting, CSV export and a simulated "Last synced with Dutchie POS" line.
  - **Below par**: every par-tracked SKU under Min, with gap to Max, cover and open orders.
  - **Performance**: Dutchie-style reports: a KPI strip (Gross Sales, Discounted Amount, Inventory Cost, Inventory Profit) with a period picker and a daily sales bar chart; a top-sales donut (master categories / products / brands, drill-down); a performance ranking (Master Categories, Categories, Products, Brands, Tags) with qty sold / remaining / received, gross sales, % of sales, inventory cost, margin, discounts, sales velocity and last sold; monthly sales (Jan–Oct 2026) and sales by location.
- **Orders** (sub-views):
  - **Approvals**: approve, edit line quantities, counter-propose with a note, or reject.
  - **Receiving**: record received, short and damaged units per line. Accepted units update Q.O.H. immediately and generate an invoice, and the vendor sees it in Invoice Logs.
  - **Order history**: every order, with timeline and notes.
  - **Invoice**: invoices for received orders plus pro-forma invoices for approved / shipped orders, with a detail view (bill-to, terms, line items, payments, record payment).
- **Finance**: a ledger (drawer, bank, A/R / A/P with running balance), payables aging, a sales summary with trend and Oregon tax lines, promotions, loyalty, payment mix with ATM fees, category and brand margin, and a safe log. Labeled with QuickBooks and Dutchie sync times.
- **Vendors**: an account for every brand on the reference menu (parody names; the five par-tracked vendors plus the rest of the menu), with search, frequency filters and status. Account pages have Overview / Orders / Contacts / Notes / Preferences, where you can set delivery frequency (weekly / bi-weekly / monthly), day and window, receiving, auto-approve under $X, and private notes.
- **Integrations**: the same status, mapping and sync log views as the vendor's.
- **Activity**: the audit log.

## Integrations

Every action runs through a typed adapter layer (`src/integrations/`) for **Dutchie POS** (inventory, receiving, sales), **LeafLink** (orders, approvals, accounts), **Metrc** (manifests, package tags, receiving) and **QuickBooks Online** (invoice, bill, payments). The public demo only uses the mock adapters: there are no network calls and no credentials. See [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) for the mock/live switch, placeholder env vars, endpoints and the field mapping.

## Updates

"How the demo works" and a separate **Updates** dropdown sit at the bottom of every screen. Notes come from `src/updates.ts`.

Each sign-in starts with a freshly generated order book covering every state (pending, past-SLA, countered, approved, shipped, received with a discrepancy, rejected) so each screen has something to show. All state lives in memory and resets on reload.

**Try this:** Vendor log in (Ironic) → pick a location → Suggested Order → Submit. Then Switch account → Retail log in → Orders → Approvals → Approve. Switch back to Vendor log in → Orders → Ship. Finally, Retail log in → Orders → Receiving → Receive. Watch Q.O.H. and Invoice Logs update.

## Deployment

The site is published with GitHub Pages from the `gh-pages` branch, which holds the contents of `dist/` from `npm run build`. Vite's `base` is set to `/par-level-portal-demo/` so asset paths resolve under the Pages URL. To redeploy, build and push `dist/` to `gh-pages`, for example with `npx gh-pages -d dist`.

## Project layout

```
src/
  App.tsx          app shell, state and actions (routed through integrations)
  data.ts          deterministic sample data and par/suggestion logic
  accounts.ts      account preferences, notes, contacts and delivery schedule
  catalog/menu.ts  Dutchie-style menu model for the Inventory tab
  integrations/    typed adapters (mock + live stubs), config, mapping, sync log
  views/           Inventory, Finance, Accounts, Integrations, Updates
  updates.ts       published update notes
  main.tsx         React entry; wraps the app in the theme provider
  kit/             small local UI kit used by the demo
    theme.tsx      light/dark theme object + provider (follows OS setting, toggle in header)
    components.tsx Page, Section, Grid, Table, Metrics, Segmented, Select, Button, Input, Toggle, Status, Steps, Properties, Rows, Callout, Text
    charts.tsx     simple SVG/CSS charts: LineChart, Bars, Heatmap, Scatter
```

Sample data is re-rolled on every sign-in (Retail log in / Vendor log in, including after Switch account): `src/session.ts` picks a fresh 32-bit seed, salts the sample hash (`sh()` in `src/data.ts`) and a mulberry32 PRNG with it, and regenerates the weekly sales table, daily Performance history, stock snapshot, last-sold / receipt cadence, the incoming order book, invoices and activity log, then re-seeds the mock integrations. The seed stays fixed until you switch account, so tab hopping never reshuffles. Orders you created or acted on carry over between sign-ins so the approve → ship → receive loop still works. Catalog, costs, vendor accounts and store licenses stay fixed.

## License

Proprietary — all rights reserved. Source is public for viewing only; no license is granted to use, copy, modify, or distribute.
