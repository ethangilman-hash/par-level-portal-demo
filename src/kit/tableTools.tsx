// Shared table behaviour for the retailer experience: click a column header to sort (asc ⇄ desc) and drag a header
// to rearrange columns. Column order and sort are kept in sessionStorage per table id for the browser session.
import { isValidElement, useCallback, useEffect, useMemo, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type ReactNode } from "react";

export type SortDir = 1 | -1;
export interface SortState { col: string; dir: SortDir }
export type SortValue = string | number | null;

const PREFIX = "plp.table.";
function readJson<T>(key: string): T | null {
  try { const s = sessionStorage.getItem(key); return s ? (JSON.parse(s) as T) : null; } catch { return null; }
}
function writeJson(key: string, v: unknown) {
  try { if (v === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ }
}

/** Stored order, filtered to the current keys; keys the stored order doesn't know keep their default neighbours. */
function mergeOrder(stored: readonly string[] | null, keys: readonly string[]): string[] {
  if (!stored) return [...keys];
  const out = stored.filter((k) => keys.includes(k));
  keys.forEach((k, i) => {
    if (out.includes(k)) return;
    const prev = keys.slice(0, i).reverse().find((p) => out.includes(p));
    out.splice(prev ? out.indexOf(prev) + 1 : 0, 0, k);
  });
  return out;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/** Turn a display string into something sortable: numbers/money/percent, dates, or lower-case text. "—" and blanks sort last. */
export function parseSortValue(raw: string): SortValue {
  const s = raw.replace(/\u2212/g, "-").trim();
  if (!s || s === "—" || s === "-" || s === "–") return null;
  const num = s.match(/^([+-])?\$?(-)?\$?([\d,]*\.?\d+)\s*(%|d|g|h|x|pts?)?(\s|$|\/|\(|·)/i);
  if (num && /\d/.test(num[3])) {
    const n = parseFloat(num[3].replace(/,/g, ""));
    return num[1] === "-" || num[2] === "-" ? -n : n;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return Date.UTC(+iso[1], +iso[2] - 1, +iso[3]);
  const md = s.match(/^(?:[A-Za-z]{3},\s+)?([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:,\s*(\d{4}))?(?:,?\s+(\d{1,2}):(\d{2})\s*(AM|PM))?/i);
  if (md && MONTHS.includes(md[1].toLowerCase())) {
    const m = MONTHS.indexOf(md[1].toLowerCase());
    let y = md[3] ? +md[3] : new Date().getFullYear();
    const hr = md[4] ? +md[4] % 12 + (md[6]?.toUpperCase() === "PM" ? 12 : 0) : 0;
    let ms = Date.UTC(y, m, +md[2], hr, md[5] ? +md[5] : 0);
    // Year-less dates more than ~4 months ahead are from last year.
    if (!md[3] && ms - Date.now() > 120 * 86400000) { y -= 1; ms = Date.UTC(y, m, +md[2], hr, md[5] ? +md[5] : 0); }
    return ms;
  }
  return s.toLowerCase();
}

/** Best-effort text of a cell (string, tone cell, or React element tree). */
export function cellText(c: unknown): string {
  if (c === null || c === undefined || typeof c === "boolean") return "";
  if (typeof c === "string" || typeof c === "number") return String(c);
  if (Array.isArray(c)) return c.map(cellText).join("");
  if (isValidElement(c)) {
    const p = c.props as { children?: unknown; label?: unknown; text?: unknown; value?: unknown };
    if (p.children !== undefined) return cellText(p.children);
    if (typeof p.value === "string" || typeof p.value === "number") return String(p.value);
    if (typeof p.text === "string") return p.text;
    return "";
  }
  if (typeof c === "object" && "text" in (c as object)) return String((c as { text: unknown }).text);
  return "";
}

/** Compare two sort values; empty values always go last regardless of direction. */
export function compareSort(a: SortValue, b: SortValue, dir: SortDir): number {
  if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return dir * (a - b);
  if (typeof a === "number") return -1; // numbers before text
  if (typeof b === "number") return 1;
  return dir * a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export interface TableControls {
  order: string[];
  sort: SortState | null;
  toggleSort: (col: string) => void;
  clearSort: () => void;
  move: (from: string, to: string) => void;
  reset: () => void;
  customized: boolean;
  /** Props to spread on a header cell: drag to rearrange, click / Enter to sort, Alt+←/→ to move. */
  headerProps: (col: string, opts?: { sortable?: boolean; label?: string }) => {
    draggable: boolean; tabIndex: number; title: string; "aria-sort"?: "ascending" | "descending" | "none"; "data-col": string;
    onClick: () => void; onKeyDown: (e: KeyboardEvent) => void;
    onDragStart: (e: DragEvent) => void; onDragOver: (e: DragEvent) => void; onDragLeave: () => void; onDrop: (e: DragEvent) => void; onDragEnd: () => void;
    style: CSSProperties;
  };
  /** Sort arrow for a header: ▲ / ▼ when sorted, a faint ⇅ otherwise. */
  indicator: (col: string, color?: string) => ReactNode;
}

/**
 * Column order + sort state for one table. `keys` are stable column ids in default order. `defaultDir` picks the
 * first-click direction per column (e.g. numbers / dates descending).
 */
export function useTableControls(tableId: string, keys: readonly string[], opts?: { defaultSort?: SortState | null; defaultDir?: (col: string) => SortDir; accent?: string }): TableControls {
  const oKey = PREFIX + tableId + ".order";
  const sKey = PREFIX + tableId + ".sort";
  const [stored, setStored] = useState<string[] | null>(() => readJson<string[]>(oKey));
  const [sort, setSort] = useState<SortState | null>(() => readJson<SortState>(sKey) ?? opts?.defaultSort ?? null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  useEffect(() => { setStored(readJson<string[]>(oKey)); setSort(readJson<SortState>(sKey) ?? opts?.defaultSort ?? null); /* eslint-disable-line */ }, [oKey, sKey]);
  const keySig = keys.join("\u0001");
  const order = useMemo(() => mergeOrder(stored, keys), [stored, keySig]); // eslint-disable-line react-hooks/exhaustive-deps
  const customized = order.join("\u0001") !== keySig;

  const move = useCallback((from: string, to: string) => {
    if (from === to) return;
    const next = order.filter((k) => k !== from);
    const fromIdx = order.indexOf(from), toIdx = order.indexOf(to);
    const at = next.indexOf(to) + (fromIdx < toIdx ? 1 : 0);
    next.splice(at, 0, from);
    setStored(next); writeJson(oKey, next);
  }, [order, oKey]);
  const reset = useCallback(() => { setStored(null); writeJson(oKey, null); }, [oKey]);
  const toggleSort = useCallback((col: string) => {
    const next: SortState = sort && sort.col === col ? { col, dir: (sort.dir === 1 ? -1 : 1) as SortDir } : { col, dir: opts?.defaultDir?.(col) ?? 1 };
    setSort(next); writeJson(sKey, next);
  }, [sort, sKey, opts?.defaultDir]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearSort = useCallback(() => { setSort(opts?.defaultSort ?? null); writeJson(sKey, null); }, [sKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const accent = opts?.accent ?? "#2563eb";
  const headerProps: TableControls["headerProps"] = (col, o) => {
    const sortable = o?.sortable !== false;
    const on = sort?.col === col;
    const name = o?.label ?? col;
    const shift = (d: -1 | 1) => { const i = order.indexOf(col); const j = i + d; if (j >= 0 && j < order.length) move(col, order[j]); };
    const isOver = over === col && dragging !== null && dragging !== col;
    const fromLeft = dragging !== null && order.indexOf(dragging) < order.indexOf(col);
    return {
      draggable: true, tabIndex: 0, "data-col": col,
      title: `${sortable ? `Click to sort by ${name || "this column"}` : name || "Column"} · drag (or Alt+←/→) to rearrange`,
      "aria-sort": sortable ? (on ? (sort!.dir === 1 ? "ascending" : "descending") : "none") : undefined,
      onClick: () => { if (sortable) toggleSort(col); },
      onKeyDown: (e) => {
        if ((e.key === "Enter" || e.key === " ") && sortable) { e.preventDefault(); toggleSort(col); }
        else if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); shift(-1); }
        else if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); shift(1); }
      },
      onDragStart: (e) => { setDragging(col); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", col); } catch { /* ignore */ } },
      onDragOver: (e) => { if (dragging !== null) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (over !== col) setOver(col); } },
      onDragLeave: () => { if (over === col) setOver(null); },
      onDrop: (e) => { e.preventDefault(); if (dragging) move(dragging, col); setDragging(null); setOver(null); },
      onDragEnd: () => { setDragging(null); setOver(null); },
      style: {
        cursor: dragging ? "grabbing" : sortable ? "pointer" : "grab", userSelect: "none",
        opacity: dragging === col ? 0.45 : 1,
        boxShadow: isOver ? `inset ${fromLeft ? -3 : 3}px 0 0 ${accent}` : undefined,
      },
    };
  };
  const indicator: TableControls["indicator"] = (col, color) => {
    const on = sort?.col === col;
    return (
      <span aria-hidden data-sort-indicator={on ? (sort!.dir === 1 ? "asc" : "desc") : "none"}
        style={{ display: "inline-block", width: 12, marginLeft: 4, fontSize: on ? 10 : 11, color: on ? color ?? accent : "currentColor", opacity: on ? 1 : 0.35, textAlign: "center" }}>
        {on ? (sort!.dir === 1 ? "▲" : "▼") : "⇅"}
      </span>
    );
  };
  return { order, sort, toggleSort, clearSort, move, reset, customized, headerProps, indicator };
}
