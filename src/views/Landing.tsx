// Start page: exactly two entry paths, Retail log in and Vendor log in. Demo only, no credentials.
import { useGrokTheme } from "../kit";
import { rolePalette, type Role } from "./Guide";

interface Option { role: Role; cta: string; who: string; blurb: string; sees: string[] }

export function Landing(props: { retailer: string; vendor: string; onEnter: (role: Role) => void }) {
  const t = useGrokTheme();
  const options: Option[] = [
    {
      role: "retailer", cta: "Retail log in", who: `${props.retailer} · store manager`,
      blurb: "Run the store side: see what's on the shelf, what's owed, and approve what vendors want to send.",
      sees: ["Inventory: live menu stock vs par, Below par and Performance charts", "Finance: payables, sales, margin and cash", "Vendors: an account page for every brand on the menu, with delivery preferences", "Orders: approve, counter or reject, receive shipments, order history and invoices"],
    },
    {
      role: "vendor", cta: "Vendor log in", who: `${props.vendor} · vendor sales rep`,
      blurb: "Run the brand side: watch your stock and par at each store, build the order, and ship once it's approved.",
      sees: ["Inventory & par: Q.O.H. and Min / Max for your SKUs per store", "Suggested Order: build an order from par or sales velocity", "Orders: ship after the retailer approves", "Retailers: account pages with delivery schedule, contacts and notes"],
    },
  ];
  return (
    <section data-testid="landing" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ borderRadius: t.radius.xl, padding: "28px 28px 24px", background: t.kind === "dark" ? "#141a2e" : "#0f172a", color: "#f8fafc", display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ ...t.font.caption, fontWeight: t.weight.semibold, letterSpacing: 0.6, textTransform: "uppercase", color: "#93c5fd" }}>Interactive demo</span>
        <h2 style={{ margin: 0, ...t.font.heading1, fontWeight: t.weight.semibold }}>Choose how you want to log in</h2>
        <p style={{ margin: 0, ...t.font.body1, color: "#cbd5e1" }}>Click through a working vendor-managed inventory portal. Everything runs on sample data until the real APIs are plugged in.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {options.map((o) => {
          const c = rolePalette(t, o.role);
          return (
            <button key={o.role} type="button" data-testid={`login-${o.role}`} onClick={() => props.onEnter(o.role)}
              style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", display: "flex", flexDirection: "column", gap: 12, padding: 20, borderRadius: t.radius.lg,
                background: c.bg, border: `1px solid ${c.border}`, borderTop: `6px solid ${c.solid}`, color: c.text, boxShadow: "0 1px 3px rgba(15,23,42,0.08)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span aria-hidden style={{ width: 40, height: 40, borderRadius: 20, background: c.solid, color: "#fff", display: "grid", placeItems: "center", ...t.font.heading3, fontWeight: t.weight.semibold }}>{o.role === "retailer" ? "R" : "V"}</span>
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ ...t.font.heading2, fontWeight: t.weight.semibold, color: c.text }}>{o.cta}</span>
                  <span style={{ ...t.font.caption, color: c.sub }}>Demo account: {o.who}</span>
                </span>
              </span>
              <span style={{ ...t.font.body2, color: c.text }}>{o.blurb}</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ ...t.font.caption, fontWeight: t.weight.semibold, color: c.sub, textTransform: "uppercase", letterSpacing: 0.4 }}>What you'll see</span>
                {o.sees.map((s) => <span key={s} style={{ ...t.font.body2, color: c.text }}>• {s}</span>)}
              </span>
              <span style={{ alignSelf: "flex-start", marginTop: 4, padding: "9px 18px", borderRadius: t.radius.md, background: c.solid, color: "#fff", ...t.font.body2, fontWeight: t.weight.semibold }}>{o.cta} →</span>
            </button>
          );
        })}
      </div>
      <div style={{ ...t.font.caption, color: t.text.secondary }}>No passwords: click a card to enter. Brands are parody names; nothing is sent or charged. Tip: start as the vendor, submit an order, then switch to Retail log in to approve it.</div>
    </section>
  );
}
