// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the root layout for the Focus web funnel: page metadata, theme colours for light and dark, and the design tokens.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./focus.css";

export const metadata: Metadata = {
  title: "Focus: your plan",
  description: "Answer a few questions, get a focus plan built around your day, and start your free week.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
