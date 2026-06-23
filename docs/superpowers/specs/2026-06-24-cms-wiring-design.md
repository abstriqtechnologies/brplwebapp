# Design — Wire Public Frontend to Admin CMS

**Date:** 2026-06-24
**Project:** brpl-frontend
**Author:** brainstorming session

## Context

The BRPL admin module (built in a prior session) exposes ~30 admin pages backed by Mongoose models for SiteSettings, HomeCms, AboutCms, RegistrationCms, LegalPage, SeoMeta, PageBanner, plus collections (events, jobs, ambassadors, teams, partners, campaigns, faqs, blogs, news). Today the **public** site under `src/app/(main)/` and the global chrome (`Header`, `Footer`, `SEO`, `CustomHeadScripts`, etc.) hardcode every value — copy, phone numbers, addresses, social links, banner text, hero imagery, partner logos, even the favicon path. The existing `useSiteSettings()` hook is a static stub returning hardcoded defaults.

**Goal:** every value the public site displays becomes DB-driven, editable from the admin panel. Image assets that are already files on disk (`/logo.webp`, `/favicon.ico`) stay physical for now — admin stores their URL/path; **file uploads come in a Phase 2 spec**.

**Phase 1 scope (this spec):** wire text content + image URLs everywhere. No new upload endpoints.

## Approach (chosen)

**Server-side `getSiteContext()` helper with `unstable_cache` and per-slice tags, called once at root layout, distributed via React context.** Every public page becomes a thin Server Component that consumes the context. Admin PATCH handlers call `revalidateTag(...)` for the affected slices so changes propagate within ~1s without a full redeploy.

Alternatives considered and rejected:
- **Per-page fetcher functions** — surgical but lots of boilerplate, easy to forget invalidation.
- **Single client hook + SWR** — simplest wiring but loses SSR/SEO and adds hydration flicker.

## Data Model

### Extend `SiteSettings` (existing)

New fields (all optional, with defaults from current hardcoded values):

```ts
SiteSettings = {
  // existing
  siteName, tagline, contactEmail, contactPhone, contactPhoneSecondary,
  contactAddress, heroImage, heroVideoUrl, primaryColor, socials,
  registrationFee, registrationDeadline, trialStartDate, trialEndDate,

  // new
  logoUrl: string;                 // defaults to "/logo.webp"
  footerLogoUrl?: string;          // defaults to logoUrl
  faviconUrl: string;              // defaults to "/favicon.ico"
  appleTouchIconUrl?: string;
  ogImage?: string;                // for SEO defaults
  twitterHandle?: string;
  homeSeoTitle: string;
  homeSeoDescription: string;
  homeSeoKeywords?: string;
  headerCtaText: string;           // "Register Now"
  headerCtaLink: string;           // "/registration"
  navbarLinks: NavbarLink[];      // [{ label, path, children?: NavbarLink[] }]
  footerLinks: FooterLinkGroup[];  // [{ heading, links: [{ label, path }] }]
  footerAboutText: string;
  mapEmbedUrl: string;
  whatsappNumber: string;          // E.164 without '+'
  floatingRegisterText: string;
  floatingRegisterLink: string;
  customHeadScripts: string;       // raw HTML
  customBodyScripts: string;
}
```

### Extend `HomeCms` (existing)

Add to existing doc:

```ts
HomeCms = {
  // existing
  banners: HomeBanner[];
  whoWeAre: WhoWeAreBlock;

  // new
  trustBar: { label: string; value: string; icon?: string }[];
  broadcastingPartners: { name: string; logo: string; website?: string; order?: number }[];
}
```

### New model `SitePage`

Single collection, key → content. Holds all the "page-block" content for the 14 hardcoded public pages.

```ts
SitePage = {
  _id;
  key: string;   // unique, e.g. "about-us"
  title: string;
  subtitle?: string;
  body?: string;       // long-form markdown/html
  heroImage?: string;
  heroImageMobile?: string;
  ctaText?: string;
  ctaLink?: string;
  meta?: Record<string, any>;   // page-specific extras (address, hours, etc.)
  order?: number;
  createdAt, updatedAt;
}
```

Keys: `about-us`, `teams`, `career`, `contact-us`, `events-page`, `partners`, `registration-page`, `types-of-partners`, `blog-index`, `news-index`, `privacy-page`, `terms-page`, `rule-book`, `faqs-page`.

### Other models

