# Integrations

The portal talks to four outside systems through a typed adapter layer in `src/integrations/`. **The public demo only ever uses the mock adapters.** They return deterministic sample data, add a short simulated latency, and write each call to the in-app sync log (Integrations tab). The app makes no network calls and holds no credentials.

Everything here is based on the providers' public documentation. Anything marked **(to confirm)** could not be verified there and must be checked against the provider's current docs or sandbox before going live. No endpoints have been invented. Where the docs were unclear, the adapter method is named for what it does and the endpoint is left as "to confirm".

## Layout

| File | Purpose |
|---|---|
| `src/integrations/types.ts` | Typed interface for each provider (`DutchieAdapter`, `LeafLinkAdapter`, `MetrcAdapter`, `QuickBooksAdapter`) plus the request and response shapes |
| `src/integrations/config.ts` | The single mock/live switch, per-provider overrides, base URLs, auth notes, placeholder env var names |
| `src/integrations/mock/*.ts` | Mock implementations seeded from the demo's sample data |
| `src/integrations/live.ts` | Live stubs. They reject with "not configured" and never call `fetch` |
| `src/integrations/syncLog.ts` | In-memory sync log rendered on the Integrations tab |
| `src/integrations/mapping.ts` | "Used by" lists and field-mapping tables (source of the tables below) |
| `src/integrations/index.ts` | The `integrations` singleton that the app calls, plus external-ID helpers |

## Mock / live switch

```
VITE_INTEGRATIONS_MODE=mock      # default; "live" opts every provider into the live adapter
VITE_DUTCHIE_MODE=mock|live      # per-provider overrides
VITE_LEAFLINK_MODE=mock|live
VITE_METRC_MODE=mock|live
VITE_QUICKBOOKS_MODE=mock|live
VITE_INTEGRATIONS_PROXY_URL=     # live mode: the browser calls this server-side proxy, never the providers directly
```

API keys must never be shipped in a browser bundle. The env var names below are **placeholders for a server-side proxy** that would hold the secrets. This demo never reads them.

| Provider | Placeholder env vars (server-side) |
|---|---|
| Dutchie POS | `DUTCHIE_API_KEY_SOUTH_MAIN`, `DUTCHIE_API_KEY_EASTGATE`, `DUTCHIE_API_KEY_RIVERSIDE` (Dutchie keys are per location) |
| LeafLink | `LEAFLINK_API_KEY`, `LEAFLINK_COMPANY_ID`, `LEAFLINK_BASE_URL` |
| Metrc | `METRC_VENDOR_API_KEY`, `METRC_USER_API_KEY`, `METRC_LICENSE_NUMBER`, `METRC_BASE_URL` |
| QuickBooks Online | `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REDIRECT_URI`, `QBO_REALM_ID_RETAILER`, `QBO_REALM_ID_<VENDOR>`, `QBO_ENVIRONMENT` |

## Providers (from the public docs)

### Dutchie POS
- Docs: https://api.pos.dutchie.com/swagger/index.html. Base `https://api.pos.dutchie.com`. Auth: HTTP Basic with the location API key as the username.
- Used: `GET /reporting/inventory` (menu, quantities, prices, package IDs, lab results with `includeLabResults`), `POST /inventory/receiveinventory`, `GET /reporting/transactions`, `GET /discounts/v2/list` and `/reporting/discounts`, `GET /reporting/loyalty-snapshot`, `GET /reporting/cash-summary`, `GET /vendor/vendors`, `GET /customer/customers`.
- To confirm: the exact keys for THC in the lab results, how bulk flower in grams is reported (`quantityUnits`), and the rate limits per key.

### LeafLink (v2 API, legacy docs)
- Docs: https://developer.leaflink.com/legacy/v2/. Base `https://app.leaflink.com/api/v2/`. Auth header `Authorization: App {API_KEY}`.
- Used: `/orders-received/` (create, read), `/orders-received/{number}/transition/{action}/` (accept, reject, ship, complete; exact action names to confirm), line items, order comments, `/order-payments/`, `/customers/`, `/contacts/`, `/activity-entries/`, `/customer-statuses/`, `/companies/`.
- To confirm: whether a buyer (retailer) company can create orders and set account preferences through the API, how counter-proposals are expressed (line-item PATCH and/or comment), and whether a newer API version replaces v2.

