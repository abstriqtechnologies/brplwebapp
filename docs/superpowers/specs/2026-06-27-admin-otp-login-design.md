# Admin phone+OTP login — Design

**Date:** 2026-06-27
**Status:** Approved
**Owner:** Anurag

## Goal

Replace email+password (+ optional TOTP 2FA) admin login with phone+SMS-OTP,
mirroring the user-facing login flow. Admin phone numbers come from an env-var
allowlist (`ADMIN_PHONES`, default `9234894293`). The existing email/password
and TOTP code paths are deleted outright.

## Non-goals

- Multi-admin invites, admin onboarding flows, or per-admin phone assignment
  beyond what is required for the allowlist to work.
- Backwards-compat shims (410 Gone) for the deleted endpoints. They are removed
  from the routing surface entirely.
- Removing `passwordHash` / `totpSecret` fields from the `AdminUser` schema.
  They are left dormant to avoid a destructive migration; nothing writes them.
- Re-implementing an "admin invites another admin" flow. Only the seeded
  superadmin is intended to log in for now.

## Configuration

### `src/lib/env.ts` — new field

```ts
ADMIN_PHONES: z.string().default("9234894293"),
```

- Always present (no required-in-prod distinction) — defaults to the number
  the owner stated. Read once via the existing `env` proxy.

### `src/lib/domain/admin-auth/service.ts` (new) — helpers

```ts
export function getAdminAllowedPhones(): string[];
export function isAdminAllowedPhone(phone10: string): boolean;
```

- `getAdminAllowedPhones()` reads `env.ADMIN_PHONES`, splits on `,`, runs each
  value through the existing `normalizePhone` from `@/lib/phone`, drops
  entries that don't normalize cleanly, and returns the resulting array.
- `isAdminAllowedPhone(phone10)` returns true when the normalized 10-digit
  phone is present in the allowlist.

## Data model — `AdminUser`

Add a `phone` field:

```ts
phone: {
  type: String,
  required: false,
  unique: true,
  sparse: true,
  index: true,
  match: /^\d{10}$/,
},
```

- `unique` + `sparse` so old documents (no phone) do not collide on the index.
- `required: false` because the existing seeded admin currently has no phone.
- The bootstrap step ensures the seeded superadmin has `phone` set to the
  first entry of `ADMIN_PHONES` when missing.

`passwordHash`, `totpSecret`, and `totpEnabled` remain on the schema but are
no longer read or written by the auth code.

## Service layer

`src/lib/domain/admin-auth/service.ts` — pure functions, no Mongoose, no
NextResponse, dependencies injected for tests.

```ts
type SendAdminOtpDeps = {
  phone: string;
  otpRepo: OtpRepo;
  generateOtp: () => string;
  sendSms: (phone: string, otp: string, purpose: string) => Promise<boolean>;
  now?: () => number;
};

type SendAdminOtpResult = { sent: boolean; expiresInSec: number };

async function sendAdminOtp(deps): Promise<SendAdminOtpResult>;

type VerifyAdminOtpDeps = {
  phone: string;
  code: string;
  adminRepo: AdminRepo;
  otpRepo: OtpRepo;
  now?: () => number;
};

async function verifyAdminOtp(deps): Promise<IAdminUser>;
```

### `sendAdminOtp`

- Normalize phone.
- If `!isAdminAllowedPhone(phone)`: return `{ sent: false, expiresInSec: 0 }`.
  No `OtpRecord` is created, no SMS is sent. The route translates this into
  a 200 with a generic "OTP sent" payload — the response is indistinguishable
  from the success path to prevent allowlist enumeration.
- Otherwise: enforce the same 60-second resend cooldown used by the user
  flow (reuses the same logic), generate a 4-digit OTP, persist via
  `OtpRepo.create`, call `sendSms(phone, otp, "admin")`, and return
  `{ sent: true, expiresInSec: 300 }`. SMS failure throws `UpstreamError`.

### `verifyAdminOtp`

- Normalize phone.
- Look up latest `OtpRecord` for that phone. The lookup is shared with the
  user flow's `verifyOtp` (same model + repo).
- Reject any of: no record, already used, expired, code mismatch — each as
  `UnauthorizedError("Invalid OTP")`. The single error message is intentional.
- Find an `AdminUser` by `phone`. If none exists or `active === false`,
  throw `UnauthorizedError("Invalid OTP")` (indistinguishable from a bad
  code; the allowlist check at `sendAdminOtp` already kept non-admins out
  of the OTP loop, so this branch handles the rare case of an admin being
  deleted between send and verify).
