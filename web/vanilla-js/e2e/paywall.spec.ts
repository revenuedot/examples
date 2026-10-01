// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: end-to-end tests against a RevenueDot server: the plans page, buying with the Test Store dialog,
// the entitlement on the server and on the success screen, log in, cancelling, and preview plans.
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

test("buys the monthly package with the Test Store and unlocks pro", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("radio", { name: /Yearly/ })).toBeChecked();
  // Arrow keys move between plans, like any radio group.
  await page.getByRole("radio", { name: /Yearly/ }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: /Monthly/ })).toBeChecked();
  expect(await proOnServer(request, page)).toBe(false);
  await page.getByTestId("buy").click();
  // purchases-js's own Test Store dialog (only shown for test_ keys).
  await page.getByRole("button", { name: "Test valid purchase" }).click();
  await expect(page.getByRole("heading", { name: "You're in." })).toBeVisible();
  await expect(page.getByTestId("entitlement")).toContainText("Active until");
  await expect(page.getByTestId("last-action")).toHaveText("Purchased $rc_monthly.");
  expect(await proOnServer(request, page)).toBe(true);

  // logIn: the anonymous purchase follows the user to their new id.
  await page.getByText("Developer").click();
  const userId = `web_user_${Date.now()}`;
  await page.getByRole("textbox", { name: "User id" }).fill(userId);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByTestId("last-action")).toHaveText(`Signed in as ${userId}.`);
  await expect(page.getByTestId("app-user-id")).toHaveText(userId);
  await expect(page.getByTestId("entitlement")).toContainText("Active until");
});

test("cancelling the Test Store dialog leaves pro inactive", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByTestId("plan-$rc_annual")).toBeVisible();
  await page.getByTestId("buy").click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("status")).toHaveText("Purchase cancelled.");
  await expect(page.getByRole("heading", { name: "You're in." })).toBeHidden();
  expect(await proOnServer(request, page)).toBe(false);
});

test("preview plans show the trial timeline and savings, and cannot be bought", async ({ page }) => {
  await page.goto("/?preview=1");
  await expect(page.getByRole("heading", { name: "How your free trial works" })).toBeVisible();
  await expect(page.getByTestId("plan-preview_annual")).toContainText("$59.99/year");
  await expect(page.getByTestId("plan-preview_annual")).toContainText("Save 77%");
  await expect(page.getByTestId("buy")).toHaveText("Start my free week");
  await page.getByTestId("plan-preview_weekly").click();
  await expect(page.getByRole("heading", { name: "Choose your plan" })).toBeVisible();
  await expect(page.getByTestId("buy")).toHaveText("Continue");
  await page.getByTestId("buy").click();
  await expect(page.getByTestId("status")).toContainText("Preview plans can't be bought");
});
