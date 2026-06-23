"use client";

import { HelmetProvider } from "react-helmet-async";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import type { SiteContext } from "@/lib/siteContext";
import type { ReactNode } from "react";

/**
 * Top-level client providers. The server layout fetches `siteContext`
 * and passes it in; this component distributes it via React context.
 */
export default function RootProviders({
    siteContext,
    children,
}: {
    siteContext: SiteContext;
    children: ReactNode;
}) {
    return (
        <SiteContextProvider value={siteContext}>
            <HelmetProvider>{children}</HelmetProvider>
        </SiteContextProvider>
    );
}
