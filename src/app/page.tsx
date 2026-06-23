import dynamic from "next/dynamic";
import Banner from "@/components/Banner";
import SEO from "@/components/SEO";

// Below-the-fold sections - lazy loaded for faster initial render
const WhoWeAre = dynamic(() => import("@/components/WhoWeAre"));
const EventGallerySlider = dynamic(() => import("@/components/EventGallerySlider"));
const AmbassadorsSection = dynamic(() => import("@/components/AmbassadorsSection"));
const Teams = dynamic(() => import("@/components/Teams"));
const BroadcastingPartners = dynamic(() => import("@/components/BroadcastingPartners"));

const Index = () => {
  return (
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
  );
};

export default Index;
