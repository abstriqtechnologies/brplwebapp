"use client";
import { Helmet } from "react-helmet-async";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export const SITE_NAME = "Beyond Reach Premier League";
export const SITE_URL = typeof window !== "undefined" ? window.location.origin : "";

/** Static path segment to breadcrumb label */
export const PATH_TO_LABEL: Record<string, string> = {
    "/": "Home",
    "/about-us": "About Us",
    "/teams": "Teams",
    "/events": "Events",
    "/blog": "Blog",
    "/news": "News",
    "/career": "Career",
    "/partners": "Partners",
    "/types-of-partners": "Types of Partners",
    "/faqs": "FAQs",
    "/registration": "Registration",
    "/contact-us": "Contact Us",
    "/privacy-policy": "Privacy Policy",
    "/terms-and-conditions": "Terms & Conditions",
    "/login": "Login",
    "/auth": "Login",
};

export function buildBreadcrumbSchema(pathname: string, currentPageName?: string) {
    const segments = pathname.split("/").filter(Boolean);
    const homeUrl = SITE_URL || "https://brpl.net";
    const itemListElement: Array<{ "@type": string; position: number; name: string; item?: string }> = [
        { "@type": "ListItem", position: 1, name: "Home", item: `${homeUrl}/` },
    ];

    let acc = "";
    for (let i = 0; i < segments.length; i++) {
        acc += "/" + segments[i];
        const isLast = i === segments.length - 1;
        const label = PATH_TO_LABEL[acc] ?? segments[i].replace(/-/g, " ");
        const name = isLast && currentPageName ? currentPageName : (label.charAt(0).toUpperCase() + label.slice(1));
        const itemUrl = `${homeUrl}${acc}`;
        itemListElement.push({
            "@type": "ListItem",
            position: i + 2,
            name,
            ...(isLast ? {} : { item: itemUrl }),
        });
    }

    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement,
    };
}

interface SchemaMarkupProps {
    /** When true, only render Organization (e.g. in layout). When false, render Organization + Breadcrumb. */
    organizationOnly?: boolean;
    /** Current pathname for breadcrumb (used when organizationOnly is false) */
    pathname?: string;
    /** Name of the current page when path is dynamic (e.g. blog post title) */
    currentPageName?: string;
    /** When true, skip rendering (e.g. admin pages) */
    skip?: boolean;
}

/**
 * Renders Organization schema (site-wide). Optionally BreadcrumbList (page-wise).
 * Use in PublicLayout with organizationOnly for Org on every page; use in pages or SEO for Breadcrumb.
 */
export function SchemaMarkup({ organizationOnly, pathname, currentPageName, skip }: SchemaMarkupProps) {
    const { settings } = useSiteSettings();

    if (skip) return null;

    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/logo.webp`,
        contactPoint: {
            "@type": "ContactPoint",
            telephone: settings.contactPhone || "",
            email: settings.contactEmail || "",
            contactType: "customer service",
            areaServed: "IN",
        },
        address: settings.contactAddress
            ? {
                  "@type": "PostalAddress",
                  streetAddress: settings.contactAddress,
                  addressCountry: "IN",
              }
            : undefined,
    };

    const sportsEventSchema = {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        name: SITE_NAME,
        description: "A premier hard tennis ball cricket league giving grassroot players an opportunity to showcase their talent on a national stage.",
        startDate: "2024-06-01T09:00",
        endDate: "2025-12-31T18:00",
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
            "@type": "Place",
            name: "Various Cities Across India",
            address: {
                "@type": "PostalAddress",
                addressCountry: "IN"
            }
        },
        organizer: {
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL
        }
    };

    if (organizationOnly) {
        return (
            <Helmet>
                <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
                <script type="application/ld+json">{JSON.stringify(sportsEventSchema)}</script>
            </Helmet>
        );
    }

    const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/");
    const breadcrumb = buildBreadcrumbSchema(path, currentPageName);

    return (
        <Helmet>
            <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
            <script type="application/ld+json">{JSON.stringify(sportsEventSchema)}</script>
            <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        </Helmet>
    );
}

export default SchemaMarkup;
