// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: end-to-end tests against a RevenueDot server: the two-page paywall, buying with the Test Store dialog,
// the entitlement on the server and in the account view, signing in, cancelling, and the exit offer.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const server = process.env.VITE_REVENUEDOT_URL!;
const key = process.env.VITE_REVENUEDOT_API_KEY!;

/** Asks RevenueDot itself, not the page, whether the customer has an unexpired pro entitlement. */
async function proOnServer(request: APIRequestContext, page: Page): Promise<boolean> {
  const id = await page.evaluate(() => localStorage.getItem("revenuedot_app_user_id"));
  const res = await request.get(`${server}/v1/subscribers/${encodeURIComponent(id!)}`, { headers: { Authorization: `Bearer ${key}` } });
  expect(res.ok()).toBeTruthy();
  const pro = (await res.json()).subscriber.entitlements.pro;
  return Boolean(pro && (!pro.expires_date || new Date(pro.expires_date) > new Date()));
}

test("buys the monthly package with the Test Store, unlocks pro and keeps it after signing in", async ({ page, request }) => {
  await page.goto("/?goal=Study&daily_minutes=30");
  // Page 1 speaks in the visitor's words, taken from the link.
  await expect(page.getByRole("heading", { name: "Your plan for study is ready. Unlock it." })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("plan-$rc_annual")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Yearly/ })).toBeChecked();
  await page.getByTestId("plan-$rc_monthly").click();
  expect(await proOnServer(request, page)).toBe(false);
  await page.getByTestId("buy").click();
  // purchases-js's own Test Store dialog (only shown for test_ keys).
  await page.getByRole("button", { name: "Test valid purchase" }).click();

  await expect(page.getByRole("heading", { name: "You're in." })).toBeVisible();
  await expect(page.getByTestId("plan-name")).toHaveText("Focus Pro");
  await page.getByText("Developer").click();
  await expect(page.getByTestId("entitlement")).toContainText("Active until");
  await expect(page.getByTestId("status")).toHaveText("Purchased $rc_monthly.");
  expect(await proOnServer(request, page)).toBe(true);

  // identifyUser: the anonymous purchase follows the user to their new id.
  const userId = `web_user_${Date.now()}`;
  await page.getByRole("textbox", { name: "User id" }).fill(userId);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("status")).toHaveText(`Signed in as ${userId}.`);
  await expect(page.getByTestId("app-user-id")).toHaveText(userId);
  await expect(page.getByTestId("entitlement")).toContainText("Active until");
});

test("cancelling the Test Store dialog leaves pro inactive", async ({ page, request }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("plan-$rc_annual")).toBeVisible();
  await page.getByTestId("buy").click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("status")).toHaveText("Purchase cancelled.");
  expect(await proOnServer(request, page)).toBe(false);
});

test("closing offers the shortest plan once, then shows the free account", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("plan-$rc_annual")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  const offer = page.getByRole("dialog", { name: "Not ready for a year?" });
  await expect(offer).toContainText("Start with monthly");
  await page.keyboard.press("Escape");
  await expect(offer).toBeHidden();
  // The second close leaves.
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
  await expect(page.getByTestId("plan-name")).toHaveText("Free plan");
  await page.getByText("Developer").click();
  await expect(page.getByTestId("entitlement")).toHaveText("Not active");
});

test("preview plans render with savings and cannot be bought", async ({ page }) => {
  await page.goto("/?screen=plans&preview=1");
  await expect(page.getByTestId("plan-preview_annual")).toContainText("$59.99/year");
  await expect(page.getByTestId("plan-preview_annual")).toContainText("$1.15 per week");
  await expect(page.getByTestId("plan-preview_annual")).toContainText("Save 77%");
  await expect(page.getByRole("button", { name: "Start my free week" })).toBeVisible();
  await page.getByTestId("buy").click();
  await expect(page.getByTestId("status")).toContainText("Preview plans can't be bought");
});
