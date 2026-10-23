import type { MetrcAdapter, MetrcTransfer } from "../types";
import { mockCall } from "./common";
import { h } from "../../data";

/** 24-character sample package tag (Metrc-style: 1A4 + facility digits + serial). */
export const packageTagFor = (seed: string) => `1A4${String(Math.floor(h(seed + "fac") * 1e10)).padStart(10, "0")}${String(Math.floor(h(seed + "ser") * 1e11)).padStart(11, "0")}`;

export function createMockMetrc(seed: MetrcTransfer[]): MetrcAdapter {
  const transfers = new Map<string, MetrcTransfer>(seed.map((t) => [t.manifestNumber, t]));
  let manifestSeq = 4817400;
  let transferId = 91200;
  let adjSeq = 5100;
  const pkgQty = new Map<string, number>();
  for (const t of seed) for (const p of t.packages) pkgQty.set(p.label, p.quantity);
  return {
    createTransferManifest: (input) => mockCall(
      { provider: "metrc", direction: "push", operation: "createTransferManifest", endpoint: "POST /transfers/v2/templates/outgoing (licensed transfer; to confirm)", ref: input.invoiceNumber },
      () => {
        const manifestNumber = String(manifestSeq++).padStart(10, "0");
        const t: MetrcTransfer = {
          id: transferId++, manifestNumber, status: "In transit",
          packages: input.packages.map((p) => ({ sku: p.sku, label: packageTagFor(`${manifestNumber}-${p.sku}`), quantity: p.quantity })),
        };
        for (const p of t.packages) pkgQty.set(p.label, p.quantity);
        transfers.set(manifestNumber, t);
        return t;
      },
      (t) => `Manifest ${t.manifestNumber} · ${t.packages.length} packages tagged · ${input.shipperLicense} → ${input.recipientLicense}`,
    ),
    receiveTransfer: (input) => mockCall(
      { provider: "metrc", direction: "push", operation: "receiveTransfer", endpoint: "Incoming transfer receipt (endpoint to confirm; GET /transfers/v2/incoming to read)", ref: input.manifestNumber },
      () => {
        const t = transfers.get(input.manifestNumber);
        if (!t) throw new Error(`Manifest ${input.manifestNumber} not found in Metrc`);
        transfers.set(t.manifestNumber, { ...t, status: "Received" });
        const accepted = input.packages.reduce((s, p) => s + p.accepted, 0);
        const rejected = input.packages.reduce((s, p) => s + p.rejected, 0);
        return { manifestNumber: t.manifestNumber, accepted, rejected, adjustments: input.packages.filter((p) => p.rejected > 0).length };
      },
      (r) => `Manifest ${r.manifestNumber} received · ${r.accepted} accepted · ${r.rejected} rejected`,
    ),
    adjustPackages: (license, adjustments) => mockCall(
      { provider: "metrc", direction: "push", operation: "adjustPackages", endpoint: "POST /packages/v2/adjust", ref: license },
      () => {
        for (const a of adjustments) pkgQty.set(a.label, (pkgQty.get(a.label) ?? 0) + a.quantity);
        return { ids: adjustments.map(() => adjSeq++) };
      },
      (r) => `${r.ids.length} package adjustments (${adjustments.map((a) => a.reason).join(", ")})`,
    ),
    getLabResults: (label) => mockCall(
      { provider: "metrc", direction: "pull", operation: "getLabResults", endpoint: "GET /labtests/v2/results?packageId=", ref: label.slice(-8) },
      () => [
        { packageLabel: label, testTypeName: "Total THC (%)", testResultLevel: (18 + h(label) * 12).toFixed(2), testPassed: true, testPerformedDate: "2026-10-02" },
        { packageLabel: label, testTypeName: "Pesticides", testResultLevel: "ND", testPassed: true, testPerformedDate: "2026-10-02" },
      ],
      (r) => `${r.length} lab results`,
    ),
    getTransfer: (manifest) => mockCall(
      { provider: "metrc", direction: "pull", operation: "getTransfer", endpoint: "GET /transfers/v2/incoming", ref: manifest },
      () => transfers.get(manifest) ?? null,
      (t) => (t ? `Manifest ${t.manifestNumber}: ${t.status}` : "Not found"),
    ),
  };
}
