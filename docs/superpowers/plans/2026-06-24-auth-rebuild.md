# Auth Page Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/auth` page from scratch with a clean stadium-style centered card, structured inputs/buttons, and a tightened shared CSS system — without touching API routes, hooks, or provider wiring.

**Architecture:** Rewrite `AuthClient.tsx` as a smaller (~250 line) file that uses the existing shadcn `Input` / `Button` / `Label` primitives plus small in-file helpers (`AuthShell`, `AuthCard`, `StepPill`, `AuthField`, `PhoneInput`, `OtpInput`, `PrimaryButton`). The three steps (phone → otp → register) keep their existing API calls and state. In `globals.css`, remove the ~800-line "Cosmic Stadium" block and add a focused ~150-line replacement using new pitch-green + amber tokens. Delete the leftover `globals.css.bak`.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui (Radix + cva), lucide-react, vitest, Razorpay (unchanged).

**Reference spec:** [docs/superpowers/specs/2026-06-24-auth-rebuild-design.md](docs/superpowers/specs/2026-06-24-auth-rebuild-design.md)

---

## File Structure

**Modified files:**

- `src/app/auth/AuthClient.tsx` — full rewrite. One file holds the page client and the small in-file helpers (each helper does one thing).
- `src/app/globals.css` — replace the `/* Auth — Cosmic Stadium */` block with a new `/* Auth — Stadium */` block. Add new color tokens to `:root` and `.dark`. Keep all other rules untouched.

**Deleted files:**

- `src/app/globals.css.bak` — leftover from a prior edit, no longer needed.

**Created files:**

- `tests/lib/auth-form.test.ts` — pure-function tests for the small helpers extracted from `AuthClient.tsx` (formatting, validation). Server-side vitest, no jsdom needed.

**No new files** for the page itself. Helpers live in `AuthClient.tsx` because they only matter to this page.

**Unchanged files** (do not touch):

- `src/app/auth/page.tsx`
- `src/components/ClientProviders.tsx`
- `src/lib/featureFlags.ts`
- `src/hooks/useSiteSettings.ts`
- `src/apihelper/api.ts`
- All `/api/auth/*` and `/api/payment/*` route files

---

## Task 1: Add new visual tokens to globals.css

**Files:**
- Modify: `src/app/globals.css:7-47` (`:root` block) and `:root` block in `.dark` at lines 49-87

- [ ] **Step 1: Add new tokens to `:root`**

In `src/app/globals.css`, locate the `:root { ... }` block (lines 7-47). Inside it, after the existing `--shadow-button: ...` line (line 46), add the new tokens. The resulting block should end with:

```css
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 6%;

    --card: 0 0% 100%;
    --card-foreground: 222 47% 6%;

    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 6%;

    --primary: 230 60% 17%;
    --primary-foreground: 210 40% 98%;

    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222 47% 11.2%;

    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;

    --accent: 25 100% 50%;
    --accent-foreground: 222 47% 11.2%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 175 80% 40%;

    --radius: 0.75rem;

    /* Custom tokens - Light */
    --gradient-primary: linear-gradient(135deg, hsl(175 80% 40%), hsl(200 80% 40%));
    --gradient-accent: linear-gradient(135deg, hsl(280 80% 60%), hsl(320 80% 60%));
    --gradient-glass: linear-gradient(135deg, hsl(0 0% 100% / 0.8), hsl(210 40% 96% / 0.6));
    --gradient-hero: radial-gradient(ellipse at 50% 0%, hsl(175 80% 40% / 0.1), transparent 60%);

    --shadow-glow: 0 0 40px hsl(175 80% 40% / 0.2);
    --shadow-card: 0 8px 32px hsl(0 0% 0% / 0.1);
    --shadow-button: 0 4px 20px hsl(175 80% 40% / 0.2);

    /* Auth — Stadium tokens (light fallbacks) */
    --ink-900: #0d1f17;
    --ink-800: #111e18;
    --ink-700: #18261f;
    --pitch-500: #22c55e;
    --pitch-700: #15803d;
    --amber-500: #fbbf24;
    --amber-400: #fcd34d;
    --amber-700: #b45309;
    --cream-50: #f7f1e6;
    --cream-300: rgba(245, 241, 234, 0.55);
    --cream-500: rgba(245, 241, 234, 0.4);
  }
```

- [ ] **Step 2: Add the same tokens to the `.dark` block**

In `src/app/globals.css`, locate the `.dark { ... }` block (lines 49-87). Inside it, after the existing `--shadow-button: ...` line, add the same token block. The resulting block should end with:

