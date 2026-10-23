import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface TextStyle { fontSize: string; lineHeight: string }
export interface GrokTheme {
  kind: "light" | "dark";
  bg: { base: string; subtle: string; elevated: string };
  text: { primary: string; secondary: string; tertiary: string; onColor: string; accent: string; success: string; warning: string; danger: string };
  fill: { primary: string; secondary: string; hover: string; accent: string; accentSubtle: string; successSubtle: string; warningSubtle: string; dangerSubtle: string };
  border: { subtle: string; weak: string; default: string; strong: string; focus: string };
  font: { family: string; mono: string; heading1: TextStyle; heading2: TextStyle; heading3: TextStyle; body1: TextStyle; body2: TextStyle; label: TextStyle; caption: TextStyle; metric: TextStyle };
  weight: { regular: 400; medium: 500; semibold: 600 };
  radius: { sm: 4; md: 8; lg: 12; xl: 16; full: 9999 };
  motion: { hover: string; easing: string };
  dataviz: { categorical: string[] };
}

const shared = {
  font: {
    family: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
    heading1: { fontSize: "28px", lineHeight: "36px" },
    heading2: { fontSize: "20px", lineHeight: "28px" },
    heading3: { fontSize: "16px", lineHeight: "24px" },
    body1: { fontSize: "15px", lineHeight: "22px" },
    body2: { fontSize: "14px", lineHeight: "20px" },
    label: { fontSize: "13px", lineHeight: "18px" },
    caption: { fontSize: "12px", lineHeight: "16px" },
    metric: { fontSize: "26px", lineHeight: "32px" },
  },
  weight: { regular: 400, medium: 500, semibold: 600 } as const,
  radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 } as const,
  motion: { hover: "150ms ease", easing: "cubic-bezier(0.2, 0, 0, 1)" },
};

export const lightTheme: GrokTheme = {
  kind: "light",
  bg: { base: "#ffffff", subtle: "#f6f7f9", elevated: "#ffffff" },
  text: { primary: "#14161a", secondary: "#5b616e", tertiary: "#8b919c", onColor: "#ffffff", accent: "#2563eb", success: "#15803d", warning: "#b45309", danger: "#dc2626" },
  fill: { primary: "#14161a", secondary: "#eef0f3", hover: "#e6e9ee", accent: "#2563eb", accentSubtle: "#e8effe", successSubtle: "#e7f6ec", warningSubtle: "#fdf3e1", dangerSubtle: "#fde8e8" },
  border: { subtle: "#e6e8ec", weak: "#eef0f3", default: "#d3d7de", strong: "#9aa1ad", focus: "#2563eb" },
  dataviz: { categorical: ["#2563eb", "#f59e0b", "#10b981", "#a855f7", "#ef4444", "#14b8a6"] },
  ...shared,
};

export const darkTheme: GrokTheme = {
  kind: "dark",
  bg: { base: "#0f1115", subtle: "#15181e", elevated: "#1a1d24" },
  text: { primary: "#eef0f3", secondary: "#a4abb6", tertiary: "#757c88", onColor: "#ffffff", accent: "#6aa0ff", success: "#4ade80", warning: "#fbbf24", danger: "#f87171" },
  fill: { primary: "#eef0f3", secondary: "#242833", hover: "#2c313d", accent: "#3b82f6", accentSubtle: "#1c2a46", successSubtle: "#16301f", warningSubtle: "#352a12", dangerSubtle: "#3a1a1a" },
  border: { subtle: "#262a33", weak: "#1f232b", default: "#343a45", strong: "#5a6170", focus: "#6aa0ff" },
  dataviz: { categorical: ["#6aa0ff", "#fbbf24", "#34d399", "#c084fc", "#f87171", "#2dd4bf"] },
  ...shared,
};

interface ThemeCtx { theme: GrokTheme; setKind: (k: "light" | "dark") => void }
const Ctx = createContext<ThemeCtx>({ theme: lightTheme, setKind: () => undefined });

export function ThemeProvider(props: { children?: ReactNode }) {
  // Always open in light mode; the header button still toggles dark mode.
  const [kind, setKind] = useState<"light" | "dark">("light");
  const theme = kind === "dark" ? darkTheme : lightTheme;
  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.background = theme.bg.subtle;
    document.body.style.color = theme.text.primary;
    document.body.style.fontFamily = theme.font.family;
    document.documentElement.style.colorScheme = theme.kind;
  }, [theme]);
  return <Ctx.Provider value={{ theme, setKind }}>{props.children}</Ctx.Provider>;
}

export const useGrokTheme = (): GrokTheme => useContext(Ctx).theme;
export const useThemeSwitch = () => {
  const c = useContext(Ctx);
  return { kind: c.theme.kind, toggle: () => c.setKind(c.theme.kind === "dark" ? "light" : "dark") };
};
