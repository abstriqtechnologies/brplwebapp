# Admin Panel Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a three-way Light/Dark/System theme toggle to the admin sidebar, sitting next to the Logout button, persisted across sessions.

**Architecture:** A new client component `ThemeToggle` reads/writes the existing custom `ThemeProvider` via `useTheme()`. It renders a Radix `DropdownMenu` with `RadioItem` entries for the three values. The admin sidebar's bottom bar is restructured to hold both the toggle and Logout in a flex row (expanded) or stacked column (collapsed).

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS 3, Radix UI `DropdownMenu` (via existing shadcn wrapper), `lucide-react` icons, vitest (node environment — no DOM), `next-themes`-style custom `ThemeProvider`.

**Spec:** [docs/superpowers/specs/2026-06-29-admin-theme-toggle-design.md](../specs/2026-06-29-admin-theme-toggle-design.md)

## Global Constraints

- **Theme values:** exactly `"light" | "dark" | "system"` (re-export `Theme` type from `@/components/theme-provider`).
- **Persistence key:** `vite-ui-theme` (the existing `ThemeProvider` default; do not change).
- **No new runtime dependencies.** Reuse `lucide-react`, Radix `DropdownMenu` primitives, and the shadcn `dropdown-menu.tsx` wrapper.
- **No new dev dependencies.** Vitest runs in `node` environment with no jsdom; the existing test pattern (`tests/components/page-editor/SectionEditor.test.tsx`) is logic-only and uses dynamic imports. Follow that pattern. Component-rendering tests are out of scope; testable logic gets extracted to a pure helper.
- **No changes to:** `ThemeProvider`, `src/app/layout.tsx`, `tailwind.config.ts`, any admin page.
- **Sidebar height parity:** the new `ThemeToggle` button must match the height of the existing Logout button in both expanded and collapsed states.

## File Structure

| Action  | Path                                                              | Responsibility                                                          |
| ------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Create  | `src/components/admin/ThemeToggle.tsx`                            | New client component: trigger button + dropdown, calls `useTheme()`.    |
| Create  | `src/components/admin/themeToggle.helpers.ts`                     | Pure helpers: `iconForTheme(theme)` and the option-list constant.       |
| Edit    | `src/components/admin/AdminSidebar.tsx`                           | Render `ThemeToggle` next to Logout; flex row expanded, stack collapsed. |
| Create  | `tests/components/admin/themeToggle.helpers.test.ts`              | Unit tests for the pure helper module.                                  |

The helpers file is split out from the component so it's testable under the existing node-environment vitest without adding jsdom/testing-library. `ThemeToggle.tsx` consumes the helpers as named exports.

---

## Task 1: Pure helpers for theme toggle

**Files:**
- Create: `src/components/admin/themeToggle.helpers.ts`
- Create: `tests/components/admin/themeToggle.helpers.test.ts`

**Interfaces:**
- Consumes: `Theme` type re-exported from `@/components/theme-provider` (the `"light" | "dark" | "system"` union).
- Produces:
  - `THEME_OPTIONS`: `ReadonlyArray<{ value: Theme; label: string }>` — exactly three entries in order: `{ value: "light", label: "Light" }`, `{ value: "dark", label: "Dark" }`, `{ value: "system", label: "System" }`.
  - `iconForTheme(theme: Theme): "Sun" | "Moon" | "Monitor"` — returns `"Sun"` for `"light"`, `"Moon"` for `"dark"`, `"Monitor"` for `"system"`. Pure: no JSX, no imports beyond the `Theme` type.

- [ ] **Step 1: Write the failing test**

Create `tests/components/admin/themeToggle.helpers.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("themeToggle helpers", () => {
  it("THEME_OPTIONS lists light, dark, system in that order", async () => {
    const { THEME_OPTIONS } = await import(
      "@/components/admin/themeToggle.helpers"
    );
    expect(THEME_OPTIONS.map((o) => o.value)).toEqual([
      "light",
      "dark",
      "system",
    ]);
    expect(THEME_OPTIONS.map((o) => o.label)).toEqual([
      "Light",
      "Dark",
      "System",
    ]);
  });

  it("iconForTheme returns Sun/Moon/Monitor for light/dark/system", async () => {
    const { iconForTheme } = await import(
      "@/components/admin/themeToggle.helpers"
    );
    expect(iconForTheme("light")).toBe("Sun");
    expect(iconForTheme("dark")).toBe("Moon");
    expect(iconForTheme("system")).toBe("Monitor");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components/admin/themeToggle.helpers.test.ts`
Expected: FAIL — the module `@/components/admin/themeToggle.helpers` cannot be resolved.

- [ ] **Step 3: Implement the helpers**

Create `src/components/admin/themeToggle.helpers.ts`:

