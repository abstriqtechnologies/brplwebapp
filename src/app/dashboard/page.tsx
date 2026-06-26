import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/session";
import { staleJwtRedirect } from "@/lib/auth/stale-jwt";
import DashboardClient from "./DashboardClient";
import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const session = await getAuthSession();
    if (!session) {
        // Stale JWT — redirect to /login. Middleware will clear the cookie
        // on the next request (see src/lib/auth/stale-jwt.ts for rationale).
        await staleJwtRedirect("/dashboard");
        return null; // unreachable
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
