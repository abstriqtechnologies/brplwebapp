# Auth Page Rebuild — Design Spec

**Date:** 2026-06-24
**Scope:** Rebuild `/auth` page visuals from scratch. Replace broken/unstructured inputs and buttons with a clean stadium-style centered card. Tighten the shared visual system by removing the dead bespoke CSS block.

## Background

The current `/auth` page renders, but its inputs, buttons, and decorative chrome look unstructured and unpolished. The implementation uses a heavily bespoke "cosmic stadium" CSS system (~800 lines in `globals.css`) with aurora orbs, animated grain, ticker lines, specular sweep, corner brackets, and floating labels. The visual weight is high; the result is messy and the floating-label logic is fragile.

This is a **full visual rebuild of `/auth`**, paired with **cleanup of the auth-specific CSS in `globals.css`**. API routes, payment flow, hooks, and provider wiring stay untouched.

## Goals

- Inputs and buttons look designed and behave correctly (clear focus, hover, disabled states).
- The page reads as one cohesive product, not a stack of disconnected effects.
- Page is fast: no continuous animations, no backdrop-blur on mobile, no decorative chrome that fights the form.
- The rebuild is small enough to reason about: ~250 lines of TSX, ~150 lines of CSS.
- Color contrast meets WCAG AA (we target AAA).

## Non-goals

- Redesigning other pages.
- Replacing the shadcn design system.
- Changing the API surface (`/api/auth/*`, `/api/payment/*`).
- Adding new auth providers or methods (still phone + OTP only).
- Adding account/email-password flows.

## Aesthetic & Layout

**Direction:** Stadium / sporty — bold typography, pitch-green ground with amber CTAs. No decorative noise.

**Layout:** Centered single card on a dark pitch-green page. Brand mark at the top, card in the middle, small "Trials live" footer line below.

```
┌─────────────────────────────────┐
│         ●  BRPL                 │
│  Bharat Regional Premier League │
│                                 │
│   ┌───────────────────────┐     │
│   │  ● STEP 01 OF 03      │     │
│   │                       │     │
│   │  Welcome to BRPL      │     │
│   │  Enter your mobile…   │     │
│   │                       │     │
│   │  MOBILE NUMBER        │     │
│   │  ┌─────────────────┐  │     │
│   │  │ +91  __________ │  │     │
│   │  └─────────────────┘  │     │
│   │                       │     │
│   │  [   SEND OTP    →  ] │     │
│   │                       │     │
│   │  Already a player?    │     │
│   │  Sign in              │     │
│   └───────────────────────┘     │
│                                 │
│  ● Trials live · 3 cities       │
└─────────────────────────────────┘
```

## Visual System (Tokens)

New tokens added to `:root` and `.dark` blocks in `globals.css`:

| Token              | Value                            | Use                          |
| ------------------ | -------------------------------- | ---------------------------- |
| `--ink-900`        | `#0d1f17`                        | Page background              |
| `--ink-800`        | `#111e18`                        | Card surface                 |
| `--ink-700`        | `#18261f`                        | Input background             |
| `--pitch-500`      | `#22c55e`                        | Success / live indicator     |
| `--pitch-700`      | `#15803d`                        | Secondary accent             |
| `--amber-500`      | `#fbbf24`                        | Primary CTA / focus ring     |
| `--amber-400`      | `#fcd34d`                        | CTA highlight                |
| `--amber-700`      | `#b45309`                        | Deep amber                   |
| `--cream-50`       | `#f7f1e6`                        | Primary text                 |
| `--cream-300`      | `rgba(245,241,234,0.55)`         | Secondary text               |
| `--cream-500`      | `rgba(245,241,234,0.4)`          | Muted text                   |

**Typography (unchanged from project):**

- Headings: `Fraunces` (serif)
- UI labels & buttons: `Space Grotesk` (uppercase, letter-spacing 0.18–0.24em)
- Body: `Inter`

**Layout tokens:**

- Card radius: `18px`
- Input radius: `10px`
- Button radius: `12px`
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32px

**Color contrast (target ≥ 7:1 AAA):**

- Amber `#fbbf24` on ink `#0d1f17` ≈ 9.5:1 ✓
- Cream `#f7f1e6` on ink `#111e18` ≈ 14:1 ✓
- Cream-300 secondary text on ink-800 ≈ 7.5:1 ✓

## Components

We use the existing shadcn primitives (`Input`, `Button`, `Label`) and wrap them with small, page-local helpers:

