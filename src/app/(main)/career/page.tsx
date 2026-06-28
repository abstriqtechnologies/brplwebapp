import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { DynamicPageRenderer } from "@/components/admin/page-editor/DynamicPageRenderer";
import CareerClient from "./CareerClient";

export const dynamic = "force-dynamic";

export default async function Career() {
    const ctx = await getSiteContext();
    const pageData = ctx.pages["career"] as any;
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
            <CareerClient />
        </SiteContextProvider>
    );
}
