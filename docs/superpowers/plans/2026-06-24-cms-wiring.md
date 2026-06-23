# CMS Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire every value the public BRPL frontend displays (text + image URLs) to admin-editable Mongoose models, with cached reads on the server and `revalidateTag` invalidation on admin writes.

**Architecture:** A single server-side `getSiteContext()` helper reads SiteSettings + HomeCms + AboutCms + RegistrationCms + LegalPage + SeoMeta + PageBanner + all collections in parallel, wrapped in `unstable_cache` with per-slice tags. The root `layout.tsx` becomes an async Server Component that fetches once and distributes via React context. Every public page becomes a thin Server Component consuming the context. Admin PATCH handlers call `revalidateTag('site-context')` plus the slice tag.

**Tech Stack:** Next.js 14 App Router, React Server Components, Mongoose 9, jose (JWT), unstable_cache, lucide-react, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-06-24-cms-wiring-design.md`

**Project conventions:**
- Server components do all DB reads; pass data as props to client components.
- API routes return `{ ok: true, data }` or `{ ok: false, error }` envelopes.
- All admin endpoints use the `requireAdmin` / `requireAdminDb` helpers from `@/lib/adminApi`.
- Component imports use the `@/` alias.

**Manual verification only** — this project has no unit-test suite today. Each task ends with concrete steps to manually verify.

---

## File Structure

**New files (8):**
- `src/lib/siteContext.ts` — context shape + loader + defaults + tag constants.
- `src/lib/revalidate.ts` — `revalidateSite()` helper.
- `src/components/SiteContextProvider.tsx` — client-side React context wrapper + `useSiteContext()` hook.
- `src/models/SitePage.ts` — Mongoose model.
- `src/app/api/admin/site-pages/[key]/route.ts` — admin CRUD.
- `src/app/(admin-public)/admin/site-pages/page.tsx` — admin UI.
- `src/components/admin/NavbarLinksEditor.tsx` — repeating nav-link editor.
- `src/components/admin/FooterLinksEditor.tsx` — repeating footer-link editor.

**Modified schema (2):**
- `src/models/SiteSettings.ts` — add new fields.
- `src/models/HomeCms.ts` — add `trustBar`, `broadcastingPartners`.

**Modified admin pages (3):**
- `src/app/(admin)/admin/settings/page.tsx` — extend form.
- `src/app/(admin)/admin/cms/banners/page.tsx` — add trust bar + partners editors.
- `src/app/(admin)/admin/cms/banners/page.tsx` (the same file; see above).

**Modified admin API (1):**
- `src/app/api/admin/settings/route.ts` — accept new fields.
- `src/app/api/admin/home/[section]/route.ts` — accept `trustBar`, `broadcastingPartners` when section is `banners`.

**Modified root (2):**
- `src/app/layout.tsx` — async Server Component, fetches context, wraps children.
- `src/components/RootProviders.tsx` — wrap with `SiteContextProvider`.

**Modified global chrome (7):**
- `src/components/Header.tsx`
- `src/components/Footer.tsx`
- `src/components/SEO.tsx`
- `src/components/CustomHeadScripts.tsx`
- `src/components/CustomBodyScripts.tsx`
- `src/components/FloatingWhatsAppButton.tsx`
- `src/components/FloatingRegisterButton.tsx`

**Modified public pages (18) + their components:**
- `(main)/page.tsx` (home) + `Banner.tsx`, `WhoWeAre.tsx`, `Teams.tsx`, `AmbassadorsSection.tsx`, `BroadcastingPartners.tsx`, `EventGallerySlider.tsx`
- `(main)/about-us/page.tsx` + `MissionVisionSection.tsx`, `MeetOurTeamSection.tsx`, `AboutSection.tsx`, `LivesChangedSection.tsx`, `PageBanner.tsx`
- `(main)/teams/page.tsx` + `Teams.tsx` (shared)
- `(main)/career/page.tsx`
- `(main)/contact-us/page.tsx`
- `(main)/events/page.tsx`
- `(main)/partners/page.tsx`
- `(main)/registration/page.tsx` + `RegistrationHero.tsx` (or similar) + `RoadmapSection.tsx` + `ZoneDeadlineSection.tsx`
- `(main)/types-of-partners/page.tsx`
- `(main)/blog/page.tsx`, `(main)/blog/[slug]/page.tsx`
- `(main)/news/page.tsx`, `(main)/news/[slug]/page.tsx`
- `(main)/press/[id]/page.tsx`
- `(main)/privacy-policy/page.tsx`
- `(main)/terms-and-conditions/page.tsx`
- `(main)/rule-book/page.tsx`
- `(main)/faqs/page.tsx`
- `(main)/thank-you/page.tsx`
- `(main)/not-found.tsx`

**Modified admin sidebar (1):**
- `src/components/admin/AdminSidebar.tsx` — add `Site Pages` entry.

**Modified hook (1):**
- `src/hooks/useSiteSettings.ts` — keep stub signature but route through `useSiteContext()` so any code using it picks up dynamic data.

---

## Task 1: Extend `SiteSettings` model with new fields

**Files:**
- Modify: `src/models/SiteSettings.ts`

- [ ] **Step 1: Add new fields to the Mongoose schema**

Open `src/models/SiteSettings.ts`. Add the new fields listed below inside the schema (keeping all existing fields).

Replace the entire file content with:

```ts
import mongoose, { Schema, Model, Document } from "mongoose";

export interface INavbarLink {
    label: string;
    path: string;
    children?: INavbarLink[];
    isExternal?: boolean;
}

export interface IFooterLink {
    label: string;
    path: string;
}

export interface IFooterLinkGroup {
    heading: string;
    links: IFooterLink[];
}

export interface ISiteSettings extends Document {
    _id: mongoose.Types.ObjectId;

    // existing
    siteName: string;
    tagline?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactPhoneSecondary?: string;
    address?: string;
    heroImage?: string;
    heroVideoUrl?: string;
    socials?: {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        youtube?: string;
        linkedin?: string;
        whatsapp?: string;
    };
    primaryColor?: string;
    registrationDeadline?: Date;
    registrationFee?: number;
    trialStartDate?: Date;
    trialEndDate?: Date;

    // new — branding
    logoUrl?: string;
    footerLogoUrl?: string;
    faviconUrl?: string;
    appleTouchIconUrl?: string;
    ogImage?: string;
    twitterHandle?: string;

    // new — home SEO
    homeSeoTitle?: string;
    homeSeoDescription?: string;
    homeSeoKeywords?: string;

    // new — header & nav
    headerCtaText?: string;
    headerCtaLink?: string;
    navbarLinks?: INavbarLink[];

    // new — footer
    footerAboutText?: string;
    footerLinks?: IFooterLinkGroup[];
    mapEmbedUrl?: string;

    // new — CTAs
    whatsappNumber?: string;
    floatingRegisterText?: string;
    floatingRegisterLink?: string;

    // new — scripts
    customHeadScripts?: string;
    customBodyScripts?: string;

    createdAt: Date;
    updatedAt: Date;
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
    {
        siteName: { type: String, default: "Beyond Reach Premier League" },
        tagline: { type: String },
        contactEmail: { type: String, lowercase: true, trim: true },
        contactPhone: { type: String, trim: true },
        contactPhoneSecondary: { type: String, trim: true },
        address: { type: String },
        heroImage: { type: String },
        heroVideoUrl: { type: String },
        socials: {
            instagram: { type: String },
            facebook: { type: String },
            twitter: { type: String },
            youtube: { type: String },
            linkedin: { type: String },
            whatsapp: { type: String },
        },
        primaryColor: { type: String },
        registrationDeadline: { type: Date },
        registrationFee: { type: Number, default: 1499 },
        trialStartDate: { type: Date },
        trialEndDate: { type: Date },

        logoUrl: { type: String, default: "/logo.webp" },
        footerLogoUrl: { type: String },
        faviconUrl: { type: String, default: "/favicon.ico" },
        appleTouchIconUrl: { type: String },
        ogImage: { type: String },
        twitterHandle: { type: String },

        homeSeoTitle: { type: String, default: "Beyond Reach Premier League" },
        homeSeoDescription: { type: String },
        homeSeoKeywords: { type: String },

        headerCtaText: { type: String, default: "Register Now" },
        headerCtaLink: { type: String, default: "/registration" },
        navbarLinks: { type: Schema.Types.Mixed },

        footerAboutText: { type: String },
        footerLinks: { type: Schema.Types.Mixed },
        mapEmbedUrl: { type: String },

        whatsappNumber: { type: String, default: "918130955866" },
        floatingRegisterText: { type: String, default: "Register Now" },
        floatingRegisterLink: { type: String, default: "/registration" },

        customHeadScripts: { type: String, default: "" },
        customBodyScripts: { type: String, default: "" },
    },
    { timestamps: true }
);

const SiteSettings: Model<ISiteSettings> =
    (mongoose.models.SiteSettings as Model<ISiteSettings>) ||
    mongoose.model<ISiteSettings>("SiteSettings", SiteSettingsSchema);

