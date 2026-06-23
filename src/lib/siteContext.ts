import "server-only";
import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import SiteSettings, { type INavbarLink, type IFooterLinkGroup } from "@/models/SiteSettings";
import HomeCms from "@/models/HomeCms";
import AboutCms from "@/models/AboutCms";
import RegistrationCms from "@/models/RegistrationCms";
import LegalPage from "@/models/LegalPage";
import SeoMeta from "@/models/SeoMeta";
import PageBanner from "@/models/PageBanner";
import SitePage, { type SitePageKey } from "@/models/SitePage";
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
    pages: Partial<Record<SitePageKey, any>>;
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
    switch (slice) {
        case "siteSettings": return (await cachedSettings()) as SiteContext[K];
        case "home": return { banners: (await cachedHome()).banners || [], whoWeAre: (await cachedHome()).whoWeAre || {}, trustBar: (await cachedHome()).trustBar || [], broadcastingPartners: (await cachedHome()).broadcastingPartners || [] } as any;
        case "about": return (await cachedAbout()) as any;
        case "registration": return (await cachedRegistration()) as any;
        case "legal": return (await cachedLegal()) as any;
        case "seo": return (await cachedSeo()) as SiteContext[K];
        case "pageBanners": return (await cachedPageBanners()) as SiteContext[K];
        case "collections": return (await cachedCollections()) as SiteContext[K];
        case "pages": return (await cachedPages()) as SiteContext[K];
        default: return (await cachedAll())[slice];
    }
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

function projectSocials(socials: Record<string, string | undefined> | undefined): SocialLink[] {
    if (!socials) return DEFAULT_SOCIAL_LINKS;
    const map: Record<string, { name: string; image: string }> = {
        facebook: { name: "Facebook", image: "/facebook.webp" },
        twitter: { name: "Twitter", image: "/twiter.webp" },
        instagram: { name: "Instagram", image: "/instagram.webp" },
        youtube: { name: "YouTube", image: "/youtube.webp" },
        linkedin: { name: "LinkedIn", image: "/linkedin.webp" },
        whatsapp: { name: "WhatsApp", image: "/whatsapp.webp" },
    };
    const result: SocialLink[] = [];
    for (const [key, url] of Object.entries(socials)) {
        if (!url) continue;
        const m = map[key];
        if (m) result.push({ name: m.name, url, image: m.image });
    }
    return result.length > 0 ? result : DEFAULT_SOCIAL_LINKS;
}

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
        socialLinks: projectSocials(settings.socials),
        navLinks: Array.isArray(settings.navbarLinks) && settings.navbarLinks.length > 0
            ? settings.navbarLinks
            : d.navLinks,
        footerLinks: Array.isArray(settings.footerLinks) && settings.footerLinks.length > 0
            ? settings.footerLinks
            : d.footerLinks,
        featureFlag: d.featureFlag,
    };
}
