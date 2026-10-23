import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from GitHub Pages at https://ethangilman-hash.github.io/par-level-portal-demo/
export default defineConfig({
  base: "/par-level-portal-demo/",
  plugins: [react()],
});
