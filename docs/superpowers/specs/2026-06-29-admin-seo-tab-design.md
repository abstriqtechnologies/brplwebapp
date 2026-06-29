# Admin SEO Tab

**Date:** 2026-06-29

## Overview

Add a "Seo" navigation tab to the admin sidebar with a corresponding blank page under `/admin/seo`.

## Motivation

Placeholder for future SEO management tools (meta tags, sitemaps, robots.txt, analytics integration).

## Design

### Sidebar

One new entry in `NAV_ITEMS` in `AdminSidebar.tsx`, following the existing pattern:

```ts
{ label: "Seo", href: "/admin/seo", icon: Search }
```

### Page

A minimal `"use client"` page at `src/app/(admin)/admin/seo/page.tsx` following the admin page conventions:

- Wrapped in `<main className="p-6 min-w-0">`
- Header with title and icon
- Content area with a placeholder message
- Standard admin layout/auth provided by `(admin)/layout.tsx`

No API endpoints, no database models, no state management at this stage.

## Files Changed

| Action | File |
|--------|------|
| Create | `src/app/(admin)/admin/seo/page.tsx` |
| Edit | `src/components/admin/AdminSidebar.tsx` |
