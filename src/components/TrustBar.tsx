"use client";
import { useEffect, useState } from "react";
import {
    Trophy, Tv, Bot, Users, Timer, Circle,
    Star, Heart, Zap, Shield, Target, Award, Crown, Flame, Gem, Globe,
    Megaphone, Rocket, ThumbsUp, TrendingUp, type LucideIcon
} from "lucide-react";
import apiClient from "@/apihelper/api";

const ICON_MAP: Record<string, LucideIcon> = {
    Trophy, Circle, Tv, Users, Bot, Timer,
    Star, Heart, Zap, Shield, Target, Award, Crown, Flame, Gem, Globe,
    Megaphone, Rocket, ThumbsUp, TrendingUp
};

interface TrustItem {
    _id: string;
    icon: string;
    hook: string;
    descriptor: string;
    order: number;
}

// Hardcoded fallback if API fails or returns empty
const fallbackItems: TrustItem[] = [
    { _id: "1", icon: "Trophy", hook: "\u20B93 Crore", descriptor: "TOTAL PRIZE POOL", order: 0 },
    { _id: "2", icon: "Circle", hook: "Tennis Ball", descriptor: "NO BIG KIT REQUIREMENTS", order: 1 },
    { _id: "3", icon: "Tv", hook: "Live TV", descriptor: "NATIONAL BROADCAST", order: 2 },
    { _id: "4", icon: "Users", hook: "All Ages", descriptor: "U-18, U-19, U-24, U-40", order: 3 },
    { _id: "5", icon: "Bot", hook: "100% Fair", descriptor: "Pure Skill Selection", order: 4 },
    { _id: "6", icon: "Timer", hook: "Closing Soon", descriptor: "LIMITED CITY SLOTS", order: 5 },
];

const TrustBar = () => {
    const [trustItems, setTrustItems] = useState<TrustItem[]>(fallbackItems);
    const [sectionTitle, setSectionTitle] = useState("The Numbers Speak");

    useEffect(() => {
        apiClient.get("/api/numbers-speak")
            .then(res => {
                if (res.data.success && res.data.data.length > 0) {
                    setTrustItems(res.data.data);
                }
                if (res.data.settings?.title) {
                    setSectionTitle(res.data.settings.title);
                }
            })
            .catch(() => {
                // Keep fallback items on error
            });
    }, []);

    const renderIcon = (iconName: string) => {
        const IconComp = ICON_MAP[iconName] || Trophy;
        return <IconComp className="w-10 h-10 text-[#FFC928] mb-3 relative z-10" strokeWidth={1.5} />;
    };

    return (
        <section className="w-full bg-[#020617] py-16 px-4 md:px-8 relative overflow-hidden">
            <div className="max-w-7xl mx-auto relative z-10">
                <h2 className="text-center text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-[#FFC928] to-amber-500 bg-clip-text text-transparent mb-12 uppercase tracking-wide font-display italic drop-shadow-sm">
                    {sectionTitle}
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
                    {trustItems.map((item) => (
                        <div
                            key={item._id}
                            className="group relative rounded-2xl p-[2px] shadow-[0_0_20px_rgba(255,201,40,0.15)] hover:-translate-y-1 transition-transform duration-300 min-h-[160px] overflow-hidden"
                        >
                            {/* Moving Gradient Border */}
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-[#FFC928] to-gray-700 animate-border-move"></div>

                            {/* Content Card */}
                            <div className="relative bg-[#111a45] rounded-[14px] p-4 lg:p-6 flex flex-col items-center justify-center text-center w-full h-full">
                                {renderIcon(item.icon)}
                                <h3 className="text-xl lg:text-2xl font-bold text-[#FFC928] leading-tight mb-1 relative z-10">
                                    {item.hook}
                                </h3>
                                <p className="text-[10px] lg:text-xs font-bold text-gray-300 uppercase tracking-wider relative z-10">
                                    {item.descriptor}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TrustBar;
