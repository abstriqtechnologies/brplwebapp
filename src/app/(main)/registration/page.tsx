import { redirect } from "next/navigation";
import { getSiteContext } from "@/lib/siteContext";

export const dynamic = "force-dynamic";

export default async function RegistrationPage() {
    // Trigger site-context fetch so downstream navigation/caching can revalidate.
    await getSiteContext();
    redirect("/auth");
}