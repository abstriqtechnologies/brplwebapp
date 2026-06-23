"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/components/SiteContextProvider";

const FloatingRegisterButton = () => {
    const settings = useSiteSettings() as any;
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            // Show button when page is scrolled down 300px
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const href: string = settings.floatingRegisterLink || "/registration";
    const label: string = settings.floatingRegisterText || "REGISTER NOW";

    const onClick = (e: React.MouseEvent) => {
        // If it's an in-page anchor, handle scrolling
        if (href.startsWith("#")) {
            e.preventDefault();
            const id = href.slice(1);
            const formElement = id ? document.getElementById(id) : null;
            if (formElement) {
                formElement.scrollIntoView({ behavior: "smooth" });
                return;
            }
            const fallback = document.getElementById("auth-form-container");
            if (fallback) {
                fallback.scrollIntoView({ behavior: "smooth" });
                return;
            }
            window.scrollTo({ top: 100, behavior: "smooth" });
        } else {
            e.preventDefault();
            router.push(href);
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <Button
                onClick={onClick}
                size="lg"
                className="bg-[#FFC928] text-black hover:bg-[#ffda6b] font-bold shadow-2xl rounded-full px-8 py-6 text-lg border-2 border-white/20"
            >
                {label} ⚡
            </Button>
        </div>
    );
};

export default FloatingRegisterButton;
