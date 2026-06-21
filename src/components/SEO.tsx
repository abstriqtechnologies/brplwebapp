"use client";
import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useRef } from 'react';
import { getSeoMetaByPath } from '@/apihelper/seo';
import { buildBreadcrumbSchema } from '@/components/SchemaMarkup';

interface SEOProps {
    title: string;
    description: string;
    keywords?: string;
    image?: string;
    url?: string;
    /** Override the last breadcrumb item name (e.g. blog post title, news title) */
    breadcrumbCurrentName?: string;
}

const SEO = ({ title, description, keywords, image, url, breadcrumbCurrentName }: SEOProps) => {
    const siteTitle = 'Beyond Reach Premier League';

    const [dynamicTitle, setDynamicTitle] = useState(`${title} | ${siteTitle}`);
    const [dynamicDesc, setDynamicDesc] = useState(description);
    const [dynamicKeywords, setDynamicKeywords] = useState(keywords || '');
    const [ogTitle, setOgTitle] = useState<string | null>(null);
    const [ogDescription, setOgDescription] = useState<string | null>(null);
    const [ogImage, setOgImage] = useState<string | null>(null);
    const [customBodyScripts, setCustomBodyScripts] = useState<string>("");
    const injectedBodyRef = useRef<string>("");

    useEffect(() => {
        const fetchSEO = async () => {
            try {
                const path = window.location.pathname;
                const data = await getSeoMetaByPath(path);

                if (data && data.title) {
                    setDynamicTitle(data.title.includes(siteTitle) ? data.title : `${data.title} | ${siteTitle}`);
                    if (data.description) setDynamicDesc(data.description);
                    if (data.keywords) setDynamicKeywords(data.keywords);
                    setOgTitle(data.ogTitle?.trim() || null);
                    setOgDescription(data.ogDescription?.trim() || null);
                    setOgImage(data.ogImage?.trim() || null);
                    setCustomBodyScripts(data.customBodyScripts?.trim() || "");
                } else {
                    setDynamicTitle(`${title} | ${siteTitle}`);
                    setDynamicDesc(description);
                    setDynamicKeywords(keywords || '');
                    setOgTitle(null);
                    setOgDescription(null);
                    setOgImage(null);
                    setCustomBodyScripts("");
                }
            } catch {
                setDynamicTitle(`${title} | ${siteTitle}`);
                setDynamicDesc(description);
                setDynamicKeywords(keywords || '');
                setOgTitle(null);
                setOgDescription(null);
                setOgImage(null);
                setCustomBodyScripts("");
            }
        };

        fetchSEO();
    }, [title, description, keywords]);

    useEffect(() => {
        const raw = customBodyScripts;
        const DATA_ATTR = "data-custom-body-script"; // kept same name to avoid database field logic changes, but injects to head

        const existing = document.head.querySelectorAll(`[${DATA_ATTR}="true"]`);
        existing.forEach((el) => el.remove());
        injectedBodyRef.current = "";

        if (!raw) return;

        if (injectedBodyRef.current === raw) return;
        injectedBodyRef.current = raw;

        const container = document.createElement("div");
        container.innerHTML = raw;
        const scriptNodes = container.childNodes;
        const added: HTMLElement[] = [];

        scriptNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const oldEl = node as HTMLElement;
                if (oldEl.tagName.toLowerCase() === 'noscript') return;
                
                const newEl = document.createElement(oldEl.tagName);
                newEl.setAttribute(DATA_ATTR, "true");

                // Copy all attributes
                Array.from(oldEl.attributes).forEach((attr) => {
                    newEl.setAttribute(attr.name, attr.value);
                });

                newEl.innerHTML = oldEl.innerHTML;
                document.head.appendChild(newEl);
                added.push(newEl);
            }
        });

        return () => {
            added.forEach((el) => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            injectedBodyRef.current = "";
        };
    }, [customBodyScripts]);

    const defaultImage = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png';
    const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const breadcrumbSchema = buildBreadcrumbSchema(pathname, breadcrumbCurrentName);

    const finalOgTitle = ogTitle ?? dynamicTitle;
    const finalOgDescription = ogDescription ?? dynamicDesc;
    const finalOgImage = ogImage ?? image ?? defaultImage;

    return (
        <Helmet>
            <title>{dynamicTitle}</title>
            <meta name="description" content={dynamicDesc} />
            {dynamicKeywords && <meta name="keywords" content={dynamicKeywords} />}
            <link rel="canonical" href={currentUrl} />

            <meta property="og:type" content="website" />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:title" content={finalOgTitle} />
            <meta property="og:description" content={finalOgDescription} />
            <meta property="og:image" content={finalOgImage.startsWith('http') ? finalOgImage : `${typeof window !== 'undefined' ? window.location.origin : ''}${finalOgImage}`} />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={currentUrl} />
            <meta name="twitter:title" content={finalOgTitle} />
            <meta name="twitter:description" content={finalOgDescription} />
            <meta name="twitter:image" content={finalOgImage.startsWith('http') ? finalOgImage : `${typeof window !== 'undefined' ? window.location.origin : ''}${finalOgImage}`} />

            <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        </Helmet>
    );
};

export default SEO;
