import { Suspense } from "react";
import AuthClient from "./AuthClient";
import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";

export const dynamic = "force-dynamic";

export default async function AuthPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string; mode?: "register" | "login" }>;
}) {
    const ctx = await getSiteContext();
    const sp = await searchParams;
    return (
        <SiteContextProvider value={ctx}>
            <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
                <AuthClient next={sp.next || "/dashboard"} initialMode={sp.mode || "register"} />
            </Suspense>
        </SiteContextProvider>
    );
}
