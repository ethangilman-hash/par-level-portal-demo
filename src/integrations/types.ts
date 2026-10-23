// Typed adapter interfaces, one per provider. Shapes mirror the public API objects where the docs confirm them
// (see docs/INTEGRATIONS.md); fields marked "to confirm" there are best guesses that need checking against a live account.

export type ProviderId = "dutchie" | "leaflink" | "metrc" | "quickbooks";
export type IntegrationMode = "mock" | "live";

export interface Money { amount: number; currency: "USD" }

// ─────────────────────────── Dutchie POS (retail inventory, menu, sales, discounts, loyalty, customers)
/** Subset of Dutchie's ReportingInventoryItem (GET /reporting/inventory). */
export interface DutchieInventoryItem {
  inventoryId: string; productId: string; sku: string; productName: string; brandName: string;
  category: string; masterCategory: string; strainType: string; size: string;
  quantityAvailable: number; quantityUnits: "Each" | "Grams";
  unitPrice: number; unitCost: number; vendorId: string | null; vendor: string | null;
  packageId: string | null; lastModifiedDateUtc: string;
}
export interface DutchieReceiveItem { productId: string; quantity: number; unitType: "Each" | "Grams"; packageId?: string; cost: number; price?: number }
/** Subset of Dutchie's ReceiveInventorySave (POST /inventory/receiveinventory). */
export interface DutchieReceiveRequest {
  locationId: string; vendorId: string; vendorLicense: string; deliveredBy: string; deliveredOn: string;
  transactionId: string; orderTitle: string; externalId: string; note?: string; items: DutchieReceiveItem[];
}
export interface DutchieReceiveResult { receiveId: string; itemsReceived: number }
export interface DutchieSalesWeek {
  weekStart: string; transactions: number; grossSales: number; discounts: number; returns: number; netSales: number;
  stateTax: number; localTax: number; cogs: number; cashPaid: number; debitPaid: number; electronicPaid: number;
  loyaltyEarned: number; loyaltySpent: number;
}
export interface DutchieDiscount {
  id: number; discountDescription: string; discountCode: string | null; applicationMethod: string; isActive: boolean;
  isLoyaltyMemberOnly: boolean; brandFunded: boolean; redemptions: number; amountDiscounted: number; salesWithDiscount: number; marginImpactPts: number;
}
export interface DutchieLoyaltySummary {
  members: number; activeMembers90d: number; pointsIssued: number; pointsRedeemed: number; outstandingPoints: number;
  pointValue: number; tiers: { name: string; members: number; spendShare: number }[];
}
/** Subset of Dutchie's RegisterCashSummary (GET /reporting/cash-summary). */
export interface DutchieCashSummary { terminalName: string; date: string; startingBalance: number; sales: number; returns: number; deposits: number; adjustments: number; endingBalance: number; overShort: number }

export interface DutchieAdapter {
  getInventory(locationId: string): Promise<DutchieInventoryItem[]>;
  receiveInventory(req: DutchieReceiveRequest): Promise<DutchieReceiveResult>;
  getSales(locationId: string | "all", weeks: number): Promise<DutchieSalesWeek[]>;
  getDiscounts(locationId: string | "all"): Promise<DutchieDiscount[]>;
  getLoyaltySummary(locationId: string | "all"): Promise<DutchieLoyaltySummary>;
  getCashSummary(locationId: string | "all"): Promise<DutchieCashSummary[]>;
}

// ─────────────────────────── LeafLink (wholesale B2B orders)
export type LeafLinkOrderStatus = "Submitted" | "Accepted" | "Backorder" | "Fulfilled" | "Shipped" | "Complete" | "Rejected" | "Cancelled";
export type LeafLinkTransition = "accept" | "reject" | "fulfill" | "ship" | "complete" | "cancel";
export interface LeafLinkLineItem { product: string; sku: string; quantity: number; ordered_unit_price: Money; notes?: string; package_tags?: string[] }
export interface LeafLinkOrderInput {
  external_id_buyer: string; seller: string; customer: string; locationId: string;
  payment_term: string; line_items: LeafLinkLineItem[]; notes?: string;
}
export interface LeafLinkOrder { number: string; short_id: string; status: LeafLinkOrderStatus; total: Money; external_id_buyer: string; seller: string; line_items: LeafLinkLineItem[]; comments: string[] }
export interface LeafLinkSyncInput {
  number: string;
  /** Status transition to apply, if any. */
  transition?: LeafLinkTransition;
  /** Updated line quantities (counter-proposal or approved quantities). */
  line_items?: { sku: string; quantity: number }[];
  comment?: string;
}

/** Subset of the v2 Customer object (seller-side CRM record for a buyer). */
export interface LeafLinkCustomerUpdate {
  customer: string; delivery_preferences?: string; directions?: string; next_contact_date?: string; status?: string; notes?: string;
}
/** v2 activity-entries: CRM entries visible to the seller company only. `type` values are to confirm. */
export interface LeafLinkActivityEntry { customer: string; entry: string; date: string; type: string; author: string }
export interface LeafLinkContactInput { customer: string; first_name: string; last_name: string; email: string; phone: string; role: string; is_primary: boolean }
/** Retailer (buyer) side vendor preferences. No confirmed buyer-side endpoint in the v2 docs (to confirm). */
export interface LeafLinkBuyerPrefs { seller: string; delivery_preferences: string; auto_approve_under: number; private_note?: string }

