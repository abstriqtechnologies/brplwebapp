"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { SchemaMarkup } from "@/components/SchemaMarkup";
import { CustomHeadScripts } from "@/components/CustomHeadScripts";
import { CustomBodyScripts } from "@/components/CustomBodyScripts";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <TooltipProvider>
            <Toaster />
            <Sonner />
            <SchemaMarkup organizationOnly />
            <CustomHeadScripts />
            <CustomBodyScripts />
            <div className="min-h-screen relative flex flex-col font-sans">
                <Header />
                <main className="flex-grow">{children}</main>
                <Footer />
            </div>
        </TooltipProvider>
    );
}