| Helper             | Purpose                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `<AuthShell>`      | Full-viewport dark bg, brand top, card center, footer line bottom.      |
| `<AuthCard>`       | Card surface with border, padding, radius.                              |
| `<StepPill>`       | "Step 01 of 03" badge with pulse dot.                                   |
| `<AuthField>`      | `<Label>` + `<Input>` + helper text — consistent spacing per field.     |
| `<PhoneInput>`     | Input with `+91` prefix slot inside the field border.                   |
| `<OtpInput>`       | 6 boxes with auto-advance on digit and backspace-to-prev.               |
| `<PrimaryButton>`  | Button with `auth-submit` class (amber gradient).                       |

Each helper lives in `AuthClient.tsx` (no new files). They each do one thing, so the file remains readable.

## Files Changed

1. **`src/app/auth/AuthClient.tsx`** — full rewrite (~250 lines, down from 570). Same flow, same API calls, same hooks. Visual layer rebuilt with shadcn primitives + the helpers above.

2. **`src/app/globals.css`** — targeted edit:
   - **Add** ~150 lines of new `.auth-*` rules using the new tokens.
   - **Remove** the existing `/* Auth — Cosmic Stadium */` block (~800 lines): `.auth-shell`, `.auth-orb*`, `.auth-grain`, `.auth-grid`, `.auth-card-inner::before/after` corner brackets, `.auth-card-glass::after` ticker, `.auth-card-glass::before` specular sweep, `.auth-float-label`, `.auth-stagger::before` crosshair, all `aurora-drift-*`, `ticker-flow`, `glass-sweep`, `card-rise`, `otp-pop`, `pulse-dot`, `fade-up` keyframes, `.auth-step-pill .pulse`.
   - **Keep** `:root` and `.dark` token definitions, `@layer base` body/h1-h6 rules, `.founder-card` block, `.legal-content`, `.blog-quill-editor`, `@layer utilities` (`animate-float`, etc.).
   - **Keep** `body[data-route="auth"]` chrome-hiding rules (still needed).

3. **`src/app/globals.css.bak`** — delete (left over from a prior edit; no longer needed).

## Files NOT Changed

- `src/app/auth/page.tsx` — async server component, SiteContextProvider, Suspense boundary all unchanged.
- `src/components/ClientProviders.tsx` — already hides Header/Footer when path starts with `/auth`.
- `src/lib/featureFlags.ts` — registration fee constants.
- All API routes (`/api/auth/*`, `/api/payment/*`).
- `src/hooks/useSiteSettings.ts`, `src/apihelper/api.ts`, all toast components.

## Behavior

### Step 1 — Phone

- `<PhoneInput>` (Input with `+91` prefix slot).
- Validation: `/^\d{10}$/` (unchanged).
- Submit → `api.post("/api/auth/send-otp", { phone })`. On success, set `otpExpiresIn` + `resendIn` and move to OTP step.
- Error path: destructive toast on validation/API failure; stay on phone step.
- Below the form: trust line + aux row ("Already a player? Sign in" / "New to BRPL? Create account").

### Step 2 — OTP

- 6 `<OtpInput>` boxes (auto-advance digit, backspace to prev).
- Timer line: "Expires in M:SS" + "Resend in 30s" → becomes "Resend code" ghost button.
- Submit enabled only when all 6 boxes filled.
- On submit: `api.post("/api/auth/verify-otp", { phone, otp })`. Server returns `{ exists, user?, redirect? }`.
  - `exists === true` → `router.replace(redirect || "/dashboard")`.
  - `exists === false` + `initialMode === "register"` → step 3.
  - `exists === false` + `initialMode === "login"` → redirect to `/auth?mode=register&next=...`.
- Aux row: "Wrong number? Change" → clears OTP, returns to phone step.

### Step 3 — Register

Two sub-states driven by `orderId` / `paymentId`:

- **No `orderId`:** fee card (₹1,499, "Covers trials, kit and processing") with "Pay ₹1,499" button. Calls `startPayment()` → opens Razorpay.
- **`orderId` but no `paymentId`:** info card "Complete the payment in the Razorpay window, then return here."
- **`paymentId` set:** form fields (name, email, role select, state, city) + "Complete registration" button.

On submit: `api.post("/api/auth/register", { ...form, orderId, paymentId })` → redirect.

### State Management

Unchanged from today: `useState` for `step`, `phone`, `otp[]`, `form`, `orderId`, `paymentId`, timers, `busy`. Two `useEffect`s for `otpExpiresIn` and `resendIn` countdowns. One `useRef` for OTP input refs.

### Header/Footer Hide

`ClientProviders.tsx` already hides chrome on `/auth` paths. No change.

