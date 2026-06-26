import { test, expect } from "@playwright/test";

/**
 * End-to-end registration happy path against real Razorpay test mode.
 *
 * Requires:
 *   - npm run dev (Playwright auto-starts via webServer config)
 *   - Razorpay test mode keys in env (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
 *   - MongoDB reachable at MONGODB_URI
 *   - A clean state for the test phone (delete the user from DB before re-running)
 *
 * Asserts:
 *   - Zero console errors during the run
 *   - Zero failed network requests (status >= 400)
 *   - Final URL is /dashboard
 */

const TEST_PHONE = "9999999999";
const TEST_OTP = "123456"; // dev bypass
const TEST_CARD = {
    number: "4111 1111 1111 1111",
    expiry: "12/30",
    cvv: "123",
};

test.describe.configure({ mode: "serial" });

test("new user completes registration via Razorpay", async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("response", (resp) => {
        if (resp.status() >= 400 && !resp.url().includes("favicon")) {
            failedRequests.push(`${resp.status()} ${resp.url()}`);
        }
    });

    // 1. Open /login
    await page.goto("/login");

    // 2. Enter phone, click Send OTP
    await page.getByLabel(/mobile number/i).fill(TEST_PHONE);
    await page.getByRole("button", { name: /send otp/i }).click();

    // 3. Wait for OTP step, fill 6 digits
    for (let i = 1; i <= 6; i++) {
        await page.getByLabel(`Digit ${i}`).fill(TEST_OTP[i - 1]);
    }

    // 4. Should redirect to /checkout
    await expect(page).toHaveURL(/\/checkout/, { timeout: 15_000 });

    // 5. Fill profile (only visible for new users)
    await page.getByLabel(/full name/i).fill("Playwright E2E User");
    await page.getByLabel(/email/i).fill("playwright-e2e@test.com");
    // Role buttons are visible by default (batsman is preselected).
    // Just click "All-Rounder" to exercise the role change path.
    await page.getByRole("button", { name: /all-rounder/i }).click();
    await page.getByLabel(/state/i).fill("Maharashtra");
    await page.getByLabel(/city/i).fill("Mumbai");

    // 6. Click Pay
    await page.getByRole("button", { name: /^pay/i }).click();

    // 7. Razorpay iframe — fill card details and submit
    const rzpFrame = page.frameLocator("iframe[src*='razorpay']");
    await expect(rzpFrame.locator("body")).toBeVisible({ timeout: 30_000 });
    // Card is the default payment method. If not, click "Card".
    try {
        await rzpFrame.getByText(/^card$/i).click({ timeout: 2000 });
    } catch {
        /* already on card tab */
    }
    await rzpFrame.getByLabel(/card number/i).fill(TEST_CARD.number);
    await rzpFrame.getByLabel(/expiry/i).fill(TEST_CARD.expiry);
    await rzpFrame.getByLabel(/cvv/i).fill(TEST_CARD.cvv);
    await rzpFrame.getByRole("button", { name: /pay/i }).click();

    // 8. Should land on /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    // 9. TrialPass should be visible (proves user is loaded)
    await expect(page.getByText("Playwright E2E User")).toBeVisible();

    // 10. Final assertions: no console errors, no failed requests
    expect(consoleErrors, "Console errors:\n" + consoleErrors.join("\n")).toEqual([]);
    expect(failedRequests, "Failed requests:\n" + failedRequests.join("\n")).toEqual([]);
});