```css
  .dark {
    --background: 222 47% 6%;
    --foreground: 210 40% 98%;

    --card: 222 47% 8%;
    --card-foreground: 210 40% 98%;

    --popover: 222 47% 10%;
    --popover-foreground: 210 40% 98%;

    --primary: 175 80% 50%;
    --primary-foreground: 222 47% 6%;

    --secondary: 222 30% 14%;
    --secondary-foreground: 210 40% 98%;

    --muted: 222 30% 18%;
    --muted-foreground: 215 20% 55%;

    --accent: 280 80% 60%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 210 40% 98%;

    --border: 222 30% 18%;
    --input: 222 30% 14%;
    --ring: 175 80% 50%;

    /* Custom tokens - Dark */
    --gradient-primary: linear-gradient(135deg, hsl(175 80% 50%), hsl(200 80% 50%));
    --gradient-accent: linear-gradient(135deg, hsl(280 80% 60%), hsl(320 80% 60%));
    --gradient-glass: linear-gradient(135deg, hsl(222 47% 12% / 0.8), hsl(222 47% 8% / 0.6));
    --gradient-hero: radial-gradient(ellipse at 50% 0%, hsl(175 80% 50% / 0.15) 0%, transparent 60%);

    --shadow-glow: 0 0 60px hsl(175 80% 50% / 0.3);
    --shadow-card: 0 8px 32px hsl(0 0% 0% / 0.4);
    --shadow-button: 0 4px 20px hsl(175 80% 50% / 0.4);

    /* Auth — Stadium tokens (dark mode = primary) */
    --ink-900: #0d1f17;
    --ink-800: #111e18;
    --ink-700: #18261f;
    --pitch-500: #22c55e;
    --pitch-700: #15803d;
    --amber-500: #fbbf24;
    --amber-400: #fcd34d;
    --amber-700: #b45309;
    --cream-50: #f7f1e6;
    --cream-300: rgba(245, 241, 234, 0.55);
    --cream-500: rgba(245, 241, 234, 0.4);
  }
```

- [ ] **Step 3: Verify the file still parses**

Run: `npx tailwindcss -i src/app/globals.css -o /tmp/test-output.css --minify 2>&1 | tail -20`
Expected: build succeeds with no errors. (We just want to confirm PostCSS/Tailwind can parse the file. Discard `/tmp/test-output.css` after.)

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "feat(auth): add stadium design tokens to globals.css"
```

---

## Task 2: Add the new Stadium auth CSS block

**Files:**
- Modify: `src/app/globals.css` (append a new `/* Auth — Stadium */` block at the end of the file, after the `body[data-route="auth"]` rules)

- [ ] **Step 1: Append the Stadium CSS block**

Open `src/app/globals.css`. At the very end of the file (after the existing `body[data-route="auth"] div > footer { display: none !important; }` rule), add a blank line then this block:

```css

/* ============================================
   Auth — Stadium
   Single-card layout, pitch-green ground, amber CTAs.
   ============================================ */
.auth-shell {
  position: fixed;
  inset: 0;
  height: 100dvh;
  width: 100vw;
  overflow-y: auto;
  background: var(--ink-900);
  color: var(--cream-50);
  font-family: var(--font-inter), 'Inter', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1.25rem, 3vw, 2.5rem);
}

.auth-stage {
  position: relative;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  animation: auth-rise 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes auth-rise {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.auth-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  color: var(--cream-50);
  text-align: center;
  line-height: 1.3;
  transition: color 0.2s ease;
}
.auth-brand:hover { color: var(--amber-400); }

.auth-brand-dot {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: var(--amber-500);
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.7);
  flex-shrink: 0;
}

.auth-brand-text {
  font-family: var(--font-rye), 'Rye', serif;
  font-size: 0.82rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.auth-brand-sub {
  display: block;
  font-family: var(--font-inter), 'Inter', sans-serif;
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cream-500);
  margin-top: 0.25rem;
}

.auth-card {
  position: relative;
  width: 100%;
  background: var(--ink-800);
  border: 1px solid rgba(251, 191, 36, 0.18);
  border-radius: 18px;
  padding: 2rem 1.75rem;
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.6);
}

.auth-step-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.7rem;
  border-radius: 9999px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #86efac;
  margin-bottom: 1rem;
}

.auth-step-pill .auth-step-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: var(--pitch-500);
  box-shadow: 0 0 8px var(--pitch-500);
}

.auth-title {
  font-family: var(--font-fraunces), 'Fraunces', serif;
  font-weight: 500;
  font-size: 1.85rem;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--cream-50);
  margin: 0 0 0.4rem;
}

.auth-sub {
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--cream-300);
  margin: 0 0 1.5rem;
}

.auth-field {
  display: block;
  margin-bottom: 1rem;
}

.auth-field-label {
  display: block;
  font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--cream-300);
  margin-bottom: 0.5rem;
}

.auth-field-input {
  width: 100%;
  height: 52px;
  border-radius: 10px;
  background: var(--ink-700);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  color: var(--cream-50);
  font-size: 1rem;
  font-family: var(--font-inter), 'Inter', sans-serif;
  font-weight: 500;
  padding: 0 1rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}
.auth-field-input::placeholder { color: var(--cream-500); }
.auth-field-input:hover { border-color: rgba(251, 191, 36, 0.4); }
.auth-field-input:focus {
  border-color: var(--amber-500);
  background: rgba(251, 191, 36, 0.05);
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.14);
}
.auth-field-input:disabled { opacity: 0.6; cursor: not-allowed; }

.auth-phone-wrap {
  position: relative;
}
.auth-phone-prefix {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--cream-300);
  pointer-events: none;
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  padding-right: 0.8rem;
}
.auth-phone-input {
  padding-left: 4.4rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
  font-size: 1.05rem;
}
.auth-phone-wrap:focus-within .auth-phone-prefix { color: var(--amber-500); }

select.auth-field-input {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'><path d='M1 1.5L6 6.5L11 1.5' stroke='%23fbbf24' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/></svg>");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 12px 8px;
  padding-right: 2.5rem;
}
select.auth-field-input option { background: #111e18; color: #f7f1e6; }

.auth-submit {
  width: 100%;
  height: 52px;
  margin-top: 0.5rem;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--amber-400) 0%, var(--amber-500) 50%, var(--amber-700) 100%);
  color: #0a0a0f;
  font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 12px 28px -10px rgba(245, 158, 11, 0.55);
  transition: transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease;
}
.auth-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 16px 36px -10px rgba(245, 158, 11, 0.7);
}
.auth-submit:active:not(:disabled) { transform: translateY(0); filter: brightness(0.98); }
.auth-submit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

