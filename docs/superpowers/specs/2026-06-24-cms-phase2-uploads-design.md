# Design — CMS Phase 2: Admin File Uploads & Media Library

**Date:** 2026-06-24
**Project:** brpl-frontend
**Author:** brainstorming session

## Context

The CMS-wiring spec (`docs/superpowers/specs/2026-06-24-cms-wiring-design.md`) is implemented and on `main`. Every CMS field accepts a URL string only — admins must paste an external URL (or a `/uploads/...` path) for every image. There is no upload UI. File uploads were explicitly deferred to Phase 2 in the original spec.

**Goal:** Add a complete upload pipeline (storage + admin UI + media library) so admins can upload images and videos directly from the admin and use them in any CMS field.

**Phase 2 scope:** local-disk storage, sharp-resized images, separate `/admin/media` library page with folders + search + tag/kind filters, integrated `<MediaUploadField>` component swapped into every existing admin URL field (~30 fields across ~15 admin pages).

## Approach (chosen)

**A reusable `<MediaUploadField>` plus a real `/admin/media` page.** Every admin form that currently has `<Input type="url">` for an image or video gets a one-line swap to `<MediaUploadField>`. The field offers three actions: "Upload" (drag-drop / pick file), "Library" (open the `/admin/media` page in a dialog), "Clear". Both Upload and Library insert the resulting URL into the same form state. Backend stores metadata in a new `Media` Mongoose collection; files live on disk under `public/uploads/<yyyy>/<mm>/<random>.<ext>`.

Alternatives considered and rejected:
- **Library-only** (no inline picker): poor UX — 3+ clicks to use an upload.
- **Drag-drop everywhere overlay**: surprising, doesn't satisfy the folder/search requirement.

## Data Model

### New model `Media`

```ts
Media = {
  _id;
  url: string;                // e.g. "/uploads/2026/06/abc123def456.jpg"
  originalName: string;        // admin's filename, for display only
  mime: string;                // e.g. "image/jpeg"
  kind: "image" | "video";
  size: number;                // bytes
  width?: number;              // for images
  height?: number;             // for images
  durationSec?: number;        // for videos (best-effort, null if ffprobe unavailable)
  folder?: string;             // e.g. "Hero Banners", "Player Photos"
  tags: string[];              // free-form, default []
  uploadedBy: string;          // admin email
  createdAt: Date;
}
```

Indexes:
- `{ folder: 1, createdAt: -1 }` (folder listing)
- `{ kind: 1, createdAt: -1 }` (kind filter)
- Text index on `originalName` (search).

Expected doc count: < 5,000.

### Cache tag

Add to `src/lib/revalidate.ts`:

```ts
export const TAGS = {
    ALL: "site-context",
    SETTINGS: "site-context:settings",
    HOME: "site-context:home",
    ABOUT: "site-context:about",
    REGISTRATION: "site-context:registration",
    LEGAL: "site-context:legal",
    SEO: "site-context:seo",
    PAGE_BANNERS: "site-context:page-banners",
    COLLECTIONS: "site-context:collections",
    MEDIA: "site-context:media",  // new
};
```

Public site doesn't need `media` in its context today (URLs are inlined in CMS field values), but adding the slice to `SiteContext` keeps the data discoverable for a future `useMedia()` hook and gives the media library a cache key.

## Storage Backend

### Local disk adapter (`src/lib/mediaStorage.ts`)

Default path: `public/uploads/<yyyy>/<mm>/<random-12>.<ext>`, served by Next.js as a static asset. Env override: `MEDIA_STORAGE_PATH` (default `public/uploads`).

| Kind | MIME types | Max size |
|------|-----------|----------|
| Image | png, jpeg, webp, gif, avif, svg | 5 MB |
| Video | mp4, webm | 50 MB |

Random part: `crypto.randomUUID().slice(0, 12)`. Original filename is NEVER used in any path — that prevents directory traversal and collisions. Original filename is stored as `originalName` for display only.

