import { Children, createContext, isValidElement, useContext, useState, type CSSProperties, type ReactNode } from "react";
import { useGrokTheme, useThemeSwitch, type GrokTheme } from "./theme";

export type Tone = "success" | "warning" | "danger";
export type StatusTone = Tone | "accent" | "neutral";
export type TableCell = string | { text: string; tone?: Tone } | ReactNode;

const toneColor = (t: GrokTheme, tone?: StatusTone | "info"): string =>
  tone === "success" ? t.text.success : tone === "warning" ? t.text.warning : tone === "danger" ? t.text.danger
    : tone === "accent" || tone === "info" ? t.text.accent : t.text.secondary;
const toneBg = (t: GrokTheme, tone?: StatusTone | "info"): string =>
  tone === "success" ? t.fill.successSubtle : tone === "warning" ? t.fill.warningSubtle : tone === "danger" ? t.fill.dangerSubtle
    : tone === "accent" || tone === "info" ? t.fill.accentSubtle : t.fill.secondary;

const DepthCtx = createContext(0);
const InCardCtx = createContext(false);

// ───────── Page / Section / Text ─────────
export function Page(props: { title: string; summary?: string; width?: "column" | "wide" | "full"; children?: ReactNode }) {
  const t = useGrokTheme();
  const sw = useThemeSwitch();
  const max = props.width === "full" ? "100%" : props.width === "wide" ? 1240 : 760;
  return (
    <div style={{ maxWidth: max, margin: "0 auto", padding: "40px 24px 80px", display: "flex", flexDirection: "column", gap: 28 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, ...t.font.heading1, fontWeight: t.weight.semibold }}>{props.title}</h1>
          {props.summary ? <p style={{ margin: "8px 0 0", ...t.font.body1, color: t.text.secondary, maxWidth: 820 }}>{props.summary}</p> : null}
        </div>
        <button onClick={sw.toggle} style={{ ...btnBase(t), whiteSpace: "nowrap" }}>{sw.kind === "dark" ? "Light mode" : "Dark mode"}</button>
      </header>
      {props.children}
    </div>
  );
}

export function Section(props: { heading?: string; caption?: string; actions?: ReactNode; collapsible?: boolean; defaultOpen?: boolean; id?: string; children?: ReactNode }) {
  const t = useGrokTheme();
  const depth = useContext(DepthCtx);
  const inCard = useContext(InCardCtx);
  const [open, setOpen] = useState(props.collapsible ? !!props.defaultOpen : true);
  const hs = depth > 0 || inCard ? t.font.heading3 : t.font.heading2;
  return (
    <section id={props.id} style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      {props.heading || props.actions ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            {props.heading ? (
              props.collapsible ? (
                <button onClick={() => setOpen(!open)} style={{ all: "unset", cursor: "pointer", ...hs, fontWeight: t.weight.semibold, color: t.text.primary }}>
                  <span style={{ display: "inline-block", width: 18, transform: open ? "rotate(90deg)" : "none", transition: `transform ${t.motion.hover}` }}>›</span>
                  {props.heading}
                </button>
              ) : <h2 style={{ margin: 0, ...hs, fontWeight: t.weight.semibold }}>{props.heading}</h2>
            ) : null}
            {props.caption && open ? <div style={{ ...t.font.caption, color: t.text.secondary, marginTop: 2 }}>{props.caption}</div> : null}
          </div>
          {props.actions ? <div>{props.actions}</div> : null}
        </div>
      ) : null}
      {open ? <DepthCtx.Provider value={depth + 1}>{props.children}</DepthCtx.Provider> : null}
    </section>
  );
}

export function Text(props: { children?: ReactNode }) {
  const t = useGrokTheme();
  return <p style={{ margin: 0, ...t.font.body1, color: t.text.primary }}>{props.children}</p>;
}

export function Callout(props: { lead?: string; tone?: Tone | "info"; children?: ReactNode }) {
  const t = useGrokTheme();
  const tone = props.tone ?? "info";
  return (
    <div style={{ background: toneBg(t, tone), borderLeft: `3px solid ${toneColor(t, tone)}`, borderRadius: t.radius.md, padding: "10px 14px", ...t.font.body2, color: t.text.primary }}>
      {props.lead ? <strong style={{ fontWeight: t.weight.semibold }}>{props.lead} </strong> : null}
      {props.children}
    </div>
  );
}

// ───────── Status / Properties / Rows / Steps / Metrics ─────────
export function Status(props: { tone?: StatusTone; children: ReactNode }) {
  const t = useGrokTheme();
  const c = toneColor(t, props.tone);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 20, padding: "0 8px", borderRadius: t.radius.full, background: toneBg(t, props.tone), color: c, ...t.font.caption, fontWeight: t.weight.medium, whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: c, flex: "none" }} />
      {props.children}
    </span>
  );
}

