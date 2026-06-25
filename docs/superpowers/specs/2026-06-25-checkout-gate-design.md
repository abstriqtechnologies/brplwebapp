# Checkout gate design

**Date:** 2026-06-25
**Status:** Approved — pending implementation
**Author:** Brainstorming session with user

## Problem

`/login` should be the single entry gate to the user-facing app. Today, the third step of `/login` (a "register" step) embeds the payment UI inline, so `/payment` is a redirect stub and the payment flow lives inside the login page.

We want to:

1. Strip `/login` down to phone + OTP only.
2. Move the profile + payment UI to a dedicated route (`/checkout`).
3. Make sure every user — new or returning, paid or unpaid — is routed correctly.
4. Guarantee that **nobody reaches `/dashboard` without `paymentStatus === "completed"`**.

The codebase already has all the building blocks (`brpl_pending` cookie, `brpl_auth` cookie, `User.paymentStatus`, Razorpay integration, coupon model). The work is rearrangement plus one new endpoint (`redeem-coupon`) and a small middleware enhancement.

## Goals

- `/login` is a clean two-step (phone → OTP) flow.
- `/checkout` is the real payment destination, no longer a stub.
- `/payment` 308-redirects to `/checkout` for any external links.
- The payment gate is enforced at three layers: middleware (edge), server component (`/dashboard/page.tsx`), and data (`User.paymentStatus`).
- Coupon codes work on the user-facing checkout for the first time (admin can still mark paid manually).
- Existing flows (returning paid user skips checkout, unpaid user resumes payment) keep working.

## Non-goals

- No new payment provider. Razorpay stays.
- No subscription / recurring billing. One-time ₹1,499 registration fee.
- No changes to admin panel payment endpoints.
- No refactor of the legacy `/lib/jwt.ts` vs new `/lib/auth/*` split.
- No internationalization of the new `/checkout` strings (English only, like the rest of the user-facing flow).

## Flow & routing

### Routes (after this change)

| Route | Audience | Purpose |
|---|---|---|
| `/login` | Public | Phone + OTP only. Two steps. |
| `/checkout` | OTP-verified (pending cookie) OR existing authed user with `paymentStatus !== "completed"` | Profile fields + payment (Razorpay or coupon). |
| `/dashboard` | Authenticated + paid | Welcome card + TrialPass. Same as today. |

### Route changes

- `/login` loses its third "register" step. After OTP verify, redirect user to `/checkout?next=<originalTarget>`.
- `/payment` → renamed to `/checkout`. The old `/payment` path gets a `308` redirect to `/checkout` so any external links continue to work.
- Middleware (`src/middleware.ts`) gains a new protected prefix `/checkout` (pending cookie required, OR auth cookie with `paid:false`) and `/dashboard` (auth cookie + `paid:true`).

### The six flows

```
A) New user (no record):
   /login → phone → /api/auth/send-otp
   /login → OTP → /api/auth/verify-otp → { exists:false, paid:false } → set pending cookie → /checkout?next=/dashboard
   /checkout → fill profile + pay (Razorpay OR coupon) → /api/auth/register → set auth cookie → /dashboard

B) Existing unpaid user (registered but paymentStatus=pending, e.g. abandoned mid-pay):
   /login → phone → OTP → /api/auth/verify-otp → { exists:true, paid:false } → set auth cookie → /checkout?next=/dashboard
   /checkout → pay → /api/payment/verify (HMAC) → mark User.paymentStatus=completed → /dashboard

C) Existing paid user:
   /login → phone → OTP → /api/auth/verify-otp → { exists:true, paid:true } → set auth cookie → /dashboard

D) Returning user (still has valid brpl_auth cookie, paid):
   /dashboard → middleware sees valid auth + paid → render. /login not needed.

E) User hits /dashboard directly without auth:
   middleware → 302 /login?next=/dashboard

F) User hits /dashboard with auth but unpaid (e.g. admin revoked payment):
   middleware → 302 /checkout?next=/dashboard
```

