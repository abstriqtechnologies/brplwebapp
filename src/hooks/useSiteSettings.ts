"use client";
import { useState, useEffect } from "react";

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
}

const defaultSettings: SiteSettings = {
    contactAddress: "Ground Floor, Suite G-01, Procapitus Business Park, D-247/4A, D Block, Sector 63, Noida, Uttar Pradesh 201309",
    contactPhone: "+(91) 81309 55866",
    contactPhoneSecondary: "+(91) 98215 63585",
    contactEmail: "info@brpl.net",
    whatsappNumber: "918130955866",
    mapEmbedUrl: "",
    socialLinks: [
        { name: "Facebook", url: "https://www.facebook.com/profile.php?id=61584782136820", image: "/facebook.png" },
        { name: "Twitter", url: "https://x.com/BRPLOfficial", image: "/twiter.png" },
        { name: "Instagram", url: "https://www.instagram.com/brpl.t10", image: "/instagram.png" },
    ],
    bannerImage: "",
    bannerTitles: {},
    teamsBannerImage: "",
    teamsVideoUrl: "https://brpl-public-uploads.s3.ap-south-1.amazonaws.com/teams-video.mp4",
    customHeadScripts: "",
    customBodyScripts: "",
};

/**
 * Static stub matching the original useSiteSettings API.
 * Returns the same default values the original provided when the API was unreachable.
 * No network calls in this static-only build.
 */
export function useSiteSettings() {
    const [settings] = useState<SiteSettings>(defaultSettings);
    const [loading] = useState(false);

    useEffect(() => {
        /* no-op: settings are static */
    }, []);

    return { settings, loading };
}