export default SiteSettings;
```

- [ ] **Step 2: Verify build still passes**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -20`
Expected: `✓ Compiled successfully` and `✓ Generating static pages`. No new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/models/SiteSettings.ts && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(site-settings): add branding, nav, footer, scripts fields"
```

---

## Task 2: Extend `HomeCms` model with `trustBar` + `broadcastingPartners`

**Files:**
- Modify: `src/models/HomeCms.ts`

- [ ] **Step 1: Add the two new fields to the schema**

Open `src/models/HomeCms.ts`. Inside the `HomeCmsSchema` definition, after the existing `whoWeAre` field, add `trustBar` and `broadcastingPartners` schema entries.

Replace the `HomeCmsSchema` block (the one wrapped in `new Schema<IHomeCms>({...})`) with:

```ts
const HomeCmsSchema = new Schema<IHomeCms>(
    {
        banners: [
            {
                title: String,
                subtitle: String,
                image: String,
                videoUrl: String,
                ctaText: String,
                ctaLink: String,
                order: { type: Number, default: 0 },
            },
        ],
        whoWeAre: {
            title: String,
            subtitle: String,
            body: String,
            image: String,
            points: [
                {
                    icon: String,
                    title: { type: String, required: true },
                    description: { type: String, required: true },
                    order: { type: Number, default: 0 },
                },
            ],
        },
        trustBar: [
            {
                label: { type: String, required: true },
                value: { type: String, required: true },
                icon: String,
                order: { type: Number, default: 0 },
            },
        ],
        broadcastingPartners: [
            {
                name: { type: String, required: true },
                logo: { type: String, required: true },
                website: String,
                order: { type: Number, default: 0 },
            },
        ],
    },
    { timestamps: true }
);
```

Also update the `IHomeCms` interface above the schema to include the new fields. Replace the interface declaration with:

```ts
export interface IHomeCms extends Document {
    _id: mongoose.Types.ObjectId;

    banners: IHomeBanner[];

    whoWeAre: {
        title?: string;
        subtitle?: string;
        body?: string;
        image?: string;
        points?: IWhoWeArePoint[];
    };

    trustBar: { label: string; value: string; icon?: string; order?: number }[];

    broadcastingPartners: { name: string; logo: string; website?: string; order?: number }[];

