// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: the home page; a server component that renders the client-side funnel (purchases-js runs only in the browser).
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { Funnel } from "./funnel";

export default function Page() {
  return <Funnel />;
}
