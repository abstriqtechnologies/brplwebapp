"use client";
import React, { useState } from 'react';
import { SafeHtml } from './SafeHtml';

interface MissionVisionSectionProps {
    missionTitle?: string;
    missionDescription?: string;
    missionImage?: string;
    visionTitle?: string;
    visionDescription?: string;
    visionImage?: string;
}

const MissionVisionSection: React.FC<MissionVisionSectionProps> = ({
    missionTitle, missionDescription, missionImage,
    visionTitle, visionDescription, visionImage
}) => {
    const [activeTab, setActiveTab] = useState<'mission' | 'vision'>('mission');

    return (
        <section className="bg-[#0a102e] text-white py-16 md:py-24">
            <div className="container mx-auto px-4">
                <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">

                    {/* Left Column: Content */}
                    <div className="w-full lg:w-1/2 space-y-8">

                        {/* Tabs */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => setActiveTab('mission')}
                                className={`px-8 py-3 rounded-full border transition-all duration-300 text-lg font-medium ${activeTab === 'mission'
                                    ? 'bg-white text-[#0a102e] border-white'
                                    : 'bg-transparent text-white border-white/30 hover:border-white'
                                    }`}
                            >
                                {missionTitle || "Our Mission"}
                            </button>
                            <button
                                onClick={() => setActiveTab('vision')}
                                className={`px-8 py-3 rounded-full border transition-all duration-300 text-lg font-medium ${activeTab === 'vision'
                                    ? 'bg-white text-[#0a102e] border-white'
                                    : 'bg-transparent text-white border-white/30 hover:border-white'
                                    }`}
                            >
                                {visionTitle || "Our Vision"}
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="space-y-6">
                            <h2 className="text-4xl md:text-5xl font-bold font-oswald tracking-wide">
                                {activeTab === 'mission' ? (missionTitle || 'Our Mission') : (visionTitle || 'Our Vision')}
                            </h2>

                            {activeTab === 'mission' ? (
                                <div className="space-y-6 text-gray-300 text-lg leading-relaxed font-sans">
                                    {missionDescription ? (
                                        <SafeHtml html={missionDescription} className="prose max-w-none text-gray-300 text-lg leading-relaxed dark:prose-invert" />
                                    ) : (
                                        <>
                                            <p>
                                                For way too long, cricket has been a game for the privileged. Access to coaching, exposure, and opportunity usually decide who gets to play at the national level. At BRPL, our mission is to empower cricket players at the grassroots level and create an inclusive ecosystem.
                                            </p>
                                            <p>
                                                We believe that no matter their background, every aspiring cricketer deserves a platform to shine. Our team will interact with local communities, encourage youth participation, and connect with them through local digital creators. To ensure widespread participation, we will conduct nationwide trials and discover the next generation of India's cricket stars. We promise to treat every participant fairly and provide them with equal opportunities and long-term growth.
                                            </p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6 text-gray-300 text-lg leading-relaxed font-sans">
                                    {visionDescription ? (
                                        <SafeHtml html={visionDescription} className="prose max-w-none text-gray-300 text-lg leading-relaxed dark:prose-invert" />
                                    ) : (
                                        <>
                                            <p>
                                                "If they can dream it, they can achieve it." This belief lies at the heart of the Beyond Reach Premier League (BRPL). Our vision is to make BRPL the most inclusive and sustainable <b className="font-bold text-white">T10 tennis ball cricket league</b> platform in India.
                                            </p>
                                            <p>
                                                From a child playing in a village field, a youngster practicing under streetlights, to communities that live and breathe cricket, we want everyone to feel that this league belongs to them. By giving a professional platform to the underprivileged, we aim to revolutionize cricket at the grassroots. We want to see cricket thrive in local communities, schools, and small towns.
                                            </p>
                                            <p>
                                                Our team will continuously work on improving the format and introduce exciting rules to keep the league exciting to watch. This will ensure that every season brings something new for both players and fans. Ultimately, we want BRPL to become a movement that unites India through the love of cricket.
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Image */}
                    <div className="w-full lg:w-1/2">
                        <div className="relative rounded-tr-[80px] rounded-bl-[80px] overflow-hidden border border-[#D4AF37]">
                            <img
                                src={activeTab === 'mission' ? (missionImage || "/about-2.jpg") : (visionImage || "/vision.jpg")}
                                alt="Target and Mission"
                                className="w-full h-auto object-cover"
                                loading="lazy"
                                decoding="async"
                            />
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default MissionVisionSection;
