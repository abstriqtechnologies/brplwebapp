# Auth Spark Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/auth` visually attractive with a brand-aligned gradient background, glass-morphism card, animated conic-gradient border, and floating spark orbs — without changing any business logic.

**Architecture:** Two-file change. `globals.css` gets a new `Auth — Spark` block that replaces the existing `Auth — Stadium` background/card/pill/input rules with a 4-layer gradient canvas + frosted glass card + animated conic ring. `auth-components.tsx` `AuthShell` renders 4 absolutely-positioned spark `<span>` elements (aria-hidden) inside the shell. No state, hooks, or API surface changes. Pure-function tests stay green; new visual tests verify the orbs render and the shell markup is intact.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, vitest (node), Testing Library.

**Reference spec:** [docs/superpowers/specs/2026-06-24-auth-spark-redesign-design.md](docs/superpowers/specs/2026-06-24-auth-spark-redesign-design.md)

---

## File Structure

**Modified files:**

- `src/app/globals.css` — replace the `/* Auth — Stadium */` block (lines ~494-877) with a new `/* Auth — Spark */` block. Add spark color tokens to `:root` and `.dark`.
- `src/app/auth/auth-components.tsx` — modify `AuthShell` to render 4 spark `<span>` elements inside the shell, after the children (or before — see task 2 for ordering).

**Created files:**

- `tests/components/AuthShell.test.tsx` — render `AuthShell` and assert: shell wrapper has class `auth-shell`; exactly 4 elements with class `auth-spark` are rendered; all spark spans are `aria-hidden`; children render normally.
- `tests/components/auth-css.test.ts` — parse the new globals.css block and assert: tokens defined, keyframes defined, `.auth-spark` rules present, `.auth-card::before` rule present. Static text grep (no CSS-in-JS runtime needed).

**Unchanged files** (do not touch):

- `src/app/auth/AuthClient.tsx`
- `src/app/auth/auth-helpers.ts`
- `src/app/auth/page.tsx`
- All API routes
- All hooks

---

## Task 1: Add spark color tokens to globals.css

**Files:**
- Modify: `src/app/globals.css:47-60` (`:root` token block) and `src/app/globals.css:101-113` (`.dark` token block)

- [ ] **Step 1: Add tokens to `:root`**

In `src/app/globals.css`, locate the `:root { ... }` block. Find the line `--cream-500: rgba(245, 241, 234, 0.4);` and add the following six new lines after it (still inside `:root`):

```css
    /* Spark — auth background & glass tokens (light fallback) */
    --spark-bg: #020617;
    --spark-blue: #1d4ed8;
    --spark-blue-soft: #3b82f6;
    --spark-yellow: #FFC928;
    --spark-glass: rgba(17, 26, 69, 0.55);
    --spark-input-bg: #0b1428;
```

- [ ] **Step 2: Add tokens to `.dark`**

In `src/app/globals.css`, locate the `.dark { ... }` block. Find the line `--cream-500: rgba(245, 241, 234, 0.4);` and add the same six lines after it (still inside `.dark`):

```css
    /* Spark — auth background & glass tokens (dark = primary) */
    --spark-bg: #020617;
    --spark-blue: #1d4ed8;
    --spark-blue-soft: #3b82f6;
    --spark-yellow: #FFC928;
    --spark-glass: rgba(17, 26, 69, 0.55);
    --spark-input-bg: #0b1428;
```

- [ ] **Step 3: Verify the file still parses**

Run: `grep -n "spark-bg\|spark-blue\|spark-yellow\|spark-glass\|spark-input-bg" src/app/globals.css`
Expected: 12 lines matched (6 in `:root`, 6 in `.dark`).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(auth): add spark color tokens for gradient + glass redesign"
```

---

## Task 2: Write failing test for AuthShell spark rendering

**Files:**
- Create: `tests/components/AuthShell.test.tsx`

- [ ] **Step 1: Install Testing Library if missing**

Run: `grep -q "@testing-library/react" package.json && echo OK || npm i -D @testing-library/react@^14 @testing-library/dom`
Expected: prints `OK` if already present; otherwise installs.

- [ ] **Step 2: Add `jsdom` dev dep if missing**

Run: `grep -q "\"jsdom\"" package.json && echo OK || npm i -D jsdom`
Expected: prints `OK` if already present; otherwise installs.

- [ ] **Step 3: Register `jsdom` env for the components folder**

Open `vitest.config.ts`. Change `include: ["tests/**/*.test.ts"]` to `include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"]`. Leave `environment: "node"` as default — but add a per-file override comment in the new test (Step 4) using `// @vitest-environment jsdom`.

