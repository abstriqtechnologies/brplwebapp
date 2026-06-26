# Registration flow happy-path design

**Date:** 2026-06-26
**Status:** Approved — pending implementation
**Author:** Brainstorming session with user

## Problem

The registration flow (login → checkout → dashboard) was reported as broken. Console logs surfaced cascading errors: a hydration mismatch, a `/checkout` redirect loop, `/api/payment/verify` returning 404, and ~100 failed image requests to `localhost:37857`/`7070`/`7071`. Investigation traced these to:

1. **Root cause of cascade:** A Radix UI `<ToastViewport>` React portal caused a hydration mismatch on every page, forcing React to bail to client-side rendering, which stripped server-issued auth cookies. **Already fixed** in the prior session by deferring `<Toaster>` mount until after hydration (`src/components/ClientProviders.tsx`).

2. **`/api/payment/verify` 404:** Transient — the route was being added during an active checkout-flow hardening pass (commits `87947a5`, `36c125b`, etc.). The route now exists and returns the correct responses.

3. **`/checkout` redirect loop:** A separate bug from #1. Triggered when a JWT is cryptographically valid but its `sub` no longer matches a user in MongoDB. The middleware lets the request through (valid JWT, `paid` undefined → treated as unpaid), the server component's `getAuthSession()` returns `null` (user missing), and the page redirects to `/login`. The middleware then bounces the user back to `/checkout` because the JWT is still valid. Infinite loop.

4. **Image-server errors (`:37857`, `:7070`, `:7071`):** Data issue, not code. CMS-stored image URLs point to a local proxy that isn't currently running. Doesn't affect the payment flow.

The user wants the **complete registration flow to work end-to-end with zero errors**. Specifically:
- A new user can: enter phone → receive OTP → verify OTP → fill profile → pay via Razorpay → land on `/dashboard` with `paymentStatus: "completed"`.
- Same flow with a 100%-off coupon.
- No console errors, no failed network requests, no redirect loops.
- The stale-JWT redirect-loop bug is fixed.

## Goals

1. **OTP bypass for testing:** A known code (`123456`) is accepted in non-production environments so the flow is repeatedly exercisable without SMS infrastructure.
2. **Stale-JWT redirect-loop fix:** When a `brpl_auth` JWT references a user that no longer exists in the DB, the middleware clears the cookie and sends the user cleanly to `/login`.
3. **Vitest regression net:** Unit tests covering the full API contract from `send-otp` through `register` with a mocked Razorpay client. Catches regressions at sub-second speed.
4. **Playwright E2E with real Razorpay:** A real-browser test that drives the entire happy path against `rzp_test_Sx4iEFt69t5wjN`, asserts zero console errors and zero failed network requests, and confirms the user lands on `/dashboard` with `paymentStatus: "completed"`.

## Non-goals

- No changes to admin panel payment endpoints.
- No changes to the `/payment` legacy route or its 308 redirect.
- No refactor of the existing `<CheckoutClient>` architecture (already in good shape per the recent checkout-gate design).
- No production-code changes to the SMS provider integration (OTP bypass is dev-only).
- No changes to the CMS data cleanup (`:37857`/`:7070`/`:7071` images).
- No new payment provider, no subscriptions, no recurring billing.
- No internationalization of strings.

## Architecture

Five independent changes, each small, isolated, and testable.

### 1. OTP bypass in non-production

**Files:**
- `src/lib/domain/auth/service.ts` — bypass in `verifyOtp` and `sendOtp`
- `tests/lib/domain/auth.test.ts` — 2 new tests

**Mechanism:** In `verifyOtp`, after parsing the input but before calling `otpRepo.findOne`, check:

```ts
if (env.isDev && body.code === "123456") {
    logger.warn("auth.otp.dev_bypass_used", { phone: body.phone });
    // Look up or create a stub user; return the same shape as a real verify
}
```

For `sendOtp` in dev mode, skip the `sendSms()` call entirely and return `{ expiresInSec: 300 }` directly. No OTP record is written to the database in dev mode — the verify path is gated by `env.isDev && code === "123456"` and doesn't read from the OTP repo at all.

The bypass is gated by `env.isDev` which is `true` whenever `NODE_ENV !== "production"`. Production behavior is byte-for-byte unchanged.