`AboutCms`, `RegistrationCms`, `LegalPage`, `SeoMeta`, `PageBanner`, and all collection models — **no schema changes**. The wiring just exposes what already exists to the public site.

## Site Context Loader

### `src/lib/siteContext.ts`

Single source of truth for DB-driven public content.

```ts
export type SiteContext = {
  siteSettings: SiteSettingsPublic;
  home: HomeSection;
  about: AboutSection;
  registration: RegistrationSection;
  legal: { privacy: LegalDoc; terms: LegalDoc; rulebook: LegalDoc };
  seo: Record<string, SeoMetaEntry>;
  pageBanners: Record<string, PageBannerEntry>;
  collections: CollectionsBundle;   // events, jobs, ambassadors, teams, partners, campaigns, faqs, blogs, news
  pages: Record<SitePageKey, SitePageDoc>;
  socialLinks: SocialLink[];
  navLinks: NavbarLink[];
  footerLinks: FooterLinkGroup[];
};
```

Two functions:

```ts
export async function getSiteContext(): Promise<SiteContext>;
export async function getSiteContextSlice<K extends keyof SiteContext>(
  slice: K,
  options?: { revalidateSec?: number }
): Promise<SiteContext[K]>;
```

`getSiteContext()` wraps the whole bundle in `unstable_cache(..., ['site-context'], { tags: ['site-context'], revalidate: 3600 })`.

`getSiteContextSlice('home', ...)` wraps just the requested slice with its own tag (e.g. `site-context:home`).

Both fall back to hardcoded defaults on any DB error or empty doc — the public site never breaks because admin DB is empty.

### `src/components/SiteContextProvider.tsx`

Client component that receives the full `SiteContext` as a prop and exposes it via `React.createContext` + a `useSiteContext()` hook. Mounted once in the root `layout.tsx` so every page and component can pull values without prop drilling.

### Root `layout.tsx`

Convert from a Server Component that returns just `<RootProviders>{children}</RootProviders>` into one that:

1. `await getSiteContext()`
2. Passes to `<SiteContextProvider value={ctx}>`
3. Inside, renders the existing `RootProviders` chain, then `{children}`

The `SiteContextProvider` is the only new piece; `RootProviders` stays as is.

## Public Page Wiring

### Global chrome (in root layout)

| Component | Reads from |
|-----------|------------|
| `Header` | `siteSettings.logoUrl`, `siteSettings.navbarLinks`, `siteSettings.headerCtaText/Link` |
| `Footer` | `siteSettings.contactEmail/Phone/Address`, `siteSettings.socialLinks`, `siteSettings.footerLinks`, `siteSettings.footerLogoUrl`, `siteSettings.footerAboutText`, `siteSettings.mapEmbedUrl` |
| `SEO` | `seo[pathname]` (per-page override) + `siteSettings.homeSeoTitle/Description/ogImage` (defaults) |
| `CustomHeadScripts` | `siteSettings.customHeadScripts` |
| `CustomBodyScripts` | `siteSettings.customBodyScripts` |
| `FloatingWhatsAppButton` | `siteSettings.whatsappNumber` |
| `FloatingRegisterButton` | `siteSettings.floatingRegisterText/Link` |
| `FloatingRegisterButton` + `FloatingWhatsAppButton` mount flags | derive from whether their data is present |
| Root `<metadata>` (favicon, og) | `siteSettings.faviconUrl`, `siteSettings.ogImage` |

### Page-level

| Page | Reads from |
|------|------------|
| `/` | `home.banners`, `home.whoWeAre`, `home.trustBar`, `home.broadcastingPartners`, `collections.ambassadors`, `collections.teams`, `collections.events` |
| `/about-us` | `about.*`, `pages['about-us']`, `collections.teams` |
| `/teams` | `pages['teams']`, `collections.teams` |
| `/career` | `pages['career']`, `collections.jobs` |
| `/contact-us` | `siteSettings`, `pages['contact-us']` |
| `/events` | `pages['events-page']`, `collections.events` |
| `/partners` | `pages['partners']`, `collections.partners` |
| `/registration` | `registration.*`, `pages['registration-page']` |
| `/types-of-partners` | `pages['types-of-partners']` |
| `/blog` | `pages['blog-index']`, `collections.blogs` |
| `/blog/[slug]` | `collections.blogs` lookup by slug |
| `/news` | `pages['news-index']`, `collections.news` |
| `/news/[slug]` | `collections.news` lookup by slug |
| `/press/[id]` | `siteSettings` + path-id lookup |
| `/privacy-policy` | `legal.privacy`, `pages['privacy-page']` |
| `/terms-and-conditions` | `legal.terms`, `pages['terms-page']` |
| `/rule-book` | `legal.rulebook`, `pages['rule-book']` |
| `/faqs` | `pages['faqs-page']`, `collections.faqs` |
| `/thank-you` | `siteSettings` |