- [ ] **Step 4: Write the test file**

Create `tests/components/AuthShell.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AuthShell } from "@/app/auth/auth-components";

describe("AuthShell", () => {
  it("renders a div with class auth-shell", () => {
    const { container } = render(<AuthShell><span data-testid="kid" /></AuthShell>);
    const shell = container.querySelector(".auth-shell");
    expect(shell).not.toBeNull();
  });

  it("renders exactly 4 spark elements with class auth-spark", () => {
    const { container } = render(<AuthShell><span data-testid="kid" /></AuthShell>);
    const sparks = container.querySelectorAll(".auth-spark");
    expect(sparks.length).toBe(4);
  });

  it("marks every spark as aria-hidden (decorative)", () => {
    const { container } = render(<AuthShell><span data-testid="kid" /></AuthShell>);
    const sparks = Array.from(container.querySelectorAll(".auth-spark"));
    expect(sparks.length).toBeGreaterThan(0);
    for (const s of sparks) {
      expect(s.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("still renders its children inside the shell", () => {
    const { getByTestId } = render(<AuthShell><span data-testid="kid">hello</span></AuthShell>);
    expect(getByTestId("kid").textContent).toBe("hello");
  });

  it("applies both blue and yellow spark variants", () => {
    const { container } = render(<AuthShell><span /></AuthShell>);
    const html = container.innerHTML;
    expect(html).toMatch(/auth-spark--blue/);
    expect(html).toMatch(/auth-spark--yellow/);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- tests/components/AuthShell.test.tsx`
Expected: FAIL. The current `AuthShell` renders only `{children}` inside a div with no `.auth-spark` elements, so the count and class assertions fail.

- [ ] **Step 6: Commit the failing test**

```bash
git add tests/components/AuthShell.test.tsx vitest.config.ts package.json package-lock.json
git commit -m "test(auth): cover AuthShell spark rendering"
```

---

## Task 3: Add spark orbs to AuthShell

**Files:**
- Modify: `src/app/auth/auth-components.tsx:11-13`

- [ ] **Step 1: Replace `AuthShell` with the version that renders 4 spark spans**

Open `src/app/auth/auth-components.tsx`. Replace the existing `AuthShell` (lines 11-13) with:

```tsx
export function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="auth-shell">
            <span className="auth-spark auth-spark--blue-1" aria-hidden="true" />
            <span className="auth-spark auth-spark--blue-2" aria-hidden="true" />
            <span className="auth-spark auth-spark--yellow-1" aria-hidden="true" />
            <span className="auth-spark auth-spark--yellow-2" aria-hidden="true" />
            {children}
        </div>
    );
}
```

- [ ] **Step 2: Run the AuthShell test to verify it passes**

Run: `npm test -- tests/components/AuthShell.test.tsx`
Expected: PASS — all 5 assertions green.

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors related to `auth-components.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/app/auth/auth-components.tsx
git commit -m "feat(auth): render 4 spark orbs in AuthShell"
```

---

## Task 4: Write failing CSS contract test for the new Spark block

**Files:**
- Create: `tests/components/auth-css.test.ts`

- [ ] **Step 1: Write the test file**

Create `tests/components/auth-css.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "../../src/app/globals.css"), "utf8");

describe("Auth Spark CSS contract", () => {
  it("defines the spark color tokens in both :root and .dark", () => {
    const tokens = ["--spark-bg", "--spark-blue", "--spark-blue-soft", "--spark-yellow", "--spark-glass", "--spark-input-bg"];
    const rootIdx = css.indexOf(":root");
    const darkIdx = css.indexOf(".dark");
    for (const t of tokens) {
      expect(css.indexOf(`${t}:`)).toBeGreaterThan(0);
      expect(css.indexOf(`${t}:`)).toBeLessThan(darkIdx);
    }
    // In .dark block too
    for (const t of tokens) {
      const after = css.slice(darkIdx);
      expect(after.includes(`${t}:`)).toBe(true);
    }
  });

  it("replaces the Stadium auth background with the Spark layered canvas", () => {
    expect(css).toMatch(/\.auth-shell\s*\{[^}]*background:\s*#020617/);
    expect(css).toMatch(/\.auth-shell\s*\{[^}]*radial-gradient/);
  });

  it("defines the four spark orb variants with pointer-events none", () => {
    for (const v of ["blue-1", "blue-2", "yellow-1", "yellow-2"]) {
      expect(css).toContain(`.auth-spark--${v}`);
    }
    expect(css).toMatch(/\.auth-spark\s*\{[^}]*pointer-events:\s*none/);
  });

  it("adds the animated conic-gradient ring on .auth-card::before", () => {
    expect(css).toMatch(/\.auth-card::before\s*\{[^}]*conic-gradient/);
    expect(css).toMatch(/\.auth-card::before\s*\{[^}]*animation:/);
    expect(css).toContain("@keyframes auth-spark-ring");
  });

  it("tunes .auth-field-input focus to brand yellow #FFC928", () => {
    expect(css).toMatch(/\.auth-field-input:focus\s*\{[^}]*border-color:\s*#FFC928/);
  });

  it("disables spark orbs under prefers-reduced-motion", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.auth-spark\s*\{[^}]*animation:\s*none/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/auth-css.test.ts`
