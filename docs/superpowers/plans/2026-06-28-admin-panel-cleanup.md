# Admin Panel Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the admin panel down to its essentials — keep only `/admin/login`, redirect `/admin` to `/admin/dashboard`, and replace the dashboard with a blank page showing only a centered card with the admin's email/role and a Logout button. Delete every other admin sub-route, the sidebar, the admin header, the admin shell, the per-feature admin components, and the dead admin API routes + helpers.

**Architecture:** Surgical delete. Replace the `AdminShell` / `AdminSidebar` / `AdminHeader` trio with a minimal `AdminHomeShell` wrapper that just renders `children` after session check. Rewrite the dashboard `page.tsx` as a tiny client component that calls `useAdminAuth()` and renders the centered card. Keep `/admin/login`, the four auth/me API routes, the `useAdminAuth` hook, the `lib/jwt.ts` session helpers, and every Mongoose model (the public site imports many of them). Update the `verify-otp` `next` fallback from `/admin/dashboard` to `/admin` so a missing `next` query param still lands on the clean dashboard. Update one stale `revalidatePath` in the public `contact` API.

**Tech Stack:** Next.js 15 (App Router), TypeScript, React, Tailwind CSS, Mongoose (unchanged for this work).

## Global Constraints

- Existing test `tests/admin-otp.test.ts` exercises `/api/admin/auth/send-otp` and `/api/admin/auth/verify-otp` — both must remain intact and the test must pass.
- Build (`npm run build`) must compile with no broken imports.
- Public routes (anything under `(main)`, `/login`, `/dashboard`, `/checkout`, `/payment`, `/api/auth/*`, `/api/contact`, `/api/ambassadors/*`, `/api/blog/*`, `/api/events/*`, `/api/jobs/*`, `/api/news/*`, `/api/payment/*`, `/api/user/*`) must be untouched, except the single-line `revalidatePath` fix in `/api/contact`.
- Mongoose models are **not** deleted in this plan (out of scope per spec §8). Keep all of `src/models/`.
- `lib/jwt.ts` is **not** deleted. It backs the session check in `(admin)/layout.tsx` and the verify-otp route.

---

## File Structure

### Created
- `src/components/admin/AdminHomeShell.tsx` — minimal session-gated wrapper that renders `children`. Replaces the deleted `AdminShell`.

### Modified
- `src/app/(admin)/layout.tsx` — swap `AdminShell` for `AdminHomeShell`.
- `src/app/(admin)/admin/dashboard/page.tsx` — replace 387-line dashboard with a small client component rendering the centered card.
- `src/app/api/admin/auth/verify-otp/route.ts` — `nextParam` fallback `/admin/dashboard` → `/admin`.
- `src/app/api/contact/route.ts` — `revalidatePath("/admin/contact-us-leads")` → `revalidatePath("/admin")`.

### Deleted (UI)
- `src/app/(admin)/admin/about-us/`
- `src/app/(admin)/admin/ambassadors/`
- `src/app/(admin)/admin/blog/`
- `src/app/(admin)/admin/campaigns/`
- `src/app/(admin)/admin/cms/`
- `src/app/(admin)/admin/contact-us-leads/`
- `src/app/(admin)/admin/coupon-usage/`
- `src/app/(admin)/admin/coupons/`
- `src/app/(admin)/admin/events/`
- `src/app/(admin)/admin/faqs/`
- `src/app/(admin)/admin/jobs/`
- `src/app/(admin)/admin/media/`
- `src/app/(admin)/admin/meta-content/`
- `src/app/(admin)/admin/news/`
- `src/app/(admin)/admin/numbers-speak/`
- `src/app/(admin)/admin/page-banner/`
- `src/app/(admin)/admin/partners/`
- `src/app/(admin)/admin/payments/`
- `src/app/(admin)/admin/player-stories/`
- `src/app/(admin)/admin/players/`
- `src/app/(admin)/admin/privacy-policy/`
- `src/app/(admin)/admin/profile/`
- `src/app/(admin)/admin/registration-banner/`
- `src/app/(admin)/admin/registration-faqs/`
- `src/app/(admin)/admin/registration-hero/`
- `src/app/(admin)/admin/registration-page/`
- `src/app/(admin)/admin/roadmap/`
- `src/app/(admin)/admin/rule-book/`
- `src/app/(admin)/admin/settings/`
- `src/app/(admin)/admin/site-pages/`
- `src/app/(admin)/admin/social-contact/`
- `src/app/(admin)/admin/teams/`
- `src/app/(admin)/admin/terms-conditions/`
- `src/app/(admin)/admin/zone-deadline/`
- `src/app/(admin)/admin/dashboard/loading.tsx`

