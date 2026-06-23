import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import PressClient from "./PressClient";

export const dynamic = "force-dynamic";

export default async function Press({ params }: { params: { id: string } }) {
    const ctx = await getSiteContext();
    const { id } = params;
    return (
        <SiteContextProvider value={ctx}>
            <PressClient id={id} />
        </SiteContextProvider>
    );
}
