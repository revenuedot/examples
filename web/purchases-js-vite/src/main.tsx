// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: mounts the React paywall and loads the Focus design tokens.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./focus.css";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
