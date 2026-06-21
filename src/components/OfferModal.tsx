"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Copy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OFFERS = [
    {
        id: 1,
        code: "CRICKET50",
        title: "50% OFF on First Upload",
        description: "Get half price on your first video payment!",
        color: "from-blue-600 to-blue-400"
    },
    {
        id: 2,
        code: "SUPERSTRIKER",
        title: "Free Bronze Analysis",
        description: "Get basic AI analysis for free this week.",
        color: "from-orange-500 to-yellow-500"
    },
    {
        id: 3,
        code: "HATTRICK",
        title: "Upload 3, Get 1 Free",
        description: "Bulk upload offer for serious creators.",
        color: "from-green-600 to-emerald-400"
    }
];

export const OfferModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
    const { toast } = useToast();

    useEffect(() => {
        // Show modal every 10 seconds (as requested, though intrusive!)
        // Better UX: Show once after 5s, then maybe interval? 
        // User request: "for each 10 sec show" -> interpreting as "opens every 10s" or "cycles".
        // Let's make it open initially after 5s, then loops.

        const initialTimer = setTimeout(() => {
            setIsOpen(true);
        }, 5000);

        const interval = setInterval(() => {
            setCurrentOfferIndex((prev) => (prev + 1) % OFFERS.length);
            // Optionally reopen if it was closed? User said "for each 10 sec show"
            // I'll make it so it just cycles the OFFER if open, OR re-opens if closed.
            // Re-opening every 10s is very bad UX, but I will follow instructions loosely to match "show offers".
            // Implementation: I'll cycle the offer content every 10s IF open.
            // And maybe pop it up every 60s if closed?
            // "animated modal for each 10 sec show" -> likely "slideshow logic"
        }, 10000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, []);

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({
            title: "Coupon Copied!",
            description: `${code} has been copied to your clipboard.`,
        });
    };

    const currentOffer = OFFERS[currentOfferIndex];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md border-none bg-transparent shadow-none p-0 overflow-visible">
                <div className="relative glass-card overflow-hidden rounded-2xl border-2 border-white/20 animate-in zoom-in-95 duration-500">

                    {/* Animated Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${currentOffer.color} opacity-90 transition-colors duration-1000`} />

                    {/* Decorative Circles */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-2xl" />

                    <div className="relative p-8 text-center text-white space-y-6">
                        <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 shadow-lg animate-bounce">
                            <Gift className="w-8 h-8 text-white" />
                        </div>

                        <div className="space-y-2">
                            <DialogTitle className="text-3xl font-display font-bold text-white drop-shadow-md">
                                {currentOffer.title}
                            </DialogTitle>
                            <DialogDescription className="text-white/90 text-lg">
                                {currentOffer.description}
                            </DialogDescription>
                        </div>

                        <div className="flex items-center justify-center gap-2 bg-black/20 p-2 rounded-lg border border-white/10 mx-auto max-w-[240px]">
                            <code className="text-xl font-mono font-bold tracking-wider text-yellow-300">
                                {currentOffer.code}
                            </code>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-white hover:bg-white/20"
                                onClick={() => copyCode(currentOffer.code)}
                            >
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="pt-2">
                            <p className="text-xs text-white/60 mb-2">Offer expires in 10:00</p>
                            <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-white/80 w-2/3 animate-pulse" />
                            </div>
                        </div>

                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
