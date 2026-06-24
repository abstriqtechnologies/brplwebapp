import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/session";
import DashboardClient from "./DashboardClient";
import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const session = await getAuthSession();
    if (!session) redirect("/login?next=/dashboard");
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <DashboardClient />
        </SiteContextProvider>
    );
}
