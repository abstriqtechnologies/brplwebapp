import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import BlogPostClient from "./BlogPostClient";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
    const ctx = await getSiteContext();
    const { slug } = params;
    return (
        <SiteContextProvider value={ctx}>
            <BlogPostClient slug={slug} />
        </SiteContextProvider>
    );
}