Every existing page file keeps its current visual JSX. Where a component previously took props like `title="static"`, it now receives the value from the SiteContext. Most pages today are Server Components or thin wrappers — they become even thinner.

### Metadata

Every `export const metadata` becomes `export async function generateMetadata({ params })` that reads `SeoMeta` for the matching path, falling back to per-page defaults from `SitePage` documents.

## Admin UI

### Existing pages (already built — no work needed)

`/admin/dashboard`, `/admin/faqs`, `/admin/blog`, `/admin/news`, `/admin/events`, `/admin/jobs`, `/admin/ambassadors`, `/admin/teams`, `/admin/partners`, `/admin/campaigns`, `/admin/coupons`, `/admin/coupon-usage`, `/admin/contact-us-leads`, `/admin/social-contact`, `/admin/page-banner`, `/admin/cms/banners`, `/admin/cms/who-we-are`, `/admin/about-us/*`, `/admin/registration-*`, `/admin/privacy-policy`, `/admin/terms-conditions`, `/admin/rule-book`, `/admin/paid-users`, `/admin/unpaid-users`, `/admin/registered-users`, `/admin/users/[id]`, `/admin/payments`, `/admin/profile`.

### Extend `/admin/settings`

Add new sections to the form (uses existing `CmsForm` component + a few custom repeaters):

- **Branding**: siteName, tagline, logoUrl, footerLogoUrl, faviconUrl, appleTouchIconUrl, ogImage, primaryColor.
- **Home SEO**: homeSeoTitle, homeSeoDescription, homeSeoKeywords.
- **Header & Nav**: headerCtaText/Link, navbarLinks (repeater with nested children).
- **Footer**: footerAboutText, footerLinks (grouped repeater), mapEmbedUrl.
- **WhatsApp & Floating CTAs**: whatsappNumber, floatingRegisterText, floatingRegisterLink.
- **Scripts**: customHeadScripts, customBodyScripts (large textareas, raw HTML).

Save → PATCH `/api/admin/settings` with the full body → `revalidateTag('site-context')`.

### New page `/admin/site-pages`

Lists all 14 `SitePage` keys in a tab UI. Each tab shows a form (title, subtitle, body, heroImage, ctaText/Link, optional meta JSON). Save → upsert at `/api/admin/site-pages/[key]`.

### Extend `/admin/cms/banners` (home page)

Add two new editors below the banner list:
- `TrustBar` — list of `{label, value, icon?}` items.
- `BroadcastingPartners` — list of `{name, logo, website?}` items.

Save → PATCH `/api/admin/home/banners` (extend existing route).

### Admin sidebar nav

Add one new entry: `Site Pages` (single line in `AdminSidebar.tsx`).

## Admin API

### New route: `/api/admin/site-pages/[key]`

- `GET` → upsert an empty doc, return current (with defaults).
- `PATCH` → validate body with Zod, upsert.

### Extend existing routes

