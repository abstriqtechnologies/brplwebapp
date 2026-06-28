import nextDynamic from "next/dynamic";
import Banner from "@/components/Banner";
import SEO from "@/components/SEO";
import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { DynamicPageRenderer } from "@/components/admin/page-editor/DynamicPageRenderer";

export const dynamic = "force-dynamic";

// Below-the-fold sections - lazy loaded for faster initial render
const WhoWeAre = nextDynamic(() => import("@/components/WhoWeAre"));
const EventGallerySlider = nextDynamic(() => import("@/components/EventGallerySlider"));
const AmbassadorsSection = nextDynamic(() => import("@/components/AmbassadorsSection"));
const Teams = nextDynamic(() => import("@/components/Teams"));
const BroadcastingPartners = nextDynamic(() => import("@/components/BroadcastingPartners"));

export default async function Index() {
    const ctx = await getSiteContext();
    const pageData = ctx.pages["home"] as any;
    const sections = pageData?.sections || [];

    if (sections.length > 0) {
        return (
            <SiteContextProvider value={ctx}>
                <SEO
                    title="India's T10 Cricket League"
                    description="BRPL is India's grassroots T10 tennis-ball cricket league."
                    keywords="T10 cricket league in India, cricket trials, player registration, tennis ball cricket league, BRPL, grassroots cricket India, Beyond Reach Premier League"
                />
                <DynamicPageRenderer sections={sections} />
            </SiteContextProvider>
        );
    }

    return (
        <SiteContextProvider value={ctx}>
            <div className="min-h-screen bg-transparent relative flex flex-col font-sans">
                <SEO
                    title="India's T10 Cricket League"
                    description="BRPL is India's grassroots T10 tennis-ball cricket league. Open cricket trials and player registration across all zones — your pathway to professional cricket starts here."
                    keywords="T10 cricket league in India, cricket trials, player registration, tennis ball cricket league, BRPL, grassroots cricket India, Beyond Reach Premier League"
                />
                {/* Hero Section - NOT lazy (LCP) */}
                <Banner />

                {/* Below-the-fold - lazy */}
                <WhoWeAre />
                <EventGallerySlider />
                <AmbassadorsSection />
                <Teams />
                <BroadcastingPartners />
            </div>
        </SiteContextProvider>
    );
}
