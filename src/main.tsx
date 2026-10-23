import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./kit";
import App from "./App";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
