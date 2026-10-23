import { useState, type ReactNode } from "react";
import { useGrokTheme, type GrokTheme } from "./theme";

const fmtNum = (n: number) => (Math.abs(n) >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : String(Math.round(n * 10) / 10));

function Legend(props: { items: { label: string; color: string; dashed?: boolean }[] }) {
  const t = useGrokTheme();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", ...t.font.caption, color: t.text.secondary }}>
      {props.items.map((i) => (
        <span key={i.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 3, borderRadius: 2, background: i.color }} />{i.label}
        </span>
      ))}
    </div>
  );
}

// ───────── LineChart ─────────
export interface LinePoint { label: string; value: number }
export interface LineSeries { label: string; values: readonly number[] }
export function LineChart(props: {
  points: readonly LinePoint[]; ceiling: number; floor?: number; unit?: string; format?: (v: number) => string;
  lines?: readonly LineSeries[]; secondary?: { label: string; values: readonly number[] }; labels?: readonly [string, string?]; legend?: boolean;
}) {
  const t = useGrokTheme();
  const [hover, setHover] = useState<number | null>(null);
  const n = props.points.length;
  if (!n) return null;
  const W = 640, H = 220, L = 44, R = 12, T = 10, B = 26;
  const series: { label: string; values: readonly number[]; color: string; dashed?: boolean }[] = [
    { label: props.labels?.[0] ?? "", values: props.points.map((p) => p.value), color: t.dataviz.categorical[0] },
    ...(props.lines ?? []).map((l, i) => ({ label: l.label, values: l.values, color: t.dataviz.categorical[(i + 1) % t.dataviz.categorical.length] })),
  ];
  if (props.secondary) series.push({ label: props.secondary.label, values: props.secondary.values, color: t.text.tertiary, dashed: true });
  const all = series.flatMap((s) => s.values.filter(Number.isFinite));
  const lo = Math.min(props.floor ?? 0, ...all);
  const hi = Math.max(props.ceiling, ...all, lo + 1);
  const x = (i: number) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const f = props.format ?? ((v: number) => fmtNum(v) + (props.unit ?? ""));
  const ticks = Array.from(new Set([lo, (lo + hi) / 2, hi]));
  const step = Math.max(1, Math.ceil(n / 6));
  const showLegend = props.legend !== false && series.some((s) => s.label);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {showLegend ? <Legend items={series.filter((s) => s.label).map((s) => ({ label: s.label, color: s.color }))} /> : null}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} onMouseLeave={() => setHover(null)}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={t.border.subtle} />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill={t.text.tertiary}>{f(v)}</text>
          </g>
        ))}
        {props.points.map((p, i) => (i % step === 0 || i === n - 1) && p.label ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"} fontSize={11} fill={t.text.tertiary}>{p.label}</text>
        ) : null)}
        {series.map((s, si) => {
          const d = s.values.map((v, i) => (Number.isFinite(v) ? `${x(i)},${y(v)}` : "")).filter(Boolean).join(" ");
          return <polyline key={si} points={d} fill="none" stroke={s.color} strokeWidth={si === 0 ? 2.5 : 1.75} strokeDasharray={s.dashed ? "4 4" : undefined} strokeLinejoin="round" />;
        })}
        {props.points.map((_, i) => (
          <rect key={i} x={x(i) - (W - L - R) / Math.max(1, n - 1) / 2} y={T} width={(W - L - R) / Math.max(1, n - 1)} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {hover !== null ? (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke={t.border.strong} strokeDasharray="2 3" />
            {series.map((s, si) => Number.isFinite(s.values[hover]) ? <circle key={si} cx={x(hover)} cy={y(s.values[hover])} r={3.5} fill={s.color} /> : null)}
          </g>
        ) : null}
      </svg>
      {hover !== null ? (
        <div style={{ ...t.font.caption, color: t.text.secondary }}>
          <strong style={{ color: t.text.primary }}>{props.points[hover].label}</strong>{" "}
          {series.map((s) => `${s.label || "Value"}: ${Number.isFinite(s.values[hover]) ? f(s.values[hover]) : "—"}`).join(" · ")}
        </div>
      ) : null}
    </div>
  );
}

// ───────── Bars ─────────
export interface Bar { label: string; value: number; display?: string; meta?: string }
export function Bars(props: { bars: readonly Bar[]; emphasis?: number | "none"; format?: (v: number) => string }) {
  const t = useGrokTheme();
  const max = Math.max(1e-9, ...props.bars.map((b) => b.value));
  const emph = props.emphasis === undefined ? props.bars.reduce((bi, b, i, a) => (b.value > a[bi].value ? i : bi), 0) : props.emphasis;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {props.bars.map((b, i) => {
        const on = emph !== "none" && emph === i;
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(90px, 34%) 1fr auto", gap: 10, alignItems: "center", ...t.font.label }}>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: t.text.primary, fontWeight: on ? t.weight.semibold : undefined }} title={b.meta ? `${b.label} · ${b.meta}` : b.label}>{b.label}</div>
            <div style={{ height: 10, background: t.fill.secondary, borderRadius: 5, overflow: "hidden" }}>
              <div style={{ width: `${Math.max(0, (b.value / max) * 100)}%`, height: "100%", background: on || emph === "none" ? t.dataviz.categorical[0] : t.border.strong, borderRadius: 5 }} />
            </div>
            <div style={{ color: t.text.secondary, textAlign: "right", minWidth: 48 }}>{b.display ?? (props.format ? props.format(b.value) : fmtNum(b.value))}</div>
          </div>
        );
      })}
    </div>
  );
}

