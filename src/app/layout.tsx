import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import ClientProviders from "@/components/ClientProviders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Beyond Reach Premier League",
    description: "India's grassroots T10 tennis-ball cricket league. Open cricket trials and player registration across all zones.",
    icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </head>
            <body>
                <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
                    <ClientProviders>{children}</ClientProviders>
                </ThemeProvider>
            </body>
        </html>
    );
}