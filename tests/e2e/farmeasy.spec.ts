/**
 * FarmEasy E2E Happy-Path Tests
 *
 * Covers the critical flows:
 *   1. Sign in via the app's Clerk-backed sign-in form
 *   2. Home / dashboard loads with cycle summary and yield data
 *   3. Navigate to Cycles tab — list renders
 *   4. Create a new seeding cycle end-to-end (3-step wizard)
 *   5. Open a cycle detail
 *   6. Navigate back to Home
 *   7. Sign out — app returns to unauthenticated state
 *
 * Sign-in screen (artifacts/farmeasy/app/(auth)/sign-in.tsx):
 *   - Single-page form: "Email address" input + "Password" input + "Sign in" button
 *   - MFA screen (status === "needs_client_trust"):
 *       "Verify your identity" / "6-digit code" placeholder + "Verify" button
 *
 * Seeding wizard (artifacts/farmeasy/app/seeding.tsx):
 *   Step 1 — QRScanner (WebScanner on web): type code → "Confirm" → chips appear → "Add Details"
 *   Step 2 — Tray Details: Seed Name, trays, weight, Growth Profile list, Date → "Scan Rack Slot"
 *   Step 3 — QRScanner again: type rack slot code → "Confirm" → summary card → "Confirm & Save"
 *            After clicking "Confirm & Save" the API creates the cycle and Alert.alert() fires
 *            (window.alert on web) — must be accepted via page.on('dialog') BEFORE the click.
 *
 * Sign-out:
 *   - Avatar button (accessibilityLabel="Sign out", testID="sign-out-btn") top-right of Home
 *   - Pressing it calls signOut() immediately; no confirmation dialog
 *
 * Credentials (Clerk test user):
 *   email:    admin+clerk_test@farmeasy.dev
 *   password: FarmEasy2024!
 *   OTP:      424242
 *
 * Run:
 *   PLAYWRIGHT_BASE_URL=https://<your-replit-dev-domain> pnpm --filter @workspace/tests run test
 */

import { test, expect } from "@playwright/test";

const CLERK_EMAIL = "admin+clerk_test@farmeasy.dev";
const CLERK_PASSWORD = "FarmEasy2024!";
const CLERK_OTP = "424242";

test.describe("FarmEasy happy path", () => {
  test("sign-in → dashboard → cycles → create seeding cycle → cycle detail → home → sign-out", async ({
    page,
  }) => {
    // ── 1. Navigate to app root ──────────────────────────────────────────────
    await page.goto("/");

    // ── 2. Sign in ───────────────────────────────────────────────────────────
    // Fill email + password on the single sign-in form then click "Sign in"
    const emailInput = page.getByPlaceholder("you@example.com");
    await emailInput.waitFor({ timeout: 15_000 });
    await emailInput.fill(CLERK_EMAIL);
    await page.getByPlaceholder("••••••••").fill(CLERK_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    // MFA step: "Verify your identity" screen with 6-digit code
    const verifyTitle = page.getByText("Verify your identity");
    if (await verifyTitle.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await page.getByPlaceholder("6-digit code").fill(CLERK_OTP);
      await page.getByRole("button", { name: "Verify" }).click();
    }

    // ── 3. Dashboard / Home ──────────────────────────────────────────────────
    const dashboardContent = page
      .locator("text=/active cycles|yield|germination|fertigation/i")
      .first();
    await expect(dashboardContent).toBeVisible({ timeout: 20_000 });

    // ── 4. Navigate to Cycles tab ────────────────────────────────────────────
    const cyclesTab = page
      .getByRole("tab", { name: /cycles/i })
      .or(page.getByText("Cycles").first());
    await cyclesTab.click();

    // At least one existing cycle card should be visible
    const existingCycle = page
      .locator("text=/Sunflower|Broccoli|Radish|Microgreen|Pea Shoots|Wheatgrass/i")
      .first();
    await expect(existingCycle).toBeVisible({ timeout: 10_000 });

    // ── 5. Create a new seeding cycle (3-step wizard) ────────────────────────
    // Open wizard via the "+" button in the Cycles screen header
    await page
      .getByRole("button", { name: /add|plus|\+/i })
      .or(page.locator('[aria-label*="add"], [aria-label*="plus"]'))
      .first()
      .click();

    await expect(page.getByText("New Seeding")).toBeVisible({ timeout: 10_000 });

    // -- Step 1: Seed Lot QR (WebScanner = text input in web mode) -----------
    await expect(page.getByText("Scan Seed Lot QR")).toBeVisible({ timeout: 8_000 });

    const qrInput = page.getByPlaceholder("QR code value").first();
    await qrInput.fill("LOT-E2E-001");
    // "Confirm" button inside the WebScanner confirms the QR value
    await page.getByRole("button", { name: "Confirm" }).first().click();

    // Chip with the scanned QR appears, "Add Details" becomes enabled
    await expect(page.getByText("LOT-E2E-001")).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: "Add Details" }).click();

    // -- Step 2: Tray Details ------------------------------------------------
    await expect(page.getByText("Tray Details")).toBeVisible({ timeout: 8_000 });

    await page.getByPlaceholder("e.g. Arugula").fill("Test Arugula");

    // Select the first growth profile from the list
    const firstProfile = page
      .locator("text=/Arugula|Lettuce|Kale|Squash|Microgreen/i")
      .first();
    await expect(firstProfile).toBeVisible({ timeout: 8_000 });
    await firstProfile.click();

    await page.getByRole("button", { name: "Scan Rack Slot" }).click();

    // -- Step 3: Rack Slot QR ------------------------------------------------
    await expect(page.getByText("Scan Rack Slot")).toBeVisible({ timeout: 8_000 });

    const rackInput = page.getByPlaceholder("QR code value").first();
    await rackInput.fill("RACK-E2E-01");
    await page.getByRole("button", { name: "Confirm" }).first().click();

    // Summary card appears
    await expect(page.getByText("Confirm Seeding")).toBeVisible({ timeout: 5_000 });

    // React Native Alert.alert() fires on web as window.alert() — accept it before clicking
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Confirm & Save" }).click();

    // ── 6. Verify new cycle appears in the Cycles list ───────────────────────
    // After the dialog is accepted, router.back() fires and we return to Cycles list
    await expect(page.getByText("Test Arugula")).toBeVisible({ timeout: 15_000 });

    // ── 7. Open cycle detail ─────────────────────────────────────────────────
    await page.getByText("Test Arugula").first().click();

    const detailContent = page
      .locator("text=/seed name|trays|seeding date|status|germination|fertigation|rack slot/i")
      .first();
    await expect(detailContent).toBeVisible({ timeout: 10_000 });

    // ── 8. Navigate back to Home ─────────────────────────────────────────────
    const homeTab = page
      .getByRole("tab", { name: /home/i })
      .or(page.getByText("Home").first());
    await homeTab.click();

    await expect(dashboardContent).toBeVisible({ timeout: 10_000 });

    // ── 9. Sign out ───────────────────────────────────────────────────────────
    // Avatar button (testID="sign-out-btn") top-right of Home screen
    const signOutBtn = page
      .locator('[data-testid="sign-out-btn"]')
      .or(page.getByRole("button", { name: /sign out/i }));
    await signOutBtn.click();

    // After sign-out, app shows the sign-in screen
    await expect(
      page.getByPlaceholder("you@example.com").or(page.getByText("Welcome back"))
    ).toBeVisible({ timeout: 15_000 });
  });
});
