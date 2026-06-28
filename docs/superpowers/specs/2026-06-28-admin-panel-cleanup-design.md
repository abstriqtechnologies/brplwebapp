# Admin panel cleanup — keep only login + dashboard (clean) + logout

## Problem

The admin panel under `src/app/(admin)/admin/*` currently has ~30 sub-routes (players, coupons, events, payments, jobs, ambassadors, teams, partners, cms, about-us, campaigns, faqs, social-contact, contact-us-leads, page-banner, media, privacy-policy, terms-conditions, rule-book, meta-content, blog, news, settings, site-pages, registration-page and 8 of its sub-items, numbers-speak, roadmap, zone-deadline, player-stories, registration-faqs, registration-hero, registration-banner, plus a profile page). It is wrapped in an `AdminShell` with a fixed left sidebar ([`AdminSidebar.tsx`](../../src/components/admin/AdminSidebar.tsx), 30+ nav items + collapsible groups) and a sticky header ([`AdminHeader.tsx`](../../src/components/admin/AdminHeader.tsx)) with a hamburger toggle, profile link, and logout button.

This is a lot of surface area to maintain. The product needs only the entry point (login), a clean landing page after login, and a way to sign out.

## Goal

After this change, the admin section has exactly:

1. `/admin/login` — OTP login (untouched, as agreed).
2. `/admin` — server redirect to `/admin/dashboard`.
3. `/admin/dashboard` — a **clean** dashboard page (no sidebar, no tabs, no nav, no charts/widgets grid). The page shows only a centered card with the BRPL logo, the signed-in admin's email/role, and a **Logout** button.

Nothing else. Every other admin sub-route, the sidebar, the admin header, and the admin shell chrome are deleted.

## Approach (Approach A — surgical delete)

### 1. New minimal admin layout wrapper + clean dashboard page

Replace the existing `AdminShell` / `AdminSidebar` / `AdminHeader` trio with a single small layout wrapper `AdminHomeShell.tsx` that:

- Verifies the admin session via the existing `useAdminAuth` hook (no changes to the hook).
- Renders `children` on a plain background. No sidebar, no header bar, no nav. Just `{children}`.
- Keeps the existing session-gating behavior: if no session, redirect to `/admin/login?next=/admin/dashboard`.

`AdminShell.tsx`, `AdminSidebar.tsx`, and `AdminHeader.tsx` are deleted.

### 2. New clean dashboard page

Replace the current [`src/app/(admin)/admin/dashboard/page.tsx`](../../src/app/(admin)/admin/dashboard/page.tsx) (which renders stat cards, growth charts, revenue stream, recent registrations, etc.) with a small client component that:

- Calls `useAdminAuth()` to get the current admin.
- Renders a centered card with: BRPL logo (`/logo.webp`), "Signed in as <email>", a role badge, and a single **Logout** button.
- The Logout button calls `useAdminAuth().logout()` (which POSTs `/api/admin/auth/logout`, clears the cookie, and routes to `/admin/login`).
- No data fetching. No tables. No charts. No widgets.

The `(admin)` layout at [`src/app/(admin)/layout.tsx`](../../src/app/(admin)/layout.tsx) is updated to wrap children with `AdminHomeShell` instead of `AdminShell`.

### 3. `/admin` index page

`src/app/(admin)/admin/page.tsx` currently redirects to `/admin/dashboard`. Keep it. No change.

### 4. Page deletions

Delete every directory under `src/app/(admin)/admin/` except `login` and the index `page.tsx`:

`about-us/`, `ambassadors/`, `blog/`, `campaigns/`, `cms/`, `contact-us-leads/`, `coupon-usage/`, `coupons/`, `dashboard/loading.tsx`, `events/`, `faqs/`, `jobs/`, `media/`, `meta-content/`, `news/`, `numbers-speak/`, `page-banner/`, `partners/`, `payments/`, `player-stories/`, `players/`, `privacy-policy/`, `profile/`, `registration-banner/`, `registration-faqs/`, `registration-hero/`, `registration-page/`, `roadmap/`, `rule-book/`, `settings/`, `site-pages/`, `social-contact/`, `teams/`, `terms-conditions/`, `zone-deadline/`.

### 5. Component deletions

Delete admin components only used by the deleted pages:

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

### 6. API route deletions

Delete every route under `src/app/api/admin/` **except** the auth trio + `/me`:

- Keep: `auth/send-otp/`, `auth/verify-otp/`, `auth/logout/`, `me/`.
- Delete: `about-us/`, `ambassadors/`, `blog/`, `campaigns/`, `charts/`, `contact-leads/`, `coupons/`, `events/`, `faqs/`, `home/`, `jobs/`, `legal/`, `media/`, `news/`, `page-banner/`, `partners/`, `payments/`, `records/`, `registration/`, `registration-page/`, `seo/`, `settings/`, `site-pages/`, `stats/`, `teams/`, `users/`.

In `src/app/api/admin/auth/verify-otp/route.ts`, change the `nextParam` fallback from `"/admin/dashboard"` to `"/admin"`.

### 7. Helpers / hooks

