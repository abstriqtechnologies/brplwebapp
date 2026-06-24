"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
/* API calls removed for static build */

const ZoneDeadlineSection = () => {
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState("00:00:00:00");

    const [titleBefore, setTitleBefore] = useState("ZONES ARE");
    const [titleHighlight, setTitleHighlight] = useState("NEARING CAPACITY");
    const [stat1Value, setStat1Value] = useState("78%");
    const [stat1Label, setStat1Label] = useState("Registrations Completed");
    const [stat2Label, setStat2Label] = useState("Time Left");
    const [stat3Value, setStat3Value] = useState("89");
    const [stat3Label, setStat3Label] = useState("Slots Available");
    const [ctaLine1, setCtaLine1] = useState("Those who hesitate fall behind.");
    const [ctaLine2, setCtaLine2] = useState("Those who step forward, leave their mark.");
    const [buttonText, setButtonText] = useState("Start Your Journey - Register Now");
    const [targetDate, setTargetDate] = useState<number>(Date.now() + 10 * 24 * 60 * 60 * 1000);

    useEffect(() => {
        /* API removed: defaults are used */
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            const distance = targetDate - now;

            if (distance < 0) {
                setTimeLeft("00:00:00:00");
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
            setTimeLeft(`${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    return (
        <div className="w-full bg-[#0F172A] py-8 px-4 md:px-8 relative overflow-hidden mb-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0F172A] to-[#0F172A]" />

            <div className="max-w-5xl mx-auto relative z-10 text-center">
                {/* Warning Header */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-3 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <AlertTriangle className="w-8 h-8 text-[#FFC928] animate-pulse" />
                    <h2 className="text-2xl md:text-4xl font-extrabold text-white uppercase tracking-wider font-display italic">
                        {titleBefore} <span className="text-[#FFC928]">{titleHighlight}</span>
                    </h2>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Stat 1 */}
                    <div className="flex flex-col items-center p-2">
                        <span className="text-3xl md:text-5xl font-bold text-white mb-2 font-display">{stat1Value}</span>
                        <span className="text-[#FFC928] font-bold tracking-widest text-sm">{stat1Label}</span>
                    </div>

                    {/* Stat 2 - Countdown */}
                    <div className="flex flex-col items-center p-2 border-y md:border-y-0 md:border-x border-white/10">
                        <span className="text-3xl md:text-5xl font-bold text-white mb-2 font-mono tabular-nums tracking-wider text-shadow">{timeLeft}</span>
                        <span className="text-[#FFC928] font-bold tracking-widest text-sm">{stat2Label}</span>
                    </div>

                    {/* Stat 3 */}
                    <div className="flex flex-col items-center p-2">
                        <span className="text-3xl md:text-5xl font-bold text-white mb-2 font-display">{stat3Value}</span>
                        <span className="text-[#FFC928] font-bold tracking-widest text-sm">{stat3Label}</span>
                    </div>
                </div>

                {/* CTA Text */}
                <div className="space-y-3 mb-6">
                    {ctaLine1 && (
                        <p className="text-lg md:text-xl text-gray-300 italic font-medium">
                            {ctaLine1}
                        </p>
                    )}
                    {ctaLine2 && (
                        <p className="text-xl md:text-2xl text-white font-bold tracking-wide">
                            {ctaLine2}
                        </p>
                    )}
                </div>

                {/* Action Button */}
                {buttonText && (
                    <Button
                        onClick={() => {
                            const formContainer = document.getElementById("auth-form-container");
                            if (formContainer) {
                                formContainer.scrollIntoView({ behavior: "smooth" });
                            } else {
                                router.push("/login");
                            }
                        }}
                        className="bg-[#FFC928] text-black hover:bg-[#FFC928]/90 text-base md:text-lg font-bold px-8 py-3 h-auto rounded-full shadow-[0_0_20px_rgba(255,201,40,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,201,40,0.5)]"
                    >
                        {buttonText}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default ZoneDeadlineSection;
