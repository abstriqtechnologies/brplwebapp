# Checkout Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/login` a clean two-step entry gate (phone + OTP). Move profile + payment UI to a dedicated `/checkout` route. Enforce `User.paymentStatus === "completed"` at three layers — middleware (edge), `/dashboard` server component, and data — so nobody reaches `/dashboard` without paying. Add coupon redemption on the user-facing checkout.

**Architecture:** Strip `/login` to phone + OTP only. After OTP verify, redirect to `/checkout?next=<originalTarget>`. `/checkout` is a server component (pending-cookie or unpaid-auth-cookie guard) that renders a client component owning three regions (profile, coupon, pay). The payment gate is enforced by `paid:boolean` embedded in the JWT payload (read at the edge by middleware) plus a DB re-check inside `/dashboard/page.tsx` (catches stale tokens). Coupon redemption is a new `/api/payment/redeem-coupon` endpoint that validates, then (optionally) consumes.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind, shadcn/ui primitives, lucide-react, Razorpay (existing), MongoDB + Mongoose (existing), vitest, jose (existing JWT).

**Reference spec:** [docs/superpowers/specs/2026-06-25-checkout-gate-design.md](../specs/2026-06-25-checkout-gate-design.md)

---

## Migration Order (do these in order)

The plan executes in eight phases that build on each other but each phase produces a working state:

1. **Phase A — Backend foundation.** Update JWT payload to carry `paid`, update auth service + verify-otp route to return `paid` + correct `redirect`, wire up the `CouponRepo` (interface exists, no implementations), and add the new `redeemCoupon` payment service function. Server-side gate machinery is in place.
2. **Phase B — Middleware upgrade.** Add `/checkout` matcher, add the `paid` check for `/dashboard`, redirect unpaid users to `/checkout`.
3. **Phase C — `/dashboard` defense in depth.** Add the DB `paymentStatus` check inside the server component.
4. **Phase D — New `/checkout` page.** Server-side guard + `CheckoutClient.tsx` (profile + coupon + Razorpay + 60s polling).
5. **Phase E — `/login` refactor.** Remove the third inline "register" step. Redirect to `/checkout` after OTP verify.
6. **Phase F — `/payment` → `/checkout` rename.** Replace the redirect stub with a 308 to `/checkout`.
7. **Phase G — Verify & update other call sites.** Update `/api/payment/verify` to return `redirect: /dashboard` (no more loop through `/login`); update any internal links/redirects that pointed at `/payment`.
8. **Phase H — Tests & rollout.** E2E coverage, manual QA checklist, finalize.

Phases A through G keep the app working at every step. Phase H is verification.

---

## File Structure

**Created:**
- `src/app/checkout/page.tsx` — server component, pending-or-unpaid-auth guard.
- `src/app/checkout/CheckoutClient.tsx` — client UI (profile + coupon + Razorpay + polling).
- `src/app/api/payment/redeem-coupon/route.ts` — POST endpoint that validates or consumes a coupon.
- `src/lib/domain/coupon/service.ts` — pure `validateCoupon` and `redeemCoupon` functions.
- `src/lib/infra/db/in-memory-coupon-repo.ts` — exported from `repos.ts` (additive; keep one file).
- `tests/lib/domain/coupon.test.ts` — unit tests for `validateCoupon` / `redeemCoupon`.
- `tests/lib/auth.crypto.paid.test.ts` — unit tests for `paid` round-tripping through signAuth.
- `tests/api/checkout.gate.test.ts` — integration tests for the `/checkout` middleware behavior.
- `tests/api/redeem-coupon.test.ts` — integration tests for the new endpoint.

**Modified:**
- `src/lib/auth/crypto.ts` — `AuthTokenPayload` adds `paid?: boolean` (already in shape thanks to `[key: string]: unknown`; just update the type + `signAuth` callers).
- `src/lib/domain/auth/service.ts` — `verifyOtp` now returns `paid: boolean` on existing users.
- `src/lib/domain/payment/service.ts` — `verifyPayment` now re-issues the auth cookie with `paid:true` (callback hook).
- `src/app/api/auth/verify-otp/route.ts` — response shape `{ success, exists, paid, user?, redirect }`; `redirect` computed server-side; cookies carry `paid`.
- `src/app/api/auth/register/route.ts` — sign cookie with `paid:true`.
- `src/app/api/auth/me/route.ts` — already returns `paymentStatus`; no change.
- `src/app/api/payment/verify/route.ts` — re-issue `brpl_auth` with `paid:true`; `redirect: "/dashboard"`.
- `src/middleware.ts` — add `/checkout` matcher; `paid` check for `/dashboard`.
- `src/app/login/page.tsx` — drop the "register" step; redirect to `/checkout` after OTP.
- `src/app/dashboard/page.tsx` — defense-in-depth `paymentStatus === "completed"` check.
- `src/app/payment/page.tsx` — convert to a 308 redirect to `/checkout`.
- `src/lib/infra/db/repos.ts` — add `InMemoryCouponRepo` (interface already exists).
- `src/lib/infra/db/mongoose-repos.ts` — add `MongooseCouponRepo`.
- `src/app/api/payment/create-order/route.ts` — no functional change, but ensure pending cookie path still works (it does).

**Unchanged (intentionally):**
- All `/api/admin/*` routes — admin can still mark paid manually.
- `/api/payment/webhook/route.ts` — webhook still source of truth for Razorpay payment status.
- `src/lib/jwt.ts` (legacy) — kept for `/api/auth/me`; will still work because JWT verification is loose on extra fields.
- `src/components/admin/*` — admin panel unaffected.

---

## Phase A — Backend foundation

### Task 1: Update `AuthTokenPayload` type + signAuth callers to carry `paid`

**Files:**
- Modify: `src/lib/auth/crypto.ts:23-28`
- Modify: `src/app/api/auth/verify-otp/route.ts:48-52`
- Modify: `src/app/api/auth/register/route.ts:56-59`
- Test: `tests/lib/auth.crypto.paid.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/lib/auth.crypto.paid.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { SignJWT, jwtVerify } from "jose";

beforeAll(() => {
    process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
});

describe("signAuth carries `paid` round-trip", () => {
    it("signs and verifies a payload with paid=true", async () => {
        const { signAuth, verifyAuth } = await import("@/lib/auth/crypto");
        const token = await signAuth({
            sub: "user-1",
            phone: "9876543210",
            paid: true,
        });
        const payload = await verifyAuth(token);
        expect(payload).not.toBeNull();
        expect(payload?.paid).toBe(true);
    });

    it("signs and verifies a payload with paid=false", async () => {
        const { signAuth, verifyAuth } = await import("@/lib/auth/crypto");
        const token = await signAuth({
            sub: "user-2",
            phone: "9876543210",
            paid: false,
        });
        const payload = await verifyAuth(token);
        expect(payload?.paid).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/auth.crypto.paid.test.ts`
Expected: FAIL — `payload?.paid` is `undefined` because `signAuth` is typed to strip unknown fields or the JWT itself accepts but the typed payload doesn't include it. (Even if the runtime already passes the field through, the test will fail on the type-level assertion OR the runtime assertion depending on what `signAuth` does today.)

- [ ] **Step 3: Update `AuthTokenPayload` to include `paid`**

In `src/lib/auth/crypto.ts`, modify the `AuthTokenPayload` type:

```ts
export type AuthTokenPayload = {
    sub: string;
    phone?: string;
    paid?: boolean; // mirror of User.paymentStatus === "completed" at issuance
    purpose: "auth";
    [key: string]: unknown;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/auth.crypto.paid.test.ts`
Expected: PASS.

- [ ] **Step 5: Update all `signAuth` callers to pass `paid`**

Three call sites today. Each must read `User.paymentStatus === "completed"` and pass `paid: <bool>`.

`src/app/api/auth/verify-otp/route.ts` lines 48-52:

```ts
if (result.kind === "existing") {
    const paid = result.user.paymentStatus === "completed";
    const token = await signAuth({
        sub: result.user._id.toString(),
        phone: result.user.phone,
        paid,
    });
    await setAuthCookie(token);
```

`src/app/api/auth/register/route.ts` lines 56-59:

```ts
const authToken = await signAuth({
    sub: user._id.toString(),
    phone: user.phone,
    paid: true, // registerUser always sets paymentStatus: "completed"
});
```

(Note: we will need to add `paid: true` to `verify-otp` flow for returning paid users, but verify-otp will still receive a user object that has paymentStatus — already exposed via the existing service.)

- [ ] **Step 6: Run all auth tests**

Run: `npx vitest run tests/lib/auth.crypto.test.ts tests/lib/auth.middleware.test.ts tests/api/auth.me.test.ts`
Expected: PASS (no behavior regression — adding `paid` to the payload is additive).

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth/crypto.ts src/app/api/auth/verify-otp/route.ts src/app/api/auth/register/route.ts tests/lib/auth.crypto.paid.test.ts
git commit -m "feat(auth): carry paid status in JWT payload