### 2. Stale-JWT redirect-loop fix

**Files:**
- `src/lib/auth/session-guard.ts` — new helper `verifyAuthAndUser(token)` that returns either a valid `{ user, payload }` or one of `{ reason: "expired" | "user_missing" | "invalid_token" }`
- `src/middleware.ts` — use the helper in `/checkout` and `/dashboard` branches
- `tests/api/checkout.gate.test.ts` — 2 new tests

**Mechanism:** The new helper does both JWT verification and `User.findById(payload.sub)`. In middleware:

```ts
const auth = await verifyAuthAndUser(req.cookies.get("brpl_auth")?.value);
if (auth.reason === "user_missing") {
    const res = redirectTo(req, "/login", { next: pathname });
    res.cookies.delete("brpl_auth");   // breaks the loop on next request
    return res;
}
if (auth.reason === "expired") {
    const res = redirectTo(req, "/login", { next: pathname });
    res.cookies.delete("brpl_auth");
    return res;
}
// ...continue with auth.user / auth.payload
```

Applied to both `/checkout` and `/dashboard` branches. The `/login` branch already handles expired JWTs (it deletes the cookie), so no change there.

The middleware matcher gains nothing — it already covers both routes. Only the handler logic changes.

### 3. Vitest regression net for the API contract

**Files:**
- `tests/api/registration.happy-path.test.ts` — new

**Mechanism:** Drive the API endpoints in order using `InMemoryUserRepo` + `InMemoryPaymentRepo` + a fake `RazorpayLike`:

```
Test 1: Razorpay happy path (new user)
  POST /api/auth/send-otp     (dev mode)   → 200, expiresInSec
  POST /api/auth/verify-otp   (123456)     → 200, exists:false, redirect:/checkout
  POST /api/payment/create-order (pending) → 200, orderId, key
  POST /api/payment/verify    (HMAC ok)    → 200, success:true, redirect:/dashboard
  POST /api/auth/register     (profile)    → 200, user.paymentStatus: "completed"

Test 2: Coupon 100% path (new user)
  POST /api/auth/send-otp
  POST /api/auth/verify-otp   → 200, exists:false
  POST /api/payment/redeem-coupon (consume, profile)
                                 → 200, redirect:/dashboard, user.paymentStatus: "completed"

Test 3: Returning unpaid user resumes payment
  POST /api/auth/send-otp
  POST /api/auth/verify-otp   → 200, exists:true, paid:false
  POST /api/payment/create-order (auth+unpaid) → 200
  ...same verify path...

Test 4: Stale JWT
  mint a JWT for userId that doesn't exist
  GET /checkout with that cookie → expect 307 to /login?next=/checkout, AND the Set-Cookie header for brpl_auth is deleted
```

Test fixtures reuse the `mintAuthToken` / `mintPendingToken` helpers from `tests/api/checkout.gate.test.ts`. The HMAC signature in Test 1 is computed via the same `crypto.createHmac` recipe the service uses internally, so the test doesn't need to know Razorpay internals.

The test file lives in `tests/api/` to match the project's existing convention (see `tests/api/checkout.gate.test.ts`, `tests/api/redeem-coupon.test.ts`).

### 4. Playwright E2E with real Razorpay

**Files:**
- `package.json` — add `@playwright/test` dev dep, add `test:e2e` script
- `playwright.config.ts` — new, configures base URL and dev-server lifecycle
- `tests/e2e/registration.spec.ts` — new
- `tests/e2e/README.md` — how to run, environment requirements

**Mechanism:** Standard Playwright layout:

```ts
test("new user completes registration", async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
    page.on("response", (r) => r.status() >= 400 && failedRequests.push(`${r.status()} ${r.url()}`));

    await page.goto("http://localhost:3000/login");
    await page.getByLabel("Mobile Number").fill("9999999999");
    await page.getByRole("button", { name: "Send OTP" }).click();
    // ...wait for OTP step
    await page.locator('input[aria-label="Digit 1"]').fill("1");
    await page.locator('input[aria-label="Digit 2"]').fill("2");
    // ...etc through digit 6
    await expect(page).toHaveURL(/\/checkout/);

    await page.getByLabel("Full name").fill("E2E Test User");
    await page.getByLabel("Email").fill("e2e@test.com");
    // ...state, city

    await page.getByRole("button", { name: /Pay/ }).click();
    // Razorpay opens in an iframe. The test interacts with the iframe.
    const iframe = page.frameLocator("iframe[src*='razorpay']");
    await iframe.getByText("Card").click();
    await iframe.getByLabel("Card number").fill("4111 1111 1111 1111");
    // ...exp, cvv
    await iframe.getByRole("button", { name: "Pay" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
});
```

