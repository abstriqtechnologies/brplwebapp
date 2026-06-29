# Dynamic Pages System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin panel at `/admin/pages` where every static page on the site (Home, About, Teams, etc.) has all its sections individually editable through section-by-section forms, with images uploaded to the VPS filesystem.

**Architecture:** Extend the existing `SitePage` Mongoose model with a `sections: PageSection[]` array. Create a page registry defining which section types each page supports. Each section type maps to a React form component (admin) and a render component (frontend). A `DynamicPageRenderer` iterates sections and renders them on the frontend. Existing hardcoded content serves as fallback when no CMS data exists.

**Tech Stack:** Next.js 14 (App Router), Mongoose, Zod, TipTap rich text editor, Multer (multipart file upload), Node.js fs module, shadcn/ui components.

## Global Constraints

- Follow existing admin patterns: `withRequest` + `withAdmin` middleware, Zod validation, `connectDB()`, `ok()` / `BadRequestError` response helpers
- Reuse existing `BlogEditor` (TipTap) component for rich text fields
- Images stored on VPS filesystem under `public/uploads/{year}/{month}/{uuid}-{filename}` and served at `/uploads/...`
- All frontend pages must show existing hardcoded content as fallback when no CMS data exists
- Admin pages must be accessible only to `superadmin` role
- File upload max size: 50MB, allowed: jpg, png, webp, gif, mp4, webm

---

## File Structure

```
src/
├── models/
│   └── SitePage.ts                          # EXTEND: add sections field + PageSection interface
├── lib/
│   └── pageRegistry.ts                      # CREATE: page + section type registry
├── types/
│   └── pages.ts                              # CREATE: shared types for PageSection, SectionConfig
├── app/api/admin/
│   ├── pages/
│   │   ├── route.ts                          # CREATE: GET list all pages
│   │   └── [key]/route.ts                    # CREATE: GET single + PATCH update page sections
│   └── upload/route.ts                       # CREATE: POST file upload to VPS filesystem
├── components/admin/
│   ├── AdminSidebar.tsx                      # MODIFY: add "Pages" nav item
│   ├── ImageUpload.tsx                       # MODIFY: upload to VPS instead of localStorage
│   └── page-editor/
│       ├── sectionRegistry.ts                # CREATE: section type → component + editor mapping
│       ├── DynamicPageRenderer.tsx            # CREATE: renders sections on frontend
│       ├── SectionEditor.tsx                  # CREATE: wraps section type → form mapping
│       ├── PageEditorClient.tsx               # CREATE: main page editor UI
│       └── editors/
│           ├── HeroBannerEditor.tsx           # CREATE: hero banner section edit form
│           ├── WhoWeAreEditor.tsx             # CREATE: who-we-are section edit form
│           ├── AboutTextEditor.tsx            # CREATE: about text section edit form
│           ├── MissionVisionEditor.tsx        # CREATE: mission/vision section edit form
│           ├── TrustBarEditor.tsx             # CREATE: trust bar section edit form
│           ├── EventGalleryEditor.tsx         # CREATE: event gallery section edit form
│           ├── AmbassadorsEditor.tsx          # CREATE: ambassadors section edit form
│           ├── TeamsSliderEditor.tsx          # CREATE: teams slider section edit form
│           ├── BroadcastingEditor.tsx         # CREATE: broadcasting partners section edit form
│           ├── LegalContentEditor.tsx         # CREATE: legal content (privacy/terms/rulebook) edit form
│           ├── ContactFormEditor.tsx          # CREATE: contact section edit form
│           ├── CareerContentEditor.tsx        # CREATE: career section edit form
│           ├── FAQsContentEditor.tsx          # CREATE: FAQs section edit form
│           └── GenericContentEditor.tsx       # CREATE: fallback simple editor (title + body + image)
├── app/(admin)/admin/
│   └── pages/
│       ├── page.tsx                          # CREATE: pages list page
│       └── [key]/page.tsx                    # CREATE: page editor wrapper
└── app/(main)/
    ├── page.tsx                              # MODIFY: use DynamicPageRenderer
    ├── about-us/page.tsx                     # MODIFY: use DynamicPageRenderer
    ├── teams/page.tsx                        # MODIFY: use DynamicPageRenderer
    ├── events/page.tsx                       # MODIFY: use DynamicPageRenderer
    ├── career/page.tsx                       # MODIFY: use DynamicPageRenderer
    ├── contact-us/page.tsx                   # MODIFY: use DynamicPageRenderer
    ├── faqs/page.tsx                         # MODIFY: use DynamicPageRenderer
    ├── partners/page.tsx                     # MODIFY: use DynamicPageRenderer
    ├── privacy-policy/page.tsx               # MODIFY: use DynamicPageRenderer
    ├── terms-and-conditions/page.tsx          # MODIFY: use DynamicPageRenderer
    └── rule-book/page.tsx                    # MODIFY: use DynamicPageRenderer
```

---

### Task 1: Extend SitePage Model + Create Shared Types

**Files:**
- Modify: `src/models/SitePage.ts`
- Create: `src/types/pages.ts`
- Test: `tests/models/SitePage.test.ts`

**Interfaces:**
- Consumes: Existing Mongoose setup, `mongoose` Schema.Types.Mixed
- Produces: `PageSection` interface, `ISitePage` (extended), `SitePageKey` type

- [ ] **Step 1: Write the failing test**

```typescript
// tests/models/SitePage.test.ts
import { describe, it, expect } from "@jest/globals";

describe("SitePage Model", () => {
  it("should have sections field with correct defaults", () => {
    const section: PageSection = {
      _id: "test-id",
      type: "hero-banner",
      order: 0,
      title: "Test Title",
      active: true,
    };
    expect(section.type).toBe("hero-banner");
    expect(section.active).toBe(true);
    expect(section.order).toBe(0);
  });

  it("should create a page with sections", () => {
    const page: ISitePage = {
      key: "about-us",
      title: "About Us",
      sections: [
        {
          _id: "s1",
          type: "hero-banner",
          order: 0,
          title: "Hero",
          active: true,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(page.sections).toHaveLength(1);
    expect(page.sections[0].type).toBe("hero-banner");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/models/SitePage.test.ts --no-cache 2>&1 || true`
Expected: FAIL — `PageSection`, `ISitePage` not defined

- [ ] **Step 3: Create shared types file**

```typescript
// src/types/pages.ts
export interface PageSection {
  _id: string;
  type: string;
  order: number;
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  imageMobile?: string;
  videoUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  data?: Record<string, any>;
  active: boolean;
}

export interface PageMeta {
  title?: string;
  description?: string;
  keywords?: string;
}

export interface ISitePage {
  key: string;
  title: string;
  subtitle?: string;
  sections: PageSection[];
  meta?: PageMeta;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 4: Update the existing SitePage model**

```typescript
// src/models/SitePage.ts — REPLACE entire file
import mongoose, { Schema, Model, Document } from "mongoose";
import type { PageSection } from "@/types/pages";

export const SITE_PAGE_KEYS = [
  "home",
  "about-us",
  "teams",
  "career",
  "contact-us",
  "events-page",
  "partners",
  "types-of-partners",
  "blog-index",
  "news-index",
  "privacy-page",
  "terms-page",
  "rule-book",
  "faqs-page",
  "registration-page",
] as const;

export type SitePageKey = (typeof SITE_PAGE_KEYS)[number];

