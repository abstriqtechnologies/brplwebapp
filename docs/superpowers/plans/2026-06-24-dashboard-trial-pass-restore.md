# Dashboard Trial Pass Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the `/dashboard` Trial Pass card (photo + name + barcode + PNG download) that was removed in commit `c6295f1`, while keeping the existing unpaid-user "Complete your registration" CTA.

**Architecture:** Replace the current profile+receipt DashboardClient with the original two-column layout (Trial Pass on the left, profile grid on the right). Extend the User model and `/api/auth/me` to expose an optional `profileImage` so TrialPass can render the user's photo when present (with `/assets/avtar.webp` fallback). No new dependencies.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind, lucide-react, `react-barcode` (already installed), `html-to-image` (already installed), Vitest (for one API test).

---

## File Structure

**Modify:**
- `src/models/User.ts` — add optional `profileImage?: string` to `IUser` and `UserSchema`. No validation. One field, one line each in interface and schema.
- `src/app/api/auth/me/route.ts` — include `profileImage: user.profileImage` in the returned user object.
- `src/app/dashboard/DashboardClient.tsx` — full rewrite (~260 lines). Two-column layout (Trial Pass + profile grid), role-colored welcome header, download button via `html-to-image`, kept unpaid CTA card.

**Do not modify:**
- `src/app/dashboard/page.tsx` — server auth gate is correct; leave as-is.
- `src/components/TrialPass.tsx` — component, assets, and deps all present; no changes needed.
- `src/lib/roles.ts` — already exports `ROLE_LABELS` and `USER_ROLES` exactly as needed.

**Add (test):**
- `tests/api/auth.me.test.ts` — verifies `/api/auth/me` returns `profileImage` (null when unset, string when set).

---

## Task 1: Add `profileImage` to User model

**Files:**
- Modify: `src/models/User.ts:11-26` (interface + schema)

- [ ] **Step 1: Add field to `IUser` interface**

Open `src/models/User.ts`. In the `IUser` interface block, add a `profileImage` line right after the `amount?: number;` line (currently line 21):

```typescript
    amount?: number;
    profileImage?: string; // URL or data URI; TrialPass falls back to /assets/avtar.webp when absent
```

- [ ] **Step 2: Add field to `UserSchema`**

In the `UserSchema` object, add the matching field after the `amount` schema entry:

```typescript
        amount: { type: Number },
        profileImage: { type: String }, // unvalidated URL or data URI; optional
```

- [ ] **Step 3: Verify with `pnpm build` (or `npm run build`)**

Run: `npm run build`
Expected: build succeeds. (TypeScript will complain if `IUser` shape drifts from schema; both must be updated together.)

- [ ] **Step 4: Commit**

```bash
git add src/models/User.ts
git commit -m "feat(model): add optional profileImage field on User"
```

---

## Task 2: Return `profileImage` from `/api/auth/me`

**Files:**
- Modify: `src/app/api/auth/me/route.ts:25-33`
- Test: `tests/api/auth.me.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/api/auth.me.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import mongoose from "mongoose";

// Stub auth/DB modules before importing the route
vi.mock("@/lib/mongodb", () => ({
    connectDB: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/jwt", () => ({
    getAuthCookie: vi.fn().mockResolvedValue("test-token"),
    verifyJwt: vi.fn().mockResolvedValue({ sub: "user-1", phone: "9999999999", purpose: "auth" }),
}));

beforeAll(() => {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI must be set for integration tests");
    }
});

afterAll(async () => {
    await mongoose.disconnect();
});

describe("GET /api/auth/me", () => {
    it("includes profileImage (null) when user has none", async () => {
        const User = (await import("@/models/User")).default;
        await mongoose.connect(process.env.MONGODB_URI!);
        const created = await User.create({
            phone: "8888888888",
            name: "Test Player",
            paymentStatus: "pending",
        });
        // Re-import the route AFTER stubbing so it picks up our mocks
        const { GET } = await import("@/app/api/auth/me/route");
        const res = await GET();
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.user).toMatchObject({
            phone: "8888888888",
            name: "Test Player",
            paymentStatus: "pending",
            profileImage: null,
        });
        await User.deleteOne({ _id: created._id });
    });

    it("includes profileImage string when user has one set", async () => {
        const User = (await import("@/models/User")).default;
        const { GET } = await import("@/app/api/auth/me/route");
        const created = await User.create({
            phone: "7777777777",
            name: "Has Avatar",
            paymentStatus: "completed",
            profileImage: "https://example.com/me.jpg",
        });
        const res = await GET();
        const body = await res.json();
        expect(body.user).toMatchObject({
            phone: "7777777777",
            profileImage: "https://example.com/me.jpg",
        });
        await User.deleteOne({ _id: created._id });
    });
});
```

- [ ] **Step 2: Run the test, expect it to fail**

