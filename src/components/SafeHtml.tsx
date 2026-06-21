/**
 * C10: Client-side defense-in-depth for admin-supplied rich text.
 *
 * Mirrors the server-side allowlist sanitizer in
 * apps/api/utils/htmlSanitizer.js. Strips the same XSS vectors
 * before passing the result to dangerouslySetInnerHTML.
 *
 * Use this anywhere the app renders content that was authored by
 * an admin in a Quill/HTML editor (blog post body, legal pages,
 * CMS sections, job description, etc.).
 */
import React from 'react';

const SCRIPT_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const STYLE_RE = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
const IFRAME_RE = /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi;
const OBJECT_RE = /<object\b[^>]*>[\s\S]*?<\/object>/gi;
const EMBED_RE = /<embed\b[^>]*>/gi;
const FORM_RE = /<form\b[^>]*>[\s\S]*?<\/form>/gi;
const HTML_COMMENT_RE = /<!--([\s\S]*?)-->/g;
const ON_EVENT_RE = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URL_RE = /\s+(?:href|src|xlink:href)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi;
const DATA_URL_RE = /\s+(?:href|src)\s*=\s*(?:"\s*data:(?!image\/(?:png|jpe?g|gif|webp);)[^"]*"|'\s*data:(?!image\/(?:png|jpe?g|gif|webp);)[^']*')/gi;
const VB_URL_RE = /\s+(?:href|src)\s*=\s*(?:"\s*vbscript:[^"]*"|'\s*vbscript:[^']*'|vbscript:[^\s>]+)/gi;

export function sanitizeHtmlClient(input: string | null | undefined): string {
    if (input == null) return '';
    let s = String(input);
    s = s.replace(SCRIPT_RE, '');
    s = s.replace(STYLE_RE, '');
    s = s.replace(IFRAME_RE, '');
    s = s.replace(OBJECT_RE, '');
    s = s.replace(EMBED_RE, '');
    s = s.replace(FORM_RE, '');
    s = s.replace(HTML_COMMENT_RE, '');
    s = s.replace(ON_EVENT_RE, '');
    s = s.replace(JS_URL_RE, '');
    s = s.replace(VB_URL_RE, '');
    s = s.replace(DATA_URL_RE, '');
    return s;
}

type SafeHtmlProps = {
    html: string | null | undefined;
    className?: string;
};

/**
 * Drop-in replacement for `dangerouslySetInnerHTML` on admin-authored
 * rich text. Sanitizes the HTML on the client before rendering.
 */
export const SafeHtml: React.FC<SafeHtmlProps> = ({ html, className }) => {
    const clean = sanitizeHtmlClient(html);
    return (
        <div
            className={className}
            // The string has been stripped of script/iframe/event-handler vectors.
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: clean }}
        />
    );
};

export default SafeHtml;
