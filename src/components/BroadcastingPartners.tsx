"use client";

import React, { useState } from "react";

const LINEAR_TV_PARTNERS = [
  { name: "DD Sports", logo: "dd-image.png" }, /* Sports18 blue match */
  { name: "Sony Sports Network", logo: "sony-image.jfif" }, /* Matches black gradient edges */
  { name: "Star Sports", logo: "star-sports.jfif" },
];

const OTT_PARTNERS = [
  { name: "JioHotstar", logo: "jio-hotstar-image.png" }, /* Matches JioHotstar blue/pink */
  { name: "SonyLIV", logo: "sonylive-images.jfif" }, /* Matches SonyLIV black background */
  { name: "FanCode", logo: "fancode-image.png" }, /* Exact FanCode orange */
];

function PartnerLogo({ name, logo }: { name: string; logo: string }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="flex items-center justify-center rounded-lg overflow-hidden h-20 w-32 sm:h-24 sm:w-40 md:h-28 md:w-44 shrink-0 transition-transform hover:scale-105 duration-300"
    >
      {!imgError ? (
        <img
          src={logo}
          alt={name}
          className="h-full w-full object-contain p-2"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-white text-center text-xs sm:text-sm font-semibold px-2 py-1 line-clamp-2">
          {name}
        </span>
      )}
    </div>
  );
}

const BroadcastingPartners: React.FC = () => {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Background image - same pattern as Teams / Ambassadors */}
      <div className="relative py-10 md:py-12 lg:py-16 px-4 md:px-8 lg:px-12">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/fixture.png')" }}
        />
        <div className="absolute inset-0 bg-[#020617]/85" />

        <div className="relative max-w-6xl mx-auto flex flex-col items-center" data-aos="fade-up">
          {/* Section title - same format as BRPL Teams / Ambassadors */}
          <h2
            className="text-center text-[#FFD700] text-3xl md:text-4xl lg:text-[40px] font-extrabold tracking-[0.05em] mb-2 md:mb-3"
            style={{ fontFamily: "'Rye', serif" }}
          >
            Proposed Broadcasting Partners
          </h2>
          <div className="h-1 w-24 bg-[#FFC928] rounded-full mb-4" />
          <p className="text-center text-amber-500 font-bold uppercase tracking-wider text-sm md:text-base mb-10 md:mb-12 italic">
            Bharat ki League, Bharatiyon ka Sapna
          </p>

          {/* Grid: one row, two columns - Linear TV | OTT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 w-full">
            {/* Column 1: Linear TV - highlighted + animated */}
            <div className="flex flex-col items-center">
              <h3 className="animate-broadcast-title inline-block px-5 py-2.5 rounded-lg bg-amber-500/25 border-2 border-amber-400/60 text-[#FFD700] text-xl md:text-2xl font-bold mb-6 tracking-wide shadow-lg">
                Linear TV
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                {LINEAR_TV_PARTNERS.map((partner) => (
                  <PartnerLogo
                    key={partner.name}
                    name={partner.name}
                    logo={partner.logo}
                  />
                ))}
              </div>
            </div>

            {/* Column 2: OTT - highlighted + animated */}
            <div className="flex flex-col items-center">
              <h3 className="animate-broadcast-title inline-block px-5 py-2.5 rounded-lg bg-amber-500/25 border-2 border-amber-400/60 text-[#FFD700] text-xl md:text-2xl font-bold mb-6 tracking-wide shadow-lg">
                OTT
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                {OTT_PARTNERS.map((partner) => (
                  <PartnerLogo
                    key={partner.name}
                    name={partner.name}
                    logo={partner.logo}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BroadcastingPartners;
