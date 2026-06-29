"use client";
import React from "react";
import { MoveRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/utils/imageHelper";
import { SafeHtml } from "./SafeHtml";
import { useHomeCms } from "@/components/SiteContextProvider";

type HeadingLevel = "h1" | "h2" | "h3";

interface WhoWeAreData {
    title: string;
    titleHeadingLevel?: HeadingLevel;
    /** Hex color for main title (e.g. #000000). When set, entire heading uses this color. */
    titleColor?: string;
    subtitle: string;
    tagline?: string;
    description: string;
    image: string;
    videoUrl?: string;
}

const DEFAULT_WHO_WE_ARE: WhoWeAreData = {
    title: "Brpl",
    titleHeadingLevel: "h1",
    subtitle: "India's Grassroots T10 Cricket League",
    tagline: "\"Brpl – Bharat ki League, Bharatiyon ka Sapna\"",
    description: `<p class="text-gray-400 leading-relaxed mb-4">
                            <span class="text-white font-semibold">Brpl (Brpl)</span> is India's premier <span class="text-white font-semibold">T10 tennis-ball cricket league</span>, built to give every aspiring cricketer — regardless of city, background, or contacts — a fair, structured pathway to professional cricket. Through nationwide <span class="text-white font-semibold">cricket trials</span> and open <span class="text-white font-semibold">player registration</span> across five zones, Brpl is rewriting how talent is discovered in Indian cricket.
                        </p>
                        <p class="text-gray-400 leading-relaxed mb-4">
                            What makes Brpl different is its commitment to <span class="text-white font-semibold">grassroots access</span>. Whether you're playing gully cricket in a small town or representing your district side, Brpl's zonal trials are designed to surface raw talent that conventional scouting overlooks. Selected players join franchise teams, compete in a fast-paced T10 format, and gain real exposure to scouts, mentors, and live broadcasts.
                        </p>
                        <p class="text-gray-400 leading-relaxed">
                            Player benefits include <span class="text-white font-semibold">professional coaching, performance tracking, prize money, and scouting exposure</span> — a genuine shot at a long-term cricketing career. Every selected player represents their zone, wears their colours, and plays for a chance to inspire the next generation back home.
                        </p>`,
    image: "/home2.webp",
};

const WhoWeAre = () => {
    const home = useHomeCms();
    const cmsWho = home?.whoWeAre;

    // Map CMS whoWeAre to render shape.
    // CMS shape: { title?, subtitle?, body?, image?, points? }
    // Render shape: { title, titleHeadingLevel, titleColor, subtitle, tagline, description (body), image, videoUrl }
    const data: WhoWeAreData =
        cmsWho && (cmsWho.title || cmsWho.subtitle || cmsWho.body || cmsWho.image)
            ? {
                  title: cmsWho.title || DEFAULT_WHO_WE_ARE.title,
                  titleHeadingLevel: (cmsWho.titleHeadingLevel as HeadingLevel) || DEFAULT_WHO_WE_ARE.titleHeadingLevel,
                  titleColor: cmsWho.titleColor || DEFAULT_WHO_WE_ARE.titleColor,
                  subtitle: cmsWho.subtitle || DEFAULT_WHO_WE_ARE.subtitle,
                  tagline: cmsWho.tagline || DEFAULT_WHO_WE_ARE.tagline,
                  description: cmsWho.body || DEFAULT_WHO_WE_ARE.description,
                  image: cmsWho.image || DEFAULT_WHO_WE_ARE.image,
                  videoUrl: cmsWho.videoUrl || DEFAULT_WHO_WE_ARE.videoUrl,
              }
            : DEFAULT_WHO_WE_ARE;

    return (
        <section className="w-full py-16 md:py-24 bg-[#020617] text-white overflow-hidden relative">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]" />
                <div className="absolute top-[30%] -right-[10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    {/* Content Side */}
                    <div className="flex flex-col gap-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 w-fit">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-amber-500 text-xs font-bold tracking-wider uppercase">
                                About The League
                            </span>
                        </div>

                        <div className="space-y-2">
                            {/* Main title: admin heading level + optional color. Subtitle: always yellow gradient. */}
                            {(() => {
                                const Tag = (data?.titleHeadingLevel && ["h1", "h2", "h3"].includes(data.titleHeadingLevel))
                                    ? data.titleHeadingLevel
                                    : "h1";
                                const useCustomColor = data?.titleColor && /^#[0-9A-Fa-f]{6}$/.test(data.titleColor);
                                return (
                                    <Tag className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight font-display">
                                        <span style={useCustomColor ? { color: data.titleColor } : undefined}>{data?.title}</span>
                                        <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 mb-5">
                                            {data?.subtitle}
                                        </span>
                                    </Tag>
                                );
                            })()}
                            {data?.tagline && (
                                <p className="text-lg text-white-300 leading-relaxed border-l-4 border-amber-500 pl-4 italic mt-4">
                                    {data.tagline}
                                </p>
                            )}
                        </div>

                        {/* Render Rich Text Description */}
                        <SafeHtml
                            html={data?.description || ""}
                            className="prose prose-invert max-w-none text-gray-400 prose-p:leading-relaxed prose-lg prose-blockquote:border-l-4 prose-blockquote:border-amber-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-300 prose-strong:text-white prose-strong:font-semibold text-white"
                        />

                        <div className="pt-4 flex flex-wrap gap-4">
                            <Link href="/login">
                                <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-full px-8 py-6 text-base shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all duration-300">
                                    Register for Trials
                                    <MoveRight className="ml-2 w-5 h-5" />
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Image/Visual Side */}
                    <div className="relative">
                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0f172a]">
                            <img
                                src={data?.image ? getImageUrl(data.image) : "/home2.webp"}
                                alt="About Brpl"
                                className="w-full h-full object-cover"
                            />

                            {/* Overlay Content */}
                            <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent">
                                <h3 className="text-white font-bold text-xl">Connecting India's Talent</h3>
                                <p className="text-gray-300 text-sm">Join the revolution today.</p>
                            </div>
                        </div>

                        {/* Floating Element */}
                        <div className="absolute -bottom-6 -right-6 bg-[#1e293b] p-4 rounded-xl border border-white/10 shadow-xl hidden md:block">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2h-6c-1.1 0-2 .49-2 1v10c0 .55.45 1 1 1h8c.55 0 1-.45 1-1V3c0-.51-.9-1-2-1Z" /></svg>
                                </div>
                                <div>
                                    <p className="text-white font-bold">Premier League</p>
                                    <p className="text-xs text-amber-500">Official Partner</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WhoWeAre;