export interface LeafLinkAdapter {
  updateCustomer(input: LeafLinkCustomerUpdate): Promise<{ id: string }>;
  createActivityEntry(input: LeafLinkActivityEntry): Promise<{ id: number }>;
  createContact(input: LeafLinkContactInput): Promise<{ id: number }>;
  saveBuyerPreferences(input: LeafLinkBuyerPrefs): Promise<{ stored: "app" | "leaflink" }>;
  createOrder(input: LeafLinkOrderInput): Promise<LeafLinkOrder>;
  syncOrder(input: LeafLinkSyncInput): Promise<LeafLinkOrder>;
  getOrder(number: string): Promise<LeafLinkOrder | null>;
  recordOrderPayment(number: string, amount: number, date: string): Promise<{ id: string }>;
}

// ─────────────────────────── Metrc (packages, tags, transfer manifests, receiving, adjustments, lab results)
export interface MetrcPackageIn { sku: string; itemName: string; quantity: number; unitOfMeasure: "Each" | "Grams"; wholesalePrice: number }
export interface MetrcTransferInput {
  shipperLicense: string; recipientLicense: string; recipientName: string; invoiceNumber: string;
  estimatedDeparture: string; estimatedArrival: string; transporter: string; packages: MetrcPackageIn[];
}
export interface MetrcTransfer { id: number; manifestNumber: string; packages: { sku: string; label: string; quantity: number }[]; status: "Pending" | "In transit" | "Received" }
export interface MetrcReceiveInput {
  recipientLicense: string; manifestNumber: string;
  packages: { label: string; accepted: number; rejected: number; reason?: string }[];
}
export interface MetrcReceiveResult { manifestNumber: string; accepted: number; rejected: number; adjustments: number }
export interface MetrcAdjustment { label: string; quantity: number; unitOfMeasure: "Each" | "Grams"; reason: string; note?: string; date: string }
export interface MetrcLabResult { packageLabel: string; testTypeName: string; testResultLevel: string; testPassed: boolean; testPerformedDate: string }

export interface MetrcAdapter {
  createTransferManifest(input: MetrcTransferInput): Promise<MetrcTransfer>;
  receiveTransfer(input: MetrcReceiveInput): Promise<MetrcReceiveResult>;
  adjustPackages(licenseNumber: string, adjustments: MetrcAdjustment[]): Promise<{ ids: number[] }>;
  getLabResults(packageLabel: string): Promise<MetrcLabResult[]>;
  getTransfer(manifestNumber: string): Promise<MetrcTransfer | null>;
}

// ─────────────────────────── QuickBooks Online (invoices, bills, payments, vendors/customers, chart of accounts)
export interface QboLine { description: string; qty: number; unitPrice: number; amount: number }
export interface QboDocInput { docNumber: string; txnDate: string; dueDate: string; lines: QboLine[]; privateNote?: string }
export interface QboInvoiceInput extends QboDocInput { companyId: string; customerName: string }
export interface QboBillInput extends QboDocInput { companyId: string; vendorName: string }
export interface QboDoc { Id: string; DocNumber: string; TotalAmt: number; Balance: number; type: "Invoice" | "Bill" }
export interface QboPaymentInput { docNumber: string; amount: number; txnDate: string; payType: "Check" | "CreditCard"; vendorCompanyId: string; retailerCompanyId: string }
export interface QboPaymentResult { paymentId: string; billPaymentId: string }
export interface QboAccount { Id: string; Name: string; AccountType: string; CurrentBalance: number }

export interface QuickBooksAdapter {
  /** Vendor's QuickBooks company: A/R invoice to the retailer. */
  createInvoice(input: QboInvoiceInput): Promise<QboDoc>;
  /** Retailer's QuickBooks company: A/P bill from the vendor. */
  createBill(input: QboBillInput): Promise<QboDoc>;
  /** Records a Payment against the vendor invoice and a BillPayment against the retailer bill. */
  recordPayment(input: QboPaymentInput): Promise<QboPaymentResult>;
  getAccounts(companyId: string): Promise<QboAccount[]>;
}

export interface Integrations {
  mode: Record<ProviderId, IntegrationMode>;
  dutchie: DutchieAdapter;
  leaflink: LeafLinkAdapter;
  metrc: MetrcAdapter;
  quickbooks: QuickBooksAdapter;
}

// ─────────────────────────── sync log
export interface SyncEvent {
  id: number;
  /** Wall-clock time the adapter call finished (viewer's clock). */
  at: number;
  provider: ProviderId;
  mode: IntegrationMode;
  direction: "pull" | "push";
  operation: string;
  /** Endpoint / object the call maps to (from the public docs; "to confirm" where unverified). */
  endpoint: string;
  ref: string;
  summary: string;
  ok: boolean;
}
