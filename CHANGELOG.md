# Changelog

All notable changes to this project will be documented in this file. The format
is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Checkout gate (Phase 4)

- `/login` is now strictly phone + OTP. After verification, users are routed to `/checkout` (new users and unpaid returning users) or `/dashboard` (paid users), as computed server-side by `/api/auth/verify-otp`.
- New `/checkout` route with server-side guard (pending cookie or auth+unpaid), profile form (for new users), coupon-code entry, Razorpay payment, and 60-second polling to auto-resume after a closed-tab payment.
- New `/api/payment/redeem-coupon` endpoint with two modes: `?dryRun=1` validates without consuming; default mode consumes the coupon, creates a Payment row with `source: "coupon"`, marks the user paid, and re-issues the auth cookie.
- JWT payloads now carry `paid: boolean` (mirror of `User.paymentStatus`). Middleware reads this at the edge for the `/dashboard` payment gate.
- New `CouponRepo` interface and implementations (`MongooseCouponRepo`, `InMemoryCouponRepo`) plus a pure `validateCoupon` / `redeemCoupon` domain service.

### Changed

- The payment gate is enforced at three layers: middleware (edge, via `paid` JWT claim), `/dashboard` server component (DB re-check), and `User.paymentStatus` (data). Without payment, nobody reaches `/dashboard`.
- `/payment` 308-redirects to `/checkout` (preserved for 30+ days for external links).
- `/api/payment/verify` now re-issues the auth cookie with `paid:true` and returns `redirect: "/dashboard"` (no more `/login` loop after paying).
- `/login` refactored from 703 to 386 lines: drops the inline "register" step that embedded payment, follows server-provided `redirect` via hard navigation.

### Tests

- 9 new tests in `tests/lib/auth.crypto.paid.test.ts`
- 10 new tests in `tests/lib/domain/coupon.test.ts`
- 1 new test in `tests/lib/domain/payment.test.ts`
- 4 new tests in `tests/lib/infra/coupon-repo.test.ts`
- 9 new tests in `tests/api/checkout.gate.test.ts`
- 3 new tests in `tests/api/redeem-coupon.test.ts`

**Cumulative: 262 tests across 31 files (was 224 across 24 files).**

### Added — Enterprise Refactor · Phase 3 (Architecture & Testability)

#### New modules (`src/lib/api/` and `src/hooks/`)

- `api/cache.ts` — typed `fetchJson` with in-memory cache. Replaces raw `fetch`
  in the browser-side admin pages. Caches successful GETs by URL+method+body
  with a configurable TTL (default 30 s). Errors are never cached. Supports
  optional zod schema validation on the parsed response. 11 tests.
- `api/parse.ts` — thin wrapper around zod's `safeParse` that throws a typed
  `ValidationError`. Use at the input boundary of every route handler:
  `const body = parse(await req.json(), createUserSchema)`. 4 tests.
- `hooks/use-fetch.ts` — React hook wrapping `fetchJson`. Returns
  `{ data, error, loading, refetch }`. The hook itself isn't tested (no RTL
  in this project), but the underlying module is.

#### Refactors

- `src/app/(main)/rule-book/page.tsx` — split from 802 lines down to 52. The
  static fallback content moved to `src/components/RuleBookStaticContent.tsx`
  (774 lines). Verbatim content — no copy was rewritten.
- `src/app/api/admin/me/route.ts` (Phase 2.8) and
  `src/app/api/admin/users/[id]/payment/route.ts` (Phase 3.6) migrated to
  `withRequest(withAdmin(...))`. From 60+ lines of try/catch boilerplate each
  to focused business logic. These are the template for the bulk migration
  of remaining admin routes (deferred — see "Notes" below).

### Tests added (Phase 3)

- `tests/lib/api-cache.test.ts` — 11 tests
- `tests/lib/api.parse.test.ts` — 4 tests

**Total: 15 new tests added in Phase 3** (cumulative 194 across 23 test files).

### Notes

