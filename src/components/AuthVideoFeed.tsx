"use client";
import { Play, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import apiClient from "@/apihelper/api";
import SectionHeading from "./SectionHeading";
import { getImageUrl } from "@/utils/imageHelper";

const FALLBACK_VIDEOS = [
    {
        _id: "1",
        thumbnail: "/banner-brpl.jpeg",
        duration: "10:24",
        videoSrc: "https://brpl.net/api/api/cloud-store/preview?uri=%2Fapi%2Fpublic%2Fbrpl-public%2FBRPL_Launch_Film.mp4"
    },
    {
        _id: "2",
        thumbnail: "/about-us.png",
        duration: "05:12",
        videoSrc: "https://brpl.net/api/api/cloud-store/preview?uri=%2Fapi%2Fpublic%2Fbrpl-public%2FBRPL_Launch_Film.mp4"
    },
    {
        _id: "3",
        thumbnail: "/banner-new.png",
        duration: "15:30",
        videoSrc: "https://brpl.net/api/api/cloud-store/preview?uri=%2Fapi%2Fpublic%2Fbrpl-public%2Fteams-video.mp4"
    },
    {
        _id: "4",
        thumbnail: "/banner-2.png",
        duration: "03:45",
        videoSrc: "https://brpl.net/api/api/cloud-store/preview?uri=%2Fapi%2Fpublic%2Fbrpl-public%2Fteams-video.mp4"
    }
];

interface AuthVideoFeedProps {
    titleBefore?: string;
    titleHighlight?: string;
    titleFull?: string;
    headingLevel?: "h1" | "h2" | "h3";
}

const AuthVideoFeed = ({
    titleBefore = "Latest",
    titleHighlight = "Videos",
    titleFull,
    headingLevel = "h2",
}: AuthVideoFeedProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [videos, setVideos] = useState<any[]>(FALLBACK_VIDEOS);
    const [apiTitleBefore, setApiTitleBefore] = useState<string | null>(null);
    const [apiTitleHighlight, setApiTitleHighlight] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        apiClient.get("/api/registration-videos")
            .then(res => {
                const data = res.data?.data;
                const settings = res.data?.settings;
                
                if (Array.isArray(data) && data.length > 0) {
                    setVideos(data);
                }
                if (settings) {
                    if (settings.titleBefore) setApiTitleBefore(settings.titleBefore);
                    if (settings.titleHighlight) setApiTitleHighlight(settings.titleHighlight);
                }
            })
            .catch(() => {/* keep fallback */ })
            .finally(() => setIsLoading(false));
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = current.clientWidth * 0.8;
            current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="w-full pt-8 pb-4 bg-black/40 backdrop-blur-md border-t border-white/10 relative">
            <SectionHeading
                as={headingLevel}
                beforeText={titleFull ? undefined : (apiTitleBefore || titleBefore)}
                highlightText={titleFull ? undefined : (apiTitleHighlight || titleHighlight)}
                title={titleFull}
            />

            {isLoading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 text-[#FFC928] animate-spin" />
                </div>
            ) : (
                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto pb-6 px-6 scrollbar-hide snap-x justify-start md:justify-center"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {videos.map((video) => (
                        <Dialog key={video._id}>
                            <DialogTrigger asChild>
                                <div
                                    className="group relative flex-shrink-0 w-[85vw] sm:w-[280px] h-[160px] rounded-xl overflow-hidden border border-white/10 cursor-pointer snap-center md:snap-start transition-all duration-300 bg-black/50"
                                >
                                    {/* Thumbnail */}
                                    <img
                                        src={getImageUrl(video.thumbnail)}
                                        alt={video.title || "Video"}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                                    />

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent group-hover:via-transparent transition-all" />

                                    {/* Play Button */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-12 h-12 bg-[#FFC928]/90 rounded-full flex items-center justify-center shadow-lg text-black transform group-hover:scale-110 transition-transform duration-300 backdrop-blur-sm">
                                            <Play className="w-5 h-5 fill-black ml-1" />
                                        </div>
                                    </div>

                                    {/* Bottom Badge */}
                                    <div className="absolute bottom-0 left-0 w-full p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                        <div className="flex justify-between items-end">
                                            {video.title && (
                                                <h4 className="text-white font-bold text-xs leading-tight line-clamp-2 group-hover:text-[#FFC928] transition-colors text-left max-w-[200px]">
                                                    {video.title}
                                                </h4>
                                            )}
                                            {video.duration && (
                                                <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded backdrop-blur-sm border border-white/10 ml-2 whitespace-nowrap flex-shrink-0">
                                                    {video.duration}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[800px] bg-black border-white/20 p-0 overflow-hidden">
                                <div className="relative w-full aspect-video bg-black flex items-center justify-center">
                                    <video
                                        src={video.videoSrc}
                                        controls
                                        autoPlay
                                        className="w-full h-full object-contain"
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                                <div className="p-4 bg-[#1a1a1a]">
                                    {video.title && <h3 className="text-lg font-bold text-white mb-1">{video.title}</h3>}
                                    {video.duration && <p className="text-gray-400 text-sm">Duration: {video.duration}</p>}
                                </div>
                            </DialogContent>
                        </Dialog>
                    ))}
                </div>
            )}

            {/* Mobile Navigation */}
            <div className="flex justify-center gap-4 mt-2 md:hidden relative z-20 pb-4">
                <button
                    onClick={() => scroll('left')}
                    className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-full hover:bg-[#FFC928] hover:text-black hover:border-[#FFC928] transition-all duration-300 group"
                    aria-label="Previous Video"
                >
                    <ChevronLeft className="w-5 h-5 text-white group-hover:text-black" />
                </button>
                <button
                    onClick={() => scroll('right')}
                    className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-full hover:bg-[#FFC928] hover:text-black hover:border-[#FFC928] transition-all duration-300 group"
                    aria-label="Next Video"
                >
                    <ChevronRight className="w-5 h-5 text-white group-hover:text-black" />
                </button>
            </div>
        </div>
    );
};

export default AuthVideoFeed;
