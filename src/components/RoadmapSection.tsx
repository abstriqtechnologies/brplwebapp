"use client";
import { useEffect, useState } from "react";
import {
    FileText, Smartphone, Search, Trophy,
    Star, Heart, Zap, Shield, Target, Award, Crown, Flame, Gem, Globe,
    Megaphone, Rocket, ThumbsUp, TrendingUp, Users, Bot, Timer, Tv, Circle,
    type LucideIcon
} from "lucide-react";
import apiClient from "@/apihelper/api";
import ZoneDeadlineSection from "./ZoneDeadlineSection";
import LivesChangedSection from "./LivesChangedSection";

const ICON_MAP: Record<string, LucideIcon> = {
    FileText, Smartphone, Search, Trophy,
    Star, Heart, Zap, Shield, Target, Award, Crown, Flame, Gem, Globe,
    Megaphone, Rocket, ThumbsUp, TrendingUp, Users, Bot, Timer, Tv, Circle,
};

interface StepItem {
    _id: string;
    icon: string;
    headline: string;
    description: string;
    order: number;
}

const fallbackSteps: StepItem[] = [
    { _id: "1", icon: "FileText", headline: "SIGN UP & PAY", description: "Fill your details and pay the one-time entry fee of \u20B91499 to secure your spot.", order: 1 },
    { _id: "2", icon: "Smartphone", headline: "RECORD & UPLOAD", description: "No travel needed! Record a batting or bowling video on your phone and upload it.", order: 2 },
    { _id: "3", icon: "Search", headline: "GET SHORTLISTED", description: "Our experts and AI technology analyze your technique. Best players get the \"Golden Call\".", order: 3 },
    { _id: "4", icon: "Trophy", headline: "PLAY LIVE ON TV", description: "Get auctioned into a team, wear the pro jersey, and play for the \u20B93 Crore prize pool.", order: 4 },
];

const RoadmapSection = () => {
    const [steps, setSteps] = useState<StepItem[]>(fallbackSteps);
    const [titleBefore, setTitleBefore] = useState("YOUR JOURNEY TO");
    const [titleHighlight, setTitleHighlight] = useState("GLORY");
    const [backgroundImage, setBackgroundImage] = useState("/banner.webp");

    useEffect(() => {
        apiClient.get("/api/roadmap")
            .then(res => {
                if (res.data.success && res.data.data.length > 0) {
                    setSteps(res.data.data);
                }
                if (res.data.settings) {
                    if (res.data.settings.titleBefore) setTitleBefore(res.data.settings.titleBefore);
                    if (res.data.settings.titleHighlight) setTitleHighlight(res.data.settings.titleHighlight);
                    if (res.data.settings.backgroundImage) setBackgroundImage(res.data.settings.backgroundImage);
                }
            })
            .catch(() => {
                // Keep fallback on error
            });
    }, []);

    const renderIcon = (iconName: string) => {
        const IconComp = ICON_MAP[iconName] || FileText;
        return <IconComp className="w-10 h-10 text-white/80 group-hover:text-[#FFC928] transition-colors duration-300" strokeWidth={2} />;
    };

    return (
        <>
            <section className="w-full relative py-20 px-4 md:px-8 overflow-hidden">
                {/* Background Image & Overlay */}
                <div className="absolute inset-0 z-0">
                    <img src={backgroundImage} alt="Stadium Background" className="w-full h-full object-cover opacity-100" loading="lazy" decoding="async" />
                    <div className="absolute inset-0 bg-[#0f172a]/70 mix-blend-multiply" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-[#0f172a]/80" />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <h2 className="text-center text-3xl md:text-5xl font-black text-white mb-24 uppercase tracking-tighter font-sans italic drop-shadow-2xl">
                        {titleBefore} <span className="text-[#FFC928]">{titleHighlight}</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-8 mt-12">
                        {steps.map((step, index) => (
                            <div
                                key={step._id}
                                className="group relative bg-white/5 backdrop-blur-md rounded-2xl p-8 pt-12 flex flex-col items-center text-center border border-white/10 hover:border-[#FFC928]/50 transition-all duration-500 hover:-translate-y-4 hover:scale-105 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] hover:shadow-[0_20px_40px_-15px_rgba(255,201,40,0.3)]"
                            >
                                {/* Floating Step Number */}
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-gradient-to-br from-[#FF5555] to-[#D92020] rounded-full flex items-center justify-center border-4 border-[#0f172a] shadow-[0_0_20px_rgba(255,85,85,0.6)] z-20 group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-3xl font-black text-white drop-shadow-md">{index + 1}</span>
                                </div>

                                <div className="mt-6 mb-6 p-4 rounded-full bg-white/5 border border-white/10 group-hover:bg-[#FFC928]/20 group-hover:border-[#FFC928]/50 transition-all duration-500">
                                    {renderIcon(step.icon)}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-wide group-hover:text-[#FFC928] transition-colors duration-300">
                                    {step.headline}
                                </h3>

                                <div className="w-12 h-1 bg-white/20 rounded-full mb-4 group-hover:w-20 group-hover:bg-[#FFC928] transition-all duration-500"></div>

                                <p className="text-gray-300 text-sm leading-relaxed font-medium">
                                    {step.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <ZoneDeadlineSection />
            <LivesChangedSection />
        </>
    );
};

export default RoadmapSection;
