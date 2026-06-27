# Admin: Hide Public Header/Footer on `/admin/*` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the public `<Header />` and `<Footer />` from rendering on any URL whose pathname starts with `/admin`, while leaving every other page's chrome unchanged.

**Architecture:** Extend the existing chrome-hiding mechanism in the root `ClientProviders` client component by adding `"/admin"` to its `CHROME_HIDDEN_PREFIXES` array. The matching logic at the same site already handles exact matches and arbitrary-depth subpaths, so a single constant entry covers `/admin`, `/admin/login`, `/admin/dashboard`, `/admin/users`, and every other admin route.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, TailwindCSS (existing — no new deps).

## Global Constraints

- Spec source: [docs/superpowers/specs/2026-06-27-admin-hide-public-chrome-design.md](../../specs/2026-06-27-admin-hide-public-chrome-design.md).
- One and only one file is modified: [src/components/ClientProviders.tsx](../../../src/components/ClientProviders.tsx).
- No new dependencies, no layout refactors, no route-group changes.
- No automated test changes — the spec scopes verification to manual checks.
- Follow existing repo conventions: 4-space indent, double quotes, semicolons (matches the file's existing style and Prettier config at [`.prettierrc`](../../../.prettierrc)).

---

### Task 1: Hide public chrome on `/admin/*`

**Files:**
- Modify: [src/components/ClientProviders.tsx:13](../../../src/components/ClientProviders.tsx#L13) — `CHROME_HIDDEN_PREFIXES` constant.

**Interfaces:**
- Consumes: the existing `pathname` returned by `usePathname()` and the existing match expression at line 17: `pathname === p || pathname.startsWith(p + "/")`. No new code paths are introduced.
- Produces: `hideChrome === true` for every pathname that equals `/admin` or starts with `/admin/` (e.g. `/admin/login`, `/admin/dashboard`, `/admin/users`, `/admin/cms`, `/admin/payments`, `/admin/settings`). `hideChrome` continues to be `true` for `/login` and `/dashboard` exactly as before, and `false` for every other pathname (e.g. `/`, `/blog`, `/about-us`, `/checkout`, `/payment`).

- [ ] **Step 1: Open the file and locate the constant**

Open [src/components/ClientProviders.tsx](../../../src/components/ClientProviders.tsx). Confirm the current contents of line 13 read:

```ts
const CHROME_HIDDEN_PREFIXES = ["/login", "/dashboard"];
```

If the file has drifted from the spec, stop and surface the drift to the user before continuing.

- [ ] **Step 2: Add `"/admin"` to the array**

Edit line 13 so it reads:

```ts
const CHROME_HIDDEN_PREFIXES = ["/login", "/dashboard", "/admin"];
```

No other lines in the file change. Do not touch the `hideChrome` computation on line 17 or the `{!hideChrome && <Header />}` / `{!hideChrome && <Footer />}` lines — they already do the right thing once the constant is updated.

- [ ] **Step 3: Verify the file**

Re-open the file and confirm:

- Line 13 contains the updated three-element array.
- Line 17 still contains the unchanged `hideChrome` expression.
- Lines 36 and 38 still contain the unchanged `{!hideChrome && <Header />}` and `{!hideChrome && <Footer />}` guards.
- No trailing comma was introduced (Prettier will reject it in this codebase).

- [ ] **Step 4: Type-check and lint**

Run:

```bash
cd /Users/anurag/Desktop/brpl-frontend && npx tsc --noEmit
```

Expected: exits 0 with no diagnostics.

Run:

```bash
cd /Users/anurag/Desktop/brpl-frontend && npm run lint
```

Expected: exits 0 with no warnings or errors related to `src/components/ClientProviders.tsx`.

- [ ] **Step 5: Build**

Run:

```bash
cd /Users/anurag/Desktop/brpl-frontend && npm run build
```

Expected: completes successfully. The build output should report the admin routes (`/admin/login`, `/admin`, `/admin/dashboard`, …) the same as before — the change is a runtime render-conditional, not a route-affecting change.

- [ ] **Step 6: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/components/ClientProviders.tsx && git commit -m "fix(admin): hide public Header/Footer on /admin/* paths

Add /admin to CHROME_HIDDEN_PREFIXES in ClientProviders so the
public chrome no longer wraps the OTP login card or doubles up
on top of the AdminShell sidebar inside the admin section.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 7: Manual verification — admin login (unauthenticated)**

Run the dev server:

```bash
cd /Users/anurag/Desktop/brpl-frontend && npm run dev
```

In a browser (or Playwright MCP) visit `http://localhost:3000/admin/login`.

Expected:
- No top navigation bar from `<Header />` (no logo link bar, no main nav links, no "Login/Register" buttons).
- No `<Footer />` at the bottom of the page.
- The OTP card is centered, full-height, with its own background image and "Back to site" link in the top-left exactly as designed.
- Console is free of hydration warnings.

- [ ] **Step 8: Manual verification — authenticated admin pages**

In the same browser, complete the OTP login flow (or bypass via an existing admin session) and visit each of:

- `http://localhost:3000/admin/dashboard`
- `http://localhost:3000/admin/users`
- `http://localhost:3000/admin/cms`
- `http://localhost:3000/admin/payments`
- `http://localhost:3000/admin/settings`

Expected on every URL:
- The public `<Header />` is absent.
- The public `<Footer />` is absent.
- Only the AdminShell chrome is visible: left `<AdminSidebar>`, top `<AdminHeader>` (with email + logout), and the page's `<main>` content area.
- No double-chrome (no public navbar stacked above the admin sidebar).

- [ ] **Step 9: Manual verification — public pages regression check**

In the same browser, visit each of:

- `http://localhost:3000/`
- `http://localhost:3000/blog`
- `http://localhost:3000/about-us`
- `http://localhost:3000/dashboard`
- `http://localhost:3000/login`
- `http://localhost:3000/checkout`

Expected on every URL:
- Public `<Header />` and `<Footer />` render exactly as before this change.
- No visual regression; nav links, logo, footer columns all behave the same way as on `main`.

- [ ] **Step 10: Stop the dev server**

Stop the `npm run dev` process started in Step 7.
