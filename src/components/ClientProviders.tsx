"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { SchemaMarkup } from "@/components/SchemaMarkup";
import { CustomHeadScripts } from "@/components/CustomHeadScripts";
import { CustomBodyScripts } from "@/components/CustomBodyScripts";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChatWidget } from "@/components/chat/ChatWidget";

const CHROME_HIDDEN_PREFIXES = ["/login", "/dashboard", "/admin"];

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || "";
    const hideChrome = CHROME_HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    return (
        <TooltipProvider>
            {mounted && <Toaster />}
            <SchemaMarkup organizationOnly />
            <CustomHeadScripts />
            <CustomBodyScripts />
            <div className="min-h-screen relative flex flex-col font-sans">
                {!hideChrome && <Header />}
                <main className="flex-grow">{children}</main>
                {!hideChrome && <Footer />}
            </div>
            {!hideChrome && <ChatWidget />}
        </TooltipProvider>
    );
}