The `playwright.config.ts` config:
- `testDir: "./tests/e2e"`
- `use.baseURL: "http://localhost:3000"`
- `webServer` block runs `npm run dev` and waits for the server before tests start

### 5. (Already done) Hydration fix

The `<Toaster>` hydration fix in `src/components/ClientProviders.tsx` is from the prior session and stands. No new work for this spec, but referenced here so the full picture is in one place.

## Data flow

No DB schema changes. No model changes. The existing `User` and `Payment` models are sufficient.

The only new persistent signal is the `brpl_auth` cookie deletion when the stale-JWT fix kicks in. That's a side-effect of the redirect response, not a DB change.

## Error handling

- **OTP bypass is fail-loud:** any production deployment with `NODE_ENV !== "production"` set incorrectly is a misconfiguration. The bypass logs `auth.otp.dev_bypass_used` at WARN level on every call so it's visible in logs.
- **Stale-JWT fix is best-effort:** the helper tries to verify the JWT and look up the user. If the DB call fails (network blip), it falls back to current behavior (treat as unauthenticated). We don't want a Mongo outage to start clearing valid cookies.
- **Playwright test fails the build:** any console error or 4xx/5xx response during the E2E run fails the test. CI will catch regressions.

## Testing strategy

Three layers, each with a different scope and speed:

| Layer | Scope | Speed | Catches |
|---|---|---|---|
| Vitest unit (existing) | Service helpers, domain logic | <100ms per test | Pure logic regressions |
| Vitest regression net (new) | Full API contract with mocked Razorpay | ~1s for the new file | API contract drift, HMAC mistakes |
| Playwright E2E (new) | Real browser, real Razorpay, real network | ~30s per test | Hydration, redirect loops, console noise, real-API quirks |

The E2E test runs in CI before any release. The Vitest net runs on every commit.

## Verification

1. **Before any code:** capture baseline — current console output on a fresh checkout, current test suite passing count.
2. **After OTP bypass + tests:** `npm test` passes, including the 2 new tests in `tests/lib/domain/auth.test.ts`.
3. **After stale-JWT fix + tests:** `npm test` passes, including the 2 new tests in `tests/api/checkout.gate.test.ts`. Manual: log in as a test user, delete them from MongoDB, navigate to `/checkout` — should land on `/login` cleanly without a redirect loop.
4. **After Vitest regression net:** `npm test` passes including `tests/api/registration.happy-path.test.ts`.
5. **After Playwright E2E setup:** `npm run test:e2e` runs the full flow against the real Razorpay test mode, passes with zero console errors and zero failed requests.
6. **Final manual smoke:** clear all cookies, repeat the entire flow in a fresh browser session, verify `/dashboard` renders the TrialPass with the test user's name.

## Files touched (summary)

Production code (3 files modified, 1 new):

- `src/lib/domain/auth/service.ts` (modified — OTP bypass)
- `src/middleware.ts` (modified — stale-JWT fix)
- `src/lib/auth/session-guard.ts` (new — `verifyAuthAndUser` helper)
- `tests/lib/domain/auth.test.ts` (modified — 2 new tests)
- `tests/api/checkout.gate.test.ts` (modified — 2 new tests)
- `tests/api/registration.happy-path.test.ts` (new — Vitest regression net)
- `package.json` (modified — add `@playwright/test`, `test:e2e` script)
- `playwright.config.ts` (new)
- `tests/e2e/registration.spec.ts` (new)
- `tests/e2e/README.md` (new)

Total: ~4 production files, ~5 test/config files, ~250-400 lines of code (mostly tests).

## Out of scope (explicit)

- CMS data cleanup (`:37857`/`:7070`/`:7071` images).
- Admin panel payment endpoints.
- Refactor of `<CheckoutClient>`.
- Internationalization.
- Subscription billing.
- Real-device SMS testing.
- Load testing / performance benchmarks.
