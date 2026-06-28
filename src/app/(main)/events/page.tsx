import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { DynamicPageRenderer } from "@/components/admin/page-editor/DynamicPageRenderer";
import EventsClient from "./EventsClient";

export const dynamic = "force-dynamic";

export default async function Events() {
    const ctx = await getSiteContext();
    const pageData = ctx.pages["events-page"] as any;
    const sections = pageData?.sections || [];

    if (sections.length > 0) {
        return (
            <SiteContextProvider value={ctx}>
                <DynamicPageRenderer sections={sections} />
            </SiteContextProvider>
        );
    }

    return (
        <SiteContextProvider value={ctx}>
            <EventsClient />
        </SiteContextProvider>
    );
}