```ts
import type { Theme } from "@/components/theme-provider";

export const THEME_OPTIONS: ReadonlyArray<{ value: Theme; label: string }> = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
];

/**
 * Maps a theme value to the icon name shown in the toggle trigger button.
 * Kept as a string return (not a component) so the helper stays pure and
 * testable under the node-only vitest environment.
 */
export function iconForTheme(theme: Theme): "Sun" | "Moon" | "Monitor" {
    switch (theme) {
        case "light":
            return "Sun";
        case "dark":
            return "Moon";
        case "system":
            return "Monitor";
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/components/admin/themeToggle.helpers.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/themeToggle.helpers.ts tests/components/admin/themeToggle.helpers.test.ts
git commit -m "feat(admin): add pure helpers for theme toggle

Extract THEME_OPTIONS and iconForTheme to a testable module so the
node-only vitest can cover them without a DOM environment.
"
```

---

## Task 2: ThemeToggle component

**Files:**
- Create: `src/components/admin/ThemeToggle.tsx`

**Interfaces:**
- Consumes: `useTheme()` from `@/components/theme-provider`; `THEME_OPTIONS` and `iconForTheme` from `./themeToggle.helpers`; shadcn `DropdownMenu`/`DropdownMenuTrigger`/`DropdownMenuContent`/`DropdownMenuRadioGroup`/`DropdownMenuRadioItem`/`DropdownMenuLabel`/`DropdownMenuSeparator` from `@/components/ui/dropdown-menu`; `Button` from `@/components/ui/button`; `Sun`/`Moon`/`Monitor` icons from `lucide-react`.
- Produces: A default-exported `ThemeToggle` React component (no props). Renders an icon `Button` trigger that opens a `DropdownMenu` with a labeled "Theme" group, three `RadioItem`s (one per `THEME_OPTIONS` entry), and a separator above. The trigger's icon is `Sun`/`Moon`/`Monitor` based on `iconForTheme(theme)`.

- [ ] **Step 1: Verify DropdownMenuRadioGroup is exported**

Run: `grep -n "DropdownMenuRadioGroup" src/components/ui/dropdown-menu.tsx`
Expected: matches an export line. (Confirmed in the existing shadcn wrapper — it re-exports `DropdownMenuRadioGroup`.)

- [ ] **Step 2: Write the component**

Create `src/components/admin/ThemeToggle.tsx`:

```tsx
"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { THEME_OPTIONS, iconForTheme } from "./themeToggle.helpers";

const ICONS = {
    Sun,
    Moon,
    Monitor,
} as const;

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const Icon = ICONS[iconForTheme(theme)];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label="Toggle theme"
                >
                    <Icon className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={(value) => setTheme(value as typeof theme)}
                >
                    {THEME_OPTIONS.map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                            {option.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
```

- [ ] **Step 3: Type-check the project**

