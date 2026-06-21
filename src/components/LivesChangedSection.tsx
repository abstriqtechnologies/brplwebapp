"use client";
import { useEffect, useState } from "react";
import { Quote, Star, User, ChevronLeft, ChevronRight } from "lucide-react";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import apiClient from "@/apihelper/api";

interface StoryItem {
    _id: string;
    quote: string;
    name: string;
    role: string;
    highlight: string;
    order: number;
}

const fallbackTestimonials: StoryItem[] = [
    { _id: "1", quote: "I played district cricket 20 years ago. No one gave me a chance beyond that. BRPL is building the system I wish I had.", name: "VIJAY SINGH", role: "FORMER COACH, PUNJAB", highlight: "Coach's Perspective", order: 0 },
    { _id: "2", quote: "I drive an auto all day. My bat is in the backseat\u2014I hit the nets every evening. BRPL made me believe I wasn't too old or too poor.", name: "SURESH KUMAR", role: "25, TAMIL NADU", highlight: "Passion over Circumstance", order: 1 },
    { _id: "3", quote: "I'm a night security guard. I practice with a tennis ball during my breaks. BRPL told me talent doesn't have a schedule.", name: "MOHAMMAD IRFAN", role: "28, UTTAR PRADESH", highlight: "Unstoppable Dedication", order: 2 },
    { _id: "4", quote: "Playing on Live TV is a dream come true. We always play in the gully. The idea of playing in a real stadium with floodlights gives me goosebumps.", name: "AMIT YADAV", role: "FAST BOWLER, LUCKNOW", highlight: "Dream Realized", order: 3 },
    { _id: "5", quote: "India's biggest league for sure! The digital skill card feature is very cool. If you love tennis cricket, you cannot miss this.", name: "KARTHIK R.", role: "CHENNAI", highlight: "Tech Enthusiast", order: 4 },
];

const LivesChangedSection = () => {
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);
    const [count, setCount] = useState(0);
    const [testimonials, setTestimonials] = useState<StoryItem[]>(fallbackTestimonials);
    const [badgeText, setBadgeText] = useState("Player Stories");
    const [titleBefore, setTitleBefore] = useState("LIVES CHANGED BY");
    const [titleHighlight, setTitleHighlight] = useState("BRPL");
    const [subtitle, setSubtitle] = useState("Real stories from real players across India who found their stage.");
    const [backgroundImage, setBackgroundImage] = useState("/artist.png");

    useEffect(() => {
        apiClient.get("/api/player-stories")
            .then(res => {
                if (res.data.success && res.data.data.length > 0) {
                    setTestimonials(res.data.data);
                }
                if (res.data.settings) {
                    const s = res.data.settings;
                    if (s.badgeText) setBadgeText(s.badgeText);
                    if (s.titleBefore) setTitleBefore(s.titleBefore);
                    if (s.titleHighlight) setTitleHighlight(s.titleHighlight);
                    if (s.backgroundImage) setBackgroundImage(s.backgroundImage);
                    if (s.subtitle !== undefined) setSubtitle(s.subtitle);
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!api) return;

        setCount(api.scrollSnapList().length);
        setCurrent(api.selectedScrollSnap());

        api.on("select", () => {
            setCurrent(api.selectedScrollSnap());
        });
    }, [api]);

    // Autoplay
    useEffect(() => {
        if (!api) return;

        const intervalId = setInterval(() => {
            api.scrollNext();
        }, 6000);

        return () => clearInterval(intervalId);
    }, [api]);

    return (
        <section className="w-full bg-[#020617] py-16 px-4 md:px-8 relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('${backgroundImage}')` }}>
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FFC928] rounded-full mix-blend-screen opacity-5 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full mix-blend-screen opacity-5 blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto px-2 md:px-4 relative z-10">
                <div className="text-center mb-10">
                    {badgeText && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFC928]/10 border border-[#FFC928]/20 mb-6">
                            <Star className="w-4 h-4 text-[#FFC928] fill-[#FFC928]" />
                            <span className="text-[#FFC928] font-bold text-xs uppercase tracking-widest">{badgeText}</span>
                        </div>
                    )}
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 uppercase tracking-tighter font-display italic">
                        {titleBefore} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFC928] to-amber-500">{titleHighlight}</span>
                    </h2>
                    {subtitle && (
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div className="px-4 md:px-12 relative w-full">
                    <Carousel
                        setApi={setApi}
                        opts={{ align: "start", loop: true }}
                        className="w-full"
                    >
                        <CarouselContent className="-ml-4 py-4">
                            {testimonials.map((testimonial) => (
                                <CarouselItem key={testimonial._id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                                    <div className="h-full">
                                        <div className="group relative bg-[#0f1629] border border-gray-800 p-6 md:p-8 rounded-3xl h-full flex flex-col transition-all duration-300 hover:border-[#FFC928]/50 hover:shadow-[0_0_30px_rgba(255,201,40,0.1)] hover:-translate-y-2">
                                            {/* Quote Icon */}
                                            <div className="absolute top-6 right-6 md:top-8 md:right-8 text-gray-800 group-hover:text-[#FFC928]/20 transition-colors duration-300">
                                                <Quote className="w-10 h-10 md:w-16 md:h-16 fill-current" />
                                            </div>

                                            {/* Stars */}
                                            <div className="flex gap-1 mb-6 relative z-10">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className="w-4 h-4 text-[#FFC928] fill-[#FFC928]" />
                                                ))}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-grow relative z-10">
                                                <p className="text-gray-200 text-base md:text-lg leading-relaxed font-medium line-clamp-6 md:line-clamp-none italic">
                                                    "{testimonial.quote}"
                                                </p>
                                            </div>

                                            {/* Footer */}
                                            <div className="mt-8 pt-6 border-t border-gray-800 flex items-center gap-4 relative z-10">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFC928] to-amber-600 flex items-center justify-center shrink-0">
                                                    <User className="w-6 h-6 text-[#020617]" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white text-lg uppercase font-display tracking-wide">
                                                        {testimonial.name}
                                                    </h4>
                                                    <p className="text-[#FFC928] text-xs font-bold uppercase tracking-wider">
                                                        {testimonial.role}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>

                        {/* Custom Arrows */}
                        <button
                            onClick={() => api?.scrollPrev()}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2 md:-ml-4 lg:-ml-12 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#1e2330] border border-gray-700 rounded-full shadow-lg text-white hover:bg-[#FFC928] hover:text-[#020617] hover:scale-110 transition-all duration-300 group"
                            aria-label="Previous"
                        >
                            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-x-0.5 transition-transform" />
                        </button>

                        <button
                            onClick={() => api?.scrollNext()}
                            className="absolute right-0 top-1/2 -translate-y-1/2 -mr-2 md:-mr-4 lg:-mr-12 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#1e2330] border border-gray-700 rounded-full shadow-lg text-white hover:bg-[#FFC928] hover:text-[#020617] hover:scale-110 transition-all duration-300 group"
                            aria-label="Next"
                        >
                            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-0.5 transition-transform" />
                        </button>

                        {/* Dots */}
                        <div className="flex justify-center gap-2 mt-8 md:mt-12">
                            {Array.from({ length: count }).map((_, index) => (
                                <button
                                    key={index}
                                    className={cn(
                                        "w-3 h-3 rounded-full transition-colors cursor-pointer",
                                        index === current ? "bg-[#FFC928]" : "bg-gray-700 hover:bg-[#FFC928]/50"
                                    )}
                                    onClick={() => api?.scrollTo(index)}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </Carousel>
                </div>
            </div>
        </section>
    );
};

export default LivesChangedSection;