- Return the admin.

### Repository

`src/lib/infra/db/mongoose-repos.ts` adds:

```ts
export class MongooseAdminRepo implements AdminRepo {
  findByPhone(phone: string): Promise<IAdminUser | null>;
  findById(id: string): Promise<IAdminUser | null>;
  // used by bootstrap to set the phone
  update(id: string, patch: Partial<IAdminUser>): Promise<IAdminUser | null>;
}
```

`AdminRepo` is declared in `src/lib/infra/db/repos.ts` alongside the existing
`UserRepo` and `OtpRepo`.

## Routes

### `POST /api/admin/auth/send-otp`

Body: `{ phone: string }` (zod-validated 10–20 chars).

Behavior:
1. `withRequest(withRateLimit(...))` envelope (same pattern as the user route).
2. Call `sendAdminOtp`.
3. Always return `ok({ success: true, message: "OTP sent", expiresInSec })`,
   with `expiresInSec = 0` when `sent === false`. The response shape is
   identical for allowed and disallowed phones; the client renders the OTP
   step either way but the SMS never actually leaves for disallowed phones.

Rate limit: `limiterFor("otp-send")` — same key as the user send route so
abuse on either surface throttles both.

### `POST /api/admin/auth/verify-otp`

Body: `{ phone: string, otp: string }` (4-digit regex).

Behavior:
1. `withRequest(withRateLimit(...))` envelope (`otp-verify` limiter).
2. Call `verifyAdminOtp`.
3. On success: `signJwt({ sub, phone, role, name, purpose: "admin" })`,
   `setAdminCookie`, return `ok({ success: true, redirect: next })`.
4. On `UnauthorizedError`: the wrapper renders a 401 with the error message
   ("Invalid OTP"). No additional information leaks.

### `DELETE /api/admin/auth/logout`

Unchanged. Clears the `brpl_admin` cookie.

### Deleted routes

- `src/app/api/admin/auth/login/route.ts` — file is removed.
- `src/app/api/admin/auth/change-password/route.ts` — file is removed.
- `src/app/api/admin/auth/verify-otp/route.ts` — file is replaced (the
  existing TOTP `verify-otp` is replaced by the SMS OTP `verify-otp`).

## Cookie & JWT

- Cookie name, attributes, and TTL are unchanged: `brpl_admin`,
  `httpOnly`, `secure` based on request protocol detection, `sameSite=lax`,
  `path=/`, 7-day expiry.
- JWT alg, signing, and verification remain HS256 with `JWT_SECRET`.
- Payload becomes `{ sub, phone, role, name, purpose: "admin" }`. The
  existing `purpose: "admin"` check in `getAdminSession` continues to gate
  middleware — no middleware changes required.

## Bootstrap

`src/lib/adminBootstrap.ts` is simplified:

- Drop the password seeding. Drop the `ALLOW_DEFAULT_ADMIN` gate.
- Always ensure a single `superadmin` exists:
  - Find by email `admin@brpl.com`.
  - If absent: create with `role: "superadmin"`, `name: "Super Admin"`,
    `active: true`, `phone` set to the first entry of `ADMIN_PHONES`.
  - If present and `phone` is missing: update with `phone` from the
    allowlist.
- Idempotent (`seeded` module-level flag).

The bootstrap is invoked from `/api/admin/auth/send-otp` (the entry point
for admin login) so the seeded admin always exists before the first OTP is
sent in a fresh environment. It is also invoked from
`/api/admin/auth/logout` and from `instrumentation.ts` if present, to
cover admin pages hit before login.

## UI

### `src/app/(admin-public)/admin/login/page.tsx`

Rewrite to mirror `src/app/login/page.tsx` (user login):

- Two-step state machine: `phone → otp`.
- Phone step: `+91` prefix chip, 10-digit input, "Send verification code"
  button.
- OTP step: 4-digit segmented input, copy-paste fill, "Expires in m:ss"
  countdown, "Resend in Ns" cooldown, "Change number" back link.
- Submits to `/api/admin/auth/send-otp` then `/api/admin/auth/verify-otp`.
- On success: `window.location.href = next` (hard navigation so the new
  cookie is committed before middleware runs).
- Removes the "Default credentials" footer hint.

### `src/app/(admin)/admin/profile/page.tsx`

- Email field removed (replaced with a static "Sign-in via phone allowlist"
  note, since email is no longer part of the login flow).
- "Change password" card removed.
- Name editing retained.

