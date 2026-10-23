import { useGrokTheme, useState } from "../kit";
import type { UpdateNote } from "../updates";

/** Separate collapsible "Updates" dropdown in its own accent hue (violet), readable in light and dark mode. */
export function UpdatesSection(props: { notes: readonly UpdateNote[] }) {
  const t = useGrokTheme();
  const [open, setOpen] = useState(true);
  const dark = t.kind === "dark";
  const c = dark
    ? { border: "#8b5cf6", bg: "#1d1630", head: "#2a1f47", text: "#e9e2ff", sub: "#c4b5fd" }
    : { border: "#8b5cf6", bg: "#f6f3ff", head: "#ede7ff", text: "#3b1d7a", sub: "#5b3fa8" };
  return (
    <section data-testid="updates" style={{ border: `1px solid ${c.border}`, borderRadius: t.radius.lg, background: c.bg, overflow: "hidden" }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        style={{ all: "unset", boxSizing: "border-box", width: "100%", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: c.head, color: c.text, ...t.font.heading3, fontWeight: t.weight.semibold }}>
        <span>Updates</span>
        <span aria-hidden style={{ transform: open ? "rotate(180deg)" : "none", transition: `transform ${t.motion.hover}` }}>▾</span>
      </button>
      {open ? (
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {props.notes.length === 0 ? <span style={{ ...t.font.body2, color: c.sub }}>No updates published yet.</span> : props.notes.map((n, i) => (
            <div key={i} data-testid="update-note" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ ...t.font.body1, fontWeight: t.weight.semibold, color: c.text }}>{n.header}</div>
              <ul style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 4, ...t.font.body2, color: c.text }}>
                {n.bullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
