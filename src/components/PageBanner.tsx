"use client";
import React from "react";
import Link from "next/link";
import { Home, ChevronDown } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { getImageUrl } from "@/utils/imageHelper";

interface PageBannerProps {
    title: string;
    currentPage: string;
    videoSrc?: string;
    imageSrc?: string;
    scrollToId?: string;
    /** Page key for dynamic title from admin (e.g. contactUs, aboutUs). If set and admin has a title for this key, it overrides `title`. */
    pageKey?: string;
}

const PageBanner: React.FC<PageBannerProps> = ({ title, currentPage, videoSrc, imageSrc, scrollToId, pageKey }) => {
    const { settings } = useSiteSettings();
    const displayTitle = pageKey && settings.bannerTitles[pageKey]?.trim() ? settings.bannerTitles[pageKey] : title;
    const resolveBannerImage = () => {
        if (imageSrc) return imageSrc;
        if (!settings.bannerImage) return "/tenis.png";
        if (settings.bannerImage.startsWith("http") || settings.bannerImage.startsWith("blob:")) return settings.bannerImage;
        if (settings.bannerImage.startsWith("uploads/")) return getImageUrl(settings.bannerImage);
        return settings.bannerImage.startsWith("/") ? settings.bannerImage : "/" + settings.bannerImage;
    };
    const bannerImageSrc = resolveBannerImage();
    const handleScrollDown = () => {
        if (scrollToId) {
            const element = document.getElementById(scrollToId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            window.scrollTo({
                top: window.innerHeight,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className={`relative w-full ${videoSrc ? 'h-[80vh]' : 'h-[250px] md:h-[350px] lg:h-[400px]'} bg-[#111a45] overflow-hidden`}>
            {videoSrc ? (
                <>
                    {/* Video Background */}
                    <video
                        src={videoSrc}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Overlay so H1 and breadcrumb are readable on video */}
                    <div className="absolute inset-0 bg-[#0b2a5b]/50 z-10" />
                    {/* H1 and breadcrumb when video banner – inner page content has proper heading */}
                    <div className="absolute inset-0 z-10 container mx-auto px-4 md:px-8 lg:px-12 flex flex-col justify-center h-full">
                        <h1 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight mb-3 mt-8 font-display drop-shadow-lg">
                            {displayTitle}
                        </h1>
                        <div className="flex items-center gap-3 text-white text-base md:text-lg font-medium tracking-wide">
                            <Link href="/" className="hover:text-yellow-400 transition-colors flex items-center">
                                <Home className="w-5 h-5 mb-0.5" fill="currentColor" />
                            </Link>
                            <span className="opacity-80">/</span>
                            <span className="text-white">{currentPage}</span>
                        </div>
                    </div>
                    {/* Scroll Down Arrow */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 animate-bounce cursor-pointer items-center justify-center flex hover:scale-110 transition-transform" onClick={handleScrollDown}>
                        <div className="bg-white/10 backdrop-blur-sm p-2 rounded-full border border-white/20">
                            <ChevronDown className="w-8 h-8 text-[#FFD700]" />
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Background Image - common from admin or page override */}
                    <img
                        src={bannerImageSrc}
                        alt="Banner"
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                </>
            )}

            {/* Theme overlay - Only show if NO video */}
            {!videoSrc && <div className="absolute inset-0 bg-[#0b2a5b]/70" />}

            {/* Content Overlay - Only show if NO video */}
            {!videoSrc && (
                <div className="absolute inset-0 z-10 container mx-auto px-4 md:px-8 lg:px-12 flex flex-col justify-center h-full">
                    <h1 className="text-white text-3xl sm:text-4xl md:text-6xl lg:text-[64px] font-bold uppercase tracking-tight mb-3 mt-8 font-display">
                        {displayTitle}
                    </h1>

                    {/* Breadcrumb */}
                    <div className="flex items-center gap-3 text-white text-base md:text-lg font-medium tracking-wide">
                        <Link href="/" className="hover:text-yellow-400 transition-colors flex items-center">
                            <Home className="w-5 h-5 mb-0.5" fill="currentColor" />
                        </Link>
                        <span className="opacity-80">/</span>
                        <span className="text-white">{currentPage}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PageBanner;