### Metrc (Oregon)
- Docs: the state's Metrc API documentation. The Oregon base URL `https://api-or.metrc.com` is **to confirm**. Auth: HTTP Basic with the integrator (vendor) key and the user key; most calls take `licenseNumber`.
- Used: `POST /transfers/v2/templates/outgoing` (destinations with `RecipientLicenseNumber`, `InvoiceNumber`, `EstimatedDepartureDateTime` / `EstimatedArrivalDateTime`, transporters, packages with `PackageLabel` and `WholesalePrice`), `GET /transfers/v2/incoming`, `GET /transfers/v2/deliveries/{id}/packages`, `POST /packages/v2/adjust`, `GET /labtests/v2/results`.
- To confirm: the endpoint for accepting or rejecting incoming packages (the adapter method is `receiveTransfer`), whether the manifest number comes back on create or from a follow-up GET, and the adjustment reason names for Oregon.

### QuickBooks Online (Accounting API v3)
- Docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice. Base `https://quickbooks.api.intuit.com/v3/company/{realmId}`. Auth: OAuth 2.0 (`com.intuit.quickbooks.accounting`).
- Used: `Invoice` (vendor's company), `Bill` (retailer's company), `BillPayment` with `LinkedTxn` `TxnType: Bill` (retailer), `Payment` with `LinkedTxn` `TxnType: Invoice` (vendor), and an `Account` query for ledger balances.
- To confirm: whether each vendor connects its own QBO company (one realm per vendor), item-based vs account-based bill lines, and the rules for matching Customer and Vendor records.

## Portal actions → adapter calls

| Portal action | Calls (in order) |
|---|---|
| Open the portal / every 60 s / "Sync now" | `dutchie.getInventory(location)` for every location. Updates Q.O.H. and the retailer Inventory menu |
| Vendor submits a suggested order | `leaflink.createOrder` (PO number in `external_id_buyer`). If the retailer's **auto-approve under** limit for that vendor applies: `leaflink.syncOrder(accept)` |
| Retailer approves / approves with edits | `leaflink.syncOrder` with `transition: accept`, line quantities and a comment |
| Retailer counter-proposes | `leaflink.syncOrder` with line quantities and a comment |
| Retailer rejects / vendor accepts a counter | `leaflink.syncOrder` (`reject` / `accept`) |
| Vendor ships | `metrc.createTransferManifest` (returns the manifest number and one package tag per line), then `leaflink.syncOrder(ship)` |
| Retailer receives | `metrc.receiveTransfer` (+ `metrc.adjustPackages` for damage), `dutchie.receiveInventory`, then re-pull inventory, `quickbooks.createInvoice` (vendor company) + `quickbooks.createBill` (retailer company), `leaflink.syncOrder(complete)` |
| Record payment | `quickbooks.recordPayment` (BillPayment on the retailer side + Payment on the vendor side), `leaflink.recordOrderPayment` |
| Finance tab | `dutchie.getSales`, `getDiscounts`, `getLoyaltySummary`, `getCashSummary`, `quickbooks.getAccounts` |
| Vendor → Retailers → save preferences | `leaflink.updateCustomer` (`delivery_preferences`, `directions`, `next_contact_date`, `status`) |
| Vendor → Retailers → add note | `leaflink.createActivityEntry` (private to the vendor) |
| Add contact (vendor side) | `leaflink.createContact` |
| Retailer → Vendors → save preferences | `leaflink.saveBuyerPreferences` (**to confirm**: no buyer-side account field was confirmed in the docs, so the demo keeps these in the app) |
| Retailer → Vendors → add note | Kept in the app only (private to the retailer; no LeafLink buyer-side private notes field confirmed) |

## Account preferences & notes

Both sides keep an account page per trading partner: the retailer has **Vendors**, the vendor has **Retailers**.

