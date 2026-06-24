# Unified Login Route — Design Spec

**Date:** 2026-06-24
**Status:** Approved
**Scope:** Consolidate the fragmented player auth flow into a single `/login` URL.

---

## Problem

The player-facing auth journey is currently split across **four routes**:

| Route | Purpose |
|---|---|
| `/auth` | Phone entry only |
| `/auth/verify-otp` | OTP entry |
| `/auth/register` | Profile form (after payment) |
| `/payment` | Redirect shim to `/auth?mode=register&next=/dashboard` |
| `/registration` | Redirect shim to `/auth` |

Plus a `?mode=register` / `?mode=login` query parameter that callers must pass to disambiguate. The result: five URLs, a query string, and a `mode` concept that the user never asked about. The system already decides login vs register server-side based on whether the phone exists — the fragmentation is purely a frontend routing artifact.

## Goal

**One URL, no mode parameter.** A user visits `http://localhost:3001/login` and the system handles both cases:

- **Existing user** → phone → OTP → `/dashboard` (login)
- **New user** → phone → OTP → payment → profile → `/dashboard` (registration)

The server already does the branching at `/api/auth/verify-otp` (returns `exists: true` for known phones, `exists: false` for new ones). The client just needs to render the right step based on that response.

## Solution

Replace the four auth-adjacent pages with a **single client component at `/login`** that owns all steps as internal React state. No `?mode=`. No router navigation between steps. The whole flow is one component with a `step` state machine.

### State machine

```
step: "phone"
  └─ User enters phone → POST /api/auth/send-otp
  └─ step = "otp"

step: "otp"
  └─ User enters 6-digit code → POST /api/auth/verify-otp
       ├─ exists: true   → router.replace(next || "/dashboard")   [LOGIN COMPLETE]
       └─ exists: false  → step = "register"

step: "register"   (new user only)
  └─ Render payment card
       └─ User clicks "Pay" → POST /api/payment/create-order → Razorpay
       └─ On Razorpay success → POST /api/payment/verify
       └─ Set paymentId/orderId in state
  └─ Render profile form (name, email, role, state, city)
       └─ User submits → POST /api/auth/register → router.replace(next || "/dashboard")
```

### Redirect-after-login (preserved)

The `?next=` query param convention is preserved. `src/middleware.ts` passes `?next=/dashboard` when redirecting unauthenticated dashboard requests; the `/login` page reads it from `useSearchParams()` and on successful auth calls `router.replace(next || "/dashboard")`. This keeps middleware-redirect-after-login working without changes to the auth contract.

---

## Files

### Created

- **`src/app/login/page.tsx`** — new unified auth client. Single file. Three step sections rendered conditionally based on `step` state. Embeds payment inline as part of the register step. Uses the existing `useSiteSettings` hook for site name display in the Razorpay modal.

### Deleted

- **`src/app/auth/page.tsx`** — replaced by `/login`.
- **`src/app/auth/verify-otp/page.tsx`** — sub-route no longer needed.
- **`src/app/auth/register/page.tsx`** — sub-route no longer needed.
- **`src/app/auth/`** directory (and `verify-otp/`, `register/` subdirectories) — emptied.
- **`src/app/(main)/registration/page.tsx`** — redirect shim. Its only job was to forward to `/auth`; with `/auth` gone, callers will use `/login` directly.
- **`src/app/(main)/registration/`** directory (if emptied).

### Modified — link / redirect updates

These are the call sites that point to the old routes. Each is a one-line change.

| File | Change |
|---|---|
| `src/middleware.ts` | Redirect target `/auth` → `/login` (lines 19, 30). |
| `src/app/payment/page.tsx` | `redirect("/auth?mode=register&next=/dashboard")` → `redirect("/login?next=/dashboard")`. |
| `src/app/payment/PaymentClient.tsx` | `router.replace("/auth?mode=register&next=/dashboard")` → `router.replace("/login?next=/dashboard")`. |
| `src/app/dashboard/page.tsx` | `redirect("/auth?next=/dashboard")` → `redirect("/login?next=/dashboard")`. |
| `src/app/dashboard/DashboardClient.tsx` | `/auth?next=/dashboard` → `/login?next=/dashboard` (lines 55, 60, 68). Line 251 `/auth?mode=register` → `/login`. |
| `src/app/api/payment/verify/route.ts` | `redirect: "/auth?mode=register&next=/dashboard"` → `redirect: "/login?next=/dashboard"`. |
| `src/app/(main)/thank-you/ThankYouClient.tsx` | `/auth?mode=login&next=/dashboard` → `/login?next=/dashboard`. |
| `src/components/ClientProviders.tsx` | `CHROME_HIDDEN_PREFIXES` includes `/auth` → change to `/login` (and the corresponding `data-route` attribute elsewhere in the codebase, if any). |
| `src/components/Banner.tsx` | `href="/registration"` → `href="/login"`. |
| `src/components/FloatingRegisterButton.tsx` | `settings.floatingRegisterLink` default `"/registration"` → `"/login"`. |
| `src/components/ZoneDeadlineSection.tsx` | `router.push("/registration")` → `router.push("/login")`. |
| `src/components/WhoWeAre.tsx` | `href="/registration"` → `href="/login"`. |
| `src/components/SchemaMarkup.tsx` | Route label map entry for `"/registration"` → `"/login"`. |
| `src/app/(admin)/admin/settings/page.tsx` | `headerCtaLink` placeholder `"/registration"` → `"/login"`. |
| `src/models/SiteSettings.ts` | Defaults `headerCtaLink: "/registration"` and `floatingRegisterLink: "/registration"` → `"/login"`. |

