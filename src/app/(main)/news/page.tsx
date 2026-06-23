import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import NewsClient from "./NewsClient";

export const dynamic = "force-dynamic";

export default async function News() {
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <NewsClient />
        </SiteContextProvider>
    );
}
