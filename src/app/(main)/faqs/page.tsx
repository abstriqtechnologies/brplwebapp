import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import FAQsClient from "./FAQsClient";

export const dynamic = "force-dynamic";

export default async function FAQsPage() {
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <FAQsClient />
        </SiteContextProvider>
    );
}