Run: `npm test -- tests/api/auth.me.test.ts`
Expected: FAIL — `profileImage` is `undefined` (the route currently doesn't return it).

- [ ] **Step 3: Add `profileImage` to the `/me` response**

In `src/app/api/auth/me/route.ts`, inside the `user` object returned from `GET()`, add the field after `paymentStatus`:

```typescript
                id: user._id.toString(),
                phone: user.phone,
                name: user.name,
                email: user.email,
                role: user.role,
                state: user.state,
                city: user.city,
                paymentStatus: user.paymentStatus,
                profileImage: user.profileImage ?? null,
```

- [ ] **Step 4: Re-run the test, expect it to pass**

Run: `npm test -- tests/api/auth.me.test.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/me/route.ts tests/api/auth.me.test.ts
git commit -m "feat(api): return profileImage from /api/auth/me"
```

---

## Task 3: Rewrite `DashboardClient.tsx` to restore Trial Pass layout

**Files:**
- Modify: `src/app/dashboard/DashboardClient.tsx` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Write the new contents to `src/app/dashboard/DashboardClient.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import {
    LogOut,
    MapPin,
    Mail,
    Phone,
    Trophy,
    User as UserIcon,
    Loader2,
    CheckCircle2,
    Download,
    IdCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TrialPass from "@/components/TrialPass";
import { ROLE_LABELS, type UserRole } from "@/lib/roles";

const ROLE_COLOR: Record<string, string> = {
    batsman: "from-red-500 to-orange-500",
    bowler: "from-blue-500 to-cyan-500",
    allrounder: "from-purple-500 to-pink-500",
    wicketkeeper: "from-amber-500 to-yellow-500",
};

type Me = {
    id: string;
    phone: string;
    name?: string;
    email?: string;
    role?: string;
    state?: string;
    city?: string;
    paymentStatus?: "pending" | "completed";
    paymentId?: string;
    orderId?: string;
    amount?: number;
    profileImage?: string | null;
};

export default function DashboardClient() {
    const router = useRouter();
    const [user, setUser] = useState<Me | null>(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const trialPassRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => r.json())
            .then((d) => {
                if (!d.user) {
                    router.replace("/auth?next=/dashboard");
                    return;
                }
                setUser(d.user);
            })
            .catch(() => router.replace("/auth?next=/dashboard"))
            .finally(() => setLoading(false));
    }, [router]);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.replace("/auth");
        } finally {
            setLoggingOut(false);
        }
    };

    const handleDownload = async () => {
        if (!trialPassRef.current || !user) return;
        setDownloading(true);
        try {
            const dataUrl = await toPng(trialPassRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: "#ffffff",
            });
            const link = document.createElement("a");
            link.download = `BRPL-Trial-Pass-${user.phone || "player"}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Download failed", err);
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    if (!user) return null;

    const roleColor = ROLE_COLOR[user.role as string] || "from-slate-500 to-slate-700";
    const roleLabel = ROLE_LABELS[user.role as UserRole] || "Player";
    const trialPassUser = {
        ...user,
        // TrialPass prefers profileImage, then avatar, then DEFAULT_AVATAR (handled in component)
        avatar: user.profileImage ?? undefined,
    };

    return (
        <div className="min-h-[80vh] px-4 py-10">
            <div className="max-w-5xl mx-auto">
                {/* Welcome header */}
                <div
                    className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${roleColor} p-6 sm:p-8 text-white shadow-2xl mb-8`}
                >
                    <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <p className="text-sm uppercase tracking-widest text-white/80 mb-2">Welcome to BRPL</p>
                            <h1 className="text-3xl sm:text-4xl font-extrabold mb-1">{user.name || "Player"}</h1>
                            <div className="flex items-center gap-2 text-white/90">
                                <Trophy className="w-4 h-4" />
                                <span className="font-semibold">{roleLabel}</span>
                                {user.paymentStatus === "completed" && (
                                    <>
                                        <span className="opacity-60">•</span>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="text-sm">Registered</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <Button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            variant="outline"
                            className="bg-white/15 hover:bg-white/25 text-white border-white/30 backdrop-blur-sm w-fit"
                        >
                            {loggingOut ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <LogOut className="w-4 h-4 mr-2" />
                            )}
                            {!loggingOut && "Logout"}
                        </Button>
                    </div>
                </div>

                {/* Trial Pass + Profile grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 items-start">
                    {/* Trial Pass card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <IdCard className="w-5 h-5 text-amber-600" />
                            <h2 className="font-bold text-slate-900 dark:text-white">Your Trial Pass</h2>
                        </div>

                        <div ref={trialPassRef}>
                            <TrialPass user={trialPassUser} />
                        </div>

                        <Button
                            onClick={handleDownload}
                            disabled={downloading}
                            variant="outline"
                            className="w-full mt-5 h-11 rounded-full font-semibold"
                        >
                            {downloading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4 mr-2" />
                            )}
                            {downloading ? "Preparing…" : "Download Trial Pass"}
                        </Button>

                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-3">
                            Present this pass at your zonal trials.
                        </p>
                    </div>

                    {/* Profile info */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ProfileCard
                                icon={<UserIcon className="w-5 h-5" />}
                                label="Full Name"
                                value={user.name || "—"}
                            />
                            <ProfileCard
                                icon={<Phone className="w-5 h-5" />}
                                label="Mobile"
                                value={`+91 ${user.phone}`}
                            />
                            <ProfileCard
                                icon={<Mail className="w-5 h-5" />}
                                label="Email"
                                value={user.email || "—"}
                            />
                            <ProfileCard
                                icon={<MapPin className="w-5 h-5" />}
                                label="Location"
                                value={[user.city, user.state].filter(Boolean).join(", ") || "—"}
                            />
                            <ProfileCard
                                icon={<Trophy className="w-5 h-5" />}
                                label="Playing Role"
                                value={roleLabel}
                            />
                            <ProfileCard
                                icon={<IdCard className="w-5 h-5" />}
                                label="BRPL ID"
                                value={user.id ? `#${user.id.slice(-8).toUpperCase()}` : "—"}
                                mono
                            />
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                    <h2 className="font-bold text-slate-900 dark:text-white mb-1">Registration complete</h2>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Your BRPL player profile is active. You&apos;ll be notified when zonal trials open in your state.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span>Need help?</span>
                            <Link href="/contact-us" className="text-amber-600 hover:underline font-semibold">
                                Contact support
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Unpaid CTA card */}
                {user.paymentStatus !== "completed" && (
                    <div className="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between gap-4">
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white">Complete your registration</p>
                            <p className="text-sm text-slate-500">Pay the registration fee to confirm your slot.</p>
                        </div>
                        <Button asChild className="bg-amber-500 text-black hover:bg-amber-400">
                            <Link href="/auth?mode=register">Continue</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

function ProfileCard({
    icon,
    label,
    value,
    mono,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
                {icon}
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                    {label}
                </span>
            </div>
            <p className={`text-base font-semibold text-slate-900 dark:text-white break-words ${mono ? "font-mono" : ""}`}>
                {value}
            </p>
        </div>
    );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit` (or `npm run build` if no tsc script)
Expected: no TypeScript errors.

- [ ] **Step 3: Smoke test in dev**

Run: `npm run dev`
Then in a browser, log in and visit `http://localhost:3000/dashboard`. Verify:
- Role-colored welcome header with the user's name and role label.
- Trial Pass card on the left with photo (default avatar fallback), name, and barcode.
- Six profile cards on the right (Name, Mobile, Email, Location, Role, BRPL ID).
- "Registration complete" success note.
- Contact support link.
- Download Trial Pass button → click → PNG `BRPL-Trial-Pass-{phone}.png` downloads.

Log out, then log in as an unpaid user (`paymentStatus !== "completed"`). Verify:
- "Complete your registration" CTA card appears below the grid with a "Continue" button linking to `/auth?mode=register`.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/DashboardClient.tsx
git commit -m "feat(dashboard): restore Trial Pass card with profile layout"
```

---

## Task 4: Run full test suite + final build

**Files:** none (verification step)

- [ ] **Step 1: Run vitest**

Run: `npm test`
Expected: all tests pass, including the new `tests/api/auth.me.test.ts`.

- [ ] **Step 2: Run full build**

Run: `npm run build`
Expected: build succeeds with no TypeScript or lint errors.

- [ ] **Step 3: Commit any lockfile or config changes**

If anything changed (it shouldn't), commit it. Otherwise skip this step.

```bash
git status
# Only commit if there are changes
git add -A
git diff --cached --quiet || git commit -m "chore: lockfile/test updates from dashboard trial pass restore"
```

---

## Self-Review

**Spec coverage:**
- ✅ Two-column layout (Trial Pass + Profile) — Task 3.
- ✅ Role-colored welcome header with role label — Task 3 (`ROLE_COLOR`, `ROLE_LABELS`).
- ✅ `TrialPass` component, photo + name + barcode — Task 3 (component already exists).
- ✅ Download Trial Pass via `html-to-image` → PNG — Task 3 (`handleDownload`, `toPng`).
- ✅ "Registration complete" success note — Task 3.
- ✅ Contact support link — Task 3.
- ✅ Unpaid CTA card — Task 3 (kept from current dashboard).
- ✅ Drop payment-status card and receipt PDF download — Task 3 (not in new file).
- ✅ `profileImage` added to User model — Task 1.
- ✅ `profileImage` returned by `/api/auth/me` — Task 2.
- ✅ Avatar fallback to `/assets/avtar.webp` — already in `TrialPass.tsx`, no task needed.

**Placeholder scan:** No TBDs, TODOs, "implement later", or "similar to Task N". All code blocks contain actual code.

**Type consistency:**
- `Me` type defined once in Task 3, used consistently (no rename, no drift).
- `profileImage` is `string | null` in Task 2 (matches the route response), `string | undefined` after spread in Task 3 (the spread of `null` into a different field name yields `undefined`, which TrialPass handles).
- `TrialPass` props: `user?: any` (already that loose in the file). `trialPassUser` adds `avatar` field; TrialPass checks `user?.profileImage || user?.avatar || DEFAULT_AVATAR`, so both forms work.