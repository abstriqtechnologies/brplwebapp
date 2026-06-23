"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SiteContext } from "@/lib/siteContext";

const SiteContextValue = createContext<SiteContext | null>(null);

export function SiteContextProvider({
    value,
    children,
}: {
    value: SiteContext;
    children: ReactNode;
}) {
    return <SiteContextValue.Provider value={value}>{children}</SiteContextValue.Provider>;
}

export function useSiteContext(): SiteContext {
    const ctx = useContext(SiteContextValue);
    if (!ctx) {
        throw new Error("useSiteContext must be used inside <SiteContextProvider>");
    }
    return ctx;
}

// Convenience selectors
export function useSiteSettings() { return useSiteContext().siteSettings; }
export function useSocialLinks() { return useSiteContext().socialLinks; }
export function useNavLinks() { return useSiteContext().navLinks; }
export function useFooterLinks() { return useSiteContext().footerLinks; }
export function useHomeCms() { return useSiteContext().home; }
export function useAboutCms() { return useSiteContext().about; }
export function useRegistrationCms() { return useSiteContext().registration; }
export function useLegal() { return useSiteContext().legal; }
export function useSeoMap() { return useSiteContext().seo; }
export function usePageBanners() { return useSiteContext().pageBanners; }
export function useSitePages() { return useSiteContext().pages; }
export function useCollections() { return useSiteContext().collections; }
