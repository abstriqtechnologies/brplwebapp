# Dynamic Pages System — Admin Panel Design

## Context

BRPL website has multiple static pages (Home, About Us, Teams, Events, Career, Contact Us, FAQs, Partners, Privacy Policy, Terms & Conditions, Rule Book, etc.) with hardcoded content in their components. An admin needs to be able to edit every piece of content on every page — banners, titles, descriptions, images, videos, section-by-section — through the admin panel.

The project already has:
- `SitePage` model with predefined page keys (but limited fields)
- `AboutCms`, `HomeCms`, `RegistrationCms`, `LegalPage` models for structured CMS data
- `SiteContext` + hooks (`useHomeCms()`, `useAboutCms()`, `useLegal()`, etc.)
- `PageBanner` model for per-page hero banners
- Admin CRUD patterns (blogs, coupons)
- `BlogEditor` rich text component (TipTap-based)

**Problem:** Current CMS models are rigid — each page has its own model with hardcoded section shapes. "About" has `AboutCms` with `{banner, aboutBrpl, missionVision, meetOurTeam}` but you can't add a new section or reorganize content. Individual section components like `MissionVisionSection`, `AboutSection`, `MeetOurTeamSection` accept props but are tightly coupled to their specific rendering.

**Goal:** A single unified admin panel at `/admin/pages` where every page on the site is listed, and clicking into a page shows ALL its editable content — every section, every field — with the admin interface mirroring the frontend's actual component structure.

---

## Architecture

### 1. Data Model: Flexible Section-Based Schema

Replace rigid per-page CMS models with a single `Page` model that stores sections as an ordered array. Each section is a typed block with its own fields.