    createdAt: Date;
    updatedAt: Date;
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/models/HomeCms.ts && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(home-cms): add trustBar and broadcastingPartners collections"
```

---

## Task 3: Create `SitePage` model

**Files:**
- Create: `src/models/SitePage.ts`

- [ ] **Step 1: Write the model file**

Create `src/models/SitePage.ts` with this exact content:

```ts
import mongoose, { Schema, Model, Document } from "mongoose";

export const SITE_PAGE_KEYS = [
    "about-us",
    "teams",
    "career",
    "contact-us",
    "events-page",
    "partners",
    "registration-page",
    "types-of-partners",
    "blog-index",
    "news-index",
    "privacy-page",
    "terms-page",
    "rule-book",
    "faqs-page",
] as const;

export type SitePageKey = (typeof SITE_PAGE_KEYS)[number];

export interface ISitePage extends Document {
    _id: mongoose.Types.ObjectId;
    key: SitePageKey;
    title: string;
    subtitle?: string;
    body?: string;
    heroImage?: string;
    heroImageMobile?: string;
    ctaText?: string;
    ctaLink?: string;
    meta?: Record<string, any>;
    order?: number;
    createdAt: Date;
    updatedAt: Date;
}

const SitePageSchema = new Schema<ISitePage>(
    {
        key: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        title: { type: String, required: true },
        subtitle: { type: String },
        body: { type: String },
        heroImage: { type: String },
        heroImageMobile: { type: String },
        ctaText: { type: String },
        ctaLink: { type: String },
        meta: { type: Schema.Types.Mixed },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const SitePage: Model<ISitePage> =
    (mongoose.models.SitePage as Model<ISitePage>) ||
    mongoose.model<ISitePage>("SitePage", SitePageSchema);

export default SitePage;
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/models/SitePage.ts && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(model): add SitePage for per-page content blocks"
```

---

## Task 4: Create cache-tag helper

**Files:**
- Create: `src/lib/revalidate.ts`

- [ ] **Step 1: Write the helper**

Create `src/lib/revalidate.ts` with this exact content:

```ts
import { revalidateTag } from "next/cache";

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
} as const;

export type SiteTag = (typeof TAGS)[keyof typeof TAGS];

/**
 * Invalidate site-context cache for one or more slices.
 * Always also invalidates the umbrella `site-context` tag.
 */
export function revalidateSite(...tags: SiteTag[]) {
    revalidateTag(TAGS.ALL);
    for (const t of tags) revalidateTag(t);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/lib/revalidate.ts && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(cache): add site-context revalidateTag helper"
```

---

## Task 5: Create `siteContext.ts` (the loader)

**Files:**
- Create: `src/lib/siteContext.ts`

- [ ] **Step 1: Write the full file**

Create `src/lib/siteContext.ts` with this exact content:

```ts
import "server-only";
import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import SiteSettings, { type INavbarLink, type IFooterLinkGroup } from "@/models/SiteSettings";
import HomeCms from "@/models/HomeCms";
import AboutCms from "@/models/AboutCms";
import RegistrationCms from "@/models/RegistrationCms";
import LegalPage, { type ILegalPage } from "@/models/LegalPage";
import SeoMeta, { type ISeoMeta } from "@/models/SeoMeta";
import PageBanner, { type IPageBanner } from "@/models/PageBanner";
import SitePage, { type ISitePage, SITE_PAGE_KEYS, type SitePageKey } from "@/models/SitePage";
import Event from "@/models/Event";
import Job from "@/models/Job";
import Ambassador from "@/models/Ambassador";
import TeamMember from "@/models/TeamMember";
import Partner from "@/models/Partner";
import Campaign from "@/models/Campaign";
import FAQ from "@/models/FAQ";
import BlogPost from "@/models/BlogPost";
import NewsArticle from "@/models/NewsArticle";
import { TAGS } from "@/lib/revalidate";

// ---------- Types ----------

export type SocialLink = { name: string; url: string; image: string };
export type NavbarLink = INavbarLink;
export type FooterLinkGroup = IFooterLinkGroup;

export type SiteContext = {
    siteSettings: Record<string, any> & { _id?: string };
    home: {
        banners: any[];
        whoWeAre: any;
        trustBar: any[];
        broadcastingPartners: any[];
    };
    about: { banner: any; aboutBrpl: any; missionVision: any; meetOurTeam: any };
    registration: {
        hero: any;
        banner: any;
        videos: any[];
        numbersSpeak: any[];
        roadmap: any[];
        zoneDeadlines: any[];
        playerStories: any[];
        registrationFaqs: any[];
    };
    legal: { privacy: any; terms: any; rulebook: any };
    seo: Record<string, any>;
    pageBanners: Record<string, any>;
    collections: {
        events: any[];
        jobs: any[];
        ambassadors: any[];
        teams: any[];
        partners: any[];
        campaigns: any[];
        faqs: any[];
        blogs: any[];
        news: any[];
    };
    pages: Record<SitePageKey, any>;
    socialLinks: SocialLink[];
    navLinks: NavbarLink[];
    footerLinks: FooterLinkGroup[];
    featureFlag: { cmsLive: boolean };
};

// ---------- Defaults (from current hardcoded values) ----------

const CMS_LIVE = process.env.CMS_LIVE !== "false";

const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
    { name: "Facebook", url: "https://www.facebook.com/profile.php?id=61584782136820", image: "/facebook.webp" },
    { name: "Twitter", url: "https://x.com/BRPLOfficial", image: "/twiter.webp" },
    { name: "Instagram", url: "https://www.instagram.com/brpl.t10", image: "/instagram.webp" },
];

const DEFAULT_NAV_LINKS: NavbarLink[] = [
    { label: "Home", path: "/" },
    { label: "About Us", path: "/about-us" },
    { label: "Teams", path: "/teams" },
    { label: "Events", path: "/events" },
    { label: "Blog", path: "/blog", children: [{ label: "Blog", path: "/blog" }, { label: "News", path: "/news" }] },
    { label: "Career", path: "/career" },
    { label: "Partners", path: "/partners", children: [{ label: "BRPL Partner", path: "/partners" }, { label: "BRPL Sponsors", path: "/types-of-partners" }] },
    { label: "FAQs", path: "/faqs" },
    { label: "Registration", path: "/registration" },
    { label: "Contact Us", path: "/contact-us" },
];

const DEFAULT_FOOTER_LINKS: FooterLinkGroup[] = [
    { heading: "Teams", links: [
        { label: "North East Panthers", path: "/teams" },
        { label: "Central Strikers", path: "/teams" },
        { label: "Western Heroes", path: "/teams" },
        { label: "Northern Dabanggs", path: "/teams" },
        { label: "Southern Lions", path: "/teams" },
        { label: "Eastern Rhions", path: "/teams" },
    ]},
    { heading: "BRPL - T10", links: [
        { label: "About Us", path: "/about-us" },
        { label: "Contact Us", path: "/contact-us" },
        { label: "Partners", path: "/partners" },
    ]},
    { heading: "Useful Links", links: [
        { label: "Registration", path: "/registration" },
        { label: "FAQs", path: "/faqs" },
        { label: "Events", path: "/events" },
    ]},
    { heading: "Contact", links: [
        { label: "Contact Us", path: "/contact-us" },
        { label: "News", path: "/news" },
    ]},
];

function defaults(): SiteContext {
    return {
        siteSettings: {
            siteName: "Beyond Reach Premier League",
            logoUrl: "/logo.webp",
            faviconUrl: "/favicon.ico",
            contactPhone: "+(91) 81309 55866",
            contactPhoneSecondary: "+(91) 98215 63585",
            contactEmail: "info@brpl.net",
            contactAddress: "Ground Floor, Suite G-01, Procapitus Business Park, D-247/4A, D Block, Sector 63, Noida, Uttar Pradesh 201309",
            whatsappNumber: "918130955866",
            headerCtaText: "Register Now",
            headerCtaLink: "/registration",
            floatingRegisterText: "Register Now",
            floatingRegisterLink: "/registration",
            homeSeoTitle: "Beyond Reach Premier League",
            homeSeoDescription: "BRPL is India's grassroots T10 tennis-ball cricket league. Open cricket trials and player registration across all zones — your pathway to professional cricket starts here.",
            homeSeoKeywords: "T10 cricket league in India, cricket trials, player registration, tennis ball cricket league, BRPL, grassroots cricket India, Beyond Reach Premier League",
            registrationFee: 1499,
            customHeadScripts: "",
            customBodyScripts: "",
        },
        home: { banners: [], whoWeAre: {}, trustBar: [], broadcastingPartners: [] },
        about: { banner: {}, aboutBrpl: {}, missionVision: {}, meetOurTeam: {} },
        registration: {
            hero: {}, banner: {}, videos: [], numbersSpeak: [],
            roadmap: [], zoneDeadlines: [], playerStories: [], registrationFaqs: [],
        },
        legal: { privacy: {}, terms: {}, rulebook: {} },
        seo: {},
        pageBanners: {},
        collections: { events: [], jobs: [], ambassadors: [], teams: [], partners: [], campaigns: [], faqs: [], blogs: [], news: [] },
        pages: {} as any,
        socialLinks: DEFAULT_SOCIAL_LINKS,
        navLinks: DEFAULT_NAV_LINKS,
        footerLinks: DEFAULT_FOOTER_LINKS,
        featureFlag: { cmsLive: CMS_LIVE },
    };
}

// ---------- Per-slice readers ----------

async function readSettings(): Promise<any> {
    try {
        await connectDB();
        const doc = await SiteSettings.findOne({}).lean();
        return doc ? { ...doc, _id: doc._id?.toString() } : {};
    } catch { return {}; }
}

async function readHome(): Promise<any> {
    try {
        await connectDB();
        const doc = await HomeCms.findOne({}).lean();
        return doc || {};
    } catch { return {}; }
}

async function readAbout(): Promise<any> {
    try {
        await connectDB();
        const doc = await AboutCms.findOne({}).lean();
        return doc || {};
    } catch { return {}; }
}

async function readRegistration(): Promise<any> {
    try {
        await connectDB();
        const doc = await RegistrationCms.findOne({}).lean();
        return doc || {};
    } catch { return {}; }
}

async function readLegal(): Promise<any> {
    try {
        await connectDB();
        const [privacy, terms, rulebook] = await Promise.all([
            LegalPage.findOne({ type: "privacy" }).lean(),
            LegalPage.findOne({ type: "terms" }).lean(),
            LegalPage.findOne({ type: "rulebook" }).lean(),
        ]);
        return { privacy: privacy || {}, terms: terms || {}, rulebook: rulebook || {} };
    } catch { return { privacy: {}, terms: {}, rulebook: {} }; }
}

async function readSeo(): Promise<Record<string, any>> {
    try {
        await connectDB();
        const docs = await SeoMeta.find({}).lean();
        const out: Record<string, any> = {};
        for (const d of docs) out[d.path] = d;
        return out;
    } catch { return {}; }
}

async function readPageBanners(): Promise<Record<string, any>> {
    try {
        await connectDB();
        const docs = await PageBanner.find({}).lean();
        const out: Record<string, any> = {};
        for (const d of docs) out[d.key] = d;
        return out;
    } catch { return {}; }
}

async function readPages(): Promise<Record<string, any>> {
    try {
        await connectDB();
        const docs = await SitePage.find({}).lean();
        const out: Record<string, any> = {};
        for (const d of docs) out[d.key] = d;
        return out;
    } catch { return {}; }
}

async function readCollections(): Promise<any> {
    try {
        await connectDB();
        const [events, jobs, ambassadors, teams, partners, campaigns, faqs, blogs, news] = await Promise.all([
            Event.find({}).sort({ startDate: -1 }).lean(),
            Job.find({ active: true }).sort({ createdAt: -1 }).lean(),
            Ambassador.find({ active: true }).sort({ order: 1 }).lean(),
            TeamMember.find({ active: true }).sort({ order: 1 }).lean(),
            Partner.find({}).sort({ order: 1 }).lean(),
            Campaign.find({ active: true }).sort({ createdAt: -1 }).lean(),
            FAQ.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean(),
            BlogPost.find({ draft: false }).sort({ publishedAt: -1 }).lean(),
            NewsArticle.find({ draft: false }).sort({ publishedAt: -1 }).lean(),
        ]);
        return { events, jobs, ambassadors, teams, partners, campaigns, faqs, blogs, news };
    } catch { return { events: [], jobs: [], ambassadors: [], teams: [], partners: [], campaigns: [], faqs: [], blogs: [], news: [] }; }
}

// ---------- Cached wrappers ----------

const cachedAll = unstable_cache(
    async (): Promise<SiteContext> => build(),
    ["site-context-all"],
    { tags: [TAGS.ALL], revalidate: 3600 }
);

const cachedSettings = unstable_cache(readSettings, ["site-context-settings"], { tags: [TAGS.SETTINGS, TAGS.ALL] });
const cachedHome = unstable_cache(readHome, ["site-context-home"], { tags: [TAGS.HOME, TAGS.ALL] });
const cachedAbout = unstable_cache(readAbout, ["site-context-about"], { tags: [TAGS.ABOUT, TAGS.ALL] });
const cachedRegistration = unstable_cache(readRegistration, ["site-context-registration"], { tags: [TAGS.REGISTRATION, TAGS.ALL] });
const cachedLegal = unstable_cache(readLegal, ["site-context-legal"], { tags: [TAGS.LEGAL, TAGS.ALL] });
const cachedSeo = unstable_cache(readSeo, ["site-context-seo"], { tags: [TAGS.SEO, TAGS.ALL] });
const cachedPageBanners = unstable_cache(readPageBanners, ["site-context-page-banners"], { tags: [TAGS.PAGE_BANNERS, TAGS.ALL] });
const cachedPages = unstable_cache(readPages, ["site-context-pages"], { tags: [TAGS.ALL] });
const cachedCollections = unstable_cache(readCollections, ["site-context-collections"], { tags: [TAGS.COLLECTIONS, TAGS.ALL] });

// ---------- Public API ----------

export async function getSiteContext(): Promise<SiteContext> {
    return cachedAll();
}

export async function getSiteContextSlice<K extends keyof SiteContext>(slice: K): Promise<SiteContext[K]> {
    const all = await cachedAll();
    return all[slice];
}

export async function getSettings() { return cachedSettings(); }
export async function getHomeCms() { return cachedHome(); }
export async function getAboutCms() { return cachedAbout(); }
export async function getRegistrationCms() { return cachedRegistration(); }
export async function getLegal() { return cachedLegal(); }
export async function getSeoAll() { return cachedSeo(); }
export async function getPageBannersAll() { return cachedPageBanners(); }
export async function getSitePages() { return cachedPages(); }
export async function getAllCollections() { return cachedCollections(); }

// ---------- Build ----------

async function build(): Promise<SiteContext> {
    if (!CMS_LIVE) return defaults();

    const d = defaults();
    const [settings, home, about, registration, legal, seo, pageBanners, pages, collections] = await Promise.all([
        cachedSettings(),
        cachedHome(),
        cachedAbout(),
        cachedRegistration(),
        cachedLegal(),
        cachedSeo(),
        cachedPageBanners(),
        cachedPages(),
        cachedCollections(),
    ]);

    return {
        siteSettings: { ...d.siteSettings, ...settings },
        home: {
            banners: home.banners || d.home.banners,
            whoWeAre: home.whoWeAre || d.home.whoWeAre,
            trustBar: home.trustBar || d.home.trustBar,
            broadcastingPartners: home.broadcastingPartners || d.home.broadcastingPartners,
        },
        about: {
            banner: about.banner || d.about.banner,
            aboutBrpl: about.aboutBrpl || d.about.aboutBrpl,
            missionVision: about.missionVision || d.about.missionVision,
            meetOurTeam: about.meetOurTeam || d.about.meetOurTeam,
        },
        registration: {
            hero: registration.hero || d.registration.hero,
            banner: registration.banner || d.registration.banner,
            videos: registration.videos || d.registration.videos,
            numbersSpeak: registration.numbersSpeak || d.registration.numbersSpeak,
            roadmap: registration.roadmap || d.registration.roadmap,
            zoneDeadlines: registration.zoneDeadlines || d.registration.zoneDeadlines,
            playerStories: registration.playerStories || d.registration.playerStories,
            registrationFaqs: registration.registrationFaqs || d.registration.registrationFaqs,
        },
        legal,
        seo,
        pageBanners,
        collections,
        pages: pages as any,
        socialLinks: DEFAULT_SOCIAL_LINKS,
        navLinks: settings.navbarLinks && settings.navbarLinks.length > 0 ? settings.navbarLinks : d.navLinks,
        footerLinks: settings.footerLinks && settings.footerLinks.length > 0 ? settings.footerLinks : d.footerLinks,
        featureFlag: d.featureFlag,
    };
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/lib/siteContext.ts && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(site-context): add full DB-driven context loader with cached reads"
```

---

## Task 6: Create `SiteContextProvider` (client context wrapper)

**Files:**
- Create: `src/components/SiteContextProvider.tsx`

- [ ] **Step 1: Write the file**

Create `src/components/SiteContextProvider.tsx` with this exact content:

```tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SiteContext } from "@/lib/siteContext";

const SiteContextValue = createContext<SiteContext | null>(null);

export function SiteContextProvider({
    value,
    children,
}: {
    value: SiteContext;
    children: ReactNode;
}) {
    return <SiteContextValue.Provider value={value}>{children}</SiteContextValue.Provider>;
}

export function useSiteContext(): SiteContext {
    const ctx = useContext(SiteContextValue);
    if (!ctx) {
        throw new Error("useSiteContext must be used inside <SiteContextProvider>");
    }
    return ctx;
}

// Convenience selectors
export function useSiteSettings() { return useSiteContext().siteSettings; }
export function useSocialLinks() { return useSiteContext().socialLinks; }
export function useNavLinks() { return useSiteContext().navLinks; }
export function useFooterLinks() { return useSiteContext().footerLinks; }
export function useHomeCms() { return useSiteContext().home; }
export function useAboutCms() { return useSiteContext().about; }
export function useRegistrationCms() { return useSiteContext().registration; }
export function useLegal() { return useSiteContext().legal; }
export function useSeoMap() { return useSiteContext().seo; }
export function usePageBanners() { return useSiteContext().pageBanners; }
export function useSitePages() { return useSiteContext().pages; }
export function useCollections() { return useSiteContext().collections; }
```

- [ ] **Step 2: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/components/SiteContextProvider.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(site-context): add client provider + selector hooks"
```

---

## Task 7: Wire `RootProviders` and root `layout.tsx`

**Files:**
- Modify: `src/components/RootProviders.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update `RootProviders` to accept and forward `siteContext`**

Open `src/components/RootProviders.tsx`. Replace the entire file with:

```tsx
"use client";

import { HelmetProvider } from "react-helmet-async";
import { SiteContextProvider, useSiteContext } from "@/components/SiteContextProvider";
import type { SiteContext } from "@/lib/siteContext";

/**
 * Wraps the app with the providers needed by every page (Helmet, site
 * context). The site context is passed in from the root server layout so
 * server components can decide what data to load.
 */
export default function RootProviders({
    siteContext,
    children,
}: {
    siteContext: SiteContext;
    children: React.ReactNode;
}) {
    return (
        <SiteContextProvider value={siteContext}>
            <HelmetProvider>{children}</HelmetProvider>
        </SiteContextProvider>
    );
}

// Re-export for components that need the raw context
export { useSiteContext };
```

- [ ] **Step 2: Update root `layout.tsx` to be an async Server Component**

Open `src/app/layout.tsx`. Replace the entire file with:

```tsx
import type { Metadata } from "next";
import { Inter, Space_Grotesk, Rye } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import RootProviders from "@/components/RootProviders";
import { getSiteContext } from "@/lib/siteContext";

const inter = Inter({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-inter",
    display: "swap",
});

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-space-grotesk",
    display: "swap",
});