Run: `npx tsc --noEmit`
Expected: zero errors. (The `as typeof theme` cast is required because Radix's `onValueChange` types `value` as `string`; `setTheme` expects the `Theme` union, and we know the only values in the group are the three `THEME_OPTIONS` values.)

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ThemeToggle.tsx
git commit -m "feat(admin): add ThemeToggle component

Radix DropdownMenu with RadioItems for light/dark/system. Reads and
writes via the existing useTheme() hook. Trigger icon reflects the
active theme.
"
```

---

## Task 3: Wire ThemeToggle into the admin sidebar

**Files:**
- Edit: `src/components/admin/AdminSidebar.tsx` — bottom-bar block (lines 109–122) and imports.

**Interfaces:**
- Consumes: the default-exported `ThemeToggle` from `@/components/admin/ThemeToggle` (note: `ThemeToggle` is a named export, not default — import as `{ ThemeToggle }`).
- Produces: same external behavior of `AdminSidebar` plus a `ThemeToggle` button reachable in both expanded and collapsed states.

- [ ] **Step 1: Add the import**

In `src/components/admin/AdminSidebar.tsx`, add to the import block (top of the file, grouped with the other component imports):

```tsx
import { ThemeToggle } from "@/components/admin/ThemeToggle";
```

- [ ] **Step 2: Restructure the bottom bar**

Replace the existing bottom-bar block (currently):

```tsx
<div className="px-2 py-3 border-t border-slate-200 dark:border-slate-800">
    <Button
        variant="outline"
        className={cn("w-full", collapsed ? "" : "justify-start")}
        onClick={() => {
            void logout();
        }}
        title={collapsed ? "Logout" : undefined}
        aria-label="Logout"
    >
        <LogOut className={cn("h-4 w-4", collapsed ? "" : "mr-2")} />
        {!collapsed && <span>Logout</span>}
    </Button>
</div>
```

with:

```tsx
<div className="px-2 py-3 border-t border-slate-200 dark:border-slate-800">
    {collapsed ? (
        <div className="flex flex-col gap-2">
            <ThemeToggle />
            <Button
                variant="outline"
                className="w-full justify-center"
                onClick={() => {
                    void logout();
                }}
                aria-label="Logout"
            >
                <LogOut className="h-4 w-4" />
            </Button>
        </div>
    ) : (
        <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
                variant="outline"
                className="flex-1 justify-start"
                onClick={() => {
                    void logout();
                }}
                aria-label="Logout"
            >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
            </Button>
        </div>
    )}
</div>
```

Notes on the diff:
- Expanded: `flex items-center gap-2` row, `ThemeToggle` is a fixed-size icon button (no `flex-1`), Logout takes `flex-1 justify-start` so it fills the rest. The trigger's `size="icon"` (40×40 in the shadcn `Button` sizing) matches Logout's height in the default `size="default"` (also 40×40).
- Collapsed: stacked column with `gap-2`. `ThemeToggle` keeps the icon button; Logout becomes a centered icon-only button (no text label — it was already hidden by `!collapsed` in the original). Both span full width.
- The `title` attribute on Logout is removed in the collapsed branch because the button is full-width and the sidebar is already labeled by the brand block; the `aria-label="Logout"` remains.
- `cn("h-4 w-4", collapsed ? "" : "mr-2")` becomes either `"h-4 w-4 mr-2"` (expanded) or `"h-4 w-4"` (collapsed) — handled by the branch split instead of the `cn` conditional.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "feat(admin): place ThemeToggle next to Logout in sidebar

Expanded: flex row with fixed-width toggle and flex-1 Logout.
Collapsed: stacked column with both buttons full-width.
Heights match the existing shadcn Button sizes.
"
```

---

## Task 4: Final verification

**Files:** none.

- [ ] **Step 1: Run the helper unit tests**

Run: `npx vitest run tests/components/admin/themeToggle.helpers.test.ts`
Expected: PASS.

- [ ] **Step 2: Run the full vitest suite to confirm no regressions**

Run: `npx vitest run`
Expected: all existing tests still pass; the only new file in `tests/` is the one added in Task 1.

- [ ] **Step 3: Type-check the project**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Lint check (only the touched files)**

Run: `npx next lint --file src/components/admin/ThemeToggle.tsx --file src/components/admin/themeToggle.helpers.ts --file src/components/admin/AdminSidebar.tsx`
Expected: zero errors. (If the project does not support `--file`, fall back to `npx next lint` and confirm the only new warnings are unrelated pre-existing ones.)

- [ ] **Step 5: Build smoke test**

Run: `npx next build`
Expected: build succeeds. (Do not start the dev server — the spec calls for manual visual verification, which you'll perform in your local browser, not in this CI-style check.)

- [ ] **Step 6: Manual verification checklist**

Open `/admin/dashboard` in a browser (dark and light system theme) and confirm:
- A square icon button appears next to the Logout button in the sidebar.
- Clicking it opens a dropdown with "Theme" label and three radio options: Light, Dark, System.
- The radio dot is on the currently active value.
- Picking Light → admin surfaces go light, including sidebar (`bg-white`/`text-slate-900`) and any shadcn components in the page (`bg-background`/`text-foreground`).
- Picking Dark → everything flips to dark.
- Picking System → follows the OS preference.
- Refresh the page — selection persists.
- Collapse the sidebar — both buttons are still visible and reachable (stacked column); the toggle still opens the menu.
- Log out, log back in — theme is preserved.

- [ ] **Step 7: No commit**

No code changes in this task. If steps 1–5 all pass and the manual checklist in step 6 was completed, the work is done.

---

## Self-Review

**1. Spec coverage:**
- New `ThemeToggle` component using `useTheme()` and Radix `DropdownMenu` → Task 2.
- Three options (Light/Dark/System) with active indicator → Task 2 uses `DropdownMenuRadioGroup` + `DropdownMenuRadioItem`, which renders the dot indicator automatically.
- Sidebar integration: expanded (flex row) and collapsed (stacked column) → Task 3.
- Persistence via existing `localStorage` key `vite-ui-theme` → not touched, per spec (handled by existing `ThemeProvider`).
- Unit tests → Task 1 covers the testable helper logic; Task 4 verifies the rest via the full vitest run and tsc.
- Manual verification → Task 4 step 6.
- Files-touched list matches the spec exactly.

**2. Placeholder scan:** No "TBD", "TODO", "implement later", "similar to Task N", or "add appropriate error handling" in this plan. Every step has the actual code or the actual command.

**3. Type consistency:**
- `THEME_OPTIONS` is `ReadonlyArray<{ value: Theme; label: string }>` everywhere.
- `iconForTheme` returns `"Sun" | "Moon" | "Monitor"`; the `ICONS` lookup in `ThemeToggle.tsx` keys exactly match that union.
- `setTheme` is typed as `(theme: Theme) => void` in the existing `ThemeProvider` (verified in `src/components/theme-provider.tsx`). The cast in `onValueChange` preserves that type at the call site.
- The shadcn `DropdownMenu` exports used (`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`) are all present in `src/components/ui/dropdown-menu.tsx`.

No inconsistencies. Plan is ready.