- **Delivery frequency** (Weekly / Bi-weekly / Monthly = 7 / 14 / 28 days), **preferred day** and **window** drive the *next expected delivery* and the *order-by date* (next delivery minus the vendor's lead time). They are shown on the account page and in Suggested Order, where the velocity review period defaults to the delivery interval.
- **Receiving location, contact, instructions** map to LeafLink Customer `directions` / `delivery_preferences` (free text) on the vendor side.
- **Auto-approve under $X** (retailer → vendor) is enforced in the portal at submit time and syncs to LeafLink as an `accept` transition.
- **Notes are private to the side that wrote them.** They show as a timestamped feed with the author. Vendor notes map to LeafLink activity entries (the `type` value is to confirm). Retailer notes stay in the portal.

## Field mapping

### Dutchie POS: functions that use it

| Function in the portal | Adapter method |
|---|---|
| Retailer Inventory tab (menu, quantities, prices, THC) | `dutchie.getInventory` |
| Vendor Q.O.H., Par Levels, Suggested Order, Below par, Alerts | `dutchie.getInventory` |
| Receiving: increase store inventory | `dutchie.receiveInventory` |
| Finance: sales, tax, COGS, payment mix | `dutchie.getSales` |
| Finance: discounts & promotions | `dutchie.getDiscounts` |
| Finance: loyalty | `dutchie.getLoyaltySummary` |
| Finance: cash management / safe log | `dutchie.getCashSummary` |

### Dutchie POS: field mapping

| Our field | Provider object | Provider field | Direction | Trigger |
|---|---|---|---|---|
| SKU | ReportingInventoryItem | sku / productId | Pull | Every 60 s, Sync now, after receiving |
| Q.O.H. (units) | ReportingInventoryItem | quantityAvailable + quantityUnits | Pull | Every 60 s, Sync now, after receiving |
| Bulk flower on hand (g) | ReportingInventoryItem | quantityAvailable (quantityUnits = grams; to confirm) | Pull | Every 60 s, Sync now |
| Product name, brand | ReportingInventoryItem | productName, brandName | Pull | Every 60 s |
| Category / subcategory | ReportingInventoryItem | masterCategory / category | Pull | Every 60 s |
| Strain type | ReportingInventoryItem | strainType | Pull | Every 60 s |
| Size / weight option | ReportingInventoryItem | size, unitWeight, unitWeightUnit | Pull | Every 60 s |
| Shelf price, unit cost | ReportingInventoryItem | unitPrice (recUnitPrice), unitCost | Pull | Every 60 s |
| THC | ReportingInventoryItem | labResults (includeLabResults=true; exact keys to confirm) | Pull | Every 60 s |
| Metrc package tag | ReportingInventoryItem | packageId | Pull | Every 60 s |
| Received units (per line) | ReceiveInventorySave.items[] | productId, quantity, unitType, packageId, cost | Push | Retailer clicks Receive |
| Vendor, PO, delivery | ReceiveInventorySave | vendorId, vendorLicense, deliveredBy, deliveredOn, externalId, orderTitle | Push | Retailer clicks Receive |
| Weekly unit sales (velocity) | Transaction.items[] | productId, quantity (to confirm), transactionDate | Pull | Nightly + Finance open |
| Gross, discounts, returns, net | Transaction | subtotal, totalDiscount, isReturn, totalBeforeTax | Pull | Finance open / Sync now |
| Tax collected (state, local) | Transaction | tax, taxSummary[] | Pull | Finance open / Sync now |
| Payment mix | Transaction | cashPaid, debitPaid, electronicPaid | Pull | Finance open / Sync now |
| Promotions | DiscountApiResponse | id, discountDescription, discountCode, applicationMethod, isActive, isLoyaltyMemberOnly | Pull | Finance open |
| Loyalty points | LoyaltySnapshot | customerId, loyaltyBalance, loyaltyEarned, loyaltySpent | Pull | Finance open |
| Register / safe counts | RegisterCashSummary | terminalName, startingBalance, endingBalance, deposits, overShort | Pull | Finance open |

### LeafLink: functions that use it

| Function in the portal | Adapter method |
|---|---|
| Vendor: submit suggested order | `leaflink.createOrder` |
| Retailer: approve / reject | `leaflink.syncOrder (accept / reject)` |
| Retailer: counter-proposal; vendor: accept counter | `leaflink.syncOrder (line items + comment, accept)` |
| Vendor: ship; retailer: receive | `leaflink.syncOrder (ship / complete)` |
| Retailer: record payment | `leaflink.recordOrderPayment` |
| Vendor → Retailers tab: account preferences | `leaflink.updateCustomer` |
| Vendor → Retailers tab: private notes | `leaflink.createActivityEntry` |
| Both: add contact | `leaflink.createContact` |
| Retailer → Vendors tab: preferences | `leaflink.saveBuyerPreferences (to confirm)` |

### LeafLink: field mapping

| Our field | Provider object | Provider field | Direction | Trigger |
|---|---|---|---|---|
| PO number | Order (orders-received) | external_id_buyer | Push | Vendor submits order |
| LeafLink order id | Order | number, short_id | Pull | Response to create |
| Vendor | Order | seller (company id) | Push | Vendor submits order |
| Retailer location | Order | customer.id | Push | Vendor submits order |
| Line SKU, qty, unit cost | Line item | product, quantity, ordered_unit_price.amount | Push | Submit, counter, approve |
| Payment terms | Order | payment_term | Push | Vendor submits order |
| Order status | Order | status via POST transition/{accept/reject/ship/complete} | Both | Approve, reject, ship, receive |
| Counter-proposal quantities | Line item | quantity (PATCH line-items; to confirm) | Push | Retailer counters |
| Notes | Order comments | comments endpoint (fields to confirm) | Push | Any note / counter |
| Package tags | Line item | package_tags | Push | Vendor ships |
| Payment | Order payment | order-payments (fields to confirm) | Push | Record payment |
| Location account (vendor side) | Customer | id, name, license_number, external_id | Both | Retailers tab |
| Delivery frequency, day, window | Customer | delivery_preferences (free text) | Push | Save preferences (vendor) |
| Delivery instructions | Customer | directions | Push | Save preferences (vendor) |
| Next expected order date | Customer | next_contact_date | Push | Save preferences (vendor) |
| Account status (Active / Paused) | Customer | status (CompanyCustomerStatus id; mapping to confirm) | Push | Save preferences (vendor) |
| Payment terms / minimum | Customer | payment_term (id); minimum order to confirm | Pull | Retailers tab |
| Private notes (vendor) | CompanyActivityEntry | customer, entry, date, author, type (to confirm) | Push | Add note |
| Contacts | Contact | first_name, last_name, email, phone (+ customer link; to confirm) | Both | Add contact |
| Retailer's vendor preferences | Order | delivery_preferences on orders (buyer-side account field to confirm) | Push | Save preferences (retailer) |
| Private notes (retailer) | — | Kept in our app; no buyer-side private notes field confirmed | Push | Add note |

### Metrc: functions that use it

| Function in the portal | Adapter method |
|---|---|
| Vendor: ship (transfer manifest + package tags) | `metrc.createTransferManifest` |
| Retailer: receive (accept / reject packages) | `metrc.receiveTransfer` |
| Retailer: damaged units | `metrc.adjustPackages` |
| Lab results / potency | `metrc.getLabResults` |

### Metrc: field mapping

| Our field | Provider object | Provider field | Direction | Trigger |
|---|---|---|---|---|
| Manifest number | Transfer | ManifestNumber | Pull | Vendor ships |
| PO number | Transfer template destination | InvoiceNumber | Push | Vendor ships |
| Store license | Transfer template destination | RecipientLicenseNumber | Push | Vendor ships |
| Ship time / ETA | Transfer template destination | EstimatedDepartureDateTime / EstimatedArrivalDateTime | Push | Vendor ships |
| Carrier | Transfer template transporter | TransporterFacilityLicenseNumber, DriverName, Vehicle* | Push | Vendor ships |
| Package tag per line | Transfer template package | PackageLabel | Push | Vendor ships |
| Unit cost | Transfer template package | WholesalePrice | Push | Vendor ships |
| Received / rejected units | Incoming transfer packages | accept / reject per package (endpoint to confirm) | Push | Retailer receives |
| Damaged units | Package adjustment | Label, Quantity, UnitOfMeasure, AdjustmentReason, AdjustmentDate | Push | Receive with damages |
| THC / test results | Lab test result | PackageId, TestTypeName, TestResultLevel, TestPassed | Pull | On demand |

### QuickBooks Online: functions that use it

| Function in the portal | Adapter method |
|---|---|
| Receiving: auto-invoice in the vendor's company | `quickbooks.createInvoice` |
| Receiving: bill in the retailer's company | `quickbooks.createBill` |
| Invoices / Finance payables: record payment | `quickbooks.recordPayment` |
| Finance: ledger balances (bank, A/P) | `quickbooks.getAccounts` |

### QuickBooks Online: field mapping

| Our field | Provider object | Provider field | Direction | Trigger |
|---|---|---|---|---|
| Invoice number (vendor side) | Invoice | DocNumber | Push | Retailer receives |
| Retailer location | Invoice | CustomerRef | Push | Retailer receives |
| Accepted lines | Invoice | Line[].SalesItemLineDetail (ItemRef, Qty, UnitPrice), Amount | Push | Retailer receives |
| Invoice date / due date | Invoice / Bill | TxnDate, DueDate (terms Net 7/14) | Push | Retailer receives |
| Bill (retailer side) | Bill | VendorRef, DocNumber, Line[] (item vs account-based expense to confirm) | Push | Retailer receives |
| Payment (retailer side) | BillPayment | VendorRef, TotalAmt, PayType, Line[].LinkedTxn {TxnId, TxnType: Bill} | Push | Record payment |
| Payment (vendor side) | Payment | CustomerRef, TotalAmt, Line[].LinkedTxn {TxnType: Invoice} | Push | Record payment |
| Open balance | Invoice / Bill | Balance | Pull | Finance open / Sync now |
| Vendors & locations | Vendor / Customer | DisplayName, Id | Both | Setup / first use (matching rule to confirm) |
| Ledger balances | Account | Name, AccountType, CurrentBalance | Pull | Finance open / Sync now |


