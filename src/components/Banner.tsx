"use client";

import React, { useState } from "react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Play } from "lucide-react";
import VideoModal from "./VideoModal";
import { getImageUrl } from "@/utils/imageHelper";
import OptimizedImage from "./OptimizedImage";

interface BannerItem {
  _id: string;
  background: string;
  videoUrl?: string;
  isActive: boolean;
}

const DEFAULT_BANNER: BannerItem = {
  _id: "default",
  background: "/banner-brpl.jpeg",
  videoUrl: "https://brpl-public-uploads.s3.ap-south-1.amazonaws.com/BRPL_Launch_Film.mp4",
  isActive: true,
};

const Banner = () => {
  const [apiCarousel, setApiCarousel] = React.useState<CarouselApi | null>(null);
  const [current, setCurrent] = React.useState(0);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  // Start with default banner so LCP image is in DOM immediately (no blank state)
  const [banners] = useState<BannerItem[]>([DEFAULT_BANNER]);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(DEFAULT_BANNER.videoUrl || "");

  React.useEffect(() => {
    if (!apiCarousel) return;

    setCurrent(apiCarousel.selectedScrollSnap());

    const onSelect = () => {
      const selectedIndex = apiCarousel.selectedScrollSnap();
      setCurrent(selectedIndex);
      if (banners[selectedIndex] && banners[selectedIndex].videoUrl) {
        setCurrentVideoUrl(banners[selectedIndex].videoUrl || "");
      }
    };

    apiCarousel.on("select", onSelect);

    return () => {
      apiCarousel.off("select", onSelect);
    };
  }, [apiCarousel, banners]);

  React.useEffect(() => {
    if (!apiCarousel) return;

    const interval = setInterval(() => {
      apiCarousel.scrollNext();
    }, 6000);

    return () => clearInterval(interval);
  }, [apiCarousel]);

  // Always render banner (with default so LCP image shows immediately)
  return (
    <div className="relative w-full h-auto overflow-hidden font-sans bg-[#020617]">
      <Carousel setApi={setApiCarousel} className="h-full">
        <CarouselContent className="h-full">
          {banners.map((slide, index) => (
            <CarouselItem key={slide._id} className="h-full">
              <div className="relative w-full h-auto md:h-full overflow-hidden">
                {/* Image - Maintains Aspect Ratio on all devices; first slide priority for LCP */}
                <OptimizedImage
                  src={getImageUrl(slide.background)}
                  alt="Banner"
                  priority={index === 0}
                  className={`w-full h-auto object-cover transition-transform duration-[10000ms] ease-out ${index === current ? 'scale-110' : 'scale-100'}`}
                />

                {/* Content Overlay */}
                <div className="relative md:absolute md:inset-0 z-10 w-full h-auto md:h-full max-w-[1400px] mx-auto px-4 md:px-10 lg:px-16 flex flex-col justify-end items-center md:items-end py-4 md:pb-12">
                  <div className="flex flex-col items-center md:items-end justify-center w-full gap-8 md:gap-10 z-20">

                    {/* Buttons Container */}
                    <div className="flex flex-row gap-4 w-full justify-center md:justify-end">
                      <Link href="/registration">
                        <Button
                          size="lg"
                          className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs md:text-sm px-4 md:px-6 h-10 md:h-12 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)] transform hover:scale-105 transition-all duration-300 flex items-center justify-center"
                        >
                          <span>REGISTER NOW</span>
                        </Button>
                      </Link>

                      <Button
                        variant="outline"
                        size="lg"
                        className="bg-transparent border-2 border-white text-white hover:bg-white/10 hover:text-white font-bold text-xs md:text-sm px-4 md:px-6 h-10 md:h-12 rounded-full backdrop-blur-sm transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                        onClick={() => {
                          if (slide.videoUrl) {
                            setCurrentVideoUrl(slide.videoUrl);
                            setIsVideoModalOpen(true);
                          }
                        }}
                      >
                        <Play className="w-5 h-5 fill-current" />
                        <span>PLAY VIDEO</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoSrc={currentVideoUrl}
      />
    </div>
  );
};

export default Banner;
