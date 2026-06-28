import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { DynamicPageRenderer } from "@/components/admin/page-editor/DynamicPageRenderer";
import TeamsClient from "./TeamsClient";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
    const ctx = await getSiteContext();
    const pageData = ctx.pages["teams"] as any;
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
            <TeamsClient />
        </SiteContextProvider>
    );
}
