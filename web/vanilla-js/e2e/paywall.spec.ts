// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: end-to-end test: load offerings, buy with the Test Store dialog, see the entitlement, log in.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { expect, test } from "@playwright/test";

test("buys the monthly package with the Test Store and unlocks pro", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("entitlement")).toHaveText("Pro is not active");
  await page.getByTestId("buy-$rc_monthly").click();
  // purchases-js's own Test Store dialog (only shown for test_ keys).
  await page.getByRole("button", { name: "Test valid purchase" }).click();
  await expect(page.getByTestId("entitlement")).toContainText("Pro is active until");
  await expect(page.getByTestId("status")).toHaveText("Purchased $rc_monthly.");

  // logIn: the anonymous purchase follows the user to their new id.
  const userId = `web_user_${Date.now()}`;
  await page.getByLabel("User id").fill(userId);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByTestId("status")).toHaveText(`Signed in as ${userId}.`);
  await expect(page.getByTestId("app-user-id")).toHaveText(userId);
  await expect(page.getByTestId("entitlement")).toContainText("Pro is active until");
});

test("cancelling the Test Store dialog leaves pro inactive", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("entitlement")).toHaveText("Pro is not active");
  await page.getByTestId("buy-$rc_annual").click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("status")).toHaveText("Purchase cancelled.");
  await expect(page.getByTestId("entitlement")).toHaveText("Pro is not active");
});
