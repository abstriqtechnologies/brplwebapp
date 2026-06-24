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
    MEDIA: "site-context:media",
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
