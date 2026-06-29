# Admin Panel Theme Toggle — Design

**Date:** 2026-06-29
**Status:** Approved
**Scope:** Add a light/dark/system theme toggle to the admin sidebar, next to the Logout button.

## Goal

Admins need a way to switch the admin panel between light, dark, and system-default themes. The toggle should be discoverable (next to the existing Logout button) and remember the user's choice across sessions.

## Background

The project already has:

- A custom `ThemeProvider` ([src/components/theme-provider.tsx](../../src/components/theme-provider.tsx)) exposing `useTheme()` with a `theme: "light" | "dark" | "system"` API and `setTheme(...)`. It persists to `localStorage` under the key `vite-ui-theme` and toggles the `light` / `dark` class on `<html>`.
- Tailwind configured with `darkMode: ["class"]` in [tailwind.config.ts](../../tailwind.config.ts), so any `dark:` utility responds to the `<html>` class.
- Radix UI primitives and `lucide-react` icons available, including the `DropdownMenu` primitive.
- An admin sidebar with a bottom bar that contains the Logout button ([src/components/admin/AdminSidebar.tsx](../../src/components/admin/AdminSidebar.tsx)) and partial dark-mode styling on its surfaces.

The remaining work is purely UI: render a toggle next to Logout and wire it to the existing provider.

## Design

### New component: `ThemeToggle`

**Path:** `src/components/admin/ThemeToggle.tsx`

A `"use client"` component that:

1. Calls `useTheme()` to read the current theme and the setter.
2. Renders a `Button` (icon-only, `variant="outline"`, `size="icon"`, square) that opens a Radix `DropdownMenu`.
3. The dropdown has three `DropdownMenuItem`s — **Light** (Sun icon), **Dark** (Moon icon), **System** (Monitor icon). Each shows a trailing `Check` icon when it matches the active theme.
4. Selecting an item calls `setTheme(value)` and closes the menu.
5. The trigger button's icon reflects the current theme: `Sun` for light, `Moon` for dark, `Monitor` for system.

The component is self-contained — no props. Used once in the sidebar.

### Sidebar integration

Edit [src/components/admin/AdminSidebar.tsx](../../src/components/admin/AdminSidebar.tsx):

- Import `ThemeToggle` and place it in the bottom bar alongside the existing Logout button.
- **Expanded sidebar:** a flex row. `ThemeToggle` is a fixed-width icon button; the Logout button takes `flex-1` so it fills the remaining space. Both share the same vertical height.
- **Collapsed sidebar:** stack vertically. `ThemeToggle` on top (icon-only, full width), Logout below (current full-width outline button). This keeps the toggle reachable when the sidebar is collapsed.

The existing `border-t` wrapper around the Logout stays; the row layout replaces the current single-button block.

### Data flow

1. User clicks the `ThemeToggle` trigger → Radix `DropdownMenu` opens.
2. User picks a value (`"light"` | `"dark"` | `"system"`).
3. `setTheme(value)` is called from `useTheme()`.
4. `ThemeProvider`'s `useEffect` removes both classes from `<html>`, then adds the resolved class (`light` / `dark`, or the OS preference for `system`).
5. Tailwind re-applies `dark:` utilities across the app — including the sidebar's existing `dark:bg-slate-900` and `dark:border-slate-800` rules, and the shadcn components that use `bg-background` / `text-foreground` tokens elsewhere in the admin panel.

### Persistence

`localStorage` key remains `vite-ui-theme` (matches the existing `ThemeProvider` default). Theme survives logout, browser refresh, and new tabs. No cookie or server-side state is involved.

### Edge cases

- **SSR / hydration:** `useTheme()` initializes from `localStorage` behind a `typeof window === "undefined"` guard. Tailwind re-paints after the `<html>` class is set on mount. There may be a brief flash of the default theme on first paint of a cold load; this matches the current behavior of the app and is acceptable.
- **Logout interaction:** theme preference is independent of the auth session. It persists across logout, which is the correct UX.
- **Provider not mounted:** if `useTheme()` is called outside the provider, the existing implementation throws `"useTheme must be used within a ThemeProvider"`. The sidebar is always rendered inside the root `ThemeProvider` in [src/app/layout.tsx](../../src/app/layout.tsx), so this is not a realistic failure mode.
- **`system` option:** when selected, the provider listens to `prefers-color-scheme` via `window.matchMedia(...)` only at the moment of effect; it does not subscribe to changes. This is the existing behavior and is not in scope to change.

## Out of scope (YAGNI)

- Global "appearance" settings page.
- Per-user / per-role theme override stored server-side.
- Time-of-day auto-switching.
- Theme usage analytics.
- Animated theme transitions.
- Zero-flash inline script in `layout.tsx` (would be a follow-up if users report a flash).

## Testing

### Unit (vitest)

**Path:** `tests/admin/ThemeToggle.test.tsx` (or match the existing admin test directory if different — to be confirmed during planning).

- Renders the trigger button with the correct icon for each theme value.
- Opens the menu on click and shows all three options.
- Marks the active option with the check icon.
- Calls `setTheme` with the correct value when an option is clicked.

Use `vitest` + `@testing-library/react` (already in the project for component tests, if present — to be confirmed).

### Manual

- Navigate to `/admin/dashboard` (light) → toggle to Dark → confirm all admin surfaces flip including sidebar, top bar, tables, and form fields.
- Refresh — theme persists.
- Open a new tab to `/admin/dashboard` — same theme.
- Log out and log back in — theme persists.
- Collapse the sidebar — both buttons remain visible and reachable.

## Files touched

| Action  | Path                                                              |
| ------- | ----------------------------------------------------------------- |
| Create  | `src/components/admin/ThemeToggle.tsx`                            |
| Edit    | `src/components/admin/AdminSidebar.tsx`                           |
| Create  | `tests/admin/ThemeToggle.test.tsx` (location confirmed in plan)   |

No changes required to: `ThemeProvider`, `layout.tsx`, `tailwind.config.ts`, or any admin page.
