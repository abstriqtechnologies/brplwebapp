import PageBanner from "@/components/PageBanner";
import AboutSection from "@/components/AboutSection";
import MissionVisionSection from "@/components/MissionVisionSection";
import MeetOurTeamSection from "@/components/MeetOurTeamSection";
import SEO from "@/components/SEO";
import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";
import { getImageUrl } from "@/utils/imageHelper";

export const dynamic = "force-dynamic";

export default async function AboutUs() {
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <div className="min-h-screen bg-gray-50">
                <SEO
                    title="About Us"
                    description="Learn about Beyond Reach Premier League's mission, vision, and the team driving the future of cricket content creation."
                />
                <PageBanner
                    pageKey="aboutUs"
                    title="About us"
                    currentPage="About us"
                    scrollToId="about-content"
                />

                <div id="about-content">
                    <AboutSection />
                </div>
                <div>
                    <MissionVisionSection />
                </div>
                <div>
                    <MeetOurTeamSection />
                </div>
            </div>
        </SiteContextProvider>
    );
}
