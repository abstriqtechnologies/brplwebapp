"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CheckCircle2, ArrowRight, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const ThankYou = () => {
    const isPayment = false;

    useEffect(() => {
        // Dynamically load Trackier Web SDK and fire conversion on Thank You page
        const script = document.createElement("script");
        script.src = "https://static-cdn.trackier.com/js/trackier-web-sdk.js";
        script.async = true;

        script.onload = () => {
            const w = window as any;
            if (w.TrackierWebSDK && typeof w.TrackierWebSDK.trackConv === "function") {
                try {
                    w.TrackierWebSDK.trackConv(
                        "marcamor.gotrackier.io",
                        "69b7f797d9f00e58a834d12f",
                        { is_iframe: true }
                    );
                } catch (err) {
                    console.error("TrackierWebSDK.trackConv error:", err);
                }
            } else {
                console.warn("TrackierWebSDK not available after script load");
            }
        };

        script.onerror = () => {
            console.error("Failed to load Trackier Web SDK script");
        };

        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    useEffect(() => {
        // Google Tag Manager
        const gtmScript = document.createElement("script");
        gtmScript.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PGSBGVZV');`;
        document.head.insertBefore(gtmScript, document.head.firstChild);

        return () => {
            document.head.removeChild(gtmScript);
        };
    }, []);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Google Tag Manager (noscript) */}
            <noscript>
                <iframe
                    src="https://www.googletagmanager.com/ns.html?id=GTM-PGSBGVZV"
                    height="0"
                    width="0"
                    style={{ display: "none", visibility: "hidden" }}
                ></iframe>
            </noscript>
            <SEO
                title={isPayment ? "Payment Successful" : "Thank You"}
                description={isPayment ? "Your payment was successful." : "Thank you for registering with Beyond Reach Premier League."}
            />

            {/* Background Elements matching Auth page style */}
            <div className="hero-gradient fixed inset-0 pointer-events-none" />
            <div className="absolute inset-0 bg-[url('/bg-cricket1.webp')] bg-cover bg-center opacity-10" />

            <div className="relative z-10 max-w-lg w-full text-center space-y-8 glass-card p-8 rounded-2xl animate-fade-in">
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border-2 border-green-500/20">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-display font-bold text-foreground">
                        {isPayment ? "Payment Successful!" : "Welcome to the Team!"}
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        {isPayment
                            ? "Your purchase has been completed. Your video is now live."
                            : "Your account has been successfully created. We're excited to have you join the Beyond Reach Premier League community."}
                    </p>
                </div>

                <div className="pt-4 space-y-4">
                    {!isPayment ? (
                        <Button asChild className="w-full" size="lg" variant="hero">
                            <Link href="/auth">
                                Go to Sign In <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    ) : (
                        <Button asChild className="w-full" size="lg" variant="hero">
                            <Link href="/dashboard">
                                Back to Dashboard <LayoutDashboard className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    )}


                </div>
            </div>
        </div>
    );
};

export default ThankYou;