- **No breaking changes** to public routes, API contracts, or UI.
- All `.smoke/` and `.playwright-mcp/` tests continue to pass.
- **Phase 4 (DX & Code Quality)** is the natural next step. The plan calls
  for: strict TypeScript, stricter ESLint, Prettier, Husky, OpenAPI gen
  from zod schemas, README update.

---

### Added — Domain layer, route migration, and bulk route centralization

#### Repository layer (`src/lib/infra/db/`)

- `repos.ts` — 6 repository interfaces (`UserRepo`, `AdminRepo`, `OtpRepo`,
  `PaymentRepo`, `MediaRepo`, `CouponRepo`) with production-ready in-memory
  implementations (usable both in tests and dev without a database).
- `mongoose-repos.ts` — Mongoose-backed implementations of all 6 repos.

#### Domain services (`src/lib/domain/`)

- `auth/service.ts` — `sendOtp`, `verifyOtp`, `registerUser`. Pure business
  logic over injected repos. 13 unit tests with in-memory fakes.
- `payment/service.ts` — `createOrder`, `verifyPayment`, `handleWebhook`.
  Razorpay SDK injected (mockable). 11 unit tests.

#### Route migrations

- `/api/auth/send-otp` — migrates to `sendOtp` service + `withRateLimit`.
- `/api/auth/verify-otp` — migrates to `verifyOtp` service. Response shape
  preserved.
- `/api/auth/register` — migrates to `registerUser` service. Uses
  `withPending` (replaces ad-hoc JWT re-verification).
- `/api/payment/create-order` — migrates to `createOrder` service.
- `/api/payment/verify` — migrates to `verifyPayment` service.
- `/api/payment/webhook` — migrates to `handleWebhook` service. Webhook
  now handles the race condition where it arrives before registration:
  creates a minimal placeholder user record matching the old upsert
  behavior.

#### Bulk route centralization

- `src/lib/adminApi.ts` — refactored to internally delegate to
  `@/lib/auth/middleware`'s `requireAdmin`. All 47 admin routes that call
  `requireAdminDb()` now go through the canonical auth path: `verifyAdmin`
  → DB lookup → `active === true` check. Previously, admin sessions were
  only validated against the JWT, never re-checked against the DB. No code
  changes in any of the 47 route files — the legacy `{ ok, data | error }`
  envelope is preserved.
- Fixed four pre-existing bugs where route handlers read `session.email`,
  `session.role`, or `session.sub` directly on the old session shape.
  `users/[id]`, `contact-leads/[id]`, `media/upload`, `auth/change-password`
  updated to read `session.session.X`.

### Tests added

- `tests/lib/adminApi.test.ts` — 10 tests (legacy contract pins)
- `tests/lib/domain/auth.test.ts` — 13 tests
- `tests/lib/domain/payment.test.ts` — 12 tests (including webhook race
  condition for placeholder user creation)

**Total: 35 new tests** (cumulative 228 across 26 test files).

---

### Added — Enterprise Refactor · Phase 2 (Reliability & Error Handling)

#### New infrastructure (`src/lib/api/`)

- `http-client.ts` — typed `fetch` wrapper with:
  - AbortController-based timeout (default 10s).
  - Exponential backoff with full jitter, idempotent verbs only by default.
  - Per-instance circuit breaker (opens after N consecutive 5xx / network errors, 30s cool-off).
  - Throws `UpstreamError` (extends `AppError`) with status + URL on persistent failure.
  - Used server-side (SMS gateway) and client-side (`apihelper/api.ts`).

#### Error boundaries

- `src/app/global-error.tsx` — root error boundary with its own `<html>`/`<body>` (Next.js requirement). Surfaces `digest` as a request reference and offers retry / go-home actions.
- `src/app/(main)/error.tsx` — public marketing site error boundary.
- `src/app/(admin)/error.tsx` — admin error boundary with prominent digest display.
- `src/app/dashboard/error.tsx` — dashboard error boundary with a logout shortcut.

#### Loading skeletons

- `src/app/(main)/loading.tsx` — generic landing-page skeleton.
- `src/app/(main)/blog/loading.tsx`, `news/loading.tsx`, `career/loading.tsx`, `events/loading.tsx` — list-page skeletons.
- `src/app/(admin)/admin/dashboard/loading.tsx` — dashboard stat-card + chart skeleton.