`sharp` pipeline on upload:
1. Read the buffer.
2. Apply orientation (EXIF rotation).
3. For images: produce original saved at full quality + a 1920px-wide webp sibling at `url.replace(/\.<ext>$/, ".webp")`. SVG passes through unchanged.
4. For images: read `width`, `height` from sharp metadata; store on the Media doc.
5. For videos: no processing; store as uploaded. `durationSec` is best-effort via `ffprobe` if available; `null` if not (don't fail the upload over this).

If `sharp` can't decode an image-type upload, reject with 400.

### Public serving

Files in `public/uploads/` are served by Next.js's built-in static handler. Add to `next.config.mjs`:

```js
{
  source: "/uploads/:path*",
  headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
}
```

No custom route handler. No CDN. No signed URLs.

## API Surface

All routes under `/api/admin/media/*` require admin session via `requireAdminDb`. Calls `revalidateSite(TAGS.MEDIA)` after successful upload/delete/update.

| Route | Method | Body / Query | Response | Status codes |
|-------|--------|--------------|----------|--------------|
| `/api/admin/media/upload` | POST | `multipart/form-data` with `file` + optional `folder` + `tags[]` | `{ ok, data: { id, url, webpUrl?, mime, width?, height?, size } }` | 400, 401, 413, 415, 500 |
| `/api/admin/media` | GET | `?folder=&kind=&search=&page=1&limit=24` | `{ ok, data: { items, pagination } }` | 401 |
| `/api/admin/media/folders` | GET | — | `{ ok, data: string[] }` | 401 |
| `/api/admin/media/[id]` | PATCH | `{ folder?, tags?, originalName? }` | `{ ok, data: Media }` | 400, 401, 404 |
| `/api/admin/media/[id]` | DELETE | — | `{ ok }` | 401, 404 |

Status code meanings:
- **400** — empty file, sharp decode error, missing `file` field.
- **401** — no admin session.
- **413** — file exceeds kind's max size.
- **415** — MIME type not in allowlist.
- **500** — disk write failure or unexpected error.

Hard delete (not soft): removes the file from disk AND the Media doc. Admin re-upload is the recovery path.

## Components

### `src/components/admin/MediaPicker.tsx`

Modal/dialog component. Triggered by any `<MediaUploadField>` button. Has two tabs:
- **Library**: search input, folder filter, kind filter, paginated thumbnail grid. Click → fires `onSelect(url, webpUrl?, mime)` and closes.
- **Upload**: drag-drop zone + `<input type="file">`. Shows progress (upload percentage) and final thumbnail.

Footer: "Cancel" + "Insert" button (Insert is auto-fired on selection).

### `src/components/admin/MediaUploadField.tsx`

Form-field widget. Props:
```ts
{
  value: string;
  onChange: (url: string) => void;
  kind: "image" | "video";
  accept?: string;        // MIME list override
  preview?: boolean;      // default true
}
```

Renders:
- Thumbnail preview (image) OR video icon + filename.
- URL `<Input type="url">` (still editable — admins can paste external URLs).
- "Upload" button → opens `MediaPicker` in Upload tab.
- "Library" button → opens `MediaPicker` in Library tab.
- "Clear" button when `value` is non-empty.

Client-side size+MIME validation before hitting the server, so over-cap uploads show an instant toast.

### `src/app/(admin)/admin/media/page.tsx`

The library. Client component. Layout:
- Left sidebar: folder list (with counts), kind filter, search input.
- Main area: drag-drop upload zone at top, paginated grid below.
- Each grid item: thumbnail, originalName, mime badge, size, uploadedBy, action menu (move folder, edit tags, delete).

Used as both a real admin page (linked from sidebar) and the "library" tab of `MediaPicker`.

## Public-Site Impact

Zero public-side code changes for serving — Next.js's static handler covers `/uploads/*` already. Files use the existing `Cache-Control: public, max-age=31536000, immutable` rule.

`next.config.mjs` `remotePatterns` already allows localhost for `next/image`; production adds the admin's domain. The existing `OptimizedImage` component already supports `webpSrc` via `<picture>`; the upload endpoint returns both the original URL and the webp sibling URL when applicable.

If a saved form references a deleted Media doc, the public site uses the existing `OptimizedImage` `onError` handler to hide the broken icon.

## Security

| Concern | Mitigation |
|---------|-----------|
| Directory traversal | Storage path is `<yyyy>/<mm>/<random>.<ext>` — admin filename is never used in paths. |
| SSRF via `originalName` | Stored for display only; never used in paths or rendering. |
| MIME spoofing | `sharp.metadata()` validates image uploads (rejects if width/height absent). Videos best-effort via ffprobe; null is acceptable. |
| Oversized requests | Server-side size check before reading the buffer. Body limit configured for streaming. Files < 50 MB pass cleanly on self-hosted Node; on Vercel Hobby this would fail and we surface a 413 with a clear message. |
| Auth | `requireAdminDb` on every endpoint. `seo_content` role is allowed to upload to any folder in v1 (no folder-level RBAC). |
| Path normalization | Files served from `public/uploads/` go through Next's static handler, which doesn't process paths beyond standard URL decoding. |

## Error Handling

- `MediaPicker` shows a toast on every API error with a specific message mapped to status code (413 → "File too large", 415 → "Unsupported file type", etc.).
- `MediaUploadField` validates locally (size + MIME) before upload, so admins get instant feedback.
- `sharp` errors caught and surfaced as 400 with underlying message in dev, generic "Could not process image" in prod.
- Deleted Media references on the public site: `OptimizedImage` `onError` shows a placeholder, never a broken icon.

## Admin Form Sweep

Every admin form field that previously took a URL string is converted to `<MediaUploadField>`:

| Admin page | Fields swept |
|------------|--------------|
| `/admin/settings` | `logoUrl`, `footerLogoUrl`, `faviconUrl`, `appleTouchIconUrl`, `ogImage` |
| `/admin/page-banner` | `image` per banner card |
| `/admin/cms/banners` | home `banners[].image`, `banners[].videoUrl`, trustBar `icon`, broadcastingPartners `logo` |
| `/admin/about-us/banner` | `image` |
| `/admin/about-us/about-brpl` | `image` |
| `/admin/about-us/mission-vision` | `image` |
| `/admin/about-us/meet-our-team` | `image` |
| `/admin/registration-page` | `videos[].url`, `videos[].thumbnail` |
| `/admin/numbers-speak` | `icon` |
| `/admin/player-stories` | `image` |
| `/admin/events` | `image` |
| `/admin/ambassadors` | `image` |
| `/admin/teams` | `image` |
| `/admin/partners` | `logo` |
| `/admin/blog` | `heroImage` (in create/edit forms) |
| `/admin/news` | `heroImage` |
| `/admin/site-pages` | `heroImage` per tab |

That's ~30 fields swept. The form sweep is mechanical and can be batched into a handful of "sweep" tasks by grouping per admin page.

**Sweep rules:**
- Keep existing `<Input type="url">` as the inner editable URL field.
- Wrap it in `<MediaUploadField>`.
- The form's `data` state continues to store the URL string — no shape change.
- External URLs (anything not starting with `/uploads/`) continue to work unchanged.

## Critical Files to Touch

**New (9):**
- `src/models/Media.ts`
- `src/lib/mediaStorage.ts` — local-disk adapter (`writeUpload`, `deleteUpload`, `readMetadata`)
- `src/app/api/admin/media/upload/route.ts`
- `src/app/api/admin/media/route.ts` (GET list)
- `src/app/api/admin/media/folders/route.ts`
- `src/app/api/admin/media/[id]/route.ts` (PATCH + DELETE)
- `src/components/admin/MediaPicker.tsx`
- `src/components/admin/MediaUploadField.tsx`
- `src/app/(admin)/admin/media/page.tsx`

**Modify:**
- `package.json` — add `sharp` dependency.
- `src/lib/revalidate.ts` — add `TAGS.MEDIA`.
- `src/lib/siteContext.ts` — add `Media` slice (reader + cache + getter).
- `src/apihelper/admin.ts` — add `uploadMedia/listMedia/listMediaFolders/updateMedia/deleteMedia` typed helpers.
- `src/components/admin/AdminSidebar.tsx` — add "Media Library" entry under a new "Content" group.
- `next.config.mjs` — extend the static `Cache-Control` rule to cover `/uploads/:path*`.
- `.gitignore` — add `public/uploads/`.
- The 17 admin pages in the sweep table — replace `<Input type="url">` for the listed fields with `<MediaUploadField>`.

## Verification (manual smoke test)

1. **Upload from settings**: log in, go to `/admin/settings`, click "Upload" next to Logo URL. Drag a PNG. Progress bar → thumbnail → URL populated.
2. **Library round-trip**: visit `/admin/media`. Empty state. Drag a few images. They appear with thumbnails. Refresh — they're still there.
3. **Picker integration**: go to `/admin/page-banner`. Add banner → click "Library" → modal opens → pick an existing image → modal closes, field has the URL, preview shows.
4. **External URL still works**: paste `https://placehold.co/600x400` into a URL field. Save. Public site shows that image.
5. **Wrong MIME**: upload a `.pdf`. Server rejects with 415, UI shows toast.
6. **Oversize**: upload a 10 MB image. Server rejects with 413.
7. **Public rendering**: visit `/`. Confirm the uploaded logo shows in the header. Hard-refresh — still there.
8. **Filesystem**: `ls public/uploads/2026/06/` shows uploaded files with sensible names.
9. **Delete**: in `/admin/media`, delete an upload. Confirm file gone from disk and Media doc gone.
10. **Sharp resize**: upload a 4000px-wide image. Confirm saved file is < 2 MB and 1920px wide. Check `next/image` serves it without recompression.
11. **Folder organization**: upload into "Hero Banners" folder. In library, filter by that folder. Only matching items appear.
12. **Search**: upload 10 items, search "hero" in filename. Matching ones filter.

## Out of Scope (deferred to future specs)

- Per-folder RBAC (admin vs seo_content) — all admins can upload anywhere.
- Video transcoding (mp4 → webm) — store original.
- Bulk upload (zip, multi-file drag-drop) — one file at a time in v1.
- Image alt text per Media — admin sets alt at the call site.
- CDN integration — Next.js static handler only.
- Admin-side image editing (rotate, crop, filters) — upload-only.
- Replacing existing hardcoded `/public/*.webp` assets — out of scope.

## Self-Review

1. **Placeholder scan:** No "TBD" or "TODO". All defaults pulled from the spec ("5 MB", "50 MB", "1920px", etc.).
2. **Internal consistency:** `Media` model is referenced by the API, the storage adapter, and the `siteContext` reader — all consistent. `TAGS.MEDIA` is added to `revalidate.ts` and used in `media/upload/route.ts` and `media/[id]/route.ts`.
3. **Scope check:** Single spec, ~15-18 tasks. Mechanical form sweep is the largest task; acceptable.
4. **Ambiguity check:** "Image URL field" in every admin page has the same shape (string URL) — the swap is unambiguous. "Folder" is a free-form string label, not a hierarchical path — explicit.