signAuth now accepts and round-trips `paid: boolean`, mirroring
User.paymentStatus === 'completed' at issuance. Middleware will read this
field at the edge for the /dashboard gate. Defense-in-depth DB check in
/dashboard/page.tsx catches stale tokens."
```

---

### Task 2: Update auth service `verifyOtp` to return `paid`

**Files:**
- Modify: `src/lib/domain/auth/service.ts:91-113`
- Test: `tests/lib/domain/auth.test.ts` (extend existing file)

- [ ] **Step 1: Write the failing test**

Add to `tests/lib/domain/auth.test.ts` (or create if missing — check first):

```ts
describe("verifyOtp returns paid status", () => {
    it("returns paid:true when existing user has paymentStatus=completed", async () => {
        const { verifyOtp } = await import("@/lib/domain/auth/service");
        const userRepo = {
            findByPhone: vi.fn().mockResolvedValue({
                _id: "u1",
                phone: "9876543210",
                paymentStatus: "completed",
            }),
        };
        const otpRepo = {
            findLatest: vi.fn().mockResolvedValue({
                phone: "9876543210",
                otp: "123456",
                verified: false,
                expiresAt: new Date(Date.now() + 60_000),
            }),
        };
        const result = await verifyOtp({
            phone: "9876543210",
            code: "123456",
            userRepo: userRepo as any,
            otpRepo: otpRepo as any,
        });
        expect(result.kind).toBe("existing");
        if (result.kind === "existing") {
            expect(result.paid).toBe(true);
        }
    });

    it("returns paid:false when existing user has paymentStatus=pending", async () => {
        const { verifyOtp } = await import("@/lib/domain/auth/service");
        const userRepo = {
            findByPhone: vi.fn().mockResolvedValue({
                _id: "u1",
                phone: "9876543210",
                paymentStatus: "pending",
            }),
        };
        const otpRepo = {
            findLatest: vi.fn().mockResolvedValue({
                phone: "9876543210",
                otp: "123456",
                verified: false,
                expiresAt: new Date(Date.now() + 60_000),
            }),
        };
        const result = await verifyOtp({
            phone: "9876543210",
            code: "123456",
            userRepo: userRepo as any,
            otpRepo: otpRepo as any,
        });
        if (result.kind === "existing") {
            expect(result.paid).toBe(false);
        }
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/domain/auth.test.ts`
Expected: FAIL — `result.paid` is `undefined`.

- [ ] **Step 3: Update `VerifyOtpResult` and `verifyOtp`**

In `src/lib/domain/auth/service.ts`, change the result type and the existing-user branch:

```ts
export type VerifyOtpResult =
    | { kind: "existing"; user: IUser; paid: boolean }
    | { kind: "new"; phone: string };
```

And inside `verifyOtp`:

```ts
const existing = await deps.userRepo.findByPhone(phone);
if (existing) {
    return {
        kind: "existing",
        user: existing,
        paid: existing.paymentStatus === "completed",
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/domain/auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Update the route handler to consume the new field**

In `src/app/api/auth/verify-otp/route.ts`:

```ts
if (result.kind === "existing") {
    const paid = result.paid;
    const token = await signAuth({
        sub: result.user._id.toString(),
        phone: result.user.phone,
        paid,
    });
    await setAuthCookie(token);
    return ok({
        success: true,
        exists: true,
        paid,
        user: {
            id: result.user._id.toString(),
            phone: result.user.phone,
            name: result.user.name,
            role: result.user.role,
            paymentStatus: result.user.paymentStatus,
        },
        redirect: paid ? "/dashboard" : "/checkout?next=/dashboard",
    });
}

// New user — issue short-lived pending cookie.
const token = await signPending({
    sub: `pending:${result.phone}`,
    phone: result.phone,
});
await setPendingCookie(token);
return ok({
    success: true,
    exists: false,
    paid: false,
    redirect: "/checkout?next=/dashboard",
});
```

- [ ] **Step 6: Run all auth tests**

Run: `npx vitest run tests/lib/domain/auth.test.ts tests/api/auth.me.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/domain/auth/service.ts src/app/api/auth/verify-otp/route.ts tests/lib/domain/auth.test.ts
git commit -m "feat(auth): verifyOtp returns paid status + computes redirect target

Response shape now carries `paid: boolean`. Existing paid users are
redirected to /dashboard; unpaid users and new users are redirected to
/checkout?next=/dashboard. /login client will follow this redirect."
```

---

### Task 3: Add `CouponRepo` implementations (interface exists, no impls)

**Files:**
- Modify: `src/lib/infra/db/repos.ts:117-127` (interface, already there)
- Modify: `src/lib/infra/db/mongoose-repos.ts` (add `MongooseCouponRepo` class)
- Modify: `src/lib/infra/db/repos.ts:131-end` (add `InMemoryCouponRepo` class)
- Test: extend `tests/lib/domain/payment.test.ts` or new `tests/lib/infra/coupon-repo.test.ts`

- [ ] **Step 1: Write the failing test for `InMemoryCouponRepo`**

Create `tests/lib/infra/coupon-repo.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";

describe("InMemoryCouponRepo", () => {
    let repo: import("@/lib/infra/db/repos").InMemoryCouponRepo;
    beforeEach(() => {
        repo = new (require("@/lib/infra/db/repos").InMemoryCouponRepo)();
    });

    it("finds a coupon by code (case-insensitive, normalized to uppercase)", async () => {
        await repo.create({
            code: "SAVE10",
            type: "percent",
            amount: 10,
            usageLimit: 100,
            usedCount: 0,
            active: true,
        });
        const found = await repo.findByCode("save10");
        expect(found).not.toBeNull();
        expect(found?.code).toBe("SAVE10");
    });

    it("returns null for unknown code", async () => {
        const found = await repo.findByCode("NOPE");
        expect(found).toBeNull();
    });

    it("incrementUsage bumps usedCount and returns updated coupon", async () => {
        const c = await repo.create({
            code: "X",
            type: "flat",
            amount: 100,
            usageLimit: 5,
            usedCount: 0,
            active: true,
        });
        const updated = await repo.incrementUsage(String(c._id));
        expect(updated?.usedCount).toBe(1);
    });

    it("findUsageForUser returns existing usage to prevent double-redeem", async () => {
        const c = await repo.create({
            code: "ONCE",
            type: "flat",
            amount: 100,
            usageLimit: 1,
            usedCount: 0,
            active: true,
        });
        await repo.createUsage({
            couponId: String(c._id),
            userId: "u-1",
            code: c.code,
            discountApplied: 100,
        });
        const found = await repo.findUsageForUser(String(c._id), "u-1");
        expect(found).not.toBeNull();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/infra/coupon-repo.test.ts`
Expected: FAIL — `InMemoryCouponRepo` does not exist, and `findUsageForUser` is not on the interface.

- [ ] **Step 3: Extend the `CouponRepo` interface**

In `src/lib/infra/db/repos.ts`, replace the `CouponRepo` interface block:

```ts
export interface CouponRepo {
    findByCode(code: string): Promise<ICoupon | null>;
    findById(id: string): Promise<ICoupon | null>;
    incrementUsage(couponId: string): Promise<ICoupon | null>;
    createUsage(data: CreateCouponUsageInput): Promise<ICouponUsage>;
    /** Returns the existing usage if this user has already redeemed this coupon. */
    findUsageForUser(couponId: string, userId: string): Promise<ICouponUsage | null>;
    listUsages(couponId: string, limit: number, skip: number): Promise<ICouponUsage[]>;
}
```

- [ ] **Step 4: Add `InMemoryCouponRepo`**

Append to `src/lib/infra/db/repos.ts`:

```ts
export class InMemoryCouponRepo implements CouponRepo {
    private coupons: (ICoupon & { _id: string; createdAt: Date; updatedAt: Date })[] = [];
    private usages: (ICouponUsage & { _id: string })[] = [];

    private normalize(code: string): string {
        return code.trim().toUpperCase();
    }

    async findByCode(code: string): Promise<ICoupon | null> {
        const norm = this.normalize(code);
        return this.coupons.find((c) => c.code === norm) ?? null;
    }
    async findById(id: string): Promise<ICoupon | null> {
        return this.coupons.find((c) => String(c._id) === id) ?? null;
    }
    async create(data: CreateCouponInput): Promise<ICoupon> {
        const doc = {
            ...data,
            code: this.normalize(data.code),
            usedCount: data.usedCount ?? 0,
            active: data.active ?? true,
            _id: idLike() as unknown as ICoupon["_id"],
            createdAt: new Date(),
            updatedAt: new Date(),
        } as unknown as ICoupon & { _id: string; createdAt: Date; updatedAt: Date };
        this.coupons.push(doc);
        return doc;
    }
    async incrementUsage(couponId: string): Promise<ICoupon | null> {
        const idx = this.coupons.findIndex((c) => String(c._id) === couponId);
        if (idx === -1) return null;
        this.coupons[idx] = {
            ...this.coupons[idx],
            usedCount: this.coupons[idx].usedCount + 1,
            updatedAt: new Date(),
        };
        return this.coupons[idx];
    }
    async createUsage(data: CreateCouponUsageInput): Promise<ICouponUsage> {
        const doc = {
            ...data,
            usedAt: data.usedAt ?? new Date(),
            _id: idLike(),
        } as ICouponUsage & { _id: string };
        this.usages.push(doc);
        return doc;
    }
    async findUsageForUser(couponId: string, userId: string): Promise<ICouponUsage | null> {
        return (
            this.usages.find(
                (u) => String(u.couponId) === couponId && String(u.userId) === userId,
            ) ?? null
        );
    }
    async listUsages(couponId: string, limit: number, skip: number): Promise<ICouponUsage[]> {
        return this.usages
            .filter((u) => String(u.couponId) === couponId)
            .slice(skip, skip + limit);
    }
    _clear(): void {
        this.coupons = [];
        this.usages = [];
    }
}
```

- [ ] **Step 5: Add `MongooseCouponRepo`**

Append to `src/lib/infra/db/mongoose-repos.ts`:

```ts
import Coupon from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";
import type { ICoupon } from "@/models/Coupon";
import type { ICouponUsage } from "@/models/CouponUsage";
import type { CouponRepo, CreateCouponInput, CreateCouponUsageInput } from "./repos";

// (other content unchanged)

export class MongooseCouponRepo implements CouponRepo {
    private normalize(code: string): string {
        return code.trim().toUpperCase();
    }
    async findByCode(code: string): Promise<ICoupon | null> {
        await connectDB();
        return (await Coupon.findOne({ code: this.normalize(code) }).lean()) as ICoupon | null;
    }
    async findById(id: string): Promise<ICoupon | null> {
        await connectDB();
        return (await Coupon.findById(id).lean()) as ICoupon | null;
    }
    async incrementUsage(couponId: string): Promise<ICoupon | null> {
        await connectDB();
        const doc = await Coupon.findByIdAndUpdate(
            couponId,
            { $inc: { usedCount: 1 } },
            { new: true },
        ).lean();
        return (doc as ICoupon | null) ?? null;
    }
    async createUsage(data: CreateCouponUsageInput): Promise<ICouponUsage> {
        await connectDB();
        const doc = await CouponUsage.create(data);
        return doc.toObject() as ICouponUsage;
    }
    async findUsageForUser(couponId: string, userId: string): Promise<ICouponUsage | null> {
        await connectDB();
        const doc = await CouponUsage.findOne({ couponId, userId }).lean();
        return (doc as ICouponUsage | null) ?? null;
    }
    async listUsages(couponId: string, limit: number, skip: number): Promise<ICouponUsage[]> {
        await connectDB();
        const docs = await CouponUsage.find({ couponId })
            .sort({ usedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        return docs as unknown as ICouponUsage[];
    }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/lib/infra/coupon-repo.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/infra/db/repos.ts src/lib/infra/db/mongoose-repos.ts tests/lib/infra/coupon-repo.test.ts
git commit -m "feat(repo): add MongooseCouponRepo and InMemoryCouponRepo

CouponRepo interface already existed in repos.ts but had no implementations.
Adds both prod (Mongoose) and test (in-memory) variants, plus a
findUsageForUser method so a user cannot redeem the same coupon twice."
```

---

### Task 4: Add `validateCoupon` and `redeemCoupon` to the coupon domain service

**Files:**
- Create: `src/lib/domain/coupon/service.ts`
- Test: `tests/lib/domain/coupon.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/lib/domain/coupon.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
    vi.resetModules();
    process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
    process.env.NODE_ENV = "test";
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
});

describe("domain/coupon validateCoupon", () => {
    async function load() {
        const repos = await import("@/lib/infra/db/repos");
        const coupon = await import("@/lib/domain/coupon/service");
        return { repo: new repos.InMemoryCouponRepo(), coupon };
    }

    it("rejects an unknown code with reason 'not_found'", async () => {
        const { repo, coupon } = await load();
        const result = await coupon.validateCoupon({
            code: "NOPE",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("not_found");
    });

    it("rejects an inactive coupon with reason 'inactive'", async () => {
        const { repo, coupon } = await load();
        await repo.create({
            code: "OFF",
            type: "flat",
            amount: 100,
            usageLimit: 10,
            usedCount: 0,
            active: false,
        });
        const result = await coupon.validateCoupon({
            code: "off",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("inactive");
    });

    it("rejects an expired coupon with reason 'expired'", async () => {
        const { repo, coupon } = await load();
        await repo.create({
            code: "OLD",
            type: "flat",
            amount: 100,
            usageLimit: 10,
            usedCount: 0,
            active: true,
            expiresAt: new Date(Date.now() - 1000),
        });
        const result = await coupon.validateCoupon({
            code: "OLD",
            orderAmountRupees: 1499,
            couponRepo: repo,
            now: () => Date.now(),
        });
        expect(result.reason).toBe("expired");
    });

    it("rejects an exhausted coupon with reason 'exhausted'", async () => {
        const { repo, coupon } = await load();
        await repo.create({
            code: "GONE",
            type: "flat",
            amount: 100,
            usageLimit: 1,
            usedCount: 1,
            active: true,
        });
        const result = await coupon.validateCoupon({
            code: "GONE",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        expect(result.reason).toBe("exhausted");
    });

    it("accepts a flat-amount coupon and computes discount + finalAmount", async () => {
        const { repo, coupon } = await load();
        await repo.create({
            code: "FLAT100",
            type: "flat",
            amount: 100,
            usageLimit: 10,
            usedCount: 0,
            active: true,
        });
        const result = await coupon.validateCoupon({
            code: "FLAT100",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        expect(result.valid).toBe(true);
        expect(result.discount).toBe(100);
        expect(result.finalAmount).toBe(1399);
    });

    it("accepts a percent coupon and computes discount + finalAmount", async () => {
        const { repo, coupon } = await load();
        await repo.create({
            code: "TEN",
            type: "percent",
            amount: 10,
            usageLimit: 10,
            usedCount: 0,
            active: true,
        });
        const result = await coupon.validateCoupon({
            code: "TEN",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        expect(result.discount).toBe(150); // 10% of 1499, rounded
        expect(result.finalAmount).toBe(1349);
    });

    it("clamps discount so finalAmount never goes below zero", async () => {
        const { repo, coupon } = await load();
        await repo.create({
            code: "MEGA",
            type: "flat",
            amount: 5000,
            usageLimit: 10,
            usedCount: 0,
            active: true,
        });
        const result = await coupon.validateCoupon({
            code: "MEGA",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        expect(result.discount).toBe(1499);
        expect(result.finalAmount).toBe(0);
    });
});

describe("domain/coupon redeemCoupon", () => {
    async function load() {
        const repos = await import("@/lib/infra/db/repos");
        const coupon = await import("@/lib/domain/coupon/service");
        return { repo: new repos.InMemoryCouponRepo(), coupon };
    }

    it("records usage and bumps usedCount atomically", async () => {
        const { repo, coupon } = await load();
        const c = await repo.create({
            code: "X",
            type: "flat",
            amount: 100,
            usageLimit: 10,
            usedCount: 0,
            active: true,
        });
        await coupon.redeemCoupon({
            code: "X",
            userId: "u-1",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        const after = await repo.findByCode("X");
        expect(after?.usedCount).toBe(1);
        const usage = await repo.findUsageForUser(String(c._id), "u-1");
        expect(usage).not.toBeNull();
        expect(usage?.discountApplied).toBe(100);
    });

    it("throws ConflictError if user already redeemed this coupon", async () => {
        const { repo, coupon } = await load();
        const c = await repo.create({
            code: "ONCE",
            type: "flat",
            amount: 100,
            usageLimit: 100,
            usedCount: 0,
            active: true,
        });
        await coupon.redeemCoupon({
            code: "ONCE",
            userId: "u-1",
            orderAmountRupees: 1499,
            couponRepo: repo,
        });
        await expect(
            coupon.redeemCoupon({
                code: "ONCE",
                userId: "u-1",
                orderAmountRupees: 1499,
                couponRepo: repo,
            }),
        ).rejects.toThrow(/already/i);
        const after = await repo.findByCode("ONCE");
        expect(after?.usedCount).toBe(1); // not bumped twice
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/domain/coupon.test.ts`
Expected: FAIL — module `@/lib/domain/coupon/service` does not exist.

- [ ] **Step 3: Create the service**

Create `src/lib/domain/coupon/service.ts`:

```ts
/**
 * Coupon domain — validation and redemption.
 *
 * Pure business logic over `CouponRepo`. No NextResponse, no Mongoose.
 *
 * `validateCoupon` does NOT consume. It returns the discount and final
 * amount the UI should display. The caller (typically the /checkout
 * client) may then call `redeemCoupon` to consume.
 *
 * `redeemCoupon` does:
 *   1. Re-validate (in case the coupon was edited/expired between
 *      validate and redeem).
 *   2. Reject if the user already redeemed this coupon.
 *   3. Increment usedCount + record CouponUsage.
 *   4. Return the discount + finalAmount for the caller to persist on
 *      the resulting Payment record.
 */

import "server-only";
import { ConflictError, NotFoundError } from "@/lib/api/errors";
import type { CouponRepo } from "@/lib/infra/db/repos";

export type ValidateCouponDeps = {
    code: string;
    orderAmountRupees: number;
    couponRepo: CouponRepo;
    now?: () => number;
};

export type ValidateCouponResult =
    | { valid: true; couponId: string; discount: number; finalAmount: number; reason?: never }
    | { valid: false; reason: "not_found" | "inactive" | "expired" | "exhausted" | "min_order" };

export async function validateCoupon(deps: ValidateCouponDeps): Promise<ValidateCouponResult> {
    const coupon = await deps.couponRepo.findByCode(deps.code);
    if (!coupon) return { valid: false, reason: "not_found" };
    if (!coupon.active) return { valid: false, reason: "inactive" };
    const now = (deps.now ?? Date.now)();
    if (coupon.expiresAt && coupon.expiresAt.getTime() < now) {
        return { valid: false, reason: "expired" };
    }
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
        return { valid: false, reason: "exhausted" };
    }
    if (coupon.minOrderAmount && deps.orderAmountRupees < coupon.minOrderAmount) {
        return { valid: false, reason: "min_order" };
    }
    const rawDiscount =
        coupon.type === "percent"
            ? Math.round((deps.orderAmountRupees * coupon.amount) / 100)
            : coupon.amount;
    const discount = Math.min(rawDiscount, deps.orderAmountRupees);
    const finalAmount = deps.orderAmountRupees - discount;
    return {
        valid: true,
        couponId: String(coupon._id),
        discount,
        finalAmount,
    };
}

export type RedeemCouponDeps = {
    code: string;
    userId: string;
    orderAmountRupees: number;
    couponRepo: CouponRepo;
    now?: () => number;
};

export type RedeemCouponResult = {
    couponId: string;
    code: string;
    discount: number;
    finalAmount: number;
};

export async function redeemCoupon(deps: RedeemCouponDeps): Promise<RedeemCouponResult> {
    const validation = await validateCoupon({
        code: deps.code,
        orderAmountRupees: deps.orderAmountRupees,
        couponRepo: deps.couponRepo,
        ...(deps.now ? { now: deps.now } : {}),
    });
    if (!validation.valid) {
        if (validation.reason === "not_found") throw new NotFoundError("Coupon not found");
        throw new ConflictError(`Coupon cannot be redeemed: ${validation.reason}`);
    }
    const existing = await deps.couponRepo.findUsageForUser(validation.couponId, deps.userId);
    if (existing) {
        throw new ConflictError("You have already redeemed this coupon");
    }
    const coupon = await deps.couponRepo.findById(validation.couponId);
    if (!coupon) throw new NotFoundError("Coupon not found");

    await deps.couponRepo.incrementUsage(validation.couponId);
    await deps.couponRepo.createUsage({
        couponId: validation.couponId as any,
        userId: deps.userId as any,
        code: coupon.code,
        discountApplied: validation.discount,
    });

    return {
        couponId: validation.couponId,
        code: coupon.code,
        discount: validation.discount,
        finalAmount: validation.finalAmount,
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/domain/coupon.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/coupon/service.ts tests/lib/domain/coupon.test.ts
git commit -m "feat(coupon): add validateCoupon and redeemCoupon domain service

validateCoupon is non-mutating and used by the UI to show discount.
redeemCoupon atomically records CouponUsage and bumps usedCount,
guarding against double-redeem via findUsageForUser."
```

---

### Task 5: Update `verifyPayment` to support re-issuing the auth cookie

**Files:**
- Modify: `src/lib/domain/payment/service.ts:136-151`
- Test: extend `tests/lib/domain/payment.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/lib/domain/payment.test.ts`:

```ts
describe("verifyPayment re-issues user for unpaid returning user", () => {
    it("returns updated user and payment", async () => {
        const { userRepo, paymentRepo, payment } = await load();
        const u = await userRepo.create({
            phone: "9876543210",
            paymentStatus: "pending",
        });
        await paymentRepo.create({
            userId: String(u._id),
            paymentId: "pay_1",
            orderId: "order_1",
            amount: 149900,
            currency: "INR",
            status: "created",
            source: "razorpay",
        });
        const crypto = require("crypto");
        const sig = crypto
            .createHmac("sha256", "test-secret-for-hmac")
            .update("order_1|pay_1")
            .digest("hex");

        const result = await payment.verifyPayment({
            paymentId: "pay_1",
            orderId: "order_1",
            signature: sig,
            secret: "test-secret-for-hmac",
            userRepo,
            paymentRepo,
        });
        const reloaded = await userRepo.findByPhone("9876543210");
        expect(reloaded?.paymentStatus).toBe("completed");
        expect(result.user.paymentStatus).toBe("completed");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/domain/payment.test.ts`
Expected: FAIL — `result.user` does not exist on the current `VerifyPaymentResult`.

- [ ] **Step 3: Update `VerifyPaymentResult` and `verifyPayment`**

In `src/lib/domain/payment/service.ts`, change the result type and the function:

```ts
export type VerifyPaymentResult = {
    payment: Awaited<ReturnType<PaymentRepo["findByPaymentId"]>>;
    user: IUser;
};

export async function verifyPayment(deps: VerifyPaymentDeps): Promise<VerifyPaymentResult> {
    const payment = await deps.paymentRepo.findByPaymentId(deps.paymentId);
    if (!payment) throw new NotFoundError("Payment record not found");
    if (!verifyCheckoutHmac(deps)) {
        throw new UnauthorizedError("Invalid payment signature");
    }

    const updated = await deps.paymentRepo.updateStatus(deps.paymentId, "completed");
    const user = await deps.userRepo.update(String(payment.userId), {
        paymentStatus: "completed",
        paymentId: deps.paymentId,
        orderId: deps.orderId,
    });
    if (!user) throw new NotFoundError("User for payment not found");

    return { payment: updated, user };
}
```

(Add `IUser` to the imports if not already imported.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/domain/payment.test.ts`
Expected: PASS.

- [ ] **Step 5: Update `/api/payment/verify` route to re-issue cookie**

In `src/app/api/payment/verify/route.ts`, replace the body:

```ts
import { signAuth } from "@/lib/auth/crypto";
import { setAuthCookie, clearPendingCookie } from "@/lib/auth/cookies";
// (other imports unchanged)

export const POST = withRequest(async ({ req }) => {
    const body = parse(await req.json().catch(() => ({})), schema);

    const result = await verifyPaymentService({
        paymentId: body.paymentId,
        orderId: body.orderId,
        signature: body.signature,
        secret: env.RAZORPAY_KEY_SECRET || "",
        userRepo: new MongooseUserRepo(),
        paymentRepo: new MongoosePaymentRepo(),
    });

    // Re-issue the auth cookie with paid:true so the user lands on /dashboard
    // without going through /login again. If they only had a pending cookie,
    // upgrade it to full auth.
    const authToken = await signAuth({
        sub: result.user._id.toString(),
        phone: result.user.phone,
        paid: true,
    });
    await setAuthCookie(authToken);
    await clearPendingCookie();

    return ok({
        success: true,
        orderId: body.orderId,
        paymentId: body.paymentId,
        redirect: "/dashboard",
    });
});
```

- [ ] **Step 6: Run all payment tests**

Run: `npx vitest run tests/lib/domain/payment.test.ts tests/api/auth.me.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/domain/payment/service.ts src/app/api/payment/verify/route.ts tests/lib/domain/payment.test.ts
git commit -m "feat(payment): verifyPayment returns updated user; route re-issues paid cookie

/api/payment/verify now re-issues the brpl_auth cookie with paid:true
and clears the pending cookie. Redirect changes from /login?next=/dashboard
to /dashboard directly — paying takes you home."
```

---

## Phase B — Middleware upgrade

### Task 6: Update middleware to gate `/dashboard` by `paid` and protect `/checkout`

**Files:**
- Modify: `src/middleware.ts`
- Test: `tests/api/checkout.gate.test.ts` (new) — uses `next-test-api-route-handler` or direct `new NextRequest`.

- [ ] **Step 1: Write the failing test**

Create `tests/api/checkout.gate.test.ts`:

```ts
import { describe, it, expect, vi, beforeAll } from "vitest";

beforeAll(() => {
    process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
    process.env.NODE_ENV = "test";
});

async function mintAuthToken(payload: { sub: string; phone: string; paid?: boolean }) {
    const { signAuth } = await import("@/lib/auth/crypto");
    return signAuth(payload);
}

async function callMiddleware(req: Request) {
    const { middleware } = await import("@/middleware");
    return middleware(req as any);
}

function reqWithCookies(pathname: string, cookies: Record<string, string>) {
    const url = `https://example.test${pathname}`;
    const headers = new Headers();
    for (const [k, v] of Object.entries(cookies)) headers.append("cookie", `${k}=${v}`);
    // next/server NextRequest construction in tests:
    const { NextRequest } = require("next/server");
    return new NextRequest(url, { headers });
}

describe("middleware /dashboard gate", () => {
    it("redirects unauth user to /login?next=/dashboard", async () => {
        const req = reqWithCookies("/dashboard", {});
        const res = await callMiddleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("/login?next=%2Fdashboard");
    });

    it("allows auth+paid user through", async () => {
        const token = await mintAuthToken({ sub: "u1", phone: "9876543210", paid: true });
        const req = reqWithCookies("/dashboard", { brpl_auth: token });
        const res = await callMiddleware(req);
        // next() returns a passthrough response (status 200)
        expect(res.status).toBe(200);
    });

    it("redirects auth+unpaid user to /checkout", async () => {
        const token = await mintAuthToken({ sub: "u1", phone: "9876543210", paid: false });
        const req = reqWithCookies("/dashboard", { brpl_auth: token });
        const res = await callMiddleware(req);
        expect([301, 302, 307, 308]).toContain(res.status);
        expect(res.headers.get("location")).toContain("/checkout?next=%2Fdashboard");
    });
});

describe("middleware /checkout gate", () => {
    it("redirects no-cookie user to /login?next=/checkout", async () => {
        const req = reqWithCookies("/checkout", {});
        const res = await callMiddleware(req);
        expect([301, 302, 307, 308]).toContain(res.status);
        expect(res.headers.get("location")).toContain("/login?next=%2Fcheckout");
    });

    it("allows pending cookie through", async () => {
        const { signPending } = await import("@/lib/auth/crypto");
        const token = await signPending({ sub: "pending:9876543210", phone: "9876543210" });
        const req = reqWithCookies("/checkout", { brpl_pending: token });
        const res = await callMiddleware(req);
        expect(res.status).toBe(200);
    });

    it("allows auth+unpaid through", async () => {
        const token = await mintAuthToken({ sub: "u1", phone: "9876543210", paid: false });
        const req = reqWithCookies("/checkout", { brpl_auth: token });
        const res = await callMiddleware(req);
        expect(res.status).toBe(200);
    });

    it("redirects auth+paid straight to /dashboard", async () => {
        const token = await mintAuthToken({ sub: "u1", phone: "9876543210", paid: true });
        const req = reqWithCookies("/checkout", { brpl_auth: token });
        const res = await callMiddleware(req);
        expect([301, 302, 307, 308]).toContain(res.status);
        expect(res.headers.get("location")).toContain("/dashboard");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/checkout.gate.test.ts`
Expected: FAIL — middleware doesn't know about `/checkout` or `paid`.

- [ ] **Step 3: Rewrite the middleware**

Replace `src/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { verifyAuth, verifyPending, type AuthTokenPayload, type PendingTokenPayload } from "@/lib/auth/crypto";

const PROTECTED_PREFIXES = ["/dashboard"];
const PENDING_OR_UNPAID_PREFIXES = ["/checkout"];
const AUTH_PATHS = ["/login"];

function matchesAny(pathname: string, list: string[]) {
    return list.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

type SessionResult =
    | { valid: true; payload: AuthTokenPayload; expired: false }
    | { valid: false; expired: boolean };

async function readSession(req: NextRequest): Promise<SessionResult> {
    const token = req.cookies.get("brpl_auth")?.value;
    if (!token) return { valid: false, expired: false };
    const payload = await verifyAuth(token);
    if (payload) return { valid: true, payload, expired: false };
    let expired = false;
    try {
        const parts = token.split(".");
        if (parts.length === 3) {
            const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const padded = payloadB64 + "=".repeat((4 - (payloadB64.length % 4)) % 4);
            const decoded = JSON.parse(atob(padded));
            if (typeof decoded.exp === "number" && decoded.exp * 1000 < Date.now()) {
                expired = true;
            }
        }
    } catch {
        /* ignore */
    }
    return { valid: false, expired };
}

async function readPending(req: NextRequest): Promise<PendingTokenPayload | null> {
    const token = req.cookies.get("brpl_pending")?.value;
    if (!token) return null;
    return verifyPending(token);
}

function safeNext(next: string | null, fallback: string): string {
    if (!next) return fallback;
    if (!next.startsWith("/")) return fallback;
    if (next.startsWith("//")) return fallback;
    return next;
}

function redirectTo(req: NextRequest, pathname: string, search: Record<string, string>) {
    const url = req.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    for (const [k, v] of Object.entries(search)) {
        url.searchParams.set(k, v);
    }
    return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const session = await readSession(req);

    /* --- /login --- */
    if (matchesAny(pathname, AUTH_PATHS)) {
        if (session.valid) {
            const target = safeNext(
                req.nextUrl.searchParams.get("next"),
                session.payload.paid ? "/dashboard" : "/checkout",
            );
            const url = req.nextUrl.clone();
            url.pathname = target;
            url.search = "";
            return NextResponse.redirect(url);
        }
        if (session.expired) {
            const res = NextResponse.next();
            res.cookies.delete("brpl_auth");
            return res;
        }
        return NextResponse.next();
    }

    /* --- /checkout: pending cookie OR auth+unpaid. Auth+paid → /dashboard. --- */
    if (matchesAny(pathname, PENDING_OR_UNPAID_PREFIXES)) {
        if (session.valid && session.payload.paid === true) {
            return redirectTo(req, safeNext(req.nextUrl.searchParams.get("next"), "/dashboard"), {});
        }
        const pending = await readPending(req);
        if (pending) return NextResponse.next();
        if (session.valid && session.payload.paid === false) return NextResponse.next();
        return redirectTo(req, "/login", { next: pathname });
    }

    /* --- /dashboard: auth+paid only. --- */
    if (matchesAny(pathname, PROTECTED_PREFIXES)) {
        if (!session.valid) {
            const res = redirectTo(req, "/login", { next: pathname });
            if (session.expired) res.cookies.delete("brpl_auth");
            return res;
        }
        if (session.payload.paid === true) return NextResponse.next();
        return redirectTo(req, "/checkout", { next: pathname });
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/login",
        "/login/:path*",
        "/checkout",
        "/checkout/:path*",
    ],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/checkout.gate.test.ts`
Expected: PASS.

- [ ] **Step 5: Run existing middleware/auth tests**

Run: `npx vitest run tests/lib/auth.middleware.test.ts tests/lib/auth.crypto.test.ts tests/api/auth.me.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts tests/api/checkout.gate.test.ts
git commit -m "feat(middleware): gate /dashboard by paid; protect /checkout

Edge-runtime middleware now reads `paid` from the JWT payload. Unpaid
users hitting /dashboard are bounced to /checkout?next=/dashboard.
/checkout accepts pending cookies OR auth+unpaid; auth+paid users are
bounced straight to /dashboard."
```

---

## Phase C — `/dashboard` defense in depth

### Task 7: Add `paymentStatus` re-check in `/dashboard/page.tsx`

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Modify the server component**

Replace `src/app/dashboard/page.tsx`:

```ts
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/session";
import DashboardClient from "./DashboardClient";
import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const session = await getAuthSession();
    if (!session) redirect("/login?next=/dashboard");
    // Defense in depth: middleware also checks the JWT `paid` claim, but
    // that can be stale (admin manually revoked payment, JWT issued
    // before payment completed, etc.). Always re-read from DB.
    if (session.paymentStatus !== "completed") {
        redirect("/checkout?next=/dashboard");
    }
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <DashboardClient />
        </SiteContextProvider>
    );
}
```

- [ ] **Step 2: Manual verify with the running app**

Run: `npm run dev`
Then in a browser, hit `/dashboard` with an auth cookie whose underlying user has `paymentStatus: "pending"` (or use the existing admin "mark paid" toggle to flip a user to unpaid, then re-load `/dashboard`).
Expected: redirect to `/checkout?next=/dashboard`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(dashboard): re-check paymentStatus from DB

Defense-in-depth against stale JWT `paid:true` claims. If the user
record says unpaid, bounce to /checkout regardless of cookie contents."
```

---

## Phase D — New `/checkout` page

### Task 8: Create `/checkout/page.tsx` server component with guards

**Files:**
- Create: `src/app/checkout/page.tsx`

- [ ] **Step 1: Create the directory and the page**

Run: `mkdir -p src/app/checkout`

Create `src/app/checkout/page.tsx`:

```ts
import { redirect } from "next/navigation";
import { verifyPending } from "@/lib/auth/crypto";
import { verifyAuth } from "@/lib/auth/crypto";
import { cookies } from "next/headers";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { getAuthSession } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import CheckoutClient from "./CheckoutClient";
import { REGISTRATION_AMOUNT_RUPEES } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

/**
 * Server-side guard for /checkout.
 *
 * Allowed if ANY of:
 *   - brpl_pending cookie (OTP-verified, not registered)
 *   - brpl_auth cookie with paid:false (registered but unpaid)
 *
 * Disallowed:
 *   - No cookies at all → /login
 *   - brpl_auth with paid:true → /dashboard (idempotent)
 */
export default async function CheckoutPage({
    searchParams,
}: {
    searchParams: { next?: string };
}) {
    const c = await cookies();
    const pendingToken = c.get(COOKIE_NAMES.PENDING)?.value;
    const authToken = c.get(COOKIE_NAMES.AUTH)?.value;

    if (!pendingToken && !authToken) {
        redirect("/login?next=/checkout");
    }

    // Idempotent guard: paid user landed here by mistake → dashboard.
    if (authToken) {
        const payload = await verifyAuth(authToken);
        if (payload?.paid === true) redirect(safeNext(searchParams.next, "/dashboard"));
    }

    let phone: string | null = null;
    let existingUser: Awaited<ReturnType<typeof loadUser>> = null;

    if (pendingToken) {
        const payload = await verifyPending(pendingToken);
        if (!payload) redirect("/login?next=/checkout");
        phone = payload.phone;
        existingUser = await loadUser(phone);
    } else if (authToken) {
        const session = await getAuthSession();
        if (!session) redirect("/login?next=/checkout");
        if (session.paymentStatus === "completed") redirect(safeNext(searchParams.next, "/dashboard"));
        phone = session.phone;
        existingUser = {
            _id: session.sub,
            phone: session.phone,
            name: session.name,
            email: session.email,
            role: session.role,
            state: session.state,
            city: session.city,
        };
    }

    return (
        <CheckoutClient
            phone={phone!}
            next={safeNext(searchParams.next, "/dashboard")}
            registrationFeeRupees={REGISTRATION_AMOUNT_RUPEES}
            existingUser={existingUser}
        />
    );
}

function safeNext(next: string | undefined, fallback: string): string {
    if (!next) return fallback;
    if (!next.startsWith("/")) return fallback;
    if (next.startsWith("//")) return fallback;
    return next;
}

async function loadUser(phone: string) {
    await connectDB();
    const u = await User.findOne({ phone }).lean();
    if (!u) return null;
    return {
        _id: String(u._id),
        phone: u.phone,
        name: u.name,
        email: u.email,
        role: u.role,
        state: u.state,
        city: u.city,
    };
}
```

- [ ] **Step 2: Commit (placeholder)**

```bash
git add src/app/checkout/page.tsx
git commit -m "feat(checkout): add server-side guard page

Allows pending or auth+unpaid users; bounces paid users and unauth users.
Loads existing user record so the client can pre-fill the profile form."
```

---

### Task 9: Create `/checkout/CheckoutClient.tsx` — profile + coupon + Razorpay + polling

**Files:**
- Create: `src/app/checkout/CheckoutClient.tsx`

- [ ] **Step 1: Create the client component**

Create `src/app/checkout/CheckoutClient.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Tag, CreditCard, User, Mail, MapPin, Trophy, Check, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { loadRazorpayScript } from "@/hooks/useRazorpayScript";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type Role = "batsman" | "bowler" | "allrounder" | "wicketkeeper";
const ROLES: Array<{ value: Role; label: string; description: string }> = [
    { value: "batsman", label: "Batsman", description: "Specialist batter" },
    { value: "bowler", label: "Bowler", description: "Specialist bowler" },
    { value: "allrounder", label: "All-Rounder", description: "Bat & bowl" },
    { value: "wicketkeeper", label: "Wicket-Keeper", description: "Keeper & batter" },
];

type ExistingUser = {
    _id: string;
    phone: string;
    name?: string;
    email?: string;
    role?: string;
    state?: string;
    city?: string;
} | null;

type CouponState =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "valid"; code: string; discount: number; finalAmount: number; couponId: string }
    | { status: "invalid"; reason: string };

const POLL_INTERVAL_MS = 2000;
const POLL_DURATION_MS = 60_000;

export default function CheckoutClient({
    phone,
    next,
    registrationFeeRupees,
    existingUser,
}: {
    phone: string;
    next: string;
    registrationFeeRupees: number;
    existingUser: ExistingUser;
}) {
    const { settings } = useSiteSettings();
    const { toast } = useToast();

    const isNewUser = !existingUser?.name;
    const [form, setForm] = useState({
        name: existingUser?.name ?? "",
        email: existingUser?.email ?? "",
        role: (existingUser?.role as Role) ?? "batsman",
        state: existingUser?.state ?? "",
        city: existingUser?.city ?? "",
    });

    const [couponInput, setCouponInput] = useState("");
    const [coupon, setCoupon] = useState<CouponState>({ status: "idle" });
    const [couponOpen, setCouponOpen] = useState(false);

    const [orderId, setOrderId] = useState<string | null>(null);
    const [paymentId, setPaymentId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const finalAmount = coupon.status === "valid" ? coupon.finalAmount : registrationFeeRupees;
    const couponCoversAll = coupon.status === "valid" && coupon.finalAmount === 0;

    /* --- Resumable payment polling: handles "closed tab mid-payment" case --- */
    useEffect(() => {
        let elapsed = 0;
        const t = setInterval(async () => {
            elapsed += POLL_INTERVAL_MS;
            if (elapsed > POLL_DURATION_MS) {
                clearInterval(t);
                return;
            }
            try {
                const res = await fetch("/api/auth/me", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                if (data?.user?.paymentStatus === "completed") {
                    clearInterval(t);
                    // Webhook arrived while user was away — run the standard
                    // complete path: if new user, register; then go home.
                    await finishRegistration();
                }
            } catch {
                /* network blip; ignore */
            }
        }, POLL_INTERVAL_MS);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* --- Coupon validation (does NOT consume) --- */
    const applyCoupon = async () => {
        if (!couponInput.trim()) return;
        setCoupon({ status: "checking" });
        try {
            const res = await fetch("/api/payment/redeem-coupon?dryRun=1", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: couponInput.trim(),
                    orderAmountRupees: registrationFeeRupees,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.valid) {
                setCoupon({
                    status: "invalid",
                    reason: data.reason || data.error || "Invalid coupon",
                });
                return;
            }
            setCoupon({
                status: "valid",
                code: data.code ?? couponInput.trim().toUpperCase(),
                discount: data.discount,
                finalAmount: data.finalAmount,
                couponId: data.couponId,
            });
        } catch {
            setCoupon({ status: "invalid", reason: "Network error" });
        }
    };

    /* --- Razorpay path --- */
    const startPayment = async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch("/api/payment/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    coupon.status === "valid"
                        ? { couponId: coupon.couponId, code: coupon.code }
                        : {},
                ),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Could not start payment");

            setOrderId(data.orderId);
            const loaded = await loadRazorpayScript();
            if (!loaded) throw new Error("Failed to load Razorpay");

            const rzp = new window.Razorpay!({
                key: data.key,
                amount: data.amount,
                currency: data.currency,
                name: settings?.siteName || "BRPL",
                description: "Player Registration",
                order_id: data.orderId,
                prefill: { contact: phone },
                handler: async (resp: any) => {
                    setPaymentId(resp.razorpay_payment_id);
                    const v = await fetch("/api/payment/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            orderId: resp.razorpay_order_id,
                            paymentId: resp.razorpay_payment_id,
                            signature: resp.razorpay_signature,
                        }),
                    });
                    const vData = await v.json().catch(() => ({}));
                    if (v.ok) {
                        await finishRegistration();
                    } else {
                        toast({
                            variant: "destructive",
                            title: "Verification failed",
                            description: vData.error,
                        });
                        setBusy(false);
                    }
                },
                modal: { ondismiss: () => setBusy(false) },
            });
            rzp.open();
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Payment error",
                description: err?.message || "Unknown",
            });
            setBusy(false);
        }
    };

    /* --- Coupon-only path (full coverage) OR post-Razorpay finish --- */
    const finishRegistration = async () => {
        setBusy(true);
        try {
            // For new users, we need profile data + paymentId/orderId.
            if (isNewUser) {
                if (!form.name || !form.email || !form.state || !form.city) {
                    toast({
                        variant: "destructive",
                        title: "Missing fields",
                        description: "All fields are required.",
                    });
                    setBusy(false);
                    return;
                }
            }

            // If paying with a coupon that covers the full amount, redeem now.
            if (coupon.status === "valid" && couponCoversAll && !paymentId) {
                const r = await fetch("/api/payment/redeem-coupon", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        code: coupon.code,
                        orderAmountRupees: registrationFeeRupees,
                    }),
                });
                const rData = await r.json().catch(() => ({}));
                if (!r.ok) {
                    toast({
                        variant: "destructive",
                        title: "Coupon redemption failed",
                        description: rData.error || "Try again",
                    });
                    setBusy(false);
                    return;
                }
            }

            if (isNewUser && paymentId && orderId) {
                const regRes = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...form,
                        paymentId,
                        orderId,
                    }),
                });
                const regData = await regRes.json().catch(() => ({}));
                if (!regRes.ok) {
                    toast({
                        variant: "destructive",
                        title: "Registration failed",
                        description: regData.error,
                    });
                    setBusy(false);
                    return;
                }
            }

            // Hard navigation to ensure cookies + DB state are consistent.
            window.location.href = next;
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err?.message });
            setBusy(false);
        }
    };

    /* --- Render --- */
    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 mb-4">
                        <CreditCard className="w-7 h-7 text-amber-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        Complete registration
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Pay ₹{registrationFeeRupees.toLocaleString("en-IN")} to unlock your BRPL dashboard.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
                    {/* Profile */}
                    {isNewUser && (
                        <section className="space-y-5">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                                Your details
                            </h2>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                    <Trophy className="w-4 h-4 inline mr-1" />
                                    Playing role
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {ROLES.map((r) => {
                                        const active = form.role === r.value;
                                        return (
                                            <button
                                                key={r.value}
                                                type="button"
                                                onClick={() => setForm({ ...form, role: r.value })}
                                                className={`relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
                                                    active
                                                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                                                        : "border-slate-200 dark:border-slate-700"
                                                }`}
                                            >
                                                <Trophy
                                                    className={`w-7 h-7 ${active ? "text-amber-600" : "text-slate-500"}`}
                                                />
                                                <span className="text-sm font-bold">{r.label}</span>
                                                <span className="text-[10px] text-slate-500 text-center leading-tight">
                                                    {r.description}
                                                </span>
                                                {active && (
                                                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field
                                    label="Full name"
                                    icon={<User className="w-4 h-4" />}
                                    value={form.name}
                                    onChange={(v) => setForm({ ...form, name: v })}
                                />
                                <Field
                                    label="Email"
                                    icon={<Mail className="w-4 h-4" />}
                                    type="email"
                                    value={form.email}
                                    onChange={(v) => setForm({ ...form, email: v })}
                                />
                                <Field
                                    label="State"
                                    icon={<MapPin className="w-4 h-4" />}
                                    value={form.state}
                                    onChange={(v) => setForm({ ...form, state: v })}
                                />
                                <Field
                                    label="City"
                                    icon={<MapPin className="w-4 h-4" />}
                                    value={form.city}
                                    onChange={(v) => setForm({ ...form, city: v })}
                                />
                            </div>
                        </section>
                    )}

                    {/* Coupon */}
                    <section>
                        <button
                            type="button"
                            onClick={() => setCouponOpen((o) => !o)}
                            className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
                        >
                            <Tag className="w-4 h-4" />
                            Have a coupon code?
                            {couponOpen ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </button>
                        {couponOpen && (
                            <div className="mt-3 space-y-3">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter code"
                                        value={couponInput}
                                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                        className="h-11"
                                        disabled={coupon.status === "checking"}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={applyCoupon}
                                        disabled={coupon.status === "checking" || !couponInput.trim()}
                                    >
                                        {coupon.status === "checking" ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            "Apply"
                                        )}
                                    </Button>
                                </div>
                                {coupon.status === "valid" && (
                                    <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-md px-3 py-2">
                                        Coupon <b>{coupon.code}</b> applied — ₹{coupon.discount} off.
                                        New total: ₹{coupon.finalAmount}.
                                    </p>
                                )}
                                {coupon.status === "invalid" && (
                                    <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
                                        {coupon.reason}
                                    </p>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Pay */}
                    <section className="rounded-xl border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs uppercase tracking-wider font-bold text-amber-700 dark:text-amber-300">
                                Amount due
                            </span>
                            <span className="text-2xl font-bold text-amber-600 dark:text-amber-300">
                                ₹{finalAmount.toLocaleString("en-IN")}
                            </span>
                        </div>
                        {error && (
                            <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md px-3 py-2 mb-3 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 mt-0.5" />
                                {error}
                            </p>
                        )}
                        {couponCoversAll ? (
                            <Button
                                type="button"
                                onClick={finishRegistration}
                                disabled={busy}
                                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-base rounded-full"
                            >
                                {busy ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    "Complete registration"
                                )}
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={startPayment}
                                disabled={busy}
                                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-base rounded-full"
                            >
                                {busy ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>Pay ₹{finalAmount.toLocaleString("en-IN")}</>
                                )}
                            </Button>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

function Field({
    label,
    icon,
    value,
    onChange,
    type = "text",
}: {
    label: string;
    icon: React.ReactNode;
    value: string;
    onChange: (v: string) => void;
    type?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {icon} <span className="ml-1">{label}</span>
            </label>
            <Input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-11"
                required
            />
        </div>
    );
}
```

- [ ] **Step 2: Manual verify the page renders**

Run: `npm run dev`
Visit `/login` → enter phone → OTP → you should land on `/checkout`.
Expected: profile fields visible (new user), coupon disclosure, ₹1,499 pay button.

- [ ] **Step 3: Commit**

```bash
git add src/app/checkout/CheckoutClient.tsx
git commit -m "feat(checkout): profile + coupon + Razorpay + resumable payment

Single client component owning three regions. Polls /api/auth/me every
2s for 60s on mount to detect webhook-driven payment completion and
auto-resume. Coupon path supports both 'apply to discount Razorpay
amount' and 'full coverage = skip Razorpay entirely'."
```

---

### Task 10: Create `/api/payment/redeem-coupon` endpoint

**Files:**
- Create: `src/app/api/payment/redeem-coupon/route.ts`
- Test: `tests/api/redeem-coupon.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/api/redeem-coupon.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
    vi.resetModules();
    process.env.JWT_SECRET = "test-jwt-secret-must-be-long-enough";
    process.env.NODE_ENV = "test";
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
});

async function load() {
    const repos = await import("@/lib/infra/db/repos");
    const { POST } = await import("@/app/api/payment/redeem-coupon/route");
    return {
        userRepo: new repos.InMemoryUserRepo(),
        couponRepo: new repos.InMemoryCouponRepo(),
        POST,
    };
}

function req(body: any, search = "") {
    return new Request(`http://localhost/api/payment/redeem-coupon${search}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: "" },
        body: JSON.stringify(body),
    });
}

describe("POST /api/payment/redeem-coupon (dry-run validation)", () => {
    it("returns valid:true with discount for a known coupon", async () => {
        const { userRepo, couponRepo, POST } = await load();
        const u = await userRepo.create({ phone: "9876543210" });
        await couponRepo.create({
            code: "FLAT100",
            type: "flat",
            amount: 100,
            usageLimit: 5,
            usedCount: 0,
            active: true,
        });
        // Build a request with a valid pending cookie via the test helpers
        const { signPending } = await import("@/lib/auth/crypto");
        const token = await signPending({ sub: "pending:9876543210", phone: "9876543210" });
        const r = new Request("http://localhost/api/payment/redeem-coupon?dryRun=1", {
            method: "POST",
            headers: { "Content-Type": "application/json", cookie: `brpl_pending=${token}` },
            body: JSON.stringify({ code: "FLAT100", orderAmountRupees: 1499 }),
        });
        const res = await POST(r as any, { params: Promise.resolve({}) } as any);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.valid).toBe(true);
        expect(data.discount).toBe(100);
        expect(data.finalAmount).toBe(1399);
        // Validate (dry-run) does NOT consume.
        const after = await couponRepo.findByCode("FLAT100");
        expect(after?.usedCount).toBe(0);
    });

    it("returns valid:false with reason for unknown code", async () => {
        const { POST } = await load();
        const { signPending } = await import("@/lib/auth/crypto");
        const token = await signPending({ sub: "pending:9876543210", phone: "9876543210" });
        const r = new Request("http://localhost/api/payment/redeem-coupon?dryRun=1", {
            method: "POST",
            headers: { "Content-Type": "application/json", cookie: `brpl_pending=${token}` },
            body: JSON.stringify({ code: "NOPE", orderAmountRupees: 1499 }),
        });
        const res = await POST(r as any, { params: Promise.resolve({}) } as any);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.valid).toBe(false);
        expect(data.reason).toBe("not_found");
    });

    it("consumes the coupon when not a dry-run", async () => {
        const { couponRepo, POST } = await load();
        await couponRepo.create({
            code: "ONCE",
            type: "flat",
            amount: 100,
            usageLimit: 100,
            usedCount: 0,
            active: true,
        });
        const { signAuth } = await import("@/lib/auth/crypto");
        const token = await signAuth({
            sub: "u1",
            phone: "9876543210",
            paid: false,
        });
        const r = new Request("http://localhost/api/payment/redeem-coupon", {
            method: "POST",
            headers: { "Content-Type": "application/json", cookie: `brpl_auth=${token}` },
            body: JSON.stringify({ code: "ONCE", orderAmountRupees: 1499 }),
        });
        const res = await POST(r as any, { params: Promise.resolve({}) } as any);
        expect(res.status).toBe(200);
        const after = await couponRepo.findByCode("ONCE");
        expect(after?.usedCount).toBe(1);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/redeem-coupon.test.ts`
Expected: FAIL — module `@/app/api/payment/redeem-coupon/route` does not exist.

- [ ] **Step 3: Create the route**

Create `src/app/api/payment/redeem-coupon/route.ts`:

```ts
/**
 * POST /api/payment/redeem-coupon
 *
 * Two modes:
 *   - ?dryRun=1 (default for the "Apply" button): validates without
 *     consuming. Returns { valid, discount, finalAmount, reason? }.
 *   - default (no dryRun): consumes the coupon and creates a Payment
 *     record with source="coupon", then marks the user as paid and
 *     re-issues the auth cookie with paid:true.
 *
 * Auth: requires either a pending cookie (new user) or an auth cookie
 * with paid:false (returning unpaid user).
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { verifyPending, verifyAuth } from "@/lib/auth/crypto";
import { cookies } from "next/headers";
import { COOKIE_NAMES, setAuthCookie, clearPendingCookie } from "@/lib/auth/cookies";
import { signAuth } from "@/lib/auth/crypto";
import { BadRequestError, UnauthorizedError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import {
    validateCoupon,
    redeemCoupon as redeemCouponService,
} from "@/lib/domain/coupon/service";
import {
    MongooseUserRepo,
    MongoosePaymentRepo,
    MongooseCouponRepo,
} from "@/lib/infra/db/mongoose-repos";
import { connectDB } from "@/lib/mongodb";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    code: z.string().min(1).max(64),
    orderAmountRupees: z.number().int().min(0).max(100_000),
});

async function readSession(req: NextRequest): Promise<
    | { kind: "pending"; phone: string }
    | { kind: "auth"; userId: string; phone: string; paid: false }
> {
    const c = cookies();
    const authToken = c.get(COOKIE_NAMES.AUTH)?.value;
    const pendingToken = c.get(COOKIE_NAMES.PENDING)?.value;

    if (authToken) {
        const payload = await verifyAuth(authToken);
        if (payload && payload.paid === false && payload.sub && payload.phone) {
            return { kind: "auth", userId: payload.sub, phone: payload.phone };
        }
    }
    if (pendingToken) {
        const payload = await verifyPending(pendingToken);
        if (payload?.phone) return { kind: "pending", phone: payload.phone };
    }
    throw new UnauthorizedError("Authentication required");
}

export async function POST(req: NextRequest) {
    const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid input", issues: parsed.error.issues },
            { status: 400 },
        );
    }
    const { code, orderAmountRupees } = parsed.data;

    const session = await readSession(req);
    const couponRepo = new MongooseCouponRepo();

    if (dryRun) {
        const result = await validateCoupon({
            code,
            orderAmountRupees,
            couponRepo,
        });
        return NextResponse.json(result);
    }

    // Consume mode.
    if (session.kind === "pending") {
        return NextResponse.json(
            { error: "Complete profile before redeeming coupon" },
            { status: 400 },
        );
    }
    await connectDB();
    const result = await redeemCouponService({
        code,
        userId: session.userId,
        orderAmountRupees,
        couponRepo,
    });

    // Record a Payment row with source="coupon" so the existing admin
    // dashboards and analytics keep working.
    const paymentRepo = new MongoosePaymentRepo();
    const orderId = `coupon_${Date.now()}_${result.couponId.slice(-6)}`;
    await paymentRepo.create({
        userId: session.userId,
        paymentId: orderId,
        orderId,
        amount: 0, // free via coupon
        currency: "INR",
        status: "completed",
        source: "coupon",
    });

    // Mark user paid + re-issue auth cookie with paid:true.
    const userRepo = new MongooseUserRepo();
    const updated = await userRepo.update(session.userId, {
        paymentStatus: "completed",
        paymentId: orderId,
        orderId,
        amount: 0,
    });
    if (!updated) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const token = await signAuth({
        sub: session.userId,
        phone: session.phone,
        paid: true,
    });
    await setAuthCookie(token);
    await clearPendingCookie();

    logger.info("coupon.redeemed", {
        userId: session.userId,
        code: result.code,
        discount: result.discount,
    });

    return NextResponse.json({
        success: true,
        discount: result.discount,
        finalAmount: result.finalAmount,
        redirect: "/dashboard",
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/redeem-coupon.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/payment/redeem-coupon/route.ts tests/api/redeem-coupon.test.ts
git commit -m "feat(payment): add /api/payment/redeem-coupon endpoint

Two modes: dryRun validates without consuming; default mode consumes
the coupon, creates a Payment with source='coupon', marks the user
paid, and re-issues the auth cookie with paid:true."
```

---

## Phase E — `/login` refactor

### Task 11: Remove the inline "register" step from `/login/page.tsx`

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Replace the page with the two-step version**

Replace `src/app/login/page.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Phone, ShieldCheck, KeyRound, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

type Step = "phone" | "otp";

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-[60vh] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
            }
        >
            <LoginClient />
        </Suspense>
    );
}

function LoginClient() {
    const router = useRouter();
    const params = useSearchParams();
    const next = params.get("next") || "/dashboard";
    const { toast } = useToast();

    const [step, setStep] = useState<Step>("phone");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [resendIn, setResendIn] = useState(0);
    const [otpExpiresIn, setOtpExpiresIn] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /* countdown ticks */
    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);
    useEffect(() => {
        if (otpExpiresIn <= 0) return;
        const t = setTimeout(() => setOtpExpiresIn((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [otpExpiresIn]);

    const sendOtp = async (): Promise<boolean> => {
        const cleaned = phone.replace(/\D/g, "").slice(-10);
        if (cleaned.length !== 10) {
            setError("Please enter a valid 10-digit mobile number");
            return false;
        }
        setError(null);
        setBusy(true);
        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: cleaned }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to send OTP");
            setPhone(cleaned);
            setOtp(Array(OTP_LENGTH).fill(""));
            setOtpExpiresIn(Math.floor(data.expiresInSec ?? 300));
            setResendIn(RESEND_SECONDS);
            setStep("otp");
            return true;
        } catch (err: any) {
            setError(err.message || "Something went wrong");
            return false;
        } finally {
            setBusy(false);
        }
    };

    const submitOtp = async (code: string) => {
        if (busy || code.length !== OTP_LENGTH) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, otp: code }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || "Verification failed");
                setOtp(Array(OTP_LENGTH).fill(""));
                return;
            }
            const target = data.redirect || (data.paid ? next : "/checkout");
            toast({
                title: data.paid ? "Welcome back!" : "Phone verified",
            });
            // Hard navigation so cookies are committed before middleware runs.
            window.location.href = target;
        } catch (err: any) {
            setError(err.message || "Something went wrong");
            setOtp(Array(OTP_LENGTH).fill(""));
        } finally {
            setBusy(false);
        }
    };

    /* --- OTP input behavior --- */
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    useEffect(() => {
        if (step === "otp") otpRefs.current[0]?.focus();
    }, [step]);

    const handleOtpChange = (i: number, v: string) => {
        if (!/^\d*$/.test(v)) return;
        const next = [...otp];
        next[i] = v.slice(-1);
        setOtp(next);
        if (v && i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus();
        if (next.every((d) => d.length === 1)) void submitOtp(next.join(""));
    };
    const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
    };
    const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
        if (pasted.length === OTP_LENGTH) {
            e.preventDefault();
            const arr = pasted.split("");
            setOtp(arr);
            otpRefs.current[OTP_LENGTH - 1]?.focus();
            void submitOtp(pasted);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                {step === "phone" && (
                    <PhoneStep
                        phone={phone}
                        setPhone={setPhone}
                        error={error}
                        busy={busy}
                        onSubmit={sendOtp}
                    />
                )}
                {step === "otp" && (
                    <OtpStep
                        phone={phone}
                        otp={otp}
                        error={error}
                        busy={busy}
                        otpExpiresIn={otpExpiresIn}
                        resendIn={resendIn}
                        otpRefs={otpRefs}
                        onChange={handleOtpChange}
                        onKeyDown={handleOtpKeyDown}
                        onPaste={handleOtpPaste}
                        onResend={() => void sendOtp()}
                        onEditNumber={() => {
                            setStep("phone");
                            setOtp(Array(OTP_LENGTH).fill(""));
                            setError(null);
                        }}
                        onSubmit={() => void submitOtp(otp.join(""))}
                    />
                )}
                <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
                    By continuing, you agree to BRPL&apos;s{" "}
                    <Link href="/terms-and-conditions" className="text-amber-600 hover:underline font-semibold">
                        Terms
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy-policy" className="text-amber-600 hover:underline font-semibold">
                        Privacy Policy
                    </Link>
                    .
                </p>
            </div>
        </div>
    );
}

function PhoneStep(props: {
    phone: string;
    setPhone: (v: string) => void;
    error: string | null;
    busy: boolean;
    onSubmit: () => void;
}) {
    const { phone, setPhone, error, busy, onSubmit } = props;
    return (
        <>
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 mb-4">
                    <Phone className="w-7 h-7 text-amber-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome to BRPL</h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Enter your mobile number. We&apos;ll send you a one-time password.
                </p>
            </div>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5"
            >
                <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Mobile Number
                    </label>
                    <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold">
                            +91
                        </span>
                        <Input
                            id="phone"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            placeholder="98765 43210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            maxLength={10}
                            className="rounded-l-none text-lg tracking-wider h-12"
                            required
                        />
                    </div>
                </div>

                {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
                        {error}
                    </p>
                )}

                <Button
                    type="submit"
                    size="lg"
                    disabled={busy || phone.length !== 10}
                    className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-base rounded-full"
                >
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
                </Button>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 justify-center pt-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Your information is secure and will not be shared.</span>
                </div>
            </form>
        </>
    );
}

function OtpStep(props: {
    phone: string;
    otp: string[];
    error: string | null;
    busy: boolean;
    otpExpiresIn: number;
    resendIn: number;
    otpRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
    onChange: (i: number, v: string) => void;
    onKeyDown: (i: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
    onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
    onResend: () => void;
    onEditNumber: () => void;
    onSubmit: () => void;
}) {
    const {
        phone,
        otp,
        error,
        busy,
        otpExpiresIn,
        resendIn,
        otpRefs,
        onChange,
        onKeyDown,
        onPaste,
        onResend,
        onEditNumber,
        onSubmit,
    } = props;
    const formatExpiry = (s: number) => {
        if (s <= 0) return "0:00";
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${String(sec).padStart(2, "0")}`;
    };
    return (
        <>
            <button
                type="button"
                onClick={onEditNumber}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-amber-600 mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Change number
            </button>
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 mb-4">
                    <KeyRound className="w-7 h-7 text-amber-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Verify OTP</h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Enter the 6-digit code we sent to{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">+91 {phone}</span>
                </p>
            </div>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5"
            >
                <div className="flex justify-center gap-2 sm:gap-3" onPaste={onPaste}>
                    {otp.map((d, i) => (
                        <input
                            key={i}
                            ref={(el) => {
                                otpRefs.current[i] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            autoComplete={i === 0 ? "one-time-code" : "off"}
                            value={d}
                            onChange={(e) => onChange(i, e.target.value)}
                            onKeyDown={(e) => onKeyDown(i, e)}
                            maxLength={1}
                            className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
                            aria-label={`Digit ${i + 1}`}
                        />
                    ))}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {otpExpiresIn > 0 ? `Expires in ${formatExpiry(otpExpiresIn)}` : "OTP expired"}
                    </span>
                    {resendIn > 0 ? (
                        <span>Resend in {resendIn}s</span>
                    ) : (
                        <button
                            type="button"
                            onClick={onResend}
                            disabled={busy}
                            className="text-amber-600 hover:text-amber-700 font-semibold"
                        >
                            Resend OTP
                        </button>
                    )}
                </div>

                {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2 text-center">
                        {error}
                    </p>
                )}

                <Button
                    type="submit"
                    size="lg"
                    disabled={busy || otp.some((d) => !d)}
                    className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-bold text-base rounded-full"
                >
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify"}
                </Button>
            </form>
        </>
    );
}
```

- [ ] **Step 2: Run lint**

Run: `npx next lint src/app/login`
Expected: no errors.

- [ ] **Step 3: Manual verify the flow**

Run: `npm run dev`. Visit `/login`, enter phone, send OTP, verify. After verify, you should land on `/checkout?next=/dashboard` (new user) or `/dashboard` (existing paid user).

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "refactor(login): strip to two steps, follow server-provided redirect

/login no longer embeds payment. After OTP verify, follows the redirect
URL returned by /api/auth/verify-otp: /dashboard for paid users,
/checkout?next=/dashboard for new/unpaid users. Uses hard navigation
to ensure cookies are committed before middleware runs."
```

---

## Phase F — `/payment` → `/checkout` rename

### Task 12: Convert `/payment` to a 308 redirect to `/checkout`

**Files:**
- Modify: `src/app/payment/page.tsx`
- Delete: `src/app/payment/PaymentClient.tsx` (dead code per exploration report)

- [ ] **Step 1: Replace the page**

Replace `src/app/payment/page.tsx`:

```ts
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * /payment → /checkout (308 permanent).
 *
 * Preserved for 30+ days so any external links continue to work while
 * search engines and analytics pick up the canonical /checkout URL.
 */
export function GET(req: NextRequest) {
    const url = req.nextUrl.clone();
    url.pathname = "/checkout";
    url.search = req.nextUrl.search;
    return NextResponse.redirect(url, 308);
}
```

- [ ] **Step 2: Delete the dead client file**

Run: `git rm src/app/payment/PaymentClient.tsx`

- [ ] **Step 3: Manual verify**

Visit `/payment` → expect 308 to `/checkout`. (Without any cookies, middleware will then bounce `/checkout` to `/login?next=/checkout`, which is the correct behavior.)

- [ ] **Step 4: Commit**

```bash
git add src/app/payment/page.tsx
git rm src/app/payment/PaymentClient.tsx
git commit -m "refactor(payment): redirect /payment → /checkout (308)

Preserves external links for 30+ days. The dead PaymentClient is removed."
```

---

## Phase G — Verify & update other call sites

### Task 13: Audit and update any remaining references to `/payment`

**Files:**
- Inspect: all `grep -rn "/payment" src/` and `grep -rn "payment" src/components/` etc.
- Modify: any site that points users at `/payment` to point at `/checkout` instead.

- [ ] **Step 1: Find all `/payment` references**

Run: `grep -rn "/payment" src/ scripts/ 2>/dev/null | grep -v "src/app/payment" | grep -v "src/app/api/payment" | grep -v "PaymentClient.tsx"`

Expected hits (verify, do not blindly trust):
- `src/lib/domain/payment/*` — internal service module, NOT a route. Skip.
- `src/app/api/payment/*` — API routes. Skip.
- Anywhere else → update to `/checkout` if it points users at a page, or `/api/payment/...` if it calls an API.

- [ ] **Step 2: Update non-API references**

For each user-facing reference found, update the path from `/payment` to `/checkout`. For example, if `src/components/SchemaMarkup.tsx` has `PATH_TO_LABEL["/payment"]`, change it to `/checkout`. If a marketing component has a Link to `/payment`, change it to `/checkout`.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: success (or only the pre-existing ESLint warnings unrelated to this change).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: replace user-facing /payment links with /checkout

Internal /api/payment/* endpoints and the lib/domain/payment/* module
are unchanged. Only user-facing navigation links were updated."
```

---

## Phase H — Tests & rollout

### Task 14: Run the full test suite and fix any regressions

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: PASS for all tests. Fix any failures before continuing.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no new errors.

---

### Task 15: Manual QA checklist (verify each in the running app)

- [ ] New phone → OTP → checkout → Razorpay test card → dashboard.
- [ ] New phone → checkout → apply valid coupon → "Complete registration" (full coverage) → dashboard.
- [ ] New phone → checkout → apply valid coupon (partial) → Razorpay amount = discounted → pay → dashboard.
- [ ] New phone → checkout → apply expired/invalid coupon → inline error, stay on page.
- [ ] Unpaid existing user → login → checkout → pay → dashboard.
- [ ] Paid existing user → login → dashboard (skip checkout).
- [ ] Paid user closes tab mid-checkout, returns → login → paid → dashboard (no /checkout bounce).
- [ ] Direct URL `/checkout` without cookie → `/login?next=/checkout`.
- [ ] Direct URL `/dashboard` with auth + unpaid → `/checkout?next=/dashboard`.
- [ ] Admin marks paid user unpaid → user re-enters `/dashboard` → bounced to `/checkout`.
- [ ] Old `/payment` URL → 308 to `/checkout`.
- [ ] Logout from `/dashboard` → `/login`.

---

### Task 16: Final commit and summary

- [ ] **Step 1: Update CHANGELOG.md**

Add an entry under the current version (or create a new version section) summarizing the new flow:

```markdown
## [Unreleased]

### Changed
- `/login` is now strictly phone + OTP. After verification, users are routed to `/checkout` (new users and unpaid returning users) or `/dashboard` (paid users).
- The payment gate is enforced at three layers: middleware (edge, via `paid` JWT claim), `/dashboard` server component (DB re-check), and `User.paymentStatus` (data).
- `/payment` 308-redirects to `/checkout`.

### Added
- `/checkout` page with profile form, coupon code entry, Razorpay payment, and 60-second polling to resume after a closed-tab payment.
- `/api/payment/redeem-coupon` endpoint supporting dry-run validation and full redemption.
- JWT payloads now carry `paid: boolean` (mirror of `User.paymentStatus`).
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: CHANGELOG entry for checkout-gate redesign"
```

- [ ] **Step 3: Push branch and open PR**

```bash
git push -u origin feature/checkout-gate
gh pr create --title "Checkout gate: /login entry + /checkout payment + paid middleware" --body "See docs/superpowers/specs/2026-06-25-checkout-gate-design.md for the full design. This PR implements the spec."
```

---

## Self-review (against the spec)

**Spec coverage:**
- "JWT payload: add `paid`" — Task 1 ✓
- "Auth service: `paid` + `redirect`" — Task 2 ✓
- "`/api/payment/redeem-coupon`" — Task 10 ✓
- "Middleware: `/checkout` + paid check" — Task 6 ✓
- "`/login` refactor" — Task 11 ✓
- "`/checkout` route" — Tasks 8–9 ✓
- "`/payment` → `/checkout` 308" — Task 12 ✓
- "`/dashboard` defense-in-depth" — Task 7 ✓
- "Resumable payment polling" — Task 9 (the `useEffect` in CheckoutClient) ✓
- "Tests: unit, integration, e2e" — Tasks 1, 2, 3, 4, 5, 6, 10 + Task 14 (full suite) ✓

**Placeholder scan:** No "TBD" / "TODO" / "fill in details". Every code step shows the actual code.

**Type consistency:**
- `paid: boolean` consistent across crypto.ts, auth service, payment service, routes, middleware, dashboard, checkout page.
- `AuthTokenPayload.paid?: boolean` defined in Task 1, used in Tasks 2, 5, 6, 10.
- `redeem-coupon` route's `readSession` returns the same shape used in middleware.
- `CheckoutClient` types (`CouponState`, `Field`, etc.) defined inline; no later reference to undefined names.

**Spec ambiguities caught & fixed during plan-write:**
- Cookie re-issue after coupon redemption: explicitly handled in Task 10 (`setAuthCookie(token, paid: true)` + `clearPendingCookie()`).
- The two register paths (new user post-payment, new user post-coupon-full-coverage): both routed through `finishRegistration()` in CheckoutClient (Task 9).
- "Resumable payment" polling was implicit in the spec; Task 9 makes it explicit (2s interval, 60s total, calls `/api/auth/me` and triggers `finishRegistration()` if paid).