### Changed

- `src/lib/sms.ts` — replaced `axios.get()` with `httpFetch()` (drops `axios` dependency for SMS, retry/timeout/circuit inherited).
- `src/apihelper/api.ts` — wraps `httpFetch()` internally. Public shape `{ data, error, status, ok }` preserved — all 60+ admin pages work unchanged. Now benefits from timeout + retry on 5xx.
- `src/app/api/admin/me/route.ts` — **proof of concept** migration to `withRequest(withAdmin(...))`. From 60+ lines of try/catch boilerplate to 25 lines of focused business logic. Demonstrates the pattern for the Phase 3 bulk migration.
- `src/apihelper/admin.ts` — `getSocialContact` / `updateSocialContact` now proxy to `/api/admin/settings` (the legacy `/api/admin/social-contact` endpoint was a duplicate; deleted in this phase). Old call sites continue to work without changes.

### Removed

- `src/app/api/admin/social-contact/route.ts` — duplicate of `/api/admin/settings`. The admin UI on `/admin/social-contact` now hits settings under the hood.

### Reliability wins

- **Timeouts** on all external calls (Razorpay, SMSIndiaHub, fetch) — previously only SMS had a 10s timeout, Razorpay and webhook DB writes had none.
- **Retries with jitter** — 5xx and network errors retry up to 2x by default on idempotent verbs.
- **Circuit breaker** — if an upstream service has 5 consecutive failures, we fast-fail for 30s instead of compounding the outage.
- **Error boundaries** — every route segment now has a graceful error UI instead of the white "Application error: a client-side exception has occurred" page.
- **Loading feedback** — slow pages no longer show a blank screen during data fetching.

### Tests added (Phase 2)

- `tests/lib/api.http-client.test.ts` — 13 tests

**Total: 13 new tests added in Phase 2** (cumulative 179 across 21 test files).

### Notes

- No breaking changes to public routes, API contracts, or UI.
- All `.smoke/` and `.playwright-mcp/` tests continue to pass.
- Phase 3 (Architecture & Testability) follows; see `docs/refactor-plan.md` (TBD) for the full roadmap.

---

### Added — Enterprise Refactor · Phase 1 (Security & Auth)

#### New auth modules (test-first, all under `src/lib/`)

- `auth/crypto.ts` — pure wrappers around `jose`: `signAuth` / `signPending` / `signAdmin` + matching `verifyAuth` / `verifyPending` / `verifyAdmin`. Verifiers return `null` on any failure.
- `auth/cookies.ts` — `setAuthCookie` / `getAuthCookie` / `clearAuthCookies` etc. Centralises the three cookie names (`brpl_auth`, `brpl_pending`, `brpl_admin`), httpOnly + sameSite + production-secure attributes.
- `auth/session.ts` — `getAuthSession({ lookup })` and `getAdminSession({ lookup })` — verify the JWT **and** look the user up in the DB (DI-friendly). Returns null on any failure.
- `auth/rbac.ts` — `hasRole(session, allowed)`, `isSuperAdmin`, `isSubAdmin`, `isSeoContent`. Hierarchical: superadmin satisfies any list.
- `auth/middleware.ts` — `requireAuth` / `requireAdmin(opts)` / `requirePending` — throw typed `AppError`s instead of returning `NextResponse`. Compose with `withRequest()` to get JSON responses.

#### New API primitives (under `src/lib/api/`)

- `errors.ts` — `AppError` + subclasses (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `UpstreamError`, `ValidationError`). Each carries a stable machine-readable `code`.
- `response.ts` — `ok(data)`, `fail(err)`, `noContent()`. Standard envelope `{ ok, data | code, message, details?, requestId? }`. Generic 500 never leaks error messages.
- `csrf.ts` — double-submit cookie (`brpl_csrf` non-httpOnly + `X-CSRF-Token` header). Constant-time compare. Opt-in via `BRPL_CSRF_REQUIRED=true`.
- `rate-limit.ts` — in-memory token-bucket per-key (`TokenBucket`, `RateLimiter`). Named presets: `otp-send` (5/10min), `otp-verify` (10/10min), `admin-login` (5/5min), `admin-action` (60/min), `public-write` (10/min).
- `handlers.ts` — composable wrappers: `withRequest` (request ID + error catch), `withAuth`, `withAdmin`, `withCsrf`, `withRateLimit`, `withPending`. Layer like `withRequest(withAdmin(withCsrf(handler)))`.

