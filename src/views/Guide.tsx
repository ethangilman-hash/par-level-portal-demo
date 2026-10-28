// First-visit guidance: role palettes, a per-role intro banner with the suggested click path,
// and a short "what this tab is for" strip under each tab bar.
import { useGrokTheme, Button } from "../kit";
import type { GrokTheme, ReactNode } from "../kit";

export type Role = "retailer" | "vendor";

/** Role colors: retailer = emerald, vendor = indigo. Readable in light and dark mode. */
export function rolePalette(t: GrokTheme, role: Role) {
  const dark = t.kind === "dark";
  if (role === "retailer") {
    return dark
      ? { solid: "#10b981", strong: "#6ee7b7", text: "#d1fae5", sub: "#a7f3d0", bg: "#0f2a22", head: "#123828", border: "#10b981" }
      : { solid: "#047857", strong: "#065f46", text: "#064e3b", sub: "#065f46", bg: "#ecfdf5", head: "#d1fae5", border: "#10b981" };
  }
  return dark
    ? { solid: "#6366f1", strong: "#a5b4fc", text: "#e0e7ff", sub: "#c7d2fe", bg: "#181a3a", head: "#1f2250", border: "#6366f1" }
    : { solid: "#4338ca", strong: "#3730a3", text: "#1e1b4b", sub: "#3730a3", bg: "#eef2ff", head: "#e0e7ff", border: "#6366f1" };
}

export interface PathStep<T extends string> { tab: T; label: string; hint: string }

/** Banner at the top of each role: who you are, what this console is for, and the suggested click path. */
export function RoleBanner<T extends string>(props: {
  role: Role; title: string; intro: ReactNode; path: PathStep<T>[]; current: T; go: (tab: T) => void; tip?: ReactNode;
}) {
  const t = useGrokTheme();
  const c = rolePalette(t, props.role);
  return (
    <section data-testid={`${props.role}-guide`} style={{ border: `1px solid ${c.border}`, borderLeft: `6px solid ${c.solid}`, borderRadius: t.radius.lg, background: c.bg, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ background: c.solid, color: "#fff", borderRadius: t.radius.full, padding: "2px 10px", ...t.font.caption, fontWeight: t.weight.semibold, letterSpacing: 0.4, textTransform: "uppercase" }}>
          {props.role === "retailer" ? "Retailer" : "Vendor"}
        </span>
        <span style={{ ...t.font.heading3, fontWeight: t.weight.semibold, color: c.text }}>{props.title}</span>
      </div>
      <div style={{ ...t.font.body2, color: c.text }}>{props.intro}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "stretch" }} aria-label="Suggested click path">
        {props.path.map((s, i) => {
          const on = s.tab === props.current;
          return (
            <div key={s.tab} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button" onClick={() => props.go(s.tab)} aria-current={on ? "step" : undefined}
                style={{ all: "unset", cursor: "pointer", display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 12px", borderRadius: t.radius.md, maxWidth: 240,
                  background: on ? c.solid : t.bg.elevated, color: on ? "#fff" : c.text, border: `1px solid ${on ? c.solid : c.border}` }}>
                <span style={{ flex: "none", width: 20, height: 20, borderRadius: 10, display: "grid", placeItems: "center", ...t.font.caption, fontWeight: t.weight.semibold,
                  background: on ? "#fff" : c.solid, color: on ? c.solid : "#fff" }}>{i + 1}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ ...t.font.label, fontWeight: t.weight.semibold }}>{s.label}</span>
                  <span style={{ ...t.font.caption, opacity: on ? 0.92 : 0.85 }}>{s.hint}</span>
                </span>
              </button>
              {i < props.path.length - 1 ? <span aria-hidden style={{ color: c.solid, fontWeight: t.weight.semibold }}>→</span> : null}
            </div>
          );
        })}
      </div>
      {props.tip ? <div style={{ ...t.font.caption, color: c.sub }}>{props.tip}</div> : null}
    </section>
  );
}

export interface TabInfo { what: string; how?: string; next?: { label: string; go: () => void } }

/** One-line "what this tab is for / how to use it" strip shown directly under the tab bar. */
export function TabHelp(props: { role: Role; tab: string; info?: TabInfo }) {
  const t = useGrokTheme();
  const c = rolePalette(t, props.role);
  if (!props.info) return null;
  return (
    <div data-testid="tab-help" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 14px", borderRadius: t.radius.md, background: c.head, border: `1px solid ${c.border}` }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ ...t.font.body2, color: c.text }}><strong style={{ fontWeight: t.weight.semibold }}>{props.tab}: </strong>{props.info.what}</span>
        {props.info.how ? <span style={{ ...t.font.caption, color: c.sub }}>How to use it: {props.info.how}</span> : null}
      </div>
      {props.info.next ? <Button variant="primary" label={`Next: ${props.info.next.label} →`} onClick={props.info.next.go} /> : null}
    </div>
  );
}