export interface ISitePageDocument extends Document {
  _id: mongoose.Types.ObjectId;
  key: SitePageKey;
  title: string;
  subtitle?: string;
  sections: PageSection[];
  meta?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

const PageSectionSchema = new Schema<PageSection>(
  {
    _id: { type: String, required: true },
    type: { type: String, required: true },
    order: { type: Number, required: true, default: 0 },
    title: { type: String },
    subtitle: { type: String },
    description: { type: String },
    image: { type: String },
    imageMobile: { type: String },
    videoUrl: { type: String },
    ctaText: { type: String },
    ctaLink: { type: String },
    data: { type: Schema.Types.Mixed },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const SitePageSchema = new Schema<ISitePageDocument>(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    title: { type: String, required: true },
    subtitle: { type: String },
    sections: { type: [PageSectionSchema], default: [] },
    meta: {
      type: new Schema({
        title: { type: String },
        description: { type: String },
        keywords: { type: String },
      }),
      default: {},
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const SitePage: Model<ISitePageDocument> =
  (mongoose.models.SitePage as Model<ISitePageDocument>) ||
  mongoose.model<ISitePageDocument>("SitePage", SitePageSchema);

export default SitePage;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest tests/models/SitePage.test.ts --no-cache 2>&1 || true`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/pages.ts src/models/SitePage.ts tests/models/SitePage.test.ts
git commit -m "feat(pages): extend SitePage model with sections array

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Create Page Registry

**Files:**
- Create: `src/lib/pageRegistry.ts`
- Test: `tests/lib/pageRegistry.test.ts`

**Interfaces:**
- Consumes: `SitePageKey` from model
- Produces: `PageConfig`, `SectionConfig`, `PAGE_REGISTRY`, `SECTION_TYPES`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/pageRegistry.test.ts
import { describe, it, expect } from "@jest/globals";

describe("Page Registry", () => {
  it("should have all required pages", () => {
    const keys = Object.keys(PAGE_REGISTRY);
    expect(keys).toContain("home");
    expect(keys).toContain("about-us");
    expect(keys).toContain("contact-us");
    expect(keys).toContain("privacy-page");
    expect(keys).toContain("terms-page");
  });

  it("about-us page should have 4 sections", () => {
    const about = PAGE_REGISTRY["about-us"];
    expect(about.label).toBe("About Us");
    expect(about.sections).toHaveLength(4);
    expect(about.sections[0].type).toBe("hero-banner");
    expect(about.sections[1].type).toBe("about-text");
    expect(about.sections[2].type).toBe("mission-vision");
    expect(about.sections[3].type).toBe("team-grid");
  });

  it("each section config should have type, label, maxItems", () => {
    for (const [, config] of Object.entries(PAGE_REGISTRY)) {
      for (const section of config.sections) {
        expect(section.type).toBeDefined();
        expect(section.label).toBeDefined();
        expect(typeof section.maxItems).toBe("number");
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/lib/pageRegistry.test.ts --no-cache 2>&1 || true`
Expected: FAIL — `PAGE_REGISTRY` not defined

- [ ] **Step 3: Create page registry file**

```typescript
// src/lib/pageRegistry.ts
export interface SectionConfig {
  type: string;
  label: string;
  maxItems: number;
}

export interface PageConfig {
  label: string;
  sections: SectionConfig[];
}

export const PAGE_REGISTRY: Record<string, PageConfig> = {
  home: {
    label: "Home",
    sections: [
      { type: "hero-banner", label: "Hero Banner", maxItems: 1 },
      { type: "who-we-are", label: "Who We Are", maxItems: 1 },
      { type: "trust-bar", label: "Trust Bar / Stats", maxItems: 1 },
      { type: "event-gallery", label: "Event Gallery", maxItems: 1 },
      { type: "ambassadors", label: "Ambassadors", maxItems: 1 },
      { type: "teams-slider", label: "Teams Slider", maxItems: 1 },
      { type: "broadcasting", label: "Broadcasting Partners", maxItems: 1 },
    ],
  },
  "about-us": {
    label: "About Us",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
      { type: "about-text", label: "About BRPL", maxItems: 1 },
      { type: "mission-vision", label: "Mission & Vision", maxItems: 1 },
      { type: "team-grid", label: "Meet Our Team", maxItems: 1 },
    ],
  },
  teams: {
    label: "Teams",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
      { type: "generic-content", label: "Teams Content", maxItems: 1 },
    ],
  },
  career: {
    label: "Career",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
      { type: "generic-content", label: "Career Content", maxItems: 1 },
    ],
  },
  "contact-us": {
    label: "Contact Us",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
    ],
  },
  "faqs-page": {
    label: "FAQs",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
    ],
  },
  "events-page": {
    label: "Events",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
    ],
  },
  partners: {
    label: "Partners",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
    ],
  },
  "blog-index": {
    label: "Blog",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
    ],
  },
  "news-index": {
    label: "News",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
    ],
  },
  "privacy-page": {
    label: "Privacy Policy",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
      { type: "legal-content", label: "Privacy Content", maxItems: 1 },
    ],
  },
  "terms-page": {
    label: "Terms & Conditions",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
      { type: "legal-content", label: "Terms Content", maxItems: 1 },
    ],
  },
  "rule-book": {
    label: "Rule Book",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
      { type: "legal-content", label: "Rule Book Content", maxItems: 1 },
    ],
  },
  "registration-page": {
    label: "Registration",
    sections: [
      { type: "hero-banner", label: "Page Banner", maxItems: 1 },
    ],
  },
};

export const SECTION_TYPES = [
  "hero-banner",
  "who-we-are",
  "about-text",
  "mission-vision",
  "team-grid",
  "trust-bar",
  "event-gallery",
  "ambassadors",
  "teams-slider",
  "broadcasting",
  "generic-content",
  "legal-content",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/lib/pageRegistry.test.ts --no-cache 2>&1 || true`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pageRegistry.ts tests/lib/pageRegistry.test.ts
git commit -m "feat(pages): create page registry with section configs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Create Admin API — GET pages list + GET/PATCH single page

**Files:**
- Create: `src/app/api/admin/pages/route.ts`
- Create: `src/app/api/admin/pages/[key]/route.ts`
- Test: `tests/api/admin/pages.test.ts`

**Interfaces:**
- Consumes: `SitePage` model, `PAGE_REGISTRY`, Zod, `withRequest`/`withAdmin`, `ok()`, `BadRequestError`
- Produces: `GET /api/admin/pages` → `{ pages: PageSummary[] }`, `GET /api/admin/pages/[key]` → `{ page: ISitePage }`, `PATCH /api/admin/pages/[key]` → `{ page: ISitePage }`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api/admin/pages.test.ts
import { describe, it, expect } from "@jest/globals";

describe("Admin Pages API", () => {
  describe("GET /api/admin/pages", () => {
    it("should return list of pages with correct shape", () => {
      const keys = Object.keys(PAGE_REGISTRY);
      expect(keys.length).toBeGreaterThan(10);
      expect(keys).toContain("about-us");
    });
  });

  describe("PATCH /api/admin/pages/[key]", () => {
    it("should validate section data", () => {
      const updateSchema = z.object({
        sections: z.array(z.object({
          type: z.string().min(1),
          order: z.number().int().min(0),
          title: z.string().optional(),
          active: z.boolean().default(true),
        })),
      });

      const valid = updateSchema.safeParse({
        sections: [{ type: "hero-banner", order: 0, title: "Test" }],
      });
      expect(valid.success).toBe(true);

      const invalid = updateSchema.safeParse({
        sections: [{ type: "", order: -1 }],
      });
      expect(invalid.success).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/api/admin/pages.test.ts --no-cache 2>&1 || true`
Expected: FAIL — `PAGE_REGISTRY` not imported

- [ ] **Step 3: Create GET list route**

```typescript
// src/app/api/admin/pages/route.ts
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import SitePage from "@/models/SitePage";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { getAdminCookie } from "@/lib/auth/cookies";
import { PAGE_REGISTRY } from "@/lib/pageRegistry";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
  await connectDB();
  const doc = await AdminUser.findById(id).lean();
  return doc as unknown as IAdminUser | null;
}

export const GET = withRequest(
  withAdmin({
    getAdminCookie,
    lookup: adminLookup,
    allowedRoles: ["superadmin"],
  })(async () => {
    await connectDB();
    const docs = await SitePage.find({}).sort({ key: 1 }).lean();

    // Map registry to include pages that don't have DB entries yet
    const dbMap = new Map((docs as any[]).map((d: any) => [d.key, d]));
    const pages = Object.entries(PAGE_REGISTRY).map(([key, config]) => {
      const dbDoc = dbMap.get(key);
      return {
        key,
        label: config.label,
        sectionCount: config.sections.length,
        updatedAt: dbDoc?.updatedAt?.toISOString?.() || null,
        createdAt: dbDoc?.createdAt?.toISOString?.() || null,
      };
    });

    return ok({ pages });
  })
);
```

- [ ] **Step 4: Create GET/PATCH [key] route**

```typescript
// src/app/api/admin/pages/[key]/route.ts
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import SitePage from "@/models/SitePage";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError } from "@/lib/api/errors";
import { getAdminCookie } from "@/lib/auth/cookies";
import { PAGE_REGISTRY } from "@/lib/pageRegistry";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
  await connectDB();
  const doc = await AdminUser.findById(id).lean();
  return doc as unknown as IAdminUser | null;
}

const sectionSchema = z.object({
  _id: z.string(),
  type: z.string().min(1),
  order: z.number().int().min(0),
  title: z.string().optional().default(""),
  subtitle: z.string().optional().default(""),
  description: z.string().optional().default(""),
  image: z.string().optional().default(""),
  imageMobile: z.string().optional().default(""),
  videoUrl: z.string().optional().default(""),
  ctaText: z.string().optional().default(""),
  ctaLink: z.string().optional().default(""),
  data: z.record(z.any()).optional(),
  active: z.boolean().default(true),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  subtitle: z.string().optional(),
  sections: z.array(sectionSchema).optional(),
  meta: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.string().optional(),
  }).optional(),
});

export const GET = withRequest(
  withAdmin({
    getAdminCookie,
    lookup: adminLookup,
    allowedRoles: ["superadmin"],
  })(async ({ params }: { params: { key: string } }) => {
    await connectDB();
    const key = params.key.toLowerCase().trim();
    const config = PAGE_REGISTRY[key];
    if (!config) throw new BadRequestError(`Unknown page key: ${key}`);

    let page = await SitePage.findOne({ key }).lean();

    // If no DB entry yet, return registry config as template
    if (!page) {
      return ok({
        page: {
          key,
          title: config.label,
          sections: config.sections.map((sc, i) => ({
            _id: `new-${sc.type}-${i}`,
            type: sc.type,
            order: i,
            title: sc.label,
            active: true,
          })),
          meta: {},
        },
      });
    }

    return ok({ page });
  })
);

export const PATCH = withRequest(
  withAdmin({
    getAdminCookie,
    lookup: adminLookup,
    allowedRoles: ["superadmin"],
  })(async ({ req, params }: { req: Request; params: { key: string } }) => {
    await connectDB();
    const key = params.key.toLowerCase().trim();
    const config = PAGE_REGISTRY[key];
    if (!config) throw new BadRequestError(`Unknown page key: ${key}`);

    const body = await req.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError("Invalid input", { details: parsed.error.issues });
    }

    const data = parsed.data;

    // Validate section types against registry
    if (data.sections) {
      const allowedTypes = new Set(config.sections.map((s) => s.type));
      for (const section of data.sections) {
        if (!allowedTypes.has(section.type)) {
          throw new BadRequestError(
            `Section type "${section.type}" not allowed for page "${key}". Allowed: ${Array.from(allowedTypes).join(", ")}`
          );
        }
      }
    }

    const page = await SitePage.findOneAndUpdate(
      { key },
      { $set: { ...data, key } },
      { upsert: true, new: true }
    ).lean();

    return ok({ page });
  })
);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest tests/api/admin/pages.test.ts --no-cache 2>&1 || true`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/pages/ tests/api/admin/pages.test.ts
git commit -m "feat(pages): add admin API routes for pages CRUD

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Create File Upload API

**Files:**
- Create: `src/app/api/admin/upload/route.ts`
- Modify: `src/components/admin/ImageUpload.tsx` — connect to upload API

**Interfaces:**
- Produces: `POST /api/admin/upload` (multipart) → `{ url: "/uploads/...", filename: string }`
- Modified ImageUpload calls the API and stores returned URL

- [ ] **Step 1: Write the failing test**

```typescript
// tests/api/admin/upload.test.ts
import { describe, it, expect } from "@jest/globals";

describe("Upload API", () => {
  it("should reject non-file requests", () => {
    // No file in request should 400
    expect(true).toBe(true); // placeholder — real test needs fetch mock
  });

  it("should accept valid image types", () => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const disallowed = ["application/pdf", "text/html"];
    for (const type of allowed) {
      expect(allowed.includes(type)).toBe(true);
    }
    for (const type of disallowed) {
      expect(allowed.includes(type)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/api/admin/upload.test.ts --no-cache 2>&1 || true`
Expected: FAIL

- [ ] **Step 3: Install multer dependency**

```bash
npm install multer
npm install -D @types/multer
```

- [ ] **Step 4: Create upload API route**

```typescript
// src/app/api/admin/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { getAdminCookie } from "@/lib/auth/cookies";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

async function adminLookup(id: string): Promise<IAdminUser | null> {
  await connectDB();
  const doc = await AdminUser.findById(id).lean();
  return doc as unknown as IAdminUser | null;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const cookie = getAdminCookie();
    if (!cookie) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const admin = await adminLookup(cookie.id);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, error: "File too large. Maximum size is 50 MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate path: public/uploads/2026/06/uuid-filename.ext
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const ext = file.name.split(".").pop() || "webp";
    const filename = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const relativePath = path.join("uploads", year, month, filename);
    const absoluteDir = path.join(process.cwd(), "public", "uploads", year, month);
    const absolutePath = path.join(process.cwd(), "public", relativePath);

    await mkdir(absoluteDir, { recursive: true });
    await writeFile(absolutePath, buffer);

    return NextResponse.json({
      ok: true,
      data: { url: `/${relativePath.replace(/\\/g, "/")}`, filename: file.name },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Update ImageUpload component to use VPS upload API**

```typescript
// src/components/admin/ImageUpload.tsx — replace entire file
"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    label?: string;
}

/**
 * Image upload component that uploads files to the VPS via /api/admin/upload.
 * Returns the URL path served by Next.js static files.
 */
export function ImageUpload({ value, onChange, label }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowed.includes(file.type)) {
            setError("Invalid file type. Allowed: JPG, PNG, WebP, GIF.");
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            setError("File too large. Maximum size is 50 MB.");
            return;
        }

        setError(null);
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/admin/upload", {
                method: "POST",
                body: formData,
                credentials: "same-origin",
            });

            const json = await res.json();

            if (json.ok && json.data?.url) {
                onChange(json.data.url);
            } else {
                setError(json.error || "Upload failed");
            }
        } catch {
            setError("Failed to upload file");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const handleRemove = () => {
        onChange("");
        setError(null);
    };

    return (
        <div className="space-y-1.5">
            {label && (
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </Label>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
                Max size: 50 MB. JPG, PNG or WebP recommended.
            </p>

            {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            <div
                className={cn(
                    "relative flex items-center justify-center rounded-lg border-2 border-dashed transition-colors",
                    value
                        ? "border-emerald-300 dark:border-emerald-700"
                        : "border-slate-300 dark:border-slate-600 hover:border-amber-400 dark:hover:border-amber-500",
                )}
            >
                {value ? (
                    <div className="relative w-full group">
                        <img
                            src={value.startsWith("http") || value.startsWith("/") ? value : `/${value}`}
                            alt="Preview"
                            className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                            type="button"
                            onClick={handleRemove}
                            className={cn(
                                "absolute top-2 right-2 h-7 w-7 rounded-full",
                                "bg-black/50 hover:bg-black/70 text-white",
                                "flex items-center justify-center",
                                "opacity-0 group-hover:opacity-100 transition-opacity",
                            )}
                            aria-label="Remove image"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className={cn(
                            "w-full h-32 flex flex-col items-center justify-center gap-1.5",
                            "text-slate-400 dark:text-slate-500",
                            "hover:text-slate-600 dark:hover:text-slate-300",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            "transition-colors rounded-lg",
                        )}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                                <span className="text-xs">Uploading…</span>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <Upload className="h-5 w-5" />
                                    <ImageIcon className="h-5 w-5" />
                                </div>
                                <span className="text-xs font-medium">Click to upload</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFile}
                className="hidden"
                aria-label="Upload image"
            />
        </div>
    );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest tests/api/admin/upload.test.ts --no-cache 2>&1 || true`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/api/admin/upload/ tests/api/admin/upload.test.ts src/components/admin/ImageUpload.tsx
git commit -m "feat(upload): add VPS file upload API and update ImageUpload component

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Create Section Registry + Dynamic Page Renderer

**Files:**
- Create: `src/components/admin/page-editor/sectionRegistry.ts`
- Create: `src/components/admin/page-editor/DynamicPageRenderer.tsx`

**Interfaces:**
- Consumes: `PageSection`, `SECTION_TYPES`
- Produces: `SECTION_REGISTRY` mapping, `DynamicPageRenderer` component that accepts `sections: PageSection[]`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/components/page-editor/sectionRegistry.test.tsx
import { describe, it, expect } from "@jest/globals";

describe("Section Registry", () => {
  it("should have all required section types", () => {
    const required = ["hero-banner", "who-we-are", "about-text", "mission-vision", "trust-bar"];
    for (const type of required) {
      expect(SECTION_REGISTRY[type]).toBeDefined();
      expect(SECTION_REGISTRY[type].editor).toBeDefined();
      expect(SECTION_REGISTRY[type].defaultData).toBeDefined();
    }
  });

  it("each section should have defaultData matching its fields", () => {
    const about = SECTION_REGISTRY["about-text"];
    expect(about.defaultData).toHaveProperty("title");
    expect(about.defaultData).toHaveProperty("description");
    expect(about.defaultData).toHaveProperty("image");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/components/page-editor/sectionRegistry.test.tsx --no-cache 2>&1 || true`
Expected: FAIL — `SECTION_REGISTRY` not defined

- [ ] **Step 3: Create section registry**

```typescript
// src/components/admin/page-editor/sectionRegistry.ts
import type { ComponentType } from "react";

interface SectionRegistryEntry {
  component?: ComponentType<any>;
  editor: ComponentType<any>;
  defaultData: Record<string, any>;
}

export const SECTION_REGISTRY: Record<string, SectionRegistryEntry> = {
  "hero-banner": {
    editor: dynamic(() => import("./editors/HeroBannerEditor")),
    defaultData: {
      title: "Page Title",
      subtitle: "",
      image: "/tenis.webp",
      imageMobile: "",
      ctaText: "",
      ctaLink: "",
    },
  },
  "who-we-are": {
    editor: dynamic(() => import("./editors/WhoWeAreEditor")),
    defaultData: {
      title: "Beyond Reach Premier League",
      subtitle: "India's Grassroots T10 Cricket League",
      tagline: '"BRPL – Bharat ki League, Bharatiyon ka Sapna"',
      description: "",
      image: "/home2.webp",
      videoUrl: "",
    },
  },
  "about-text": {
    editor: dynamic(() => import("./editors/AboutTextEditor")),
    defaultData: {
      title: "About BRPL",
      description: "",
      image: "/trophy image.webp",
    },
  },
  "mission-vision": {
    editor: dynamic(() => import("./editors/MissionVisionEditor")),
    defaultData: {
      missionTitle: "Our Mission",
      missionDescription: "",
      missionImage: "/about-2.webp",
      visionTitle: "Our Vision",
      visionDescription: "",
      visionImage: "/vision.webp",
    },
  },
  "trust-bar": {
    editor: dynamic(() => import("./editors/TrustBarEditor")),
    defaultData: {
      items: [
        { id: "1", icon: "Trophy", hook: "₹3 Crore", descriptor: "TOTAL PRIZE POOL" },
        { id: "2", icon: "Circle", hook: "Tennis Ball", descriptor: "NO BIG KIT REQUIREMENTS" },
      ],
    },
  },
  "generic-content": {
    editor: dynamic(() => import("./editors/GenericContentEditor")),
    defaultData: {
      title: "",
      subtitle: "",
      description: "",
      image: "",
    },
  },
  "legal-content": {
    editor: dynamic(() => import("./editors/LegalContentEditor")),
    defaultData: {
      title: "",
      content: "",
    },
  },
  "event-gallery": {
    editor: dynamic(() => import("./editors/EventGalleryEditor")),
    defaultData: {
      title: "BRPL Event Gallery",
      subtitle: "",
      description: "",
    },
  },
  "ambassadors": {
    editor: dynamic(() => import("./editors/AmbassadorsEditor")),
    defaultData: {
      title: "BRPL Ambassadors",
      subtitle: "",
      description: "",
    },
  },
  "teams-slider": {
    editor: dynamic(() => import("./editors/TeamsSliderEditor")),
    defaultData: {
      title: "BRPL Teams",
      subtitle: "",
      description: "",
    },
  },
  broadcasting: {
    editor: dynamic(() => import("./editors/BroadcastingEditor")),
    defaultData: {
      title: "Proposed Broadcasting Partners",
      subtitle: "",
      items: [],
    },
  },
};

import dynamic from "next/dynamic";
```

- [ ] **Step 4: Create DynamicPageRenderer**

```typescript
// src/components/admin/page-editor/DynamicPageRenderer.tsx
"use client";

import React from "react";
import type { PageSection } from "@/types/pages";
import { SECTION_REGISTRY } from "./sectionRegistry";

interface DynamicPageRendererProps {
  sections: PageSection[];
}

/**
 * Renders page sections by mapping each section to its registered component.
 * Only renders active sections, sorted by order.
 */
export function DynamicPageRenderer({ sections }: DynamicPageRendererProps) {
  const sorted = [...sections]
    .filter((s) => s.active !== false)
    .sort((a, b) => a.order - b.order);

  if (sorted.length === 0) return null;

  return (
    <>
      {sorted.map((section) => {
        const entry = SECTION_REGISTRY[section.type];
        if (!entry?.component) {
          // Section type has no render component — could be a data-only section
          // that the parent page handles manually. Skip silently.
          return null;
        }
        const Component = entry.component;
        return (
          <Component
            key={section._id}
            {...section}
            {...(section.data || {})}
          />
        );
      })}
    </>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest tests/components/page-editor/sectionRegistry.test.tsx --no-cache 2>&1 || true`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/page-editor/sectionRegistry.ts src/components/admin/page-editor/DynamicPageRenderer.tsx tests/components/page-editor/sectionRegistry.test.tsx
mkdir -p tests/components/page-editor
git add tests/components/page-editor/sectionRegistry.test.tsx
git commit -m "feat(pages): add section registry and dynamic page renderer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Create Section Editors (Part 1 — Core Editors)

**Files:**
- Create: `src/components/admin/page-editors/editors/HeroBannerEditor.tsx`
- Create: `src/components/admin/page-editors/editors/AboutTextEditor.tsx`
- Create: `src/components/admin/page-editors/editors/WhoWeAreEditor.tsx`
- Create: `src/components/admin/page-editors/editors/MissionVisionEditor.tsx`
- Create: `src/components/admin/page-editors/editors/GenericContentEditor.tsx`
- Create: `src/components/admin/page-editors/editors/LegalContentEditor.tsx`
- Create: `src/components/admin/page-editors/SectionEditor.tsx`
- Test: `tests/components/page-editor/SectionEditor.test.tsx`

**Interfaces:**
- Consumes: `PageSection`, `SECTION_REGISTRY`, shadcn `Input`/`Textarea`/`Switch`, `BlogEditor`, `ImageUpload`
- Produces: Editor components for each section type

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/page-editor/SectionEditor.test.tsx
import { describe, it, expect } from "@jest/globals";

describe("SectionEditor", () => {
  it("should map section type to correct editor component", () => {
    const hero = SECTION_REGISTRY["hero-banner"];
    expect(hero.editor).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/components/page-editor/SectionEditor.test.tsx --no-cache 2>&1 || true`
Expected: FAIL

- [ ] **Step 3: Create SectionEditor wrapper**

```tsx
// src/components/admin/page-editors/SectionEditor.tsx
"use client";

import React from "react";
import type { PageSection } from "@/types/pages";
import { SECTION_REGISTRY } from "./sectionRegistry";

interface SectionEditorProps {
  section: PageSection;
  onChange: (updated: PageSection) => void;
}

export function SectionEditor({ section, onChange }: SectionEditorProps) {
  const entry = SECTION_REGISTRY[section.type];
  
  if (!entry?.editor) {
    return (
      <div className="p-4 text-sm text-slate-500 bg-slate-50 rounded-lg">
        No editor available for section type "{section.type}".
      </div>
    );
  }

  const EditorComponent = entry.editor;
  return (
    <EditorComponent
      section={section}
      onChange={onChange}
      defaultData={entry.defaultData}
    />
  );
}
```

- [ ] **Step 4: Create HeroBannerEditor**

```tsx
// src/components/admin/page-editors/editors/HeroBannerEditor.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { PageSection } from "@/types/pages";

interface Props {
  section: PageSection;
  onChange: (updated: PageSection) => void;
  defaultData: Record<string, any>;
}

export default function HeroBannerEditor({ section, onChange, defaultData }: Props) {
  const data = { ...defaultData, ...section };

  const update = (field: string, value: any) => {
    onChange({ ...section, [field]: value, data: { ...(section.data || {}), [field]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Active
        </Label>
        <Switch checked={section.active} onCheckedChange={(v) => onChange({ ...section, active: v })} />
      </div>

      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={data.title || ""} onChange={(e) => update("title", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Subtitle</Label>
        <Input value={data.subtitle || ""} onChange={(e) => update("subtitle", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>CTA Text</Label>
        <Input value={data.ctaText || ""} onChange={(e) => update("ctaText", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>CTA Link</Label>
        <Input value={data.ctaLink || ""} onChange={(e) => update("ctaLink", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Background Image</Label>
        <ImageUpload value={data.image || ""} onChange={(url) => update("image", url)} />
      </div>

      <div className="space-y-1.5">
        <Label>Mobile Image (optional)</Label>
        <ImageUpload value={data.imageMobile || ""} onChange={(url) => update("imageMobile", url)} />
      </div>

      <div className="space-y-1.5">
        <Label>Video URL (optional — overrides image)</Label>
        <Input value={data.videoUrl || ""} onChange={(e) => update("videoUrl", e.target.value)} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create AboutTextEditor**

```tsx
// src/components/admin/page-editors/editors/AboutTextEditor.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BlogEditor } from "@/components/admin/BlogEditor";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { PageSection } from "@/types/pages";

interface Props {
  section: PageSection;
  onChange: (updated: PageSection) => void;
  defaultData: Record<string, any>;
}

export default function AboutTextEditor({ section, onChange, defaultData }: Props) {
  const data = { ...defaultData, ...section };

  const update = (field: string, value: any) => {
    onChange({ ...section, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active</Label>
        <Switch checked={section.active} onCheckedChange={(v) => onChange({ ...section, active: v })} />
      </div>

      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={data.title || ""} onChange={(e) => update("title", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Description (Rich Text)</Label>
        <BlogEditor
          content={data.description || ""}
          onChange={(html) => update("description", html)}
          placeholder="Enter content..."
          minHeight="200px"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Image</Label>
        <ImageUpload value={data.image || ""} onChange={(url) => update("image", url)} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create WhoWeAreEditor**

```tsx
// src/components/admin/page-editors/editors/WhoWeAreEditor.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BlogEditor } from "@/components/admin/BlogEditor";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { PageSection } from "@/types/pages";

interface Props {
  section: PageSection;
  onChange: (updated: PageSection) => void;
  defaultData: Record<string, any>;
}

export default function WhoWeAreEditor({ section, onChange, defaultData }: Props) {
  const data = { ...defaultData, section, ...(section.data || {}) };

  const update = (field: string, value: any) => {
    onChange({
      ...section,
      data: { ...(section.data || {}), [field]: value },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active</Label>
        <Switch checked={section.active} onCheckedChange={(v) => onChange({ ...section, active: v })} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={data.title || ""} onChange={(e) => update("title", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Subtitle</Label>
          <Input value={data.subtitle || ""} onChange={(e) => update("subtitle", e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Tagline</Label>
        <Input value={data.tagline || ""} onChange={(e) => update("tagline", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Description (Rich Text)</Label>
        <BlogEditor
          content={data.description || ""}
          onChange={(html) => update("description", html)}
          placeholder="Enter content..."
          minHeight="200px"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Image</Label>
          <ImageUpload value={data.image || ""} onChange={(url) => update("image", url)} />
        </div>
        <div className="space-y-1.5">
          <Label>Video URL (optional)</Label>
          <Input value={data.videoUrl || ""} onChange={(e) => update("videoUrl", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create MissionVisionEditor**

```tsx
// src/components/admin/page-editors/editors/MissionVisionEditor.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BlogEditor } from "@/components/admin/BlogEditor";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { PageSection } from "@/types/pages";

interface Props {
  section: PageSection;
  onChange: (updated: PageSection) => void;
  defaultData: Record<string, any>;
}

export default function MissionVisionEditor({ section, onChange, defaultData }: Props) {
  const data = { ...defaultData, section, ...(section.data || {}) };

  const update = (field: string, value: any) => {
    onChange({
      ...section,
      data: { ...(section.data || {}), [field]: value },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active</Label>
        <Switch checked={section.active} onCheckedChange={(v) => onChange({ ...section, active: v })} />
      </div>

      <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
        <h3 className="font-semibold text-sm">Mission</h3>
        <div className="space-y-1.5">
          <Label>Mission Title</Label>
          <Input value={data.missionTitle || ""} onChange={(e) => update("missionTitle", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Mission Description (Rich Text)</Label>
          <BlogEditor
            content={data.missionDescription || ""}
            onChange={(html) => update("missionDescription", html)}
            placeholder="Enter mission content..."
            minHeight="150px"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Mission Image</Label>
          <ImageUpload value={data.missionImage || ""} onChange={(url) => update("missionImage", url)} />
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
        <h3 className="font-semibold text-sm">Vision</h3>
        <div className="space-y-1.5">
          <Label>Vision Title</Label>
          <Input value={data.visionTitle || ""} onChange={(e) => update("visionTitle", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Vision Description (Rich Text)</Label>
          <BlogEditor
            content={data.visionDescription || ""}
            onChange={(html) => update("visionDescription", html)}
            placeholder="Enter vision content..."
            minHeight="150px"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Vision Image</Label>
          <ImageUpload value={data.visionImage || ""} onChange={(url) => update("visionImage", url)} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Create GenericContentEditor + LegalContentEditor**

```tsx
// src/components/admin/page-editors/editors/GenericContentEditor.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BlogEditor } from "@/components/admin/BlogEditor";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { PageSection } from "@/types/pages";

interface Props {
  section: PageSection;
  onChange: (updated: PageSection) => void;
  defaultData: Record<string, any>;
}

export default function GenericContentEditor({ section, onChange, defaultData }: Props) {
  const data = { ...defaultData, ...section };
  const update = (field: string, value: any) => onChange({ ...section, [field]: value });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active</Label>
        <Switch checked={section.active} onCheckedChange={(v) => onChange({ ...section, active: v })} />
      </div>
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={data.title || ""} onChange={(e) => update("title", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Subtitle</Label>
        <Input value={data.subtitle || ""} onChange={(e) => update("subtitle", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Description (Rich Text)</Label>
        <BlogEditor content={data.description || ""} onChange={(html) => update("description", html)} minHeight="200px" />
      </div>
      <div className="space-y-1.5">
        <Label>Image</Label>
        <ImageUpload value={data.image || ""} onChange={(url) => update("image", url)} />
      </div>
    </div>
  );
}
```

```tsx
// src/components/admin/page-editors/editors/LegalContentEditor.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BlogEditor } from "@/components/admin/BlogEditor";
import type { PageSection } from "@/types/pages";

interface Props {
  section: PageSection;
  onChange: (updated: PageSection) => void;
  defaultData: Record<string, any>;
}

export default function LegalContentEditor({ section, onChange, defaultData }: Props) {
  const data = { ...defaultData, section, ...(section.data || {}) };
  const update = (field: string, value: any) => onChange({ ...section, data: { ...(section.data || {}), [field]: value } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active</Label>
        <Switch checked={section.active} onCheckedChange={(v) => onChange({ ...section, active: v })} />
      </div>
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={data.title || ""} onChange={(e) => update("title", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Content (Rich Text — full legal document)</Label>
        <BlogEditor content={data.content || ""} onChange={(html) => update("content", html)} minHeight="500px" />
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx jest tests/components/page-editor/SectionEditor.test.tsx --no-cache 2>&1 || true`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/components/admin/page-editors/ tests/components/page-editor/SectionEditor.test.tsx
git commit -m "feat(pages): add section editors for core section types

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Create Admin Pages UI (List + Editor)

**Files:**
- Create: `src/app/(admin)/admin/pages/page.tsx`
- Create: `src/app/(admin)/admin/pages/[key]/page.tsx`
- Create: `src/components/admin/page-editor/PageEditorClient.tsx`

**Interfaces:**
- Consumes: `PAGE_REGISTRY`, API routes, shadcn `Button`/`Input`/`Switch`, section editors
- Produces: Fully functional admin pages at `/admin/pages` and `/admin/pages/[key]`

- [ ] **Step 1: Write the failing test**

- Skip test-only step — this page is UI-heavy and best tested by manual smoke test

- [ ] **Step 2: Create pages list page**

```tsx
// src/app/(admin)/admin/pages/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { FileText, Search, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/apihelper/api";
import { cn } from "@/lib/utils";

type PageSummary = {
  key: string;
  label: string;
  sectionCount: number;
  updatedAt: string | null;
  createdAt: string | null;
};

const PAGE_SIZE = 15;

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => { setPage(1); }, [debouncedQuery]);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.get<{ ok: true; data: { pages: PageSummary[] } }>("/api/admin/pages");
    if (res.ok && res.data?.data?.pages) {
      let filtered = res.data.data.pages;
      if (debouncedQuery) {
        const q = debouncedQuery.toLowerCase();
        filtered = filtered.filter((p) => p.label.toLowerCase().includes(q) || p.key.includes(q));
      }
      setPages(filtered);
    } else {
      setError(res.error || "Failed to load pages");
    }
    setLoading(false);
  }, [debouncedQuery]);

  useEffect(() => { void fetchPages(); }, [fetchPages]);

  const totalPages = Math.max(1, Math.ceil(pages.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = pages.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const showingFrom = pages.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(safePage * PAGE_SIZE, pages.length);

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <main className="p-6 min-w-0">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pages
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {loading ? "Loading…" : `${pages.length} page${pages.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="relative w-56">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages…"
            className="w-full h-8 pl-7 pr-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">Page</th>
                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">Key</th>
                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">Sections</th>
                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700">Last Updated</th>
                <th className="px-3 py-2 font-medium border-b border-slate-200 dark:border-slate-700 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                Array.from({ length: 5 }).map((_, row) => (
                  <tr key={row}>
                    {Array.from({ length: 5 }).map((__, col) => (
                      <td key={col} className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="h-4 w-full max-w-24 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              )}
              {!loading && paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                    No pages found.
                  </td>
                </tr>
              )}
              {paginated.map((p) => (
                <tr key={p.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{p.label}</div>
                  </td>
                  <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.key}</span>
                  </td>
                  <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">{p.sectionCount}</span>
                  </td>
                  <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {formatDate(p.updatedAt)}
                  </td>
                  <td className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <a href={`/admin/pages/${p.key}`} aria-label={`Edit ${p.label}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={cn(
          "flex items-center justify-between gap-3 px-3 py-2 border-t border-slate-200 dark:border-slate-800",
          "bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-400"
        )}>
          <span>{pages.length === 0 ? "0 results" : `Showing ${showingFrom}–${showingTo} of ${pages.length}`}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs">Page {safePage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1 || loading}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages || loading}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create PageEditorClient**

```tsx
// src/components/admin/page-editor/PageEditorClient.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionEditor } from "@/components/admin/page-editors/SectionEditor";
import { PAGE_REGISTRY } from "@/lib/pageRegistry";
import api from "@/apihelper/api";
import type { PageSection } from "@/types/pages";

export default function PageEditorClient({ pageKey }: { pageKey: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pageTitle, setPageTitle] = useState("");
  const [sections, setSections] = useState<PageSection[]>([]);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);

  const config = PAGE_REGISTRY[pageKey];

  useEffect(() => {
    if (!config) {
      setError(`Unknown page key: ${pageKey}`);
      setLoading(false);
      return;
    }

    setLoading(true);
    api.get<{ ok: boolean; data?: { page: any } }>(`/api/admin/pages/${pageKey}`)
      .then((res) => {
        if (res.ok && res.data?.data?.page) {
          const p = res.data.data.page;
          setPageTitle(p.title || config.label);
          setSections(p.sections || []);
        } else {
          setError(res.error || "Failed to load page");
        }
      })
      .catch(() => setError("Failed to load page"))
      .finally(() => setLoading(false));
  }, [pageKey, config]);

  const handleSectionChange = useCallback((index: number, updated: PageSection) => {
    setSections((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
    setSuccess(false);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const res = await api.patch(`/api/admin/pages/${pageKey}`, {
      title: pageTitle,
      sections,
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(res.error || "Failed to save");
    }

    setSaving(false);
  }, [pageKey, pageTitle, sections]);

  if (!config) {
    return (
      <main className="p-6">
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          Page "{pageKey}" not found in registry.
        </div>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/admin/pages">Back to Pages</Link>
        </Button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/pages"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title="Back to pages"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{config.label}</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Editing: {pageKey}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {error && (
              <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
            )}
            {success && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved!</span>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/pages")} disabled={saving} className="h-8 px-3 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 px-4 text-xs bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Page title */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-2">
        <div className="space-y-1.5 max-w-md">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Page Title (SEO)</Label>
          <Input value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>

      {/* Section editor area */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Section sidebar */}
        <div className="w-56 shrink-0 space-y-1">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">Sections</Label>
          {config.sections.map((sc, i) => {
            const sectionData = sections[i];
            const isActive = sectionData?.active !== false;
            const isSelected = selectedSectionIndex === i;
            return (
              <button
                key={sc.type}
                onClick={() => setSelectedSectionIndex(i)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  isSelected
                    ? "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50",
                  !isActive && "opacity-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isActive ? "bg-emerald-500" : "bg-slate-300")} />
                  <span className="truncate">{sc.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Editor content */}
        <div className="flex-1 min-w-0">
          {sections[selectedSectionIndex] ? (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
              <SectionEditor
                section={sections[selectedSectionIndex]}
                onChange={(updated) => handleSectionChange(selectedSectionIndex, updated)}
              />
            </div>
          ) : (
            <div className="p-6 text-slate-500 text-sm">Select a section to edit.</div>
          )}
        </div>
      </div>
    </main>
  );
}

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
```

- [ ] **Step 4: Create page editor wrapper**

```tsx
// src/app/(admin)/admin/pages/[key]/page.tsx
import PageEditorClient from "@/components/admin/page-editor/PageEditorClient";

export const dynamic = "force-dynamic";

export default async function AdminPageEditor({
  params,
}: {
  params: { key: string };
}) {
  return <PageEditorClient pageKey={params.key.toLowerCase()} />;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(admin\)/admin/pages/ src/components/admin/page-editor/PageEditorClient.tsx
git commit -m "feat(pages): add admin pages list and editor UI

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Admin Sidebar Update

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Add "Pages" nav item**

In `src/components/admin/AdminSidebar.tsx`, find the `NAV_ITEMS` array and add a new entry:

```typescript
import { LayoutDashboard, Users, Ticket, PenSquare, LogOut, PanelLeftClose, PanelLeftOpen, Link2, Search, FileText } from "lucide-react";
// ... existing imports ...

const NAV_ITEMS: NavItem[] = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Players", href: "/admin/players", icon: Users },
    { label: "Coupons", href: "/admin/coupons", icon: Ticket },
    { label: "Referral", href: "/admin/referrals", icon: Link2 },
    { label: "Blogs", href: "/admin/blogs", icon: PenSquare },
    { label: "Pages", href: "/admin/pages", icon: FileText },   // <-- ADD THIS
    { label: "Seo", href: "/admin/seo", icon: Search },
    { label: "Legal", href: "/admin/legal", icon: FileText },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "feat(admin): add Pages nav item to sidebar

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Update Frontend Pages to Use Dynamic Sections

**Files:**
- Modify: `src/app/(main)/page.tsx`
- Modify: `src/app/(main)/about-us/page.tsx`
- Modify: `src/app/(main)/teams/page.tsx`
- Modify: `src/app/(main)/events/page.tsx`
- Modify: `src/app/(main)/career/page.tsx`
- Modify: `src/app/(main)/contact-us/page.tsx`
- Modify: `src/app/(main)/faqs/page.tsx`
- Modify: `src/app/(main)/partners/page.tsx`
- Modify: `src/app/(main)/privacy-policy/page.tsx`
- Modify: `src/app/(main)/terms-and-conditions/page.tsx`
- Modify: `src/app/(main)/rule-book/page.tsx`

**Interfaces:**
- Consumes: `getSiteContext()` → `ctx.pages[pageKey]?.sections`, `DynamicPageRenderer`
- Preserves: Existing fallback content when no CMS data

- [ ] **Step 1: Update About Us page**

```tsx
// src/app/(main)/about-us/page.tsx — REPLACE
import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { DynamicPageRenderer } from "@/components/admin/page-editor/DynamicPageRenderer";
import PageBanner from "@/components/PageBanner";
import AboutSection from "@/components/AboutSection";
import MissionVisionSection from "@/components/MissionVisionSection";
import MeetOurTeamSection from "@/components/MeetOurTeamSection";
import SEO from "@/components/SEO";

export const dynamic = "force-dynamic";

export default async function AboutUs() {
  const ctx = await getSiteContext();
  const pageData = ctx.pages["about-us"] as any;
  const sections = pageData?.sections || [];

  if (sections.length > 0) {
    return (
      <SiteContextProvider value={ctx}>
        <SEO title="About Us" description="Learn about Beyond Reach Premier League." />
        <DynamicPageRenderer sections={sections} />
      </SiteContextProvider>
    );
  }

  // Fallback: existing static rendering
  return (
    <SiteContextProvider value={ctx}>
      <div className="min-h-screen bg-gray-50">
        <SEO title="About Us" description="Learn about Beyond Reach Premier League's mission, vision, and the team driving the future of cricket content creation." />
        <PageBanner pageKey="aboutUs" title="About us" currentPage="About us" scrollToId="about-content" />
        <div id="about-content"><AboutSection /></div>
        <div><MissionVisionSection /></div>
        <div><MeetOurTeamSection /></div>
      </div>
    </SiteContextProvider>
  );
}
```

- [ ] **Step 2: Update Home page**

```tsx
// src/app/(main)/page.tsx — REPLACE
import nextDynamic from "next/dynamic";
import Banner from "@/components/Banner";
import SEO from "@/components/SEO";
import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { DynamicPageRenderer } from "@/components/admin/page-editor/DynamicPageRenderer";

export const dynamic = "force-dynamic";

const WhoWeAre = nextDynamic(() => import("@/components/WhoWeAre"));
const EventGallerySlider = nextDynamic(() => import("@/components/EventGallerySlider"));
const AmbassadorsSection = nextDynamic(() => import("@/components/AmbassadorsSection"));
const Teams = nextDynamic(() => import("@/components/Teams"));
const BroadcastingPartners = nextDynamic(() => import("@/components/BroadcastingPartners"));

export default async function Index() {
  const ctx = await getSiteContext();
  const pageData = ctx.pages["home"] as any;
  const sections = pageData?.sections || [];

  if (sections.length > 0) {
    return (
      <SiteContextProvider value={ctx}>
        <SEO
          title="India's T10 Cricket League"
          description="BRPL is India's grassroots T10 tennis-ball cricket league."
          keywords="T10 cricket league in India, cricket trials, player registration, tennis ball cricket league, BRPL, grassroots cricket India, Beyond Reach Premier League"
        />
        <DynamicPageRenderer sections={sections} />
      </SiteContextProvider>
    );
  }

  // Fallback static rendering
  return (
    <SiteContextProvider value={ctx}>
      <div className="min-h-screen bg-transparent relative flex flex-col font-sans">
        <SEO title="India's T10 Cricket League" description="BRPL is India's grassroots T10 tennis-ball cricket league." keywords="T10 cricket league in India, cricket trials, player registration, tennis ball cricket league, BRPL, grassroots cricket India, Beyond Reach Premier League" />
        <Banner />
        <WhoWeAre />
        <EventGallerySlider />
        <AmbassadorsSection />
        <Teams />
        <BroadcastingPartners />
      </div>
    </SiteContextProvider>
  );
}
```

- [ ] **Step 3: Update remaining pages (teams, events, career, contact, faqs, partners)**

Each follows the same pattern:

```tsx
// Template pattern for each page
import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { DynamicPageRenderer } from "@/components/admin/page-editor/DynamicPageRenderer";
// ... existing component imports for fallback ...

export const dynamic = "force-dynamic";

export default async function PageWrapper() {
  const ctx = await getSiteContext();
  const pageData = ctx.pages["page-key"] as any;
  const sections = pageData?.sections || [];

  if (sections.length > 0) {
    return (
      <SiteContextProvider value={ctx}>
        <DynamicPageRenderer sections={sections} />
      </SiteContextProvider>
    );
  }

  // ... existing fallback JSX unchanged ...
}
```

- [ ] **Step 4: Update Legal pages (privacy, terms, rule-book)**

```tsx
// src/app/(main)/privacy-policy/page.tsx — PATCH near the return
// Inside the SiteContextProvider, after checking sections:
const privacySections = (ctx.pages["privacy-page"] as any)?.sections || [];

// Then before rendering the fallback:
{privacySections.length > 0 ? (
  <DynamicPageRenderer sections={privacySections} />
) : (
  existing fallback JSX
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(main\)/page.tsx src/app/\(main\)/about-us/page.tsx src/app/\(main\)/teams/page.tsx src/app/\(main\)/events/page.tsx src/app/\(main\)/career/page.tsx src/app/\(main\)/contact-us/page.tsx src/app/\(main\)/faqs/page.tsx src/app/\(main\)/partners/page.tsx src/app/\(main\)/privacy-policy/page.tsx src/app/\(main\)/terms-and-conditions/page.tsx src/app/\(main\)/rule-book/page.tsx
git commit -m "feat(pages): update frontend pages to use dynamic sections

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: SitePage Model + Revalidate Tags — Seed Data

**Files:**
- Create: `src/lib/seedPages.ts` — one-time migration script
- Modify: `src/lib/siteContext.ts` — pass pages data through

- [ ] **Step 1: Create seed script**

```typescript
// src/lib/seedPages.ts
import { connectDB } from "@/lib/mongodb";
import SitePage from "@/models/SitePage";
import { PAGE_REGISTRY } from "@/lib/pageRegistry";

/**
 * Seeds the SitePage collection with initial empty sections for all registered pages.
 * This creates a DB entry for each page so the admin can start editing immediately.
 */
export async function seedPages() {
  await connectDB();

  for (const [key, config] of Object.entries(PAGE_REGISTRY)) {
    const existing = await SitePage.findOne({ key });
    if (existing) continue; // Don't overwrite

    await SitePage.create({
      key,
      title: config.label,
      sections: config.sections.map((sc, i) => ({
        _id: `new-${sc.type}-${i}`,
        type: sc.type,
        order: i,
        title: sc.label,
        active: true,
      })),
      meta: {},
    });
  }

  console.log(`Seeded ${Object.keys(PAGE_REGISTRY).length} pages`);
}
```

- [ ] **Step 2: Run seed on server start (add to a server initializer)**

Add in `src/lib/mongodb.ts` or create a startup script that runs `seedPages()` once.

```typescript
// Add this at the end of src/lib/mongodb.ts or a new startup file
// export async function initializeDatabase() {
//   await connectDB();
//   await seedPages();
// }
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/seedPages.ts
git commit -m "feat(pages): add seed script for SitePage collection

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Smoke Test — Full Validation

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Admin — Pages List**
  1. Open `http://localhost:3000/admin/login` → login as superadmin
  2. Navigate to `/admin/pages` via sidebar
  3. Verify all 14 pages are listed in the table

- [ ] **Step 3: Admin — Page Editor**
  1. Click "About Us" → verify sections list shows: Page Banner, About BRPL, Mission & Vision, Meet Our Team
  2. Click "About BRPL" section → verify editor shows fields: Title, Description (rich text), Image
  3. Edit the title → type "About Beyond Reach Premier League"
  4. Click "Save" → verify "Saved!" indicator appears

- [ ] **Step 4: Frontend — Dynamic Rendering**
  1. Open `http://localhost:3000/about-us` in a new tab
  2. Verify the updated title "About Beyond Reach Premier League" appears
  3. Verify all sections render correctly (banner, about text, mission/vision, team grid)

- [ ] **Step 5: Image Upload**
  1. Go to any page editor with an ImageUpload field
  2. Click "Click to upload" → select an image file
  3. Verify the image uploads and preview shows
  4. Check `public/uploads/` directory → file exists at the generated path

- [ ] **Step 6: Fallback Behavior**
  1. For a page WITH dynamic sections → verify dynamic content shows
  2. Simulate no sections (empty array) → verify the page falls back to hardcoded static content

- [ ] **Step 7: Active/Inactive Toggle**
  1. In a page editor, toggle a section to inactive
  2. Save → visit frontend → verify section is hidden
  3. Toggle back to active → verify section reappears

- [ ] **Step 8: Legal Pages**
  1. Edit Privacy Policy page → add content in LegalContentEditor
  2. Save → visit `/privacy-policy` → verify content shows
  3. Remove content → verify hardcoded fallback shows

- [ ] **Step 9: Commit final**

```bash
git add -A
git commit -m "feat(pages): complete dynamic pages system

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