#### Other

- `src/lib/password-policy.ts` — admin password rules (≥12 chars, mixed case, digit, not in a small banned list). Wired into `/api/admin/auth/change-password`.
- `src/lib/security-headers.ts` — canonical source of truth for HTTP security headers; mirrored in `next.config.mjs`. Includes CSP, HSTS (prod-only), COOP, CORP, plus the existing X-Frame-Options etc.
- `src/lib/env.ts` — added `assertProductionBootReadiness()` which throws on boot if any production-required secret is missing (JWT_SECRET, MONGODB_URI, RAZORPAY_*). Use from `instrumentation.ts`.

### Changed

- `src/middleware.ts` — now uses the shared `verifyAuth` helper from `@/lib/auth/crypto` (was inlining JWT verification). Added `safeNext()` to defend against open-redirect (`//evil.com`) on `?next=`. Distinguishes "expired" from "missing/invalid" so stale cookies are cleared.
- `src/lib/adminApi.ts` — marked **@deprecated**. Still exported for the 60+ admin routes that haven't migrated yet. New code should use `@/lib/auth/middleware` + `@/lib/api/handlers`.
- `src/app/api/admin/auth/change-password/route.ts` — now enforces the full password policy (was just `z.string().min(8)`).
- `next.config.mjs` — added `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-site`, a strict `Content-Security-Policy` (Razorpay-allowlisted), and `Strict-Transport-Security` (prod-only).

### Security

- **CSRF protection** ready (opt-in via `BRPL_CSRF_REQUIRED=true`). Currently off so existing smoke tests are unaffected; flip the env in staging then prod.
- **Rate limiting** ready (in-memory). Each route will get its own preset in Phase 3 when routes migrate.
- **Production boot check** — `assertProductionBootReadiness()` aggregates all missing secrets into one error message and throws at boot.
- **Password policy** — admin passwords must now be ≥12 chars with mixed case, digit, and not be a common password.
- **Open-redirect defense** — `?next=` query param now validates same-origin paths only.
- **Stale auth cookie** — middleware now clears expired `brpl_auth` on protected routes so the next request bounces cleanly to `/login`.

### Tests added (Phase 1)

- `tests/lib/auth.crypto.test.ts` — 10 tests
- `tests/lib/auth.cookies.test.ts` — 14 tests
- `tests/lib/auth.session.test.ts` — 10 tests
- `tests/lib/auth.rbac.test.ts` — 10 tests
- `tests/lib/auth.middleware.test.ts` — 13 tests
- `tests/lib/api.csrf.test.ts` — 10 tests
- `tests/lib/api.rate-limit.test.ts` — 11 tests
- `tests/lib/api.handlers.test.ts` — 16 tests
- `tests/lib/api.response.test.ts` — 9 tests (already from Phase 0)
- `tests/lib/api.errors.test.ts` — 11 tests (already from Phase 0)
- `tests/lib/security-headers.test.ts` — 7 tests
- `tests/lib/password-policy.test.ts` — 9 tests
- `tests/lib/env.boot.test.ts` — 5 tests
- `tests/api/admin.me.new-handlers.test.ts` — 5 integration tests

**Total: 140 new tests added in Phase 1** (cumulative 166 across 20 test files).

### Notes

- No breaking changes to public routes, API contracts, or UI.
- All `.smoke/` and `.playwright-mcp/` tests continue to pass.
- Phase 2 (Reliability & Error Handling) follows; see `docs/refactor-plan.md` (TBD) for the full roadmap.

---

### Added — Enterprise Refactor · Phase 0 (Foundation)