### API surface

| Endpoint | Change | Response |
|---|---|---|
| `POST /api/auth/send-otp` | unchanged | `{ success, expiresInSec }` |
| `POST /api/auth/verify-otp` | response grows `paid` and `redirect` fields | `{ success, exists, paid, user?, redirect }` |
| `POST /api/auth/me` | response confirms `paymentStatus` on user | `{ user: { ..., paymentStatus } }` |
| `POST /api/auth/register` | unchanged request; response returns `redirect: "/dashboard"` | `{ success, user, redirect }` |
| `POST /api/payment/create-order` | unchanged | Razorpay order |
| `POST /api/payment/verify` | unchanged; re-issues `brpl_auth` with `paid:true` | `{ success }` |
| `POST /api/payment/redeem-coupon` (NEW) | body `{ code }`; requires pending cookie or auth cookie with `paid:false` | `{ valid, discount, finalAmount, reason? }` |
| `POST /api/auth/logout` | unchanged | `{ success }` |

`redirect` from `verify-otp` is computed server-side:
- `exists:false` → `/checkout?next=<nextParam>`
- `exists:true, paid:true` → `<nextParam>` (or `/dashboard`)
- `exists:true, paid:false` → `/checkout?next=<nextParam>`

## `/checkout` page

### Server side (`src/app/checkout/page.tsx`)

