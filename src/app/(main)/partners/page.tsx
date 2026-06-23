import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import BecomePartnerClient from "./BecomePartnerClient";

export const dynamic = "force-dynamic";

export default async function BecomePartner() {
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <BecomePartnerClient />
        </SiteContextProvider>
    );
}