```typescript
// src/models/SitePage.ts (extended)

export interface PageSection {
  _id: string;
  type: string;        // e.g. "hero-banner", "about-text", "mission-vision", "team-grid", "trust-bar", "cta-banner"
  order: number;
  title?: string;
  subtitle?: string;
  description?: string; // rich HTML
  image?: string;
  imageMobile?: string;
  videoUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  // Type-specific data stored in this field
  data?: Record<string, any>;
  active: boolean;
}

export interface ISitePage extends Document {
  key: string;         // "home", "about-us", "teams", "career", "contact-us" etc.
  title: string;
  subtitle?: string;
  sections: PageSection[];
  meta?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

**Why sections array instead of fixed fields?**
- Each page has different sections. About has mission/vision/about-brpl/team. Home has hero/who-we-are/trust-bar/ambassadors/teams/broadcasting-partners/events-gallery.
- Adding a new section to a page later doesn't require a model migration — just push a new section object.
- Ordering is explicit via `order` field.
- Individual sections can be toggled on/off via `active`.

**Migration path:** Existing data in `HomeCms`, `AboutCms`, `RegistrationCms`, `LegalPage`, `PageBanner`, `SitePage` will be seeded into the new `SitePage.sections` array during a one-time migration. The old models remain untouched for backward compatibility.

### 2. Page Registry

Each page defines what sections it can contain:

```typescript
// src/lib/pageRegistry.ts
export const PAGE_REGISTRY: Record<string, PageConfig> = {
  "home": {
    label: "Home",
    sections: [
      { type: "hero-banner",   label: "Hero Banner",     maxItems: 1 },
      { type: "who-we-are",    label: "Who We Are",      maxItems: 1 },
      { type: "trust-bar",     label: "Trust Bar / Stats", maxItems: 1 },
      { type: "event-gallery", label: "Event Gallery",   maxItems: 1 },
      { type: "ambassadors",   label: "Ambassadors",     maxItems: 1 },
      { type: "teams-slider",  label: "Teams Slider",    maxItems: 1 },
      { type: "broadcasting",  label: "Broadcasting Partners", maxItems: 1 },
    ]
  },
  "about-us": {
    label: "About Us",
    sections: [
      { type: "hero-banner",   label: "Page Banner",     maxItems: 1 },
      { type: "about-text",    label: "About BRPL",      maxItems: 1 },
      { type: "mission-vision",label: "Mission & Vision", maxItems: 1 },
      { type: "team-grid",     label: "Meet Our Team",   maxItems: 1 },
    ]
  },
  "teams": {
    label: "Teams",
    sections: [
      { type: "hero-banner",   label: "Page Banner",     maxItems: 1 },
      { type: "teams-page-content", label: "Teams Content", maxItems: 1 },
    ]
  },
  "career": {
    label: "Career",
    sections: [
      { type: "hero-banner",   label: "Page Banner",     maxItems: 1 },
      { type: "career-content",label: "Career Content",  maxItems: 1 },
    ]
  },
  "contact-us": {
    label: "Contact Us",
    sections: [
      { type: "hero-banner",   label: "Page Banner",     maxItems: 1 },
      { type: "contact-form",  label: "Contact Form",    maxItems: 1 },
    ]
  },
  "faqs-page": {
    label: "FAQs",
    sections: [
      { type: "hero-banner",   label: "Page Banner",     maxItems: 1 },
      { type: "faqs-content",  label: "FAQs Content",    maxItems: 1 },
    ]
  },
  "events-page": {
    label: "Events",
    sections: [
      { type: "hero-banner",   label: "Page Banner",     maxItems: 1 },
      { type: "events-list",   label: "Events List",     maxItems: 1 },
    ]
  },
  "partners": {
    label: "Partners",
    sections: [
      { type: "hero-banner",   label: "Page Banner",     maxItems: 1 },
      { type: "partners-content", label: "Partners Content", maxItems: 1 },
    ]
  },
  "blog-index": {
    label: "Blog",
    sections: [
      { type: "hero-banner",   label: "Page Banner",     maxItems: 1 },
    ]
  },
  "news-index": {
    label: "News",
    sections: [
      { type: "hero-banner",   label: "Page Banner",     maxItems: 1 },
    ]
  },
  "privacy-page": {
    label: "Privacy Policy",
    sections: [
      { type: "hero-banner",   label: "Page Banner",     maxItems: 1 },
      { type: "legal-content", label: "Privacy Content", maxItems: 1 },
    ]
  },
  "terms-page": {
    label: "Terms & Conditions",
    sections: [
      { type: "hero-banner",   label: "Page Banner",     maxItems: 1 },
      { type: "legal-content", label: "Terms Content",   maxItems: 1 },
    ]
  },
  "rule-book": {
    label: "Rule Book",
    sections: [
      { type: "hero-banner",   label: "Page Banner",     maxItems: 1 },
      { type: "legal-content", label: "Rule Book Content", maxItems: 1 },
    ]
  },
};
```

### 3. Section Type Registry

Each section type maps to a React component (for preview) and a form (for editing):

```typescript
// src/components/admin/page-editor/sectionRegistry.ts
export const SECTION_REGISTRY = {
  "hero-banner": {
    component: HeroBannerSection,
    editor: HeroBannerEditor,
    defaultData: { image: "/tenis.webp", title: "Page Title" },
  },
  "who-we-are": {
    component: WhoWeAreSection,
    editor: WhoWeAreEditor,
    defaultData: {
      title: "Beyond Reach Premier League",
      subtitle: "India's Grassroots T10 Cricket League",
      tagline: '"BRPL – Bharat ki League, Bharatiyon ka Sapna"',
      description: "<p>...</p>",
      image: "/home2.webp",
    },
  },
  "about-text": {
    component: AboutSection,
    editor: AboutTextEditor,
    defaultData: {
      title: "About BRPL",
      description: "<p>...</p>",
      image: "/trophy image.webp",
    },
  },
  "mission-vision": {
    component: MissionVisionSection,
    editor: MissionVisionEditor,
    defaultData: {
      missionTitle: "Our Mission",
      missionDescription: "<p>...</p>",
      missionImage: "/about-2.webp",
      visionTitle: "Our Vision",
      visionDescription: "<p>...</p>",
      visionImage: "/vision.webp",
    },
  },
  "team-grid": {
    component: MeetOurTeamSection,
    editor: TeamGridEditor,
    // Teams come from the `teams` collection, not page sections directly
    isCollectionBased: true,
    collectionKey: "teams",
  },
  "trust-bar": {
    component: TrustBar,
    editor: TrustBarEditor,
    defaultData: {
      items: [
        { icon: "Trophy", hook: "₹3 Crore", descriptor: "TOTAL PRIZE POOL" },
        { icon: "Circle", hook: "Tennis Ball", descriptor: "NO BIG KIT REQUIREMENTS" },
      ]
    }
  },
  // ... more section types
};
```

### 4. Admin UI

#### 4.1 Pages List (`/admin/pages`)

A table listing all pages from the page registry. Each row shows:
- Page icon + label
- Key
- Last updated
- Number of sections
- Edit button

Pattern identical to [`/admin/blogs`](src/app/(admin)/admin/blogs/page.tsx).

#### 4.2 Page Editor (`/admin/pages/[key]`)

A **section-by-section editor** that mirrors the frontend's component structure:

**Layout:**
- Left sidebar: List of all sections for this page with drag-to-reorder
- Main area: Selected section's edit form + Live preview

**Section Editor Form** Every section type has a custom form with relevant fields:
- Text fields → `<Input>`
- Rich text → `<BlogEditor>` (reuse existing TipTap editor from `src/components/admin/BlogEditor.tsx`)
- Images → Updated `<ImageUpload>` that uploads to VPS local storage
- Videos → URL input + preview
- Toggle → Active/inactive switch
- Collections → Auto-populated select (for team-grid, ambassador-carousel etc.)

**Preview:** Renders the actual section component with current form data in real-time using `SECTION_REGISTRY[type].component`.

**Save:** Entire page (all sections) saved in one PATCH request to `/api/admin/pages/[key]`.

### 5. File Upload to VPS Local Storage (Project's Own Server)

**Important clarity:** "VPS local storage" means the same VPS server where the Next.js application runs. Files are stored on the server's own filesystem, served directly by Next.js as static assets. No external/cloud storage (S3, Cloudinary, etc.) is involved.

**How it works:**
- Files are saved to the Next.js `public/uploads/` directory on the VPS
- Next.js serves files from `public/` as static files at the root path
- So a file saved at `public/uploads/2026/06/uuid-image.webp` is accessible at `/uploads/2026/06/uuid-image.webp`
- Backend uses `fs` (Node.js file system) to write files to disk
- When deploying to the VPS, the `public/uploads/` directory persists across deployments (it's outside the build artifact or a symlink points to a persistent volume)

**New API: `POST /api/admin/upload`**
- Accepts `multipart/form-data` with a `file` field
- Validates file type (jpg, png, webp, gif → images; mp4, webm → videos)
- Max size: 50MB
- Saves to `public/uploads/{year}/{month}/{uuid}-{filename}`
- Returns `{ url: "/uploads/2026/06/uuid-filename.webp" }`
- Requires superadmin auth
- Uses Node.js `fs` + `path` modules for file writing

**Updated `ImageUpload` component (`src/components/admin/ImageUpload.tsx`):**
- Currently stores images as base64 data URLs in localStorage
- **Change:** Uploads file to `POST /api/admin/upload`, stores returned URL
- Shows uploaded image preview via `<img src="/uploads/...">`
- "Remove" just clears the field value (doesn't delete file from disk — intentional, avoids accidental data loss)

**Production deployment consideration:**
On the VPS, ensure the `public/uploads/` directory has write permissions for the Node.js process. A simple `mkdir -p public/uploads` during deploy setup is sufficient.

### 6. Frontend Page Consumption

Each static page component will:
1. Read its sections from `useSitePages()` or `getSitePages()` 
2. If CMS has sections → render each section by looking up `SECTION_REGISTRY[section.type].component`
3. If no CMS data → render existing hardcoded fallback

Example for About Us page:

```tsx
// src/app/(main)/about-us/page.tsx
export default async function AboutUs() {
  const ctx = await getSiteContext();
  const pageData = ctx.pages["about-us"];
  const sections = pageData?.sections || [];
  
  return (
    <SiteContextProvider value={ctx}>
      {sections.length > 0 ? (
        <DynamicPageRenderer sections={sections} />
      ) : (
        <StaticAboutUs /> // existing fallback
      )}
    </SiteContextProvider>
  );
}
```

`DynamicPageRenderer` iterates sections and maps to registered components:

```tsx
function DynamicPageRenderer({ sections }: { sections: PageSection[] }) {
  return sections
    .filter(s => s.active)
    .sort((a, b) => a.order - b.order)
    .map(section => {
      const Component = SECTION_REGISTRY[section.type]?.component;
      if (!Component) return null;
      return <Component key={section._id} {...section} />;
    });
}
```

### 7. API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/admin/pages` | List all pages |
| `GET` | `/api/admin/pages/[key]` | Get single page with all sections |
| `PATCH` | `/api/admin/pages/[key]` | Update page (replaces sections array) |
| `POST` | `/api/admin/upload` | Upload file to VPS local storage |

