"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar, MapPin, ArrowRight, Loader2 } from "lucide-react";
import PageBanner from "@/components/PageBanner";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 12;

const EventsClient = () => {
    const [events] = useState<any[]>([]);
    const [loading] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter]);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter]);

    const openGallery = (event: any) => {
        setSelectedEvent(event);
        setLightboxOpen(true);
    };

    const slides = useMemo(() => {
        if (!selectedEvent) return [];
        return [{
            src: selectedEvent.image,
            title: selectedEvent.title,
            description: `${selectedEvent.date} - ${selectedEvent.location}`
        }];
    }, [selectedEvent]);

    const filteredEvents = activeFilter === 'All'
        ? events
        : events.filter(event => event.category?.toLowerCase() === activeFilter.toLowerCase());

    // Pagination
    const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedEvents = filteredEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 300, behavior: 'smooth' });
        }
    };

    // Extract unique categories for filter
    const categories = ['All', ...Array.from(new Set(events.map(e => e.category)))];

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <PageBanner pageKey="events" title="Events" currentPage="Events" />

            {/* Gallery Section */}
            <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <h2 className="text-3xl font-bold text-[#111a45] uppercase tracking-wide mb-2">
                            Event <span className="text-[#FFC928]">Gallery</span>
                        </h2>
                        <div className="h-1.5 w-24 bg-[#FFC928] rounded-full"></div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {categories.map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all
                                    ${activeFilter === filter
                                        ? "bg-[#111a45] text-white border-[#111a45]"
                                        : "bg-white text-gray-600 border-gray-200 hover:bg-[#111a45] hover:text-white hover:border-[#111a45]"
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-10 h-10 animate-spin text-[#111A45]" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {paginatedEvents.length === 0 ? (
                                <div className="col-span-full text-center py-10 text-gray-500">
                                    No events found.
                                </div>
                            ) : (
                                paginatedEvents.map((event) => (
                                    <div
                                        key={event._id}
                                        className="group relative bg-black rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer h-[400px]"
                                        onClick={() => openGallery(event)}
                                    >
                                        {/* Image Background */}
                                        <div className="absolute inset-0">
                                            <img
                                                src={event.image}
                                                alt={event.title}
                                                loading="lazy"
                                                decoding="async"
                                                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                                            />
                                            {/* Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                                        </div>

                                        {/* Category Badge */}
                                        <div className="absolute top-4 left-4 z-20 bg-white/20 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white">
                                            {event.category}
                                        </div>

                                        {/* Content Overlay */}
                                        <div className="absolute bottom-0 left-0 w-full p-6 z-20 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                            <h3 className="text-2xl font-bold text-white mb-2 leading-tight drop-shadow-md">
                                                {event.title}
                                            </h3>

                                            <div className="space-y-1 mb-4 opacity-90">
                                                <div className="flex items-center text-gray-200 text-sm">
                                                    <Calendar className="w-4 h-4 mr-2 text-[#FFC928]" />
                                                    {event.date}
                                                </div>
                                                <div className="flex items-center text-gray-200 text-sm">
                                                    <MapPin className="w-4 h-4 mr-2 text-[#FFC928]" />
                                                    {event.location}
                                                </div>
                                            </div>

                                            <div className="w-full h-0.5 bg-white/20 group-hover:bg-[#FFC928] transition-colors duration-500 mb-4" />

                                            <div className="flex items-center text-sm font-bold text-[#FFC928] opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
                                                VIEW IMAGE <ArrowRight className="w-4 h-4 ml-2" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-12">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>

                                        {Array.from({ length: totalPages }).map((_, index) => (
                                            <PaginationItem key={index}>
                                                <PaginationLink
                                                    isActive={index + 1 === currentPage}
                                                    onClick={() => handlePageChange(index + 1)}
                                                    className="cursor-pointer"
                                                >
                                                    {index + 1}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}

                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* Lightbox for Fullscreen View */}
            {selectedEvent && (
                <Lightbox
                    open={lightboxOpen}
                    close={() => setLightboxOpen(false)}
                    slides={slides}
                    plugins={[Zoom]}
                    animation={{ fade: 250 }}
                    controller={{ closeOnBackdropClick: true }}
                    styles={{
                        container: { backgroundColor: "rgba(0, 0, 0, 0.95)" }
                    }}
                    render={{
                        buttonPrev: () => null,
                        buttonNext: () => null,
                    }}
                />
            )}
        </div>
    );
};

export default EventsClient;