// ───────── Heatmap ─────────
const mix = (t: GrokTheme, frac: number): string => {
  const pct = Math.round(Math.max(0, Math.min(1, frac)) * 100);
  return `color-mix(in srgb, ${t.dataviz.categorical[0]} ${12 + pct * 0.88}%, ${t.bg.elevated})`;
};
export function Heatmap(props: { rows: readonly string[]; columns: readonly string[]; values: readonly (readonly number[])[]; max?: number; format?: (v: number) => string }) {
  const t = useGrokTheme();
  const max = props.max ?? Math.max(1, ...props.values.flat());
  const f = props.format ?? fmtNum;
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `minmax(120px, max-content) repeat(${props.columns.length}, minmax(64px, 1fr))`, gap: 3, ...t.font.caption }}>
        <div />
        {props.columns.map((c) => <div key={c} style={{ color: t.text.secondary, textAlign: "center", padding: "2px 0" }}>{c}</div>)}
        {props.rows.map((r, ri) => (
          <Frag key={ri}>
            <div style={{ color: t.text.primary, paddingRight: 8, alignSelf: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 260 }}>{r}</div>
            {props.columns.map((_, ci) => {
              const v = props.values[ri]?.[ci] ?? 0;
              const frac = v / max;
              return (
                <div key={ci} title={`${r} · ${props.columns[ci]}: ${f(v)}`} style={{ height: 26, borderRadius: 4, background: v <= 0 ? t.fill.secondary : mix(t, frac), display: "grid", placeItems: "center", color: frac > 0.55 ? "#fff" : t.text.primary }}>{f(v)}</div>
              );
            })}
          </Frag>
        ))}
      </div>
    </div>
  );
}
function Frag(props: { children?: ReactNode }) { return <>{props.children}</>; }

// ───────── Scatter ─────────
export interface ScatterPoint { x: number; y: number; label?: string; series?: string; size?: number }
export interface ScatterAxis { name: string; format?: (v: number) => string; unit?: string }
export function Scatter(props: { points: readonly ScatterPoint[]; x: ScatterAxis; y: ScatterAxis }) {
  const t = useGrokTheme();
  const [hover, setHover] = useState<number | null>(null);
  if (!props.points.length) return null;
  const W = 640, H = 240, L = 44, R = 14, T = 10, B = 34;
  const xs = props.points.map((p) => p.x), ys = props.points.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs, x0 + 1), y1 = Math.max(...ys, 1);
  const px = (v: number) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
  const py = (v: number) => T + (1 - v / y1) * (H - T - B);
  const fx = props.x.format ?? fmtNum, fy = props.y.format ?? fmtNum;
  const names = Array.from(new Set(props.points.map((p) => p.series ?? "")));
  const color = (s?: string) => t.dataviz.categorical[Math.max(0, names.indexOf(s ?? "")) % t.dataviz.categorical.length];
  const hp = hover === null ? null : props.points[hover];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {names.filter(Boolean).length > 1 ? <Legend items={names.filter(Boolean).map((s) => ({ label: s, color: color(s) }))} /> : null}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, y1 / 2, y1].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={py(v)} y2={py(v)} stroke={t.border.subtle} />
            <text x={L - 6} y={py(v) + 4} textAnchor="end" fontSize={11} fill={t.text.tertiary}>{fy(v)}</text>
          </g>
        ))}
        {[x0, (x0 + x1) / 2, x1].map((v, i) => (
          <text key={i} x={px(v)} y={H - 18} textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} fontSize={11} fill={t.text.tertiary}>{fx(Math.round(v))}</text>
        ))}
        <text x={(L + W - R) / 2} y={H - 3} textAnchor="middle" fontSize={11} fill={t.text.secondary}>{props.x.name}</text>
        <text x={12} y={T + 4} fontSize={11} fill={t.text.secondary}>{props.y.name}</text>
        {props.points.map((p, i) => (
          <circle key={i} cx={px(p.x)} cy={py(p.y)} r={hover === i ? 7 : 5} fill={color(p.series)} fillOpacity={0.8} stroke={t.bg.elevated} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
      </svg>
      <div style={{ ...t.font.caption, color: t.text.secondary, minHeight: 16 }}>
        {hp ? `${hp.label ?? ""}${hp.series ? ` (${hp.series})` : ""}: ${props.x.name} ${fx(hp.x)}, ${props.y.name} ${fy(hp.y)}` : "Hover a dot for details."}
      </div>
    </div>
  );
}
