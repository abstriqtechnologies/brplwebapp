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
import apiClient from "@/apihelper/api";
import { Loader2 } from "lucide-react";

const AmbassadorsSection: React.FC = () => {
    const [api, setApi] = useState<CarouselApi>();
    const [ambassadors, setAmbassadors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAmbassadors = async () => {
            try {
                const response = await apiClient.get('/api/ambassadors');
                setAmbassadors(response.data);
            } catch (error) {
                console.error("Failed to fetch ambassadors", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAmbassadors();
    }, []);

    useEffect(() => {
        if (!api) {
            return;
        }

        const intervalId = setInterval(() => {
            api.scrollNext();
        }, 3000); // Auto-slide every 3 seconds

        return () => clearInterval(intervalId);
    }, [api]);

    return (
        <section className="relative w-full py-16 overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/artist.webp')" }}
            />
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-[#111a45]/10" />

            <div className="relative max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
                {/* Section Header */}
                <div className="flex flex-col items-center mb-12 text-center">
                    <h2
                        className="text-white text-3xl md:text-4xl lg:text-[40px] font-extrabold tracking-[0.05em] mb-4"
                        style={{ fontFamily: "'Rye', serif" }}
                    >
                        BRPL Ambassadors
                    </h2>
                    <div className="h-1 w-24 bg-[#FFC928] rounded-full" />
                    <p className="max-w-2xl text-center text-gray-200 text-sm md:text-base mt-4 leading-relaxed">
                        Meet the cricket icons, mentors, and changemakers championing BRPL's mission to take grassroots T10 cricket to every corner of India.
                    </p>
                    <p className="text-center text-amber-500 font-bold uppercase tracking-wider text-sm md:text-base mt-4 italic">
                        Bharat ki League, Bharatiyon ka Sapna
                    </p>
                </div>

                {/* Carousel */}
                {isLoading ? (
                    <div className="flex justify-center items-center h-[400px]">
                        <Loader2 className="h-10 w-10 animate-spin text-white" />
                    </div>
                ) : (
                    <Carousel
                        setApi={setApi}
                        opts={{
                            align: "start",
                            loop: true,
                        }}
                        className="w-full"
                    >
                        <CarouselContent className="-ml-4">
                            {ambassadors.map((ambassador) => (
                                <CarouselItem key={ambassador._id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                                    <Link href={`/press/${ambassador._id}`}>
                                        <div className="group relative h-[400px] rounded-xl overflow-hidden cursor-pointer shadow-xl border border-white/10 bg-[#1e2330]">
                                            {/* Image */}
                                            <div className="h-[65%] overflow-hidden">
                                                <img
                                                    src={ambassador.image}
                                                    alt={ambassador.name}
                                                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                                                />
                                            </div>

                                            {/* Overlay - Subtle gradient for better text visibility if needed on image, but here text is below */}
                                            {/* <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60" /> */}


                                            {/* Content */}
                                            <div className="absolute bottom-0 left-0 w-full h-[35%] bg-[#1e2330] p-2 flex flex-col justify-center items-center text-center transition-colors duration-300 group-hover:bg-[#FFC928]">
                                                <h3 className="text-white text-lg font-bold mb-1 group-hover:text-[#111a45] leading-tight transition-colors duration-300">{ambassador.name}</h3>
                                                <p className="text-gray-300 text-[10px] uppercase tracking-wider group-hover:text-[#111a45] leading-tight transition-colors duration-300">
                                                    {ambassador.designation?.split('(').map((part: string, index: number) => (
                                                        <React.Fragment key={index}>
                                                            {index === 0 ? part : `(${part}`}
                                                            {index < ambassador.designation.split('(').length - 1 && <br />}
                                                        </React.Fragment>
                                                    ))}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
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
            </div>
        </section>
    );
};

export default AmbassadorsSection;
