# Admin SEO — Global Scripts Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Global" card to the SEO admin page with two dark-themed CodeMirror code editors for `customHeadScripts` and `customBodyScripts`, with a corresponding API endpoint and server-side injection in the root layout.

**Architecture:** Client-side admin page fetches saved scripts via GET, user edits in CodeMirror editors, Save triggers PATCH to update the DB and revalidate the server cache. The root layout (server component) reads scripts from `getSiteContext()` and injects them with `dangerouslySetInnerHTML`.

**Tech Stack:** Next.js 14 App Router, CodeMirror 6 (`@uiw/react-codemirror`, `@codemirror/lang-html`), MongoDB/Mongoose, Tailwind CSS, `sonner` (toasts), `lucide-react` (icons)

## Global Constraints

- Follow existing admin patterns: `withRequest` + `withAdmin` composition for API routes
- Use existing admin auth (cookie-based JWT with `getAdminCookie`, superadmin role)
- Use `@/lib/revalidate` cache tags (`TAGS.SETTINGS`) for cache invalidation
- Use `@/apihelper/api` for frontend API calls (returns `{ data, ok, error }` shape)
- Use `ok()` / error helpers from `@/lib/api/response`
- Use lucide-react icons and existing UI patterns for the admin page
- CodeMirror editors in dark theme, HTML mode, with line numbers

---
