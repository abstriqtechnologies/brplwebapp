# Auth Page Spark Redesign — Design Spec

**Date:** 2026-06-24
**Scope:** `/auth` route visual redesign only. No business logic, state, or API changes.

## Goal

Make `http://localhost:3000/auth` visually attractive by introducing a brand-aligned gradient background, glass-morphism card, and subtle motion — without regressing any existing behavior.

## Brand Anchor (verified from codebase)

| Role | Value | Source |
|---|---|---|
| Navy / brand blue | `#111a45` | `Header.tsx`, `Footer.tsx`, `TrustBar.tsx` |
| Deep section bg | `#020617` (slate-950) | `Banner.tsx`, page wrappers |
| BRPL yellow | `#FFC928` | `Footer.tsx`, `TrustBar.tsx`, `FloatingRegisterButton.tsx` |
| Amber CTA | `amber-500` (`#f59e0b`) → `amber-600` hover | `Banner.tsx:89` |
| Yellow CTA accent | `yellow-400` (`#facc15`) | `Header.tsx:114` |

## Final Look

A near-black canvas lit by two soft radial glows — blue (`#1d4ed8`) top-left, yellow (`#FFC928`) bottom-right — with a faint white grid texture and 4 slow-drifting "spark" blur orbs. A frosted glass card floats in the center with a slowly rotating conic-gradient border. The brand mark, step pill, form fields, and amber CTA keep their current structure but adopt glass surfaces and a sharper yellow focus ring.

## Color Tokens (added to `:root` / `.dark` in globals.css)

```css
--spark-bg: #020617;
--spark-blue: #1d4ed8;
--spark-blue-2: #3b82f6;
--spark-yellow: #FFC928;
--spark-amber: #f59e0b;
--spark-glass: rgba(17, 26, 69, 0.55);
--spark-glass-border: rgba(255, 255, 255, 0.12);
--spark-input-bg: #0b1428;
```

## CSS Layer Plan

### `.auth-shell` (background canvas)

Apply 4 stacked backgrounds:

1. **Base color:** `#020617`
2. **Blue radial glow** (top-left, 900×900, screen blend, 0.45 opacity)
3. **Yellow radial glow** (bottom-right, 900×900, screen blend, 0.35 opacity)
4. **Grid texture:** inline SVG data URI — 32×32 grid, `rgba(255,255,255,0.04)` lines, tiled

Add 4 absolutely-positioned `<span>` spark orbs as direct children of `.auth-shell`, each a 220px circle with `filter: blur(60px)` and `border-radius: 9999px`:

- 2 yellow `rgba(255, 201, 40, 0.28)` — top-right (12% from top), bottom-center
- 2 blue `rgba(59, 130, 246, 0.32)` — left-center, bottom-left (15% from edge)

Drift each orb with `animate-float` (existing 6s keyframe, varied `animation-delay`). Add `pointer-events: none` and `z-index: 0`.

Card must sit at `z-index: 1` or higher.

### `.auth-stage`

Unchanged — keeps `auth-rise` enter animation, gap, max-width 420px.

### `.auth-card` (glass treatment)

- `background: linear-gradient(135deg, rgba(17,26,69,0.62), rgba(17,26,69,0.32))`
- `backdrop-filter: blur(28px) saturate(160%)`
- `-webkit-backdrop-filter: blur(28px) saturate(160%)` (Safari)
- `border: 1px solid var(--spark-glass-border)`
- `border-radius: 18px` (unchanged)
- `box-shadow: 0 30px 80px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)`
- `padding: 2rem 1.75rem` (unchanged)
- `position: relative; overflow: hidden;`

**Animated conic ring** on `::before`:
- `position: absolute; inset: -1px;`
- `border-radius: inherit; padding: 1px;`
- `background: conic-gradient(from 0deg, transparent 0deg, #FFC928 60deg, transparent 120deg, #3b82f6 240deg, transparent 360deg)`
- `-webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude;`
- `animation: auth-spark-ring 12s linear infinite`
- `pointer-events: none; opacity: 0.7`

New keyframe:
```css
@keyframes auth-spark-ring {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .auth-card::before { animation: none; opacity: 0.35; }
}
```

### `.auth-step-pill` (glass chip)

- Background: `rgba(255, 255, 255, 0.06)` with `backdrop-filter: blur(12px)`
- Border: `1px solid rgba(255, 255, 255, 0.1)`
- Color: keep yellow accent (`#FFC928`)
- Yellow dot: keep, add gentle `pulse` (existing `pulse-slow` animation, 4s)

### `.auth-field-input` (focus ring)

- Background: `var(--spark-input-bg)` (`#0b1428`)
- Border: `1.5px solid rgba(255, 255, 255, 0.08)` (unchanged)
- Hover border: `rgba(255, 201, 40, 0.45)` (slightly stronger than current 0.4)
- Focus border: `#FFC928` (was amber-500 — match brand yellow)
- Focus background: `rgba(255, 201, 40, 0.06)`
- Focus shadow: `0 0 0 4px rgba(255, 201, 40, 0.18)` (was 0.14 — slightly stronger)

