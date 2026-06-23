
import React from 'react';
import { SafeHtml } from './SafeHtml';

interface AboutSectionProps {
    imageSrc?: string;
    title?: string;
    description?: string;
}

const AboutSection: React.FC<AboutSectionProps> = ({ imageSrc, title, description }) => {
    return (
        <section className="container mx-auto px-4 py-16 md:py-24 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">

                {/* Left Column: Overlapping Images */}
                {/* Left Column: Single Image */}
                <div className="w-full lg:w-1/2 flex justify-center lg:justify-end pr-0 lg:pr-10">
                    <div className="relative w-full">
                        <img
                            src={imageSrc || "/trophy image.webp"}
                            alt="Cricket Action"
                            className="w-full h-[700px] object-cover rounded-xl"
                            loading="lazy"
                            decoding="async"
                        />
                    </div>
                </div>

                {/* Right Column: Text Content */}
                <div className="w-full lg:w-1/2 space-y-6">
                    <h2 className="text-4xl md:text-5xl font-bold text-[#111a45] font-oswald tracking-tight">
                        {title || "About BRPL"}
                    </h2>

                    <div className="space-y-4 text-gray-600 text-lg leading-relaxed">
                        {description ? (
                            <SafeHtml html={description} className="prose max-w-none text-gray-600 text-lg leading-relaxed" />
                        ) : (
                            <>
                                <p>
                                    What comes to mind when you think about cricket? It's usually high-stakes matches, world-class players, big stadiums, etc. The cricket dream has become so big, it seems unachievable by the common man. But if one has the passion and the skill, why shouldn't they have a platform?
                                </p>

                                <p>
                                    This is what we want to change with the <span className="font-bold text-black">Beyond Reach Premier League (BRPL)</span>. We bring you a fresh <b className="font-bold text-black">T10 tennis ball cricket league</b> format league that will transform how cricket is played and experienced. With nationwide trials in place, expect to see raw talent from every corner of the country. Guided by the vision "Bharat ki League, Bhartiyo ka Sapna," we have a strong focus on inclusivity, community, sustainability, and, of course, the entertainment factor.
                                </p>

                                <p>
                                    Our management team has experience in major tournaments like <span className="font-bold text-black">the IPL</span> and the <span className="font-bold text-black">ICC World Cup</span>, and they will leave no stone unturned to make BRPL the biggest cricket event in the country. So when it comes to us, expect the unexpected. With six talented teams, thrilling <span className="font-bold text-black">double-header matches</span>, and unique <span className="font-bold text-black">X-Factor Rules</span>, you are in for a treat.
                                </p>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </section>
    );
};

export default AboutSection;
