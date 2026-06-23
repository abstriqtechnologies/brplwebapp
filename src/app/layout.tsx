import type { Metadata } from "next";
import { Inter, Space_Grotesk, Rye } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import ClientProviders from "@/components/ClientProviders";

const inter = Inter({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-inter",
    display: "swap",
});

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-space-grotesk",
    display: "swap",
});

const rye = Rye({
    subsets: ["latin"],
    weight: ["400"],
    variable: "--font-rye",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Beyond Reach Premier League",
    description: "India's grassroots T10 tennis-ball cricket league. Open cricket trials and player registration across all zones.",
    icons: { icon: "/logo.webp" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${rye.variable}`}>
            <body className={inter.className}>
                <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
                    <ClientProviders>{children}</ClientProviders>
                </ThemeProvider>
            </body>
        </html>
    );
}