.auth-ghost {
  background: none;
  border: 0;
  color: var(--amber-500);
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  font-family: inherit;
  border-bottom: 1px solid rgba(251, 191, 36, 0.3);
  transition: color 0.2s ease, border-color 0.2s ease;
}
.auth-ghost:hover { color: var(--amber-400); border-bottom-color: var(--amber-400); }
.auth-ghost:disabled { color: var(--cream-500); cursor: default; border-bottom-color: transparent; }

.auth-aux {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.25rem;
  font-size: 0.82rem;
  color: var(--cream-300);
}
.auth-aux a {
  color: var(--amber-500);
  text-decoration: none;
  font-weight: 500;
  border-bottom: 1px solid rgba(251, 191, 36, 0.3);
  transition: color 0.2s ease, border-color 0.2s ease;
}
.auth-aux a:hover { color: var(--amber-400); border-bottom-color: var(--amber-400); }

.auth-trust {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 1.25rem;
  padding: 0.8rem 0.9rem;
  border-radius: 12px;
  background: rgba(34, 197, 94, 0.06);
  border: 1px solid rgba(34, 197, 94, 0.18);
  font-size: 0.8rem;
  color: rgba(220, 252, 231, 0.85);
}
.auth-trust svg { flex-shrink: 0; color: var(--pitch-500); }

.auth-fee {
  border-radius: 14px;
  border: 1px solid rgba(245, 158, 11, 0.25);
  background: linear-gradient(160deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02));
  padding: 1.1rem 1.15rem;
}
.auth-fee-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}
.auth-fee-label {
  font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--amber-500);
}
.auth-fee-amount {
  font-family: var(--font-fraunces), 'Fraunces', serif;
  font-size: 1.4rem;
  font-weight: 500;
  color: var(--amber-400);
}
.auth-fee-note {
  font-size: 0.82rem;
  color: var(--cream-300);
  margin: 0 0 0.85rem;
}

.auth-info {
  border-radius: 14px;
  border: 1px solid rgba(14, 165, 183, 0.3);
  background: rgba(14, 165, 183, 0.06);
  padding: 0.9rem 1rem;
  font-size: 0.84rem;
  color: rgba(220, 252, 231, 0.85);
}

.auth-otp-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
  margin: 0.5rem 0 0.75rem;
}
.auth-otp-cell {
  height: 56px;
  text-align: center;
  font-family: var(--font-fraunces), 'Fraunces', serif;
  font-weight: 500;
  font-size: 1.6rem;
  color: var(--cream-50);
  background: var(--ink-700);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  outline: none;
  caret-color: transparent;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}
.auth-otp-cell:focus {
  border-color: var(--amber-500);
  background: rgba(251, 191, 36, 0.05);
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.14);
}
.auth-otp-cell.filled {
  border-color: rgba(251, 191, 36, 0.6);
  background: rgba(251, 191, 36, 0.08);
}

.auth-otp-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--cream-300);
  margin-bottom: 1rem;
}

.auth-foot {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--cream-500);
  text-align: center;
}
.auth-foot-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: var(--pitch-500);
  box-shadow: 0 0 8px var(--pitch-500);
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .auth-card { padding: 1.5rem 1.25rem; }
  .auth-otp-cell { height: 44px; font-size: 1.3rem; }
  .auth-title { font-size: 1.5rem; }
  .auth-brand-sub { display: none; }
}

@media (max-width: 768px) {
  .auth-shell, .auth-card { backdrop-filter: none; -webkit-backdrop-filter: none; }
}
```

- [ ] **Step 2: Verify the file still parses**

Run: `npx tailwindcss -i src/app/globals.css -o /tmp/test-output.css --minify 2>&1 | tail -20`
Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "feat(auth): add Stadium auth CSS block"
```

---

## Task 3: Remove the old Cosmic Stadium CSS block

**Files:**
- Modify: `src/app/globals.css` (delete lines 468-1268, the `/* Auth — Cosmic Stadium */` block)

- [ ] **Step 1: Confirm the boundaries to delete**

In `src/app/globals.css`, the `/* Auth — Cosmic Stadium */` block begins at line 468 (with the `/* ====... ==== */` comment header) and ends just before the EOF. The block we want to remove is **everything from line 468 to the end of the file except the Stadium block we just added in Task 2**.

In practice, the cleanest approach is:

1. Open `src/app/globals.css` in an editor.
2. Locate the line `/* ============================================` that starts the `Auth — Cosmic Stadium` block (it's the second such comment block in the file).
3. Select from that comment header through the last line that ends with `body[data-route="auth"] div > footer { display: none !important; }`.
4. Delete the selection. The Stadium block from Task 2 should remain at the bottom of the file.

After deletion, the file should end with the Stadium block from Task 2, preceded by the `.legal-content h6 { ... }` rule from the existing `@layer components` block.

- [ ] **Step 2: Verify the file still parses and the diff is large**

Run: `npx tailwindcss -i src/app/globals.css -o /tmp/test-output.css --minify 2>&1 | tail -20`
Expected: build succeeds with no errors.

Run: `wc -l src/app/globals.css`
Expected: line count is roughly **less than 500** (down from 1268 — we removed ~800 lines and added ~150).

- [ ] **Step 3: Verify the existing styles that should be kept are still present**

Run:

```bash
grep -c "founder-card" src/app/globals.css
grep -c "legal-content" src/app/globals.css
grep -c "blog-quill-editor" src/app/globals.css
grep -c "animate-float" src/app/globals.css
grep -c "data-route=\"auth\"" src/app/globals.css
```

Expected: each command returns at least 1.

- [ ] **Step 4: Verify the old Cosmic Stadium selectors are gone**

Run:

```bash
grep -c "auth-orb" src/app/globals.css
grep -c "aurora-drift" src/app/globals.css
grep -c "auth-float-label" src/app/globals.css
grep -c "auth-grain" src/app/globals.css
grep -c "ticker-flow" src/app/globals.css
```

Expected: each command returns 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "refactor(auth): remove old Cosmic Stadium CSS block (~800 lines)"
```

---

## Task 4: Delete the leftover globals.css.bak

**Files:**
- Delete: `src/app/globals.css.bak`

- [ ] **Step 1: Confirm the file exists and check its size**

Run: `ls -la src/app/globals.css.bak`
Expected: file exists.

- [ ] **Step 2: Delete it**

Run: `rm src/app/globals.css.bak`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add -u src/app/globals.css.bak
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "chore: remove leftover globals.css.bak"
```

---

## Task 5: Add pure-function helpers in a separate module (testable)

**Files:**
- Create: `src/app/auth/auth-helpers.ts`

To make the auth logic testable without adding jsdom, we extract the small pure helpers used by `AuthClient.tsx` into a separate module. The component imports them; tests import the module directly.

- [ ] **Step 1: Create the helpers module**

Create `src/app/auth/auth-helpers.ts` with this content:

```ts
/**
 * Pure helpers used by /auth page. Kept in a separate module
 * so they can be unit-tested without a DOM.
 */

export const PHONE_REGEX = /^\d{10}$/;

export function isValidPhone(phone: string): boolean {
    return PHONE_REGEX.test(phone);
}

export function isCompleteOtp(otp: ReadonlyArray<string>): boolean {
    return otp.length === 6 && otp.every((d) => d.length === 1 && /^\d$/.test(d));
}

export function formatOtpExpiry(expiresInSec: number): string {
    if (expiresInSec <= 0) return "0:00";
    const m = Math.floor(expiresInSec / 60);
    const s = expiresInSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

export const REGISTRATION_FEE_DISPLAY = "₹1,499";
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit src/app/auth/auth-helpers.ts 2>&1 | tail -20`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/auth-helpers.ts
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "feat(auth): add pure helpers module for testability"
```

---

## Task 6: Write failing tests for the helpers

**Files:**
- Create: `tests/lib/auth-helpers.test.ts`

- [ ] **Step 1: Write the tests**

Create `tests/lib/auth-helpers.test.ts` with this content:

```ts
import { describe, it, expect } from "vitest";
import {
    isValidPhone,
    isCompleteOtp,
    formatOtpExpiry,
    PHONE_REGEX,
    REGISTRATION_FEE_DISPLAY,
} from "@/app/auth/auth-helpers";

describe("isValidPhone", () => {
    it("accepts a 10-digit number", () => {
        expect(isValidPhone("9876543210")).toBe(true);
    });
    it("rejects fewer than 10 digits", () => {
        expect(isValidPhone("98765")).toBe(false);
    });
    it("rejects more than 10 digits", () => {
        expect(isValidPhone("98765432101")).toBe(false);
    });
    it("rejects non-numeric characters", () => {
        expect(isValidPhone("98765abcde")).toBe(false);
    });
    it("rejects empty string", () => {
        expect(isValidPhone("")).toBe(false);
    });
    it("exposes the regex for callers that want it", () => {
        expect(PHONE_REGEX.test("9876543210")).toBe(true);
    });
});

describe("isCompleteOtp", () => {
    it("returns true when all 6 boxes are filled with a digit", () => {
        expect(isCompleteOtp(["1", "2", "3", "4", "5", "6"])).toBe(true);
    });
    it("returns false when a box is empty", () => {
        expect(isCompleteOtp(["1", "2", "3", "4", "5", ""])).toBe(false);
    });
    it("returns false when a box has multiple digits", () => {
        expect(isCompleteOtp(["1", "23", "3", "4", "5", "6"])).toBe(false);
    });
    it("returns false when a box has a non-digit", () => {
        expect(isCompleteOtp(["1", "2", "a", "4", "5", "6"])).toBe(false);
    });
    it("returns false for arrays of the wrong length", () => {
        expect(isCompleteOtp(["1", "2", "3"])).toBe(false);
    });
});

describe("formatOtpExpiry", () => {
    it("formats 300 seconds as 5:00", () => {
        expect(formatOtpExpiry(300)).toBe("5:00");
    });
    it("formats 65 seconds as 1:05", () => {
        expect(formatOtpExpiry(65)).toBe("1:05");
    });
    it("formats 0 as 0:00", () => {
        expect(formatOtpExpiry(0)).toBe("0:00");
    });
    it("formats negative as 0:00", () => {
        expect(formatOtpExpiry(-5)).toBe("0:00");
    });
    it("pads single-digit seconds", () => {
        expect(formatOtpExpiry(9)).toBe("0:09");
    });
});

describe("REGISTRATION_FEE_DISPLAY", () => {
    it("renders as ₹1,499", () => {
        expect(REGISTRATION_FEE_DISPLAY).toBe("₹1,499");
    });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/lib/auth-helpers.test.ts 2>&1 | tail -30`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/lib/auth-helpers.test.ts
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "test(auth): add unit tests for auth helpers"
```

---

## Task 7: Rewrite AuthClient.tsx

**Files:**
- Modify: `src/app/auth/AuthClient.tsx` (full rewrite)

- [ ] **Step 1: Replace the file with the new implementation**

Overwrite `src/app/auth/AuthClient.tsx` with this content:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Phone, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import api from "@/apihelper/api";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
    isValidPhone,
    isCompleteOtp,
    formatOtpExpiry,
    REGISTRATION_FEE_DISPLAY,
} from "./auth-helpers";

type Step = "phone" | "otp" | "register";

const FALLBACK_NEXT = "/dashboard";

const STEP_LABEL: Record<Step, string> = {
    phone: "Step 01 of 03 · Mobile",
    otp: "Step 02 of 03 · Verify",
    register: "Step 03 of 03 · Register",
};

const STEP_TITLE = {
    phone: (mode: "register" | "login") =>
        mode === "register" ? "Welcome to BRPL" : "Welcome back",
    otp: () => "Enter the code",
    register: () => "Final stretch",
} as const;

const STEP_SUB = {
    phone: (mode: "register" | "login") =>
        mode === "register"
            ? "Enter your mobile to receive a one-time passcode."
            : "Enter your registered mobile to sign in.",
    otp: (phone: string) => `We sent a 6-digit code to +91 ${phone}.`,
    register: () => "One last step before you join the league.",
} as const;

/* ---------- helpers (visual, in-file) ---------- */

function AuthShell({ children }: { children: React.ReactNode }) {
    return <main className="auth-shell">{children}</main>;
}

function AuthCard({ children }: { children: React.ReactNode }) {
    return <div className="auth-card">{children}</div>;
}

function StepPill({ label }: { label: string }) {
    return (
        <div className="auth-step-pill">
            <span className="auth-step-dot" />
            {label}
        </div>
    );
}

function AuthField({
    label,
    htmlFor,
    children,
}: {
    label: string;
    htmlFor: string;
    children: React.ReactNode;
}) {
    return (
        <div className="auth-field">
            <label htmlFor={htmlFor} className="auth-field-label">
                {label}
            </label>
            {children}
        </div>
    );
}

function PhoneInput({
    id,
    value,
    onChange,
    disabled,
    autoFocus,
}: {
    id: string;
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    autoFocus?: boolean;
}) {
    return (
        <div className="auth-phone-wrap">
            <span className="auth-phone-prefix">
                <Phone size={13} /> +91
            </span>
            <input
                id={id}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel"
                autoFocus={autoFocus}
                disabled={disabled}
                className="auth-field-input auth-phone-input"
                value={value}
                onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
        </div>
    );
}

function OtpInput({
    value,
    onChange,
    disabled,
}: {
    value: ReadonlyArray<string>;
    onChange: (next: string[]) => void;
    disabled?: boolean;
}) {
    const refs = useRef<(HTMLInputElement | null)[]>([]);
    const update = (i: number, v: string) => {
        const digit = v.replace(/\D/g, "").slice(-1);
        const next = [...value];
        next[i] = digit;
        onChange(next);
        if (digit && i < 5) refs.current[i + 1]?.focus();
        if (!digit && i > 0) refs.current[i - 1]?.focus();
    };
    return (
        <div className="auth-otp-row">
            {value.map((d, i) => (
                <input
                    key={i}
                    ref={(el) => {
                        refs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    aria-label={`Digit ${i + 1}`}
                    disabled={disabled}
                    className={`auth-otp-cell ${d ? "filled" : ""}`}
                    value={d}
                    onChange={(e) => update(i, e.target.value)}
                    autoFocus={i === 0}
                />
            ))}
        </div>
    );
}

function PrimaryButton({
    busy,
    busyLabel,
    children,
    disabled,
    type = "button",
    onClick,
}: {
    busy: boolean;
    busyLabel: string;
    children: React.ReactNode;
    disabled?: boolean;
    type?: "button" | "submit";
    onClick?: () => void;
}) {
    return (
        <button
            type={type}
            className="auth-submit"
            disabled={busy || disabled}
            aria-busy={busy}
            onClick={onClick}
        >
            {busy ? (
                <>
                    <Loader2 size={16} className="animate-spin" /> {busyLabel}
                </>
            ) : (
                children
            )}
        </button>
    );
}

/* ---------- main component ---------- */

export default function AuthClient({
    next,
    initialMode,
}: {
    next: string;
    initialMode: "register" | "login";
}) {
    const router = useRouter();
    const { settings } = useSiteSettings();
    const [step, setStep] = useState<Step>("phone");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
    const [otpExpiresIn, setOtpExpiresIn] = useState(0);
    const [resendIn, setResendIn] = useState(0);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", role: "batsman", state: "", city: "" });
    const [orderId, setOrderId] = useState<string | null>(null);
    const [paymentId, setPaymentId] = useState<string | null>(null);

    useEffect(() => {
        if (otpExpiresIn <= 0) return;
        const t = setTimeout(() => setOtpExpiresIn((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [otpExpiresIn]);

    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendIn]);

    const sendOtp = async (): Promise<boolean> => {
        if (!isValidPhone(phone)) {
            toast({ variant: "destructive", title: "Invalid phone", description: "Enter a 10-digit mobile number." });
            return false;
        }
        setBusy(true);
        try {
            const res = await api.post<{ expiresInSec: number }>("/api/auth/send-otp", { phone });
            if (!res.ok) {
                toast({ variant: "destructive", title: "Failed", description: res.error || "Could not send OTP" });
                return false;
            }
            setOtpExpiresIn(Math.floor(res.data?.expiresInSec ?? 300));
            setResendIn(60);
            setStep("otp");
            return true;
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err?.message || "Network error" });
            return false;
        } finally {
            setBusy(false);
        }
    };

    const submitPhone = async (e: React.FormEvent) => {
        e.preventDefault();
        await sendOtp();
    };

    const submitOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isCompleteOtp(otp)) return;
        const code = otp.join("");
        setBusy(true);
        try {
            const res = await api.post<{ exists: boolean; user?: any; redirect?: string }>(
                "/api/auth/verify-otp",
                { phone, otp: code }
            );
            if (!res.ok) {
                toast({ variant: "destructive", title: "Incorrect OTP", description: res.error || "Try again" });
                setOtp(["", "", "", "", "", ""]);
                return;
            }
            if (res.data.exists) {
                toast({ title: "Welcome back!" });
                router.replace(res.data.redirect || FALLBACK_NEXT);
                return;
            }
            if (initialMode === "register") {
                setStep("register");
            } else {
                toast({ title: "New user", description: "Continue registration." });
                router.replace("/auth?mode=register&next=" + encodeURIComponent(next));
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err?.message || "Network error" });
        } finally {
            setBusy(false);
        }
    };

    const submitRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.state || !form.city) {
            toast({ variant: "destructive", title: "Missing fields", description: "All fields are required." });
            return;
        }
        if (!orderId || !paymentId) {
            toast({ variant: "destructive", title: "Payment required", description: "Complete payment first." });
            return;
        }
        setBusy(true);
        try {
            const res = await api.post<{ redirect?: string }>("/api/auth/register", {
                ...form,
                orderId,
                paymentId,
            });
            if (!res.ok) {
                toast({ variant: "destructive", title: "Failed", description: res.error || "Could not register" });
                return;
            }
            toast({ title: "Welcome to BRPL!" });
            router.replace(res.data.redirect || FALLBACK_NEXT);
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err?.message || "Network error" });
        } finally {
            setBusy(false);
        }
    };

    const startPayment = async () => {
        setBusy(true);
        try {
            const res = await api.post<{ orderId: string; amount: number; currency: string; key: string }>(
                "/api/payment/create-order"
            );
            if (!res.ok) {
                toast({ variant: "destructive", title: "Payment init failed", description: res.error });
                return;
            }
            setOrderId(res.data.orderId);
            if (!(window as any).Razorpay) {
                await new Promise<void>((resolve, reject) => {
                    const s = document.createElement("script");
                    s.src = "https://checkout.razorpay.com/v1/checkout.js";
                    s.async = true;
                    s.onload = () => resolve();
                    s.onerror = () => reject(new Error("Failed to load Razorpay"));
                    document.body.appendChild(s);
                });
            }
            const rzp = new (window as any).Razorpay({
                key: res.data.key,
                amount: res.data.amount,
                currency: res.data.currency,
                name: settings?.siteName || "BRPL",
                description: "Player Registration",
                order_id: res.data.orderId,
                prefill: { contact: phone },
                handler: async (resp: any) => {
                    setPaymentId(resp.razorpay_payment_id);
                    const v = await api.post("/api/payment/verify", {
                        orderId: resp.razorpay_order_id,
                        paymentId: resp.razorpay_payment_id,
                        signature: resp.razorpay_signature,
                    });
                    if (v.ok) {
                        toast({ title: "Payment successful", description: "Now complete your details." });
                    } else {
                        toast({ variant: "destructive", title: "Verification failed", description: v.error });
                    }
                },
                modal: { ondismiss: () => setBusy(false) },
            });
            rzp.open();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Payment error", description: err?.message || "Unknown" });
        } finally {
            setBusy(false);
        }
    };

    const auxLabel = initialMode === "register" ? "Already a player?" : "New to BRPL?";
    const auxAction = initialMode === "register" ? "Sign in" : "Create account";
    const auxHref = `/auth?mode=${initialMode === "register" ? "login" : "register"}&next=${encodeURIComponent(next)}`;

    return (
        <AuthShell>
            <div className="auth-stage">
                <Link href="/" className="auth-brand" aria-label="Back to home">
                    <span className="auth-brand-dot" />
                    <span>
                        <span className="auth-brand-text">BRPL</span>
                        <span className="auth-brand-sub">Bharat Regional Premier League</span>
                    </span>
                </Link>

                <AuthCard>
                    <StepPill label={STEP_LABEL[step]} />
                    <h1 className="auth-title">
                        {step === "phone"
                            ? STEP_TITLE.phone(initialMode)
                            : step === "otp"
                                ? STEP_TITLE.otp()
                                : STEP_TITLE.register()}
                    </h1>
                    <p className="auth-sub">
                        {step === "phone"
                            ? STEP_SUB.phone(initialMode)
                            : step === "otp"
                                ? STEP_SUB.otp(phone)
                                : STEP_SUB.register()}
                    </p>

                    {step === "phone" && (
                        <form onSubmit={submitPhone}>
                            <AuthField label="Mobile Number" htmlFor="phone">
                                <PhoneInput
                                    id="phone"
                                    value={phone}
                                    onChange={setPhone}
                                    disabled={busy}
                                    autoFocus
                                />
                            </AuthField>

                            <PrimaryButton
                                type="submit"
                                busy={busy}
                                busyLabel="Sending"
                            >
                                Send OTP →
                            </PrimaryButton>

                            <div className="auth-trust">
                                <ShieldCheck size={16} />
                                <span>Your information is encrypted and never shared.</span>
                            </div>

                            <div className="auth-aux">
                                <span>{auxLabel}</span>
                                <Link href={auxHref}>{auxAction}</Link>
                            </div>
                        </form>
                    )}

                    {step === "otp" && (
                        <form onSubmit={submitOtp}>
                            <OtpInput value={otp} onChange={setOtp} disabled={busy} />

                            <div className="auth-otp-meta">
                                <span>
                                    <Lock size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                                    {otpExpiresIn > 0
                                        ? `Expires in ${formatOtpExpiry(otpExpiresIn)}`
                                        : "OTP expired"}
                                </span>
                                {resendIn > 0 ? (
                                    <span>Resend in {resendIn}s</span>
                                ) : (
                                    <button
                                        type="button"
                                        className="auth-ghost"
                                        onClick={sendOtp}
                                        disabled={busy}
                                    >
                                        Resend code
                                    </button>
                                )}
                            </div>

                            <PrimaryButton
                                type="submit"
                                busy={busy}
                                busyLabel="Verifying"
                                disabled={!isCompleteOtp(otp)}
                            >
                                Verify &amp; continue <CheckCircle2 size={14} />
                            </PrimaryButton>

                            <div className="auth-aux">
                                <span>Wrong number?</span>
                                <button
                                    type="button"
                                    className="auth-ghost"
                                    onClick={() => {
                                        setOtp(["", "", "", "", "", ""]);
                                        setStep("phone");
                                    }}
                                >
                                    Change
                                </button>
                            </div>
                        </form>
                    )}

                    {step === "register" && (
                        <form onSubmit={submitRegister}>
                            {!orderId && (
                                <div className="auth-fee">
                                    <div className="auth-fee-row">
                                        <div className="auth-fee-label">Registration Fee</div>
                                        <div className="auth-fee-amount">{REGISTRATION_FEE_DISPLAY}</div>
                                    </div>
                                    <p className="auth-fee-note">
                                        Covers trials, official kit and processing.
                                    </p>
                                    <PrimaryButton
                                        type="button"
                                        busy={busy}
                                        busyLabel="Opening"
                                        onClick={startPayment}
                                    >
                                        Pay {REGISTRATION_FEE_DISPLAY}
                                    </PrimaryButton>
                                </div>
                            )}

                            {orderId && !paymentId && (
                                <div className="auth-info">
                                    Complete the payment in the Razorpay window, then return here.
                                </div>
                            )}

                            {paymentId && (
                                <>
                                    <AuthField label="Full name" htmlFor="reg-name">
                                        <input
                                            id="reg-name"
                                            className="auth-field-input"
                                            required
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        />
                                    </AuthField>
                                    <AuthField label="Email address" htmlFor="reg-email">
                                        <input
                                            id="reg-email"
                                            type="email"
                                            className="auth-field-input"
                                            required
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        />
                                    </AuthField>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                        <AuthField label="Role" htmlFor="reg-role">
                                            <select
                                                id="reg-role"
                                                className="auth-field-input"
                                                value={form.role}
                                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                                            >
                                                <option value="batsman">Batsman</option>
                                                <option value="bowler">Bowler</option>
                                                <option value="allrounder">All-rounder</option>
                                                <option value="wicketkeeper">Wicket-keeper</option>
                                            </select>
                                        </AuthField>
                                        <AuthField label="State" htmlFor="reg-state">
                                            <input
                                                id="reg-state"
                                                className="auth-field-input"
                                                required
                                                value={form.state}
                                                onChange={(e) => setForm({ ...form, state: e.target.value })}
                                            />
                                        </AuthField>
                                    </div>
                                    <AuthField label="City" htmlFor="reg-city">
                                        <input
                                            id="reg-city"
                                            className="auth-field-input"
                                            required
                                            value={form.city}
                                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                                        />
                                    </AuthField>

                                    <PrimaryButton
                                        type="submit"
                                        busy={busy}
                                        busyLabel="Finishing"
                                    >
                                        Complete registration <CheckCircle2 size={14} />
                                    </PrimaryButton>
                                </>
                            )}
                        </form>
                    )}
                </AuthCard>

                <div className="auth-foot">
                    <span className="auth-foot-dot" />
                    <span>Trials live · Mumbai · Bengaluru · Guwahati</span>
                </div>
            </div>
        </AuthShell>
    );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit 2>&1 | tail -30`
Expected: no errors. (If you see only pre-existing errors unrelated to this file, confirm they predate this change with `git stash && npx tsc --noEmit 2>&1 | tail -30 && git stash pop`.)

- [ ] **Step 3: Verify the file size shrank**

Run: `wc -l src/app/auth/AuthClient.tsx`
Expected: between 280 and 360 lines (down from 570).

- [ ] **Step 4: Commit**

```bash
git add src/app/auth/AuthClient.tsx
git -c user.email="noreply@anthropic.com" -c user.name="Claude" commit -m "feat(auth): rebuild AuthClient with Stadium layout and shadcn primitives"
```

---

## Task 8: Run the full test suite and lint

**Files:** none

- [ ] **Step 1: Run vitest**

Run: `npm test 2>&1 | tail -30`
Expected: all tests pass (including the new auth-helpers tests). If integration tests fail because `MONGODB_URI` is unset, that is pre-existing and out of scope — focus on `tests/lib/auth-helpers.test.ts` passing.

- [ ] **Step 2: Run lint**

Run: `npm run lint 2>&1 | tail -30`
Expected: no new errors introduced by this change. Pre-existing warnings are OK.

- [ ] **Step 3: Run a typecheck**

Run: `npx tsc --noEmit 2>&1 | tail -30`
Expected: no new errors.

- [ ] **Step 4: Confirm no other files were modified**

Run: `git status --short`
Expected: shows no uncommitted changes.

---

## Task 9: Manual smoke test in a real browser

**Files:** none

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server starts on `http://localhost:3000`.