- `PATCH /api/admin/settings` — accept the new fields.
- `PATCH /api/admin/home/banners` — accept `trustBar`, `broadcastingPartners` (stored under `HomeCms` top-level since it's a single-doc collection).

Every successful admin PATCH calls `revalidateTag('site-context')` plus the slice-specific tag.

## Cache + Revalidation

| Cache tag | Invalidation trigger |
|-----------|---------------------|
| `site-context` | any admin PATCH |
| `site-context:home` | settings, home/* |
| `site-context:about` | about-us/* |
| `site-context:registration` | registration-* |
| `site-context:legal` | legal/* |
| `site-context:collections` | blog, news, events, jobs, ambassadors, teams, partners, faqs |
| `site-context:seo` | meta-content |
| `site-context:page-banners` | page-banner |

Each PATCH calls `revalidateTag('site-context')` plus the slice tag.

Per-request cost: ~10-12 MongoDB queries in parallel (Promise.all), all cached after the first hit. Uncached: ~50-150ms. Cached: ~1ms.

## Defaults

Every field in `getSiteContext()` falls back to current hardcoded values when:
- DB is unreachable.
- Doc is missing.
- Field is empty.

Defaults live inline in `siteContext.ts` so a fresh DB produces a site that looks identical to today.

## Feature flag

`CMS_LIVE` env var (default `true`):
- `true` → `getSiteContext()` reads from DB.
- `false` → `getSiteContext()` returns hardcoded defaults only, skips DB.

Admin panel always reads from DB regardless of flag.

## Error handling

- **DB unreachable** → `getSiteContext()` catches, logs, returns defaults. Public site unchanged.
- **Missing image URL** → components pass a `fallbackSrc` from defaults; `next/image` `onError` hides the broken icon.
- **Invalid Zod parse** → log + fall back to defaults for that slice.
- **Admin PATCH fails** → existing toast/error UI; form keeps edits.

## Verification (manual smoke test)

1. **Cold load** — fresh DB, visit `/`, all 18 public pages, footer, header. Visually identical to today.
2. **Single-field edit** — change `contactPhone` in admin, save, reload public site. New number appears within ~1s.
3. **Re-validate propagation** — change `home.banners[0].title`. Reload `/`. New title shows.
4. **Image swap** — change `siteSettings.logoUrl`. Header + footer logos update.
5. **Legal page edit** — change `privacy` content. `/privacy-policy` updates.
6. **Collection CRUD** — add a blog post via admin. Reload `/blog`. New card appears.
7. **Cache survival** — hit a page 5 times. Only 1 DB roundtrip (server log or MongoDB profiler).
8. **Empty defaults** — wipe SiteSettings, SitePage, HomeCms docs. Public site still renders without errors.
9. **404/not-found** — `/not-found` reads `siteSettings` for any branded copy.
10. **Middleware unaffected** — admin auth + dashboard auth still work.

## Out of scope (Phase 2 / future)

- File uploads (S3 / local `/public/uploads`).
- Image cropping / focal-point selection.
- Multi-language content editing (admin stays English; public `react-i18next` unchanged).
- Versioning / draft history.
- Per-field role permissions beyond the existing 3-role split.
- Live preview before save.

## Critical files to touch

**New:**
- `src/lib/siteContext.ts`
- `src/components/SiteContextProvider.tsx`
- `src/models/SitePage.ts`
- `src/app/(admin)/admin/site-pages/page.tsx`
- `src/app/api/admin/site-pages/[key]/route.ts`

**Modify:**
- `src/app/layout.tsx` (root, becomes async Server Component)
- `src/models/SiteSettings.ts` (new fields)
- `src/models/HomeCms.ts` (new fields)
- `src/lib/adminApi.ts` (add revalidateTag helper)
- Every API route that PATCHes CMS data (add `revalidateTag` calls)
- `src/components/Header.tsx`, `Footer.tsx`, `SEO.tsx`, `CustomHeadScripts.tsx`, `CustomBodyScripts.tsx`, `FloatingWhatsAppButton.tsx`, `FloatingRegisterButton.tsx`
- Every public page file under `src/app/(main)/**/page.tsx` — make async Server Component, fetch slice, pass to existing JSX
- `src/components/Banner.tsx`, `WhoWeAre.tsx`, `Teams.tsx`, `AmbassadorsSection.tsx`, `BroadcastingPartners.tsx`, `EventGallerySlider.tsx`, `MissionVisionSection.tsx`, `MeetOurTeamSection.tsx`, `AboutSection.tsx`, `RoadmapSection.tsx`, `ZoneDeadlineSection.tsx`, `PageBanner.tsx`, `LivesChangedSection.tsx`, `TrustBar.tsx` — accept data props
- `src/app/(admin)/admin/settings/page.tsx` — add new form sections
- `src/app/(admin)/admin/cms/banners/page.tsx` — add trustBar + broadcastingPartners editors
- `src/components/admin/AdminSidebar.tsx` — add Site Pages entry
- `src/hooks/useSiteSettings.ts` — keep stub signature but route through `useSiteContext()` if available

## Open questions

None. Approved in prior conversation.

## Self-review

- **Placeholders:** none — all defaults pulled from current hardcoded values.
- **Internal consistency:** cache tags line up between PATCH triggers and `unstable_cache` reads. Slice keys match the type union. Single `SiteContext` shape referenced consistently.
- **Scope:** focused — text + URL wiring only. File uploads explicitly Phase 2.
- **Ambiguity:** none. Every page maps to exactly one data source.
