---
name: Admin Legal Pages
description: Admin panel mein "Legal" section ke liye design spec — Privacy Policy, Terms & Conditions, aur FAQ pages
---

# Admin Legal Pages — Design Spec

## Overview

Admin panel mein ek naya **Legal** section add karna hai jisme 3 sub-pages hain:
- Privacy Policy editor
- Terms & Conditions editor
- FAQ manager

Teeno pages dynamic hain — admin se save karte hi frontend par reflect hote hain.

## Existing Infrastructure

- **`LegalPage` model** (`src/models/LegalPage.ts`): already has `type: "privacy" | "terms" | "rulebook"`, `title`, `content` (HTML), `version`, `effectiveDate`
- **`FAQ` model** (`src/models/FAQ.ts`): already has `question`, `answer`, `category`, `order`, `active`
- **Frontend pages** (`/privacy-policy`, `/terms-and-conditions`, `/faqs`): already wired to `getLegal()` / `getSiteContext()` with CMS fallback
- **`BlogEditor`**: TipTap rich text editor — reusable
- **Admin patterns**: list pages, `withAdmin`/`withRequest` API handlers, `AdminSidebar` nav

## Routes Structure

```
/admin/legal/              → Index page (3 option cards)
/admin/legal/privacy       → Privacy Policy editor
/admin/legal/terms         → Terms & Conditions editor
/admin/legal/faqs          → FAQ manager
/admin/legal/faqs/new      → New FAQ form
/admin/legal/faqs/[id]     → Edit FAQ form (optional — could be modal)
```

## Sidebar

Add to `AdminSidebar.tsx` NAV_ITEMS:

```typescript
{ label: "Legal", href: "/admin/legal", icon: FileText }  // or Scale icon
```

## Privacy Policy / Terms Pages

**Components:**
- Reuse `BlogEditor` for rich text content
- Fields: title (input), version (input), effectiveDate (date picker), content (BlogEditor)
- Save/Publish pattern similar to blog editor

**API Routes:**
- `GET /api/admin/legal/privacy` — fetch privacy doc
- `PATCH /api/admin/legal/privacy` — update privacy doc
- `GET /api/admin/legal/terms` — fetch terms doc
- `PATCH /api/admin/legal/terms` — update terms doc

## FAQ Page

**Page features:**
- Paginated table of all FAQs (question, category, active status, order, actions)
- Add FAQ button → form with: question (input), answer (BlogEditor), category (input), order (number), active (switch)
- Edit: inline or separate form page (reuse same form component)
- Delete with confirmation
- Active toggle switch

**API Routes:**
- `GET /api/admin/legal/faqs?search=&page=&pageSize=` — list FAQs
- `POST /api/admin/legal/faqs` — create FAQ
- `GET /api/admin/legal/faqs/[id]` — single FAQ
- `PATCH /api/admin/legal/faqs/[id]` — update FAQ
- `DELETE /api/admin/legal/faqs/[id]` — delete FAQ

## Data Flow

```
Admin UI → API Route → MongoDB → getLegal()/getSiteContext() → Frontend pages
                ↓
         Cache revalidation via TAGS.LEGAL
```

## Files to Create

| File | Purpose |
|---|---|
| `src/app/(admin)/admin/legal/page.tsx` | Legal index page with 3 cards |
| `src/app/(admin)/admin/legal/privacy/page.tsx` | Privacy Policy editor (client) |
| `src/app/(admin)/admin/legal/terms/page.tsx` | Terms & Conditions editor (client) |
| `src/app/(admin)/admin/legal/faqs/page.tsx` | FAQ list page (client) |
| `src/app/(admin)/admin/legal/faqs/new/page.tsx` | New FAQ form (client) |
| `src/app/(admin)/admin/legal/faqs/[id]/page.tsx` | Edit FAQ form (client) |
| `src/app/api/admin/legal/privacy/route.ts` | Privacy API |
| `src/app/api/admin/legal/terms/route.ts` | Terms API |
| `src/app/api/admin/legal/faqs/route.ts` | FAQs list/create API |
| `src/app/api/admin/legal/faqs/[id]/route.ts` | Single FAQ CRUD API |
| `src/components/admin/LegalEditor.tsx` | Shared editor component for privacy/terms |

## Files to Modify

| File | Change |
|---|---|
| `src/components/admin/AdminSidebar.tsx` | Add "Legal" nav item |
