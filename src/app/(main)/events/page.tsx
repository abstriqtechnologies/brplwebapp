import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import EventsClient from "./EventsClient";

export const dynamic = "force-dynamic";

export default async function Events() {
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <EventsClient />
        </SiteContextProvider>
    );
}