- [ ] **Step 2: Walk the phone step**

In a browser, open `http://localhost:3000/auth?mode=register&next=/dashboard`.

Verify:
- [ ] Page background is deep pitch green.
- [ ] Brand row "● BRPL · Bharat Regional Premier League" sits above the card.
- [ ] "STEP 01 OF 03" pill is visible in green.
- [ ] Title "Welcome to BRPL" and sub copy are visible.
- [ ] "MOBILE NUMBER" label is above the input.
- [ ] Input has `+91` prefix inside the left edge, separated by a divider.
- [ ] Typing digits updates the input. Non-digits are stripped.
- [ ] Clicking "Send OTP" with 9 digits shows a destructive toast and stays on the page.
- [ ] Tabbing through the page shows a visible amber focus ring on each input.

- [ ] **Step 3: Walk the OTP step**

Continue from the phone step. (If your dev environment doesn't actually send SMS, mock the API or use a phone number that triggers your dev-only path.)

Verify:
- [ ] Six OTP boxes are visible, equal width, with rounded corners.
- [ ] Typing a digit auto-advances focus to the next box.
- [ ] Backspace on an empty box moves focus to the previous box.
- [ ] "Expires in M:SS" countdown ticks down each second.
- [ ] "Resend in 30s" becomes "Resend code" button after 30s.
- [ ] Submit button is disabled until all 6 boxes are filled.
- [ ] After submitting a valid code, you advance to the register step.

- [ ] **Step 4: Walk the register step**

Verify:
- [ ] Before payment, the orange fee card shows "₹1,499" and a "Pay ₹1,499" button.
- [ ] Clicking Pay opens the Razorpay checkout (or, in dev with no keys, fails gracefully with a toast).
- [ ] After successful payment, the form (name, email, role, state, city) appears.
- [ ] All form inputs use the same height/radius/focus style as the phone input.
- [ ] Submitting with an empty field shows a destructive toast.
- [ ] Submitting all fields redirects to `/dashboard` (or the configured `next`).

- [ ] **Step 5: Walk the login variant**

Open `http://localhost:3000/auth?mode=login&next=/dashboard`.

Verify:
- [ ] Title is "Welcome back", sub copy is "Enter your registered mobile to sign in."
- [ ] Aux row says "New to BRPL? Create account" and links to `?mode=register`.

- [ ] **Step 6: Test mobile breakpoint**

Resize the browser to 375px wide. Verify:
- [ ] Card padding shrinks (no horizontal scroll).
- [ ] OTP box height drops to 44px.
- [ ] "Bharat Regional Premier League" subtitle on the brand row hides (only "BRPL" remains).

- [ ] **Step 7: Stop the dev server**

In the terminal that ran `npm run dev`, press `Ctrl+C`.

---

## Self-Review

**Spec coverage check:**

- Goals (clean inputs/buttons, cohesive product, fast, ~250 TSX, ~150 CSS, AA contrast) — covered by Tasks 2, 5, 7.
- Aesthetic & layout (stadium, centered card) — covered by Task 7's `AuthShell` + `AuthCard`.
- Visual system & tokens — Task 1.
- Components (AuthShell, AuthCard, StepPill, AuthField, PhoneInput, OtpInput, PrimaryButton) — Task 7 implements all of them as in-file helpers.
- Files changed (AuthClient, globals.css; delete .bak) — Tasks 3, 4, 7.
- Step 1 phone behavior — Task 7 (`sendOtp`, `submitPhone`).
- Step 2 OTP behavior — Task 7 (`submitOtp`, `OtpInput`).
- Step 3 register behavior — Task 7 (`submitRegister`, `startPayment`).
- State management — Task 7 (unchanged from spec).
- Error handling table — Task 7 implements every row.
- Accessibility (labels, focus, ARIA, contrast) — Task 7 (real labels, aria-label, focus ring CSS in Task 2).
- Responsive — Task 2 (media queries at 640px and 768px).
- Performance (no continuous animations, no backdrop-filter on mobile) — Task 2 (only one-shot `auth-rise`).
- Testing (vitest coverage for helpers) — Tasks 5, 6.
- Acceptance criteria — covered by Tasks 8 and 9.

**Placeholder scan:** No "TBD" / "TODO" / "implement later" markers. All step code blocks are complete.

**Type consistency check:**

- `useState<Step>` is `"phone" | "otp" | "register"` everywhere it's referenced.
- Helper functions (`isValidPhone`, `isCompleteOtp`, `formatOtpExpiry`, `REGISTRATION_FEE_DISPLAY`) are defined in Task 5 and imported by Task 7.
- `busy` state and `setBusy` exist in the component; `PrimaryButton` accepts `busy` and `busyLabel`.
- `form.role` default is `"batsman"`; select options include `batsman`, `bowler`, `allrounder`, `wicketkeeper` — consistent.
- `phone` is `string`, `otp` is `string[]` of length 6 — consistent across `sendOtp`, `submitOtp`, `OtpInput`.
- `orderId` and `paymentId` are `string | null` — consistent.
- `Step` type excludes `"loading"` (the old code had it but never used it; spec says it can be dropped).

All consistent. Plan is ready.