Following existing admin patterns from [`src/app/api/admin/blogs/route.ts`](src/app/api/admin/blogs/route.ts):
- Use `withRequest` + `withAdmin` middleware
- Zod validation
- `connectDB()`
- `ok()` / `BadRequestError` response helpers

### 8. Admin Sidebar

Add "Pages" to [`AdminSidebar.tsx`](src/components/admin/AdminSidebar.tsx):

```typescript
{ label: "Pages", href: "/admin/pages", icon: FileText }
```

### 9. Component Inventory — All Sections to Make Editable

| Page | Sections | Frontend Components |
|------|----------|-------------------|
| Home | Hero Banners, Who We Are, Trust Bar, Event Gallery, Ambassadors, Teams Slider, Broadcasting Partners | `Banner`, `WhoWeAre`, `TrustBar`, `EventGallerySlider`, `AmbassadorsSection`, `Teams`, `BroadcastingPartners` |
| About Us | Page Banner, About BRPL, Mission & Vision, Meet Our Team | `PageBanner`, `AboutSection`, `MissionVisionSection`, `MeetOurTeamSection` |
| Teams | Page Banner, Teams Content | `PageBanner`, `TeamsClient` |
| Events | Page Banner, Events Content | `PageBanner`, `EventsClient` |
| Career | Page Banner, Career Content | `PageBanner`, `CareerClient` |
| Contact Us | Page Banner, Contact Form | `PageBanner`, `ContactUsClient` |
| FAQs | Page Banner, FAQs Content | `PageBanner`, `FAQsClient` |
| Partners | Page Banner, Partners Content | `PageBanner`, `BecomePartnerClient` |
| Privacy Policy | Page Banner, Legal Content | `PageBanner` + static fallback |
| Terms & Conditions | Page Banner, Legal Content | `PageBanner` + static fallback |
| Rule Book | Page Banner, Legal Content | `PageBanner` + static fallback |

