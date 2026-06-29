# Admin SEO — Global Scripts Card

**Date:** 2026-06-29

## Overview

Add a "Global" card to the existing admin SEO page with two code editors for injecting custom scripts into every public page: one for `<head>` scripts (analytics, verification meta tags) and one for `<body>` scripts (GTM noscript, etc.). Wire the stored scripts into the root layout server-side.

## Motivation

Site admins need to inject third-party snippets (Google Analytics, Search Console, Meta Pixel, GTM) without editing code or redeploying. The existing `SiteSettings` model already has `customHeadScripts` and `customBodyScripts` fields — this makes them editable via the admin panel and active on every page.

## Approach

- **CodeMirror** (`@uiw/react-codemirror` + `@codemirror/lang-html`) for syntax-highlighted code editors
- Dark-themed editors with line numbers, matching the admin aesthetic
- **API endpoint** at `GET/PATCH /api/admin/settings/seo` for reading and saving
- Server-side injection in the root layout via `getSiteContext()` (already cached and served)

## Files

### New

| File | Purpose |
|------|---------|
| `src/app/api/admin/settings/seo/route.ts` | GET returns current scripts; PATCH updates both fields |
| `src/components/admin/seo/ScriptEditor.tsx` | Dark-themed CodeMirror wrapper |

### Modified

| File | Change |
|------|--------|
| `src/app/(admin)/admin/seo/page.tsx` | Add "Global" card with two ScriptEditor instances + Save button |
| `src/app/layout.tsx` | Inject `settings.customHeadScripts` into `<head>` and `settings.customBodyScripts` at top of `<body>` |

## API Design

**`GET /api/admin/settings/seo`**

```json
{
  "ok": true,
  "data": {
    "customHeadScripts": "<script>...</script>",
    "customBodyScripts": "<iframe>...</iframe>"
  }
}
```

**`PATCH /api/admin/settings/seo`**

Request body:
```json
{
  "customHeadScripts": "...",
  "customBodyScripts": "..."
}
```

Response: `{ "ok": true, "data": { "saved": true } }`

On success, calls `revalidateSite(TAGS.SETTINGS)` to bust the server cache so the root layout picks up the new scripts on the next render.

## UI

The Global card sits at the top of the SEO page, above the placeholder content. It contains:

1. **Header**: Card title "Global" with a `Globe` icon
2. **Head Script Editor**: Label "Global Head Script/Meta code", description "Injected into the `<head>` of every public page..."
3. **Body Script Editor**: Label "Global Body Scripts (e.g. GTM noscript)", description "Injected into the `<body>` on every public page..."
4. **Save button**: Styled amber, disabled while saving, shows success toast via `sonner`

Each editor uses CodeMirror in HTML mode with:
- Dark theme (`dark`)
- Line numbers
- No line wrap (scroll horizontally for long lines)

## Data Flow

```
SEO Page (client)
  → GET /api/admin/settings/seo (on mount)
  → User edits scripts (local state)
  → User clicks Save
  → PATCH /api/admin/settings/seo
  → Server: upserts SiteSettings customHeadScripts/customBodyScripts
  → Server: revalidateSite(TAGS.SETTINGS)
  → Next page render: root layout reads fresh settings via getSiteContext()
  → Scripts injected dangerouslySetInnerHTML in <head> and <body>
```

## Injection Strategy

In `src/app/layout.tsx` (a server component):

```tsx
const siteContext = await getSiteContext();
const { customHeadScripts, customBodyScripts } = siteContext.siteSettings;

// In <head>:
{customHeadScripts && (
  <head>
    <div dangerouslySetInnerHTML={{ __html: customHeadScripts }} />
  </head>
)}

// At top of <body>:
{customBodyScripts && (
  <div dangerouslySetInnerHTML={{ __html: customBodyScripts }} />
)}
```

Using `<div>` wrappers because Next.js's `<head>` in the root layout doesn't allow direct children; we use a fragment approach. For body scripts, placing them at the top of `<body>` ensures GTM noscript iframes render first.

Dependencies to add:

- `@uiw/react-codemirror` (React CodeMirror wrapper)
- `@codemirror/lang-html` (HTML syntax highlighting)

## Self-review

- **Placeholders?** None.
- **Internal consistency?** Matches existing `SiteSettings` model fields and `siteContext` patterns.
- **Scope?** Focused — one card, one API, one layout change. No SEO meta tag management, sitemaps, or other features — those come later.
- **Ambiguity?** None. Editor choice, data flow, injection method all explicit.
