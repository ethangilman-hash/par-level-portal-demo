import { useGrokTheme, useEffect, useState, Button } from "./kit";
import type { ReactNode, CSSProperties } from "./kit";

// ─────────────────────────── visual building blocks ───────────────────────────
export function useStyles() {
  const t = useGrokTheme();
  const card: CSSProperties = {
    border: `1px solid ${t.border.subtle}`, borderRadius: t.radius.lg, background: t.bg.elevated, padding: 16,
    display: "flex", flexDirection: "column", gap: 14,
  };
  const small: CSSProperties = { fontSize: t.font.caption.fontSize, lineHeight: t.font.caption.lineHeight, color: t.text.secondary };
  const strong: CSSProperties = { fontSize: t.font.body1.fontSize, lineHeight: t.font.body1.lineHeight, color: t.text.primary, fontWeight: t.weight.semibold };
  const row: CSSProperties = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
  return { t, card, small, strong, row };
}

export function Card(props: { children?: ReactNode }) {
  const { card } = useStyles();
  return <div style={card}>{props.children}</div>;
}

export function Bar(props: { pct: number }) {
  const { t } = useStyles();
  return (
    <div style={{ height: 6, borderRadius: t.radius.full, background: t.fill.secondary, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, props.pct)}%`, height: "100%", background: t.fill.accent, transition: `width ${t.motion.hover}` }} />
    </div>
  );
}

/** Toggle chip used for filters (same visual language as Segmented). */
export function Chip(props: { label: string; on: boolean; onClick: () => void; count?: number }) {
  const { t } = useStyles();
  return (
    <button type="button" onClick={props.onClick} aria-pressed={props.on}
      style={{ all: "unset", cursor: "pointer", padding: "5px 11px", borderRadius: t.radius.full, ...t.font.label,
        fontWeight: props.on ? t.weight.semibold : t.weight.medium, color: props.on ? t.text.onColor : t.text.primary,
        background: props.on ? t.fill.accent : t.fill.secondary, whiteSpace: "nowrap" }}>
      {props.label}{props.count !== undefined ? <span style={{ marginLeft: 6, opacity: 0.75 }}>{props.count}</span> : null}
    </button>
  );
}

/** Viewer-local date + time with a time-zone label, e.g. "Thu, Oct 22, 2026, 9:58:03 PM PDT". */
export const localStamp = (ms: number) =>
  new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short" }).format(new Date(ms));

/** Re-renders every second; returns the current wall-clock time. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** "Last synced with <provider> at: …" line with a live clock, auto-sync countdown and Sync now button. */
export function SyncLine(props: { provider: string; at?: number; syncing?: boolean; onSync?: () => void; simulated?: boolean; everySec?: number }) {
  const { t, row, small } = useStyles();
  const now = useNow();
  const every = props.everySec ?? 60;
  const next = props.at ? Math.max(0, every - Math.floor((now - props.at) / 1000)) : every;
  return (
    <div style={{ ...row, justifyContent: "space-between", padding: "10px 14px", borderRadius: t.radius.md, background: t.fill.accentSubtle, border: `1px solid ${t.border.subtle}` }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ ...t.font.label, color: t.text.primary }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, marginRight: 8, background: props.syncing ? t.text.warning : t.text.success }} />
          Last synced with {props.provider} at: <strong>{props.at ? localStamp(props.at) : "syncing…"}</strong>
        </span>
        <span style={small}>
          {props.simulated !== false ? "Simulated in demo mode (sample data, no network calls) · " : ""}
          {props.syncing ? "Sync in progress…" : `Next auto-sync in ${next}s`} · Now {localStamp(now)}
        </span>
      </div>
      {props.onSync ? <Button label={props.syncing ? "Syncing…" : "Sync now"} onClick={props.onSync} disabled={props.syncing} /> : null}
    </div>
  );
}
