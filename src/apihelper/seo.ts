/**
 * Static build stub for SEO meta fetching.
 * Returns null/empty so the SEO component uses its default props.
 */

interface SeoMeta {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  customBodyScripts?: string;
}

export async function getSeoMetaByPath(_path: string): Promise<SeoMeta | null> {
  return null;
}
