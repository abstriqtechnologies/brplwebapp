/**
 * SEO meta fetcher from the public API.
 * Used by the SEO.tsx client component to get per-page overrides.
 */

export interface SeoMetaData {
    title?: string;
    description?: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    customHeadScripts?: string;
}

export async function getSeoMetaByPath(path: string): Promise<SeoMetaData | null> {
    try {
        const res = await fetch(`/api/seo?path=${encodeURIComponent(path)}`, {
            credentials: "same-origin",
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data ?? null;
    } catch {
        return null;
    }
}