### Deleted (components)
- `src/components/admin/AdminShell.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/AdminHeader.tsx`
- `src/components/admin/CrudPage.tsx`
- `src/components/admin/CmsForm.tsx`
- `src/components/admin/FilterBar.tsx`
- `src/components/admin/FooterLinksEditor.tsx`
- `src/components/admin/MediaPicker.tsx`
- `src/components/admin/MediaUploadField.tsx`
- `src/components/admin/NavbarLinksEditor.tsx`
- `src/components/admin/SectionForm.tsx`
- `src/components/admin/UserTable.tsx`

### Deleted (API)
- `src/app/api/admin/about-us/`
- `src/app/api/admin/ambassadors/`
- `src/app/api/admin/blog/`
- `src/app/api/admin/campaigns/`
- `src/app/api/admin/charts/`
- `src/app/api/admin/contact-leads/`
- `src/app/api/admin/coupons/`
- `src/app/api/admin/events/`
- `src/app/api/admin/faqs/`
- `src/app/api/admin/home/`
- `src/app/api/admin/jobs/`
- `src/app/api/admin/legal/`
- `src/app/api/admin/media/`
- `src/app/api/admin/news/`
- `src/app/api/admin/page-banner/`
- `src/app/api/admin/partners/`
- `src/app/api/admin/payments/`
- `src/app/api/admin/records/`
- `src/app/api/admin/registration/`
- `src/app/api/admin/registration-page/`
- `src/app/api/admin/seo/`
- `src/app/api/admin/settings/`
- `src/app/api/admin/site-pages/`
- `src/app/api/admin/stats/`
- `src/app/api/admin/teams/`
- `src/app/api/admin/users/`

### Deleted (helpers)
- `src/apihelper/admin.ts` (verified to have zero importers after the above deletions)

### Kept
- `src/app/(admin-public)/admin/login/` — login page, untouched
- `src/app/(admin)/admin/page.tsx` — index redirect `/admin` → `/admin/dashboard`
- `src/app/api/admin/auth/{send-otp,verify-otp,logout}/`
- `src/app/api/admin/me/`
- `src/hooks/useAdminAuth.ts`
- `src/lib/jwt.ts`
- `src/lib/adminApi.ts`, `src/lib/adminCrud.ts`, `src/lib/adminBootstrap.ts` (post-implementation audit verifies each has at least one importer; if orphan, list in a follow-up commit)
- `src/models/*` (all models)

---

## Task 1: Add `AdminHomeShell` and swap it into the admin layout

**Files:**
- Create: `src/components/admin/AdminHomeShell.tsx`
- Modify: `src/app/(admin)/layout.tsx`

**Interfaces:**
- Consumes: existing `useAdminAuth()` hook from `src/hooks/useAdminAuth.ts` — returns `{ me, loading, refresh, logout }`.
- Produces: `AdminHomeShell` is the new session-gated wrapper. Its only prop is `children`. The (admin) layout will mount it as the replacement for the deleted `AdminShell`.

- [ ] **Step 1: Create the new `AdminHomeShell` component**

Create `src/components/admin/AdminHomeShell.tsx` with this exact content:

```tsx
"use client";

import { useEffect } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

/**
 * Minimal session-gated wrapper for the admin section.
 *
 * Replaces the deleted AdminShell/AdminSidebar/AdminHeader trio. Verifies the
 * admin session via useAdminAuth, then renders children. The actual page
 * content (e.g. /admin/dashboard) owns its own visual chrome — there is no
 * sidebar or admin header.
 */
export function AdminHomeShell({ children }: { children: React.ReactNode }) {
    const { me, refresh } = useAdminAuth();

    useEffect(() => {
        // The (admin) layout already redirects unauthenticated users via
        // getAdminSession(), but the client-side hook needs to hydrate so
        // child pages can read `me` without an extra request.
        if (!me) refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <>{children}</>;
}
```