- **Delete** `src/apihelper/admin.ts` — its only remaining callers (dashboard, profile) are being deleted. After deletion, `grep -r "apihelper/admin" src` must return zero hits.
- **Keep** `src/hooks/useAdminAuth.ts` — still used by the new `AdminHomeShell` and by any component that wants the current admin.
- **Keep** `src/lib/jwt.ts`, `src/lib/adminApi.ts`, `src/lib/adminCrud.ts`, `src/lib/adminBootstrap.ts` until a final import audit in the implementation phase. Any that have zero remaining importers after the page/API deletions are deleted in the same change. Any that are still imported by public-side code (e.g., `lib/adminApi.ts` may be used by `src/app/api/contact/route.ts`) are kept.

### 8. Models

Models are shared with public routes via the `(main)` route group and several public API endpoints. Do not delete any model during this change without verifying it has zero importers across the whole `src/`. Initial grep suggests every model in `src/models/` is referenced by either the public site or admin auth. **None are deleted in this spec.** If a final import audit during implementation finds orphans, list them for explicit approval before deletion.

### 9. Public-route touch-up

`src/app/api/contact/route.ts:69` calls `revalidatePath("/admin/contact-us-leads")`. That path no longer exists. Update the call to `revalidatePath("/admin")` (or remove the call — the contact form's data is invalidated by the surrounding `revalidatePath` calls for the public pages anyway). Decision: change to `/admin` to preserve the existing invalidation behavior, even though the path is now a redirect.

### 10. Tests

`tests/admin-otp.test.ts` exercises `/api/admin/auth/send-otp` and `/api/admin/auth/verify-otp` — both routes stay. The test should pass without modification. `tests/auth-register.test.ts` and `tests/server-only-stub.ts` are unrelated.

## Files changed

### Created
- `src/components/admin/AdminHomeShell.tsx` — minimal shell with logout.
- `docs/superpowers/specs/2026-06-28-admin-panel-cleanup-design.md` (this file).
- `docs/superpowers/plans/2026-06-28-admin-panel-cleanup-plan.md` (plan, in next step).

### Modified
- `src/app/(admin)/layout.tsx` — use `AdminHomeShell` instead of `AdminShell`.
- `src/app/(admin)/admin/dashboard/page.tsx` — replace content with the clean card.
- `src/app/api/admin/auth/verify-otp/route.ts` — `nextParam` fallback → `/admin`.
- `src/app/api/contact/route.ts` — `revalidatePath` target → `/admin`.

### Deleted
- All admin sub-route directories listed in §4.
- All admin components listed in §5.
- All admin API routes listed in §6 except the four kept.
- `src/apihelper/admin.ts` (after verifying zero importers).
- Any `lib/*.ts` file with zero importers found during implementation (listed in the plan).

## Why this is safe

- **Login flow is untouched.** `/admin/login`, `/api/admin/auth/send-otp`, `/api/admin/auth/verify-otp`, and `/api/admin/auth/logout` are all kept. The OTP test still passes.
- **Session gating stays.** `(admin)/layout.tsx` still calls `getAdminSession()` and redirects to login if unauthenticated. The new `AdminHomeShell` is mounted under the same gated layout.
- **No public-site regression.** All model deletions are deferred to a post-implementation audit; nothing in `(main)`, `/checkout`, `/payment`, `/login`, `/dashboard`, or the public API routes is removed.
- **Chrome hiding still works.** The `CHROME_HIDDEN_PREFIXES` array in `ClientProviders` already includes `/admin` (from the 2026-06-27 spec). The simplified shell produces no double-chrome to begin with.
- **Logout behavior unchanged.** `useAdminAuth().logout()` continues to POST `/api/admin/auth/logout`, clear the cookie, and route to `/admin/login`. The new button just calls it.
- **Reduced surface area is the point.** After this change, anyone visiting `/admin/*` sees only `/admin/login` (unauthenticated) or `/admin/dashboard` (authenticated) with a single Logout button. No tabs, no nav, no sub-routes — exactly as requested.

## Testing

Manual verification:

1. `npm run dev`, visit `http://localhost:3000/admin` while signed out → redirected to `/admin/login`.
2. Submit a valid OTP → land on `http://localhost:3000/admin/dashboard` showing the centered card with logo, email, role, and a single Logout button. No sidebar, no header bar, no nav.
3. Click **Logout** → returned to `/admin/login`.
4. Visit any old admin URL (`/admin/players`, `/admin/cms/banners`, `/admin/settings`, etc.) → 404. (These routes are deleted; the absence is expected and desired.)

Automated:

1. `npm run build` — must compile with no broken imports, no unused-component warnings escalated to errors, no missing-route errors.
2. `npm test` — `admin-otp.test.ts` passes; `auth-register.test.ts` passes.

## Out of scope

- Removing or simplifying the login page UI.
- Removing the OTP auth flow itself.
- Deleting Mongoose models (deferred to a separate audit/spec).
- Removing the `(admin-public)/admin/login` route group or merging it with `(admin)`.
- Any change to public-site pages, public API routes, or checkout/payment flows.