Expected: FAIL — none of the new `.auth-spark`, `.auth-card::before`, or `#FFC928` focus rules exist yet.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/components/auth-css.test.ts
git commit -m "test(auth): contract test for spark CSS layer"
```

---

## Task 5: Replace the Stadium auth CSS block with the Spark block

**Files:**
- Modify: `src/app/globals.css:494-877` (the entire `/* Auth — Stadium */` block, from `/* =====...=== */` through the closing `}` of the `@media (max-width: 640px)` rule)

- [ ] **Step 1: Locate the start of the Stadium block**

Run: `grep -n "Auth — Stadium\|Auth — Spark" src/app/globals.css`
Expected: shows line for `Auth — Stadium`. If a `Spark` block already exists, stop and report — do not duplicate.

- [ ] **Step 2: Locate the end of the Stadium block**

The Stadium block runs from its banner comment (`/* =====... Auth — Stadium ... ===== */`) through the closing `}` of the final `@media (max-width: 640px) { ... }` rule, which is the last rule in the file. Confirm with:

Run: `wc -l src/app/globals.css`
Expected: ~878 lines.

- [ ] **Step 3: Replace the Stadium block with the Spark block**

Delete everything from the Stadium banner comment through end of file. Then append the following block (preserve a single trailing newline):

```css
/* ============================================
   Auth — Spark
   Layered gradient canvas, frosted-glass card,
   animated conic ring, drifting spark orbs.
   Brand palette: navy #111a45 + yellow #FFC928.
   ============================================ */

@keyframes auth-rise {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes auth-spark-ring {
  to { transform: rotate(360deg); }
}

/* ---------- Shell: layered gradient + grid ---------- */

.auth-shell {
  min-height: 100dvh;
  width: 100%;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1.25rem, 3vw, 2.5rem);
  font-family: var(--font-inter), 'Inter', sans-serif;
  color: var(--cream-50);
  background-color: var(--spark-bg);
  background-image:
    radial-gradient(circle at 12% 18%, rgba(59, 130, 246, 0.45) 0%, transparent 55%),
    radial-gradient(circle at 88% 82%, rgba(255, 201, 40, 0.40) 0%, transparent 55%),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M32 0H0V32' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1'/></svg>");
  background-repeat: no-repeat, no-repeat, repeat;
  background-size: auto, auto, 32px 32px;
}

/* ---------- Spark orbs (decorative, above gradient, below card) ---------- */

.auth-spark {
  position: absolute;
  border-radius: 9999px;
  filter: blur(60px);
  pointer-events: none;
  z-index: 0;
  will-change: transform;
  animation: float 7s ease-in-out infinite;
}

.auth-spark--blue-1   { top: 12%;  left: 8%;  width: 220px; height: 220px; background: rgba(59, 130, 246, 0.32); }
.auth-spark--blue-2   { bottom: 18%; left: 10%; width: 180px; height: 180px; background: rgba(29, 78, 216, 0.28); animation-delay: -2s; }
.auth-spark--yellow-1 { top: 10%;  right: 6%; width: 200px; height: 200px; background: rgba(255, 201, 40, 0.28); animation-delay: -3s; }
.auth-spark--yellow-2 { bottom: 10%; right: 12%; width: 240px; height: 240px; background: rgba(255, 201, 40, 0.22); animation-delay: -5s; }

@media (max-width: 640px) {
  .auth-spark { width: 140px; height: 140px; filter: blur(40px); }
}

@media (prefers-reduced-motion: reduce) {
  .auth-spark { animation: none; }
}

/* ---------- Stage: rises into view, sits above orbs ---------- */

.auth-stage {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  animation: auth-rise 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .auth-stage { animation: none; }
}

