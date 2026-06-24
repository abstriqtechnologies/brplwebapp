"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from "@/components/ui/carousel";
import { ArrowRight, MapPin, Calendar } from "lucide-react";
import { useCollections } from "@/components/SiteContextProvider";

const FALLBACK_EVENTS = [
    {
        _id: "fallback-1",
        title: "BRPL Zonal Trials",
        image: "/artist.webp",
        date: "Upcoming",
        location: "Pan-India",
    },
    {
        _id: "fallback-2",
        title: "Franchise Auctions",
        image: "/artist.webp",
        date: "TBA",
        location: "Mumbai",
    },
    {
        _id: "fallback-3",
        title: "T10 Season Opener",
        image: "/artist.webp",
        date: "TBA",
        location: "Delhi NCR",
    },
    {
        _id: "fallback-4",
        title: "Grassroots Showcases",
        image: "/artist.webp",
        date: "Year-round",
        location: "All Zones",
    },
];

const EventGallerySlider: React.FC = () => {
    const [api2, setApi] = useState<CarouselApi>();
    const { events: cmsEvents } = useCollections();
    const [events, setEvents] = useState<any[]>(FALLBACK_EVENTS);

    // Map CMS events to the shape the render expects.
    // CMS shape: { title, slug, description, image, venue, city, state, startDate, endDate, status, ... }
    // Render shape: { _id, title, image, date (startDate formatted), location (city/state/venue) }
    useEffect(() => {
        if (Array.isArray(cmsEvents) && cmsEvents.length > 0) {
            const mapped = cmsEvents.slice(0, 8).map((e: any, idx: number) => {
                const dateStr = e.startDate
                    ? new Date(e.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : "";
                const locationParts = [e.city, e.state].filter(Boolean);
                const location = locationParts.length > 0 ? locationParts.join(", ") : (e.venue || "");
                return {
                    _id: e._id?.toString?.() || `cms-event-${idx}`,
                    title: e.title || "",
                    image: e.image || "/artist.webp",
                    date: dateStr,
                    location,
                };
            });
            setEvents(mapped);
        } else {
            setEvents(FALLBACK_EVENTS);
        }
    }, [cmsEvents]);

    useEffect(() => {
        if (!api2) return;

        const intervalId = setInterval(() => {
            api2.scrollNext();
        }, 3000); // Auto-slide every 3 seconds

        return () => clearInterval(intervalId);
    }, [api2]);

    return (
        <section className="relative w-full">
            {/* Background styling reused from PointsTable */}
            <div className="relative py-10 md:py-12 lg:py-16 px-4 md:px-8 lg:px-12 overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('/artist.webp')" }}
                />
                {/* Dark tint for text readability */}
                <div className="absolute inset-0 bg-[#020617]/60" />

                <div className="relative max-w-7xl mx-auto">
                    {/* Section Header */}
                    <div className="flex flex-col items-center mb-10 text-center">
                        <h2
                            className="text-white text-3xl md:text-4xl lg:text-[40px] font-extrabold tracking-[0.05em] mb-4"
                            style={{ fontFamily: "'Rye', serif" }}
                        >
                            BRPL Event Gallery
                        </h2>
                        <div className="h-1 w-24 bg-[#FFC928] rounded-full" />
                        <p className="max-w-2xl text-center text-gray-200 text-sm md:text-base mt-4 leading-relaxed">
                            Highlights from BRPL's nationwide cricket events — zonal trials, franchise matches, and grassroots tournaments shaping India's next generation of T10 cricketers.
                        </p>
                        <p className="text-center text-amber-500 font-bold uppercase tracking-wider text-sm md:text-base mt-4 italic">
                            Bharat ki League, Bharatiyon ka Sapna
                        </p>
                    </div>

                    {events.length === 0 ? (
                        <div className="text-center text-white/60 py-16">No events available.</div>
                    ) : (
                        /* Carousel */
                        <Carousel
                            setApi={setApi}
                            opts={{
                                align: "start",
                                loop: true,
                            }}
                            className="w-full"
                        >
                            <CarouselContent className="-ml-4">
                                {events.map((event) => (
                                    <CarouselItem key={event._id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                                        <div className="group relative h-[350px] rounded-xl overflow-hidden cursor-pointer shadow-xl border border-white/10">
                                            {/* Image */}
                                            <img
                                                src={event.image}
                                                alt={event.title}
                                                loading="lazy"
                                                decoding="async"
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />

                                            {/* Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

                                            {/* Content */}
                                            <div className="absolute bottom-0 left-0 w-full p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                                <h3 className="text-white text-xl font-bold mb-2 leading-tight">{event.title}</h3>
                                                <div className="space-y-1 mb-3">
                                                    <div className="flex items-center text-gray-300 text-xs">
                                                        <Calendar className="w-3 h-3 mr-1.5 text-[#FFC928]" />
                                                        {event.date}
                                                    </div>
                                                    <div className="flex items-center text-gray-300 text-xs">
                                                        <MapPin className="w-3 h-3 mr-1.5 text-[#FFC928]" />
                                                        {event.location}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>

                            {/* Custom Navigation Buttons */}
                            <div className="hidden md:block">
                                <CarouselPrevious className="left-[-20px] bg-white/10 hover:bg-[#FFC928] hover:text-black border-none text-white h-10 w-10" />
                                <CarouselNext className="right-[-20px] bg-white/10 hover:bg-[#FFC928] hover:text-black border-none text-white h-10 w-10" />
                            </div>
                        </Carousel>
                    )}

                    {/* View More Button */}
                    <div className="mt-12 text-center">
                        <Link href="/events">
                            <button className="group relative inline-flex items-center justify-center px-8 py-3 font-bold text-white transition-all duration-200 bg-[#FFC928] font-sans uppercase tracking-widest rounded-full hover:bg-white hover:text-[#111a45] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFC928]">
                                <span className="mr-2 text-[#111a45]">View More</span>
                                <ArrowRight className="w-4 h-4 text-[#111a45] group-hover:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default EventGallerySlider;
// end of file
