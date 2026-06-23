import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import ThankYouClient from "./ThankYouClient";

export const dynamic = "force-dynamic";

export default async function ThankYouPage() {
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <ThankYouClient />
        </SiteContextProvider>
    );
}