1. Call `getPendingSession()`. If no pending cookie AND no auth cookie → redirect to `/login?next=/checkout`.
2. Read `searchParams.next` (validated against an allowlist; default `/dashboard`).
3. Fetch the user doc by phone (lightweight fields only: `paymentStatus`, `name`, `email`, `role`, `state`, `city`).
4. If user exists AND `paymentStatus === "completed"` → redirect to `/dashboard` (idempotent guard — they shouldn't be here).
5. Otherwise render `<CheckoutClient next={next} initialUser={...} />`.

### Client side (`CheckoutClient.tsx`)

Single screen, three regions stacked vertically.

```
┌──────────────────────────────────────────────┐
│  Step 1: Your details (only if new user)     │
│  ─ Name, email, role, state, city            │
│  ─ Pre-filled & read-only for existing user  │
├──────────────────────────────────────────────┤
│  Step 2: Have a coupon code?                 │
│  ─ Optional input + "Apply" button           │
│  ─ Validates inline; shows applied discount  │
│  ─ Hidden if no coupon is configured         │
├──────────────────────────────────────────────┤
│  Step 3: Pay registration fee                │
│  ─ Shows ₹1,499 (or discounted amount)       │
│  ─ "Pay with Razorpay" button OR             │
│  ─ "Complete registration" button if coupon  │
│    covers full price                         │
│  ─ Terms checkbox                            │
└──────────────────────────────────────────────┘
```

### State machine

- `profile` — controlled form state for name/email/role/state/city. Pre-filled from `initialUser` when present.
- `coupon` — `{ code, status: "idle" | "checking" | "valid" | "invalid", discount? }`.
- `paying` — boolean while Razorpay is open / register is in flight.
- `error` — surface for any failure (toast via `useToast`).

### Primary actions

| Trigger | API call | Result |
|---|---|---|
| Click **Pay with Razorpay** | `POST /api/payment/create-order` → opens Razorpay → on `handler` → `POST /api/payment/verify` → if new user, `POST /api/auth/register` → hard navigate to `/dashboard` | Auth cookie set, redirect |
| Click **Apply coupon** | `POST /api/payment/redeem-coupon` (validates only; does NOT consume) → updates local `coupon` state with discount | `coupon.status === "valid"` |
| Click **Complete registration** (with valid full-price-covering coupon) | `POST /api/payment/redeem-coupon` (consumes) → if new user, `POST /api/auth/register` → hard navigate to `/dashboard` | Auth cookie set, redirect |

### Reused components & patterns

- `useRazorpayScript` hook — already exists, use it.
- `Button`, `Input`, `Label` from `src/components/ui/` (shadcn).
- `useToast` from `src/hooks/use-toast.ts`.
- `api.post` from `src/apihelper/api.ts` for all client calls.
- `react-hook-form` + zod for the profile sub-form.
- No new design system tokens.

### Coupon UX details

- Coupon field is collapsed into a "Have a coupon code? Click to expand" disclosure to keep the page uncluttered.
- On valid apply: green banner "Coupon ABC123 applied — ₹500 off. New total: ₹999."
- On invalid: red inline error.
- Server returns `{ valid: boolean, discount: number, finalAmount: number, reason?: "expired" | "exhausted" | "min_order" | "not_found" | "inactive" }`.

### Loading & error states

- Disable Pay button while `paying === true`.
- On Razorpay modal close without payment: keep user on page, no error toast (silent return).
- On payment failure (Razorpay `handler.response.error`): toast "Payment failed. Please try again." — stay on page.
- On register failure after successful payment: dedicated error card with "Contact support with reference {paymentId}" + retry button.
- **Resumable payment:** on mount, `CheckoutClient` polls `GET /api/auth/me` every 2s for up to 60s. If the user's `paymentStatus` flipped to `completed` (e.g. the Razorpay webhook arrived while they were away), the client runs the standard "complete registration" path and navigates to `/dashboard`. This handles the "closed tab mid-payment" case without a dedicated resume screen.

### Accessibility

- All form fields have labels.
- Pay button keyboard-accessible; loading state announced via `aria-live`.
- Error messages associated with inputs via `aria-describedby`.

## Middleware & data-model changes

### Middleware (`src/middleware.ts`)

Add `/checkout` and `/checkout/:path*` to the matcher. Three gates:

| Route | Gate |
|---|---|
| `/login` | No valid `brpl_auth` cookie. If valid auth → redirect to `next` or `/dashboard`. |
| `/checkout` | Valid `brpl_pending` cookie OR valid `brpl_auth` cookie with `paid:false`. If valid auth + paid → redirect to `next` or `/dashboard`. |
| `/dashboard` | Valid `brpl_auth` cookie AND `paid:true`. If no cookie → `/login?next=/dashboard`. If auth + `paid:false` → `/checkout?next=/dashboard`. If auth + user missing → clear cookie, `/login`. |

### Edge runtime constraint

The middleware runs on Edge and currently only verifies JWT (no DB). To check `paid`, we embed `paid: boolean` in the JWT payload at issuance. The `/dashboard/page.tsx` server component re-checks via DB on every request (defense in depth, catches stale payloads).

### JWT payload update (`src/lib/auth/crypto.ts`)

```ts
type AuthTokenPayload = {
    sub: string;          // userId
    phone?: string;
    paid?: boolean;       // NEW — mirror of User.paymentStatus === "completed" at issuance
    purpose: "auth";
    [key: string]: unknown;
};
```

`signAuth` reads from the User doc and includes `paid`. `verifyAuth` unchanged.

### Cookie issuance matrix

| Endpoint | Cookie set | `paid` in payload |
|---|---|---|
| `POST /api/auth/verify-otp` (existing user, paid) | `brpl_auth` | true |
| `POST /api/auth/verify-otp` (existing user, unpaid) | `brpl_auth` | false |
| `POST /api/auth/verify-otp` (new user) | `brpl_pending` | n/a |
| `POST /api/auth/register` (after payment) | `brpl_auth` (replaces pending) | true |
| `POST /api/payment/verify` (for unpaid returning user) | `brpl_auth` re-issued | true |
| `POST /api/payment/redeem-coupon` (when coupon is consumed) | `brpl_auth` re-issued | true |

### Data-model changes

**None.** `User.paymentStatus` already exists. `Payment.source: "coupon"` already exists. No Mongoose schema changes.

### Defense-in-depth in `/dashboard/page.tsx`

Add a 5-line check after `getAuthSession()`:

```ts
if (session.user.paymentStatus !== "completed") {
    redirect("/checkout?next=/dashboard");
}
```

Catches stale JWT payloads, admin-revoked payment, race conditions, and any future code path that issues an auth cookie without `paid`.

## Testing

### Unit / integration

| Layer | What | How |
|---|---|---|
| Pure domain (`lib/domain/payment`, `lib/domain/auth`) | `verifyOtp` returns `paid` correctly; `redeemCoupon` validates/exhausts/expires; `createOrder` rejects if no pending | In-memory repos + jest. Add cases for new `paid` field. |
| API routes | `verify-otp` returns correct `paid`/`redirect`; `redeem-coupon` happy path + 4 failure reasons; `verify` re-issues cookie with `paid:true` | Integration tests. Add: unpaid returning user gets `brpl_auth` (with `paid:false`) and can hit `/checkout` but not `/dashboard`. |
| Middleware | All 6 routing cases (A–F from the flow section) | Test helper sets cookies in `next-test-api-route-handler` or hits the middleware via `new NextRequest`. |

### E2E (Playwright)

- New user happy path.
- Unpaid user happy path.
- Paid user bouncing out of `/checkout`.
- Coupon apply (valid).
- Coupon-100% path.
- Razorpay modal close.
- Direct URL `/checkout` without cookie → `/login?next=/checkout`.
- Direct URL `/dashboard` with auth + unpaid → `/checkout?next=/dashboard`.

### Manual QA

1. New phone → OTP → checkout → Razorpay test card → dashboard. ✓
2. New phone → checkout → apply valid coupon → "Complete registration" → dashboard. ✓
3. New phone → checkout → apply expired/invalid coupon → inline error, stay on page. ✓
4. Unpaid existing user → login → checkout → pay → dashboard. ✓
5. Paid existing user → login → dashboard (skip checkout). ✓
6. Paid user closes tab mid-checkout, returns → login → paid → dashboard. ✓
7. Direct URL `/checkout` without cookie → `/login?next=/checkout`. ✓
8. Direct URL `/dashboard` with auth + unpaid → `/checkout?next=/dashboard`. ✓
9. Admin marks paid user unpaid → user re-enters `/dashboard` → bounced to `/checkout`. ✓
10. Old `/payment` URL → 308 to `/checkout`. ✓
11. Logout from `/dashboard` → `/login`. ✓

## Rollout

1. Spec PR + plan PR first.
2. Implementation merges as a single deploy; no feature flag. The routes are not user-visible enough for a flag to help, and the `/payment` → `/checkout` 308 is reversible.
3. Keep `/payment` route handler (now a 308 redirect) for at least 30 days. Log hits to detect any external links.
4. Internal announcement: "Payment moved to `/checkout`." No user-facing email needed (no public links to `/payment` exist — confirmed by the recent migration script that rewrote CMS links to `/login`).

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Stale JWT `paid:true` lets unpaid user hit `/dashboard` | Low | Medium | Defense-in-depth check in `/dashboard/page.tsx` server component. Catches on next request. |
| Race: payment captured, user closes tab before register | Low | Low | Razorpay webhook already auto-finalizes User. Polling on `/checkout` mount (every 2s for 60s) detects the flip and completes registration. |
| Webhook arrives before user fills profile | Low | Low | Current code creates a minimal User with `phone` only; profile fields get filled on `/api/auth/register`. |
| Coupon abuse (single-use code used by many) | Low | Medium | `Coupon.usageLimit` + `usedCount` enforced server-side. `CouponUsage` row unique per `(couponId, userId)`. (Verify in existing code during implementation.) |
| `/checkout` URL shared externally (no auth, just OTP) | Low | Low | Middleware gates `/checkout` to pending or auth cookies. Worst case: visitor lands on `/login?next=/checkout`. |
| Admin "mark paid" doesn't reflect in middleware until cookie expires | Medium | Low | Same as stale-JWT risk; defense-in-depth handles it. |
| Two parallel JWT helpers still in use | Low | Low | Out of scope. Documented as known wart. |
