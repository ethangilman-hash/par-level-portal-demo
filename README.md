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
Pick an account from the dropdown and select **Enter demo**. You can sign in as one of five sample vendors (Hellamidz, Myld, PoorGrown, Red Beard, Ironic) or as the retailer's store manager. There are no passwords.

### Vendor role
1. **Choose a location** (South Main, Eastgate or Riverside). A short "Generating Reports" step runs, then the vendor tabs appear.
2. **Dashboard**: KPIs (below-Min SKUs, stock-outs, days of cover, open orders), sales velocity, days of cover by SKU, and a Stock-vs-Max heatmap across locations.
3. **Q.O.H.**: quantity on hand per SKU at the selected location.
4. **Par Levels**: Min / Max / Max Strains per product, with View Products drill-down.
5. **Category Insights**: category rankings by units or revenue against competitor (parody) brands, brand share, price vs units, weekly rank trend, and rank by location.
6. **Suggested Order**: quantities computed from par and velocity. The math is shown per line: `target = velocity × (lead time + review period) + safety stock`, capped at Max, rounded up to case packs and checked against the vendor's minimum order value. Lines can be edited before you **Submit**.
7. **Orders**: each order has a status timeline (Suggested → Submitted → Approved / Countered / Rejected → Shipped → Received). On an approved order the vendor picks a carrier and ETA, and a manifest number is generated.
8. **Invoice Logs**: an invoice is generated automatically when the retailer receives an order.
9. **Alerts & Activity** and **Email Settings**: an alert feed, an audit log, and sample notification preferences.

### Retailer role
- **Overview**: approvals awaiting action with SLA aging (24 h target), inbound shipments, and a below-Min heatmap by vendor × location.
- **Approvals**: approve, edit line quantities, counter-propose with a note, or reject.
- **Receiving**: record received, short and damaged units per line. Accepted units update Q.O.H. immediately and generate an invoice, and the vendor sees the invoice in Invoice Logs.
- **Below par**, **Order history**, **Invoices** and **Activity** views.

The demo starts with seeded orders in every state (pending, past-SLA, countered, approved, shipped, received with a discrepancy, rejected) so each screen has something to show. All state lives in memory and resets on reload.

**Try this:** sign in as Ironic → pick a location → Suggested Order → Submit. Then Switch account → store manager → Approvals → Approve. Switch back to Ironic → Orders → Ship. Finally, as the store manager → Receiving → Receive. Watch Q.O.H. and Invoice Logs update.

## Deployment

The site is published with GitHub Pages from the `gh-pages` branch, which holds the contents of `dist/` from `npm run build`. Vite's `base` is set to `/par-level-portal-demo/` so asset paths resolve under the Pages URL. To redeploy, build and push `dist/` to `gh-pages`, for example with `npx gh-pages -d dist`.

## Project layout

```
src/
  App.tsx          the demo (data generation, logic and all views)
  main.tsx         React entry; wraps the app in the theme provider
  kit/             small local UI kit used by the demo
    theme.tsx      light/dark theme object + provider (follows OS setting, toggle in header)
    components.tsx Page, Section, Grid, Table, Metrics, Segmented, Select, Button, Input, Toggle, Status, Steps, Properties, Rows, Callout, Text
    charts.tsx     simple SVG/CSS charts: LineChart, Bars, Heatmap, Scatter
```

Sample data is generated deterministically from a seeded hash, so every load looks the same.

## License

MIT. See [LICENSE](LICENSE).
