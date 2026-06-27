# Admin pages: hide public Header/Footer

## Problem

The public `<Header />` and `<Footer />` (rendered globally in `ClientProviders`) currently appear on every URL, including all admin pages — `/admin/login` and the authenticated admin section under `(admin)/admin/*` (dashboard, users, cms, etc.).

This produces visible double-chrome on authenticated admin pages (the AdminShell sidebar/header layered on top of the public Header) and an unwanted Header/Footer wrapping the centered OTP login card.

## Goal

No public `<Header />` or `<Footer />` on any URL whose pathname starts with `/admin`. Public chrome must continue to render everywhere else it does today.

## Approach

Extend the existing chrome-hiding mechanism in [src/components/ClientProviders.tsx](../../src/components/ClientProviders.tsx) by adding `"/admin"` to the `CHROME_HIDDEN_PREFIXES` array.

```ts
const CHROME_HIDDEN_PREFIXES = ["/login", "/dashboard", "/admin"];
```

The matching logic at the same file (line 17) — `pathname === p || pathname.startsWith(p + "/")` — already handles exact matches and arbitrary-depth subpaths, so this single addition covers `/admin`, `/admin/login`, `/admin/dashboard`, `/admin/users`, and all other admin routes.

## Files changed

- [src/components/ClientProviders.tsx](../../src/components/ClientProviders.tsx) — add `"/admin"` to `CHROME_HIDDEN_PREFIXES`.

No other files change.

## Why this is safe

- **Login page** ([src/app/(admin-public)/admin/login/page.tsx](../../src/app/(admin-public)/admin/login/page.tsx)) is a full-screen client component with its own `min-h-screen flex flex-col items-center justify-center` layout. It does not reference a parent Header/Footer and does not assume they exist. Removing them leaves it visually identical, minus the chrome that currently wraps it.
- **Authenticated admin pages** all render through `<AdminShell>` ([src/components/admin/AdminShell.tsx](../../src/components/admin/AdminShell.tsx)), which provides its own sidebar + admin header + main content area. Hiding the public chrome leaves only the AdminShell chrome.
- **No SSR/hydration impact**: `hideChrome` is computed in a client component from `usePathname()` — exactly how `/login` and `/dashboard` already work. The codebase's known Toaster-hydration footgun (see comment in ClientProviders) is unrelated and untouched.
- **`/admin` itself** redirects to `/admin/dashboard` via [src/app/(admin)/admin/page.tsx](../../src/app/(admin)/admin/page.tsx) before any chrome is rendered. The prefix match (`/admin` + `"/"`) handles the `/admin` case as well as every nested path.
- **No regression risk for public pages**: the rule is additive. `/`, `/blog`, `/about-us`, `/dashboard`, `/login`, `/checkout`, `/payment` and every other non-admin path are unaffected.

## Testing

Manual verification across the affected surfaces:

1. Unauthenticated visit to `/admin/login` — confirm no public Header/Footer around the OTP card; the "Back to site" link in the top-left must remain.
2. Successful OTP login → land on `/admin/dashboard` — confirm only the AdminShell sidebar + AdminHeader are visible.
3. Navigate within the admin section: `/admin/users`, `/admin/cms`, `/admin/payments`, `/admin/settings` — confirm only AdminShell chrome on each.
4. Visit `/`, `/blog`, `/about-us`, `/dashboard`, `/login`, `/checkout` — confirm public Header + Footer still render as they do today.

No automated test changes; behavior is a one-line constant addition with no new logic paths.