/* ---------- Brand mark ---------- */

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
.auth-brand:hover { color: var(--spark-yellow); }

.auth-brand-dot {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: var(--spark-yellow);
  box-shadow: 0 0 12px rgba(255, 201, 40, 0.7);
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

/* ---------- Card: frosted glass + animated conic ring ---------- */

.auth-card {
  position: relative;
  z-index: 1;
  width: 100%;
  overflow: hidden;
  border-radius: 18px;
  padding: 2rem 1.75rem;
  background: linear-gradient(135deg, rgba(17, 26, 69, 0.62), rgba(17, 26, 69, 0.32));
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    0 30px 80px -20px rgba(0, 0, 0, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.auth-card::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    #FFC928 60deg,
    transparent 120deg,
    #3b82f6 240deg,
    transparent 360deg
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
          mask-composite: exclude;
  opacity: 0.7;
  pointer-events: none;
  animation: auth-spark-ring 12s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .auth-card::before { animation: none; opacity: 0.35; }
}

/* ---------- Step pill (glass chip) ---------- */

.auth-step-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.7rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-family: var(--font-space-grotesk), 'Space Grotesk', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--spark-yellow);
  margin-bottom: 1rem;
}

.auth-step-pill .auth-step-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: var(--spark-yellow);
  box-shadow: 0 0 8px rgba(255, 201, 40, 0.8);
  animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .auth-step-pill .auth-step-dot { animation: none; }
}

/* ---------- Typography ---------- */

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

/* ---------- Form fields (spark input) ---------- */

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
  background: var(--spark-input-bg);
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
.auth-field-input:hover { border-color: rgba(255, 201, 40, 0.45); }
.auth-field-input:focus {
  border-color: #FFC928;
  background: rgba(255, 201, 40, 0.06);
  box-shadow: 0 0 0 4px rgba(255, 201, 40, 0.18);
}
.auth-field-input:disabled { opacity: 0.6; cursor: not-allowed; }

.auth-phone-wrap { position: relative; }

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
.auth-phone-wrap:focus-within .auth-phone-prefix { color: #FFC928; }

select.auth-field-input {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'><path d='M1 1.5L6 6.5L11 1.5' stroke='%23FFC928' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/></svg>");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 12px 8px;
  padding-right: 2.5rem;
}
select.auth-field-input option { background: #0b1428; color: #f7f1e6; }

/* ---------- OTP cells ---------- */

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
  background: var(--spark-input-bg);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  outline: none;
  caret-color: transparent;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}
.auth-otp-cell:focus {
  border-color: #FFC928;
  background: rgba(255, 201, 40, 0.06);
  box-shadow: 0 0 0 4px rgba(255, 201, 40, 0.18);
}
.auth-otp-cell.filled {
  border-color: rgba(255, 201, 40, 0.7);
  background: rgba(255, 201, 40, 0.12);
}

/* ---------- Submit (amber gradient, brand yellow glow) ---------- */

.auth-submit {
  width: 100%;
  height: 52px;
  margin-top: 0.5rem;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #b45309 100%);
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
  box-shadow: 0 16px 40px -10px rgba(245, 158, 11, 0.7);
  transition: transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease;
}
.auth-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 20px 50px -10px rgba(245, 158, 11, 0.85);
}
.auth-submit:active:not(:disabled) { transform: translateY(0); filter: brightness(0.98); }
.auth-submit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

/* ---------- Ghost links (resend / change) ---------- */

