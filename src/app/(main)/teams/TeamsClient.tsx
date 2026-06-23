"use client";

import PageBanner from "@/components/PageBanner";
import SEO from "@/components/SEO";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { getImageUrl } from "@/utils/imageHelper";

const TeamsClient = () => {
    const { settings } = useSiteSettings();
    const [teams] = useState<any[]>([]);
    const [isLoading] = useState(false);

    const teamsVideoSrc = settings.teamsVideoUrl?.trim() || undefined;
    const teamsImageSrc = settings.teamsBannerImage
        ? (settings.teamsBannerImage.startsWith("http")
            ? settings.teamsBannerImage
            : settings.teamsBannerImage.startsWith("uploads/")
                ? getImageUrl(settings.teamsBannerImage)
                : settings.teamsBannerImage.startsWith("/")
                    ? settings.teamsBannerImage
                    : getImageUrl(settings.teamsBannerImage))
        : undefined;

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO
                title="Our Teams"
                description="Meet the teams competing in the Beyond Reach Premier League. Passion, skill, and dedication on full display."
            />
            <PageBanner
                pageKey="teams"
                title="Teams"
                currentPage="Teams"
                videoSrc={teamsVideoSrc}
                imageSrc={!teamsVideoSrc ? teamsImageSrc : undefined}
                scrollToId="teams-content"
            />

            <section id="teams-content" className="container mx-auto px-4 py-16">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-10 w-10 animate-spin text-[#111a45]" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-y-12 gap-x-8 justify-items-center">
                        {teams.map((team) => (
                            <div key={team._id} className="flex flex-col items-center group cursor-pointer">
                                <div className="relative h-56 w-56 sm:h-64 sm:w-64 md:h-72 md:w-72 lg:h-80 lg:w-80 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(255,165,0,0.6)] rounded-full">
                                    {/* Rotating Gradient Border - Always Visible */}
                                    <div
                                        className="absolute -inset-1 rounded-full animate-spin-slow"
                                        style={{
                                            background: `conic-gradient(from 0deg, #111a45, #ffa500, #111a45)`,
                                        }}
                                    />

                                    {/* White Background Circle */}
                                    <div className="absolute inset-0 bg-white rounded-full flex items-center justify-center overflow-hidden">
                                        <img
                                            src={team.logo}
                                            alt={team.name}
                                            className="h-44 w-44 sm:h-48 sm:w-48 md:h-56 md:h-56 lg:h-60 lg:w-60 object-contain p-2"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    </div>
                                </div>
                                <p className="mt-4 text-sm sm:text-base md:text-lg font-extrabold text-[#111a45] text-center px-2 group-hover:text-amber-500 transition-colors duration-300">
                                    {team.name}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default TeamsClient;