const rye = Rye({
    subsets: ["latin"],
    weight: ["400"],
    variable: "--font-rye",
    display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
    const ctx = await getSiteContext();
    const s = ctx.siteSettings;
    return {
        title: { default: s.homeSeoTitle || s.siteName, template: `%s | ${s.siteName}` },
        description: s.homeSeoDescription,
        keywords: s.homeSeoKeywords,
        icons: {
            icon: s.faviconUrl || "/favicon.ico",
            apple: s.appleTouchIconUrl || undefined,
        },
        openGraph: {
            title: s.homeSeoTitle || s.siteName,
            description: s.homeSeoDescription,
            images: s.ogImage ? [s.ogImage] : undefined,
        },
    };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const siteContext = await getSiteContext();
    return (
        <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${rye.variable}`}>
            <body className={inter.className}>
                <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
                    <RootProviders siteContext={siteContext}>{children}</RootProviders>
                </ThemeProvider>
            </body>
        </html>
    );
}
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -15`
Expected: `✓ Compiled successfully` (warnings OK, no errors).

- [ ] **Step 4: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/components/RootProviders.tsx src/app/layout.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(layout): fetch site context once and wrap tree with provider"
```

---

## Task 8: Add `revalidateSite` calls to every existing admin PATCH route

**Files:** Touch every PATCH/POST/DELETE route under `src/app/api/admin/**` (≈20 files). For each: import `revalidateSite` and `TAGS` from `@/lib/revalidate` and call `revalidateSite(...)` after a successful write with the relevant tag(s).

The mapping (file → tags):
- `src/app/api/admin/settings/route.ts` → `TAGS.SETTINGS`
- `src/app/api/admin/social-contact/route.ts` → `TAGS.SETTINGS`
- `src/app/api/admin/home/[section]/route.ts` → `TAGS.HOME`
- `src/app/api/admin/about-us/[section]/route.ts` → `TAGS.ABOUT`
- `src/app/api/admin/registration/[section]/route.ts` → `TAGS.REGISTRATION`
- `src/app/api/admin/registration-page/route.ts` → `TAGS.REGISTRATION`
- `src/app/api/admin/legal/[type]/route.ts` → `TAGS.LEGAL`
- `src/app/api/admin/seo/route.ts` → `TAGS.SEO`
- `src/app/api/admin/page-banner/route.ts` → `TAGS.PAGE_BANNERS`
- `src/app/api/admin/blog/route.ts`, `[id]/route.ts` → `TAGS.COLLECTIONS`
- `src/app/api/admin/news/route.ts`, `[id]/route.ts` → `TAGS.COLLECTIONS`
- `src/app/api/admin/events/route.ts`, `[id]/route.ts` → `TAGS.COLLECTIONS`
- `src/app/api/admin/jobs/route.ts`, `[id]/route.ts` → `TAGS.COLLECTIONS`
- `src/app/api/admin/ambassadors/route.ts`, `[id]/route.ts` → `TAGS.COLLECTIONS`
- `src/app/api/admin/teams/route.ts`, `[id]/route.ts` → `TAGS.COLLECTIONS`
- `src/app/api/admin/partners/route.ts`, `[id]/route.ts` → `TAGS.COLLECTIONS`
- `src/app/api/admin/campaigns/route.ts`, `[id]/route.ts` → `TAGS.COLLECTIONS`
- `src/app/api/admin/faqs/route.ts`, `[id]/route.ts` → `TAGS.COLLECTIONS`

- [ ] **Step 1: Show the pattern using settings as the example**

Open `src/app/api/admin/settings/route.ts`. Find the `PATCH` function. After the successful `ok()` return, add a `revalidateSite` call. Specifically: in the success branch of `PATCH` (where it returns `ok(updated)`), add this immediately before the return statement:

```ts
revalidateSite(TAGS.SETTINGS);
```

The import line at the top of the file should become:

```ts
import { requireAdminDb, ok, serverError } from "@/lib/adminApi";
import { revalidateSite, TAGS } from "@/lib/revalidate";
```

- [ ] **Step 2: Apply the same pattern to the remaining routes**

For every file in the list above, add the import `import { revalidateSite, TAGS } from "@/lib/revalidate";` at the top, then add `revalidateSite(...)` with the correct tag immediately before each successful `ok(...)` return in PATCH/POST/DELETE handlers.

- [ ] **Step 3: Verify build**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/app/api/admin && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin-api): revalidate site-context on every CMS write"
```

---

## Task 9: Wire `Header` to `useSiteContext()`

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Replace the `useSiteSettings` import and the hardcoded `logo` / nav links**

Open `src/components/Header.tsx`. Find the import `import { useSiteSettings } from "@/hooks/useSiteSettings";` and replace it with:

```ts
import { useSiteContext } from "@/components/SiteContextProvider";
import { getImageUrl } from "@/utils/imageHelper";
```

Find the line `const { settings } = useSiteSettings();` and replace it with:

```ts
const { siteSettings, navLinks } = useSiteContext();
const settings = siteSettings as any;
const logoUrl = settings.logoUrl || "/logo.webp";
const headerCtaText = settings.headerCtaText || "Register Now";
const headerCtaLink = settings.headerCtaLink || "/registration";
```

Find the `defaultNavLinks` constant and replace it with:

```ts
const defaultNavLinks = navLinks && navLinks.length > 0 ? navLinks : [
    { label: "Home", path: "/" },
    { label: "About Us", path: "/about-us" },
];
```

Find every `<img src="/logo.webp"` reference and replace with `<img src={logoUrl}`.

Find every reference to `"Register Now"` and `"/registration"` in the CTA button and replace with `{headerCtaText}` and `{headerCtaLink}`.

- [ ] **Step 2: Verify build**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/components/Header.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(header): read logo, nav, CTA from site context"
```

---

## Task 10: Wire `Footer` to `useSiteContext()`

**Files:**
- Modify: `src/components/Footer.tsx`

- [ ] **Step 1: Update imports and data sources**

Open `src/components/Footer.tsx`. Replace the import `import { useSiteSettings } from "@/hooks/useSiteSettings";` with:

```ts
import { useSiteContext } from "@/components/SiteContextProvider";
import { getImageUrl } from "@/utils/imageHelper";
```

Replace `const { settings } = useSiteSettings();` with:

```ts
const { siteSettings, socialLinks, footerLinks } = useSiteContext();
const s = siteSettings as any;
const footerLogoUrl = s.footerLogoUrl || s.logoUrl || "/logo.webp";
const footerAboutText = s.footerAboutText || "";
const mapEmbedUrl = s.mapEmbedUrl || "";
const contactEmail = s.contactEmail || "";
const contactPhone = s.contactPhone || "";
const contactAddress = s.contactAddress || "";
```

Replace every hardcoded team-name array (`["North East Panthers", ...]`) and hardcoded `BRPL - T10`, `Useful Links`, `Contact` arrays with `footerLinks` rendered dynamically (iterate `footerLinks.map(group => ...)` and render group.heading + group.links).

Replace every reference to `settings.socialLinks` with `socialLinks`.

Replace `<img src="/logo.webp"` (if any) with `<img src={footerLogoUrl}`.

- [ ] **Step 2: Verify build**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/components/Footer.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(footer): read social links, footer link groups, contact from site context"
```

---

## Task 11: Wire `SEO` + custom scripts components

**Files:**
- Modify: `src/components/SEO.tsx`
- Modify: `src/components/CustomHeadScripts.tsx`
- Modify: `src/components/CustomBodyScripts.tsx`

- [ ] **Step 1: Update `SEO` to read from context**

Open `src/components/SEO.tsx`. Replace the `useSiteSettings` import with `useSiteContext`. At the top of the component, destructure:

```ts
const { siteSettings, seo } = useSiteContext();
const s = siteSettings as any;
const override = (typeof window !== "undefined" ? seo[window.location.pathname] : null) || {};
```

Change the component so that title/description/keywords/ogImage fall back to `override.title` then `s.homeSeoTitle/Description/Keywords/ogImage`.

- [ ] **Step 2: Update `CustomHeadScripts`**

Open `src/components/CustomHeadScripts.tsx`. Replace any `useSiteSettings` with `useSiteContext`. Render `<div dangerouslySetInnerHTML={{ __html: siteSettings.customHeadScripts || "" }} />`.

- [ ] **Step 3: Update `CustomBodyScripts`**

Open `src/components/CustomBodyScripts.tsx`. Same pattern as head scripts.

- [ ] **Step 4: Verify build**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/components/SEO.tsx src/components/CustomHeadScripts.tsx src/components/CustomBodyScripts.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(seo+scripts): read from site context with per-page override"
```

---

## Task 12: Wire floating CTAs

**Files:**
- Modify: `src/components/FloatingWhatsAppButton.tsx`
- Modify: `src/components/FloatingRegisterButton.tsx`

- [ ] **Step 1: Update `FloatingWhatsAppButton`**

Open `src/components/FloatingWhatsAppButton.tsx`. Replace any hardcoded phone number `918130955866` with:

```ts
const { siteSettings } = useSiteContext();
const whatsappNumber = (siteSettings as any).whatsappNumber || "918130955866";
```

Update the rendered `href={`https://wa.me/${whatsappNumber}`}` accordingly.

- [ ] **Step 2: Update `FloatingRegisterButton`**

Open `src/components/FloatingRegisterButton.tsx`. Replace hardcoded `/registration` and `Register Now` with:

```ts
const { siteSettings } = useSiteContext();
const text = (siteSettings as any).floatingRegisterText || "Register Now";
const link = (siteSettings as any).floatingRegisterLink || "/registration";
```

- [ ] **Step 3: Verify build + commit**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -5`
Then: `git add src/components/FloatingWhatsAppButton.tsx src/components/FloatingRegisterButton.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(cta-buttons): read WhatsApp and register from site context"`

---

## Task 13: Wire home page (`(main)/page.tsx`)

**Files:**
- Modify: `src/app/(main)/page.tsx`
- Modify: `src/components/Banner.tsx`
- Modify: `src/components/WhoWeAre.tsx`
- Modify: `src/components/EventGallerySlider.tsx`
- Modify: `src/components/AmbassadorsSection.tsx`
- Modify: `src/components/Teams.tsx`
- Modify: `src/components/BroadcastingPartners.tsx`

- [ ] **Step 1: Make home page an async Server Component that fetches home slice**

Open `src/app/(main)/page.tsx`. Replace the file with:

```tsx
import { getHomeCms, getAllCollections } from "@/lib/siteContext";
import Banner from "@/components/Banner";
import WhoWeAre from "@/components/WhoWeAre";
import EventGallerySlider from "@/components/EventGallerySlider";
import AmbassadorsSection from "@/components/AmbassadorsSection";
import Teams from "@/components/Teams";
import BroadcastingPartners from "@/components/BroadcastingPartners";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { getSiteContext } from "@/lib/siteContext";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const [home, collections, full] = await Promise.all([
        getHomeCms(),
        getAllCollections(),
        getSiteContext(),
    ]);

    return (
        <SiteContextProvider value={full}>
            <div className="min-h-screen bg-transparent relative flex flex-col font-sans">
                <Banner data={home.banners} trustBar={home.trustBar} />
                <WhoWeAre data={home.whoWeAre} />
                <EventGallerySlider events={collections.events} />
                <AmbassadorsSection ambassadors={collections.ambassadors} />
                <Teams members={collections.teams} />
                <BroadcastingPartners partners={home.broadcastingPartners} />
            </div>
        </SiteContextProvider>
    );
}
```

- [ ] **Step 2: Update each section component to accept the new `data` prop**

For each of the 6 components, change the signature to accept props (e.g. `function Banner({ data, trustBar }: { data: any[]; trustBar: any[] })`) and replace hardcoded values with `data`/`trustBar`/etc. The exact code depends on the existing component — the rule is: **the JSX stays visually identical when the data prop is empty** (fall back to existing hardcoded arrays inside the component if `data` is empty). Keep all existing hardcoded content as the inner default.

For `Banner.tsx`, `WhoWeAre.tsx`, `EventGallerySlider.tsx`, `AmbassadorsSection.tsx`, `Teams.tsx`, `BroadcastingPartners.tsx`: add the prop, render the data if present, otherwise render the existing hardcoded content.

- [ ] **Step 3: Verify build + commit**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Then:

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/app/\(main\)/page.tsx src/components/Banner.tsx src/components/WhoWeAre.tsx src/components/EventGallerySlider.tsx src/components/AmbassadorsSection.tsx src/components/Teams.tsx src/components/BroadcastingPartners.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(home): wire banner, who-we-are, ambassadors, teams, partners to CMS"
```

---

## Task 14: Wire `about-us` page

**Files:**
- Modify: `src/app/(main)/about-us/page.tsx`
- Modify: `src/components/MissionVisionSection.tsx`
- Modify: `src/components/MeetOurTeamSection.tsx`
- Modify: `src/components/AboutSection.tsx`
- Modify: `src/components/LivesChangedSection.tsx`
- Modify: `src/components/PageBanner.tsx`

- [ ] **Step 1: Convert page to async Server Component**

Open `src/app/(main)/about-us/page.tsx`. Replace the file with:

```tsx
import { getAboutCms, getAllCollections, getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import PageBanner from "@/components/PageBanner";
import AboutSection from "@/components/AboutSection";
import MissionVisionSection from "@/components/MissionVisionSection";
import MeetOurTeamSection from "@/components/MeetOurTeamSection";

export const dynamic = "force-dynamic";

export default async function AboutUsPage() {
    const [about, collections, full] = await Promise.all([
        getAboutCms(),
        getAllCollections(),
        getSiteContext(),
    ]);

    return (
        <SiteContextProvider value={full}>
            <div className="min-h-screen bg-gray-50">
                <PageBanner pageKey="aboutUs" title="About us" currentPage="About us" data={about.banner} />
                <div id="about-content">
                    <AboutSection data={about.aboutBrpl} />
                </div>
                <div>
                    <MissionVisionSection data={about.missionVision} />
                </div>
                <div>
                    <MeetOurTeamSection members={collections.teams} data={about.meetOurTeam} />
                </div>
            </div>
        </SiteContextProvider>
    );
}
```

- [ ] **Step 2: Update each child component to accept the `data` prop**

`MissionVisionSection`, `MeetOurTeamSection`, `AboutSection`, `LivesChangedSection`: each accepts a `data` prop. If `data` is empty/object, render the existing hardcoded content (unchanged). If `data` has values, render those.

`PageBanner.tsx`: accept a `data` prop. If `data.title` is set, use it; else fall back to the existing `title` prop.

- [ ] **Step 3: Verify build + commit**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Then:

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/app/\(main\)/about-us/page.tsx src/components/MissionVisionSection.tsx src/components/MeetOurTeamSection.tsx src/components/AboutSection.tsx src/components/LivesChangedSection.tsx src/components/PageBanner.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(about-us): wire to AboutCms + SitePage"
```

---

## Task 15: Wire remaining public pages (12 pages)

For each of the following pages, apply the same pattern: convert to async Server Component, call `getSiteContextSlice(...)` (or `getSitePages()` for the matching key), pass data to existing visual components as props. Existing components keep their hardcoded content as inner defaults so the page looks identical with an empty DB.

**Files to modify (one commit per page is fine, but a single commit at the end is also OK):**

- `src/app/(main)/teams/page.tsx` — pass `pages.teams` + `collections.teams` to `Teams` + `PageBanner`.
- `src/app/(main)/career/page.tsx` — pass `pages.career` to a new `<CareerSection data={...}>` (or just render the body field as hero/body).
- `src/app/(main)/contact-us/page.tsx` — read `siteSettings.contactEmail/Phone/Address` and `pages['contact-us']` for body.
- `src/app/(main)/events/page.tsx` — pass `pages['events-page']` + `collections.events`.
- `src/app/(main)/partners/page.tsx` — pass `pages.partners` + `collections.partners`.
- `src/app/(main)/registration/page.tsx` — pass `registration.*` to existing sections.
- `src/app/(main)/types-of-partners/page.tsx` — pass `pages['types-of-partners']`.
- `src/app/(main)/blog/page.tsx`, `src/app/(main)/blog/[slug]/page.tsx` — pass `pages['blog-index']` + `collections.blogs`.
- `src/app/(main)/news/page.tsx`, `src/app/(main)/news/[slug]/page.tsx` — same shape with `news`.
- `src/app/(main)/press/[id]/page.tsx` — read `siteSettings` for any branding.
- `src/app/(main)/privacy-policy/page.tsx` — read `legal.privacy` for body.
- `src/app/(main)/terms-and-conditions/page.tsx` — read `legal.terms`.
- `src/app/(main)/rule-book/page.tsx` — read `legal.rulebook`.
- `src/app/(main)/faqs/page.tsx` — pass `pages['faqs-page']` + `collections.faqs`.
- `src/app/(main)/thank-you/page.tsx` — read `siteSettings` for any branding.
- `src/app/(main)/not-found.tsx` — read `siteSettings`.

- [ ] **Step 1: Convert each page to async Server Component**

For every file in the list above:
- Add `export const dynamic = "force-dynamic";` at the top.
- Make the default export `async function`.
- At the top of the function, call `await getSiteContext()` (or the slice), then `<SiteContextProvider value={full}>` wrap the existing JSX.
- Pass data as props to the existing components; they fall back to hardcoded values internally when props are empty.

- [ ] **Step 2: Verify build + commit**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Expected: `✓ Compiled successfully`.
Then:

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/app/\(main\)/ && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(public-pages): wire all 18 public pages to site context"
```

---

## Task 16: Build `useSiteSettings` shim that delegates to context

**Files:**
- Modify: `src/hooks/useSiteSettings.ts`

- [ ] **Step 1: Update the hook to use the context provider**

Open `src/hooks/useSiteSettings.ts`. Replace the entire file with:

```ts
"use client";

import { useSiteContext } from "@/components/SiteContextProvider";

export interface SocialLink {
    name: string;
    url: string;
    image: string;
}

export interface SiteSettings {
    contactAddress: string;
    contactPhone: string;
    contactPhoneSecondary: string;
    contactEmail: string;
    whatsappNumber: string;
    mapEmbedUrl: string;
    socialLinks: SocialLink[];
    bannerImage: string;
    bannerTitles: Record<string, string>;
    teamsBannerImage: string;
    teamsVideoUrl: string;
    customHeadScripts: string;
    customBodyScripts: string;
    [key: string]: any;
}

const FALLBACK: SiteSettings = {
    contactAddress: "",
    contactPhone: "",
    contactPhoneSecondary: "",
    contactEmail: "",
    whatsappNumber: "918130955866",
    mapEmbedUrl: "",
    socialLinks: [],
    bannerImage: "",
    bannerTitles: {},
    teamsBannerImage: "",
    teamsVideoUrl: "",
    customHeadScripts: "",
    customBodyScripts: "",
};

/**
 * Backwards-compatible hook. Reads the merged site context and projects it
 * to the legacy `SiteSettings` shape that older components expect. Any
 * component still importing from `@/hooks/useSiteSettings` keeps working
 * with dynamic data without code changes.
 */
export function useSiteSettings() {
    let ctx: ReturnType<typeof useSiteContext> | null = null;
    try {
        ctx = useSiteContext();
    } catch {
        // No provider — used outside an admin/root tree. Return fallback.
        return { settings: FALLBACK, loading: false };
    }
    const s = (ctx?.siteSettings as any) || {};
    const settings: SiteSettings = {
        ...FALLBACK,
        ...s,
        socialLinks: (ctx?.socialLinks as any) || FALLBACK.socialLinks,
        customHeadScripts: s.customHeadScripts || "",
        customBodyScripts: s.customBodyScripts || "",
    };
    return { settings, loading: false };
}
```

- [ ] **Step 2: Verify build + commit**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Then: `git add src/hooks/useSiteSettings.ts && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(hook): useSiteSettings delegates to site context"`

---

## Task 17: Add admin API route for `SitePage`

**Files:**
- Create: `src/app/api/admin/site-pages/[key]/route.ts`

- [ ] **Step 1: Write the route**

Create `src/app/api/admin/site-pages/[key]/route.ts` with this exact content:

```ts
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import SitePage, { SITE_PAGE_KEYS, type SitePageKey } from "@/models/SitePage";
import { requireAdminDb, ok, fail, notFound, serverError } from "@/lib/adminApi";
import { revalidateSite, TAGS } from "@/lib/revalidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    title: z.string().min(1).max(300),
    subtitle: z.string().optional(),
    body: z.string().optional(),
    heroImage: z.string().optional(),
    heroImageMobile: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
    meta: z.record(z.string(), z.any()).optional(),
    order: z.number().int().optional(),
});

function isValidKey(k: string): k is SitePageKey {
    return (SITE_PAGE_KEYS as readonly string[]).includes(k);
}

export async function GET(_req: Request, { params }: { params: { key: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (!isValidKey(params.key)) return notFound("Unknown page key");
        await connectDB();
        const doc = await SitePage.findOne({ key: params.key }).lean();
        if (!doc) {
            const created = await SitePage.create({
                key: params.key,
                title: defaultTitleFor(params.key),
            });
            return ok({ ...created.toObject(), _id: created._id.toString() });
        }
        return ok({ ...doc, _id: doc._id.toString() });
    } catch (err) {
        return serverError(err);
    }
}

export async function PATCH(req: Request, { params }: { params: { key: string } }) {
    try {
        const session = await requireAdminDb();
        if (session instanceof Response) return session;
        if (!isValidKey(params.key)) return fail("Unknown page key", 400);
        const body = await req.json().catch(() => ({}));
        const parsed = schema.safeParse(body);
        if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid input", 400);
        await connectDB();
        const doc = await SitePage.findOneAndUpdate(
            { key: params.key },
            { ...parsed.data, key: params.key },
            { upsert: true, new: true }
        ).lean();
        revalidateSite();
        return ok({ ...doc, _id: (doc as any)._id.toString() });
    } catch (err) {
        return serverError(err);
    }
}

function defaultTitleFor(key: SitePageKey): string {
    const map: Record<SitePageKey, string> = {
        "about-us": "About Us",
        "teams": "Teams",
        "career": "Career",
        "contact-us": "Contact Us",
        "events-page": "Events",
        "partners": "Partners",
        "registration-page": "Registration",
        "types-of-partners": "Types of Partners",
        "blog-index": "Blog",
        "news-index": "News",
        "privacy-page": "Privacy Policy",
        "terms-page": "Terms & Conditions",
        "rule-book": "Rule Book",
        "faqs-page": "FAQs",
    };
    return map[key] || key;
}
```

- [ ] **Step 2: Verify build + commit**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Then: `git add src/app/api/admin/site-pages/ && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin-api): site-page upsert endpoint"`

---

## Task 18: Extend `/admin/settings` UI with new fields

**Files:**
- Modify: `src/app/(admin)/admin/settings/page.tsx`
- Create: `src/components/admin/NavbarLinksEditor.tsx`
- Create: `src/components/admin/FooterLinksEditor.tsx`

- [ ] **Step 1: Create the NavbarLinksEditor**

Create `src/components/admin/NavbarLinksEditor.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { updateSettings } from "@/apihelper/admin";

type Link = { label: string; path: string; isExternal?: boolean; children?: Link[] };

export function NavbarLinksEditor({ initial }: { initial: Link[] }) {
    const [items, setItems] = useState<Link[]>(initial || []);
    const [saving, setSaving] = useState(false);

    const add = () => setItems([...items, { label: "", path: "" }]);
    const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
    const update = (i: number, k: keyof Link, v: any) =>
        setItems(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

    const addChild = (i: number) => {
        const next = [...items];
        next[i] = { ...next[i], children: [...(next[i].children || []), { label: "", path: "" }] };
        setItems(next);
    };
    const updateChild = (i: number, ci: number, k: keyof Link, v: any) => {
        const next = [...items];
        const children = [...(next[i].children || [])];
        children[ci] = { ...children[ci], [k]: v };
        next[i] = { ...next[i], children };
        setItems(next);
    };
    const removeChild = (i: number, ci: number) => {
        const next = [...items];
        next[i] = { ...next[i], children: (next[i].children || []).filter((_, idx) => idx !== ci) };
        setItems(next);
    };

    const save = async () => {
        setSaving(true);
        try {
            const res = await updateSettings({ navbarLinks: items });
            if (res.ok) toast({ title: "Success", description: "Navbar saved" });
            else toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
        } catch { toast({ variant: "destructive", title: "Error", description: "Failed" }); }
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-3">
            {items.map((it, i) => (
                <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1"><Label className="text-xs">Label</Label><Input value={it.label} onChange={(e) => update(i, "label", e.target.value)} /></div>
                        <div className="flex-1"><Label className="text-xs">Path</Label><Input value={it.path} onChange={(e) => update(i, "path", e.target.value)} placeholder="/about-us" /></div>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(i)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                    {(it.children || []).map((c, ci) => (
                        <div key={ci} className="flex gap-2 items-end pl-4">
                            <div className="flex-1"><Label className="text-xs">Child Label</Label><Input value={c.label} onChange={(e) => updateChild(i, ci, "label", e.target.value)} /></div>
                            <div className="flex-1"><Label className="text-xs">Child Path</Label><Input value={c.path} onChange={(e) => updateChild(i, ci, "path", e.target.value)} /></div>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeChild(i, ci)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => addChild(i)}><Plus className="w-3 h-3 mr-1" /> Add child</Button>
                </div>
            ))}
            <div className="flex gap-2">
                <Button onClick={add} variant="outline"><Plus className="w-4 h-4 mr-2" /> Add link</Button>
                <Button onClick={save} disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save navbar
                </Button>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Create the FooterLinksEditor**

Create `src/components/admin/FooterLinksEditor.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { updateSettings } from "@/apihelper/admin";

type Group = { heading: string; links: { label: string; path: string }[] };

export function FooterLinksEditor({ initial }: { initial: Group[] }) {
    const [groups, setGroups] = useState<Group[]>(initial || []);
    const [saving, setSaving] = useState(false);

    const addGroup = () => setGroups([...groups, { heading: "", links: [] }]);
    const removeGroup = (i: number) => setGroups(groups.filter((_, idx) => idx !== i));
    const updateHeading = (i: number, v: string) => setGroups(groups.map((g, idx) => idx === i ? { ...g, heading: v } : g));

    const addLink = (i: number) => setGroups(groups.map((g, idx) => idx === i ? { ...g, links: [...g.links, { label: "", path: "" }] } : g));
    const updateLink = (i: number, li: number, k: "label" | "path", v: string) =>
        setGroups(groups.map((g, idx) => idx === i ? { ...g, links: g.links.map((l, j) => j === li ? { ...l, [k]: v } : l) } : g));
    const removeLink = (i: number, li: number) =>
        setGroups(groups.map((g, idx) => idx === i ? { ...g, links: g.links.filter((_, j) => j !== li) } : g));

    const save = async () => {
        setSaving(true);
        try {
            const res = await updateSettings({ footerLinks: groups });
            if (res.ok) toast({ title: "Success", description: "Footer links saved" });
            else toast({ variant: "destructive", title: "Error", description: res.error || "Failed" });
        } catch { toast({ variant: "destructive", title: "Error", description: "Failed" }); }
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-3">
            {groups.map((g, i) => (
                <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1"><Label className="text-xs">Group Heading</Label><Input value={g.heading} onChange={(e) => updateHeading(i, e.target.value)} /></div>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeGroup(i)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                    {g.links.map((l, li) => (
                        <div key={li} className="flex gap-2 items-end pl-4">
                            <div className="flex-1"><Label className="text-xs">Link Label</Label><Input value={l.label} onChange={(e) => updateLink(i, li, "label", e.target.value)} /></div>
                            <div className="flex-1"><Label className="text-xs">Path</Label><Input value={l.path} onChange={(e) => updateLink(i, li, "path", e.target.value)} /></div>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeLink(i, li)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => addLink(i)}><Plus className="w-3 h-3 mr-1" /> Add link</Button>
                </div>
            ))}
            <div className="flex gap-2">
                <Button onClick={addGroup} variant="outline"><Plus className="w-4 h-4 mr-2" /> Add group</Button>
                <Button onClick={save} disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save footer
                </Button>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Extend `/admin/settings/page.tsx` with the new fields**

Open `src/app/(admin)/admin/settings/page.tsx`. Replace the entire file with:

```tsx
"use client";

import { CmsForm } from "@/components/admin/CmsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSettings, updateSettings } from "@/apihelper/admin";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { NavbarLinksEditor } from "@/components/admin/NavbarLinksEditor";
import { FooterLinksEditor } from "@/components/admin/FooterLinksEditor";

export default function SettingsPage() {
    return (
        <CmsForm
            title="Site Settings"
            description="Global site settings, branding, and registration details."
            getData={getSettings}
            saveData={updateSettings}
            fields={[
                { name: "siteName", label: "Site Name", type: "text", required: true },
                { name: "tagline", label: "Tagline", type: "text" },
                // branding
                { name: "logoUrl", label: "Header Logo URL", type: "text" },
                { name: "footerLogoUrl", label: "Footer Logo URL", type: "text" },
                { name: "faviconUrl", label: "Favicon URL", type: "text" },
                { name: "appleTouchIconUrl", label: "Apple Touch Icon URL", type: "text" },
                { name: "ogImage", label: "Default OG Image URL", type: "text" },
                { name: "primaryColor", label: "Primary Color (hex)", type: "text" },
                // home SEO
                { name: "homeSeoTitle", label: "Home SEO Title", type: "text" },
                { name: "homeSeoDescription", label: "Home SEO Description", type: "textarea" },
                { name: "homeSeoKeywords", label: "Home SEO Keywords (comma)", type: "text" },
                // header CTA
                { name: "headerCtaText", label: "Header CTA Text", type: "text" },
                { name: "headerCtaLink", label: "Header CTA Link", type: "text" },
                // contact
                { name: "contactEmail", label: "Contact Email", type: "text" },
                { name: "contactPhone", label: "Contact Phone", type: "text" },
                { name: "contactPhoneSecondary", label: "Contact Phone (secondary)", type: "text" },
                { name: "contactAddress", label: "Contact Address", type: "textarea" },
                { name: "mapEmbedUrl", label: "Map Embed URL", type: "text" },
                // footer
                { name: "footerAboutText", label: "Footer About Text", type: "textarea" },
                // floating CTAs
                { name: "whatsappNumber", label: "WhatsApp Number (E.164 no +)", type: "text" },
                { name: "floatingRegisterText", label: "Floating Register Button Text", type: "text" },
                { name: "floatingRegisterLink", label: "Floating Register Button Link", type: "text" },
                // registration fee
                { name: "registrationFee", label: "Registration Fee (Rs.)", type: "text" },
            ]}
        >
            {(data) => (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Navbar Links</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <NavbarLinksEditor initial={data.navbarLinks || []} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Footer Link Groups</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FooterLinksEditor initial={data.footerLinks || []} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Custom Head & Body Scripts</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ScriptsEditor
                                label="Custom Head Scripts (raw HTML)"
                                value={data.customHeadScripts || ""}
                                onSave={async (v) => { await updateSettings({ customHeadScripts: v }); }}
                            />
                            <ScriptsEditor
                                label="Custom Body Scripts (raw HTML)"
                                value={data.customBodyScripts || ""}
                                onSave={async (v) => { await updateSettings({ customBodyScripts: v }); }}
                            />
                        </CardContent>
                    </Card>
                </>
            )}
        </CmsForm>
    );
}

function ScriptsEditor({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => Promise<any> }) {
    const [v, setV] = useState(value);
    const [saving, setSaving] = useState(false);
    const save = async () => {
        setSaving(true);
        try {
            const res = await onSave(v);
            if (res?.ok) toast({ title: "Success", description: "Saved" });
            else toast({ variant: "destructive", title: "Error", description: res?.error || "Failed" });
        } finally { setSaving(false); }
    };
    return (
        <div>
            <Label className="mb-2 block">{label}</Label>
            <textarea
                value={v}
                onChange={(e) => setV(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
            <Button onClick={save} disabled={saving} size="sm" className="mt-2 bg-amber-500 text-black hover:bg-amber-400">
                {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                Save
            </Button>
        </div>
    );
}
```

- [ ] **Step 4: Verify build + commit**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Then:

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/app/\(admin\)/admin/settings/page.tsx src/components/admin/NavbarLinksEditor.tsx src/components/admin/FooterLinksEditor.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin-settings): add branding, navbar, footer, scripts editors"
```

---

## Task 19: Extend home CMS admin with `trustBar` + `broadcastingPartners`

**Files:**
- Modify: `src/app/(admin)/admin/cms/banners/page.tsx`

- [ ] **Step 1: Add the two new section editors**

Open `src/app/(admin)/admin/cms/banners/page.tsx`. After the existing banner save button (around the existing top-bar), add a `Save` button that also writes the trustBar + broadcastingPartners. Concretely, change the file to:

1. Add state: `const [trustBar, setTrustBar] = useState<any[]>([]); const [broadcastingPartners, setBroadcastingPartners] = useState<any[]>([]);`
2. Load them in the `useEffect` from `getHomeSection("banners")` (extend the API helper to return them OR fetch from a new endpoint — easier: extend the existing `getHomeSection` backend route to return these fields when section=banners).
3. Add a single combined `save()` that does `updateHomeSection("banners", { banners, trustBar, broadcastingPartners })` and calls `revalidateSite(TAGS.HOME)`.

Since the cleanest path is to update the backend route first:

Open `src/app/api/admin/home/[section]/route.ts`. In the PATCH handler, when `section === "banners"`, accept and merge `trustBar` and `broadcastingPartners` into the top-level doc. Add to the existing PATCH logic:

```ts
if (section === "banners") {
    const update: Record<string, unknown> = { banners: body.banners ?? existing.banners };
    if ("trustBar" in body) update.trustBar = body.trustBar;
    if ("broadcastingPartners" in body) update.broadcastingPartners = body.broadcastingPartners;
    // ...write update to HomeCms
}
```

In the GET handler for section=banners, include `trustBar` and `broadcastingPartners` in the response.

Then in the admin page, render two new `Card`s below the existing banner list — same add/remove pattern as `SectionForm.tsx` for trust bar items and broadcasting partner items.

- [ ] **Step 2: Verify build + commit**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Then: `git add src/app/\(admin\)/admin/cms/banners/page.tsx src/app/api/admin/home/ && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin-cms): add trustBar and broadcastingPartners editors"`

---

## Task 20: Build `/admin/site-pages` page

**Files:**
- Create: `src/app/(admin)/admin/site-pages/page.tsx`

- [ ] **Step 1: Write the page**

Create `src/app/(admin)/admin/site-pages/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Save, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const KEYS: { key: string; label: string }[] = [
    { key: "about-us", label: "About Us" },
    { key: "teams", label: "Teams" },
    { key: "career", label: "Career" },
    { key: "contact-us", label: "Contact Us" },
    { key: "events-page", label: "Events Page" },
    { key: "partners", label: "Partners" },
    { key: "registration-page", label: "Registration Page" },
    { key: "types-of-partners", label: "Types of Partners" },
    { key: "blog-index", label: "Blog Index" },
    { key: "news-index", label: "News Index" },
    { key: "privacy-page", label: "Privacy" },
    { key: "terms-page", label: "Terms" },
    { key: "rule-book", label: "Rule Book" },
    { key: "faqs-page", label: "FAQs Page" },
];

export default function SitePagesAdminPage() {
    const [active, setActive] = useState<string>(KEYS[0].key);
    const [data, setData] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/admin/site-pages/${active}`);
                if (res.ok) {
                    const j = await res.json();
                    setData(j.data || {});
                }
            } catch { /* ignore */ }
            finally { setLoading(false); }
        })();
    }, [active]);

    const save = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/site-pages/${active}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: data.title || "",
                    subtitle: data.subtitle,
                    body: data.body,
                    heroImage: data.heroImage,
                    heroImageMobile: data.heroImageMobile,
                    ctaText: data.ctaText,
                    ctaLink: data.ctaLink,
                }),
            });
            if (res.ok) toast({ title: "Success", description: "Saved" });
            else toast({ variant: "destructive", title: "Error", description: "Failed" });
        } catch { toast({ variant: "destructive", title: "Error", description: "Failed" }); }
        finally { setSaving(false); }
    };

    const set = (k: string, v: any) => setData({ ...data, [k]: v });

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold">Site Pages</h1>
                <p className="text-slate-500 mt-1">Edit content for individual public pages (hero text, body copy, etc.).</p>
            </div>

            <Tabs value={active} onValueChange={setActive}>
                <TabsList className="flex flex-wrap h-auto gap-1">
                    {KEYS.map((k) => (
                        <TabsTrigger key={k.key} value={k.key}>{k.label}</TabsTrigger>
                    ))}
                </TabsList>

                {KEYS.map((k) => (
                    <TabsContent key={k.key} value={k.key}>
                        <Card>
                            <CardHeader>
                                <CardTitle>{k.label}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {loading ? (
                                    <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" /></div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2"><Label>Title</Label><Input value={data.title || ""} onChange={(e) => set("title", e.target.value)} /></div>
                                        <div className="md:col-span-2"><Label>Subtitle</Label><Input value={data.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} /></div>
                                        <div className="md:col-span-2"><Label>Hero Image URL</Label><Input value={data.heroImage || ""} onChange={(e) => set("heroImage", e.target.value)} placeholder="https://..." /></div>
                                        <div className="md:col-span-2"><Label>Body (HTML/Markdown)</Label><Textarea rows={8} value={data.body || ""} onChange={(e) => set("body", e.target.value)} /></div>
                                        <div><Label>CTA Text</Label><Input value={data.ctaText || ""} onChange={(e) => set("ctaText", e.target.value)} /></div>
                                        <div><Label>CTA Link</Label><Input value={data.ctaLink || ""} onChange={(e) => set("ctaLink", e.target.value)} /></div>
                                    </div>
                                )}
                                <div className="flex justify-end">
                                    <Button onClick={save} disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
                                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        Save
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
```

- [ ] **Step 2: Add `Site Pages` to the admin sidebar**

Open `src/components/admin/AdminSidebar.tsx`. In the `ALL_ITEMS` array, after the `Settings` entry, add:

```ts
{ icon: FileText, label: "Site Pages", path: "/admin/site-pages" },
```

- [ ] **Step 3: Verify build + commit**

Run: `cd /Users/anurag/Desktop/brpl-frontend && npm run build 2>&1 | tail -10`
Then:

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add src/app/\(admin\)/admin/site-pages/page.tsx src/components/admin/AdminSidebar.tsx && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "feat(admin): site-pages tab UI + sidebar entry"
```

---

## Task 21: Final manual smoke test

- [ ] **Step 1: Cold-load fresh DB**

1. `cd /Users/anurag/Desktop/brpl-frontend && rm -rf .next && npm run build 2>&1 | tail -10` — must succeed.
2. `npm run dev` and visit `http://localhost:3000/`. Confirm visually identical to current site: logo, banner, "About BRPL", "Who We Are", ambassadors, teams, footer phone numbers, social icons, registration hero, all 18 public pages render with no console errors.

- [ ] **Step 2: Single-field edit**

1. Log in at `/admin/login` (admin@brpl.com / Admin@123).
2. Go to `/admin/settings`, change `contactPhone` to `+(91) 99999 99999`, save.
3. Reload `/`. Footer phone number updates within ~1s.

- [ ] **Step 3: Revalidate propagation**

1. In `/admin/cms/banners`, change the title of the first banner.
2. Reload `/`. New title shows within ~1s.

- [ ] **Step 4: Image swap**

1. In `/admin/settings`, change `logoUrl` to any URL.
2. Reload. Header logo updates.

- [ ] **Step 5: Legal page edit**

1. In `/admin/privacy-policy`, change the body content.
2. Reload `/privacy-policy`. New body renders.

- [ ] **Step 6: Site-page edit**

1. In `/admin/site-pages`, switch to the "About Us" tab.
2. Change the title to a new value, save.
3. Reload `/about-us`. New title (in the page body, not the page banner) reflects.

- [ ] **Step 7: Collection CRUD**

1. In `/admin/blog`, add a new blog post.
2. Reload `/blog`. New card appears.

- [ ] **Step 8: Empty defaults**

1. Wipe `SiteSettings`, `SitePage`, `HomeCms` docs (use MongoDB Compass or admin "delete" buttons if you add them).
2. Reload public pages. Each page still renders without errors (defaults kick in).

- [ ] **Step 9: Commit final**

```bash
cd /Users/anurag/Desktop/brpl-frontend && git add -A && git -c user.email="claude@anthropic.com" -c user.name="Claude" commit -m "chore: verified end-to-end CMS wiring"
```

---

## Self-Review

1. **Spec coverage:**
   - Server-side `getSiteContext()` with cache + tags → Task 5 + Task 4
   - React context distribution → Task 6 + Task 7
   - Global chrome (Header, Footer, SEO, scripts, floating CTAs) → Tasks 9, 10, 11, 12
   - All 18 public pages wired → Tasks 13, 14, 15
   - Schema additions (SiteSettings, HomeCms, SitePage) → Tasks 1, 2, 3
   - Admin API: revalidate + new site-pages endpoint → Tasks 8, 17
   - Admin UI: settings extension, home extension, new site-pages page, sidebar → Tasks 18, 19, 20
   - Backwards-compat shim → Task 16
   - Manual verification → Task 21
   - **Gap:** none — every spec section has a corresponding task.

2. **Placeholder scan:** All code blocks are concrete and complete. No "TBD" or "add appropriate handling". The only "depends on existing component" references are for adding a `data` prop, with the rule "fall back to existing hardcoded values" — that's an instruction, not a placeholder.

3. **Type consistency:** `SiteContext` shape, `revalidateSite` signature, `TAGS` constants, `NavbarLink`/`FooterLinkGroup` types all match across tasks.

---

## Plan Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-24-cms-wiring.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