### `.auth-otp-cell`

- Same focus treatment as `.auth-field-input`
- Filled state: stronger amber tint `rgba(255, 201, 40, 0.12)` with border `rgba(255, 201, 40, 0.7)`

### `.auth-submit` (primary CTA)

Unchanged — amber gradient + glow already matches brand. Slightly increase glow shadow: `0 16px 40px -10px rgba(245, 158, 11, 0.7)`.

### `.auth-brand`, `.auth-foot`, `.auth-trust`, `.auth-fee`, `.auth-info`

No visual changes — already aligned with palette. Foot dot keeps pitch-green; that's part of the Stadium system and stays.

## Spark Orbs Implementation

Render 4 `<span>` elements inside `<AuthShell>` via the existing component wrapper in [src/app/auth/auth-components.tsx](src/app/auth/auth-components.tsx#L11-L13). Modify `AuthShell` to:

```tsx
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <span className="auth-spark auth-spark--blue-1" aria-hidden />
      <span className="auth-spark auth-spark--yellow-1" aria-hidden />
      <span className="auth-spark auth-spark--yellow-2" aria-hidden />
      <span className="auth-spark auth-spark--blue-2" aria-hidden />
      {children}
    </div>
  );
}
```

New CSS for `.auth-spark`:
```css
.auth-spark {
  position: absolute;
  border-radius: 9999px;
  filter: blur(60px);
  pointer-events: none;
  z-index: 0;
  animation: float 7s ease-in-out infinite;
  will-change: transform;
}
.auth-spark--blue-1   { top: 12%;  left: 8%;  width: 220px; height: 220px; background: rgba(59, 130, 246, 0.32); }
.auth-spark--blue-2   { bottom: 18%; left: 10%; width: 180px; height: 180px; background: rgba(29, 78, 216, 0.28); animation-delay: -2s; }
.auth-spark--yellow-1 { top: 10%;  right: 6%; width: 200px; height: 200px; background: rgba(255, 201, 40, 0.28); animation-delay: -3s; }
.auth-spark--yellow-2 { bottom: 10%; right: 12%; width: 240px; height: 240px; background: rgba(255, 201, 40, 0.22); animation-delay: -5s; }

@media (prefers-reduced-motion: reduce) {
  .auth-spark { animation: none; }
}
@media (max-width: 640px) {
  .auth-spark { width: 140px; height: 140px; filter: blur(40px); }
}
```

Ensure `.auth-stage` and `.auth-card` get `position: relative; z-index: 1` so they sit above orbs.

## Files Modified

1. **[src/app/globals.css](src/app/globals.css)** — add color tokens, replace `.auth-shell`, `.auth-card`, `.auth-step-pill`, `.auth-field-input`, `.auth-otp-cell` rules; add `.auth-spark` rules; add `@keyframes auth-spark-ring`.
2. **[src/app/auth/auth-components.tsx](src/app/auth/auth-components.tsx#L11-L13)** — render 4 spark `<span>` elements inside `AuthShell`.

## Files NOT Modified

- `AuthClient.tsx` — business logic, state, validation, OTP, Razorpay, all step rendering unchanged.
- `auth-helpers.ts` — pure functions unchanged.
- `page.tsx` — server entry unchanged.

## Bug-Free Guarantees

1. No new dependencies.
2. No changes to React state, hooks, refs, event handlers, or form submission flow.
3. OTP input still auto-advances, backspace, paste, and `inputMode="numeric"` work as before.
4. `prefers-reduced-motion` honored on all new animations.
5. Mobile breakpoint (≤640px) keeps card padding, OTP height, and brand sub hide.
6. Spark orbs are `aria-hidden` and `pointer-events: none` — no a11y or interaction regressions.
7. Grid texture is a CSS background — no extra DOM, no perf impact.
8. Existing `auth-rise` enter animation preserved.
9. Dark/light mode tokens remain defined (light page uses dark Stadium system; both `:root` and `.dark` blocks updated identically for parity).

## Testing Checklist (manual)

- [ ] Open `/auth` — gradient bg visible, orbs drifting, card has glass + rotating ring
- [ ] Step 01 → 02 → 03 transitions still work
- [ ] OTP paste/backspace/auto-advance works
- [ ] Phone input accepts only digits, max 10
- [ ] Submit button shows loader state
- [ ] Reduced-motion OS setting disables orbs + ring
- [ ] Mobile 375px — card padding/OTP cells adapt
- [ ] No console errors / hydration warnings
- [ ] Toast on invalid phone / wrong OTP
- [ ] Razorpay opens, verify flow returns to registration

## Out of Scope

- Adding brand logo image to the card
- Changing copy
- Adding new steps
- Any `/auth/[...]` sub-route beyond `/auth`
- Other auth-related pages (forgot password, etc. — none currently exist)