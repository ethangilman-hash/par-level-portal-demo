// Local stand-in for the hosted canvas UI kit, so the demo runs as a plain Vite + React app.
export { useState, useEffect, useMemo, useCallback, useRef, Fragment } from "react";
export type { ReactNode, CSSProperties } from "react";
export { ThemeProvider, useGrokTheme, useThemeSwitch, lightTheme, darkTheme } from "./theme";
export type { GrokTheme } from "./theme";
export * from "./components";
export * from "./charts";
