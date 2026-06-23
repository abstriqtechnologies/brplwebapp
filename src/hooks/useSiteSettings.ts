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
        // eslint-disable-next-line react-hooks/rules-of-hooks
        ctx = useSiteContext();
    } catch {
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
