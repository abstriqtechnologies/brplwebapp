import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import CareerClient from "./CareerClient";

export const dynamic = "force-dynamic";

export default async function Career() {
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <CareerClient />
        </SiteContextProvider>
    );
}
