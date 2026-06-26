# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: registration.spec.ts >> new user completes registration via Razorpay
- Location: tests/e2e/registration.spec.ts:28:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('iframe[src*=\'razorpay\']').contentFrame().locator('body')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for locator('iframe[src*=\'razorpay\']').contentFrame().locator('body')

```

```yaml
- region "Notifications (F8)":
  - list
- banner:
  - link "BRPL Logo":
    - /url: /
    - img "BRPL Logo"
  - img
  - link "+(91) 81309 55866":
    - /url: tel:+918130955866
  - img
  - link "info@brpl.net":
    - /url: mailto:info@brpl.net
  - link "LOGIN":
    - /url: /login
    - img
    - text: LOGIN
  - link "Facebook":
    - /url: https://www.facebook.com/profile.php?id=61584782136820
    - img "Facebook"
  - link "Twitter":
    - /url: https://x.com/BRPLOfficial
    - img "Twitter"
  - link "Instagram":
    - /url: https://www.instagram.com/brpl.t10
    - img "Instagram"
  - navigation:
    - link "Home":
      - /url: /
    - link "About Us":
      - /url: /about-us
    - link "Teams":
      - /url: /teams
    - link "Events":
      - /url: /events
    - button "Blog":
      - text: Blog
      - img
    - link "Career":
      - /url: /career
    - button "Partners":
      - text: Partners
      - img
    - link "FAQs":
      - /url: /faqs
    - link "Registration":
      - /url: /login
    - link "Contact Us":
      - /url: /contact-us
- main:
  - img
  - heading "Complete registration" [level=1]
  - paragraph: Pay ₹1,499 to unlock your BRPL dashboard.
  - heading "Your details" [level=2]
  - img
  - text: Playing role
  - button "Batsman Specialist batter" [pressed]:
    - img
    - text: Batsman Specialist batter
    - img
  - button "Bowler Specialist bowler":
    - img
    - text: Bowler Specialist bowler
  - button "All-Rounder Bat & bowl":
    - img
    - text: All-Rounder Bat & bowl
  - button "Wicket-Keeper Keeper & batter":
    - img
    - text: Wicket-Keeper Keeper & batter
  - img
  - text: Full name
  - textbox "Full name": Playwright E2E User
  - img
  - text: Email
  - textbox "Email": playwright-e2e@test.com
  - img
  - text: State
  - textbox "State": Maharashtra
  - img
  - text: City
  - textbox "City": Mumbai
  - button "Have a coupon code?":
    - img
    - text: Have a coupon code?
    - img
  - text: Amount due ₹1,499
  - button "Pay ₹1,499"
- contentinfo:
  - img "Player Left"
  - img "Player Right"
  - heading "Teams" [level=3]
  - list:
    - listitem:
      - text: ●
      - link "North East Panthers":
        - /url: /teams
    - listitem:
      - text: ●
      - link "Central Strikers":
        - /url: /teams
    - listitem:
      - text: ●
      - link "Western Heroes":
        - /url: /teams
    - listitem:
      - text: ●
      - link "Northern Dabanggs":
        - /url: /teams
    - listitem:
      - text: ●
      - link "Southern Lions":
        - /url: /teams
    - listitem:
      - text: ●
      - link "Eastern Rhions":
        - /url: /teams
  - heading "BRPL - T10" [level=3]
  - list:
    - listitem:
      - text: ●
      - link "About Us":
        - /url: /about-us
    - listitem:
      - text: ●
      - link "Contact Us":
        - /url: /contact-us
    - listitem:
      - text: ●
      - link "Partners":
        - /url: /partners
  - heading "Useful Links" [level=3]
  - list:
    - listitem:
      - text: ●
      - link "Registration":
        - /url: /login
    - listitem:
      - text: ●
      - link "FAQs":
        - /url: /faqs
    - listitem:
      - text: ●
      - link "Events":
        - /url: /events
  - heading "Contact" [level=3]
  - list:
    - listitem:
      - text: ●
      - link "Contact Us":
        - /url: /contact-us
    - listitem:
      - text: ●
      - link "News":
        - /url: /news
  - text: "Phone:"
  - link "+(91) 81309 55866":
    - /url: tel:+918130955866
  - text: "Email:"
  - link "info@brpl.net":
    - /url: mailto:info@brpl.net
  - text: Address:Ground Floor, Suite G-01, Procapitus Business Park, D-247/4A, D Block, Sector 63, Noida, Uttar Pradesh 201309
  - link "Facebook":
    - /url: https://www.facebook.com/profile.php?id=61584782136820
    - img "Facebook"
  - link "Twitter":
    - /url: https://x.com/BRPLOfficial
    - img "Twitter"
  - link "Instagram":
    - /url: https://www.instagram.com/brpl.t10
    - img "Instagram"
  - text: © Copyright 2026 | All Rights Reserved by Beyond Reach Premier League