- [ ] **Step 2: Swap `AdminShell` for `AdminHomeShell` in the admin layout**

Modify `src/app/(admin)/layout.tsx`. Replace the entire file content with:

```tsx
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/jwt";
import { AdminHomeShell } from "@/components/admin/AdminHomeShell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getAdminSession();
    if (!session) {
        redirect("/admin/login?next=/admin/dashboard");
    }
    return <AdminHomeShell>{children}</AdminHomeShell>;
}
```

- [ ] **Step 3: Verify the build still compiles (AdminShell still exists, so this should pass)**

Run: `npm run build 2>&1 | tail -40`
Expected: Build succeeds. The deleted dashboard rewrite hasn't happened yet, so the dashboard still imports stuff that will be removed in later tasks — but at this stage nothing has been removed, so it must pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminHomeShell.tsx src/app/\(admin\)/layout.tsx
git commit -m "feat(admin): add minimal AdminHomeShell, swap into admin layout"
```

---

## Task 2: Rewrite the dashboard as a blank page with centered card

**Files:**
- Modify: `src/app/(admin)/admin/dashboard/page.tsx`

**Interfaces:**
- Consumes: `useAdminAuth()` — `me` is the typed admin object with `email`, `name?`, `role: "superadmin" | "subadmin" | "seo_content"`. `logout()` is an async function that clears the session and routes to `/admin/login`.
- Produces: A small client component that renders the centered card. This is the only visible admin page after login.

- [ ] **Step 1: Replace the dashboard page**

Overwrite `src/app/(admin)/admin/dashboard/page.tsx` with this exact content:

```tsx
"use client";

import { LogOut } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";

const ROLE_LABEL: Record<string, string> = {
    superadmin: "Super Admin",
    subadmin: "Sub Admin",
    seo_content: "SEO Content",
};

export default function AdminDashboardPage() {
    const { me, logout } = useAdminAuth();
    const email = me?.email || "—";
    const role = me?.role || "subadmin";
    const roleLabel = ROLE_LABEL[role] ?? role;

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 text-center">
                <img
                    src="/logo.webp"
                    alt="BRPL"
                    className="mx-auto h-16 w-16 object-contain"
                />
                <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
                    BRPL Admin
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Signed in as
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200 break-all">
                    {email}
                </p>
                <span className="mt-3 inline-block px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {roleLabel}
                </span>
                <div className="mt-6">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                            void logout();
                        }}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify the build still compiles**

Run: `npm run build 2>&1 | tail -40`
Expected: Build succeeds. We haven't deleted anything yet, so the existing dashboard's old code is fully replaced by this small file and the build must still pass (the old imports it had — recharts, toast, Card components — are gone, replaced with lucide-react `LogOut` and the `Button` UI component which are both already in the project).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/admin/dashboard/page.tsx
git commit -m "feat(admin): replace dashboard with blank centered card and logout"
```

---

## Task 3: Update `verify-otp` `next` fallback to `/admin`

**Files:**
- Modify: `src/app/api/admin/auth/verify-otp/route.ts`

**Interfaces:**
- Consumes: existing `req: Request` from the Next.js handler envelope.
- Produces: the `redirect` field in the response defaults to `"/admin"` instead of `"/admin/dashboard"`. `/admin` is a server-side redirect to `/admin/dashboard`, so the user still ends up on the dashboard either way — the change is a no-op for happy-path navigation but keeps the canonical landing consistent with the cleanup.

- [ ] **Step 1: Edit the `nextParam` line**

In `src/app/api/admin/auth/verify-otp/route.ts`, find this line (currently line 58):

```ts
const nextParam = new URL(req.url).searchParams.get("next") || "/admin/dashboard";
```

Replace it with:

```ts
const nextParam = new URL(req.url).searchParams.get("next") || "/admin";
```

- [ ] **Step 2: Verify the build still compiles**

Run: `npm run build 2>&1 | tail -40`
Expected: Build succeeds.

- [ ] **Step 3: Run the admin OTP test**

Run: `npm test -- tests/admin-otp.test.ts 2>&1 | tail -30`
Expected: Test passes. The test exercises send-otp and verify-otp; the `next` change is irrelevant to its assertions (it doesn't check the redirect value).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/auth/verify-otp/route.ts
git commit -m "fix(admin): default verify-otp redirect to /admin"
```

