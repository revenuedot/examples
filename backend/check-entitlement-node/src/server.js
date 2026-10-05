// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: node:http server with GET /api/pro-content that serves content only to users with the "pro" entitlement.
// Docs: https://revenuedot.app/docs/api/rest-v1   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { createServer } from "node:http";
import { hasEntitlement } from "./entitlements.js";

export const ENTITLEMENT_ID = "pro";

export function createApp({ check = hasEntitlement } = {}) {
  const send = (res, status, body) => res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));

  return createServer(async (req, res) => {
    const { pathname } = new URL(req.url, "http://localhost");
    if (req.method !== "GET" || pathname !== "/api/pro-content") return send(res, 404, { error: "not found" });
    // Demo only: anyone can send any X-User-Id. A real app takes the user id from its own session or auth token,
    // the same id it passes to the SDK's logIn(), and never trusts one sent by the client.
    const appUserId = req.headers["x-user-id"];
    if (!appUserId) return send(res, 401, { error: "missing X-User-Id" });
    try {
      if (!(await check(appUserId, ENTITLEMENT_ID))) return send(res, 403, { error: `the ${ENTITLEMENT_ID} entitlement is required` });
    } catch (err) {
      // Fail closed: if RevenueDot cannot be asked, do not hand out paid content.
      console.error(err);
      return send(res, 502, { error: "could not check the entitlement" });
    }
    send(res, 200, { content: "Pro content for " + appUserId });
  });
}

// Run directly: `npm start` (reads .env).
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => console.log(`Listening on http://localhost:${port}/api/pro-content`));
}