## Files changed / created

### New

- `src/lib/domain/admin-auth/service.ts` — `sendAdminOtp`, `verifyAdminOtp`,
  `getAdminAllowedPhones`, `isAdminAllowedPhone`.
- `src/lib/infra/db/__tests__/admin-auth.service.test.ts` — unit tests for
  the service.

### Modified

- `src/lib/env.ts` — add `ADMIN_PHONES`.
- `src/models/AdminUser.ts` — add `phone` field.
- `src/lib/infra/db/repos.ts` — add `AdminRepo` interface.
- `src/lib/infra/db/mongoose-repos.ts` — add `MongooseAdminRepo`.
- `src/lib/adminBootstrap.ts` — simplified superadmin bootstrap (phone, no
  password).
- `src/app/api/admin/auth/send-otp/route.ts` — new file (the SMS OTP send
  endpoint).
- `src/app/api/admin/auth/verify-otp/route.ts` — replaced (TOTP → SMS OTP).
- `src/app/(admin-public)/admin/login/page.tsx` — rewritten as phone+OTP.
- `src/app/(admin)/admin/profile/page.tsx` — remove email + password UI.

### Deleted

- `src/app/api/admin/auth/login/route.ts`.
- `src/app/api/admin/auth/change-password/route.ts`.

## Testing

### Unit tests (`service.test.ts`)

Pure-function tests, no DB:

- `isAdminAllowedPhone("9234894293")` → true.
- `isAdminAllowedPhone("9876543210")` → false.
- `isAdminAllowedPhone` accepts `+91` prefix and whitespace via `normalizePhone`.
- `sendAdminOtp` with a disallowed phone → no `otpRepo.create` call, no
  `sendSms` call, returns `{ sent: false }`.
- `sendAdminOtp` with an allowed phone → creates `OtpRecord`, calls SMS,
  returns `{ sent: true, expiresInSec: 300 }`.
- `sendAdminOtp` cooldown: a second call within 60s throws `RateLimitError`.
- `verifyAdminOtp`: wrong code, expired code, no record, no admin, disabled
  admin → all throw `UnauthorizedError("Invalid OTP")`.
- `verifyAdminOtp` happy path → returns the admin.

### Smoke test (manual)

1. `npm run dev` (with default `ADMIN_PHONES=9234894293`).
2. Navigate to `/admin/login`.
3. Enter `9234894293`, click "Send verification code".
4. Read the OTP from the dev console log (`[SMS] ... DEV OTP ...`) since
   `SMS_API_KEY` is unset in dev.
5. Enter the 4-digit code → land on `/admin/dashboard`.
6. Reload `/admin/dashboard` — admin session is preserved.
7. Click "Sign out" in `/admin/profile` → back at `/admin/login`.
8. Navigate to `/admin/login`. Enter `9876543210`, click "Send verification
   code". The UI advances to the OTP step (no enumeration leak). Entering
   any 4 digits yields "Invalid OTP" — and the dev console does NOT show a
   "DEV OTP" log line, confirming the SMS was not sent.
9. Hit `POST /api/admin/auth/login` and `POST /api/admin/auth/change-password`
   directly — both return 404 (the routes are removed).

### What we do NOT test in this change

- Real SMS delivery (only the dev-console fallback is exercised).
- Migration of existing AdminUser documents. The bootstrap self-heals missing
  `phone` on the next login; no separate migration script is required.
- Middleware behaviour — unchanged.

## Risks

- **Allowlist misconfiguration.** If `ADMIN_PHONES` is set to an empty
  string in production, the default is `9234894293` because zod's
  `.default()` only fires when the value is `undefined`, not when it's
  `""`. The parsed empty string produces an empty allowlist after
  `split(",")`, which would lock the admin out. Mitigation: split service
  treats an empty `ADMIN_PHONES` value as `["9234894293"]` via the helper.
- **Existing superadmin has no phone.** Bootstrap stamps the phone on the
  next send-otp call. The seeded superadmin in fresh environments is
  created with the phone already.
- **Stale TOTP code paths left in dependencies.** None — the `lib/totp.ts`
  import only exists in the old `verify-otp` route which is being
  rewritten, and in `change-password` which is being deleted.

## Out of scope

- Per-admin enable/disable of OTP login (any admin with a phone field set
  is eligible; the allowlist gate is independent).
- A "forgot phone" or account-recovery path. The owner controls the
  allowlist via env vars; recovery is via env var change + redeploy.
- Email-based admin recovery.
- Auditing of admin OTP requests.
