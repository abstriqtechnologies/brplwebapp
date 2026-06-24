# Dashboard Trial Pass Restore — Design

**Date:** 2026-06-24
**Status:** Approved
**Scope:** Restore the `/dashboard` Trial Pass card that was removed in commit `c6295f1`.

## Context

The `/dashboard` page once contained a "Trial Pass" card (a printable player ID with photo, name, and barcode) alongside the player's profile information. When the admin module was restored in commit `c6295f1` (`chore: restore admin module from prior session to enable revalidation wiring`), the dashboard was rebuilt as a server/client split with only profile + payment-receipt content. The Trial Pass column was dropped entirely.

The component (`src/components/TrialPass.tsx`), background image (`/assets/trail-pass-bg.webp`), default avatar (`/assets/avtar.webp`), and dependencies (`react-barcode`, `html-to-image`) all still exist in the codebase. Only the wiring is missing.

This design restores the Trial Pass experience with the original look and feel, while keeping one accommodation: the current "Complete your registration" CTA card is preserved for unpaid users.

## Goals

- Restore the two-column dashboard layout (Trial Pass + Profile) that existed before `c6295f1`.
- Re-enable "Download Trial Pass" → PNG download via `html-to-image`.
- Preserve the role-colored welcome header and original copy.
- Keep the unpaid-user "Complete your registration" CTA card.
- Drop the redundant payment-status card and receipt PDF download (the original dashboard never had them).

## Non-Goals

- Adding a profile-image upload UI for users.
- Server-side rendering of the TrialPass card (it is image-heavy and intentionally client-only).
- Replacing the `react-barcode` library.
- Replacing the manual avatar-proxy logic in `TrialPass.tsx` with a backend proxy route.
- Modifying the auth/me endpoint shape beyond adding the optional `profileImage` field.
- Adding `profileImage` validation, transforms, or storage adapters.

## Architecture

```
Server (page.tsx)
  └── getAuthSession() → if missing redirect("/auth?next=/dashboard")
  └── SiteContextProvider
       └── DashboardClient (client component)
            ├── Welcome header (role-colored gradient)
            ├── Two-column grid (lg:grid-cols-[400px_1fr])
            │    ├── LEFT: Trial Pass card
            │    │    ├── <TrialPass user={user} />  (photo + name + barcode)
            │    │    └── "Download Trial Pass" button → toPng() → PNG download
            │    └── RIGHT: Profile grid + "Registration complete" note + Contact link
            └── IF unpaid: "Complete your registration" CTA card
```

## Files Changed

| File | Change |
| --- | --- |
| `src/app/dashboard/DashboardClient.tsx` | Full rewrite (~260 lines). Restore original layout with Trial Pass column; keep unpaid CTA card. |
| `src/app/api/auth/me/route.ts` | Add optional `profileImage` field to the returned user object. |
| `src/models/User.ts` | Add optional `profileImage?: string` field to `IUser` and `UserSchema`. No validation. |

No new files. No new dependencies.

## Data Flow

1. **Server load.** `page.tsx` calls `getAuthSession()`. If null → `redirect("/auth?next=/dashboard")`. Otherwise renders `DashboardClient` inside `SiteContextProvider`.
2. **Client mount.** `DashboardClient` calls `GET /api/auth/me` via `fetch`.
   - On success → set local `user` state.
   - On failure → `router.replace("/auth?next=/dashboard")`.
3. **Render.**
   - Welcome header gradient is selected by role (batsman → red→orange, bowler → blue→cyan, allrounder → purple→pink, wicketkeeper → amber→yellow, default → slate). Header shows `name`, role label (from `ROLE_LABELS`), and a "Registered" check when `paymentStatus === "completed"`.
   - TrialPass renders the visual card using `user.profileImage ?? DEFAULT_AVATAR` and resolves the avatar to base64 (proxy → CORS → canvas) so the captured PNG download contains a usable image.
   - Profile grid renders six `ProfileCard`s (Full Name, Mobile, Email, Location, Playing Role, BRPL ID).
4. **Download.**
   - Click "Download Trial Pass" → `toPng(trialPassRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" })` → anchor click → PNG `BRPL-Trial-Pass-{phone}.png` downloads.
5. **Logout.** Click "Logout" → `POST /api/auth/logout` → `router.replace("/auth")`.

## UI Layout

```
+---------------------------------------------------------------+
|   Welcome to BRPL                                [Logout]      |
|   {name}                                                     |
|   🏆 {Role label} • ✓ Registered (if paid)                  |
+----------------------+----------------------------------------+
|                      |  Full Name        Playing Role        |
|  +--------------+    |  Mobile           BRPL ID              |
|  |  [photo]     |    |  Email                                |
|  |              |    |  Location                             |
|  |  {name}      |    |                                        |
|  |              |    |  ┌─────────────────────────────────┐  |
|  |  |||||||||   |    |  │ ✓ Registration complete          │  |
|  |  |||||||||   |    |  │   You'll be notified when...     │  |
|  +--------------+    |  └─────────────────────────────────┘  |
|                      |                                        |
|  [Download PNG]      |  Need help? Contact support            |
|  Present at trials   |                                        |
+----------------------+----------------------------------------+

[IF unpaid] Complete your registration → [Continue]
```

## Error Handling

| Failure | Behavior |
| --- | --- |
| `/api/auth/me` non-ok | `router.replace("/auth?next=/dashboard")` |
| `toPng` rejection | `console.error("Download failed", err)`, button returns to idle. No user-facing toast. |
| Avatar fetch fails (all three strategies) | `TrialPass` keeps the URL `imgSrc` it set initially; `onError` on `<img>` falls back to `DEFAULT_AVATAR`. |
| Logout fetch rejection | Logout spinner clears; user remains on the page (matches original). |

## Testing

Manual smoke checklist (no automated tests added — the original had none either):

1. **Authenticated load.** Log in, visit `/dashboard`. Verify role-colored header, Trial Pass card on left, profile grid on right.
2. **Download.** Click "Download Trial Pass" → verify `BRPL-Trial-Pass-{phone}.png` downloads and opens correctly (photo + name + barcode visible).
3. **Logout.** Click "Logout" → redirected to `/auth`.
4. **Unpaid CTA.** As an unpaid user (`paymentStatus !== "completed"`), verify the "Complete your registration" CTA card appears below the grid with a "Continue" button that links to `/auth?mode=register`.
5. **Avatar fallback.** New user with no `profileImage` → default `/assets/avtar.webp` shown on the pass.
6. **Auth gate.** Visit `/dashboard` while signed out → redirected to `/auth?next=/dashboard`.

## Risks

- **Avatar CORS in production.** `TrialPass.tsx` uses `https://api.allorigins.win/raw?url=...` as a proxy fallback. If a user has a profile image hosted on an S3 bucket without permissive CORS, the captured PNG will include either the proxy-fetched image or a blank/default. This matches the original behavior; no fix in scope.
- **`html-to-image` and React 18 strict mode.** The download uses refs and a single async call. No known issues, but the original code wrapped the capture element in a plain `<div ref={...}>` to keep the captured DOM stable. We preserve that pattern.
- **`profileImage` field is unvalidated.** Users without a stored image simply get `undefined`, which the UI handles. No security boundary depends on this field.

## Out of Scope

- Profile image upload form.
- Replacing `react-barcode` with an SVG/Canvas renderer.
- Replacing the allorigins.win proxy with a backend `/api/avatar-proxy` route.
- Adding receipt PDF download back to the dashboard (the original dashboard did not have it).
- Localizing Trial Pass copy.