- alert
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | /**
  4  |  * End-to-end registration happy path against real Razorpay test mode.
  5  |  *
  6  |  * Requires:
  7  |  *   - npm run dev (Playwright auto-starts via webServer config)
  8  |  *   - Razorpay test mode keys in env (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
  9  |  *   - MongoDB reachable at MONGODB_URI
  10 |  *   - A clean state for the test phone (delete the user from DB before re-running)
  11 |  *
  12 |  * Asserts:
  13 |  *   - Zero console errors during the run
  14 |  *   - Zero failed network requests (status >= 400)
  15 |  *   - Final URL is /dashboard
  16 |  */
  17 | 
  18 | const TEST_PHONE = "9999999999";
  19 | const TEST_OTP = "123456"; // dev bypass
  20 | const TEST_CARD = {
  21 |     number: "4111 1111 1111 1111",
  22 |     expiry: "12/30",
  23 |     cvv: "123",
  24 | };
  25 | 
  26 | test.describe.configure({ mode: "serial" });
  27 | 
  28 | test("new user completes registration via Razorpay", async ({ page }) => {
  29 |     const consoleErrors: string[] = [];
  30 |     const failedRequests: string[] = [];
  31 | 
  32 |     page.on("console", (msg) => {
  33 |         if (msg.type() === "error") consoleErrors.push(msg.text());
  34 |     });
  35 |     page.on("response", (resp) => {
  36 |         if (resp.status() >= 400 && !resp.url().includes("favicon")) {
  37 |             failedRequests.push(`${resp.status()} ${resp.url()}`);
  38 |         }
  39 |     });
  40 | 
  41 |     // 1. Open /login
  42 |     await page.goto("/login");
  43 | 
  44 |     // 2. Enter phone, click Send OTP
  45 |     await page.getByLabel(/mobile number/i).fill(TEST_PHONE);
  46 |     await page.getByRole("button", { name: /send otp/i }).click();
  47 | 
  48 |     // 3. Wait for OTP step, fill 6 digits
  49 |     for (let i = 1; i <= 6; i++) {
  50 |         await page.getByLabel(`Digit ${i}`).fill(TEST_OTP[i - 1]);
  51 |     }
  52 | 
  53 |     // 4. Should redirect to /checkout
  54 |     await expect(page).toHaveURL(/\/checkout/, { timeout: 15_000 });
  55 | 
  56 |     // 5. Fill profile (only visible for new users)
  57 |     await page.getByLabel(/full name/i).fill("Playwright E2E User");
  58 |     await page.getByLabel(/email/i).fill("playwright-e2e@test.com");
  59 |     // Role buttons are visible by default (batsman is preselected).
  60 |     // Just click "All-Rounder" to exercise the role change path.
  61 |     await page.getByRole("button", { name: /all-rounder/i }).click();
  62 |     await page.getByLabel(/state/i).fill("Maharashtra");
  63 |     await page.getByLabel(/city/i).fill("Mumbai");
  64 | 
  65 |     // 6. Click Pay
  66 |     await page.getByRole("button", { name: /^pay/i }).click();
  67 | 
  68 |     // 7. Razorpay iframe — fill card details and submit
  69 |     const rzpFrame = page.frameLocator("iframe[src*='razorpay']");
> 70 |     await expect(rzpFrame.locator("body")).toBeVisible({ timeout: 30_000 });
     |                                            ^ Error: expect(locator).toBeVisible() failed
  71 |     // Card is the default payment method. If not, click "Card".
  72 |     try {
  73 |         await rzpFrame.getByText(/^card$/i).click({ timeout: 2000 });
  74 |     } catch {
  75 |         /* already on card tab */
  76 |     }
  77 |     await rzpFrame.getByLabel(/card number/i).fill(TEST_CARD.number);
  78 |     await rzpFrame.getByLabel(/expiry/i).fill(TEST_CARD.expiry);
  79 |     await rzpFrame.getByLabel(/cvv/i).fill(TEST_CARD.cvv);
  80 |     await rzpFrame.getByRole("button", { name: /pay/i }).click();
  81 | 
  82 |     // 8. Should land on /dashboard
  83 |     await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  84 | 
  85 |     // 9. TrialPass should be visible (proves user is loaded)
  86 |     await expect(page.getByText("Playwright E2E User")).toBeVisible();
  87 | 
  88 |     // 10. Final assertions: no console errors, no failed requests
  89 |     expect(consoleErrors, "Console errors:\n" + consoleErrors.join("\n")).toEqual([]);
  90 |     expect(failedRequests, "Failed requests:\n" + failedRequests.join("\n")).toEqual([]);
  91 | });
  92 | 
```