---

## Task 4: Fix the stale `revalidatePath` in the public contact API

**Files:**
- Modify: `src/app/api/contact/route.ts`

**Interfaces:**
- Consumes: existing `revalidatePath` from `next/cache`.
- Produces: the revalidation target string changes from a deleted admin route to the new canonical admin path. The call is already wrapped in a try/catch and is best-effort, so the change is safe.

- [ ] **Step 1: Edit the `revalidatePath` call**

In `src/app/api/contact/route.ts`, find the `revalidatePath` call inside the try block (currently line 69):

```ts
revalidatePath("/admin/contact-us-leads");
```

Replace it with:

```ts
revalidatePath("/admin");
```

- [ ] **Step 2: Verify the build still compiles**

Run: `npm run build 2>&1 | tail -40`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/contact/route.ts
git commit -m "fix(contact): revalidate /admin instead of deleted contact-us-leads"
```

---

## Task 5: Delete all admin sub-route page directories

**Files:**
- Delete: 34 directories listed in the "Deleted (UI)" section above, all under `src/app/(admin)/admin/`.
- Delete: `src/app/(admin)/admin/dashboard/loading.tsx`.

**Interfaces:**
- Consumes: nothing.
- Produces: the admin route map under `(admin)/admin/*` shrinks to just `login/` and the index `page.tsx` (and `dashboard/page.tsx` from Task 2). Every other path returns 404 — this is the desired end state per spec.

- [ ] **Step 1: Verify nothing imports from the soon-to-be-deleted pages**

Run: `grep -rln "from \"@/app/(admin)/admin" src tests 2>/dev/null | grep -v node_modules`
Expected: only `src/app/(admin)/layout.tsx` and `src/app/(admin)/admin/dashboard/page.tsx` show up (we kept those). If anything else appears, list it and stop — that file likely needs to be updated before deletion.

- [ ] **Step 2: Delete the directories**

Run this single command (uses shell brace expansion to remove all 34 directories in one go):

```bash
rm -rf \
  "src/app/(admin)/admin/about-us" \
  "src/app/(admin)/admin/ambassadors" \
  "src/app/(admin)/admin/blog" \
  "src/app/(admin)/admin/campaigns" \
  "src/app/(admin)/admin/cms" \
  "src/app/(admin)/admin/contact-us-leads" \
  "src/app/(admin)/admin/coupon-usage" \
  "src/app/(admin)/admin/coupons" \
  "src/app/(admin)/admin/events" \
  "src/app/(admin)/admin/faqs" \
  "src/app/(admin)/admin/jobs" \
  "src/app/(admin)/admin/media" \
  "src/app/(admin)/admin/meta-content" \
  "src/app/(admin)/admin/news" \
  "src/app/(admin)/admin/numbers-speak" \
  "src/app/(admin)/admin/page-banner" \
  "src/app/(admin)/admin/partners" \
  "src/app/(admin)/admin/payments" \
  "src/app/(admin)/admin/player-stories" \
  "src/app/(admin)/admin/players" \
  "src/app/(admin)/admin/privacy-policy" \
  "src/app/(admin)/admin/profile" \
  "src/app/(admin)/admin/registration-banner" \
  "src/app/(admin)/admin/registration-faqs" \
  "src/app/(admin)/admin/registration-hero" \
  "src/app/(admin)/admin/registration-page" \
  "src/app/(admin)/admin/roadmap" \
  "src/app/(admin)/admin/rule-book" \
  "src/app/(admin)/admin/settings" \
  "src/app/(admin)/admin/site-pages" \
  "src/app/(admin)/admin/social-contact" \
  "src/app/(admin)/admin/teams" \
  "src/app/(admin)/admin/terms-conditions" \
  "src/app/(admin)/admin/zone-deadline"
```

Also delete the dashboard skeleton: `rm "src/app/(admin)/admin/dashboard/loading.tsx"`

- [ ] **Step 3: Verify the deletion landed and the kept files remain**

Run: `ls "src/app/(admin)/admin"`
Expected output (only these entries remain):

```
dashboard
login
page.tsx
```

- [ ] **Step 4: Verify the build still compiles**

Run: `npm run build 2>&1 | tail -40`
Expected: Build succeeds. The old `AdminShell`/`AdminSidebar`/`AdminHeader` are still imported by the admin components directory (we haven't deleted those yet in this task) — and even if they weren't, Next tolerates unused components as long as nothing imports them. Either way, the app pages that remain compile cleanly.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/\(admin\)/admin
git commit -m "feat(admin): delete all admin sub-routes except login and dashboard"
```

---

## Task 6: Delete the dead admin components

**Files:**
- Delete: 12 files listed in the "Deleted (components)" section.

**Interfaces:**
- Consumes: nothing.
- Produces: the `src/components/admin/` directory contains only the new `AdminHomeShell.tsx` from Task 1.

- [ ] **Step 1: Verify nothing imports the soon-to-be-deleted components**

Run: `grep -rln "AdminShell\|AdminSidebar\|AdminHeader\|CrudPage\|CmsForm\|FilterBar\|FooterLinksEditor\|MediaPicker\|MediaUploadField\|NavbarLinksEditor\|SectionForm\|UserTable" src tests 2>/dev/null | grep -v node_modules`
Expected output: nothing (the old dashboard `page.tsx` was replaced in Task 2; the admin layout was swapped in Task 1; nothing else imports these). If anything appears, list it and stop.

- [ ] **Step 2: Delete the files**

Run:

```bash
rm \
  "src/components/admin/AdminShell.tsx" \
  "src/components/admin/AdminSidebar.tsx" \
  "src/components/admin/AdminHeader.tsx" \
  "src/components/admin/CrudPage.tsx" \
  "src/components/admin/CmsForm.tsx" \
  "src/components/admin/FilterBar.tsx" \
  "src/components/admin/FooterLinksEditor.tsx" \
  "src/components/admin/MediaPicker.tsx" \
  "src/components/admin/MediaUploadField.tsx" \
  "src/components/admin/NavbarLinksEditor.tsx" \
  "src/components/admin/SectionForm.tsx" \
  "src/components/admin/UserTable.tsx"
```

- [ ] **Step 3: Verify only `AdminHomeShell.tsx` remains in `src/components/admin/`**

Run: `ls src/components/admin/`
Expected output: `AdminHomeShell.tsx`

- [ ] **Step 4: Verify the build still compiles**

Run: `npm run build 2>&1 | tail -40`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A src/components/admin
git commit -m "feat(admin): delete dead admin components (Shell, Sidebar, Header, etc.)"
```

---

## Task 7: Delete the dead admin API routes

**Files:**
- Delete: 25 directories listed in the "Deleted (API)" section, all under `src/app/api/admin/`.

**Interfaces:**
- Consumes: nothing.
- Produces: the admin API surface shrinks to just `auth/send-otp`, `auth/verify-otp`, `auth/logout`, and `me`. Every other path returns 404.

- [ ] **Step 1: Verify nothing imports the soon-to-be-deleted API route handlers**

Run: `grep -rln "from \"@/app/api/admin" src tests 2>/dev/null | grep -v node_modules`
Expected output: only files that import from `auth/` or `me/` (i.e., the login flow + dashboard's `useAdminAuth`). Nothing should import from any of the 25 directories being deleted. If something does, list it and stop.

Also run: `grep -rln "apihelper/admin" src tests 2>/dev/null | grep -v node_modules`
Expected output: nothing. The dashboard rewrite in Task 2 dropped the `apihelper/admin` imports.

- [ ] **Step 2: Delete the directories**

Run:

```bash
rm -rf \
  "src/app/api/admin/about-us" \
  "src/app/api/admin/ambassadors" \
  "src/app/api/admin/blog" \
  "src/app/api/admin/campaigns" \
  "src/app/api/admin/charts" \
  "src/app/api/admin/contact-leads" \
  "src/app/api/admin/coupons" \
  "src/app/api/admin/events" \
  "src/app/api/admin/faqs" \
  "src/app/api/admin/home" \
  "src/app/api/admin/jobs" \
  "src/app/api/admin/legal" \
  "src/app/api/admin/media" \
  "src/app/api/admin/news" \
  "src/app/api/admin/page-banner" \
  "src/app/api/admin/partners" \
  "src/app/api/admin/payments" \
  "src/app/api/admin/records" \
  "src/app/api/admin/registration" \
  "src/app/api/admin/registration-page" \
  "src/app/api/admin/seo" \
  "src/app/api/admin/settings" \
  "src/app/api/admin/site-pages" \
  "src/app/api/admin/stats" \
  "src/app/api/admin/teams" \
  "src/app/api/admin/users"
```

- [ ] **Step 3: Verify only the four kept API routes remain**

Run: `find src/app/api/admin -type f`
Expected output (only these four files):

```
src/app/api/admin/auth/logout/route.ts
src/app/api/admin/auth/send-otp/route.ts
src/app/api/admin/auth/verify-otp/route.ts
src/app/api/admin/me/route.ts
```

- [ ] **Step 4: Verify the build still compiles**

Run: `npm run build 2>&1 | tail -40`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/api/admin
git commit -m "feat(admin): delete dead admin API routes (auth and me only remain)"
```

---

## Task 8: Delete `apihelper/admin.ts`

**Files:**
- Delete: `src/apihelper/admin.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the `src/apihelper/` directory contains only `api.ts` and `seo.ts`. The admin helper is gone.

- [ ] **Step 1: Verify zero importers**

Run: `grep -rln "apihelper/admin" src tests 2>/dev/null | grep -v node_modules`
Expected: empty output.

- [ ] **Step 2: Delete the file**

Run: `rm src/apihelper/admin.ts`

- [ ] **Step 3: Verify the directory shape**

Run: `ls src/apihelper/`
Expected output: `api.ts seo.ts`

- [ ] **Step 4: Verify the build still compiles**

Run: `npm run build 2>&1 | tail -40`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A src/apihelper
git commit -m "feat(admin): delete unused apihelper/admin.ts"
```

---

## Task 9: Final verification

**Files:** none.

**Interfaces:** consumes the entire repo's compiled state; produces a green build + green tests + manual smoke-test confirmation.

- [ ] **Step 1: Run the full build**

Run: `npm run build 2>&1 | tail -60`
Expected: Build succeeds with no TypeScript errors and no missing-route errors.

- [ ] **Step 2: Run the full test suite**

Run: `npm test 2>&1 | tail -30`
Expected: `admin-otp.test.ts` passes. `auth-register.test.ts` passes. No regressions.

- [ ] **Step 3: Manual smoke test — start dev server**

Run: `npm run dev` (in a separate terminal or with `run_in_background: true`).

Then in a fresh browser session:

1. Visit `http://localhost:3000/admin` while signed out → confirm redirect to `/admin/login`.
2. Enter a valid admin phone, receive OTP (or read the test-mode OTP from server logs / `OtpRecord` model), submit it → confirm you land on `http://localhost:3000/admin/dashboard`.
3. Confirm the dashboard shows ONLY: BRPL logo, "BRPL Admin" heading, "Signed in as" + email, a role pill, and a single Logout button. No sidebar, no header bar, no tabs, no widgets, no charts.
4. Click **Logout** → confirm return to `/admin/login`.
5. Visit `http://localhost:3000/admin/players` (or any other deleted route) → confirm 404.
6. Visit `http://localhost:3000/` and any other public page → confirm nothing on the public site broke.

- [ ] **Step 4: Stop the dev server**

If running in the background, stop the task.

- [ ] **Step 5: Final commit if any fixups were needed during smoke test**

If everything passed cleanly in steps 1-3, no commit. If any small fix was needed (e.g., copy tweak, spacing fix), commit it as:

```bash
git add -A
git commit -m "fix(admin): smoke-test fixups for clean admin dashboard"
```

- [ ] **Step 6: Mark the plan complete**

Report back: spec implemented, build green, tests green, manual smoke test passed. List any deviations from the plan and any orphan `lib/*.ts` files that the post-implementation audit flagged for future cleanup.
