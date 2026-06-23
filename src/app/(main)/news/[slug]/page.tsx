import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import NewsPostClient from "./NewsPostClient";

export const dynamic = "force-dynamic";

export default async function NewsPostPage({ params }: { params: { slug: string } }) {
    const ctx = await getSiteContext();
    const { slug } = params;
    return (
        <SiteContextProvider value={ctx}>
            <NewsPostClient slug={slug} />
        </SiteContextProvider>
    );
}