export function Properties(props: { items: readonly { label: string; value: ReactNode }[] }) {
  const t = useGrokTheme();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, auto) 1fr", gap: "8px 16px", ...t.font.body2 }}>
      {props.items.map((it) => (
        <div key={it.label} style={{ display: "contents" }}>
          <div style={{ color: t.text.secondary }}>{it.label}</div>
          <div style={{ color: t.text.primary }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

export interface Row { lead?: string; title: string; detail?: string; meta?: string; status?: { label: string; tone?: StatusTone } }
export function Rows(props: { rows: readonly Row[] }) {
  const t = useGrokTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {props.rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderTop: i ? `1px solid ${t.border.subtle}` : "none" }}>
          {r.lead ? <div style={{ ...t.font.caption, color: t.text.tertiary, minWidth: 72 }}>{r.lead}</div> : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...t.font.body2, fontWeight: t.weight.medium }}>{r.title}</div>
            {r.detail ? <div style={{ ...t.font.caption, color: t.text.secondary }}>{r.detail}</div> : null}
          </div>
          {r.meta ? <div style={{ ...t.font.caption, color: t.text.secondary }}>{r.meta}</div> : null}
          {r.status ? <Status tone={r.status.tone}>{r.status.label}</Status> : null}
        </div>
      ))}
    </div>
  );
}

