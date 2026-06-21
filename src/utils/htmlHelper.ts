/**
 * Decode HTML entities so that content stored as escaped (e.g. &lt;p&gt;) renders as HTML.
 * Order matters: &amp; must be replaced first.
 */
export function decodeHtmlEntities(html: string): string {
    if (!html || typeof html !== "string") return html;
    return html
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'");
}
