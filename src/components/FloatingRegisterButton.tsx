"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const FloatingRegisterButton = () => {
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

    const scrollToForm = () => {
        const formElement = document.getElementById("auth-form-container");
        if (formElement) {
            formElement.scrollIntoView({ behavior: "smooth" });
        } else {
            window.scrollTo({ top: 100, behavior: "smooth" });
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <Button
                onClick={scrollToForm}
                size="lg"
                className="bg-[#FFC928] text-black hover:bg-[#ffda6b] font-bold shadow-2xl rounded-full px-8 py-6 text-lg border-2 border-white/20"
            >
                REGISTER NOW ⚡
            </Button>
        </div>
    );
};

export default FloatingRegisterButton;