.auth-ghost {
  background: none;
  border: 0;
  color: var(--spark-yellow);
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  font-family: inherit;
  border-bottom: 1px solid rgba(255, 201, 40, 0.3);
  transition: color 0.2s ease, border-color 0.2s ease;
}
.auth-ghost:hover { color: #ffda6b; border-bottom-color: #ffda6b; }
.auth-ghost:disabled { color: var(--cream-500); cursor: default; border-bottom-color: transparent; }

/* ---------- Aux links row ---------- */

.auth-aux {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.25rem;
  font-size: 0.82rem;
  color: var(--cream-300);
}
.auth-aux a {
  color: var(--spark-yellow);
  text-decoration: none;
  font-weight: 500;
  border-bottom: 1px solid rgba(255, 201, 40, 0.3);
  transition: color 0.2s ease, border-color 0.2s ease;
}
.auth-aux a:hover { color: #ffda6b; border-bottom-color: #ffda6b; }

/* ---------- Trust strip ---------- */

.auth-trust {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 1.25rem;
  padding: 0.8rem 0.9rem;
  border-radius: 12px;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.20);
  font-size: 0.8rem;
  color: rgba(220, 252, 231, 0.85);
}
.auth-trust svg { flex-shrink: 0; color: var(--pitch-500); }

/* ---------- Fee card (register step) ---------- */

.auth-fee {
  border-radius: 14px;
  border: 1px solid rgba(255, 201, 40, 0.30);
  background: linear-gradient(160deg, rgba(255, 201, 40, 0.10), rgba(255, 201, 40, 0.03));
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
  color: var(--spark-yellow);
}
.auth-fee-amount {
  font-family: var(--font-fraunces), 'Fraunces', serif;
  font-size: 1.4rem;
  font-weight: 500;
  color: #ffda6b;
}
.auth-fee-note {
  font-size: 0.82rem;
  color: var(--cream-300);
  margin: 0 0 0.85rem;
}

.auth-info {
  border-radius: 14px;
  border: 1px solid rgba(14, 165, 183, 0.30);
  background: rgba(14, 165, 183, 0.06);
  padding: 0.9rem 1rem;
  font-size: 0.84rem;
  color: rgba(220, 252, 231, 0.85);
}

/* ---------- OTP meta row ---------- */

.auth-otp-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--cream-300);
  margin-bottom: 1rem;
}

/* ---------- Footer pill ---------- */

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

/* ---------- Mobile ---------- */

@media (max-width: 640px) {
  .auth-card { padding: 1.5rem 1.25rem; }
  .auth-otp-cell { height: 44px; font-size: 1.3rem; }
  .auth-title { font-size: 1.5rem; }
  .auth-brand-sub { display: none; }
}
```

- [ ] **Step 4: Run the CSS contract test**

Run: `npm test -- tests/components/auth-css.test.ts`
Expected: PASS — all 6 assertions green.

- [ ] **Step 5: Verify the file still parses**

Run: `npx tsc --noEmit`
Expected: no errors (CSS file is not typechecked; this catches any accidental JSX-style breakage from a wrong edit).

- [ ] **Step 6: Build smoke-check**

Run: `npm run build 2>&1 | tail -20`
Expected: build completes; warnings about Tailwind purging CSS classes you don't use are acceptable; no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(auth): replace Stadium block with Spark gradient + glass card"
```

---

## Task 6: Run full test suite + lint + verify

**Files:** none modified

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: all suites green, including:
- `tests/lib/auth-helpers.test.ts` (existing — pure functions, untouched)
- `tests/components/AuthShell.test.tsx` (new — 5 assertions)
- `tests/components/auth-css.test.ts` (new — 6 assertions)
- `tests/api/*.test.ts` (existing)

- [ ] **Step 2: Run lint**

Run: `npm run lint 2>&1 | tail -20`
Expected: no new errors. Pre-existing warnings are fine.

- [ ] **Step 3: Manual visual smoke-check**

Start the dev server: `npm run dev` (in background). Then navigate to `http://localhost:3000/auth?mode=register` and confirm:
- Dark gradient background visible (blue glow top-left, yellow glow bottom-right)
- Subtle white grid texture overlays the background
- 4 soft spark orbs slowly drift in the background
- Card is frosted glass with rotating yellow/blue conic ring
- Brand mark + step pill + form fields all render with spark styling
- Pressing Tab moves focus to inputs and shows the yellow focus ring
- Step 01 → 02 (after sending OTP) → 03 (after verifying) all transition without visual breakage

- [ ] **Step 4: Kill the dev server**

Run: `pkill -f "next dev"` (only if you started it manually for verification).

- [ ] **Step 5: Final commit if anything tweaked**

```bash
git status --short
# If anything is dirty, commit with a focused message, e.g.:
# git commit -am "fix(auth): visual tweaks after smoke check"
```

If everything is clean: no commit.

---

## Self-Review Notes

- **Spec coverage:** All 6 spec sections covered — color tokens (Task 1), shell background layers (Task 5), card glass (Task 5), step pill (Task 5), input focus (Task 5), submit glow (Task 5), spark orbs (Tasks 2-3), bug-free guarantees (Tasks 5-6), testing checklist (Task 6).
- **Placeholders:** None — every code block is the literal CSS/TSX to write.
- **Type consistency:** `AuthShell` signature unchanged (still `{ children: React.ReactNode }`). CSS class names consistent between `AuthShell` task (`auth-spark--blue-1`, etc.) and CSS contract test.
- **Risk:** Lowest possible — 2 files modified, 2 test files added. No business logic touched. Existing auth-helpers test still applies unchanged.

**End of plan.**
