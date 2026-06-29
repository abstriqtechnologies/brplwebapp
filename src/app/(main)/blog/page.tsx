import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import BlogClient from "./BlogClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
    const ctx = await getSiteContext();
    const s = ctx.siteSettings;
    return {
        title: "Blog & News",
        description: s.homeSeoDescription || "Latest news and articles from Brpl (Brpl).",
    };
}

export default async function Blog() {
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <BlogClient />
        </SiteContextProvider>
    );
}
