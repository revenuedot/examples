// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: end-to-end tests of the funnel against a RevenueDot server: the quiz (also by keyboard), answers saved as
// attributes, the paywall, buying with the Test Store dialog, the entitlement on the server, log in, and the exit offer.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const server = process.env.NEXT_PUBLIC_REVENUEDOT_URL!;
const key = process.env.NEXT_PUBLIC_REVENUEDOT_API_KEY!;

/** Asks RevenueDot itself, not the page, whether the customer has an unexpired pro entitlement. */
async function proOnServer(request: APIRequestContext, page: Page): Promise<boolean> {
  const id = await page.evaluate(() => localStorage.getItem("revenuedot_app_user_id"));
  const res = await request.get(`${server}/v1/subscribers/${encodeURIComponent(id!)}`, { headers: { Authorization: `Bearer ${key}` } });
  expect(res.ok()).toBeTruthy();
  const pro = (await res.json()).subscriber.entitlements.pro;
  return Boolean(pro && (!pro.expires_date || new Date(pro.expires_date) > new Date()));
}

async function answer(page: Page, option: string) {
  await page.getByTestId(`option-${option}`).click();
  await page.getByRole("button", { name: "Continue" }).click();
}

test("walks the quiz, saves the answers, buys monthly with the Test Store and unlocks pro", async ({ page, request }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();
  await expect(page.getByRole("heading", { name: "What do you want to focus on?" })).toBeVisible();
  // Continue stays disabled until an answer is chosen.
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await answer(page, "Deep work");
  await answer(page, "25 to 45 minutes");
  await answer(page, "My phone");
  await expect(page.getByRole("heading", { name: "A plan beats willpower." })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await answer(page, "Morning");
  await answer(page, "60");
  // The answers are sent as customer attributes when the quiz ends: POST /v1/subscribers/{id}/attributes.
  const attributes = page.waitForRequest((r) => r.method() === "POST" && r.url().includes("/attributes"));
  await answer(page, "A friend");
  expect((await attributes).postData()).toContain("onboarding_goal");
  await expect(page.getByRole("heading", { name: "Building your plan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your plan is ready." })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Start my plan" }).click();

  await expect(page.getByRole("heading", { name: "Your plan for deep work is ready. Unlock it." })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  // Annual is pre-selected; pick monthly instead.
  await expect(page.getByRole("radio", { name: /Yearly/ })).toBeChecked();
  await page.getByTestId("plan-$rc_monthly").click();
  await expect(page.getByRole("radio", { name: /Monthly/ })).toBeChecked();
  expect(await proOnServer(request, page)).toBe(false);
  await page.getByTestId("buy").click();
  // purchases-js's own Test Store dialog (only shown for test_ keys).
  await page.getByRole("button", { name: "Test valid purchase" }).click();

  await expect(page.getByRole("heading", { name: "You're in." })).toBeVisible();
  await expect(page.getByTestId("open-app")).toHaveAttribute("href", /app_user_id=/);
  await page.getByText("Developer").click();
  await expect(page.getByTestId("entitlement")).toContainText("Active until");
  await expect(page.getByTestId("status")).toHaveText("Purchased $rc_monthly.");
  expect(await proOnServer(request, page)).toBe(true);

  // logIn: the anonymous purchase follows the user to their new id.
  const userId = `web_user_${Date.now()}`;
  await page.getByRole("textbox", { name: "User id" }).fill(userId);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByTestId("status")).toHaveText(`Signed in as ${userId}.`);
  await expect(page.getByTestId("app-user-id")).toHaveText(userId);
  await expect(page.getByTestId("entitlement")).toContainText("Active until");
});

test("the quiz works with the keyboard: arrow keys choose, Enter continues", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("radio", { name: /Deep work/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: /Study/ })).toBeChecked();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "How long can you focus before you get distracted?" })).toBeVisible();
  // Browser Back returns to the previous question with the answer kept.
  await page.goBack();
  await expect(page.getByRole("radio", { name: /Study/ })).toBeChecked();
});

test("cancelling the Test Store dialog leaves pro inactive", async ({ page, request }) => {
  await page.goto("/?screen=plans");
  await expect(page.getByTestId("plan-$rc_annual")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Yearly/ })).toBeChecked();
  await page.getByTestId("buy").click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("status")).toHaveText("Purchase cancelled.");
  await expect(page.getByRole("heading", { name: "You're in." })).toHaveCount(0);
  expect(await proOnServer(request, page)).toBe(false);
});

test("leaving the paywall offers the shortest plan once; preview plans cannot be bought", async ({ page }) => {
  await page.goto("/?screen=plans&preview=1");
  await expect(page.getByTestId("plan-preview_annual")).toContainText("$59.99/year");
  await expect(page.getByTestId("plan-preview_annual")).toContainText("Save 77%");
  await expect(page.getByText("Preview prices.")).toBeVisible();
  await page.getByTestId("buy").click();
  await expect(page.getByTestId("status")).toContainText("Preview plans can't be bought");

  await page.getByRole("button", { name: "Close" }).click();
  const offer = page.getByRole("dialog", { name: "Not ready for a year?" });
  await expect(offer).toBeVisible();
  await expect(offer).toContainText("$4.99/week");
  await offer.getByRole("button", { name: "No thanks" }).click();
  await expect(page.getByRole("heading", { name: "Your plan is ready." })).toBeVisible();
});
