import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import TeamsClient from "./TeamsClient";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <TeamsClient />
        </SiteContextProvider>
    );
}
