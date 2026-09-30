// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the root layout for the Next.js paywall example.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "RevenueDot web paywall" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
