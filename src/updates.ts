// Dated release notes shown in the "Updates" dropdown under "How the demo works".
// Every note is approved by the owner before it is published; text is kept exactly as approved.
export interface UpdateNote {
  /** Header line, exactly as approved (includes date, time and author). */
  header: string;
  /** Bullet lines, exactly as approved. */
  bullets: string[];
}

export const UPDATES: UpdateNote[] = [
  {
    header: "October 22, 2026 - 10:57p.m. Ethan Gilman added:",
    bullets: [
      "Default: light mode",
      "Vendor & Retailer accounts: updated mapping to metrc, leaflink, dutchie, and quickbooks optimal api integration - awaiting secure version of demo / awaiting api integration",
      "Design update: Project Leaflink swagger-jack",
      "Retailer live inventory view added",
      "Vendor & Retailer accounts: added account view with preferences",
    ],
  },
];