export function Steps(props: { steps: readonly { title: ReactNode; detail?: ReactNode }[] }) {
  const t = useGrokTheme();
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
      {props.steps.map((s, i) => (
        <li key={i} style={{ display: "flex", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, border: `1.5px solid ${t.border.strong}`, display: "grid", placeItems: "center", ...t.font.caption, fontWeight: t.weight.semibold }}>{i + 1}</div>
            {i < props.steps.length - 1 ? <div style={{ flex: 1, width: 1.5, background: t.border.default, minHeight: 12 }} /> : null}
          </div>
          <div style={{ paddingBottom: 14 }}>
            <div style={{ ...t.font.body2, fontWeight: t.weight.semibold }}>{s.title}</div>
            {s.detail ? <div style={{ ...t.font.body2, color: t.text.secondary }}>{s.detail}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export interface Metric { value: string; label: string; detail?: string; tone?: Tone }
export function Metrics(props: { metrics: readonly Metric[] }) {
  const t = useGrokTheme();
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`, gap: 24 }}>
      {props.metrics.map((m) => (
        <div key={m.label}>
          <div style={{ ...t.font.metric, fontWeight: t.weight.semibold }}>{m.value}</div>
          <div style={{ ...t.font.body2, color: t.text.primary }}>{m.label}</div>
          {m.detail ? <div style={{ ...t.font.caption, color: m.tone ? toneColor(t, m.tone) : t.text.secondary }}>{m.detail}</div> : null}
        </div>
      ))}
    </div>
  );
}

// ───────── Grid ─────────
export function Grid(props: { columns?: 2 | 3 | 4 | 5 | 6 | 7; children?: ReactNode }) {
  const t = useGrokTheme();
  const n = props.columns ?? 2;
  const kids = Children.toArray(props.children).filter(Boolean);
  if (kids.length === 0) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${n >= 4 ? 220 : 340}px, 1fr))`, gap: 16 }}>
      {kids.map((k, i) => (
        <div key={i} style={{ border: `1px solid ${t.border.subtle}`, borderRadius: t.radius.lg, background: t.bg.elevated, padding: 16, minWidth: 0 }}>
          <InCardCtx.Provider value={true}>{k}</InCardCtx.Provider>
        </div>
      ))}
    </div>
  );
}

// ───────── Table ─────────
function isToneCell(c: unknown): c is { text: string; tone?: Tone } {
  return typeof c === "object" && c !== null && !isValidElement(c) && !Array.isArray(c) && "text" in c;
}
export function Table(props: { columns: readonly string[]; rows: readonly (readonly TableCell[])[]; align?: readonly ("auto" | "start" | "end")[]; emphasis?: number }) {
  const t = useGrokTheme();
  const al = (i: number): CSSProperties["textAlign"] => (props.align?.[i] === "end" ? "right" : "left");
  return (
    <div style={{ overflowX: "auto", border: `1px solid ${t.border.subtle}`, borderRadius: t.radius.md, background: t.bg.elevated }}>
      <table style={{ borderCollapse: "collapse", width: "100%", ...t.font.label }}>
        <thead>
          <tr>
            {props.columns.map((c, i) => (
              <th key={i} style={{ textAlign: al(i), padding: "8px 10px", color: t.text.secondary, fontWeight: t.weight.medium, borderBottom: `1px solid ${t.border.default}`, whiteSpace: "nowrap", background: t.bg.subtle }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, ci) => (
                <td key={ci} style={{ textAlign: al(ci), padding: "8px 10px", borderTop: ri ? `1px solid ${t.border.subtle}` : "none", verticalAlign: "middle", fontWeight: props.emphasis === ci ? t.weight.semibold : undefined, color: t.text.primary }}>
                  {isToneCell(c) ? <span style={{ color: toneColor(t, c.tone), fontWeight: c.tone ? t.weight.medium : undefined }}>{c.text}</span> : (c as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ───────── Controls ─────────
const btnBase = (t: GrokTheme): CSSProperties => ({
  ...t.font.label, fontFamily: t.font.family, fontWeight: t.weight.medium, padding: "7px 14px", borderRadius: t.radius.md,
  border: `1px solid ${t.border.default}`, background: t.bg.elevated, color: t.text.primary, cursor: "pointer",
  transition: `background ${t.motion.hover}`,
});

export function Button(props: { label: string; onClick: () => void; variant?: "primary" | "quiet"; disabled?: boolean }) {
  const t = useGrokTheme();
  const s: CSSProperties = { ...btnBase(t) };
  if (props.variant === "primary") Object.assign(s, { background: t.fill.accent, color: t.text.onColor, border: `1px solid ${t.fill.accent}` });
  if (props.variant === "quiet") Object.assign(s, { background: "transparent", border: "1px solid transparent", color: t.text.accent, padding: "4px 8px" });
  if (props.disabled) Object.assign(s, { opacity: 0.45, cursor: "not-allowed" });
  return <button type="button" style={s} disabled={props.disabled} onClick={props.onClick}>{props.label}</button>;
}

const fieldStyle = (t: GrokTheme): CSSProperties => ({
  ...t.font.body2, fontFamily: t.font.family, padding: "7px 10px", borderRadius: t.radius.md, border: `1px solid ${t.border.default}`,
  background: t.bg.base, color: t.text.primary, width: "100%", boxSizing: "border-box", minWidth: 0,
});
function Field(props: { label?: string; children: ReactNode }) {
  const t = useGrokTheme();
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      {props.label ? <span style={{ ...t.font.caption, color: t.text.secondary }}>{props.label}</span> : null}
      {props.children}
    </label>
  );
}

export function Input(props: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: "text" | "number" }) {
  const t = useGrokTheme();
  return (
    <Field label={props.label}>
      <input type={props.type ?? "text"} value={props.value} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)}
        style={{ ...fieldStyle(t), ...(props.type === "number" ? { width: 80, textAlign: "right" } : {}) }} />
    </Field>
  );
}

export interface SelectOption<T extends string = string> { value: T; label: string }
export function Select<T extends string = string>(props: { label?: string; options: readonly (T | SelectOption<T>)[]; value: T; onChange: (v: T) => void; placeholder?: string; disabled?: boolean }) {
  const t = useGrokTheme();
  const opts = props.options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <Field label={props.label}>
      <select value={props.value} disabled={props.disabled} onChange={(e) => props.onChange(e.target.value as T)} style={{ ...fieldStyle(t), opacity: props.disabled ? 0.6 : 1 }}>
        {props.placeholder && !opts.some((o) => o.value === props.value) ? <option value={props.value} disabled>{props.placeholder}</option> : null}
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export function Toggle(props: { label?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const t = useGrokTheme();
  return (
    <button type="button" disabled={props.disabled} onClick={() => props.onChange(!props.value)}
      style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, ...t.font.label, color: t.text.primary, padding: "6px 0" }}>
      <span style={{ width: 30, height: 18, borderRadius: 9, background: props.value ? t.fill.accent : t.border.default, position: "relative", transition: `background ${t.motion.hover}` }}>
        <span style={{ position: "absolute", top: 2, left: props.value ? 14 : 2, width: 14, height: 14, borderRadius: 7, background: "#fff", transition: `left ${t.motion.hover}` }} />
      </span>
      {props.label}
    </button>
  );
}

export interface SegmentedOption<T extends string = string> { value: T; label: string; count?: number }
export function Segmented<T extends string = string>(props: { options: readonly (T | SegmentedOption<T>)[]; value: T; onChange: (v: T) => void }) {
  const t = useGrokTheme();
  const opts = props.options.map((o): SegmentedOption<T> => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 2, padding: 3, borderRadius: t.radius.md, background: t.fill.secondary }}>
      {opts.map((o) => {
        const on = o.value === props.value;
        return (
          <button key={o.value} type="button" onClick={() => props.onChange(o.value)}
            style={{ all: "unset", cursor: "pointer", padding: "6px 12px", borderRadius: t.radius.sm + 2, ...t.font.label, fontWeight: on ? t.weight.semibold : t.weight.medium, color: on ? t.text.primary : t.text.secondary, background: on ? t.bg.elevated : "transparent", boxShadow: on ? "0 1px 2px rgba(0,0,0,0.12)" : "none" }}>
            {o.label}
            {o.count ? <span style={{ marginLeft: 6, padding: "0 6px", borderRadius: 9, background: t.fill.accent, color: t.text.onColor, ...t.font.caption }}>{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
