import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthSession } from "@/lib/session";
import { staleJwtRedirect } from "@/lib/auth/stale-jwt";
import DashboardClient from "./DashboardClient";
import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const session = await getAuthSession();
    if (!session) {
        // Stale JWT — clear cookie before redirecting.
        await staleJwtRedirect(await cookies(), "/dashboard");
    }
    // Defense in depth: middleware also checks the JWT `paid` claim, but
    // that can be stale (admin manually revoked payment, JWT issued
    // before payment completed, etc.). Always re-read from DB.
    if (session.paymentStatus !== "completed") {
        redirect("/checkout?next=/dashboard");
    }
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <DashboardClient />
        </SiteContextProvider>
    );
}