### Step Transitions

The step content swaps via conditional render. The card itself fades in once on mount (300ms, single shot). Step-internal content cross-fades (200ms). No continuous animations on the page.

## Error Handling

| Failure                                  | UX                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Phone invalid (not 10 digits)            | Destructive toast; stay on phone step                               |
| `/api/auth/send-otp` failure             | Toast with `res.error || "Could not send OTP"`; stay on phone step  |
| `/api/auth/verify-otp` failure (bad OTP) | Toast "Incorrect OTP"; clear OTP boxes; focus first box             |
| `verify-otp` success, login mode, no user | Redirect to `/auth?mode=register&next=...`                          |
| Razorpay script load failure             | Toast "Failed to load Razorpay"; reset `busy`                       |
| Razorpay `verify` failure (post-payment) | Destructive toast; leave user on register step                      |
| `/api/auth/register` failure             | Toast with `res.error`; stay on register step                       |
| Network error / unhandled throw          | Catch → toast "Network error"                                       |

All async functions wrapped in try/catch with a fallback message.

## Accessibility

- Every input has a paired `<Label htmlFor>` — labels are real text, not placeholders.
- First input of each step has `autoFocus`.
- OTP boxes: each has `aria-label="Digit {n}"`. Backspace on an empty box moves focus to the previous box.
- Buttons: `disabled` attribute + `aria-busy={busy}` when busy.
- Focus ring is visible on every interactive element (no `outline: none` without replacement).
- OTP expired state uses both color AND text change.
- Step transitions preserve focus on the primary input.
- Disabled submit button has a tooltip explaining why (when relevant).

## Responsive

- **≥ 640px:** full layout as in the ASCII mock.
- **< 640px:** card padding 32px → 20px, OTP box height 56px → 44px, the brand line "Bharat Regional Premier League" hides (only the BRPL mark and dot remain).
- **< 768px:** backdrop-filter blur disabled (perf).
- Card `max-width: 420px`, centered.
- Between 640px and 768px (inclusive of 640px): standard layout, no overrides; the backdrop-filter rule still applies (disabled).

## Performance

- No continuous animations (drop aurora drift, ticker flow, glass sweep, dot pulse).
- Only animations: card mount fade-in (300ms, runs once) and step content cross-fade (200ms).
- Backdrop-filter off under 768px.
- No large background images; only solid colors and gradients.
- No client-side JS that isn't required for the form.

## Testing

Vitest + React Testing Library, matching the existing project setup.

**Unit / integration tests:**

- Phone validation: short input → destructive toast, no API call.
- Submit valid phone → calls `/api/auth/send-otp` with the phone, advances to OTP step on success.
- Pasting 6 digits into OTP boxes fills all boxes and focuses the next.
- `verify-otp` with `exists: true` → `router.replace` called with `redirect` (or `/dashboard` fallback).
- `verify-otp` with `exists: false`, `initialMode === "login"` → redirected to `/auth?mode=register&next=...`.
- Register step renders fee card when `orderId` is null, form when `paymentId` is set.

**Accessibility:**

- jest-axe: no violations in any step.

**Manual smoke (after implementation):**

- `npm run dev`, walk phone → otp → pay stub → complete on a real browser.
- Verify focus ring visible on tab.
- Verify mobile breakpoint at 375px and 768px.

## Risks & Open Questions

- **Razorpay stub in tests:** the existing payment flow loads an external script and opens a checkout. We'll mock `window.Razorpay` in tests. If mocking breaks, fallback to extracting `startPayment` into a small testable module — flagged but not blocked.
- **Brand font availability:** `Fraunces` and `Rye` are loaded via the project's existing font setup. We assume they remain loaded. If a font swap is needed, it is out of scope.
- **Toast color contrast:** toasts use shadcn defaults. During smoke test, verify the destructive variant still meets ≥ 4.5:1 contrast against the new dark background. If it fails, override the toast `--destructive` token to `#fca5a5` (text) on `#7f1d1d` (background) — both already in the project's existing palette.

## Acceptance Criteria

1. `/auth` page renders without console errors or React warnings.
2. All three steps (phone, OTP, register) display, validate, and transition as specified.
3. Inputs and buttons have visible, designed hover/focus/disabled states.
4. No file outside `AuthClient.tsx` and `globals.css` is modified.
5. `globals.css` shrinks by at least 500 lines after cleanup.
6. Vitest suite for the auth flow passes.
7. Lighthouse accessibility score ≥ 95 on `/auth`.
8. Manual smoke test (phone → OTP → register → redirect) passes in Chrome and Safari.
