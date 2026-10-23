import type { QboAccount, QboDoc, QuickBooksAdapter } from "../types";
import { mockCall } from "./common";

export interface QboSeedDoc { companyId: string; doc: QboDoc }

export function createMockQuickBooks(seed: QboSeedDoc[]): QuickBooksAdapter {
  const docs = new Map<string, QboDoc & { companyId: string }>();
  for (const s of seed) docs.set(`${s.companyId}|${s.doc.type}|${s.doc.DocNumber}`, { ...s.doc, companyId: s.companyId });
  let idSeq = 1840;
  let paySeq = 920;
  const find = (type: "Invoice" | "Bill", docNumber: string) => Array.from(docs.values()).find((d) => d.type === type && d.DocNumber === docNumber);
  return {
    createInvoice: (input) => mockCall(
      { provider: "quickbooks", direction: "push", operation: "createInvoice", endpoint: "POST /v3/company/{realmId}/invoice", ref: input.docNumber },
      () => {
        const total = Math.round(input.lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
        const d: QboDoc = { Id: String(idSeq++), DocNumber: input.docNumber, TotalAmt: total, Balance: total, type: "Invoice" };
        docs.set(`${input.companyId}|Invoice|${input.docNumber}`, { ...d, companyId: input.companyId });
        return d;
      },
      (d) => `Invoice ${d.DocNumber} (Id ${d.Id}) to ${input.customerName} · $${d.TotalAmt.toFixed(2)} in the vendor's company`,
    ),
    createBill: (input) => mockCall(
      { provider: "quickbooks", direction: "push", operation: "createBill", endpoint: "POST /v3/company/{realmId}/bill", ref: input.docNumber },
      () => {
        const total = Math.round(input.lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
        const d: QboDoc = { Id: String(idSeq++), DocNumber: input.docNumber, TotalAmt: total, Balance: total, type: "Bill" };
        docs.set(`${input.companyId}|Bill|${input.docNumber}`, { ...d, companyId: input.companyId });
        return d;
      },
      (d) => `Bill ${d.DocNumber} (Id ${d.Id}) from ${input.vendorName} · $${d.TotalAmt.toFixed(2)} in the retailer's company`,
    ),
    recordPayment: (input) => mockCall(
      { provider: "quickbooks", direction: "push", operation: "recordPayment", endpoint: "POST /v3/company/{realmId}/billpayment + /payment", ref: input.docNumber },
      () => {
        const inv = find("Invoice", input.docNumber);
        const bill = find("Bill", input.docNumber);
        if (inv) docs.set(`${inv.companyId}|Invoice|${inv.DocNumber}`, { ...inv, Balance: Math.max(0, Math.round((inv.Balance - input.amount) * 100) / 100) });
        if (bill) docs.set(`${bill.companyId}|Bill|${bill.DocNumber}`, { ...bill, Balance: Math.max(0, Math.round((bill.Balance - input.amount) * 100) / 100) });
        return { paymentId: `P-${paySeq++}`, billPaymentId: `BP-${paySeq++}` };
      },
      (r) => `$${input.amount.toFixed(2)} on ${input.docNumber}: BillPayment ${r.billPaymentId} (retailer) + Payment ${r.paymentId} (vendor)`,
    ),
    getAccounts: (companyId) => mockCall(
      { provider: "quickbooks", direction: "pull", operation: "getAccounts", endpoint: "GET /v3/company/{realmId}/query?query=select * from Account", ref: companyId },
      (): QboAccount[] => {
        const ap = Array.from(docs.values()).filter((d) => d.companyId === companyId && d.type === "Bill").reduce((s, d) => s + d.Balance, 0);
        const ar = Array.from(docs.values()).filter((d) => d.companyId === companyId && d.type === "Invoice").reduce((s, d) => s + d.Balance, 0);
        return [
          { Id: "35", Name: "Operating checking (credit union)", AccountType: "Bank", CurrentBalance: 186420.55 },
          { Id: "36", Name: "Cash on hand: registers & safe", AccountType: "Bank", CurrentBalance: 0 },
          { Id: "84", Name: "Accounts Receivable (A/R)", AccountType: "Accounts Receivable", CurrentBalance: Math.round(ar * 100) / 100 },
          { Id: "33", Name: "Accounts Payable (A/P)", AccountType: "Accounts Payable", CurrentBalance: Math.round(ap * 100) / 100 },
          { Id: "89", Name: "Sales tax payable: OR state + local", AccountType: "Other Current Liability", CurrentBalance: 0 },
          { Id: "91", Name: "Loyalty points liability", AccountType: "Other Current Liability", CurrentBalance: 0 },
          { Id: "79", Name: "Inventory asset", AccountType: "Other Current Asset", CurrentBalance: 0 },
        ];
      },
      (r) => `${r.length} accounts`,
    ),
  };
}
