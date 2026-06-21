import EventGallerySlider from "@/components/EventGallerySlider";
import Teams from "@/components/Teams";
import Banner from "@/components/Banner";
import SEO from "@/components/SEO";
import AmbassadorsSection from "@/components/AmbassadorsSection";
import { ScamAwarenessModal } from "@/components/ScamAwarenessModal";
import BroadcastingPartners from "@/components/BroadcastingPartners";

import WhoWeAre from "@/components/WhoWeAre";

const Index = () => {
  return (
    <div className="min-h-screen bg-transparent relative flex flex-col font-sans">
      <ScamAwarenessModal />
      <SEO
        title="India's T10 Cricket League"
        description="BRPL is India's grassroots T10 tennis-ball cricket league. Open cricket trials and player registration across all zones — your pathway to professional cricket starts here."
        keywords="T10 cricket league in India, cricket trials, player registration, tennis ball cricket league, BRPL, grassroots cricket India, Beyond Reach Premier League"
      />
      {/* Hero Section */}
      <Banner />

      {/* Who We Are Section */}
      <WhoWeAre />

      {/* Event Gallery Slider (Formerly Points Table) */}
      <EventGallerySlider />

      {/* Ambassadors Section */}
      <AmbassadorsSection />

      {/* Teams Section */}
      <Teams />

      {/* Proposed Broadcasting Partners */}
      <BroadcastingPartners />
    </div>
  );
};

export default Index;