---

## Files to Create

1. `src/models/SitePage.ts` — **Extend** existing model: add `sections: PageSection[]` field
2. `src/lib/pageRegistry.ts` — NEW: page registry config
3. `src/components/admin/page-editor/sectionRegistry.ts` — NEW: section type → component + editor mapping
4. `src/app/(admin)/admin/pages/page.tsx` — NEW: pages list (client component, pattern from `/admin/blogs`)
5. `src/app/(admin)/admin/pages/[key]/page.tsx` — NEW: page editor wrapper
6. `src/components/admin/page-editor/PageEditorClient.tsx` — NEW: page editor UI
7. `src/components/admin/page-editor/SectionEditor.tsx` — NEW: section type → form mapping
8. `src/components/admin/page-editor/editors/*.tsx` — NEW: individual section editors (HeroBannerEditor, WhoWeAreEditor, AboutTextEditor, MissionVisionEditor, TrustBarEditor, etc.)
9. `src/components/admin/page-editor/DynamicPageRenderer.tsx` — NEW: renders sections on frontend
10. `src/app/api/admin/pages/route.ts` — NEW: GET list
11. `src/app/api/admin/pages/[key]/route.ts` — NEW: GET + PATCH single page
12. `src/app/api/admin/upload/route.ts` — NEW: file upload to VPS
13. `src/components/admin/ImageUpload.tsx` — **Update** from localStorage base64 → VPS upload
14. `src/components/admin/AdminSidebar.tsx` — **Update**: add "Pages" nav item

## Files to Modify

1. `src/components/admin/ImageUpload.tsx` — Upload to VPS instead of localStorage
2. `src/components/admin/AdminSidebar.tsx` — Add Pages nav item
3. `src/app/(main)/about-us/page.tsx` — Use dynamic sections
4. `src/app/(main)/page.tsx` — Use dynamic sections
5. `src/app/(main)/teams/page.tsx` — Use dynamic sections
6. `src/app/(main)/events/page.tsx` — Use dynamic sections
7. `src/app/(main)/career/page.tsx` — Use dynamic sections
8. `src/app/(main)/contact-us/page.tsx` — Use dynamic sections
9. `src/app/(main)/faqs/page.tsx` — Use dynamic sections
10. `src/app/(main)/partners/page.tsx` — Use dynamic sections
11. `src/app/(main)/privacy-policy/page.tsx` — Use dynamic sections
12. `src/app/(main)/terms-and-conditions/page.tsx` — Use dynamic sections
13. `src/app/(main)/rule-book/page.tsx` — Use dynamic sections
14. `src/lib/siteContext.ts` — Add pages data to SiteContext type

## Implementation Order

1. **Model & Data Layer:** Extend `SitePage` model → Create page registry → Migration script to seed existing data
2. **API Routes:** `/api/admin/pages` (list + get + patch) → `/api/admin/upload` (file upload)
3. **ImageUpload Update:** Switch from localStorage to VPS upload
4. **Admin UI:** Pages list → Page editor (section-by-section forms + live preview) → Section editors
5. **Frontend:** `DynamicPageRenderer` → Update individual page components to use dynamic data
6. **Sidebar:** Add "Pages" nav item

## Verification

1. Login as admin → navigate to `/admin/pages`
2. All 14 pages listed with their sections
3. Click "About Us" → see all 4 sections (Page Banner, About BRPL, Mission & Vision, Meet Our Team)
4. Edit "About BRPL" section title + description → save
5. Visit `/about-us` → see updated content
6. Upload a new image via ImageUpload component → verify file appears in `/uploads/` directory
7. Toggle a section's active/inactive → verify it shows/hides on frontend
8. All existing static content remains as fallback when no CMS data exists
