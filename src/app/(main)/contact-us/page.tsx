import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import ContactUsClient from "./ContactUsClient";

export const dynamic = "force-dynamic";

export default async function ContactUs() {
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <ContactUsClient />
        </SiteContextProvider>
    );
}