### Unchanged (intentionally)

- **All `/api/auth/*` routes** — server-side branching at `verify-otp` is already correct.
- **All `/api/payment/*` routes** — only the `redirect` string in the verify response changes.
- **`src/app/(admin-public)/admin/login/page.tsx`** — separate admin auth, separate concern.
- **`src/app/payment/`** directory — kept as a redirect shim. With `/auth` gone, it now points to `/login?next=/dashboard` instead of `/auth?mode=register&next=/dashboard`. Any old link to `/payment` still works.

### CMS-configurable links

`SiteSettings.headerCtaLink` and `SiteSettings.floatingRegisterLink` are CMS-configurable per site. If existing sites have explicitly set these to `/registration`, the redirect shim (when we keep it during the migration window) will still send users to `/login` correctly. After the shim is deleted, any explicit `/registration` value in the DB will 404 — admins will need to update those fields. The *defaults* are changed so newly-created sites land on `/login` automatically.

This is a one-time migration concern. We update the defaults now; admins who customized the values will see a brief 404 until they re-save. Acceptable risk for a single deletion.

---

## API contract (no change)

| Endpoint | Request | Response | Effect |
|---|---|---|---|
| `POST /api/auth/send-otp` | `{ phone }` | `{ success, expiresInSec }` or error | Sends OTP, advances step. |
| `POST /api/auth/verify-otp` | `{ phone, otp }` | `{ success, exists: bool, redirect, user? }` | **Single source of truth for login-vs-register branching.** |
| `POST /api/payment/create-order` | — | `{ orderId, amount, currency, key }` | Creates Razorpay order for new users. |
| `POST /api/payment/verify` | `{ orderId, paymentId, signature }` | `{ success, redirect }` | Verifies payment, sets `redirect` to `/login?next=/dashboard`. |
| `POST /api/auth/register` | `{ name, email, role, state, city, paymentId, orderId }` | `{ success, user, redirect }` | Completes new-user registration. |

No API change required. The frontend just collapses onto the existing contract.

---

## Behavior

### Phone step
- Input: 10-digit Indian mobile number, `+91` prefix shown.
- Validation: must be exactly 10 digits. Disabled submit until valid.
- On submit: `POST /api/auth/send-otp`. On success, advance to OTP step. On error, show inline error.

### OTP step
- 6 single-digit inputs. Auto-advance on digit. Backspace goes back. Paste of 6 digits auto-fills and submits.
- Resend button with 60s cooldown.
- "Wrong number?" link returns to phone step.
- On submit: `POST /api/auth/verify-otp`. On success:
  - `exists: true` → set toast "Welcome back" → `router.replace(next || "/dashboard")`. Login done.
  - `exists: false` → advance to register step.
- On error: clear inputs, show inline error, refocus first box.

### Register step (new user only)
- **Payment card first.** Shows registration fee (`₹1,499` from existing display), "Pay" button.
- On "Pay": `POST /api/payment/create-order` → load Razorpay script (lazily) → open checkout.
- On Razorpay success: `POST /api/payment/verify` → set `paymentId` state → show profile form.
- On Razorpay dismiss: show "Payment cancelled" toast, stay on this step.
- **Profile form** (after payment): name, email, role (select: Batsman/Bowler/All-rounder/Wicket-keeper), state, city.
- On submit: `POST /api/auth/register` → `router.replace(next || "/dashboard")`. Registration done.
- Back button to phone step not shown — once you're past OTP, going back is unusual.

### Error handling

- Phone validation: inline error under the input.
- OTP failure: inline error under the boxes, inputs cleared.
- Payment init failure: toast.
- Razorpay load failure: toast.
- Payment verification failure: toast, stay on payment card.
- Registration submit failure: toast, stay on profile form.

### Loading states

- Disable submit buttons during in-flight requests.
- Show `Loader2` spinner in the button.

---

## Constraints

- **No new dependencies.** Reuse existing `Button`, `Input`, `Loader2`, `useSiteSettings`, `useToast`, and the existing Razorpay integration.
- **No new API endpoints.** Server-side branching already works.
- **One URL, no query params for mode.** `?next=` is preserved as a redirect target — that's not a mode param.
- **Admin auth stays separate.** `/(admin-public)/admin/login` is unchanged.

---

## Out of scope

- Visual redesign of the auth page (existing Stadium CSS in `globals.css` is fine; new component reuses the same look).
- Tests for the new component. The existing 3 deleted pages had no tests, and the API contract is unchanged. Pure-function helpers can be extracted later if desired.
- Refactoring the 3 deleted pages into helpers first — they're being deleted, so this is moot.
- Changing the admin login page.
- SEO/marketing implications of the URL change beyond updating the `SchemaMarkup` route label map.

---

## Acceptance criteria

1. Visiting `/login` shows the phone entry step. No `?mode=` is required.
2. Entering a phone that has an existing user record, completing OTP, lands on `/dashboard`. (Login path.)
3. Entering a phone that has no user record, completing OTP, advances to the register step (payment + profile). (Register path.)
4. After successful payment + profile submit, lands on `/dashboard`.
5. The `?next=` query param is respected: `/login?next=/foo` redirects to `/foo` after auth.
6. Middleware redirect for unauthenticated `/dashboard` access: `src/middleware.ts` redirects to `/login?next=/dashboard`, not `/auth`.
7. No references to `/auth`, `/auth/verify-otp`, `/auth/register`, or `/registration` remain in the codebase, except for the deleted-file history.
8. The new `src/app/login/page.tsx` is the only auth-related page rendered for player auth.
9. `npm run build` succeeds.
10. `npx tsc --noEmit` reports no new errors.
